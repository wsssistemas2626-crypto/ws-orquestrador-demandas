---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T15-construcao
agente: engenheiro-frontend
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, 05-tech-lead.md, tarefas.json, docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md (G1 a G7, T13 a T17), 03-ux-ui-design.md (seções 0 a 2.6, 5.4 a 5.7, 6.1, 6.2, 6.5, 6.6, 7, 8 e 9), 06-T14-engenheiro-frontend.md, 06-T14-tech-lead.md, e2e/reflow.spec.ts, e2e/reflow-qa.spec.ts, e2e/apoio.ts, e2e/agentes-teto.spec.ts, e2e/pacote-decisao.spec.ts (cabeçalho e funções de apoio), scripts/seed-ficticio.ts (CONTAS_FICTICIAS, TITULOS_DO_E2E, versões do e2e), src/components/Cartao.tsx, src/components/Alerta.tsx, src/components/Tabela.tsx, src/components/DialogoConfirmacao.tsx, src/components/Interruptor.tsx, src/components/tokens-em-uso.test.ts, src/components/componentes.test.ts, src/components/componentes-qa.test.ts (Interruptor), src/components/dados-do-pacote.ts (faltaParaCriar), src/components/dados-do-parecer.ts (secoesDoParecer), src/modules/acesso/matriz.ts, src/app/(painel)/layout.tsx, src/app/(painel)/demandas/[id]/pacotes-decisao/novo/page.tsx, FormularioPacote.tsx, pagina.test.ts, src/app/(painel)/especificacoes/[espId]/page.tsx, pagina.test.ts, src/app/(painel)/pareceres-risco/[rskId]/page.tsx, src/app/(painel)/demandas/[id]/pareceres-risco/novo/page.tsx e FormularioParecer.tsx (molde da T14), src/app/(painel)/configuracao/agentes/page.tsx, AvisoDaTela.tsx, TabelaAgentes.tsx, FormularioTeto.tsx, pagina.test.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

A T15 põe T09 Novo pacote de decisão, T10 Ver versão (ESP e RSK) e T12 Agentes e teto no molde da 03, seção 8.2
(RF-14, CA-14.1, CA-14.2). Mudou só a camada visual:

- T09: cada campo solto e cada `fieldset` num `Cartao`; tela com até 760 px; 20 px entre blocos (03, 2.4).
- T10: cada seção (`section` + `h2` + `dl`) virou um `Cartao` com o mesmo `aria-labelledby`, `h2` e `dl`.
- T12: "Gasto do mês" e "Agentes" viraram cada uma um `Cartao`. A tabela continua com a rolagem própria de hoje
  (`Tabela`, região rolável). O `Interruptor` ganhou o trilho da 03, 8.2 (ligado `acao`, desligado `tinta-suave`, botão
  branco nos dois), com o texto do estado de hoje.

Nenhum campo, ordem, texto, validação, diálogo, condição, autorização, leitura, Server Action ou regra mudou. O
interruptor continua com a mesma regra de quem liga (C-12 decide no servidor; `acoes.ts` da T12 sem diff). CV-01 vazio.

### Arquivos alterados

- `src/app/(painel)/demandas/[id]/pacotes-decisao/novo/page.tsx`: contêiner com `max-w-190` (760 px).
- `src/app/(painel)/demandas/[id]/pacotes-decisao/novo/FormularioPacote.tsx`: "Resumo executivo", "Opção A", "Opção
  B", "Recomendação" e o grupo "Nível de aprovação requerido" ficam cada um num `Cartao` (5 cartões); o `form` passou
  de `gap-8` para `gap-5`.
- `src/app/(painel)/especificacoes/[espId]/page.tsx` e `src/app/(painel)/pareceres-risco/[rskId]/page.tsx`:
  - cada seção é um `Cartao` (7 em cada);
  - o link "Existe uma versão mais nova" passou de `text-primaria` para `text-acao-escura` (o apelido `primaria` já
    apontava para `acao-escura`, D-01: a cor é a mesma);
  - o contêiner passou de `gap-6` para `gap-5`.
