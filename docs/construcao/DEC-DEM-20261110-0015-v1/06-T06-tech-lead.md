---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T06-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12 e seção 7), 06-T06-engenheiro-backend.md (volta 2), 06-T06-tech-lead.md (revisão anterior), git show 3833c4e (scripts/scripts.test.ts, scripts/seed-ficticio.ts, test/estatico/sem-controle-bidi.test.ts), docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md (T06, linhas 1010-1049)]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T06 (seed fictício das demandas dos e2e novos), volta 3, commit `3833c4e`. O parecer 1 da revisão anterior
(U+202E cru em `scripts/seed-ficticio.ts:162` e `scripts/scripts.test.ts:478`, Trojan Source, CVE-2021-42574) está
**resolvido**, e o teste estático novo fica como guarda. Os itens da revisão anterior que já estavam certos (escopo, oito
cenários, serviços com Zod, idempotência, `TOTAL_DEMANDAS_DO_SEED`, testes existentes alterados) não mudaram neste
commit. A seção 12 está cumprida, e não sobra Critical nem Important.

### O que foi conferido na correção

- **Teste antes do código:** `test/estatico/sem-controle-bidi.test.ts` foi visto falhando exatamente nas duas linhas do
  parecer (`scripts/scripts.test.ts:478: U+202E`, `scripts/seed-ficticio.ts:162: U+202E`), com o trecho na entrega. O
  teste falharia sem a correção.
- **O teste não guarda o problema:** a classe da regex é montada com `String.fromCodePoint` e `new RegExp`, e o arquivo
  varre a si mesmo. Os cinco casos cobrem: o glob enxerga o código (falha se quebrar), a lista tem os nove controles
  (U+202A a U+202E, U+2066 a U+2069), cada controle plantado é reprovado com arquivo, linha e código, os vizinhos dos
  intervalos passam (U+2029, U+202F, U+2065, U+206A), e o repositório varrido está limpo. A mensagem de falha mostra
  `U+XXXX`, e não o caractere.
- **Correção no seed:** `const RLO = String.fromCodePoint(0x202e)` local, com comentário da razão; `textoDeTerceiro` em
  template literal, com o mesmo texto letra a letra. O comentário da linha 160 agora cita `criarVersoesDoE2E` (parecer
  1, passo 3).
- **O e2e continua recebendo o caractere:** `scripts/scripts.test.ts` monta o título esperado do mesmo jeito e ganhou
  `expect(TITULOS_DO_E2E.textoDeTerceiro).toContain(String.fromCodePoint(0x202e))`; o laço que já existia confere que o
  título gravado no banco é igual à constante. Nenhuma asserção foi apagada.
- **Escopo (G1):** o commit muda só `scripts/seed-ficticio.ts`, `scripts/scripts.test.ts` e o teste novo em `test/`,
  além da entrega e do `passagens.jsonl`. Varrer também os `*.config.*` da raiz é desvio pequeno, aceito: fecha o mesmo
  vetor sem custo.
- **Verificação própria:** os dois arquivos de teste, 50 de 50 (no log, o seed `semeado` com `quantidade: 23` e a
  segunda execução `recusado`); `pnpm typecheck` e `pnpm lint` limpos. A suíte inteira o engenheiro rodou (4829 de
  4829); o commit não muda nada fora dos dois arquivos de `scripts/` e do teste novo.

### O U+202E cru no plano (observação do maestro)

O maestro achou o caractere cru em `docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md:1029`, a
tabela da T06 que eu escrevi na 05. É provável que o caractere tenha chegado ao código copiado dali. **Corrigi o plano
nesta volta** (fica para o commit do maestro): a célula agora traz o título com `${RLO}` e a nota de que
`RLO = String.fromCodePoint(0x202e)`, o caractere RIGHT-TO-LEFT OVERRIDE, vem de código e não fica cru nem no fonte nem
no plano. O caractere foi tirado sem digitar o escape. O `git diff --stat` mostra só essa linha do plano mudada.

