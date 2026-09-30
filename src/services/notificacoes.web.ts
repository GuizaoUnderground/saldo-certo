// No navegador não há notificações locais agendadas: os alertas aparecem só no painel.
import { ContaRecorrente, PagamentoConta } from '../domain/types';

export async function pedirPermissao(): Promise<boolean> {
  return false;
}

export async function reagendarAvisos(_c: ContaRecorrente[], _p: PagamentoConta[]): Promise<void> {
  /* sem efeito na web */
}
