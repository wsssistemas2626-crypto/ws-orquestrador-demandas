# 02. Acesso e segurança

| Campo | Valor |
|---|---|
| Atualizado em | 03/11/2026 (0.1.6: registro do erro de tela, console saneado, `ErroLeituraSessao` e vista mínima do agente) |
| Dono | `documentacao-tecnica` (sistema: Fabiano) |
| Cobre | RF-01, RF-02, RNF-10, RNF-12, RNF-13; controles C-01 a C-21 de `04-seguranca-aplicacao.md` |
| Fontes no código | `src/modules/acesso/` (`auth.ts`, `exigir-pessoa.ts`, `resolver-ator.ts`, `tokens-servico.ts`, `matriz.ts`, `bloqueio-verificacao.ts`), `src/lib/rota.ts`, `src/lib/erros.ts`, `src/lib/env.ts`, `src/lib/log.ts`, `src/lib/console-saneado.ts`, `src/instrumentation.ts` |

## RF-01. Login com 2FA

- Better Auth com e-mail e senha (`auth.ts`). **Sem cadastro público** (`disableSignUp`): conta só nasce pelo
  `scripts/criar-usuario.ts`. Senha mínima de 20 caracteres. Sem redefinição de senha por e-mail, sem troca de e-mail
  e sem exclusão de conta pela API.
- Papéis: `cto` e `administradora`. O campo `papel` tem `input: false`: ninguém muda o próprio papel pela API.
- **2FA (TOTP) obrigatório.** `exigirPessoa` (`exigir-pessoa.ts`) é chamada dentro de cada rota, Server Action e
  página do painel. Ela exige sessão válida, conta não desativada, 2FA ativo e papel conhecido:
  - sem sessão, conta desativada ou sessão sem 2FA com mais de 15 min → 401 (a página manda para `/entrar`);
  - sessão sem 2FA com menos de 15 min → 403 `sem_2fa` (a página manda para `/configurar-2fa`, a única que abre);
  - papel desconhecido → 403 (a página manda para `/sem-permissao`);
  - falha ao ler a sessão (por exemplo, banco fora) → `ErroLeituraSessao`, com mensagem fixa, sem `cause` e só com o
    `code` validado (M-05, desde a 0.1.6). Na rota vira 500 `erro_interno`; na página, a tela "Não foi possível
    carregar esta página." (`src/app/error.tsx`). O token de sessão, que vai nos parâmetros da consulta, não sobe com o
    erro.
- Sessão de 8 h, sem renovação (`DURACAO_SESSAO_S`). Cookies com prefixo `wsod`, `httpOnly`, `sameSite=lax`, e
  `Secure` quando o `BETTER_AUTH_URL` é https. Em produção, o `env.ts` recusa `BETTER_AUTH_URL` em http fora do
  loopback: o processo não sobe.
- Emissor do TOTP: "WS Orquestrador de Demandas". Os segredos de 2FA ficam cifrados com o `BETTER_AUTH_SECRET`;
  trocar a variável torna esses segredos ilegíveis ([deploy.md, seção 3](../operacao/deploy.md)).
- **Limites (RNF-12, C-06):**
  - login: 10 tentativas por minuto por IP (`rateLimit` em memória). O IP vem do cabeçalho de
    `CABECALHO_IP_CLIENTE` (padrão `x-real-ip`, que o Traefik do Easypanel sobrescreve);
  - verificação do código: 5 erros na mesma conta em 15 min, de qualquer IP, bloqueiam a verificação dessa conta por
    15 min (`bloqueio-verificacao.ts`). O bloqueio próprio do plugin `twoFactor` (10 erros seguidos) continua ligado
    como camada a mais.
- Desativar conta: `scripts/desativar-conta.ts` ([cap. 10](10-configuracao-e-scripts.md)).

## RF-02. Token de serviço dos agentes

