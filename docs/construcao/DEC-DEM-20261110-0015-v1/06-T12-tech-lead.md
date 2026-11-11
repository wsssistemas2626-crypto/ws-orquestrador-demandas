---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T12-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12), tarefas.json, 05-tech-lead.md, docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md (G1 a G7, T12), 06-T11-tech-lead.md, 06-T12-engenheiro-frontend.md, commits 200c31a, 9485df1 e 2ce6e23, src/components/dados-da-decisao.ts, src/components/GrupoOpcoes.tsx, src/components/Botao.tsx, src/app/(painel)/pacotes-decisao/[decId]/FormularioDecisao.tsx, src/app/(painel)/pacotes-decisao/[decId]/page.tsx, src/app/(painel)/pacotes-decisao/[decId]/acoes.ts, src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts, src/modules/pacotes-decisao/schemas.ts, src/components/dados-da-decisao.test.ts, src/components/componentes.test.ts, e2e/decisao-botoes.spec.ts, e2e/decisao.spec.ts, e2e/axe-todas.spec.ts, e2e/pedido-construcao.spec.ts]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T12 (T11: um formulário, três botões; `engenheiro-frontend`). O código está no commit `200c31a`. O `9485df1`
e o `2ce6e23` só mexem no registro do maestro e na entrega. **Parecer: aprovada, sem Critical nem Important.** Há três
Minor, que vão para Pendências.

### Pedido do maestro: nenhuma regra de aprovação mudou

Conferi cada exigência no diff e no código de hoje:

| Exigência | Onde conferi | Resultado |
|---|---|---|
| Server Actions e regra do servidor | `acoes.ts` e `acoes-pedido.ts` no G4 (diff vazio); `src/modules` só com `resumo-da-fila.*` (T07); `schemas.ts` e `decidir.ts` sem diff | Não mudou |
| 2FA e papéis | `src/lib/auth*.ts`, `src/modules/acesso` e `src/proxy.ts` no G4, diff vazio; em `page.tsx` só sai a prop `opcoesDecisao` e o import dela (linhas 21 e 207); `formularioDaConta` sem diff | Não mudou |
| Quem vê o formulário (P1-a, P1-b) | `page.tsx:197-212`: mesmo `formulario.tipo`; o teste "P1-b … nenhum formulário" ficou, com `principal` no lugar de `registrar` | Não mudou |
| Dupla aprovação | `entradaDaDecisao` sem diff: na segunda aprovação vai a opção fixada; a tela mostra a frase da fixada e não mostra rádio (`FormularioDecisao.tsx:121-122`); `rotuloDoPrincipal` usa a fixada antes da marcada, então o botão nunca diz opção diferente da gravada (teste "o rótulo e o diálogo citam a mesma opção") | Não mudou |
| Documento assinado | `validarDecisao` sem diff: identificador e data obrigatórios para aprovar quando `pedeDocumento` (`dados-da-decisao.ts:256-260`); o e2e da dupla e o `decisao-botoes` (CA-11.5) conferem os dois erros. Ao devolver ou arquivar, o documento não vai na entrada (`entradaDaDecisao:283`) | Não mudou. Sai só o `aria-required` dos dois campos, porque agora eles aparecem também para quem vai devolver; o rótulo passa a "(obrigatório para aprovar)", como manda o plano e a 03 |
| Revisão dos rascunhos (C-14, CV-14) | `validarDecisao:262` sem diff, vale para qualquer `statusDecisao`; a caixa continua com `aria-required` (`FormularioDecisao.tsx:184`); teste de unidade nas três ações e e2e com "Devolver" sem a caixa | Não mudou |
| Diálogo com ação, repositório e nível (C-14) | `textoDoDialogo` sem diff; recebe o mesmo `v` que vai à Server Action (`aConfirmar`), sem reler o estado (CV-10) | Não mudou |
| Desatualizado (CV-11) | `envioDaDecisao:309` devolve `nada` para `aprovada` com `aprovarIndisponivel`; o botão tem `aria-disabled` e a explicação por `aria-describedby`; o 409 do servidor está em `decidir.ts`, sem diff; e2e com zero POST em clique, Enter e Espaço | Não mudou |
| Nenhuma opção marcada (P-01, CV-13, D-14) | `valoresDaDecisao()` começa com `opcaoEscolhida: ''` e o `GrupoOpcoes` é controlado por esse valor; não há `defaultChecked`, selo nem texto "Recomendada"; a seção "Recomendação" (`page.tsx:179`) vem antes do formulário (`page.tsx:196`) | Atendido; HTML (`pagina.test.ts`) e e2e em 1280 e 390 px conferem |

