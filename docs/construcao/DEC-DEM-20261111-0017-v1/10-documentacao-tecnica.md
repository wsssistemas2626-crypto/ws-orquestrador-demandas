---
pedido: DEC-DEM-20261111-0017-v1
etapa: 10-documentacao
agente: documentacao-tecnica
leu: [contrato-passagem.md, pedido.json, spec 2026-11-12-ws-orquestrador-demandas-andamento-design.md, plano 2026-11-12-ws-orquestrador-demandas-plano.md (G2, D-10, mapa RF-13 e AN-14), 01-analista-requisitos.md (CA-13.1 a CA-13.3), 02-arquiteto-solucoes.md (seção 9, por busca), 06-T14-engenheiro-frontend.md, 06-T14-qa-automacao.md, 07-qa-funcional.md, 08-maestro.md, 09-devops-sre.md, README.md, CHANGELOG.md, docs/manual-tecnico (README e caps. 01, 02, 03, 05, 08, 09, 10), docs/operacao/deploy.md, docs/operacao/tokens-de-integracao.md, package.json, test/estatico/docs-sem-token.test.ts, src/app/api/pedidos-construcao/[decId]/andamento/route.ts, src/modules/andamento (schemas.ts, regras.ts, registrar.ts, consultas.ts), src/db/schema/andamento.ts, src/db/privilegios.ts, src/modules/demandas/transicoes.ts, src/modules/demandas/consultas.ts (por busca), src/modules/limites.ts, src/modules/acesso/matriz.ts, src/lib/rota.ts (por busca), src/components/dados-do-andamento.ts, src/components/rotulos.ts, src/components/dados-das-etapas.ts (por busca), src/app/(painel)/demandas (leituras-da-fila.ts, fila.tsx, CartoesDaFila.tsx, [id]/page.tsx, [id]/detalhe.ts, [id]/SecaoAndamento.tsx), drizzle/0008_slippery_whirlwind.sql, drizzle/0009_rls_andamento_construcao.sql, scripts/seed-ficticio.ts, e2e/andamento-construir.spec.ts (por busca), estruturaAutonoma ferramentas/construir/enviar-andamento.mjs e lib/andamento.mjs (por busca)]
status: pronto
proximo: maestro
devolvido_para: null
---
## Entrega

Documentação da 0.4.0 (andamento do Pedido de Construção registrado pelo `/construir`), escrita a partir do código do
ramo `construcao/DEC-DEM-20261111-0017-v1`. Onde as entregas e o código diferem, vale o código (padrão técnico, seção
11), e a diferença está em Pendências.

### Arquivos alterados

