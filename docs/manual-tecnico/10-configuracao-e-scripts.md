# 10. Configuração e scripts

| Campo | Valor |
|---|---|
| Atualizado em | 12/11/2026 (0.3.1: `criar-token-servico.ts` sem caminho de sucesso sem emissão; nenhuma variável nova); 12/11/2026 (0.3.0: `--integracao` nos scripts de token, seed com as demandas do Awave e os pedidos do `/construir`, `E2E_ARQUIVO_TOKENS`; nenhuma variável nova do app ou do worker); 03/11/2026 (0.1.6: guarda do seed pelo `BETTER_AUTH_URL` no loopback) |
| Dono | `documentacao-tecnica` (sistema: Fabiano) |
| Cobre | RNF-13, RNF-14 |
| Fontes no código | `src/lib/env.ts`, `src/lib/env-worker.ts`, `.env.example`, `scripts/` |

## Variáveis de ambiente

Só os nomes. Valor real fica no Easypanel (produção) ou no `.env.local` da máquina (desenvolvimento), nunca no
repositório, no log ou na tela. Onde cada uma vale em produção está em
[deploy.md, seção 3](../operacao/deploy.md).

| Variável | Quem lê | Regra no código |
|---|---|---|
| `DATABASE_URL` | app, worker, scripts | obrigatória; papel `orquestrador_app` |
| `BETTER_AUTH_SECRET` | app, worker, scripts | obrigatória; 32 bytes ou mais |
| `BETTER_AUTH_URL` | app, worker, scripts | obrigatória; http ou https; em produção, http só no loopback; o seed fictício só roda com ela no loopback |
| `CABECALHO_IP_CLIENTE` | app, worker | opcional; nome de cabeçalho (letras, números e hífen); padrão `x-real-ip` |
| `RETENCAO_TEXTO_BRUTO_DIAS` | app, worker | opcional; inteiro de 1 a 365; padrão 90 |
| `LOG_LEVEL` | app, worker | opcional; padrão `info` |
| `SENTRY_DSN` | app, worker | opcional; ausente = Sentry desligado |
| `PORT` | app (`pnpm start`) | opcional; padrão 3101 |
| `ANTHROPIC_API_KEY` | só o worker | opcional; ausente = sem provedor de IA |
| `RESEND_API_KEY` | só o worker | opcional; ausente = aviso `sem_provedor` |
| `EMAIL_REMETENTE`, `EMAIL_AVISO_DECISAO` | só o worker | opcionais; e-mail válido |
| `DATABASE_URL_MIGRATOR` | `pnpm db:migrate`, `pnpm start:hml` | só no passo de migration; nunca no app nem no worker de produção |
| `SEED_FICTICIO` | `scripts/seed-ficticio.ts`, `pnpm start:hml` | `1` liga o seed; **nunca em produção** |
| `NODE_ENV`, `NEXT_RUNTIME` | Next e imagem | não configurar |
| `BASE_URL`, `CI` | Playwright | só no e2e |
| `E2E_ARQUIVO_TOKENS` | `e2e/servidor.ts` e os e2e das integrações | desde a 0.3.0; não configurar. O `playwright.config.ts` a põe só sem `BASE_URL`, apontando para um `tokens.json` (permissão 600) numa pasta temporária fora do repositório, com os tokens `awave` e `construir` emitidos no banco descartável do e2e. A pasta é apagada no fim |

Variável vazia conta como ausente. Variável fora da regra impede a subida, e a mensagem cita só o nome dela.
Nos testes e no CI, `ANTHROPIC_API_KEY` e `RESEND_API_KEY` nunca são definidas (RNF-14).

## Scripts de operação

Todos rodam com `pnpm tsx scripts/<script>.ts`, com as variáveis do app no ambiente (em produção, no console do
serviço `app` no Easypanel). Aceitam só `--nome valor` ou `--nome=valor`; argumento desconhecido, como `--senha` ou
`--token`, é recusado sem repetir o valor. Toda ação vai ao histórico.