- `src/app/(painel)/configuracao/agentes/page.tsx`:
  - `Secao` passou a ser o próprio `Cartao` (2 cartões);
  - a linha do último expurgo passou de `text-texto-suave` para `text-tinta-media` (mapa da 03, 2.1);
  - o contêiner passou de `gap-8` para `gap-5`.
- `src/app/(painel)/configuracao/agentes/AvisoDaTela.tsx`: o invólucro do `ProvedorDeAviso` passou de `gap-8` para
  `gap-5`. É ele que separa os dois cartões e o expurgo.
- `src/components/Interruptor.tsx`:
  - trilho ligado `border-acao bg-acao` (era `acao-escura`);
  - trilho desligado `border-tinta-suave bg-tinta-suave` (o fundo era `superficie`);
  - botão `border-branco bg-branco` nos dois estados;
  - contraste: branco sobre `acao` 5,0:1 e sobre `tinta-suave` 4,5:1; trilho contra a tela e o cartão ≥ 4,2:1. O
    `tokens-em-uso.test.ts` confere isso e não mudou.

Não houve `style=`, hexadecimal, `url(`, dependência nem `'use server'` novo.

### Testes criados

- `e2e/reflow.spec.ts`: 3 testes novos; os 3 da T14 não mudaram.
  - Em 390 px (conta "administradora") e em 320 px (conta "cto"), nas telas T09, T10 ESP, T10 RSK e T12:
    - nenhuma rolagem lateral (`scrollWidth` ≤ janela; CA-14.2, RNF-05);
    - axe em 390 px.
  - A T09 usa o mesmo teste de estrutura da T14 (`camposEmCartoes`): cada `fieldset`, `section` e campo do `form`
    dentro de um `.rounded-cartao`, e 5 cartões.
  - A T10 e a T12 usam `secoesEmCartoes`:
    - cada `section`, `h2`, `dl`, `table` e campo do `main` dentro de um cartão;
    - o número de `section.rounded-cartao`: 7, 7 e 2;
    - o `<dialog>` da T12 também tem `rounded-cartao`; fica fora da contagem e dentro do cartão "Agentes".
  - Em 1280 px (conta "administradora"): a mesma estrutura, o `form` da T09 com até 760 px e axe nas quatro telas.
  - Nenhum teste cria demanda nem versão, em nenhuma conta (C-36, G3.10):
    - usam a demanda do seed `etapasDupla`, a única que nasce com ESP e RSK (sem as duas, a T09 não mostra formulário);
    - abrem a `ESP-…-v1` e o `RSK-…-v1` dela e a T12, e só leem.
- `src/components/componentes.test.ts`: um caso novo no `describe('Interruptor …')`, "trilho ligado em acao e desligado
  em tinta-suave, botão branco nos dois". Nenhuma asserção que já existia mudou.

### Testes que já existiam

Nenhum mudou: seletor, texto e asserção ficaram iguais (CA-14.1).

- As regex de HTML de quatro testes passam sem mudança, porque o `Cartao` é o mesmo `section aria-labelledby`:
  `pacotes-decisao/novo/pagina.test.ts`, `especificacoes/[espId]/pagina.test.ts`,
  `pareceres-risco/[rskId]/pagina.test.ts` e `configuracao/agentes/pagina.test.ts`.
- Os e2e `pacote-decisao`, `agentes-teto` e os que abrem a T10 também passam sem mudança.
- Não houve `.skip`, `.only`, `retries`, aumento de tempo-limite, regra do axe desligada nem `bypassCSP`.

### Visto falhando antes do código

1. `pnpm test src/components/componentes.test.ts`, com o caso novo e o `Interruptor` de antes: **1 falhou e 37
   passaram**. Trecho:

```
FAIL  src/components/componentes.test.ts > Interruptor (03, 2.3 e T12) > trilho ligado em acao e desligado em tinta-suave, botão branco nos dois
- ArrayContaining [
-   "bg-acao",
-   "border-acao",
+ [ … "justify-end", "border-acao-escura", "bg-acao-escura", ]
```

