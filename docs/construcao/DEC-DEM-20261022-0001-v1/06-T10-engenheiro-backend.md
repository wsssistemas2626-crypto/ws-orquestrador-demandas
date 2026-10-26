---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T10-construcao
agente: engenheiro-backend
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 05-tech-lead.md, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6 e T08 a T11), 06-T09-engenheiro-backend.md, 06-T09-tech-lead.md, 06-T09-qa-automacao.md, 01-analista-requisitos.md (RF-01 e RF-02), 03-ux-ui-design.md (seções 1 e 2.8), 04-seguranca-aplicacao.md (seções 1 a 3), src/db/schema/acesso.ts, src/db/schema/agentes.ts, src/db/schema/index.ts, src/db/index.ts, src/db/transacao.ts, src/db/privilegios.ts, src/lib/deps.ts, src/lib/erros.ts, src/modules/acesso/auth.ts, src/modules/acesso/exigir-pessoa.ts, src/modules/acesso/bloqueio-verificacao.ts, src/modules/acesso/bloqueio-verificacao.test.ts, test/auth.ts, test/deps.ts, test/banco.ts, test/sessao.ts, test/sentinelas.ts, .prettierrc]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

### Resumo

A T10 está pronta. Ela entrega os tipos de ator de G5, a matriz de acesso como dado com `autorizar` e
`atoresProibidos`, os tokens de serviço dos agentes (criar, validar e revogar) e o `resolverAtor`. Os 7 arquivos são os
do plano. Além deles, a pendência do parecer 3 do `06-T09-tech-lead.md` foi cumprida: as cópias de `PAPEIS`, `Papel` e
`AtorPessoa` em `exigir-pessoa.ts`, `test/sessao.ts` e `test/auth.ts` agora vêm do import de `ator.ts`.

A suíte foi de 794 para 842 testes, e todos passaram. Lint e typecheck estão limpos.

### Arquivos

| Arquivo | O que tem |
|---|---|
| `src/modules/acesso/ator.ts` (novo) | `AGENTES` e `Agente`, reexportados de `src/db/schema/agentes.ts` sem nova declaração. `PAPEIS`, `Papel`, `AtorPessoa`, `AtorAgente`, `AtorSistema` e `Ator`, como em G5. A guarda `ehPapel` |
| `src/modules/acesso/matriz.ts` (novo) | `ACOES` (19), `Acao` e `MATRIZ`, congelada com `Object.freeze` nas linhas e nas listas de agentes. `autorizar`, que lança `ErroDominio('sem_permissao')` com a mensagem da 03, seção 2.8. `atoresProibidos` |
| `src/modules/acesso/tokens-servico.ts` (novo) | `criarTokenServico(t, agente, relogio)`, `validarTokenServico(db, token)` e `revogarTokenServico(t, prefixo, relogio)` |
| `src/modules/acesso/resolver-ator.ts` (novo) | `resolverAtor(req, deps)` |
| `src/modules/acesso/exigir-pessoa.ts` (modificado) | Saíram as cópias locais de `PAPEIS`, `Papel`, `AtorPessoa` e `papelValido`. Entraram o import de `AtorPessoa` e `ehPapel` de `ator.ts`. O comportamento não mudou |
| `test/sessao.ts` (modificado) | `Papel` vem de `ator.ts` |
| `test/auth.ts` (modificado) | `Papel` vem de `ator.ts`, e não mais da coluna `user.papel` |

Regras implementadas:

- **`autorizar`** segue a tabela do plano. Pessoa passa nas ações `qualquer`; nas ações `cto`, só passa o papel `cto`.
  Agente passa só nas ações em que aparece na lista. O ator `sistema` não passa em nenhuma ação. Também são negados:
  - ação fora da lista, inclusive `toString` e `__proto__` (a busca só olha chave própria da matriz);
  - agente fora de `AGENTES`;
  - papel fora de `PAPEIS`;
  - tipo de ator desconhecido.
