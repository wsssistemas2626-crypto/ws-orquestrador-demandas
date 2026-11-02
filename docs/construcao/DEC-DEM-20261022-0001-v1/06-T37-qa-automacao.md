---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T37-testes
agente: qa-automacao
leu: [contrato-passagem.md, pedido.json, padrao-tecnico.md, tarefas.json, 2026-10-25-ws-orquestrador-demandas-plano.md (cabeçalho e G1 a G4, linhas 1 a 120; T37, linhas 3518 a 3576), 01-analista-requisitos.md (RF-01, RF-20 a RF-26 e a tabela de RNF), 04-seguranca-aplicacao.md (2.1 a 2.4, C-01 a C-40), 05-tech-lead.md (cabeçalho), 06-T37-engenheiro-frontend.md, 06-T37-tech-lead.md, 06-T36-qa-automacao.md (formato), git show --stat dos commits 672659d, 89f1afb e 27e898f, git diff 9472f19..27e898f (stat e os três arquivos alterados), src/lib/qr.ts, src/lib/qr.test.ts, src/lib/auth-cliente.ts, src/lib/auth-cliente.test.ts, src/app/entrar/page.tsx, src/app/entrar/FormularioEntrar.tsx, src/app/entrar/entrar.test.ts, src/app/configurar-2fa/page.tsx, src/app/configurar-2fa/AssistenteDoisFatores.tsx, src/app/configurar-2fa/configurar-2fa.test.ts, src/app/(painel)/demandas/page.tsx, src/components/CabecalhoPainel.tsx, src/modules/acesso/destino-seguro.ts, src/modules/acesso/exigir-pessoa.ts, src/modules/acesso/auth.ts, src/app/paginas-erro-qa.test.ts, e2e/entrar.spec.ts, e2e/configurar-2fa.spec.ts, e2e/apoio.ts, playwright.config.ts, vitest.config.ts, tsconfig.json, eslint.config.mjs, scripts/seed-ficticio.ts, test/sessao.ts, test/estatico/exigir-pessoa.test.ts, test/estatico/varreduras-qa.test.ts, saída do pnpm test gravada pela ferramenta nesta etapa (tool-results/bn184du93.txt, só o fim)]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T37: T01 Entrar e T02 Configurar verificação em duas etapas. O código da tarefa é o intervalo `9472f19..27e898f`: o
código e os testes entraram no `672659d`; o `89f1afb` e o `27e898f` só mexem em `passagens.jsonl` e na entrega do
engenheiro.

Nenhum defeito encontrado. Todo critério da tarefa já tinha teste do engenheiro. Esta etapa fechou o Minor 2 da revisão
(leitura do QR que não depende do gerador) e cobriu bordas que só tinham suposição: o 429 na tela, o cookie de
dispositivo confiável, as outras formas de redirecionamento aberto, a guarda de `/configurar-2fa` e o aviso da fila.

### Critério da tarefa e teste que o cobre

Legenda: (E) do engenheiro e (Q) desta etapa.

