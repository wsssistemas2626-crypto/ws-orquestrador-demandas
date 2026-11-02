---
pedido: DEC-DEM-20261102-0004-v1
etapa: 06-documentacao
agente: documentacao-tecnica
leu: [contrato-passagem.md, pedido.json, 01-qa-funcional.md, 02-tech-lead.md, 03-engenheiro-frontend.md, 04-qa-automacao.md, 04-maestro.md, 05-devops-sre.md, DEC-DEM-20261102-0003-v1/06-documentacao-tecnica.md, CHANGELOG.md, README.md (linhas 1-65 e Grep), docs/manual-tecnico/README.md (linhas 1-10), docs/manual-tecnico/03-demandas.md (linhas 80-99), docs/manual-tecnico/04-versoes-e-decisao.md (linhas 98-117), docs/operacao/deploy.md, package.json (campo version), e2e/decisao.spec.ts (Grep do "Arquivar", da pré-condição e do teste de 404)]
status: pronto
proximo: maestro
devolvido_para: null
---
## Entrega

Notas da 0.1.3 e os trechos de documentação que citam a versão, o rollback e o teste corrigido. Nenhum comportamento do
sistema mudou neste pedido (só `e2e/decisao.spec.ts`, `test/estatico/projeto.test.ts` e o `version` do
`package.json`), então nenhum capítulo do manual que descreve RF precisou de correção de conteúdo.

### Arquivos editados

- `CHANGELOG.md`: seção nova `## 0.1.3 — 2026-11-02` (linha 6), acima da 0.1.2, com:
  - o escopo: só `e2e/decisao.spec.ts`, `test/estatico/projeto.test.ts` e o `version`; nada em `src/`, `scripts/`,
    `drizzle/`, `.github/`, `Dockerfile`, `playwright.config.ts`, `e2e/apoio.ts`, `e2e/preparacao.ts` nem em
    `exigeBancoRecemSemeado`; sem migration e sem variável nova; imagem igual à da 0.1.2 fora do `package.json`;
  - que ela fecha a B-01 da revisão da 0.1.2;
  - "O que mudou" (`:20`): o "Arquivar" (pré-condição só com `ORIGENS_DO_FLUXO`, pulo com mensagem sem `CI`,
    reprovação com `CI`, status conferido antes e depois, `statusDecisao` `arquivada`), o teste de 404 e sessão
    separado, o comentário do cabeçalho, a versão e a documentação;
  - "Verificações" (`:51`): `pnpm test` 3.697 de 3.697, lint e typecheck limpos, e2e 143 de 143 três vezes seguidas,
    `--repeat-each=3` com 19 aprovados, 8 pulados com mensagem e 0 falha, a reprodução do defeito antes e depois da
    correção, revisão sem achado crítico, alto ou médio, `docker build` igual à 0.1.2; o ramo do `CI`, a homologação e o
    ensaio de rollback para a Parada 3;
  - "Pendências abertas" (`:71`): do `04-maestro.md`, a B-1 estética do cabeçalho, o axe no estado arquivado
    (observação) e as pendências da primeira publicação dos PR #1 a #3; do `05-devops-sre.md`, os segredos de webhook,
    a primeira publicação com a `:latest` = 0.1.3, o rollback pelo caminho A para a `v0.1.2` (`b8a8c44…`, alternativa
    `01a26a8…`, tag a conferir em Packages), o `.env.example` conferido sem grep nesta versão, as actions por SHA e o
    tamanho da imagem, a imagem local; à parte, a N-04 das outras etapas; e as da 0.1.2 e da 0.1.0 que continuam.