| Arquivo | O que mudou |
|---|---|
| `CHANGELOG.md:6` | Seção **0.4.0 — 2026-11-13** (CA-13.1): opção aprovada e A1 a A3; base `0ac099a`; o roteiro de publicação e de volta em cinco passos; o que muda para quem usa (selo, seção, duas transições, linha 15, histórico, dica de Aprovada, Awave, A3, envio desligado); o que mudou na API (rota nova e respostas, `andamento` na vista de pessoa, sétima chave do Awave); o que mudou no código (matriz, tabela e migrations `0008`/`0009`, módulo `andamento/`, transições, limite, `corpoInvalido`, leituras, painel, seed com 36 demandas, testes, versão); o que ficou fora; verificações; pendências (`:195`) para Fabiano (publicação, P-04, P-05, EXP-01 como ponto de produto, P-01 a P-03, V-02 e RNF-01 não rodados, UAT, lembrete da E01) e para outras áreas (B-08-1, B-08-2, instabilidade de tempo, dívida das revisões, herdadas) |
| `README.md:5-6`, `:55`, `:73`, `:79` | Versão 0.4.0 e data; parágrafo do andamento; linha dos tokens; linha da spec e do plano (14 tarefas). Os comandos de instalar e verificar (`:87` a `:98`) já eram os do padrão técnico e não mudaram |
| `docs/manual-tecnico/README.md` | Versão 0.4.0, data, parágrafo da spec da 0.4.0, caps. 01, 03 e 05 na tabela de capítulos, RF-22 no mapa, seção nova "Requisitos do andamento (0.4.0)" com RF-01 a RF-13 do pedido, glossário (Andamento da construção, Fase, Situação da construção, Mesmo estado, Mudança de marco, Selo de fase; Vista mínima e Próxima ação atualizadas) |
| `docs/manual-tecnico/05-pedido-de-construcao.md:112`, `:349` a `:531` | O parágrafo dos dois caminhos do pedido dizia que "não recebe o andamento da construção" e que os status mudam à mão: corrigido. Seção nova **"Andamento da construção (0.4.0)"** (CA-13.2): A1 a A3, termos, rota e corpo, exemplo, tabela de respostas 204/404/409/422/429/503 (e 400/401/403/413/415), o que o `/construir` faz com cada resposta, ordem das conferências (rota e serviço, 10 passos), tabela de transições da spec 2.1, tabela `andamento_construcao`, evento `andamento_registrado`, limite 60/600, quem lê o andamento, EXP-01 e o que fazer se o envio der problema |
| `docs/manual-tecnico/01-arquitetura.md` | Cabeçalho; diagrama; parágrafo da escrita nova; módulo `src/modules/andamento/`; `limites.ts`; 10 migrations; tabela nova; bloco das migrations `0008` e `0009`; ADR-30 a ADR-35 e onde está o texto completo |
| `docs/manual-tecnico/02-acesso-e-seguranca.md` | Cabeçalho; `construir` com quatro ações na tabela das integrações; limite próprio do andamento; seis pares e 24 ações na matriz; linha `registrar_andamento`; sétima chave do Awave |
| `docs/manual-tecnico/03-demandas.md` | Cabeçalho; `andamento` na vista de pessoa e fora da vista mínima (RF-06); 201 e leitura do Awave com a sétima chave; RF-07 com as duas transições do `/construir` (o texto "mudam à mão nesta versão, porque o andamento do `/construir` não volta para cá" saiu); RF-21 com `andamento_registrado` e os textos do histórico |
| `docs/manual-tecnico/08-painel.md` | Cabeçalho; parágrafo da 0.4.0; T03 e T05 na tabela de telas; bloco "Selo de fase" e o estado de erro da leitura do andamento na T03; arranjo da T05 com a seção; linha 15 da Próxima ação; bloco "Andamento da construção" (seção, barra, alertas, data, nota, histórico, dica de Aprovada); e2e e axe da 0.4.0; "O seed tem 23 demandas" virou o histórico 23 → 36 |
| `docs/manual-tecnico/09-referencia-api.md` | Cabeçalho; rota nova na tabela; `andamento` nas leituras de pessoa e do Awave; 403 nas quatro rotas do `/construir`; exemplo do Awave com a sétima chave; exemplo novo "o /construir informa o andamento"; 404, 409, 422 e 429 na tabela de erros |
| `docs/manual-tecnico/10-configuracao-e-scripts.md` | Cabeçalho; seed com **36** demandas (era 28); tabela das oito demandas do andamento, com o status de cada uma conferido em `criarDadosDoAndamento`; scripts de token sem mudança |
| `docs/operacao/tokens-de-integracao.md:5-6`, `:32`, `:152` | Versão e data; seção nova "O token `construir` escreve desde a 0.4.0" (a emissão não muda, onde o envio lê o token, o peso de um vazamento, revogação imediata na suspeita, P-04); "O que um prefixo gravou no andamento", com a consulta só de leitura em `ator_token_prefixo`; troca, revogação e "Se a integração der problema" com o envio do andamento e a volta da 0.4.0 |
| `docs/operacao/deploy.md:5`, `:10`, `:819`, `:835` | Campo **Versão** 0.4.0 e a linha da `documentacao-tecnica` no "Atualizado em". Nas seções 8 e 9, a data do detalhe passou de "Atualizado em" para o rótulo da tela, "Última mudança informada pelo /construir em …". O roteiro das seções 5 e 6 não foi tocado |

### Conferências

- CA-13.1: `package.json` tem `"version": "0.4.0"` e o `CHANGELOG.md` tem a seção 0.4.0 com a rota, o selo, o detalhe,
  a vista do Awave e a migration.
- CA-13.2: o cap. 05 descreve a rota, as respostas 204, 404, 409, 422, 429 e 503, a tabela de transições, o
  `andamento_registrado` e a A3.
- CA-13.3: o `deploy.md` (seções 5 e 6, do `devops-sre`) traz backup antes, migration pelo migrator, `worker` e
  depois `app`, `"andamento_ligado": true` só no fim, a conferência da fase na fila em até 2 minutos e a volta pelo
  caminho B; o `tokens-de-integracao.md` diz que o `construir` ganhou a ação sem mudar a emissão. Ver Pendências sobre o
  "sem snapshot (D5)".
- Varredura do formato de token (`wsod_` + 43 caracteres) em `docs/**/*.md`, `CHANGELOG.md` e `README.md`, pelo Grep:
  nenhuma ocorrência. Os exemplos usam `wsod_<token da integração construir>` e `<prefixo>`.
