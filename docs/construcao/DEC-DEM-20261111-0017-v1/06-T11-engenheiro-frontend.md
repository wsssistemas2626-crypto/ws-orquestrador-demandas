---
pedido: DEC-DEM-20261111-0017-v1
etapa: 06-T11-construcao
agente: engenheiro-frontend
leu: [pedido.json, tarefas.json, padrao-tecnico.md, contrato-passagem.md, docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md (G7 interfaces, T05 trecho de rotulos.ts, T11, início da T12), 03-ux-ui-design.md (seções 0 a 10 e Decisões), 06-T10-engenheiro-backend.md (formato e seed), src/components/rotulos.ts, src/components/rotulos-integracao.test.ts, src/components/dados-das-etapas.ts (cabeçalho e tipos), src/components/dados-do-pacote.ts (RE_ID_DEC), src/modules/andamento/schemas.ts, src/db/schema/andamento.ts, src/modules/historico/consultas.ts (EventoVisivel), src/modules/demandas/consultas.ts (PacoteResumo)]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T11 do plano: rótulos das fases e da situação da construção, a frase completa do `andamento_registrado` no histórico e as
regras puras do selo de fase (fila, T12) e da seção "Andamento da construção" (detalhe, T13). Nenhuma tela foi tocada:
a T12 e a T13 consomem estas funções.

**Arquivos alterados**

| Arquivo | O que mudou |
|---|---|
| `src/components/rotulos.ts` | import de tipo `FaseAndamento`, `StatusConstrucao`; `ROTULO_FASE` e `ROTULO_SITUACAO_CONSTRUCAO` (congelados, textos da 03, seção 8); `MAXIMO_DE_TAREFAS_NA_TELA` (cópia de `MAXIMO_DE_TAREFAS`, conferida por teste); `faseNaTela`, `situacaoNaTela` (por `Object.hasOwn`), `tarefaNaTela` (inteiro de 0 a 999) e `tarefasEmTexto` (singular com total 1); `INICIO_DO_ANDAMENTO` e `textoDoAndamento`; o caso `andamento_registrado` de `textoDoEvento` passa da frase genérica da T05 à frase da 03, 5.7 |
| `src/components/dados-do-andamento.ts` (novo) | `TEXTOS_ANDAMENTO` (03, seção 8, por inteiro); `SeloDeFase` e `seloDeFase(status, andamento)`; `SecaoDoAndamento` e `secaoDoAndamento(andamento, pacotes, formatar)`. Só tipos vêm dos módulos (vai ao navegador) |
| `src/components/rotulos-andamento.test.ts` (novo) | 25 testes: rótulos e congelamento; cópias contra `FASES_ANDAMENTO`, `STATUS_CONSTRUCAO` e `MAXIMO_DE_TAREFAS`; `tarefasEmTexto`; as frases da 5.7 (em andamento, fim, cancelamento, total 0, total 1) e os casos que caem na frase genérica (fase com HTML, `__proto__`, `toString`, situação `entregue` e `constructor`, número em texto, fracionário, negativo, acima de 999, prontas > total, `depois` nulo); DEC fora do formato vira "um pacote de decisão" |
| `src/components/dados-do-andamento.test.ts` (novo) | 19 testes: `TEXTOS_ANDAMENTO` por inteiro; `seloDeFase` para cada linha da 03, 4.1 (visível, leitor de tela, cor; total 1 no singular; total 0; concluída; cancelada); `null` em todo status diferente de `em_construcao` (CA-08.4), sem andamento e com valor fora da lista montado à mão; `secaoDoAndamento` com construindo 9/17 (objeto inteiro: link do DEC, fase, situação, barra 9 de 17 com `valorTexto` e recurso, data por `formatar` injetado e ISO, nota), sem andamento, total 0 (texto e sem barra), total 1, concluída, cancelada (alerta), pacote substituído (alerta com o id), não substituído, cancelada e substituído (ordem), `decId` fora de `RE_ID_DEC` (`dec` nulo, sem link nem alerta com o id), e valor fora da lista ou data inválida (`null`) |

