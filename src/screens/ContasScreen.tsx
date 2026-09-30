import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { useApp } from '../state/AppContext';
import { ContaRecorrente } from '../domain/types';
import { ContaDoMes, contasDoMes, totalContasPendentes } from '../domain/regras';
import { centavosParaTexto, converterParaCentavos, formatarMoeda } from '../domain/dinheiro';
import { formatarData } from '../domain/datas';
import { Botao, Campo, Cartao, Etiqueta, SeletorCategoria, SeletorMes, Tela, Valor, Vazio, st } from '../ui/componentes';
import { Folha } from '../ui/Folha';
import { confirmar } from '../ui/confirmar';
import { cores, espaco } from '../ui/tema';

export function rotuloSituacao(c: ContaDoMes): { texto: string; cor: string; fundo: string } {
  switch (c.situacao) {
    case 'paga': return { texto: 'Paga', cor: cores.receita, fundo: cores.primariaSuave };
    case 'atrasada': return { texto: 'Atrasada', cor: cores.perigo, fundo: cores.perigoFundo };
    case 'vence_hoje': return { texto: 'Vence hoje', cor: cores.atencao, fundo: cores.atencaoFundo };
    case 'vence_em_breve': return { texto: `Vence em ${c.diasParaVencer} dia${c.diasParaVencer > 1 ? 's' : ''}`, cor: cores.atencao, fundo: cores.atencaoFundo };
    default: return { texto: 'A pagar', cor: cores.info, fundo: cores.infoFundo };
  }
}

interface FormConta { descricao: string; valor: string; dia: string; antecedencia: string; categoriaId: number | null }
const FORM_VAZIO: FormConta = { descricao: '', valor: '', dia: '', antecedencia: '3', categoriaId: null };

