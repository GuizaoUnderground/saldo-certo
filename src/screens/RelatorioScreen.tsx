import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { useApp } from '../state/AppContext';
import { relatorioMensal, resumoDoMes } from '../domain/regras';
import { formatarMoeda } from '../domain/dinheiro';
import { nomeDoMes, somarMeses } from '../domain/datas';
import { Cartao, Secao, SeletorMes, Tela, Vazio, st } from '../ui/componentes';
import { cores, espaco } from '../ui/tema';

/** RF12: despesas por categoria e comparação com o mês anterior */
export function RelatorioScreen() {
  const app = useApp();
  const rel = useMemo(() => relatorioMensal(app.lancamentos, app.categorias, app.mes), [app.lancamentos, app.categorias, app.mes]);
  const resumo = resumoDoMes(app.lancamentos, app.mes);
  const anterior = resumoDoMes(app.lancamentos, somarMeses(app.mes, -1));
  const maior = Math.max(1, ...rel.linhas.map(l => Math.max(l.valor, l.valorMesAnterior)));
  const variacao = rel.totalMesAnterior > 0 ? (rel.total - rel.totalMesAnterior) / rel.totalMesAnterior : null;

  return (
    <Tela titulo="Relatório">
      <SeletorMes mes={app.mes} onChange={app.setMes} />

      <Cartao>
        <View style={st.linha}>
          <Text style={st.suave}>Recebi</Text>
          <Text style={{ color: cores.receita, fontWeight: '700', fontSize: 16 }}>{formatarMoeda(resumo.receitas)}</Text>
        </View>
        <View style={[st.linha, { marginTop: 6 }]}>
          <Text style={st.suave}>Gastei</Text>
          <Text style={{ color: cores.despesa, fontWeight: '700', fontSize: 16 }}>{formatarMoeda(resumo.despesas)}</Text>
        </View>
        <View style={[st.linha, { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: cores.borda }]}>
          <Text style={[st.texto, { fontWeight: '700' }]}>Sobrou</Text>
          <Text style={{ color: resumo.saldo < 0 ? cores.despesa : cores.texto, fontWeight: '800', fontSize: 18 }}>{formatarMoeda(resumo.saldo)}</Text>
        </View>
        {variacao !== null && (
          <Text style={[st.suave, { marginTop: espaco.s }]}>
            Você gastou {Math.abs(Math.round(variacao * 100))}% {variacao > 0 ? 'a mais' : 'a menos'} que em {nomeDoMes(somarMeses(app.mes, -1))}
            {' '}({formatarMoeda(anterior.despesas)}).
          </Text>
        )}
      </Cartao>

      <Secao titulo="Gastos por categoria">
        {rel.linhas.length === 0 ? <Vazio texto="Sem gastos registrados neste mês." /> : (
          <Cartao>
            <View style={{ flexDirection: 'row', gap: 16, marginBottom: espaco.m }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 14, height: 8, borderRadius: 2, backgroundColor: cores.texto }} />
                <Text style={st.suave}>Este mês</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 14, height: 8, borderRadius: 2, backgroundColor: cores.trilha, borderWidth: 1, borderColor: cores.borda }} />
                <Text style={st.suave}>Mês anterior</Text>
              </View>
            </View>
            {rel.linhas.map(l => (
              <View key={l.categoria.id} style={{ marginBottom: espaco.m }}>
                <View style={st.linha}>
                  <Text style={[st.texto, { fontWeight: '600' }]}>{l.categoria.nome}</Text>
                  <Text style={[st.texto, { fontWeight: '700' }]}>{formatarMoeda(l.valor)}</Text>
                </View>
                <View style={{ height: 12, marginTop: 4, flexDirection: 'row' }}>
                  <View style={{ width: `${(l.valor / maior) * 100}%`, backgroundColor: l.categoria.cor, borderRadius: 4 }} />
                </View>
                <View style={{ height: 6, marginTop: 3, flexDirection: 'row' }}>
                  <View style={{ width: `${(l.valorMesAnterior / maior) * 100}%`, backgroundColor: cores.trilha, borderRadius: 3 }} />
                </View>
                <Text style={[st.suave, { marginTop: 2 }]}>
                  {Math.round(l.participacao * 100)}% dos gastos · mês anterior {formatarMoeda(l.valorMesAnterior)}
                </Text>
              </View>
            ))}
          </Cartao>
        )}
      </Secao>
    </Tela>
  );
}
