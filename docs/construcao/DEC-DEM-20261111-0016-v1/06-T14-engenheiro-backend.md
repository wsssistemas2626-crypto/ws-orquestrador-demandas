---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T14-construcao
agente: engenheiro-backend
leu: [contrato-passagem.md, pedido.json, padrao-tecnico.md, tarefas.json, 05-tech-lead.md, docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (G1 a G8, T13, T14 e T15), 01-analista-requisitos.md (glossário, RF-01 e RF-02), 04-seguranca-aplicacao.md (seção 2 e controles IN-01 a IN-18), 06-T13-engenheiro-backend.md, 06-T13-qa-automacao.md, 06-T05-qa-automacao.md (linhas 60 a 116), parada-P2.md, scripts/criar-token-servico.ts, scripts/revogar-token-servico.ts, scripts/lib/argumentos.ts, scripts/lib/saida.ts, scripts/scripts.test.ts, src/modules/acesso/tokens-servico.ts, src/modules/acesso/ator.ts, src/modules/historico/registrar.ts, src/lib/log.ts, src/lib/erros.ts, src/db/schema/acesso.ts, src/db/schema/historico.ts, test/sentinelas.ts, test/estatico/sem-controle-bidi.test.ts, README.md (linhas 1 a 5), CHANGELOG.md (linhas 1 a 5), a saída do pnpm test]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T14: emissão, troca e revogação dos tokens de integração pelos scripts (RF-02, IN-04, IN-12, IN-18 parte verificável
D-20, CA-02.1 a CA-02.6). Nenhum token real foi emitido: todos os tokens nasceram em tempo de teste, em banco de teste
(Testcontainers), e não aparecem nesta entrega, em arquivo, em log nem em mensagem de `expect`.

### Conferência antes de começar

A T14 toca `scripts/criar-token-servico.ts`, `scripts/revogar-token-servico.ts` (só comentário),
`scripts/token-integracao.test.ts` (novo) e `test/estatico/docs-sem-token.test.ts` (novo). Todos ficam em `scripts/` e
`test/`, dentro da minha lista Pode. Não houve motivo para devolver ao plano. Nenhum outro arquivo mudou.

### Pendências das entregas 06-T01 a 06-T13 que citam a T14

A busca foi `git log -S T14` e `git log -G T14` na pasta do pedido. Citam a T14: 05-tech-lead (plano), parada-P2,
06-T05-testes, 06-T13-construcao e 06-T13-testes.

| De onde | O que diz | Como ficou |
|---|---|---|
| 06-T13-testes, Pendências | o RNF-05 de `token_criado` e `token_revogado` de integração (`depois = { integracao, prefixo }`, sem o texto do token) fica com o CA-02.1 e o CA-02.6 | **Feito.** `token-integracao.test.ts` confere a linha inteira do evento (ator `sistema`, `entidade_id` = prefixo, `antes` nulo, `depois` exato `{ integracao, prefixo }` no `token_criado` e `{ prefixo }` no `token_revogado`) e, em todo teste, que nem o texto do token depois do prefixo nem `wsod_` aparecem em log ou em qualquer evento |
| 06-T05-testes, Decisões | o 401 de token revogado é do RF-01 (T03 e T14) | **Feito pelo lado dos scripts:** depois da revogação pelo script, `validarTokenServico` devolve `null` (o 401 do `resolver-ator`), e os outros tokens (a outra integração e um agente) seguem valendo (CA-01.4). O 401 pela rota já está em `saidas-das-integracoes-qa.test.ts` (06-T13-testes) |
| 06-T13-construcao | só cita a T14 ao ler o plano | nada a fazer |
| parada-P2, 05-tech-lead | a T14 é de risco alto (emissão de credencial) | sem pendência própria |

### Arquivos

