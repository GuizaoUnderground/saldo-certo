import { test } from 'node:test';
import assert from 'node:assert/strict';
import { centavosParaTexto, converterParaCentavos, formatarMoeda } from '../src/domain/dinheiro';
import { dataVencimento, diasNoMes, lerDataBR, mascaraData, somarMeses, diferencaDias } from '../src/domain/datas';
import {
  contasDoMes, disponivelPorDia, gerarAlertas, progressoDasMetas, relatorioMensal, lancamentosDoMes,
} from '../src/domain/regras';
import { Categoria, ContaRecorrente, Lancamento } from '../src/domain/types';
import { RepositorioMemoria } from '../src/data/RepositorioMemoria';

const cats: Categoria[] = [
  { id: 1, nome: 'Salário', tipo: 'receita', cor: '#0' },
  { id: 2, nome: 'Supermercado', tipo: 'despesa', cor: '#0' },
  { id: 3, nome: 'Lazer', tipo: 'despesa', cor: '#0' },
];
const L = (id: number, tipo: 'receita' | 'despesa', valor: number, data: string, cat: number): Lancamento =>
  ({ id, tipo, descricao: 'x', valorCentavos: valor, data, categoriaId: cat, contaId: null });
const conta = (id: number, dia: number, ant = 3, ativa = true): ContaRecorrente =>
  ({ id, descricao: 'Conta ' + id, valorCentavos: 5000, diaVencimento: dia, diasAntecedencia: ant, categoriaId: 2, ativa });

test('dinheiro: ida e volta entre texto e centavos', () => {
  for (const c of [1, 99, 100, 1050, 162100, 99999999]) {
    assert.equal(converterParaCentavos(centavosParaTexto(c)), c);
  }
  assert.equal(formatarMoeda(100000000), 'R$ 1.000.000,00');
  assert.equal(formatarMoeda(0), 'R$ 0,00');
  assert.equal(converterParaCentavos(' 7,5 '), 750);
  assert.equal(converterParaCentavos('0,001'), null);
  assert.equal(converterParaCentavos('-10'), null);
  assert.equal(converterParaCentavos('10,'), null);
});

test('datas: ano bissexto, virada de ano e máscara', () => {
  assert.equal(diasNoMes('2028-02'), 29);
  assert.equal(diasNoMes('2027-02'), 28);
  assert.equal(dataVencimento('2028-02', 31), '2028-02-29');
  assert.equal(dataVencimento('2026-09', 0), '2026-09-01');
  assert.equal(somarMeses('2026-09', -12), '2025-09');
  assert.equal(somarMeses('2026-09', 15), '2027-12');
  assert.equal(diferencaDias('2026-12-30', '2027-01-02'), 3);
  assert.equal(lerDataBR('29/02/2028'), '2028-02-29');
  assert.equal(lerDataBR('29/02/2027'), null);
  assert.equal(lerDataBR('25/09/26'), '2026-09-25');
  assert.equal(lerDataBR('25-09-2026'), null);
  assert.equal(mascaraData('25092026'), '25/09/2026');
  assert.equal(mascaraData('2509'), '25/09');
  assert.equal(mascaraData('250'), '25/0');
  assert.equal(mascaraData('25/09/2026'), '25/09/2026');
  assert.equal(mascaraData('2509202612'), '25/09/2026');
});

test('lista do mês ordenada da data mais recente para a mais antiga', () => {
  const ls = [L(1, 'despesa', 1, '2026-09-01', 2), L(2, 'despesa', 1, '2026-09-10', 2), L(3, 'despesa', 1, '2026-09-10', 2), L(4, 'despesa', 1, '2026-10-01', 2)];
  assert.deepEqual(lancamentosDoMes(ls, '2026-09').map(l => l.id), [3, 2, 1]);
});

test('contas inativas não aparecem e vencimento no dia 31', () => {
  const r = contasDoMes([conta(1, 31), conta(2, 10, 3, false)], '2026-11', '2026-11-28', []);
  assert.equal(r.length, 1);
  assert.equal(r[0].vencimento, '2026-11-30');
  assert.equal(r[0].situacao, 'vence_em_breve');
  assert.equal(r[0].diasParaVencer, 2);
});

test('antecedência zero só avisa no dia', () => {
  assert.equal(contasDoMes([conta(1, 26, 0)], '2026-09', '2026-09-25', [])[0].situacao, 'pendente');
  assert.equal(contasDoMes([conta(1, 25, 0)], '2026-09', '2026-09-25', [])[0].situacao, 'vence_hoje');
});

test('contas de mês futuro ficam pendentes, de mês passado atrasadas', () => {
  assert.equal(contasDoMes([conta(1, 5)], '2026-10', '2026-09-25', [])[0].situacao, 'pendente');
  assert.equal(contasDoMes([conta(1, 5)], '2026-08', '2026-09-25', [])[0].situacao, 'atrasada');
});

test('último dia do mês: 1 dia restante', () => {
  const d = disponivelPorDia(3000, 0, '2026-09', '2026-09-30');
  assert.equal(d.diasRestantes, 1);
  assert.equal(d.porDia, 3000);
});

