// Testes de ponta a ponta na prévia web (mesmo código das telas do app).
import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';

const URL = 'file:///home/claude/saldo-certo/web-preview/dist/local.html';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 1100, height: 900 } });
const p = await ctx.newPage();
p.setDefaultTimeout(4000);
const erros = [];
p.on('pageerror', e => erros.push('pageerror: ' + e.message));
p.on('console', m => { if (m.type() === 'error') erros.push('console: ' + m.text()); });

const app = p.locator('#app');
const aba = n => p.getByRole('tab', { name: new RegExp(n) }).click();
const btn = (n, exact = true) => app.getByRole('button', { name: n, exact });
const campo = n => app.getByLabel(n, { exact: true });
const texto = async () => (await app.innerText()).replace(/\s+/g, ' ');
const moeda = s => Number(s.replace(/[^\d,-]/g, '').replace(',', '.'));
const saldo = async () => { await aba('Início'); const t = await texto(); return moeda(t.match(/Saldo do mês (-?R\$ [\d.,]+)/)[1]); };
const resultados = [];
async function limpar() {
  for (const d of await app.locator('[role=dialog]').all()) await d.evaluate(n => n.remove()).catch(() => {});
  const c = app.getByRole('button', { name: 'Cancelar', exact: true });
  if (await c.count()) await c.first().click().catch(() => {});
}
async function caso(nome, fn) {
  await limpar();
  try { await fn(); resultados.push(['ok', nome]); console.log('ok', nome); }
  catch (e) { resultados.push(['FALHOU', nome, e.message.split('\n')[0]]); await p.screenshot({ path: `prints/falha-${resultados.length}.png` }); }
}

await p.goto(URL);
await p.evaluate(() => window.saldoCerto.recomecar('exemplo'));
await p.waitForTimeout(400);

await caso('painel com dados de exemplo', async () => {
  const t = await texto();
  assert.match(t, /Saldo do mês/);
  assert.match(t, /Você pode gastar por dia até o fim do mês R\$ [\d.,]+ Faltam \d+ dias? para o fim do mês/);
  assert.match(t, /Onde mais gastei/);
  assert.match(t, /Últimos lançamentos/);
  assert.doesNotMatch(t, /Metas|Contas do mês|Avisos/);
  assert.equal(await p.getByRole('tab').count(), 3);
});

await caso('valor por dia = saldo ÷ dias restantes', async () => {
  const t = await texto();
  const s = moeda(t.match(/Saldo do mês (-?R\$ [\d.,]+)/)[1]);
  const pd = moeda(t.match(/fim do mês (R\$ [\d.,]+)/)[1]);
  const dias = Number(t.match(/Faltam (\d+) dias?/)[1]);
  const hoje = new Date();
  assert.equal(dias, new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate() - hoje.getDate() + 1);
  assert.equal(Math.round(pd * 100), Math.floor(Math.round(s * 100) / dias));
});

await caso('formulário valida valor, categoria e data', async () => {
  const s0 = await saldo();
  await btn('+ Registrar gasto ou receita').click();
  await btn('Salvar').click();
  assert.match(await texto(), /Digite o valor/);
  await campo('Valor (R$)').fill('abc');
  await btn('Salvar').click();
  assert.match(await texto(), /Digite o valor/);
  await campo('Valor (R$)').fill('10,50');
  await btn('Salvar').click();
  assert.match(await texto(), /Escolha uma categoria/);
  await btn('Lazer').click();
  await campo('Data').fill('');
  await campo('Data').pressSequentially('31022026');
  assert.equal(await campo('Data').inputValue(), '31/02/2026');
  await btn('Salvar').click();
  assert.match(await texto(), /formato dia\/mês\/ano/);
  await campo('Data').fill('');
  const hoje = new Date();
  const dd = String(hoje.getDate()).padStart(2, '0'), mm = String(hoje.getMonth() + 1).padStart(2, '0');
  await campo('Data').pressSequentially(`${dd}${mm}${hoje.getFullYear()}`);
  await btn('Salvar').click();
  await p.waitForTimeout(200);
  assert.doesNotMatch(await texto(), /Novo lançamento/);
  assert.equal(Math.round((s0 - await saldo()) * 100), 1050);
  assert.match(await texto(), /Últimos lançamentos Ver todos Lazer Lazer · /);
});

