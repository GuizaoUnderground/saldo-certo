/**
 * Serviço de notificações locais (RF10), usando expo-notifications.
 * A cada alteração em contas ou pagamentos, os avisos são reagendados:
 * para cada conta ativa ainda não paga, um aviso às 9h do dia
 * (vencimento − antecedência) e outro no próprio dia do vencimento.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { ContaRecorrente, PagamentoConta } from '../domain/types';
import { planejarAvisos } from '../domain/avisos';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function pedirPermissao(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('vencimentos', {
      name: 'Vencimento de contas',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const atual = await Notifications.getPermissionsAsync();
  if (atual.granted) return true;
  const pedido = await Notifications.requestPermissionsAsync();
  return pedido.granted;
}

/** Cancela os avisos antigos e agenda os do mês atual e do seguinte. */
export async function reagendarAvisos(contas: ContaRecorrente[], pagamentos: PagamentoConta[]): Promise<void> {
  // só pede permissão quando o usuário já cadastrou alguma conta,
  // para não mostrar o pedido logo na primeira abertura do app
  if (!contas.some(c => c.ativa)) {
    await Notifications.cancelAllScheduledNotificationsAsync();
    return;
  }
  const ok = await pedirPermissao();
  if (!ok) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const aviso of planejarAvisos(contas, pagamentos, new Date())) {
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Saldo Certo', body: aviso.corpo },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: aviso.quando,
        channelId: 'vencimentos',
      },
    });
  }
}