**Teste antes do código (visto falhando)**

`pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/rotulos-andamento.test.ts src/components/dados-do-andamento.test.ts --reporter=dot`
antes do código:

```
 FAIL  src/components/dados-do-andamento.test.ts [ src/components/dados-do-andamento.test.ts ]
Error: Cannot find module './dados-do-andamento' imported from .../src/components/dados-do-andamento.test.ts
 FAIL  src/components/rotulos-andamento.test.ts > rótulos da 03, seção 8
AssertionError: expected undefined to deeply equal { …(6) }
 FAIL  src/components/rotulos-andamento.test.ts > tarefasEmTexto: plural e singular de total 1 (03, seção 8)
TypeError: tarefasEmTexto is not a function
Expected: "Registrou o andamento de DEC-DEM-20991231-0001-v1: Construindo, 9 de 17 tarefas"
Received: "Registrou o andamento de DEC-DEM-20991231-0001-v1"
 Test Files  2 failed (2)
      Tests  9 failed | 11 passed (20)
```

(Os 11 que passaram eram os casos que já caem na frase genérica da T05.)

**Depois do código**

- Os dois arquivos novos: 2 arquivos, 44 de 44 testes passaram.
- `pnpm typecheck`: limpo. `pnpm lint`: limpo.
- `pnpm test` (suíte inteira): 337 de 340 arquivos, 7.526 testes passaram, 2 falharam e 7 foram pulados. As 3 falhas são de
  tempo sob carga, em arquivos que não importam nada desta tarefa: `resumo-da-fila.test.ts` (EXPLAIN com 5.000 demandas:
  `canceling statement due to statement timeout` no `analyze`), `scripts/scripts.test.ts` (duas subidas do seed ao mesmo
  tempo: `statement timeout` no `pg_advisory_xact_lock`) e `minimizar.test.ts` (1.080 ms contra o limite de 1.000 ms).
  Rodados de novo sozinhos, os três passam: 3 de 3 arquivos, 346 de 346 testes.

**Desvios do plano**

- `SecaoDoAndamento` ganhou `nota: string` (o `TEXTOS_ANDAMENTO.nota`): o plano pede que o teste da seção cubra "a nota", e o
  tipo do plano não tinha onde ela ficar. Acréscimo que a T13 só lê.
- `faseNaTela`, `tarefaNaTela` e `tarefasEmTexto` são exportados de `rotulos.ts` (no plano, só `tarefasEmTexto`), e
  `situacaoNaTela` é nova: `dados-do-andamento.ts` usa as mesmas conferências do histórico, sem cópia.
- O 999 virou `MAXIMO_DE_TAREFAS_NA_TELA`, com teste contra `MAXIMO_DE_TAREFAS` do esquema (o arquivo vai ao navegador e
  só importa tipos; mesmo molde do `RE_ID_DEMANDA_NA_TELA`, D-11).
- `seloDeFase` e `secaoDoAndamento` conferem de novo cada valor (fase, situação, números, prontas ≤ total, data válida) e
  devolvem `null` com qualquer um fora; o plano diz que recebem o `AndamentoVista` já conferido. Assim, uma leitura nova
  que esqueça `lerAndamento` não leva texto de fora à tela (AN-12; 03, 5.8: fora do esquema vale como sem andamento).
- O alerta de pacote substituído só sai com `decId` no formato de `RE_ID_DEC`: o id vai dentro do texto.

## Decisões tomadas

- `Object.hasOwn` em fase e situação: `__proto__`, `toString` e `constructor` não viram rótulo (AN-12), e o teste cobre os três.
- `textoDoAndamento` como função à parte no `rotulos.ts`: o `switch` de `textoDoEvento` fica com uma linha por caso, como os demais.
- `secaoDoAndamento` devolve `dec: null` com id fora do formato, e a T13 mostra `TEXTOS_DETALHE.naoInformado` (constante de
  hoje, conforme a 03, seção 8); não dupliquei "Não informado" em `TEXTOS_ANDAMENTO`.
