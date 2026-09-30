// Android e iOS: banco SQLite no próprio aparelho (RNF02).
// O Metro escolhe automaticamente criarRepositorio.web.ts quando roda no navegador.
import { Repositorio } from './Repositorio';
import { RepositorioSQLite } from './RepositorioSQLite';

export function criarRepositorio(): Repositorio {
  return new RepositorioSQLite();
}
