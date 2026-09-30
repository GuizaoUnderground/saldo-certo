import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../App';
import { RepositorioMemoria } from '../src/data/RepositorioMemoria';
import { hojeISO, mesDe, somarMeses, dataVencimento } from '../src/domain/datas';

import { armazenamentoWeb as ls, CHAVE_WEB as CHAVE } from '../src/data/criarRepositorio.web';

/** Dados de exemplo: pessoa com renda próxima do salário mínimo */
async function criarExemplo() {
  const repo = new RepositorioMemoria(ls);
  await repo.iniciar();
  const cats = await repo.listarCategorias();
  const c = (n: string) => cats.find(x => x.nome === n)!.id;
  const hoje = hojeISO();
  const mes = mesDe(hoje);
  const ant = somarMeses(mes, -1);
  const dia = Number(hoje.slice(8));
  const d = (m: string, n: number) => dataVencimento(m, n);

  const add = (m: string, n: number, tipo: 'receita' | 'despesa', desc: string, v: number, cat: string) =>
    repo.inserirLancamento({ tipo, descricao: desc, valorCentavos: v, data: d(m, n), categoriaId: c(cat) });

  // mês anterior
  await add(ant, 5, 'receita', 'Salário', 162100, 'Salário');
  await add(ant, 6, 'despesa', 'Mercado do mês', 31250, 'Supermercado');
  await add(ant, 18, 'despesa', 'Mercado', 14880, 'Supermercado');
  await add(ant, 9, 'despesa', 'Passagens de ônibus', 13200, 'Transporte');
  await add(ant, 14, 'despesa', 'Aniversário do primo', 9000, 'Lazer');
  await add(ant, 22, 'despesa', 'Farmácia', 5290, 'Saúde');

  // contas fixas do mês anterior (lançadas como despesas comuns no TCC I)
  await add(ant, 10, 'despesa', 'Aluguel', 65000, 'Moradia');
  await add(ant, 15, 'despesa', 'Conta de luz', 12000, 'Contas da casa');
  await add(ant, 20, 'despesa', 'Conta de água', 6500, 'Contas da casa');
  await add(ant, 25, 'despesa', 'Internet', 9990, 'Contas da casa');

  // mês atual (só até hoje)
  const atuais: [number, 'receita' | 'despesa', string, number, string][] = [
    [5, 'receita', 'Salário', 162100, 'Salário'],
    [12, 'receita', 'Faxina extra', 15000, 'Trabalho extra'],
    [6, 'despesa', 'Mercado do mês', 28940, 'Supermercado'],
    [13, 'despesa', 'Açougue', 6230, 'Supermercado'],
    [19, 'despesa', 'Mercado', 9540, 'Supermercado'],
    [8, 'despesa', 'Passagens de ônibus', 8800, 'Transporte'],
    [16, 'despesa', 'Uber para consulta', 2500, 'Transporte'],
    [16, 'despesa', 'Farmácia', 3890, 'Saúde'],
    [20, 'despesa', 'Pizza no sábado', 5500, 'Lazer'],
    [10, 'despesa', 'Aluguel', 65000, 'Moradia'],
    [15, 'despesa', 'Conta de luz', 12000, 'Contas da casa'],
  ];
  for (const [n, t, desc, v, cat] of atuais) if (n <= dia) await add(mes, n, t, desc, v, cat);
}

let raiz: ReturnType<typeof createRoot> | null = null;

async function iniciar() {
  let vazio = false;
  try { vazio = localStorage.getItem(CHAVE + ':vazio') === '1'; } catch { /* */ }
  if (!ls.ler() && !vazio) await criarExemplo();
  raiz?.unmount();
  const el = document.getElementById('app')!;
  el.querySelectorAll('[role=dialog]').forEach(n => n.remove());
  raiz = createRoot(el);
  raiz.render(<App key={Date.now()} />);
}

/** Botões da página: recomeçar com exemplo ou com o aplicativo vazio */
(window as any).saldoCerto = {
  async recomecar(modo: 'exemplo' | 'vazio') {
    ls.limpar();
    try {
      if (modo === 'vazio') localStorage.setItem(CHAVE + ':vazio', '1'); else localStorage.removeItem(CHAVE + ':vazio');
    } catch { /* */ }
    await iniciar();
  },
};
iniciar();
