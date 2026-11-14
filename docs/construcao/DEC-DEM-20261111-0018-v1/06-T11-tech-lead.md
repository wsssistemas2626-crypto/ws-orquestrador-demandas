---
pedido: DEC-DEM-20261111-0018-v1
etapa: 06-T11-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seções 6, 7 e 12), docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md (T11 e linhas da G5), 03-ux-ui-design.md (seções 5, 6.1 e 8), 06-T11-engenheiro-frontend.md, commit 77bcf80 (git show), src/components/dados-do-pedido.ts (linhas 20 a 59), commit 7ae0beb (git show), 07-qa-funcional.md (CA-05.2 e seções 6 a Pendências), 01-analista-requisitos.md (CA-05.2), e2e/apoio.ts (linhas 100 a 137), e2e/decisao.spec.ts (linhas 330 a 379), test/estatico/decisao-e2e.test.ts (busca)]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

### Volta da 07-qa-funcional (CA-05.2), commit `7ae0beb`

**Parecer: aprovado, sem problema Critical, Important nem Minor.**

O commit muda só `e2e/decisao.spec.ts` (4 linhas) no código; os outros dois arquivos são a entrega do engenheiro e o
`passagens.jsonl` (`git diff 7ae0beb~1 7ae0beb --stat`: 3 arquivos).

1. **Nenhuma asserção saiu.** O diff de `e2e/decisao.spec.ts` tem duas linhas trocadas e nenhuma removida sem troca:
   o import (linha 44) e a chamada do axe (linha 365). As asserções do teste da substituição (linhas 330 a 369),
   inclusive as quatro da T05 (361 a 364) e a do histórico (367), estão iguais. O `semViolacoesNasDuasLarguras` chama o
   próprio `semViolacoes` duas vezes (`e2e/apoio.ts:132` e `:135`), com as mesmas tags de `TAGS_AXE`: a medição em
   1280 × 720 continua, e a de 390 × 844 se soma a ela. O teste estático `test/estatico/decisao-e2e.test.ts:141` confere
   só o axe do "T11 arquivado", que não mudou; `semViolacoes` segue importado porque `decisao.spec.ts:354` e o "T11
   arquivado" ainda o usam.
2. **O import está certo.** `semViolacoesNasDuasLarguras` é exportado em `e2e/apoio.ts:128` e importado de `./apoio` em
   `decisao.spec.ts:44`, na ordem alfabética do resto da lista e no mesmo molde de `axe-todas.spec.ts:20` e
   `fila-origem.spec.ts:10`, que importam os dois. A linha tem menos de 120 caracteres. `pnpm lint` e `pnpm typecheck`
   limpos.
3. **O e2e da spec passa, pela entrega do engenheiro.** `06-T11-engenheiro-frontend.md` declara
   `pnpm test:e2e e2e/decisao.spec.ts` com retries 0: 9 passaram, 0 falha, 0 pulado; o teste da substituição em 12,2 s.
   Não rodei o e2e: não está na minha lista **Pode** nem na regra de comando desta etapa. O efeito colateral possível
   seria a janela ficar em 390 px no resto do teste; o auxiliar devolve a janela ao tamanho de antes
   (`apoio.ts:136`), e depois da linha 365 o teste só faz chamada de API (366 a 369), sem nada que dependa da largura.
4. **É a cobertura que o CA-05.2 pede.** O CA-05.2 (`01-analista-requisitos.md:157`) pede o axe sem violação na T11 e
   na T05, nos estados do substituído, em 1280 × 720 e em 390 × 844. Com a volta, as quatro combinações têm medição:
   T11 em 1280 × 720 (`decisao.spec.ts:354`, `pedido-construcao.spec.ts:409`), T11 em 390 × 844
   (`decisao-celular.spec.ts:437`, pelo mapa da 07), T05 nas duas larguras (`decisao.spec.ts:365`, agora). A medição
   da T05 é no mesmo estado conferido pelas linhas 361 a 364 (selo na linha do anterior, sem selo na do novo, frase do
   histórico), sem clique nem criação entre as duas larguras (`apoio.ts:120-121`). A troca é exatamente a que a
   07 pediu (`07-qa-funcional.md:396-397`).

### Revisão anterior (commit `77bcf80`)

