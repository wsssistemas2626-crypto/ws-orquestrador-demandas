---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T14-construcao
agente: engenheiro-frontend
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, 05-tech-lead.md, tarefas.json, docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md (G1 a G7, T13 a T17), 01-analista-requisitos.md (RF-01 a RF-16), 03-ux-ui-design.md (seções 0 a 2.6, 5.2, 6.3 a 7.2, 8, 9 e 10), 06-T13-engenheiro-frontend.md, src/components/Cartao.tsx, src/components/CamposDaDemanda.tsx, src/components/CampoTexto.tsx, src/components/ListaTextos.tsx, src/components/GrupoOpcoes.tsx, src/components/CabecalhoPainel.tsx, src/app/globals.css, src/app/(painel)/layout.tsx, src/app/(painel)/demandas/nova/page.tsx, FormularioNovaDemanda.tsx, formularios.test.ts, src/app/(painel)/demandas/[id]/editar/page.tsx, FormularioEditarDemanda.tsx, src/app/(painel)/demandas/[id]/especificacoes/nova/page.tsx, FormularioEspecificacao.tsx, pagina.test.ts, especificacao-qa.test.ts, src/app/(painel)/demandas/[id]/pareceres-risco/novo/page.tsx, FormularioParecer.tsx, pagina.test.ts, parecer-qa.test.ts, scripts/seed-ficticio.ts (CONTAS_FICTICIAS, TITULOS_DO_E2E), e2e/apoio.ts, e2e/editar-demanda.spec.ts, e2e/nova-demanda.spec.ts, playwright.config.ts, test/estatico/decisao-e2e.test.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

A T14 põe T04 Nova demanda, T06 Editar dados, T07 Nova ESP e T08 Novo RSK no molde da 03, seção 8.2 (RF-14). Mudou só a
camada visual:

- cada `fieldset` ou `section` de hoje virou um `Cartao` ou ficou dentro de um;
- cada campo solto do formulário ficou num cartão próprio;
- as quatro telas têm até 760 px de largura;
- os blocos do formulário ficam a 20 px um do outro (03, 2.4);
- três classes de token antigo saíram dos arquivos tocados.

Nenhum campo, ordem, texto, validação, diálogo, condição, Server Action ou leitura mudou. O CV-01 continua vazio.

### Arquivos alterados

- `src/components/CamposDaDemanda.tsx` (seções de T04 e T06):
  - `Secao` agora é o próprio `Cartao`, com o mesmo `section aria-labelledby` e o mesmo `h2`;
  - a borda do fieldset "Anexo N" passou de `border-borda` a `border-linha`, porque é agrupamento dentro do cartão
    (decisão abaixo);
  - a dica do limite de anexos passou de `text-perigo` a `text-erro`, e de `text-texto-suave` a `text-tinta-media`.
- `src/app/(painel)/demandas/nova/page.tsx`: o contêiner ganhou `max-w-190` (760 px).
- `src/app/(painel)/demandas/nova/FormularioNovaDemanda.tsx`:
  - o grupo "Como criar a demanda?" (só aparece com o agente ligado) ficou num `Cartao`;
  - o `form` passou de `gap-8` para `gap-5`.
- `src/app/(painel)/demandas/[id]/editar/page.tsx`: o contêiner ganhou `max-w-190`; o id passou de `text-texto-suave` a
  `text-tinta-media`.
- `src/app/(painel)/demandas/[id]/editar/FormularioEditarDemanda.tsx`: o `form` passou de `gap-8` para `gap-5`.
- `src/app/(painel)/demandas/[id]/especificacoes/nova/page.tsx`: o contêiner ganhou `max-w-190`.
- `src/app/(painel)/demandas/[id]/especificacoes/nova/FormularioEspecificacao.tsx`:
  - a `Secao` local envolve o `fieldset` num `Cartao`;
  - "Restrições técnicas" e a lista "Dúvidas em aberto" ganharam cada uma o seu `Cartao`;
  - o `form` passou de `gap-8` para `gap-5`.
