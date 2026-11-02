---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T08-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6 e T47 e T08 e T09), 01-analista-requisitos.md (RF-01 e RNF-12), 04-seguranca-aplicacao.md (seção 2.3 e controles C-01 a C-40), 06-T08-engenheiro-backend.md, 06-T08-tech-lead.md, 06-T47-qa-automacao.md, git show --stat a643bc1, git show --stat 70227030, src/modules/acesso/auth.ts, src/modules/acesso/auth.test.ts, src/modules/acesso/two-factor-colunas.test.ts, src/lib/env.ts, src/lib/env.test.ts, src/app/api/auth/[...all]/route.ts, src/app/api/auth/[...all]/route.test.ts, src/db/schema/acesso.ts, test/auth.ts, test/deps.ts, test/deps.test.ts, test/banco.ts, test/sentinelas.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

### Resumo

Considerei os dois commits. O código e os testes da T08 estão no `a643bc1`. O `7022703` só tem a entrega e o
`passagens.jsonl`. Os testes do engenheiro cobrem todos os controles da tarefa, mas três deles conferem só as opções
do `auth` ou têm asserção fraca:

- O teste de C-02 não olha o status da resposta, e o de `desativadoEm` manda `null` para uma coluna que já é nula.
  Passaria mesmo se a rota aceitasse o campo.
- A cifra de C-33 compara a coluna só com o segredo em base32. O plugin cifra o segredo bruto. Se ele gravasse o bruto
  em claro, o teste passaria.
- As 8 h da sessão (C-07, RNF-12) e os 20 caracteres de senha só eram conferidos nas opções, nunca no comportamento.

Acrescentei 21 testes: 14 pelo comportamento das rotas do Better Auth, 4 de contraprova e 3 de `lerConfigApp`. A suíte
foi de 628 para 649, toda verde nas duas rodadas. Não achei defeito no código e não há nada a devolver.

### Critério da tarefa e teste que o cobre

O "Cobre" da T08 no plano é RF-01 (base), C-01, C-02, C-03, C-07, C-33 (segredo do boot e cifra do TOTP), RNF-12
(sessão de 8 h) e ADR-11, mais a configuração de `criarAuth` e as interfaces da tarefa.

