# 02. Acesso e segurança

| Campo | Valor |
|---|---|
| Atualizado em | 14/11/2026 (0.4.1: ação `ler_situacao_pedido`, só do `construir`, na matriz e na tabela das integrações; 25 ações); 13/11/2026 (0.4.0: ação `registrar_andamento`, só do `construir`, na matriz e na tabela das integrações; limite próprio do andamento; a sétima chave, `andamento`, na vista do Awave); 12/11/2026 (0.3.1: prazo total nas transações das integrações, contando a espera por conexão, em "Tempo limite"; demanda do Awave não confirmada invisível para agente e `sistema`, na matriz); 12/11/2026 (0.3.0: atores de integração `awave` e `construir`, token de integração, matriz com a coluna das integrações e as quatro ações novas, tempo limite e 503 das integrações, Bearer sem `Origin`); 04/11/2026 (0.1.11: nome grudado na vista mínima, `reduzirErro`, `lerCode`, `erroJaReduzido` e `mapearErro` sem lançar, `ehErro` e `lerDigest`, `stack` lido uma vez no envio ao Sentry); 04/11/2026 (0.1.10: partes do nome do solicitante na vista mínima, `name` do erro lido uma vez e só como texto, marca do Sentry depois do envio); 04/11/2026 (0.1.9: classe e `code` do erro reduzido com regra mais estreita, `CLASSES_DO_PROJETO` e envio único ao Sentry por objeto de erro); 03/11/2026 (0.1.8: texto livre de ESP, RSK e DEC minimizado para quem não é pessoa e `normalizarErro` reduzindo objeto que não é `Error`; 0.1.7: vista mínima nas leituras de ESP, RSK e DEC, console para o Sentry e erro reduzido no `onRequestError`; 0.1.6: registro do erro de tela, console saneado, `ErroLeituraSessao` e vista mínima do agente) |
| Dono | `documentacao-tecnica` (sistema: Fabiano) |
| Cobre | RF-01, RF-02, RNF-10, RNF-12, RNF-13; controles C-01 a C-21 de `04-seguranca-aplicacao.md`; RF-01 a RF-03, RF-09 e RF-11 do pedido 0016 (0.3.0) e os controles IN-01 a IN-04, IN-09, IN-14 e IN-15 dele; RF-01, RF-10 e RF-12 do pedido 0017 (0.4.0) e os controles AN-01, AN-07 e AN-09 dele |
| Fontes no código | `src/modules/acesso/` (`auth.ts`, `exigir-pessoa.ts`, `resolver-ator.ts`, `tokens-servico.ts`, `matriz.ts`, `ator.ts`, `bloqueio-verificacao.ts`), `src/modules/integracoes/tempo-limite.ts`, `src/db/transacao.ts` (desde a 0.3.1), `src/modules/demandas/confirmacao.ts` (desde a 0.3.1), `src/modules/limites.ts`, `src/db/schema/acesso.ts`, `src/lib/rota.ts`, `src/lib/erros.ts`, `src/lib/env.ts`, `src/lib/log.ts`, `src/lib/reduzir-erro.ts`, `src/lib/sentry.ts`, `src/lib/console-saneado.ts`, `src/instrumentation.ts` |

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
- Cada token é de um agente ou, desde a 0.3.0, de uma integração (abaixo). O que cada um pode fazer está na matriz;
  fora dela, 403.
- O worker não usa token: chama os módulos direto com o ator `agente` (ADR-02). O token existe para um agente externo e
  para as integrações.

## Atores de integração (0.3.0)

Desde a 0.3.0 (pedido `DEC-DEM-20261111-0016-v1`, ADR-20 e ADR-21), há um quarto tipo de ator, `integracao`, ao lado
de `pessoa`, `agente` e `sistema`. A lista é fechada, `INTEGRACOES = ['awave', 'construir']` (`src/db/schema/acesso.ts`),
e é a mesma dos CHECK do banco. Integração **não** está em `AGENTES`: não aparece na tela de agentes, no interruptor, no
teto, no uso de IA, em `configuracao_agente` nem em `GET /api/agentes` (RF-11 do pedido).

