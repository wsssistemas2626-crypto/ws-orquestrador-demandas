---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T09-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 05-tech-lead.md, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6 e T09), 01-analista-requisitos.md (RF-01), 06-T09-engenheiro-backend.md, 06-T09-tech-lead.md, 06-T08-qa-automacao.md, git show --stat 25f4fb4, git show --stat 526cff0, src/modules/acesso/auth.ts, src/modules/acesso/exigir-pessoa.ts, src/modules/acesso/exigir-pessoa.test.ts, src/modules/acesso/bloqueio-verificacao.ts, src/modules/acesso/destino-seguro.ts, src/modules/acesso/destino-seguro.test.ts, src/modules/acesso/verificacao.test.ts, src/db/schema/acesso.ts, src/db/index.ts, src/lib/erros.ts, src/lib/log.ts, test/sessao.ts, test/auth.ts, test/deps.ts, test/banco.ts, test/sentinelas.ts, vitest.config.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

### Resumo

Considerei os dois commits. O código e os testes da T09 estão no `25f4fb4`. O `526cff0` só regrava a entrega e o
`passagens.jsonl`. Os testes do engenheiro cobrem todos os itens do "Cobre" da T09 pela rota do Better Auth real, e
nenhum deles tem asserção fraca nos pontos críticos. Ficavam sem teste sete comportamentos que a entrega e a revisão
afirmam:

- `trustDevice` no código de recuperação (C-05). O plano manda forçar `false` nas duas rotas, e só a do TOTP tinha teste.
- O bloqueio de C-06 também na ativação do 2FA. É uma decisão da entrega, e não tinha teste.
- O 429 do bloqueio do plugin não soma falha em C-06. É outra decisão da entrega, sem teste.
- O bloqueio é por conta: uma conta bloqueada não atinge outra.
- A contagem sob concorrência (`SELECT … FOR UPDATE`) e os limites exatos de janela e de bloqueio, no módulo.
- O status que os erros de `exigirPessoa` dão pelo mapeador único: 401 em CA-01.3 e 403 em CA-01.2. Também a ordem das
  regras quando mais de uma falha.
- Os eventos de 2FA que não devem nascer: verificar o código no login e desativar com a senha errada.

Acrescentei 69 testes em 4 arquivos novos. Nenhum arquivo rastreado mudou. A suíte foi de 725 para 794 e passou nas
duas rodadas. Não achei defeito no código, e não há nada a devolver.

### Critério da tarefa e teste que o cobre

O "Cobre" da T09 no plano é RF-01 (CA-01.1 e CA-01.2), C-04 (a função), C-05, C-06, C-07 (sair apaga a sessão), C-08
(15 min sem 2FA e eventos de 2FA), C-21 (login falho sem e-mail), C-33 (código de recuperação de uso único) e C-40.
Os testes do plano para `exigirPessoa` também cobrem CA-01.3.

