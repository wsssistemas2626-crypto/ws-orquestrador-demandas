---
pedido: DEC-DEM-20261111-0018-v1
etapa: 06-T10-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md (G0 a G9, T10 a T14), tarefas.json (pela T10 do plano), 06-T10-engenheiro-backend.md, 06-T10-tech-lead.md, commit 99ce009568b40ee43df911f6191a2ec589e71006, scripts/seed-vigencia.test.ts, scripts/seed-andamento-qa.test.ts (molde), e2e/decisao.spec.ts (linhas 1 a 120 e 420 a 490), e2e/apoio.ts (demandaDoSeed), src/modules/pacotes-decisao/decidir.ts, src/modules/pacotes-decisao/criar.ts (assinatura), src/modules/pacotes-decisao/consultas.ts (PacoteDecisaoVista), src/modules/demandas/arquivamento.ts, src/modules/demandas/consultas.ts (obterDemanda, listarDemandasPara), src/lib/erros.ts, scripts/seed-ficticio.ts (CONTAS_FICTICIAS), test/estatico/piso-de-assercoes.test.ts, test/estatico/piso-de-assercoes-0018.test.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Verificação da T10 (seed fictício com as quatro demandas da vigência; D-15; dados para RF-03, RF-06 e os e2e da T11 a
T14), commit `99ce009`. Pedido do maestro em três pontos; cada um com o teste que o cobre.

### Critérios da tarefa e o teste que cobre cada um

| # | Critério (plano, T10, passo 1; e o pedido do maestro) | Teste (arquivo › nome) |
|---|---|---|
| 1 | os quatro títulos em `TITULOS_DO_E2E`, com "(fictício)", uma vez cada, melhoria, pela `configurar2fa` (D-15) | `scripts/seed-vigencia.test.ts` › "os quatro títulos novos: …" e "D-15: cada uma existe uma vez, melhoria, …"; `scripts/seed-vigencia-qa.test.ts` › "demandaDoSeed: a lista de melhorias da "cto", numa página de 100, tem cada uma das quatro uma vez, com o título original" |
| 2 | `vigenciaComPendente`: v1 `cto` aprovado (A) pela "cto"; v2 `cto_e_administradora` pendente; Pronta para decisão; vigente = v1 atualizado | `seed-vigencia.test.ts` › "vigenciaComPendente: …"; `seed-vigencia-qa.test.ts` › "vigenciaComPendente: v2 pendente é o mais novo, v1 aprovado é o vigente; …" (it.each) |
| 3 | `vigenciaNivelMenor`: v1 de dupla aprovado (A) pela "cto" e pela "administradora", com documento fictício; v2 `cto` pendente; Pronta para decisão | `seed-vigencia.test.ts` › "vigenciaNivelMenor: …"; `seed-vigencia-qa.test.ts` › "vigenciaNivelMenor: v2 pendente é o mais novo, …" (it.each) |
| 4 | `vigenciaArquivar`: v1 `cto` aprovado; v2 `cto` pendente; Pronta para decisão | `seed-vigencia.test.ts` › "vigenciaArquivar: …" e "arquivar o v2 da vigenciaArquivar: Aprovada, com o v1 ainda vigente"; `seed-vigencia-qa.test.ts` › "vigenciaArquivar: v2 pendente é o mais novo, …" (it.each) |
| 5 | `arquivarSemVigente`: ESP e RSK, nenhum DEC, em Nova | `seed-vigencia.test.ts` › "arquivarSemVigente: …"; `seed-vigencia-qa.test.ts` › "arquivarSemVigente: em Nova (origem do fluxo do e2e), …" |
| 6 | todo DEC novo com `caminhos_com_nome_na_criacao` não nulo; pendentes do `/construir` sem mudança; nenhum token | `seed-vigencia.test.ts` › "todo DEC das quatro tem a marcação da criação gravada …"; `seed-vigencia-qa.test.ts` › "só dado fictício: …" (a marcação dos seis é `{}`, vazia) |
| M1 | (maestro) as demandas novas cobrem os cenários de vigência que a T11 a T14 vão usar | `seed-vigencia-qa.test.ts`: o it.each das três com DEC (a leitura da T11: mais novo = v2 pendente, v1 vigente, nenhum desatualizado nem substituído, mesma ESP e mesmo RSK, ids no formato de `RE_ID_DEC` e `RE_ID_DEMANDA_NA_TELA`, dica do Arquivar = Aprovada); "os três pares de nível cobrem os três avisos: …" ((a)/(b) e (c), 03 4.2); "arquivarSemVigente: …" (pré-condição do "Arquivar → … Encerrada" de `e2e/decisao.spec.ts`, G5); e no banco próprio: "vigenciaNivelMenor: aprovar o v2 só do CTO é recusado (409 do S-01) sem gravar nada; arquivá-lo leva a Aprovada, …", "vigenciaComPendente: com só a aprovação da "cto", o v2 segue pendente e o v1 em vigor; com a da "administradora", o v2 substitui o v1" e "arquivarSemVigente: o DEC criado como no e2e leva de Nova a Pronta para decisão; arquivá-lo, sem vigente, leva a Encerrada" |
| M2 | (maestro) o seed continua só com dado fictício | `seed-vigencia-qa.test.ts` › "só dado fictício: contas de CONTAS_FICTICIAS, e-mail @ficticio.test, sem CPF, CNPJ, telefone, senha nem segredo TOTP; marcação da criação vazia nos seis DECs"; `seed-vigencia.test.ts` › "G3.13: o log do seed não leva título nem id …" |
| M3 | (maestro) os testes antigos do seed só mudaram totais e listas | conferido no diff de `99ce009` (abaixo) e pela contagem de `expect(` antes e depois; a suíte passa com eles |

