---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T10-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 05-tech-lead.md, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6 e T10), 01-analista-requisitos.md (RF-01 e RF-02), 04-seguranca-aplicacao.md (seções 1 a 3 até C-15), 06-T10-engenheiro-backend.md, 06-T10-tech-lead.md, 06-T09-qa-automacao.md, git show --stat 6feebe2, src/modules/acesso/ator.ts, src/modules/acesso/matriz.ts, src/modules/acesso/matriz.test.ts, src/modules/acesso/tokens-servico.ts, src/modules/acesso/tokens-servico.test.ts, src/modules/acesso/resolver-ator.ts, src/modules/acesso/resolver-ator.test.ts, src/modules/acesso/exigir-pessoa.ts, src/modules/acesso/auth.ts, src/modules/acesso/verificacao-qa.test.ts, src/db/schema/acesso.ts, src/db/index.ts, src/db/transacao.ts, src/lib/erros.ts, src/lib/log.ts, src/lib/relogio.ts, test/banco.ts, test/deps.ts, test/sessao.ts, test/sentinelas.ts, vitest.config.ts, eslint.config.mjs]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

### Resumo

O código e os testes da T10 estão no commit `6feebe2`. O `c8ac34b` é a revisão, que aprovou a tarefa. Os 48 testes do
engenheiro cobrem todos os itens do "Cobre" da T10. A matriz é conferida linha por linha contra a tabela do plano, e os
tokens e o `resolverAtor` rodam contra o Postgres e o Better Auth reais. Nenhuma asserção crítica é fraca.

Ficavam sem teste oito comportamentos que a entrega, a revisão ou o C-09 afirmam:

- O agente do worker, com `prefixoToken: null`, não registra decisão (C-12 fora do HTTP). O roteiro só usava agente
  com prefixo.
- A matriz resiste a poluição do protótipo e a escrita em tempo de execução: trocar, apagar ou acrescentar linha, mudar
  a regra de pessoa, esvaziar a lista de leitura compartilhada.
- O ator com forma misturada (agente com `papel: 'cto'`, sistema com papel ou agente) não ganha permissão.
- `atoresProibidos` falha fechada: ação desconhecida proíbe todos os agentes e os dois papéis.
- O erro de negação é um só para toda combinação. A `message` e a pilha do Error não levam id, nome, papel nem ação.
- A revogação sob concorrência: só uma vale, e a data é a dela. Ela grava só `revogado_em`. Com prefixo repetido, os
  dois tokens saem (parecer 3 da revisão).
- A recusa "sem consultar o banco" do token e do prefixo fora do formato, e a do `resolverAtor` sem consultar banco nem
  Better Auth quando a credencial é ambígua, ausente ou fora de `Bearer`. A entrega afirmava isso, mas não havia teste.
- O cookie de sessão achado pelo nome exato, em qualquer posição do cabeçalho. Também: `Authorization` repetido, a query
  ignorada mesmo com cookie de pessoa, os quatro agentes, as mensagens exatas dos dois 401 e o log sem token nem prefixo.

Acrescentei 39 testes em 3 arquivos novos e não mudei nenhum arquivo rastreado. A suíte foi de 842 para 881 testes e
passou nas duas rodadas. Não achei defeito no código, então não há nada a devolver.

### Critério da tarefa e teste que o cobre

O "Cobre" da T10 no plano é RF-02 (CA-02.3 e CA-02.5), C-09, C-10, C-12 (`autorizar` nega agente e sistema também fora
do HTTP, e há ações só de `cto`) e ADR-02 (uma `autorizar` só, sobre a matriz como dado).