| Script | Uso | O que faz |
|---|---|---|
| `criar-usuario.ts` | `--email <e-mail> --nome <nome> --papel cto\|administradora` | cria a conta sem 2FA e escreve uma vez a senha inicial (24 caracteres aleatórios). No primeiro acesso, a pessoa configura o 2FA |
| `desativar-conta.ts` | `--email <e-mail>` | marca a conta como desativada, desliga o 2FA e apaga sessões, segredo TOTP, códigos de recuperação e a senha. A linha da conta fica, porque o histórico aponta para ela. Rodar de novo não muda nada |
| `criar-token-servico.ts` | `--agente orquestrador\|insumo_tecnico\|risco\|consolidacao` ou, desde a 0.3.0, `--integracao awave\|construir` (exatamente um dos dois) | cria um token `wsod_` e escreve uma vez o token e o prefixo. O banco guarda só o hash. O evento `token_criado` leva só o dono (agente ou integração) e o prefixo. Sem nenhum dos dois, ou com os dois, recusa com "Informe exatamente um entre --agente e --integracao." e não emite nada; desde a 0.3.1 (B-2), a decisão do dono também lança nesse caso (`donoDosArgumentos`, `switch` com `never`), e não há caminho que saia com sucesso sem emitir |
| `revogar-token-servico.ts` | `--prefixo <8 caracteres depois de wsod_>` | revoga o token de agente ou de integração; código de saída 1 se não havia token ativo com o prefixo. Os outros tokens seguem valendo |
| `definir-preco-modelo.ts` | `--modelo <id> --entradaPorMilhao <US$> --saidaPorMilhao <US$>` | grava uma vigência nova de preço (até 6 casas). A anterior fica, porque o custo já registrado saiu dela. É o único jeito de gravar preço |
| `seed-ficticio.ts` | `SEED_FICTICIO=1` no ambiente | cria as quatro contas de `CONTAS_FICTICIAS`, o preço do modelo fictício e 28 demandas fictícias (`TOTAL_DEMANDAS_DO_SEED`): uma de cada tipo, 18 próprias do e2e (`TITULOS_DO_E2E`), para o e2e não gastar o limite de demandas por hora e, desde a 0.3.0, três do Awave (nenhuma confirmada, uma encerrada) e duas com Pedido de Construção gerado, uma a buscar e uma já entregue e recebida pelo `/construir`. Os atos do Awave e do `/construir` usam o prefixo fictício `ficticio`: o seed não cria token. Recusa banco que já tem demanda ou conta, e recusa `BETTER_AUTH_URL` fora do loopback (abaixo) |
| `migrate.ts` | `pnpm db:migrate` | migrations e filas do pg-boss com `DATABASE_URL_MIGRATOR` |
| `start-hml.ts` | `pnpm start:hml` | homologação: migrate, seed e `pnpm start` sem `DATABASE_URL_MIGRATOR` |

Emitir, guardar, trocar e revogar os tokens das integrações em produção, e achar o prefixo de um token ativo sem
exibi-lo: [docs/operacao/tokens-de-integracao.md](../operacao/tokens-de-integracao.md).

O seed cria contas com senha e segredo TOTP que estão no git, de propósito, para a homologação e o e2e. Por isso
`SEED_FICTICIO` nunca entra no serviço de produção (controle operacional em
[deploy.md, seção 7](../operacao/deploy.md)), e o `seedFicticio` tem três guardas, nesta ordem
(`scripts/seed-ficticio.ts`):

1. `SEED_FICTICIO` igual a `1`. Senão, resultado `recusado`;
2. desde a 0.1.6 (M-07), o host da origem validada do `BETTER_AUTH_URL` (`config.urlBase`) é `127.0.0.1`, `localhost`
   ou `[::1]`, por igualdade exata (`ehLoopback`, `src/lib/env.ts`, a mesma lista do cookie `Secure`). Prefixo e sufixo
   não valem: `127.0.0.1.exemplo.test` e `localhost.exemplo.test` são recusados. Senão, resultado `recusado_producao`,
   antes de abrir conexão com o banco;
3. banco sem nenhuma demanda e sem nenhuma conta. Senão, `recusado`.

Na recusa, nada é gravado e o código de saída é 1. A mensagem é fixa e cita só nomes de variável, nunca o valor:

```text
Seed fictício não rodou: BETTER_AUTH_URL não aponta para o loopback (127.0.0.1, localhost ou [::1]), e o seed só roda fora da produção. Nada foi alterado.
```

O log grava `seed_ficticio` com `status: "recusado_producao"` e `codigoErro: "url_fora_do_loopback"`. No
`pnpm start:hml`, a recusa imprime "Seed fictício não rodou (BETTER_AUTH_URL fora do loopback)." e a subida continua.
A homologação (`127.0.0.1:3200`), o e2e (`127.0.0.1:3101`) e o desenvolvimento (`127.0.0.1:3101`) passam pela guarda.
