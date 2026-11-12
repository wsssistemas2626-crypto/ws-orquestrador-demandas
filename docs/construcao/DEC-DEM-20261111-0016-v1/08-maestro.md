---
pedido: DEC-DEM-20261111-0016-v1
etapa: 08-revisao
agente: maestro
leu: [construir.md seção 3, contrato-passagem.md, pedido.json, spec 2026-11-11-ws-orquestrador-demandas-integracoes-design.md, 04-seguranca-aplicacao.md, 06-T06-tech-lead.md, 06-T08-tech-lead.md, 06-T14-tech-lead.md, 06-T20-tech-lead.md, 06-T20-qa-automacao.md, 07-qa-funcional.md, git diff main...HEAD --stat]
status: pronto
proximo: devops-sre
devolvido_para: null
---
## Entrega

Revisei o ramo `construcao/DEC-DEM-20261111-0016-v1` contra a `main` (`a9fd9b8`, 0.2.0). São 225 arquivos, com 32.578
linhas acrescentadas e 366 removidas.

**Resultado: nenhum achado crítico ou alto.** A versão segue para a entrega (09). Os achados médios e baixos estão em
Pendências.

**Recomendação para Fabiano:** corrigir M-1 a M-5 numa versão 0.3.1 curta **antes de emitir os tokens de produção**. Os
tokens são o que liga o Awave e a busca do /construir. Sem token emitido, nenhuma integração alcança as rotas novas
(401), então publicar a 0.3.0 com esses médios em aberto não expõe nada.

### Revisões usadas

1. **Código:** skill `code-review`, nível alto, sobre o ramo contra a `main`. A `code-review:code-review` pede um PR,
   que ainda não existe nesta etapa. Saíram 10 achados, nenhum que derrube o sistema ou vaze dado.
2. **Segurança:** a skill `security-review` revisa o ramo atual da sessão, que é a estruturaAutonoma. Por isso usei a
   alternativa da seção 3: o agente `seguranca-aplicacao` com o diff do ramo e o `04-seguranca-aplicacao.md`, com os
   achados na resposta e sem gravar arquivo. Ele não achou nada crítico nem alto; achou 2 médios e 4 baixos.

### O que as duas revisões conferiram e acharam limpo

- **Matriz × rotas (IN-01):** abre só 5 pares, com `switch` exaustivo e falha fechada. As 26 rotas passam por
  `rota({ acao })`. Token de agente não vira integração, e token de integração não vira agente.
- **Leitura do Awave (IN-08):** a autoria entra no mesmo `WHERE`, numa consulta só. Demanda de outro autor e demanda
  inexistente recebem a mesma resposta, então a rota não revela se a demanda existe. A vista tem 6 chaves, com o título
  minimizado.
- **Gatilhos (IN-06):** `dispararSeLigado` confere a confirmação antes de tudo nos 4 agentes. A confirmação só pode
  vir de pessoa com 2FA, pela `acaoDoPainel`.
- **Tokens:** gravados como SHA-256 com prefixo. Não aparecem em log, resposta nem evento; o evento só leva
  `{ integracao, prefixo }`.
- **Migration 0007:** aditiva, sem UPDATE nem DELETE; as linhas que já existem satisfazem os CHECKs novos.
- **Entregas ao /construir:** `pedido_entregue` é gravado uma vez por hash. O /construir não consegue alterar decisão,
  DEC nem demanda.
- **IN-15:** `src/lib`, `proxy.ts`, `resolver-ator.ts`, `exigir-pessoa.ts`, `auth.ts` e `privilegios.ts` não têm diff.
- **Dependências:** o lockfile não mudou. `pnpm audit --prod` dá as mesmas 5 moderadas transitivas de antes, nenhuma
  alta nem crítica.

## Decisões tomadas

- Nenhum achado foi classificado como crítico ou alto:
  - Os médios dependem de condições que não acontecem no fluxo normal: banco lento, corrida entre entrega e
    recebimento, ou uma linha de execução fora do padrão.
  - O M-1 exige um token de agente legítimo e segue o CA-10.6 aprovado.
  - Nenhum deles é explorável por quem está fora da empresa.
- O M-1 muda um critério aprovado (CA-10.6). Por isso fica para Fabiano decidir; o maestro não decide isso sozinho.
- A revisão de segurança rodou `git grep`, fora da regra. Foi leitura no repositório do pedido e não está numa entrega
  de agente da cadeia. Registro aqui.

## Pendências

**Médios:** recomendação de corrigir numa 0.3.1 antes de emitir os tokens de produção.