| Critério | Arquivo | Teste |
|---|---|---|
| CA-02.3: token revogado ou inventado não vira ator | `src/modules/acesso/tokens-servico.test.ts` | `token válido vira ator agente; revogado ou inventado, null` e `CA-02.3: token no formato certo e nunca criado, null` (engenheiro) |
| CA-02.3: Bearer revogado dá 401, igual ao inventado, sem o token nem o prefixo | `src/modules/acesso/resolver-ator.test.ts` | `CA-02.3: Bearer revogado: 401` e `o 401 do Bearer não devolve o token nem diz se ele existiu` (engenheiro) |
| CA-02.3: revogado, inventado, de outro esquema e sem esquema dão o mesmo 401, só com código e a mensagem exata | `src/modules/acesso/resolver-ator-qa.test.ts` | `token revogado, inventado e de outro esquema: a mesma resposta, só com código e mensagem` (novo) |
| CA-02.3: depois da troca de token, o antigo não vale e o novo vale | `src/modules/acesso/tokens-servico-qa.test.ts` | `revogar o antigo e criar um novo: ...` e `dois tokens ativos do mesmo agente valem cada um, ...` (novos) |
| CA-02.5: o token não aparece em claro em nenhuma coluna, nos quatro agentes | `src/modules/acesso/tokens-servico.test.ts` | `token tem 32 bytes aleatórios com prefixo wsod_, e o banco guarda só o SHA-256` e `CA-02.5: em nenhuma coluna da tabela ...` (engenheiro) |
| C-09: 32 bytes, `wsod_`, prefixo, só SHA-256, `criado_em` pelo relógio, 20 tokens distintos, transação desfeita | `src/modules/acesso/tokens-servico.test.ts` | os 5 de `criarTokenServico` (engenheiro) |
| C-09: agente fora do `CHECK` não grava token | `src/modules/acesso/tokens-servico-qa.test.ts` | `o CHECK do banco recusa, e nada fica gravado` (novo) |
| C-09 e C-17: 11 formatos errados e valor que não é texto dão `null` | `src/modules/acesso/tokens-servico.test.ts` | `fora do formato: null, ...` e `valor que não é texto: null` (engenheiro) |
| C-09 e C-17: fora do formato, token e prefixo são recusados sem tocar o banco, com controle positivo | `src/modules/acesso/tokens-servico-qa.test.ts` | os 4 de `fora do formato, nem consulta o banco (C-17)` (novos) |
| C-09: revogação com a hora do relógio, sem tocar outro token, sem repetir, prefixo inexistente, transação desfeita | `src/modules/acesso/tokens-servico.test.ts` | os 4 de `revogarTokenServico` (engenheiro) |
| C-09: cinco revogações ao mesmo tempo, só uma `true`, com a data dela; a revogação grava só `revogado_em` | `src/modules/acesso/tokens-servico-qa.test.ts` | `cinco revogações do mesmo prefixo ao mesmo tempo: ...` e `agente, hash, prefixo, id e criado_em ficam como estavam` (novos) |
| C-09: prefixo repetido revoga os dois tokens ativos, e só eles (parecer 3) | `src/modules/acesso/tokens-servico-qa.test.ts` | `a revogação por prefixo tira todos os tokens ativos com esse prefixo, e só eles` (novo) |
| C-09: Bearer válido vira agente; `bearer` em minúscula; os quatro agentes, cada um com o seu prefixo | `src/modules/acesso/resolver-ator.test.ts`, `src/modules/acesso/resolver-ator-qa.test.ts` | `Bearer válido → agente`, `o nome do esquema Bearer não diferencia maiúscula` (engenheiro); `cada token vira o seu agente, com o seu prefixo` (novo) |
| C-09: token na query ou em cookie dá 401 | `src/modules/acesso/resolver-ator.test.ts` | `token na query não autentica: 401` e `token em cookie não autentica: 401` (engenheiro) |
| C-09: a query nunca é lida, nem com cookie de pessoa; sem credencial, só query ou cookie que não é sessão dão 401 sem tocar banco nem Better Auth | `src/modules/acesso/resolver-ator-qa.test.ts` | `cookie de pessoa com token e authorization na query continua pessoa, sem 400` e `sem credencial, só com a query, só com cookie que não é sessão: ...` (novos) |
| C-09: cookie de sessão e Bearer juntos dão 400 com a mensagem do plano; também `__Secure-` e outro esquema | `src/modules/acesso/resolver-ator.test.ts` | os 3 testes `cookie de sessão ... juntos: 400` (engenheiro) |
| C-09: o 400 sai antes de olhar o token ou a sessão, também com `Authorization` vazio | `src/modules/acesso/resolver-ator-qa.test.ts` | `cookie de sessão e Authorization juntos: 400 antes de olhar o token ou a sessão` (novo) |
| C-09: cookie de sessão pelo nome exato, em qualquer posição e com espaços; nome parecido não é sessão | `src/modules/acesso/resolver-ator-qa.test.ts` | `em qualquer posição e com espaços, junto com Bearer: 400` e `nome parecido não é sessão: com Bearer válido, continua agente` (novos) |
| C-09: Bearer inválido, 8 formas de `Authorization` erradas, nada: 401 | `src/modules/acesso/resolver-ator.test.ts` | `Bearer inválido: 401; sem nada: 401` (engenheiro) |
| C-09: fora de Bearer, tabulação, espaço duplo, sem `wsod_`, token gigante: 401 sem consultar o banco; `Authorization` repetido: 401 | `src/modules/acesso/resolver-ator-qa.test.ts` | `Authorization fora de Bearer ou com token fora do formato: ...`, o `controle` e `dois cabeçalhos Bearer viram um valor só, que não autentica: 401` (novos) |
| C-09: o log não leva token nem prefixo em nenhum caminho | `src/modules/acesso/resolver-ator-qa.test.ts` | `nenhum caminho do resolverAtor escreve token ou prefixo no log` (novo) |
| C-04 pelo `resolverAtor`: cookie de pessoa passa por `exigirPessoa`; sem 2FA 403; sessão inventada 401 | `src/modules/acesso/resolver-ator.test.ts` | os 3 últimos testes (engenheiro) |
| C-04 e parecer 1: o 401 sem credencial é igual ao de `exigirPessoa` sem sessão | `src/modules/acesso/resolver-ator-qa.test.ts` | `sem credencial: a mesma resposta de exigirPessoa sem sessão` (novo) |
| C-10: cada agente cria só o seu artefato; nenhum lê histórico, texto bruto, configuração ou teto | `src/modules/acesso/matriz.test.ts` | `C-10: cada agente cria só o seu artefato` e `autorizar segue a matriz em cada ação, para cada agente e cada papel` (engenheiro) |
| C-10: o agente do worker, sem prefixo, cria só o seu artefato | `src/modules/acesso/matriz-qa.test.ts` | `cria só o seu artefato, como o agente com token` (novo) |
| C-12: `registrar_decisao` nega os quatro agentes e o sistema; `alterar_agente` e `alterar_teto` só por `cto`; sistema negado nas 19 ações | `src/modules/acesso/matriz.test.ts` | `C-12: registrar_decisao nega ...`, `C-12: ligar agente e mudar teto só por cto` e `o ator sistema não passa em nenhuma ação` (engenheiro) |
| C-12 fora do HTTP: o agente do worker não registra decisão nem faz ação só de pessoa ou de `cto` | `src/modules/acesso/matriz-qa.test.ts` | `não registra decisão, não muda configuração, status, pedido nem lê dado só de pessoa` (novo) |
| C-12 e C-02: ator de forma misturada, nome de agente ou papel com caixa, espaço ou nome do protótipo, tipo em outra caixa: negado | `src/modules/acesso/matriz-qa.test.ts` | os 6 de `ator com forma misturada` (novos) |
| CA-02.2, no nível da função: agente não liga agente, não muda teto, status nem gera pedido | `src/modules/acesso/matriz.test.ts` | `CA-02.2: agente não liga agente, ...` (engenheiro) |
| ADR-02 e matriz como dado: 19 ações, linha a linha igual ao plano, congelada | `src/modules/acesso/matriz.test.ts` | os 4 primeiros de `matriz como dado (C-10, C-12)` (engenheiro) |
| Matriz como dado: protótipo poluído, linha trocada, apagada ou acrescentada, regra de pessoa e lista compartilhada não mudam a regra | `src/modules/acesso/matriz-qa.test.ts` | os 4 de `a matriz resiste a mudança em tempo de execução` (novos) |
| `atoresProibidos` (para a T13): coerente com `autorizar`; ação desconhecida proíbe todos; ações só de pessoa proíbem só os agentes | `src/modules/acesso/matriz.test.ts`, `src/modules/acesso/matriz-qa.test.ts` | os 5 de `atoresProibidos` (engenheiro); os 2 de `atoresProibidos falha fechada` (novos) |
| G3.11 e C-20: o erro de negação vira 403 com a mensagem da 03; é um só para toda combinação; `message` e pilha sem dado do ator | `src/modules/acesso/matriz.test.ts`, `src/modules/acesso/matriz-qa.test.ts` | `vira 403 com a mensagem da 03, sem dado do ator` (engenheiro); os 3 de `o erro de negação` (novos) |

