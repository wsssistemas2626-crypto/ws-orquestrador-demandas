---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T02-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 01-analista-requisitos.md (glossário, RF-01, RF-09 a RF-16, RNF), docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (G1 a G8, T01 e T02), 06-T01-qa-automacao.md (formato), 06-T02-engenheiro-backend.md, 06-T02-tech-lead.md, commit 51e2dda (diff 0d83444..51e2dda), src/modules/acesso/ator.ts, src/modules/acesso/matriz.ts, src/modules/acesso/mensagens.ts, src/modules/acesso/ramos-por-ator.test.ts, src/modules/historico/registrar.ts, src/modules/historico/consultas.ts, src/modules/historico/consultas-integracao.test.ts, src/modules/demandas/consultas.ts, src/modules/demandas/servico.ts (autoriaDo), src/modules/especificacoes/consultas.ts, src/modules/pareceres-risco/consultas.ts, src/modules/pacotes-decisao/consultas.ts, src/modules/dados-pessoais/minimizar.ts (cabeçalho), src/db/schema/historico.ts, src/components/rotulos.ts, src/components/rotulos-qa.test.ts, src/components/rotulos-integracao.test.ts, src/app/(painel)/demandas/[id]/detalhe.ts, src/app/(painel)/demandas/[id]/detalhe.test.ts (cabeçalho e o caso novo), test/banco.ts, test/sentinelas.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Testes da T02 (tipo de ator `integracao` e ramos exaustivos, IN-02). O commit informado, 51e2dda, só regrava a entrega
do engenheiro; o código está em 77f904d, e li o diff da tarefa inteira (`0d83444..51e2dda`). O código passa em todos os
testes, os do engenheiro e os acrescentados aqui. Não há motivo para devolver. Os Minor 1 e 2 da revisão, endereçados a
esta etapa, estão cobertos.

### Critérios da tarefa e os testes que os cobrem

| Critério (T02: "Cobre") | Teste (arquivo › nome) |
|---|---|
| IN-02, G8 #1 (`permitido` com ramo próprio de integração e `never`) | `src/modules/acesso/ramos-por-ator.test.ts` › "integração passa pelo ramo próprio de permitido…", "T02: com a matriz ainda sem integração…", "integração fora da lista, montada à mão…", "tipo de ator desconhecido, montado à mão, é negado" (engenheiro); **novo** `src/modules/acesso/ramos-por-ator-qa.test.ts` › bloco "IN-02 na matriz: cada tipo de ator só pelo próprio ramo" (6 testes: autorizar segue só `integracoes` para cada ação × integração; integração com nome de agente não herda a linha do agente; agente com nome de integração não herda a linha da integração; `listar_demandas` aberta a todo agente e pessoa continua fechada à integração; sistema e tipo desconhecido negados em toda ação; lista `integracoes` congelada) |
| IN-02, G8 #4 (`colunasDoAtor`) | `ramos-por-ator.test.ts` › "colunas do evento de integração: nome e prefixo", "colunas do evento de ator desconhecido: lança…"; **novo** `ramos-por-ator-qa.test.ts` › "colunas do evento de pessoa, agente e sistema continuam as de antes"; **novo** `src/modules/historico/consultas-integracao-qa.test.ts` › "awave gravado com o prefixo volta como a integração…" (confere as colunas gravadas) |
| IN-02, G8 #5 (`autoriaDo`) | `ramos-por-ator.test.ts` › "a autoria das versões recusa integração e sistema"; **novo** `ramos-por-ator-qa.test.ts` › "autoria das versões: construir recusado, tipo desconhecido lança; pessoa e agente como antes" |
| IN-02, G8 #8 e #9 (`responsavelDe`, `responsavelMinimo`) | `ramos-por-ator.test.ts` › "responsável e responsável mínimo de integração"; **novo** `ramos-por-ator-qa.test.ts` › "responsavelMinimo monta a integração chave a chave: chave a mais não passa", "responsavelDe de integração não leva o nome da conta e só aceita a lista", "a demanda do Awave vista pelo agente identifica a integração, só com tipo e nome" |
| IN-02, G8 #10 e D-01 (`vistaDaDemandaPara`) | `ramos-por-ator.test.ts` › "D-01: a vista da demanda para integração lança até a T06"; **novo** `ramos-por-ator-qa.test.ts` › "tipo de ator desconhecido lança em toda vista, e nunca recebe a vista mínima" |
| IN-02, G8 #11 (`listarDemandasPara`) | `ramos-por-ator.test.ts` › "a listagem lança para integração"; **novo** `ramos-por-ator-qa.test.ts` › "a listagem recusa construir e tipo desconhecido antes de ler o banco" (banco que falha a qualquer leitura) |
| IN-02, G8 #14 a #16 (vistas de ESP, RSK, DEC) | `ramos-por-ator.test.ts` › "vistas de ESP, RSK e DEC lançam para integração…"; **novo** `ramos-por-ator-qa.test.ts` › "ESP, RSK e DEC recusam o construir com sem_permissao", "tipo de ator desconhecido lança em toda vista…" |
| D-05 (sistema com a vista mínima de hoje) | **novo** `ramos-por-ator-qa.test.ts` › bloco "D-05: o sistema recebe a vista mínima do agente, sem mudança" (4 testes: demanda, ESP, RSK e DEC; a vista do sistema é `toStrictEqual` à do agente, sem o nome do solicitante, e a pessoa recebe o próprio objeto) |
| IN-02, G8 #20, IN-13 e D-19 (`atorVisivel`) | `src/modules/historico/consultas-integracao.test.ts` (6 testes, engenheiro); **novo** `consultas-integracao-qa.test.ts` › "nome de agente gravado como integração não vira agente; nome de integração gravado como agente não vira integração", "integração da lista sem prefixo gravado sai com prefixo nulo", "prefixo gravado em evento de pessoa ou de sistema nunca sai", "o ator de integração tem só tipo, integracao e prefixo" |
| IN-02, G8 #21 e RF-15 (`rotuloAtor`, `textoDoEvento`) | `src/components/rotulos-integracao.test.ts` (6 testes, engenheiro); `src/components/rotulos-qa.test.ts` (com os Minor 1 e 2, abaixo); **novo** `src/components/rotulos-integracao-qa.test.ts` › "chave herdada de objeto no lugar da integração vira \"Integração\"", "prefixo de 8 caracteres com _ e - aparece", "prefixo com tamanho, caractere ou tipo fora do formato some…" |
| CA-15.3 (cada evento novo com rótulo próprio e sem token) | **novo** `rotulos-integracao-qa.test.ts` › bloco "CA-15.3: os seis eventos do RF-15 com ator de integração" (8 testes: os seis textos distintos e não vazios; para cada evento, nem o texto nem o rótulo do ator mostram token, hash ou sha256 postos em `depois`; os de token citam integração e prefixo) |
| IN-02, G8 #22 (`rotuloResponsavel`) | `detalhe.test.ts` › "autoria de integração (0.3.0, 03, 5.1): o nome da integração"; **novo** `rotulos-integracao-qa.test.ts` › "rotuloResponsavel do /construir e de tipo desconhecido" |
| RF-01 (tipo), D-14 (`NOME_DA_INTEGRACAO` = `NOME_INTEGRACAO`) | `ramos-por-ator.test.ts` › "NOME_DA_INTEGRACAO", "ehIntegracao: só a lista", "atorDesconhecido lança"; `rotulos-integracao.test.ts` › "D-14: NOME_INTEGRACAO é igual ao do servidor"; **novo** `rotulos-integracao-qa.test.ts` › "NOME_INTEGRACAO é congelado e tem exatamente as chaves de INTEGRACOES" |

