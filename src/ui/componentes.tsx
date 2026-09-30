import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { cores, espaco, fonte, raio } from './tema';
import { MesISO, TipoMovimento, Categoria } from '../domain/types';
import { nomeDoMes, somarMeses } from '../domain/datas';
import { formatarMoeda } from '../domain/dinheiro';

// ------------------------------------------------------------------ Tela
export function Tela({ titulo, children, acao }: { titulo: string; children: React.ReactNode; acao?: React.ReactNode }) {
  return (
    <View style={st.tela}>
      <View style={st.cabecalho}>
        <Text style={st.titulo} accessibilityRole="header">{titulo}</Text>
        {acao}
      </View>
      <ScrollView contentContainerStyle={st.conteudo} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </View>
  );
}

// ------------------------------------------------------------------ Cartão
export function Cartao({ children, style, testID }: { children: React.ReactNode; style?: ViewStyle; testID?: string }) {
  return <View style={[st.cartao, style]} testID={testID}>{children}</View>;
}

export function Secao({ titulo, children, direita }: { titulo: string; children: React.ReactNode; direita?: React.ReactNode }) {
  return (
    <View style={{ marginBottom: espaco.l }}>
      <View style={st.linhaSecao}>
        <Text style={st.tituloSecao}>{titulo}</Text>
        {direita}
      </View>
      {children}
    </View>
  );
}

// ------------------------------------------------------------------ Botão
type VarianteBotao = 'primario' | 'secundario' | 'perigo' | 'texto';
export function Botao({ texto, onPress, variante = 'primario', desabilitado, compacto }: {
  texto: string; onPress: () => void; variante?: VarianteBotao; desabilitado?: boolean; compacto?: boolean;
}) {
  const estilo = {
    primario: { fundo: cores.primaria, texto: '#fff', borda: cores.primaria },
    secundario: { fundo: cores.superficie, texto: cores.primaria, borda: cores.primaria },
    perigo: { fundo: cores.superficie, texto: cores.perigo, borda: cores.perigo },
    texto: { fundo: 'transparent', texto: cores.primaria, borda: 'transparent' },
  }[variante];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={desabilitado ? undefined : onPress}
      style={({ pressed }) => [
        st.botao, compacto && st.botaoCompacto,
        { backgroundColor: estilo.fundo, borderColor: estilo.borda, opacity: desabilitado ? 0.5 : pressed ? 0.8 : 1 },
      ]}>
      <Text style={[st.textoBotao, compacto && { fontSize: fonte.pequena }, { color: estilo.texto }]}>{texto}</Text>
    </Pressable>
  );
}

// ------------------------------------------------------------------ Campo
export function Campo({ rotulo, erro, ...props }: TextInputProps & { rotulo: string; erro?: string | null }) {
  return (
    <View style={{ marginBottom: espaco.m }}>
      <Text style={st.rotulo}>{rotulo}</Text>
      <TextInput
        placeholderTextColor={cores.textoSuave}
        accessibilityLabel={rotulo}
        {...props}
        style={[st.input, erro ? { borderColor: cores.perigo } : null]}
      />
      {erro ? <Text style={st.erro}>{erro}</Text> : null}
    </View>
  );
}

// ------------------------------------------------------------------ Seletor de mês (RF07)
export function SeletorMes({ mes, onChange }: { mes: MesISO; onChange: (m: MesISO) => void }) {
  return (
    <View style={st.seletorMes}>
      <Pressable accessibilityLabel="Mês anterior" onPress={() => onChange(somarMeses(mes, -1))} style={st.seta}>
        <Text style={st.setaTxt}>‹</Text>
      </Pressable>
      <Text style={st.mesTxt}>{nomeDoMes(mes)}</Text>
      <Pressable accessibilityLabel="Próximo mês" onPress={() => onChange(somarMeses(mes, 1))} style={st.seta}>
        <Text style={st.setaTxt}>›</Text>
      </Pressable>
    </View>
  );
}

// ------------------------------------------------------------------ Barra de progresso
export function BarraProgresso({ fracao, cor }: { fracao: number; cor: string }) {
  const larg = `${Math.max(0, Math.min(1, fracao)) * 100}%` as const;
  return (
    <View style={st.trilha}>
      <View style={[st.preenchimento, { width: larg, backgroundColor: cor }]} />
    </View>
  );
}

