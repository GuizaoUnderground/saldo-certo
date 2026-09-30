# Saldo Certo – TCC I

Protótipo de aplicativo móvel para controle financeiro pessoal, desenvolvido como Trabalho de Conclusão de Curso em Ciência da Computação (Unochapecó).

Esta é a versão da **primeira etapa (TCC I)**. Ela permite:

- registrar receitas e despesas por categoria;
- listar os lançamentos do mês, filtrar e excluir;
- ver o saldo do mês e quanto ainda dá para gastar por dia até o fim do mês;
- ver onde mais gastou e comparar os gastos com os do mês anterior.

Os dados ficam só no celular, em SQLite, e o app funciona sem internet.

Metas de gasto por categoria, contas fixas e alertas de vencimento ficam para o **TCC II**.

## Tecnologias

- React Native + Expo (SDK 55)
- TypeScript
- expo-sqlite (banco local)

## Como rodar no celular

Pré-requisitos: Node.js 20 ou mais recente e o app **Expo Go** instalado no celular (Play Store ou App Store).

```bash
cd saldo-certo
npm install
npm run instalar-dependencias   # instala as versões compatíveis com o SDK do Expo
npx expo start
```

Escaneie o QR code que aparece no terminal com o Expo Go (Android) ou com a câmera (iOS).

> Se o `npm install` reclamar de versões, rode `npx expo install --fix`.

## Testes

```bash
npm test
```

São 26 testes de unidade (`tests/`), cobrindo:

- valores em reais e datas;
- validação de lançamentos;
- resumo do mês, valor disponível por dia e relatório;
- o SQL real do `RepositorioSQLite`.

Os testes do repositório rodam sobre o SQLite embutido do Node, usando uma imitação do `expo-sqlite` (`tests/fakes`). Por isso, precisam do Node 22.13 ou mais recente.

A pasta `web-preview/` tem uma prévia do app para navegador, gerada a partir do mesmo código das telas, e 16 cenários de uso automatizados com Playwright (`web-preview/e2e.mjs`).

## Estrutura

```
App.tsx                  navegação por abas (Início, Lançamentos, Relatório)
src/domain/              tipos e regras de negócio (funções puras, testadas)
src/data/                repositório: SQLite (celular) e memória (testes/prévia web)
src/state/AppContext.tsx estado da aplicação (React Context)
src/screens/             telas e formulário de lançamento
src/ui/                  componentes visuais e tema
tests/                   testes automatizados
web-preview/             prévia no navegador usada para as capturas de tela do TCC
```

Arquivos com final `.web.ts` são usados só quando o app roda no navegador: o Metro, empacotador do Expo, escolhe esses arquivos automaticamente.

## Regras de negócio do TCC I

| Código | Regra | Onde está |
|---|---|---|
| RN01 | Valor > 0 e categoria compatível com o tipo | `validarLancamento` |
| RN02 | Lançamentos do mês do mais recente para o mais antigo | `lancamentosDoMes` |
| RN03 | Saldo do mês ÷ dias restantes, contando hoje | `disponivelPorDia` |
| RN04 | Relatório por categoria com comparação ao mês anterior | `relatorioMensal` |
