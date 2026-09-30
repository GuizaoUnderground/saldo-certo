import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AppProvider, useApp } from './src/state/AppContext';
import { InicioScreen } from './src/screens/InicioScreen';
import { LancamentosScreen } from './src/screens/LancamentosScreen';
import { RelatorioScreen } from './src/screens/RelatorioScreen';
import { FormLancamento } from './src/screens/FormLancamento';
import { cores } from './src/ui/tema';

type Aba = 'inicio' | 'lancamentos' | 'relatorio';

const ABAS: { id: Aba; rotulo: string; icone: string }[] = [
  { id: 'inicio', rotulo: 'Início', icone: '⌂' },
  { id: 'lancamentos', rotulo: 'Lançamentos', icone: '≡' },
  { id: 'relatorio', rotulo: 'Relatório', icone: '▮' },
];

function Conteudo() {
  const { pronto } = useApp();
  const [aba, setAba] = useState<Aba>('inicio');
  const [formAberto, setFormAberto] = useState(false);

  if (!pronto) {
    return <View style={s.carregando}><ActivityIndicator size="large" color={cores.primaria} /></View>;
  }

  const novo = () => setFormAberto(true);
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        {aba === 'inicio' && <InicioScreen irPara={a => setAba(a as Aba)} novoLancamento={novo} />}
        {aba === 'lancamentos' && <LancamentosScreen novoLancamento={novo} />}
        {aba === 'relatorio' && <RelatorioScreen />}
      </View>
      <View style={s.barra} accessibilityRole="tablist">
        {ABAS.map(a => {
          const ativa = a.id === aba;
          return (
            <Pressable key={a.id} style={s.aba} onPress={() => setAba(a.id)} accessibilityRole="tab" accessibilityState={{ selected: ativa }}>
              <Text style={[s.icone, ativa && { color: cores.primaria }]}>{a.icone}</Text>
              <Text style={[s.rotulo, ativa && { color: cores.primaria, fontWeight: '700' }]}>{a.rotulo}</Text>
            </Pressable>
          );
        })}
      </View>
      <FormLancamento visivel={formAberto} onFechar={() => setFormAberto(false)} />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        <AppProvider>
          <Conteudo />
        </AppProvider>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  carregando: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  barra: {
    flexDirection: 'row', borderTopWidth: 1, borderTopColor: cores.borda, backgroundColor: cores.superficie,
    paddingTop: 6, paddingBottom: 8,
  },
  aba: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  icone: { fontSize: 20, color: cores.textoSuave },
  rotulo: { fontSize: 11, color: cores.textoSuave, marginTop: 2 },
});
