---
pedido: DEC-DEM-20261102-0005-v1
etapa: 06-documentacao
agente: documentacao-tecnica
leu: [contrato-passagem.md, pedido.json, 01-qa-funcional.md, 02-tech-lead.md, 03-engenheiro-frontend.md, 04-qa-automacao.md, 04-maestro.md, 05-devops-sre.md, DEC-DEM-20261102-0004-v1/06-documentacao-tecnica.md, CHANGELOG.md (linhas 1-120), README.md (linhas 1-70 e Grep), docs/manual-tecnico/README.md (linhas 1-12), docs/manual-tecnico/08-painel.md (linhas 30-49), docs/operacao/deploy.md, package.json (campo version), e2e/decisao.spec.ts (Grep do "Arquivar", do semViolacoes novo e do teste de 404), test/estatico/decisao-e2e.test.ts (Grep dos describe/it e linhas 178-212)]
status: pronto
proximo: maestro
devolvido_para: null
---
## Entrega

Notas da 0.1.4 e os trechos de documentação que citam a versão, o rollback, o axe e o teste corrigido. Nenhum
comportamento do sistema mudou neste pedido (`src/` intacto; mudaram `e2e/decisao.spec.ts`,
`test/estatico/projeto.test.ts`, o `version` do `package.json` e entrou `test/estatico/decisao-e2e.test.ts`), então
nenhum capítulo do manual que descreve RF precisou de correção de conteúdo.

### Arquivos editados

- `CHANGELOG.md`: seção nova `## 0.1.4 — 2026-11-02` (linha 6), acima da 0.1.3, com:
  - o escopo: só os três arquivos de teste ou versão e o teste estático novo; nada em `src/`, `scripts/`, `drizzle/`,
    `.github/`, `Dockerfile`, `playwright.config.ts` nem `e2e/apoio.ts`; sem migration e sem variável nova; o axe não
    achou violação, então a tela não mudou; imagem igual à da 0.1.3 fora do `package.json`;
  - que ela fecha as duas pendências da revisão da 0.1.3 (B-1 do cabeçalho e o arquivado sem axe);
  - "O que mudou" (`:21`): o axe no "Arquivar" (`e2e/decisao.spec.ts:348` e `:366`), o reflow do cabeçalho
    (`:1-28`, até 120 caracteres, sem órfã, frase do axe com todos os estados), o teste estático novo e o que ele
    trava, a versão e a documentação;
  - "Verificações" (`:53`): `pnpm test` 3.711 de 3.711 em 193 arquivos, lint e typecheck limpos, e2e 143 de 143 três
    vezes seguidas com o "Arquivar" aprovado, `--repeat-each=3` com 19 aprovados, 8 pulados com mensagem (reporter
    JSON) e 0 falha, os controles negativos (`image-alt` e o estático sem a linha nova), a largura do cabeçalho medida
    por ferramenta, revisão sem achado crítico, alto ou médio, `docker build` de 1,74 GB e 425 MB; homologação,
    ensaio de rollback e CI do PR para a Parada 3;
  - "Pendências abertas" (`:73`): do `04-maestro.md`, B-1 e B-2 (limites do teste estático novo), o Prettier fora do
    CI e as pendências da primeira publicação dos PR #1 a #5; do `05-devops-sre.md`, os segredos de webhook, a
    primeira publicação com a `:latest` = 0.1.4, o rollback pelo caminho A para a `v0.1.3` (`00a924e…`, tag a
    conferir em Packages, volta não ensaiada), o `.env.example` conferido sem grep, as actions por SHA e o tamanho da
    imagem, a imagem local; e as que continuam (N-04 da 0.1.3, as da 0.1.2 e as da 0.1.0).
