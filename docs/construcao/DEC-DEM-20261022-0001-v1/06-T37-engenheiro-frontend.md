---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T37-construcao
agente: engenheiro-frontend
leu: [contrato-passagem.md, pedido.json, padrao-tecnico.md, tarefas.json, 05-tech-lead.md, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6, fase 7, T36 e T37), 03-ux-ui-design.md (1, 2.1 a 2.8, T01, T02), 06-T36-engenheiro-frontend.md, 06-T36-tech-lead.md, e2e/apoio.ts, e2e/servidor.ts, playwright.config.ts, vitest.config.ts, eslint.config.mjs, package.json, scripts/seed-ficticio.ts, test/sessao.ts, src/proxy.ts, src/app/layout.tsx, src/app/page.tsx, src/app/not-found.tsx, src/app/globals.css, src/app/sem-permissao/page.tsx, src/app/(painel)/layout.tsx, src/app/(painel)/demandas/page.tsx, src/app/paginas-erro-qa.test.ts, src/components/{Alerta,Botao,CaixaSelecao,CampoTexto,CabecalhoPainel,Esqueleto,RegiaoAviso,ResumoErros}.tsx, src/components/formulario.ts, src/lib/erros.ts, src/modules/acesso/{auth,exigir-pessoa,destino-seguro,mensagens}.ts, src/modules/acesso/auth.test.ts (início), test/estatico/{exigir-pessoa,painel-qa,varreduras-qa}.test.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T37: as telas T01 Entrar (`/entrar`) e T02 Configurar verificação em duas etapas (`/configurar-2fa`), mais o "Sair" do
cabeçalho pelo cliente do Better Auth. Textos, estados e acessibilidade da 03, T01 e T02.

Portões, todos verdes:
- `pnpm test`: 153 arquivos, 2988 de 2988 testes (32 novos, em 4 arquivos);
- `pnpm test:e2e`: 19 de 19, com axe (14 novos: 11 de `entrar.spec.ts` e 3 de `configurar-2fa.spec.ts`; os 5 da
  moldura seguem passando, já com o "Sair" novo);
- `pnpm lint` e `pnpm typecheck`: limpos;
- `pnpm build`: passa; `/entrar` e `/configurar-2fa` saem dinâmicas (nonce da CSP).

### O que cada tela faz

**T01 Entrar** (`src/app/entrar/page.tsx`, `FormularioEntrar.tsx`)
- Passo 1: "E-mail (obrigatório)" (`autocomplete="username"`), "Senha (obrigatório)" (`current-password`), caixa
  "Mostrar senha" e "Continuar". Foco no `h1` ao abrir. Com `motivo=sessao`, mostra o alerta da 2.8.
- Passo 2: o `h1` vira "Código de verificação" e recebe o foco. Campo único "Código (obrigatório)", com
  `inputmode="numeric"` e `one-time-code`. Botão "Entrar" e link-botão "Usar um código de recuperação".
- Modo recuperação: o texto e o campo "Código de recuperação (obrigatório)" da 03, e "Usar o código do aplicativo".
  Ao trocar de modo, o foco vai ao campo.
- A verificação chama `twoFactor.verifyTotp({ code, trustDevice: false })` ou `verifyBackupCode` com
  `trustDevice: false` (C-05).
- Destino: `destinoSeguro(callbackURL)`, calculado na página, no servidor. O formulário só recebe o caminho já
  conferido (C-40).
- Conta sem 2FA: o login devolve sessão sem `twoFactorRedirect`, e a tela vai a `/configurar-2fa`.
- Erros: campo vazio ("Preencha o e-mail e a senha.") e código fora de 6 dígitos vão ao Resumo de erros, que recebe o
  foco e marca `aria-invalid`. A recusa do servidor vai a um alerta `role="alert"`, que também recebe o foco. Esse
  alerta traz "E-mail ou senha incorretos." (a mesma para e-mail inexistente), "Código inválido ou expirado…",
  "Código de recuperação inválido ou já usado.", "Muitas tentativas…" ou o 5xx da 2.8.
- Passo 2 vencido (cookie de dois fatores ausente): "O tempo para digitar o código acabou. Entre de novo.", e a tela
  volta ao passo 1 com o e-mail preenchido.