### O que acrescentei

`scripts/seed-vigencia-qa.test.ts` (novo, 10 casos, 62 linhas com `expect(`), ao lado do `seed-vigencia.test.ts` do
engenheiro, sem mudar nada nele. Dois describes, cada um com o banco dele (Testcontainers), `SEED_FICTICIO=1` e
`relogioFixo('2026-11-14T15:00:00Z')`:

1. **Leituras da T11 e dos e2e (sem gravar):** a busca do e2e (`demandaDoSeed`: `listarDemandasPara` de melhorias, 100
   por página, como pessoa) acha cada uma uma vez, com o título original; para as três com DEC, `obterDemanda` dá o v2
   pendente como `pacotesDecisao[0]` (o "mais novo" do D-12) e o v1 aprovado, os dois sem `desatualizado` nem
   `substituido`; `obterPacoteDecisao` dá os níveis, a decisão A do v1, o v2 sem aprovador e sem decisão, os dois citando
   a mesma ESP e o mesmo RSK e sem rascunho citado; os ids casam `RE_ID_DEC` e `RE_ID_DEMANDA_NA_TELA` (SB-12); e
   `destinoDoArquivamento(status, estadoDoVigente(vigente))` é `aprovada` (a dica que a T14 confere). Os três pares de
   nível dão um caso de cada (pendente que exige mais, só do CTO sobre a dupla, mesmo nível) e cobrem os avisos (a)/(b)
   e (c). A `arquivarSemVigente` fica em Nova (dentro de `ORIGENS_DO_FLUXO` do e2e), com uma ESP e um RSK, de modo que a
   `prepararEspERsk` do e2e não cria versão.
2. **Dado só fictício:** toda conta citada pelas quatro (autoria de demanda, ESP, RSK e DEC, aprovação, decisão e evento)
   existe e é uma de `CONTAS_FICTICIAS` (`administradora`, `configurar2fa`, `cto`); os nomes de aprovador são os das
   contas fictícias; nas linhas inteiras (`row_to_json`) das quatro, em sete tabelas, todo e-mail é `@ficticio.test` e
   não há CPF, CNPJ nem telefone formatado, nem senha ou segredo TOTP das contas; a referência de documento é só
   `DOC-FICTICIO-0018`; e a marcação da criação dos seis DECs é `{}` (o D1 não recusa pedido nenhum por causa do seed).
3. **Regras do servidor sobre o dado (banco próprio; cada caso numa demanda diferente, então nenhum depende de outro nem
   da ordem):** aprovar o v2 só do CTO da `vigenciaNivelMenor` lança `ErroDominio` `conflito` com
   `MENSAGENS_DECISAO.nivelMenorQueOVigente` (a constante, não o texto, que a T11 troca) e não grava status, aprovação,
   decisão nem evento; arquivá-lo leva a Aprovada, com o v1 de dupla vigente e não substituído. Na `vigenciaComPendente`,
   a aprovação da "cto" dá `aprovacao_parcial` e o v1 continua o vigente (o aviso (a) continua valendo, T12 CA-06.1); a
   da "administradora" (documento fictício) fecha o v2, que passa a vigente, e o v1 fica substituído por ele, com um
   evento `pacote_decisao_substituido` com os dois ids (o texto do aviso (a), "substituirá", é verdadeiro sobre este
   dado). Na `arquivarSemVigente`, o DEC criado pela "cto" com o corpo do `novoPacote` do e2e leva de Nova a Pronta para
   decisão sem ESP nem RSK a mais, e arquivá-lo, sem vigente, leva a Encerrada (o alerta do e2e "Arquivar →").

