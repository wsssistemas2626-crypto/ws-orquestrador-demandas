---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T16-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md (G1 a G7, T16), 01-analista-requisitos.md (RF-01, RF-16, RNF-03, RNF-05, RNF-13), 03-ux-ui-design.md (2.3 a 2.6), 06-T16-engenheiro-frontend.md, 06-T16-tech-lead.md, commit f66188b (git diff de AvisosDaMoldura.tsx), e2e/apoio.ts, e2e/alvo-de-toque.spec.ts, e2e/axe-todas.spec.ts, e2e/casca.spec.ts, e2e/casca-qa.spec.ts, e2e/autenticacao-qa.spec.ts (linhas 1 a 48), playwright.config.ts, test/estatico/piso-de-assercoes.test.ts, src/components/AvisosDaMoldura.tsx, src/components/Alerta.tsx, src/components/componentes-qa.test.ts, src/app/(painel)/demandas/fila-a1.test.ts (linhas 1 a 80), src/app/(painel)/demandas/CartoesDaFila.tsx (linhas 50 a 89), src/app/(painel)/pacotes-decisao/[decId]/page.tsx, src/app/(painel)/pacotes-decisao/[decId]/RevisaoDoPacote.tsx]
status: devolvido
proximo: engenheiro-frontend
devolvido_para: 06-T16-construcao
---
## Entrega

A T16 volta para a construção. Com o Minor 1 da revisão feito, a vigia do alvo de toque passou a medir os links soltos
que antes deixava passar e achou um defeito real: **na T11 em 390 px, os links da ESP e do RSK citados na "Revisão antes
de decidir" têm 240 × 24 px**. O RNF-03 pede 44 px abaixo de 768 px em todo controle, menos link dentro de frase. O resto
da T16 passa. Os Minor 1 e 2 estão feitos, e também uma instabilidade da suíte que esta etapa achou e corrigiu.

### O defeito (a causa da devolução)

```
e2e/alvo-de-toque.spec.ts:114 › RNF-03: T11 Decisão em 390 px, com o recolhível aberto: todo controle com 44 × 44 px
    - Array []
    + Array [
    +   "a# \"ESP-DEM-20261111-0023-v1\" 240×24",
    +   "a# \"RSK-DEM-20261111-0023-v1\" 240×24",
    + ]
```

- **Onde:** `src/app/(painel)/pacotes-decisao/[decId]/RevisaoDoPacote.tsx:17` e `:33`. O link (`CLASSE_LINK`, sem altura
  mínima) é o valor inteiro do termo, num `span` junto com o selo "Rascunho de agente". Não há texto solto ao lado dele,
  então não é link de frase (03, 2.4). É link solto e cai no RNF-03.
- **Por que só apareceu agora:** o filtro antigo comparava o `textContent` do pai com o do link. O `span` pai tem também
  o texto do selo, e por isso o link era tratado como "dentro de frase" e ficava fora da medida. É o mesmo furo que o
  Minor 1 da 06-T16-tech-lead descreveu para o id do cartão e para "Ver agentes e teto".
- **Reproduz sempre:** falhou nas quatro rodadas desta etapa que incluíram a spec.
- **Correção sugerida:** no mesmo molde do "Ver" das versões (`acaoDaVersao`) e de "Ver agentes e teto", pôr
  `inline-flex min-h-11 items-center md:min-h-6` no link de `RevisaoDoPacote.tsx`. O teste que já existe fica vermelho
  antes e verde depois. Não é preciso teste novo de e2e.
