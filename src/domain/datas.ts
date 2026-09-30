import { DataISO, MesISO } from './types';

const pad = (n: number) => String(n).padStart(2, '0');

export const NOMES_MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

/** Converte um objeto Date para AAAA-MM-DD usando o horário local */
export function paraDataISO(d: Date): DataISO {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function hojeISO(): DataISO {
  return paraDataISO(new Date());
}

export function mesDe(data: DataISO): MesISO {
  return data.slice(0, 7);
}

export function diasNoMes(mes: MesISO): number {
  const [a, m] = mes.split('-').map(Number);
  return new Date(a, m, 0).getDate();
}

/** Soma (ou subtrai) meses: somarMeses('2026-12', 1) -> '2027-01' */
export function somarMeses(mes: MesISO, n: number): MesISO {
  const [a, m] = mes.split('-').map(Number);
  const total = a * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${pad((total % 12) + 1)}`;
}

/** "2026-09" -> "setembro de 2026" */
export function nomeDoMes(mes: MesISO): string {
  const [a, m] = mes.split('-').map(Number);
  return `${NOMES_MESES[m - 1]} de ${a}`;
}

/** "2026-09-25" -> "25/09/2026" */
export function formatarData(data: DataISO): string {
  const [a, m, d] = data.split('-');
  return `${d}/${m}/${a}`;
}

/** "25/09/2026" -> "2026-09-25" (ou null se inválida) */
export function lerDataBR(texto: string): DataISO | null {
  const m = texto.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (!m) return null;
  const [dia, mes] = [Number(m[1]), Number(m[2])];
  const ano = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  if (mes < 1 || mes > 12 || dia < 1) return null;
  if (dia > diasNoMes(`${ano}-${pad(mes)}`)) return null;
  return `${ano}-${pad(mes)}-${pad(dia)}`;
}

/** Diferença em dias entre duas datas ISO (b - a) */
export function diferencaDias(a: DataISO, b: DataISO): number {
  const [a1, m1, d1] = a.split('-').map(Number);
  const [a2, m2, d2] = b.split('-').map(Number);
  const t1 = Date.UTC(a1, m1 - 1, d1);
  const t2 = Date.UTC(a2, m2 - 1, d2);
  return Math.round((t2 - t1) / 86400000);
}

/**
 * Data de um dia em determinado mês: se o dia não existe no mês
 * (ex.: 31 de abril), usa o último dia. Será usada no TCC II para
 * calcular o vencimento das contas recorrentes.
 */
export function dataVencimento(mes: MesISO, dia: number): DataISO {
  const ultimo = diasNoMes(mes);
  return `${mes}-${pad(Math.min(Math.max(dia, 1), ultimo))}`;
}

/** Máscara de digitação: "25092026" -> "25/09/2026" (aceita apenas números) */
export function mascaraData(texto: string): string {
  const d = texto.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}
