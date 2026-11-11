---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T13-construcao
agente: engenheiro-frontend
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, 05-tech-lead.md, docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md (G1 a G7, T12 e T13), 01-analista-requisitos.md (RF-11, RF-12), 03-ux-ui-design.md (seções 2.1, 2.2, 2.4, 2.6, 6, 9, 10, 11), 04-seguranca-aplicacao.md (CV-01 a CV-20), 06-T03-tech-lead.md, 06-T05-engenheiro-frontend.md, 06-T05-tech-lead.md (e a versão bd54155), 06-T05-qa-automacao.md, 06-T06-engenheiro-backend.md, 06-T12-engenheiro-frontend.md, 06-T12-tech-lead.md, 06-T12-qa-automacao.md, src/app/(painel)/pacotes-decisao/[decId]/page.tsx, FormularioDecisao.tsx, RevisaoDoPacote.tsx, pagina.test.ts, src/app/(painel)/demandas/[id]/page.tsx, src/app/(painel)/layout.tsx, src/app/globals.css, src/app/api/pacotes-decisao/[decId]/decisao/route.ts, src/components/dados-da-decisao.ts, dados-da-decisao.test.ts, componentes.test.ts, Recolhivel.tsx, GrupoOpcoes.tsx, DialogoConfirmacao.tsx, Botao.tsx, Cartao.tsx, CabecalhoPainel.tsx, src/modules/acesso/matriz.ts, src/modules/limites.ts, scripts/seed-ficticio.ts (TITULOS_DO_E2E), e2e/apoio.ts, e2e/preparacao.ts, e2e/servidor.ts, e2e/decisao.spec.ts, e2e/decisao-botoes.spec.ts, e2e/seguranca.spec.ts, playwright.config.ts, test/estatico/decisao-e2e.test.ts, test/estatico/sem-recurso-externo.test.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

A T13 deixa a T11 Decisão no arranjo A no computador e no C2 no celular (RF-12; 03, 6.2 e 6.3; D-02, D-16). Só a camada
visual mudou. Não mudou nenhuma rota, Server Action, esquema, regra, papel, nem `validarDecisao`, `entradaDaDecisao`,
`envioDaDecisao` ou `textoDoDialogo`.

Todas as exigências de aprovação de hoje continuam visíveis e obrigatórias nas duas larguras:

- a revisão de C-14, sem abrir nada;
- o documento assinado (identificador e data) na conta da administradora;
- a caixa "Revisei os rascunhos…", com `aria-required`;
- a frase da opção fixada na segunda aprovação;
- "Aprovar" indisponível e explicado quando o pacote está desatualizado;
- o diálogo, que repete o repositório e o nível.

P-01 vale: nenhuma opção vem marcada, não há selo "Recomendada", e a recomendação aparece em texto antes das opções. Os
e2e conferem isso em 390 px e em 1280 px.

### O que a tela faz agora

- **Uma ordem de DOM em toda largura:**
  1. cabeçalho: "‹ Voltar para a demanda" (só abaixo de 768 px, 44 px), id, selos, `h1` "Decisão: <bdi>título</bdi>",
     a linha da demanda, a linha nova "Repositório destino: …" ("Não informado" quando falta) e as citações;
  2. os alertas de hoje;
  3. Aprovações;
  4. Resumo executivo;
  5. Recomendação;
  6. a revisão, parte sempre visível;
  7. o `Recolhivel` "Ver vantagens, desvantagens e a revisão do pacote", com critérios e definição de pronto, e as
     Opções completas;
  8. "Registrar decisão";
  9. o Pedido de Construção.
- **A partir de 1200 px:** o conteúdo fica em `xl:col-span-3` e o cartão "Registrar decisão" em `xl:col-span-2`, no topo
  e sem fixar. O pedido ocupa a linha toda. De 768 a 1199 px fica uma coluna, e o recolhível sempre aberto e sem botão.
- **Abaixo de 768 px, rodapé fixo da C2** (`#rodape-da-decisao`):
  - branco, com borda superior `linha` e preenchimento de 12 × 16 px mais `env(safe-area-inset-bottom)`;
  - principal de 48 px na largura toda, e "Devolver" e "Arquivar" lado a lado com 44 px;
  - 124 px de altura, ou 150 px com a explicação "Indisponível: pacote desatualizado." em 13 px;
  - nos `:has()` de `globals.css` (fora de camada, porque o `py-6` do `main` venceria), o `main` ganha folga de altura
    do rodapé + 16 px, e a raiz ganha o mesmo `scroll-padding-bottom`;
  - o rodapé só existe com formulário.
