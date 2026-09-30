import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Categoria, ContaRecorrente, Lancamento, MesISO, Meta, NovaContaRecorrente, NovoLancamento, PagamentoConta,
} from '../domain/types';
import { dataVencimento, hojeISO, mesDe } from '../domain/datas';
import { Repositorio } from '../data/Repositorio';
import { criarRepositorio } from '../data/criarRepositorio';
import { reagendarAvisos } from '../services/notificacoes';

interface Dados {
  categorias: Categoria[];
  lancamentos: Lancamento[];
  metas: Meta[];
  contas: ContaRecorrente[];
  pagamentos: PagamentoConta[];
}

interface ContextoApp extends Dados {
  pronto: boolean;
  hoje: string;
  /** mês selecionado nas telas (RF13) */
  mes: MesISO;
  setMes(m: MesISO): void;
  adicionarLancamento(l: NovoLancamento): Promise<void>;
  excluirLancamento(id: number): Promise<void>;
  salvarMeta(categoriaId: number, limite: number): Promise<void>;
  removerMeta(categoriaId: number): Promise<void>;
  adicionarConta(c: NovaContaRecorrente): Promise<void>;
  atualizarConta(c: ContaRecorrente): Promise<void>;
  excluirConta(id: number): Promise<void>;
  pagarConta(c: ContaRecorrente, mes: MesISO): Promise<void>;
  desfazerPagamento(contaId: number, mes: MesISO): Promise<void>;
}

const Ctx = createContext<ContextoApp | null>(null);

export function useApp(): ContextoApp {
  const c = useContext(Ctx);
  if (!c) throw new Error('useApp fora do AppProvider');
  return c;
}

const VAZIO: Dados = { categorias: [], lancamentos: [], metas: [], contas: [], pagamentos: [] };

export function AppProvider({ children, repositorio }: { children: React.ReactNode; repositorio?: Repositorio }) {
  const repo = useRef<Repositorio>(repositorio ?? criarRepositorio()).current;
  const [dados, setDados] = useState<Dados>(VAZIO);
  const [pronto, setPronto] = useState(false);
  const hoje = hojeISO();
  const [mes, setMes] = useState<MesISO>(mesDe(hoje));

  const recarregar = useCallback(async () => {
    const [categorias, lancamentos, metas, contas, pagamentos] = await Promise.all([
      repo.listarCategorias(), repo.listarLancamentos(), repo.listarMetas(), repo.listarContas(), repo.listarPagamentos(),
    ]);
    setDados({ categorias, lancamentos, metas, contas, pagamentos });
    return { contas, pagamentos };
  }, [repo]);

  /** Recarrega e reagenda as notificações quando contas ou pagamentos mudam */
  const recarregarComAvisos = useCallback(async () => {
    const { contas, pagamentos } = await recarregar();
    reagendarAvisos(contas, pagamentos).catch(() => { /* permissão negada ou indisponível */ });
  }, [recarregar]);

  useEffect(() => {
    (async () => {
      await repo.iniciar();
      await recarregarComAvisos();
      setPronto(true);
    })();
  }, [repo, recarregarComAvisos]);

  const valor = useMemo<ContextoApp>(() => ({
    ...dados, pronto, hoje, mes, setMes,
    adicionarLancamento: async l => { await repo.inserirLancamento(l); await recarregar(); },
    excluirLancamento: async id => { await repo.excluirLancamento(id); await recarregarComAvisos(); },
    salvarMeta: async (c, l) => { await repo.salvarMeta(c, l); await recarregar(); },
    removerMeta: async c => { await repo.removerMeta(c); await recarregar(); },
    adicionarConta: async c => { await repo.inserirConta(c); await recarregarComAvisos(); },
    atualizarConta: async c => { await repo.atualizarConta(c); await recarregarComAvisos(); },
    excluirConta: async id => { await repo.excluirConta(id); await recarregarComAvisos(); },
    pagarConta: async (c, m) => {
      // se a conta é do mês atual, o lançamento fica com a data de hoje;
      // se for de outro mês, com a data de vencimento
      const data = mesDe(hoje) === m ? hoje : dataVencimento(m, c.diaVencimento);
      await repo.pagarConta(c, m, data);
      await recarregarComAvisos();
    },
    desfazerPagamento: async (id, m) => { await repo.desfazerPagamento(id, m); await recarregarComAvisos(); },
  }), [dados, pronto, hoje, mes, repo, recarregar, recarregarComAvisos]);

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}
