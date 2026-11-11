---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T10-construcao
agente: engenheiro-backend
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md (G1 a G7, T09 fim, T10, T11), docs/superpowers/specs/2026-11-10-ws-orquestrador-demandas-novo-visual-design.md (seções 1 a 4.4), 01-analista-requisitos.md (RF-08, RF-09), 03-ux-ui-design.md (5.4 a 5.7, 9, 10, 11), 04-seguranca-aplicacao.md (C11, C12, CV-09, CV-19, LGPD D8), 06-T06-engenheiro-backend.md, 06-T06-tech-lead.md, 06-T06-qa-automacao.md, 06-T08-engenheiro-backend.md, src/components/rotulos.ts, src/components/dados-da-fila.ts, src/components/dados-do-pacote.ts, src/components/dados-da-decisao.ts (cabeçalho), src/modules/demandas/consultas.ts, src/modules/demandas/gerar-id.ts, src/modules/pacotes-decisao/consultas.ts (tipos), src/modules/historico/consultas.ts (tipos), src/db/schema/decisao.ts (tipos), src/app/(painel)/demandas/[id]/page.tsx, src/app/(painel)/demandas/[id]/detalhe.ts (ID_SECAO), test/estatico/leituras-da-fila.test.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T10, regras de exibição da T05: barra das cinco etapas (RF-08) e cartão "Próxima ação" (RF-09), como funções puras
(ADR-17, C11), com as interfaces do G7 e da própria T10.

### Arquivos

- **Criado** `src/components/dados-das-etapas.ts`: `RE_ID_DEMANDA_NA_TELA` (D-11), os tipos `DadosDasEtapas`,
  `EstadoDaEtapa`, `EtapaDaDemanda`, `DestinoDaAcao` e `ProximaAcao` (iguais aos do plano), `TEXTOS_ETAPAS`,
  `etapasDaDemanda` e `proximaAcao`. De `src/modules/` só entra `import type` (`DemandaVista`, `PacoteResumo`,
  `EventoVisivel`, `Aprovador`, `PacoteDecisaoVista`). Valor só de `./rotulos` e `./dados-do-pacote` (`RE_ID_DEC`). Nada
  de `acesso`, `db`, `lib/deps` ou `acoes`, nem por tipo.
- **Criado** `src/components/dados-das-etapas.test.ts`: 48 testes.
- **Criado** `test/estatico/dados-das-etapas.test.ts`: 7 testes.
- **Alterado** `src/components/rotulos.ts`: só `export` em `agenteNaFrase` e `ARTEFATO_DO_AGENTE`. Valores sem
  mudança, diff de 2 linhas.

### Regras implementadas

- **Etapas**: seguem a tabela da T10 e da spec 4.4.
  - O id da versão é o da mais nova.
  - A etapa 5 só leva id quando está "Gerado", e o id é o do aprovado vigente.
  - Aprovado vigente = o primeiro de `pacotesDecisao` com `aprovada` e `!substituido`.
  - "Aprovada, opção X" usa `decisao.opcaoEscolhida` e, na falta dela, `aprovadores[0].opcao`. Sem nenhuma das duas, a
    função lança erro.
  - Etapa atual: a primeira de 2 a 5 que não está feita. Em `entregue` e `encerrada` não há etapa atual.
- **Próxima ação**: as 13 linhas, na ordem da tabela, com os textos de 03, 5.5.
  - Linha 2: usa `agentesEmAndamento[0]`, com `agenteNaFrase`, `ARTEFATO_DO_AGENTE` e `NOME_AGENTE`.
  - Linha 3: leva à seção `duvidas` quando `temSecaoDeDuvidas` e à seção `status` quando não.
  - Linhas 4 a 7: `href` montado da constante de rota mais o id, só quando o id casa `RE_ID_DEMANDA_NA_TELA`.
  - Linha 8: "Abrir a decisão", só com id que casa `RE_ID_DEC`. Quem age segue a regra da 03. O detalhe cita só o
    **papel** de quem aprovou.
  - Linhas 9 e 10: "Abrir a decisão aprovada" leva ao vigente. A linha 10 fica sem link quando não há vigente.
  - Linhas 9 a 13: `switch` sobre `Status`, com `never` no `default`.
