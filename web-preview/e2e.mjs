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

await caso('painel com dados de exemplo e avisos', async () => {
  const t = await texto();
  assert.match(t, /Saldo do mês/);
  assert.match(t, /Você pode gastar por dia/);
  assert.match(t, /Avisos/);
  assert.match(t, /vence hoje/);
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

await caso('filtro de lançamentos por tipo', async () => {
  await aba('Lançamentos');
  await app.getByRole('button', { name: 'Receitas', exact: true }).click();
  const t = await texto();
  assert.doesNotMatch(t, /− R\$/);
  assert.match(t, /\+ R\$/);
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

await caso('metas: validação, criar, editar e remover', async () => {
  await aba('Metas');
  await btn('+ Moradia').click();
  await campo('Limite mensal (R$)').fill('0');
  await btn('Salvar meta').click();
  assert.match(await texto(), /maior que zero/);
  await campo('Limite mensal (R$)').fill('700');
  await btn('Salvar meta').click();
  await p.waitForTimeout(200);
  assert.match(await texto(), /Moradia .*de R\$ 700,00/);
  await app.getByRole('button', { name: 'Editar meta de Moradia' }).click();
  assert.equal(await campo('Limite mensal (R$)').inputValue(), '700,00');
  await campo('Limite mensal (R$)').fill('600');
  await btn('Salvar meta').click();
  await p.waitForTimeout(200);
  assert.match(await texto(), /Moradia .*de R\$ 600,00.*Estourou|Estourou.*Moradia/);
  await app.getByRole('button', { name: 'Editar meta de Moradia' }).click();
  await btn('Remover meta').click();
  await p.waitForTimeout(200);
  assert.ok(await btn('+ Moradia').isVisible());
});

await caso('contas: validação, criar, pagar, desfazer, editar e excluir', async () => {
  await aba('Contas');
  await btn('+ Nova').click();
  await btn('Salvar conta').click();
  assert.match(await texto(), /Dê um nome/);
  await campo('Nome da conta').fill('Gás de cozinha');
  await campo('Valor (R$)').fill('120');
  await campo('Dia do vencimento').fill('40');
  await btn('Salvar conta').click();
  assert.match(await texto(), /de 1 a 31/);
  await campo('Dia do vencimento').fill('31');
  await btn('Salvar conta').click();
  await p.waitForTimeout(200);
  let t = await texto();
  assert.match(t, /Gás de cozinha/);
  const ultimo = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  assert.match(t, new RegExp(`Gás de cozinha Vence em ${ultimo}/`)); // RN04

  const cartao = app.locator('div').filter({ hasText: /^Gás de cozinha/ }).last();
  const lanc0 = await (async () => { await aba('Lançamentos'); return app.locator('[aria-label^="Excluir"]').count(); })();
  await aba('Contas');
  const card = app.getByTestId('conta-Gás de cozinha');
  await card.getByRole('button', { name: 'Paguei', exact: true }).click();
  await p.waitForTimeout(200);
  assert.ok(await card.getByText('Paga', { exact: true }).isVisible());
  await aba('Lançamentos');
  assert.equal(await app.locator('[aria-label^="Excluir"]').count(), lanc0 + 1);
  assert.match(await texto(), /Gás de cozinha .*conta paga/);

  await aba('Contas');
  await card.getByRole('button', { name: 'Desfazer', exact: true }).click();
  await app.locator('[role=dialog] button', { hasText: 'Desfazer' }).click();
  await p.waitForTimeout(200);
  assert.ok(await card.getByRole('button', { name: 'Paguei', exact: true }).isVisible());

  await card.getByRole('button', { name: 'Editar', exact: true }).click();
  assert.equal(await campo('Nome da conta').inputValue(), 'Gás de cozinha');
  await campo('Nome da conta').fill('Botijão de gás');
  await btn('Salvar conta').click();
  await p.waitForTimeout(200);
  t = await texto();
  assert.match(t, /Botijão de gás/);
  assert.doesNotMatch(t, /Gás de cozinha/);

  const card2 = app.getByTestId('conta-Botijão de gás');
  await card2.getByRole('button', { name: 'Editar', exact: true }).click();
  await btn('Excluir conta').click();
  await app.locator('[role=dialog] button', { hasText: 'Excluir' }).click();
  await p.waitForTimeout(200);
  assert.doesNotMatch(await texto(), /Botijão de gás/);
  void cartao;
});

await caso('pagar conta atualiza o valor por dia no painel', async () => {
  await aba('Início');
  const antes = await texto();
  const pd0 = moeda(antes.match(/fim do mês (R\$ [\d.,]+)/)[1]);
  const pend0 = moeda(antes.match(/descontei (R\$ [\d.,]+)/)[1]);
  await aba('Contas');
  const card = app.getByTestId('conta-Internet');
  await card.getByRole('button', { name: 'Paguei', exact: true }).click();
  await p.waitForTimeout(200);
  await aba('Início');
  const depois = await texto();
  const pend1 = moeda(depois.match(/descontei (R\$ [\d.,]+)/)?.[1] ?? 'R$ 0,00');
  assert.equal(Math.round((pend0 - pend1) * 100), 9990);
  // o lançamento e a conta pendente se compensam: valor por dia não muda
  assert.equal(moeda(depois.match(/fim do mês (R\$ [\d.,]+)/)[1]), pd0);
  assert.doesNotMatch(depois, /Internet vence hoje/);
});

await caso('navegação entre meses', async () => {
  await aba('Início');
  await app.getByRole('button', { name: 'Próximo mês' }).click();
  let t = await texto();
  // mês seguinte ainda sem salário lançado: mostra quanto falta para as contas
  assert.match(t, /Valor por dia previsto|Faltam para cobrir/);
  assert.doesNotMatch(t, /Avisos/);
  await aba('Contas');
  t = await texto();
  assert.doesNotMatch(t, /Paga|Atrasada/);
  assert.match(t, /A pagar/);
  await app.getByRole('button', { name: 'Mês anterior' }).click();
  await app.getByRole('button', { name: 'Mês anterior' }).click();
  await aba('Início');
  t = await texto();
  assert.doesNotMatch(t, /Você pode gastar por dia|Valor por dia previsto/);
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
  assert.match(t, /Cadastre suas contas fixas/);
  assert.match(t, /R\$ 0,00/);
  await btn('+ Registrar gasto ou receita').click();
  await btn('Recebi').click();
  await campo('Valor (R$)').fill('1621');
  await btn('Salvar').click();
  assert.match(await texto(), /Escolha uma categoria/);
  await btn('Salário').click();
  await btn('Salvar').click();
  await p.waitForTimeout(200);
  t = await texto();
  assert.match(t, /Saldo do mês R\$ 1\.621,00/);
  await aba('Relatório');
  assert.match(await texto(), /Sem gastos registrados/);
  await aba('Metas');
  assert.match(await texto(), /Escolha uma categoria para definir/);
  await p.evaluate(() => window.saldoCerto.recomecar('exemplo'));
  await p.waitForTimeout(300);
});

await caso('contas maiores que a renda mostram quanto falta', async () => {
  await p.evaluate(() => window.saldoCerto.recomecar('vazio'));
  await p.waitForTimeout(300);
  await btn('+ Registrar gasto ou receita').click();
  await btn('Recebi').click();
  await campo('Valor (R$)').fill('100');
  await btn('Salário').click();
  await btn('Salvar').click();
  await aba('Contas');
  await btn('+ Nova').click();
  await campo('Nome da conta').fill('Aluguel');
  await campo('Valor (R$)').fill('500');
  await campo('Dia do vencimento').fill('28');
  await btn('Moradia').click();
  await btn('Salvar conta').click();
  await p.waitForTimeout(200);
  await aba('Início');
  const t = await texto();
  assert.match(t, /Faltam para cobrir as despesas do mês R\$ 400,00/);
  assert.match(t, /passam da sua renda do mês em R\$ 400,00/);
  assert.doesNotMatch(t, /Você pode gastar por dia/);
  await p.evaluate(() => window.saldoCerto.recomecar('exemplo'));
  await p.waitForTimeout(300);
});

await caso('nada sai da tela em celulares estreitos (360px)', async () => {
  await p.setViewportSize({ width: 360, height: 780 });
  await p.waitForTimeout(300);
  for (const n of ['Início', 'Lançamentos', 'Metas', 'Contas', 'Relatório']) {
    await aba(n);
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
    assert.deepEqual(fora, [], `aba ${n}: ${fora.join(' | ')}`);
  }
  await btn('+ Registrar gasto ou receita', false).first().click().catch(() => {});
});

await caso('sem erros no console', async () => { assert.deepEqual(erros, []); });

for (const r of resultados) console.log(r.join(' — '));
console.log(`\n${resultados.filter(r => r[0] === 'ok').length}/${resultados.length} casos passaram`);
await b.close();
