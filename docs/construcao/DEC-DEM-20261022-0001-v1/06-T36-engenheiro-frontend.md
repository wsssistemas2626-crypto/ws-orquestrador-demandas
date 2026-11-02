---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T36-construcao
agente: engenheiro-frontend
leu: [contrato-passagem.md, 06-T36-tech-lead.md, 06-T36-engenheiro-frontend.md (entrega anterior desta etapa), src/app/(painel)/layout.tsx, src/modules/demandas/gerar-id.ts, src/components/componentes.test.ts, src/components/formulario.test.ts, src/components/formulario.ts, src/components/ResumoErros.tsx, src/components/GrupoOpcoes.tsx, src/components/CabecalhoPainel.tsx, src/components/Alerta.tsx, src/lib/acao-painel.ts, e2e/apoio.ts, vitest.config.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Esta é a volta da T36 que responde à revisão `06-T36-tech-lead.md`. Ela corrige os dois pareceres Important e os três
Minor. O resto da T36 (design system, moldura, páginas de erro e infraestrutura do e2e) ficou como estava no `ddf673c`,
descrito na entrega anterior desta etapa.

Os portões estão verdes:
- `pnpm test`: 144 arquivos, 2834 de 2834 testes (eram 2826; esta volta soma 8);
- `pnpm test:e2e`: 5 de 5, com axe;
- `pnpm lint` e `pnpm typecheck`: limpos;
- `pnpm build`: passa.

### Important 1: o limite e a contagem de RNF-09 vêm da T14

- Em `src/app/(painel)/layout.tsx`, saíram a constante local `LIMITE_AVISO_CAPACIDADE = 9_000`, a chamada a
  `listarDemandas(..., { limit: 1 })` e os imports de `listarDemandas`, `filtroDemandasSchema`, `Alerta` e `Link`.
- O layout agora lê `await totalDeDemandas(deps.db)` de `src/modules/demandas/gerar-id.ts`. Esse é um `count()` simples,
  sem filtro nem ordenação.
- O limite vem de `LIMITE_AVISO_CAPACIDADE`, também de `gerar-id.ts`, e quem o usa é o novo `AvisosDaMoldura`. A
  condição continua `total > LIMITE_AVISO_CAPACIDADE`, porque a 03, 2.7, diz "mais de 9.000".

### Important 2: os avisos da moldura ganharam componente e teste

- Novo: `src/components/AvisosDaMoldura.tsx`, com as props `{ tetoMensal: number; suspenso: boolean; totalDemandas: number }`.
  - Ele recebe o JSX que estava nas linhas 62 a 83 do layout e a regra da linha 47 (`tetoMensal > 0 && suspenso`).
  - Sem nenhum aviso, devolve `null`.
- O layout ficou só com a leitura: `situacaoDoTeto` e `totalDeDemandas`. Depois, renderiza
  `<AvisosDaMoldura tetoMensal suspenso totalDemandas />`.
- Testes novos em `src/components/componentes.test.ts`, no bloco `AvisosDaMoldura (03, 2.7: RF-18 e RNF-09)`. São os 6
  casos do parecer:
  - teto 0 e suspenso: o HTML sai vazio;
  - teto 10, sem suspensão e com 9.000 demandas: o HTML sai vazio;
  - teto 10 e suspenso: sai o texto inteiro da 03, 2.7, mais o link "Ver agentes e teto" com
    `href="/configuracao/agentes"`, e não sai o aviso de capacidade;
  - 9.001 demandas: sai o texto de capacidade com "9.001", e não sai o de suspensão;
  - 9.012 demandas: o número sai como "9.012";
  - os dois avisos juntos: primeiro a suspensão, depois a capacidade.

### Minor 3: o foco do Resumo de erros não depende mais de um array novo

- Em `src/components/formulario.ts`, `errosDoResultado` passou a guardar o que calcula num `WeakMap`, indexado pelo
  resultado e depois pelos rótulos. Assim, o mesmo `ResultadoAcao` com os mesmos rótulos devolve o mesmo objeto, e os
  mesmos `campos`.
- Cada envio do `useActionState` traz um resultado novo, e então o foco volta ao resumo. Uma nova renderização que vem
  de estado da própria tela não tira mais o foco do campo.
- O padrão de `rotulos` virou uma constante do módulo (`SEM_ROTULOS`), e não um `{}` criado a cada chamada.
- O comentário de `src/components/ResumoErros.tsx` explica que "muda" quer dizer a identidade de `erros`.
- Teste novo em `src/components/formulario.test.ts`:
  - com o mesmo resultado, sai o mesmo objeto e o mesmo `campos`, com rótulos e sem eles;
  - com outro resultado igual em conteúdo, sai um objeto diferente, com o mesmo valor.

### Minor 4: a opção indisponível do `GrupoOpcoes` também é barrada no `change`

- Em `src/components/GrupoOpcoes.tsx`, a nova função exportada `opcaoMarcavel(opcoes, valor)` responde se a opção existe
  no grupo e está disponível.
- O `aoMudar` só chama `onMudar` quando ela responde que sim. Isso cobre a troca pelas setas do teclado, além do clique,
  que já era bloqueado.
- Teste novo em `componentes.test.ts`, com três casos: uma opção disponível, uma indisponível e um valor que não está no
  grupo.

### Minor 5: o IP fictício do `entrarComo`

- Em `e2e/apoio.ts`, o contador passou a ser `% 64_000`. Com isso, o terceiro octeto vai de 0 a 255 e o quarto, de 1 a
  250.
- O comentário agora cita a faixa 198.18.0.0/15 como a de testes de desempenho de rede (RFC 2544).
- Saiu a menção a um "proxy da homologação". No lugar, o comentário diz o que acontece se um proxy regravar `x-real-ip`.

### Teste escrito antes e visto falhando

`pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components` falhou, antes do código, nas duas
suítes que mudaram:
```
 ❯ src/components/formulario.test.ts (9 tests | 1 failed)
     × o mesmo resultado devolve o mesmo objeto; um envio novo, um objeto novo (foco do Resumo de erros, 2.5)
 FAIL  src/components/componentes.test.ts [ src/components/componentes.test.ts ]
Error: Cannot find module '/src/components/AvisosDaMoldura' imported from .../src/components/componentes.test.ts
 Test Files  2 failed | 1 passed (3)
```
Depois do código, a mesma suíte passou com 54 de 54.

### Arquivos desta volta

- Criado: `src/components/AvisosDaMoldura.tsx`.
- Alterados:
  - `src/app/(painel)/layout.tsx`;
  - `src/components/formulario.ts`;
  - `src/components/ResumoErros.tsx` (só o comentário);
  - `src/components/GrupoOpcoes.tsx`;
  - `src/components/componentes.test.ts`;
  - `src/components/formulario.test.ts`;
  - `e2e/apoio.ts`.

### Desvios do plano

- Nenhum além dos desvios 1 a 8 da entrega anterior, que o tech-lead aceitou.
- O Minor 5 ficou sem teste unitário. `e2e/apoio.ts` não entra no `include` do Vitest. A mudança é a conta do módulo e o
  comentário, e o `pnpm test:e2e` (5 de 5) passa por ela a cada login.

## Decisões tomadas

- A regra de mostrar ou não cada aviso ficou dentro do `AvisosDaMoldura`, e não no layout: assim, o teste da regra do
  teto 0 e do `>` da capacidade passa pelo mesmo código que a tela usa.
- `AvisosDaMoldura` não tem `'use client'`. Ele importa `gerar-id.ts`, que é código de servidor, e só o layout do
  servidor o usa.
- No Minor 3, escolhi a memória em `errosDoResultado`, e não uma prop `envio` no `ResumoErros`. Assim, tanto o resumo
  quanto o `porCampo` de cada campo ficam com a mesma identidade, e quem consome não precisa passar nada a mais. O custo
  é que os rótulos têm de ser uma constante do módulo da tela, e isso está escrito no comentário.
- Usei `WeakMap` para a memória não segurar resultados antigos depois que a tela os descarta.
- No Minor 4, a regra virou uma função pura e exportada. O ambiente do Vitest é `node`, sem DOM, e assim dá para testar
  sem disparar um evento `change`.

## Pendências

- Seguem valendo as pendências da entrega anterior: os textos fora da 03, que o `ux-ui-design` precisa confirmar; o
  "Sair" e o `/entrar`, que ficam com a T37; o 07-qa-funcional; e o nonce da CSP no 09-entrega.
- T37 em diante: o formulário que usar `errosDoResultado` deve passar os rótulos como uma constante do módulo, para o
  foco do Resumo de erros não pular a cada renderização.

## Comandos executados

- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components` — FAIL, 2 suítes, módulo `AvisosDaMoldura` ausente e 1 teste de identidade (teste antes do código)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components` — 54 de 54
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — 2834 de 2834, 144 arquivos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — 5 de 5
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas build` — passou; todas as rotas dinâmicas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — 7 alterados e 1 novo, todos da tarefa

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] os textos são os de `03-ux-ui-design.md`, em pt-BR, e o axe não acusa violação nas telas tocadas
