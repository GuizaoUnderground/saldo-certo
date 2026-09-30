import { test } from 'node:test';
import assert from 'node:assert/strict';
import { converterParaCentavos, formatarMoeda } from '../src/domain/dinheiro';
import { dataVencimento, diferencaDias, lerDataBR, somarMeses, nomeDoMes } from '../src/domain/datas';
import {
  contasDoMes, disponivelPorDia, gerarAlertas, progressoDasMetas, relatorioMensal, resumoDoMes,
  situacaoDaMeta, totalContasPendentes, validarLancamento,
} from '../src/domain/regras';
import { Categoria, ContaRecorrente, Lancamento } from '../src/domain/types';
import { RepositorioMemoria } from '../src/data/RepositorioMemoria';

const cats: Categoria[] = [
  { id: 1, nome: 'Salário', tipo: 'receita', cor: '#0' },
  { id: 2, nome: 'Supermercado', tipo: 'despesa', cor: '#0' },
  { id: 3, nome: 'Contas da casa', tipo: 'despesa', cor: '#0' },
];
const L = (id: number, tipo: 'receita' | 'despesa', valor: number, data: string, cat: number): Lancamento =>
  ({ id, tipo, descricao: 'x', valorCentavos: valor, data, categoriaId: cat, contaId: null });

test('dinheiro: formatação e leitura', () => {
  assert.equal(formatarMoeda(123456), 'R$ 1.234,56');
  assert.equal(formatarMoeda(5), 'R$ 0,05');
  assert.equal(formatarMoeda(-1500), '-R$ 15,00');
  assert.equal(converterParaCentavos('12'), 1200);
  assert.equal(converterParaCentavos('12,5'), 1250);
  assert.equal(converterParaCentavos('1.234,56'), 123456);
  assert.equal(converterParaCentavos('R$ 99,90'), 9990);
  assert.equal(converterParaCentavos('12.50'), 1250);
  assert.equal(converterParaCentavos('1.500'), 150000);
  assert.equal(converterParaCentavos('abc'), null);
  assert.equal(converterParaCentavos('1,234'), null);
  assert.equal(converterParaCentavos(''), null);
});

test('datas: meses, vencimentos e leitura dd/mm/aaaa', () => {
  assert.equal(somarMeses('2026-12', 1), '2027-01');
  assert.equal(somarMeses('2026-01', -1), '2025-12');
  assert.equal(nomeDoMes('2026-09'), 'setembro de 2026');
  assert.equal(dataVencimento('2026-04', 31), '2026-04-30'); // RN04
  assert.equal(dataVencimento('2027-02', 30), '2027-02-28');
  assert.equal(dataVencimento('2026-09', 5), '2026-09-05');
  assert.equal(lerDataBR('5/9/2026'), '2026-09-05');
  assert.equal(lerDataBR('31/02/2026'), null);
  assert.equal(diferencaDias('2026-09-25', '2026-10-02'), 7);
});

test('RN01: validação de lançamento', () => {
  const base = { tipo: 'despesa' as const, descricao: 'mercado', valorCentavos: 1000, data: '2026-09-01', categoriaId: 2, contaId: null };
  assert.equal(validarLancamento(base, cats), null);
  assert.ok(validarLancamento({ ...base, valorCentavos: 0 }, cats));
  assert.ok(validarLancamento({ ...base, categoriaId: 1 }, cats)); // categoria de receita em despesa
  assert.ok(validarLancamento({ ...base, descricao: '  ' }, cats));
  // sem categoria e sem descrição: a mensagem deve pedir a categoria
  assert.equal(validarLancamento({ ...base, descricao: '', categoriaId: -1 }, cats), 'Escolha uma categoria.');
});

test('resumo do mês ignora outros meses', () => {
  const ls = [L(1, 'receita', 162100, '2026-09-05', 1), L(2, 'despesa', 50000, '2026-09-10', 2), L(3, 'despesa', 9999, '2026-08-30', 2)];
  assert.deepEqual(resumoDoMes(ls, '2026-09'), { receitas: 162100, despesas: 50000, saldo: 112100 });
});

