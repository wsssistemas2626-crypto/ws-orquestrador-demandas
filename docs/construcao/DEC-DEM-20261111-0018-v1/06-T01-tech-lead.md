---
pedido: DEC-DEM-20261111-0018-v1
etapa: 06-T01-revisao
agente: tech-lead
leu: [pedido.json, contrato-passagem.md, padrao-tecnico.md (seção 12 e o resto), 2026-11-13-ws-orquestrador-demandas-sobras-plano.md (G0 a G10 e T01), 04-seguranca-aplicacao.md (K01 e SB-01 a SB-11), 06-T01-engenheiro-backend.md, git show 41e7522, src/modules/acesso/matriz.ts, src/modules/acesso/matriz-integracoes-qa.test.ts (linhas 60 a 128), .github/workflows/ci.yml]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T01 (ação `ler_situacao_pedido` só do `construir`, SB-01 a, b, e, f), commit `41e7522`. **Aprovada.** Não
há problema Critical nem Important. Os dois Minor estão abaixo e em Pendências.

**O que conferi**

- **Escopo (plano, T01 e G4):** o `--stat` do commit mostra só os arquivos que a T01 lista: `matriz.ts`, os quatro testes
  da G5, o `piso-de-assercoes.test.ts` e os dois testes novos. O `pedido.json` e o `passagens.jsonl` também aparecem no
  commit, mas foram escritos pelo maestro (o acréscimo 11 de Fabiano e o registro da passagem). Nenhuma superfície
  congelada da G4 está no commit.
- **`matriz.ts` (SB-01, diff parcial da G4):** o arquivo ganhou uma linha em `ACOES` (`'ler_situacao_pedido'`, com o
  comentário da 0.4.1), uma em `MATRIZ` (`ler_situacao_pedido: SO_CONSTRUIR`) e o comentário dos pares, que passa de
  seis para sete e de quatro para cinco. A linha reaproveita o objeto `SO_CONSTRUIR`, congelado, sem pessoa e sem
  agente. A ação não entrou em `LEITURA` e não foi criada linha nova. Nenhuma outra linha mudou, e `autorizar`,
  `permitido`, `linhaDa` e `atoresProibidos` estão intactos.
- **O `construir` não ganhou outra ação:** os pares exatos (a) e a lista exata das cinco ações (b) aparecem em três
  arquivos (`matriz-situacao`, `matriz-andamento` e `matriz-integracoes`). O caso "não ganha outra ação" confere a
  negação nas leituras de pessoa e de agente. Uma ação a mais para qualquer integração quebra os três.
- **Negação de todos os outros atores:** `awave`, os quatro agentes com e sem token, cada papel, o sistema, as
  integrações de nome parecido (`Construir`, `construir `, `__proto__`, `toString`) e `atoresProibidos` igual ao de
  `registrar_andamento`. Os testes de QA de hoje (`matriz-integracoes-qa`: formas misturadas, prefixo do token, 403
  único) passam a cobrir a ação nova sozinhos, pelo `DO_CONSTRUIR`.
- **Teste estático (f):** a varredura de `{src,scripts}` fora de `*.test.ts` aceita só `matriz.ts`, a rota nova e o
  serviço. Nenhum arquivo `'use server'`, de `src/jobs/` ou de `src/worker/` pode citar a ação. O caso plantado reprova a
  regra.
- **TDD (G3.1):** a entrega mostra o comando e as 15 falhas antes do código, todas pela ação que ainda não existia. Os
  testes de guarda que nasceram verdes estão nomeados, com a razão: a rota e o serviço só chegam na T02.
- **G5 e SB-16:** nenhuma asserção saiu. Só mudaram constantes de lista (`DO_CONSTRUIR`, `SO_CONSTRUIR`), números
  (24 → 25, `- 6` → `- 7`) e títulos. As linhas com `expect(` dos arquivos alterados continuam todas.
- **Piso (G3.9):** o arquivo recebeu só acréscimos, com o comentário pedido no plano. Contei as linhas `expect(` dos dois
  arquivos novos lendo o diff: `matriz-situacao.test.ts` tem 15 e `situacao.test.ts` tem 8, iguais ao que foi gravado
  no `PISO`. `expect.objectContaining(` não conta, como no `linhasComExpect`.
- **Dados fictícios (G3.3):** o prefixo é `ficticio`, o nome é `Pessoa Ficticia`, o usuário é `u-ficticio`. Não há
  token, segredo nem dado pessoal real.
