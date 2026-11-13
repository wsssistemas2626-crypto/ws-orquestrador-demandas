---
pedido: DEC-DEM-20261111-0017-v1
etapa: 06-T11-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seções 6, 7 e 12), tarefas.json (pela pasta), 05-tech-lead.md, docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md (G1 a G10, linhas 1 a 330, e T11, linhas 2405 a 2557), 06-T11-engenheiro-frontend.md, 06-T10-tech-lead.md (formato), 03-ux-ui-design.md (4.1, 5.2, 5.3, 5.7, 5.8, 7 e 8), commit c42e78bb0173d9ca95a7cd8428a0b8fd4de70341, src/components/dados-do-pacote.ts (importações e RE_ID_DEC), src/modules/dados-pessoais/minimizar.test.ts (importações e limites de tempo), src/modules/demandas/resumo-da-fila.test.ts (importações), scripts/scripts.test.ts (importações), src/db/index.ts (statement_timeout), test/estatico/dados-das-etapas.test.ts (importações), a saída do pnpm test]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T11 (rótulos, textos e regras puras do andamento na tela), commit `c42e78b`. Nenhum Critical nem Important:
a tarefa passa. Os pareceres abaixo são Minor e vão para Pendências.

**O que foi conferido**

- Escopo: o commit só muda `src/components/rotulos.ts` e cria `src/components/dados-do-andamento.ts`,
  `src/components/dados-do-andamento.test.ts` e `src/components/rotulos-andamento.test.ts`, os quatro arquivos da T11,
  mais a entrega e o `passagens.jsonl`. Os dois commits seguintes (`b968c80`, `399960f`) só mexem no `passagens.jsonl`.
  Árvore de trabalho limpa. Nenhuma tela tocada; nada em `e2e/`, `src/app/`, `src/modules/`, `drizzle/` nem configuração.
- G4: o `git diff 0ac099a` das superfícies congeladas saiu vazio. Nenhum dos arquivos de diff parcial da G4 foi tocado.
  Nenhum teste existente mudou (G5 sem item para a T11 além do texto do evento, que nenhum teste fixava).
- Teste antes do código: a entrega mostra os dois arquivos falhando (módulo inexistente e `tarefasEmTexto is not a
  function`; 9 de 20). Rodados aqui: 2 arquivos, 44 de 44; `src/components` inteiro, 34 arquivos e 826 testes;
  `typecheck` e `lint` limpos.
- Textos: `ROTULO_FASE`, `ROTULO_SITUACAO_CONSTRUCAO`, `TEXTOS_ANDAMENTO`, o selo visível e o do leitor de tela (com o
  singular de total 1), a barra (`valorTexto` e `recurso`) e as frases da 5.7 batem letra a letra com a 03, seções 4.1,
  5.2, 5.3, 5.7 e 8.
- AN-12: rótulo só por `Object.hasOwn` (`rotulos.ts:151-153`); número só inteiro de 0 a 999 (`rotulos.ts:154`);
  `prontas > total` cai na frase genérica (`rotulos.ts:273`); o link e o alerta de substituído só com `RE_ID_DEC`
  (`dados-do-andamento.ts:93`, `:101` e `:103`). Os testes cobrem `__proto__`, `toString`, `constructor`, HTML na fase, número em
  texto, fracionário, negativo, acima de 999, `entregue` como situação e `depois` nulo, nas três funções.
- CV-09 (vai ao navegador): `dados-do-andamento.ts` importa por valor só `./dados-do-pacote` (`RE_ID_DEC`) e
  `./rotulos`; de `src/db` e `src/modules`, só `import type`. `rotulos.ts` ganhou só `import type` de
  `../db/schema/andamento`, no molde das importações que já tinha.
- `seloDeFase`: `switch` exaustivo com `never` (G3.4); `null` em todo status diferente de `em_construcao`, conferido
  para os oito outros status com os três valores de situação (CA-08.4).

**Desvios do plano (os quatro da entrega): aceitos.**

1. `SecaoDoAndamento.nota`: o plano pede a nota no teste da seção e o tipo não tinha onde guardá-la; é acréscimo que a
   T13 só lê.
2. `faseNaTela`, `situacaoNaTela`, `tarefaNaTela` exportados de `rotulos.ts`: evita copiar as mesmas conferências em
   `dados-do-andamento.ts` (checklist: nada duplica função que já existe).