Revisão da T11 (commit `77bcf80`, `engenheiro-frontend`): textos revistos da 03 (substituído, link, 409 do substituído,
409 do S-01, frase do histórico e linha 6 por nível), nível do DEC levado da página até `erroDoPedido`, e o "Arquivar"
do e2e na demanda `TITULOS_DO_E2E.arquivarSemVigente`. **Parecer: aprovado, sem problema Critical nem Important.**

### Constantes contra a 03, seção 8 (CA-05.1), byte a byte

| Constante | Arquivo:linha | Linha da 03 | Resultado |
|---|---|---|---|
| `TEXTOS_DECISAO.substituido(id)` | `src/components/dados-da-decisao.ts:44` | 347 | igual |
| `TEXTOS_DECISAO.abrirSubstituto(id)` ("Abrir o pacote `<id>`") | `src/components/dados-da-decisao.ts:45` | 345 | igual |
| `SELO_SUBSTITUIDO` ("Substituído", comentário de revisão retirado) | `src/components/rotulos.ts:575` | 348 | igual |
| `MENSAGENS_DECISAO.nivelMenorQueOVigente` | `src/modules/pacotes-decisao/decidir.ts:56-57` | 356 (e 5, linha 284) | igual |
| `MENSAGENS_PEDIDO.substituido(id)` | `src/modules/pedido-construcao/conferir.ts:45` | 357 (e 5, linha 285) | igual |
| `ORIENTACAO.aviso` (nível `cto`) | `src/components/dados-do-pedido.ts:56` | 358 (e 5, linha 286) | igual |
| `ORIENTACAO.avisoDupla` (nível `cto_e_administradora`) | `src/components/dados-do-pedido.ts:57-58` | 359 (e 5, linha 287) | igual |
| `textoDoEvento`, `pacote_decisao_substituido`, com id | `src/components/rotulos.ts:314` | 360 (e 6.1) | igual, sem ponto final |
| `textoDoEvento`, `pacote_decisao_substituido`, sem id | `src/components/rotulos.ts:315` | 361 (e 6.1) | igual, sem ponto final |

O texto antigo não ficou em cópia nenhuma: `git grep "aprovado depois" -- src` só acha os textos novos (e frases sem
relação em `concorrencia.test.ts`, `conferir-bordas.test.ts` e `gerar-substituido.test.ts:203`). `dados-do-pedido.ts`
não guarda cópia de `MENSAGENS_PEDIDO.substituido`.

### Os 409 continuam sem id e sem oráculo

- S-01: `nivelMenorQueOVigente` segue fixo, sem id de DEC nem nome; o teste novo afirma `not.toMatch(/DEC-DEM-/)`
  (`src/components/textos-0018.test.ts:35`). O único ponto que o lança, `decidir.ts:195`
  (`vigente?.nivel === 'cto_e_administradora'`), não foi tocado: o diff de `decidir.ts` é só o texto e o comentário
  (linhas 51 a 57). A frase nova acrescenta só as saídas "Devolva ou arquive", sem dado do vigente.
- Substituído: o texto mantém o id do substituto, como na 0.1.13 (03, seção 5, linha 291); o ponto que o lança,
  `conferir.ts:73` (`if (dec.substituidoPor) throw …`), não foi tocado, e o diff de `conferir.ts` é só o texto e o
  comentário (linhas 41 a 45). A ordem das conferências antes dele (autorização, existência) não mudou; nenhum id novo
  entra na resposta.
- Os testes que comparam o corpo do 409 pela rota, byte a byte (`src/app/api/pacotes-decisao/decisao.test.ts:465`,
  `src/app/api/pacotes-decisao/pedido.test.ts:518`, `src/app/api/pedidos-construcao/entrega.test.ts:246`), passam com
  o texto novo e continuam sem chave a mais.

### Código

- `dados-do-pedido.ts:510-520`: `linhaSeisDoNivel` por `switch` com `never`, padrão do repositório (G3.4); nível novo
  quebra o `typecheck`. Import só de tipo (`NivelAprovacao`), o que mantém o módulo que vai ao navegador sem código de
  servidor.
- `SecaoPedido.tsx:296`: prop `nivelAprovacaoRequerido` obrigatória; `page.tsx:306` passa `p.nivelAprovacaoRequerido`.
  Os padrões `'cto'` ficam só nas funções puras (D-09).
