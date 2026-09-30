/**
 * Tipos de domínio do aplicativo Saldo Certo.
 * Valores monetários são sempre guardados em centavos (inteiros)
 * para evitar erros de arredondamento com números de ponto flutuante.
 */

export type TipoMovimento = 'receita' | 'despesa';

/** Data no formato ISO curto: AAAA-MM-DD */
export type DataISO = string;
/** Mês de referência no formato AAAA-MM */
export type MesISO = string;

export interface Categoria {
  id: number;
  nome: string;
  tipo: TipoMovimento;
  cor: string;
}

export interface Lancamento {
  id: number;
  tipo: TipoMovimento;
  descricao: string;
  valorCentavos: number;
  data: DataISO;
  categoriaId: number;
  /** Preenchido quando o lançamento foi gerado ao pagar uma conta recorrente */
  contaId: number | null;
}

/** Limite mensal de gasto para uma categoria de despesa */
export interface Meta {
  categoriaId: number;
  limiteCentavos: number;
}

export interface ContaRecorrente {
  id: number;
  descricao: string;
  valorCentavos: number;
  /** Dia do mês (1 a 31) em que a conta vence */
  diaVencimento: number;
  categoriaId: number;
  /** Quantos dias antes do vencimento o usuário quer ser avisado */
  diasAntecedencia: number;
  ativa: boolean;
}

/** Registro de que uma conta recorrente foi paga em determinado mês */
export interface PagamentoConta {
  contaId: number;
  mes: MesISO;
  lancamentoId: number;
}

export type NovoLancamento = Omit<Lancamento, 'id'>;
export type NovaContaRecorrente = Omit<ContaRecorrente, 'id'>;
