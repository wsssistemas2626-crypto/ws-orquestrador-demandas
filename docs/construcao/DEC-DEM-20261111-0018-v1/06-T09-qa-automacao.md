---
pedido: DEC-DEM-20261111-0018-v1
etapa: 06-T09-testes
agente: qa-automacao
leu: [contrato-passagem.md, pedido.json, docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md (T09 e D-18), 01-analista-requisitos.md (RF-08, CA-08.1 a CA-08.3, Pendência 7), 06-T09-engenheiro-backend.md, 06-T09-tech-lead.md, commit 7b318ea9434a3a1ec885f814c3e816da174c0a91 (pelos dois arquivos de teste dele), test/estatico/piso-de-assercoes.test.ts, test/estatico/piso-de-assercoes-0018.test.ts, test/estatico/piso-de-assercoes-qa.test.ts, 41108ee:test/estatico/piso-de-assercoes.test.ts, DEC-DEM-20261111-0016-v1/04-seguranca-aplicacao.md (IN-01 a IN-18), cabeçalho e nomes dos casos de cada candidato listado na Entrega]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T09 (B-08-2, SB-15; RF-08, CA-08.1 a CA-08.3, D-18) conferida e completada. O código da T09 passou: nenhuma devolução.
Esta etapa fez o P1 obrigatório da `06-T09-tech-lead` (CA-08.2) e o P2 opcional, e acrescentou um caso ao teste do
piso.

### Critérios da tarefa e o teste que cobre cada um

| Critério | Teste (arquivo › caso) | Resultado |
|---|---|---|
| CA-08.1 / critério 7 do pedido: `registrar-qa.test.ts` está no PISO com a contagem atual | `test/estatico/piso-de-assercoes.test.ts` › `CV-20: piso de asserções por arquivo` › `src/modules/andamento/registrar-qa.test.ts tem ao menos 69 linhas com expect(`; e `test/estatico/piso-de-assercoes-0018.test.ts` › `as entradas do B-08-2 estão no PISO com ao menos a contagem de 41108ee` | Confirmado: `git grep -c "expect("` dá 69 hoje, e o PISO tem 69 (igual, não só maior ou igual) |
| CA-08.2: cada candidato no PISO ou com a linha de razão | `piso-de-assercoes-0018.test.ts` › casos 3 (lista da T09) e 4, novo (`as entradas da 06-T09-testes estão no PISO com ao menos a contagem do fim da etapa`); as razões estão nas tabelas abaixo | 38 entradas novas, 7 valores subiram e cada candidato fora tem uma linha de razão |
| CA-08.3: nenhum valor da 0.4.0 diminuiu e nenhuma entrada saiu | `piso-de-assercoes-0018.test.ts` › `a cópia de 41108ee tem as 63 entradas do PISO daquela versão` e `nenhuma entrada de 41108ee saiu nem diminuiu` | `PISO_41108EE` conferido contra `git show 41108ee:test/estatico/piso-de-assercoes.test.ts`: 63 chaves e 63 valores iguais. O "84" do plano é o número de linhas do bloco (63 entradas mais 21 linhas de comentário). Meu diff só tem valores que sobem (7 linhas `-`, cada uma trocada por um valor maior) |
| SB-15: o piso pega a regressão | provas abaixo | Vermelho nos três cenários, e os arquivos voltaram ao que eram |

### Prova de que o piso pega a regressão

Cada arquivo foi devolvido com Edit ao texto exato de antes. Depois de cada volta, `git diff --stat` saiu vazio, antes das
mudanças desta etapa.

1. **Uma asserção a menos num arquivo do PISO.** Tirei a linha `expect(r.texto).not.toContain(v2);` (linha 235) de
   `src/modules/andamento/registrar-qa.test.ts` e rodei `test/estatico/piso-de-assercoes.test.ts`: 1 falhou e 135 passaram,
   com `src/modules/andamento/registrar-qa.test.ts tem ao menos 69 linhas com expect(` →
   `AssertionError: expected 68 to be greater than or equal to 69`. A linha voltou, e o diff ficou vazio.