Ficam fora da T10, porque o plano os põe em outra tarefa:

- CA-02.1 e CA-02.2 pela rota HTTP (o 403 de verdade em `PATCH /pacotes-decisao/:id/decisao` e nas outras): a T11,
  com `rota()`, e a T13, com o teste transversal que usa `atoresProibidos`.
- CA-02.4 e o evento com `agente` e `prefixoToken` (C-09, parte "o evento do ator agente"): a T12 e as rotas de artefato.
- O evento de criação e revogação do token (C-37): a T33.

### Testes acrescentados

1. `src/modules/acesso/matriz-qa.test.ts`, arquivo novo, com 17 testes unitários, sem banco e sem relógio. O teste de
   poluição apaga do `Object.prototype` a chave que pôs, num `finally`.
2. `src/modules/acesso/tokens-servico-qa.test.ts`, arquivo novo, com 10 testes contra o Postgres real, com o papel do
   app.
   - A hora vem sempre de `relogioFixo`, e cada teste cria os próprios tokens.
   - A concorrência dispara as cinco revogações com `Promise.all`. O resultado não depende de quem vence: a asserção é
     "só uma `true`, e a data gravada é a dela".
   - O "sem consultar o banco" usa um `Proxy` que lança em qualquer acesso, com um controle positivo que prova que ele
     lança quando a função chega ao banco.
   - A linha com prefixo repetido é posta pelo migrator, com hash de um texto `SENTINELA-`. Não é um token.