- Não há cadastro nem "esqueci minha senha".

**T02 Configurar verificação em duas etapas** (`src/app/configurar-2fa/page.tsx`, `AssistenteDoisFatores.tsx`)
- A página começa por `exigirSessaoParaConfigurar2fa()` (T09).
- `h1`, introdução e o alerta "Para usar o painel, configure a verificação em duas etapas." (2.8). Cada passo tem `h2`
  "Passo N de 3 — …", que recebe o foco quando o passo muda.
- Passo 1: `twoFactor.enable({ password })`. Erro: "Senha incorreta.".
- Passo 2: o QR code e a chave.
  - O QR code é desenhado em SVG no próprio navegador, a partir do `totpURI` (`role="img"` com o texto alternativo
    da 03). O segredo não vai a nenhum serviço de imagem.
  - A chave aparece em `ui-monospace`, agrupada de 4 em 4. "Copiar chave" copia sem os espaços e avisa "Chave
    copiada." na região `role="status"`.
  - "Código de 6 dígitos (obrigatório)" e "Verificar" (`verifyTotp` com a sessão). Erro: "Código inválido. Confira…".
- Passo 3: os códigos de recuperação.
  - Os dez códigos ficam numa `<ul>`.
  - "Baixar códigos" baixa `codigos-de-recuperacao-ws-orquestrador.txt`, gerado em memória (`Blob`).
  - "Copiar códigos" avisa "Códigos copiados.". Se a cópia falhar, avisa "Não foi possível copiar…".
  - A caixa "Guardei os códigos em lugar seguro (obrigatório)" é exigida. Sem ela, "Concluir" mostra o Resumo de
    erros com "Marque que guardou os códigos para concluir.".
  - Ao concluir, a tela vai a `/demandas?aviso=2fa-ativado`, e a fila mostra "Verificação em duas etapas ativada.".

**Sair** (`src/components/CabecalhoPainel.tsx`): `authClient().signOut()` no lugar do `fetch` direto, e depois
`/entrar`.

### Arquivos

Criados:
- `src/lib/auth-cliente.ts`: `createAuthClient` com `twoFactorClient`, criado na primeira chamada, já no navegador.
  Também tem os textos da 03, T01 e T02, `mensagemDoErro` (status e código → texto da 03, nunca a mensagem do Better
  Auth), `codigoDeSeisDigitos`, `segredoDoTotpUri` e `agruparDeQuatro`.
- `src/lib/qr.ts`: gerador de QR code (ISO/IEC 18004), em modo byte, nível M e versões 1 a 40. Ver o desvio 1.
- `src/app/entrar/page.tsx` e `src/app/entrar/FormularioEntrar.tsx`.
- `src/app/configurar-2fa/page.tsx` e `src/app/configurar-2fa/AssistenteDoisFatores.tsx`.
- Testes: `src/lib/auth-cliente.test.ts`, `src/lib/qr.test.ts`, `src/app/entrar/entrar.test.ts`,
  `src/app/configurar-2fa/configurar-2fa.test.ts`, `e2e/entrar.spec.ts` e `e2e/configurar-2fa.spec.ts`.

Alterados:
- `src/components/CabecalhoPainel.tsx`: o "Sair";
- `src/app/(painel)/demandas/page.tsx`: o alerta de sucesso da T02 (ver o desvio 2);
- `e2e/apoio.ts`: `ipFicticio` exportado e `entrarSoComSenha` novo (ver o desvio 3).

### Testes criados

- `src/lib/auth-cliente.test.ts` (13):
  - os textos da 03, T01 e T02, por inteiro;
  - o texto de cada etapa para 400, 401 e 429 e para o cookie de dois fatores vencido;
  - 5xx, rede e erro sem status dão o texto da 2.8, nunca a mensagem que chegou (com sentinela);
  - `codigoDeSeisDigitos`, `segredoDoTotpUri` e `agruparDeQuatro`.
