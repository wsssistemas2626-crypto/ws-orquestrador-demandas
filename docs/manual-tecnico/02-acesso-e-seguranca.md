# 02. Acesso e segurança

| Campo | Valor |
|---|---|
| Atualizado em | 04/11/2026 (0.1.11: nome grudado na vista mínima, `reduzirErro`, `lerCode`, `erroJaReduzido` e `mapearErro` sem lançar, `ehErro` e `lerDigest`, `stack` lido uma vez no envio ao Sentry); 04/11/2026 (0.1.10: partes do nome do solicitante na vista mínima, `name` do erro lido uma vez e só como texto, marca do Sentry depois do envio); 04/11/2026 (0.1.9: classe e `code` do erro reduzido com regra mais estreita, `CLASSES_DO_PROJETO` e envio único ao Sentry por objeto de erro); 03/11/2026 (0.1.8: texto livre de ESP, RSK e DEC minimizado para quem não é pessoa e `normalizarErro` reduzindo objeto que não é `Error`; 0.1.7: vista mínima nas leituras de ESP, RSK e DEC, console para o Sentry e erro reduzido no `onRequestError`; 0.1.6: registro do erro de tela, console saneado, `ErroLeituraSessao` e vista mínima do agente) |
| Dono | `documentacao-tecnica` (sistema: Fabiano) |
| Cobre | RF-01, RF-02, RNF-10, RNF-12, RNF-13; controles C-01 a C-21 de `04-seguranca-aplicacao.md` |
| Fontes no código | `src/modules/acesso/` (`auth.ts`, `exigir-pessoa.ts`, `resolver-ator.ts`, `tokens-servico.ts`, `matriz.ts`, `bloqueio-verificacao.ts`), `src/lib/rota.ts`, `src/lib/erros.ts`, `src/lib/env.ts`, `src/lib/log.ts`, `src/lib/reduzir-erro.ts`, `src/lib/sentry.ts`, `src/lib/console-saneado.ts`, `src/instrumentation.ts` |

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
desde a 0.1.6), e, desde a 0.1.7, com o texto livre minimizado (M-1). Desde a 0.1.7 (M-2), as sete rotas de leitura de
ESP, RSK e DEC também cortam para quem não é pessoa, por lista de permissão (`vistaDaEspecificacaoPara`,
`vistaDoParecerPara`, `vistaDoPacotePara`): autor pessoa vira `{ "tipo": "pessoa" }`, os aprovadores saem sem `nome` e
`referenciaDocumento`, e a decisão sem `decididaPor`. Desde a 0.1.8 (M-a), as mesmas três vistas também passam o texto
livre de DEC, ESP e RSK por `minimizarValor`, com o nome do solicitante da demanda entre os trocados, nas sete leituras e
no 201 dos três `POST` de criação ([cap. 09](09-referencia-api.md#exemplo-ler-demanda-com-token-de-agente)). Desde a
0.1.10, a troca pega também cada parte do nome do solicitante que, no texto, começa por maiúscula
([cap. 06](06-agentes-de-ia.md#rf-20-minimização)). O 201 dos três `POST` usa o nome da demanda travada na transação
da gravação ([cap. 04](04-versoes-e-decisao.md)). Desde a 0.1.11, a parte grudada em número, `_` ou CamelCase também
é trocada. Limite que sobra (M-1 da revisão do 0009, risco residual para Fabiano e a `gestao-riscos`): o nome antigo,
de antes de uma edição, a parte escrita toda em minúscula, o nome todo em maiúscula sem separador (`JOANAFICTICIA`), a
parte curta grudada a outra parte que começa por ela (`AnaBelax`) e o nome de outras pessoas saem em claro
([cap. 06](06-agentes-de-ia.md#rf-20-minimização), [CHANGELOG](../../CHANGELOG.md)).

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
[cap. 09](09-referencia-api.md#erros). Desde a 0.1.11 (B-3 da revisão do 0011), `mapearErro` não lança: um Proxy
cujo protótipo não se lê (o `instanceof` lança) ou um getter que lança vira o mesmo 500 `erro_interno`, e a `rota()`
segue até a resposta, o log e o Sentry.

## Log e Sentry (RNF-10, C-20, C-21)

- Só o `log` de `src/lib/log.ts` (pino), que descarta qualquer campo fora da lista de permissão. `console.*` é
  proibido em `src/` pelo ESLint. Nível por `LOG_LEVEL` (padrão `info`).
- Uma linha por requisição: método, padrão da rota (nunca o caminho com o id nem a query), status, ms, tipo de ator e
  código do erro.
- Erro do Postgres vai ao log reduzido a classe e código. Desde a 0.1.8 (B-b), `normalizarErro` (`src/lib/log.ts`)
  reduz também o valor em `erro` que não é `Error`: sai `{ "classe": "desconhecido" }`, com `code` só quando passa em
  `lerCode` (`src/lib/reduzir-erro.ts`). A exceção é o erro que já chega reduzido, na forma exata `{ classe, code? }`
  com a classe aceita por `classeAceita` (`erroJaReduzido`), como o do `onRequestError`. O logger do Better Auth foi
  trocado por um evento fixo, sem mensagem nem argumentos.
- **Regra da classe e do `code`** (`src/lib/reduzir-erro.ts`, B-1 do 0009, desde a 0.1.9). A regra vale para o log
  (`normalizarErro`, `erroJaReduzido`) e para o título do Sentry (`reduzirErro`, em `capturarErro`):
  - `code`: até 40 caracteres de letras, dígitos e `_`, **sem 10 ou mais dígitos seguidos** em nenhuma posição
    (`DIGITOS_DEMAIS`), no erro e na `cause`. `23505`, `57P01`, `2200H`, `ECONNREFUSED`, `recusado` e `transitorio`
    passam; `00000000191`, `1234567890` e `1234567890A` não saem;
  - classe (`classeAceita`): `desconhecido`; um identificador de até 64 caracteres terminado em `Error` ou `Exception`;
    ou um nome de `CLASSES_DO_PROJETO`. Fora disso, o `Error` com esse `name` sai com a classe `Error`
    (`reduzirErro`), no log e no Sentry. O objeto já reduzido com essa classe não é reconhecido por `erroJaReduzido` e
    sai no log como `{ "classe": "desconhecido" }`, com o `code` só se passar em `lerCode`. Um `name` como `Joana` ou
    `ErroJoana` não sai. Desde a 0.1.10 (B-2 da revisão do 0010), `reduzirErro` lê `e.name` uma vez só e usa a
    leitura só se ela for texto e passar em `classeAceita`. Objeto com `toString`, array, símbolo ou número em `name`
    saem como `Error`. Um getter que muda entre leituras não troca o valor depois da conferência;
  - **as funções de `reduzir-erro.ts` nunca lançam** (desde a 0.1.11, B-3 da revisão do 0011). Um getter que lança em
    `name`, `code`, `cause` ou `digest`, ou um Proxy com armadilha que lança (`get`, `has`, `ownKeys`,
    `getPrototypeOf`), não faz o erro sumir do log e do Sentry:
    - `reduzirErro`: exceção ao ler `name`, `code` ou `cause` devolve `{ classe: 'Error' }`, mesmo com o `name` já lido
      e aceito. O que não é Error, ou o Proxy cujo protótipo não se lê, devolve `{ classe: 'desconhecido' }`;
    - `lerCode` devolve `undefined`, e `erroJaReduzido` devolve `null`, quando a leitura lança;
    - `ehErro(x)` é o `x instanceof Error` que não lança (exceção é `false`), e `lerDigest(x)` lê o `digest` do Next sem
      lançar (ausente ou exceção é `undefined`). `normalizarErro` (`log.ts`), o console saneado e `onRequestError` usam
      os dois;
  - `CLASSES_DO_PROJETO` é a lista fechada das classes que o projeto põe em `name` sem o sufixo: `ErroEnvioEmail`,
    `ErroDominio`, `ErroProvedor`, `ErroConfiguracao`, `ErroLeituraSessao`, `AvisoNaoEnviado`, `ExecucaoPerdida` e
    `TempoEsgotado`. **Convenção:** classe de erro nova do projeto com `name` próprio termina em `Error` ou
    `Exception` ou entra nessa lista. O `test/estatico/classes-de-erro.test.ts` lê pela AST toda string posta em
    `name` nos arquivos de `src/` que não são teste (`this.name = '...'`, campo `name` da classe e
    `Object.defineProperty(X.prototype, 'name', { value })`). Ele reprova o nome que `classeAceita` recusar.
- Sentry só com `SENTRY_DSN`; sem ela, desligado. Erro 5xx vai reduzido, sem dado pessoal. Desde a 0.1.9 (B-a do
  0008), `capturarErro` (`src/lib/sentry.ts`) marca cada objeto de erro enviado num `WeakSet`: o mesmo objeto não vai
  de novo, venha do gancho ou do console, em qualquer ordem. A marca é por objeto, não por mensagem: dois erros
  distintos com a mesma mensagem vão os dois. Valor que não é objeto (string, número) vai toda vez. Desde a 0.1.10 (B-4
  da revisão do 0010), a marca só é posta depois que `Sentry.captureException` volta. Se o envio lançar, o objeto fica
  sem marca, e a próxima chamada com ele tenta de novo. Desde a 0.1.11, `reduzirErro` não lança, então só o envio pode
  falhar ali. Os quadros da pilha enviados saem de uma leitura só de `e.stack` (`quadrosDaPilha`, desde a 0.1.11, B-2
  da revisão de segurança do 0012): um getter que devolvesse outro valor a cada leitura não leva a mensagem aos
  quadros.
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
  - Desde a 0.1.7 (M-3), `console.error` com `Error` sem a chave `digest` também vai ao Sentry, por
    `capturarErro(erro, { evento: 'console_erro' })`, com o mesmo saneamento das rotas e dentro da mesma guarda contra
    reentrada (falha do Sentry não entra em laço). Com `digest`, não vai: já saiu pelo `onRequestError`. `console.warn`
    fica só no log. `defaultIntegrations` continua `false`.
  - Desde a 0.1.7 (B-1), o `onRequestError` grava `reduzirErro(err)`: valor que não é `Error` vira
    `{ "classe": "desconhecido" }`.
  - Desde a 0.1.11 (B-3 da revisão do 0011), o console saneado acha o `Error` por `ehErro` e lê o `digest` por
    `lerDigest`, e o `onRequestError` também usa `lerDigest`. Um getter que lança ou um Proxy não derruba mais a linha
    do log: o erro sai `{ "classe": "Error" }`. O Proxy cujo protótipo não se lê não conta como `Error`, e a linha
    `console_erro` sai sem o campo `erro`.
  - Desde a 0.1.9 (B-a do 0008), a duplicação está conferida no fonte do Next 16.4.1 e registrada no comentário de
    `console-saneado.ts`. Na página, no layout e no Server Component, o erro ganha `digest` antes de ir ao gancho e ao
    console, e a guarda de `digest` basta. No route handler, o erro que escapa chega **sem** `digest` ao
    `console.error` e ao `onRequestError`, e é o mesmo objeto nos dois. Quem evita o segundo envio é a marca por objeto
    em `capturarErro`. As rotas daqui passam por `rota()`, que trata o erro, e o `/api/saude` trata o próprio. O caso
    real é a rota do Better Auth. O log não é deduplicado: cada `console.error` deixa a sua linha `console_erro`.
- Limites conhecidos ([CHANGELOG](../../CHANGELOG.md), pendências da 0.1.6 à 0.1.11):
  - o `code` ainda passa com 9 dígitos, com dígitos separados por `_` ou com uma palavra, e o sufixo aceita um nome
    montado como `JoanaSilvaError`. Só vira problema se um chamador futuro puser dado pessoal em `code` ou em `name`,
    e nenhum caminho de hoje faz isso (B-1 da revisão do 0010, aberto);
  - um Error com `digest: undefined` explícito vai ao Sentry pelo console saneado, porque `lerDigest` não distingue
    a chave ausente da chave com valor indefinido. O Next não produz esse caso (B-4 da revisão do 0012, aberto);
  - o mesmo objeto de erro reaproveitado por várias requisições vai ao Sentry uma vez só (registrado no B-4 da revisão
    do 0010; nenhum caso assim foi achado no código);
  - o `classes-de-erro.test.ts` não vê `get name()` nem `X.name = '...'` fora de `this` (B-5 da revisão do 0010);
  - a prova do console é de unidade: se o Next escrever direto no `process.stderr` ou guardar a referência do
    `console.error` antes do `register()`, a troca não pega (B-2 da 0.1.6), e só a `ErroLeituraSessao` e o `erro_requisicao`
    seguem garantidos;
  - erro fora de requisição (`uncaughtException`, `unhandledRejection`, `onError` do `after()`) só chega ao Sentry se
    o Next o escrever por `console.error`; isso não foi conferido no runtime do Next 16 (prova de unidade, risco do M-3
    para a Parada 3);
  - na conferência do B-a, os caminhos do middleware/proxy e da Server Action não foram lidos em arquivo próprio. A
    marca por objeto vale para qualquer caminho.

## Segredos (RNF-13)

Todo segredo vem de variável de ambiente, citada só pelo nome. A configuração é conferida no boot (`env.ts`,
`env-worker.ts`): variável fora da regra impede a subida, e a mensagem cita só o nome dela. `ANTHROPIC_API_KEY` e
`RESEND_API_KEY` só são lidas pelo worker. A lista completa está no [cap. 10](10-configuracao-e-scripts.md).
