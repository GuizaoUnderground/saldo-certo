import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { useApp } from '../state/AppContext';
import {
  contasDoMes, disponivelPorDia, gerarAlertas, progressoDasMetas, resumoDoMes, totalContasPendentes,
} from '../domain/regras';
import { formatarMoeda } from '../domain/dinheiro';
import { formatarData, mesDe } from '../domain/datas';
import { BarraProgresso, Botao, Cartao, Secao, SeletorMes, Tela, Valor, Vazio, st } from '../ui/componentes';
import { cores, espaco, fonte } from '../ui/tema';
import { corDaMeta } from './MetasScreen';
import { rotuloSituacao } from './ContasScreen';

/** RF11: painel do mês */
export function InicioScreen({ irPara, novoLancamento }: { irPara: (aba: string) => void; novoLancamento: () => void }) {
  const app = useApp();
  const { mes, hoje } = app;

  const v = useMemo(() => {
    const resumo = resumoDoMes(app.lancamentos, mes);
    const contas = contasDoMes(app.contas, mes, hoje, app.pagamentos);
    const pendentes = totalContasPendentes(contas);
    const disp = disponivelPorDia(resumo.saldo, pendentes, mes, hoje);
    const metas = progressoDasMetas(app.metas, app.categorias, app.lancamentos, mes);
    const alertas = mes === mesDe(hoje) ? gerarAlertas(metas, contas, disp, formatarMoeda) : [];
    return { resumo, contas, pendentes, disp, metas, alertas };
  }, [app.lancamentos, app.contas, app.pagamentos, app.metas, app.categorias, mes, hoje]);

  const proximas = v.contas.filter(c => c.situacao !== 'paga').slice(0, 3);
  const mesAtual = mes === mesDe(hoje);

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

      {v.disp.porDia !== null && (
        <Cartao style={{ backgroundColor: v.disp.previsto < 0 ? cores.perigoFundo : cores.primariaSuave, borderColor: 'transparent' }}>
          <Text style={[st.texto, { fontWeight: '600' }]}>
            {v.disp.previsto < 0
              ? 'Faltam para cobrir as despesas do mês'
              : mesAtual ? 'Você pode gastar por dia até o fim do mês' : 'Valor por dia previsto para o mês'}
          </Text>
          <Text style={{ fontSize: 28, fontWeight: '800', color: v.disp.previsto < 0 ? cores.perigo : cores.primaria, marginVertical: 2 }}>
            {formatarMoeda(v.disp.previsto < 0 ? -v.disp.previsto : v.disp.porDia)}
          </Text>
          <Text style={st.suave}>
            {v.pendentes > 0
              ? `Já descontei ${formatarMoeda(v.pendentes)} de contas a pagar. `
              : ''}
            {v.disp.diasRestantes} dia{v.disp.diasRestantes > 1 ? 's' : ''} restante{v.disp.diasRestantes > 1 ? 's' : ''}.
          </Text>
        </Cartao>
      )}

      <View style={{ marginBottom: espaco.l }}>
        <Botao texto="+ Registrar gasto ou receita" onPress={novoLancamento} />
      </View>

      {v.alertas.length > 0 && (
        <Secao titulo="Avisos">
          {v.alertas.map(a => (
            <View key={a.chave} style={{
              backgroundColor: a.nivel === 'perigo' ? cores.perigoFundo : cores.atencaoFundo,
              borderRadius: 12, padding: espaco.m, marginBottom: espaco.s,
              borderLeftWidth: 4, borderLeftColor: a.nivel === 'perigo' ? cores.perigo : cores.atencao,
            }}>
              <Text style={{ color: cores.texto, fontSize: fonte.normal }}>{a.texto}</Text>
            </View>
          ))}
        </Secao>
      )}

      <Secao titulo="Próximas contas" direita={<Botao texto="Ver todas" variante="texto" compacto onPress={() => irPara('contas')} />}>
        {proximas.length === 0 ? (
          <Cartao><Text style={st.suave}>{app.contas.length === 0 ? 'Cadastre suas contas fixas, como aluguel e luz, na aba Contas.' : 'Todas as contas deste mês estão pagas.'}</Text></Cartao>
        ) : (
          <Cartao>
            {proximas.map((c, i) => {
              const r = rotuloSituacao(c);
              return (
                <View key={c.conta.id} style={[st.linha, { paddingVertical: espaco.s, borderTopWidth: i ? 1 : 0, borderTopColor: cores.borda }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[st.texto, { fontWeight: '600' }]}>{c.conta.descricao}</Text>
                    <Text style={[st.suave, { color: r.cor }]}>{r.texto} · {formatarData(c.vencimento)}</Text>
                  </View>
                  <Valor centavos={c.conta.valorCentavos} />
                </View>
              );
            })}
          </Cartao>
        )}
      </Secao>

      <Secao titulo="Metas do mês" direita={<Botao texto="Ver todas" variante="texto" compacto onPress={() => irPara('metas')} />}>
        {v.metas.length === 0 ? (
          <Cartao><Text style={st.suave}>Defina quanto quer gastar em cada categoria na aba Metas.</Text></Cartao>
        ) : (
          <Cartao>
            {v.metas.slice(0, 3).map(m => (
              <View key={m.categoria.id} style={{ marginBottom: espaco.s }}>
                <View style={st.linha}>
                  <Text style={[st.texto, { fontWeight: '600' }]}>{m.categoria.nome}</Text>
                  <Text style={st.suave}>{formatarMoeda(m.gasto)} de {formatarMoeda(m.limite)}</Text>
                </View>
                <BarraProgresso fracao={m.percentual} cor={corDaMeta(m.situacao)} />
              </View>
            ))}
          </Cartao>
        )}
      </Secao>

      {app.lancamentos.length === 0 && <Vazio texto="Comece registrando o que você recebeu e gastou este mês." />}
    </Tela>
  );
}
