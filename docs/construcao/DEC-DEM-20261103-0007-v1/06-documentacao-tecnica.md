---
pedido: DEC-DEM-20261103-0007-v1
etapa: 06-documentacao
agente: documentacao-tecnica
leu: [contrato-passagem.md, pedido.json, 01-qa-funcional.md, 02-tech-lead.md, 03-engenheiro-backend.md, 04-qa-automacao.md, 04-maestro.md, 05-devops-sre.md, package.json (versão), CHANGELOG.md, README.md, docs/manual-tecnico/README.md, docs/manual-tecnico/02-acesso-e-seguranca.md, docs/manual-tecnico/03-demandas.md, docs/manual-tecnico/04-versoes-e-decisao.md, docs/manual-tecnico/05-pedido-de-construcao.md, docs/manual-tecnico/06-agentes-de-ia.md (trechos), docs/manual-tecnico/07-worker-avisos-retencao.md, docs/manual-tecnico/08-painel.md, docs/manual-tecnico/09-referencia-api.md, docs/manual-tecnico/10-configuracao-e-scripts.md, docs/operacao/deploy.md, src/instrumentation.ts, src/lib/console-saneado.ts, src/lib/log.ts (trechos), src/lib/reduzir-erro.ts, src/lib/sentry.ts (capturarErro), src/app/error.tsx, src/modules/acesso/exigir-pessoa.ts, src/modules/demandas/consultas.ts (trechos), "src/app/api/demandas/route.ts e [id]/route.ts (trechos)", src/modules/pacotes-decisao/decidir.ts (trechos), src/modules/pedido-construcao/gerar.ts (trecho), src/modules/avisos/enviador.ts (trecho), scripts/seed-ficticio.ts (trechos), scripts/start-hml.ts (trecho)]
status: pronto
proximo: maestro
devolvido_para: null
---
## Entrega

Entrada 0.1.6 do `CHANGELOG.md` (a versão do `package.json`) e os trechos de `README.md`, `docs/manual-tecnico/` e
`docs/operacao/deploy.md` que citam o que o pedido corrigiu, conferidos contra o código do ramo
`construcao/DEC-DEM-20261103-0007-v1`. Os trechos foram achados com Grep pelos nomes dos itens (M-05 a M-08, `SEED_FICTICIO`,
`loopback`, `solicitanteNome`, `anexos`, `exigirPessoa`, `console`, `408`/`409`, `recusado`, `SHA pendente`, versão e
"Atualizado em").

### `CHANGELOG.md`

- `CHANGELOG.md:6-183` (novo): entrada **0.1.6 — 2026-11-03**, com o que mudou (M-05, M-06, M-07, M-08, 408/409 do
  aviso, actions por SHA, testes, versão, documentação), as verificações e as pendências abertas.
  - `:117-140`: os médios **M-1, M-2 e M-3 da `04-maestro.md` registrados como abertos**, com a nota de que não são os
    M-01 a M-03 da 0.1.0. O **M-1** (`:122-129`) diz que o dado pessoal no texto livre lido pelo agente **bloqueia a
    primeira publicação (CA-P5-16) até o pedido seguinte (0008) corrigi-lo ou até Fabiano e a `gestao-riscos` aceitarem
    o risco**; o mesmo bloqueio está no topo da entrada (`:10-11`).
  - `:142-155`: os baixos B-1 a B-5 da revisão; `:157-183`: o que veio das outras etapas (risco residual do M-05, teste
    estático das actions, segredos de webhook, rollback para a `v0.1.5`, imagem local) e o achado desta etapa sobre o
    `erroId` (`:159-162`).
- `CHANGELOG.md:294` e `:299` (0.1.5, pendências): "Decidir e gerar o Pedido em demanda `encerrada`" e "409 e 408 do
  Resend" ganharam "Fechada na 0.1.6".
- `CHANGELOG.md:849`, `:855-863` e `:873-874` (0.1.0, pendências): o resto do M-02, o M-05, o M-06 (com o que segue
  aberto em M-1 e M-2), o M-07 e o item das actions por SHA ganharam a nota de fechamento na 0.1.6.

### `README.md`

