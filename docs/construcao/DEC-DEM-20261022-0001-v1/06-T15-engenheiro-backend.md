---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T15-construcao
agente: engenheiro-backend
leu: [contrato-passagem.md, pedido.json, padrao-tecnico.md, tarefas.json, 05-tech-lead.md, 06-T14-engenheiro-backend.md, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6 e mapa das fases e T14 a T22 e T28 e T29), 01-analista-requisitos.md (RF-01 a RF-08 e RF-22 a RF-26 e RNF-01 a RNF-09), 03-ux-ui-design.md (seções 1 e 2 e T03 a T07), 04-seguranca-aplicacao.md (seções 1 a 4), src/db/index.ts, src/db/transacao.ts, src/db/privilegios.ts, src/db/schema/index.ts, src/db/schema/comum.ts, src/db/schema/demandas.ts, src/db/schema/versoes.ts, src/db/schema/decisao.ts, src/db/schema/historico.ts, src/db/schema/operacao.ts, src/db/schema/acesso.ts, src/lib/deps.ts, src/lib/erros.ts, src/lib/relogio.ts, src/lib/rota.ts, src/modules/acesso/ator.ts, src/modules/acesso/matriz.ts, src/modules/acesso/mensagens.ts, src/modules/historico/registrar.ts, src/modules/historico/consultas.ts, src/modules/historico/consultas.test.ts, src/modules/demandas/gerar-id.ts, src/modules/versoes.ts, src/modules/versoes.test.ts, test/banco.ts, test/deps.ts, test/estatico/relogio.test.ts, vitest.config.ts, tsconfig.json]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T15: serviço de demanda (criar, alterar, consultar e transições de status). Cobre:

- RF-03;
- RF-06 (CA-06.1, CA-06.3 e CA-06.4; o CA-06.2 pelo schema);
- RF-07 (CA-07.1 a CA-07.5, as transições manuais e as automáticas);
- C-11, C-18 (anexo só `http:` ou `https:`, até 2.048 caracteres), C-30 aplicado e C-36 (30 demandas e 60 artefatos
  por hora);
- RNF-04.

### Arquivos

São os 11 arquivos que o plano lista, todos novos. Nenhum arquivo que já existia mudou.

- `src/modules/demandas/schemas.ts`. Tem:
  - `TIPOS`, `STATUS`, `PAPEIS_SOLICITANTE`, `LINHAS` e `URGENCIAS`, reexportados do esquema do banco (fonte única);
  - `textoLivre` e `listaDeTextos`;
  - `anexoSchema`, `criarDemandaSchema`, `alterarDemandaSchema` e `filtroDemandasSchema`;
  - os tipos `Tipo`, `Status`, `CriarDemanda`, `AlterarDemanda` e `FiltroDemandas`.
- `src/modules/demandas/transicoes.ts`. Tem:
  - `transicoesManuaisDe`, sobre uma tabela congelada (RF-07);
  - `conferirTransicaoManual`, com os motivos da 03 (T05);
  - `TransicaoAutomatica` e `mudarStatusPeloSistema`, com as origens do plano. Fora da origem não muda nada nem grava
    evento. O evento sai com ator `sistema`.
- `src/modules/demandas/servico.ts`:
  - `criarDemanda`: `autorizar`, depois `conferirLimite`, depois `proximoIdDemanda`, depois o insert com a autoria do
    ator, depois o evento `demanda_criada` só com `status` e `tipo`.
  - `alterarDemanda`: `autorizar` e `travarDemanda`. Compara campo a campo, com comparação profunda nos anexos. Confere
    a transição antes de gravar qualquer coisa. Grava um evento `campo_alterado` por campo, com `mudancaDeCampo`, e
    `status_alterado` quando o status muda. "Nada foi alterado." sai como `entrada_invalida`.
- `src/modules/demandas/consultas.ts`:
  - `obterDemanda` devolve a `DemandaVista`, sem `texto` nem `origem`: a consulta nunca toca `entrada_bruta`. Traz
    `responsavel` e as listas de ESP, RSK e DEC, com `autor` e `rascunhoAgente`. No DEC vêm também `statusDecisao`
    (derivado de `decisao`; sem linha é `pendente`) e `desatualizado`.
  - `listarDemandas` filtra por status, tipo e linha, ordena da mais nova para a mais antiga e devolve
    `{ itens, total, limit, offset }`.
