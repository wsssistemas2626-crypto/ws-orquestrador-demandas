---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T09-construcao
agente: engenheiro-backend
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, passagens.jsonl, 05-tech-lead.md, 06-T08-engenheiro-backend.md, 06-T08-tech-lead.md, 06-T08-qa-automacao.md, 04-seguranca-aplicacao.md (seções 2 e 3), 03-ux-ui-design.md (seções 1 a 4 até a T02), 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6 e T08 a T10), src/modules/acesso/auth.ts, src/modules/acesso/auth.test.ts, src/modules/acesso/auth-comportamento.test.ts, src/app/api/auth/[...all]/route.ts, src/db/index.ts, src/db/schema/index.ts, src/db/schema/acesso.ts, src/db/schema/historico.ts, src/db/schema/comum.ts, src/db/transacao.ts, src/db/privilegios.ts, src/lib/deps.ts, src/lib/erros.ts, src/lib/log.ts, src/lib/relogio.ts, test/auth.ts, test/deps.ts, test/banco.ts, test/sentinelas.ts, package.json, vitest.config.ts, .prettierrc]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

### Resumo

A T09 está pronta: `exigirPessoa` e os dois adaptadores do painel, o bloqueio da verificação por conta (C-06), o
`destinoSeguro` (C-40) e os ganchos `before` e `after` do Better Auth (C-05, C-06, C-08, C-21). Os arquivos são os do
plano, sem nenhum a mais. A suíte foi de 649 para 725 testes, todos verdes. Lint e typecheck estão limpos.

As duas pendências que o `05-tech-lead.md` e o `06-T08-tech-lead.md` deixaram para a T09 foram resolvidas por teste, e
nenhuma delas pede volta ao plano:

1. **O bloqueio próprio do plugin `twoFactor` não contradiz C-06.** Uma sonda contra o 1.7.6 mostrou como ele funciona:
   - Ele conta erros seguidos na conta (`failed_verification_count`), sem janela de tempo, e só zera a contagem no
     acerto.
   - No 10º erro, bloqueia a conta por 15 min (`locked_until`, resposta 429 `ACCOUNT_TEMPORARILY_LOCKED`).
   - Cada login (cookie de dois fatores) aceita no máximo 5 tentativas. Na 6ª, a resposta é 400
     `TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE` e o cookie é apagado.

   O bloqueio do plugin dura os mesmos 15 min que o de C-06. Dentro de uma janela de 15 min, o de C-06 (5 erros) vem
   antes. Fora da janela, o do plugin pega o que C-06 deixaria passar (10 erros espalhados no tempo). É uma camada a
   mais, e nenhuma das duas afrouxa a outra. A tabela `bloqueio_verificacao` fica como o plano manda, e o plugin fica
   com o padrão dele. Um teste fixa essa sobreposição, então uma versão nova que mude o padrão do plugin quebra o teste.
2. **O `/sign-in` tem regra de limite própria no Better Auth.** É de 3 tentativas em 10 s, e a contagem zera quando
   passam 10 s sem pedido. Essa regra é mais estrita em rajada (a 4ª já dá 429). Só que ela deixa passar 12 tentativas
   em 56 s quando o ritmo é de pares a cada 11 s, e isso fura o "10 por minuto" de RNF-12 e C-06.
   - Por isso entrou `rateLimit.customRules['/sign-in/email'] = { window: 60, max: 10 }`.
   - Dois testes provam a regra: a rajada de 11 e os pares a cada 11 s.
   - Sem a regra, os dois falham (contraprova em Comandos executados).

### Arquivos