- **Zod e erro:** a T01 não cria rota, Server Action nem job, então não há entrada externa nova. O 403 continua a
  mensagem única de `MENSAGENS_ACESSO`.
- **Duplicação:** o `permite` local repete o molde dos outros testes da matriz. Fica assim de propósito: a D-06 proíbe
  importar de outro `*.test.ts`.
- **Interface e axe:** não se aplica, a tarefa não tem tela.
- **Verde do meu lado:** os testes da matriz, os estáticos e os de rotas (`test/matriz-rotas*.test.ts`, que cobrem
  SB-01 c e d sem mudança) passaram com 73 de 73 arquivos e 1604 de 1604 testes. `pnpm lint` e `pnpm typecheck` estão
  limpos. A suíte inteira, rodada em segundo plano, passou com 350 de 350 arquivos e 7768 de 7768 testes, sem
  falha e sem nenhuma das instabilidades conhecidas. A entrega do engenheiro diz 7767. A diferença de um teste não
  pesa: nenhum arquivo falhou e nenhum foi pulado.

**Pareceres (Minor, não bloqueiam)**

| # | Arquivo:linha | Problema | Razão |
|---|---|---|---|
| M1 | `src/modules/acesso/matriz-integracoes-qa.test.ts:66` | `'valor %i negado nas 25 ações',(_i, valor)`: o espaço depois da vírgula sumiu na troca de 24 para 25 | A formatação do Prettier (padrão técnico, seção 1) fica diferente. O CI não roda `format --check` e o `eslint` não acusa, então nada quebra. É só ruído no próximo `pnpm format`. |
| M2 | `src/modules/acesso/matriz-integracoes-qa.test.ts:119` | Título "atoresProibidos das cinco é exatamente:os quatro agentes…": o espaço depois dos dois-pontos sumiu na troca de quatro para cinco | O título sai errado no relatório do teste. A asserção não muda. |

## Decisões tomadas

- Ratifico a mudança de título fora da letra da G5, pedida pelo engenheiro pela G3.2. Em `matriz-integracoes.test.ts`,
  "as quatro do /construir" virou "as cinco", e o título (a) ganhou "e do RF-01 da 0.4.1". Ambas estão dentro da
  intenção da linha da G5 ("nos títulos", a contagem das ações do `construir`). Só o texto do `it` mudou: nenhuma
  asserção, nenhuma constante além do `DO_CONSTRUIR`. Mantido, o título antigo ficaria falso. Por isso a mudança não
  volta ao `05-plano`. A devolução da G3.2 é para mudança de comportamento do teste de segurança, e esta não é.
- Os comandos fora da regra da passagem que o engenheiro declarou ficam com o maestro: o registro já mostra a passagem
  como `bloqueado` por comando, e tirar ou aceitar comando não cabe na revisão de código. Nenhum deles muda o
  repositório. Isso não pesa no parecer técnico.
- M1 e M2 são Minor pela seção 12 e não bloqueiam. Não os corrijo: editar código não está na minha lista **Pode**.

## Pendências

- M1 e M2 (tabela acima): dois espaços apagados em `src/modules/acesso/matriz-integracoes-qa.test.ts`, linhas 66 e 119.
  A correção é só de texto e não muda asserção nem contagem. Sugiro fazê-la na `08-correcao`, se houver, ou na próxima
  tarefa que tocar o arquivo, e citá-la na entrega.
- G4 contra `41108ee`: rodei só `git show` e o `--stat` do commit, que é o que a regra desta passagem permite. Os dois
  confirmam que este commit não toca superfície congelada. O comando completo da G4 (`git diff 41108ee -- …`) não está na
  regra desta passagem. Nesta revisão, a fonte dele é a entrega do engenheiro, que o declara vazio. A 08 roda de novo
  (G4).
- Para a T02: o estático `test/estatico/situacao.test.ts` já espera a rota e o serviço nos caminhos da G7. O piso dele
  (8) sobe quando a T02 o ampliar com o SB-03, o SB-04 e o SB-06.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 41e7522c64ec708f1659d4f3eb02fdee9cac707f~1 41e7522c64ec708f1659d4f3eb02fdee9cac707f --stat` — 11 arquivos, nenhum da G4
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 41e7522c64ec708f1659d4f3eb02fdee9cac707f`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/acesso test/estatico test/matriz-rotas.test.ts test/matriz-rotas-integracoes-qa.test.ts --reporter=dot` — 73 de 73 arquivos, 1604 de 1604 testes
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — em segundo plano: 350 de 350 arquivos, 7768 de 7768 testes, 0 falhas (177 s); saída lida com Read em /tmp

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