- **Token de serviço:**
  - É `'wsod_' + randomBytes(32).toString('base64url')`, com 48 caracteres.
  - O prefixo é formado pelos 8 caracteres depois de `wsod_`.
  - O banco guarda `hash` (SHA-256 em hex), `prefixo`, `agente` e `criado_em`, este pelo `Relogio`.
  - A validação recusa sem consultar o banco o que não casa com `^wsod_[A-Za-z0-9_-]{43}$`. Também recusa o valor que
    não é texto. O resto é buscado pelo hash, com `revogado_em is null`.
  - A revogação recusa sem consultar o banco o prefixo fora de `^[A-Za-z0-9_-]{8}$`. Ela faz `UPDATE` só de
    `revogado_em`, que é a única coluna com `UPDATE` para o papel do app em `privilegios.ts`, e só nas linhas ativas.
    Devolve `true` se revogou alguma.
- **`resolverAtor`:**
  - Há cookie de sessão (`wsod.session_token` ou `__Secure-wsod.session_token`) e cabeçalho `Authorization` de
    qualquer esquema: 400 `entrada_invalida`, "Use só uma forma de autenticação.".
  - Há `Authorization`: só `Bearer <token>` vale (o nome do esquema não diferencia maiúscula). Token inválido,
    revogado, inexistente ou de outro esquema: 401 `nao_autenticado`, com uma mensagem única que não diz qual dos casos
    foi.
  - Há só o cookie de sessão: a decisão é de `exigirPessoa(deps, req.headers)`.
  - Não há nenhum dos dois: 401 com a mensagem da 03.
  - A query nunca é lida, e outro cookie não autentica.

### Testes criados

| Arquivo | Testes | Cobre |
|---|---|---|
| `src/modules/acesso/matriz.test.ts` | 20 | Os 4 do plano: toda ação tem linha; C-12 em `registrar_decisao` para os quatro agentes e o sistema; C-10, em que cada agente cria só o seu artefato e nenhum lê histórico, texto bruto ou configuração; C-12, em que só `cto` liga agente e muda teto. Mais estes: a matriz é igual, linha por linha, à tabela do plano reescrita no teste; são 19 ações, sem linha a mais; a matriz é congelada, e um `push` na lista não abre `registrar_decisao`; `autorizar` é conferido em cada ação para cada agente e cada papel; o sistema é negado nas 19 ações; CA-02.2; ação, agente, papel e tipo de ator desconhecidos são negados; o erro vira 403 com a mensagem da 03, sem id, nome ou papel do ator; `atoresProibidos` em 4 casos e a coerência dele com `autorizar` em todas as ações |
| `src/modules/acesso/tokens-servico.test.ts` | 14 | Contra o Postgres real, com o papel do app. Formato, 32 bytes, prefixo e hash (C-09). CA-02.5: o token não aparece em claro em nenhuma coluna, para os quatro agentes. `criado_em` vem do relógio. 20 tokens distintos. Transação desfeita não grava. O token válido vira o ator do seu agente. Revogado, inventado ou nunca criado dá `null` (CA-02.3). Também dá `null` para 11 formatos errados (o próprio hash, o token sem prefixo, espaço, caixa trocada, 1 caractere a mais ou a menos, `=`, 10.000 caracteres) e para valor que não é texto. A revogação grava a hora do relógio sem tocar outro token. Revogar de novo dá `false` e não muda a data. Prefixo inexistente ou fora do formato dá `false`. Revogação em transação desfeita não vale |
| `src/modules/acesso/resolver-ator.test.ts` | 14 | Com o Better Auth e o banco reais. Os 5 do plano: Bearer válido vira agente; token na query dá 401; cookie e Bearer juntos dão 400 com a mensagem exata; Bearer inválido ou ausente dá 401; o cookie de pessoa passa por `exigirPessoa`. Mais estes: esquema `bearer` em minúscula; `__Secure-` com Bearer dá 400; cookie com `Basic` dá 400; Bearer com cookies que não são de sessão continua agente; token em cookie dá 401; 8 formas de `Authorization` inválidas; Bearer revogado dá 401 (CA-02.3); o 401 do revogado é igual ao do inventado e não leva o token nem o prefixo; sessão sem 2FA dá 403 `sem_2fa`; cookie de sessão inventado dá 401 |