- `src/modules/limites.ts`: `conferirLimite`, `LIMITE_POR_HORA` e `MENSAGEM_LIMITE`. A janela é a última hora, pela
  autoria gravada. Há uma trava consultiva por ator e por tipo, que dura até o fim da transação.
- `src/modules/pacotes-decisao/desatualizado.ts`: `expressaoDesatualizado()`, uma subconsulta correlacionada sobre
  `(demanda_id, versao)`, e `temPacoteAprovadoAtualizado`.
- Testes: `transicoes.test.ts` (16 testes, unitários), `schemas.test.ts` (19, unitários), `servico.test.ts` (36, de
  integração), `consultas.test.ts` (13, de integração) e `limites.test.ts` (11, de integração). Os de integração
  usam Postgres real (Testcontainers) com o papel do app.

### Testes criados (o que cobrem)

- **Schemas:**
  - CA-03.3: os campos `tipo` e `titulo`, e o erro mapeado sem o valor recebido.
  - C-11: autoria, `status` e `id` do corpo são descartados.
  - C-18: `javascript:`, `data:`, `file:`, `ftp:`, `vbscript:` e texto sem esquema são recusados. `http` e `https` são
    aceitos. O limite de 2.048 vale.
  - RNF-04: os limites de 10.000 caracteres, 50 itens e 200 no nome.
  - `null` limpa um campo opcional na alteração.
  - CA-06.2 e os outros valores inválidos de `limit`, `offset` e filtro, inclusive a chave repetida.
- **Serviço:**
  - CA-03.1, com o evento e a data do relógio.
  - C-11 por token do orquestrador. Uma chave a mais passada pelo chamador também não chega ao banco.
  - Agente que não é o orquestrador e o ator sistema recebem `sem_permissao`, sem gravar nada e sem andar a sequência.
  - A transação do chamador é desfeita junto, na criação e na alteração.
  - C-36:
    - a 31ª demanda na hora recebe 429 e não gasta número da sequência;
    - outro ator passa;
    - na hora seguinte, passa;
    - 35 criações simultâneas dão exatamente 30 gravadas e 5 com 429.
  - CA-06.4: antes, depois, pessoa e data.
  - C-30: sentinela em sete campos de texto e nenhum evento com o sentinela.
  - Um evento por campo que mudou. Nada alterado responde "Nada foi alterado.".
  - CA-07.1:
    - sem DEC, com DEC pendente e com DEC devolvido, a mudança é recusada;
    - DEC aprovado e atualizado passa;
    - DEC aprovado com ESP v2 ou RSK v2 é recusado;
    - DEC aprovado de outra demanda não vale.
  - CA-07.2, inclusive mudando o tipo para estudo na mesma chamada. Uma recusa desfaz a chamada inteira.
  - CA-07.3 no histórico. CA-07.5. CA-07.4 na regra: agente e sistema recebem `sem_permissao`.
  - Duas alterações simultâneas na mesma demanda gravam as duas.
  - `mudarStatusPeloSistema`: os 4 motivos × os 9 status, mudando só na origem permitida. Roda na transação de quem
    chama. Id inexistente dá `nao_encontrado`. O histórico mostra o ator sistema.
- **Consultas:**
  - CA-06.1: filtros combinados, ordem, `limit` e `offset`, `offset` além do fim e desempate pelo id.
  - O item da fila não tem solicitante, texto livre, anexos nem autor.
  - CA-06.3.
  - A vista não tem texto nem origem: o sentinela do texto bruto não aparece.
  - A vista completa em camelCase, com o responsável pessoa, o agente e a conta inexistente.
  - As listas de versões com autor, rascunho, `statusDecisao` e `desatualizado`, por ESP e por RSK nova.
  - As versões de outra demanda não entram.
- **Limites:**
  - De 29 para 30 demandas e de 59 para 60 artefatos, somando ESP, RSK e DEC.
  - A borda da janela de uma hora.
  - A contagem é por ator, e o agente conta pelo nome, com qualquer prefixo de token.
  - O ator sistema não conta. A mensagem não cita o ator.
  - A trava segura o mesmo ator até o fim da transação, confirmado em `pg_stat_activity`. Outro ator não espera.

Os testes de concorrência não dependem do relógio real: a ordem vem de promessas e da espera de trava vista em
`pg_stat_activity`.

### TDD: teste antes, visto falhando

Os cinco arquivos de teste foram escritos antes do código. O `pnpm test` falhou porque os módulos não existiam:

```
 FAIL  src/modules/limites.test.ts [ src/modules/limites.test.ts ]
Error: Cannot find module './limites' imported from .../src/modules/limites.test.ts
 FAIL  src/modules/demandas/consultas.test.ts [ src/modules/demandas/consultas.test.ts ]
Error: Cannot find module './consultas' imported from .../src/modules/demandas/consultas.test.ts
 FAIL  src/modules/demandas/schemas.test.ts [ src/modules/demandas/schemas.test.ts ]
Error: Cannot find module './schemas' imported from .../src/modules/demandas/schemas.test.ts
 FAIL  src/modules/demandas/servico.test.ts [ src/modules/demandas/servico.test.ts ]
Error: Cannot find module '../limites' imported from .../src/modules/demandas/servico.test.ts
 FAIL  src/modules/demandas/transicoes.test.ts [ src/modules/demandas/transicoes.test.ts ]
Error: Cannot find module './schemas' imported from .../src/modules/demandas/transicoes.test.ts
 Test Files  5 failed | 74 passed (79)
      Tests  1202 passed (1202)
```

Na primeira rodada depois do código, falhou 1 de 1297. O erro era do próprio teste "a mensagem não cita o ator": a
regex pegava a palavra "risco" em "pareceres de risco", que é o nome do artefato. O teste passou a procurar só id de
conta, de agente e de token. O código não mudou.

Resultado final: `Test Files 79 passed (79)` e `Tests 1297 passed (1297)`. São 95 testes novos e 0 falhas. A suíte
rodou verde duas vezes seguidas.

### Desvios do plano

1. **As dependências do serviço são `Pick<Deps, ...>`, e não `Deps` inteiro.** `criarDemanda` e `alterarDemanda`
   recebem `DepsDemanda = Pick<Deps, 'db' | 'pool' | 'relogio'>`. `mudarStatusPeloSistema` recebe
   `Pick<Deps, 'relogio'>`. Quem passa `Deps` continua servindo, então a assinatura só fica mais larga. Assim, a T28
   (`gravarSaidaOrquestrador` com `DepsAgente`) e os testes chamam o serviço sem Better Auth e sem fila.
2. **`alterarDemandaSchema` aceita `null` nos campos opcionais da demanda**, para limpar um valor. São eles
   `solicitantePapel`, `linhaServicoProvavel`, `urgencia` e os quatro textos livres. O plano diz só "campos de
   criarDemandaSchema opcionais + status". Sem o `null`, a T06 não teria como apagar um contexto ou uma urgência. Os
   três obrigatórios, `anexos` e `status` recusam `null`.
3. **`DemandaVista` não traz `autorTipo` nem `autorId`.** O `responsavel` substitui os dois: pessoa pelo nome da conta,
   agente pelo nome do agente. Assim, o id interno da conta não vai para agente nem para o painel, como no histórico da
   T12. As listas de ESP, RSK e DEC vêm da versão mais nova para a mais antiga, como a fila e o histórico. O plano não
   fixava a ordem.
4. **`criarDemanda` grava campo a campo, e não com `...entrada`.** Uma chave a mais que um chamador TypeScript passe
   (como `modo`, `texto` ou `origem` da T17) não chega ao insert. Há teste disso.
5. **Trava consultiva em `conferirLimite`** (`pg_advisory_xact_lock(hashtextextended('limite:<tipo>:<autor>', 0))`).
   O plano não pede a trava. Sem ela, criações simultâneas do mesmo ator passariam de 30 por corrida. O teste das 35
   simultâneas prova o limite exato.
6. **Arquivos de teste:** `desatualizado.ts` não tem arquivo de teste próprio, porque o plano não lista um. Ele é
   coberto por `servico.test.ts` (CA-07.1 com DEC aprovado, desatualizado e de outra demanda) e por
   `consultas.test.ts` (`desatualizado` por ESP e por RSK nova). Há também testes além dos do plano, listados acima.

## Decisões tomadas

- **Janela móvel de uma hora**, contando `criada_em > agora − 1 h`. É mais segura que a hora do relógio, porque não
  permite 60 criações em dois minutos na virada da hora. O teste do plano ("outra hora, passa") vale do mesmo jeito.
- **O limite conta pela autoria gravada.** O agente conta pelo nome, sem o token. Assim, todos os tokens do mesmo
  agente dividem os mesmos 30 ou 60. O ator sistema não é contado: `autorizar` já o nega.
