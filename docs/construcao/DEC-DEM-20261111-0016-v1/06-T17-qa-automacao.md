---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T17-testes
agente: qa-automacao
leu: [contrato-passagem.md, pedido.json, tarefas.json, docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (cabeçalho, G1 a G7, T17 e T18), 01-analista-requisitos.md (RF-01 a RF-13, com RF-06 e RF-10), 03-ux-ui-design.md (seções 0 a 5.6), 06-T17-engenheiro-frontend.md, 06-T17-tech-lead.md, commit e0fcb59 (código em fd06ba2; diff de 422ec6f a fd06ba2), src/components/dados-da-confirmacao.ts, src/components/dados-da-confirmacao.test.ts, src/components/dados-das-etapas.ts (linhas 1 a 140), src/components/dados-das-etapas.test.ts (linhas 1 a 75 e o trecho novo), src/app/(painel)/demandas/[id]/page.tsx, saída do pnpm test]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Testes da T17 (regras de exibição da demanda do Awave: estado da confirmação, textos da seção, selo e linha 14 da
Próxima ação), commit da construção `e0fcb59`, código em `fd06ba2`, sobre `422ec6f`. A tarefa não tem tela: o que está
na página (botão, selo e seção na T05, axe) é da T18. Aqui a cobertura é das funções puras e das constantes.

**Resultado: aprovada nos testes.** O código cumpre os critérios da tarefa; nenhum teste do engenheiro é instável ou
errado. Acrescentei um arquivo de teste com 9 casos que ligam as duas regras como a T18 vai ligá-las e fecham por teste
as duas pendências Minor da revisão.

### Cada critério da tarefa e o teste que o cobre