| Arquivo | O que tem |
|---|---|
| `src/modules/acesso/exigir-pessoa.ts` (novo) | `exigirPessoa`, `exigirPessoaNaPagina`, `exigirSessaoParaConfigurar2fa`, `SESSAO_SEM_2FA_MS` |
| `src/modules/acesso/bloqueio-verificacao.ts` (novo) | `verificacaoBloqueada`, `registrarFalhaDeVerificacao` (transação com `SELECT … FOR UPDATE`), `zerarFalhasDeVerificacao` e as constantes de 5 falhas, janela de 15 min e bloqueio de 15 min |
| `src/modules/acesso/destino-seguro.ts` (novo) | `destinoSeguro` e `ROTAS_DO_PAINEL` (as rotas da 03, seção 1, menos `/entrar` e `/configurar-2fa`) |
| `src/modules/acesso/auth.ts` (modificado) | `hooks.before` e `hooks.after`, a `customRules` do login e o `relogio` em uso, com padrão `relogioDoSistema` (resolve o parecer 3 do `06-T08-tech-lead.md`) |
| `test/sessao.ts` (novo) | `criarPessoa` e `codigoTotp` (as interfaces do plano), mais `novoIp`, `PoteDeCookies`, `postAuth`, `getAuth` e `codigoErrado` |

O que `exigirPessoa` faz, na ordem:

1. Sem sessão, com conta desativada ou com sessão sem 2FA de mais de 15 min, lança `nao_autenticado`.
2. Sem 2FA, lança `sem_2fa`.
3. Com papel fora de `cto` e `administradora`, lança `sem_permissao`.

As mensagens são as da 03, seção 2.8.

O que os ganchos fazem:

- **`before`**, nas rotas `verify-totp`, `verify-backup-code` e `verify-otp`:
  1. Descobre o usuário pela sessão, no caso da ativação, ou pelo cookie assinado de dois fatores, no caso do login.
     O caminho é o mesmo do plugin: cookie, depois `findVerificationValue`.
  2. Se a conta está bloqueada, devolve 429 `VERIFICACAO_BLOQUEADA` antes do plugin.
  3. Senão, troca `trustDevice` por `false` no corpo.
- **`after`**:
  - Código errado soma uma falha. O 429 de bloqueio não soma.
  - Acerto zera a contagem. Na ativação, grava `2fa_ativado`.
  - `/two-factor/disable` com sucesso grava `2fa_desativado`.
  - `/sign-in/email` com falha escreve `log.warn({ evento: 'login_falhou', atorTipo: 'anonimo' })`.
  - Os eventos levam o ator pessoa, `entidade: 'usuario'` e, em `antes` e `depois`, só `{ twoFactorEnabled }`.

### Testes criados

| Arquivo | Testes | Cobre |
|---|---|---|
| `src/modules/acesso/exigir-pessoa.test.ts` | 24 | Os 6 do plano. Mais: a administradora; os 15 min exatos; o limite que não vale com 2FA; os cabeçalhos repassados; o erro sem dado da sessão. Os redirecionamentos de `exigirPessoaNaPagina` (com a volta passando por `destinoSeguro`) e de `exigirSessaoParaConfigurar2fa`, com `next/headers` e `next/navigation` simulados |
| `src/modules/acesso/destino-seguro.test.ts` | 34 | Os 8 casos do plano. Mais: as 10 rotas do painel aceitas, inclusive a consulta de filtros da fila; 15 entradas recusadas (`/entrar`, `/api/...`, `..`, `%2F%2F`, `#`, consulta com URL, quebra de linha, espaço, 3.000 caracteres); os padrões ancorados |
| `src/modules/acesso/verificacao.test.ts` | 18 | Pelo Better Auth real, com Testcontainers: CA-01.1; C-05 (sem cookie `trust_device`, e o novo login no mesmo pote de cookies pede o código); C-06 (rajada de 11, pares a cada 11 s, volta depois do minuto, 5 erros de IPs diferentes com o bloqueio da conta valendo de outro login, sem nada no console, 14 e 15 min, 4 erros sem bloqueio, acerto que zera, janela de 15 min, código de recuperação somando no bloqueio, sobreposição com o bloqueio do plugin); C-33 (código de recuperação de uso único, segredo cifrado); C-07 (sair apaga a linha de `session`, e o cookie antigo dá `nao_autenticado`); C-08 (15 min sem 2FA, eventos de ativação e desativação sem segredo nem e-mail, código errado na ativação sem evento); C-21 (`login_falhou` sem sentinela, e nada em login certo) |

