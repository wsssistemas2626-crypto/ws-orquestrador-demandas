---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T10-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G5 e T09 a T11), 06-T10-engenheiro-backend.md, 06-T09-tech-lead.md, 04-seguranca-aplicacao.md (seções 1 a 3 até C-15), commit 6feebe2 (código e testes da T10), src/db/schema/agentes.ts, src/db/schema/acesso.ts, src/db/privilegios.ts, src/lib/erros.ts, src/modules/acesso/exigir-pessoa.ts, src/modules/acesso/matriz.ts, src/modules/acesso/resolver-ator.ts, test/banco.ts]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T10: tipos de ator (G5), matriz de acesso com `autorizar` e `atoresProibidos`, tokens de serviço (criar,
validar, revogar) e `resolverAtor`. O commit 6feebe2 traz os 7 arquivos do plano. Também modifica `exigir-pessoa.ts`,
`test/sessao.ts` e `test/auth.ts`, como pediu a pendência do parecer 3 do `06-T09-tech-lead.md`.

**Resultado: aprovada.** Nenhum problema Critical ou Important. Os três pareceres abaixo são Minor e foram para
Pendências.

### Checklist da seção 12 do padrão técnico

| Item | Situação | Base |
|---|---|---|
| Faz o que o plano pede, nem mais nem menos; arquivos fora da tarefa não mudaram | Cumprido | Os 7 arquivos da lista do plano. As 3 modificações fora da lista são as que o `06-T09-tech-lead.md` mandou fazer na T10: trocam a declaração local pelo import, e o comportamento não muda (os 794 testes anteriores seguem verdes). Os desvios 1 a 6 da entrega são aceitos (ver Decisões) |
| Há teste para cada comportamento novo, e ele falharia sem o código | Cumprido | A rodada vermelha mostra os 3 arquivos sem módulo. A matriz é conferida, linha por linha, contra a tabela do plano reescrita no teste, e `autorizar` é testado em cada ação para cada agente e cada papel. O sistema é negado nas 19 ações. Ação, agente, papel e tipo desconhecidos são negados, inclusive `toString` e `__proto__`. Os tokens rodam no Postgres real com o papel `orquestrador_app` (`test/banco.ts`): formato, hash, revogação, transação desfeita e 11 formatos errados. O `resolverAtor` roda com o Better Auth real, com os 5 casos do plano e mais 9 |
| Nenhum segredo, valor de `.env` ou dado pessoal real | Cumprido | O token nasce no teste e não é fixo. Os nomes são "Pessoa Ficticia" e os sentinelas seguem o formato `SENTINELA-`. Há teste de que o 401 não traz o token nem o prefixo, e de que o 403 não traz id, nome, papel nem ação. Nenhum arquivo novo escreve log |
| Entrada externa validada com Zod; erro sem vazar detalhe | Cumprido | A T10 não cria rota. A entrada externa dela é o cabeçalho `Authorization` e o `Cookie`. O token passa por `^wsod_[A-Za-z0-9_-]{43}$` e o prefixo por `^[A-Za-z0-9_-]{8}$` antes do banco, e a consulta é parametrizada pelo Drizzle (C-17). Zod chega com o `rota()` da T11. Os erros são `ErroDominio` com texto fixo, e o 401 de token revogado é igual ao de token inventado |
| Banco: migration gerada, papel migrator, RLS e guarda | Não se aplica | Nenhuma migration. `token_servico` é da T04. O `UPDATE` grava só `revogado_em`, a única coluna que `privilegios.ts` libera, e o `RETURNING id` usa o `SELECT` que o app tem. Sem `tenant_id` |
| Nada duplica função que já existe | Cumprido, com 1 Minor | `AGENTES` é reexportado de `src/db/schema/agentes.ts`, sem nova declaração. `ehPapel` substitui o `papelValido` de `exigir-pessoa.ts`, e fica uma só. As três cópias de `Papel` saíram. Sobram os textos da 03 copiados em três arquivos (parecer 1) |
| Textos de interface em pt-BR; axe nas telas tocadas | Cumprido, com 1 Minor | Nenhuma tela. Os textos estão em pt-BR. "Token de serviço inválido ou revogado." não está na 03 (parecer 2) |
| Minor vai para Pendências; só Critical e Important bloqueiam | Cumprido | Os 3 pareceres são Minor e estão em Pendências |
| No PR: `/code-review`, correções, `/security-review` | Não se aplica nesta etapa | Fica com a `08-revisao` (G2 do plano) |

Rodei de novo `pnpm test` (45 arquivos, 842 de 842), `pnpm lint` e `pnpm typecheck` (limpos). O ramo está limpo.

### Conferência contra o plano e os controles

- **G5:** `ator.ts` tem os nomes e formatos de G5. `AGENTES` vem da fonte única do banco, como manda o comentário de
  `agentes.ts`.
- **Interfaces:** `ACOES` tem as 19 ações do plano, na ordem dele, e `autorizar`, `atoresProibidos`, `criarTokenServico`,
  `validarTokenServico` e `revogarTokenServico` têm a assinatura do plano. `MATRIZ` é `Readonly<Record<Acao, Linha>>` e
  `resolverAtor` recebe `Pick<Deps, 'db' | 'auth' | 'relogio'>`. Os dois são compatíveis com o uso que a T11 e a T13
  fazem.
- **C-09:** os 32 bytes vêm de `randomBytes`, o prefixo é `wsod_` e o banco guarda só o SHA-256. O token só vale em
  `Authorization: Bearer`; na query e em cookie dá 401. Cookie de sessão junto com `Authorization` dá 400
  `entrada_invalida` com o texto do plano. O `AtorAgente` leva `prefixoToken`, que a T12 grava no evento.