| Critério (fonte) | Teste (arquivo › nome) |
|---|---|
| CA-06.7, regra: Awave sem `demanda_confirmada` e fora de status final → "aguardando" (o único estado com o controle de confirmar) | `src/components/dados-da-confirmacao.test.ts` › "Awave sem evento e fora de status final: aguardando"; "aguardando em todo status que não é final"; `src/components/dados-da-confirmacao-qa.test.ts` › "a linha 14 aparece se, e só se, a seção está em \"aguardando\", em toda origem, status e histórico" |
| CA-06.7, regra: "confirmada" com quem (`rotuloAtor`) e quando (hora do evento) | `dados-da-confirmacao.test.ts` › "Awave com o evento: confirmada por quem e quando (o mais antigo, se houver mais de um)"; "histórico do mais novo para o mais antigo: vale a primeira confirmação, a do fim da lista"; "o ator pelo rotuloAtor: pessoa sem papel, conta que não existe mais"; "confirmada vale também em status final (o fato já aconteceu)" |
| 03, 5.4: final sem confirmação (sem botão), com o status | `dados-da-confirmacao.test.ts` › "Awave em status final sem confirmação"; "final sem confirmação nos dois status finais, com o status de cada um"; `dados-da-confirmacao-qa.test.ts` › "final sem confirmação na seção é sempre a linha 1 da Próxima ação, com o mesmo status" |
| 03, 5.4 (Vazio): pessoa e agente sem seção | `dados-da-confirmacao.test.ts` › "não se aplica a pessoa nem a agente"; "pessoa e agente: não se aplica em todo status, mesmo com um demanda_confirmada no histórico"; `dados-da-confirmacao-qa.test.ts` › "origem montada à mão (ex.: a integração construir) não ganha seção, nem com demanda_confirmada no histórico" |
| D-06: o estado sai só do histórico (`demanda_confirmada`), nunca da resposta da Server Action | `dados-da-confirmacao.test.ts` › "só demanda_confirmada conta: criar, mudar status e outros eventos deixam aguardando"; "a saída tem só as chaves do estado (nada de id, texto ou depois do evento)"; "não altera o histórico recebido (entrada congelada)" |
| Parecer 3 da 06-T08-tech-lead: a tela não diz que o agente foi acionado | `dados-da-confirmacao.test.ts` › "nenhum texto diz que o agente de IA foi acionado (a resposta da Server Action não diz; parecer 3 da 06-T08)" |
| 03, seção 9 e 5.4: os textos por inteiro (P1, P2, P3, botão, "Confirmando…", sucesso, confirmada, depois, final sem) e a lista fechada (P-01: nenhum texto de diálogo) | `dados-da-confirmacao.test.ts` › "textos da 03, seção 9"; "seção aguardando: três parágrafos e o botão"; "confirmada: quem e quando, e o apoio"; "final sem confirmação com o rótulo de cada status final"; "as chaves dos textos são as da 03 (nada a mais, nada a menos)" |
| 03, 5.1 item 2 e seção 2: selo "Aguardando confirmação", âmbar, sem tracejado | `dados-da-confirmacao.test.ts` › "o selo do cabeçalho: âmbar, sem tracejado (03, seção 2)" |
| RF-10 (detalhe, regra) e 03, 5.1 itens 1 e 3: "Origem" nos Dados, âncora `confirmacao`, título "Confirmação do Awave", âncoras sem repetição | `dados-da-confirmacao.test.ts` › "detalhe da demanda: âncora, título da seção e item \"Origem\" dos Dados"; "a âncora nova não repete a de outra seção" |
| 03, 5.5: linha 14 com os textos, quem age e o link para a seção | `src/components/dados-das-etapas.test.ts` › "status nova, sem agente em andamento: linha 14 com os textos da 03 e o link para a seção confirmacao"; `dados-da-confirmacao-qa.test.ts` › "o link da linha 14 cai na âncora da seção \"Confirmação do Awave\" do detalhe" |
| 03, 5.5: ordem (depois da 1 e da 2, antes da 3 a 13) | `dados-das-etapas.test.ts` › "com agente pendente ou em andamento: linha 2 (a 14 vem depois)"; "em status final: linha 1"; "com aguardando_informacao: linha 14 antes da 3"; "vence as linhas 3 a 13 em todo status que não é final, com qualquer cenário de versões"; `dados-da-confirmacao-qa.test.ts` › "com o agente trabalhando, a linha 2 vence a 14 mesmo com a seção em \"aguardando\"" |
| 03, 5.3 item 4 e F1: depois de confirmar, a Próxima ação "muda sozinha pelas regras de hoje" | `dados-da-confirmacao-qa.test.ts` › "confirmada: a Próxima ação é a de uma demanda de pessoa no mesmo status (a demanda segue o fluxo de qualquer outra)" |
| Sem a marca, a 0.2.0 não muda; barra de etapas sem estado novo; CV-09 | `dados-das-etapas.test.ts` › "sem a marca (ausente ou false): as linhas de hoje, sem mudança"; "a barra de etapas não muda com a marca (03, Decisões)"; "CV-09: a saída da linha 14 tem só as chaves da interface"; "a linha 14 também confere a coerência do dado (ESP ou DEC incoerente lança)" |
| `STATUS_FINAIS_NA_TELA` igual ao do servidor (padrão D-14) e igual à linha 1 da Próxima ação | `dados-da-confirmacao.test.ts` › "status finais da tela: cópia de STATUS_FINAIS do servidor (transicoes.ts), conferida aqui"; `dados-da-confirmacao-qa.test.ts` › "STATUS_FINAIS_NA_TELA e a linha 1 da Próxima ação concordam em todo status"; "STATUS_FINAIS_NA_TELA só tem status que existem" |

### Testes acrescentados

`src/components/dados-da-confirmacao-qa.test.ts` (novo, 9 testes, só funções puras, datas fixas, sem estado entre
testes):

- **Seção e Próxima ação ligadas como na T18** (o plano manda a página fazer
  `aguardaConfirmacaoDoAwave: estado.tipo === 'aguardando'`). Percorre 3 origens × 9 status × 3 históricos (vazio, só a
  criação, com a confirmação) e exige que a linha 14 apareça **se, e só se**, a seção estiver em "aguardando"; conta os
  14 casos esperados (Awave sem confirmação nos 7 status não finais, com 2 históricos). Cobre a pendência 2 da revisão:
  selo, seção e Próxima ação não podem discordar na regra.
- **Final sem confirmação = linha 1** com o mesmo status, e fora disso linha 14.
- **Confirmada segue o fluxo de qualquer outra:** a Próxima ação da demanda do Awave confirmada é igual, campo a campo, à
  de uma demanda de pessoa no mesmo status (03, 5.3 item 4), em todos os 9 status.
- **Linha 2 vence a 14** com a seção em "aguardando" e o agente em andamento.
- **O link da linha 14 cai numa âncora que existe** (`ID_SECAO`) e no título "Confirmação do Awave".
- **Uma só noção de status final na tela** (pendência 1 da revisão): `STATUS_FINAIS_NA_TELA` e a linha 1 da Próxima ação
  (`emStatusFinal`, escrita à mão) concordam em todo status. Se um status final novo entrar só numa das duas, o teste
  falha; com o teste que já compara `STATUS_FINAIS_NA_TELA` com o servidor, as três listas ficam presas umas às outras.