2. **O valor do PISO desce (alguém "acerta" o piso para baixo).** Com `registrar-qa.test.ts` em 68 no PISO, o teste do
   PISO continua verde, porque 69 ≥ 68. Quem pega é o `piso-de-assercoes-0018.test.ts`: 1 falhou e 2 passaram, com
   `src/modules/andamento/registrar-qa.test.ts: expected 68 to be greater than or equal to 69`. O valor voltou a 69, e o
   diff ficou vazio.
3. **Uma entrada desta etapa desce.** Com `test/matriz-rotas-qa.test.ts` em 21 no PISO, o caso 4 novo ficou vermelho
   (1 falhou e 3 passaram), com `test/matriz-rotas-qa.test.ts: expected 21 to be greater than or equal to 22`. O valor
   voltou a 22.

### Arquivos alterados (só `test/`)

- `test/estatico/piso-de-assercoes.test.ts`:
  - 38 entradas novas no fim, com o comentário de origem e a versão de cada bloco;
  - P2: seis valores antigos sobem para a contagem de hoje, cada um com uma linha de comentário:
    - `e2e/seguranca.spec.ts`, de 28 para 70;
    - `test/estatico/painel-qa.test.ts`, de 14 para 19;
    - `src/modules/acesso/matriz.test.ts`, de 44 para 47;
    - `test/matriz-rotas.test.ts`, de 17 para 18;
    - `test/transversal/sentinelas.test.ts`, de 59 para 99;
    - `test/estatico/andamento.test.ts`, de 43 para 50;
  - `piso-de-assercoes-0018.test.ts` sobe de 3 para 4, por causa do caso novo.
- `test/estatico/piso-de-assercoes-0018.test.ts`: o mapa `DA_06_T09_TESTES` (as 38 entradas, as seis que subiram e o
  4) e o caso 4, no mesmo molde do caso 3. Sem ele, uma entrada desta etapa poderia sair do PISO ou descer sem nenhum
  teste acusar, como mostra a prova 2.
- `test/estatico/piso-de-assercoes-qa.test.ts`: no `PISO_MODULOS`, as duas únicas entradas abaixo da contagem de hoje
  sobem, cada uma com uma linha de comentário. Conferi as 71 entradas uma a uma contra o `git grep -c`:
  - `src/modules/acesso/matriz.test.ts`, de 44 para 47;
  - `src/modules/demandas/entrada-qa.test.ts`, de 51 para 52.

### CA-08.2: os candidatos que entram (contagem do fim da etapa, `git grep -c "expect("`)