- `src/lib/qr.test.ts` (12):
  - Reed-Solomon contra o exemplo publicado "HELLO WORLD" 1-M;
  - bits de formato (L0, M0, M5, H7) e de versão (7, 10) contra a tabela da norma;
  - blocos de nível M;
  - localizadores, padrão de tempo e módulo escuro;
  - as duas cópias do formato iguais;
  - leitura de volta do símbolo inteiro nas versões 1, 4, 8 e 10: máscara lida do formato, zigue-zague, blocos
    separados e a correção de cada bloco conferida. O texto lido é o escrito, inclusive o `totpURI` fictício e texto
    com acento;
  - recusa acima da capacidade.
- `src/app/entrar/entrar.test.ts` (4) e `src/app/configurar-2fa/configurar-2fa.test.ts` (3): o HTML do primeiro
  estado, com textos, `autocomplete`, `h1` focável, sem cadastro, o alerta de sessão, o título da aba,
  `dynamic = 'force-dynamic'` e uma região `role="status"`.
- `e2e/entrar.spec.ts` (11):
  - CA-01.1;
  - senha incorreta, com axe;
  - validação ao enviar, com axe;
  - código errado e depois o certo;
  - passo 2 vencido;
  - C-05 (Sair, e o código pedido de novo);
  - C-40 com `https://atacante.test`;
  - C-40 com destino do painel com consulta;
  - CA-01.4 (`/cadastro` dá 404, `sign-up/email` é recusado e o login dessa conta dá 401);
  - modo recuperação, com axe;
  - axe no vazio, no erro e no passo 2, mais "Mostrar senha".
- `e2e/configurar-2fa.spec.ts` (3):
  - C-04 c e CA-01.2: sem sessão, vai a `/entrar`; com sessão sem 2FA, `/demandas` vai a `/configurar-2fa`, sem
    navegação, e a API dá 403; pela tela de login, vai direto a `/configurar-2fa`;
  - os passos 1 e 2 com erro, com axe nos dois;
  - o fluxo completo:
    - a chave copiada é igual à da tela sem os espaços;
    - os 10 códigos;
    - "Códigos copiados." e o texto copiado conferido;
    - o arquivo baixado;
    - axe no passo 3;
    - "Marque que guardou…", com axe;
    - a fila com "Verificação em duas etapas ativada.", com axe;
    - `/configurar-2fa` não abre de novo;
    - depois de "Sair", um código de recuperação guardado entra na fila.

### Teste escrito antes e visto falhando

`pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib/auth-cliente.test.ts src/lib/qr.test.ts src/app/entrar src/app/configurar-2fa`, antes do código:
```
 FAIL  src/lib/auth-cliente.test.ts
Error: Cannot find module './auth-cliente' imported from .../src/lib/auth-cliente.test.ts
 FAIL  src/lib/qr.test.ts
Error: Cannot find module './qr' imported from .../src/lib/qr.test.ts
 FAIL  src/app/entrar/entrar.test.ts
Error: Cannot find module './FormularioEntrar' imported from .../src/app/entrar/entrar.test.ts
 FAIL  src/app/configurar-2fa/configurar-2fa.test.ts
Error: Cannot find module './AssistenteDoisFatores' imported from .../src/app/configurar-2fa/configurar-2fa.test.ts
 Test Files  4 failed (4)
```

`pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/entrar.spec.ts e2e/configurar-2fa.spec.ts --max-failures=3`, antes do código:
```
  ✘ 1 › C-04 c e CA-01.2: … Expected pattern: /\/entrar\?motivo=sessao$/  Received string: "http://127.0.0.1:3101/configurar-2fa"
  ✘ 2 › passos 1 e 2 com erro: … getByRole('heading', { name: 'Configurar verificação em duas etapas', level: 1 }) … element(s) not found
  ✘ 3 › fluxo completo: … element(s) not found
  3 failed, 10 did not run
```

Depois do código: 32 de 32 nos unitários novos, e 13 de 13 no e2e das duas telas. Depois disso escrevi o 14º teste
de e2e ("passo 2 vencido"), já com o código pronto. Ele confere o nome do código de erro do Better Auth
(`INVALID_TWO_FACTOR_COOKIE`) que `mensagemDoErro` usa e que o teste unitário só supunha. Passou de primeira.