- **Diálogo de confirmação no celular** (03, 6.5): fica com a largura toda menos 16 px de cada lado, e os botões
  empilham na largura toda, com "Confirmar e registrar" primeiro. Os textos não mudaram.
- **Plano B do foco (`focusin` com `scrollIntoView`): não foi preciso.** O CA-12.3 passou no Chromium só com o
  `scroll-padding`. O Safari do iOS fica para o UAT de Fabiano (P-04).

### Pendências de tarefas anteriores resolvidas aqui

- **D-T12-01 (M1 da 06-T12-tech-lead):**
  - `idDoAlvo('statusDecisao')` aponta agora para o botão principal, ou para `decisao-devolver` com o pacote
    desatualizado;
  - os ids saem de `ID_DOS_BOTOES`, novo em `dados-da-decisao.ts` e usado também pelo formulário;
  - entrou um caso novo em "erros da API".
- **D-T12-02 (M2):** o cartão do `GrupoOpcoes` ficou `isolate`, e o rodapé tem `max-md:z-20`. O e2e em 390 px rola e
  marca opções com o rodapé por cima.
- **D-T12-03 (M3):** corrigi o comentário de `pagina.test.ts` ("Com o pacote desatualizado…").
- **Parecer 1 da 06-T03-tech-lead (cartão indisponível):** na variante `cartao`, a opção indisponível fica com borda
  tracejada, fundo `selo-cinza-fundo`, texto `tinta-media` e `cursor-not-allowed`, sem `cursor-pointer`. O bloqueio de
  clique e de teclado é o de hoje.
- **Minor 3 da revisão da T05 (e2e visto vermelho antes do código):** a saída está abaixo.
- **Desvio 5 da T12 (ordem revisão/comentários):** decidido em Decisões tomadas.

### Arquivos alterados

- `src/components/dados-da-decisao.ts`:
  - textos da 03, seção 9: `repositorioNaLinha`, `voltarParaDemanda` e `verDetalhes`;
  - `ID_DOS_BOTOES`;
  - `idDoAlvo` (D-T12-01);
  - `separarRevisao`, uma função pura.
- `src/app/(painel)/pacotes-decisao/[decId]/page.tsx`: o arranjo descrito acima, as seções em `Cartao`, o `h1` com
  `<bdi>`, `VoltarParaDemanda` e a grade `xl:`.
- `src/app/(painel)/pacotes-decisao/[decId]/RevisaoDoPacote.tsx`: duas partes. `RevisaoDoPacote` é a sempre visível, com
  o `h2`. `DetalheDaRevisao` tem critérios e definição de pronto, num cartão sem nome. Os tokens são da 03.
- `src/app/(painel)/pacotes-decisao/[decId]/FormularioDecisao.tsx`: só as classes do rodapé, do principal, da linha
  Devolver/Arquivar e da explicação, mais os ids vindos de `ID_DOS_BOTOES`.
- `src/components/DialogoConfirmacao.tsx`: classes `max-md:`.
- `src/components/GrupoOpcoes.tsx`: `isolate` e o cartão indisponível (desvio 1).
- `src/app/globals.css`: o bloco `@media (max-width: 767px)` com os `:has()`. Não há `url(` nem hexadecimal novo.
- `e2e/decisao.spec.ts`:
  - uma linha nova no cabeçalho;
  - o teste "C-14: …" ganhou a segunda rodada em 390 × 844 no mesmo DEC, sem decidir: revisão visível, erro, diálogo
    com repositório e nível, "Voltar" e axe em três estados;
  - nenhuma asserção saiu.
- `e2e/seguranca.spec.ts`:
  - o C-18 ganhou o cabeçalho da T11: um DEC da `textoDeTerceiro`, com `h1` e `<bdi>` literais nas duas larguras, nada
    executa, e "Voltar para a demanda" leva só o id;
  - o cabeçalho de uso C-36 foi atualizado;
  - nenhuma asserção saiu.

### Testes criados

- `src/components/dados-da-decisao.test.ts`, com 3 casos novos:
  - os textos da T13;
  - `separarRevisao` (D-16, CV-12): só critérios e definição no detalhe, nada some nem se repete, e item desconhecido
    fica visível;
  - D-T12-01 no 400 da decisão.