- **Mesma classe de defeito, fora do estado que o e2e alcança (recomendo corrigir na mesma passagem, com teste de
  HTML):** os links soltos dos alertas da T11 em `src/app/(painel)/pacotes-decisao/[decId]/page.tsx`. São eles: `:161`
  ("Ir para a demanda" do lembrete), `:169` (link do substituído) e `:177` (link do desatualizado). Cada um fica fora do
  `<p>` do `Alerta`, sem texto solto ao lado, só com `CLASSE_LINK`, sem `min-h-11`. É o mesmo caso de "Ver agentes e teto",
  que a T16 corrigiu. Os "Ver" da linha "Cita …" (`:145` e `:150`) estão entre parênteses, dentro de frase, e ficam de
  fora pela 03, 2.4.

### Critérios da T16 e o teste que cobre cada um

| Critério (plano, T16) | Teste | Resultado |
|---|---|---|
| RNF-13: zero violação do axe em T01 a T12, nos estados da `axe-todas`, em 1280 × 720 e 390 × 844 | `e2e/axe-todas.spec.ts`: os 12 testes "T01 Entrar…" a "T12 Agentes e teto…", cada estado por `semViolacoesNasDuasLarguras` (`e2e/apoio.ts`) | passa |
| RNF-13: gaveta aberta | `e2e/axe-todas.spec.ts` › "T03 Fila…" (passo da gaveta, 390 × 844); `e2e/casca.spec.ts` › "CA-04.5: axe com a gaveta aberta" | passa |
| RNF-13: T11 com o recolhível aberto | `e2e/axe-todas.spec.ts` › "T11 Decisão…" (passo "T11 com o recolhível aberto") | passa |
| RNF-03: alvo de 44 × 44 px em 390 px na T03, T05, T11 e gaveta | `e2e/alvo-de-toque.spec.ts`: "RNF-03: T03 Fila…", "RNF-03: T05 Detalhe…", "RNF-03: T11 Decisão…", "RNF-03: gaveta aberta…" | **T11 falha** (o defeito acima); as outras três passam |
| RNF-03: "Ver agentes e teto" (estado que o e2e não cria) | `src/components/componentes-qa.test.ts` › "AvisosDaMoldura: \"Ver agentes e teto\" com alvo de toque de link solto (RNF-03; 03, 2.4)" (3 testes, novos) | passa |
| RNF-05: sem rolagem lateral em 320 e 390 px | `e2e/reflow.spec.ts`, `e2e/reflow-qa.spec.ts`, `e2e/reflow-t15-qa.spec.ts` | passa |
| Nenhuma classe antiga, nenhum apelido no `globals.css` (D-01, RF-01) | `test/estatico/classes-antigas.test.ts` (6 testes); `test/estatico/painel-qa.test.ts` e `src/components/tokens-em-uso.test.ts` (os apelidos que não existem mais) | passa |
| CV-20: nenhuma regra do axe desligada; `decisao-e2e.test.ts` verde; piso de asserções | `test/estatico/decisao-e2e.test.ts`, `test/estatico/piso-de-assercoes.test.ts` | passa |
| CV-01 | `git diff --stat 198e97d -- <lista do G4>` | vazio |

### Minor 1 da 06-T16-tech-lead: feito

- `e2e/alvo-de-toque.spec.ts`, `dentroDeFrase`: um link é "de frase" só quando o pai tem um **nó de texto direto** não
  vazio ao lado dele. O texto de um elemento irmão (Selo, `<p>`) não conta. O comentário do cabeçalho foi ajustado.
- A spec passa a provar o que diz que cobre. `medirAlvos` devolve também os links soltos medidos, e entraram duas
  asserções novas:
  - T03: o id do cartão (`a "DEM-…"`) está entre os medidos;
  - T05: o "Ver" das versões está entre os medidos.
  Nenhuma asserção saiu: `expect(pequenos).toEqual([])` é a mesma de antes, com o resultado guardado numa variável.
