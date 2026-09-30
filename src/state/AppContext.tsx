import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Categoria, Lancamento, MesISO, NovoLancamento } from '../domain/types';
import { hojeISO, mesDe } from '../domain/datas';
import { Repositorio } from '../data/Repositorio';
import { criarRepositorio } from '../data/criarRepositorio';

interface Dados {
  categorias: Categoria[];
  lancamentos: Lancamento[];
}

interface ContextoApp extends Dados {
  pronto: boolean;
  hoje: string;
  /** mês selecionado nas telas (RF07) */
  mes: MesISO;
  setMes(m: MesISO): void;
  adicionarLancamento(l: NovoLancamento): Promise<void>;
  excluirLancamento(id: number): Promise<void>;
}

const Ctx = createContext<ContextoApp | null>(null);

export function useApp(): ContextoApp {
  const c = useContext(Ctx);
  if (!c) throw new Error('useApp fora do AppProvider');
  return c;
}

export function AppProvider({ children, repositorio }: { children: React.ReactNode; repositorio?: Repositorio }) {
  const repo = useRef<Repositorio>(repositorio ?? criarRepositorio()).current;
  const [dados, setDados] = useState<Dados>({ categorias: [], lancamentos: [] });
  const [pronto, setPronto] = useState(false);
  const hoje = hojeISO();
  const [mes, setMes] = useState<MesISO>(mesDe(hoje));

  const recarregar = useCallback(async () => {
    const [categorias, lancamentos] = await Promise.all([repo.listarCategorias(), repo.listarLancamentos()]);
    setDados({ categorias, lancamentos });
  }, [repo]);

  useEffect(() => {
    (async () => {
      await repo.iniciar();
      await recarregar();
      setPronto(true);
    })();
  }, [repo, recarregar]);

  const valor = useMemo<ContextoApp>(() => ({
    ...dados, pronto, hoje, mes, setMes,
    adicionarLancamento: async l => { await repo.inserirLancamento(l); await recarregar(); },
    excluirLancamento: async id => { await repo.excluirLancamento(id); await recarregar(); },
  }), [dados, pronto, hoje, mes, repo, recarregar]);

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}