- `README.md:5`: versão 0.1.5 → 0.1.6.
- `README.md:103-108` (passo 5 do desenvolvimento local, seed): passa a dizer que o seed exige o `BETTER_AUTH_URL` no
  loopback e recusa com código 1 fora dele, com link ao cap. 10.
- Conferidos sem mudança: `README.md:96-97` (`BETTER_AUTH_URL` em `http://127.0.0.1:3101`, que passa pela guarda) e
  `:72-73` (contas de `CONTAS_FICTICIAS`).

### `docs/manual-tecnico/`

- `README.md:5`: versão 0.1.6 e os cinco comportamentos que mudam. `:76` (glossário, status final): também não aceita
  decisão de DEC nem geração de Pedido. `:81` (novo termo): "Vista mínima".
- `02-acesso-e-seguranca.md:5` e `:8`: data e fontes (`console-saneado.ts`, `instrumentation.ts`). `:21-24`: falha do
  `getSession` vira `ErroLeituraSessao` (500 na rota, tela de erro na página). `:70-73`: `ler_demanda` de quem não é
  pessoa recebe a vista mínima; M-2 aberto. `:103-125`: o "Limite conhecido (M-05, aberto)" saiu; entraram o
  `onRequestError` com a linha `erro_requisicao` (exemplo com valores fictícios), o formato do `erroId`, o console
  saneado e os limites que seguem (B-2 e M-3). Conferido sem mudança: `:16` (`exigirPessoa` em cada adaptador).
- `03-demandas.md:5`: data. `:60-61`: a autoria com nome é o que a pessoa recebe. `:65-81`: o "Limite conhecido (M-06,
  aberto)" virou a descrição da vista mínima (`vistaDaDemandaPara`, GET e POST), com M-1 (bloqueio da publicação) e M-2
  abertos. `:108-110` (RF-07): a frase "Decidir … **não** conferem o status da demanda" virou a regra nova (409, M-08).
  Conferido sem mudança: `:13-15` (`solicitanteNome` e `anexos` no corpo de criação).
- `04-versoes-e-decisao.md:5`: data. `:10-11`: a geração do Pedido também trava a demanda. `:87-88` (RF-10): decidir e
  gerar dão 409 desde a 0.1.6. `:125-143` (RF-13): o passo novo 2 (status final, mensagem fixa, antes de ler o DEC) e a
  renumeração; parágrafo da matriz antes do status, do "Arquivar" e do texto para a `ux-ui-design`.
- `05-pedido-de-construcao.md:5`: data. `:16-37`: a ordem das conferências ganhou a trava e o 409 de status final como
  passos 1 e 2; o "Limite conhecido (pendência da 0.1.5)" saiu; entrou a consequência B-5. `:63` (determinismo): vale
  enquanto a demanda não está em status final. Conferido sem mudança: `:55` (anexos e nome fora do pedido).
- `06-agentes-de-ia.md:5`: data. `:119-123` (RF-20): a minimização vale para a entrada do worker; a leitura pela API
  segue a vista mínima e não minimiza o texto livre (M-1).
- `07-worker-avisos-retencao.md:5`: data. `:51-56` (tabela do RF-25): `recusado` passa a "4xx que não é 408, 409 nem
  429" e `transitorio` inclui 408 e 409 (`TRANSITORIOS_4XX`). `:62-64`: o 409 de corpo diferente gasta as 3
  tentativas.
- `08-painel.md:5`: data. `:52-58` (pendências): os dois textos de 409 em status final para a `ux-ui-design`, a T11 que
  não esconde as ações, e a tela de erro sem `digest`. Conferido sem mudança: `:11` (`exigirPessoaNaPagina`).
- `09-referencia-api.md:5`: data. `:28` e `:31`: `POST` e `GET` de demanda devolvem ao agente a vista mínima.
  `:79-104` (novo): exemplo de leitura com token de agente. `:106-125` (novo): exemplo do 409 de decisão e de Pedido em
  status final. `:160`: o código `conflito` cobre decidir e gerar em demanda final. Conferido sem mudança: `:61`
  (`solicitanteNome` no corpo do POST, que é entrada).
