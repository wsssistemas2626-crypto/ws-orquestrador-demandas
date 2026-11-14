---
pedido: DEC-DEM-20261111-0018-v1
etapa: 06-T11-testes
agente: qa-automacao
leu: [pedido.json, contrato-passagem.md, 01-analista-requisitos.md (RF-05, CA-05.1 e CA-05.2), docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md (T11 e linhas da G5), 06-T11-engenheiro-frontend.md, 06-T11-tech-lead.md, commit 77bcf80 (git show), commit 7ae0beb (git show), src/app/(painel)/pacotes-decisao/[decId]/page.tsx, src/app/(painel)/pacotes-decisao/[decId]/SecaoPedido.tsx, src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts (fixtures e mocks), e2e/pedido-construcao.spec.ts, e2e/decisao.spec.ts (linhas 290 a 409), e2e/apoio.ts (linhas 100 a 139), e2e/vigia.spec.ts, test/estatico/detalhe-dec.test.ts (padrão do teste por árvore do TypeScript), playwright.config.ts, saída do e2e completo em /tmp (Read)]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

### Volta da 07-qa-funcional (CA-05.2), commit `7ae0beb`

Motivo da volta: o axe da T05 com DEC substituído rodava só em 1280 × 720. O commit troca, em `e2e/decisao.spec.ts:365`,
`semViolacoes` por `semViolacoesNasDuasLarguras` (e o import na linha 44). Os commits seguintes (`d236023`, `4a1f213`,
`fcfef2a`) só mexem em `docs/construcao/` e no `passagens.jsonl`: o código testado é o de `7ae0beb`.

**CA-05.2 coberto nas duas larguras, nas duas telas.** O critério (`01-analista-requisitos.md:157`) pede o axe sem
violação na T11 e na T05 nos estados do substituído, em 1280 × 720 e em 390 × 844:

| Tela × largura | Teste que cobre |
|---|---|
| T11 do substituído, 1280 × 720 | `e2e/decisao.spec.ts:354` (`semViolacoes`, "T11 substituído", viewport `Desktop Chrome`); `e2e/pedido-construcao.spec.ts:409` ("T11 do v1 substituído") |
| T11 do substituído, 390 × 844 | `e2e/decisao-celular.spec.ts:437` ("T11 substituída em 390 px", no teste `:402` "CA-12.5 e CV-11 … nas duas larguras") |
| T05 com DEC substituído, 1280 × 720 | `e2e/decisao.spec.ts:365` (`semViolacoesNasDuasLarguras` → `apoio.ts:132`, rótulo "T05 com DEC substituído (1280 × 720)") |
| T05 com DEC substituído, 390 × 844 | `e2e/decisao.spec.ts:365` (`semViolacoesNasDuasLarguras` → `apoio.ts:135`, rótulo "T05 com DEC substituído (390 × 844)"): **a lacuna da 07, agora fechada** |

O auxiliar (`e2e/apoio.ts:128-137`) chama o mesmo `semViolacoes` (mesmas `TAGS_AXE`, nenhuma regra desligada) nas duas
larguras, com a página no topo, sem clique nem criação entre as medições, e devolve a janela ao tamanho de antes. A
medição é no estado conferido pelas linhas 361 a 364 (selo na linha do anterior, sem selo na do novo, frase do
histórico). Depois da 365 o teste só faz chamada de API (366 a 369), sem nada que dependa da largura.

**Nada regrediu.** No `git show 7ae0beb -- e2e/decisao.spec.ts`, só duas linhas trocadas (import e chamada do axe):
nenhuma asserção saiu nem foi afrouxada, nenhum `.skip`, `.only` ou `.todo` entrou. Nenhum teste acrescentado nesta volta
(a mudança do engenheiro já é o teste que faltava).

Resultados desta volta:
- `pnpm test:e2e` completo (retries 0 e 1 worker pelo `playwright.config.ts`, banco descartável): **303 testes, 294
  passaram, 0 falha, 9 pulados**, 9,9 min.
  - O teste da substituição (`decisao.spec.ts:305`), com o axe da T05 nas duas larguras: passou em 4,8 s.
  - `decisao-celular.spec.ts:402` (T11 substituída em 390 px): passou em 3,0 s; `pedido-construcao.spec.ts:344`
    (T11 do v1 substituído): passou em 5,1 s.
  - Maior teste da suíte: 12,5 s (`axe-todas.spec.ts:141`, "T03 Fila: vazia com filtro e com filtro inválido");
    nenhum acima de 24 s.
  - Os 9 pulados são os de `e2e/capturas.spec.ts`, pelo `test.skip` que já existia (`capturas.spec.ts:23`, PNG já
    existe, D-04); nenhum pulo novo.
  - O `✘` de `e2e/vigia.spec.ts:5` é o teste negativo da CV-03, marcado com `test.fail()` (linha 6): falhar é o
    esperado, e o Playwright o conta entre os 294 que passaram (exit code 0).
