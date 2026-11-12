---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T17-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12), docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (G1 a G8 e T17), tarefas.json, 03-ux-ui-design.md (seções 2, 5.1 a 5.5, 9 e 10), 06-T17-engenheiro-frontend.md, 06-T16-tech-lead.md (cabeçalho), commit e0fcb59 (código em fd06ba2; diff inteiro de 422ec6f a fd06ba2), src/components/dados-da-confirmacao.ts, src/components/dados-das-etapas.ts (linhas 1 a 150), src/components/dados-das-etapas.test.ts (linhas 1 a 70), src/modules/historico/consultas.ts, saída do pnpm test]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T17 (regras de exibição da demanda do Awave: estado da confirmação, textos da seção, selo e linha 14 da
Próxima ação; RF-06 e RF-10 na regra, D-06, D-13/P-01, 03 5.4 e 5.5), commit da construção `e0fcb59`
(e0fcb5960bd68d78b18f0c21293aa969c609dd5a), com o código em `fd06ba2`, sobre `422ec6f`. Os commits `569cdc6` e
`e0fcb59` só regravam a entrega e o `passagens.jsonl`.

**Resultado: aprovada. Nenhum problema Critical ou Important.** Os pontos Minor vão em Pendências.

### Os dois pontos pedidos pelo maestro

**1. P-01 de Fabiano (botão "Confirmar demanda" sem diálogo, por pessoa com 2FA, com a consequência escrita acima).**
Cumprida no que cabe à T17, que só entrega regra e texto (o botão é da T18):

- `src/components/dados-da-confirmacao.ts:14` a `:25`: `TEXTOS_CONFIRMACAO` tem lista fechada de nove chaves, conferida
  por teste (`dados-da-confirmacao.test.ts`, "as chaves dos textos são as da 03"). Não existe texto de diálogo, nem
  "Confirmar?", nem "Cancelar": nada que a T18 possa ligar a um `DialogoConfirmacao`.
- `:16` e `:17`: a consequência é o P2 da 03 (5.4) por inteiro, para a T18 pôr acima do botão com
  `id="confirmacao-consequencia"` e `aria-describedby` (03, seção 10).
