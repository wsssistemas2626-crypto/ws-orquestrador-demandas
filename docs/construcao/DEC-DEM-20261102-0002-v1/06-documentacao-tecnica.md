---
pedido: DEC-DEM-20261102-0002-v1
etapa: 06-documentacao
agente: documentacao-tecnica
leu: [pedido.json, contrato-passagem.md, 01-qa-funcional.md, 02-tech-lead.md, 03-engenheiro-frontend.md, 04-qa-automacao.md, 04-maestro.md, 05-devops-sre.md, package.json, CHANGELOG.md, README.md, docs/manual-tecnico/README.md, docs/manual-tecnico/08-painel.md, docs/manual-tecnico/10-configuracao-e-scripts.md, docs/operacao/deploy.md, playwright.config.ts, e2e/apoio.ts, scripts/seed-ficticio.ts, .github/workflows/deploy.yml]
status: pronto
proximo: maestro
devolvido_para: null
---
## Entrega

Documentação da 0.1.1. Esta versão só muda testes e2e, o seed fictício e a versão, e nenhum comportamento do sistema
muda. Toda a documentação foi conferida contra o código do ramo.

### `CHANGELOG.md`: entrada da versão do `package.json` (0.1.1)

- `CHANGELOG.md:6`: seção nova `## 0.1.1 — 2026-11-02`, acima da 0.1.0.
- `CHANGELOG.md:10-13`: diz que nenhum comportamento muda, sem migration nem variável nova, e quais pastas ficaram fora
  do diff.
- `CHANGELOG.md:15-48` ("O que mudou"):
  - o `document-title` falso e a espera do `<title>` em `semViolacoes`;
  - o 429 da T07 e a troca por demandas do seed (`demandaDoSeed`), com a "cto" de 30 de 30 para 27 de 30 e o C-36
    intacto;
  - a spec nova `e2e/sem-violacoes.spec.ts`;
  - as três demandas novas do seed (de 11 para 14);
  - a versão e o teste estático;
  - a documentação.
- `CHANGELOG.md:50-59` ("Verificações"): os números da 03, da 04 e da 05. A homologação e o ensaio de rollback ficam
  para a Parada 3.
- `CHANGELOG.md:61-103` ("Pendências abertas"):
  - da `04-maestro.md`: M-01 deste pedido, B-01, B-02 e o Minor da triagem, com as observações baixas da 04;
  - da `05-devops-sre.md`: os segredos de webhook, a primeira publicação, o rollback da 0.1.1 pelo caminho A, as actions
    por SHA, o tamanho da imagem e a imagem local que ficou na VPS;
  - a lembrança de que as pendências da 0.1.0 continuam abertas.

### Trechos de `README.md`, `docs/manual-tecnico/` e `docs/operacao/` conferidos

Os trechos foram achados com Grep. Os termos buscados foram: `semViolacoes`, `seed-ficticio`, `seed fict`,
`TITULOS_DO_E2E`, `demandaDoSeed`, `sem-violacoes`, `parecer-risco-qa`, `decisao.spec`, `apoio.ts`, `document-title`,
`0.1.0`, `126 testes`, `C-36`, `30 demandas`, `test:e2e`, `e2e/`, `fictíci`, `axe`, `Playwright` e `<title>`.

**Mudaram**

| Arquivo:linha | Antes | Depois |
|---|---|---|
| `README.md:5-6` | Versão 0.1.0 (`package.json`), atualizado em 31/10/2026 | Versão 0.1.1, atualizado em 02/11/2026 |
| `docs/manual-tecnico/README.md:5-6` | Versão do sistema 0.1.0 | 0.1.1, com a nota "sem mudança de comportamento desde a 0.1.0" e link para o `CHANGELOG.md`; data 02/11/2026 |
| `docs/manual-tecnico/08-painel.md:5` e `:39-43` | A acessibilidade dizia só "axe sem violação no Playwright" | Parágrafo novo sobre `semViolacoes` (`e2e/apoio.ts`): espera `<title>` não vazio por até 5 s, roda o axe em qualquer caso, reprova pela `document-title` sem título, nenhuma regra desligada; `e2e/sem-violacoes.spec.ts` confere os dois casos |
| `docs/manual-tecnico/10-configuracao-e-scripts.md:5` e `:50` | O seed "cria contas, preço e demandas fictícias" | Quatro contas de `CONTAS_FICTICIAS`, o preço do modelo fictício e 14 demandas: 5 da `cto` e 9 próprias do e2e (`TITULOS_DO_E2E`), da conta `sem2fa`, para o e2e não gastar o limite por hora |
| `docs/operacao/deploy.md:5` | Versão 0.1.0 | 0.1.1 (pedido da 05) |
| `docs/operacao/deploy.md:10` | Atualizado em 31/10/2026 | 02/11/2026, com o que mudou (pedido da 05) |
| `docs/operacao/deploy.md:98-102` | "Primeira publicação (versão 0.1.0)"; o texto dizia que o `deploy.yml` não chama os webhooks porque todas as migrations são novas | "Primeira publicação". A 0.1.0 está no GHCR, mas os serviços não existem. A primeira publicação de verdade usa a `:latest`, que depois do merge é a 0.1.1, com as mesmas 7 migrations |
| `docs/operacao/deploy.md:110-117` (passo 5) | "Esperar o `deploy.yml` verde (imagem publicada; aviso de migration pendente)" | Os dois casos que o `deploy.yml` produz (detalhes abaixo da tabela) |
| `docs/operacao/deploy.md:183-185` | Nada sobre o rollback da 0.1.1 | A 0.1.1 não traz migration, e a volta é o caminho A, para `:dd8ddee6d8a30cda8dff0f1a45f0abe30db8f364` (`v0.1.0`). Foi só conferida no código, e o ensaio fica para a Parada 3 |

