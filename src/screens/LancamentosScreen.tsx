import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useApp } from '../state/AppContext';
import { TipoMovimento } from '../domain/types';
import { lancamentosDoMes, resumoDoMes } from '../domain/regras';
import { formatarData } from '../domain/datas';
import { formatarMoeda } from '../domain/dinheiro';
import { Botao, Cartao, SeletorMes, Tela, Valor, Vazio, st } from '../ui/componentes';
import { confirmar } from '../ui/confirmar';
import { cores, espaco } from '../ui/tema';

type Filtro = 'todos' | TipoMovimento;

/** RF02 e RF03: lista do mês com filtro por tipo e exclusão */
export function LancamentosScreen({ novoLancamento }: { novoLancamento: () => void }) {
  const app = useApp();
  const [filtro, setFiltro] = useState<Filtro>('todos');

  const lista = useMemo(
    () => lancamentosDoMes(app.lancamentos, app.mes).filter(l => filtro === 'todos' || l.tipo === filtro),
    [app.lancamentos, app.mes, filtro],
  );
  const resumo = resumoDoMes(app.lancamentos, app.mes);
  const catPorId = useMemo(() => new Map(app.categorias.map(c => [c.id, c])), [app.categorias]);

  // agrupa por dia
  const grupos: { data: string; itens: typeof lista }[] = [];
  for (const l of lista) {
    const g = grupos[grupos.length - 1];
    if (g && g.data === l.data) g.itens.push(l); else grupos.push({ data: l.data, itens: [l] });
  }

  async function excluir(id: number, descricao: string) {
    const ok = await confirmar('Excluir lançamento', `Deseja excluir "${descricao}"?`, 'Excluir');
    if (ok) await app.excluirLancamento(id);
  }

  return (
    <Tela titulo="Lançamentos" acao={<Botao texto="+ Novo" compacto onPress={novoLancamento} />}>
      <SeletorMes mes={app.mes} onChange={app.setMes} />

      <View style={[st.segmentos]}>
        {([['todos', 'Todos'], ['despesa', 'Gastos'], ['receita', 'Receitas']] as [Filtro, string][]).map(([f, r]) => (
          <Pressable key={f} onPress={() => setFiltro(f)} style={[st.segmento, { paddingVertical: 8 }, filtro === f && { backgroundColor: cores.texto, borderColor: cores.texto }]}>
            <Text style={[st.segmentoTxt, { fontSize: 14 }, filtro === f && { color: '#fff' }]}>{r}</Text>
          </Pressable>
        ))}
      </View>

      <View style={[st.linha, { marginBottom: espaco.m }]}>
        <Text style={st.suave}>Recebi <Text style={{ color: cores.receita, fontWeight: '700' }}>{formatarMoeda(resumo.receitas)}</Text></Text>
        <Text style={st.suave}>Gastei <Text style={{ color: cores.despesa, fontWeight: '700' }}>{formatarMoeda(resumo.despesas)}</Text></Text>
      </View>

      {grupos.length === 0 && <Vazio texto="Nenhum lançamento neste mês. Toque em “+ Novo” para registrar." />}

      {grupos.map(g => (
        <View key={g.data} style={{ marginBottom: espaco.s }}>
          <Text style={[st.suave, { fontWeight: '700', marginBottom: 4 }]}>{formatarData(g.data)}</Text>
          <Cartao style={{ paddingVertical: 4 }}>
            {g.itens.map((l, i) => {
              const cat = catPorId.get(l.categoriaId);
              return (
                <Pressable key={l.id} onLongPress={() => excluir(l.id, l.descricao)}
                  style={[st.linha, { paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: cores.borda }]}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: cat?.cor ?? '#999', marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[st.texto, { fontWeight: '600' }]} numberOfLines={1}>{l.descricao}</Text>
                    <Text style={st.suave}>{cat?.nome}</Text>
                  </View>
                  <Valor centavos={l.valorCentavos} tipo={l.tipo} />
                  <Pressable onPress={() => excluir(l.id, l.descricao)} accessibilityLabel={`Excluir ${l.descricao}`}
                    hitSlop={10} style={{ paddingLeft: 12 }}>
                    <Text style={{ color: cores.textoSuave, fontSize: 18 }}>✕</Text>
                  </Pressable>
                </Pressable>
              );
            })}
          </Cartao>
        </View>
      ))}
    </Tela>
  );
}