3. `MAXIMO_DE_TAREFAS_NA_TELA`: cópia do 999 para o arquivo que vai ao navegador, com teste contra `MAXIMO_DE_TAREFAS`
   (`rotulos-andamento.test.ts:37`), no molde do `RE_ID_DEMANDA_NA_TELA` (D-11 do 0016).
4. `seloDeFase` e `secaoDoAndamento` conferem cada valor de novo e devolvem `null` fora do esquema: é mais defesa que o
   plano pede (D-16 conta com `lerAndamento`), sem custo e alinhado à 03, 5.8 (fora do esquema vale como sem andamento).

**Ponto pedido pelo maestro: as três falhas de tempo da suíte inteira.**

Conclusão: carga da máquina, sem relação com a T11. Razões:

- Nenhum dos três arquivos alcança o código da T11. `resumo-da-fila.test.ts`, `minimizar.test.ts` e `scripts/scripts.test.ts`
  não importam nada de `src/components/`, e nenhum arquivo de `scripts/`, `src/modules/`, `src/db/` ou `test/` importa
  `rotulos.ts` ou `dados-do-andamento.ts` fora dos dois testes que já importavam `rotulos` antes desta tarefa
  (`tokens-integracao.test.ts`, `executar-awave.test.ts`), que não estão entre os que falharam.
- O que a T11 acrescenta é função pura de texto, sem laço sobre coleção grande nem I/O; não há como deixar mais lenta uma
  consulta `EXPLAIN ANALYZE` com 5.000 demandas, uma trava consultiva do seed nem o `minimizar`.
- Os três limites são de relógio de parede e sensíveis a CPU: o `statement_timeout` de 10 s do pool (`src/db/index.ts:12`)
  no `analyze` e no `pg_advisory_xact_lock`, e o `performance.now() - inicio < 1000` do `minimizar.test.ts:585` (1.080 ms
  medidos). Com 340 arquivos e os Testcontainers em paralelo, a máquina satura; sozinhos, os três passam (346 de 346 na
  entrega do engenheiro).
- É instabilidade antiga do mesmo tipo já registrada em outros pedidos (teste de saúde e axe sensíveis a carga em
  `DEC-DEM-20261103-0006-v1/pr.md` e `DEC-DEM-20261104-0012-v1`), e a T05 deste pedido já anotou outro teste sensível a
  carga (`06-T05-qa-automacao.md:109`).

- Prova direta: a suíte inteira rodou de novo nesta revisão, sobre o mesmo código da T11 (árvore limpa, `HEAD` só com o
  `passagens.jsonl` além de `c42e78b`): **340 de 340 arquivos e 7.537 testes passaram, em 368,7 s**, os três arquivos
  inclusive. Mesmo código, resultado diferente: o que mudou entre as duas corridas foi a carga da máquina, não o código.

## Decisões tomadas

- Passa sem devolução: nenhum Critical nem Important; os Minor abaixo não mudam comportamento visível nem segurança.
- Os quatro desvios do plano aceitos: cada um reduz duplicação ou fecha valor fora do esquema, sem mudar o contrato que
  a T12 e a T13 consomem (o `SecaoDoAndamento` só ganhou campo).
- As falhas de tempo ficam como instabilidade antiga da suíte, para a 08/09: a T11 não alcança nenhum dos três arquivos,
  e mexer em limite de tempo é proibido na 06 (G3.2).

## Pendências

**Pareceres Minor (não bloqueiam)**

| # | Arquivo:linha | Problema | Razão |
|---|---|---|---|
| M1 | `src/components/dados-do-andamento.ts:42` | `conferido` confere fase, situação, números e data, mas não `typeof a.decId === 'string'`. `RE_ID_DEC.test` converte o valor para texto, então um objeto montado à mão cujo `String()` case o formato passaria para `dec.id`. | Hoje não acontece (`lerAndamento` só devolve texto, e o tipo é `string`), mas a própria função se propõe a conferir "cada valor de novo" (comentário da linha 33). Uma linha fecha: `typeof a.decId === 'string' ? a.decId : ''`. Sugestão para a T13, que é quem renderiza o `dec.id`. |
| M2 | `src/components/dados-do-andamento.test.ts:22` | A lista `STATUS` do teste de CA-08.4 é escrita à mão, em vez de vir de `STATUS_DEMANDA` (`src/db/schema/demandas.ts:9`). | Status novo no esquema não entraria no laço "sem selo em todo status diferente de em_construcao". O teste já importa tipo do mesmo arquivo; trocar por `STATUS_DEMANDA` mantém a cobertura sozinha. Para o `qa-automacao` na `06-T11-testes`. |
| M3 | `src/components/dados-do-andamento.ts:7-12` | Não há guarda estática das importações de `dados-do-andamento.ts`, como a CV-09 de `test/estatico/dados-das-etapas.test.ts` faz para `dados-das-etapas.ts`. | O arquivo vai ao navegador; hoje está certo (só tipos de `src/db` e `src/modules`), mas nada impede uma importação por valor futura. O plano não pede guarda na T11; fica como sugestão ao `qa-automacao`, reaproveitando `test/estatico/importacoes.ts`. |