- `ultimaMudanca` leva só a data formatada e o ISO; o prefixo "Última mudança informada pelo /construir em " e o ponto final
  ficam na tela, para a data ficar dentro do `<time dateTime>` (03, 5.2, item 4).
- `seloDeFase` com `switch` exaustivo e `never`, no molde do `rotuloAtor`: situação nova no esquema quebra o typecheck aqui.

## Pendências

- Um comando de leitura fora da lista **Pode**: `grep -n -E ...` sobre o arquivo de saída da suíte, que o harness gravou em
  `/tmp/...` (fora do repositório e da pasta do pedido), para achar as falhas. Só leu a saída do meu próprio `pnpm test`;
  depois li o mesmo arquivo pela ferramenta Read. Não alterou nada. Fica registrado para o `conferir` e a decisão do maestro.
- As três falhas de tempo da suíte inteira (`resumo-da-fila.test.ts`, `scripts/scripts.test.ts` T33 e `minimizar.test.ts`
  B-1) são flutuação sob carga da máquina, sem relação com a T11; passam sozinhas. Sugiro ao `qa-automacao` olhar se
  voltam nas próximas tarefas.
- axe: nenhuma tela foi tocada nesta tarefa (só funções puras); a verificação com axe do selo e da seção fica com a T12 e a T13.

## Comandos executados

- `ls /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1` — lista da pasta do pedido
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "T11" -- docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md` — linhas da T11 no plano
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "^#" -- docs/construcao/DEC-DEM-20261111-0017-v1/03-ux-ui-design.md` — títulos da 03
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files src/components src/db/schema` — arquivos existentes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "PacoteResumo" -- src` — onde está o tipo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "Object.hasOwn" -- src` — uso existente
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "formatarDataHora" -- src/lib src/components` — formatação de data
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "Registrou o andamento" -- src test e2e` — testes que dependiam da frase genérica (nenhum)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — árvore limpa antes de começar
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A 12 "export type EventoVisivel" -- src/modules/historico/consultas.ts` — tipo do evento
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "pacotes-decisao/" -- src/components src/lib` — rota do link do DEC
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/rotulos-andamento.test.ts src/components/dados-do-andamento.test.ts --reporter=dot` — antes do código: 2 arquivos falharam, 9 testes falharam e 11 passaram
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/rotulos-andamento.test.ts src/components/dados-do-andamento.test.ts --reporter=dot` — depois do código: 44 de 44
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — 7.526 passaram, 2 falharam, 7 pulados (3 de 340 arquivos com falha de tempo, ver Entrega)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — conferência dos arquivos alterados
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — conferência do diff
- `grep -n -E "FAIL|Test Files|Tests |failed" /tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/d7de67e8-15e3-4f45-b927-45e1f3d1b43d/tasks/b07ykf5wc.output` — fora da lista Pode (ver Pendências); só leitura da saída do meu `pnpm test`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/demandas/resumo-da-fila.test.ts scripts/scripts.test.ts src/modules/dados-pessoais/minimizar.test.ts --reporter=dot` — 346 de 346

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa (os arquivos da tarefa, 44 de 44; na suíte inteira, as 3 falhas de tempo sob carga, fora da tarefa, passam ao rodar de novo: 346 de 346)
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real (só DEC `DEC-DEM-20991231-0001-v1` e prefixo `a1b2c3d4` fictícios)
- [x] só mudaram os arquivos da tarefa (`rotulos.ts` e os três novos da lista do plano)
- [x] os textos são os de `03-ux-ui-design.md`, em pt-BR, e o axe não acusa violação nas telas tocadas (nenhuma tela tocada nesta tarefa)