- `docs/operacao/deploy.md`, como a 05 pediu:
  - `:5`: "Versão" de 0.1.2 para 0.1.3;
  - `:10`: "Atualizado em" passa a dizer versão 0.1.3, primeira publicação com a 0.1.3 (seção 4) e rollback da 0.1.3
    (seção 6);
  - `:101-102` (seção 4): a `:latest` da primeira publicação passa a ser a 0.1.3, com as mesmas 7 migrations da 0.1.0;
  - `:112-113` (seção 4, passo 5): o exemplo "sem migration nova" passa a citar os merges da 0.1.1, da 0.1.2 e da 0.1.3;
  - `:184-195` (seção 6): a 0.1.3 não traz migration, e a volta dela é o caminho A, para
    `ghcr.io/wsssistemas2626-crypto/ws-orquestrador-demandas:b8a8c4457dc0603ffb2fc30418cfe906d6684131` (a `v0.1.2`,
    merge do PR #4), com a alternativa `01a26a8321a1bd630c6bb1f70a8b68bfa5bd775f` (merge do PR #3, mesmo código) e a
    conferência da tag em Packages antes de voltar; o parágrafo da volta da 0.1.2 para a `v0.1.1` ficou como registro,
    como o da 0.1.1.
- `README.md:5`: "Versão" de 0.1.2 para 0.1.3.
- `docs/manual-tecnico/README.md:5`: "Versão do sistema" de 0.1.2 para 0.1.3, mantendo "sem mudança de comportamento
  desde a 0.1.0".

### Trechos conferidos e mantidos (achados com Grep por `Arquivar`, `arquivad`, `decisao.spec`, `recém-semeado`, `ORIGENS_DO_FLUXO`, `e2e/` e versão)

- `README.md:54-58`: os testes que precisam de banco recém-semeado são pulados com `exige banco recém-semeado: <motivo>`
  sem `CI` e reprovam com `CI`. Continua certo: o "Arquivar" só passou a ser um deles, e `exigeBancoRecemSemeado` não
  mudou. O texto não lista os testes, então não precisa de mudança.
- `README.md:51-53`: o `pnpm test:e2e` sem e com `BASE_URL`. Continua certo: `e2e/servidor.ts` e `playwright.config.ts`
  não mudaram.
- `docs/manual-tecnico/03-demandas.md:89-91`: a transição `decisao_arquivada` (origens `nova`, `em_analise`,
  `aguardando_informacao`, `pronta_para_decisao`) e "Fora da origem permitida, a automática não faz nada nem grava
  evento". Bate com o código e com a pré-condição nova do teste (`e2e/decisao.spec.ts:353`).
- `docs/manual-tecnico/04-versoes-e-decisao.md:109`: "`devolvida` ou `arquivada`: grava a decisão, e a demanda muda pelo
  ator `sistema`". O código não mudou; a exceção (fora da origem, nada muda) já está no cap. 03, `:91`. Mantido.
- `docs/manual-tecnico/08-painel.md:8`, `:39` e `:42`: `e2e/`, `semViolacoes` e `e2e/sem-violacoes.spec.ts`. Continua
  certo: o axe e `e2e/apoio.ts` não mudaram.
- Links internos novos: nenhum. O link do manual para `../../CHANGELOG.md` e os links do `README.md` para
  `docs/manual-tecnico/README.md`, `docs/operacao/deploy.md` e `CHANGELOG.md` apontam para arquivos que existem.

## Decisões tomadas

- A versão do `README.md` e do manual técnico passa a 0.1.3: os dois dizem a versão do `package.json`, e deixá-la em 0.1.2 tornaria a capa desatualizada.
- Nenhum capítulo de RF mudou: o pedido não toca em `src/`, e o manual descreve o código (padrão técnico, seção 11).
- A seção da 0.1.2 do `CHANGELOG.md` não foi reescrita: é registro histórico. A 0.1.3 diz que fecha a B-01 listada nela.
- Na seção 6 do `deploy.md`, a alternativa `01a26a8…` entrou com o caminho completo da imagem, porque a 05 a registra como saída se a `v0.1.2` do merge do PR #4 não estiver em Packages.
- A frase da volta da 0.1.2 ficou como registro curto, acima da da 0.1.1, para quem precisar voltar duas versões.
- A N-04 entrou à parte nas pendências, porque vem das etapas 01 a 04 e não do `04-maestro.md` nem do `05-devops-sre.md`.
- Nenhum valor de segredo nem dado pessoal real foi escrito: os segredos de webhook aparecem só pelo nome, e os ids de demanda aparecem como `<DEM-id>`.

## Pendências

- Para Fabiano, na Parada 3: as da 0.1.3 no `CHANGELOG.md` (segredos `EASYPANEL_WEBHOOK_APP` e `EASYPANEL_WEBHOOK_WORKER`, primeira publicação com a 0.1.3, rollback pelo caminho A para a `v0.1.2` com a tag conferida em Packages, snapshot antes de qualquer passo).
- Para quem mexer na `decisao.spec.ts` da próxima vez: a B-1 estética do cabeçalho e, se o time quiser, o axe no estado arquivado.
- Divergência entre entrega e código: nenhuma encontrada.

## Comandos executados

Nenhum.

## Critério de pronto atendido

- [x] (06) o `CHANGELOG.md` tem a entrada da versão do `package.json`, com o que foi corrigido e as pendências abertas
- [x] (06) todo trecho de `README.md` e `docs/manual-tecnico/` que cita a função, o arquivo ou o RF corrigido descreve o código depois da correção (trechos achados com Grep e listados na entrega)
- [x] os links internos apontam para arquivos que existem