| Critério | Teste |
|---|---|
| CA-01.1: senha e código válidos entram no painel | `e2e/entrar.spec.ts` › `CA-01.1: senha e código válidos entram na fila` (E) |
| CA-01.2: sem 2FA, a fila leva a `/configurar-2fa` e a API dá 403 | `e2e/configurar-2fa.spec.ts` › `C-04 c e CA-01.2: conta sem 2FA que abre /demandas vai a /configurar-2fa` (E) |
| CA-01.4: não existe cadastro (404) | `e2e/entrar.spec.ts` › `CA-01.4: /cadastro e /api/auth/sign-up/email não criam conta (404 na tela; recusa na API)` (E); `src/app/entrar/entrar.test.ts` › `sem cadastro nem "esqueci minha senha" (CA-01.4, C-03)` (E) |
| C-04 (c): conta sem 2FA só abre `/configurar-2fa`, sem a navegação | o mesmo e2e de CA-01.2 (E); `src/app/configurar-2fa/pagina-qa.test.ts` › `quando a guarda desvia (o redirect do Next lança), a página não devolve nada` e `com a sessão curta de conta sem 2FA, monta o assistente no passo 1, dentro de main` (Q) |
| C-05: verificação sempre com `trustDevice` falso; depois de sair, o código é pedido de novo | `e2e/entrar.spec.ts` › `C-05: depois de Sair, entrar de novo pede o código` (E); `e2e/autenticacao-qa.spec.ts` › `C-05 pelo cookie: o login pela tela não deixa cookie de dispositivo confiável; …` (Q) |
| C-40: depois do login, só caminho do painel; o resto vai a `/demandas` | `e2e/entrar.spec.ts` › `C-40: /entrar?callbackURL=https://atacante.test termina em /demandas` e `C-40: o caminho do painel que a pessoa tentava abrir é o destino depois do login` (E); `src/app/entrar/pagina-qa.test.ts` › `%s vai para /demandas` (12 formas: `//host`, `/\host`, `javascript:`, sem barra, `/configurar-2fa`, `/entrar`, `/api/…`, `..`, URL na consulta, fragmento, vazio), `callbackURL repetido na URL (vira lista)…`, `sem callbackURL, a fila` e `caminho do painel %s é mantido como veio` (5) (Q) |
| RF-26: telas de login e 2FA em pt-BR, com os textos da 03 | `src/lib/auth-cliente.test.ts` › `textos da 03 (T01 e T02)` e `mensagemDoErro: do erro do Better Auth ao texto da tela` (E); `entrar.test.ts` e `configurar-2fa.test.ts`, todos (E); os e2e de `entrar.spec.ts` e `configurar-2fa.spec.ts` (E); `src/lib/auth-cliente-qa.test.ts` › `nenhum texto de mensagemDoErro é a mensagem em inglês do Better Auth` (Q) |
| 03, T01: alerta da 2.8 com `motivo=sessao` | `entrar.test.ts` › `com o motivo da sessão: o alerta da 03, 2.8` (E); `e2e/entrar.spec.ts` › `C-05…` (E); `pagina-qa.test.ts` › `só o valor exato liga o alerta de sessão terminada` (Q) |
| 03, T01: passo 2 vencido volta ao passo 1 | `e2e/entrar.spec.ts` › `passo 2 vencido: …` (E); `auth-cliente-qa.test.ts` › `o cookie de dois fatores vencido só volta ao passo 1 no login…` e `o 429 vence o código do cookie vencido…` (Q) |
| 03, T01: 429 "Muitas tentativas…" (C-06 na tela) | `auth-cliente.test.ts` › `429 em qualquer etapa…` (E, só supõe o status); `e2e/autenticacao-qa.spec.ts` › `C-06 na tela: a 11ª tentativa de senha no minuto, do mesmo IP, mostra "Muitas tentativas…" no alerta` (Q) |
| 03, T01 e 2.8: 5xx e outros status viram o texto da 2.8, sem a mensagem do servidor (RNF-10) | `auth-cliente.test.ts` › `5xx, rede e erro sem status…` (E); `auth-cliente-qa.test.ts` › `403, 404, 409, 422 e 503: o texto da 2.8…` (Q) |
| 03, T01: modo recuperação | `e2e/entrar.spec.ts` › `modo recuperação: textos de 03 e código de recuperação inválido` (E); `e2e/configurar-2fa.spec.ts` › `fluxo completo…` (entrada com um código guardado) (E) |
| Plano: chave TOTP agrupada de 4 em 4, com "Copiar chave" | `e2e/configurar-2fa.spec.ts` › `fluxo completo…` (E); `auth-cliente.test.ts` › `chave TOTP em texto…` (E); `auth-cliente-qa.test.ts` › `segredo vazio no totpURI é "sem segredo"; a chave agrupada, sem os espaços, volta a ser a chave` (Q) |
| 03, T02: QR code do `totpURI`, sem o segredo sair da página | `src/lib/qr.test.ts`, todos (E); `src/lib/qr-norma.test.ts`, 50 testes (Q, ver abaixo); `e2e/autenticacao-qa.spec.ts` › `QR code do passo 2, lido de volta por um leitor independente: …` (Q) |
| 03, T02: passos 1, 2 e 3, "Marque que guardou…" e o aviso na fila | `e2e/configurar-2fa.spec.ts` › `passos 1 e 2 com erro…` e `fluxo completo…` (E); `e2e/autenticacao-qa.spec.ts` › `C-05 pelo cookie: … a fila só mostra o aviso da T02 com o valor fixo` (Q) |
| RNF-11: axe sem violação | `e2e/entrar.spec.ts` › `axe: vazio, erro e passo 2`, `erro de senha…`, `validação ao enviar…` e `modo recuperação…` (E); `e2e/configurar-2fa.spec.ts` › `passos 1 e 2 com erro…` (passos 1 e 2, com e sem erro) e `fluxo completo…` (passo 3, passo 3 com erro, fila com o aviso) (E) |

### Testes acrescentados