| Arquivo | `expect(` | Versão | Razão (critério do RF-08) |
|---|---|---|---|
| `scripts/token-integracao.test.ts` e `-qa` | 62 e 48 | 0.3.0 | IN-04: o token não vaza na emissão, na troca nem na revogação; 401 depois de revogar, pela rota |
| `src/modules/integracoes/tempo-limite.test.ts` e `-qa` | 32 e 16 | 0.3.0 | IN-14 e ADR-28: prazo total, e nada fica gravado |
| `src/app/api/demandas/leitura-awave.test.ts` e `-qa` | 28 e 36 | 0.3.0 | IN-08: visibilidade e 404 sem oráculo, com falha fechada |
| `src/app/api/demandas/criacao-awave.test.ts` e `-qa` | 81 e 35 | 0.3.0 | IN-05: lista de permissão do Awave e token |
| `src/app/api/demandas/contrato-awave.test.ts` | 17 | 0.3.0 | IN-15: cookie sem Origin continua 403 (CA-09.4). Estava na fronteira e entra |
| `src/modules/agentes/gatilhos-awave.test.ts`, `-qa` e `executar-awave.test.ts` | 28, 40 e 20 | 0.3.0 | IN-06: nenhum agente age antes de uma pessoa confirmar |
| `src/modules/demandas/confirmar.test.ts` | 32 | 0.3.0 | IN-07: agente, integração e sistema recebem `sem_permissao` (CA-06.6) |
| `src/app/(painel)/demandas/[id]/acoes-confirmar.test.ts` | 22 | 0.3.0 | IN-07 e C-04: a Server Action só aceita pessoa, com id e entrada estritos |
| `src/modules/demandas/origem.test.ts` e `-qa` | 67 e 43 | 0.3.0 | C-17 e IN-16: filtro só pelo enum, com `%3Cscript%3E`; IN-02 pela rota: 403 para as duas integrações, sem vazar a fila. Estavam na fronteira e entram |
| `src/app/(painel)/demandas/fila-origem.test.ts` e `-qa` | 59 e 42 | 0.3.0 | IN-16 e CV-07: o href e o campo oculto saem só do enum; o log não leva o filtro; a origem vem da autoria |
| `e2e/fila-origem.spec.ts` | 43 | 0.3.0 | O e2e que o IN-16 exige: `?origem=%3Cscript%3E` não aparece no HTML |
| `src/components/rotulos-integracao.test.ts` e `-qa` | 30 e 13 | 0.3.0 | IN-13: o prefixo só aparece no formato certo, e o rótulo nunca mostra token, hash nem sha256 (mesmo critério do `rotulos-andamento`, que já está no PISO) |
| `src/components/dados-da-confirmacao.test.ts` | 37 | 0.3.0 | Sentinela: o `depois` do evento não vaza na vista |
| `test/tokens-do-e2e.test.ts` e `test/playwright-config-qa.test.ts` | 15 e 16 | 0.3.0 | IN-04: o arquivo de token do e2e fica fora do repositório, com permissão 600, e é apagado no fim |
| `test/estatico/docs-sem-token.test.ts` | 6 | 0.3.0 | IN-18 e C-39: nenhum token em docs (o `trace-e2e.test.ts` já entrou na T09) |
| `test/estatico/migration-0007.test.ts` | 3 | 0.3.0 | IN-17: a 0007 é só aditiva e sem GRANT (como o `migration-0008`, que entrou na T09) |
| `scripts/seed-integracoes.test.ts` e `-qa` | 48 e 55 | 0.3.0 | D-09 e IN-04: nenhum token no banco semeado; G3.10: o log do seed sem título, decId, sha256 nem prefixo |
| `scripts/criar-token-0019.test.ts` | 8 | 0.3.1 | Falha fechada na emissão do token |
| `src/db/transacao-prazo.test.ts` | 26 | 0.3.1 | M-3: prazo total da transação |
| `src/modules/agentes/executar-0019.test.ts` | 53 | 0.3.1 | M-5: falha fechada da guarda de confirmação (IN-06) |
| `src/modules/agentes/revisao-0019.test.ts` | 31 | 0.3.1 | Ameaça D do IN-07: a execução adiada não roda em dobro e não fica sem job sob corrida com a confirmação. Estava na fronteira e entra |
| `src/db/imutabilidade.test.ts` | 23 | 0.4.0 (AN-10 acrescentado na T01 do 0017) | Imutabilidade: o papel do app não altera nem apaga `andamento_construcao` nem as versões |
| `src/app/(painel)/demandas/fila-andamento.test.ts` e `-qa` | 40 e 51 | 0.4.0 | O plano propunha deixar fora. Entram porque têm casos de matriz (sem sessão ou com papel fora da matriz, nada é lido), de CA-04.6 (valor fora do esquema não vai ao HTML) e de log sem ids nem SQL. É o mesmo critério do `dados-do-andamento-qa` e do `andamento-detalhe-qa`, que já estão no PISO |
| `scripts/seed-andamento.test.ts` e `-qa` | 41 e 37 | 0.4.0 | O plano propunha deixar fora. Entram porque têm AN-15 e D-09 (nenhum token, só o prefixo fictício), G3.10 (log do seed) e o 404 sem oráculo do Awave nas oito demandas |
| `test/matriz-rotas-qa.test.ts` | 22 | pré-0.3, pelo cabeçalho (06-T13-testes de um pedido anterior) | 401 e 403 em todo método e em toda rota. É o irmão do `matriz-rotas.test.ts`, que está no PISO, e entra qualquer que seja a versão |