| Arquivo | O que mudou |
|---|---|
| `scripts/criar-token-servico.ts` | `--integracao awave\|construir` ao lado de `--agente`, exatamente um dos dois (strictObject + regra nos dois campos); `criarTokenDeIntegracaoPorScript` novo; um `emitir` interno com `switch` por dono (agente ou integração) e `never`; o cabeçalho com o uso novo e a troca (P-04) |
| `scripts/revogar-token-servico.ts` | só comentário: vale para os dois tipos e descreve a troca (emitir o novo, trocar no cliente, revogar o antigo; a cada 12 meses ou já em suspeita) |
| `scripts/token-integracao.test.ts` (novo) | 8 testes (banco real, relógio fixo, saída falsa) |
| `test/estatico/docs-sem-token.test.ts` (novo) | guarda do IN-18 (D-20): nenhum valor de token em `docs/**/*.md`, `CHANGELOG.md` e `README.md` |

O comportamento de `--agente` não mudou: mesma saída, mesmo evento `{ agente, prefixo }`, mesma linha de log
`{ evento, atorTipo, agente }`. `criarTokenPorScript(deps, agente, saida)` manteve a assinatura. `scripts/scripts.test.ts`
passou sem mudança.

Saída do script para integração (o token é a segunda linha, mostrada uma vez):
"Token criado para a integração awave (prefixo …)." + "Token, mostrado só esta vez: …" + "Guarde o token agora, só no
cofre de segredos de quem o usa. Para revogar, use o prefixo."

### Testes criados

`scripts/token-integracao.test.ts`. Toda conferência que envolve o token é por booleano com rótulo (ex.: `'texto do
token no log'`), para uma falha não imprimir o valor (G3.3).
1. **CA-02.1** e **CA-02.2** (`it.each` sobre `INTEGRACOES`): `executarCriarToken(['--integracao', x])` → 0; o token
   aparece uma vez na saída, com o texto exato; a linha de `token_servico` é exatamente `{ agente: null, integracao,
   hash: SHA-256 do token, prefixo, revogado_em: null, criado_em }`; o `token_criado` é a linha inteira esperada, com
   `depois = { integracao, prefixo }`; o log tem uma linha só, `{ evento: 'token_criado', atorTipo: 'sistema' }`, sem o
   prefixo; o token resolve como `integracao` (nunca agente).
2. **Argumentos:** `--integracao awave`, `--integracao=construir` e `--agente risco` são lidos; nenhum dos dois e os dois
   juntos são recusados com "Corrija os argumentos: --agente, --integracao." e a regra "Informe exatamente um entre
   --agente e --integracao." nos campos.
3. **CA-02.3:** `jarvis`, `AWAVE`, vazio, agente e integração juntos (nas duas ordens), nenhum, `--token` sozinho e com
   integração, `--senha` → `entrada_invalida`, saída vazia, nenhum sentinela no erro; chamada direta com `jarvis` também;
   nenhuma linha em `token_servico`, nenhum evento, nenhuma linha `token_*` no log.
4. **CA-02.4:** revogar o `awave` pelo prefixo → 0 e o texto exato; o token deixa de valer; `token_revogado` exato;
   `revogado_em` gravado; o `construir` e um token de agente continuam valendo (CA-01.4); de novo → 1, "Nada foi
   alterado", sem evento novo; a saída da revogação não tem o texto de nenhum token.
5. **CA-02.5** (`it.each` sobre `INTEGRACOES`): troca. O antigo e o novo valem juntos até a revogação; depois, só o novo.
   As duas linhas do banco e as três linhas de log conferidas.
6. **Regressão `--agente`:** saída, linha (`integracao` nula), evento `{ agente, prefixo }`, log com o agente e o ator
   resolvido como agente.
7. **CA-02.6** em todos os testes que emitem (`conferirSemToken`): nem o texto do token depois do prefixo, nem `wsod_`, no
   log do teste e em **todos** os eventos do banco.

`test/estatico/docs-sem-token.test.ts`: a varredura enxerga `docs/` (mais de 5 arquivos, `CHANGELOG.md`, `README.md` e
`docs/manual-tecnico/`); a regex reprova um token plantado, montado por código (nunca digitado), e aceita o prefixo, o
nome `wsod_` e um valor curto; um `it` por arquivo. O achado sai como `arquivo:linha`, sem o valor.

### Teste antes do código