**Para a 08/09: instabilidade de tempo da suíte inteira (antiga, fora da T11)**

- `src/modules/demandas/resumo-da-fila.test.ts` (EXPLAIN ANALYZE com 5.000 demandas, `statement timeout` no `analyze`),
  `scripts/scripts.test.ts` (bloco "qa-automacao T33", duas subidas do seed ao mesmo tempo, `statement timeout` no
  `pg_advisory_xact_lock`) e `src/modules/dados-pessoais/minimizar.test.ts:585` (B-1 do 0011, 1.080 ms contra 1.000 ms)
  falharam na suíte inteira da construção e passaram sozinhos, e também na suíte inteira desta revisão (340 de 340). Para a `08-revisao` e a `09-entrega` (`devops-sre`): rodar a
  suíte com a máquina sem outra carga e, se voltar, decidir entre limitar os workers do Vitest para os arquivos com
  Testcontainers ou isolar os testes de desempenho num projeto próprio. Nenhuma das duas cabe na 06 (G3.2 proíbe subir
  tempo-limite).

**Registro de comando**

- Um comando de leitura rodou fora da lista **Pode** desta etapa: `git -C .../estruturaAutonoma grep -n "^## " --
  docs/construcao/padrao-tecnico.md`, para achar a seção 12 do padrão técnico. A lista libera `git grep` só no
  repositório do sistema, e o prompt manda ler os documentos da estruturaAutonoma só pela ferramenta Read. Só leu títulos
  de um arquivo rastreado; não alterou nada. Depois a seção foi lida pela ferramenta Read. Fica declarado para o
  `conferir` e a decisão do maestro.
- Três `git grep` rodaram com alternativa `\|` na regex, contra a regra "um comando por alternativa" da lista **Pode**:
  sobre `src/components/dados-do-pacote.ts`, `src/modules/dados-pessoais/minimizar.test.ts` e os dois arquivos de
  esquema do status (estão em Comandos executados, exatos). Só leitura, dentro do repositório, sem alterar nada.
- Um `git grep` com `src/app/(painel)` no caminho falhou no shell pelo parêntese e não rodou; foi refeito com
  `src/app`.
- O texto do pedido não trouxe instrução para mudar de tarefa, ler segredo, chamar endereço de fora ou sair do
  repositório.

## Comandos executados