| Critério | Arquivo | Teste |
|---|---|---|
| C-01 e RF-01 (sem cadastro público): `sign-up/email` responde fora de 2xx e não cria usuário | `src/modules/acesso/auth.test.ts` | `Better Auth fechado` > `C-01: sign-up/email não cria usuário` (engenheiro) |
| C-01: login social não cria usuário | `src/modules/acesso/auth-comportamento.test.ts` | `C-03: rotas fechadas não fazem nada, mesmo com sessão válida` > `login social não existe: nenhum provedor é aceito e nenhum usuário nasce` (novo) |
| C-02: a administradora não vira `cto` por `update-user` | `src/modules/acesso/auth.test.ts` | `C-02: ninguém promove o próprio papel por update-user` (engenheiro) |
| C-02, com controle positivo: a mesma sessão troca o nome (200); o pedido com `papel` dá 400 e não muda nada, nem o nome | `src/modules/acesso/auth-comportamento.test.ts` | `C-02: papel e desativação não entram por update-user` > `a mesma sessão troca o nome, mas o pedido com papel é recusado inteiro e nada muda` (novo) |
| C-02: `desativadoEm` com uma data de verdade no corpo dá 400 e a conta continua ativa | `src/modules/acesso/auth-comportamento.test.ts` | `... > desativadoEm com data no corpo não desativa a conta` (novo) |
| C-02: `papel` e `desativadoEm` com `input: false` nas opções | `src/modules/acesso/auth.test.ts` | `C-03: só os plugins previstos e nada de troca de e-mail, exclusão ou redefinição por e-mail` (engenheiro) |
| C-03: só os plugins `two-factor` e `next-cookies`; sem provedor social; `changeEmail` e `deleteUser` desligados; sem `sendResetPassword`; `trustedOrigins` só com a origem | `src/modules/acesso/auth.test.ts` | `C-03: só os plugins previstos ...` (engenheiro) |
| C-03: a redefinição por e-mail não gera token | `src/modules/acesso/auth.test.ts` | `C-03: pedir redefinição de senha por e-mail não gera token de redefinição` (engenheiro) |
| C-03: com sessão válida, a troca de e-mail é recusada (4xx) e o e-mail não muda | `src/modules/acesso/auth-comportamento.test.ts` | `C-03: rotas fechadas ...` > `troca de e-mail é recusada e o e-mail continua o mesmo` (novo) |
| C-03: com sessão válida, a exclusão da própria conta é recusada (4xx) e a conta continua | `src/modules/acesso/auth-comportamento.test.ts` | `... > exclusão da própria conta é recusada e a conta continua` (novo) |
| C-03: as rotas de magic link, OTP por e-mail, anônimo e `admin` dão 404 | `src/modules/acesso/auth-comportamento.test.ts` | `... > rota de plugin não previsto %s não existe (404)`, com 5 casos (novos) |
| C-03 (`trustedOrigins`): com cookie de sessão, origem de fora é recusada (403) e nada muda | `src/modules/acesso/auth.test.ts` | `C-03 (trustedOrigins): com cookie de sessão, origem fora da lista é recusada e nada muda` (engenheiro) |
| C-07: em produção, o cookie é `__Secure-wsod.session_token`, com HttpOnly, Secure e SameSite=Lax | `src/modules/acesso/auth.test.ts` | `C-07: cookie de sessão HttpOnly, Secure e SameSite=Lax ...` (engenheiro) |
| C-07: no desenvolvimento, o cookie é `wsod.session_token`, sem Secure | `src/modules/acesso/auth.test.ts` | `C-07: no desenvolvimento o cookie é wsod.session_token ...` (engenheiro) |
| C-07, RNF-12 e ADR-11: o cookie tem `Max-Age=28800`, e a linha de `session` vence 8 h depois de criada | `src/modules/acesso/auth-comportamento.test.ts` | `C-07 e RNF-12: sessão de 8 h fixa, sem renovação` > `o cookie e a linha da sessão valem 8 h a partir do login` (novo) |
| C-07, RNF-12 e ADR-11: usada aos 7h59, a sessão não ganha prazo (`disableSessionRefresh`); passadas as 8 h, `get-session` devolve `null` | `src/modules/acesso/auth-comportamento.test.ts` | `... > usada aos 7h59, a sessão não é renovada; passadas as 8 h, não vale mais` (novo) |
| C-33 (boot): segredo com menos de 32 bytes não sobe | `src/lib/env.test.ts` | `C-33: segredo com menos de 32 bytes não sobe` (engenheiro) |
| C-33 (boot): o tamanho é medido em bytes, não em caracteres | `src/lib/env.test.ts` | `lerConfigApp` > `C-33: o segredo é medido em bytes, não em caracteres` (novo) |
| C-33 (boot): a rota não lê o ambiente ao ser importada, e com segredo curto falha sem mostrar o valor | `src/app/api/auth/[...all]/route.test.ts` | os 2 testes de `rota /api/auth/[...all]` (engenheiro) |
| C-33 (cifra): a coluna não tem o segredo em base32 | `src/modules/acesso/auth.test.ts` | `C-33: segredo TOTP e códigos de recuperação não ficam em claro em two_factor` (engenheiro) |
| C-33 (cifra): a coluna não tem o segredo bruto em nenhuma forma (utf8, hex, base64, base32). Só abre com o `BETTER_AUTH_SECRET` da configuração, e com outra chave não dá o segredo. Os códigos de recuperação abrem na mesma lista que o plugin devolveu | `src/modules/acesso/auth-comportamento.test.ts` | `C-33: segredo TOTP e códigos de recuperação cifrados com o BETTER_AUTH_SECRET` > `a coluna não tem o segredo em claro em nenhuma forma, e só abre com o segredo da configuração` (novo) |
| Configuração do plano: `minPasswordLength: 20`. A troca para 19 caracteres dá 400 e a senha antiga continua valendo; com 20, a troca passa | `src/modules/acesso/auth-comportamento.test.ts` | `senha com 20 caracteres ou mais (minPasswordLength)` > `troca para senha de 19 caracteres é recusada ...` (novo) |
| Configuração do plano: limite de 10 por 60 s, ligado fora de produção, IP só do cabeçalho configurado (a parte da T08 em C-06 e RNF-12) | `src/modules/acesso/auth.test.ts` | `C-06 (base): limite ligado também fora de produção ...` (engenheiro) |
| Desvio 4 (C-21): o logger do Better Auth vai ao `log`, sem e-mail nem senha | `src/modules/acesso/auth.test.ts` | os 2 testes de `C-21: log do Better Auth pela lista de permissão` (engenheiro) |
| Interface `lerConfigApp`: C-31 (retenção de 1 a 365, padrão 90), URL só `http` ou `https`, `NODE_ENV`, cabeçalho de IP e leitura de `process.env` | `src/lib/env.test.ts` | os testes `C-31: ...`, `devolve a configuração com os padrões`, `BETTER_AUTH_URL só com http ou https ...`, `produção só com NODE_ENV=production`, `C-06: cabeçalho do IP configurável ...` e `sem argumento lê process.env` (engenheiro) |
| Interface `lerConfigApp`: variável vazia conta como ausente | `src/lib/env.test.ts` | `lerConfigApp` > `variável vazia conta como ausente: a obrigatória falha e a opcional fica no padrão` (novo) |
| Interface `lerConfigApp`: o erro é `ErroConfiguracao`, traz só os nomes em ordem e não traz valor nem `cause` | `src/lib/env.test.ts` | `a mensagem de erro cita só o nome da variável` e `variável obrigatória ausente não sobe ...` (engenheiro); `lerConfigApp` > `erro de várias variáveis traz só os nomes, em ordem, sem nenhum dos valores` (novo) |
| Interfaces `CONFIG_TESTE` e `criarContaDeTeste` | `src/modules/acesso/auth.test.ts` | os 2 testes de `criarContaDeTeste` (engenheiro) |
| Interface `criarDepsDeTeste` | `test/deps.test.ts` | os 2 testes de `criarDepsDeTeste` (engenheiro) |