- `src/components/componentes-qa.test.ts`, describe novo com 3 testes para "Ver agentes e teto":
  - o link existe e leva a `/configuracao/agentes`;
  - tem `min-h-11`, `md:min-h-6`, `inline-flex` e `items-center`. Sem `inline-flex`, o `min-height` não vale num `<a>`;
  - fica fora do `<p>` do aviso, sem texto solto ao lado (`</p><a …>Ver agentes e teto</a></div>`). Assim, o filtro do
    e2e o mediria se o estado aparecesse.
  Pelo diff de f66188b, antes da T16 o link só tinha `text-atencao-texto`, e as quatro asserções de classe falhariam.

### Minor 2 da 06-T16-tech-lead: feito

- `e2e/apoio.ts` exporta `abrirGaveta(page)` (clique em "Menu" só com a gaveta fechada, repetido até abrir, mais o fim
  da entrada de 200 ms), `gavetaParada(page)` e `abrirRecolhivel(page, nome)`.
- As cópias saíram de `e2e/casca.spec.ts`, `e2e/casca-qa.spec.ts`, `e2e/axe-todas.spec.ts` (a função e o bloco
  inline da gaveta) e `e2e/alvo-de-toque.spec.ts` (a função e o bloco inline). Todos importam de `apoio.ts`. As duas
  esperas inline de animação do `casca-qa` viraram `gavetaParada(page)`, um passo equivalente.
- A troca do `casca-qa` é a única de comportamento. O `abrirGaveta` de lá passa a esperar a animação, como o do
  `casca.spec` já esperava. Isso só deixa o teste mais estável e não muda nenhuma asserção.
- Pela busca de `-G` no git, as quatro specs são as únicas com esses auxiliares ou com `getAnimations`. A T17 pode
  importar `abrirGaveta` para a captura `gaveta-aberta-390`.

### Instabilidade achada e corrigida: `ipFicticio` depois de um teste que falha

- **Sintoma:** na suíte inteira, `e2e/autenticacao-qa.spec.ts:28` › "C-06 na tela: a 11ª tentativa…" falhou com
  `tentativa 10: Expected 401, Received 429`. Esse teste não foi tocado nesta etapa.
- **Causa:** depois de um teste que falha, o Playwright troca o worker. O `e2e/apoio.ts` volta a carregar com
  `contadorIp = 0`, e o teste seguinte repete os primeiros IPs fictícios do worker anterior dentro do mesmo minuto. O
  limite de 10 por IP (C-06) chega um passo antes. Hoje isso transforma uma falha em duas, e a segunda esconde a causa.
- **Reprodução:** `pnpm test:e2e e2e/alvo-de-toque.spec.ts e2e/autenticacao-qa.spec.ts`. Antes da correção, 2 falhas
  (a T11 e o C-06 com 429). Depois, só a T11 falha, e o C-06 passa.
- **Correção (`e2e/apoio.ts`):** o contador começa num bloco de 8.000 IPs escolhido por `TEST_WORKER_INDEX`, que o
  Playwright muda a cada worker novo. Dois workers seguidos nunca começam no mesmo bloco. A faixa (198.18.0.0/15), o
  formato e o limite de 64.000 continuam os mesmos, e nada depende do relógio.

### Testes acrescentados ou alterados nesta etapa

- `src/components/componentes-qa.test.ts`: +3 testes (describe "AvisosDaMoldura: \"Ver agentes e teto\"…").
- `e2e/alvo-de-toque.spec.ts`: novo filtro de frase, `medirAlvos` e +2 asserções (T03 e T05).
- `e2e/apoio.ts`: `abrirGaveta`, `gavetaParada`, `abrirRecolhivel` e o início do `ipFicticio` por worker.
- `e2e/casca.spec.ts`, `e2e/casca-qa.spec.ts`, `e2e/axe-todas.spec.ts`: só o import dos auxiliares no lugar das cópias.

### Resultados

- `pnpm test`: **5214 de 5214** na segunda rodada (224 s). Eram 5211, e os 3 a mais são os do `componentes-qa`. A
  primeira rodada deu **2 falhas em 5214**, em 849 s. Ela rodou junto com o `pnpm typecheck` e o `pnpm lint` desta
  etapa, que eu disparei durante ela. Não consegui ler quais foram: o relatório JUnit tem uma linha por teste, e sem
  busca por conteúdo na lista Pode não deu para achar as duas. A segunda rodada, sozinha, passou inteira. Ver Pendências.