// ------------------------------------------------------------------ Seletor de tipo e de categoria
export function SeletorTipo({ tipo, onChange }: { tipo: TipoMovimento; onChange: (t: TipoMovimento) => void }) {
  const op: { t: TipoMovimento; rotulo: string; cor: string }[] = [
    { t: 'despesa', rotulo: 'Gastei', cor: cores.despesa },
    { t: 'receita', rotulo: 'Recebi', cor: cores.receita },
  ];
  return (
    <View style={st.segmentos}>
      {op.map(o => {
        const ativo = o.t === tipo;
        return (
          <Pressable key={o.t} onPress={() => onChange(o.t)} accessibilityRole="button" accessibilityState={{ selected: ativo }}
            style={[st.segmento, ativo && { backgroundColor: o.cor, borderColor: o.cor }]}>
            <Text style={[st.segmentoTxt, ativo && { color: '#fff' }]}>{o.rotulo}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SeletorCategoria({ categorias, selecionada, onChange }: {
  categorias: Categoria[]; selecionada: number | null; onChange: (id: number) => void;
}) {
  return (
    <View style={st.chips}>
      {categorias.map(c => {
        const ativo = c.id === selecionada;
        return (
          <Pressable key={c.id} onPress={() => onChange(c.id)} accessibilityRole="button" accessibilityState={{ selected: ativo }}
            style={[st.chip, ativo && { backgroundColor: c.cor, borderColor: c.cor }]}>
            <View style={[st.bolinha, { backgroundColor: ativo ? '#fff' : c.cor }]} />
            <Text style={[st.chipTxt, ativo && { color: '#fff' }]}>{c.nome}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ------------------------------------------------------------------ Valores
export function Valor({ centavos, tipo, grande, style }: {
  centavos: number; tipo?: TipoMovimento | 'saldo'; grande?: boolean; style?: object;
}) {
  const cor = tipo === 'receita' ? cores.receita : tipo === 'despesa' ? cores.despesa
    : tipo === 'saldo' ? (centavos < 0 ? cores.despesa : cores.texto) : cores.texto;
  const sinal = tipo === 'despesa' ? '− ' : tipo === 'receita' ? '+ ' : '';
  return (
    <Text style={[{ color: cor, fontSize: grande ? fonte.destaque : fonte.normal, fontWeight: '700' }, style]}>
      {sinal}{formatarMoeda(centavos)}
    </Text>
  );
}

export function Vazio({ texto }: { texto: string }) {
  return <Text style={st.vazio}>{texto}</Text>;
}

export function Etiqueta({ texto, cor, fundo }: { texto: string; cor: string; fundo: string }) {
  return (
    <View style={[st.etiqueta, { backgroundColor: fundo }]}>
      <Text style={[st.etiquetaTxt, { color: cor }]}>{texto}</Text>
    </View>
  );
}

// ------------------------------------------------------------------ estilos
export const st = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  cabecalho: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: espaco.l, paddingTop: espaco.m, paddingBottom: espaco.s,
  },
  titulo: { fontSize: fonte.grande, fontWeight: '700', color: cores.texto },
  conteudo: { paddingHorizontal: espaco.l, paddingBottom: 96 },
  cartao: {
    backgroundColor: cores.superficie, borderRadius: raio, padding: espaco.l, marginBottom: espaco.m,
    borderWidth: 1, borderColor: cores.borda,
  },
  linhaSecao: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: espaco.s },
  tituloSecao: { fontSize: fonte.media, fontWeight: '700', color: cores.texto },
  botao: {
    borderWidth: 1.5, borderRadius: 12, paddingVertical: 14, paddingHorizontal: espaco.l,
    alignItems: 'center', justifyContent: 'center',
  },
  botaoCompacto: { paddingVertical: 8, paddingHorizontal: espaco.m },
  textoBotao: { fontSize: fonte.normal, fontWeight: '700' },
  rotulo: { fontSize: fonte.pequena, color: cores.textoSuave, marginBottom: espaco.xs, fontWeight: '600' },
  input: {
    borderWidth: 1.5, borderColor: cores.borda, borderRadius: 10, paddingHorizontal: espaco.m, paddingVertical: 12,
    fontSize: fonte.media, color: cores.texto, backgroundColor: cores.superficie,
  },
  erro: { color: cores.perigo, fontSize: fonte.pequena, marginTop: espaco.xs },
  seletorMes: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: cores.superficie, borderRadius: raio, borderWidth: 1, borderColor: cores.borda,
    marginBottom: espaco.m,
  },
  seta: { paddingHorizontal: espaco.l, paddingVertical: espaco.s },
  setaTxt: { fontSize: 28, color: cores.primaria, fontWeight: '700' },
  mesTxt: { fontSize: fonte.media, fontWeight: '700', color: cores.texto },
  trilha: { height: 10, borderRadius: 5, backgroundColor: cores.trilha, overflow: 'hidden', marginVertical: espaco.s },
  preenchimento: { height: 10, borderRadius: 5 },
  segmentos: { flexDirection: 'row', gap: espaco.s, marginBottom: espaco.m },
  segmento: {
    flex: 1, borderWidth: 1.5, borderColor: cores.borda, borderRadius: 12, paddingVertical: 12, alignItems: 'center',
    backgroundColor: cores.superficie,
  },
  segmentoTxt: { fontSize: fonte.normal, fontWeight: '700', color: cores.texto },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.s, marginBottom: espaco.m },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: cores.borda,
    borderRadius: 20, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: cores.superficie,
  },
  bolinha: { width: 10, height: 10, borderRadius: 5 },
  chipTxt: { fontSize: fonte.pequena, color: cores.texto, fontWeight: '600' },
  vazio: { color: cores.textoSuave, fontSize: fonte.normal, textAlign: 'center', paddingVertical: espaco.xl },
  etiqueta: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  etiquetaTxt: { fontSize: 13, fontWeight: '700' },
  linha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  suave: { color: cores.textoSuave, fontSize: fonte.pequena },
  texto: { color: cores.texto, fontSize: fonte.normal },
});