### CA-08.2: os candidatos que ficam fora, com a razão

| Arquivo | `expect(` | Razão |
|---|---|---|
| `src/components/dados-das-etapas-andamento.test.ts` | 11 | Confirmo a proposta do plano: só a linha da Próxima ação, sem caso de acesso, visibilidade, sentinela nem oráculo |
| `e2e/andamento-detalhe.spec.ts` e `e2e/andamento-fila.spec.ts` | 58 e 18 | Confirmo a proposta: tela e axe |
| `test/migracao/migration-0007-dados.test.ts` | 13 | Compatibilidade do dado de hoje com a 0007. O "só aditiva e sem GRANT" do IN-17 está no `migration-0007.test.ts` (entra) e no `privilegios.test.ts` (já no PISO) |
| `src/components/dados-da-confirmacao-0019.test.ts` | 4 | Espelho da regra na tela. A regra que decide (só a pessoa confirma) está no `confirmacao-0019` (PISO) e no `executar-0019` (entra) |
| `src/components/dados-da-confirmacao-qa.test.ts` | 18 | Tela, sem caso de sentinela, matriz ou visibilidade |
| `src/app/(painel)/demandas/[id]/confirmar-demanda.test.ts` e `-qa` | 54 e 30 | Tela (seção, selo, Próxima ação). O IN-07 fica no `acoes-confirmar`, no `confirmar.test.ts` e no `e2e/seguranca.spec.ts` |
| `e2e/confirmacao-awave.spec.ts` e `-qa` | 38 e 15 | Tela, estado de erro e axe |
| `e2e/recebido-construir.spec.ts` e `-qa`, `src/app/(painel)/pacotes-decisao/[decId]/recebimento-qa.test.ts`, `src/components/recebimento.test.ts` e `-qa` | 13, 15, 21, 7 e 6 | A data do recebimento na tela |
| `e2e/fila-origem-qa.spec.ts` | 36 | Filtro e paginação na tela. O reflexo cru do IN-16 está no `e2e/fila-origem.spec.ts` (entra) |
| `src/modules/demandas/consultas.test.ts` | 28 | Leitura do RF-06, sem controle. Já tem piso de 28 no `PISO_MODULOS` de `piso-de-assercoes-qa.test.ts` |
| `test/desempenho/leitura.test.ts` | 48 | Desempenho |

### Resultados

- Os três testes do piso: 250 de 250 (211 antes, mais as 38 entradas e o caso 4).
- `pnpm lint`: limpo. `pnpm typecheck`: limpo.
- `pnpm test` inteiro: 381 arquivos e 8268 testes passaram, 0 falharam, saída 0. Rodou em segundo plano, e li a saída
  com Read. A rodada começou antes de subirem os dois valores de `piso-de-assercoes-qa.test.ts`. Depois disso, os três
  arquivos do piso deram de novo 250 de 250, e `pnpm lint` saiu limpo. A mudança só sobe dois números num teste
  estático.

## Decisões tomadas

- No caso de dúvida, o arquivo entrou: o piso só custa asserção que não pode sair, e o CA-08.2 só deixa fora o que "não é
  teste de segurança". Tela e seed com caso de sentinela, matriz ou valor fora do esquema entram, como os arquivos de tela
  do 0017 que já estão no PISO.
- Revisei a proposta do plano para `fila-andamento*` e `seed-andamento*`: os casos citados acima contradizem a razão "sem
  controle de acesso nem sentinela".