### O que mais foi conferido

- **Escopo:** os arquivos do commit são os da lista da T12, mais três fora dela, declarados como desvios: `GrupoOpcoes.tsx`,
  `pagina.test.ts` e `axe-todas.spec.ts`. Todos foram aceitos (abaixo). A árvore está limpa.
- **Funções do plano:** `ACOES_DA_DECISAO`, `EnvioDaDecisao`, `envioDaDecisao` e `rotuloDoPrincipal` são iguais às do
  plano. `FormularioDecisao.tsx` aceita o `submitter` só se for `HTMLButtonElement` do próprio formulário, e o valor
  ainda passa pela lista fechada (CV-10). O principal é o primeiro `submit` do DOM. Enquanto envia, os três ficam
  desabilitados e o ativado mostra "Registrando…".
- **CV-15:** o `form` não tem `action` nem `method`. `name` só existe nos rádios de opção e nos três botões; o HTML e o
  e2e listam os `[name]` do formulário.
- **Testes existentes que mudaram (G3.2, CA-11.7):** nenhuma asserção de regra saiu sem equivalente.
  - `dados-da-decisao.test.ts`: só texto literal, os três textos da 03.
  - `decisao.spec.ts`:
    - "Escolha a decisão." virou o erro da opção, porque a decisão vazia deixou de ser possível;
    - "grupo Opção escolhida com contagem 0" virou "visível desde o início" (03, 6.4);
    - "rádio não marcado" no desatualizado virou "diálogo fechado e sem resumo de erros";
    - o resto troca só o passo (`check` do rádio → clique no botão).
  - `pagina.test.ts`: as duas asserções do CA-12.4 (`aria-disabled` e descrição) ficaram, agora no botão, e ganharam
    quatro novas.
  - Não houve `.skip`, `.only`, `retries`, tempo-limite, regra do axe desligada nem `bypassCSP`.
- **TDD:** a unidade foi vista vermelha (17 falhas, com trecho na entrega), e o caso do `GrupoOpcoes` também (1 falha).
- **CV-01 (G4):**
  - o `git diff --stat 198e97d` das superfícies congeladas saiu vazio;
  - `git diff --stat 198e97d -- src/modules package.json` lista só `resumo-da-fila.ts` e o teste dele (T07), mais as 2
    linhas do `package.json` (T02);
  - não há `'use server'` novo.
- **Verde nesta revisão:**
  - `pnpm test`: 5173 testes, 0 falhas (relatório JUnit);
  - `pnpm lint` e `pnpm typecheck` limpos;
  - o `pnpm test:e2e` não está na minha lista **Pode**. A entrega declara 215 de 215, e quem roda de novo é a
    `06-T12-testes`.

### Decisão sobre os desvios declarados pelo engenheiro

1. **`GrupoOpcoes.tsx` (arquivo da T03): aceito, com o Minor M2.** O `::after` do rótulo cobria o rádio. A troca é só
   de classe, na variante `cartao`, com teste visto falhando. Não muda id, `name`, aria-* nem a lista.
2. **`pagina.test.ts` e `axe-todas.spec.ts` fora do G5: aceitos.** São da mesma tela e têm a mesma causa (o rádio
   "Decisão" deixou de existir). A mudança é de seletor ou do passo equivalente, e está explicada trecho a trecho.
3. **O e2e do Enter no DEC de agente da `decisaoRecomendaB`, como administradora: aceito.** Nenhum teste grava nele, e
   a API confere que o DEC continua pendente. Isso não gasta versão do C-36.
4. **No CV-11, Enter em Comentários e no próprio principal: aceito.** Com o pacote desatualizado não há `<input>` de
   texto na tela, e o D-05 já diz que o Enter numa `<textarea>` não envia.
5. **A ordem Comentários antes da revisão ficou: aceito.** É a ordem de `validarDecisao`, que o plano congela. O arranjo
   da 03 (6.2, 6.3) é da T13.
6. **O rodapé sem posição: aceito.** O arranjo C2 é da T13, e os ids de que ela precisa já estão no DOM.

### Pareceres (todos Minor; nenhum bloqueia)

