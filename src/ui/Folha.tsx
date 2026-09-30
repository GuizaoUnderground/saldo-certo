import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { cores, espaco, fonte } from './tema';

/** Painel que sobe da parte de baixo da tela, usado pelos formulários */
export function Folha({ visivel, titulo, onFechar, children }: {
  visivel: boolean; titulo: string; onFechar: () => void; children: React.ReactNode;
}) {
  return (
    <Modal visible={visivel} transparent animationType="slide" onRequestClose={onFechar}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.fundo}>
        <Pressable style={s.area} onPress={onFechar} accessibilityLabel="Fechar" />
        <View style={s.folha}>
          <View style={s.topo}>
            <Text style={s.titulo}>{titulo}</Text>
            <Pressable onPress={onFechar} accessibilityRole="button" accessibilityLabel="Cancelar">
              <Text style={s.fechar}>Cancelar</Text>
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: espaco.xl }}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  area: { flex: 1 },
  folha: {
    backgroundColor: cores.fundo, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: espaco.l, paddingTop: espaco.l, maxHeight: '90%',
  },
  topo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: espaco.m },
  titulo: { fontSize: fonte.grande, fontWeight: '700', color: cores.texto },
  fechar: { fontSize: fonte.normal, color: cores.primaria, fontWeight: '700' },
});
