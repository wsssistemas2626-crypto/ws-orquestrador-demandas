---
pedido: DEC-DEM-20261111-0018-v1
etapa: 06-T01-testes
agente: qa-automacao
leu: [pedido.json, contrato-passagem.md, tarefas.json, 2026-11-13-ws-orquestrador-demandas-sobras-plano.md (G0 a G10 e T01), 01-analista-requisitos.md (RF-01, RF-08, RNF-07), 04-seguranca-aplicacao.md (K01 e SB-01 a SB-17), 06-T01-engenheiro-backend.md, 06-T01-tech-lead.md, src/modules/acesso/matriz.ts, src/modules/acesso/ator.ts, src/db/schema/agentes.ts (lista AGENTES), src/modules/acesso/matriz.test.ts, src/modules/acesso/matriz-situacao.test.ts, src/modules/acesso/matriz-integracoes-qa.test.ts, src/modules/acesso/matriz-andamento-qa.test.ts, test/estatico/situacao.test.ts, test/estatico/piso-de-assercoes.test.ts, test/estatico/sem-controle-bidi.test.ts, saída do pnpm test em /tmp]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Verificação da T01 (ação `ler_situacao_pedido` só do `construir`, SB-01 a, b, e, f; RF-01 na matriz; RNF-07), commit
`41e7522`. O código passa em todos os testes, os do engenheiro e os acrescentados nesta etapa. Nenhum defeito achado,
nenhuma devolução.

**Critério da tarefa → teste que o cobre**

| Critério | Arquivo | Teste |
|---|---|---|
| SB-01: `ACOES` ganha a ação e a linha é `SO_CONSTRUIR` | `src/modules/acesso/matriz-situacao.test.ts` | "a linha é SO_CONSTRUIR (a mesma das outras quatro do /construir): sem pessoa, sem agente, congelada" |
| | `src/modules/acesso/matriz-situacao-qa.test.ts` | "é o mesmo objeto das outras quatro do /construir (uma fonte só, SO_CONSTRUIR), e nenhuma linha de leitura" |
| SB-01: o diff de `matriz.ts` tem uma linha em `ACOES` e uma em `MATRIZ` | `test/estatico/situacao-qa.test.ts` | "a ação aparece exatamente duas vezes: o item de ACOES e a linha de MATRIZ"; "SO_CONSTRUIR é declarada uma vez, sem pessoa, sem agente e só com o construir" |
| SB-01 (a): os pares exatos são os seis da 0.4.0 mais o novo | `matriz-situacao.test.ts` | "(a) os pares (ação, integração) montados de MATRIZ são exatamente os seis da 0.4.0 e o novo" |
| | `matriz-integracoes.test.ts`, `matriz-andamento.test.ts` (G5) | pares exatos, com o par novo |
| | `matriz-situacao-qa.test.ts` | "a ação nova não estava na 0.4.0 e nenhuma das 24 é ação de integração além das seis de antes" |
| SB-01 (b) e RNF-07: o `construir` com 5 ações, o `awave` com 2, 25 ações | `matriz-situacao.test.ts` | "(b) o construir tem exatamente cinco ações e o awave exatamente duas; a matriz tem 25 ações" |
| | `matriz.test.ts` (G5) | "as ações são as 25 do plano, sem repetição, e a matriz não tem linha a mais" |
| RNF-07: pessoa e agentes sem mudança | `matriz.test.ts` | "cada linha é a da tabela do plano"; "autorizar segue a matriz em cada ação, para cada agente e cada papel" |
| | `matriz-situacao-qa.test.ts` | "as 24 ações da 0.4.0 continuam na mesma ordem e ler_situacao_pedido é a 25ª e última" |
| SB-01 e CA-01.4 na matriz: `awave`, os quatro agentes, os papéis e o sistema negados | `matriz-situacao.test.ts` | "awave, os quatro agentes (com e sem token), cto, administradora e sistema são negados" |
| | `matriz-situacao-qa.test.ts` | "são os quatro agentes, os dois papéis e o awave, nessa ordem; o construir não está na lista"; "cada ator da lista é de fato negado por autorizar"; "o 403 … é o corpo de toda negação, para cada ator negado, e igual ao de registrar_andamento" |
| | `matriz-integracoes-qa.test.ts` | "%s nega cada agente (com token e do worker), cada papel, o awave e o sistema" (agora com a ação nova) |
| SB-01 (e): integração fora da lista ou de nome parecido negada | `matriz-situacao.test.ts` | "(e) integração fora da lista ou com nome parecido é negada; o construir passa" |
| | `matriz-situacao-qa.test.ts` | "valor %i negado, e a integração exata passa" (22 valores: controle, largura zero, BOM, NBSP, largura total, Cirílico, acento composto e decomposto, String embrulhada, objeto, lista, Symbol); "agente chamado construir, pessoa com papel construir, tipo construir e sistema com integração são negados" |
| SB-01: o `construir` não ganha outra ação | `matriz-situacao.test.ts` | "o construir continua negado nas leituras de pessoa e de agente (não ganha outra ação)" |
| | `matriz-situacao-qa.test.ts` | "caixa, espaço, hífen, acento, sufixo e pedaço não viram ler_situacao_pedido"; "atoresProibidos de cada nome quase igual proíbe todos …" |
| SB-01: a linha não muda em tempo de execução | `matriz-situacao-qa.test.ts` | "acrescentar awave, agente ou pessoa, trocar, apagar ou redefinir a linha lança TypeError, e a regra segue a mesma"; "uma linha ler_situacao_pedido aberta, ou pessoa, agentes e integracoes postos no protótipo de Object, não mudam a regra" |
| SB-01 (f): fora de teste, só matriz, rota e serviço citam a ação; nenhum `'use server'`, job ou worker | `test/estatico/situacao.test.ts` | os quatro casos do engenheiro |
| | `test/estatico/situacao-qa.test.ts` | "em qualquer extensão, fora de teste, só a matriz, a rota nova e o serviço citam a ação ou pedaços do nome"; "nenhum arquivo que cita a ação tem 'use server' em lugar nenhum (nem inline, dentro da função)"; "as regras pegam os casos plantados" |
| SB-01 (c) e (d) | `test/matriz-rotas.test.ts`, `test/matriz-rotas-integracoes-qa.test.ts` | sem mudança (G5); a (c) pela rota fica na T02 |
| SB-15 / G3.9: os testes novos no piso | `test/estatico/piso-de-assercoes.test.ts` | "%s tem ao menos %i linhas com expect(" |

