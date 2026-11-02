---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T08-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12), tarefas.json, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6 e T47 e T08), 06-T08-engenheiro-backend.md, commit a643bc1, commit 7022703, src/modules/acesso/auth.ts, src/modules/acesso/auth.test.ts, src/lib/env.ts, src/lib/env.test.ts, src/lib/log.ts, src/lib/deps.ts, src/app/api/auth/[...all]/route.ts, test/auth.ts, test/deps.ts, test/deps.test.ts]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

### Escopo revisado

A T08 inteira, nos dois commits:

- `a643bc1` (volta 1): todo o código e os testes da tarefa.
- `7022703` (volta 2): só a entrega e o `passagens.jsonl`. Nenhum arquivo de `src/` ou `test/` mudou.

Entre os dois commits, `git diff --stat a643bc1 7022703 -- src test` mostra só os arquivos da T47:
`src/db/schema/acesso.ts`, `src/db/schema/acesso.test.ts` e `src/modules/acesso/two-factor-colunas.test.ts`. Não há
nenhum arquivo da T08 nessa lista.

### Conferência contra o plano

| Item do plano | Onde está | Resultado |
|---|---|---|
| `ConfigApp` e `lerConfigApp`, com segredo ≥ 32 bytes e retenção de 1 a 365 (C-31, C-33) | `src/lib/env.ts:5-73` | Conforme. O segredo é medido em bytes (`Buffer.byteLength`). O erro cita só o nome da variável, e o `ZodError` não vai anexado. |
| `criarAuth` com a configuração do plano | `src/modules/acesso/auth.ts:20-66` | Conforme, item por item: `baseURL`, `secret` e `trustedOrigins`; o adaptador com as 5 tabelas; `disableSignUp` e `minPasswordLength: 20`, sem `sendResetPassword`; `papel` e `desativadoEm` com `input: false`; `changeEmail` e `deleteUser` desligados; sessão de 8 h sem renovação; `rateLimit` 10 por 60 s em memória; cabeçalho de IP, `useSecureCookies`, prefixo `wsod` e cookie HttpOnly e Lax; `twoFactor` com `skipVerificationOnEnable: false` e `nextCookies` |
| Rota `[...all]` sem ler ambiente no import, até a T11 trazer `obterDeps` | `src/app/api/auth/[...all]/route.ts:8-18` | Conforme. A instância nasce na primeira requisição. |
| `Deps` só como tipo (G5) | `src/lib/deps.ts:9` | Conforme, idêntico a G5 |
| `CONFIG_TESTE` e `criarContaDeTeste` pelo `internalAdapter`, com senha aleatória de 24 caracteres | `test/auth.ts:11-39` | Conforme. `randomBytes(18)` em base64url dá 24 caracteres. Os dados são fictícios (`exemplo.test`, "Pessoa Ficticia"). |
| `criarDepsDeTeste(banco, { relogio? })` com relógio fixo | `test/deps.ts:12-24` | Conforme. Sem `relogio`, usa o relógio fixo (RNF-15). |
| Testes do passo 1 (C-01, C-02, C-03, C-07 e `env`) | `auth.test.ts` e `env.test.ts` | Todos presentes. O C-01 filtra pelo e-mail (desvio 6), e o C-03 lê pelo tipo `BetterAuthOptions` (desvio 2). |
| Teste antes do código | entrega, "Teste antes do código" | Trecho da falha registrado: `Cannot find module './env'` e `'../../../test/auth'` |

### Julgamento dos desvios declarados

| # | Desvio | Parecer |
|---|---|---|
| 1 | `lerConfigApp(env: Record<string, string \| undefined> = process.env)` | **Aceito.** É compatível com o contrato do plano, porque `process.env` continua aceito. A causa (o `NODE_ENV` obrigatório nos tipos do Next) está escrita no código. |
| 2 | Testes leem `auth.options` como `BetterAuthOptions` | **Aceito.** Só muda o tipo. O teste prova a mesma coisa. |
| 3 | `disableOriginCheck: false` e `disableCSRFCheck: false` explícitos | **Aceito.** Reforça o C-03 e o C-15: sem eles, o teste rodaria com a conferência desligada (`NODE_ENV=test`) e não provaria o que vale em produção. O teste da origem recusada (`auth.test.ts:127-140`) depende disso. |
| 4 | `logger` do Better Auth ligado ao `log` (C-21) | **Aceito.** O logger padrão levaria mensagem, argumentos e SQL com parâmetros ao console, o que viola a C-21 e a G3.7. O `log` passa o erro por `reduzirErro` (`src/lib/log.ts:52-56`). Há dois testes: um com sentinelas no logger e outro com login que falha. |
| 5 | `createUser(..., { method: 'script' })` | **Aceito.** Exigência da API 1.7.6. Fica registrado para a T32. |
| 6 | O C-01 filtra pelo e-mail do pedido | **Aceito.** O e-mail é único no arquivo e não depende de ordem (RNF-15). |
| 7 | Testes além do plano | **Aceitos**: a rota, os `Deps`, a origem recusada, a cifra do TOTP e o logger. Cobrem comportamento que a própria tarefa produz e não invadem outra tarefa. |

