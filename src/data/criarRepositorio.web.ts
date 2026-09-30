// Prévia no navegador: dados guardados no localStorage do navegador
// (com cópia em memória caso o navegador bloqueie o armazenamento).
import { Repositorio } from './Repositorio';
import { Armazenamento, RepositorioMemoria } from './RepositorioMemoria';

export const CHAVE_WEB = 'saldo-certo:v1';
let copia: string | null = null;

export const armazenamentoWeb: Armazenamento & { limpar(): void } = {
  ler: () => { try { return window.localStorage.getItem(CHAVE_WEB) ?? copia; } catch { return copia; } },
  gravar: d => { copia = d; try { window.localStorage.setItem(CHAVE_WEB, d); } catch { /* sem armazenamento */ } },
  limpar: () => { copia = null; try { window.localStorage.removeItem(CHAVE_WEB); } catch { /* */ } },
};

export function criarRepositorio(): Repositorio {
  return new RepositorioMemoria(armazenamentoWeb);
}
