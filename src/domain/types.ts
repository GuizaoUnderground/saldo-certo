/**
 * Tipos de domínio do aplicativo Saldo Certo (TCC I).
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
}

export type NovoLancamento = Omit<Lancamento, 'id'>;
