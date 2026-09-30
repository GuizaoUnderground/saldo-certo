import { Categoria, Lancamento, NovoLancamento } from '../domain/types';

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
}