await caso('cancelar o formulário não grava nada', async () => {
  await aba('Lançamentos');
  const n = await app.locator('[aria-label^="Excluir"]').count();
  await aba('Início');
  await btn('+ Registrar gasto ou receita').click();
  await campo('Valor (R$)').fill('99');
  await btn('Cancelar').click();
  await aba('Lançamentos');
  assert.equal(await app.locator('[aria-label^="Excluir"]').count(), n);
});

await caso('descrição vazia usa o nome da categoria; receita aumenta o saldo', async () => {
  const s0 = await saldo();
  await btn('+ Registrar gasto ou receita').click();
  await btn('Recebi').click();
  await campo('Valor (R$)').fill('100');
  await btn('Trabalho extra').click();
  await btn('Salvar').click();
  await p.waitForTimeout(200);
  assert.equal(Math.round((await saldo() - s0) * 100), 10000);
  await aba('Lançamentos');
  assert.match(await texto(), /Trabalho extra Trabalho extra \+ R\$ 100,00/);
});

await caso('lançamento em outro mês não altera o mês atual', async () => {
  const s0 = await saldo();
  await btn('+ Registrar gasto ou receita').click();
  await campo('Valor (R$)').fill('40');
  await btn('Saúde').click();
  const hoje = new Date();
  const ant = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 3);
  await campo('Data').fill('');
  await campo('Data').pressSequentially(`03${String(ant.getMonth() + 1).padStart(2, '0')}${ant.getFullYear()}`);
  await btn('Salvar').click();
  await p.waitForTimeout(200);
  assert.equal(await saldo(), s0);
  await app.getByRole('button', { name: 'Mês anterior' }).click();
  await aba('Lançamentos');
  assert.match(await texto(), /Saúde Saúde − R\$ 40,00/);
  await app.getByRole('button', { name: 'Próximo mês' }).click();
});

await caso('filtro de lançamentos por tipo', async () => {
  await aba('Lançamentos');
  await app.getByRole('button', { name: 'Receitas', exact: true }).click();
  let t = await texto();
  assert.doesNotMatch(t, /− R\$/);
  assert.match(t, /\+ R\$/);
  await app.getByRole('button', { name: 'Gastos', exact: true }).click();
  t = await texto();
  assert.doesNotMatch(t, /\+ R\$/);
  await app.getByRole('button', { name: 'Todos', exact: true }).click();
});

await caso('excluir lançamento: cancelar mantém, confirmar remove', async () => {
  await aba('Lançamentos');
  const n0 = await app.locator('[aria-label^="Excluir"]').count();
  await app.locator('[aria-label^="Excluir"]').first().click();
  await app.locator('[role=dialog] button', { hasText: 'Cancelar' }).click();
  assert.equal(await app.locator('[aria-label^="Excluir"]').count(), n0);
  await app.locator('[aria-label^="Excluir"]').first().click();
  await app.locator('[role=dialog] button', { hasText: 'Excluir' }).click();
  await p.waitForTimeout(200);
  assert.equal(await app.locator('[aria-label^="Excluir"]').count(), n0 - 1);
});

await caso('atalhos do painel levam às abas', async () => {
  await aba('Início');
  await btn('Ver relatório').click();
  assert.match(await texto(), /Gastos por categoria/);
  await aba('Início');
  await btn('Ver todos').click();
  assert.match(await texto(), /Lançamentos \+ Novo/);
});