`test/estatico/piso-de-assercoes.test.ts`: só acréscimo no `PISO`, `scripts/seed-vigencia.test.ts: 46` (P1 da
06-T10-revisao, critério CV-20 do D-18, como o `seed-andamento.test.ts` da 0.4.0) e `scripts/seed-vigencia-qa.test.ts:
62`, com comentário. Nenhuma entrada mudou nem saiu.

### Os testes antigos do seed: só totais e listas (M3)

Li o diff de `99ce009` nos quatro arquivos que mudaram:
- `scripts/scripts.test.ts`: `TOTAL_DEMANDAS_DO_SEED` 36 → 40; `todos` 31 → 35; contagem por tabela `[TOTAL, 13, 13, 13,
  11]` → `[TOTAL, 17, 17, 19, 15]` (+4 ESP, +4 RSK, +6 DEC, +4 aprovações, igual ao que o seed grava e ao que o
  `seed-vigencia.test.ts` conta); DECs 13 → 19; `TOTAL - 13` → `TOTAL - 17`; `pacote_decisao` 13 → 19 e `aprovacao`
  11 → 15. A constante `DA_T10_0_4_1` só cresce a lista de exclusão do teste "as demandas próprias do e2e …", pelo mesmo
  mecanismo da 0.3.0 e da 0.4.0; as asserções dele (`titulos` 18, `cto` 5, administradora 0, o `toEqual` das dezoito)
  não mudaram.
- `scripts/seed-andamento.test.ts` e `scripts/seed-integracoes.test.ts`: `toBe(36)` → `toBe(40)` e o título do caso.
- `scripts/seed-integracoes-qa.test.ts`: `...DECS_DA_VIGENCIA` no fim da lista de DECs na ordem (lista de versões que
  cresce) e um comentário; as asserções de ordem das demandas (as oito do andamento por último, as cinco das
  integrações antes delas) não mudaram.
- `src/db/sementes.test.ts` e `scripts/seed-andamento-qa.test.ts`: sem mudança no commit.
- Linhas com `expect(` em `99ce009~1` e em `99ce009`, iguais nos seis: `scripts.test.ts` 248, `seed-andamento.test.ts` 41,
  `seed-integracoes.test.ts` 48, `seed-integracoes-qa.test.ts` 55, `seed-andamento-qa.test.ts` 37, `sementes.test.ts` 12.
  Nenhum `.skip(`, `.only(` nem `.todo(` nos arquivos do seed.

### Resultado

- `pnpm test scripts/seed-vigencia-qa.test.ts`: 10 de 10 (primeira execução, 14,8 s).
- `pnpm test` dos dois da vigência e dos dois do piso, com a suíte inteira rodando ao mesmo tempo: 4 arquivos, 202 de 202.
- `pnpm test` (suíte inteira, em segundo plano): `Test Files 383 passed (383)`, `Tests 8295 passed (8295)`, 0 falha,
  214,75 s (o engenheiro tinha 382 arquivos; o arquivo a mais é o `seed-vigencia-qa.test.ts`, e o PISO ganhou dois casos).
- `pnpm lint`: limpo. `pnpm typecheck`: limpo.

## Decisões tomadas

- Teste novo em arquivo próprio (`seed-vigencia-qa.test.ts`), no molde do `seed-andamento-qa.test.ts` da 0.4.0: o do
  engenheiro não muda, e a contagem dele fica a do PISO.
- Os casos que gravam ficam num banco separado do de leitura, e cada um numa demanda diferente: nenhum depende da ordem;
  o relógio é fixo nos dois.
- A recusa do S-01 é conferida pela constante `MENSAGENS_DECISAO.nivelMenorQueOVigente`, não pelo texto: a T11 troca o
  texto (G5), e o teste continua certo.
- Os cenários da T12 a T14 são provados pelos dados e pelas funções que já existem (T06: `vigenteDaDemanda`,
  `destinoDoArquivamento`, `estadoDoVigente`; e as leituras `obterDemanda`, `obterPacoteDecisao`, `listarDemandasPara`):
  `avisoDeVigencia`, `dicaDoArquivar` e o e2e são da T12 e da T14 e ainda não existem.
- A varredura de dado pessoal usa só padrões formatados (CPF, CNPJ, telefone com máscara): padrões só de dígitos
  poderiam casar dentro de UUID aleatório e deixar o teste instável.