- `docs/operacao/deploy.md`, como a 05 pediu:
  - `:5`: "Versão" de 0.1.3 para 0.1.4;
  - `:10`: "Atualizado em" passa a dizer versão 0.1.4, primeira publicação com a 0.1.4 (seção 4) e rollback da 0.1.4
    (seção 6);
  - `:101-102` (seção 4): a `:latest` da primeira publicação passa a ser a 0.1.4, com as mesmas 7 migrations da 0.1.0;
  - `:112-113` (seção 4, passo 5): o exemplo "sem migration nova" passa a citar os merges da 0.1.1 à 0.1.4;
  - `:184-194` (seção 6): a 0.1.4 não traz migration, e a volta dela é o caminho A, para
    `ghcr.io/wsssistemas2626-crypto/ws-orquestrador-demandas:00a924ec746d731c9c0c9fb9a95bcf4c6d7f3c17` (a `v0.1.3`,
    merge do PR #5), com a conferência da tag em Packages antes de voltar e o aviso de que a volta só foi conferida no
    código; o parágrafo da volta da 0.1.3 para a `v0.1.2` (`b8a8c44…`, alternativa `01a26a8…`) ficou como registro
    curto, acima dos da 0.1.2 e da 0.1.1.
- `README.md:5`: "Versão" de 0.1.3 para 0.1.4.
- `docs/manual-tecnico/README.md:5`: "Versão do sistema" de 0.1.3 para 0.1.4, mantendo "sem mudança de comportamento
  desde a 0.1.0".
- `docs/manual-tecnico/08-painel.md:43-46` (seção Acessibilidade): duas frases novas. O axe da T11 roda também na tela
  arquivada (`e2e/decisao.spec.ts`, teste "Arquivar"), e o `test/estatico/decisao-e2e.test.ts` reprova no `pnpm test`
  se algum `e2e/**/*.ts` usar `disableRules`, `disableOtherRules`, `exclude`, `include`, `withRules` ou `options` do
  axe, ou se outro arquivo além de `e2e/apoio.ts` montar o `AxeBuilder`. Conferido no código do teste
  (`test/estatico/decisao-e2e.test.ts:182-198`).

### Trechos conferidos e mantidos (achados com Grep por `0.1.x`, `decisao.spec`, `semViolacoes`, `axe`, `arquivad`, `Arquivar`, `decisao-e2e`, `test/estatico`)

- `README.md:51-53`: "`pnpm test:e2e` roda o Playwright com axe", sem e com `BASE_URL`. Continua certo:
  `e2e/servidor.ts`, `playwright.config.ts` e `e2e/apoio.ts` não mudaram.
- `README.md:54-58`: os testes que precisam de banco recém-semeado são pulados com `exige banco recém-semeado:
  <motivo>` sem `CI` e reprovam com `CI`. Continua certo: a pré-condição do "Arquivar" e `exigeBancoRecemSemeado` não
  mudaram, e a 04 confirmou a mensagem em cada pulo pelo reporter JSON.
- `README.md:125`: "`pnpm test` / `pnpm test:e2e` | Vitest com Testcontainers / Playwright com axe". Continua certo; o
  teste estático novo é Vitest e entra no `pnpm test` sem mudar o comando.
- `docs/manual-tecnico/08-painel.md:36-42`: as cinco tags do axe, `semViolacoes` em `e2e/apoio.ts`, zero violação,
  espera do `<title>`, nenhuma regra desligada e o `e2e/sem-violacoes.spec.ts`. Continua certo: `e2e/apoio.ts` não
  mudou (04-maestro, critério 1).
- `README.md:19`, `docs/manual-tecnico/06-agentes-de-ia.md:9` e `docs/manual-tecnico/01-arquitetura.md:31`: citam a
  0.1.0 como marco dos agentes desligados, não como versão atual. Mantidos.
- Links internos novos: nenhum. O link do manual para `../../CHANGELOG.md`, o do `deploy.md` para
  `../manual-tecnico/06-agentes-de-ia.md` e os do `README.md` para `docs/manual-tecnico/README.md`,
  `docs/operacao/deploy.md` e `CHANGELOG.md` apontam para arquivos que existem.

## Decisões tomadas

- A versão do `README.md` e do manual técnico passa a 0.1.4: os dois dizem a versão do `package.json`.
- Nenhum capítulo de RF mudou: o pedido não toca em `src/`, e o manual descreve o código (padrão técnico, seção 11).
- O cap. 08 ganhou duas frases sobre o axe do arquivado e o teste estático: é a seção que descreve a verificação do axe, e o teste novo passa a ser parte dela; a lista de silenciadores foi copiada do regex do teste, sem generalizar.
- A seção da 0.1.3 do `CHANGELOG.md` não foi reescrita: é registro histórico. A 0.1.4 diz que fecha as duas pendências listadas nela.
- Na seção 6 do `deploy.md`, a 0.1.4 tem só um alvo de rollback (`00a924e…`), sem alternativa: a 05 diz que é a única imagem 0.1.3 que o `deploy.yml` construiu. O parágrafo da 0.1.3 virou registro curto, como os das versões anteriores.
- A N-04 entrou entre as que continuam, numa linha: não é deste pedido e não mudou.
- Nenhum valor de segredo nem dado pessoal real foi escrito: os segredos de webhook aparecem só pelo nome.

## Pendências

- Para Fabiano, na Parada 3: as da 0.1.4 no `CHANGELOG.md` (segredos `EASYPANEL_WEBHOOK_APP` e `EASYPANEL_WEBHOOK_WORKER`, primeira publicação com a 0.1.4, rollback pelo caminho A para a `v0.1.3` com a tag conferida em Packages, snapshot antes de qualquer passo, imagem local de 1,74 GB).
- Para quem mexer em `test/estatico/decisao-e2e.test.ts`, `e2e/apoio.ts` ou `e2e/decisao.spec.ts`: B-1 e B-2 do `04-maestro.md`, registradas no `CHANGELOG.md`.
- Divergência entre entrega e código: nenhuma encontrada.

## Comandos executados

Nenhum.

## Critério de pronto atendido

- [x] (06) o `CHANGELOG.md` tem a entrada da versão do `package.json`, com o que foi corrigido e as pendências abertas
- [x] (06) todo trecho de `README.md` e `docs/manual-tecnico/` que cita a função, o arquivo ou o RF corrigido descreve o código depois da correção (trechos achados com Grep e listados na entrega)
- [x] os links internos apontam para arquivos que existem