- **Origem fora da lista** (o `default` com `never`, que nenhum teste exercitava): `construir`, `integracao` e vazio dão
  `nao_se_aplica`, mesmo com `demanda_confirmada` no histórico.
- **Estabilidade:** a mesma entrada dá o mesmo estado em duas chamadas.

Dados só fictícios: "Ana Ficticia", prefixo `ficticio`, id `DEM-20261111-0021`. Nenhum token, segredo ou valor de `.env`.

### Resultado

- `pnpm test` (suíte inteira): **286 de 286 arquivos e 6321 de 6321 testes, 0 falharam**, em 173 s.
- Os três arquivos da T17 juntos: 3 de 3 arquivos, 192 de 192 testes (183 da construção + 9 novos).
- `pnpm lint`: limpo. `pnpm typecheck`: limpo.
- `git diff --stat 422ec6f HEAD -- src test e2e`: os dois arquivos de teste da T17 só acrescentam linhas
  (`dados-da-confirmacao.test.ts` novo, `dados-das-etapas.test.ts` com 65 a mais e nenhuma a menos); as 4 linhas
  removidas são de comentário e tipo em `dados-das-etapas.ts` e `detalhe.ts`. Nenhum `.skip`, `.only` ou `.todo` nos
  testes novos (li os dois arquivos inteiros e o trecho novo).
- `git status --short`: só `src/components/dados-da-confirmacao-qa.test.ts`, novo.
- `pnpm test:e2e` não rodou nesta etapa: a T17 não muda tela (a página ainda não usa a regra; isso é da T18), e o e2e
  completo da construção, com o axe nas duas larguras, já passou na entrega do engenheiro.

## Decisões tomadas

- Um arquivo `-qa.test.ts` novo, em vez de acrescentar aos dois do engenheiro: mantém o diff dos testes da construção
  como está e segue o padrão do repositório (`fila-qa.test.ts`, `entrada-qa.test.ts`).
- As duas pendências Minor da revisão viram teste agora, sem mexer no código: a ligação da T18 é testada pela regra que
  o plano fixa, e a divergência entre `STATUS_FINAIS_NA_TELA` e `emStatusFinal` passa a quebrar a suíte.
- Sem devolução: nenhum critério da T17 ficou sem teste, e nenhum teste do engenheiro tem asserção fraca para o que
  promete (os de texto usam `toBe` exato, os de estado usam `toEqual` com a forma inteira).

## Pendências

- Nenhuma bloqueia a T17.
- Para a T18: o e2e da tela precisa conferir selo, seção e Próxima ação juntos nos três estados (aguardando, confirmada,
  final sem confirmação), porque a ligação real (`aguardaConfirmacaoDoAwave: estado.tipo === 'aguardando'`) fica na
  página; o teste novo só prende a regra.
- Observação: a contagem total da suíte variou entre execuções do mesmo código (6310 na entrega do engenheiro, 6311 na
  revisão, 6312 nesta rodada sem os 9 novos). Nenhum teste falhou em nenhuma delas. Algum arquivo gera casos em
  quantidade variável; vale identificar qual numa etapa futura, para a contagem servir de controle.
- As ferramentas Grep e Glob não estavam disponíveis nesta sessão; li com Read e localizei pelo `git diff`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -8` — b6c0382 (revisão), e0fcb59, 569cdc6 e fd06ba2 da T17; base 422ec6f
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — árvore limpa antes dos testes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 422ec6f fd06ba2` — 6 arquivos de `src/`, a entrega e o `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 422ec6f fd06ba2 -- src/components/dados-das-etapas.ts src/components/dados-das-etapas.test.ts src/components/rotulos.ts "src/app/(painel)/demandas/[id]/detalhe.ts"` — diff revisado; teste só acrescenta
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-da-confirmacao-qa.test.ts src/components/dados-da-confirmacao.test.ts src/components/dados-das-etapas.test.ts` — 3 de 3 arquivos, 192 de 192 testes
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 286 de 286 arquivos, 6321 de 6321 testes (saída lida com Read)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — só o teste novo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 422ec6f HEAD -- src test e2e` — testes da T17 só com linhas a mais

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