**`test/leitor-qr.ts` (ajudante, sem teste próprio).** Leitor de QR code nível M, modo byte, que não importa nada de
`src/lib/qr.ts`. As tabelas foram copiadas da norma ISO/IEC 18004: total de codewords, bits de sobra, blocos, capacidade,
formato, versão e posição dos alinhamentos. O mapa de função é desenhado por região, e a correção de erro é conferida
pelas síndromes, não pelo resto da divisão que o gerador usa. Também confere o terminador e o enchimento 0xEC/0x11.

**`src/lib/qr-norma.test.ts` (50):**
- as tabelas do leitor coerentes entre si: capacidade igual à conta de codewords; último alinhamento a 7 módulos da
  borda; módulos livres iguais à tabela 1; síndromes no bloco publicado "HELLO WORLD" 1-M, e recusa de um byte trocado;
- `qr.ts` contra a norma nas 40 versões:
  - `blocosDaVersao`;
  - `bitsDeVersao` (7 a 40) e `bitsDeFormato` do nível M (máscaras 0 a 7);
  - `mapaDeFuncao`, conferido módulo a módulo;
  - a correção de `restoReedSolomon` validada pelas síndromes, nos 8 tamanhos de correção do nível M;
- `gerarQr` lido pelo leitor independente, um teste por versão (40):
  - o texto do tamanho da capacidade cabe na versão e é lido de volta igual;
  - os padrões de função estão desenhados (localizadores, tempo, alinhamentos, módulo escuro);
  - as duas cópias da versão estão certas;
  - um byte a mais muda de versão, e acima da versão 40 o gerador recusa;
- os centros de alinhamento por versão;
- o `totpURI` fictício e texto com acento;
- o leitor recusa um símbolo com um módulo trocado.

Resultado: as 40 versões batem com a norma, inclusive fora das versões 1, 5 e 10 que o teste do engenheiro conferia.

**`src/lib/auth-cliente-qa.test.ts` (7):** o "tempo acabou" só nas etapas `codigo` e `recuperacao`; o 429 vence o
cookie vencido; 403, 404, 409, 422 e 503 viram o texto da 2.8 em todas as etapas; nenhum texto possível de
`mensagemDoErro` fica fora dos textos da 03 e da 2.8; código com tabulação ou quebra de linha, e dígito árabe-índico
recusado; segredo vazio no `totpURI`; importar o módulo fora do navegador não cria o cliente (C-27).

**`src/app/entrar/pagina-qa.test.ts` (20):** C-40 e `motivo` na página, com o formulário substituído por um
componente que só mostra as props recebidas.

**`src/app/configurar-2fa/pagina-qa.test.ts` (3):** a guarda `exigirSessaoParaConfigurar2fa` roda antes de montar o
assistente. O desvio dela interrompe a página. A página monta sem navegação nem "Sair". O teste confere também o título
da aba e `force-dynamic`. `/configurar-2fa` fica fora da varredura estática do `(painel)`, e por isso precisava deste
teste.

**`e2e/autenticacao-qa.spec.ts` (3):**
- `C-06 na tela`: 10 tentativas com 401 e a 11ª com 429, do mesmo IP fictício, com uma conta que não existe. A 11ª
  mostra o texto da 03 no alerta, o foco vai ao alerta, e o e-mail digitado continua no campo;
- `C-05 pelo cookie`:
  - depois do login pela tela, há um cookie de sessão e nenhum cookie com `trust` no nome;
  - a fila não mostra o aviso para `2FA-ATIVADO`, `2fa-ativado ` (com espaço), um sentinela com HTML e o valor vazio;
  - nada do endereço aparece em `main`, e com `2fa-ativado` o aviso aparece;
- `QR code do passo 2`:
  - o SVG da tela é convertido de volta em módulos e lido por `test/leitor-qr.ts`;
  - o `totpURI` lido tem o segredo igual ao da chave em texto, o emissor do sistema e o e-mail da conta;
  - o SVG não tem `image`, `use`, `foreignObject` nem `a`;
  - nenhum pedido da página vai a outro endereço nem leva o segredo na URL.

### Resultados

- `pnpm test`: **157 arquivos, 3068 de 3068** (eram 153 e 2988; +4 arquivos e +80 testes).
- `pnpm test:e2e`: **22 de 22**, duas execuções seguidas, ambas verdes (eram 19; +3).
- `pnpm lint`: limpo (0 erros, 0 avisos).
- `pnpm typecheck`: limpo.

### Relatório de execução

| Criticidade | Falhas |
|---|---|
| Crítica | 0 |
| Alta | 0 |
| Média | 0 |
| Baixa | 0 |