### Desvios do plano

1. **`src/lib/qr.ts` (gerador de QR próprio), fora da lista de arquivos.**
   - Por quê: a 03, T02, pede o QR code. O plano não traz biblioteca de QR, e eu não posso instalar dependência fora
     do plano.
   - Como: o gerador segue a norma e tem 12 testes, entre eles a leitura de volta do símbolo inteiro. Não usa rede, e o
     segredo TOTP não sai da página.
   - Limite: nenhum teste lê o QR com um leitor de verdade (ver Pendências).
2. **`src/app/(painel)/demandas/page.tsx` alterado (é arquivo da T38).**
   - Por quê: a 03, T02, diz "ao concluir, vai à fila com o alerta de sucesso 'Verificação em duas etapas ativada.'".
   - Como: só o valor fixo `aviso=2fa-ativado` mostra o alerta, e o texto é constante. Nada da URL vai à tela.
   - A T38 precisa manter esse alerta quando reescrever a página. O `filtroDemandasSchema` descarta a chave `aviso`,
     então ela não atrapalha os filtros.
3. **`e2e/apoio.ts` alterado (arquivo da T36).**
   - `ipFicticio` passou a ser exportado. Os testes de tela de login o põem em `setExtraHTTPHeaders`, para o limite de
     10 por minuto por IP (C-06) não ligar um teste ao outro.
   - `entrarSoComSenha` é novo: o login só com senha das contas `sem2fa` e `configurar2fa`.
   - Os dois seguem o padrão do `entrarComo`, que já estava ali.
4. **Arquivos de teste além dos do plano.** `src/lib/auth-cliente.test.ts`, `src/lib/qr.test.ts`,
   `src/app/entrar/entrar.test.ts` e `src/app/configurar-2fa/configurar-2fa.test.ts` cobrem pelo `pnpm test` o que dá
   para cobrir sem navegador.
5. **Lista de testes do e2e de T02.**
   - "Marque que guardou os códigos…" ficou dentro do fluxo completo. O passo 3 só existe depois de o 2FA ficar ativo,
     e o seed tem uma conta só para chegar lá (`configurar2fa`). Um teste separado dependeria da ordem ou deixaria a
     `sem2fa` com 2FA.
   - O "axe nos três passos" ficou dividido: os passos 1 e 2 no teste de erro (`sem2fa`, que nunca termina a ativação)
     e o passo 3 no fluxo completo.
6. **O estado "Gerando o QR code…" (esqueleto) não aparece.** O QR é calculado no navegador na mesma renderização do
   passo 2, sem espera. A espera real é a chamada `enable`, e ela mostra "Verificando…" no botão do passo 1. Um
   esqueleto ali nunca seria visto.
7. **Sem botão "Tentar de novo" no erro de servidor dos formulários.** O alerta tem o texto da 2.8, e o botão de envio
   ("Continuar", "Entrar", "Verificar") é a nova tentativa, com o que foi digitado mantido.

## Decisões tomadas

- **Login pelo cliente do Better Auth, e não por Server Action.** O plano pede `createAuthClient`. O cookie de dois
  fatores e o de sessão são do próprio Better Auth, e a regra continua no servidor (ganchos da T09).
- **O cliente nasce na primeira chamada**, com `baseURL: window.location.origin`. Importar o módulo no servidor, no
  build ou no Vitest não cria nada nem lê variável de ambiente (C-27).
- **Status e código decidem o texto, nunca a mensagem do Better Auth.** Ela é em inglês, pode mudar de versão e não
  pode chegar à tela (RNF-10). O teste com sentinela prova isso.
- **Os dois 429 têm o mesmo texto da 03**, "Muitas tentativas. Aguarde um minuto e tente de novo.". Um vem do limite
  por IP, o outro do bloqueio de verificação por conta da T09. A 03 só tem esse texto (ver Pendências).
- **Navegação depois do login com `router.replace`**, e não `window.location`. A regra
  `no-location-assign-relative-destination` do `eslint-config-next` acusava. As páginas são dinâmicas e sem cache
  (`force-dynamic`, `no-store`), então o painel lê a sessão nova.