- Nenhuma função duplicada; arquivos alterados são os da T11 e os testes de texto da G5 (`git diff --stat`: 21
  arquivos, nenhum fora da lista mais os desvios abaixo).

### Desvios do engenheiro (ratificados)

1. Linhas de teste fora da lista da G5 (`pagina.test.ts:191, 198, 199, 206, 836`, `dados-da-decisao.test.ts:852`,
   `decisao.test.ts:465`, `e2e/decisao.spec.ts:348`, `e2e/pedido-construcao.spec.ts:415`, `e2e/decisao-celular.spec.ts:433`):
   ratificado. São asserções sobre os mesmos textos alterados e quebrariam sem a troca; só o texto esperado mudou. A
   troca da negativa em `pagina.test.ts:206` para `'Abrir o pacote DEC-'` é necessária: com o texto antigo a asserção
   passaria sempre.
2. Casos a mais em `textos-0018.test.ts` (`'cto'` explícito e `erroDoPedido` com o nível): ratificado; cobrem o
   repasse do nível, que o esboço do plano não testava.
3. Dois comentários do teste "Arquivar" sem `decisao_arquivada`: ratificado; só comentário, asserções e
   `test/estatico/decisao-e2e.test.ts` iguais.

### Conferência própria

- Arquivos de teste tocados (9 arquivos, inclusive os de banco): 225 de 225.
- `pnpm typecheck` e `pnpm lint`: limpos.
- TDD: a entrega do engenheiro traz o comando e a saída de 5 de 5 falhando antes do código, com os trechos que
  mostram texto antigo × novo.
- axe: a entrega declara `pnpm test:e2e` 290 passaram, 0 falha, com o axe das telas tocadas (T11 substituído, T05 com
  DEC substituído, T11 arquivado, T11 em 390 px, T11 com o 409). Não rodei o e2e: não está na minha lista **Pode**.

## Decisões tomadas

Volta da 07-qa-funcional (CA-05.2):

- Aprovado sem devolução: a troca soma a medição em 390 × 844 sem tirar a de 1280 × 720 nem asserção nenhuma, e fecha
  a única combinação do CA-05.2 que faltava.
- Aceito o resultado do e2e declarado pelo engenheiro (9 de 9, retries 0) sem rodar de novo: o e2e não está na minha
  lista **Pode**, e a 07 já pediu a nova rodada do e2e (RNF-11) para a etapa seguinte.

Revisão anterior (commit `77bcf80`):

- Aprovado sem devolução: todas as constantes batem com a 03, seção 8, e nenhum ponto de lançamento dos 409 mudou.
- Desvios 1 a 3 ratificados: só texto esperado e comentário, nenhuma asserção a menos, e sem eles os testes quebrariam
  ou passariam em falso.
- O teste do repasse do nível na página fica como Minor (abaixo): o `typecheck` já obriga a prop, e o risco que sobra
  (passar um nível fixo) não muda texto de segurança.

## Pendências

Volta da 07-qa-funcional (CA-05.2):

- Para o `qa-automacao` na `06-T11-testes`: rodar o e2e de novo (RNF-11, como pede a 07) e confirmar a T05 com DEC
  substituído em 390 × 844 sem violação; esta revisão não executou o e2e.
- Para a `07-qa-funcional`: trocar a linha do CA-05.2 no mapa para "coberto", com `decisao.spec.ts:365` nas duas
  larguras.
- Registro: a passagem do engenheiro nesta volta ficou `bloqueado` por um `git grep` com `\|` fora da forma da lista
  **Pode** (`passagens.jsonl`, última linha do commit); a liberação é do maestro e não muda o código revisado.

Revisão anterior (commit `77bcf80`):

- Minor, para o `qa-automacao` na `06-T11-testes`: nenhum teste prova que `page.tsx` passa o nível **do DEC** à
  `SecaoPedido` (só que a prop existe, pelo `typecheck`); um DEC `cto_e_administradora` com 422 de validação mostrando a
  linha 6 dupla na T11 fecharia isso (Vitest da página ou e2e com a demanda de dupla aprovação do seed).