2. `pnpm test:e2e e2e/reflow.spec.ts`, com o spec escrito e o código sem mudança: **3 falharam e 3 passaram** (os 3
   que passaram são os da T14). Trecho:

```
Error: T09 Novo pacote de decisão: fora de cartão
-   Array []
+   Array [
+   "textarea#campo-resumoExecutivo",
+   "fieldset#",
…
  3 failed
```

A estrutura da T09 é o primeiro passo que reprova. A T10 e a T12 vêm depois no mesmo teste e, sem `Cartao`, reprovam
pela mesma regra (`section` e `h2` fora de cartão, 0 cartões).

### Resultado

- `pnpm test` (suíte inteira): **5202 testes, 0 falhas**.
- `pnpm test:e2e e2e/reflow.spec.ts e2e/agentes-teto.spec.ts e2e/pacote-decisao.spec.ts`: **16 de 16**.
- `pnpm test:e2e` (suíte inteira): **235 de 235**.
- `pnpm lint` e `pnpm typecheck`: limpos.
- CV-01: o `git diff --stat 198e97d -- <lista do G4>` saiu vazio.
- `git status`: os 9 arquivos da tarefa e esta entrega; nenhum temporário no repositório.

### Desvios do plano

1. **`src/components/Interruptor.tsx` e `src/components/componentes.test.ts`** não estão na lista de arquivos da T15.
   - O plano pede "`Interruptor` com trilho `acao`/`tinta-suave`", e o trilho só existe no componente.
   - O caso novo em `componentes.test.ts` foi escrito antes do código e visto falhando (item 1 acima), como pede a
     Minor 1 da revisão da T14.
2. **`AvisoDaTela.tsx`** (pasta da T12) mudou só no `gap` do invólucro. É ele que separa os cartões da T12 (03, 2.4:
   20 px entre blocos).
3. **`gap-6` e `gap-8` viraram `gap-5`** nas três telas, como a T14 fez nos formulários (03, 2.4).
4. **Dois tokens antigos saíram dos arquivos tocados**, pelo mapa da 03, 2.1 e com a mesma cor: `text-primaria` nas duas
   T10 e `text-texto-suave` na T12. Os outros nomes antigos ficam para a T16 (D-01).

## Decisões tomadas

- **A T10 não tem limite de 760 px.** A 03, 8.2 limita a largura de formulário. A T10 é só leitura e fica na largura do
  `main` de hoje (`max-w-300`).
- **A linha do último expurgo da T12 fica fora de cartão.** É um rodapé de uma linha, sem `h2` nem `section`, e a 03 pede
  "cada seção num cartão".
- **A T10 e a T12 têm teste de estrutura próprio (`secoesEmCartoes`).**
  - As duas não têm `form` de página: a raiz é o `main`, e entram `h2`, `dl` e `table`.
  - A contagem é de `section.rounded-cartao`, para não contar o `<dialog>` da T12.
  - A T09 usa o `camposEmCartoes` da T14, sem mudança.
- **O botão do interruptor também é branco quando desligado.** Com o trilho cheio em `tinta-suave`, o botão de antes
  (borda `tinta-suave`) ficaria com 1:1 contra o trilho. O branco dá 4,5:1, e o `tokens-em-uso.test.ts` passa sem
  mudança.
- **Contas do e2e:** "administradora" em 390 e 1280 px e "cto" em 320 px, com um login por largura.
  - Nenhum teste cria demanda nem versão (C-36).
  - A matriz deixa as duas contas lerem as quatro telas: `criar_pacote_decisao`, `ler_*`, `ler_configuracao_agentes`
    e `ler_teto` valem para qualquer pessoa.
- **Volta 2:** o maestro liberou os dois `git log -G` só de leitura que tinham barra vertical no argumento (ela conta
  como pipe). Por instrução dele, os dois saíram de Comandos executados. Código, testes e resultados não mudaram.

## Pendências