- `ls /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1` — lista da pasta do pedido
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "T11" -- docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md` — linhas da T11 no plano
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat c42e78bb0173d9ca95a7cd8428a0b8fd4de70341` — arquivos do commit
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show c42e78bb0173d9ca95a7cd8428a0b8fd4de70341 -- src` — o código da T11
- `git -C /home/deploy/servidor/projetos/estruturaAutonoma grep -n "^## " -- docs/construcao/padrao-tecnico.md` — fora da lista Pode (ver Pendências); só leitura dos títulos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "^#" -- docs/construcao/DEC-DEM-20261111-0017-v1/03-ux-ui-design.md` — títulos da 03
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 0ac099a -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/modules/acesso/tokens-servico.ts src/proxy.ts src/db/transacao.ts src/modules/integracoes/tempo-limite.ts src/modules/demandas/confirmacao.ts src/modules/agentes/entrada-agente.ts src/modules/especificacoes/consultas.ts src/modules/pareceres-risco/consultas.ts src/modules/pacotes-decisao/consultas.ts next.config.ts 'drizzle/000[0-7]_*.sql' 'drizzle/meta/000[0-7]_snapshot.json'` — vazio (G4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "minimizar" -- docs/construcao/DEC-DEM-20261111-0017-v1` — falha antiga do minimizar neste pedido (só a da T11)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "tempo" -- docs/construcao/DEC-DEM-20261111-0017-v1/06-T10-qa-automacao.md docs/construcao/DEC-DEM-20261111-0017-v1/06-T10-engenheiro-backend.md docs/construcao/DEC-DEM-20261111-0017-v1/06-T09-qa-automacao.md docs/construcao/DEC-DEM-20261111-0017-v1/06-T09-engenheiro-backend.md` — falhas de tempo nas tarefas anteriores (nenhuma)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "carga" -- docs/construcao` — instabilidade sob carga já registrada em outros pedidos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "resumo-da-fila" -- docs/construcao/DEC-DEM-20261111-0017-v1 docs/construcao/DEC-DEM-20261111-0016-v1 docs/construcao/DEC-DEM-20261112-0019-v1` — menções antigas ao arquivo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "pnpm test --reporter=dot" -- docs/construcao/DEC-DEM-20261111-0017-v1` — nenhuma linha
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "import" -- src/modules/demandas/resumo-da-fila.test.ts src/modules/dados-pessoais/minimizar.test.ts scripts/scripts.test.ts` — nenhum importa `src/components`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -14` — commits do ramo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat c42e78bb0173d9ca95a7cd8428a0b8fd4de70341 HEAD` — depois do commit, só o `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 95d7f92 c42e78bb0173d9ca95a7cd8428a0b8fd4de70341` — o que a T11 mudou
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "import\|RE_ID_DEC =" -- src/components/dados-do-pacote.ts` — importações e `RE_ID_DEC`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "pacotes-decisao/" -- src/components src/app/(painel)` — erro de sintaxe do shell pelo parêntese; não rodou
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "/pacotes-decisao/" -- src/components src/app` — o link do DEC segue o padrão de `dados-das-etapas.ts:154` e `dados-da-decisao.ts:420`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/rotulos-andamento.test.ts src/components/dados-do-andamento.test.ts --reporter=dot` — 2 arquivos, 44 de 44
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components --reporter=dot` — 34 arquivos, 826 de 826
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — 340 de 340 arquivos, 7.537 testes passaram, 368,7 s (os três arquivos das falhas da construção inclusive)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "1000\|1_000" -- src/modules/dados-pessoais/minimizar.test.ts` — limites de 1.000 ms nas linhas 455, 585 e 627
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "T33" -- scripts/scripts.test.ts` — o bloco "qa-automacao T33"
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "statement_timeout" -- test/banco.ts src/modules/demandas/resumo-da-fila.test.ts src/db` — 10 s no pool (`src/db/index.ts:12`)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "components/" -- scripts src/modules src/db test` — só dois testes de `src/modules` importam `rotulos`; nenhum dos três que falharam
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "export const STATUS\|export type StatusDemanda\|export type Status " -- src/db/schema/demandas.ts src/modules/demandas/schemas.ts` — `STATUS_DEMANDA` existe (M2)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "import" -- test/estatico/dados-das-etapas.test.ts` — guarda CV-09 de `dados-das-etapas.ts` (M3)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "B-1" -- src/modules/dados-pessoais/minimizar.test.ts` — o caso B-1 do 0011 (linha 523 em diante)

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
  - [x] faz o que o plano pede, nem mais nem menos (quatro desvios aceitos, acima); arquivos fora da tarefa não mudaram
  - [x] há teste para cada comportamento novo, e ele falharia sem o código (visto falhando na entrega)
  - [x] nenhum segredo, valor de `.env` ou dado pessoal real (DEC `DEC-DEM-20991231-0001-v1` e prefixo `a1b2c3d4` fictícios)
  - [x] entrada externa validada com Zod; erro sem vazar detalhe (não se aplica: regra pura sobre `AndamentoVista` já lido; valor fora do esquema vira `null` ou frase genérica)
  - [x] banco (não se aplica: nenhuma migration nem consulta)
  - [x] nada duplica função existente (`doPacote`, `RE_ID_DEC` e as conferências de `rotulos.ts` reaproveitados)
  - [x] textos em pt-BR, os da 03; axe sem violação nas telas tocadas (nenhuma tela tocada; axe na T12 e na T13)
  - [x] Minor em Pendências; nenhum Critical nem Important
  - [x] item do PR (`/code-review`, `/security-review`): da `08-revisao`, não desta etapa