- `pnpm lint` e `pnpm typecheck`: limpos.
- `pnpm test:e2e` (suíte inteira, antes da correção do `ipFicticio`): **238 de 240**. As falhas foram a T11 do
  `alvo-de-toque` (o defeito) e o C-06 da `autenticacao-qa` (a instabilidade, já corrigida).
- `pnpm test:e2e` das 4 specs tocadas: **36 de 37**, só a T11 do `alvo-de-toque`.
- CV-01: vazio.
- `git status`: só os 6 arquivos de teste e esta entrega. Nenhum temporário no repositório.

## Decisões tomadas

- Devolvo em vez de afrouxar o filtro: o link da ESP e do RSK é o valor inteiro de um termo, fora de frase. Aceitar o
  link por ele ter um selo ao lado seria repetir o furo que o Minor 1 mandou fechar.
- A vigia da vigia (`linksMedidos`) entrou porque o problema do Minor 1 era o spec dizer que cobria o que não cobria.
  Agora uma mudança no filtro que tire o id ou o "Ver" da medida reprova o teste.
- O teste de "Ver agentes e teto" ficou no HTML, como o tech-lead pediu: o e2e só lê, e pôr os agentes em suspensão
  mudaria o estado do banco para as specs seguintes.
- `ipFicticio` com `TEST_WORKER_INDEX`, e não com `test.info()`: o contador pode ser chamado em `beforeEach` e no corpo
  do teste, e a variável de ambiente existe desde a carga do módulo. Não usei número aleatório nem relógio, para o teste
  continuar determinístico.
- Não mexi em `src/` fora de `*.test.ts`: a correção do defeito é do `engenheiro-frontend`.
- Registro da volta 2: na volta 1 rodei, uma vez e por engano, uma busca só de leitura (`git diff --stat` contra a
  árvore vazia, com `-G` e três nomes de auxiliar separados por barra vertical). Ela achou as mesmas 4 specs. O maestro
  liberou essa busca e pediu para tirá-la de "Comandos executados". Ela fica registrada aqui para o histórico continuar
  completo.

## Pendências

- `e2e/alvo-de-toque.spec.ts` › "RNF-03: T11 Decisão em 390 px, com o recolhível aberto: todo controle com 44 × 44 px": os links da ESP e do RSK citados em `RevisaoDoPacote.tsx:33` têm 240 × 24 px em 390 px (RNF-03 pede 44 px abaixo de 768 px); pôr `inline-flex min-h-11 items-center md:min-h-6` no `CLASSE_LINK` de `RevisaoDoPacote.tsx:17`.
- Na mesma passagem (recomendado, com teste de HTML em `pagina.test.ts`): os links soltos dos alertas da T11,
  `page.tsx:161`, `:169` e `:177`, sem `min-h-11` (mesma classe de "Ver agentes e teto").
- Depois da correção: rodar a suíte e2e inteira. Com o `ipFicticio` corrigido, uma falha isolada não deve mais derrubar
  o C-06 da `autenticacao-qa`.
- **Para a próxima `06-T16-testes` (eu) ou para o maestro:** a primeira rodada de `pnpm test` desta etapa deu 2 falhas
  em 5214, sob carga (com `typecheck` e `lint` rodando junto, 849 s contra 224 s). Não consegui identificá-las. Na
  próxima volta, a suíte de unidade roda sozinha e, se falhar, com `--reporter=dot`, que mostra o nome no fim. Se o
  maestro quiser o nome agora, o relatório está em
  `/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/0a919744-0e04-42d0-bf4b-e75d6acefb82/scratchpad/t16-testes-suite.xml`
  (atributo `failures="1"` na `testsuite`).