**O teste não passa a cobrir `docs/` nesta tarefa.** Razões:

1. O ataque do Trojan Source é código que roda diferente do que o revisor vê. Em markdown nada roda, e o caminho de
   contaminação (copiar o título do plano para o código) já é pego pelo teste em `src/`, `scripts/`, `test/` e `e2e/`,
   que é onde o dano acontece.
2. `docs/construcao/<DEC-id>/` guarda entregas de agentes e o `passagens.jsonl` do maestro, fora da lista Pode do
   engenheiro. Com `docs/` no teste, um caractere numa entrega deixaria vermelha a tarefa de outro engenheiro, sem que
   ele pudesse corrigir.
3. O plano é meu, e a correção dele é minha. A regra de não deixar o caractere cru em plano e spec entra como cuidado da
   etapa 05 (Pendências), e não como guarda do código do sistema.

## Decisões tomadas

- Status `pronto`: o parecer 1 da volta anterior está resolvido com teste que falhou antes e passa depois, e não sobra
  Critical nem Important (seção 12).
- Plano corrigido por mim nesta volta, porque o erro era meu e a lista Pode inclui escrever o plano.
- `docs/` fica fora do teste estático: em markdown nada roda, a contaminação do código já é pega, e a pasta da
  construção não é do engenheiro.
- Aceito o desvio de varrer os `*.config.*` da raiz e o `RLO` local, não exportado (fora do G7).

## Pendências

- Minor — `test/estatico/sem-controle-bidi.test.ts:27-30`: o glob cobre `.ts`, `.tsx`, `.css` e os `*.config.*` da
  raiz, mas não `drizzle/*.sql`, `.github/workflows/*.yml`, `package.json` nem `.js` e `.mjs` fora da raiz. São
  arquivos que rodam ou configuram, e o mesmo vetor vale neles. Dívida: ampliar a lista de extensões numa tarefa futura
  que mexa nesses arquivos; não bloqueia, porque o achado e o caminho de contaminação conhecidos estão cobertos.
- Minor — `test/estatico/sem-controle-bidi.test.ts:14` e `:19`: o arquivo de teste exporta `CONTROLES_BIDI` e
  `achados` sem consumidor fora dele. Não quebra nada; se outro teste precisar da regra, ela deve ir para `test/` como
  ajudante, e não ser importada de um `.test.ts`.
- Tech-lead (etapa 05 dos próximos pedidos): ao escrever plano ou spec com caractere de controle de direção, descrever o
  caractere em palavras (nome e código U+XXXX), nunca o colar nem digitar o escape.
- Commit do maestro: inclui a linha 1029 do plano, corrigida nesta etapa.
- Seguem valendo, da revisão anterior: o cuidado do `engenheiro-frontend` (T09 a T13) de importar
  `TITULOS_DO_E2E.textoDeTerceiro` e nunca copiar o título; a troca de `idDoDecDeRascunhoDoSeed` de
  `e2e/decisao.spec.ts` pela busca do DEC da demanda pelo título (T12 e T13); nenhum e2e decide a `etapasDupla`; a nota
  para a `10-documentacao` sobre a autoria `sem2fa` das versões da `etapasDupla`; a dívida dos testes dependentes do
  bloco "seed fictício" de `scripts/scripts.test.ts`; o comparador repetido em `scripts/scripts.test.ts:423-424`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 3833c4e` — 5 arquivos: a entrega, `passagens.jsonl`, `scripts/scripts.test.ts`, `scripts/seed-ficticio.ts`, `test/estatico/sem-controle-bidi.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 3833c4e -- scripts/scripts.test.ts scripts/seed-ficticio.ts test/estatico/sem-controle-bidi.test.ts` — diff revisado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — depois da correção do plano: só `docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md`, 1 inserção e 1 remoção
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/sem-controle-bidi.test.ts scripts/scripts.test.ts` — 2 arquivos, 50 de 50
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
