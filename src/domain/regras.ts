/**
 * Regras de negócio do Saldo Certo (Quadro 7 do TCC).
 * Todas as funções são puras: recebem dados e devolvem resultados,
 * sem acessar banco de dados ou interface, o que facilita os testes.
 */
import {
  Categoria, ContaRecorrente, DataISO, Lancamento, MesISO, Meta, NovoLancamento, PagamentoConta,
} from './types';
import { dataVencimento, diasNoMes, diferencaDias, mesDe, somarMeses } from './datas';

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

// ------------------------------------------------------------------ metas
export type SituacaoMeta = 'ok' | 'atencao' | 'estourada';

export interface ProgressoMeta {
  categoria: Categoria;
  limite: number;
  gasto: number;
  restante: number;
  /** percentual de uso (0 a ∞) */
  percentual: number;
  situacao: SituacaoMeta;
}

export const LIMIAR_ATENCAO = 0.8;

/** RN03: atenção a partir de 80%, estourada acima de 100% */
export function situacaoDaMeta(gasto: number, limite: number): SituacaoMeta {
  if (limite <= 0) return 'ok';
  const p = gasto / limite;
  if (p > 1) return 'estourada';
  if (p >= LIMIAR_ATENCAO) return 'atencao';
  return 'ok';
}

export function progressoDasMetas(
  metas: Meta[], categorias: Categoria[], lancamentos: Lancamento[], mes: MesISO,
): ProgressoMeta[] {
  const gastos = gastosPorCategoria(lancamentos, mes);
  const res: ProgressoMeta[] = [];
  for (const meta of metas) {
    const categoria = categorias.find(c => c.id === meta.categoriaId);
    if (!categoria || categoria.tipo !== 'despesa') continue; // RN02
    const gasto = gastos.get(meta.categoriaId) ?? 0;
    res.push({
      categoria, limite: meta.limiteCentavos, gasto,
      restante: meta.limiteCentavos - gasto,
      percentual: meta.limiteCentavos > 0 ? gasto / meta.limiteCentavos : 0,
      situacao: situacaoDaMeta(gasto, meta.limiteCentavos),
    });
  }
  return res.sort((a, b) => b.percentual - a.percentual);
}

// ------------------------------------------------------------------ contas recorrentes
export type SituacaoConta = 'paga' | 'pendente' | 'vence_em_breve' | 'vence_hoje' | 'atrasada';

export interface ContaDoMes {
  conta: ContaRecorrente;
  vencimento: DataISO;
  situacao: SituacaoConta;
  /** dias até o vencimento (negativo = atrasada) */
  diasParaVencer: number;
}

export function contaFoiPaga(contaId: number, mes: MesISO, pagamentos: PagamentoConta[]): boolean {
  return pagamentos.some(p => p.contaId === contaId && p.mes === mes);
}

/** RN05: situação da conta em relação à data de hoje */
export function situacaoDaConta(
  conta: ContaRecorrente, mes: MesISO, hoje: DataISO, pagamentos: PagamentoConta[],
): ContaDoMes {
  const vencimento = dataVencimento(mes, conta.diaVencimento);
  const diasParaVencer = diferencaDias(hoje, vencimento);
  let situacao: SituacaoConta;
  if (contaFoiPaga(conta.id, mes, pagamentos)) situacao = 'paga';
  else if (diasParaVencer < 0) situacao = 'atrasada';
  else if (diasParaVencer === 0) situacao = 'vence_hoje';
  else if (diasParaVencer <= conta.diasAntecedencia) situacao = 'vence_em_breve';
  else situacao = 'pendente';
  return { conta, vencimento, situacao, diasParaVencer };
}

export function contasDoMes(
  contas: ContaRecorrente[], mes: MesISO, hoje: DataISO, pagamentos: PagamentoConta[],
): ContaDoMes[] {
  return contas
    .filter(c => c.ativa)
    .map(c => situacaoDaConta(c, mes, hoje, pagamentos))
    .sort((a, b) => (a.vencimento < b.vencimento ? -1 : a.vencimento > b.vencimento ? 1 : 0));
}

