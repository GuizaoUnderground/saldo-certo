import { test } from 'node:test';
import assert from 'node:assert/strict';
import { converterParaCentavos, formatarMoeda } from '../src/domain/dinheiro';
import { dataVencimento, diferencaDias, lerDataBR, mascaraData, somarMeses } from '../src/domain/datas';
import { disponivelPorDia, lancamentosDoMes, relatorioMensal, validarLancamento } from '../src/domain/regras';
import { RepositorioSQLite } from '../src/data/RepositorioSQLite';
import { RepositorioMemoria } from '../src/data/RepositorioMemoria';
import { Repositorio } from '../src/data/Repositorio';
import { Categoria, Lancamento } from '../src/domain/types';

const cats: Categoria[] = [
  { id: 1, nome: 'Salário', tipo: 'receita', cor: '#0' },
  { id: 2, nome: 'Supermercado', tipo: 'despesa', cor: '#0' },
  { id: 3, nome: 'Lazer', tipo: 'despesa', cor: '#0' },
];
const L = (id: number, tipo: 'receita' | 'despesa', valor: number, data: string, cat: number): Lancamento =>
  ({ id, tipo, descricao: 'x', valorCentavos: valor, data, categoriaId: cat });

test('dinheiro: formatos de digitação menos comuns', () => {
  assert.equal(converterParaCentavos('1.234.567,89'), 123456789);
  assert.equal(converterParaCentavos('R$1.234'), 123400);
  assert.equal(converterParaCentavos('1 234,56'), 123456);
  assert.equal(converterParaCentavos('0,01'), 1);
  assert.equal(converterParaCentavos('1234.5'), 123450);
  for (const invalido of ['.5', ',5', '1.2345', '12,3,4', 'R$']) assert.equal(converterParaCentavos(invalido), null, invalido);
  assert.equal(formatarMoeda(-5), '-R$ 0,05');
});

test('datas: limites de dia e mês na leitura dd/mm/aaaa', () => {
  assert.equal(lerDataBR('00/10/2026'), null);
  assert.equal(lerDataBR('10/13/2026'), null);
  assert.equal(lerDataBR('10/00/2026'), null);
  assert.equal(lerDataBR('31/04/2026'), null);
  assert.equal(lerDataBR('29/02/2000'), '2000-02-29'); // divisível por 400: bissexto
  assert.equal(lerDataBR('29/02/1900'), null);         // divisível por 100: não é
  assert.equal(lerDataBR(' 05/09/2026 '), '2026-09-05');
  assert.equal(lerDataBR(''), null);
});

test('datas: máscara com texto vazio, letras ou já formatado', () => {
  assert.equal(mascaraData(''), '');
  assert.equal(mascaraData('ab'), '');
  assert.equal(mascaraData('2'), '2');
  assert.equal(mascaraData('25/09/2026'), '25/09/2026');
});

test('datas: diferença de dias e soma de meses em várias direções', () => {
  assert.equal(diferencaDias('2027-01-02', '2026-12-30'), -3);
  assert.equal(diferencaDias('2026-09-10', '2026-09-10'), 0);
  assert.equal(diferencaDias('2028-02-28', '2028-03-01'), 2);
  // horário de verão não pode gerar dia fracionado
  assert.equal(diferencaDias('2026-10-01', '2026-11-01'), 31);
  assert.equal(somarMeses('2026-01', -13), '2024-12');
  assert.equal(somarMeses('2026-05', 0), '2026-05');
});

test('datas: vencimento usa o último dia quando o dia não existe no mês', () => {
  assert.equal(dataVencimento('2026-02', 31), '2026-02-28');
  assert.equal(dataVencimento('2028-02', 30), '2028-02-29');
  assert.equal(dataVencimento('2026-04', 31), '2026-04-30');
  assert.equal(dataVencimento('2026-04', 15), '2026-04-15');
  assert.equal(dataVencimento('2026-04', 0), '2026-04-01');
});

test('RN01: receita com categoria de receita é aceita', () => {
  const receita = { tipo: 'receita' as const, descricao: 'salário', valorCentavos: 162100, data: '2026-09-05', categoriaId: 1 };
  assert.equal(validarLancamento(receita, cats), null);
  assert.equal(validarLancamento({ ...receita, categoriaId: 2 }, cats), 'A categoria escolhida não combina com o tipo do lançamento.');
  assert.equal(validarLancamento({ ...receita, valorCentavos: -100 }, cats), 'Informe um valor maior que zero.');
  assert.equal(validarLancamento({ ...receita, valorCentavos: NaN }, cats), 'Informe um valor maior que zero.');
});

