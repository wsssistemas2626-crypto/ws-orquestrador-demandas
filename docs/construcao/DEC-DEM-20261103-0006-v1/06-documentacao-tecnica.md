---
pedido: DEC-DEM-20261103-0006-v1
etapa: 06-documentacao
agente: documentacao-tecnica
leu: [contrato-passagem.md, padrao-tecnico.md (seção 11), pedido.json, 01-qa-funcional.md, 02-tech-lead.md, 03-engenheiro-backend.md, 04-qa-automacao.md, 04-maestro.md, 05-devops-sre.md, README.md, CHANGELOG.md, docs/manual-tecnico/README.md, docs/manual-tecnico/03-demandas.md, docs/manual-tecnico/04-versoes-e-decisao.md, docs/manual-tecnico/05-pedido-de-construcao.md, docs/manual-tecnico/06-agentes-de-ia.md, docs/manual-tecnico/07-worker-avisos-retencao.md, docs/manual-tecnico/08-painel.md (busca), docs/manual-tecnico/09-referencia-api.md, docs/operacao/deploy.md, src/modules/demandas/transicoes.ts, src/modules/especificacoes/servico.ts, src/modules/pareceres-risco/servico.ts, src/modules/pacotes-decisao/criar.ts, src/modules/pacotes-decisao/decidir.ts (busca), src/modules/pedido-construcao/gerar.ts (busca), src/modules/agentes/entrada-agente.ts, src/modules/agentes/executar.ts, src/modules/avisos/aviso-dec.ts, src/modules/avisos/enviador.ts, src/jobs/aviso-dec-pronto.ts, src/components/rotulos.ts]
status: pronto
proximo: maestro
devolvido_para: null
---
## Entrega

Notas da versão 0.1.5 no `CHANGELOG.md` e os trechos de `README.md`, `docs/manual-tecnico/` e `docs/operacao/deploy.md`
que descrevem os três comportamentos corrigidos, conferidos contra o código do ramo (não contra as entregas). A versão
do `package.json` é 0.1.5 (`03-engenheiro-backend.md`, conferida no `test/estatico/projeto.test.ts` da 03).

### Como achei os trechos

Busquei com Grep, em `README.md`, `docs/manual-tecnico/**` e `docs/operacao/**`, por: `0.1.4`, `M-01`, `M-02`,
`M-03`, `agente_ignorado`, `motivo`, `ignorada`, `tentativa`, `recusad`, `transitori`, `aviso_email`, `429`, `4xx`,
`5xx`, `encerrada`, `entregue`, `status final`, `mais novo(s)`, `409`, `não rodou` e `MOTIVO_IGNORADO`. Depois li o
código citado em cada trecho (`transicoes.ts`, os três serviços, `criar.ts`, `entrada-agente.ts`, `executar.ts`,
`aviso-dec.ts`, `enviador.ts`, `aviso-dec-pronto.ts`, `rotulos.ts`) e confirmei por Grep que `decidir.ts` e `gerar.ts`
não conferem o status da demanda.

### `CHANGELOG.md`

| Trecho | O que mudou |
|---|---|
| `CHANGELOG.md:6-153` | Entrada nova **0.1.5 — 2026-11-03**: base `cf36ec5`; as três mudanças de comportamento (M-01 citação da consolidação e DEC que nasce desatualizado; M-02 409 com mensagem fixa em `entregue` e `encerrada`, antes do limite, e execução na fila `ignorada` com `demanda_final`; M-03 4xx definitivo `falhou` na 1.ª, 429 e 5xx tentados de novo, erro inesperado contando tentativa, banco fora com `aviso_erro_inesperado`); testes, e2e, versão e documentação; verificações (3.811 de 3.811, lint e typecheck, e2e 143 de 143 três vezes, revisão sem crítico/alto/médio, `docker build` 1,73 GB); pendências abertas (B-1 a B-6, decidir e gerar Pedido em demanda `encerrada`, ações na tela em status final, 409/408 do Resend, versões do Next e do Better Auth, médio do reteste, pendências de Fabiano da 05 com o rollback para `cf36ec5`, e as que continuam de antes) |
| `CHANGELOG.md:667` | Na 0.1.0, M-01 marcada "Fechada na 0.1.5." |
| `CHANGELOG.md:669-670` | Na 0.1.0, M-02 marcada "Fechada na 0.1.5 para a criação", com o que segue aberto |
| `CHANGELOG.md:673` | Na 0.1.0, M-03 marcada "Fechada na 0.1.5." |