**Testes acrescentados**

- `src/modules/acesso/matriz-situacao-qa.test.ts` (novo, 38 casos, 46 linhas com `expect(`): o olhar de quem tenta
  abrir a ação a outro ator. O nome `construir` em outro tipo de ator; 22 formas quase iguais da integração; 11 nomes
  quase iguais da ação, que falham fechados até para o `construir`, com `atoresProibidos` proibindo todos; as 24 ações da
  0.4.0 na mesma ordem, com a nova no fim; a linha compartilhada congelada (push, unshift, splice, troca, delete,
  `defineProperty`, `setPrototypeOf`); o protótipo de Object com a linha aberta e com `pessoa`, `agentes` e
  `integracoes`; `atoresProibidos` escrito por extenso; o 403 único, sem a ação, a integração nem o prefixo.
- `test/estatico/situacao-qa.test.ts` (novo, 5 casos, 21 linhas com `expect(`): a varredura do SB-01 (f) ampliada a
  `.js/.jsx/.mjs/.cjs/.mts/.cts` e aos arquivos de configuração da raiz. Ela pega o `'use server'` inline (o
  `ehServerAction` do engenheiro só olha o começo da linha) e o nome montado por pedaços (`ler_situac`, `situacao_ped`).
  Na fonte de `matriz.ts`: duas ocorrências da ação, a linha `ler_situacao_pedido: SO_CONSTRUIR` e `SO_CONSTRUIR`
  declarada uma vez como `linha(null, [], ['construir'])`. Cada regra tem um caso plantado.