- **Coerência**: a ESP e o DEC mais novos recebidos têm de ser os de `especificacoes[0]` e `pacotesDecisao[0]`. Se não
  forem, as duas funções lançam erro, e a página cai na tela de erro de hoje em vez de mostrar estado errado.

### Testes (TDD)

`src/components/dados-das-etapas.test.ts` (48 testes):

- **RF-08**: um caso para cada estado das cinco etapas, o que cobre o CA-08.4. Também cobre:
  - CA-08.1, no mesmo estado da `etapasDupla` do seed;
  - CA-08.2 e CA-08.3;
  - "Pacote desatualizado" antes de "1 de 2 aprovações";
  - opção aprovada pela decisão e pela primeira aprovação, e erro quando não há opção;
  - Pedido: "Gerado" com o id do vigente; um pedido de outro DEC não conta; substituído não é vigente;
  - vigente com DEC mais novo devolvido;
  - dado incoerente lança erro nas duas funções;
  - no máximo uma etapa atual, e nunca a 1.
- **RF-09**:
  - `it.each` com as 13 linhas, um estado mínimo por linha e a saída inteira esperada (CA-09.3);
  - teste que confere que a tabela tem as 13 linhas, uma vez cada;
  - prioridades: linha 1 contra agente pendente; CA-09.2; linha 3 sem a seção de dúvidas; 4 antes de 5 antes de 6; DEC
    devolvido leva à linha 6; 7 antes de 8;
  - CA-09.1, com o detalhe "O CTO já aprovou a opção A. …" e quem age "Administradora";
  - linha 8 com a aprovação da administradora e sem aprovação;
  - linha 10 sem vigente; linha 9 leva ao vigente, e não ao substituído.
- **CV-09**:
  - sentinelas em nome do aprovador, `referenciaDocumento`, `dataDocumento`, `comentarios` e `decididaPor` nunca
    aparecem na saída das duas funções, em três cenários;
  - a saída só tem as chaves da interface.
- **CV-19**:
  - os 7 `href` de página casam `^/(demandas|pacotes-decisao)/`;
  - id de demanda fora do formato não gera link: `DEM-1`, com `/../`, com `?`, `javascript:`, espaço no início e quebra
    de linha no fim;
  - id de DEC fora do formato não gera link nas linhas 8 e 10.
- **D-11**: o `source` e as `flags` de `RE_ID_DEMANDA_NA_TELA` são iguais aos de `RE_ID_DEMANDA`.
- `TEXTOS_ETAPAS`: confere os textos da seção 9 da 03.

`test/estatico/dados-das-etapas.test.ts` (7 testes):

- **CV-09**: as importações do módulo seguem uma lista de permissão, lidas pela árvore do TypeScript. Há 17 casos
  plantados que reprovam: acesso, inclusive por tipo; `db`, inclusive `db/schema` por tipo; `lib/deps`, também por
  `@/`; `acoes` e `acoes-pedido`; `drizzle-orm`; `next/*`; valor de `src/modules`, inclusive em várias linhas, por
  namespace e por `import()`; valor fora da lista; e importação só por efeito. Um caso mostra que o que é certo passa.
- **CA-09.4**: no código que roda (`src/` e `scripts/`, sem os testes), quem chama `etapasDaDemanda(` ou
  `proximaAcao(`, ou importa as duas por valor (nome, namespace, `export *`, `import()`), tem de ser
  `src/app/**/page.tsx`. Há 11 casos plantados: Server Action, rota, módulo, componente, reexportação, importação
  dinâmica e chamada sem import reprovam; página, tipo, propriedade com o mesmo nome e módulo de nome parecido passam.
  Hoje ninguém chama as funções: a T11 vai chamar pela página.

**Visto falhando antes do código:** comando
`pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-das-etapas.test.ts test/estatico/dados-das-etapas.test.ts`:

