import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { useApp } from '../state/AppContext';
import { disponivelPorDia, lancamentosDoMes, relatorioMensal, resumoDoMes } from '../domain/regras';
import { formatarMoeda } from '../domain/dinheiro';
import { formatarData } from '../domain/datas';
import { BarraProgresso, Botao, Cartao, Secao, SeletorMes, Tela, Valor, Vazio, st } from '../ui/componentes';
import { cores, espaco } from '../ui/tema';

/** RF05: painel do mês */
export function InicioScreen({ irPara, novoLancamento }: {
  irPara: (aba: 'lancamentos' | 'relatorio') => void; novoLancamento: () => void;
}) {
  const app = useApp();
  const { mes, hoje } = app;

  const v = useMemo(() => {
    const resumo = resumoDoMes(app.lancamentos, mes);
    const disp = disponivelPorDia(resumo.saldo, mes, hoje);
    const rel = relatorioMensal(app.lancamentos, app.categorias, mes);
    const ultimos = lancamentosDoMes(app.lancamentos, mes).slice(0, 3);
    return { resumo, disp, rel, ultimos };
  }, [app.lancamentos, app.categorias, mes, hoje]);

  const catPorId = new Map(app.categorias.map(c => [c.id, c]));
  const topo = v.rel.linhas.filter(l => l.valor > 0).slice(0, 3);
  const negativo = v.resumo.saldo < 0;

  return (
    <Tela titulo="Saldo Certo">
      <SeletorMes mes={mes} onChange={app.setMes} />

      <Cartao>
        <Text style={st.suave}>Saldo do mês</Text>
        <Valor centavos={v.resumo.saldo} tipo="saldo" grande />
        <View style={[st.linha, { marginTop: espaco.m }]}>
          <View>
            <Text style={st.suave}>Recebi</Text>
            <Valor centavos={v.resumo.receitas} tipo="receita" />
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={st.suave}>Gastei</Text>
            <Valor centavos={v.resumo.despesas} tipo="despesa" />
          </View>
        </View>
      </Cartao>

      {v.disp.porDia !== null && (v.resumo.receitas > 0 || v.resumo.despesas > 0) && (
        <Cartao style={{ backgroundColor: negativo ? cores.perigoFundo : cores.primariaSuave, borderColor: 'transparent' }}>
          <Text style={[st.texto, { fontWeight: '600' }]}>
            {negativo ? 'Você gastou mais do que recebeu neste mês' : 'Você pode gastar por dia até o fim do mês'}
          </Text>
          <Text style={{ fontSize: 28, fontWeight: '800', color: negativo ? cores.perigo : cores.primaria, marginVertical: 2 }}>
            {formatarMoeda(negativo ? -v.resumo.saldo : (v.disp.porDia ?? 0))}
          </Text>
          <Text style={st.suave}>
            {negativo
              ? 'Esse é o valor que passou da sua renda do mês.'
              : `Faltam ${v.disp.diasRestantes} dia${v.disp.diasRestantes > 1 ? 's' : ''} para o fim do mês, contando hoje.`}
          </Text>
        </Cartao>
      )}

      <View style={{ marginBottom: espaco.l }}>
        <Botao texto="+ Registrar gasto ou receita" onPress={novoLancamento} />
      </View>

      <Secao titulo="Onde mais gastei" direita={<Botao texto="Ver relatório" variante="texto" compacto onPress={() => irPara('relatorio')} />}>
        {topo.length === 0 ? (
          <Cartao><Text style={st.suave}>Os gastos por categoria aparecem aqui quando você registrar despesas.</Text></Cartao>
        ) : (
          <Cartao>
            {topo.map(l => (
              <View key={l.categoria.id} style={{ marginBottom: espaco.s }}>
                <View style={st.linha}>
                  <Text style={[st.texto, { fontWeight: '600' }]}>{l.categoria.nome}</Text>
                  <Text style={st.suave}>{formatarMoeda(l.valor)} · {Math.round(l.participacao * 100)}%</Text>
                </View>
                <BarraProgresso fracao={l.participacao} cor={l.categoria.cor} />
              </View>
            ))}
          </Cartao>
        )}
      </Secao>

      <Secao titulo="Últimos lançamentos" direita={<Botao texto="Ver todos" variante="texto" compacto onPress={() => irPara('lancamentos')} />}>
        {v.ultimos.length === 0 ? (
          <Vazio texto="Comece registrando o que você recebeu e gastou neste mês." />
        ) : (
          <Cartao style={{ paddingVertical: 4 }}>
            {v.ultimos.map((l, i) => (
              <View key={l.id} style={[st.linha, { paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: cores.borda }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[st.texto, { fontWeight: '600' }]} numberOfLines={1}>{l.descricao}</Text>
                  <Text style={st.suave}>{catPorId.get(l.categoriaId)?.nome} · {formatarData(l.data)}</Text>
                </View>
                <Valor centavos={l.valorCentavos} tipo={l.tipo} />
              </View>
            ))}
          </Cartao>
        )}
      </Secao>
    </Tela>
  );
}