### Teste antes do código (visto falhando)

Primeira rodada, só com os três arquivos de teste escritos:

```
 FAIL  src/modules/acesso/matriz.test.ts [ src/modules/acesso/matriz.test.ts ]
Error: Cannot find module './ator' imported from .../src/modules/acesso/matriz.test.ts
 FAIL  src/modules/acesso/resolver-ator.test.ts [ src/modules/acesso/resolver-ator.test.ts ]
Error: Cannot find module './resolver-ator' imported from .../src/modules/acesso/resolver-ator.test.ts
 FAIL  src/modules/acesso/tokens-servico.test.ts [ src/modules/acesso/tokens-servico.test.ts ]
Error: Cannot find module './ator' imported from .../src/modules/acesso/tokens-servico.test.ts
 Test Files  3 failed (3)
      Tests  no tests
```

Com o código, os 3 arquivos passaram, com 48 de 48 testes.

### Resultado

- `pnpm test`: 45 arquivos; 842 testes passaram e 0 falharam (eram 794).
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo. A primeira rodada deu 2 erros de conversão de tipo no próprio `matriz.test.ts`, que foram
  corrigidos com um ajudante tipado.
- `git status`: modificados `src/modules/acesso/exigir-pessoa.ts`, `test/auth.ts` e `test/sessao.ts`; novos, os 7
  arquivos da lista do plano.

A saída da suíte tem linhas `{"level":40|50,...,"evento":"better_auth"}` e `{"level":40,...,"evento":"login_falhou","atorTipo":"anonimo"}`.
Elas vêm dos logins e códigos errados de propósito dos testes da T08 e da T09, e trazem só nível, hora, evento e tipo
de ator.

### Desvios do plano