```
 FAIL  src/components/dados-das-etapas.test.ts [ src/components/dados-das-etapas.test.ts ]
Error: Cannot find module './dados-das-etapas' imported from .../src/components/dados-das-etapas.test.ts
 FAIL  test/estatico/dados-das-etapas.test.ts > CV-09: o que dados-das-etapas.ts importa > o módulo existe e não tem achado
Error: ENOENT: no such file or directory, open '.../src/components/dados-das-etapas.ts'
 Test Files  2 failed (2)
      Tests  1 failed | 6 passed (7)
```

Os 6 testes que já passavam são os casos plantados do teste estático, que não dependem do módulo.

**Depois do código:**

- os mesmos dois arquivos: 2 arquivos, **55 de 55**;
- `pnpm test` (suíte inteira): **227 arquivos, 5009 de 5009**, 0 falhas;
- `pnpm lint` e `pnpm typecheck`: limpos.

### Escopo e CV-01

- `git status`: só `src/components/rotulos.ts` modificado e os três arquivos novos. Nenhum arquivo temporário no
  repositório; a saída longa da suíte ficou fora dele.
- `git diff --stat 198e97d -- <lista do G4>`: vazio.
- Nada em `src/modules/`, nenhum `'use server'`, nenhum `package.json`.

### Desvios do plano

1. **`TEXTOS_ETAPAS` exportado** (nome fora do G7): reúne "Etapas da demanda", "Nenhuma", "Próxima ação" e "Quem age:",
   da seção 9 da 03. Assim a T11 tem uma fonte só para esses textos (G3.9).
2. **Conferência de coerência** (`conferir`): se a ESP ou o DEC mais novo não for o da demanda, as funções lançam erro.
   O plano não pede isso, mas segue a regra da 02, seção 5 ("número que falta é tolerável, número errado não"). A
   página da T11 lê os dois por `d.especificacoes[0]` e `d.pacotesDecisao[0]`, então o caso normal nunca dispara.
3. **Tipos sem `db` nem `acesso`**: `OpcaoDecisao` sai de `Aprovador['opcao']`, `Status` de `DemandaVista['status']` e o
   agente de `agentesEmAndamento`. O teste estático veta `acesso` e `db` até por tipo, o que é mais estrito que o CV-09
   e fica no padrão de lista de permissão.
4. **Linha 8, dupla pendente com duas aprovações** (estado que não deveria existir): quem age fica "CTO e
   administradora" e não há detalhe ("nos demais casos, sem detalhe", 03, 5.5).
5. **Leitor de importações repetido**: o teste estático tem uma cópia de `importacoesDe` de
   `test/estatico/leituras-da-fila.test.ts`. Importar de outro `.test.ts` rodaria as suítes dele de novo, e mover a
   função para um ajudante em `test/` mexeria num teste existente, fora da lista de arquivos da tarefa. Fica em
   Pendências.

## Decisões tomadas

- Lista de permissão nas importações (e não só lista de negação): valor só de `./rotulos` e `./dados-do-pacote`. Uma
  dependência nova no módulo reprova até alguém decidir aceitá-la.
- O CA-09.4 confere também a importação por valor e por namespace, além da chamada pelo nome: assim o uso indireto
  (`m.proximaAcao(`, `export *`) não escapa. Propriedade com o mesmo nome (`{ proximaAcao: … }`) não conta, porque a
  T11 pode ter prop com esse nome.
- O detalhe da linha 8 cita só a opção e o papel (04, D8). A opção vem do enum gravado (`A` ou `B`) e não é dado
  pessoal.
- A linha 2 usa o primeiro agente da lista, o mais antigo pela ordem de `agentesEmAndamentoDe`, como o plano manda.
- Os textos ficam em constantes do módulo, e não espalhados: duas cópias do mesmo texto divergiriam na primeira
  correção (03, Decisões).

## Pendências

- **Comando fora da lista Pode**: rodei uma vez
  `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "### 5.4" -e "### 5.5" -e "## 9" -e "### 9" -- docs/construcao/DEC-DEM-20261110-0015-v1/03-ux-ui-design.md`,
  para achar as seções 5.4, 5.5 e 9 da 03. O comando só lê, o arquivo está no git e nada mudou. Mesmo assim, `git grep`
  não está na minha lista Pode e o prompt do maestro o vetava. Foi erro meu, declarado aqui e em Comandos executados.
  O resto da leitura foi feito pelo Read.
