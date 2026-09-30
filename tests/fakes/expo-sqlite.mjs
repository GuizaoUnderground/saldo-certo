// Imitação do expo-sqlite sobre o SQLite embutido do Node (node:sqlite),
// usada só nos testes para exercitar o SQL real do RepositorioSQLite.
import { DatabaseSync } from 'node:sqlite';

const abertos = new Map();
export async function openDatabaseAsync(nome) {
  if (!abertos.has(nome)) abertos.set(nome, new DatabaseSync(':memory:'));
  const db = abertos.get(nome);
  const conv = p => p.map(v => (typeof v === 'boolean' ? (v ? 1 : 0) : v));
  return {
    async execAsync(sql) { db.exec(sql); },
    async runAsync(sql, ...p) { const r = db.prepare(sql).run(...conv(p)); return { lastInsertRowId: Number(r.lastInsertRowid), changes: Number(r.changes) }; },
    async getFirstAsync(sql, ...p) { return db.prepare(sql).get(...conv(p)) ?? null; },
    async getAllAsync(sql, ...p) { return db.prepare(sql).all(...conv(p)); },
    async withTransactionAsync(fn) {
      db.exec('BEGIN');
      try { await fn(); db.exec('COMMIT'); } catch (e) { db.exec('ROLLBACK'); throw e; }
    },
  };
}
