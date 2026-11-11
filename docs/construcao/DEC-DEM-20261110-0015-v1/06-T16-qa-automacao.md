---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T16-testes
agente: qa-automacao
leu: [pedido.json, contrato-passagem.md, 06-T16-qa-automacao.md (a minha devolução anterior), 06-T16-engenheiro-frontend.md (volta da devolução), 06-T16-tech-lead.md (revisão da volta), playwright.config.ts, package.json, e2e/apoio.ts, e2e/axe-todas.spec.ts, e2e/reflow-qa.spec.ts, e2e/parecer-risco.spec.ts, test/estatico/piso-de-assercoes.test.ts, test/estatico/decisao-e2e.test.ts, test/deps.ts, scripts/scripts.test.ts (linhas 1 a 200), src/components/dados-da-demanda.ts (linhas 1 a 60), src/app/api/saude/route.ts, src/app/api/saude/route.test.ts, src/app/api/saude/route-qa.test.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

A T16 passa. Com a correção do engenheiro (`0f47b8c`), o defeito que motivou a devolução sumiu: a T11 do
`alvo-de-toque` passou nas três rodadas inteiras desta etapa. Segui a instrução da revisão: rodei a suíte e2e
sozinha, medi a duração de cada teste e dividi os três que passavam de 15 s, sem tirar asserção, sem `retries`, sem
`timeout` maior e sem `test.slow()`. A suíte de unidade mostrou um teste instável, já fora desta tarefa, que eu corrigi
na hora. Depois disso a suíte de unidade passou inteira, e a e2e passou duas vezes seguidas com o código final.

### 1. Medição: suíte e2e sozinha, antes de mexer (14,3 min, 240 de 240)

Testes acima de 15 s, com o limite em 30 s por teste:

| Teste | Duração | Leitura |
|---|---|---|
| `e2e/axe-todas.spec.ts:125` › "T03 Fila: com dados, filtrada, vazia com filtro e com filtro inválido" | **28,1 s** | 11 análises do axe; a 1,9 s do limite com a máquina sem outra suíte. É a causa mais provável de estouro no CI |
| `e2e/reflow-qa.spec.ts:99` › "T06, T07 e T08: …" | **27,6 s** | um dos dois timeouts do engenheiro |
| `e2e/axe-todas.spec.ts:293` › "T11 Decisão: pendente com rascunhos, com erro, com o diálogo aberto e na conta administradora" | **15,4 s** | 12 análises do axe e duas contas |

O `parecer-risco.spec.ts:203`, o outro timeout do engenheiro, levou **7,2 s** sozinho e não precisou de divisão. O
estouro dele na rodada do engenheiro veio da carga da máquina, que tinha acabado de rodar a suíte de unidade. Logo
abaixo do corte ficou `fila.spec.ts:128` (14,9 s).

### 2. Divisões feitas (G3.2: cada `expect` igual e no mesmo estado)

**`e2e/axe-todas.spec.ts`, T03: de 1 teste para 3**, cada um com o próprio login:
- "T03 Fila: com dados e filtrada";
- "T03 Fila: vazia com filtro e com filtro inválido";
- "T03 Fila em 390 px: com \"Mais filtros\" aberto e com a gaveta do menu aberta".

Cada estado já era aberto por `goto` próprio, então nenhum teste depende do anterior.

**`e2e/axe-todas.spec.ts`, T11: de 1 teste para 3**:
- "T11 Decisão: pendente com rascunhos e com o recolhível aberto";
- "T11 Decisão: com erro e com o diálogo aberto";
- "T11 Decisão na conta administradora: em dupla aprovação e no DEC só do CTO".

A pré-condição do DEC do seed pendente (`expect(pacote).toMatchObject(...)`) foi para o auxiliar `decDoSeedPendente` e
agora vale nos três testes. O seletor do botão foi para `botaoAprovar`. O segundo teste abre o DEC já em 1280 × 720,
onde as opções e a revisão ficam sempre abertas, o mesmo estado do teste único depois de a janela voltar de 390 px.
Antes, o axe da carga corria antes do primeiro clique. Sem ele, um clique antes da hidratação viraria envio nativo do
formulário. Por isso o teste espera as props do React no `<form>`, a mesma espera da `reflow-qa`. Ela não é asserção e
não decide nada. O header da spec segue certo: a T11 continua gravando só o ESP, o RSK e o DEC da conta "cto".

**`e2e/reflow-qa.spec.ts`: de 1 teste para 5.** A divisão por tela (T06, T07, T08) não bastou. A T06 sozinha levou
21,2 s. Medi a T06 por passo, com `test.step` temporários e o relatório JSON, e tirei os passos depois:

| Passo | Tempo |
|---|---|
| 50 cliques em "Adicionar anexo" (`LIMITE_ANEXOS = 50`) | 9,1 s |
| axe em 320 px (form com 50 fieldsets) | 5,6 s |
| axe em 1280 px | 3,8 s |
| `errosAVista` | 2,1 s |
| abrir a aba | 1,4 s |
| total do teste | 24,1 s |

Todo teste dividido precisa refazer os 50 anexos, porque a asserção vale no estado "anexos no limite e erros". Assim,
só dividir não chegava a 15 s. O que mudou:
- o estado da T06 fica num auxiliar, `t06NoLimiteComErros`. Ele traz as mesmas três asserções do limite e o
  `errosAVista`, com as dele. A T06 virou três testes no mesmo estado: o de layout ("sem rolagem lateral, tudo em
  cartões e foco fora da barra"), o do "axe em 320 px" e o do "axe em 1280 px". Os rótulos do axe são os mesmos de
  antes (`T06 com anexos no limite e erros em 320 px` e `… em 1280 px`). O de 1280 px repete a sequência do teste único:
  topo em 320 px, depois a troca de largura;
- os anexos entram por `press('Enter')` no botão, a ativação de teclado de um botão, e não por `click()`. Só a
  montagem mudou, sem nenhuma asserção. A guarda `isEnabled()` e as asserções de limite seguem iguais. O clique em
  "Adicionar anexo" continua coberto em `nova-demanda.spec.ts:89`;
- T07 e T08 viraram um teste cada, com o mesmo corpo de antes;
- cada um dos 5 testes faz o próprio login (`entrarELerDemanda`) e termina conferindo pela API que a demanda não mudou.
  Era uma asserção só no teste único; agora são cinco.

Nenhuma demanda nem versão a mais foi criada: a `reflow-qa` continua só lendo a demanda do seed (C-36). A T11 da
`axe-todas` grava o mesmo que antes.

### 3. Instabilidade achada e corrigida na suíte de unidade

- **Sintoma:** `src/app/api/saude/route-qa.test.ts:73` › "200 só com { status: ok }…" deu `expected 503 to be 200` na
  suíte inteira (5216 de 5217). Sozinho, o arquivo passa. Esse teste nasceu na 06-T11-testes e não pertence à T16.
- **Causa:** a rota tem 150 ms de tempo-limite (`TEMPO_LIMITE_MS`). O teste chamava o `GET` com o pool frio. A primeira
  conexão, com TCP e autenticação SCRAM, caía dentro dos 150 ms. Com cerca de 232 arquivos em paralelo, ela passava do
  limite e a rota respondia 503. O `route.test.ts:53`, do mesmo endpoint, já abre a conexão antes ("conexão do pool já
  aberta, como num app de pé"); o `route-qa` não abria. É muito provavelmente uma das "2 falhas sob carga" que a minha
  volta anterior não conseguiu identificar.
- **Correção:** nos dois testes de 200 do `route-qa`, `await deps.pool.query('select 1')` antes do `GET`. Nenhuma
  asserção mudou. O `deps.pool` é o mesmo `banco.poolApp` do `deps.db` (`test/deps.ts`).
- **Depois:** `src/app/api/saude` deu 10 de 10, e a suíte inteira deu **5217 de 5217**.

### 4. Resultado depois da divisão

| Rodada (sozinha) | Resultado | Duração | Maior teste |
|---|---|---|---|
| e2e 1, antes da divisão | 240 de 240 | 14,3 min | 28,1 s (T03 da `axe-todas`) |
| e2e 2, com a divisão | **248 de 248** | 16,8 min | 15,8 s (`decisao-celular-qa.spec.ts:121`) |
| e2e 3, com a divisão | **248 de 248** | 14,4 min | 14,4 s (T06 "axe em 320 px" da `reflow-qa`) |

Os 8 testes a mais (248 − 240) são as divisões: +2 na T03, +2 na T11 e +4 na `reflow-qa`.

Os testes divididos, nas rodadas 2 e 3:

| Teste | Rodada 2 | Rodada 3 |
|---|---|---|
| T03 com dados e filtrada | 10,2 s | 7,3 s |
| T03 vazia com filtro e com filtro inválido | 9,8 s | 7,7 s |
| T03 em 390 px | 9,4 s | 6,8 s |
| T11 pendente e recolhível | 7,4 s | 10,2 s |
| T11 com erro e diálogo | 6,7 s | 6,0 s |
| T11 na conta administradora | 8,4 s | 7,5 s |
| reflow-qa T06 layout | 7,0 s | 6,0 s |
| reflow-qa T06 axe em 320 px | 9,4 s | 14,4 s |
| reflow-qa T06 axe em 1280 px | 14,4 s | 8,4 s |
| reflow-qa T07 | 5,2 s | 4,0 s |
| reflow-qa T08 | 5,1 s | 4,6 s |

**Leitura.** Com o mesmo código, o tempo de um teste chega a dobrar de uma rodada para outra. O `parecer-risco.spec.ts:57`
deu 5,8 s, 6,2 s e 12,2 s. Na rodada 2, dois testes que esta etapa não tocou passaram de 15 s:
- `decisao-celular-qa.spec.ts:121`: 15,8 s, contra 7,9 s na rodada 1 e 13,2 s na rodada 3;
- `decisao.spec.ts:148`: 15,6 s, contra 9,3 s na rodada 1 e 10,2 s na rodada 3.

Não dividi esses dois. O `decisao.spec.ts:148` também tem a estrutura vigiada pelo `test/estatico/decisao-e2e.test.ts`.
O teste mais longo, com a máquina carregada, foi de 15,8 s, quase metade do limite de 30 s. Antes desta etapa eram 28,1 s
com a máquina sem outra suíte. Ver Pendências.

### Critérios da T16 e o teste que cobre cada um

| Critério (plano, T16) | Teste | Resultado |
|---|---|---|
| RNF-13: zero violação do axe em T01 a T12, nos estados da `axe-todas`, em 1280 × 720 e 390 × 844 | `e2e/axe-todas.spec.ts`: "T01 Entrar…" a "T12 Agentes e teto…", com a T03 e a T11 em três testes cada (acima), cada estado por `semViolacoesNasDuasLarguras` | passa |
| RNF-13: gaveta aberta | `e2e/axe-todas.spec.ts` › "T03 Fila em 390 px: com \"Mais filtros\" aberto e com a gaveta do menu aberta"; `e2e/casca.spec.ts` › "CA-04.5: axe com a gaveta aberta" | passa |
| RNF-13: T11 com o recolhível aberto | `e2e/axe-todas.spec.ts` › "T11 Decisão: pendente com rascunhos e com o recolhível aberto" | passa |
| RNF-03: alvo de 44 × 44 px em 390 px na T03, T05, T11 e gaveta | `e2e/alvo-de-toque.spec.ts`: "RNF-03: T03 Fila…", "RNF-03: T05 Detalhe…", "RNF-03: T11 Decisão…" e "RNF-03: gaveta aberta…" | **passa** nas três rodadas (a T11 era o defeito da devolução) |
| RNF-03: links soltos da T11 fora do estado do e2e (ESP e RSK, os três alertas) | `src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts` › describe "T16: links soltos da T11 com alvo de toque de 44 px abaixo de 768 px" (3 testes, do engenheiro) | passa |
| RNF-03: "Ver agentes e teto" | `src/components/componentes-qa.test.ts` › "AvisosDaMoldura: \"Ver agentes e teto\" com alvo de toque de link solto" (3 testes) | passa |
| RNF-05: sem rolagem lateral em 320 e 390 px | `e2e/reflow.spec.ts`, `e2e/reflow-qa.spec.ts` (os 5 testes acima), `e2e/reflow-t15-qa.spec.ts` | passa |
| Nenhuma classe antiga, nenhum apelido no `globals.css` (D-01, RF-01) | `test/estatico/classes-antigas.test.ts`, `test/estatico/painel-qa.test.ts`, `src/components/tokens-em-uso.test.ts` | passa |
| CV-20: nenhuma regra do axe desligada; `decisao-e2e.test.ts` verde; piso de asserções | `test/estatico/decisao-e2e.test.ts`, `test/estatico/piso-de-assercoes.test.ts` | passa |

### Testes alterados nesta etapa

- `e2e/axe-todas.spec.ts`: T03 e T11 divididas, de 2 testes para 6. Entraram os auxiliares `decDoSeedPendente` e
  `botaoAprovar`, e a espera de hidratação antes do primeiro clique da T11 com erro.
- `e2e/reflow-qa.spec.ts`: de 1 teste para 5, com os auxiliares `entrarELerDemanda` e `t06NoLimiteComErros`. Os anexos
  entram por `press('Enter')`.
- `src/app/api/saude/route-qa.test.ts`: a conexão do pool é aberta antes do `GET` nos dois testes de 200.

### Resultados finais

- `pnpm test`: **5217 de 5217** (232 arquivos, 194 s, rodada sozinha).
- `pnpm test:e2e`: **248 de 248** em duas rodadas seguidas com o código final (16,8 min e 14,4 min), cada uma sozinha.
- `pnpm lint` e `pnpm typecheck`: limpos depois da última mudança.
- `git status`: só os 3 arquivos de teste. Nenhum temporário no repositório. Os `test.step` da medição foram tirados
  antes da rodada final, e o `git diff` não os mostra.

## Decisões tomadas

- Divisão, não tempo-limite: a revisão vetou `retries`, `timeout` e `test.slow()`, e não usei nenhum. Também não foi
  preciso devolver ao tech-lead para mexer no limite.
- A T03 e a T11 da `axe-todas` ficaram em três testes cada, e não em dois, para dar folga no CI, que tem menos CPU que a
  VPS.
- Na T06 da `reflow-qa`, a divisão é por axe e não por estado. Separar "anexos no limite" de "com erros" mudaria o
  estado em que cada asserção vale (G3.2). Por isso os três testes montam o mesmo estado pelo mesmo auxiliar.
- `press('Enter')` no lugar de `click()` só na montagem dos 50 anexos: a medição mostrou que os cliques eram o maior
  custo. A ativação por teclado é um caminho real do botão, e o clique continua testado na `nova-demanda.spec`.
- Medi por passo com `test.step` temporário e o relatório JSON: sem a medida, a escolha do corte seria um palpite. O
  código da medição saiu antes das rodadas finais.
- Não dividi `decisao-celular-qa.spec.ts:121` nem `decisao.spec.ts:148`. Os dois só passaram de 15 s na rodada mais
  carregada (15,8 s e 15,6 s) e ficaram abaixo nas outras duas (7,9 s e 13,2 s; 9,3 s e 10,2 s). Dividir pela pior
  rodada pegaria qualquer teste de 8 s. Além disso, a estrutura do `decisao.spec.ts:148` é vigiada pelo
  `decisao-e2e.test.ts`.
- A correção do `route-qa.test.ts` entrou nesta etapa: teste instável se resolve na hora, o arquivo é de teste (lista
  Pode) e ele travava o critério "a suíte inteira passa".

## Pendências

- **Para a T17 (três verdes seguidos) e a `09-entrega` (CI):** com a máquina carregada, o teste mais longo da suíte
  ficou em 15,8 s. Antes desta etapa eram 28,1 s com a máquina sem outra suíte. Os mais perto de 15 s, para olhar
  primeiro se algum estourar:
  - `decisao-celular-qa.spec.ts:121`: 7,9 s, 15,8 s e 13,2 s;
  - `decisao.spec.ts:148`: 9,3 s, 15,6 s e 10,2 s;
  - as duas T06 de axe da `reflow-qa`: até 14,4 s;
  - `fila.spec.ts:128`: até 14,9 s.

  A regra segue a da revisão: dividir sem tirar asserção. No `decisao.spec.ts`, a divisão precisa manter o que o
  `decisao-e2e.test.ts` confere.
- **Para o tech-lead, só para registro:** a rota `/api/saude` tem 150 ms de tempo-limite. Uma conexão nova com o banco,
  com a máquina carregada, passa disso. Em produção, o pool já fica aberto pelo próprio healthcheck. Ainda assim, depois
  de uma ociosidade maior que o `idleTimeout` do pool, a primeira checagem pode dar 503. Não é da T16 e não mexi na rota.
- Seguem de antes, sem mudança:
  - o Minor 1 da 06-T16-tech-lead (volta), sobre `pagina.test.ts:833`, e o Minor 3 da revisão anterior (`h3` da T05),
    os dois para a T17;
  - os itens da 08 e da `10-documentacao`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — limpo no início
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -5` — topo 95fca9e (06-T16-revisao tech-lead), 0f47b8c (construção)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --reporter=list` — 240 de 240, 14,3 min; acima de 15 s: T03 da `axe-todas` (28,1 s), `reflow-qa:99` (27,6 s), T11 da `axe-todas` (15,4 s)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD -G "axe-todas" -- src test e2e scripts` — só citações em comentário e no seed; nenhum teste estático lê o corpo da spec
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD -G "reflow-qa" -- src test e2e scripts` — vazio
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/axe-todas.spec.ts e2e/reflow-qa.spec.ts --reporter=list` — 19 de 19; a T06 sozinha ainda com 21,2 s
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD -G "LIMITE_ANEXOS =" -- src` — `src/components/dados-da-demanda.ts` (50)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/reflow-qa.spec.ts --reporter=json --grep T06` — medição por passo, com `test.step` temporários: 9,1 s nos cliques, 5,6 s e 3,8 s no axe; 24,1 s no total
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/reflow-qa.spec.ts --reporter=list` — 5 de 5, o maior com 12,5 s
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --reporter=list` — 248 de 248, 16,8 min, o maior com 15,8 s (`decisao-celular-qa:121`)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent --reporter=dot` — 5216 de 5217; falha em `route-qa.test.ts:73` (503 em vez de 200)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/saude --reporter=dot` — 10 de 10, depois da correção
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent --reporter=dot` — 5217 de 5217, 194 s
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --reporter=list` — 248 de 248, 14,4 min, o maior com 14,4 s
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — `e2e/axe-todas.spec.ts`, `e2e/reflow-qa.spec.ts`, `src/app/api/saude/route-qa.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff` — todo `expect` removido reaparece igual num teste dividido ou num auxiliar; nenhum `skip`, `only`, `todo`, `retries`, `timeout` nem `slow`; nenhum `test.step` da medição

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