O `verificacao.test.ts` falsifica só o `Date`, preso ao `relogioFixo` dos `Deps`. O Better Auth confere o TOTP e data a
sessão pelo `Date`, e o bloqueio usa o `Relogio`. Cada requisição sai de um IP fictício novo (192.0.2.0/24 e
203.0.113.0/24).

### Teste antes do código (visto falhando)

Primeira rodada, só com os testes escritos:

```
 FAIL  src/modules/acesso/destino-seguro.test.ts [ src/modules/acesso/destino-seguro.test.ts ]
Error: Cannot find module './destino-seguro' imported from .../destino-seguro.test.ts
 FAIL  src/modules/acesso/exigir-pessoa.test.ts [ src/modules/acesso/exigir-pessoa.test.ts ]
Error: Cannot find module '/src/modules/acesso/exigir-pessoa' imported from .../exigir-pessoa.test.ts
 FAIL  src/modules/acesso/verificacao.test.ts [ src/modules/acesso/verificacao.test.ts ]
Error: Cannot find module './exigir-pessoa' imported from .../verificacao.test.ts
 Test Files  3 failed (3)
```

Segunda rodada, com `exigirPessoa` e `destinoSeguro` prontos e os ganchos ainda ausentes. Falharam os 8 testes que
dependem dos ganchos:

```
 ❯ src/modules/acesso/verificacao.test.ts (16 tests | 8 failed)
   × C-05: trustDevice: true no corpo é ignorado ...        expected [ 'wsod.trust_device' ] to deeply equal []
   × C-06: 11ª tentativa de login no minuto ...             expected [ 401, 401, 401, 429, 429, … ] to deeply equal [ 401, 401, 401, 401, … ]
   × C-06: 5 códigos errados em 15 min ...                  expected 400 to be 429
   × C-06: 4 erros não bloqueiam ...                        expected undefined to match object { falhas: +0, bloqueadoAte: null }
   × C-06: código de recuperação errado ...                 expected 400 to be 429
   × C-08: ativar 2FA grava evento ...                      expected [] to have a length of 1 but got +0
   × C-08: código errado na ativação ...                    expected [] to deeply equal [ '2fa_ativado', '2fa_desativado' ]
   × C-21: login que falhou é registrado sem o e-mail       expected [ { level: 40, … } ] to deep equally contain ObjectContaining{…}
      Tests  8 failed | 66 passed (74)
```

Contraprova da regra do login: sem a `customRules`, os dois testes de C-06 do login falham. A rajada dá
`[401, 401, 401, 429, …]`, e os pares a cada 11 s dão `expected 401 to be 429`. Na suíte inteira sem a regra, foram
esses 2 que falharam, e os outros 723 passaram. Com a regra de volta, os dois passam.

### Resultado

- `pnpm test`: 38 arquivos; 725 testes passaram e 0 falharam (eram 649).
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.
- `git status`: modificado só `src/modules/acesso/auth.ts`; novos, os 7 arquivos da lista do plano.

A saída da suíte tem linhas `{"level":40,...,"evento":"login_falhou","atorTipo":"anonimo"}` e
`{"level":40,...,"evento":"better_auth"}` (ou `"level":50`). São os logins e códigos errados de propósito, só com nível, hora, evento e
tipo de ator.

### Desvios do plano

1. **`exigirPessoaNaPagina(caminhoAtual, deps?)` e `exigirSessaoParaConfigurar2fa(deps?)`** ganharam um `deps`
   opcional. Ele só é passado no teste. Sem ele, a página monta o próprio Better Auth na primeira chamada, como a rota
   `[...all]` da T08, porque o `obterDeps` só chega na T11. É o que permite testar os redirecionamentos sem banco nem
   ambiente.