- `pnpm lint`: limpo. `pnpm typecheck`: limpo.
- `pnpm test` (Vitest) não rodado de novo: a volta só muda um arquivo de `e2e/`, que o Vitest não executa, e
  nenhum arquivo de `src/` ou `test/` mudou desde a entrega anterior (8312 de 8312).
- `git diff --stat`: vazio antes do e2e; `git status --short`: vazio antes e depois do e2e (o e2e não deixou arquivo no
  repositório).

### Entrega anterior (commit `77bcf80`)

Testes da T11 (commit `77bcf80`, `engenheiro-frontend`): textos revistos da 03, seção 8, e o nível do DEC levado da
página até `erroDoPedido`. Fechado o Minor da revisão (`06-T11-tech-lead.md`): agora há teste de que a página passa à
`SecaoPedido` o nível **do próprio pacote**, e de que a `SecaoPedido` o repassa ao `erroDoPedido`.

### Critérios da tarefa × testes

| Critério | Teste que cobre |
|---|---|
| CA-05.1: aviso e link do substituído, selo | `src/components/textos-0018.test.ts` › "substituído: aviso, link e selo"; `src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts` › "T11: DEC substituído (0.1.13)"; e2e `e2e/decisao.spec.ts:305` (substituição) e `e2e/decisao-celular.spec.ts:402` (CA-12.5 e CV-11) |
| CA-05.1: 409 do substituído | `textos-0018.test.ts` › "409 do substituído e 409 do S-01"; `src/modules/pedido-construcao/gerar-substituido.test.ts`; e2e `e2e/pedido-construcao.spec.ts:344` (aba velha com o 409 e a API) |
| CA-05.1: 409 do S-01, sem id nem nome | `textos-0018.test.ts` (com `not.toMatch(/DEC-DEM-/)`); `src/modules/pacotes-decisao/substituicao.test.ts`; `src/app/api/pacotes-decisao/decisao.test.ts` (corpo pela rota) |
| CA-05.1: frase do histórico, com e sem id | `textos-0018.test.ts` › "frase do histórico"; `src/components/rotulos.test.ts`; e2e `e2e/decisao.spec.ts:305` (T05, "… aprovado depois dele") |
| CA-05.1: linha 6 por nível (`cto` e `cto_e_administradora`) | `textos-0018.test.ts` › "linha 6 da orientação, pelo nível do pacote" e "erroDoPedido repassa o nível à orientação do 422"; e2e `e2e/pedido-construcao.spec.ts:264` e `:344` (linha 6 do `cto` na tela) |
| D-09: a página passa à `SecaoPedido` o nível do pacote (**novo**) | `src/app/(painel)/pacotes-decisao/[decId]/nivel-do-pedido.test.ts` (4 testes, abaixo) |
| D-09: a `SecaoPedido` repassa o nível ao `erroDoPedido` (**novo**) | `test/estatico/nivel-do-pedido.test.ts` (6 testes, abaixo) |
| G5: "Arquivar" na demanda `arquivarSemVigente` | e2e `e2e/decisao.spec.ts:455` (passou, não pulado) |
| Axe sem violação nas telas tocadas (CA-05.2 de quebra) | e2e `semViolacoes` em: T11 do v1 substituído e T05 com DEC substituído (`decisao.spec.ts:305`); T11 decidida e substituída em 1280 e 390 px (`decisao-celular.spec.ts:402`); T11 com a recusa por nome e a linha 6 nova, aba velha com o 409, v1 substituído (`pedido-construcao.spec.ts:344`); T11 com 422 de e-mail e de e-mail e nome (`pedido-construcao.spec.ts:264`) |

### Testes acrescentados