- **M-1 (segurança).** O token de agente lê o texto e escreve ESP/RSK numa demanda do Awave ainda não confirmada, por
  `consultas.ts:386`/`:328`, `especificacoes/servico.ts:55` e `pareceres-risco/servico.ts:63`. O código segue o
  CA-10.6, mas o D1 ("nenhum agente de IA antes da confirmação") só vale no worker.
  - Correção: 404 do inexistente para agente quando `aguardaConfirmacao`, e 409 em ESP/RSK/DEC para agente.
  - Decisão de Fabiano: muda o CA-10.6.
- **M-2 (código e segurança).** `servico.ts:229`: o 201 do POST do Awave é lido depois do COMMIT, fora do orçamento
  de tempo e sem a tradução para 503. Com o banco lento, o Awave pode repetir o pedido e criar uma demanda duplicada.
  - Correção: ler com `obterDemandaDaIntegracao(tr.tx, ...)` dentro da transação orçada.
- **M-3 (código).** `integracoes/tempo-limite.ts:27`: o orçamento vale por instrução, e não pela transação inteira, e
  a espera por uma conexão livre do pool não tem limite. Assim, não fica garantido que o servidor desista antes do
  cliente.
  - Correção: prazo total da transação, com tempo-limite também na espera pela conexão.
- **M-4 (código).** `pedido-construcao/receber.ts:38`: o recebimento trava em `pedido:<decId>` e a entrega trava na
  demanda. Numa corrida, o recebimento grava o hash antigo e a entrega nova fica sem confirmação.
  - Correção: a mesma trava nas duas rotas.
- **M-5 (código).** `agentes/executar.ts:239`: a guarda do worker usa `exec.demandaId`, mas `montarEntrada` lê pela
  `chaveEntrada`. Quando bloqueia, a guarda encerra a execução como `ignorada` e gasta a chave única; a confirmação
  posterior não dispara o insumo.
  - Hoje é inalcançável no fluxo normal (a segurança diz "basta hoje", B-3).
  - Correção: conferir a demanda da entrada e não gastar a chave.

**Baixos (dívida registrada):**

- B-1: `e2e/integracoes.spec.ts:27`: falta `test.use({ trace: 'off' })`, como já está no arquivo irmão. Sem isso, o
  token do e2e local pode ir para `test-results/` quando um teste falha.
- B-2: `scripts/criar-token-servico.ts:114`: terminar com `else throw` (ou `switch` com `never`) para não sair com
  sucesso sem emitir.
- B-3: `demandas/confirmacao.ts:8`: `jaConfirmada` deve exigir `ator_tipo = 'pessoa'`.
- B-4: `drizzle/0007`: `CREATE INDEX` sem `CONCURRENTLY` e CHECKs validados na hora, na tabela `evento`. Hoje o volume
  é pequeno; numa próxima migration, usar `CONCURRENTLY` e `NOT VALID` seguido de `VALIDATE`.
- B-5: o mesmo código aparece em vários lugares:
  - `ehAgente` e `RE_PREFIXO` (4 e 3 cópias): exportar de `acesso/ator.ts`;
  - a regra "origem é o Awave" em 5 lugares, um deles divergente (`aguardaConfirmacao` aceita qualquer integração):
    juntar num auxiliar só.
- B-6: `gatilhos.ts:49`: `aguardaConfirmacao` faz 1 a 2 consultas a mais em cada gatilho e job.
- B-7: uma pessoa pode montar ESP, RSK e DEC à mão para uma demanda do Awave nunca confirmada e gerar o pedido.
  `conferirEMontarPedido` pode exigir a confirmação quando a origem for o Awave.

**Da 07 (para Fabiano):**

- QF-0016-01: o nome "Awave" vira "[nome removido]" no título que o Awave e os agentes recebem.
- QF-0016-02: o texto do seed diz "duas aprovações" num DEC que só o CTO aprova.
- QF-0016-03: `minimizar.test.ts:642` é instável e fica fora do pedido.

**Para a 09-entrega (devops-sre):**

- A 0.3.0 tem a migration 0007. Na publicação: backup antes, migration num passo separado e conferência depois. Voltar
  para a 0.2.0 exige restaurar o backup.
- Registrar no `deploy.md` a publicação da 0.2.0 de 11/11 (origem GitHub, ramo `main`, volta pelas imagens locais
  `easypanel/orquestrador/{app,worker}:v0.1.13`). Avisar: com a origem GitHub no ramo `main`, depois do merge da 0.3.0
  qualquer Deploy do `app` leva a migration junto.
- Depois do deploy, e só com Fabiano: emitir os tokens de produção, ligar o `orquestrador.json` e rodar o teste ponta a
  ponta pela rede interna (V01/W16 e V02/W17).

## Critério de pronto atendido

- [x] Revisão de código e de segurança feitas sobre o ramo inteiro, com a revisão usada registrada.
- [x] Nenhum achado crítico ou alto: `status: pronto`, `proximo: devops-sre`.
- [x] Médios e baixos registrados em Pendências, com arquivo e linha.