- Seguem de antes, sem mudança: o Minor 3 da 06-T16-tech-lead (`h3` da T05) para a T17; os itens da 08 e da
  `10-documentacao` listados na revisão.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261110-0015-v1`, limpo no início
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -5` — topo 8cd67ca (06-T16-revisao), f66188b (construção)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 198e97d -- e2e` — 43 arquivos e2e mudaram desde a main
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 198e97d -- e2e/axe-todas.spec.ts` — os auxiliares da axe-todas nasceram neste pedido (não pesam no piso da main)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD -G "AvisosDaMoldura" -- src test e2e` — layout, o componente, `componentes-qa.test.ts`, `componentes.test.ts`, `casca-qa.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD -G "getAnimations" -- e2e` — as mesmas 4 specs
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD -G "aria-expanded" -- e2e` — as 4 specs mais `decisao-celular`, `fila-contadores` e `moldura` (sem cópia dos auxiliares)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD -G "min-h-11" -- src test` — 22 arquivos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff f66188b~1 f66188b -- src/components/AvisosDaMoldura.tsx` — antes da T16 o link só tinha `text-atencao-texto`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/componentes-qa.test.ts --reporter=dot` — 35 de 35
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/alvo-de-toque.spec.ts e2e/axe-todas.spec.ts e2e/casca.spec.ts e2e/casca-qa.spec.ts --reporter=line` — 36 de 37 (falha: T11 do `alvo-de-toque`)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 6 arquivos de teste
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --reporter=line` — 238 de 240 (T11 do `alvo-de-toque`; C-06 da `autenticacao-qa` com 429)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -- e2e/alvo-de-toque.spec.ts e2e/axe-todas.spec.ts e2e/casca.spec.ts e2e/casca-qa.spec.ts` — nenhuma asserção apagada nem afrouxada
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — 6 de teste e esta entrega
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 4b825dc642cb6eb9a060e54bf8d69288fbee4904 -G "ipFicticio" -- e2e test scripts src` — só `apoio.ts` e specs
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/alvo-de-toque.spec.ts e2e/autenticacao-qa.spec.ts --reporter=line` — antes da correção do `ipFicticio`: 5 de 7 (T11 e C-06 com 429)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/alvo-de-toque.spec.ts e2e/autenticacao-qa.spec.ts --reporter=line` — depois da correção: 6 de 7 (só a T11; o C-06 passa)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent --reporter=junit --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/0a919744-0e04-42d0-bf4b-e75d6acefb82/scratchpad/t16-testes-suite.xml` — 5212 de 5214 (2 falhas sob carga, não identificadas)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — 6 de teste e esta entrega
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico --silent --reporter=dot` — 390 de 390
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent --reporter=dot` — 5214 de 5214
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — 6 de teste e esta entrega
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 198e97d -- src/proxy.ts src/proxy.test.ts next.config.ts src/app/api src/db drizzle src/modules/acesso src/worker src/jobs src/agents src/lib/auth.ts src/lib/auth-cliente.ts src/lib/qr.ts src/lib/log.ts src/lib/erros.ts src/instrumentation.ts pnpm-workspace.yaml "src/app/(painel)/configuracao/agentes/acoes.ts" "src/app/(painel)/demandas/[id]/acoes.ts" "src/app/(painel)/demandas/[id]/editar/acoes.ts" "src/app/(painel)/demandas/[id]/especificacoes/nova/acoes.ts" "src/app/(painel)/demandas/[id]/pacotes-decisao/novo/acoes.ts" "src/app/(painel)/demandas/[id]/pareceres-risco/novo/acoes.ts" "src/app/(painel)/demandas/nova/acoes.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes.ts"` — vazio (CV-01)

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [ ] a suíte inteira passa — não: `e2e/alvo-de-toque.spec.ts` (T11) falha pelo defeito de código descrito em Entrega
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