| Integração | Quem é | Ações | Para quê |
|---|---|---|---|
| `awave` | o Awave (agentes da empresa, serviço `empresa-ia`) | `criar_demanda`, `ler_demanda` | abrir demanda quando o dono aprova em `/aprovacoes` do Awave, e ler as que ele mesmo criou ([cap. 03](03-demandas.md#demanda-aberta-pelo-awave-030)) |
| `construir` | a busca automática do `/construir` (CA-F-01) e, desde a 0.4.0, o envio do andamento | `listar_pedidos_pendentes`, `entregar_pedido`, `confirmar_recebimento_pedido`, desde a 0.4.0 `registrar_andamento` e, desde a 0.4.1, `ler_situacao_pedido` | buscar o Pedido de Construção que uma pessoa gerou no painel, sem cópia manual ([cap. 05](05-pedido-de-construcao.md#entrega-ao-construir-030)); informar a fase e as tarefas prontas da construção, o que pode mudar o status da demanda em dois casos ([cap. 05](05-pedido-de-construcao.md#andamento-da-construção-040)); perguntar se o DEC de um pedido continua vigente ou foi substituído ([cap. 05](05-pedido-de-construcao.md#situação-do-pedido-041)) |

- **Token:** o mesmo formato, a mesma geração e o mesmo hash do token de agente (`wsod_` + 32 bytes; no banco, só o
  SHA-256 e o prefixo de 8 caracteres), na mesma tabela `token_servico`. A linha tem dono agente **ou** integração,
  nunca os dois nem nenhum (`token_servico_dono_check`).
- **Resolução** (`validarTokenServico`, IN-03): a linha vale como agente só com `agente` da lista e `integracao` nula, e
  como integração só com `integracao` da lista e `agente` nulo. Qualquer outra linha é token inválido: 401
  "Token de serviço inválido ou revogado.", a mesma mensagem de token revogado ou inexistente.
- **Emissão e revogação** pelos scripts de sempre, com `--integracao awave|construir` (exclusivo com `--agente`). O
  procedimento de produção, com onde cada token mora, a troca a cada 12 meses e como achar o prefixo sem exibir o token,
  está em [docs/operacao/tokens-de-integracao.md](../operacao/tokens-de-integracao.md).
- **Autoria e histórico:** o ato da integração grava o evento com `ator_tipo = 'integracao'`, `ator_id` = o nome da
  integração e o prefixo do token (`evento_ator_integracao_check`). O histórico do painel mostra "Awave (prefixo …)" ou
  "/construir (prefixo …)", só com prefixo no formato `^[A-Za-z0-9_-]{8}$`. Nunca o token, o hash nem o SHA-256.
- **Limite:** o Awave cria no máximo 10 demandas em 60 minutos ([cap. 03](03-demandas.md#rf-03-criar-demanda)). O
  `construir` não tem limite de taxa na busca, na entrega, no recebimento nem, desde a 0.4.1, na situação do pedido. Integração sem limite definido no código
  lança erro, e nunca fica "sem limite" (`limiteDe`, IN-09). Desde a 0.4.0, o `registrar_andamento` tem limite
  próprio, fora de `limiteDe`: 60 gravações por DEC e 600 no total por hora, e só o `construir` passa por ele
  (`conferirLimiteDeAndamento`; qualquer outro ator lança erro antes de contar,
  [cap. 05](05-pedido-de-construcao.md#limite-conferirlimitedeandamento)).
- **Tempo limite** (ADR-28, `src/modules/integracoes/tempo-limite.ts`, `src/db/transacao.ts`). Vale só na transação
  que o serviço abre para um ator de integração (`executarComOrcamento`). Pessoa, agente e `sistema` seguem com o
  `statement_timeout` do pool e sem prazo total. São duas camadas:
  - **piso por instrução** (desde a 0.3.0): `lock_timeout` de 2 s e `statement_timeout` de 5 s, ou 10 s na entrega do
    pedido (`limitarTempo`, `SET LOCAL` com literais, rodados na abertura da transação);
  - **prazo total da transação** (desde a 0.3.1, M-3): 8 s, ou 12 s na entrega (`PRAZO_TOTAL_MS`, `prazoTotalDe`),
    abaixo do corte do cliente (10 s no Awave, 15 s no `/construir`). O prazo começa antes de pedir a conexão ao pool,
    então a espera por uma conexão livre conta. Antes de cada instrução, `comTransacao` confere o que resta. Com o
    prazo vencido, lança `PrazoDaTransacaoEsgotado`. Com o restante abaixo do piso, baixa o `statement_timeout` e o
    `lock_timeout` até ele, por `set_config` com o valor por parâmetro. O prazo é conferido de novo antes do COMMIT. A
    conexão que chegar depois do prazo volta ao pool. O pool não tem `connectionTimeoutMillis`, que valeria para todos
    os atores.

  Estourou qualquer das duas: `ROLLBACK` e 503 `indisponivel` com a mensagem fixa "O Orquestrador não concluiu o pedido
  a tempo e nada foi gravado. Tente de novo em alguns minutos.", sem texto do Postgres. No `POST /api/demandas` do
  Awave, a resposta 201 é lida dentro da mesma transação (desde a 0.3.1, M-2). Por isso, nada é gravado sem que o
  Awave receba o 201.
- **Ramos exaustivos** (ADR-22, IN-02): todo ponto do código que decide pelo tipo do ator é um `switch` com `never`.
  Um tipo de ator novo quebra o `typecheck`, em vez de cair no ramo do agente.

## Matriz de acesso

`autorizar(ator, acao)` (`matriz.ts`) é a única porta. Ação, agente, integração ou papel desconhecido é negado. O ator
`sistema` não passa em nenhuma ação: as mudanças automáticas de status usam funções internas que não chamam
`autorizar`. Desde a 0.3.0, cada linha tem também a lista das integrações (`integracoes`), vazia por padrão: ação nova
nasce negada para toda integração (IN-01). Só sete pares abrem: cinco desde a 0.3.0, desde a 0.4.0 `construir` em
`registrar_andamento` e, desde a 0.4.1, `construir` em `ler_situacao_pedido`. São 25 ações. O `construir` tem
exatamente cinco, e o `awave`, duas (testes de pares exatos, montados a partir da `MATRIZ`).

| Ação | Pessoa | Agente | Integração |
|---|---|---|---|
| `criar_demanda` | qualquer papel | `orquestrador` | `awave` |
| `ler_demanda` | qualquer papel | os quatro | `awave` (só a demanda que ele criou) |
| `listar_demandas`, `ler_especificacao`, `ler_parecer_risco`, `ler_pacote_decisao` | qualquer papel | os quatro | nenhuma |
| `criar_especificacao` | qualquer papel | `insumo_tecnico` | nenhuma |
| `criar_parecer_risco` | qualquer papel | `risco` | nenhuma |
| `criar_pacote_decisao` | qualquer papel | `consolidacao` | nenhuma |
| `alterar_demanda`, `registrar_entrada`, `ler_texto_bruto`, `ler_historico` | qualquer papel | nenhum | nenhuma |
| `registrar_decisao`, `gerar_pedido_construcao` | qualquer papel (a regra do papel na decisão está no [cap. 04](04-versoes-e-decisao.md#rf-13-decisão)) | nenhum | nenhuma |
| `confirmar_demanda` (desde a 0.3.0) | qualquer papel, só pelo painel ([cap. 03](03-demandas.md#demanda-aberta-pelo-awave-030)) | nenhum | nenhuma |
| `ler_configuracao_agentes`, `ler_teto` | qualquer papel | nenhum | nenhuma |
| `alterar_agente`, `alterar_teto` | só `cto` | nenhum | nenhuma |
| `listar_pedidos_pendentes`, `entregar_pedido`, `confirmar_recebimento_pedido` (desde a 0.3.0) | nenhuma | nenhum | `construir` |
| `registrar_andamento` (desde a 0.4.0) | nenhuma | nenhum | `construir` ([cap. 05](05-pedido-de-construcao.md#andamento-da-construção-040)) |
| `ler_situacao_pedido` (desde a 0.4.1) | nenhuma | nenhum | `construir` ([cap. 05](05-pedido-de-construcao.md#situação-do-pedido-041)); o 403 dos outros atores sai sem consulta ao banco |

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

Desde a 0.3.0, o Awave tem vista própria, menor que a do agente: em `ler_demanda` e no 201 de `criar_demanda` ele
recebe só seis chaves, `id`, `titulo` (minimizado), `tipo`, `status`, `criadaEm` e `atualizadaEm`, e só da demanda que
ele criou. A de outro autor responde o mesmo 404 da demanda que não existe, saído da mesma consulta, com a autoria no
`WHERE` (`obterDemandaDaIntegracao`, ADR-23, IN-08). As vistas de ESP, RSK e DEC lançam `sem_permissao` para
integração. Desde a 0.4.0, a vista do Awave tem uma sétima chave, `andamento`, com só quatro campos (`fase`,
`tarefasProntas`, `tarefasTotal` e `atualizadoEm`) ou `null`. Ela é montada chave a chave (`paraIntegracao`), sem
`statusConstrucao`, `decId` nem prefixo, e o último andamento vem da mesma consulta da autoria, então o 404 de outro
autor continua igual ao da demanda inexistente (ADR-35). A vista mínima do agente e do `sistema` não tem a chave.

Desde a 0.3.1 (M-1 do pedido 0019, que substitui o CA-10.6 do 0016), a matriz não basta para o agente ler ou gravar
numa demanda do Awave. Para agente e `sistema`, a demanda do Awave que nenhuma pessoa confirmou não existe:

- leitura por id, de demanda, ESP, RSK ou DEC, e as listas de ESP, RSK e DEC dela: o mesmo 404 da inexistente;
- `GET /api/demandas` e `GET /api/pacotes-decisao`: fora dos itens e do `total`;
- criação de ESP, RSK ou DEC: o mesmo 404, sem gravar nada.

A regra é uma só, `exigirVisivelPara` (`src/modules/demandas/confirmacao.ts`), com a versão SQL
`condicaoVisivelAoAgente` para as listas. Autoria fora da lista conhecida nunca é visível (falha fechada). Pessoa e
integração não passam por ela. Detalhe no [cap. 03](03-demandas.md#demanda-aberta-pelo-awave-030).

## Proteção das rotas

`rota(...)` (`src/lib/rota.ts`) faz, nesta ordem, antes de tocar o banco:

1. parâmetro de caminho pela regex do id (`^DEM-\d{8}-\d{4}$`, `^(ESP|RSK|DEC)-DEM-\d{8}-\d{4}-v\d{1,4}$`): fora do
   formato, 404 sem consulta;
2. CSRF (C-15): em `POST`, `PATCH`, `PUT` e `DELETE` com cookie, `Origin` igual à do `BETTER_AUTH_URL` (senão 403) e
   `Content-Type: application/json` (senão 415). Sem cookie, só Bearer, o `Origin` não é exigido, mas o corpo
   declarado continua só em JSON. Isso continua valendo depois da CSP e da vigilância de origem da 0.2.0, também com o
   `Host: orquestrador_app` da rede interna (RF-09 do pedido 0016): o Awave e o `/construir` chamam sem `Origin`. A
   rota sem corpo (a entrega do pedido) aceita `POST` sem corpo e sem `content-type`;
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
  código do erro. Para integração, o tipo sai `integracao`, sem o nome dela, o prefixo, o hash, o `decId` ou o corpo
  (desde a 0.3.0, IN-14).
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