- **Mensagens de 429**, que a 03 não traz:
  - "Limite de 30 demandas por hora atingido. Tente de novo mais tarde.";
  - para os artefatos, o equivalente com 60 versões, citando especificações, pareceres e pacotes somados.
  - Nenhuma das duas cita o ator.
- **Motivo genérico para transição fora da tabela:** "esta mudança de status não é permitida a partir do status
  atual.". A 03 só traz os motivos de aprovada, estudo e status final. A tela só oferece as transições permitidas,
  então esse motivo aparece só pela API.
- **A regra do estudo usa o tipo que resulta da chamada.** Mudar `tipo` para estudo e status para `em_construcao` na
  mesma chamada é recusado. A regra vale também a partir de `devolvida`.
- **A recusa de status desfaz a chamada inteira.** Tudo é conferido antes do primeiro `UPDATE`. Uma recusa não deixa
  campo alterado, nem quando a transação é do chamador.
- **`criarDemanda` com `duvidasEntrada` não muda o status.** O plano da T28 diz que `gravarSaidaOrquestrador` chama
  `mudarStatusPeloSistema('duvida_em_aberto')`. A demanda nasce `nova`, e quem chama faz a transição.
- **`temPacoteAprovadoAtualizado` olha só a `decisao` com status `aprovada`**. Pela T21, essa linha só existe quando a
  aprovação está completa. A aprovação parcial (CA-14.1) não conta.
- **Autor de agente fora da lista de agentes vira erro 500, sem detalhe.** Só acontece com linha corrompida, porque a
  autoria vem sempre de um ator resolvido. O erro não vira `pessoa` nem `sistema` por engano.
- **`offset` vai até 1.000.000**, só para recusar valor absurdo. O plano não dava teto.
- **`mudarStatusPeloSistema` fica em `transicoes.ts`** e trava a demanda de novo. Na mesma transação, a trava não
  espera. Assim a função serve também a quem não travou antes.

## Pendências

- **T16:** `alterarDemanda` recebe `AtorPessoa`, como no plano, e `rota()` entrega um `Ator`. A rota precisa estreitar
  o tipo (a matriz já garante que é pessoa) antes de chamar o serviço. A rota e o serviço chamam `autorizar` os dois.
  Isso é redundante e inofensivo.
- **T18 a T20:** chamar `conferirLimite(tx, ator, 'artefato', ...)` dentro da transação, **depois** de `travarDemanda`,
  como o plano já ordena. Fora de transação, a trava consultiva não segura nada. Se alguém travar a demanda depois da
  trava do limite, numa transação que cria artefatos de duas demandas, abre a chance de deadlock. Nenhuma tarefa do
  plano faz isso.
- **T20:** `expressaoDesatualizado()` se correlaciona com `pacote_decisao` sem alias. Uma consulta que der alias à
  tabela precisa de outra forma da expressão.
- **UX ou revisão:** os dois textos de 429 e o motivo genérico de transição não estão na 03. Se o `ux-ui-design` quiser
  outro texto, a troca é de uma linha (`MENSAGEM_LIMITE`, `MOTIVOS_TRANSICAO`).
- **T28:** depois de `criarDemanda(..., { duvidasEntrada })`, chamar `mudarStatusPeloSistema(t, deps, id,
  'duvida_em_aberto')` na mesma transação.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --stat --format=%h%x20%s -40` — arquivos dos últimos 40 commits, para achar o código das T04 a T14
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --stat -1 --format=%h%x20%s bc88cf2 -- src/db/schema/acesso.ts` — confirmou o caminho do esquema de acesso
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — antes do código: 5 arquivos falharam (`Cannot find module`), 1202 de 1202 testes dos outros 74 arquivos passaram
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 1296 de 1297; 1 falha no próprio teste (regex da mensagem), corrigida
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 79 de 79 arquivos, 1297 de 1297 testes, 0 falhas
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — 0 erros, 1 aviso (constante sem uso em `limites.test.ts`, removida)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — segunda rodada, para ver se a concorrência é estável: 79 de 79 arquivos, 1297 de 1297 testes, 0 falhas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — só arquivos novos: os 10 de `src/modules/demandas/` e `src/modules/limites*`, e `src/modules/pacotes-decisao/`

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno (a T15 não cria rota, Server Action nem job; entrega os schemas Zod que a T16 e a T17 usam, e os erros de domínio saem só com mensagem pt-BR, sem dado da demanda nem do ator)