3. `src/modules/acesso/resolver-ator-qa.test.ts`, arquivo novo, com 12 testes com o Better Auth e o banco reais.
   - Segue o regime da `06-T09-testes`: só o `Date` é falso, preso ao relógio injetado. A sessão da pessoa nasce no
     mesmo instante em que cada teste roda.
   - As dependências que lançam provam que a recusa sai antes do banco e do Better Auth. Um erro delas viraria 500, e
     não o 400 ou 401 esperado.
   - O destino do log volta ao padrão em `afterEach`.

Todos os testes passaram na primeira rodada. Abaixo, por que cada teste novo de comportamento falharia sem o código da
T10:

- Com `MATRIZ[acao]` sem `hasOwnProperty`, a ação posta no protótipo passaria para o `cto` e para os agentes.
- Sem os dois `Object.freeze`, as escritas não lançariam, e a administradora passaria em `alterar_teto`.
- Sem `isNull(revogadoEm)` no `UPDATE`, as cinco revogações devolveriam `true`, e a data seria a da última.
- Com a regex conferida depois da consulta, os formatos errados chegariam ao `Proxy` e o teste teria erro em vez de
  `null`.
- Com a detecção do cookie por `includes('session_token')`, os nomes parecidos dariam 400.
- Com a checagem de ambiguidade depois do token, o 400 com dependências que lançam viraria 500.
- Se `resolver-ator.ts` mudar o texto do 401 sem credencial e `exigir-pessoa.ts` não mudar, o teste de igualdade quebra
  (parecer 1).

Não montei contraprova com o código alterado, porque `src/` fora de `*.test.ts` não está na minha lista Pode.

### Resultado

| Comando | Resultado |
|---|---|
| `pnpm test` (antes, linha de base) | 45 de 45 arquivos, 842 de 842 testes |
| `pnpm test` com os 3 arquivos novos | 3 de 3 arquivos, 39 de 39 |
| `pnpm lint` | limpo |
| `pnpm typecheck` | limpo |
| `pnpm test` (depois, 1ª rodada) | 48 de 48 arquivos, 881 de 881 testes, 0 falhas |
| `pnpm test src/modules/acesso` (para ver se algum teste do acesso é instável) | 17 de 17 arquivos, 268 de 268 |
| `pnpm test` (depois, 2ª rodada) | 48 de 48 arquivos, 881 de 881 testes, 0 falhas |
| `git status` | só os 3 arquivos de teste novos, sem arquivo rastreado modificado |
| `git diff --stat` | nenhuma saída |