- **M1 — `src/components/dados-da-decisao.ts:235`**
  - Problema: `idDoAlvo('statusDecisao')` ainda aponta o link do resumo de erros para `campo-statusDecisao-aprovada` (ou
    `-devolvida`). Esses rádios não existem mais desde esta tarefa.
  - Razão: a validação da tela não gera mais esse erro, porque o botão sempre define a decisão. Mas `errosDaApiDecisao`
    ainda pode gerar. `naTela` (linha 330) leva para `statusDecisao` todo erro 400 da raiz de `decisao`, e aí o link
    do resumo fica sem alvo. É um caminho raro: o cliente sempre manda um dos três valores.
  - Correção: apontar para `decisao-aprovar`, ou para `decisao-devolver` quando `aprovarIndisponivel`. Basta trocar o
    `idDoAlvo` e acrescentar um caso no teste de "erros da API".
- **M2 — `src/components/GrupoOpcoes.tsx:39` (com a linha 29)**
  - Problema: o rádio do cartão ganhou `relative z-10`, e o cartão (`CLASSE_DA_OPCAO.cartao`) é `relative` sem
    `isolate`. Por isso o `z-10` não fica preso ao cartão: ele vale no contexto de empilhamento da página.
  - Razão: na T13, o rodapé fixo do arranjo C2 em 390 px vai passar por cima das opções ao rolar. Se o rodapé tiver
    `z-index` automático ou menor que 10, os rádios aparecem por cima dele.
  - Correção: pôr `isolate` no cartão, que contém o `z-10` sem mudar o clique, ou dar ao rodapé um `z-index` maior. É
    mais seguro fazer isso na T13 e conferir com a captura em 390 px.
- **M3 — `src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts:272`**
  - Problema: no teste do pacote desatualizado, o comentário diz "Sem desatualização, as opções e o documento… não
    aparecem". O certo é "Com o pacote desatualizado".
  - Razão: o comentário diz o contrário do que a asserção confere. Quem for mexer no teste depois pode se confundir.

## Decisões tomadas

- A T12 está aprovada. Não há Critical nem Important, e os três Minor vão para Pendências (seção 12: só Critical e
  Important bloqueiam).
- Nenhuma regra ou exigência de aprovação mudou: Server Actions, schema, `decidir.ts`, `validarDecisao`,
  `entradaDaDecisao`, `textoDoDialogo` e `formularioDaConta` estão sem diff, e as superfícies do G4 também. A tela só
  troca a forma de escolher a ação. Nenhuma opção vem marcada (P-01).
- Tirar o `aria-required` do documento não afrouxa a regra. A obrigatoriedade continua na validação da tela e no
  servidor. O atributo saiu porque os campos agora aparecem também para quem vai devolver ou arquivar, e o rótulo diz
  "(obrigatório para aprovar)". O plano pediu isso de forma explícita.
- Os seis desvios foram aceitos, cada um pela razão escrita acima. Nenhum afrouxa os controles CV-10, CV-11, CV-13, CV-14,
  CV-15 nem o CV-01.
- Os M1 e M2 vão para a T13, que já mexe em `dados-da-decisao.ts` (`separarRevisao`) e no rodapé. Assim não abro
  correção nesta passagem.

## Pendências

- **Minor (D-T12-01, M1), para a T13 (`engenheiro-frontend`):**
  - trocar o alvo de `idDoAlvo('statusDecisao')` para o botão principal (ou "Devolver" com o pacote desatualizado);
  - acrescentar um caso no teste de "erros da API";
  - custo: cerca de 15 minutos.
- **Minor (D-T12-02, M2), para a T13:**
  - `isolate` no cartão do `GrupoOpcoes`, ou `z-index` do `#rodape-da-decisao` acima de 10;
  - conferir em 390 px, com o rodapé fixo sobre as opções.
- **Minor (D-T12-03, M3), na T13 ou na T16:** corrigir o comentário de `pagina.test.ts:272`. É uma linha.
- **Limpeza, na T16 ou depois:** `opcoesDaDecisao`, `legendaDecisao`, `aprovar` como rótulo de rádio e `devolver`
  ficaram sem uso na tela. Eles só têm teste. O plano mandou manter nesta tarefa, então isto não é dívida da T12.
- **Para a `06-T12-testes` (`qa-automacao`):**
  - rodar de novo `decisao-botoes.spec.ts`, `decisao.spec.ts`, `axe-todas.spec.ts` e `pedido-construcao.spec.ts`;
  - o alerta da T11 sobre o `ipFicticio()` e o 429 depois de troca de worker continua valendo.