- `test/estatico/piso-de-assercoes.test.ts`: só acréscimo, com o comentário de origem. Entram
  `src/modules/acesso/matriz-situacao-qa.test.ts: 46` e `test/estatico/situacao-qa.test.ts: 21`, contados linha a linha
  no fim da etapa, pelo critério do `linhasComExpect`.
- `src/modules/acesso/matriz-integracoes-qa.test.ts`: corrijo o M1 e o M2 da revisão (dois espaços que a troca da G5
  apagou, nas linhas 66 e 119). É só texto: o título do `it` e o espaço do argumento. Nenhuma asserção nem contagem
  muda.

**Resultado**

- `pnpm test` (suíte inteira, em segundo plano): **352 de 352 arquivos, 7813 de 7813 testes**, 0 falhas, 188,5 s.
  Na revisão eram 350 e 7768. A diferença é 2 arquivos e 45 testes: os 43 casos novos e as 2 entradas novas do piso.
- Os dois arquivos novos sozinhos: 2 de 2 arquivos, 43 de 43 testes.
- `pnpm lint`: limpo (sem saída do `eslint .`).
- `pnpm typecheck`: limpo (sem saída do `tsc --noEmit`).

**Relatório de falhas por criticidade:** nenhuma falha. Nenhuma instabilidade apareceu.

## Decisões tomadas

- Os testes novos ficam em arquivos `-qa` separados. Assim não toco asserção do engenheiro, e a G5 continua sendo a
  única lista de mudança em teste existente.
- Os caracteres invisíveis e os homóglifos saem de `String.fromCodePoint`, e não do caractere cru. A razão é a mesma do
  `sem-controle-bidi.test.ts`: quem revisa vê o que está sendo testado.
- `atoresProibidos` fica escrito por extenso. Comparar com o de `registrar_andamento` passaria mesmo se as duas linhas
  se abrissem juntas, porque elas são o mesmo objeto.
- A varredura do nome por pedaços (`/ler_situac|situacao_ped/`) não pega o `situacaoDoPedido` nem a pasta `situacao` da
  rota. Por isso a T02 não precisa mudar este teste, e dois casos plantados provam isso.
- Corrigi o M1 e o M2. Estão nas mesmas linhas que a G5 abriu para a T01, só restauram o texto pretendido, e editar
  `*.test.ts` está na minha lista **Pode**. Assim não sobra para a 08.
- `matriz-integracoes-qa.test.ts` e `matriz-integracoes.test.ts` (testes de segurança da 0.3.0) não entram no piso
  nesta etapa. Eles são candidatos da T09 (D-18, CA-08.2), e a `06-T09-testes` confere a lista.

## Pendências

- O critério "conferido com `git diff`" foi conferido pela lista das minhas próprias edições, e não por um `git diff`
  rodado, porque a regra de comando desta passagem só libera `pnpm`. As edições são três: dois arquivos novos;
  acréscimo de 3 linhas no `PISO` (2 entradas e o comentário de 2 linhas), sem tirar nem baixar valor; e dois espaços
  em títulos e argumento de `matriz-integracoes-qa.test.ts`. Nenhum `.skip`, `.only` nem `.todo`, e nenhuma asserção
  saiu. A 08 roda o `git diff 41108ee` de novo (G4).
- Instabilidades conhecidas sob carga: nenhuma apareceu nesta rodada (`scripts/scripts.test.ts` T33,
  `test/desempenho/leitura.test.ts`, `src/app/api/saude/route.test.ts`, `resumo-da-fila` e `minimizar` passaram).
- Para a T02: o `test/estatico/situacao-qa.test.ts` já aceita a rota e o serviço nos caminhos da G7. Se a T02 os
  criar em outro caminho, a lista `CITAM_A_ACAO` dos dois estáticos muda junto, e isso é mudança de teste de segurança
  (G3.2).
- O `pedido.json` não traz instrução para o agente. Nada a registrar.

## Comandos executados

- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/acesso/matriz-situacao-qa.test.ts test/estatico/situacao-qa.test.ts --reporter=dot` — 2 de 2 arquivos, 43 de 43 testes
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — em segundo plano: 352 de 352 arquivos, 7813 de 7813 testes; saída lida com Read em /tmp
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