test('RN02: ordenação atravessa a virada do mês sem misturar meses', () => {
  const ls = [L(1, 'despesa', 1, '2026-08-31', 2), L(2, 'despesa', 1, '2026-09-30', 2), L(3, 'despesa', 1, '2026-09-01', 2), L(4, 'despesa', 1, '2026-10-01', 2)];
  assert.deepEqual(lancamentosDoMes(ls, '2026-09').map(l => l.id), [2, 3]);
  assert.deepEqual(lancamentosDoMes(ls, '2026-11'), []);
});

test('RN03: dias restantes em fevereiro, dezembro e com saldo negativo', () => {
  assert.deepEqual(disponivelPorDia(2900, '2028-02', '2028-02-01'), { diasRestantes: 29, porDia: 100 });
  assert.deepEqual(disponivelPorDia(2800, '2026-02', '2026-02-01'), { diasRestantes: 28, porDia: 100 });
  assert.deepEqual(disponivelPorDia(3100, '2026-12', '2026-12-01'), { diasRestantes: 31, porDia: 100 });
  assert.equal(disponivelPorDia(0, '2026-09', '2026-09-15').porDia, 0);
  // saldo negativo arredonda para baixo: nunca mostra menos do que o usuário já passou
  assert.equal(disponivelPorDia(-1000, '2026-09', '2026-09-01').porDia, -34);
});

test('RN04: relatório compara janeiro com dezembro do ano anterior', () => {
  const ls = [L(1, 'despesa', 5000, '2027-01-10', 2), L(2, 'despesa', 8000, '2026-12-20', 2), L(3, 'despesa', 2000, '2026-11-20', 2)];
  const r = relatorioMensal(ls, cats, '2027-01');
  assert.equal(r.total, 5000);
  assert.equal(r.totalMesAnterior, 8000);
  assert.equal(r.linhas[0].valorMesAnterior, 8000);
});

test('RN04: categorias ordenadas do maior para o menor gasto e participações somam 100%', () => {
  const ls = [L(1, 'despesa', 1000, '2026-09-01', 2), L(2, 'despesa', 3000, '2026-09-02', 3), L(3, 'despesa', 500, '2026-09-03', 2)];
  const r = relatorioMensal(ls, cats, '2026-09');
  assert.deepEqual(r.linhas.map(l => l.categoria.id), [3, 2]);
  assert.equal(r.linhas.reduce((s, l) => s + l.participacao, 0), 1);
});

async function ordenacaoEExclusao(repo: Repositorio) {
  await repo.iniciar();
  const cat = (await repo.listarCategorias()).find(c => c.tipo === 'despesa')!;
  const novo = (data: string) => repo.inserirLancamento({ tipo: 'despesa', descricao: 'x', valorCentavos: 100, data, categoriaId: cat.id });
  const a = await novo('2026-09-10');
  const b = await novo('2026-09-20');
  const c = await novo('2026-09-10');
  assert.ok(a < b && b < c, 'ids crescentes');
  await repo.excluirLancamento(9999); // id inexistente não dá erro
  const lista = await repo.listarLancamentos();
  assert.equal(lista.length, 3);
  assert.deepEqual(lancamentosDoMes(lista, '2026-09').map(l => l.id), [b, c, a]);
  await repo.excluirLancamento(b);
  assert.deepEqual((await repo.listarLancamentos()).map(l => l.id).sort((x, y) => x - y), [a, c]);
}

test('repositórios: ids crescentes, ordenação e exclusão de id inexistente', async () => {
  await ordenacaoEExclusao(new RepositorioMemoria());
  await ordenacaoEExclusao(new RepositorioSQLite());
});

test('repositório em memória: dados corrompidos recomeçam com as categorias padrão', async () => {
  const arm = { ler: () => '{não é json', gravar: () => {} };
  const repo = new RepositorioMemoria(arm);
  await repo.iniciar();
  assert.equal((await repo.listarCategorias()).length, 13);
  assert.equal((await repo.listarLancamentos()).length, 0);
});