### Testes acrescentados (36, em 3 arquivos novos) e os Minor da revisão

1. `src/modules/acesso/ramos-por-ator-qa.test.ts` (18 testes, sem banco): matriz por tipo de ator (6), D-05 nas quatro
   vistas com dados fictícios completos (4), autoria de integração nas vistas mínimas (3), falha fechada do `construir` e
   do tipo desconhecido em vistas, listagem, `autoriaDo` e colunas do evento (5).
2. `src/modules/historico/consultas-integracao-qa.test.ts` (5 testes, Postgres real; linhas fora das regras pelo
   migrator, com o CHECK do IN-12 retirado só neste banco descartável).
3. `src/components/rotulos-integracao-qa.test.ts` (13 testes): `rotuloAtor` contra chave herdada e prefixo fora do
   formato, os seis eventos do CA-15.3 e `rotuloResponsavel`.
4. **Minor 1 e Minor 2** (`src/components/rotulos-qa.test.ts`, só acréscimo): `ATORES` ganhou
   `{ tipo: 'integracao', integracao: 'awave', prefixo: 'ficticio' }` e `{ tipo: 'integracao', integracao: null,
   prefixo: null }`; o objeto `livre` do teste do C-30 ganhou `integracao`, `prefixo`, `hash` e `sha256` sentinelas. Os 27
   `it.each` de cada bloco continuam com as mesmas asserções, agora sobre mais atores e mais chaves. Nenhuma asserção
   saiu nem afrouxou (diff abaixo, em Comandos).

Os testes novos não dependem de ordem (o arquivo de banco limpa `evento` antes de cada caso e cada caso grava o próprio
dado; os outros são puros) nem do relógio real (datas literais e `relogioFixo`; nenhum `Date.now()` nem `new Date()`
sem argumento). Nenhum segredo, token emitido ou valor de `.env`: prefixos `ficticio`, `Ab3dE5gH` e `Zz9-_aB1` escritos
à mão; o valor no formato de token é a sentinela fictícia de `test/sentinelas.ts`; hashes são `'a'.repeat(64)` e
`'b'.repeat(64)`; nomes "Pessoa Ficticia …", ids `DEM-20261111-…`/`DEC-DEM-20261111-…` e documento `DOC-FICTICIO-1`.

### Resultado