Nenhum teste instável: os 22 e2e passaram nas duas execuções, e os 80 unitários novos não usam relógio, rede nem banco.

## Decisões tomadas

- **Testes novos em arquivos próprios (`*-qa.test.ts`, `autenticacao-qa.spec.ts`).** Nenhum teste do engenheiro foi
  editado, e o `git diff` dos testes existentes fica vazio.
- **Leitor de QR em `test/`, sem importar o gerador.** É o que o Minor 2 pedia: um erro de tabela ou de posição no
  gerador já não sai igual na leitura. O mesmo leitor serve ao unitário (40 versões) e ao e2e (o QR da tela).
- **As 40 versões, e não só as 7 a 10 do `totpURI`.** O custo é de cerca de 7 s, e o teste não muda se o emissor ou o
  e-mail crescerem o `totpURI`.
- **E2e só onde o unitário não alcança.** O status 429 que o cliente do Better Auth entrega, o nome dos cookies e o QR
  como desenhado no DOM só existem com o servidor e o navegador.
- **O 429 com uma conta que não existe.** Nenhuma conta do seed é tocada, e o IP fictício do teste é só dele
  (`workers: 1`, `ipFicticio`).
- **A conta `sem2fa` no teste do QR só passa pelo passo 1.** Ela nunca verifica código, continua sem 2FA para C-04 (c)
  e não soma falha de verificação. O `enable` repetido funciona nas duas ordens: o `configurar-2fa.spec.ts`, que roda
  depois, chama `enable` de novo e passou nas duas execuções.
- **Busca do sentinela em `main`, e não em `body`.** O `body` também tem os scripts do Next com o endereço, e ali o
  sentinela apareceria sem que a tela o mostrasse.
- **Relógio nos e2e:** o código TOTP vem de `relogioDoSistema`, como em `e2e/apoio.ts`. O servidor do e2e confere o
  código pela hora do processo e não aceita relógio injetado. Os testes passam a qualquer hora. As 11 tentativas do
  teste de 429 levam de 5 s a 10 s, dentro da janela de 60 s. Nenhum teste espera o tempo passar.

## Pendências

- **07-qa-funcional:** a leitura do QR com um aplicativo autenticador de verdade continua sendo a condição da decisão
  do tech-lead. Os testes desta etapa conferem o símbolo contra a norma e com um leitor independente, mas não substituem
  um leitor comercial.
- **T38 (engenheiro-frontend):** o teste `C-05 pelo cookie…` de `e2e/autenticacao-qa.spec.ts` exige que a fila mostre
  "Verificação em duas etapas ativada." só com `aviso=2fa-ativado` e que nada de `aviso` vá para a tela. A T38 reescreve
  a página e precisa manter esse comportamento (desvio 2 da T37).
- Seguem valendo as pendências da 06-T37-revisao: os Minor 1, 3, 4, 5 e 6, e os textos para o `ux-ui-design`. Esta
  etapa confirmou o Minor 6 só pela leitura do código e não acrescentou teste para ele: ainda falta texto da 03.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -8` — 71be578 (06-T37-revisao) no topo; 27e898f, 89f1afb, 672659d e 9472f19 abaixo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 672659d` — 17 arquivos, o código e os testes da T37
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 89f1afb` — só `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 27e898f` — a entrega do engenheiro e `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/modules/acesso/auth.ts` — limite de login, cookies e ganchos de C-05 e C-06
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 9472f19..27e898f -- "src/app/(painel)/demandas/page.tsx" src/components/CabecalhoPainel.tsx e2e/apoio.ts` — os 3 arquivos alterados; em `apoio.ts`, só um `export` e uma função nova, sem asserção afrouxada
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:scripts/seed-ficticio.ts` — contas `sem2fa` e `configurar2fa` sem linha em `two_factor`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib/qr-norma.test.ts` — 50 de 50
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib/auth-cliente-qa.test.ts src/app/entrar/pagina-qa.test.ts src/app/configurar-2fa/pagina-qa.test.ts` — 30 de 30
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — 22 de 22
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 3068 de 3068, 157 arquivos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — 22 de 22 (segunda execução, para conferir estabilidade)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — 6 arquivos novos, todos desta etapa, e nenhum alterado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — vazio: nenhum arquivo rastreado mudou
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 9472f19..27e898f` — 17 arquivos; dos testes que já existiam, só `e2e/apoio.ts` mudou

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real (unitários sem relógio; nos e2e, o TOTP segue a hora do próprio servidor, como em `apoio.ts`, sem hora fixa nem espera; ver Decisões)
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