await caso('navegação entre meses', async () => {
  await aba('Início');
  await app.getByRole('button', { name: 'Próximo mês' }).click();
  let t = await texto();
  assert.doesNotMatch(t, /por dia/);
  assert.match(t, /Saldo do mês R\$ 0,00/);
  await app.getByRole('button', { name: 'Mês anterior' }).click();
  await app.getByRole('button', { name: 'Mês anterior' }).click();
  t = await texto();
  assert.doesNotMatch(t, /por dia/);
  assert.match(t, /Onde mais gastei Ver relatório Moradia/);
  await app.getByRole('button', { name: 'Próximo mês' }).click();
});

await caso('relatório mostra categorias e comparação', async () => {
  await aba('Relatório');
  const t = await texto();
  assert.match(t, /Gastos por categoria/);
  assert.match(t, /Sobrou/);
  assert.match(t, /mês anterior R\$/);
  assert.match(t, /Você gastou \d+% a (mais|menos)/);
});

await caso('dados continuam após recarregar a página', async () => {
  await aba('Lançamentos');
  const n = await app.locator('[aria-label^="Excluir"]').count();
  await p.reload(); await p.waitForTimeout(500);
  await aba('Lançamentos');
  assert.equal(await app.locator('[aria-label^="Excluir"]').count(), n);
});

await caso('app vazio mostra orientações e aceita o primeiro lançamento', async () => {
  await p.evaluate(() => window.saldoCerto.recomecar('vazio'));
  await p.waitForTimeout(300);
  let t = await texto();
  assert.match(t, /Comece registrando/);
  assert.match(t, /Os gastos por categoria aparecem aqui/);
  assert.match(t, /Saldo do mês R\$ 0,00/);
  assert.doesNotMatch(t, /por dia/);
  await btn('+ Registrar gasto ou receita').click();
  await btn('Recebi').click();
  await campo('Valor (R$)').fill('1621');
  await btn('Salário').click();
  await btn('Salvar').click();
  await p.waitForTimeout(200);
  t = await texto();
  assert.match(t, /Saldo do mês R\$ 1\.621,00/);
  await aba('Relatório');
  assert.match(await texto(), /Sem gastos registrados/);
  await aba('Lançamentos');
  await app.getByRole('button', { name: 'Gastos', exact: true }).click();
  assert.match(await texto(), /Nenhum lançamento neste mês/);
  await app.getByRole('button', { name: 'Todos', exact: true }).click();
});

await caso('gastos maiores que a renda mostram quanto passou', async () => {
  await aba('Início');
  await btn('+ Registrar gasto ou receita').click();
  await campo('Valor (R$)').fill('2000');
  await btn('Moradia').click();
  await btn('Salvar').click();
  await p.waitForTimeout(200);
  const t = await texto();
  assert.match(t, /Você gastou mais do que recebeu neste mês R\$ 379,00/);
  assert.match(t, /Saldo do mês -R\$ 379,00/);
  await p.evaluate(() => window.saldoCerto.recomecar('exemplo'));
  await p.waitForTimeout(300);
});

await caso('nada sai da tela em celulares estreitos (360px)', async () => {
  await p.setViewportSize({ width: 360, height: 780 });
  await p.waitForTimeout(300);
  const telas = [['Início', null], ['Lançamentos', null], ['Relatório', null], ['Início', '+ Registrar gasto ou receita']];
  for (const [n, abrir] of telas) {
    await aba(n);
    if (abrir) await btn(abrir).click();
    await p.waitForTimeout(150);
    const fora = await p.evaluate(() => {
      const raiz = document.getElementById('app').getBoundingClientRect();
      const r = [];
      for (const el of document.querySelectorAll('#app *')) {
        const b = el.getBoundingClientRect();
        if (b.width && b.right > raiz.right + 1) r.push((el.textContent || el.tagName).slice(0, 30));
      }
      return r;
    });
    assert.deepEqual(fora, [], `${n}${abrir ? ' (formulário)' : ''}: ${fora.join(' | ')}`);
  }
});

await caso('sem erros no console', async () => { assert.deepEqual(erros, []); });

for (const r of resultados) console.log(r.join(' — '));
console.log(`\n${resultados.filter(r => r[0] === 'ok').length}/${resultados.length} casos passaram`);
await b.close();
