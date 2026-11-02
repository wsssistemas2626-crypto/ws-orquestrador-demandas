---
pedido: DEC-DEM-20261102-0003-v1
etapa: 06-documentacao
agente: documentacao-tecnica
leu: [contrato-passagem.md, pedido.json, 01-qa-funcional.md, 02-tech-lead.md, 03-engenheiro-frontend.md, 04-qa-automacao.md, 04-maestro.md, 05-devops-sre.md, CHANGELOG.md, README.md, docs/manual-tecnico/README.md, docs/manual-tecnico/08-painel.md, docs/manual-tecnico/10-configuracao-e-scripts.md (linhas 1-57), docs/operacao/deploy.md, package.json (campo version), playwright.config.ts, e2e/decisao.spec.ts (exigeBancoRecemSemeado e chamadas), e2e/apoio.ts (trechos), e2e/axe-todas.spec.ts (trechos), e2e/pedido-construcao.spec.ts (trechos)]
status: pronto
proximo: maestro
devolvido_para: null
---
## Entrega

Notas da 0.1.2 e os trechos de documentação que citam o que mudou. Nenhum comportamento do sistema mudou neste pedido
(só e2e, o comentário do `playwright.config.ts`, a conferência da versão e o campo `version`), então nenhum capítulo do
manual que descreve RF precisou de correção de conteúdo.

### Arquivos editados

- `CHANGELOG.md`: seção nova `## 0.1.2 — 2026-11-02` (linha 6), acima da 0.1.1, com:
  - o escopo: só testes e2e, comentário do `playwright.config.ts`, `test/estatico/projeto.test.ts` e versão; nada em
    `src/`, `scripts/`, `drizzle/`, `.github/`, `Dockerfile`; nenhuma linha de configuração do Playwright; sem
    migration e sem variável nova; imagem igual à da 0.1.1 fora do `package.json`;
  - que ela fecha a M-01, a B-01 e a B-02 de teste registradas na 0.1.1;
  - "O que mudou": M-01 (`prepararEspERsk`), B-01 do duplo clique e da T07 (`proximoId`, lista exata), B-01 da
    `decisao.spec.ts` (`exigeBancoRecemSemeado`: pula com mensagem sem `CI`, reprova com `CI`), testes novos da A-02 e da
    M-01, `e2e/preparacao.spec.ts`, paginação na busca do seed (N-03), 404 com versão calculada (N-01), comentário do
    `playwright.config.ts`, versão e documentação;
  - "Verificações": `pnpm test` 3.697 de 3.697, lint e typecheck limpos, e2e 142 de 142 três vezes seguidas,
    `--repeat-each=3` com 75 aprovados, 6 pulados com mensagem e 0 falha, a M-01 forçada pelo estado, `docker build`
    igual à 0.1.1, homologação e ensaio de rollback para a Parada 3;
  - "Pendências abertas": a B-01 do `04-maestro.md` ("Arquivar" aceita `encerrada` fora do CI) e as pendências da
    primeira publicação; as do `05-devops-sre.md` (segredos de webhook, primeira publicação com a `:latest` = 0.1.2,
    rollback da 0.1.2 pelo caminho A para a `v0.1.1`, actions por SHA e tamanho da imagem, imagem local); e, à parte,
    as registradas nas outras etapas (N-02 do C-36, N-04, teste C-13 sensível a CPU, login TOTP em falhas em sequência,
    buscadores do seed nas outras specs, arquivos em `e2e/test-results/`); as da 0.1.0 continuam.
- `docs/operacao/deploy.md`, como a 05 pediu:
  - `:5`: "Versão" de 0.1.1 para 0.1.2;
  - `:10`: "Atualizado em" passa a dizer versão 0.1.2, primeira publicação com a 0.1.2 (seção 4) e rollback da 0.1.2
    (seção 6);
  - `:101-102` (seção 4): a `:latest` da primeira publicação passa a ser a 0.1.2, com as mesmas 7 migrations da 0.1.0;
  - `:112-113` (seção 4, passo 5): o exemplo "sem migration nova" passa a citar os merges da 0.1.1 e da 0.1.2;
  - `:184-191` (seção 6): a 0.1.2 não traz migration, e a volta dela é o caminho A, para
    `ghcr.io/wsssistemas2626-crypto/ws-orquestrador-demandas:30b71b5185cb58d403847b95532e54b5a299e77a` (a `v0.1.1`), com
    a conferência da tag em Packages antes de voltar; o parágrafo da volta da 0.1.1 para a `v0.1.0` ficou como
    registro, uma frase.