- `src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts`, com o describe novo "T13: arranjo A e C2" e 5 casos:
  - o cabeçalho, com "Voltar" `md:hidden` antes do `h1`, href `/demandas/<id>`, `<bdi>` e o repositório antes dos
    alertas;
  - a ordem do DOM, a grade `xl:`, o botão do recolhível com `aria-expanded="false"` e `aria-controls`, e o bloco
    `max-md:hidden`;
  - CV-12: o que fica fora e dentro do recolhível;
  - as classes do rodapé e a posição da explicação;
  - CA-12.5: sem rodapé quando não há formulário.
- `src/components/decisao-celular.test.ts` (novo), com 5 casos: o diálogo empilhado no celular, `isolate` no cartão e o
  cartão indisponível.
- `e2e/decisao-celular.spec.ts` (novo), 8 testes em 390 × 844:
  - CA-12.1 e CA-12.2 na `decisaoCelularDupla`:
    - o CTO aprova A pela API;
    - a administradora vê a frase fixada, o documento, as aprovações e o rodapé, sem rolagem lateral;
    - o axe roda; ela preenche o documento, aprova pelo rodapé e passa pelo diálogo empilhado;
    - aparece "Aprovação da administradora registrada. O pacote está aprovado.", e o rodapé some.
  - CV-13 e CV-19: nenhum rádio marcado, sem "Recomendada", recomendação antes das opções; "Voltar para a demanda" com
    44 px, antes do `h1`, href com o id validado, escondido em 1280 px, e o clique leva à T05.
  - CV-12 e CA-12.1 (caixa), administradora no DEC de agente:
    - revisão completa, os dois selos de rascunho e o repositório no cabeçalho;
    - alerta de rascunho, Recomendação e Aprovações;
    - critérios e Opções escondidos;
    - documento, caixa com `aria-required`, Comentários e os três botões na tela; axe.
  - Recolhível: `aria-expanded` e `aria-controls`; aberto mostra Opções, critérios e definição; o axe roda aberto;
    fecha devolvendo o foco; em 1280 px não tem botão e fica aberto.
  - CA-12.3 e CA-12.4:
    - Tab do primeiro rádio até "Arquivar", na ordem exata dos campos;
    - nenhum elemento focado sob o rodapé nem sob a barra de 56 px;
    - rodapé fixo, colado embaixo, na largura toda e com até 160 px;
    - botões com pelo menos 44 × 44, principal com 48 px na largura toda, Devolver e Arquivar lado a lado.
  - Aprovação do CTO pelo rodapé na `decisaoCelularCto`: marca B, "Aprovar a opção B", diálogo, "Decisão registrada:
    Aprovada, opção B." e a API grava B.
  - CA-12.6 e CV-11, no DEC desatualizado:
    - alerta e selo visíveis;
    - a explicação dentro da tela, no rodapé;
    - `aria-disabled` e a descrição; o clique forçado não abre diálogo, e não sai nenhum POST de Server Action;
    - o pedido escondido (A-03) em 390 e em 1280 px; em 1280 px o rodapé fica `static`;
    - axe.
  - CA-12.5 e CV-11:
    - o aprovado vigente, sem rodapé, com "Decisão registrada: …", o lembrete P1-d e o Pedido com o aviso do C-28;
    - o substituído, com o aviso e sem pedido;
    - nas duas larguras, com axe em 390 px.

### Testes que já existiam e mudaram (G3.2, trecho a trecho)

**`src/components/dados-da-decisao.test.ts`.** Mudaram três asserções. Só mudou o id do alvo do link do resumo
(seletor), pelo D-T12-01; mensagem, campo e ordem ficaram:

- "nada marcado": o `idCampo` passou de `campo-statusDecisao-aprovada` para `decisao-aprovar`;
- "desatualizado: o link do resumo…": passou de `campo-statusDecisao-devolvida` para `decisao-devolver`;
- "erros da API: o campo raiz…": passou de `campo-statusDecisao-devolvida` para `decisao-devolver`.

Os rádios antigos não existem desde a T12. Nenhuma asserção de regra mudou (CA-11.7).

**`src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts`** (fora do G5, mesma tela):

- o `h1` exato ganhou o `<bdi>` em volta do título (CV-18). O texto é o mesmo;
- o comentário da linha 272 foi corrigido (M3).

Não houve `.skip`, `.only`, `retries`, aumento de tempo-limite, regra do axe desligada nem `bypassCSP`. O
`decisao-e2e.test.ts` (cabeçalho e frase do axe) e o `piso-de-assercoes.test.ts` passam.

### Visto falhando antes do código