A saída da suíte tem linhas `{"level":40|50,...,"evento":"better_auth"}` e
`{"level":40,...,"evento":"login_falhou","atorTipo":"anonimo"}`. São as mesmas da linha de base: vêm dos logins e
códigos errados de propósito da T08 e da T09, e trazem só nível, hora, evento e tipo de ator. Os arquivos novos não
acrescentam linha. O teste de log do `resolver-ator-qa.test.ts` captura a própria saída.

## Decisões tomadas

- **Arquivos novos, sem editar os do engenheiro:** assim o `git diff` prova que nenhum teste existente foi afrouxado.
  Os nomes com `-qa` seguem a `06-T09-testes`.
- **"Sem consultar o banco" com `Proxy` que lança:** é a única forma de provar a ordem (formato antes da consulta) sem
  mock do banco no caminho feliz. O caminho feliz segue no Postgres real.
- **Concorrência com resultado independente de quem vence:** com `READ COMMITTED`, o segundo `UPDATE` espera a trava
  da linha e reavalia `revogado_em is null`. Há sempre um vencedor só, e o teste não depende de ordem nem de tempo.
- **Prefixo repetido fixado como "os dois saem":** é o lado seguro que a entrega e a revisão aceitaram. Se a T33 ou a
  `08-revisao` mudarem a regra, o teste mostra onde.
- **`Authorization` vazio junto com o cookie de sessão fixado como 400:** é a consequência do desvio 5 aceito na
  revisão. Qualquer `Authorization` presente torna o ator ambíguo.
- **Só o `Date` falso no `resolver-ator-qa.test.ts`:** falsificar os timers travaria o `pg` e o `pg-boss`. É a mesma
  escolha da `06-T09-testes`.
- **Rodada extra só do diretório `src/modules/acesso`:** foi uma checagem rápida de instabilidade antes da 2ª rodada
  inteira. O resultado que vale é o das duas rodadas da suíte inteira.
- **Sem banco de desenvolvimento:** tudo roda no Testcontainers. Não subi o `docker-compose.dev.yml`, então não há nada
  para derrubar.

## Pendências

- Para a T13: o teste transversal pode usar `atoresProibidos` sem tratar ação desconhecida, porque ela já devolve todos
  os atores (falha fechada, com teste).
- Para a T11, junto com o parecer 1 da revisão: quando as mensagens de acesso forem para um lugar só, o teste
  `sem credencial: a mesma resposta de exigirPessoa sem sessão` continua valendo sem mudança.
- Para a T33 e a `10-documentacao`, sobre o parecer 3: o teste de prefixo repetido confirma que a revogação tira todos
  os tokens ativos com o prefixo, de qualquer agente. O script deve mostrar isso antes de revogar.
- Para a `08-reteste` (`seguranca-aplicacao`): o 401 de token tem o texto "Token de serviço inválido ou revogado.", que
  ainda falta confirmar na 03 (parecer 2). O teste fixa o texto exato. Se a `ux-ui-design` trocar o texto, o teste muda
  junto.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 6feebe2893577fc991c65704e00a99ebef035422` — 12 arquivos: os 7 da T10, 3 modificados pela pendência da T09, a entrega e o registro
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -6` — c8ac34b (revisão) e 6feebe2 (construção) no topo do ramo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — linha de base: 45 arquivos, 842 de 842
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/acesso/matriz-qa.test.ts src/modules/acesso/tokens-servico-qa.test.ts src/modules/acesso/resolver-ator-qa.test.ts` — 3 arquivos, 39 de 39
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 48 arquivos, 881 de 881
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/acesso` — 17 arquivos, 268 de 268
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — só os 3 arquivos de teste novos, sem rastreado modificado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — nenhuma saída
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 2ª rodada: 48 arquivos, 881 de 881

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