- `README.md`:
  - `:5`: "Versão" de 0.1.1 para 0.1.2;
  - `:54-58`: item novo em "Instalar e verificar", logo depois do que descreve o `pnpm test:e2e`: as duas fontes de dado
    do e2e, o acúmulo de versões no mesmo banco, o pulo com `exige banco recém-semeado: <motivo>` sem `CI` e a
    reprovação com `CI`, e o 429 do limite por hora quando a suíte inteira se repete na mesma hora contra o mesmo banco.
- `docs/manual-tecnico/README.md`:
  - `:5`: "Versão do sistema" de 0.1.1 para 0.1.2, mantendo "sem mudança de comportamento desde a 0.1.0".

### Trechos conferidos e mantidos (achados com Grep por `e2e/`, `apoio.ts`, `playwright.config`, `seed`, versão)

- `README.md:50-53`: o `pnpm test:e2e` sem e com `BASE_URL`. Continua certo: `e2e/servidor.ts` e o `webServer` não
  mudaram.
- `docs/manual-tecnico/08-painel.md:8` e `:36-43`: a verificação do axe em `semViolacoes` (`e2e/apoio.ts`) e o
  `e2e/sem-violacoes.spec.ts`. Continua certo: `semViolacoes` e `TAGS_AXE` não mudaram; o `apoio.ts` só ganhou a
  paginação da `demandaDoSeed`.
- `docs/manual-tecnico/10-configuracao-e-scripts.md:32` (`BASE_URL`, `CI` só no e2e) e `:50` (o seed com 14 demandas,
  9 delas do e2e). Continua certo: o seed não mudou, e `CI` continua sendo variável só do e2e.
- `docs/manual-tecnico/06-agentes-de-ia.md:9`, `01-arquitetura.md:31` e `README.md:19` ("na 0.1.0"): descrevem o
  estado dos agentes, que não mudou. Mantidos.
- Links internos novos: nenhum. O link do manual para `../../CHANGELOG.md` aponta para arquivo que existe.

## Decisões tomadas

- A versão do `README.md` e do manual técnico passa a 0.1.2: os dois dizem a versão do `package.json`, e deixá-la em 0.1.1 tornaria a capa desatualizada.
- O `README.md` ganhou o comportamento do e2e repetido contra o mesmo banco: é o que mudou para quem roda a suíte, e o `pnpm test:e2e` com `BASE_URL` já estava descrito ali.
- Nenhum capítulo de RF mudou: o pedido não toca em `src/`, e o manual descreve o código (padrão técnico, seção 11).
- A seção da 0.1.1 do `CHANGELOG.md` não foi reescrita: é registro histórico. A 0.1.2 diz que fecha a M-01, a B-01 e a B-02 de teste listadas nela.
- Na seção 6 do `deploy.md`, a frase da volta da 0.1.1 ficou como registro curto, abaixo da 0.1.2, para quem precisar voltar duas versões.
- As pendências das etapas 01 a 04 que não estavam no `04-maestro.md` nem no `05-devops-sre.md` foram listadas à parte, para não se perderem na Parada 3.
- Nenhum valor de segredo foi escrito: os segredos de webhook aparecem só pelo nome, e as contas do e2e só pela constante `CONTAS_FICTICIAS`.

## Pendências

- Para Fabiano, na Parada 3: as da 0.1.2 no `CHANGELOG.md` (segredos `EASYPANEL_WEBHOOK_APP` e `EASYPANEL_WEBHOOK_WORKER`, primeira publicação com a 0.1.2, rollback pelo caminho A para a `v0.1.1` com a tag conferida em Packages, snapshot antes de qualquer passo).
- Para o `qa-automacao`, num pedido seguinte: a B-01 do `04-maestro.md` ("Arquivar" fora do CI).
- Divergência entre entrega e código: nenhuma encontrada.

## Comandos executados

Nenhum.

## Critério de pronto atendido

- [x] (06) o `CHANGELOG.md` tem a entrada da versão do `package.json`, com o que foi corrigido e as pendências abertas
- [x] (06) todo trecho de `README.md` e `docs/manual-tecnico/` que cita a função, o arquivo ou o RF corrigido descreve o código depois da correção (trechos achados com Grep e listados na entrega)
- [x] os links internos apontam para arquivos que existem