Unidade, com os testes escritos e o código sem mudança:
`pnpm test src/components/dados-da-decisao.test.ts src/components/decisao-celular.test.ts ".../pagina.test.ts"` deu
**15 falhas** e 81 testes passaram. Trecho:

```
 ❯ src/components/decisao-celular.test.ts (5 tests | 4 failed)
 ❯ src/components/dados-da-decisao.test.ts (56 tests | 6 failed)
TypeError: t.repositorioNaLinha is not a function
-     "decisao-aprovar",
+     "campo-statusDecisao-aprovada",
 ❯ src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts (35 tests | 5 failed)
AssertionError: expected [ 'flex', 'flex-col', 'gap-3' ] to deeply equal ArrayContaining{… "max-md:fixed" …}
```

e2e: depois só das funções puras (para o `next build` passar) e sem nenhuma mudança de tela,
`pnpm test:e2e e2e/decisao-celular.spec.ts e2e/seguranca.spec.ts e2e/decisao.spec.ts` deu **9 falhas** (as 8 da spec
nova e o C-18 da T11) e 15 testes passaram. Trecho:

```
Error: expect(locator).toBeInViewport() failed
Locator:  getByRole('group', { name: 'Ações da decisão', exact: true }).getByRole('button', …)
Received: viewport ratio 0
Error: expect(locator).toBeVisible() failed
Locator: getByRole('link', { name: 'Voltar para a demanda', exact: true })
Error: element(s) not found      (locator('main h1 > bdi'), na T11)
```

### Resultado

- Os três specs da tarefa: **24 de 24**.
- `pnpm test`: **5194 testes, 0 falhas** (eram 5181; 13 a mais). O relatório JUnit ficou no scratchpad da sessão.
- `pnpm test:e2e`, suíte inteira (226 testes), três rodadas:
  1. **221 de 226**. As 5 falhas eram do C-36: a conta "cto" estourou as 60 versões por hora, depois as ESP e os RSK
     dos specs seguintes receberam 429, e o TOTP do C-19 também. A causa foram as versões que os meus testes criavam
     com a "cto". Passei a criação para a "administradora" (decisão abaixo).
  2. **225 de 226**. A falha foi `casca-qa.spec.ts:75` (gaveta da T05, em `/demandas`, que a T13 não toca): "subtree
     intercepts pointer events" no `abrirGaveta`. Ela passou na 1ª rodada, e sozinha com `--repeat-each=3` deu 24 de
     24. Está registrada em Pendências.
  3. **226 de 226**.
- `pnpm lint` e `pnpm typecheck`: limpos.
- CV-01: o `git diff --stat 198e97d -- <lista do G4>` saiu vazio. `src/modules`, `package.json` e `pnpm-lock.yaml` só
  têm as mudanças da T02 e da T07. Não há `'use server'` novo nem alterado.
- `git status`: só os 11 arquivos modificados e os 2 novos da tarefa. Não há temporário no repositório (o
  `test-results/` do Playwright é ignorado pelo git).

### Desvios do plano

1. **`GrupoOpcoes.tsx` alterado** (fora da lista da T13), pelas pendências D-T12-02 e parecer 1 da T03, que a revisão
   mandou para esta tarefa. Só classes mudaram. O teste de atributos da variante cartão (`componentes.test.ts`) passa
   sem mudança.
2. **`src/components/decisao-celular.test.ts` é arquivo novo**, fora do plano. Ele cobre o diálogo e o cartão, que
   mudaram aqui. `componentes.test.ts` não mudou.
3. **Dentro do recolhível, o detalhe da revisão vem antes das Opções.** A 03, 6.3 lista "Opções completas e Revisão",
   nessa ordem. Assim, critérios e definição seguem logo o `h2` "Revisão antes de decidir" na leitura por títulos, sem
   criar título novo (texto fora da seção 9) nem repetir o nome da região.
4. **CA-12.1 está coberto em dois DECs.** A caixa de revisão só aparece com rascunho de agente citado, e conta de pessoa
   não cria rascunho pela API.
   - A frase fixada, o documento e a aprovação ficam na `decisaoCelularDupla`.
   - A caixa (com `aria-required`), o documento e o rodapé ficam no DEC de agente da `decisaoRecomendaB`, como
     administradora, só lendo.
5. **Testes do plano juntados:** CA-12.3 com CA-12.4, e CV-13 com CV-19. É menos login seguido da mesma conta: o TOTP
   recebe 429 com quatro verificações em cerca de 10 s (06-T05). A cobertura é a do plano.