1. `src/app/(painel)/pacotes-decisao/[decId]/nivel-do-pedido.test.ts` — "T11 (0.4.1, D-09): a página passa à
   SecaoPedido o nível do próprio pacote". A `SecaoPedido` é um dublê que guarda as props; o resto da página é o real.
   - "DEC de dupla aprovação: a SecaoPedido recebe cto_e_administradora, com o id do DEC e nada mais" (props iguais a
     `{ decId, nivelAprovacaoRequerido: 'cto_e_administradora' }` e o atributo no HTML);
   - "DEC só do CTO: a SecaoPedido recebe cto (o valor acompanha o pacote, não é fixo)";
   - "na mesma execução, um pacote depois do outro: cada render leva o nível do pacote lido nele" (cto, dupla, cto);
   - "controle: sem a seção do pedido (dupla só com o CTO, Estudo, substituído), a SecaoPedido não é chamada".
   Falharia antes do commit (a `SecaoPedido` recebia só `decId`) e falha se a página passar um nível fixo.
2. `test/estatico/nivel-do-pedido.test.ts` — "D-09 (T11): a SecaoPedido repassa ao erroDoPedido o nível que recebeu",
   pela árvore do TypeScript (o Vitest roda em `node`, sem DOM para clicar em "Gerar"). Regra: a prop
   `nivelAprovacaoRequerido` na desestruturação, sem padrão; toda chamada de `erroDoPedido(` com dois argumentos, o
   segundo a prop; sem sombra no corpo. Seis testes: o arquivo de hoje passa; a forma certa passa; casos plantados que
   reprovam (`erroDoPedido(r)`, `'cto'` fixo, `'cto_e_administradora'` fixo, outro identificador, argumento a mais,
   segunda chamada sem o nível, prop ausente, prop com padrão, sombra, sem `erroDoPedido`, sem `SecaoPedido`). Pega o
   furo que o `typecheck` não pega: `erroDoPedido(r, nivel = 'cto')` aceita a chamada sem o nível.

Os dois arquivos: datas fixas (2099-12-31), ids de DEC e nomes fictícios ("Pessoa Ficticia …", "DOC-FICTICIO-001"),
mocks limpos no `beforeEach`; cada teste roda sozinho e em qualquer ordem.

### Resultados

- Os dois arquivos novos, isolados: 2 arquivos, **10 de 10**.
- `pnpm test` completo: **386 arquivos, 8312 de 8312**, 0 falha (238,3 s). Eram 384 e 8300 na entrega do engenheiro:
  +10 dos testes novos e +2 de testes estáticos que rodam um caso por arquivo de teste.
- `pnpm typecheck`: limpo.
- `pnpm lint`: limpo.
- `pnpm test:e2e e2e/decisao.spec.ts e2e/decisao-celular.spec.ts e2e/pedido-construcao.spec.ts` (retries 0 pelo
  `playwright.config.ts`, banco descartável): **22 de 22**, 0 falha, 0 pulado, 1,5 min. Maior teste 6,8 s (C-14 de
  `decisao.spec.ts:148`); nenhum acima de 24 s. Os textos novos aparecem (aviso e link "Abrir o pacote `<id>`" do
  substituído, 409 do substituído, frase do histórico com "dele", linha 6 do `cto`) e o axe não acusou violação em
  nenhuma das telas listadas acima.
- `git diff --stat`: vazio (nenhum arquivo rastreado mudou); `git status`: só os dois arquivos novos.

## Decisões tomadas

Volta da 07-qa-funcional (CA-05.2):
- Rodei o e2e completo, e não só a spec: o maestro pediu, e a 07 pede o e2e de novo (RNF-11) antes de trocar a linha
  do CA-05.2 no mapa.
- Nenhum teste novo: a troca do engenheiro na linha 365 é o próprio teste que faltava, e chama o mesmo `semViolacoes`
  que já cobria 1280 × 720.
- O `✘` de `vigia.spec.ts:5` não é falha: o teste é `test.fail()` (negativo da CV-03), e o resumo e o exit code 0
  confirmam.

Entrega anterior:

- Prova da página por dublê da `SecaoPedido` no Vitest: o nível só muda o texto depois do clique (estado do cliente),
  que o `renderToStaticMarkup` não mostra; capturar as props prova o repasse sem depender de DOM.
- Prova do repasse dentro da `SecaoPedido` por teste estático com casos plantados: o projeto não tem jsdom nem
  testing-library (Vitest em `node`), e o padrão de `erroDoPedido` deixaria a omissão passar no `typecheck`.
