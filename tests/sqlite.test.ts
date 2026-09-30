// Executa o SQL real do RepositorioSQLite. Requer o módulo falso em
// node_modules/expo-sqlite (criado pelo script de teste), pois o expo-sqlite
// verdadeiro só funciona dentro do app.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RepositorioSQLite } from '../src/data/RepositorioSQLite';

test('SQLite: categorias padrão, lançamentos, metas e contas', async () => {
  const repo = new RepositorioSQLite();
  await repo.iniciar();
  await repo.iniciar(); // abrir de novo não duplica categorias
  const cats = await repo.listarCategorias();
  assert.equal(cats.length, 13);
  const mercado = cats.find(c => c.nome === 'Supermercado')!;
  const casa = cats.find(c => c.nome === 'Contas da casa')!;

  const id = await repo.inserirLancamento({ tipo: 'despesa', descricao: '  Feira ', valorCentavos: 2590, data: '2026-09-20', categoriaId: mercado.id, contaId: null });
  const [l] = await repo.listarLancamentos();
  assert.deepEqual(l, { id, tipo: 'despesa', descricao: 'Feira', valorCentavos: 2590, data: '2026-09-20', categoriaId: mercado.id, contaId: null });
  await assert.rejects(repo.inserirLancamento({ ...l, valorCentavos: 0 })); // CHECK do banco

  await repo.salvarMeta(mercado.id, 40000);
  await repo.salvarMeta(mercado.id, 45000);
  assert.deepEqual(await repo.listarMetas(), [{ categoriaId: mercado.id, limiteCentavos: 45000 }]);
  await repo.removerMeta(mercado.id);
  assert.deepEqual(await repo.listarMetas(), []);

  const cid = await repo.inserirConta({ descricao: 'Luz', valorCentavos: 12000, diaVencimento: 15, diasAntecedencia: 3, categoriaId: casa.id, ativa: true });
  let [conta] = await repo.listarContas();
  assert.equal(conta.ativa, true);
  await repo.atualizarConta({ ...conta, valorCentavos: 13000, ativa: false });
  [conta] = await repo.listarContas();
  assert.equal(conta.valorCentavos, 13000);
  assert.equal(conta.ativa, false);

  const lid = await repo.pagarConta(conta, '2026-09', '2026-09-14');
  assert.deepEqual(await repo.listarPagamentos(), [{ contaId: cid, mes: '2026-09', lancamentoId: lid }]);
  await assert.rejects(repo.pagarConta(conta, '2026-09', '2026-09-14')); // não paga duas vezes
  assert.equal((await repo.listarLancamentos()).length, 2);              // a transação desfez o lançamento extra

  await repo.desfazerPagamento(cid, '2026-09');
  assert.deepEqual(await repo.listarPagamentos(), []);
  assert.equal((await repo.listarLancamentos()).length, 1);

  await repo.pagarConta(conta, '2026-10', '2026-10-15');
  await repo.excluirConta(cid);
  assert.deepEqual(await repo.listarContas(), []);
  assert.deepEqual(await repo.listarPagamentos(), []);
  const ls = await repo.listarLancamentos();
  assert.equal(ls.length, 2);
  assert.ok(ls.every(x => x.contaId === null)); // ON DELETE SET NULL

  await repo.excluirLancamento(id);
  assert.equal((await repo.listarLancamentos()).length, 1);
});
