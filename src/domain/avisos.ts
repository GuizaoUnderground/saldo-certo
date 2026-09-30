import { ContaRecorrente, PagamentoConta } from './types';
import { dataVencimento, mesDe, paraDataISO, somarMeses } from './datas';
import { contaFoiPaga } from './regras';
import { formatarMoeda } from './dinheiro';

export interface AvisoPlanejado {
  quando: Date;
  corpo: string;
}

export const HORA_AVISO = 9;

function emData(dataISO: string, hora: number): Date {
  const [a, m, d] = dataISO.split('-').map(Number);
  return new Date(a, m - 1, d, hora, 0, 0);
}

/**
 * RF10: define quais notificações devem ser agendadas a partir de "agora".
 * Para cada conta ativa e não paga, no mês atual e no seguinte:
 * um aviso às 9h de (vencimento − antecedência) e outro às 9h do vencimento.
 * Avisos no passado são descartados (RN06: contas pagas não geram aviso).
 */
export function planejarAvisos(contas: ContaRecorrente[], pagamentos: PagamentoConta[], agora: Date): AvisoPlanejado[] {
  const mesAtual = mesDe(paraDataISO(agora));
  const avisos: AvisoPlanejado[] = [];
  for (const mes of [mesAtual, somarMeses(mesAtual, 1)]) {
    for (const conta of contas) {
      if (!conta.ativa || contaFoiPaga(conta.id, mes, pagamentos)) continue;
      const venc = dataVencimento(mes, conta.diaVencimento);
      const valor = formatarMoeda(conta.valorCentavos);
      const candidatos: AvisoPlanejado[] = [{ quando: emData(venc, HORA_AVISO), corpo: `${conta.descricao} vence hoje (${valor}).` }];
      if (conta.diasAntecedencia > 0) {
        const antes = emData(venc, HORA_AVISO);
        antes.setDate(antes.getDate() - conta.diasAntecedencia);
        const d = conta.diasAntecedencia;
        candidatos.push({ quando: antes, corpo: `${conta.descricao} vence em ${d} dia${d > 1 ? 's' : ''} (${valor}).` });
      }
      for (const c of candidatos) if (c.quando > agora) avisos.push(c);
    }
  }
  return avisos.sort((a, b) => a.quando.getTime() - b.quando.getTime());
}