test('RN03: situação das metas (80% e 100%)', () => {
  assert.equal(situacaoDaMeta(79, 100), 'ok');
  assert.equal(situacaoDaMeta(80, 100), 'atencao');
  assert.equal(situacaoDaMeta(100, 100), 'atencao');
  assert.equal(situacaoDaMeta(101, 100), 'estourada');
  const ls = [L(1, 'despesa', 45000, '2026-09-03', 2), L(2, 'despesa', 20000, '2026-09-04', 3)];
  const p = progressoDasMetas([{ categoriaId: 2, limiteCentavos: 50000 }, { categoriaId: 3, limiteCentavos: 30000 }, { categoriaId: 1, limiteCentavos: 1 }], cats, ls, '2026-09');
  assert.equal(p.length, 2); // meta em categoria de receita é ignorada (RN02)
  assert.equal(p[0].categoria.id, 2);
  assert.equal(p[0].situacao, 'atencao');
  assert.equal(p[0].restante, 5000);
});

test('RN05/RN06: situação das contas', () => {
  const conta = (id: number, dia: number, ant = 3): ContaRecorrente =>
    ({ id, descricao: 'Conta ' + id, valorCentavos: 10000, diaVencimento: dia, diasAntecedencia: ant, categoriaId: 3, ativa: true });
  const contas = [conta(1, 5), conta(2, 25), conta(3, 27), conta(4, 30), conta(5, 10)];
  const pag = [{ contaId: 5, mes: '2026-09', lancamentoId: 99 }];
  const r = contasDoMes(contas, '2026-09', '2026-09-25', pag);
  const sit = Object.fromEntries(r.map(c => [c.conta.id, c.situacao]));
  assert.deepEqual(sit, { 1: 'atrasada', 2: 'vence_hoje', 3: 'vence_em_breve', 4: 'pendente', 5: 'paga' });
  assert.equal(totalContasPendentes(r), 40000);
  // no mês seguinte a conta 5 volta a ficar pendente
  assert.equal(contasDoMes(contas, '2026-10', '2026-09-25', pag).find(c => c.conta.id === 5)!.situacao, 'pendente');
});

test('RN07/RN08: valor disponível por dia e alertas', () => {
  // 30 dias em setembro; no dia 25 restam 6 dias (25 a 30)
  const d = disponivelPorDia(100000, 40000, '2026-09', '2026-09-25');
  assert.equal(d.diasRestantes, 6);
  assert.equal(d.porDia, 10000);
  assert.equal(disponivelPorDia(1000, 0, '2026-08', '2026-09-25').porDia, null); // mês passado
  assert.equal(disponivelPorDia(3000, 0, '2026-10', '2026-09-25').diasRestantes, 31); // mês futuro
  const neg = disponivelPorDia(1000, 5000, '2026-09', '2026-09-25');
  const alertas = gerarAlertas([], [], neg, formatarMoeda);
  assert.equal(alertas[0].nivel, 'perigo');
  assert.match(alertas[0].texto, /R\$ 40,00/);
});

test('relatório compara com o mês anterior', () => {
  const ls = [L(1, 'despesa', 30000, '2026-09-01', 2), L(2, 'despesa', 10000, '2026-09-02', 3), L(3, 'despesa', 20000, '2026-08-15', 2)];
  const r = relatorioMensal(ls, cats, '2026-09');
  assert.equal(r.total, 40000);
  assert.equal(r.totalMesAnterior, 20000);
  assert.equal(r.linhas[0].categoria.id, 2);
  assert.equal(r.linhas[0].participacao, 0.75);
  assert.equal(r.linhas[0].valorMesAnterior, 20000);
});

test('repositório: pagar conta gera lançamento e excluir desfaz o pagamento (RF09)', async () => {
  const repo = new RepositorioMemoria();
  await repo.iniciar();
  const categorias = await repo.listarCategorias();
  const casa = categorias.find(c => c.nome === 'Contas da casa')!;
  const id = await repo.inserirConta({ descricao: 'Luz', valorCentavos: 15000, diaVencimento: 10, diasAntecedencia: 3, categoriaId: casa.id, ativa: true });
  const conta = (await repo.listarContas()).find(c => c.id === id)!;
  const lancId = await repo.pagarConta(conta, '2026-09', '2026-09-08');
  assert.equal((await repo.listarLancamentos()).length, 1);
  assert.equal((await repo.listarPagamentos()).length, 1);
  await assert.rejects(repo.pagarConta(conta, '2026-09', '2026-09-08'));
  await repo.excluirLancamento(lancId);
  assert.equal((await repo.listarPagamentos()).length, 0);
});