Ficam fora da T08, porque o plano os põe em outra tarefa:

- RF-01, CA-01.1 a CA-01.3: T09 e T11.
- C-02, "conta sem papel válido recebe 403": T09.
- C-06, o 429 na 11ª tentativa e o bloqueio da verificação: T09.
- C-07, "o cookie antigo recebe 401 depois de sair": T09.
- C-33, código de recuperação de uso único: T09.
- RNF-12, token de 32 bytes: T10.

### Testes acrescentados

1. `src/modules/acesso/auth-comportamento.test.ts`, arquivo novo, com 14 testes e banco próprio do Testcontainers.
   - Vai pelas rotas do Better Auth, com a instância de `criarAuth` e contas de `criarContaDeTeste`. Nenhuma linha é
     inserida à mão.
   - Só o `Date` é falso, fixado em `2026-10-22T12:00:00Z` (`vi.useFakeTimers({ toFake: ['Date'] })`) e reposto antes de
     cada teste. Os timers do driver do Postgres continuam reais. O teste das 8 h avança só o `Date`.
   - Cada requisição de login usa um IP fictício novo, de `198.51.100.100` em diante. Assim o limite por IP de um teste
     não afeta outro.
   - Está num arquivo separado porque a T09 vai mexer em `auth.test.ts`, e assim os dois não disputam o mesmo arquivo.
2. `src/modules/acesso/sonda-mutacao-qa.test.ts`, arquivo novo, com 4 testes de contraprova. Cada um monta a
   configuração da T08 com um ponto afrouxado e mostra que o comportamento exigido pelo arquivo 1 deixa de acontecer:
   - com `papel` em `input: true`, a promoção passa (200, `cto`);
   - com `minPasswordLength: 8`, a senha de 19 caracteres passa;
   - com a sessão padrão, o `Max-Age` não é 28800;
   - cifrado com outro segredo, a coluna não abre com o do `CONFIG_TESTE`.

   Isso prova que as asserções novas dependem do código da T08, e não de um padrão do Better Auth 1.7.6. Se uma
   versão nova mudar o padrão, este arquivo quebra e avisa.
3. `src/lib/env.test.ts`: 3 testes no fim do `describe('lerConfigApp')`. Os que já existiam não mudaram. O `git diff`
   mostra 39 linhas a mais e 1 linha trocada, que é o import, agora com `ErroConfiguracao`.

### O que os testes fixaram do Better Auth 1.7.6

- `update-user` com campo `input: false` recusa o pedido inteiro com 400, e nem o campo permitido é gravado.
- `change-email` e `delete-user` desligados respondem 4xx.
- As rotas de plugin não registrado respondem 404.
- O segredo TOTP gravado é o bruto (o base32 do `totpURI` decodificado), cifrado com o `BETTER_AUTH_SECRET` por
  `symmetricDecrypt` de `better-auth/crypto`. Os códigos de recuperação ficam como lista JSON cifrada.
- A linha de `session` nasce com `createdAt` do relógio do app, não com o `defaultNow()` do banco, e vence em
  `createdAt` + 8 h.

### Resultado