| Critério | Arquivo | Teste |
|---|---|---|
| CA-01.1: senha e código válidos dão sessão com 2FA, aceita por `exigirPessoa` | `src/modules/acesso/verificacao.test.ts` | `CA-01.1: senha e código válidos dão sessão com 2FA` (engenheiro) |
| CA-01.1, lado negativo: com 2FA ativo, só a senha não abre sessão, e `exigirPessoa` recusa | `src/modules/acesso/verificacao-qa.test.ts` | `CA-01.1: com 2FA ativo, só a senha não abre sessão e exigirPessoa recusa` (novo) |
| CA-01.2: sem 2FA dá `sem_2fa`, e a página manda para `/configurar-2fa` | `src/modules/acesso/exigir-pessoa.test.ts` | `CA-01.2: sem 2FA ativo → sem_2fa (403)` e `C-04: sem 2FA vai para /configurar-2fa` (engenheiro) |
| CA-01.2: o `sem_2fa` vira 403, só com o código e a mensagem da 03 | `src/modules/acesso/exigir-pessoa-qa.test.ts` | `CA-01.2: senha certa e sem 2FA → 403 sem_2fa` (novo) |
| CA-01.3: sem sessão dá `nao_autenticado`, que vira 401 só com código e mensagem | `src/modules/acesso/exigir-pessoa.test.ts`, `src/modules/acesso/exigir-pessoa-qa.test.ts` | `CA-01.3: sem sessão → nao_autenticado` (engenheiro); `CA-01.3: sem sessão → 401, só com o código e a mensagem` (novo) |
| C-04 (a função): ordem das regras e redirecionamentos das páginas | `src/modules/acesso/exigir-pessoa.test.ts` | os 11 de `exigirPessoa`, os 7 de `exigirPessoaNaPagina` e os 6 de `exigirSessaoParaConfigurar2fa` (engenheiro) |
| C-04: precedência quando mais de uma regra falha (desativada, depois sessão vencida, depois sem 2FA, depois papel) | `src/modules/acesso/exigir-pessoa-qa.test.ts` | os 3 de `exigirPessoa: ordem das regras` (novos) |
| C-04 e C-02: só `twoFactorEnabled === true` conta; papel com caixa trocada, vazio ou nulo dá `sem_permissao`; o ator devolvido não leva outro campo da sessão | `src/modules/acesso/exigir-pessoa-qa.test.ts` | os 11 de `exigirPessoa: leitura estrita da sessão` (novos) |
| C-02: papel inválido vira 403 `sem_permissao`; nenhum erro leva id, nome ou papel da sessão | `src/modules/acesso/exigir-pessoa-qa.test.ts` | `C-02: papel fora da lista → 403 sem_permissao` e os 4 de `... o erro e a resposta não levam id, nome, e-mail nem papel da sessão` (novos) |
| C-05: `trustDevice: true` ignorado no TOTP; o novo login pede o código | `src/modules/acesso/verificacao.test.ts` | `C-05: trustDevice: true no corpo é ignorado; novo login pede o código de novo` (engenheiro) |
| C-05: o mesmo no código de recuperação | `src/modules/acesso/verificacao-qa.test.ts` | `C-05: no código de recuperação, trustDevice: true também é ignorado` (novo) |
| C-06, login: 11ª tentativa no minuto dá 429, mesmo com `X-Forwarded-For` trocado, em rajada e em pares a cada 11 s, e volta depois do minuto | `src/modules/acesso/verificacao.test.ts` | os 3 testes `C-06: 11ª tentativa ...`, `C-06: em pares a cada 11 s ...` e `C-06: passado o minuto ...` (engenheiro) |
| C-06, login: o limite é por IP; no IP barrado nem a senha certa passa, de outro IP passa | `src/modules/acesso/verificacao-qa.test.ts` | `C-06: o limite do login é por IP; outro IP entra com a senha certa` (novo) |
| C-06, verificação: 5 erros em 15 min de IPs diferentes bloqueiam a conta por 15 min, também de outro login, com 14 e 15 min | `src/modules/acesso/verificacao.test.ts` | `C-06: 5 códigos errados em 15 min, de IPs diferentes, ...` (engenheiro) |
| C-06, verificação: 4 erros sem bloqueio, acerto que zera, janela de 15 min, código de recuperação somando e a sobreposição com o plugin | `src/modules/acesso/verificacao.test.ts` | os 4 testes `C-06: 4 erros ...`, `C-06: erros fora da janela ...`, `C-06 e o bloqueio próprio do plugin ...` e `C-06: código de recuperação errado ...` (engenheiro) |
| C-06 na ativação: 5 erros bloqueiam por 15 min, o 2FA não liga nem gera evento, e depois liga | `src/modules/acesso/verificacao-qa.test.ts` | `C-06 na ativação: 5 códigos errados bloqueiam por 15 min, e o 2FA não liga nem gera evento` (novo) |
| C-06: uma conta bloqueada não atinge outra no mesmo instante | `src/modules/acesso/verificacao-qa.test.ts`, `src/modules/acesso/bloqueio-verificacao.test.ts` | `C-06: o bloqueio de uma conta não atinge outra no mesmo instante`; `o bloqueio é por conta: ...` (novos) |
| C-06: o 429 do bloqueio do plugin não soma falha em C-06 | `src/modules/acesso/verificacao-qa.test.ts` | `C-06: o 429 do bloqueio do plugin não soma falha no bloqueio por conta` (novo) |
| C-06, módulo: valores de 5, 15 e 15 min; 5ª falha bloqueia e zera; limites exatos (1 ms antes e no instante) do bloqueio e da janela; janela nova depois do bloqueio; zerar sem encurtar bloqueio; zerar sem criar linha | `src/modules/acesso/bloqueio-verificacao.test.ts` | os 10 primeiros testes de `bloqueio da verificação (C-06)` (novos) |
| C-06, concorrência: 4 falhas ao mesmo tempo somam 4; 5 bloqueiam uma vez; 7 bloqueiam uma vez e deixam 2 na janela seguinte | `src/modules/acesso/bloqueio-verificacao.test.ts` | os 3 de `sob concorrência (SELECT … FOR UPDATE)` (novos) |
| C-07: sair apaga a linha de `session`, e o cookie antigo dá `nao_autenticado` | `src/modules/acesso/verificacao.test.ts` | `C-07: depois de sair, o cookie antigo não tem sessão` (engenheiro) |
| C-08: sessão sem 2FA vale 15 min (exatos) e só para configurar o 2FA | `src/modules/acesso/verificacao.test.ts`, `src/modules/acesso/exigir-pessoa.test.ts` | `C-08: sessão sem 2FA vale 15 min e só para configurar o 2FA`; os 3 `C-08` de `exigirPessoa` e os de `exigirSessaoParaConfigurar2fa` (engenheiro) |
| C-08: os 15 min também com `createdAt` em texto, e 15 min + 1 ms dá 401 | `src/modules/acesso/exigir-pessoa-qa.test.ts` | `C-08: createdAt em texto ISO ...` e `C-08: sessão sem 2FA com mais de 15 min → 401` (novos) |
| C-08: ativar e desativar gravam evento com ator pessoa, sem segredo nem e-mail; código errado na ativação não grava | `src/modules/acesso/verificacao.test.ts` | `C-08: ativar 2FA grava evento ...` e `C-08: código errado na ativação não grava evento; desativar grava` (engenheiro) |
| C-08: verificar o código no login não grava `2fa_ativado`; desativar com a senha errada não desliga nem grava | `src/modules/acesso/verificacao-qa.test.ts` | `C-08: verificar o código no login não grava 2fa_ativado` e `C-08: desativar com a senha errada ...` (novos) |
| C-21: login falho vai ao log sem o e-mail; login certo não registra; bloqueio sem nada no console | `src/modules/acesso/verificacao.test.ts` | os 2 `C-21` e a parte de console do teste de 5 erros (engenheiro) |
| C-21: códigos errados e o bloqueio não levam e-mail, id da conta nem segredo ao log | `src/modules/acesso/verificacao-qa.test.ts` | `C-21: códigos errados e o bloqueio não levam e-mail nem id da conta ao log` (novo) |
| C-33: código de recuperação de uso único; segredo TOTP não fica em claro | `src/modules/acesso/verificacao.test.ts` | os 2 `C-33` (engenheiro) |
| C-40: os 8 casos do plano, as 10 rotas do painel, 15 recusas e padrões ancorados | `src/modules/acesso/destino-seguro.test.ts` | os 34 de `destinoSeguro (C-40)` (engenheiro) |
| C-40, bordas: barra invertida codificada, caixa trocada, caractere de controle, prefixo trocado, versão com 5 dígitos ou sem dígito, fragmento, consulta com `/`, `\`, aspas ou `<`; valor que não é texto; limite exato de 2.048 caracteres; versões de 1 a 4 dígitos nas três rotas | `src/modules/acesso/destino-seguro-qa.test.ts` | os 25 de `destinoSeguro (C-40), bordas` (novos) |

Ficam fora da T09, porque o plano os põe em outra tarefa:

- CA-01.2 e CA-01.3 pela rota HTTP (o 403 e o 401 de verdade): a T11, com `rota()`, e a T13, com o teste transversal.
  Aqui está provado o código que `exigirPessoa` lança e o status que o mapeador dá a ele.
- CA-01.4 (cadastro inexistente): a T08 (C-01) e a T46.

### Testes acrescentados

1. `src/modules/acesso/verificacao-qa.test.ts`, arquivo novo, com 9 testes pelo Better Auth real e banco próprio do
   Testcontainers. Segue o mesmo regime do arquivo do engenheiro:
   - Só o `Date` é falso, preso ao `relogioFixo` dos `Deps` e reposto em `beforeEach`.
   - Cada requisição sai de um IP novo por `postAuth`. Onde o IP é fixo de propósito, ele é próprio do arquivo
     (`198.51.100.240` e `.241`).
   - Cada teste cria as próprias contas. O destino do log volta ao padrão em `afterEach`.
2. `src/modules/acesso/bloqueio-verificacao.test.ts`, arquivo novo, com 13 testes do módulo contra o Postgres real.
   - A hora é sempre passada como argumento, sem nenhum relógio.
   - As contas são criadas por `criarContaDeTeste`, sem `pg-boss`.
   - Os 3 de concorrência disparam as falhas com `Promise.all` no mesmo instante.
3. `src/modules/acesso/exigir-pessoa-qa.test.ts`, arquivo novo, com 22 testes unitários. Usam sessão falsa com id e nome
   sentinela, e o `mapearErro` da T03.
4. `src/modules/acesso/destino-seguro-qa.test.ts`, arquivo novo, com 25 testes unitários.

Todos passaram na primeira rodada. Por que cada teste novo de comportamento falharia sem o código da T09:

- Sem a regra `statusDe(devolvido) !== 429` do `after`, as 3 tentativas com o plugin bloqueado levariam C-06 de 2 para
  5 falhas, com `bloqueadoAte` gravado.
- Sem a sessão em `apurarAlvo`, a ativação não teria alvo, e a 6ª tentativa daria 200 em vez de 429.
- Sem o `FOR UPDATE`, as falhas paralelas leriam a mesma contagem, e o teste de 4 falhas ao mesmo tempo ficaria abaixo
  de 4.
- Sem a troca de `trustDevice` nas duas rotas, o código de recuperação deixaria o cookie `trust_device`.
- Sem o `ativando` vindo do `before`, o login gravaria um segundo `2fa_ativado`.

Não montei contraprova com o código alterado, porque `src/` fora de `*.test.ts` não está na minha lista Pode.

### Resultado

| Comando | Resultado |
|---|---|
| `pnpm test` (antes, linha de base) | 38 de 38 arquivos, 725 de 725 testes |
| `pnpm test` com os 4 arquivos novos | 4 de 4 arquivos, 69 de 69 |
| `pnpm test` (depois, 1ª rodada) | 42 de 42 arquivos, 794 de 794 testes, 0 falhas |
| `pnpm test` (depois, 2ª rodada, para ver se algum teste é instável) | 42 de 42 arquivos, 794 de 794 testes, 0 falhas |
| `pnpm lint` | limpo |
| `pnpm typecheck` | limpo |
| `git diff --stat` | nenhum arquivo rastreado alterado; só os 4 arquivos novos em `git status` |

A saída da suíte tem linhas `{"level":40|50,...,"evento":"better_auth"}` e `{"level":40,...,"evento":"login_falhou","atorTipo":"anonimo"}`.
Elas vêm dos logins e códigos errados de propósito, e trazem só nível, hora, evento e tipo de ator. As 20 linhas a mais
(10 pares) são das 10 senhas erradas do teste de limite por IP do arquivo novo.

## Decisões tomadas

- **Arquivos novos, sem editar os do engenheiro.** Assim o `git diff` prova que nenhum teste existente foi afrouxado.
  Os nomes com `-qa` evitam disputa com os arquivos da T09.
- **O módulo do bloqueio foi testado à parte, contra o Postgres real.** Pela rota, o `Date` fixo e o limite por IP não
  deixam provar o limite de 1 ms nem a concorrência.
- **Os limites exatos ficaram fixados como o código os faz:** o bloqueio acaba no instante `bloqueadoAte`, e a janela
  fecha aos 15 min exatos. Bate com o "aos 15, o código certo é aceito" do teste do engenheiro.
- **Ficou fixado que `zerarFalhasDeVerificacao` não encurta um bloqueio em curso.** Um acerto que chegue durante o
  bloqueio, por corrida, não o derruba. Se a `08-revisao` quiser outro comportamento, o teste aponta onde mudar.
- **CA-01.2 e CA-01.3 por `mapearErro`, e não por rota.** A T09 não cria rota, e `rota()` é da T11. O teste prova o
  código que a função lança e o status que ele dá.
- **Só o `Date` falso nos testes de integração.** Falsificar os timers travaria o `pg` e o `pg-boss`. É a mesma escolha
  da `06-T08-testes` e do engenheiro.
- **Sem banco de desenvolvimento.** Tudo roda no Testcontainers. Não subi o `docker-compose.dev.yml`, então não há nada
  para derrubar.

## Pendências

- Para a `08-revisao` e a `08-reteste` (`seguranca-aplicacao`), sobre o parecer 1 do `06-T09-tech-lead.md`:
  - O módulo não perde contagem sob concorrência. Os 3 testes de `sob concorrência` provam isso.
  - Continua aberto o corte do 5º erro entre o `before` e o `after` com pedidos HTTP paralelos. Se pedirem a reserva
    atômica no `before`, o teste de 7 falhas paralelas serve de base.
- Minor, para quem tocar `verificacao.test.ts`: `C-06: código de recuperação errado conta para o mesmo bloqueio` aceita
  qualquer 4xx nos 5 erros. Vale fixar o status exato que o plugin dá ao código de recuperação errado.
- `ux-ui-design` e T37: os testes novos confirmam que a ativação também recebe o 429 `VERIFICACAO_BLOQUEADA`. A tela T02
  (configurar o 2FA) precisa do mesmo texto de bloqueio de 15 min que a T01, e esse texto ainda falta na 03.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 25f4fb4` — 10 arquivos: os 8 da T09, a entrega e o registro
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 526cff0fd91eb7c60d968eb0e479390ca374b369` — só a entrega e o `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -8` — 158570d (revisão), 526cff0, 84f8057 e 25f4fb4 no ramo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — linha de base: 38 arquivos, 725 de 725
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/acesso/bloqueio-verificacao.test.ts src/modules/acesso/exigir-pessoa-qa.test.ts src/modules/acesso/destino-seguro-qa.test.ts src/modules/acesso/verificacao-qa.test.ts` — 4 arquivos, 69 de 69
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 42 arquivos, 794 de 794
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 2ª rodada: 42 arquivos, 794 de 794
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — só os 4 arquivos de teste novos, sem rastreado modificado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — nenhuma saída

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