- `seed-vigencia.test.ts` e `seed-vigencia-qa.test.ts` entram no PISO (P1 da revisão): os dois têm guardas de log, token
  e dado fictício, como os do seed da 0.3.0 e da 0.4.0, que já estão lá. O PISO só sobe (G4).

## Pendências

- Não pude provar por mutação que os testes falham com o seed errado: `scripts/seed-ficticio.ts` não está na minha lista
  Pode. Os casos comparam valores exatos lidos do banco (níveis, status, ids, contagens), e o do engenheiro foi visto
  falhando antes do código (12 de 12).
- Para a T14 (frontend): o e2e "CA-03.1 pelo navegador" e o "Arquivar" de `e2e/decisao.spec.ts` gravam nas demandas do
  seed; a pré-condição de cada um (v2 pendente; Nova) está provada aqui sobre o banco recém-semeado.
- P2 da revisão (dívida de legibilidade do lugar de `criarDemandasDaVigencia`) segue com o tech-lead; não muda teste.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "T10" -- docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 99ce009568b40ee43df911f6191a2ec589e71006 --stat`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 99ce009568b40ee43df911f6191a2ec589e71006 -- scripts/seed-ficticio.ts scripts/scripts.test.ts scripts/seed-andamento.test.ts scripts/seed-integracoes.test.ts scripts/seed-integracoes-qa.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e vigenciaComPendente -e vigenciaNivelMenor -e vigenciaArquivar -e arquivarSemVigente -- docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "ORIGENS_DO_FLUXO =" -e "async function completarEspERsk" -e "async function novoPacote" -- e2e`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A12 "export async function demandaDoSeed" -- e2e/apoio.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "^export" -- src/modules/pacotes-decisao/consultas.ts src/modules/demandas/consultas.ts src/modules/demandas/arquivamento.ts src/modules/pacotes-decisao/decidir.ts src/modules/pacotes-decisao/criar.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "FiltroDemandas =" -e "filtroDemandasSchema" -e "TAMANHO_DA_PAGINA =" -- src e2e`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "decisao_aprovada" -e "dec_criado" -- src/modules/demandas/transicoes.ts src/modules/pacotes-decisao/decidir.ts src/modules/pacotes-decisao/criar.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "export const DEC_DO_E2E" -e "export const ESP_DO_E2E" -e "export const CONTAS_FICTICIAS" -e "export class ErroDominio" -e "export const RE_ID_DEC" -e "export const RE_ID_DEMANDA_NA_TELA" -- scripts/seed-ficticio.ts src/lib/erros.ts src/components/dados-do-pacote.ts src/components/dados-das-etapas.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "scripts/" -e "PISO" -e "0018" -- test/estatico/piso-de-assercoes.test.ts`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/seed-vigencia-qa.test.ts --reporter=dot` — 10 de 10
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep --untracked -c "expect(" -- scripts/seed-vigencia-qa.test.ts scripts/seed-vigencia.test.ts` — 62 e 46
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -c "expect(" 99ce009568b40ee43df911f6191a2ec589e71006~1 -- scripts/scripts.test.ts scripts/seed-andamento.test.ts scripts/seed-integracoes.test.ts scripts/seed-integracoes-qa.test.ts scripts/seed-andamento-qa.test.ts src/db/sementes.test.ts` — 248, 37, 41, 55, 48, 12
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -c "expect(" 99ce009568b40ee43df911f6191a2ec589e71006 -- scripts/scripts.test.ts scripts/seed-andamento.test.ts scripts/seed-integracoes.test.ts scripts/seed-integracoes-qa.test.ts scripts/seed-andamento-qa.test.ts src/db/sementes.test.ts` — os mesmos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 99ce009568b40ee43df911f6191a2ec589e71006 --stat -- src/db/sementes.test.ts scripts/seed-andamento-qa.test.ts` — vazio (sem mudança)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "\.skip(" -e "\.only(" -e "\.todo(" -- scripts/scripts.test.ts scripts/seed-andamento.test.ts scripts/seed-integracoes.test.ts scripts/seed-integracoes-qa.test.ts scripts/seed-vigencia.test.ts` — vazio
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — em segundo plano: 383 arquivos, 8295 de 8295
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:.prettierrc`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — só `test/estatico/piso-de-assercoes.test.ts` (+5)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/seed-vigencia-qa.test.ts scripts/seed-vigencia.test.ts test/estatico/piso-de-assercoes.test.ts test/estatico/piso-de-assercoes-0018.test.ts --reporter=dot` — 4 arquivos, 202 de 202
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -- test/estatico/piso-de-assercoes.test.ts` — só acréscimo

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
