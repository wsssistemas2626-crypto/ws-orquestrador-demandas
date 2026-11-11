---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T14-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md (seções 1 a 9), contrato-passagem.md, tarefas.json, docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md (G1 a G7, T14), 01-analista-requisitos.md (RF-01 a RF-16), 06-T14-engenheiro-frontend.md, 06-T14-tech-lead.md, 06-T13-qa-automacao.md, commit 9278fd2 (git diff aeb5424 HEAD -- src e2e), e2e/reflow.spec.ts, e2e/apoio.ts, e2e/nova-demanda.spec.ts, e2e/decisao-celular-qa.spec.ts (aba nova e espera da hidratação), playwright.config.ts, src/components/Cartao.tsx, src/components/CamposDaDemanda.tsx, src/components/ListaTextos.tsx, src/components/lista-textos.ts (textos), src/components/dados-da-demanda.ts (limites), src/components/dados-da-especificacao.ts (textos e rótulos), src/components/dados-do-parecer.ts, FormularioEspecificacao.tsx, FormularioParecer.tsx (validação e envio), FormularioEditarDemanda.tsx (validação e envio)]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

A T14 passa. O código cumpre os critérios da tarefa e nenhum teste do engenheiro está errado ou instável. O
`reflow.spec.ts` mede T06, T07 e T08 **do jeito que abrem**. Acrescentei um e2e que mede as mesmas telas em 320 px
**depois de o conteúdo crescer** como cresce no uso. Esse é o caso em que um cartão novo costuma estourar a largura ou
deixar campo de fora. Ele passou de primeira e nas três rodadas da suíte inteira.

### Critérios da tarefa e os testes que os cobrem

| Critério | Teste (arquivo › nome) |
|---|---|
| CA-14.1 (os e2e de T04, T06, T07 e T08 passam só com mudança de seletor ou texto) | Os e2e de hoje, **sem nenhuma linha mudada** no commit 9278fd2 (o diff de `e2e/` é só o arquivo novo): `e2e/nova-demanda.spec.ts`, `e2e/editar-demanda.spec.ts`, `e2e/demanda-formularios-qa.spec.ts`, `e2e/especificacao.spec.ts`, `e2e/especificacao-qa.spec.ts`, `e2e/parecer-risco.spec.ts`, `e2e/parecer-risco-qa.spec.ts`. Verdes nas três rodadas. As regex de HTML de `formularios.test.ts`, `pagina.test.ts` e dos `*-qa.test.ts` dessas telas passam sem mudança |
| CA-14.2 (390 px sem rolagem lateral), T04 a T08 | `e2e/reflow.spec.ts` › "390 px › T04, T06, T07 e T08: sem rolagem lateral, e cada campo num cartão" e "320 px › …" (telas como abrem); `e2e/nova-demanda.spec.ts` › "axe: vazio, com erro e preenchido; 320 px sem rolagem da página" (T04 preenchida); **novo** `e2e/reflow-qa.spec.ts` › "320 px com o conteúdo crescido › T06, T07 e T08: anexos no limite, itens novos e resumo de erros sem rolagem lateral, tudo em cartões, foco fora da barra e axe; nada gravado" |
| Molde 03, 8.2: cada `fieldset`/`section`/campo num cartão; formulário até 760 px | `e2e/reflow.spec.ts` (as três larguras; número exato de cartões 5, 4, 7 e 7; `form` ≤ 760 px em 1280 px); `src/app/(painel)/demandas/nova/formularios.test.ts` › "T14: o grupo 'Como criar a demanda?' e as seções ficam em cartões" (agente ligado); **novo** `e2e/reflow-qa.spec.ts` (fieldsets de anexo e itens de lista criados na tela também ficam dentro de cartão, e o número de cartões não muda) |
| Token trocado na dica do limite de anexos (`text-tinta-media`) | **novo** `e2e/reflow-qa.spec.ts`: 50 anexos, "Adicionar anexo" desabilitado e com a dica do limite como descrição acessível; axe (contraste) em 320 e 1280 px nesse estado |
| `git diff` das quatro telas só com classe e marcação de cartão | Conferido no diff de 9278fd2 (ver Comandos): só `Cartao`, classes e comentários; nenhum campo, texto, validação, condição ou chamada mudou |
| CV-01 | `git diff --stat 198e97d -- <lista do G4>`: vazio |