test('alertas: ordem (perigo antes de atenção) e plural', () => {
  const metas = progressoDasMetas([{ categoriaId: 2, limiteCentavos: 1000 }, { categoriaId: 3, limiteCentavos: 1000 }], cats,
    [L(1, 'despesa', 900, '2026-09-01', 2), L(2, 'despesa', 1500, '2026-09-01', 3)], '2026-09');
  const contas = contasDoMes([conta(7, 24), conta(8, 26)], '2026-09', '2026-09-25', []);
  const a = gerarAlertas(metas, contas, disponivelPorDia(100000, 0, '2026-09', '2026-09-25'), formatarMoeda);
  assert.deepEqual(a.map(x => x.nivel), ['perigo', 'perigo', 'atencao', 'atencao']);
  assert.ok(a.some(x => x.texto === 'Conta 7 está atrasada há 1 dia.'));
  assert.ok(a.some(x => x.texto.startsWith('Conta 8 vence em 1 dia ')));
  assert.ok(a.some(x => x.texto === 'Você passou R$ 5,00 do limite de Lazer.'));
  assert.ok(a.some(x => x.texto === 'Você já usou 90% do limite de Supermercado.'));
});

test('sem alerta de saldo em mês passado', () => {
  const a = gerarAlertas([], [], disponivelPorDia(-500, 0, '2026-08', '2026-09-25'), formatarMoeda);
  assert.equal(a.length, 0);
});

test('relatório inclui categoria que só teve gasto no mês anterior', () => {
  const r = relatorioMensal([L(1, 'despesa', 1000, '2026-08-10', 3)], cats, '2026-09');
  assert.equal(r.total, 0);
  assert.equal(r.linhas.length, 1);
  assert.equal(r.linhas[0].valor, 0);
  assert.equal(r.linhas[0].participacao, 0);
});

test('receitas não entram nas metas nem no relatório', () => {
  const ls = [L(1, 'receita', 162100, '2026-09-05', 1)];
  assert.equal(relatorioMensal(ls, cats, '2026-09').linhas.length, 0);
  assert.equal(progressoDasMetas([{ categoriaId: 2, limiteCentavos: 100 }], cats, ls, '2026-09')[0].gasto, 0);
});

test('repositório em memória: persistência, metas e exclusão de conta', async () => {
  let salvo: string | null = null;
  const arm = { ler: () => salvo, gravar: (d: string) => { salvo = d; } };
  const r1 = new RepositorioMemoria(arm);
  await r1.iniciar();
  const cat = (await r1.listarCategorias()).find(c => c.tipo === 'despesa')!;
  await r1.salvarMeta(cat.id, 1000);
  await r1.salvarMeta(cat.id, 2000); // atualiza em vez de duplicar
  const id = await r1.inserirConta({ descricao: ' Luz ', valorCentavos: 100, diaVencimento: 5, diasAntecedencia: 1, categoriaId: cat.id, ativa: true });
  const c = (await r1.listarContas())[0];
  assert.equal(c.descricao, 'Luz');
  await r1.pagarConta(c, '2026-09', '2026-09-05');

  const r2 = new RepositorioMemoria(arm); // "reabre o app"
  await r2.iniciar();
  assert.deepEqual(await r2.listarMetas(), [{ categoriaId: cat.id, limiteCentavos: 2000 }]);
  assert.equal((await r2.listarCategorias()).length, (await r1.listarCategorias()).length);
  await r2.excluirConta(id);
  assert.equal((await r2.listarPagamentos()).length, 0);
  const ls = await r2.listarLancamentos();
  assert.equal(ls.length, 1);          // o pagamento feito continua como lançamento
  assert.equal(ls[0].contaId, null);
  await r2.desfazerPagamento(id, '2026-09'); // não deve falhar sem pagamento
});

import { planejarAvisos } from '../src/domain/avisos';

test('RF10: planejamento das notificações de vencimento', () => {
  const agora = new Date(2026, 8, 25, 10, 0, 0); // 25/09/2026 10h
  const c1 = conta(1, 28, 3);   // vence 28/09: aviso de 3 dias (25/09 9h) já passou; aviso do dia fica
  const c2 = conta(2, 25, 2);   // vence hoje, mas 9h já passou: só avisos de outubro
  const c3 = conta(3, 30, 1, false); // inativa
  const avisos = planejarAvisos([c1, c2, c3], [{ contaId: 1, mes: '2026-10', lancamentoId: 1 }], agora);
  const fmt = (d: Date) => `${d.getDate()}/${d.getMonth() + 1} ${d.getHours()}h`;
  assert.deepEqual(avisos.map(a => fmt(a.quando) + ' ' + a.corpo), [
    '28/9 9h Conta 1 vence hoje (R$ 50,00).',
    '23/10 9h Conta 2 vence em 2 dias (R$ 50,00).',
    '25/10 9h Conta 2 vence hoje (R$ 50,00).',
  ]);
  // conta paga no mês atual não gera aviso neste mês
  assert.equal(planejarAvisos([c1], [{ contaId: 1, mes: '2026-09', lancamentoId: 1 }], agora)
    .filter(a => a.quando.getMonth() === 8).length, 0);
});
