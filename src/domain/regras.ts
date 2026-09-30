/**
 * Regras de negócio do Saldo Certo – TCC I (Quadro 7 do TCC).
 * Todas as funções são puras: recebem dados e devolvem resultados,
 * sem acessar banco de dados ou interface, o que facilita os testes.
 */
import { Categoria, DataISO, Lancamento, MesISO, NovoLancamento } from './types';
import { diasNoMes, mesDe, somarMeses } from './datas';

// ------------------------------------------------------------------ validação
/** RN01: valor positivo e categoria compatível com o tipo */
export function validarLancamento(l: NovoLancamento, categorias: Categoria[]): string | null {
  if (!Number.isInteger(l.valorCentavos) || l.valorCentavos <= 0) return 'Informe um valor maior que zero.';
  const cat = categorias.find(c => c.id === l.categoriaId);
  if (!cat) return 'Escolha uma categoria.';
  if (cat.tipo !== l.tipo) return 'A categoria escolhida não combina com o tipo do lançamento.';
  if (!l.descricao.trim()) return 'Escreva uma descrição curta, por exemplo "mercado".';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(l.data)) return 'Data inválida.';
  return null;
}

// ------------------------------------------------------------------ resumo do mês
export interface ResumoMes {
  receitas: number;
  despesas: number;
  saldo: number;
}

/** RN02: lançamentos do mês, do mais recente para o mais antigo */
export function lancamentosDoMes(lancamentos: Lancamento[], mes: MesISO): Lancamento[] {
  return lancamentos
    .filter(l => mesDe(l.data) === mes)
    .sort((a, b) => (a.data === b.data ? b.id - a.id : a.data < b.data ? 1 : -1));
}

export function resumoDoMes(lancamentos: Lancamento[], mes: MesISO): ResumoMes {
  let receitas = 0, despesas = 0;
  for (const l of lancamentos) {
    if (mesDe(l.data) !== mes) continue;
    if (l.tipo === 'receita') receitas += l.valorCentavos; else despesas += l.valorCentavos;
  }
  return { receitas, despesas, saldo: receitas - despesas };
}

/** Total de despesas por categoria no mês: Map<categoriaId, centavos> */
export function gastosPorCategoria(lancamentos: Lancamento[], mes: MesISO): Map<number, number> {
  const m = new Map<number, number>();
  for (const l of lancamentos) {
    if (l.tipo !== 'despesa' || mesDe(l.data) !== mes) continue;
    m.set(l.categoriaId, (m.get(l.categoriaId) ?? 0) + l.valorCentavos);
  }
  return m;
}

// ------------------------------------------------------------------ disponível por dia
export interface Disponivel {
  /** dias restantes no mês, incluindo hoje (0 para meses passados) */
  diasRestantes: number;
  /** valor que pode ser gasto por dia (null quando não se aplica) */
  porDia: number | null;
}

/** RN03: saldo do mês ÷ dias restantes, incluindo hoje (só para o mês atual) */
export function disponivelPorDia(saldo: number, mes: MesISO, hoje: DataISO): Disponivel {
  if (mes !== mesDe(hoje)) return { diasRestantes: 0, porDia: null };
  const diasRestantes = diasNoMes(mes) - Number(hoje.slice(8, 10)) + 1;
  return { diasRestantes, porDia: Math.floor(saldo / diasRestantes) };
}

// ------------------------------------------------------------------ relatório
export interface LinhaRelatorio {
  categoria: Categoria;
  valor: number;
  valorMesAnterior: number;
  /** participação no total de despesas do mês (0 a 1) */
  participacao: number;
}

/** RN04: despesas por categoria, com comparação ao mês anterior */
export function relatorioMensal(
  lancamentos: Lancamento[], categorias: Categoria[], mes: MesISO,
): { linhas: LinhaRelatorio[]; total: number; totalMesAnterior: number } {
  const atual = gastosPorCategoria(lancamentos, mes);
  const anterior = gastosPorCategoria(lancamentos, somarMeses(mes, -1));
  const total = [...atual.values()].reduce((s, v) => s + v, 0);
  const totalMesAnterior = [...anterior.values()].reduce((s, v) => s + v, 0);
  const ids = new Set([...atual.keys(), ...anterior.keys()]);
  const linhas: LinhaRelatorio[] = [];
  for (const id of ids) {
    const categoria = categorias.find(c => c.id === id);
    if (!categoria) continue;
    const valor = atual.get(id) ?? 0;
    linhas.push({ categoria, valor, valorMesAnterior: anterior.get(id) ?? 0, participacao: total > 0 ? valor / total : 0 });
  }
  linhas.sort((a, b) => b.valor - a.valor || b.valorMesAnterior - a.valorMesAnterior);
  return { linhas, total, totalMesAnterior };
}