6. **As versões dos e2e novos são da "administradora".** Em `decisao-celular.spec.ts` (até 8) e no caso da T11 de
   `seguranca.spec.ts` (até 3), a "cto" só aprova. A "cto" chegava a 60 versões por hora na suíte. O DEC da T11 na
   `textoDeTerceiro` é "CTO e administradora", para a administradora ver o formulário.
7. **Axe em 390 px com `semViolacoes`**, depois de `setViewportSize`. O `semViolacoesNasDuasLarguras` é da T16.

## Decisões tomadas

- **Ordem dos campos:** Comentários continua antes da caixa de revisão (desvio 5 da T12). `validarDecisao` está
  congelada pelo plano e define a ordem do resumo de erros como "a ordem da tela", e o DOM tem de seguir o resumo.
- **`h1` como `t.titulo('')` mais `<bdi>{título}</bdi>`.** Uso o prefixo de hoje, sem texto novo, e o título de
  terceiro fica isolado (CV-18).
- **"Voltar para a demanda" só aparece se o id casa `RE_ID_DEMANDA`** (CV-19). O ícone é SVG com `aria-hidden`.
- **Rodapé com `max-md:z-20` e o cartão com `isolate`.** As duas coisas juntas evitam que o rádio (`z-10`) passe por
  cima do rodapé em qualquer navegador.
- **Explicação do indisponível em 13/18 px no celular**, para a altura de 150 px da 03. O CSS usa 124 e 150 px, com a
  margem de 16 px.
- **`DialogoConfirmacao` muda no celular em todas as telas que o usam** (é componente comum, como o plano listou). A
  partir de 768 px fica igual.
- **O id do DEC no cabeçalho ficou `font-mono`** do tamanho de hoje, e não Mono 12. O teste de HTML existente prende essa
  marcação, e a diferença é só visual.
- **A T03 Minor 3 (`aria-disabled` numa variante fora do `primario`) não entra.** Nenhuma tela da T13 usa outra variante
  indisponível.

## Pendências

- **Tech-lead e `qa-automacao` (não bloqueia), banco reaproveitado (`BASE_URL`):**
  - o novo C-18 da T11 cria, uma vez, ESP, RSK e DEC na `textoDeTerceiro`;
  - o C-18 da T05 (T11) espera essa demanda sem ESP ("Escrever a especificação técnica.") e roda antes dele;
  - num banco novo a cada `pnpm test:e2e` isso passa sempre. Contra uma homologação reaproveitada, a 2ª execução
    reprovaria o caso da T05;
  - se a 09 reaproveitar banco, vale uma demanda própria no seed para o C-18 da T11 (`engenheiro-backend`, `scripts/`).
- **Tech-lead e `qa-automacao` (não bloqueia):** a "cto" está perto do limite de 60 versões por hora na suíte. A T16 e a
  T17 devem criar versões com a "administradora", ou com outra conta do seed.
- **`qa-automacao` (não bloqueia):** `casca-qa.spec.ts:75` (CA-04.2, gaveta da T05) falhou uma vez em três suítes, com
  "subtree intercepts pointer events" no `abrirGaveta`. Passou nas outras duas e em 24 de 24 sozinho. É do apoio da
  gaveta (a espera da animação, Minor 1 da revisão da T05), e não da T13.
- **Para a 07 (`qa-funcional`), à mão:**
  - o recolhível com leitor de tela (anúncio do `aria-expanded`);
  - o diálogo empilhado nas outras telas que usam `DialogoConfirmacao` em 390 px;
  - o cartão de opção indisponível (só existe em teste; nenhuma tela o usa hoje).
- **Fabiano (UAT, P-04):** a T11 em 390 px no Safari do iOS, com o teclado virtual sobre o rodapé, a área segura, o
  `:has()` e o foco sob o rodapé, já que o plano B não entrou.