- Links internos novos: todos apontam para arquivos que existem e para títulos que existem (âncoras conferidas contra
  os títulos: `#andamento-da-construção-040`, `#rota-registrar_andamento`, `#ordem-das-conferências`,
  `#transições-pelo-andamento`, `#o-que-fica-gravado-andamento_construcao`, `#evento-andamento_registrado`,
  `#limite-conferirlimitedeandamento`, `#exemplo-o-construir-informa-o-andamento`, `#rotas`, `#matriz-de-acesso`,
  `#banco`, `#rf-07-status-e-transições`, `#rf-21-histórico`, `#fila-t03-rf-05-a-rf-07`,
  `#demanda-t05-rf-08-a-rf-10`, `#scripts-de-operação`).
- Nenhuma variável de ambiente nova; nenhuma citada com valor.

## Decisões tomadas

- O manual descreve o código e não as entregas: o status de cada demanda do seed saiu de `criarDadosDoAndamento`, as
  mensagens de `MENSAGENS_ANDAMENTO` e `LIMITE_ANDAMENTO`, a ordem das conferências de `registrar.ts` e os textos de
  `TEXTOS_ANDAMENTO` e `rotulos.ts`.
- O EXP-01 entrou como ponto de produto aberto, no CHANGELOG (pendência para Fabiano), no cap. 05 e no cap. 08, e não
  como defeito, como a 08 decidiu.
- Da lista de Minors da 08, tirei do CHANGELOG a "asserção de `status_alterado` não presa à transição": no código de
  hoje, `e2e/andamento-construir.spec.ts:120` já filtra pelo ator de integração e confere entidade, antes e depois.
- No `deploy.md`, só mexi no campo Versão, no registro e em dois rótulos das seções 8 e 9 que citavam um texto que a
  tela não tem ("Atualizado em"). É o mesmo termo da T05 em todos os documentos; o roteiro das seções 5 e 6 ficou como
  o `devops-sre` escreveu.
- No `tokens-de-integracao.md`, a frase sobre a volta ao normal depois da revogação diz só o que o contrato garante
  (cada envio leva o estado inteiro do pedido), sem afirmar o comportamento interno do estado do envio.
- A frase "O seed tem 23 demandas" do cap. 08 estava sob "Desde a 0.2.0": virou o histórico (23 na 0.2.0, 36 desde a
  0.4.0), em vez de ser apagada.

## Pendências

- **CA-13.3 e o snapshot (para a Parada 3).** O CA-13.3 e a G2 do plano pedem o roteiro "sem snapshot (D5)". O
  `deploy.md` diz, no passo 2 da publicação e no passo 1 da volta, que o snapshot é opcional, com o aviso de que hoje
  ele congela a VPS, e a linha 13 ainda manda "tirar snapshot da VPS no hPanel" antes das seções 4, 5 e 6. Não
  contradiz o código nem pede mudar `Dockerfile` ou workflow, então não é devolução. Fica para o maestro ou o
  `devops-sre` alinhar o texto à D5, se Fabiano quiser.
- **Spec × código (para a Parada 3, sem efeito no manual):** a spec, seções 3.2 e 3.4, chama a migration custom de
  `0009_rls_privilegios_andamento`; o arquivo é `drizzle/0009_rls_andamento_construcao.sql`. O manual usa o nome do
  arquivo.
- **08-maestro, Minor da T14 já resolvido no código:** a 08 lista a asserção de `status_alterado` de
  `e2e/andamento-construir.spec.ts:288` como não presa à transição. O arquivo atual prende (linha 120). Ficou fora do
  CHANGELOG; o maestro confere se a 08 deve ser atualizada.
- **V-02 e RNF-01** seguem sem rodar (09). O CHANGELOG diz isso em "Verificações" e em "Pendências", sem número
  inventado.
- As capturas do cap. 08 não mostram o selo nem a seção do andamento. Regravar pede o e2e local, fora da minha lista.
- O texto do `pedido.json` não traz instrução para mudar de tarefa, ler segredo, chamar endereço de fora ou sair do
  repositório.

## Comandos executados

Nenhum.

## Critério de pronto atendido

- [x] (10) o README diz como rodar, com os comandos do padrão técnico (`README.md:87` a `:98`, sem mudança nesta etapa)
- [x] (10) o manual técnico descreve cada RF e cita variável de ambiente só pelo nome (mapa dos RF-01 a RF-13 do pedido
  no `docs/manual-tecnico/README.md`; nenhuma variável nova)
- [x] (10) as notas de versão listam o que entrou e as pendências abertas (`CHANGELOG.md:6` e `:195`)
- [x] os links internos apontam para arquivos que existem