- **Para a 07 (`qa-funcional`), à mão, na T12:**
  - o interruptor ligado (trilho `acao`);
  - o interruptor na conta administradora (desabilitado, `opacity-70`);
  - o foco no interruptor, dentro do cartão, depois de ligar e de desligar.
  - O e2e novo só lê a T12 com os quatro agentes desligados. O `agentes-teto.spec.ts` cobre o comportamento e roda o axe
    com o agente ligado.
- **Para a T16 (não bloqueia):** os `h2` das seções da T10 e da T12 continuam com `text-xl font-semibold` (20 px, peso
  600). A 03, 2.3 pede `h2` com 18 px e peso 700. Isso entra na passada de tokens e tipografia da T16, junto com os
  outros `h2`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261110-0015-v1`, limpo no início
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --diff-filter=A --name-only --format= -- "src/app/(painel)/demandas/[id]/pacotes-decisao" "src/app/(painel)/configuracao" "src/app/(painel)/demandas/[id]/versoes" "src/app/(painel)/demandas/[id]" src/components e2e` — arquivos das telas e specs
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --diff-filter=A --name-only --format= -- src/app` — páginas da T10
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -1 --format=%H` — topo e1d668b
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G "Interruptor" -p --format=%h -- src/components/componentes.test.ts src/components/componentes-qa.test.ts` — nenhuma asserção de classe do interruptor
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -1 -G "TITULOS_DO_E2E" --format=%h -- scripts/seed-ficticio.ts` — f4eba63
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -1 -G "faltaParaCriar" -p --format=%h -- src/components/dados-do-pacote.ts` — a T09 só abre o formulário com ESP e RSK
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -1 -G "secoesDoParecer" -p --format=%h -- src/components/dados-do-parecer.ts` — 7 seções no RSK
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -1 -G "criar_pacote_decisao" -p --format=%h -- src/modules/acesso/matriz.ts` — as duas contas leem as quatro telas
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/componentes.test.ts --reporter=dot` — vermelho: 1 falhou, 37 passaram
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/reflow.spec.ts --reporter=line` — vermelho: 3 falharam, 3 passaram
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components "src/app/(painel)/configuracao" "src/app/(painel)/especificacoes" "src/app/(painel)/pareceres-risco" "src/app/(painel)/demandas/[id]/pacotes-decisao" --reporter=dot` — 757 de 757
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/reflow.spec.ts e2e/agentes-teto.spec.ts e2e/pacote-decisao.spec.ts --reporter=line` — 16 de 16
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent --reporter=junit --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/0a919744-0e04-42d0-bf4b-e75d6acefb82/scratchpad/t15-suite.xml` — 5202 testes, 0 falhas, 0 erros
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --reporter=dot` — 235 de 235
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 198e97d -- src/proxy.ts src/proxy.test.ts next.config.ts src/app/api src/db drizzle src/modules/acesso src/worker src/jobs src/agents src/lib/auth.ts src/lib/auth-cliente.ts src/lib/qr.ts src/lib/log.ts src/lib/erros.ts src/instrumentation.ts pnpm-workspace.yaml "src/app/(painel)/configuracao/agentes/acoes.ts" "src/app/(painel)/demandas/[id]/acoes.ts" "src/app/(painel)/demandas/[id]/editar/acoes.ts" "src/app/(painel)/demandas/[id]/especificacoes/nova/acoes.ts" "src/app/(painel)/demandas/[id]/pacotes-decisao/novo/acoes.ts" "src/app/(painel)/demandas/[id]/pareceres-risco/novo/acoes.ts" "src/app/(painel)/demandas/nova/acoes.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes.ts"` — vazio (CV-01)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -- src` — só `Cartao`, classes e comentários, e o caso novo de teste
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — 9 arquivos da tarefa; nenhum temporário
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — depois do e2e: os mesmos 9 e esta entrega

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa (o `Interruptor`, o caso de teste e o `AvisoDaTela` estão explicados nos desvios 1 e 2)
- [x] os textos são os de `03-ux-ui-design.md`, em pt-BR, e o axe não acusa violação nas telas tocadas (T09, T10 ESP, T10 RSK e T12 em 390 e 1280 px no `reflow.spec.ts`; T12 nos estados do `agentes-teto.spec.ts`)
