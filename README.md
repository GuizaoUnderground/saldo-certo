# Saldo Certo

Protótipo de aplicativo móvel para controle financeiro pessoal, desenvolvido como Trabalho de Conclusão de Curso em Ciência da Computação (Unochapecó).

O Saldo Certo permite:

- registrar receitas e despesas;
- definir limites de gasto por categoria, com aviso quando chegar a 80% e quando passar de 100%;
- cadastrar contas recorrentes e receber alertas de vencimento;
- ver quanto ainda dá para gastar por dia até o fim do mês.

Os dados ficam só no celular, em SQLite, e o app funciona sem internet.

## Tecnologias

- React Native + Expo (SDK 55)
- TypeScript
- expo-sqlite (banco local)
- expo-notifications (avisos de vencimento)

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
> Notificações locais funcionam no Expo Go. Notificações push (remotas) não são usadas neste projeto.

## Testes

```bash
npm test
```

São 23 testes de unidade (`tests/`), cobrindo:

- valores em reais e datas, incluindo vencimento no dia 31 e anos bissextos;
- metas, contas, alertas e valor disponível por dia;
- relatório mensal e planejamento das notificações;
- o SQL real do `RepositorioSQLite`, com restrições, transação do pagamento e exclusões em cascata.

Esses testes rodam sobre o SQLite embutido do Node, usando uma imitação do `expo-sqlite` que fica em `tests/fakes`. Por isso, precisam do Node 22.13 ou mais recente.

A pasta `web-preview/` tem uma prévia do app para navegador, gerada a partir do mesmo código das telas, e 15 cenários de uso automatizados com Playwright (`web-preview/e2e.mjs`).

## Estrutura

```
App.tsx                  navegação por abas e provedor de estado
src/domain/              tipos e regras de negócio (funções puras, testadas)
src/data/                repositório: SQLite (celular) e memória (testes/prévia web)
src/services/            notificações locais de vencimento
src/state/AppContext.tsx estado da aplicação (React Context)
src/screens/             telas: Início, Lançamentos, Metas, Contas, Relatório
src/ui/                  componentes visuais e tema
tests/                   testes automatizados
web-preview/             prévia no navegador usada para as capturas de tela do TCC
```

Arquivos com final `.web.ts` são usados só quando o app roda no navegador: o Metro, empacotador do Expo, escolhe esses arquivos automaticamente.

## Regras de negócio (Quadro 7 do TCC)

| Código | Regra | Onde está |
|---|---|---|
| RN01 | Valor > 0 e categoria compatível com o tipo | `validarLancamento` |
| RN02 | Um limite por categoria de despesa | `progressoDasMetas` / tabela `meta` |
| RN03 | Atenção ≥ 80%, estourada > 100% | `situacaoDaMeta` |
| RN04 | Dia 31 em mês curto vira último dia | `dataVencimento` |
| RN05 | Paga, pendente, vence em breve, vence hoje, atrasada | `situacaoDaConta` |
| RN06 | Conta paga não gera alerta no mês | `gerarAlertas` / `reagendarAvisos` |
| RN07 | (saldo − contas pendentes) ÷ dias restantes | `disponivelPorDia` |
| RN08 | Alerta quando o previsto fica negativo | `gerarAlertas` |