- Token `wsod_` + 32 bytes aleatórios em base64url (`tokens-servico.ts`). Sai uma vez, na saída do
  `scripts/criar-token-servico.ts`; o banco guarda só o SHA-256 e o prefixo de 8 caracteres, que identifica o token no
  histórico e na revogação.
- Só vale em `Authorization: Bearer <token>`, nunca na query nem em cookie (`resolver-ator.ts`):
  - cookie de sessão e `Authorization` juntos → 400;
  - token fora do formato, revogado ou inexistente → 401, com uma mensagem só;
  - sem cookie e sem token → 401.
- Cada token é de um agente. O que o agente pode fazer está na matriz abaixo; fora dela, 403.
- O worker não usa token: chama os módulos direto com o ator `agente` (ADR-02). O token existe para um agente externo.

## Matriz de acesso

`autorizar(ator, acao)` (`matriz.ts`) é a única porta. Ação, agente ou papel desconhecido é negado. O ator `sistema`
não passa em nenhuma ação: as mudanças automáticas de status usam funções internas que não chamam `autorizar`.

| Ação | Pessoa | Agente |
|---|---|---|
| `criar_demanda` | qualquer papel | `orquestrador` |
| `listar_demandas`, `ler_demanda`, `ler_especificacao`, `ler_parecer_risco`, `ler_pacote_decisao` | qualquer papel | os quatro |
| `criar_especificacao` | qualquer papel | `insumo_tecnico` |
| `criar_parecer_risco` | qualquer papel | `risco` |
| `criar_pacote_decisao` | qualquer papel | `consolidacao` |
| `alterar_demanda`, `registrar_entrada`, `ler_texto_bruto`, `ler_historico` | qualquer papel | nenhum |
| `registrar_decisao`, `gerar_pedido_construcao` | qualquer papel (a regra do papel na decisão está no [cap. 04](04-versoes-e-decisao.md#rf-13-decisão)) | nenhum |
| `ler_configuracao_agentes`, `ler_teto` | qualquer papel | nenhum |
| `alterar_agente`, `alterar_teto` | só `cto` | nenhum |

A autoria (quem criou, em nome de quem aprovou, se é rascunho de agente) vem sempre do ator resolvido. Nenhum schema
de entrada tem campo de autoria, e o Zod descarta chave desconhecida (C-11).

Ler não é ver tudo: em `ler_demanda` (e na resposta de `criar_demanda`), quem não é pessoa recebe a vista mínima da
demanda, sem `solicitanteNome`, `anexos` e nome de conta ([cap. 03](03-demandas.md#rf-06-consultar-e-alterar); M-06,
desde a 0.1.6). As leituras próprias de ESP, RSK e DEC ainda devolvem ao agente o nome da conta autora (M-2, aberto,
[CHANGELOG](../../CHANGELOG.md)).

## Proteção das rotas

`rota(...)` (`src/lib/rota.ts`) faz, nesta ordem, antes de tocar o banco:

1. parâmetro de caminho pela regex do id (`^DEM-\d{8}-\d{4}$`, `^(ESP|RSK|DEC)-DEM-\d{8}-\d{4}-v\d{1,4}$`): fora do
   formato, 404 sem consulta;
2. CSRF (C-15): em `POST`, `PATCH`, `PUT` e `DELETE` com cookie, `Origin` igual à do `BETTER_AUTH_URL` (senão 403) e
   `Content-Type: application/json` (senão 415). Sem cookie, só Bearer, o `Origin` não é exigido, mas o corpo
   continua só em JSON;
3. `resolverAtor` e `autorizar`;
4. query e corpo pelo Zod; corpo acima de 512 KB → 413 antes do parse;
5. a função do módulo.

Erro só pelo mapeador único (`src/lib/erros.ts`): `ErroDominio` vira o status do código; qualquer outra coisa vira 500
com a mensagem genérica, sem texto do Postgres, do Drizzle nem do Zod. Os códigos estão no
[cap. 09](09-referencia-api.md#erros).

## Log e Sentry (RNF-10, C-20, C-21)

- Só o `log` de `src/lib/log.ts` (pino), que descarta qualquer campo fora da lista de permissão. `console.*` é
  proibido em `src/` pelo ESLint. Nível por `LOG_LEVEL` (padrão `info`).
- Uma linha por requisição: método, padrão da rota (nunca o caminho com o id nem a query), status, ms, tipo de ator e
  código do erro.
- Erro do Postgres vai ao log reduzido a classe e código. O logger do Better Auth foi trocado por um evento fixo, sem
  mensagem nem argumentos.
- Sentry só com `SENTRY_DSN`; sem ela, desligado. Erro 5xx vai reduzido, sem dado pessoal.
- Teste transversal com sentinelas confere que texto bruto, e-mail, telefone, token, senha, cookie e conteúdo de IA não
  aparecem em log, Sentry, histórico nem tabela do pg-boss.
- **Erro não tratado de página, layout, metadados ou Server Component** (M-05, desde a 0.1.6). O Next chama
  `onRequestError` (`src/instrumentation.ts`, só no runtime Node), que grava uma linha e manda o erro ao Sentry pelo
  mesmo `capturarErro` das rotas. Os campos da linha, com valores fictícios (o pino acrescenta os campos próprios dele):
  ```json
  { "evento": "erro_requisicao", "metodo": "GET", "rota": "/demandas/[id]", "codigoErro": "erro_interno", "erroId": "1234567890", "erro": { "classe": "ErroLeituraSessao", "code": "57P01" } }
  ```
  - `rota` é o modelo da rota, nunca o caminho com id nem a query; `metodo` e `rota` fora do formato não entram;
  - `erroId` é o `digest` do Next e só sai no formato `^[A-Za-z0-9_-]{1,64}$` (`FORMATO_ERRO_ID`, conferido também
    dentro do `log`). Junta as linhas do mesmo erro no log (o `erro_requisicao` e um `console_erro` do mesmo `digest`).
    O Sentry não recebe o `erroId`: o evento lá tem o título `<classe> <code>`, os quadros da pilha sem mensagem e a tag
    `evento: erro_requisicao` (`capturarErro`, `src/lib/sentry.ts`). A tela de erro não mostra o `erroId`;
  - `redirect()` e `notFound()` são controle do Next, não falha, e não são registrados.
- **Console saneado** (`src/lib/console-saneado.ts`, instalado no `register()` depois de `lerConfigApp` e do Sentry):
  `console.error` e `console.warn` gravam só `{ evento: "console_erro" | "console_aviso", erro, erroId }` pelo `log`,
  com `erro` sendo o primeiro argumento que for `Error`, reduzido a classe e código. Texto solto e objeto não saem, e
  a falha do próprio log é engolida, sem voltar ao console original. `console.log` e `console.info` não mudam. O erro de
  configuração do boot sai antes da troca e continua legível, só com o nome da variável (C-31).
- Limites conhecidos ([CHANGELOG](../../CHANGELOG.md), pendências da 0.1.6):
  - a prova do console é de unidade: se o Next escrever direto no `process.stderr` ou guardar a referência do
    `console.error` antes do `register()`, a troca não pega (B-2), e só a `ErroLeituraSessao` e o `erro_requisicao`
    seguem garantidos;
  - erro fora de requisição (`uncaughtException`, `unhandledRejection`, `onError` do `after()`) que chega ao console
    perde a pilha e não vai ao Sentry (M-3, aberto). Não vaza dado; dificulta o diagnóstico.

## Segredos (RNF-13)

Todo segredo vem de variável de ambiente, citada só pelo nome. A configuração é conferida no boot (`env.ts`,
`env-worker.ts`): variável fora da regra impede a subida, e a mensagem cita só o nome dela. `ANTHROPIC_API_KEY` e
`RESEND_API_KEY` só são lidas pelo worker. A lista completa está no [cap. 10](10-configuracao-e-scripts.md).