### `README.md`

| Trecho | O que mudou |
|---|---|
| `README.md:5-6` | Versão 0.1.5 e "Atualizado em" 03/11/2026. Nenhum outro trecho do README cita as funções, os arquivos ou os RF corrigidos (conferido pela busca acima) |

### `docs/manual-tecnico/`

| Trecho | O que mudou |
|---|---|
| `README.md:5-6` | Versão 0.1.5; tirado o "sem mudança de comportamento desde a 0.1.0", que deixou de valer; data |
| `README.md:46` | Mapa do RF-10: "DEC cita a ESP e o RSK (os mais novos; na consolidação, os que o agente leu)" |
| `README.md:76` | Glossário: termo novo **Status final** (`entregue` ou `encerrada`, de `STATUS_FINAIS`) |
| `03-demandas.md:5` | Data e o que mudou |
| `03-demandas.md:84-94` | RF-07: os status finais saem da tabela de transições (`STATUS_FINAIS`, `ehStatusFinal`); em status final, criar ESP, RSK ou DEC dá 409 e a execução na fila fica `ignorada`; decidir e gerar Pedido ainda não conferem o status |
| `04-versoes-e-decisao.md:5` | Data e o que mudou |
| `04-versoes-e-decisao.md:14-23` | Ordem na criação (trava → recusa em status final → limite), o corpo exato do 409 e a regra de que a recusa vem antes do 429 (`recusarSeDemandaFinal`) |
| `04-versoes-e-decisao.md:68-78` | RF-10: substitui "o DEC cita a ESP e o RSK de maior versão" pelas duas regras (pessoa e rota: mais novos; worker da consolidação: os que o agente leu, por `ExtrasDoPacote`, com 404 para id de outra demanda), e que os ids nunca vêm do corpo nem do modelo |
| `04-versoes-e-decisao.md:85-86` | Troca o "Limite conhecido (M-02, aberto)" pela regra nova e pelo que continua sem conferência |
| `04-versoes-e-decisao.md:102-104` | RF-12: o DEC da consolidação pode nascer desatualizado, e mesmo assim leva a `pronta_para_decisao` e agenda o aviso |
| `05-pedido-de-construcao.md:5` | Data e o que mudou |
| `05-pedido-de-construcao.md:29-31` | Limite conhecido: `gerarPedido` não confere o status da demanda |
| `06-agentes-de-ia.md:5` | Data e o que mudou |
| `06-agentes-de-ia.md:38-50` | RF-16: passo novo 4 (o "3b" do código), demanda em status final → `ignorada` com `demanda_final`, sem chamar o provedor; a montagem devolve `citados`, sem os ids no conteúdo; passos renumerados de 5 a 7; a regra de nova tentativa corrigida (antes dizia que toda recusa do serviço tentava de novo; o código só tenta de novo `entrada_invalida`, `limite_excedido` e o transitório, e as outras recusas, como o 409 de status final, terminam `recusada_pelo_servico` sem nova chamada) |
| `06-agentes-de-ia.md:52-55` | Tabela de motivos de `agente_ignorado` (`desligado`, `sem_preco`, `sem_provedor`, `demanda_final`) e `teto` do `suspensao_por_teto`; o rótulo ausente de `demanda_final` no painel (B-5) |
| `06-agentes-de-ia.md:72-78` | Troca o "Limite conhecido (M-01, aberto)" pela regra da citação da consolidação |
| `07-worker-avisos-retencao.md:5` | Data e o que mudou |
| `07-worker-avisos-retencao.md:47-64` | RF-25: troca "na 3ª falha, `falhou`" e o "Limite conhecido (M-03, aberto)" pela tabela por tipo de falha (`recusado`, `transitorio`, erro inesperado, banco fora), a trava contra soma dupla e o limite B-2 |
| `09-referencia-api.md:5` | Data e o que mudou |
| `09-referencia-api.md:79-97` | Exemplo novo: RSK numa demanda encerrada, com o 409 e a mensagem fixa |
| `09-referencia-api.md:112` | Tabela de erros: `conflito` ganha "ESP, RSK ou DEC numa demanda `entregue` ou `encerrada`" |

Conferidos e sem mudança: `01-arquitetura.md`, `02-acesso-e-seguranca.md`, `08-painel.md` e
`10-configuracao-e-scripts.md` não citam as funções, os arquivos nem os RF corrigidos. O cap. 08 não descreve os
rótulos do histórico.