- `src/components/dados-das-etapas.ts:206` a `:213`: a linha 14 diz "Quem age: Uma pessoa (CTO ou administradora)"
  (`UMA_PESSOA`, `:58`), o mesmo de toda ação humana da 0.2.0. A exigência de 2FA é do servidor
  (`confirmarDemandaNoPainel`, T08, revisada na 06-T08); a tela não decide quem pode, como a 03 manda ("a tela só mostra
  o estado que o servidor já gravou").

**2. A tela não afirma que o agente de insumo foi acionado.** Cumprido:

- `src/components/dados-da-confirmacao.ts:43`: `estadoDaConfirmacao` recebe só `origem`, `status` e `historico`. A
  resposta de `confirmarDemanda` (`{ jaConfirmada }`, que não diz se o agente foi acionado; parecer 3 da 06-T08-tech-lead)
  não é parâmetro de nada nesta tarefa.
- Os textos que aparecem depois de confirmar são "Demanda confirmada." (`:21`), "Confirmada por <ator> em <data>." (`:22`)
  e "Desde a confirmação, a demanda segue o fluxo de qualquer outra." (`:23`): nenhum diz que o agente começou. O teste
  "nenhum texto diz que o agente de IA foi acionado" barra `acionad`, `começou`, `iniciad` e `está trabalhando` nos três.
- O único texto que fala do agente é a consequência (`:17`), mostrada **antes** de confirmar e no condicional ("se o
  agente de insumo técnico estiver ligado"), que é verdadeiro com o agente ligado ou desligado.
- Quem mostra o agente trabalhando depois da confirmação é a regra de hoje (linha 2, `dados-das-etapas.ts:204` e `:205`),
  lida de `agentesEmAndamento`, que vem do servidor. A linha 14 vem depois da 2, então não a encobre (teste "com agente
  pendente ou em andamento: linha 2").

### Conferência da regra

| Ponto | Onde | Parecer |
|---|---|---|
| Ordem do histórico e a confirmação "mais antiga" | `dados-da-confirmacao.ts:49` (`findLast`) | **Correto.** `listarHistorico` (`src/modules/historico/consultas.ts:72`) ordena por `ocorridoEm desc, id desc` e não tem limite: o histórico inteiro chega, e o último da lista é o mais antigo. Uma demanda confirmada nunca aparece como "aguardando" por corte de página. |
| Confirmada vence status final | `:50` antes de `:51` | **Correto.** A 03 (5.4) só chama de "final sem confirmação" a demanda **sem** o evento; o fato fica visível, como o "Recebido" da T11. |
| Linha 14 entre a 2 e a 3 | `dados-das-etapas.ts:206` | **Correto** pela 03 (5.5): status final já caiu na linha 1 (`:203`), agente em andamento na 2 (`:205`). `=== true` em vez do `if (x.aguardaConfirmacaoDoAwave)` do plano: mesmo efeito para o tipo `boolean \| undefined`, e deixa explícito que a ausência mantém a 0.2.0. |
| `conferir(x)` continua antes da linha 14 | `:201` | **Correto.** Teste "a linha 14 também confere a coerência do dado". |
| Barra de etapas sem estado novo | `etapasDaDemanda` sem mudança | **Correto** (03, Decisões). Teste compara a barra com e sem a marca. |
| `DestinoDaAcao` com `confirmacao` e `ID_SECAO.confirmacao` | `dados-das-etapas.ts:47` a `:49`; `detalhe.ts` | **Correto.** O `CartaoProximaAcao.tsx` já resolve `ID_SECAO[link.destino.secao]`; o `typecheck` limpo prova que a chave existe. Teste de âncoras sem repetição. |
| `default` com `never` devolvendo `nao_se_aplica` | `dados-da-confirmacao.ts:54` a `:59` | **Aceito.** O G3.4 trata de ramo por **tipo de ator**; aqui é a origem, e a tela não inventa botão para valor desconhecido. Quem barra a confirmação é o servidor (409 `outraOrigem`). |
| Textos | `:15` a `:24`; `rotulos.ts` (`SELO_AGUARDANDO_CONFIRMACAO`); `detalhe.ts` ("Confirmação do Awave", "Origem") | **Iguais** aos da 03, seções 5.4, 5.5 e 9, letra a letra, e cada um tem `toBe` exato no teste. Selo `ambar`, cor que já existe (03, seção 2). |
| Só tipos de `src/modules/` | `dados-da-confirmacao.ts:8` e `:9` | **Correto.** O arquivo vai ao navegador pela `ConfirmarDemanda.tsx` da T18; o `test/estatico/dados-das-etapas.test.ts` (CV-09) passa. |

### Desvios do plano declarados pelo engenheiro

1. `STATUS_FINAIS_NA_TELA` e o tipo `EventoDaConfirmacao`: **aceitos.** O primeiro é a cópia conferida por teste (padrão
   D-14) porque o arquivo não pode importar `transicoes.ts` por valor; o segundo é o tipo que o G7 já descreve, com nome.
2. Testes além do trecho do plano: **aceitos**, e aumentam a cobertura (bordas de ordem, status, origem, chaves da saída,
   sentinela no `depois`, entrada congelada).
3. `Object.freeze` em `TEXTOS_CONFIRMACAO`: **aceito**, mesmo padrão do `MENSAGENS_CONFIRMACAO` da T08.

### Checklist da seção 12 do padrão técnico

- A tarefa faz o que o plano pede: os seis arquivos do plano e nenhum outro (`git diff --stat 422ec6f e0fcb59`: os seis
  de `src/` mais a entrega e o `passagens.jsonl`). `dados-das-etapas.test.ts` só acrescenta (65 linhas a mais, nenhuma a
  menos); as 4 linhas removidas do commit são de comentário e de tipo em `dados-das-etapas.ts` e `detalhe.ts`.
- Teste para cada comportamento novo, visto falhando: a entrega mostra o módulo inexistente e os 3 testes da linha 14
  falhando (`linha: 4` em vez de `14`). Os 6 testes que já passavam são guardas do que não pode mudar, nomeados.
- Sem segredo nem dado pessoal real: só "Ana Ficticia", "Bia Ficticia", prefixo `ficticio`, id de exemplo.
- Zod: não se aplica (funções puras, sem entrada externa nesta tarefa).
- Banco: não se aplica.
- Duplicação: um ponto Minor (Pendências, item 1).
- Textos em pt-BR, os da 03; nenhuma tela muda nesta tarefa (a página ainda não usa a regra), e o engenheiro rodou o
  e2e completo com o axe da T05 nas duas larguras: verde.
- G4: o diff das superfícies congeladas, com `src/lib/rota.ts`, de `a9fd9b8` a `fd06ba2`, saiu vazio. IN-16: nenhum
  arquivo do D-17 foi tocado, e o `test/estatico/piso-de-assercoes.test.ts` passa.
- Rodei de novo: `pnpm test` com 285 de 285 arquivos e 6311 de 6311 testes; `pnpm typecheck` e `pnpm lint` limpos.

## Decisões tomadas

- Aprovada sem devolução: nenhum Critical ou Important; os achados são Minor e, pela seção 12, não bloqueiam.
- P-01 conferida na parte da T17 (texto e regra); o botão, o `aria-describedby` e a ausência de diálogo na tela ficam
  com a revisão da T18, porque só ali existem.
- Aceito o `default` da origem devolvendo `nao_se_aplica` em vez de lançar: é tela, e o servidor já recusa a origem
  errada; lançar trocaria a página inteira pela tela de erro por um valor que o tipo não deixa existir.

## Pendências

- Nenhuma bloqueia a T17. Pontos Minor:
  1. `src/components/dados-da-confirmacao.ts:29` e `src/components/dados-das-etapas.ts:72`: duas noções de "status
     final" no lado da tela, `STATUS_FINAIS_NA_TELA` (conferida contra o servidor por teste) e `emStatusFinal` (escrita
     à mão, sem essa conferência). Razão: se um status final novo entrar, a linha 1 e a seção podem discordar. Hoje dão o
     mesmo resultado. Sugestão para uma tarefa futura ou a 08: `emStatusFinal` passar a usar `STATUS_FINAIS_NA_TELA`.
  2. `src/components/dados-das-etapas.ts:29`: a linha 14 e a seção dependem de duas entradas (a marca booleana e
     `estadoDaConfirmacao`), e a coerência entre elas só existe quando a página faz
     `aguardaConfirmacaoDoAwave: estado.tipo === 'aguardando'`. Razão: é a interface do plano, mas um erro de ligação na
     T18 faria selo, seção e Próxima ação discordarem. A T18 deve ter teste (e2e ou de página) que confira os três juntos
     nos estados aguardando, confirmada e final sem confirmação.
- Para a revisão da T18 (P-01 na tela): botão sem `DialogoConfirmacao`; `TEXTOS_CONFIRMACAO.consequencia` no parágrafo
  com `id="confirmacao-consequencia"` acima do botão, ligado por `aria-describedby`; nenhum uso do retorno de
  `confirmarDemandaNoPainel` além de sucesso ou erro; nome da pessoa em "Confirmada por" só como expressão JSX (C-18).
- O total da suíte deu 6311 testes, um a mais que os 6310 da entrega do engenheiro; todos passaram. Não muda o parecer.
- As ferramentas Grep e Glob não estavam disponíveis nesta sessão; li com Read e localizei pelo `git diff`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -8` — e0fcb59, 569cdc6 e fd06ba2 são da T17; base 422ec6f
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 422ec6f e0fcb59` — 6 arquivos de `src/`, a entrega e o `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 422ec6f fd06ba2 -- src` — diff inteiro do código e dos testes, revisado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -1 --format=%h -S "### Tarefa T17" -- docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md` — vazio (o título da tarefa no plano é outro; li a T17 com Read)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat a9fd9b8 fd06ba2 -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/proxy.ts src/db/privilegios.ts next.config.ts src/lib/rota.ts "drizzle/000[0-6]_*.sql" "drizzle/meta/000[0-6]_snapshot.json"` — vazio (G4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — árvore limpa
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-da-confirmacao.test.ts src/components/dados-das-etapas.test.ts test/estatico` — 37 de 37 arquivos, 1032 de 1032 testes
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 285 de 285 arquivos, 6311 de 6311 testes (saída lida com Read)

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