/** RF08 e RF09: contas recorrentes e marcação de pagamento */
export function ContasScreen() {
  const app = useApp();
  const [form, setForm] = useState<FormConta | null>(null);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const lista = useMemo(() => contasDoMes(app.contas, app.mes, app.hoje, app.pagamentos),
    [app.contas, app.mes, app.hoje, app.pagamentos]);
  const pendente = totalContasPendentes(lista);
  const total = lista.reduce((s, c) => s + c.conta.valorCentavos, 0);
  const despesas = app.categorias.filter(c => c.tipo === 'despesa');

  function novo() { setEditandoId(null); setErro(null); setForm({ ...FORM_VAZIO, categoriaId: despesas.find(d => d.nome === 'Contas da casa')?.id ?? null }); }
  function editar(c: ContaRecorrente) {
    setEditandoId(c.id); setErro(null);
    setForm({ descricao: c.descricao, valor: centavosParaTexto(c.valorCentavos), dia: String(c.diaVencimento),
      antecedencia: String(c.diasAntecedencia), categoriaId: c.categoriaId });
  }

  async function salvar() {
    if (!form) return;
    const valor = converterParaCentavos(form.valor);
    const dia = Number(form.dia);
    const antecedencia = Number(form.antecedencia || '0');
    if (!form.descricao.trim()) return setErro('Dê um nome para a conta, por exemplo "Conta de luz".');
    if (valor === null || valor <= 0) return setErro('Digite o valor da conta, por exemplo 150,00.');
    if (!Number.isInteger(dia) || dia < 1 || dia > 31) return setErro('O dia de vencimento deve ser um número de 1 a 31.');
    if (!Number.isInteger(antecedencia) || antecedencia < 0 || antecedencia > 15) return setErro('O aviso deve ser de 0 a 15 dias antes.');
    if (form.categoriaId === null) return setErro('Escolha uma categoria.');
    const dados = { descricao: form.descricao, valorCentavos: valor, diaVencimento: dia, diasAntecedencia: antecedencia, categoriaId: form.categoriaId, ativa: true };
    if (editandoId === null) await app.adicionarConta(dados);
    else await app.atualizarConta({ ...dados, id: editandoId });
    setForm(null);
  }

  async function excluir() {
    if (editandoId === null) return;
    const ok = await confirmar('Excluir conta', 'A conta deixará de aparecer nos próximos meses. Os pagamentos já feitos continuam nos lançamentos.', 'Excluir');
    if (ok) { await app.excluirConta(editandoId); setForm(null); }
  }

  async function desfazer(c: ContaDoMes) {
    const ok = await confirmar('Desfazer pagamento', `O lançamento de "${c.conta.descricao}" será removido.`, 'Desfazer');
    if (ok) await app.desfazerPagamento(c.conta.id, app.mes);
  }

  return (
    <Tela titulo="Contas do mês" acao={<Botao texto="+ Nova" compacto onPress={novo} />}>
      <SeletorMes mes={app.mes} onChange={app.setMes} />

      {lista.length > 0 && (
        <Cartao style={{ backgroundColor: cores.infoFundo, borderColor: 'transparent' }}>
          <View style={st.linha}>
            <View>
              <Text style={st.suave}>Falta pagar</Text>
              <Text style={{ fontSize: 24, fontWeight: '800', color: pendente ? cores.info : cores.receita }}>{formatarMoeda(pendente)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={st.suave}>Total de contas</Text>
              <Text style={[st.texto, { fontWeight: '700' }]}>{formatarMoeda(total)}</Text>
            </View>
          </View>
        </Cartao>
      )}

      {lista.length === 0 && <Vazio texto="Cadastre as contas que vencem todo mês, como aluguel, luz, água e internet. Eu aviso antes do vencimento." />}

      {lista.map(c => {
        const r = rotuloSituacao(c);
        return (
          <Cartao key={c.conta.id} testID={`conta-${c.conta.descricao}`}>
            <View style={st.linha}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={[st.texto, { fontWeight: '700' }]}>{c.conta.descricao}</Text>
                <Text style={st.suave}>Vence em {formatarData(c.vencimento)}</Text>
              </View>
              <Valor centavos={c.conta.valorCentavos} />
            </View>
            <View style={[st.linha, { marginTop: espaco.s, flexWrap: 'wrap', gap: 8 }]}>
              <Etiqueta texto={r.texto} cor={r.cor} fundo={r.fundo} />
              <View style={{ flexDirection: 'row', gap: 8, marginLeft: 'auto' }}>
                <Botao texto="Editar" variante="texto" compacto onPress={() => editar(c.conta)} />
                {c.situacao === 'paga'
                  ? <Botao texto="Desfazer" variante="secundario" compacto onPress={() => desfazer(c)} />
                  : <Botao texto="Paguei" compacto onPress={() => app.pagarConta(c.conta, app.mes)} />}
              </View>
            </View>
          </Cartao>
        );
      })}

      <Folha visivel={!!form} titulo={editandoId === null ? 'Nova conta' : 'Editar conta'} onFechar={() => setForm(null)}>
        {form && (
          <>
            <Campo rotulo="Nome da conta" value={form.descricao} onChangeText={t => setForm({ ...form, descricao: t })} placeholder="Ex.: Conta de luz" maxLength={40} />
            <Campo rotulo="Valor (R$)" value={form.valor} onChangeText={t => setForm({ ...form, valor: t })} keyboardType="decimal-pad" placeholder="0,00" />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Campo rotulo="Dia do vencimento" value={form.dia} onChangeText={t => setForm({ ...form, dia: t.replace(/\D/g, '') })} keyboardType="number-pad" placeholder="10" maxLength={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Campo rotulo="Avisar quantos dias antes" value={form.antecedencia} onChangeText={t => setForm({ ...form, antecedencia: t.replace(/\D/g, '') })} keyboardType="number-pad" maxLength={2} />
              </View>
            </View>
            <Text style={st.rotulo}>Categoria</Text>
            <SeletorCategoria categorias={despesas} selecionada={form.categoriaId} onChange={id => setForm({ ...form, categoriaId: id })} />
            {erro ? <Text style={[st.erro, { marginBottom: 12, fontSize: 15 }]}>{erro}</Text> : null}
            <Botao texto="Salvar conta" onPress={salvar} />
            {editandoId !== null && <View style={{ marginTop: 10 }}><Botao texto="Excluir conta" variante="perigo" onPress={excluir} /></View>}
          </>
        )}
      </Folha>
    </Tela>
  );
}