### `docs/operacao/deploy.md`

| Trecho | O que mudou |
|---|---|
| `deploy.md:5` e `:10` | Versão 0.1.5 e "Atualizado em" 03/11/2026 |
| `deploy.md:101-102` | Seção 4: a `:latest` da primeira publicação passa a ser a 0.1.5, com as mesmas 7 migrations |
| `deploy.md:112` | Seção 4: "merges da 0.1.1 à 0.1.5" sem migration |
| `deploy.md:184-193` | Seção 6: a 0.1.5 sem migration, o motivo `demanda_final` no `jsonb` que a 0.1.4 lê, a volta pelo caminho A para `cf36ec5fe634ec27004817e30f656d92a80eb23d` (`v0.1.4`); o parágrafo da 0.1.4 fica como histórico |
| `deploy.md:236-243` | Seção 9: o que significam `aviso_email_falhou` (1.ª tentativa no 4xx definitivo, 3.ª no passageiro e no erro inesperado) e `aviso_erro_inesperado` (só banco fora) |

Nenhuma mudança em `Dockerfile` nem workflow foi necessária: o `deploy.md` não contradiz o código, então não há
devolução para a `05-entrega`.

### Links internos conferidos

Todos os links novos apontam para arquivos que existem na árvore (Glob): `../../CHANGELOG.md`,
`04-versoes-e-decisao.md`, `03-demandas.md#rf-07-status-e-transições`, `06-agentes-de-ia.md#rf-16-execução-dos-agentes`,
`04-versoes-e-decisao.md#rf-10-pacote-de-decisão-dec`, `04-versoes-e-decisao.md#rf-12-dec-desatualizado` e
`../manual-tecnico/07-worker-avisos-retencao.md#rf-25-aviso-por-e-mail`. As âncoras seguem o título de cada seção, no
mesmo formato das âncoras que o manual já usava.

## Decisões tomadas

- Descrevi o código, não as entregas: o texto do RF-16 sobre nova tentativa estava impreciso desde a 0.1.0 e foi corrigido pelo `tratarResposta` de `executar.ts`, porque o 409 novo depende dessa regra (padrão técnico, seção 11).
- Renumerei o passo "3b" do código como passo 4 no manual: "3b." não forma item de lista em Markdown, e o texto cita o "3b" do comentário para quem procurar no código.
- Marquei M-01, M-02 e M-03 como fechadas na seção 0.1.0 do CHANGELOG: nota de versão é histórico, mas pendência resolvida que continua escrita como aberta é documentação desatualizada.
- Registrei como limite conhecido nos cap. 03, 04 e 05 que decidir e gerar o Pedido não conferem o status: é o comportamento do código, e quem lê "status final recusa" poderia supor o contrário.
- Pus o termo "Status final" no glossário: passou a ser regra de domínio usada em quatro capítulos.
- Na seção 9 do `deploy.md`, a orientação de conferir `RESEND_API_KEY` com 401 ou 403 é passo de diagnóstico, sem valor de variável.
- O CHANGELOG cita a pendência de 409/408 do Resend como "a confirmar", sem afirmar o comportamento do Resend, que nenhuma etapa conferiu.

## Pendências

- Para a Parada 3 (Fabiano): as pendências abertas da 0.1.5 estão em `CHANGELOG.md:90-153`, entre elas os segredos de webhook, a primeira publicação com snapshot no hPanel antes, o rollback para `cf36ec5` e o novo médio de decidir e gerar Pedido em demanda `encerrada`.
- Nenhuma divergência entre o código e as entregas que mude o que o manual descreve. A única imprecisão achada era do próprio manual (RF-16), corrigida acima.
- Fora desta etapa: o rótulo de `demanda_final` em `src/components/rotulos.ts` (B-5) é texto de interface da `ux-ui-design`; quando entrar, o cap. 06 (linhas 52-55) e a seção 6 do `deploy.md` (linha 186) mudam junto.

## Comandos executados

Nenhum.

## Critério de pronto atendido

- [x] (06) o `CHANGELOG.md` tem a entrada da versão do `package.json`, com o que foi corrigido e as pendências abertas
- [x] (06) todo trecho de `README.md` e `docs/manual-tecnico/` que cita a função, o arquivo ou o RF corrigido descreve o código depois da correção (trechos achados com Grep e listados na entrega)
- [x] os links internos apontam para arquivos que existem