- **Para a 07 (`qa-funcional`), como a entrega já lista:**
  - Enter num campo, com leitor de tela;
  - o anúncio da troca de texto do principal;
  - o foco de volta ao botão no Safari;
  - acrescento o Enter num rádio de opção e na caixa de revisão. Ele envia pelo principal e tem de cair na validação
    ou no diálogo, nunca gravar direto.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -8` — topo 2ce6e23; código da T12 em 200c31a
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 200c31a 9485df1 2ce6e23` — 13 arquivos na 200c31a; as outras duas, só a entrega e `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 200c31a -- src/components/dados-da-decisao.ts src/components/GrupoOpcoes.tsx "src/app/(painel)/pacotes-decisao/[decId]/page.tsx"` — diff das funções, do cartão e da página
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 200c31a -- "src/app/(painel)/pacotes-decisao/[decId]/FormularioDecisao.tsx"` — diff do formulário
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 200c31a -- src/components/dados-da-decisao.test.ts src/components/componentes.test.ts` — diff dos testes de unidade
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 200c31a -- "src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts"` — diff do teste de HTML
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 200c31a -- e2e/decisao.spec.ts e2e/axe-todas.spec.ts e2e/pedido-construcao.spec.ts` — diff dos e2e existentes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 198e97d -- src/proxy.ts src/proxy.test.ts next.config.ts src/app/api src/db drizzle src/modules/acesso src/worker src/jobs src/agents src/lib/auth.ts src/lib/auth-cliente.ts src/lib/qr.ts src/lib/log.ts src/lib/erros.ts src/instrumentation.ts pnpm-workspace.yaml "src/app/(painel)/configuracao/agentes/acoes.ts" "src/app/(painel)/demandas/[id]/acoes.ts" "src/app/(painel)/demandas/[id]/editar/acoes.ts" "src/app/(painel)/demandas/[id]/especificacoes/nova/acoes.ts" "src/app/(painel)/demandas/[id]/pacotes-decisao/novo/acoes.ts" "src/app/(painel)/demandas/[id]/pareceres-risco/novo/acoes.ts" "src/app/(painel)/demandas/nova/acoes.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes.ts"` — vazio (CV-01)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 198e97d -- src/modules package.json` — `package.json` (2+), `resumo-da-fila.ts` e o teste dele
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — vazio
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=junit --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/0a919744-0e04-42d0-bf4b-e75d6acefb82/scratchpad/t12-revisao.xml --silent` — 5173 testes, 0 falhas

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`

Checklist da seção 12:

- [x] A tarefa faz o que o plano pede, nem mais nem menos; arquivos fora da tarefa não mudaram. Os acréscimos são os
  desvios 1 e 2, aceitos acima.
- [x] Há teste para cada comportamento novo, e ele falharia sem o código. A unidade e o caso do `GrupoOpcoes` foram
  vistos vermelhos. O e2e novo usa o grupo "Ações da decisão" e os ids dos botões, que não existiam antes.
- [x] Nenhum segredo, valor de `.env` ou dado pessoal real em código, teste, log ou fixture. Só "Pessoa Ficticia …",
  `DOC-FICTICIO-*`, repositórios `…/ficticio` e títulos do seed com "(fictício)".
- [x] Entrada externa validada com Zod; erro sem vazar detalhe. A Server Action e o `registrarDecisaoSchema` não mudaram,
  e o teste confere que tudo o que `envioDaDecisao` confirma passa no schema.
- [x] Banco: migration gerada, papel migrator, RLS e guarda quando houver `tenant_id`. Não se aplica: a tarefa não toca
  banco nem esquema.
- [x] Nada duplica função que já existe no repositório. `envioDaDecisao` reaproveita `validarDecisao`, e o diálogo e a
  entrada usam as funções de hoje.
- [x] Textos de interface em pt-BR; axe sem violação nas telas tocadas. Os textos novos são os da 03, seção 9. O axe roda
  nos estados novos (erro do documento, desatualizado com os três botões) e nos de hoje. A nova execução é da
  06-T12-testes.
- [x] O que é Minor vai para Pendências; só Critical e Important bloqueiam a passagem.
- [x] No PR: `/code-review` uma vez, correção do Critical/Important, re-revisão só do diff das correções e
  `/security-review` no fim. Não se aplica a esta etapa: é da `08-revisao`.
