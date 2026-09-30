import { test } from 'node:test';
import assert from 'node:assert/strict';
import { centavosParaTexto, converterParaCentavos, formatarMoeda } from '../src/domain/dinheiro';
import { diasNoMes, diferencaDias, formatarData, lerDataBR, mascaraData, nomeDoMes, somarMeses } from '../src/domain/datas';
import {
  disponivelPorDia, gastosPorCategoria, lancamentosDoMes, relatorioMensal, resumoDoMes, validarLancamento,
} from '../src/domain/regras';
import { Categoria, Lancamento } from '../src/domain/types';

const cats: Categoria[] = [
  { id: 1, nome: 'Salário', tipo: 'receita', cor: '#0' },
  { id: 2, nome: 'Supermercado', tipo: 'despesa', cor: '#0' },
  { id: 3, nome: 'Lazer', tipo: 'despesa', cor: '#0' },
];
const L = (id: number, tipo: 'receita' | 'despesa', valor: number, data: string, cat: number): Lancamento =>
  ({ id, tipo, descricao: 'x', valorCentavos: valor, data, categoriaId: cat });

test('dinheiro: formatação em reais', () => {
  assert.equal(formatarMoeda(123456), 'R$ 1.234,56');
  assert.equal(formatarMoeda(5), 'R$ 0,05');
  assert.equal(formatarMoeda(0), 'R$ 0,00');
  assert.equal(formatarMoeda(-1500), '-R$ 15,00');
  assert.equal(formatarMoeda(100000000), 'R$ 1.000.000,00');
});

test('dinheiro: leitura do valor digitado', () => {
  assert.equal(converterParaCentavos('12'), 1200);
  assert.equal(converterParaCentavos('12,5'), 1250);
  assert.equal(converterParaCentavos('1.234,56'), 123456);
  assert.equal(converterParaCentavos('R$ 99,90'), 9990);
  assert.equal(converterParaCentavos('12.50'), 1250);
  assert.equal(converterParaCentavos('1.500'), 150000);
  assert.equal(converterParaCentavos(' 7,5 '), 750);
  for (const invalido of ['abc', '1,234', '', '0,001', '-10', '10,']) assert.equal(converterParaCentavos(invalido), null, invalido);
  for (const c of [1, 99, 100, 1050, 162100, 99999999]) assert.equal(converterParaCentavos(centavosParaTexto(c)), c);
});

test('datas: meses, ano bissexto e virada de ano', () => {
  assert.equal(somarMeses('2026-12', 1), '2027-01');
  assert.equal(somarMeses('2026-01', -1), '2025-12');
  assert.equal(somarMeses('2026-09', 15), '2027-12');
  assert.equal(nomeDoMes('2026-09'), 'setembro de 2026');
  assert.equal(diasNoMes('2028-02'), 29);
  assert.equal(diasNoMes('2027-02'), 28);
  assert.equal(diferencaDias('2026-12-30', '2027-01-02'), 3);
  assert.equal(formatarData('2026-09-05'), '05/09/2026');
});

test('datas: leitura de dd/mm/aaaa e máscara de digitação', () => {
  assert.equal(lerDataBR('5/9/2026'), '2026-09-05');
  assert.equal(lerDataBR('25/09/26'), '2026-09-25');
  assert.equal(lerDataBR('29/02/2028'), '2028-02-29');
  assert.equal(lerDataBR('29/02/2027'), null);
  assert.equal(lerDataBR('31/02/2026'), null);
  assert.equal(lerDataBR('25-09-2026'), null);
  assert.equal(mascaraData('25092026'), '25/09/2026');
  assert.equal(mascaraData('2509'), '25/09');
  assert.equal(mascaraData('250'), '25/0');
  assert.equal(mascaraData('2509202612'), '25/09/2026');
});