- Subi as seis entradas antigas (P2). O CA-08.3 só proíbe descer, e a prova 1 mostra o que um piso abaixo do arquivo deixa
  passar. `e2e/seguranca.spec.ts` podia perder 42 linhas sem ninguém ver.
- O caso 4 é novo e não muda os casos 1 a 3. O `DO_B_08_2` continua sendo o retrato do B-08-2 com as contagens de
  41108ee, e as entradas desta etapa ficam num mapa próprio, com a contagem do fim da etapa.
- Comentário de origem numa linha própria, nunca no fim da entrada: o `pisoAtual()` só lê a linha que termina em `,`.
  Comentário no fim da linha zeraria a entrada, que ficaria vermelha (falha do lado seguro, mas quebraria a suíte).
- Usei `git show 41108ee:<arquivo>` para o CA-08.3, que a Pendência 1 do engenheiro pedia. É `git show`, da regra de
  comando e da lista **Pode**.

## Pendências

1. Limite do piso, para um pedido futuro, sem efeito neste: ele conta linhas com `expect(`. Linha de tabela de `it.each`
   (como as recusas de `src/db/imutabilidade.test.ts`) não conta. Tirar um caso da tabela passa pelo piso. Um piso por
   número de casos (`it`/`it.each` × linhas) fecharia isso.
2. Sobra fora da faixa da RF-08 (antes da 0.3), que complementa a Pendência 3 da `06-T09-tech-lead`. Da lista dela, já
   têm piso no `PISO_MODULOS` de `test/estatico/piso-de-assercoes-qa.test.ts`: `auth*`, `verificacao*`,
   `bloqueio-verificacao`, `cookies-seguros`, `destino-seguro*`, `exigir-pessoa*`, `sonda-mutacao-qa`,
   `dados-pessoais/*`, `retencao/expurgar`, `historico/consultas*` e `historico/registrar-qa`. `src/db/imutabilidade.test.ts`
   entrou nesta etapa. Ficam sem piso: `src/lib/log.test.ts`, `console-saneado.test.ts`, `reduzir-erro.test.ts`,
   `sentry.test.ts`, `src/app/api/demandas/nomes-antes-de-gravar.test.ts` (0009/0010) e `scripts/scripts.test.ts`.