2. **`PAPEIS` e `AtorPessoa` ficam locais em `exigir-pessoa.ts`**, no formato de G5, até a T10 criar `ator.ts`.
   `test/auth.ts` já faz o mesmo com `Papel` desde a T08. Criar `ator.ts` agora seria mexer num arquivo da T10.
3. **`rateLimit.customRules` para `/sign-in/email` (10 por 60 s).** A regra própria do Better Auth não garante RNF-12
   (ver Resumo, item 2). As opções que o teste C-06 (base) da T08 confere continuam iguais.
4. **O bloqueio de C-06 responde com `Response.json(..., { status: 429 })` no `before`, e não com
   `throw new APIError`.** Na primeira versão, com `throw`, o Better Auth escreveu a mensagem no stderr pelo logger
   padrão, fora do `log`. Isso fura a C-21: o texto não tinha dado pessoal, mas ia para o console. O teste do bloqueio
   agora confere que o console fica vazio.
5. **`exigirSessaoParaConfigurar2fa`** vai além de "sessão válida sem 2FA": com o 2FA já ativo, manda para `/demandas`;
   com papel inválido, para `/sem-permissao`; sem sessão ou com sessão vencida, para `/entrar?motivo=sessao`.
6. **`destinoSeguro` aceita uma consulta só com caracteres seguros** (`[A-Za-z0-9_\-.=&%+]`), para a volta a uma fila
   filtrada. `/entrar` e `/configurar-2fa` não entram em `ROTAS_DO_PAINEL`, porque não são destino depois do login.
7. **`test/sessao.ts` exporta mais que as duas interfaces do plano**: `novoIp`, `PoteDeCookies`, `postAuth`, `getAuth` e
   `codigoErrado`. As próximas tarefas que precisarem de sessão real usam os mesmos. `criarPessoa` gera o código com
   `relogioDoSistema`, que é a mesma hora que o Better Auth usa, com `Date` falso ou real.
8. **Há testes além do roteiro do plano**: os pares a cada 11 s, a volta depois do minuto, os 14 e 15 min, 4 erros com
   acerto, a janela, o código de recuperação somando no bloqueio, a sobreposição com o plugin, código errado na
   ativação, desativação e login certo sem `login_falhou`. Também os testes unitários dos adaptadores do painel.
9. **O evento de 2FA é um insert direto em `evento`** (`registrarEventoDe2fa`), como o plano manda até a T12.

## Decisões tomadas

- **Os dois bloqueios ficam ligados.** O do plugin é mais estrito fora da janela e igual em duração. Desligá-lo ou
  configurá-lo pediria ler a biblioteca fora dos arquivos rastreados. Mantê-lo não afrouxa C-06 nem contradiz o plano.
- **O 429 de bloqueio não soma falha.** Ele não confere código, e somar alongaria o bloqueio de quem só espera.
- **Os erros na ativação também contam para o bloqueio.** Assim, quem só conhece a senha inicial não tem tentativas
  livres para tomar a primeira configuração (C-08, 2.3 E).
- **O usuário da verificação vem do `before` e é guardado num `WeakMap` pela requisição** (`ctx.request ?? ctx.headers`).
  O `after` usa esse valor porque, no acerto, a sessão antiga já foi trocada.
- **A falha de verificação é registrada em transação, com `SELECT … FOR UPDATE`.** Duas falhas ao mesmo tempo não
  perdem contagem.
- **Não subi o banco de desenvolvimento**, porque todos os testes usam o Testcontainers.
- **Nesta volta, só a entrega foi regravada.** O código ficou o do commit 25f4fb4. A contraprova da `customRules` fica
  registrada pela suíte inteira sem a regra (2 falharam, 723 passaram). A rodada filtrada da volta anterior saiu da
  lista porque o filtro usava uma expressão regular com alternância. A primeira reconfirmação do `pnpm test` nesta
  volta teve a saída cortada no terminal, e por isso foi repetida inteira. Só a repetição está na lista.