Os dois casos do passo 5 do `deploy.md`:

- **Com migration nova** (como no merge da 0.1.0): a execução fica verde, com o aviso.
- **Sem migration nova** (como no merge da 0.1.1):
  - sem os segredos, a execução fica vermelha no passo "Disparar o Easypanel", com a imagem já publicada e sem a
    limpeza do GHCR;
  - com os segredos, os webhooks disparam antes da migration, e a saúde dá 503 até ela rodar;
  - por isso, o passo diz para cadastrar os segredos só depois do passo 7.

O texto do passo 5 vem do `deploy.yml:72-106`. O texto antigo contradizia o código no merge da 0.1.1.

**Conferidos e mantidos**, porque já descrevem o código depois da correção:

- `README.md:34`, `:46`, `:51-53` e `:120`: o `pnpm test:e2e` e o `e2e/servidor.ts`. Este último não mudou.
- `README.md:68` e `:100`: o seed para `CONTAS_FICTICIAS` e o comando do seed. Nenhum dos dois mudou.
- `README.md:19`, `docs/operacao/deploy.md:70` e `:95`, `docs/manual-tecnico/06-agentes-de-ia.md:9` e
  `docs/manual-tecnico/01-arquitetura.md:31` dizem "na 0.1.0" sobre os agentes desligados. Na 0.1.1 isso continua
  igual, e as frases continuam verdadeiras.
- `docs/manual-tecnico/03-demandas.md:25`, `09-referencia-api.md:97` e `01-arquitetura.md:46`: o C-36, com 30 demandas
  e 60 versões por hora. `src/modules/limites.ts` não mudou.
- `docs/manual-tecnico/10-configuracao-e-scripts.md:30`, `:32` e `:54-56`: `SEED_FICTICIO`, `BASE_URL` e `CI`, e o
  aviso do M-07. Nada disso mudou.
- `docs/manual-tecnico/01-arquitetura.md:56` e `:113`: `scripts/`, Playwright e axe. As versões das dependências não
  mudaram.
- `docs/manual-tecnico/08-painel.md:8` e `:36-37`: as fontes e as `TAGS_AXE`, que são as mesmas de `e2e/apoio.ts:11`.
- `docs/operacao/deploy.md:18`, `:179` e `:183-184` (seção 7, antes da edição): o e2e no CI e no `homologar` e o seed
  com segredos públicos. Nada disso mudou.

### Links internos

O link novo é `docs/manual-tecnico/README.md:5` → `../../CHANGELOG.md`, e o arquivo existe na raiz do repositório.
Os outros links dos trechos editados já existiam e não mudaram.

## Decisões tomadas

- Deixei o B-02 (`playwright.config.ts:4`) como pendência, sem editar o arquivo. Ele está fora da minha lista **Pode**, que só cobre `README.md`, `CHANGELOG.md`, `docs/manual-tecnico/` e `docs/operacao/`.
- Corrigi o passo 5 da seção 4 do `deploy.md` além do campo "Versão". O texto antigo contradizia o `deploy.yml` no merge da 0.1.1, e a correção é só de documento, sem mexer em `Dockerfile` nem em workflow, então não há motivo para devolver à 05.
- No passo 5, a orientação de cadastrar os segredos de webhook depois do passo 7 vem do código. Com os segredos já cadastrados, o webhook dispara antes da migration, e a saúde dá 503.
- Mantive as frases "na 0.1.0" sobre os agentes desligados. Elas continuam verdadeiras, e trocá-las sairia do escopo de uma versão sem mudança de comportamento.
- No `CHANGELOG.md`, o M-01 da revisão deste pedido aparece como "M-01 deste pedido", para não se confundir com o M-01 da 0.1.0.
- Citei o SHA do alvo do rollback (`dd8ddee6…`) por inteiro. É um commit público do repositório, e não um segredo.

## Pendências

- B-02: o comentário de `playwright.config.ts:4` ("Os dados de cada teste são criados pela API") continua desatualizado. A correção cabe a quem pode editar o arquivo (engenheiro ou `qa-automacao`), num pedido seguinte ou numa liberação do maestro.
- Para o `devops-sre` e para Fabiano: a ordem da `05-devops-sre.md` para a primeira publicação põe os segredos de webhook no passo 3, antes da migration. O `deploy.md` agora diz para cadastrá-los depois do deploy manual (seção 4, passo 5). As duas ordens funcionam se não houver push na `main` entre o cadastro e a migration. Vale o `devops-sre` confirmar qual delas fica.
- As pendências da 04 e da 05 estão no `CHANGELOG.md:61-103`: M-01 deste pedido, B-01, o Minor da triagem, os segredos de webhook, a primeira publicação, o rollback pelo caminho A, as actions por SHA, o tamanho da imagem e a imagem local na VPS.
- Seguem para Fabiano, como antes: os médios M-01 a M-07 e o médio do reteste da 0.1.0, a leitura do QR com aparelho real e a configuração do pipeline e do Easypanel.

## Comandos executados

Nenhum.

## Critério de pronto atendido

- [x] (06) o `CHANGELOG.md` tem a entrada da versão do `package.json`, com o que foi corrigido e as pendências abertas
- [x] (06) todo trecho de `README.md` e `docs/manual-tecnico/` que cita a função, o arquivo ou o RF corrigido descreve o código depois da correção (trechos achados com Grep e listados na entrega)
- [x] os links internos apontam para arquivos que existem