- `src/app/(painel)/demandas/[id]/pareceres-risco/novo/page.tsx`: o contêiner ganhou `max-w-190`.
- `src/app/(painel)/demandas/[id]/pareceres-risco/novo/FormularioParecer.tsx`:
  - a `Secao` local envolve o `fieldset` num `Cartao`;
  - "Resumo", as listas "Recomendações de mitigação" e "Pré-condições", e "Quando envolver…" ganharam cada um o seu
    `Cartao`;
  - o `form` passou de `gap-8` para `gap-5`.

Não houve `style=`, hexadecimal, `url(`, dependência nem `'use server'` novo.

### Testes criados

- `e2e/reflow.spec.ts` (novo, 3 testes; a T15 acrescenta T09, T10 e T12):
  - em 390 px (conta "cto") e em 320 px (conta "administradora"), nas quatro telas:
    - sem rolagem lateral (`scrollWidth` ≤ janela; CA-14.2, RNF-05);
    - cada `fieldset`, `section`, `input`, `select` e `textarea` do formulário dentro de um `.rounded-cartao`;
    - o número exato de cartões por tela: 5, 4, 7 e 7;
    - axe nas quatro telas em 390 px;
  - em 1280 px (conta "administradora"): a mesma estrutura, e o `form` com até 760 px de largura.
  - Não cria demanda nem versão (C-36, G3.10). T06, T07 e T08 abrem a demanda do seed `espListaDeTextos` e só leem.
    Há um login por largura, para o TOTP não receber 429.
- `src/app/(painel)/demandas/nova/formularios.test.ts`: um caso novo, "T14: o grupo 'Como criar a demanda?' e as
  seções ficam em cartões". O e2e sobe com os agentes desligados e não chega a esse grupo. Nenhuma asserção que já
  existia mudou.

### Testes que já existiam

Nenhum teste que já existia mudou: seletor, texto e asserção ficaram iguais (CA-14.1). Os e2e de T04, T06, T07 e T08
passam sem mudança: `nova-demanda`, `editar-demanda`, `demanda-formularios-qa`, `especificacao`, `especificacao-qa`,
`parecer-risco` e `parecer-risco-qa`. As regex de HTML dos `pagina.test.ts`, `formularios.test.ts` e dos `*-qa.test.ts`
também passam. Não houve `.skip`, `.only`, `retries`, aumento de tempo-limite, regra do axe desligada nem `bypassCSP`.

### Visto falhando antes do código

`pnpm test:e2e e2e/reflow.spec.ts`, com o spec escrito e o código sem mudança, deu **3 falharam e 0 passaram**. Trecho:

```
Error: T04 Nova demanda: fora de cartão
-   Array []
+   Array [
+   "section#",
+   "textarea#campo-texto",
+   "select#campo-origem-canal",
…
  3 failed
```

O reflow em 390 e em 320 px já passava antes. Ele roda antes da estrutura, e a T04 de hoje não rola de lado.

### Resultado

- `e2e/reflow.spec.ts`: **3 de 3**.
- Primeira suíte e2e inteira: **230 de 231**. Falhou `nova-demanda.spec.ts:171`, com axe `target-size` em
  `#campo-justificativaUrgencia` no passo de 320 px. A falha se repetiu com o spec rodando sozinho.
  - Um teste de diagnóstico, temporário e já removido de `e2e/reflow.spec.ts`, mostrou a causa. Depois de
    `setViewportSize(320 × 640)`, a ancoragem de rolagem do Chromium deixa o campo inteiro sob a barra fixa de 56 px
    da casca (topo −11, base 33), ao lado do botão "Menu".
  - A correção foi trocar `gap-8` (32 px) pelos 20 px entre blocos da 03, seção 2.4. O teste não mudou.
  - Ver Pendências: a correção depende da posição na tela.
- Segunda suíte e2e inteira: **231 de 231**.
- `pnpm test`: **5201 testes, 0 falhas**. O relatório JUnit ficou no scratchpad.
- `pnpm lint` e `pnpm typecheck`: limpos.
- CV-01: o `git diff --stat 198e97d -- <lista do G4>` saiu vazio.
- `git status`: 10 arquivos modificados e 1 novo da tarefa, mais esta entrega. Não ficou temporário no repositório.