3. O texto do `pedido.json` não trouxe instrução fora do escopo. Nada a registrar.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "T09" -- docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md` — T09 na linha 1674
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "CA-08" -- docs/construcao/DEC-DEM-20261111-0018-v1/01-analista-requisitos.md` — CA-08.1 a CA-08.3
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "não é fechada" -- docs/construcao/DEC-DEM-20261111-0018-v1/01-analista-requisitos.md` — nada
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, ramo construcao/DEC-DEM-20261111-0018-v1
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "Pendências" -- docs/construcao/DEC-DEM-20261111-0018-v1/01-analista-requisitos.md` — linha 357
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -c "expect(" -- src test e2e scripts` — contagem por arquivo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 41108ee:test/estatico/piso-de-assercoes.test.ts` — 63 entradas, iguais ao PISO_41108EE
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "IN-07\b" -- docs/construcao/DEC-DEM-20261111-0016-v1/04-seguranca-aplicacao.md` — IN-07
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "C-17" -- docs/construcao/DEC-DEM-20261111-0016-v1/04-seguranca-aplicacao.md` — C-17
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "403" -- src/modules/demandas/confirmar.test.ts` — nada
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "CA-06.6" -- src e2e test` — confirmar.test.ts:155
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "C-15" -- src e2e test` — contrato-awave CA-09.4 e outros
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "IN-07" -- src e2e test scripts` — acoes-confirmar, confirmar, seguranca.spec
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -l "DEC-DEM-20261112-0019" -- src test e2e scripts` — testes da 0.3.1
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -l "DEC-DEM-20261111-0016" -- src test e2e scripts` — testes da 0.3.0
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -l "DEC-DEM-20261111-0017" -- src test e2e scripts` — testes da 0.4.0
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "DEC-DEM-20261111-0017" -- src/db/imutabilidade.test.ts src/modules/demandas/consultas.test.ts` — AN-10 na imutabilidade
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "3Cscript" -- e2e src test` — IN-16 em e2e/fila-origem.spec.ts e origem.test.ts
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "G3.10\|it(" -- scripts/seed-integracoes-qa.test.ts` — casos do seed
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "it(" -- scripts/seed-integracoes.test.ts` — D-09 e IN-04
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "it(" -- scripts/seed-andamento-qa.test.ts` — 404 sem oráculo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "it(" -- scripts/seed-andamento.test.ts` — AN-15 e G3.10
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "it(" -e "test(" -- "src/app/(painel)/demandas/fila-andamento-qa.test.ts" "src/app/(painel)/demandas/fila-andamento.test.ts" src/components/dados-das-etapas-andamento.test.ts` — casos de matriz, CA-04.6 e log
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "test(" -- e2e/andamento-detalhe.spec.ts e2e/andamento-fila.spec.ts` — tela e axe
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "it(" -e "test(" -- "src/app/(painel)/demandas/fila-origem-qa.test.ts" "src/app/(painel)/demandas/fila-origem.test.ts" e2e/fila-origem-qa.spec.ts` — CV-07 e log
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -i -e "sentinela" -e "token" -e "oráculo" -e "sem_permissao" -- src/components/rotulos-integracao.test.ts src/components/rotulos-integracao-qa.test.ts src/components/dados-da-confirmacao.test.ts src/components/dados-da-confirmacao-qa.test.ts src/components/recebimento.test.ts src/components/recebimento-qa.test.ts` — sentinelas nos rótulos e na confirmação
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "expect(" -- src/modules/andamento/registrar-qa.test.ts` — linhas com expect
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/piso-de-assercoes.test.ts --reporter=dot` — prova 1: 1 falhou (registrar-qa 68 < 69), 135 passaram
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — vazio depois de devolver a linha
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/piso-de-assercoes-0018.test.ts --reporter=dot` — prova 2: 1 falhou (68 < 69 no caso 3), 2 passaram
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — vazio depois de devolver o 69
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/piso-de-assercoes-0018.test.ts test/estatico/piso-de-assercoes.test.ts test/estatico/piso-de-assercoes-qa.test.ts --reporter=dot` — 250 de 250
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/piso-de-assercoes-0018.test.ts --reporter=dot` — prova 3: 1 falhou (matriz-rotas-qa 21 < 22 no caso 4), 3 passaram
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — 8268 de 8268, 381 arquivos (em segundo plano, saída lida com Read)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -- test/estatico/piso-de-assercoes.test.ts` — 7 valores sobem, 38 entradas novas, nenhuma sai
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 2 arquivos de test/, 113 inserções e 7 remoções (os 7 valores que subiram)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/piso-de-assercoes-0018.test.ts test/estatico/piso-de-assercoes.test.ts test/estatico/piso-de-assercoes-qa.test.ts --reporter=dot` — 250 de 250, depois de subir os dois valores do -qa
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -- test/estatico/piso-de-assercoes-qa.test.ts` — só os dois valores que sobem
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e ".skip" -e ".only" -e ".todo" -- test/estatico/piso-de-assercoes.test.ts test/estatico/piso-de-assercoes-0018.test.ts test/estatico/piso-de-assercoes-qa.test.ts` — nenhum skip, only nem todo (só "Readonly" e texto, porque o ponto casa qualquer caractere)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 3 arquivos de test/, 117 inserções e 9 remoções (os 9 valores que subiram)

O git grep com (painel) sem aspas, da 1ª volta, está no registro (bloqueado e ajuste da 06-T09-testes em 14/11).

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
