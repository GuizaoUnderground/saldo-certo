import {
  Categoria, ContaRecorrente, Lancamento, MesISO, Meta, NovaContaRecorrente, NovoLancamento, PagamentoConta,
} from '../domain/types';
import { Repositorio } from './Repositorio';
import { CATEGORIAS_PADRAO } from './categoriasPadrao';

interface Estado {
  seq: number;
  categorias: Categoria[];
  lancamentos: Lancamento[];
  metas: Meta[];
  contas: ContaRecorrente[];
  pagamentos: PagamentoConta[];
}

/** Adaptador opcional para persistir o estado (ex.: localStorage na prévia web) */
export interface Armazenamento {
  ler(): string | null;
  gravar(dados: string): void;
}

/**
 * Implementação em memória do repositório, com as mesmas regras de
 * integridade do banco SQLite. Usada nos testes automatizados e na
 * prévia web do protótipo.
 */
export class RepositorioMemoria implements Repositorio {
  private s: Estado = { seq: 0, categorias: [], lancamentos: [], metas: [], contas: [], pagamentos: [] };

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
      try { this.s = JSON.parse(bruto); return; } catch { /* dados corrompidos: recomeça */ }
    }
    this.s.categorias = CATEGORIAS_PADRAO.map(c => ({ ...c, id: this.novoId() }));
    this.salvar();
  }

  async listarCategorias() { return [...this.s.categorias]; }

  async listarLancamentos() { return [...this.s.lancamentos]; }
  async inserirLancamento(l: NovoLancamento) {
    const id = this.novoId();
    this.s.lancamentos.push({ ...l, descricao: l.descricao.trim(), id });
    this.salvar();
    return id;
  }
  async excluirLancamento(id: number) {
    this.s.lancamentos = this.s.lancamentos.filter(l => l.id !== id);
    this.s.pagamentos = this.s.pagamentos.filter(p => p.lancamentoId !== id); // cascata
    this.salvar();
  }

  async listarMetas() { return [...this.s.metas]; }
  async salvarMeta(categoriaId: number, limiteCentavos: number) {
    const m = this.s.metas.find(x => x.categoriaId === categoriaId);
    if (m) m.limiteCentavos = limiteCentavos; else this.s.metas.push({ categoriaId, limiteCentavos });
    this.salvar();
  }
  async removerMeta(categoriaId: number) {
    this.s.metas = this.s.metas.filter(m => m.categoriaId !== categoriaId);
    this.salvar();
  }

  async listarContas() { return [...this.s.contas].sort((a, b) => a.diaVencimento - b.diaVencimento); }
  async inserirConta(c: NovaContaRecorrente) {
    const id = this.novoId();
    this.s.contas.push({ ...c, descricao: c.descricao.trim(), id });
    this.salvar();
    return id;
  }
  async atualizarConta(c: ContaRecorrente) {
    this.s.contas = this.s.contas.map(x => (x.id === c.id ? { ...c } : x));
    this.salvar();
  }
  async excluirConta(id: number) {
    this.s.contas = this.s.contas.filter(c => c.id !== id);
    this.s.pagamentos = this.s.pagamentos.filter(p => p.contaId !== id);
    this.s.lancamentos = this.s.lancamentos.map(l => (l.contaId === id ? { ...l, contaId: null } : l));
    this.salvar();
  }

  async listarPagamentos() { return [...this.s.pagamentos]; }
  async pagarConta(conta: ContaRecorrente, mes: MesISO, data: string) {
    if (this.s.pagamentos.some(p => p.contaId === conta.id && p.mes === mes)) {
      throw new Error('Conta já paga neste mês');
    }
    const id = this.novoId();
    this.s.lancamentos.push({
      id, tipo: 'despesa', descricao: conta.descricao, valorCentavos: conta.valorCentavos,
      data, categoriaId: conta.categoriaId, contaId: conta.id,
    });
    this.s.pagamentos.push({ contaId: conta.id, mes, lancamentoId: id });
    this.salvar();
    return id;
  }
  async desfazerPagamento(contaId: number, mes: MesISO) {
    const p = this.s.pagamentos.find(x => x.contaId === contaId && x.mes === mes);
    if (p) await this.excluirLancamento(p.lancamentoId);
  }
}
