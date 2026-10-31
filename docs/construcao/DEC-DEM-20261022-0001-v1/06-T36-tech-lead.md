---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T36-revisao
agente: tech-lead
leu: [contrato-passagem.md, 06-T36-tech-lead.md (revisão anterior, cc6933d), 06-T36-engenheiro-frontend.md (volta de 251a16a), git diff cc6933d..251a16a, src/app/(painel)/layout.tsx, src/components/AvisosDaMoldura.tsx, src/components/GrupoOpcoes.tsx, src/modules/demandas/gerar-id.ts, saída do pnpm test guardada pelo Bash na pasta da sessão]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Esta é a segunda revisão da T36, sobre o intervalo `cc6933d..251a16a`. O código entrou no `251a16a`, junto com a
entrega do engenheiro e uma linha de `passagens.jsonl`. Mudaram 7 arquivos de código e teste e foi criado 1:
`e2e/apoio.ts`, `src/app/(painel)/layout.tsx`, `src/components/AvisosDaMoldura.tsx` (novo),
`src/components/GrupoOpcoes.tsx`, `src/components/ResumoErros.tsx`, `src/components/componentes.test.ts`,
`src/components/formulario.test.ts` e `src/components/formulario.ts`.

**Veredito da revisão: aprovado, `pronto`, `proximo: qa-automacao` (etapa `06-T36-testes`).** Os dois Important da
revisão anterior foram resolvidos, e os três Minor também. Não há parecer novo que bloqueie.

Portões conferidos nesta revisão:
- `pnpm test`: 144 arquivos, 2834 de 2834 testes (eram 2826; esta volta trouxe 8 testes novos);
- `pnpm lint`: limpo;
- `pnpm typecheck`: limpo.

O `pnpm test:e2e` não está na minha lista Pode. Para ele, vale o 5 de 5 que o engenheiro declarou.

### Conferência dos pareceres anteriores

**Important 1 (resolvido): o limite e a contagem de RNF-09 têm uma fonte só.**
- O que saiu de `src/app/(painel)/layout.tsx`:
  - a constante local `LIMITE_AVISO_CAPACIDADE = 9_000`;
  - a chamada a `listarDemandas(..., { limit: 1 })`;
  - os imports de `listarDemandas` e `filtroDemandasSchema`.
- O layout lê `totalDeDemandas(deps.db)` na linha 39, importado de `gerar-id.ts` (`src/modules/demandas/gerar-id.ts:39`).
  É um `count()` simples, sem filtro nem ordenação.
- O limite vem de `LIMITE_AVISO_CAPACIDADE` (`gerar-id.ts:17`), que `src/components/AvisosDaMoldura.tsx:4` importa.
- A condição continua `>` (`AvisosDaMoldura.tsx:14`), como a 03, 2.7, pede ("mais de 9.000").

**Important 2 (resolvido): os avisos da moldura têm componente e teste.**
- Toda a regra de exibição ficou em `src/components/AvisosDaMoldura.tsx`:
  - a do teto 0 (`tetoMensal > 0 && suspenso`, linha 12);
  - a da capacidade (linha 14);
  - o JSX dos dois avisos.
- O layout só lê os dados e passa as props (linha 55).
- Os 6 casos que pedi estão em `src/components/componentes.test.ts`, no bloco `AvisosDaMoldura (03, 2.7: RF-18 e
  RNF-09)`:
  - teto 0 e suspenso, com HTML vazio;
  - 9.000 demandas, com HTML vazio;
  - o texto inteiro da suspensão e o link com `href="/configuracao/agentes"` e o texto "Ver agentes e teto", sem o aviso
    de capacidade;
  - 9.001 demandas, sem o aviso de suspensão;
  - "9.012";
  - a ordem suspensão e depois capacidade.
- Os testes agora falham se alguém mudar a regra do teto 0, o `>`, o texto ou o link. A entrega mostra o teste falhando
  antes do código, com o módulo ainda ausente.

**Minor 3 (resolvido): o foco do Resumo de erros.**
- `errosDoResultado` (`src/components/formulario.ts:56-78`) passou a guardar o resultado num `WeakMap`, indexado pelo
  resultado e depois pelos rótulos.
- O padrão de `rotulos` virou a constante `SEM_ROTULOS`.
- O teste em `formulario.test.ts` confere três coisas:
  - o mesmo resultado devolve o mesmo objeto e o mesmo `campos`;
  - com outro envio de mesmo conteúdo, o objeto é outro, com o mesmo valor;
  - isso vale com rótulos e sem eles.
- Aceito a escolha do engenheiro, em vez da prop `envio` que eu tinha sugerido. Assim, o `porCampo` de cada campo também
  mantém a identidade. A limitação está no comentário e em Pendências: os rótulos têm de ser uma constante do módulo da
  tela.

**Minor 4 (resolvido): `GrupoOpcoes` barra a opção indisponível no `change`.**
- `aoMudar` (`src/components/GrupoOpcoes.tsx:35-37`) só chama `onMudar` quando `opcaoMarcavel` deixa.
- O teste cobre três casos: uma opção disponível, uma indisponível e um valor que não está no grupo.