test('RN01: validação do lançamento', () => {
  const base = { tipo: 'despesa' as const, descricao: 'mercado', valorCentavos: 1000, data: '2026-09-01', categoriaId: 2 };
  assert.equal(validarLancamento(base, cats), null);
  assert.equal(validarLancamento({ ...base, valorCentavos: 0 }, cats), 'Informe um valor maior que zero.');
  assert.equal(validarLancamento({ ...base, valorCentavos: 10.5 }, cats), 'Informe um valor maior que zero.');
  assert.equal(validarLancamento({ ...base, categoriaId: 1 }, cats), 'A categoria escolhida não combina com o tipo do lançamento.');
  assert.ok(validarLancamento({ ...base, descricao: '  ' }, cats));
  // sem categoria e sem descrição: a mensagem deve pedir a categoria
  assert.equal(validarLancamento({ ...base, descricao: '', categoriaId: -1 }, cats), 'Escolha uma categoria.');
  assert.equal(validarLancamento({ ...base, data: '01/09/2026' }, cats), 'Data inválida.');
});

test('RN02: lançamentos do mês, do mais recente para o mais antigo', () => {
  const ls = [L(1, 'despesa', 1, '2026-09-01', 2), L(2, 'despesa', 1, '2026-09-10', 2), L(3, 'despesa', 1, '2026-09-10', 2), L(4, 'despesa', 1, '2026-10-01', 2)];
  assert.deepEqual(lancamentosDoMes(ls, '2026-09').map(l => l.id), [3, 2, 1]);
});

test('resumo do mês ignora outros meses', () => {
  const ls = [L(1, 'receita', 162100, '2026-09-05', 1), L(2, 'despesa', 50000, '2026-09-10', 2), L(3, 'despesa', 9999, '2026-08-30', 2)];
  assert.deepEqual(resumoDoMes(ls, '2026-09'), { receitas: 162100, despesas: 50000, saldo: 112100 });
  assert.deepEqual(resumoDoMes([], '2026-09'), { receitas: 0, despesas: 0, saldo: 0 });
});

test('gastos por categoria contam só despesas do mês', () => {
  const ls = [L(1, 'receita', 100, '2026-09-05', 1), L(2, 'despesa', 300, '2026-09-10', 2), L(3, 'despesa', 200, '2026-09-11', 2), L(4, 'despesa', 50, '2026-08-11', 3)];
  assert.deepEqual([...gastosPorCategoria(ls, '2026-09')], [[2, 500]]);
});

test('RN03: valor disponível por dia', () => {
  // setembro tem 30 dias: no dia 25 restam 6 dias (25 a 30)
  assert.deepEqual(disponivelPorDia(60000, '2026-09', '2026-09-25'), { diasRestantes: 6, porDia: 10000 });
  assert.deepEqual(disponivelPorDia(3000, '2026-09', '2026-09-30'), { diasRestantes: 1, porDia: 3000 });
  assert.deepEqual(disponivelPorDia(1000, '2026-09', '2026-09-01'), { diasRestantes: 30, porDia: 33 });
  assert.equal(disponivelPorDia(-600, '2026-09', '2026-09-25').porDia, -100);
  assert.equal(disponivelPorDia(1000, '2026-08', '2026-09-25').porDia, null); // mês passado
  assert.equal(disponivelPorDia(1000, '2026-10', '2026-09-25').porDia, null); // mês futuro
});

test('RN04: relatório compara com o mês anterior', () => {
  const ls = [L(1, 'despesa', 30000, '2026-09-01', 2), L(2, 'despesa', 10000, '2026-09-02', 3), L(3, 'despesa', 20000, '2026-08-15', 2)];
  const r = relatorioMensal(ls, cats, '2026-09');
  assert.equal(r.total, 40000);
  assert.equal(r.totalMesAnterior, 20000);
  assert.equal(r.linhas[0].categoria.id, 2);
  assert.equal(r.linhas[0].participacao, 0.75);
  assert.equal(r.linhas[0].valorMesAnterior, 20000);
});

test('relatório: categoria só do mês anterior e receitas fora', () => {
  const r = relatorioMensal([L(1, 'despesa', 1000, '2026-08-10', 3), L(2, 'receita', 5000, '2026-09-05', 1)], cats, '2026-09');
  assert.equal(r.total, 0);
  assert.equal(r.linhas.length, 1);
  assert.equal(r.linhas[0].valor, 0);
  assert.equal(r.linhas[0].participacao, 0);
});
