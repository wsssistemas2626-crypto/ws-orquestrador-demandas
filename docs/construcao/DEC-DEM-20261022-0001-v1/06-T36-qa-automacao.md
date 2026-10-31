---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T36-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json (linha da T36), 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6, linhas 1 a 200; Fase 7 e T36, linhas 3400 a 3516; de passagem, T33 e T37 nas linhas 3300 a 3340 e 3518 a 3590), 01-analista-requisitos.md (RF-01 a RF-26 e a tabela de RNF, linhas 1 a 463), 03-ux-ui-design.md (seções 1 e 2, linhas 1 a 260), 05-tech-lead.md (cabeçalho e fases), parada-PF-T36.md, 06-T36-engenheiro-frontend.md (as duas voltas, a primeira por git show 9756105), 06-T36-tech-lead.md, git diff ddf362c..251a16a (stat e os dois arquivos alterados), src/components (os 17 componentes, AvisosDaMoldura.tsx, formulario.ts, rotulos.ts e os três .test.ts), src/app/(painel)/layout.tsx, src/app/(painel)/demandas/page.tsx, src/app/sem-permissao/page.tsx, src/app/not-found.tsx, src/app/error.tsx, src/app/globals.css, e2e/moldura.spec.ts, e2e/apoio.ts, src/modules/demandas/gerar-id.ts, src/modules/historico/consultas.ts, src/modules/historico/registrar.ts, src/db/schema/historico.ts, src/lib/acao-painel.ts, src/lib/erros.ts (linhas 1 a 40), src/app/api/saude/route.ts, test/estatico/varreduras-qa.test.ts (linhas 1 a 20), vitest.config.ts, tsconfig.json, 06-T35-qa-automacao.md (formato), saída do pnpm test gravada pela ferramenta nesta etapa (tool-results/b2gnf53al.txt, só o fim)]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T36: design system, moldura do painel e infraestrutura do e2e. O código da tarefa é o intervalo `ddf362c..251a16a`.
Depois de `251a16a`, só mudaram `06-T36-tech-lead.md` e `passagens.jsonl` (`git diff --stat 251a16a HEAD`).

### Critério da tarefa e teste que o cobre

A T36 cobre RF-26 (base), RNF-11, RNF-16, a 03 de 2.1 a 2.8, RNF-09 (aviso de capacidade) e RF-18 (aviso de suspensão
na moldura). Os testes do plano (passo 1) estão todos lá, com o mesmo nome. Legenda: (E) do engenheiro e (Q) desta
etapa.

