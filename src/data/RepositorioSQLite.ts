import * as SQLite from 'expo-sqlite';
import { Categoria, Lancamento, NovoLancamento } from '../domain/types';
import { Repositorio } from './Repositorio';
import { CATEGORIAS_PADRAO } from './categoriasPadrao';

/** Script de criação do banco (modelo de dados do TCC I) */
const ESQUEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS categoria (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('receita','despesa')),
  cor TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS lancamento (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo TEXT NOT NULL CHECK (tipo IN ('receita','despesa')),
  descricao TEXT NOT NULL,
  valor_centavos INTEGER NOT NULL CHECK (valor_centavos > 0),
  data TEXT NOT NULL,
  categoria_id INTEGER NOT NULL REFERENCES categoria(id)
);
CREATE INDEX IF NOT EXISTS idx_lancamento_data ON lancamento(data);
`;

type LinhaLancamento = {
  id: number; tipo: 'receita' | 'despesa'; descricao: string; valor_centavos: number;
  data: string; categoria_id: number;
};

export class RepositorioSQLite implements Repositorio {
  private db!: SQLite.SQLiteDatabase;

  async iniciar(): Promise<void> {
    this.db = await SQLite.openDatabaseAsync('saldo-certo.db');
    await this.db.execAsync(ESQUEMA);
    const r = await this.db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM categoria');
    if (!r || r.n === 0) {
      await this.db.withTransactionAsync(async () => {
        for (const c of CATEGORIAS_PADRAO) {
          await this.db.runAsync('INSERT INTO categoria (nome, tipo, cor) VALUES (?, ?, ?)', c.nome, c.tipo, c.cor);
        }
      });
    }
  }

  async listarCategorias(): Promise<Categoria[]> {
    return this.db.getAllAsync<Categoria>('SELECT id, nome, tipo, cor FROM categoria ORDER BY tipo DESC, id');
  }

  async listarLancamentos(): Promise<Lancamento[]> {
    const rows = await this.db.getAllAsync<LinhaLancamento>('SELECT * FROM lancamento ORDER BY data DESC, id DESC');
    return rows.map(r => ({
      id: r.id, tipo: r.tipo, descricao: r.descricao, valorCentavos: r.valor_centavos,
      data: r.data, categoriaId: r.categoria_id,
    }));
  }

  async inserirLancamento(l: NovoLancamento): Promise<number> {
    const r = await this.db.runAsync(
      'INSERT INTO lancamento (tipo, descricao, valor_centavos, data, categoria_id) VALUES (?, ?, ?, ?, ?)',
      l.tipo, l.descricao.trim(), l.valorCentavos, l.data, l.categoriaId,
    );
    return r.lastInsertRowId;
  }

  async excluirLancamento(id: number): Promise<void> {
    await this.db.runAsync('DELETE FROM lancamento WHERE id = ?', id);
  }
}
