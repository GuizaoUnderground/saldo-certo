import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RepositorioMemoria } from '../src/data/RepositorioMemoria';
import { RepositorioSQLite } from '../src/data/RepositorioSQLite';
import { Repositorio } from '../src/data/Repositorio';

async function exercitar(repo: Repositorio) {
  await repo.iniciar();
  await repo.iniciar(); // abrir de novo não duplica categorias
  const cats = await repo.listarCategorias();
  assert.equal(cats.length, 13);
  assert.equal(cats.filter(c => c.tipo === 'receita').length, 4);
  const mercado = cats.find(c => c.nome === 'Supermercado')!;

  const id = await repo.inserirLancamento({ tipo: 'despesa', descricao: '  Feira ', valorCentavos: 2590, data: '2026-09-20', categoriaId: mercado.id });
  const [l] = await repo.listarLancamentos();
  assert.deepEqual(l, { id, tipo: 'despesa', descricao: 'Feira', valorCentavos: 2590, data: '2026-09-20', categoriaId: mercado.id });
  await assert.rejects(repo.inserirLancamento({ ...l, valorCentavos: 0 }));   // valor inválido
  await assert.rejects(repo.inserirLancamento({ ...l, categoriaId: 999 }));  // categoria inexistente
  assert.equal((await repo.listarLancamentos()).length, 1);

  await repo.excluirLancamento(id);
  assert.equal((await repo.listarLancamentos()).length, 0);
}

test('repositório em memória', async () => {
  await exercitar(new RepositorioMemoria());
});

test('repositório em memória: dados persistem ao reabrir', async () => {
  let salvo: string | null = null;
  const arm = { ler: () => salvo, gravar: (d: string) => { salvo = d; } };
  const r1 = new RepositorioMemoria(arm);
  await r1.iniciar();
  const cat = (await r1.listarCategorias())[0];
  await r1.inserirLancamento({ tipo: 'receita', descricao: 'Salário', valorCentavos: 162100, data: '2026-09-05', categoriaId: cat.id });
  const r2 = new RepositorioMemoria(arm);
  await r2.iniciar();
  assert.equal((await r2.listarLancamentos()).length, 1);
  assert.equal((await r2.listarCategorias()).length, 13);
});

test('SQLite: executa o SQL real do repositório', async () => {
  await exercitar(new RepositorioSQLite());
});