### Pareceres por problema

Nada é Critical ou Important. Os três pontos abaixo são Minor e não bloqueiam (seção 12).

1. **`06-T08-engenheiro-backend.md:82-84`.** A entrega explica errado as duas linhas
   `{"level":50,...,"evento":"better_auth"}` no stdout da suíte.
   **Razão:** a entrega diz que elas vêm dos logins que falham no teste de C-21. Só que esse teste troca o destino do
   `log` antes das chamadas (`auth.test.ts:190`), e o pino escreve de forma síncrona no destino trocado. Então essas
   linhas são capturadas e não chegam ao stdout. As duas do stdout vêm de outra chamada que falha de propósito no
   mesmo arquivo, fora da captura (C-01, C-03 da redefinição ou a origem recusada). Não há vazamento: as linhas só têm
   `evento`. Corrigir só a explicação, quando a entrega for regravada; o código fica como está.
2. **`src/lib/env.ts:43` e `:70`.** `lerConfigApp` lê `NODE_ENV`, que não está na lista G6.
   **Razão:** o teste estático de C-27 (T13) confere quem lê cada variável. Se usar só a lista G6, vai recusar esta
   leitura. A leitura é legítima, porque define `producao` para o cookie `Secure` (C-07). A T13 precisa incluir
   `NODE_ENV` com `src/lib/env.ts` como único leitor.
3. **`src/modules/acesso/auth.ts:18-21`.** O parâmetro `relogio` é recebido e não é usado.
   **Razão:** o plano prevê esse parâmetro na assinatura, e o comentário diz que ele é para os ganchos da T09. Se a
   T09 não usar, sai da assinatura nela.

### Checklist da seção 12 do padrão técnico

- A tarefa faz o que o plano pede, e nenhum arquivo fora dela mudou. Os 12 arquivos de `a643bc1` são os da lista da
  T08, mais dois testes (`route.test.ts` e `test/deps.test.ts`). O `7022703` só tem a entrega.
- Cada comportamento novo tem teste que falharia sem o código. A falha inicial está registrada.
- Não há segredo nem dado real. O segredo de teste é fictício (`SEGREDO-FICTICIO-DE-TESTE-...`), as URLs de banco são
  fictícias, os e-mails são `.test` e os IPs são da faixa de documentação 198.51.100.0/24.
- O ambiente é validado com Zod, e o erro não vaza o valor (`env.test.ts:27-37` e `route.test.ts`).
- Banco: a T08 não tem migration. As colunas da `two_factor` vieram da T47, com migration gerada.
- Nada duplica função que já existe. O log usa `log` e `reduzirErro`, que já estavam no repositório.
- A tarefa não tem tela, então os itens de texto de interface e axe não se aplicam.
- Os pontos Minor estão em Pendências.
- O item do PR (`/code-review` e `/security-review`) é da `08-revisao` e não se aplica aqui.

### Verificação própria

- `pnpm test`: 33 arquivos, 628 de 628.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.

## Decisões tomadas

- Status `pronto`, porque não há problema Critical nem Important e o checklist da seção 12 está cumprido.
- Os desvios 1 a 7 foram aceitos. Cada um ou é exigência da versão 1.7.6 ou reforça um controle (C-03, C-15, C-21),
  sem afrouxar nada do plano.
- Revisei os dois commits juntos, como o maestro pediu, porque o código está em `a643bc1` e a volta 2 só regravou a
  entrega. Confirmei com `git diff --stat` que nenhum arquivo da T08 mudou entre os dois.
- A explicação errada das linhas no stdout não volta para o engenheiro. É texto da entrega, não código, e não há
  vazamento.

## Pendências

- Minor: corrigir a explicação das duas linhas no stdout da suíte em `06-T08-engenheiro-backend.md` (parecer 1).
  Isso não pede mudança de código.
- T13: incluir `NODE_ENV` no teste estático de C-27, com `src/lib/env.ts` como único leitor (parecer 2).
- T09:
  - Usar o `relogio` de `criarAuth` nos ganchos ou tirá-lo da assinatura (parecer 3).
  - Tratar a sobreposição entre o bloqueio próprio do plugin `twoFactor`, que agora tem as colunas da T47, e a C-06
    com a `bloqueio_verificacao`.
  - Decidir se o `/sign-in` tem limite próprio, mais estrito que 10 por minuto.
- T11 e T13: os testes de C-15 dependem de `disableOriginCheck: false` explícito. Quem mexer em `advanced` mantém os
  dois `false`.
- T32: `createUser` com `{ method: 'script' }`, como em `test/auth.ts:28-31`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 70227030f52f2a969ec0de9af97dfb728313047e` — só a entrega e o `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat a643bc1` — 12 arquivos da T08
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -25` — a643bc1 (T08), a93cd60 (T47) e 7022703 (T08, volta 2) no ramo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 2f4e1e2` — localização do plano
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show a643bc1 -- src test` — diff do código e dos testes da T08
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 33 arquivos, 628 de 628
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat a643bc1 7022703 -- src test` — só os 3 arquivos da T47

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