**Minor 5 (resolvido): o IP fictício do `entrarComo`.**
- O contador agora é `% 64_000` (`e2e/apoio.ts:25`). Com isso, `Math.floor(n / 250)` vai de 0 a 255 e o quarto octeto
  vai de 1 a 250.
- O comentário cita a RFC 2544 e não fala mais do proxy da homologação.
- Não há teste unitário. Aceito, porque `e2e/` está fora do `include` do Vitest e o `test:e2e` passa por esse código a
  cada login.

### Observações desta volta (não bloqueiam)

**Observação A: o teste do Minor 4 não passa pelo `aoMudar`**
- Onde: `src/components/GrupoOpcoes.tsx:35-37`.
- Problema: o teste chama só `opcaoMarcavel`. Se alguém tirar a chamada de dentro do `aoMudar`, os testes continuam
  verdes.
- Problema: no modo não controlado (`valorPadrao`), a guarda não desmarca o rádio no DOM. Quem desmarca é o
  `preventDefault` do clique, e os navegadores disparam `click` também na troca pelas setas.
- Razão para não bloquear: a regra que vale está no servidor (`transicoesManuaisDe`). O Vitest roda em `node`, sem DOM,
  e não consegue disparar o `change`.
- Caminho: o 07-qa-funcional confere pelo teclado que a opção indisponível não fica marcada. É a T05 da 03.

**Observação B: a memória de `errosDoResultado` depende da identidade dos rótulos**
- Onde: `src/components/formulario.ts:63-77`.
- Problema: uma tela que montar `rotulos` como objeto literal a cada renderização volta a gerar um objeto novo a cada
  vez. Com isso, o foco pula para o resumo, que é o defeito do Minor 3.
- Razão para não bloquear: hoje nenhum formulário usa o componente, e a regra está escrita no comentário e nas
  Pendências do engenheiro.
- Caminho: da T37 à T46, a revisão confere que `rotulos` é constante de módulo. O 07-qa-funcional confere que o foco
  fica no campo enquanto a pessoa digita.

### Checklist da seção 12

- [x] A tarefa faz o que o plano pede, nem mais nem menos: RF-18 e RNF-09 agora têm teste. Os desvios 1 a 8 da primeira
  volta seguem aceitos, e esta volta não trouxe desvio novo.
- [x] Há teste para cada comportamento novo, e ele falharia sem o código: os avisos da moldura, a identidade de
  `errosDoResultado` e `opcaoMarcavel`. A ligação de `opcaoMarcavel` ao `aoMudar` não tem teste (Observação A).
- [x] Nenhum segredo, valor de `.env` ou dado pessoal real: os dados dos testes novos são números e textos da 03, e o
  IP é fictício.
- [x] Entrada externa validada com Zod e erro sem vazar detalhe: a volta não mexeu em `alertaDe` nem na regra do 5xx, e
  o teste com sentinela continua passando.
- [x] Banco: a tarefa não tem migration. A contagem usa `totalDeDemandas` (T14), que já existia.
- [x] Nada duplica função existente: a constante e a contagem locais saíram do layout.
- [x] Textos em pt-BR e iguais aos da 03, 2.7: o teste confere o texto inteiro dos dois avisos.
- [x] O que é Minor está nas Observações A e B, que não bloqueiam a passagem.
- [x] No PR: não se aplica nesta etapa (`08-revisao`).

## Decisões tomadas

- Aprovo a T36. Os dois Important foram resolvidos como pedi: uma fonte para o limite e a contagem, e um componente
  testado com os 6 casos.
- Aceito a memória por `WeakMap`, no lugar da prop `envio`. Ela mantém a identidade também do `porCampo`, e quem usa
  não precisa passar nada a mais.
- Deixo as Observações A e B como não bloqueantes. Nenhum consumidor usa esses componentes hoje, e a garantia de
  transição está no servidor.

## Pendências

- 06-T36-testes (qa-automacao): os testes de `AvisosDaMoldura`, da identidade de `errosDoResultado` e de
  `opcaoMarcavel` estão em `src/components/`.
- 07-qa-funcional: conferir pelo teclado que a opção indisponível do `GrupoOpcoes` não fica marcada (Observação A). E
  conferir que o foco do Resumo de erros não sai do campo durante a digitação (Observação B).
- Seguem valendo as pendências da primeira volta:
  - foco no `h1`, diálogo e contador da `AreaTexto`, com o 07-qa-funcional;
  - nonce da CSP, com o 09-entrega;
  - textos fora da 03, com o `ux-ui-design`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat cc6933d..251a16a` — 10 arquivos (7 de código e teste, 1 novo, a entrega e `passagens.jsonl`)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff cc6933d..251a16a -- e2e src` — o código desta volta
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -6` — último commit 251a16a
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — 2834 de 2834, 144 arquivos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`. O checklist está
  todo cumprido.