### Desvios do plano

1. **O caso novo em `formularios.test.ts` foi escrito depois do código.** Ele cobre o único cartão que o e2e não
   alcança (o agente fica desligado no e2e). Sem a T14, ele reprova: o `section` não tinha `rounded-cartao` e não havia
   cartão em volta do fieldset do modo. Não guardei saída vermelha dele.
2. **`FormularioEditarDemanda.tsx` mudou** (o plano diz "páginas e formulários", então está dentro). Mudou só o `gap`
   do `form`.
3. **Campos soltos ganharam cartão próprio:** "Restrições técnicas", "Resumo" e "Quando envolver…", que não são
   `fieldset` nem `section`. Sem isso, o campo ficaria fora do molde 8.2, sozinho entre cartões.
4. **`gap-8` virou `gap-5` nos quatro formulários.** O motivo foi a falha do axe descrita acima, e a 03 (2.4) pede
   20 px entre blocos. O valor de antes (32 px) era da 0.1.13.

## Decisões tomadas

- **`Secao` de `CamposDaDemanda` virou o próprio `Cartao`**, e não um cartão em volta: assim não há `section` dentro de
  `section`. O `aria-labelledby` e o `h2` continuam, e a regex de `formularios.test.ts` passa sem mudança.
- **Fieldsets de T07 e T08 dentro de um `Cartao` sem nome.** O `Cartao` é um `section`, e sem nome ele não vira região.
  O fieldset continua com a `legend`, como na revisão da T13.
- **Borda do "Anexo N" em `linha`, não em `tinta-suave`.** O mapa da 03 (2.1) troca `borda` por `tinta-suave`, mas a
  própria 2.1 reserva `tinta-suave` para borda de campo e de controle. Este fieldset é agrupamento dentro do cartão,
  identificado pela `legend`; `linha` é a cor de divisor decorativo.
- **760 px pelo contêiner da página (`max-w-190`)**, como o `max-w-300` do `main`. O título e os alertas acompanham o
  formulário na mesma coluna, como no molde 8.2.
- **Não troquei os tokens antigos de `ListaTextos`, `CampoTexto` (`Dica` e `MensagemDeErro`) nem `GrupoOpcoes`.** São
  componentes comuns a outras telas, e a T16 troca todos de uma vez.
- **Contas do e2e novo:** "cto" em 390 px e "administradora" em 320 e 1280 px. Nenhuma cria versão. Dividir entre as
  duas contas espalha os logins.

## Pendências

- **Tech-lead e T16 (não bloqueia): axe `target-size` sob a barra fixa da casca depois de trocar a largura.**
  - Com `setViewportSize` para menos de 768 px, a ancoragem de rolagem do Chromium mantém o elemento que estava no topo
    da janela na mesma altura. Se ele é um campo, fica sob a barra de 56 px, ao lado de "Menu" e da marca, e o axe
    acusa `target-size`.
  - Os 20 px desta tarefa passaram o `nova-demanda.spec.ts:171`, mas o campo ainda fica com 13 px abaixo da barra (topo
    25, base 69). Isso depende da posição na tela.
  - Qualquer mudança de altura em T04 (ou a T16, que roda o axe em 390 px depois de 1280 px no mesmo estado, D-06) pode
    reabrir a falha.
  - Sugestão para a T16 decidir: no `semViolacoesNasDuasLarguras`, rolar ao topo (ou ao elemento focado) depois da
    troca de largura, como passo equivalente (G3.2). A regra do axe não muda.