| Critério | Teste |
|---|---|
| 03, 2.1: tokens, tipografia e raio | `test/estatico/painel-qa.test.ts` › `design system (03, 2.1)` › `token %s = %s, dentro do @theme` (11 casos) e `foco visível: contorno de 2 px…; base de 16 px e altura de linha 1,5` (Q) |
| 03, 2.1: foco visível nunca removido | `painel-qa.test.ts` › `nada no painel remove o contorno de foco` (Q) |
| 03, 2.1: alvo de 44 px | `componentes.test.ts` › `Botao` › `é type="button" por padrão, com alvo de 44 px` (E) |
| 03, 2.2: selos e cores | `rotulos.test.ts` › `rótulos de status são os de 03, 2.2`, `cores dos selos de status, de decisão e de nível`, `decisão, nível e selos especiais` (E); `componentes.test.ts` › `Selo é texto, com 800 sobre 100 da mesma cor…` (E) |
| 03, 2.3: componentes | `componentes.test.ts`, todos os blocos (E). Mais `componentes-qa.test.ts` › `GrupoOpcoes: a opção indisponível não chega ao onMudar` (5), `Interruptor: clique e estado ocupado`, `ResumoErros: bordas` (3) e `Botao, Paginacao e AreaTexto: bordas` (5) (Q) |
| 03, 2.3 e T05: opção indisponível barrada também no `change` (Observação A da revisão) | `componentes-qa.test.ts` › `controlado: o change da opção disponível chama onMudar; o da indisponível e o de valor de fora, não`, `não controlado (valorPadrao)…` e `o clique na opção indisponível é impedido (preventDefault)…` (Q) |
| 03, 2.4: Lista de textos | fora da T36. É da T41, desvio 8 aceito pelo tech-lead |
| 03, 2.5: padrão de formulário | `formulario.test.ts`, 9 testes (E); `formulario-qa.test.ts`, 11 testes (Q); `componentes.test.ts` › `rótulo visível ligado ao campo; dica e erro por aria-describedby…` (E) |
| 03, 2.5: foco do Resumo de erros, identidade do resultado (Minor 3) | `formulario.test.ts` › `o mesmo resultado devolve o mesmo objeto…` (E); `formulario-qa.test.ts` › `o mesmo resultado com outros rótulos é recalculado, e cada par volta ao seu objeto` (Q) |
| 03, 2.6: enumerações, ator e dinheiro | `rotulos.test.ts`, blocos `rótulos de enumeração`, `formatarDinheiro` e `rotuloAtor` (E); `rotulos-qa.test.ts` › `formatarDinheiro: valores grandes e frações` (Q) |
| 03, T05 "Histórico" (`textoDoEvento`) | `rotulos.test.ts` › `textoDoEvento`, 9 testes (E). `rotulos-qa.test.ts` (Q) tem: os 23 eventos com qualquer ator; nenhum valor livre de `antes` e `depois` no texto (C-30), 23 casos; 8 testes de caminho de reserva |
| 03, 2.7: moldura (lang, pular para o conteúdo, navegação, página atual, um `h1`, título, Menu em 320 px) | `e2e/moldura.spec.ts` › `moldura: pular para o conteúdo, navegação principal, página atual, um h1, lang pt-BR e axe` e `moldura: a conta aparece com o papel, o link de pular leva ao main e a tela estreita tem o botão Menu` (E); `componentes.test.ts` › `CabecalhoPainel (03, 2.7)` (E); `componentes-qa.test.ts` › `CabecalhoPainel: um item atual por rota do painel` (11 rotas da 03, seção 1, fora do painel, e o nome como texto) (Q) |
| RF-18: aviso de suspensão na moldura | `componentes.test.ts` › `AvisosDaMoldura (03, 2.7: RF-18 e RNF-09)`, 6 testes (E); `componentes-qa.test.ts` › `AvisosDaMoldura: fronteiras` (teto de US$ 0,01, teto 0, suspenso com 9.000; aviso sem `role="alert"`) (Q) |
| RNF-09: aviso acima de 9.000 demandas | os mesmos blocos; mais `o limite é o da T14 (9.000): no limite, nada; um acima, o aviso` e `no fim da faixa (9.999 e 10.000)…` (Q) |
| 03, 2.8: 401 leva a T01 | `e2e/moldura.spec.ts` › `sem sessão, o painel leva a /entrar` (E). O alerta "Sua sessão terminou." é da T37 |
| 03, 2.8: 404 | `e2e/moldura.spec.ts` › `404 com o texto de 03, 2.8` (E); `src/app/paginas-erro-qa.test.ts` › `título, texto e "Voltar para a fila" da 2.8; título da aba no modelo da 2.7` (Q) |
| 03, 2.8: 403 "Sem permissão" | `e2e/moldura.spec.ts` › `sem permissão com o texto de 03, 2.8` (E); `paginas-erro-qa.test.ts` › bloco `Sem permissão` (Q) |
| 03, 2.8: falha ao carregar uma tela (`error.tsx`) | não tinha teste. `paginas-erro-qa.test.ts` › `o texto da 2.8, um h1 e o botão "Tentar de novo"` e `nunca mostra a mensagem, a pilha nem o digest do erro (RNF-10)` (Q); `painel-qa.test.ts` › `error.tsx não lê o conteúdo do erro` (Q) |
| 03, 2.8: 409 e 5xx no formulário | `formulario.test.ts` › `409 de conflito leva o prefixo da 2.8…` e `erro interno e sem permissão mostram o texto da 2.8, nunca detalhe` (E); `formulario-qa.test.ts` › `não encontrado, limite e capacidade passam a mensagem da API; erro interno e sem permissão nunca` (Q) |
| RNF-11: axe sem violação | `e2e/moldura.spec.ts`, `semViolacoes`. Roda na moldura a 1280 px, a 320 px com o menu aberto, na 404 e em "Sem permissão" (E) |
| RNF-16: pt-BR | `lang="pt-BR"` no e2e da moldura (E). Os textos dos testes (E e Q) são os da 03, por inteiro |
| Exceção de C-04 aberta pela T36 (`/sem-permissao` fora do painel) | `test/estatico/varreduras-qa.test.ts`, com a mudança da T36 (E); `painel-qa.test.ts` › `páginas fora do painel não leem sessão nem banco` (3 páginas e a prova da regra) (Q) |
| Infraestrutura do e2e (`playwright.config.ts`, `e2e/servidor.ts`, `e2e/apoio.ts`) | exercitada pelo `pnpm test:e2e` desta etapa, 5 de 5 nas duas corridas. O caminho com `BASE_URL`, contra a homologação, fica para o 09 (Pendências) |