- `engenheiro-frontend` (T11):
  - chame `etapasDaDemanda` e `proximaAcao` só em `src/app/(painel)/demandas/[id]/page.tsx`. O teste estático reprova
    a chamada em componente: passe o resultado por prop;
  - monte `decMaisNovo` com o `obterPacoteDecisao` de `d.pacotesDecisao[0].id` e `espMaisNova` com a `esp` que a
    página já lê. Outro id faz as funções lançarem erro;
  - `historico` pode ser a lista inteira de `listarHistorico`;
  - `temSecaoDeDuvidas` = `duvidas !== null`;
  - destino `secao` vira `ID_SECAO.duvidas` ou `ID_SECAO.status` (D-10);
  - os textos fixos estão em `TEXTOS_ETAPAS`.
- `engenheiro-frontend` (T11), das pendências da T06: o e2e do CA-08.1 e do CA-09.1 lê a `etapasDupla`, que nasce com
  ESP sem dúvidas, DEC atual e só a aprovação do CTO. Nenhum e2e deve criar ESP ou RSK nessa demanda, nem decidi-la: o
  DEC ficaria desatualizado (linha 7, "Pacote desatualizado") e o CA-08.1 deixaria de valer. Com o seed de hoje, as
  funções dão para ela: "Registrada", "Feita", "Feito", "1 de 2 aprovações", "Depois da aprovação", etapa 4 atual, e
  linha 8 com quem age "Administradora". É o que o teste de unidade do CA-08.1 e do CA-09.1 confere.
- Minor (dívida de teste): mover `importacoesDe` para um ajudante em `test/` e usá-lo nos dois testes estáticos, numa
  tarefa que possa mexer em `test/estatico/leituras-da-fila.test.ts`.
- Não rodei `pnpm test:e2e`: o comando é do `engenheiro-frontend` (G1), e esta tarefa não tem tela.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --oneline -40` — commits recentes do pedido (topo 2293a01, 06-T09-testes)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -1 -S "Task T10" -- docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md` — sem saída
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "### 5.4" -e "### 5.5" -e "## 9" -e "### 9" -- docs/construcao/DEC-DEM-20261110-0015-v1/03-ux-ui-design.md` — **fora da lista Pode** (ver Pendências); linhas 570, 586 e 887
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format=%h -- test/` — arquivos de `test/` já commitados
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-das-etapas.test.ts test/estatico/dados-das-etapas.test.ts` — vermelho antes do código: 2 arquivos falharam, 1 teste falhou e 6 passaram (módulo inexistente)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-das-etapas.test.ts test/estatico/dados-das-etapas.test.ts` — 2 arquivos, 55 de 55
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 227 arquivos, 5009 de 5009
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — `src/components/rotulos.ts` modificado; `src/components/dados-das-etapas.ts`, `src/components/dados-das-etapas.test.ts` e `test/estatico/dados-das-etapas.test.ts` novos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -- src/components/rotulos.ts` — só `export` acrescentado em 2 linhas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 198e97d -- src/proxy.ts src/proxy.test.ts next.config.ts src/app/api src/db drizzle src/modules/acesso src/worker src/jobs src/agents src/lib/auth.ts src/lib/auth-cliente.ts src/lib/qr.ts src/lib/log.ts src/lib/erros.ts src/instrumentation.ts pnpm-workspace.yaml "src/app/(painel)/configuracao/agentes/acoes.ts" "src/app/(painel)/demandas/[id]/acoes.ts" "src/app/(painel)/demandas/[id]/editar/acoes.ts" "src/app/(painel)/demandas/[id]/especificacoes/nova/acoes.ts" "src/app/(painel)/demandas/[id]/pacotes-decisao/novo/acoes.ts" "src/app/(painel)/demandas/[id]/pareceres-risco/novo/acoes.ts" "src/app/(painel)/demandas/nova/acoes.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes.ts"` — vazio (CV-01)

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno (a T10 não cria nem altera rota, Server Action ou job; as funções recebem dado já lido e autorizado pela página, e o erro de coerência cai na tela de erro de hoje, sem detalhe)
