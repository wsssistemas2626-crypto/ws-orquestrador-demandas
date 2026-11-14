---
pedido: DEC-DEM-20261111-0018-v1
etapa: 06-T11-construcao
agente: engenheiro-frontend
leu: [07-qa-funcional.md (motivo da volta), e2e/apoio.ts (semViolacoesNasDuasLarguras), pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md (G0 a G10 e T11), 03-ux-ui-design.md (seções 0 a 10), src/components/dados-da-decisao.ts, src/components/dados-do-pedido.ts, src/components/rotulos.ts, src/components/dados-das-etapas.ts (padrão do never), src/modules/pacotes-decisao/decidir.ts, src/modules/pedido-construcao/conferir.ts, src/app/(painel)/pacotes-decisao/[decId]/SecaoPedido.tsx, src/app/(painel)/pacotes-decisao/[decId]/page.tsx, os testes de texto da G5, src/app/api/pacotes-decisao/decisao.test.ts, e2e/decisao.spec.ts, e2e/decisao-celular.spec.ts, e2e/pedido-construcao.spec.ts, scripts/seed-ficticio.ts (TITULOS_DO_E2E e comentário da vigência), test/estatico/decisao-e2e.test.ts, playwright.config.ts, e2e/servidor.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

### Volta da 07-qa-funcional (CA-05.2)

Motivo: o axe da T05 com DEC substituído rodava só em 1280 × 720, e não em 390 × 844.

O que mudou, só em `e2e/decisao.spec.ts`:
- import de `semViolacoesNasDuasLarguras` de `./apoio`, ao lado de `semViolacoes` (que continua em uso nas outras
  chamadas);
- linha 365: `await semViolacoes(page, 'T05 com DEC substituído');` →
  `await semViolacoesNasDuasLarguras(page, 'T05 com DEC substituído');`. O auxiliar roda o axe no mesmo estado em
  1280 × 720 e em 390 × 844, com a página no topo, e devolve a janela ao tamanho de antes.

Nenhuma asserção saiu nem foi acrescentada. Nenhum outro arquivo de código ou teste mudou nesta volta. O teste estático
`test/estatico/decisao-e2e.test.ts` confere só o axe do "T11 arquivado", que ficou igual.

Resultado desta volta:
- `pnpm test:e2e e2e/decisao.spec.ts` (retries 0): **9 passaram, 0 falha, 0 pulado**, 1,1 min. A substituição, que
  agora roda o axe da T05 nas duas larguras, levou 12,2 s; o maior teste da spec, abaixo de 24 s.
- `pnpm lint`: limpo. `pnpm typecheck`: limpo.
- A suíte unitária (`pnpm test`) não foi rodada de novo nesta volta: a mudança é só em um arquivo de `e2e/`, que o
  Vitest não executa; vale o resultado da volta anterior (8300 de 8300).

### Entrega original da T11

T11: os textos revistos da 03, seção 8 (substituído, 409 do substituído, 409 do S-01, frase do histórico e linha 6 da
orientação por nível), com o nível do DEC levado da página até `erroDoPedido`, e o "Arquivar" do e2e na demanda nova do
seed.

### Arquivos alterados

Código:
- `src/components/dados-da-decisao.ts`: `TEXTOS_DECISAO.substituido(id)` e `abrirSubstituto(id)` ("Abrir o pacote
  `<id>`") com o texto da 03; sai o comentário "para revisão da ux-ui-design".
- `src/components/rotulos.ts`: `textoDoEvento` de `pacote_decisao_substituido` com "dele" no fim, nas duas frases;
  comentário de `SELO_SUBSTITUIDO` sem "para revisão da ux-ui-design" (texto "Substituído" igual).
- `src/components/dados-do-pedido.ts`: `ORIENTACAO.aviso` (nível `cto`) com o texto novo e `ORIENTACAO.avisoDupla`
  (nível `cto_e_administradora`); `orientacaoDoPedido(erros, nivel: NivelAprovacao = 'cto')` escolhe a linha 6 por um
  `switch` com `never`; `erroDoPedido(r, nivel = 'cto')` repassa o nível (D-09). Import só de tipo
  (`NivelAprovacao` de `db/schema/decisao`), como em `dados-da-decisao.ts`.
- `src/app/(painel)/pacotes-decisao/[decId]/SecaoPedido.tsx`: prop obrigatória `nivelAprovacaoRequerido`, passada a
  `erroDoPedido`.
- `src/app/(painel)/pacotes-decisao/[decId]/page.tsx`: `<SecaoPedido … nivelAprovacaoRequerido={p.nivelAprovacaoRequerido} />`.
- `src/modules/pedido-construcao/conferir.ts`: só o texto de `MENSAGENS_PEDIDO.substituido` e o comentário dele (G4).
- `src/modules/pacotes-decisao/decidir.ts`: só o texto de `MENSAGENS_DECISAO.nivelMenorQueOVigente` e o comentário dele
  (G4). Continua sem id nem nome.

Testes (G5 e desvios abaixo):
- novo: `src/components/textos-0018.test.ts` (5 testes, CA-05.1).
- `src/components/dados-da-decisao.test.ts` (841-844 e 852), `src/components/dados-do-pedido.test.ts` (179),
  `src/components/rotulos.test.ts` (259-265), `src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts` (189, 191, 198,
  199, 206, 836), `src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.test.ts` (41 e 194),
  `src/modules/pedido-construcao/gerar-substituido.test.ts` (116), `src/modules/pacotes-decisao/substituicao.test.ts`
  (388), `src/app/api/pacotes-decisao/decisao.test.ts` (465).
- e2e: `e2e/decisao.spec.ts` (297, 348, 364 e o "Arquivar" na `TITULOS_DO_E2E.arquivarSemVigente`),
  `e2e/decisao-celular.spec.ts` (433), `e2e/pedido-construcao.spec.ts` (51, 54, 56 e 415).

Nenhuma asserção saiu nem foi acrescentada nos testes existentes: só o texto esperado mudou (contagem de `expect(` igual
em cada arquivo). Nenhum desses arquivos está no `PISO`. Superfícies congeladas da G4 sem mudança; `decidir.ts` e
`conferir.ts` só com o texto previsto para a T11.

### TDD

Teste escrito antes e visto falhando:
`pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/textos-0018.test.ts --reporter=dot`
→ `Tests 5 failed (5)`. Trechos:

```
Expected: "Este pacote foi substituído por DEC-DEM-20991231-0001-v2, aprovado depois dele, e não gera mais o Pedido de Construção. …"
Received: "Este pacote foi substituído por DEC-DEM-20991231-0001-v2, aprovado depois dele. Só o pacote aprovado mais novo gera …"
Expected: "o pacote foi substituído por DEC-DEM-20991231-0001-v2, aprovado depois dele. Só o pacote aprovado mais novo gera o Pedido de Construção."
Received: "o pacote foi substituído por DEC-DEM-20991231-0001-v2, aprovado depois dele; só o pacote aprovado mais novo gera o Pedido de Construção."
Expected: "Depois de corrigir, crie um pacote novo e aprove-o. Aprovado, ele substitui este e passa a ser o único que gera o Pedido de Construção."
Received: "Depois de corrigir, crie um pacote novo e aprove-o: o pacote aprovado mais novo substitui este, e só ele gera o Pedido de Construção."
Expected: "DEC-DEM-20991231-0001-v1 foi substituído por DEC-DEM-20991231-0001-v2, aprovado depois dele"
Received: "DEC-DEM-20991231-0001-v1 foi substituído por DEC-DEM-20991231-0001-v2, aprovado depois"
```

### Resultados

- Arquivos tocados, isolados: 5 arquivos, 151 de 151.
- `pnpm test` completo: 384 arquivos, **8300 de 8300**, 0 falha (195,9 s).
- `pnpm typecheck`: limpo (a 1ª rodada acusou o `as const` do teste novo, que deixava `erros` readonly; corrigido no
  próprio teste e rodado de novo, limpo).
- `pnpm lint`: limpo.
- `pnpm test:e2e` completo (retries 0): **290 passaram, 9 pulados (`capturas.spec.ts`, como hoje), 0 falha**, 10,4 min.
  O `✘` do `vigia.spec.ts:5` ("CV-03 (negativo)") é a falha esperada do próprio teste (conta nos 290 que passaram;
  saída 0). Maior teste: 8,7 s (`axe-todas` T03), nenhum acima de 24 s. Os tocados: substituição 7,7 s, "Arquivar"
  1,9 s, celular do substituído 2,9 s, caminho completo do pedido 5,1 s.
- axe sem violação nas telas tocadas: T11 substituído e T05 com DEC substituído (`decisao.spec.ts`; a T05, desde a volta
  da 07-qa-funcional, em 1280 × 720 e em 390 × 844), T11 arquivado,
  T11 substituída em 390 px (`decisao-celular.spec.ts`), T11 com o 409 do substituído e a recusa por nome
  (`pedido-construcao.spec.ts`).

### Desvios do plano

1. Linhas de teste fora da lista da G5, que testam o mesmo texto alterado e quebrariam (ou passariam em falso) sem a
   troca, todas só de texto esperado:
   - `pagina.test.ts:191, 198, 199, 836` e `dados-da-decisao.test.ts:852`: o rótulo do link `abrirSubstituto` ("Abrir o
     pacote `<id>`"); a G5 citava só a linha 189 e as 841-844.
   - `pagina.test.ts:206`: `not.toContain('Abrir DEC-')` → `not.toContain('Abrir o pacote DEC-')`. Sem a troca, a
     asserção negativa passaria sempre (o texto novo nunca contém "Abrir DEC-"); a troca mantém o controle valendo.
   - `src/app/api/pacotes-decisao/decisao.test.ts:465`: o corpo do 409 do S-01 pela rota, byte a byte, com o texto novo
     de `nivelMenorQueOVigente`; a G5 citava só `substituicao.test.ts:387-389` para esse texto.
   - `e2e/decisao.spec.ts:348` e `e2e/pedido-construcao.spec.ts:415`: o nome acessível do link "Abrir o pacote `<id>`".
   - `e2e/decisao-celular.spec.ts:433`: a regex `/^Este pacote foi substituído por DEC-.+, aprovado depois dele\./` não
     casa mais (agora vem ", e não gera mais…"); passou a
     `/^Este pacote foi substituído por DEC-.+, aprovado depois dele, e não gera mais o Pedido de Construção\./`.
2. `textos-0018.test.ts` tem, além do esboço do plano, o caso explícito `orientacaoDoPedido(…, 'cto')` e um teste de
   `erroDoPedido(r, 'cto_e_administradora')`, para provar o repasse do nível que a `SecaoPedido` usa. O evento do
   histórico é montado como `EventoVisivel` completo, como em `rotulos.test.ts:143`.
3. No "Arquivar" de `e2e/decisao.spec.ts`, além da demanda e do comentário novo, dois comentários antigos citavam
   `decisao_arquivada` (que a T06 tirou de `AUTOMATICAS`): passaram a "a origem do arquivamento sem vigente" e "origem
   do arquivamento". Título, alerta, as três conferências de status, `exigeBancoRecemSemeado` e o axe ficaram iguais;
   `test/estatico/decisao-e2e.test.ts` passa sem mudança.

## Decisões tomadas

- A linha 6 é escolhida por `switch` com `never` sobre `NivelAprovacao`, e não por ternário: nível novo quebra o
  `typecheck` em vez de cair no texto do `cto` (G3.4 vale para status e ator; aqui pela mesma razão).
- `nivelAprovacaoRequerido` é obrigatório na `SecaoPedido`: o `typecheck` garante que a página passe o nível; os
  padrões `'cto'` ficam só nas funções puras (D-09), para os testes de hoje continuarem com um argumento.
- `textos-0018.test.ts` não entra no `PISO`: não é teste de segurança e a G3.9/G5 não o pede na T11.
- O 409 do S-01 continua sem id nem nome (asserção `not.toMatch(/DEC-DEM-/)` no teste novo).

## Pendências

- Para o tech-lead: ratificar os desvios 1 a 3 acima (só texto esperado e comentários; nenhuma asserção a menos).
- Para a 10-documentacao: os textos novos do substituído, dos 409, do histórico e da linha 6 por nível vão ao manual
  cap. 04 e 08 (G2).
- Nenhuma instrução estranha no `pedido.json`.

## Comandos executados

Volta da 07-qa-funcional (CA-05.2):

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "semViolacoesNasDuasLarguras" -- e2e`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "semViolacoes" -- test`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "test:e2e\|retries" -- package.json playwright.config.ts`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/decisao.spec.ts`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -- e2e/decisao.spec.ts`

Resultados: e2e da spec, 9 passaram e 0 falha (retries 0); lint e typecheck limpos.

Volta anterior (entrega original):

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "Task 11\|T11" -- docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "^## " -- docs/construcao/DEC-DEM-20261111-0018-v1/03-ux-ui-design.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "^### " -- docs/construcao/DEC-DEM-20261111-0018-v1/03-ux-ui-design.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "substituid\|ux-ui-design\|abrirSubstituto" -- src/components/dados-da-decisao.ts src/components/rotulos.ts src/components/dados-do-pedido.ts src/modules/pedido-construcao/conferir.ts src/modules/pacotes-decisao/decidir.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "não pode substituí-lo\|aprovado depois\|aprovado mais novo substitui\|Abrir DEC\|Abrir \${" -- src test e2e scripts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "Abrir \|abrirSubstituto" -- e2e src test`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "SecaoPedido\|nivelAprovacaoRequerido" -- "src/app/(painel)/pacotes-decisao/[decId]/page.tsx"`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "SecaoPedido\|orientacaoDoPedido\|erroDoPedido" -- src test`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "arquivarSemVigente\|vigenciaComPendente" -- scripts/seed-ficticio.ts e2e`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "^import\|^const TITULO\|ORIGENS_DO_FLUXO =\|completarEspERsk =\|function completarEspERsk\|function novoPacote\|novoPacote =" -- e2e/decisao.spec.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "SUBSTITUIDO\|ORIENTACAO\.\|AVISO_SUBST\|Abrir " -- e2e/pedido-construcao.spec.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "nivelAprovacaoRequerido\|cto_e_administradora" -- e2e/pedido-construcao.spec.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "export function textoDoEvento" -- src/components/rotulos.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "const ev = \|function ev(\|^import" -- src/components/rotulos.test.ts`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/textos-0018.test.ts --reporter=dot` — 0 de 5 (falha esperada, antes do código)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "const _\?[a-zA-Z]*: never" -- src/components`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "Arquivar\|TITULO\|arquivad" -- test/estatico/decisao-e2e.test.ts`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/textos-0018.test.ts src/components/dados-da-decisao.test.ts src/components/dados-do-pedido.test.ts src/components/rotulos.test.ts "src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts" --reporter=dot` — 151 de 151
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — 8300 de 8300 (384 arquivos)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — 2 erros no teste novo (readonly)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "prettier" -- package.json .github/workflows/ci.yml`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files playwright.config.ts docker-compose.dev.yml e2e`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -- src/components/dados-do-pedido.ts`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — 290 passaram, 9 pulados, 0 falha
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "decisao.test.ts\|pagina.test.ts\|decisao.spec.ts\|pedido-construcao.spec.ts\|substituicao.test.ts\|gerar-substituido.test.ts" -- test/estatico/piso-de-assercoes.test.ts` — sem saída

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] os textos são os de `03-ux-ui-design.md`, em pt-BR, e o axe não acusa violação nas telas tocadas