export function totalContasPendentes(contas: ContaDoMes[]): number {
  return contas.filter(c => c.situacao !== 'paga').reduce((s, c) => s + c.conta.valorCentavos, 0);
}

// ------------------------------------------------------------------ disponível por dia
export interface Disponivel {
  /** saldo do mês menos contas pendentes */
  previsto: number;
  /** dias restantes no mês, incluindo hoje (0 para meses passados) */
  diasRestantes: number;
  /** valor que pode ser gasto por dia (null quando não se aplica) */
  porDia: number | null;
}

/** RN07: (saldo − contas pendentes) ÷ dias restantes, incluindo hoje */
export function disponivelPorDia(saldo: number, pendentes: number, mes: MesISO, hoje: DataISO): Disponivel {
  const previsto = saldo - pendentes;
  const mesHoje = mesDe(hoje);
  let diasRestantes: number;
  if (mes < mesHoje) diasRestantes = 0;
  else if (mes > mesHoje) diasRestantes = diasNoMes(mes);
  else diasRestantes = diasNoMes(mes) - Number(hoje.slice(8, 10)) + 1;
  const porDia = diasRestantes > 0 ? Math.floor(previsto / diasRestantes) : null;
  return { previsto, diasRestantes, porDia };
}

// ------------------------------------------------------------------ alertas
export type NivelAlerta = 'perigo' | 'atencao' | 'info';

export interface Alerta {
  chave: string;
  nivel: NivelAlerta;
  texto: string;
}

export function gerarAlertas(
  metas: ProgressoMeta[], contas: ContaDoMes[], disponivel: Disponivel,
  fmt: (centavos: number) => string,
): Alerta[] {
  const a: Alerta[] = [];
  if (disponivel.diasRestantes > 0 && disponivel.previsto < 0) { // RN08
    a.push({ chave: 'saldo', nivel: 'perigo',
      texto: `As despesas previstas passam da sua renda do mês em ${fmt(-disponivel.previsto)}.` });
  }
  for (const c of contas) {
    const nome = c.conta.descricao;
    if (c.situacao === 'atrasada') {
      const d = -c.diasParaVencer;
      a.push({ chave: 'conta' + c.conta.id, nivel: 'perigo', texto: `${nome} está atrasada há ${d} dia${d > 1 ? 's' : ''}.` });
    } else if (c.situacao === 'vence_hoje') {
      a.push({ chave: 'conta' + c.conta.id, nivel: 'atencao', texto: `${nome} vence hoje (${fmt(c.conta.valorCentavos)}).` });
    } else if (c.situacao === 'vence_em_breve') {
      const d = c.diasParaVencer;
      a.push({ chave: 'conta' + c.conta.id, nivel: 'atencao',
        texto: `${nome} vence em ${d} dia${d > 1 ? 's' : ''} (${fmt(c.conta.valorCentavos)}).` });
    }
  }
  for (const m of metas) {
    const nome = m.categoria.nome;
    if (m.situacao === 'estourada') {
      a.push({ chave: 'meta' + m.categoria.id, nivel: 'perigo',
        texto: `Você passou ${fmt(m.gasto - m.limite)} do limite de ${nome}.` });
    } else if (m.situacao === 'atencao') {
      a.push({ chave: 'meta' + m.categoria.id, nivel: 'atencao',
        texto: `Você já usou ${Math.round(m.percentual * 100)}% do limite de ${nome}.` });
    }
  }
  const ordem: Record<NivelAlerta, number> = { perigo: 0, atencao: 1, info: 2 };
  return a.sort((x, y) => ordem[x.nivel] - ordem[y.nivel]);
}

// ------------------------------------------------------------------ relatório
export interface LinhaRelatorio {
  categoria: Categoria;
  valor: number;
  valorMesAnterior: number;
  /** participação no total de despesas do mês (0 a 1) */
  participacao: number;
}

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
