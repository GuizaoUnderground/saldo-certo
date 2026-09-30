import * as SQLite from 'expo-sqlite';
import {
  Categoria, ContaRecorrente, Lancamento, MesISO, Meta, NovaContaRecorrente, NovoLancamento, PagamentoConta,
} from '../domain/types';
import { Repositorio } from './Repositorio';
import { CATEGORIAS_PADRAO } from './categoriasPadrao';

/** Script de criação do banco (modelo ER da Figura 3 do TCC) */
const ESQUEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS categoria (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('receita','despesa')),
  cor TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS conta_recorrente (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  descricao TEXT NOT NULL,
  valor_centavos INTEGER NOT NULL CHECK (valor_centavos > 0),
  dia_vencimento INTEGER NOT NULL CHECK (dia_vencimento BETWEEN 1 AND 31),
  dias_antecedencia INTEGER NOT NULL DEFAULT 3,
  categoria_id INTEGER NOT NULL REFERENCES categoria(id),
  ativa INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS lancamento (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo TEXT NOT NULL CHECK (tipo IN ('receita','despesa')),
  descricao TEXT NOT NULL,
  valor_centavos INTEGER NOT NULL CHECK (valor_centavos > 0),
  data TEXT NOT NULL,
  categoria_id INTEGER NOT NULL REFERENCES categoria(id),
  conta_id INTEGER REFERENCES conta_recorrente(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_lancamento_data ON lancamento(data);
CREATE TABLE IF NOT EXISTS meta (
  categoria_id INTEGER PRIMARY KEY REFERENCES categoria(id),
  limite_centavos INTEGER NOT NULL CHECK (limite_centavos > 0)
);
CREATE TABLE IF NOT EXISTS pagamento_conta (
  conta_id INTEGER NOT NULL REFERENCES conta_recorrente(id) ON DELETE CASCADE,
  mes TEXT NOT NULL,
  lancamento_id INTEGER NOT NULL REFERENCES lancamento(id) ON DELETE CASCADE,
  PRIMARY KEY (conta_id, mes)
);
`;

type LinhaLancamento = {
  id: number; tipo: 'receita' | 'despesa'; descricao: string; valor_centavos: number;
  data: string; categoria_id: number; conta_id: number | null;
};
type LinhaConta = {
  id: number; descricao: string; valor_centavos: number; dia_vencimento: number;
  dias_antecedencia: number; categoria_id: number; ativa: number;
};

export class RepositorioSQLite implements Repositorio {
  private db!: SQLite.SQLiteDatabase;

  async iniciar(): Promise<void> {
    this.db = await SQLite.openDatabaseAsync('saldo-certo.db');
    await this.db.execAsync(ESQUEMA);
    const r = await this.db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM categoria');
    if (!r || r.n === 0) {
      for (const c of CATEGORIAS_PADRAO) {
        await this.db.runAsync('INSERT INTO categoria (nome, tipo, cor) VALUES (?, ?, ?)', c.nome, c.tipo, c.cor);
      }
    }
  }

  // ----------------------------------------------------------- categorias
  async listarCategorias(): Promise<Categoria[]> {
    return this.db.getAllAsync<Categoria>('SELECT id, nome, tipo, cor FROM categoria ORDER BY tipo DESC, id');
  }

  // ----------------------------------------------------------- lançamentos
  async listarLancamentos(): Promise<Lancamento[]> {
    const rows = await this.db.getAllAsync<LinhaLancamento>('SELECT * FROM lancamento ORDER BY data DESC, id DESC');
    return rows.map(r => ({
      id: r.id, tipo: r.tipo, descricao: r.descricao, valorCentavos: r.valor_centavos,
      data: r.data, categoriaId: r.categoria_id, contaId: r.conta_id,
    }));
  }

  async inserirLancamento(l: NovoLancamento): Promise<number> {
    const r = await this.db.runAsync(
      'INSERT INTO lancamento (tipo, descricao, valor_centavos, data, categoria_id, conta_id) VALUES (?, ?, ?, ?, ?, ?)',
      l.tipo, l.descricao.trim(), l.valorCentavos, l.data, l.categoriaId, l.contaId,
    );
    return r.lastInsertRowId;
  }

  async excluirLancamento(id: number): Promise<void> {
    // se o lançamento veio de um pagamento de conta, o registro de pagamento
    // é removido em cascata e a conta volta a ficar pendente
    await this.db.runAsync('DELETE FROM lancamento WHERE id = ?', id);
  }

  // ----------------------------------------------------------- metas
  async listarMetas(): Promise<Meta[]> {
    const rows = await this.db.getAllAsync<{ categoria_id: number; limite_centavos: number }>('SELECT * FROM meta');
    return rows.map(r => ({ categoriaId: r.categoria_id, limiteCentavos: r.limite_centavos }));
  }

  async salvarMeta(categoriaId: number, limiteCentavos: number): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO meta (categoria_id, limite_centavos) VALUES (?, ?)
       ON CONFLICT(categoria_id) DO UPDATE SET limite_centavos = excluded.limite_centavos`,
      categoriaId, limiteCentavos,
    );
  }

  async removerMeta(categoriaId: number): Promise<void> {
    await this.db.runAsync('DELETE FROM meta WHERE categoria_id = ?', categoriaId);
  }

  // ----------------------------------------------------------- contas
  async listarContas(): Promise<ContaRecorrente[]> {
    const rows = await this.db.getAllAsync<LinhaConta>('SELECT * FROM conta_recorrente ORDER BY dia_vencimento');
    return rows.map(r => ({
      id: r.id, descricao: r.descricao, valorCentavos: r.valor_centavos, diaVencimento: r.dia_vencimento,
      diasAntecedencia: r.dias_antecedencia, categoriaId: r.categoria_id, ativa: r.ativa === 1,
    }));
  }

  async inserirConta(c: NovaContaRecorrente): Promise<number> {
    const r = await this.db.runAsync(
      `INSERT INTO conta_recorrente (descricao, valor_centavos, dia_vencimento, dias_antecedencia, categoria_id, ativa)
       VALUES (?, ?, ?, ?, ?, ?)`,
      c.descricao.trim(), c.valorCentavos, c.diaVencimento, c.diasAntecedencia, c.categoriaId, c.ativa ? 1 : 0,
    );
    return r.lastInsertRowId;
  }

  async atualizarConta(c: ContaRecorrente): Promise<void> {
    await this.db.runAsync(
      `UPDATE conta_recorrente SET descricao = ?, valor_centavos = ?, dia_vencimento = ?, dias_antecedencia = ?,
       categoria_id = ?, ativa = ? WHERE id = ?`,
      c.descricao.trim(), c.valorCentavos, c.diaVencimento, c.diasAntecedencia, c.categoriaId, c.ativa ? 1 : 0, c.id,
    );
  }

  async excluirConta(id: number): Promise<void> {
    await this.db.runAsync('DELETE FROM conta_recorrente WHERE id = ?', id);
  }

  // ----------------------------------------------------------- pagamentos
  async listarPagamentos(): Promise<PagamentoConta[]> {
    const rows = await this.db.getAllAsync<{ conta_id: number; mes: string; lancamento_id: number }>(
      'SELECT * FROM pagamento_conta');
    return rows.map(r => ({ contaId: r.conta_id, mes: r.mes, lancamentoId: r.lancamento_id }));
  }

  async pagarConta(conta: ContaRecorrente, mes: MesISO, data: string): Promise<number> {
    let id = 0;
    await this.db.withTransactionAsync(async () => {
      const r = await this.db.runAsync(
        'INSERT INTO lancamento (tipo, descricao, valor_centavos, data, categoria_id, conta_id) VALUES (?, ?, ?, ?, ?, ?)',
        'despesa', conta.descricao, conta.valorCentavos, data, conta.categoriaId, conta.id,
      );
      id = r.lastInsertRowId;
      await this.db.runAsync('INSERT INTO pagamento_conta (conta_id, mes, lancamento_id) VALUES (?, ?, ?)', conta.id, mes, id);
    });
    return id;
  }

  async desfazerPagamento(contaId: number, mes: MesISO): Promise<void> {
    const p = await this.db.getFirstAsync<{ lancamento_id: number }>(
      'SELECT lancamento_id FROM pagamento_conta WHERE conta_id = ? AND mes = ?', contaId, mes);
    if (p) await this.db.runAsync('DELETE FROM lancamento WHERE id = ?', p.lancamento_id);
  }
}