### Teste acrescentado: `e2e/reflow-qa.spec.ts` (novo, 1 teste)

Arquivo `-qa` próprio, sem mexer na spec do engenheiro. Assim cada lado fica dono do que escreveu, e a T15 continua
acrescentando T09, T10 e T12 ao `reflow.spec.ts` sem conflito. Tudo em 320 × 844, com um login só (conta
"administradora") e a demanda do seed `espListaDeTextos`, que o teste só lê.

- **T06 Editar dados:**
  - adiciona anexos até o limite (`LIMITE_ANEXOS`, 50) e confere os 50 grupos "Anexo N";
  - confere "Adicionar anexo" desabilitado, com a dica do limite como descrição acessível;
  - põe uma referência longa sem espaço no Anexo 1, apaga o título e envia;
  - confere o resumo de erros e o link "Título: Informe o título.".
- **T07 Nova ESP:**
  - três itens a mais em "Dúvidas em aberto", o último com texto longo sem espaço;
  - "Sistema alvo" com 90 caracteres sem hífen, e o "Repositório destino" mostra o valor inteiro. Esse texto em fonte
    mono não tem ponto de quebra e mede mais que o dobro da largura da tela;
  - "Descrição objetiva" vazia: o envio dá o resumo de erros, e o diálogo "Gravar com dúvidas em aberto?" não abre.
- **T08 Novo RSK:**
  - dois itens a mais em "Recomendações de mitigação" e em "Pré-condições";
  - "Resumo" com 10.001 caracteres: o envio dá o resumo com "Resumo: Este campo aceita até 10.000 caracteres.".
- **Em cada estado:**
  - nenhuma rolagem lateral;
  - todo `fieldset`, `section`, `input`, `select` e `textarea` do formulário dentro de um `.rounded-cartao`, com o
    número de cartões da tela vazia (4, 7 e 7);
  - o resumo de erros focado e fora da barra fixa de 56 px do topo; o link do resumo foca o campo, e o campo também
    fica fora da barra (WCAG 2.4.11);
  - axe sem violação em 320 px, com a página no topo, e de novo em 1280 px, no mesmo estado.
- **Nada gravado:** zero POST em cada aba (a validação da tela barra o envio). O `GET /api/demandas/:id` do fim é igual
  ao do começo.
- **Estabilidade:**
  - cada tela abre numa aba nova do mesmo contexto, para o aviso de saída do formulário sujo não segurar a
    navegação;
  - antes do primeiro clique, o teste espera a hidratação do `form` (`__reactProps$`), como na 06-T13-testes;
  - não depende de ordem nem do relógio: só lê o seed e não cria demanda nem versão (C-36).

### Resultado

- `e2e/reflow-qa.spec.ts` com `e2e/reflow.spec.ts`: **4 de 4**.
- `pnpm test`: **5201 de 5201**, em 230 arquivos (`piso-de-assercoes.test.ts` e `decisao-e2e.test.ts` passam).
- `pnpm test:e2e`, suíte inteira, **três rodadas seguidas: 232, 232 e 232 de 232** (9,0 min, 8,7 min e 8,5 min). Os
  232 são os 231 da entrega do engenheiro mais o teste novo.
  - O `nova-demanda.spec.ts:171` (axe `target-size` em 320 px, Minor 3 da revisão) passou nas três rodadas.
- `pnpm lint` e `pnpm typecheck`: limpos.
- `git status`: só o spec novo e esta entrega; nenhum temporário. Nenhum teste existente mudou nesta etapa.
- Diff de testes do commit 9278fd2:
  - `formularios.test.ts` só ganhou um caso (9 linhas, nenhuma removida);
  - `e2e/` só ganhou o `reflow.spec.ts`;
  - sem `.skip`, `.only`, `.todo`, `retries`, aumento de tempo-limite, regra do axe desligada nem `bypassCSP`.

## Decisões tomadas

