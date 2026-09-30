import { Alert } from 'react-native';

/** Pergunta de confirmação antes de ações destrutivas (heurística "prevenção de erros") */
export function confirmar(titulo: string, mensagem: string, textoOk = 'Confirmar'): Promise<boolean> {
  return new Promise(resolve => {
    Alert.alert(titulo, mensagem, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: textoOk, style: 'destructive', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}
