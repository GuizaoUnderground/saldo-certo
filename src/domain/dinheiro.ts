/** Utilitários para valores monetários em centavos (RNF06). */

/** Formata centavos como moeda brasileira: 123456 -> "R$ 1.234,56" */
export function formatarMoeda(centavos: number): string {
  const negativo = centavos < 0;
  const abs = Math.abs(Math.round(centavos));
  const reais = Math.floor(abs / 100);
  const cent = abs % 100;
  const reaisTxt = String(reais).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negativo ? '-' : ''}R$ ${reaisTxt},${String(cent).padStart(2, '0')}`;
}

/**
 * Converte o texto digitado pelo usuário em centavos.
 * Aceita "12", "12,5", "12,50", "1.234,56" e "12.50".
 * Retorna null quando o texto não é um valor válido.
 */
export function converterParaCentavos(texto: string): number | null {
  let t = texto.trim().replace(/^R\$\s*/, '').replace(/\s/g, '');
  if (!t) return null;
  if (t.includes(',')) {
    // formato brasileiro: pontos são separadores de milhar
    t = t.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(t)) {
    // "1.234" sem vírgula: interpretado como milhar
    t = t.replace(/\./g, '');
  }
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  const [inteiro, dec = ''] = t.split('.');
  return Number(inteiro) * 100 + Number(dec.padEnd(2, '0'));
}

/** Formata centavos para edição em campo de texto: 1250 -> "12,50" */
export function centavosParaTexto(centavos: number): string {
  return (centavos / 100).toFixed(2).replace('.', ',');
}