- **Para a T16:**
  - `text-texto-suave` continua no rótulo indisponível da variante `lista` do `GrupoOpcoes` e nos componentes que o
    parecer 2 da T03 lista;
  - a limpeza de `opcoesDaDecisao`, `legendaDecisao`, `aprovar` e `devolver` sem uso.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261110-0015-v1`, limpo no início
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format=%h%x20%s -n 40 -- docs/construcao/DEC-DEM-20261110-0015-v1` — entregas do pedido
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -n 1 --format=%h -S "### Tarefa 13" -- docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md` — nenhum (o título é "### T13."; li o plano com Read)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S"T13" --format=%h%x20%s -- docs/construcao/DEC-DEM-20261110-0015-v1/06-T05-tech-lead.md docs/construcao/DEC-DEM-20261110-0015-v1/06-T05-engenheiro-frontend.md docs/construcao/DEC-DEM-20261110-0015-v1/06-T05-qa-automacao.md` — e776a4b e bd54155
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -p -n 1 --format=%h bd54155 -- docs/construcao/DEC-DEM-20261110-0015-v1/06-T05-tech-lead.md` — Minor 3 da revisão da T05 (e2e vermelho na T13)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -n 1 --format=%h -- docs/construcao/DEC-DEM-20261110-0015-v1/01-analista-requisitos.md docs/construcao/DEC-DEM-20261110-0015-v1/04-seguranca-aplicacao.md` — ece9750
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -n 3 --format=%h%x20%s -S"decisaoCelularDupla" --` — commits da T06
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --diff-filter=A --name-only --format= -- src/app/api/pacotes-decisao` — rotas da decisão
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --diff-filter=A --name-only --format= -- test/estatico e2e` — testes estáticos e specs
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -n 3 --format=%h%x20%s -- e2e/seguranca.spec.ts` — topo f6558c3 (T11)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 5e3b0da f6558c3 -- e2e/seguranca.spec.ts` — o C-18 da T05
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -n 1 --format=%h -- src/modules/acesso/matriz.ts` — 9caf56c
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-da-decisao.test.ts src/components/decisao-celular.test.ts "src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts" --silent` — vermelho: 15 falharam e 81 passaram
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/decisao-celular.spec.ts e2e/seguranca.spec.ts e2e/decisao.spec.ts --reporter=line` — vermelho: 9 falharam e 15 passaram
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components "src/app/(painel)/pacotes-decisao" test/estatico --silent --reporter=dot` — 57 arquivos, 1130 de 1130
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/decisao-celular.spec.ts e2e/seguranca.spec.ts e2e/decisao.spec.ts --reporter=line` — 24 de 24
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent --reporter=junit --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/0a919744-0e04-42d0-bf4b-e75d6acefb82/scratchpad/t13-suite.xml` — 5194 testes, 0 falhas
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --reporter=dot` — 221 de 226 (5 falhas por 429: C-36 da conta "cto" e TOTP)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 198e97d -- src/proxy.ts src/proxy.test.ts next.config.ts src/app/api src/db drizzle src/modules/acesso src/worker src/jobs src/agents src/lib/auth.ts src/lib/auth-cliente.ts src/lib/qr.ts src/lib/log.ts src/lib/erros.ts src/instrumentation.ts pnpm-workspace.yaml "src/app/(painel)/configuracao/agentes/acoes.ts" "src/app/(painel)/demandas/[id]/acoes.ts" "src/app/(painel)/demandas/[id]/editar/acoes.ts" "src/app/(painel)/demandas/[id]/especificacoes/nova/acoes.ts" "src/app/(painel)/demandas/[id]/pacotes-decisao/novo/acoes.ts" "src/app/(painel)/demandas/[id]/pareceres-risco/novo/acoes.ts" "src/app/(painel)/demandas/nova/acoes.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes.ts"` — vazio (CV-01)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — 11 modificados e 2 novos, todos da tarefa
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 198e97d -- src/modules package.json pnpm-lock.yaml` — só a T02 (`package.json` +2, lock +16) e a T07 (`resumo-da-fila.*`)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 11 arquivos, 523 inserções e 124 remoções
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — os mesmos arquivos da tarefa
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --reporter=dot` — 225 de 226 (`casca-qa.spec.ts:75`, gaveta da T05, instável)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/casca-qa.spec.ts --repeat-each=3 --reporter=dot` — 24 de 24
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --reporter=dot` — 226 de 226
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent --reporter=junit --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/0a919744-0e04-42d0-bf4b-e75d6acefb82/scratchpad/t13-suite-final.xml` — 5194 testes, 0 falhas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — 11 modificados e 2 novos; nenhum temporário

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa (mais `GrupoOpcoes.tsx` e o teste novo `decisao-celular.test.ts`, pelas pendências da T03 e da T12, explicados nos desvios 1 e 2)
- [x] os textos são os de `03-ux-ui-design.md`, em pt-BR, e o axe não acusa violação nas telas tocadas (T11 em 1280 e em 390 px: pendente, com erro, com o diálogo, com o recolhível aberto, desatualizado, decidida e substituída)