- Sem e2e novo com DEC de dupla aprovação recusado em 422: exigiria demanda própria no seed (`scripts/` fora da minha
  lista Pode) e aprovação da administradora; reaproveitar `vigenciaNivelMenor` ou `validacao` mexeria no estado que a
  T14 e o teste C-28 usam (C-36). Os dois testes unitários cobrem as duas pontas do repasse, e o texto de cada nível
  está em `textos-0018.test.ts`.
- Rodei o e2e só das três specs tocadas: o engenheiro já rodou a suíte e2e inteira (290, 0 falha) sobre o mesmo
  commit, e eu não alterei código nem e2e.

## Pendências

Volta da 07-qa-funcional (CA-05.2):
- Para a `07-qa-funcional`: trocar a linha do CA-05.2 no mapa para "coberto", com a T05 nas duas larguras em
  `decisao.spec.ts:365`; o e2e completo passou (294 de 303, 9 pulados que já existiam, 0 falha).
- Nenhuma instrução estranha no `pedido.json`.

Entrega anterior:

- Para o tech-lead: o Minor "nenhum teste prova que page.tsx passa o nível do DEC à SecaoPedido" está fechado pelos dois
  arquivos novos.
- Minor que segue aberto da revisão (não é de teste): o comentário de bloco em `src/components/dados-do-pedido.ts:46`.
- Para a T14 ou a 07-qa-funcional (opcional): um e2e da T11 de um DEC `cto_e_administradora` com 422 de validação
  mostrando a linha 6 dupla na tela daria a prova ponta a ponta; pede demanda própria no seed.
- Nenhuma instrução estranha no `pedido.json`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "T11" -- docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 77bcf80fb4e629bd53bb4b779b2687cce777d6b9 --stat`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 77bcf80fb4e629bd53bb4b779b2687cce777d6b9 -- src/components/dados-do-pedido.ts "src/app/(painel)/pacotes-decisao/[decId]/SecaoPedido.tsx" "src/app/(painel)/pacotes-decisao/[decId]/page.tsx" src/components/textos-0018.test.ts "src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts"`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "SecaoPedido" -- src test e2e`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files "src/app/(painel)/pacotes-decisao/[decId]"`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "testing-library\|jsdom\|happy-dom\|environment" -- package.json vitest.config.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "cto_e_administradora\|ORIENTACAO\|avisoDupla\|Depois de corrigir\|orientacao" -- e2e/pedido-construcao.spec.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "TITULOS_DO_E2E\|cto_e_administradora\|dupla" -- scripts/seed-ficticio.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "react-test-renderer\|\"react\|vitest\|playwright" -- package.json`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files test/estatico`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A8 "export function secaoDoPedido" -- src/components/dados-do-pedido.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "cto_e_administradora\|papel: 'administradora'" -- "src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts"`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "dataDocumento\|referenciaDocumento" -- src/modules/pacotes-decisao/consultas.ts`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/pacotes-decisao/[decId]/nivel-do-pedido.test.ts" test/estatico/nivel-do-pedido.test.ts --reporter=dot` — 10 de 10 (2 arquivos)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — 8312 de 8312 (386 arquivos)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/decisao.spec.ts e2e/decisao-celular.spec.ts e2e/pedido-construcao.spec.ts` — 22 de 22, 0 falha, 0 pulado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 77bcf80fb4e629bd53bb4b779b2687cce777d6b9 -- e2e/decisao.spec.ts e2e/decisao-celular.spec.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "CA-05" -- docs/construcao/DEC-DEM-20261111-0018-v1/01-analista-requisitos.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 7ae0beb --stat`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 7ae0beb -- e2e/decisao.spec.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "semViolacoesNasDuasLarguras" -- e2e`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "CA-05.2" -- docs/construcao/DEC-DEM-20261111-0018-v1`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — 303 testes: 294 passaram, 0 falha, 9 pulados (capturas, D-04), 9,9 min
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -4`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --stat --format=%h%x20%s 7ae0beb..HEAD`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "semViolacoes" -- e2e/decisao-celular.spec.ts e2e/pedido-construcao.spec.ts e2e/decisao.spec.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "retries\|timeout\|workers" -- playwright.config.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "skip" -- e2e/capturas.spec.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — vazio depois do e2e

Nesta volta, a saída do e2e em /tmp foi lida com a ferramenta Read, sem comando.

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