- **C-10:** cada agente cria só o seu artefato. Os quatro leem demanda, ESP, RSK e DEC, e nenhum lê histórico, texto
  bruto ou configuração. O teste confere todas as combinações, não só as do plano.
- **C-12:** `registrar_decisao` nega os quatro agentes e o sistema. Fora do HTTP também, porque `autorizar` é função
  pura sobre o ator. `alterar_agente` e `alterar_teto` são só de `cto`.
- **CA-02.3 e CA-02.5:** o token revogado ou inventado dá `null` e 401. O token em claro não aparece em nenhuma coluna,
  para os quatro agentes.
- **Matriz como dado (02, seção 6):** está congelada em dois níveis, e o teste prova que um `push` em tempo de execução
  não abre ação.

### Pareceres (todos Minor)

1. **`src/modules/acesso/matriz.ts:61` e `src/modules/acesso/resolver-ator.ts:17`: textos da 03 copiados de
   `src/modules/acesso/exigir-pessoa.ts:20-24`.**
   - Problema: "Sua conta não pode fazer esta ação..." está em `matriz.ts` e em `exigir-pessoa.ts`. "Sua sessão
     terminou..." está em `resolver-ator.ts` e em `exigir-pessoa.ts`.
   - Razão: G3.11 manda usar o texto da 03 por inteiro, e com duas cópias uma pode mudar sem a outra. O teste do 403
     confere o texto exato, mas o do 401 sem credencial confere só o código.
   - Não bloqueia porque hoje os textos são iguais. Quem tocar `src/modules/acesso/` de novo (a T11 já toca o acesso
     com o `obterDeps`) põe as mensagens de acesso num lugar só, exportado, e os três arquivos importam dele.
2. **`src/modules/acesso/resolver-ator.ts:18`: texto do 401 de token fora da 03.**
   - Problema: "Token de serviço inválido ou revogado." não está na 03.
   - Razão: G3.11. Não bloqueia porque o texto aparece só no corpo da API, para agente, e não em tela. A mensagem é uma
     só para token inválido, revogado ou inexistente, e não serve de oráculo (há teste).
   - Já está nas pendências da entrega, para a `ux-ui-design` confirmar.
3. **`src/modules/acesso/tokens-servico.ts:39-47`: a revogação por prefixo não diz quantos tokens saíram.**
   - Problema: `prefixo` não é único em `token_servico`. Se dois tokens tiverem os mesmos 8 caracteres (48 bits), os
     dois são revogados, e o retorno `boolean` não mostra isso.
   - Razão: o efeito é o lado seguro, e a colisão é improvável com poucos tokens. Mas quem roda o script da T33 deve
     saber o que revogou, para criar de novo o token do outro agente.
   - Vai para a T33: o script confere, antes de revogar, quantos tokens ativos têm o prefixo e mostra o agente de cada
     um. Também vai para a `10-documentacao`, no runbook de revogação. A interface do plano não muda.

## Decisões tomadas

- **Aprovada sem devolução:** nenhum parecer é Critical ou Important. Cada controle da T10 (C-09, C-10, C-12, CA-02.3,
  CA-02.5) tem teste contra o banco ou o Better Auth reais.
- **Os desvios 1 a 6 da entrega são aceitos:**
  - (1) as três modificações fora da lista cumprem a pendência da T09 e não mudam comportamento;
  - (2) o `Pick<Deps>` aceita quem passa `Deps` inteiro;
  - (3) `ehPapel` em `ator.ts` tira uma duplicação, em vez de criar uma;
  - (4) a mensagem própria do 401 de token fica com o parecer 2;
  - (5) qualquer esquema de `Authorization` junto com o cookie de sessão dá 400, o que é mais restritivo que C-09 e tem
    teste;
  - (6) os testes a mais não mudam o comportamento.
- **Os nomes de cookie fixos em `resolver-ator.ts:11` não são problema:** o teste de cookie com Bearer usa o cookie
  real do Better Auth (`criarPessoa`). Se o `cookiePrefix` de `auth.ts` mudar, o teste deixa de dar 400 e quebra.
- **O ator `sistema` negado em toda ação está certo:** o plano diz que as mudanças automáticas usam funções internas
  que não chamam `autorizar`.
- **Sem índice em `token_servico.prefixo`:** a tabela tem poucos tokens e a revogação é rara. Se o volume crescer, o
  pedido é para o `engenheiro-dados-bd`.

## Pendências

- **T11, ou o próximo que tocar `src/modules/acesso/`:** juntar as mensagens de acesso da 03 num lugar só, exportado,
  usado por `exigir-pessoa.ts`, `matriz.ts` e `resolver-ator.ts` (parecer 1).
- **`ux-ui-design`, antes da T37:** confirmar o texto do 401 de token de serviço (parecer 2). Ele entra na mesma lista
  dos textos de bloqueio que vieram da T09.
- **T33:** antes de revogar, o script mostra quantos tokens ativos têm o prefixo e o agente de cada um (parecer 3).
- **10-documentacao:** no runbook de revogação de token, avisar que a revogação é por prefixo e pode atingir mais de um
  token (parecer 3).
- **Seguem as da entrega:** na T11, `rota()` chama `resolverAtor` e depois `autorizar`; na T12, o evento do agente leva
  `prefixoToken`; na T13, o teste transversal usa `atoresProibidos`. O tipo literal de `user.papel` em
  `src/db/schema/acesso.ts:21` ainda não vem de `PAPEIS`; isso é do `engenheiro-dados-bd` e é Minor.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 6feebe2893577fc991c65704e00a99ebef035422` — 12 arquivos: os 7 da T10, 3 modificados pela pendência da T09, a entrega e o registro
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 6feebe2893577fc991c65704e00a99ebef035422 -- src test` — diff do código e dos testes
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 45 arquivos, 842 de 842
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