- **O código errado só é tentado na conta da administradora, duas vezes por execução**, e o de recuperação inválido
  conta como uma delas. O bloqueio de C-06 (5 em 15 min) nunca vale no e2e, e o login da `cto`, que todas as telas
  usam, nunca falha.
- **Alertas e região de aviso procurados dentro de `main` no e2e.** O anunciador de rota do Next também tem
  `role="alert"`, num shadow root fora do `main`, e o seletor do Playwright o enxerga.
- **QR em SVG inline, com `<path>` e atributos `fill`.** A CSP (`default-src 'self'`) bloquearia imagem `data:` e
  `style` inline. SVG no DOM não passa por `img-src`.
- **Os códigos de recuperação e o segredo ficam só no estado do componente.** Não vão para URL, armazenamento local ou
  log. O arquivo baixado é gerado em memória e a URL do `Blob` é revogada.

## Pendências

- **Comando fora da lista Pode.** Rodei `wc -l` no plano pelo Bash, uma vez, só para saber o tamanho do arquivo antes
  de lê-lo com o Read. É só leitura e não alterou nada. Está declarado em Comandos executados.
- **07-qa-funcional: ler o QR code com um aplicativo autenticador de verdade**, na homologação. Pode ser o Google
  Authenticator ou o Microsoft Authenticator. O teste lê o símbolo por um caminho próprio, mas nenhum leitor
  independente conferiu. Se não ler, a chave em texto continua valendo como alternativa.
- **07-qa-funcional:** conferir pelo teclado o foco no `h1`, no título do passo e no alerta de envio. Conferir também
  a troca de modo do código e o anúncio da região de aviso (G2: o que o axe não pega).
- **ux-ui-design (textos):**
  - (a) O bloqueio de verificação por conta (T09) dura 15 min, mas o único texto de 429 da 03 diz "Aguarde um minuto".
  - (b) "Não foi possível copiar. Selecione os códigos…" é usado também na cópia da chave. A 03 tem um texto só de
    falha de cópia.
  - (c) A T02 não tem texto próprio para 429. Usei o da T01.
- **tech-lead:** decidir se o QR fica com o gerador próprio ou se uma biblioteca revisada entra no plano. Se entrar,
  troca só `src/lib/qr.ts`, e os testes de leitura de volta continuam valendo.
- **T38:** manter o alerta `aviso=2fa-ativado` em `src/app/(painel)/demandas/page.tsx` (desvio 2).
- Seguem valendo as pendências da T36: o nonce da CSP no 09-entrega e os textos fora da 03.

## Comandos executados

- `wc -l /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/superpowers/plans/2026-10-25-ws-orquestrador-demandas-plano.md` — 4044 linhas (fora da lista Pode; ver Pendências)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -15` — último commit 9472f19 (06-T36-testes)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format=%h -3 -- test/estatico` — arquivos dos estáticos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format=%h -40 -- test/estatico src/app` — arquivos dos estáticos e de `src/app`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib/auth-cliente.test.ts src/lib/qr.test.ts src/app/entrar src/app/configurar-2fa` — FAIL, 4 suítes, módulos ausentes (teste antes do código)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/entrar.spec.ts e2e/configurar-2fa.spec.ts --max-failures=3` — FAIL, 3 de 3 e 10 sem rodar (teste antes do código)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib/qr.test.ts` — 12 de 12
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib/auth-cliente.test.ts src/lib/qr.test.ts src/app/entrar src/app/configurar-2fa` — 32 de 32
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — 5 erros (tipo da resposta de `enable` e uma variável do e2e), corrigidos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — 0 erros e 2 avisos (`window.location.assign`), corrigidos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/entrar.spec.ts e2e/configurar-2fa.spec.ts` — 13 de 13
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/entrar.spec.ts -g vencido` — 1 de 1
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — 2988 de 2988, 153 arquivos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — 19 de 19
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas build` — passou; `/entrar` e `/configurar-2fa` dinâmicas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — 3 alterados e 12 novos, todos da tarefa (com os desvios 1 a 4)

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] os textos são os de `03-ux-ui-design.md`, em pt-BR, e o axe não acusa violação nas telas tocadas