- `pnpm test`: **244 arquivos, 5366 de 5366** passaram (antes: 241 arquivos e 5330; +3 arquivos e +36 testes).
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.
- `git diff` do ramo: só `src/components/rotulos-qa.test.ts`, com 9 linhas acrescentadas e nenhuma removida; sem
  `.skip`, `.only` nem `.todo`. `git diff a9fd9b8 --stat` dos 16 testes de segurança da D-17: vazio (IN-16).

## Decisões tomadas

- Arquivos novos com o sufixo `-qa.test.ts`: o teste do engenheiro fica como o plano o escreveu, e a convenção do
  repositório marca o que é desta etapa.
- Nenhum teste novo espera "toda ação negada à integração" nem a recusa de `vistaDaDemandaPara` para integração: a T03
  abre cinco pares na matriz e a T06 troca a recusa pela vista de seis chaves, e um teste meu que quebrasse lá teria de
  mudar fora do G5. Os casos de matriz são invariantes (autorizar segue só `integracoes`; nome trocado entre agente e
  integração nunca herda a linha do outro), que continuam verdadeiros depois da T03.
- Minor 1 e 2 feitos em `rotulos-qa.test.ts`, como a revisão pediu, e não num arquivo novo: o teste de cada ação com
  cada ator e o do C-30 já existem ali; repetir a lista de 27 ações noutro arquivo criaria uma segunda guarda para manter.
  A mudança só acrescenta dados aos laços, e o arquivo não está na lista da D-17.
- D-05 testado por igualdade estrita entre a vista do sistema e a do agente (e não por uma lista de chaves esperada):
  prova "o de hoje" sem copiar a vista, e continua valendo se a vista mínima ganhar campo numa tarefa futura.
- A listagem é conferida com um banco que falha a qualquer leitura: prova que a recusa vem antes da consulta, como o
  comentário do código promete.

## Pendências

- Nenhuma bloqueia a passagem.
- Minor 3 (cópias de `RE_PREFIXO` sem teste que as amarre) continua com a T03, como a revisão definiu; o teste
  "prefixo de 8 caracteres com _ e - aparece" e o "prefixo com tamanho, caractere ou tipo fora do formato some" cobrem o
  comportamento da cópia da tela, não a igualdade entre as cópias.
- Um comando `git diff` com os caminhos de `(painel)` sem aspas falhou na análise do shell antes de rodar (erro de
  sintaxe do bash); repeti com as aspas.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -6` — HEAD em 3bcbfd1 (revisão da T02), construção em 77f904d, 020fd9f e 51e2dda
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261111-0016-v1`, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G "### Task 2" --oneline -- docs/superpowers/plans` — nada (li o plano com Read)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 0d83444 51e2ddae5c54e78d61544915ad645ba83a28d54a` — 18 arquivos (16 de `src/`)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 0d83444 51e2ddae5c54e78d61544915ad645ba83a28d54a -- src/modules/demandas/consultas.ts src/modules/especificacoes/consultas.ts src/modules/pareceres-risco/consultas.ts src/modules/pacotes-decisao/consultas.ts src/app/(painel)/demandas/[id]/detalhe.ts src/app/(painel)/demandas/[id]/detalhe.test.ts` — erro de sintaxe do shell nos parênteses, não rodou
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 0d83444 51e2ddae5c54e78d61544915ad645ba83a28d54a -- src/modules/demandas/consultas.ts src/modules/especificacoes/consultas.ts src/modules/pareceres-risco/consultas.ts src/modules/pacotes-decisao/consultas.ts "src/app/(painel)/demandas/[id]/detalhe.ts" "src/app/(painel)/demandas/[id]/detalhe.test.ts"` — diff das vistas e do detalhe
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G vistaDaDemandaPara --name-only --oneline -- src test` — testes que já usam a vista da demanda
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat=200 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD -- test` — os arquivos de `test/` (ajudantes de banco e sentinelas)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/acesso/ramos-por-ator-qa.test.ts src/modules/historico/consultas-integracao-qa.test.ts src/components/rotulos-integracao-qa.test.ts src/components/rotulos-qa.test.ts` — 4 arquivos, 100 de 100
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 244 arquivos, 5366 de 5366
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — `rotulos-qa.test.ts` alterado e os 3 arquivos novos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff` — só `rotulos-qa.test.ts`, 9 linhas acrescentadas, nenhuma removida
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff a9fd9b8 --stat -- src/modules/acesso/matriz.test.ts src/modules/acesso/matriz-qa.test.ts src/modules/acesso/resolver-ator.test.ts src/modules/acesso/resolver-ator-qa.test.ts src/modules/acesso/tokens-servico.test.ts src/modules/acesso/tokens-servico-qa.test.ts src/modules/demandas/servico.test.ts src/modules/historico/registrar.test.ts src/modules/limites.test.ts src/db/privilegios.test.ts src/app/api/vistas-para-agente.test.ts test/matriz-rotas.test.ts test/transversal/sentinelas.test.ts test/estatico/sem-controle-bidi.test.ts test/estatico/sem-recurso-externo.test.ts test/estatico/leituras-da-fila.test.ts` — vazio (IN-16)

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