- `10-configuracao-e-scripts.md:5`: data. `:20` (`BETTER_AUTH_URL`) e `:50` (linha do seed): a guarda do loopback.
  `:54-74`: o parágrafo do M-07 virou a lista das três guardas do `seedFicticio`, na ordem do código, com a mensagem
  fixa, o log e o comportamento no `pnpm start:hml`. Conferido sem mudança: `:30` (`SEED_FICTICIO` nunca em produção).

### `docs/operacao/deploy.md`

- `:5` e `:10`: versão 0.1.6 e "Atualizado em" com o que é do `devops-sre` e o que é desta etapa.
- `:101-107` (seção 4): a `:latest` passa a ser a 0.1.6, e **a primeira publicação fica bloqueada pelo M-1** até o
  0008 ou o aceite de Fabiano e da `gestao-riscos`. `:117`: "merges da 0.1.1 à 0.1.6".
- `:228-232` (seção 7): o seed recusa `BETTER_AUTH_URL` fora do loopback, como segunda barreira.
- `:238-242` (seção 8, passo 2): como o erro de tela aparece no log (`erro_requisicao`, `console_erro`) e no Sentry, sem
  o `erroId`.
- `:258-261` (seção 9): `aviso_email_falhou` na 1ª tentativa só para 4xx que não é 408, 409 nem 429.
- Conferidos sem mudança (escritos pela `05-devops-sre.md`): `:189-195` (volta da 0.1.6 pelo caminho A) e `:268-273`
  (seção 10, actions por SHA). Ambos batem com o código e com a entrega da 05. Nada contradiz `Dockerfile` nem
  workflow: não há devolução à `05-entrega`.

## Decisões tomadas

- M-1, M-2 e M-3 nomeados com a ressalva de que não são os M-01 a M-03 da 0.1.0: os dois esquemas convivem no CHANGELOG, e o mesmo termo não pode significar duas coisas.
- O bloqueio do M-1 entrou em três lugares (topo da entrada 0.1.6, pendência M-1 e seção 4 do `deploy.md`): é a seção que Fabiano segue para publicar, e o pedido do maestro foi registrar o bloqueio.
- O manual descreve o código, não a triagem: o `capturarErro` não manda o `erroId` ao Sentry, ao contrário do que a `02-tech-lead.md` diz; o manual e o `deploy.md` dizem como casar log e Sentry hoje, e a divergência foi para Pendências.
- As notas antigas da 0.1.0 e da 0.1.5 receberam só "Fechada na 0.1.6", sem reescrever o que diziam: o histórico fica, e quem lê a pendência antiga sabe que ela fechou.
- O exemplo de log no cap. 02 não traz `level` nem hora: o formato exato desses campos do pino não foi lido nesta etapa, e o exemplo só mostra os campos que o código grava.
- `01-arquitetura.md` não mudou: cita `src/lib/` como "log", que segue certo, e não cita `instrumentation.ts`.

## Pendências

- Para a Parada 3 (Fabiano): o M-1 bloqueia a primeira publicação até o pedido 0008 ou o aceite de Fabiano e da `gestao-riscos`; está no CHANGELOG e na seção 4 do `deploy.md`.
- Divergência entre entrega e código, para a Parada 3: a `02-tech-lead.md` diz que o `erroId` casa o log com o Sentry, mas `src/lib/sentry.ts:40-46` manda só título `<classe> <code>`, quadros da pilha e a tag `evento`. Sugestão: levar o `erroId` como tag no pedido 0008.
- Para a `ux-ui-design`, à parte: os dois textos de 409 `demandaFinal` e se a T11 esconde as ações em demanda final (B-4), registrados no cap. 08.
- O link do glossário e os links novos apontam para âncoras geradas pelo GitHub a partir dos títulos; não há renderizador nesta etapa para conferi-las, só a leitura dos títulos.

## Comandos executados

Nenhum.

## Critério de pronto atendido

- [x] (06) o `CHANGELOG.md` tem a entrada da versão do `package.json`, com o que foi corrigido e as pendências abertas
- [x] (06) todo trecho de `README.md` e `docs/manual-tecnico/` que cita a função, o arquivo ou o RF corrigido descreve o código depois da correção (trechos achados com Grep e listados na entrega)
- [x] os links internos apontam para arquivos que existem