- **Conteúdo crescido, e não só a tela vazia:** a T14 pôs cartão em volta de partes que crescem na tela (anexos e
  itens de lista). Se faltar cartão ou a largura estourar, isso só aparece depois de adicionar.
- **320 px, e não 390 px:** é a largura mais estreita que o `reflow.spec` cobre (RNF-05). O que passa em 320 px passa em
  390 px.
- **Página no topo antes do axe em 320 px:** a regra `target-size` acusa um campo que a rolagem deixou sob a barra fixa,
  ao lado de "Menu". O resultado depende da posição de rolagem, e não da tela (Minor 3 da 06-T14-tech-lead). Nenhuma
  regra foi desligada. O que a rolagem expõe de verdade fica coberto pela conferência explícita do foco fora da barra.
- **Axe também em 1280 px no mesmo estado:** confere o contraste da dica do limite e do resumo com os tokens novos sem
  um segundo login.
- **Literais da 03 no spec, e não `TEXTOS_ESP`:** `dados-da-especificacao.ts` importa `vendor/construir/pedido.mjs` em
  tempo de execução. Só `dados-da-demanda.ts`, que não tem importação de execução de fora, foi importado: dele vêm o
  limite de anexos e o texto da dica.

## Pendências

- **Mantidas da 06-T14-tech-lead (não bloqueiam):**
  - Minor 2: o cartão do grupo "Como criar a demanda?" com o agente ligado, conferido à mão na `07-qa-funcional`. O
    e2e não liga agentes, e só o teste de HTML cobre esse cartão;
  - Minor 3: o axe `target-size` depois de `setViewportSize`, que fica para a T16. O spec novo não troca de largura
    antes do axe em 320 px, então não depende da correção.
- **Para a T16 (não bloqueia):** `ListaTextos.tsx:96` ainda usa `text-texto-suave` na dica "Limite de 50 itens
  atingido.". A T16 troca esse token, e o `classes-antigas.test.ts` vai acusar. Este spec não chega a 50 itens de
  lista.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261110-0015-v1`, limpo no início
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -8` — 9278fd2 (construção) e as revisões c4d11a5, 76f0b37 e b5cd7e0
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat aeb5424 HEAD` — 10 arquivos de `src/`, 1 spec novo e os documentos do pedido
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff aeb5424 HEAD -- src e2e` — só `Cartao`, classes e comentários; spec novo; um caso acrescentado em `formularios.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -1 --format=%H -S "export function validarParecer" -- src/components` — f0e384b (li `dados-do-parecer.ts` com Read)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -n 3 --format=%h%x20%s -S "scroll-padding" -- src` — 472439e e ddf673c
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -S scroll-padding 472439e~1 472439e -- src` — scroll-padding do rodapé da T11
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/reflow-qa.spec.ts e2e/reflow.spec.ts --reporter=line` — 4 de 4
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent --reporter=dot` — 5201 de 5201, 230 arquivos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --reporter=dot` — rodada 1: 232 de 232 (9,0 min)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — só o spec novo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 198e97d -- src/proxy.ts src/proxy.test.ts next.config.ts src/app/api src/db drizzle src/modules/acesso src/worker src/jobs src/agents src/lib/auth.ts src/lib/auth-cliente.ts src/lib/qr.ts src/lib/log.ts src/lib/erros.ts src/instrumentation.ts pnpm-workspace.yaml "src/app/(painel)/configuracao/agentes/acoes.ts" "src/app/(painel)/demandas/[id]/acoes.ts" "src/app/(painel)/demandas/[id]/editar/acoes.ts" "src/app/(painel)/demandas/[id]/especificacoes/nova/acoes.ts" "src/app/(painel)/demandas/[id]/pacotes-decisao/novo/acoes.ts" "src/app/(painel)/demandas/[id]/pareceres-risco/novo/acoes.ts" "src/app/(painel)/demandas/nova/acoes.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes.ts"` — vazio (CV-01)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --reporter=dot` — rodada 2: 232 de 232 (8,7 min)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --reporter=dot` — rodada 3: 232 de 232 (8,5 min)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — o spec novo e esta entrega; nenhum temporário

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