1. **`exigir-pessoa.ts`, `test/sessao.ts` e `test/auth.ts` foram modificados**, embora o plano da T10 só liste
   arquivos a criar. Quem pediu foi o `06-T09-tech-lead.md` (parecer 3 e Pendências: "T10: trocar `PAPEIS`, `Papel` e
   `AtorPessoa` ... pelo import de `ator.ts`"). Sem a troca, a lista de papéis teria quatro definições que poderiam
   divergir. A mudança só troca a declaração local pelo import, e os 794 testes que já existiam seguem verdes.
2. **`resolverAtor(req, deps: Pick<Deps, 'db' | 'auth' | 'relogio'>)`** em vez de `Deps` inteiro. Quem tem `Deps`
   chama do mesmo jeito. Assim a função declara o que de fato usa, como `exigirPessoa` já faz com o seu `Pick`.
3. **`ehPapel` em `ator.ts`**, que não está nas interfaces do plano. É a mesma guarda que `exigir-pessoa.ts` tinha
   como `papelValido`, e agora `autorizar` também a usa. Fica uma só.
4. **A mensagem do 401 de token** é "Token de serviço inválido ou revogado.". A 03 só tem o texto de sessão de pessoa
   ("Sua sessão terminou..."), que não serve para agente. A mensagem é uma só para os três casos (inválido, revogado,
   inexistente) e não diz qual foi. O 401 sem nenhuma credencial usa o texto da 03.
5. **`Authorization` de qualquer esquema junto com o cookie de sessão dá 400**, e não só `Bearer`. Com dois cabeçalhos
   de credencial, o ator é ambíguo do mesmo jeito (C-09).
6. **Testes além do roteiro do plano**, listados na tabela acima. Eles não mudam o comportamento pedido.

## Decisões tomadas

- **`AGENTES` reexportado, sem nova declaração:** o comentário de `src/db/schema/agentes.ts` manda assim, e a lista
  do `CHECK` do banco e a da matriz não podem divergir.
- **A matriz é congelada em dois níveis:** com isso ela é dado de fato (02, seção 6). Um código que tente abrir uma ação
  em tempo de execução quebra, e há teste disso.
- **Ação desconhecida é negada pela busca só em chave própria:** a busca simples em `MATRIZ[acao]` acharia `toString`
  pelo protótipo.
- **Formato conferido antes do banco, no token e no prefixo:** o lixo nem vira consulta, e a consulta é sempre
  parametrizada pelo Drizzle (C-17).
- **A busca do token é pelo hash único, não pelo prefixo:** a comparação é de hashes de mesmo tamanho, sem tempo de
  resposta que dependa de quanto do token está certo.
- **A revogação é por prefixo e devolve `true` se revogou ao menos um:** é a interface do plano. O script da T33 cita
  o prefixo. Dois tokens com o mesmo prefixo de 48 bits são improváveis, e se acontecer os dois saem, o que é o lado
  seguro.
- **O cookie de sessão é detectado pelo nome, sem consultar o Better Auth:** o plano pede assim. O nome segue o
  `cookiePrefix: 'wsod'` de `auth.ts`, com a forma `__Secure-` de produção. Um cookie de sessão inventado vai para
  `exigirPessoa`, que dá 401 (há teste).
- **Nenhum evento de criação ou revogação de token nesta tarefa:** `registrarEvento` é da T12, e o evento com o prefixo
  é do script da T33 (C-37).
- **Não subi o banco de desenvolvimento:** todos os testes usam o Testcontainers.

## Pendências

- **T11:** `rota()` chama `resolverAtor(req, deps)` e depois `autorizar(ator, op.acao)`, na ordem do plano. O 400 de
  credencial ambígua e o 401 já saem como `ErroDominio` e passam pelo `mapearErro`.
- **T12:** o evento do ator agente leva `agente` e `prefixoToken` de `AtorAgente`, nunca o token (C-09).
- **T13:** `atoresProibidos(acao)` está pronta para o teste transversal que percorre as rotas. Ela devolve os agentes e
  os papéis negados em cada ação.
- **T33:** o script de token usa `criarTokenServico` e `revogarTokenServico` dentro de `comTransacao` e grava o
  evento com o prefixo na mesma transação (C-37).
- **`ux-ui-design` (Minor):** confirmar o texto "Token de serviço inválido ou revogado." do 401 de agente. Ele não
  aparece em tela, só no corpo da API.
- **`src/db/schema/acesso.ts` (Minor, `engenheiro-dados-bd`):** a coluna `user.papel` ainda declara o tipo literal
  `'cto' | 'administradora'`. Ele bate com `PAPEIS`, mas não vem dele. Não troquei porque o esquema do banco é da área
  de dados.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -15` — último commit 2a03397 (06-T09-testes)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --diff-filter=A --name-only --format=` — lista dos arquivos do repositório, para achar os da T08 e da T09
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/acesso/matriz.test.ts src/modules/acesso/tokens-servico.test.ts src/modules/acesso/resolver-ator.test.ts` — 3 arquivos falharam (módulos não encontrados), nenhum teste rodou
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/acesso/matriz.test.ts src/modules/acesso/tokens-servico.test.ts src/modules/acesso/resolver-ator.test.ts` — 3 arquivos, 48 de 48
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — 2 erros de conversão de tipo em `matriz.test.ts`, corrigidos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 45 arquivos, 842 de 842
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — modificados `exigir-pessoa.ts`, `test/auth.ts` e `test/sessao.ts`; novos, os 7 arquivos da T10
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 3 arquivos rastreados, com 5 linhas a mais e 16 a menos

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno
