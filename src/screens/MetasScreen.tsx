import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useApp } from '../state/AppContext';
import { Categoria } from '../domain/types';
import { gastosPorCategoria, situacaoDaMeta, SituacaoMeta } from '../domain/regras';
import { centavosParaTexto, converterParaCentavos, formatarMoeda } from '../domain/dinheiro';
import { BarraProgresso, Botao, Campo, Cartao, Etiqueta, SeletorMes, Tela, st } from '../ui/componentes';
import { Folha } from '../ui/Folha';
import { cores, espaco } from '../ui/tema';

export function corDaMeta(s: SituacaoMeta): string {
  return s === 'estourada' ? cores.perigo : s === 'atencao' ? cores.atencao : cores.primaria;
}

/** RF05, RF06 e RF07: limites mensais por categoria de despesa */
export function MetasScreen() {
  const app = useApp();
  const [editando, setEditando] = useState<Categoria | null>(null);
  const [valor, setValor] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const gastos = useMemo(() => gastosPorCategoria(app.lancamentos, app.mes), [app.lancamentos, app.mes]);
  const despesas = app.categorias.filter(c => c.tipo === 'despesa');
  const limites = new Map(app.metas.map(m => [m.categoriaId, m.limiteCentavos]));
  const comMeta = despesas.filter(c => limites.has(c.id));
  const semMeta = despesas.filter(c => !limites.has(c.id));

  const totalLimite = comMeta.reduce((s, c) => s + (limites.get(c.id) ?? 0), 0);
  const totalGasto = comMeta.reduce((s, c) => s + (gastos.get(c.id) ?? 0), 0);

  function abrir(c: Categoria) {
    const l = limites.get(c.id);
    setValor(l ? centavosParaTexto(l) : '');
    setErro(null);
    setEditando(c);
  }
  async function salvar() {
    if (!editando) return;
    const c = converterParaCentavos(valor);
    if (c === null || c <= 0) { setErro('Digite um valor maior que zero, por exemplo 600,00.'); return; }
    await app.salvarMeta(editando.id, c);
    setEditando(null);
  }
  async function remover() {
    if (!editando) return;
    await app.removerMeta(editando.id);
    setEditando(null);
  }

  return (
    <Tela titulo="Metas de gasto">
      <SeletorMes mes={app.mes} onChange={app.setMes} />

      {comMeta.length > 0 && (
        <Cartao style={{ backgroundColor: cores.primariaSuave, borderColor: 'transparent' }}>
          <Text style={st.suave}>Total das categorias com meta</Text>
          <Text style={[st.texto, { fontWeight: '700', fontSize: 18 }]}>
            {formatarMoeda(totalGasto)} de {formatarMoeda(totalLimite)}
          </Text>
          <BarraProgresso fracao={totalLimite ? totalGasto / totalLimite : 0} cor={corDaMeta(situacaoDaMeta(totalGasto, totalLimite))} />
        </Cartao>
      )}

      {comMeta.map(c => {
        const limite = limites.get(c.id)!;
        const gasto = gastos.get(c.id) ?? 0;
        const sit = situacaoDaMeta(gasto, limite);
        const pct = Math.round((gasto / limite) * 100);
        return (
          <Pressable key={c.id} onPress={() => abrir(c)} accessibilityRole="button" accessibilityLabel={`Editar meta de ${c.nome}`}>
            <Cartao>
              <View style={st.linha}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: c.cor }} />
                  <Text style={[st.texto, { fontWeight: '700' }]}>{c.nome}</Text>
                </View>
                {sit === 'estourada' && <Etiqueta texto="Estourou" cor={cores.perigo} fundo={cores.perigoFundo} />}
                {sit === 'atencao' && <Etiqueta texto="Atenção" cor={cores.atencao} fundo={cores.atencaoFundo} />}
              </View>
              <BarraProgresso fracao={gasto / limite} cor={corDaMeta(sit)} />
              <View style={st.linha}>
                <Text style={[st.suave, { flex: 1 }]}>{formatarMoeda(gasto)} de {formatarMoeda(limite)} ({pct}%)</Text>
                <Text style={[st.suave, { fontWeight: '700', color: gasto > limite ? cores.perigo : cores.texto }]}>
                  {gasto > limite ? `passou ${formatarMoeda(gasto - limite)}` : `resta ${formatarMoeda(limite - gasto)}`}
                </Text>
              </View>
            </Cartao>
          </Pressable>
        );
      })}

      <Text style={[st.suave, { marginTop: espaco.s, marginBottom: espaco.s }]}>
        {comMeta.length === 0
          ? 'Escolha uma categoria para definir quanto você quer gastar nela por mês. Aviso quando chegar em 80% e quando passar do limite.'
          : 'Categorias sem meta'}
      </Text>
      <View style={st.chips}>
        {semMeta.map(c => (
          <Pressable key={c.id} onPress={() => abrir(c)} style={st.chip} accessibilityRole="button">
            <View style={[st.bolinha, { backgroundColor: c.cor }]} />
            <Text style={st.chipTxt}>+ {c.nome}</Text>
          </Pressable>
        ))}
      </View>

      <Folha visivel={!!editando} titulo={`Meta: ${editando?.nome ?? ''}`} onFechar={() => setEditando(null)}>
        <Text style={[st.suave, { marginBottom: 12 }]}>
          Quanto você quer gastar, no máximo, com {editando?.nome.toLowerCase()} por mês?
        </Text>
        <Campo rotulo="Limite mensal (R$)" value={valor} onChangeText={setValor} keyboardType="decimal-pad" placeholder="0,00" erro={erro} autoFocus />
        <Botao texto="Salvar meta" onPress={salvar} />
        {editando && limites.has(editando.id) && (
          <View style={{ marginTop: 10 }}><Botao texto="Remover meta" variante="perigo" onPress={remover} /></View>
        )}
      </Folha>
    </Tela>
  );
}