### Leitura crítica dos testes do engenheiro

- **Observação A da revisão, fechada.** O teste do Minor 4 só chamava `opcaoMarcavel`. Se a chamada saísse do
  `aoMudar`, a suíte seguia verde. O `GrupoOpcoes` não tem hook, então dá para chamá-lo como função e acionar o
  `onChange` e o `onClick` que ele põe em cada `<input>`, sem DOM. Os testes novos fazem isso nos modos controlado e não
  controlado, com um valor forjado de fora do grupo. Também conferem que a opção indisponível segue sem `disabled`
  nativo, para continuar encontrável.
- **`error.tsx` não tinha teste.** Nem unitário, nem e2e. Agora o texto da 2.8 está conferido, e há a prova de que a
  mensagem, a pilha e o digest do erro não aparecem.
- **Exceção da varredura de C-04.** A T36 mudou `varreduras-qa.test.ts` para aceitar `/sem-permissao` sem
  `exigirPessoaNaPagina`. A mudança é aceitável: o caso positivo e o negativo foram acrescentados e nenhuma asserção saiu
  (conferido no `git diff ddf362c 251a16a`). Só que a exceção só é segura enquanto a página não ler sessão nem banco. O
  teste novo trava essa condição para `/sem-permissao`, a 404 e `error.tsx`.
- **A memória de `errosDoResultado` não devolve cálculo velho.** O teste do engenheiro prova a identidade com os mesmos
  rótulos. O teste novo prova que outros rótulos recalculam o resultado e que cada par volta ao seu objeto.
- **Página atual na navegação.** Os testes de `ehPaginaAtual` cobriam 9 caminhos. O teste novo renderiza o cabeçalho
  nas 11 rotas da 03 (seção 1) e confere que só um item tem `aria-current="page"` e que é o certo.

### Testes acrescentados (122, em 5 arquivos novos, sem mexer em nenhum existente)

| Arquivo | Testes |
|---|---|
| `src/components/componentes-qa.test.ts` | 32: `GrupoOpcoes` (5), `Interruptor` (1), `AvisosDaMoldura` (5), `CabecalhoPainel` (13), `ResumoErros` (3), `Botao`, `Paginacao` e `AreaTexto` (5) |
| `src/components/rotulos-qa.test.ts` | 56: a lista dos 23 eventos travada por `satisfies Record<AcaoEvento, true>` (evento novo sem texto quebra o typecheck), 23 com qualquer ator, 23 com sentinelas em `antes` e `depois`, 8 de reserva e 1 de dinheiro |
| `src/components/formulario-qa.test.ts` | 11: memória por rótulos, sucesso, 400 com a lista vazia, dois erros no mesmo campo, códigos que passam ou não a mensagem, e 6 casos de `idDoCampo`, um deles com `<script>` |
| `src/app/paginas-erro-qa.test.ts` | 4: `error.tsx` (2), 404 (1) e "Sem permissão" (1), com o título da aba |
| `test/estatico/painel-qa.test.ts` | 19: tokens da 2.1 (11), foco e base, `globals.css` no layout raiz, foco nunca removido, as 3 páginas sem sessão nem banco, a prova da regra e `error.tsx` sem ler o erro |

Nenhum teste novo usa relógio. As datas são fixas (`new Date('2026-10-22T17:05:00Z')`), dentro de dado de teste.
Nenhum depende de ordem: o caminho do `usePathname` falso é definido no começo de cada teste que o usa. Os 5 arquivos
rodaram com `--sequence.shuffle`: 122 de 122.

### Resultado

- `pnpm test` (suíte inteira): 149 arquivos e **2956 de 2956**. São os 2834 que já existiam mais os 122 novos. O aviso
  do undici "Using `patch`" segue igual.
- `pnpm test:e2e`: **5 de 5** nas duas corridas, com axe (26,5 s e 27,4 s).
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.
- `git status --short --untracked-files=all`: só os 5 arquivos novos de teste. `git diff --stat` vazio: nenhum arquivo
  rastreado mudou.