- **Para a 07 (`qa-funcional`), à mão:** o cartão do grupo "Como criar a demanda?" com o agente orquestrador ligado. O
  e2e não liga agentes; só o teste de HTML cobre esse cartão.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261110-0015-v1`, limpo no início
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --diff-filter=A --name-only --format= -- "src/app/(painel)/demandas/nova" "src/app/(painel)/demandas/[id]/editar" "src/app/(painel)/demandas/[id]/especificacoes" "src/app/(painel)/demandas/[id]/pareceres-risco" src/components/Cartao.tsx src/components/CamposDaDemanda.tsx e2e` — arquivos das quatro telas e specs
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/reflow.spec.ts --reporter=line` — vermelho: 3 falharam e 0 passaram
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/reflow.spec.ts --reporter=line` — 3 de 3
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent --reporter=junit --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/0a919744-0e04-42d0-bf4b-e75d6acefb82/scratchpad/t14-suite.xml` — 5200 testes, 0 falhas
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --reporter=dot` — 230 de 231 (`nova-demanda.spec.ts:171`, axe `target-size` em 320 px)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 198e97d -- src/proxy.ts src/proxy.test.ts next.config.ts src/app/api src/db drizzle src/modules/acesso src/worker src/jobs src/agents src/lib/auth.ts src/lib/auth-cliente.ts src/lib/qr.ts src/lib/log.ts src/lib/erros.ts src/instrumentation.ts pnpm-workspace.yaml "src/app/(painel)/configuracao/agentes/acoes.ts" "src/app/(painel)/demandas/[id]/acoes.ts" "src/app/(painel)/demandas/[id]/editar/acoes.ts" "src/app/(painel)/demandas/[id]/especificacoes/nova/acoes.ts" "src/app/(painel)/demandas/[id]/pacotes-decisao/novo/acoes.ts" "src/app/(painel)/demandas/[id]/pareceres-risco/novo/acoes.ts" "src/app/(painel)/demandas/nova/acoes.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes.ts"` — vazio (CV-01)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff` — só classes, `Cartao` e comentários
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — arquivos da tarefa
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/demandas/nova/formularios.test.ts" --reporter=dot` — 12 de 12
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/nova-demanda.spec.ts --reporter=line` — 7 de 8 (a mesma falha, sozinho)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/reflow.spec.ts -g DIAGNOSTICO --reporter=line` — nenhum teste achado (a edição do diagnóstico não tinha sido gravada)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/reflow.spec.ts -g DIAGNOSTICO --reporter=line` — diagnóstico: campo com topo −11 e base 33 sob a barra de 0 a 56
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/reflow.spec.ts e2e/nova-demanda.spec.ts --reporter=line` — 10 de 12 (a troca de `gap` ainda não tinha sido gravada)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/reflow.spec.ts e2e/nova-demanda.spec.ts --reporter=line` — 12 de 12, com `gap-5` (o diagnóstico foi removido em seguida)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --reporter=dot` — 231 de 231
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent --reporter=junit --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/0a919744-0e04-42d0-bf4b-e75d6acefb82/scratchpad/t14-suite-final.xml` — 5201 testes, 0 falhas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — 10 modificados, 1 spec novo e esta entrega; nenhum temporário
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 198e97d -- src/proxy.ts src/proxy.test.ts next.config.ts src/app/api src/db drizzle src/modules/acesso src/worker src/jobs src/agents src/lib/auth.ts src/lib/auth-cliente.ts src/lib/qr.ts src/lib/log.ts src/lib/erros.ts src/instrumentation.ts pnpm-workspace.yaml "src/app/(painel)/configuracao/agentes/acoes.ts" "src/app/(painel)/demandas/[id]/acoes.ts" "src/app/(painel)/demandas/[id]/editar/acoes.ts" "src/app/(painel)/demandas/[id]/especificacoes/nova/acoes.ts" "src/app/(painel)/demandas/[id]/pacotes-decisao/novo/acoes.ts" "src/app/(painel)/demandas/[id]/pareceres-risco/novo/acoes.ts" "src/app/(painel)/demandas/nova/acoes.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes.ts"` — vazio (CV-01)

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega; o caso extra de `formularios.test.ts` veio depois, desvio 1)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] os textos são os de `03-ux-ui-design.md`, em pt-BR, e o axe não acusa violação nas telas tocadas (T04, T06, T07 e T08 em 390 px no `reflow.spec.ts`; em 1280 px e em 320 px pelos e2e de cada tela)
