import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useApp } from '../state/AppContext';
import { TipoMovimento } from '../domain/types';
import { converterParaCentavos } from '../domain/dinheiro';
import { formatarData, lerDataBR, mascaraData } from '../domain/datas';
import { validarLancamento } from '../domain/regras';
import { Botao, Campo, SeletorCategoria, SeletorTipo, st } from '../ui/componentes';
import { Folha } from '../ui/Folha';
import { cores } from '../ui/tema';

/** RF01: registro de receita ou despesa em uma única tela (RNF05) */
export function FormLancamento({ visivel, onFechar }: { visivel: boolean; onFechar: () => void }) {
  const app = useApp();
  const [tipo, setTipo] = useState<TipoMovimento>('despesa');
  const [valor, setValor] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [data, setData] = useState(formatarData(app.hoje));
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (visivel) {
      setTipo('despesa'); setValor(''); setDescricao(''); setCategoriaId(null);
      setData(formatarData(app.hoje)); setErro(null);
    }
  }, [visivel, app.hoje]);

  const categorias = app.categorias.filter(c => c.tipo === tipo);

  async function salvar() {
    const centavos = converterParaCentavos(valor);
    if (centavos === null || centavos <= 0) { setErro('Digite o valor, por exemplo 25,90.'); return; }
    const dataISO = lerDataBR(data);
    if (!dataISO) { setErro('Digite a data no formato dia/mês/ano, por exemplo 05/09/2026.'); return; }
    const novo = {
      tipo, valorCentavos: centavos, descricao: descricao || (app.categorias.find(c => c.id === categoriaId)?.nome ?? ''),
      categoriaId: categoriaId ?? -1, data: dataISO,
    };
    const msg = validarLancamento(novo, app.categorias);
    if (msg) { setErro(msg); return; }
    setSalvando(true);
    try {
      await app.adicionarLancamento(novo);
      onFechar();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Folha visivel={visivel} titulo="Novo lançamento" onFechar={onFechar}>
      <SeletorTipo tipo={tipo} onChange={t => { setTipo(t); setCategoriaId(null); }} />
      <Campo rotulo="Valor (R$)" value={valor} onChangeText={setValor} keyboardType="decimal-pad" placeholder="0,00" autoFocus />
      <Text style={st.rotulo}>Categoria</Text>
      <SeletorCategoria categorias={categorias} selecionada={categoriaId} onChange={setCategoriaId} />
      <Campo rotulo="Descrição (opcional)" value={descricao} onChangeText={setDescricao}
        placeholder={tipo === 'despesa' ? 'Ex.: mercado do mês' : 'Ex.: salário'} maxLength={60} />
      <Campo rotulo="Data" value={data} onChangeText={t => setData(mascaraData(t))} placeholder="dd/mm/aaaa" keyboardType="number-pad" maxLength={10} />
      {erro ? <Text style={[st.erro, { marginBottom: 12, fontSize: 15 }]}>{erro}</Text> : null}
      <View>
        <Botao texto={salvando ? 'Salvando...' : 'Salvar'} onPress={salvar} desabilitado={salvando} />
      </View>
      <Text style={[st.suave, { marginTop: 10, color: cores.textoSuave }]}>
        Dica: se deixar a descrição vazia, uso o nome da categoria.
      </Text>
    </Folha>
  );
}
