# 10. Configuração e scripts

| Campo | Valor |
|---|---|
| Atualizado em | 31/10/2026 |
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
| `BETTER_AUTH_URL` | app, worker, scripts | obrigatória; http ou https; em produção, http só no loopback |
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
| `criar-token-servico.ts` | `--agente orquestrador\|insumo_tecnico\|risco\|consolidacao` | cria um token `wsod_` e escreve uma vez o token e o prefixo. O banco guarda só o hash |
| `revogar-token-servico.ts` | `--prefixo <8 caracteres depois de wsod_>` | revoga o token; código de saída 1 se não havia token ativo com o prefixo |
| `definir-preco-modelo.ts` | `--modelo <id> --entradaPorMilhao <US$> --saidaPorMilhao <US$>` | grava uma vigência nova de preço (até 6 casas). A anterior fica, porque o custo já registrado saiu dela. É o único jeito de gravar preço |
| `seed-ficticio.ts` | `SEED_FICTICIO=1` no ambiente | cria contas, preço e demandas fictícias. Recusa banco que já tem demanda ou conta |
| `migrate.ts` | `pnpm db:migrate` | migrations e filas do pg-boss com `DATABASE_URL_MIGRATOR` |
| `start-hml.ts` | `pnpm start:hml` | homologação: migrate, seed e `pnpm start` sem `DATABASE_URL_MIGRATOR` |

O seed cria contas com senha e segredo TOTP que estão no git, de propósito, para a homologação e o e2e. Por isso
`SEED_FICTICIO` nunca entra no serviço de produção (M-07, controle operacional em
[deploy.md, seção 7](../operacao/deploy.md)).