`pnpm --dir … test scripts/token-integracao.test.ts test/estatico/docs-sem-token.test.ts`, antes de mudar os scripts:
```
 ❯ scripts/token-integracao.test.ts (8 tests | 7 failed) 345ms
     × CA-02.1 e CA-02.2: --integracao awave sai com 0, mostra o token uma vez e grava só o hash e o prefixo
     × CA-02.1 e CA-02.2: --integracao construir sai com 0, …
     × argumentos: --integracao awave ou construir; os dois juntos ou nenhum são recusados
     × CA-02.3: … → erro de argumento e nada gravado
     × CA-02.4: revogar pelo prefixo sai com 0, …
     × CA-02.5: troca do token awave: …
     × CA-02.5: troca do token construir: …
ErroDominio: entrada_invalida
 ❯ lerArgumentos scripts/lib/argumentos.ts:41:11
 ❯ executarCriarToken scripts/criar-token-servico.ts:50:22
TypeError: criarTokenDeIntegracaoPorScript is not a function
 Test Files  1 failed | 1 passed (2)
      Tests  7 failed | 400 passed (407)
```
O único teste da T14 que passou antes foi a regressão de `--agente`, como deve. `docs-sem-token.test.ts` é **teste de
guarda** (G3.1): passou de primeira porque a documentação de hoje não tem token. A prova de que ele pega o vazamento é o
caso do token plantado, que reprova.

### Resultado

- T14 e `scripts.test.ts` juntos: 3 de 3 arquivos, 455 de 455 testes.
- `pnpm test` (suíte inteira): **279 de 279 arquivos e 6210 de 6210 testes**, 0 falharam, em 205 s. Na 06-T13-testes eram
  277 arquivos e 5803 testes. Entraram 2 arquivos e 407 testes: 8 da T14 e 399 da varredura da documentação (um por
  arquivo, mais 2 de controle).
- `pnpm typecheck`: limpo. `pnpm lint`: limpo, depois de trocar uma desestruturação que deixava duas variáveis sem uso
  (dois avisos na primeira rodada).
- G4: o `git diff a9fd9b8 --stat` das superfícies congeladas, com `src/lib/rota.ts`, saiu vazio.
- `git status --short`: 2 alterados (`scripts/criar-token-servico.ts`, `scripts/revogar-token-servico.ts`) e 2 novos (os
  testes). Nenhum teste existente mudou, então o piso do D-17 não perdeu linha.

### Desvios do plano

1. **Log da emissão de integração sem o nome do dono.** O plano diz "o log leva só `{ evento, atorTipo }` e o nome do
   dono". `src/lib/log.ts` só aceita os campos de `CAMPOS_PERMITIDOS`, que tem `agente`, mas não `integracao`. Pôr o
   nome exigiria mudar a lista do log, que está fora da tarefa e é a barreira do C-21 e do IN-14 (nome da integração
   fora das linhas de log). A linha da integração fica `{ evento: 'token_criado', atorTipo: 'sistema' }`, e a de agente
   continua com `agente`. O teste confere as duas por igualdade exata.
2. **A regra "exatamente um" fica nos dois campos** (`superRefine` com `path` em `agente` e em `integracao`), e não num
   `refine` sem caminho, como no trecho do plano. Sem caminho, `lerArgumentos` montaria "Corrija os argumentos: --.". Com
   o caminho, a mensagem cita os dois argumentos, e a regra vai nos campos. `scripts/lib/argumentos.ts` não mudou.
3. **O teste da documentação tem dois casos a mais** que o trecho do plano: o token plantado (reprova) e o falso positivo
   (aceita), e o achado sai como `arquivo:linha`. Assim a guarda prova que funciona sem nenhum token no repositório, e a
   falha não reimprime o valor.

## Decisões tomadas

- `criarTokenPorScript(deps, agente, saida)` ficou com a assinatura de hoje, e entrou `criarTokenDeIntegracaoPorScript`,
  irmã, sobre um `emitir` interno: é o padrão D-02 do plano e mantém `scripts.test.ts` sem mudança.
- O ramo por dono é um `switch` com `never` (`porDono`), e não ternários soltos: segue o G3.4 e junta num lugar só o
  token, o `depois` do evento, a linha de log e o texto da saída.