### Classificação de falhas

Nenhuma falha no código da tarefa. Uma falha apareceu na primeira corrida, e era de uma asserção minha. O teste de
`Botao` procurava a palavra `disabled`, que também aparece nas classes `disabled:opacity-70`. Troquei para o atributo
`disabled=""` antes da corrida final.

Achados por leitura de código, todos Minor. Nenhum fere critério da T36 (detalhe em Pendências):

| # | Criticidade | Onde | Achado |
|---|---|---|---|
| 1 | Minor | `src/components/rotulos.ts:140` | `ehAgente` usa `v in NOME_AGENTE`. Com isso, `'constructor'` e `'toString'` passam como agente |
| 2 | Minor | `src/components/rotulos.ts:174` | `textoDoEvento` devolve `undefined` para uma `acao` fora do tipo. A coluna `evento.acao` não tem `CHECK` |
| 3 | Minor | `src/components/formulario.ts:34` | Só `erro_interno` recebe o texto fixo de 5xx da 2.8. O código `indisponivel` (503) passaria a mensagem que chegou |
| 4 | Trivial | `src/components/rotulos.ts:196` | `aprovacao_registrada` sem `opcao` vira "(opção )" |

## Decisões tomadas

- **Arquivos `-qa` novos, sem editar os do engenheiro.** Razão: o `git diff` fica só com acréscimo, e assim fica fácil
  conferir que nenhuma asserção existente foi afrouxada. Foi o mesmo padrão da T13 (`varreduras-qa.test.ts`).
- **`GrupoOpcoes` e `Interruptor` chamados como função para acionar os manipuladores.** Razão: o Vitest roda em `node`,
  sem DOM, e os dois componentes não têm hook. Com isso, o teste passa pelo `aoMudar` real, que era o que a Observação A
  pedia, sem instalar `jsdom` nem biblioteca nova.
- **Os achados 1 a 4 ficam como Minor, sem teste que falha.** Razão: nenhum fere critério da T36. Os dados de 1 e 2 são
  gravados pelo próprio sistema, e não pela pessoa. Hoje nenhuma Server Action lança `indisponivel`, e o evento de
  aprovação sempre leva a opção. Um teste vermelho aqui devolveria a tarefa por algo que não é dela.
- **No caso de dois erros no mesmo campo, a linha abaixo do campo não fica travada no primeiro nem no último.** Razão: a
  03 não define qual mostrar. O teste só exige uma mensagem por campo e as duas no resumo.
- **Os estáticos ignoram comentários.** Razão: o comentário de `sem-permissao/page.tsx` cita `exigirPessoaNaPagina` para
  explicar por que não o chama.

## Pendências

- **Para o `engenheiro-frontend` na T40 (Minor, achado 1).** O histórico da T05 é a primeira tela que usa `textoDoEvento`.
  Em `rotulos.ts:140`, `ehAgente` usa `v in NOME_AGENTE`, e o operador `in` também enxerga o protótipo do objeto. Com
  `depois.agente` igual a `'constructor'`, `NOME_AGENTE[a]` é uma função. Aí `suspensao_por_teto` mostra o código da
  função, e `falha_agente` lança erro em `charAt`. Quem grava esse campo é o próprio sistema (T23 e T27), então o risco é
  baixo. A correção é de uma linha: `Object.hasOwn(NOME_AGENTE, v)`.
- **Para o `engenheiro-frontend` na T40 (Minor, achado 2).** `listarHistorico` faz o cast de `evento.acao` para
  `AcaoEvento`, mas a coluna não tem `CHECK`. Uma linha com ação fora do tipo, por exemplo uma ação renomeada no futuro,
  faz o `switch` de `textoDoEvento` devolver `undefined`. Sugestão: um caso `default` com um texto neutro, confirmado
  pelo `ux-ui-design`. É o mesmo cuidado que `rotuloAtor` já tem com a conta sem nome.
- **Para o `engenheiro-frontend` e o `tech-lead` (Minor, achado 3).** A 2.8 manda mostrar o texto fixo para "Erro do
  servidor (5xx)". `alertaDe` só trata `erro_interno` assim, e `STATUS_DO_CODIGO` tem `indisponivel: 503`. Hoje nenhuma
  Server Action lança esse código. Se alguma passar a lançar, a tela mostra a mensagem que chegou. Sugestão: tratar
  `indisponivel` junto com `erro_interno`.