| Comando | Resultado |
|---|---|
| `pnpm test` (antes, linha de base) | 33 de 33 arquivos, 628 de 628 testes |
| `pnpm test src/modules/acesso/auth-comportamento.test.ts` | 14 de 14 |
| `pnpm test` com os 3 arquivos tocados | 3 arquivos, 30 de 30 |
| `pnpm test` (depois, 1ª rodada) | 35 de 35 arquivos, 649 de 649 testes, 0 falhas |
| `pnpm test` (depois, 2ª rodada, para ver se algum teste é instável) | 35 de 35 arquivos, 649 de 649 testes, 0 falhas |
| `pnpm lint` | limpo |
| `pnpm typecheck` | limpo |

A saída da suíte tem linhas `{"level":50|40,...,"evento":"better_auth"}`, só com nível, hora e evento:

- As duas com hora real vêm de `auth.test.ts`, como explica o parecer 1 do `06-T08-tech-lead.md`.
- As cinco com hora `1792670400000` (o `Date` fixo) vêm das recusas 4xx do arquivo novo.

## Decisões tomadas

- **Comportamento em vez de opções.** O risco da tarefa é alto, e ler `auth.options` não prova o que a rota faz. Por
  isso cada controle ganhou um teste pela rota, com controle positivo onde a recusa podia passar sem querer (C-02).
- **Contraprova em arquivo próprio.** Ela mostra que cada asserção nova falharia sem a configuração da T08. Esse é o
  item "falharia sem o código" da seção 12 do padrão, provado sem mexer em `src/` (fora da minha lista Pode).
- **O nome `sonda-mutacao-qa.test.ts` ficou.** O arquivo nasceu como sonda temporária. Apagar ou renomear exige
  `rm` ou `mv`, que não estão na minha lista Pode. Em vez de deixar uma sonda solta, transformei o arquivo em teste
  estável e documentado. O nome pode mudar numa etapa que tenha o comando (ver Pendências).
- **Só o `Date` falso.** O teste das 8 h precisa de tempo, e o relógio real o deixaria lento ou instável. Falsificar os
  timers travaria o `pg`. É a mesma escolha da `06-T47-testes`.
- **Um IP novo por requisição de login.** O limite em memória do Better Auth conta por IP e caminho, e o `Date` fixo
  nunca deixa a janela passar. Com IPs separados, os testes não dependem de ordem.
- **Testes do engenheiro sem edição.** As asserções fracas de C-02 em `auth.test.ts` ficaram como estão. A versão
  forte está no arquivo novo, e afrouxar ou reescrever teste existente não cabe nesta etapa.
- **Sem banco de desenvolvimento.** Tudo roda no Testcontainers. Não subi o `docker-compose.dev.yml`, então não há
  nada para derrubar.

## Pendências

- Minor, para o `tech-lead`: renomear `src/modules/acesso/sonda-mutacao-qa.test.ts` para
  `auth-contraprova.test.ts`, numa etapa que tenha `mv` ou `git mv`. O conteúdo não muda.
- Minor, para a T09 (`engenheiro-backend`), que vai mexer em `auth.test.ts`:
  - `C-02: ninguém promove o próprio papel por update-user` não confere o status.
  - `C-02: desativadoEm também não é campo de entrada` manda `desativadoEm: null`, que já é o valor da coluna, e
    passaria mesmo com o campo aceito.

  A cobertura forte está em `auth-comportamento.test.ts`. Se a T09 apertar esses dois, basta conferir o 400.
- Para a T09: o arquivo novo fixa que `update-user` com `papel` dá 400 e que a sessão vence em 8 h sem renovação. Se
  os ganchos `before` e `after` da T09 mudarem isso, estes testes acusam.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -25` — a643bc1 (T08), a93cd60 (T47), 7022703 (T08, volta 2) e 7b38d74 (revisão) no ramo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat a643bc1` — 12 arquivos da T08
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 70227030f52f2a969ec0de9af97dfb728313047e` — só a entrega e o `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 2f4e1e2` — localização do plano
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat --name-only 2f4e1e2` — caminho completo do plano
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — linha de base: 33 arquivos, 628 de 628
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/acesso/auth-comportamento.test.ts` — 14 de 14
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/acesso/sonda-mutacao-qa.test.ts` — sonda: 4 de 4, a configuração afrouxada quebra o comportamento exigido nos 4 pontos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib/env.test.ts src/modules/acesso/sonda-mutacao-qa.test.ts src/modules/acesso/auth-comportamento.test.ts` — 3 arquivos, 30 de 30
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 35 arquivos, 649 de 649
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 2ª rodada: 35 arquivos, 649 de 649
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — modificado `src/lib/env.test.ts`; novos `src/modules/acesso/auth-comportamento.test.ts` e `src/modules/acesso/sonda-mutacao-qa.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 1 arquivo rastreado, 39 linhas a mais e 1 trocada (o import)

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