- Troca = emitir o novo e revogar o antigo pelo prefixo, sem script novo. O RF-02 define assim, e o CA-02.5 prova que os
  dois valem juntos até a revogação. A periodicidade de 12 meses (P-04) está nos comentários dos dois scripts. O texto
  de operação fica com a `10-documentacao`.
- O teste nunca põe o token em `expect(...)` de valor: confere por booleano com rótulo. Um token de teste não é segredo
  real, mas o G3.3 pede que ele nunca chegue a mensagem de `expect`.
- O CA-02.6 é conferido em cada teste que emite, e não num teste final que dependeria dos anteriores (padrão técnico,
  seção 7: teste não depende de ordem).
- **Migration:** nenhuma. Para voltar a T14: restaurar os dois scripts pelo `git` e apagar os dois testes novos.

## Pendências

- Nenhuma bloqueia a T14.
- Para a `06-T14-revisao`: conferir os desvios 1 a 3. O 1 é o que mais pede atenção: se a revisão quiser o nome da
  integração na linha de log, é preciso pôr `integracao` em `CAMPOS_PERMITIDOS` (`src/lib/log.ts`), contra o IN-14. A
  minha recomendação é não pôr.
- Para a `10-documentacao` (IN-18): o `docs/operacao/` passa a ser varrido por `docs-sem-token.test.ts`. O texto pode
  citar o prefixo, `wsod_` e o formato, mas nunca um valor de token. O uso dos scripts está nos cabeçalhos:
  `pnpm tsx scripts/criar-token-servico.ts --integracao awave|construir` e
  `pnpm tsx scripts/revogar-token-servico.ts --prefixo <8 caracteres>`.
- Para Fabiano, depois do merge (G2): a emissão dos tokens de produção é dele, pelo script. Nada foi emitido fora do
  banco de teste.
- As caixas `- [ ]` da T14 no plano não foram marcadas, porque a 06 não edita `docs/` (G1). A marcação fica com o
  maestro.
- Glob e Grep não estavam disponíveis nesta sessão. Li tudo com Read e achei as entregas e os modelos com `git log -S` e
  `git log -G`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261111-0016-v1`, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -20` — HEAD em f8d0724 (06-T13-testes)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S T14 --name-only --oneline -- docs/construcao/DEC-DEM-20261111-0016-v1` — 06-T13 (construção e testes), 06-T05-testes, parada-P2, 05-tech-lead
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G T14 --format=%h%x20%s --name-only -- docs/construcao/DEC-DEM-20261111-0016-v1` — os mesmos arquivos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S globSync --format=%h --name-only -- test src scripts` — os testes estáticos que já usam `globSync` (modelo do novo)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/token-integracao.test.ts test/estatico/docs-sem-token.test.ts` — antes do código: 7 de 8 falharam na T14 (`entrada_invalida` em `--integracao`, `criarTokenDeIntegracaoPorScript is not a function`); a guarda da documentação passou
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/token-integracao.test.ts test/estatico/docs-sem-token.test.ts scripts/scripts.test.ts` — depois do código: 3 de 3 arquivos, 455 de 455
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — 0 erros e 2 avisos (variáveis sem uso no teste novo)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo, depois da correção
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 279 de 279 arquivos, 6210 de 6210 testes, 0 falharam (em segundo plano; saída lida com Read)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — 2 alterados e 2 novos, todos da tarefa
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff a9fd9b8 --stat -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/proxy.ts src/db/privilegios.ts next.config.ts 'drizzle/000[0-6]_*.sql' 'drizzle/meta/000[0-6]_snapshot.json' src/lib/rota.ts` — vazio (G4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -- scripts/revogar-token-servico.ts` — só as 4 linhas de comentário
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — `criar-token-servico.ts` (+86 −19 com o outro) e `revogar-token-servico.ts` (+4)

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega; a guarda da documentação está nomeada como teste de guarda, com a prova pelo token plantado)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real (tokens só gerados em tempo de teste, em banco de teste, nunca em constante, arquivo ou mensagem de `expect`; o token plantado do teste estático é montado por código)
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno (a T14 não cria rota, Server Action nem job; os argumentos dos scripts passam por `z.strictObject` e o erro cita só o nome do argumento, nunca o valor, conferido com sentinelas)