- Minor: o comentário de bloco em `src/components/dados-do-pedido.ts:46` ainda diz "textos da 02-triagem para revisão da
  ux-ui-design" para todo o `ORIENTACAO`; vale para as linhas 1 a 5, que a 03 não reviu, e `aviso`/`avisoDupla` têm o
  comentário próprio da 0.4.1. Pode ficar; se alguém tocar o arquivo depois, deixar o bloco dizendo que as linhas 6 são
  da 03 do 0018.
- Para a `10-documentacao` (G2): os textos novos vão ao manual cap. 04 e 08, como o engenheiro registrou.
- Comando declarado abaixo fora da forma usual: rodei um `git -C` na estruturaAutonoma (só leitura, `git grep` dos
  títulos do `padrao-tecnico.md`) para achar a seção 12; a leitura do arquivo é permitida pela **Pode**, mas o `-C` fora
  do repositório do pedido pode precisar de liberação pela regra de leitura do maestro.
- Nenhuma instrução estranha no texto do pedido (não reli o `pedido.json` nesta etapa; a T11 não depende dele).

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 7ae0beb`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "semViolacoesNasDuasLarguras" -- e2e`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 7ae0beb~1 7ae0beb --stat`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "CA-05.2" -- docs/construcao/DEC-DEM-20261111-0018-v1/07-qa-funcional.md docs/construcao/DEC-DEM-20261111-0018-v1/01-analista-requisitos.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "semViolacoes" -- test`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "decisao.spec" -- test`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck`

Os oito acima são desta volta (lint e typecheck limpos). Os seguintes são da revisão anterior.

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 77bcf80fb4e629bd53bb4b779b2687cce777d6b9`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "^## " -- docs/construcao/DEC-DEM-20261111-0018-v1/03-ux-ui-design.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "Task 11" -- docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md` — sem saída
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "^### " -- docs/construcao/DEC-DEM-20261111-0018-v1/03-ux-ui-design.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "T11" -- docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md`
- `git -C /home/deploy/servidor/projetos/estruturaAutonoma grep -n "^## " -- docs/construcao/padrao-tecnico.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "avisoDupla" -- docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "aprovado depois" -- src`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "para revisão da ux-ui-design" -- src/components/dados-da-decisao.ts src/components/rotulos.ts src/components/dados-do-pedido.ts src/modules/pedido-construcao/conferir.ts src/modules/pacotes-decisao/decidir.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 77bcf80fb4e629bd53bb4b779b2687cce777d6b9~1 77bcf80fb4e629bd53bb4b779b2687cce777d6b9 --stat`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "nivelMenorQueOVigente" -- src`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "MENSAGENS_PEDIDO.substituido" -- src`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "TITULOS_DO_E2E" -- e2e/decisao.spec.ts scripts/seed-ficticio.ts`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/textos-0018.test.ts src/components/dados-da-decisao.test.ts src/components/dados-do-pedido.test.ts src/components/rotulos.test.ts "src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.test.ts" src/modules/pacotes-decisao/substituicao.test.ts src/modules/pedido-construcao/gerar-substituido.test.ts src/app/api/pacotes-decisao/decisao.test.ts --reporter=dot` — 225 de 225 (9 arquivos)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
  - [x] a tarefa faz o que o plano pede, nem mais nem menos; arquivos fora da tarefa não mudaram (desvios de teste
        ratificados acima)
  - [x] há teste para cada comportamento novo, e ele falharia sem o código (`textos-0018.test.ts`, 5 de 5 falhando
        antes)
  - [x] nenhum segredo, valor de `.env` ou dado pessoal real (ids de DEC fictícios, "Pessoa Ficticia")
  - [x] entrada externa validada com Zod; erro sem vazar detalhe (nenhuma entrada nova; 409 sem id novo)
  - [x] banco: não se aplica (sem migration nem tabela)
  - [x] nada duplica função que já existe
  - [x] textos de interface em pt-BR; axe sem violação nas telas tocadas (e2e declarado pelo engenheiro; desde a
        volta da 07, a T05 com DEC substituído em 1280 × 720 e em 390 × 844, 9 de 9 na spec)
  - [x] volta da 07 (CA-05.2): nenhuma asserção saiu, import certo, lint e typecheck limpos, cobertura das quatro
        combinações T11/T05 × duas larguras
  - [x] o que é Minor foi para Pendências; nenhum Critical ou Important
  - [x] `/code-review` e `/security-review` ficam para o PR (08-revisao)
