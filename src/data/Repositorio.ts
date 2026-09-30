import {
  Categoria, ContaRecorrente, Lancamento, MesISO, Meta, NovaContaRecorrente, NovoLancamento, PagamentoConta,
} from '../domain/types';

/**
 * Interface da camada de dados. A implementação principal usa SQLite
 * (RepositorioSQLite). Uma implementação em memória é usada nos testes
 * e na prévia web.
 */
export interface Repositorio {
  iniciar(): Promise<void>;

  listarCategorias(): Promise<Categoria[]>;

  listarLancamentos(): Promise<Lancamento[]>;
  inserirLancamento(l: NovoLancamento): Promise<number>;
  excluirLancamento(id: number): Promise<void>;

  listarMetas(): Promise<Meta[]>;
  salvarMeta(categoriaId: number, limiteCentavos: number): Promise<void>;
  removerMeta(categoriaId: number): Promise<void>;

  listarContas(): Promise<ContaRecorrente[]>;
  inserirConta(c: NovaContaRecorrente): Promise<number>;
  atualizarConta(c: ContaRecorrente): Promise<void>;
  excluirConta(id: number): Promise<void>;

  listarPagamentos(): Promise<PagamentoConta[]>;
  /** RF09: registra o pagamento e cria o lançamento de despesa, em uma transação */
  pagarConta(conta: ContaRecorrente, mes: MesISO, data: string): Promise<number>;
  /** Desfaz o pagamento: remove o registro e o lançamento gerado */
  desfazerPagamento(contaId: number, mes: MesISO): Promise<void>;
}