## Pendências

- **T11:** trocar o `depsDaPagina` de `exigir-pessoa.ts` e o `obterAuth` da rota `[...all]` pelo `obterDeps`, numa
  instância só por processo. Hoje são duas instâncias do Better Auth. A da página só chama `getSession`, então os
  limites em memória não são afetados.
- **T10:** trocar `PAPEIS` e `AtorPessoa` locais de `exigir-pessoa.ts` pelo import de `ator.ts`.
- **T12:** trocar `registrarEventoDe2fa` de `auth.ts` por `registrarEvento`.
- **T37 (frontend) e `ux-ui-design`:** as respostas da verificação que a tela precisa tratar são:
  - 401 `INVALID_CODE`;
  - 429 `VERIFICACAO_BLOQUEADA` (C-06, 15 min);
  - 429 `ACCOUNT_TEMPORARILY_LOCKED` (plugin, 15 min);
  - 400 `TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE` (5 tentativas no mesmo login; o cookie é apagado e a pessoa volta ao
    passo 1);
  - 429 do limite por IP (3 em 10 s nas rotas `/two-factor/*`, regra do plugin).

  A 03 só tem "Muitas tentativas. Aguarde um minuto e tente de novo.", e falta texto para os 15 min de bloqueio. Quem
  decide o texto é a `ux-ui-design`.
- **10-documentacao:** registrar no manual técnico as duas camadas de bloqueio da verificação e a regra de 10 por 60 s
  do login.
- **Minor do `06-T08-qa-automacao.md`:** os dois testes de C-02 em `auth.test.ts` (o que não confere o status e o de
  `desativadoEm: null`) continuam como estão. `auth.test.ts` não está na lista de arquivos da T09, e a cobertura forte
  já existe em `auth-comportamento.test.ts`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -15` — último commit de8cdec (06-T08-testes)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --porcelain --ignored docs` — nenhuma saída
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/acesso/destino-seguro.test.ts src/modules/acesso/exigir-pessoa.test.ts src/modules/acesso/verificacao.test.ts` — 3 arquivos falharam (módulos não encontrados)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/acesso/destino-seguro.test.ts src/modules/acesso/exigir-pessoa.test.ts src/modules/acesso/verificacao.test.ts` — sem os ganchos: 8 falharam e 66 passaram
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/acesso/verificacao.test.ts -t SONDA` — sonda temporária: as respostas do plugin a 6 códigos errados (5 de 401, depois 400 `TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE`) e as regras de limite do plugin
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/acesso/verificacao.test.ts -t SONDA` — sonda temporária: 25 erros em 5 logins, com bloqueio do plugin no 10º por 15 min. A sonda saiu do arquivo depois
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — 1 erro no teste novo (`exigir-pessoa.test.ts:96`), corrigido
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/acesso` — 1 falhou (erro de conta de minutos no próprio teste, corrigido) e 111 passaram
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/acesso/verificacao.test.ts` — 18 de 18
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 38 arquivos, 725 de 725
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — ainda sem a `customRules`, porque a edição que a repunha falhou: 2 falharam (os mesmos da contraprova) e 723 passaram
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — com a regra de volta: 38 arquivos, 725 de 725
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — modificado `src/modules/acesso/auth.ts`; novos `bloqueio-verificacao.ts`, `destino-seguro.ts`, `destino-seguro.test.ts`, `exigir-pessoa.ts`, `exigir-pessoa.test.ts`, `verificacao.test.ts` e `test/sessao.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 1 arquivo rastreado, `auth.ts`, com 108 linhas a mais e 6 a menos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — reconfirmação desta volta: limpo, código no commit 25f4fb4
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -3` — 84f8057, 25f4fb4 e de8cdec
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 38 arquivos, 725 de 725

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno
