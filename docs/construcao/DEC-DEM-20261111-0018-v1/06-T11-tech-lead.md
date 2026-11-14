---
pedido: DEC-DEM-20261111-0018-v1
etapa: 06-T11-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seções 6, 7 e 12), docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md (T11 e linhas da G5), 03-ux-ui-design.md (seções 5, 6.1 e 8), 06-T11-engenheiro-frontend.md, commit 77bcf80 (git show), src/components/dados-do-pedido.ts (linhas 20 a 59)]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

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

- Aprovado sem devolução: todas as constantes batem com a 03, seção 8, e nenhum ponto de lançamento dos 409 mudou.
- Desvios 1 a 3 ratificados: só texto esperado e comentário, nenhuma asserção a menos, e sem eles os testes quebrariam
  ou passariam em falso.
- O teste do repasse do nível na página fica como Minor (abaixo): o `typecheck` já obriga a prop, e o risco que sobra
  (passar um nível fixo) não muda texto de segurança.

## Pendências

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
  - [x] textos de interface em pt-BR; axe sem violação nas telas tocadas (e2e declarado pelo engenheiro)
  - [x] o que é Minor foi para Pendências; nenhum Critical ou Important
  - [x] `/code-review` e `/security-review` ficam para o PR (08-revisao)
