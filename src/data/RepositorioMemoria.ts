import { Categoria, Lancamento, NovoLancamento } from '../domain/types';
import { Repositorio } from './Repositorio';
import { CATEGORIAS_PADRAO } from './categoriasPadrao';

interface Estado {
  seq: number;
  categorias: Categoria[];
  lancamentos: Lancamento[];
}

/** Adaptador opcional para persistir o estado (ex.: localStorage na prévia web) */
export interface Armazenamento {
  ler(): string | null;
  gravar(dados: string): void;
}

/**
 * Implementação em memória do repositório, com as mesmas regras do banco
 * SQLite. Usada nos testes automatizados e na prévia web do protótipo.
 */
export class RepositorioMemoria implements Repositorio {
  private s: Estado = { seq: 0, categorias: [], lancamentos: [] };

  constructor(private armazenamento?: Armazenamento) {}

  private salvar() {
    this.armazenamento?.gravar(JSON.stringify(this.s));
  }
  private novoId() {
    this.s.seq += 1;
    return this.s.seq;
  }

  async iniciar(): Promise<void> {
    const bruto = this.armazenamento?.ler();
    if (bruto) {
      try {
        const e = JSON.parse(bruto);
        this.s = { seq: e.seq ?? 0, categorias: e.categorias ?? [], lancamentos: e.lancamentos ?? [] };
        if (this.s.categorias.length) return;
      } catch { /* dados corrompidos: recomeça */ }
    }
    this.s = { seq: 0, categorias: [], lancamentos: [] };
    this.s.categorias = CATEGORIAS_PADRAO.map(c => ({ ...c, id: this.novoId() }));
    this.salvar();
  }

  async listarCategorias() { return [...this.s.categorias]; }
  async listarLancamentos() { return [...this.s.lancamentos]; }

  async inserirLancamento(l: NovoLancamento) {
    if (!(l.valorCentavos > 0)) throw new Error('Valor inválido');
    if (!this.s.categorias.some(c => c.id === l.categoriaId)) throw new Error('Categoria inexistente');
    const id = this.novoId();
    this.s.lancamentos.push({ ...l, descricao: l.descricao.trim(), id });
    this.salvar();
    return id;
  }

  async excluirLancamento(id: number) {
    this.s.lancamentos = this.s.lancamentos.filter(l => l.id !== id);
    this.salvar();
  }
}