- **Trivial, achado 4.** `aprovacao_registrada` sem `opcao` vira "Registrou a aprovação como CTO (opção )". Hoje o evento
  sempre leva a opção (T21).
- **Para o 07-qa-funcional.** O que o Vitest em `node` não alcança:
  - o foco no `h1` ao navegar pelo menu;
  - o diálogo que prende o foco, fecha com Esc e devolve o foco à origem;
  - o anúncio do contador da `AreaTexto` a partir de 90 %;
  - o foco do Resumo de erros, que não sai do campo durante a digitação (Observação B);
  - no `GrupoOpcoes` não controlado, que a opção indisponível não fica marcada pelo teclado (a parte da Observação A
    que depende do navegador).
- **Para o 09-entrega (`homologar`).** O e2e rodou só contra o `next dev` do `e2e/servidor.ts`. O caminho com `BASE_URL`
  do `playwright.config.ts` e o nonce da CSP no `next start` são conferidos lá.
- **Ferramentas Grep e Glob indisponíveis nesta sessão.** Achei a T36 no plano e os RF nos requisitos só com o Read, por
  trechos, e por isso o `leu` cita trechos de outras tarefas lidos de passagem. Para saber onde nasceu o código
  `indisponivel`, usei `git log -S`, que está na lista Pode.
- **Saída do `pnpm test`.** Com o log do pino, a saída passou de 38 KB. Li só o fim do arquivo que a ferramenta gravou
  (`tool-results/b2gnf53al.txt`, fora de `/tmp`) para ver o total, como na 06-T35-testes.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -15` — topo f54a59d (06-T36-revisao tech-lead); construção em ddf673c, 9756105 e 251a16a
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat ddf362c 251a16a` — 38 arquivos, 2584 linhas acrescentadas e 5 removidas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 9756105:docs/construcao/DEC-DEM-20261022-0001-v1/06-T36-engenheiro-frontend.md` — entrega da primeira volta
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff ddf362c 251a16a -- test/estatico/varreduras-qa.test.ts src/app/layout.tsx` — só acréscimo de caso e o import do CSS; nenhuma asserção removida
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 251a16a HEAD` — só `06-T36-tech-lead.md` e `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -S"'indisponivel'" -- src` — 0d89a1d e 9caf56c
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 9caf56c --stat` — 24 arquivos da T11
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -S"indisponivel'," -- src` — 9caf56c
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 9caf56c -- src/lib/erros.ts src/lib/deps.ts src/modules/acesso/exigir-pessoa.ts` — nenhum `ErroDominio('indisponivel', …)` nesses três; o texto `indisponivel` da T11 é o da rota de saúde, lida pelo Read
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -S"indisponivel: 503" -- src` — 1e20426 (T03)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -S"'indisponivel'" -- src/modules src/lib` — nenhum commit
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components src/app/paginas-erro-qa.test.ts test/estatico/painel-qa.test.ts` — 175 de 176 (a asserção minha de `disabled` no `Botao`)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components src/app/paginas-erro-qa.test.ts test/estatico/painel-qa.test.ts` — 176 de 176, 8 arquivos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/componentes-qa.test.ts src/components/rotulos-qa.test.ts src/components/formulario-qa.test.ts src/app/paginas-erro-qa.test.ts test/estatico/painel-qa.test.ts --sequence.shuffle` — 122 de 122, semente 1793406945574
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent=true --reporter=dot` — 149 arquivos, **2956 de 2956**
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — 5 de 5
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — 5 de 5 (segunda corrida, estabilidade)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — só os 5 arquivos novos de teste
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — vazio, nenhum arquivo rastreado mudou

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste: a 03 de 2.1 a 2.8 (a 2.4 é da T41), RF-18, RNF-09, RNF-11, RNF-16 e a base de RF-26, na tabela da Entrega
- [x] a suíte inteira passa (2956 de 2956; e2e 5 de 5, duas vezes)
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real: datas fixas, o caminho falso definido em cada teste, e 122 de 122 com `--sequence.shuffle`
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada. Conferido com `git diff --stat` vazio e só arquivos novos no `git status`. A mudança da T36 em `varreduras-qa.test.ts` também só acrescenta casos
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real: só "Pessoa Ficticia", `DOC-FICTICIO-1`, ids `DEM-20261022-…` e sentinelas `SENTINELA-…`
