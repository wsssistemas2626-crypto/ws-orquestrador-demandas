---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T34-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12 e o resto), 2026-10-25-ws-orquestrador-demandas-plano.md (T34, T35, fase 7 e T36 a T46, rastreabilidade), 04-seguranca-aplicacao.md (início), 06-T34-engenheiro-backend.md, 06-T33-tech-lead.md, commit b26796f (git show --stat), test/transversal/sentinelas.test.ts, test/sentinelas.ts, test/requisicao.ts, src/lib/log.ts, src/lib/log.test.ts, src/lib/sentry.ts, src/lib/rota.ts, src/lib/fila.ts, vitest.config.ts, saída do pnpm test gravada pela ferramenta nesta etapa (fim)]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T34 (teste transversal de sentinelas), `engenheiro-backend`, 1ª tentativa, commit `b26796f`. Não há problema
Critical nem Important, e a tarefa entra. Os quatro pontos abaixo são Minor e ficam em Pendências.

### O que foi conferido

- **Escopo.** O commit cria só `test/transversal/sentinelas.test.ts`, o único arquivo do plano, além da entrega e do
  `passagens.jsonl`. Nenhum arquivo de `src/` mudou, porque o teste não achou vazamento (passo 3 do plano). A árvore
  está limpa.
- **O que o plano pede, item a item.**
  - Captura pelo `substituirDestinoDoLog` e pelo `iniciarSentry` com transporte falso: linhas 200 e 204.
  - Entrada pelo orquestrador ligado com texto, nome, e-mail, telefone, token e senha sentinelas, e saída do provedor
    falso com `SENTINELAS.texto` em `descricaoProblema`: linhas 235 a 251.
  - ESP, RSK e DEC por agente (job do worker e `Bearer` do `insumo_tecnico`) e por pessoa, aprovação e pedido, com o
    422 do C-28 quando a ESP tem e-mail: linhas 253 a 287.
  - Erros: 400 de validação (inclusive chave desconhecida e link `javascript:`), 409 de transição, violação de CHECK
    pelo migrator (`not valid`, apagada no `finally`), saída de agente fora do schema, Resend falhando no erro de rede
    e no corpo, login errado com e-mail e senha sentinelas. O teste soma corpo que não é JSON, token inexistente e erro
    do provedor com linha `    at <sentinela>` na mensagem, que exercita o corte de cabeçalho de `quadrosDaPilha`.
  - Leitura de todas as tabelas do esquema `pgboss` pelo catálogo (`relkind` `r` e `p`) e de `execucao_agente`, pelo
    migrator.
  - As quatro asserções do plano, mais a do console.
- **O teste prova algo.** Antes das asserções de sentinela, ele confere que cada saída foi exercitada: os sete eventos
  no log, 5 chamadas ao provedor, os envelopes do Sentry com `23514` e `ErroEnvioEmail`, o `aviso_nao_enviado` guardado
  pelo pg-boss no job e as quatro execuções com o status esperado. Sem isso, uma captura vazia passaria.
- **TDD (passo 2 do plano).** O teste passou de primeira contra o código, e a entrega mostra as duas linhas temporárias
  que o plano pede: com `erro: new Error(SENTINELAS.email)` o teste passa (o erro é reduzido); com o objeto simples em
  `erro` ele falha na asserção do pino, com o trecho da saída. A linha foi removida, e o arquivo do commit não a tem.
- **Desvios da entrega.** Aceitos os sete:
  - tratar os jobs de agente por `tratarAgenteExecutar`, com o job que o pg-boss gravou, é o mesmo caminho do worker
    (mesmo `PAYLOADS`, mesmo `executarAgente`). Com relógio fixo (RNF-15), o worker sozinho não alcançaria a 2ª
    tentativa;
  - o aviso pelo `boss.work` real na 1ª tentativa e pelo handler na 2ª e na 3ª faz o pg-boss guardar o erro relançado
    no job, sem esperar o `retryDelay` de 60 s;
  - console capturado, chave e destinatário do Resend como sentinelas e os erros a mais só ampliam a cobertura;
  - login errado por `postAuth` em `deps.auth.handler`: a rota `[...all]` só repassa para ele.
- **Isolamento.** A constraint temporária e o `configuracao_agente` alterado ficam no banco próprio do arquivo
  (`novoBanco()`), e o Vitest roda cada arquivo isolado, com o Sentry global só nesse processo.
- **Reuso.** O teste usa `SENTINELAS` e `contemSentinela`, `chamarRota`, `criarPessoa`, `postAuth`, `criarDepsDeTeste`,
  `ProvedorFalso`, `criarTokenServico`, `criarFila`, `PROMPTS[...].exemploSaida` e `relogioFixo`. Não recria nenhum
  ajudante de `test/`. O `chamar` da linha 77 só reordena os argumentos de `chamarRota`.
- **Dados.** Só os sentinelas de `test/sentinelas.ts`, `@ficticio.test` e o DSN `sentry.exemplo.test`. Nenhum segredo
  nem valor de `.env`. Nada sai da máquina (RNF-14): provedor falso, `fetch` falso e transporte falso.
- **Verificação nesta etapa.**
  - `pnpm test`: 140 arquivos, 2756 de 2756.
  - `pnpm lint` e `pnpm typecheck`: limpos.

### Pareceres (todos Minor)

1. **`test/transversal/sentinelas.test.ts:101`. O job da execução é escolhido por `order by singleton_key desc`.**
   - Problema: a `singletonKey` é por tentativa (`src/lib/fila.ts:36`), e a ordem é de texto. Se a chave passar de
     `...:9` para `...:10`, ou mudar de formato, o `limit 1` pega o job antigo, já tratado, e o handler o trata como
     `ja_tratada`.
   - Razão: hoje há no máximo duas tentativas no teste, e ele passa. Mas o ajudante depende de um detalhe de formato da
     chave que não é dele.
   - Caminho: ordenar pelo instante de criação do job (`order by created_on desc`) ou filtrar por `state = 'created'`.
2. **`test/transversal/sentinelas.test.ts:378-382`. O comentário diz que o erro do provedor chegou ao Sentry, mas
   nenhuma asserção prende esse envelope.**
   - Problema: as asserções são `>= 3` envelopes, `23514` e `ErroEnvioEmail`. Se o caminho `falha_agente` deixasse de
     chamar `capturarErro`, o total ainda poderia chegar a 3 por outra origem, e o teste ficaria verde.
   - Razão: o erro do provedor é justamente o caso com sentinela na mensagem e na falsa linha de pilha. Sem prender o
     envelope, o teste não garante que esse caso passou pelo `limparEvento` e pelo `quadrosDaPilha`.
   - Caminho: conferir a tag `evento` que o caminho do agente manda ao `capturarErro`, ou contar os envelopes por
     origem (rota, agente, aviso).
3. **`src/lib/log.ts:54`. Objeto simples em `erro` passa só sob o `redact` de um nível.** É a observação da entrega,
   confirmada.
   - Problema: o `redact` usa `*.<chave>`, que só cobre o primeiro nível dentro do campo. Uma chave fora da lista
     (`mensagem`, `detalhe`) ou um objeto aninhado em `erro` sai inteiro. O passo 2 da entrega provou isso.
   - Razão: nenhum ponto de `src/` faz isso hoje, e o teste transversal passa. O comportamento é o contrato da T02,
     fixado em `src/lib/log.test.ts:57-61` e `:89-111`. Mudá-lo quebra esses casos e não cabe numa tarefa que só cria o
     teste. Por isso é Minor, e não vazamento a corrigir no passo 3.
   - Caminho: na `08-revisao`, com o parecer do `seguranca-aplicacao`, decidir se `erro` que não é `Error` passa a sair
     como `{ classe: 'desconhecido' }` (ou só com `classe` e `code`, por lista de permissão). Se sim, os casos de
     `log.test.ts` mudam junto, para testar que a chave some, e não que vira `[removido]`.
4. **Carregado da T32 e da T33: o comentário de `test/auth.ts:1-2` e `:24` (parecer 1 da `06-T32-revisao`).**
   - Problema: segue aberto, e o comentário deve citar também o seed, que grava pelo `gravarConta`.
   - Razão: a T34 só cria `test/transversal/sentinelas.test.ts`. A entrega fez certo em não tocar `test/auth.ts`, e
     nenhuma tarefa de backend que resta no plano mexe nele.
   - Caminho: passa para a `08-revisao`, como correção de comentário, sem efeito em comportamento.

### Checklist da seção 12 do padrão técnico

- [x] A tarefa faz o que o plano pede, nem mais nem menos. Só o arquivo do plano mudou, e nenhum arquivo de `src/`.
- [x] Há teste para cada comportamento novo, e ele falharia sem o código. A tarefa não tem código novo; o teste prova o
      controle e foi visto falhando com o vazamento provocado (passo 2 do plano). Ficam como Minor os pareceres 1 e 2.
- [x] Nenhum segredo, valor de `.env` ou dado pessoal real em código, teste, log ou fixture. Só sentinelas fictícios,
      `@ficticio.test` e o DSN `sentry.exemplo.test`.
- [x] Entrada externa validada com Zod, e o erro não vaza detalhe. A tarefa não cria entrada. O teste exercita o Zod das
      rotas e dos payloads da fila e confere que 400, 409, 500 e o erro do Resend não levam sentinela às saídas.
- [x] Banco: não há migration. A constraint de CHECK é temporária, no banco do arquivo, pelo migrator, e apagada no
      `finally`. Não há `tenant_id`.
- [x] Nada duplica função que já existe no repositório.
- [x] Textos de interface em pt-BR. Não há tela tocada nem axe a rodar.
- [x] O que é Minor foi para Pendências. Não há Critical nem Important.
- [x] Revisão do PR: não se aplica a esta etapa. Fica com a `08-revisao`.

## Decisões tomadas

- **A tarefa passa sem devolução.** Razão: não há Critical nem Important. Os pontos são de robustez do ajudante, de
  força de uma asserção e de dois itens que a própria T34 não pode mudar sem sair dos arquivos dela.
- **A observação sobre `erro` objeto não é vazamento a corrigir no passo 3.** Razão: o passo 3 pede corrigir vazamento
  achado no código, e nenhum ponto de `src/` passa objeto simples em `erro`. Endurecer muda o contrato da T02 e os
  testes dela, e é decisão da `08-revisao` com o `seguranca-aplicacao`.
- **Aceito tratar os jobs de agente pelo handler, com o job gravado pelo pg-boss.** Razão: é o mesmo caminho do worker,
  e o relógio fixo exigido pelo RNF-15 impede o worker sozinho de chegar à 2ª tentativa.
- **O comentário de `test/auth.ts` vai para a `08-revisao`.** Razão: nenhuma tarefa de backend que resta no plano toca
  esse arquivo.

## Pendências

- Para a `06-T34-testes` (`qa-automacao`): os pareceres 1 (ordem do job por instante de criação) e 2 (prender o
  envelope do Sentry do erro do provedor), ambos no próprio `test/transversal/sentinelas.test.ts`.
- Para a `08-revisao` (maestro), com parecer do `seguranca-aplicacao`: o parecer 3 (`erro` objeto em
  `src/lib/log.ts:54`) e o parecer 4 (comentário de `test/auth.ts`).
- Para a T35 (`engenheiro-dados-bd`): este arquivo leva cerca de 15 s e não muda dado de outro arquivo.
- Leitura do arquivo de saída da ferramenta: li o fim da saída do `pnpm test` que a ferramenta gravou nesta etapa, para
  ver o total. É o mesmo procedimento das revisões anteriores.
- Seguem abertos, sem mudança: os Minor das revisões anteriores e o aviso do undici "Using `patch`".

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat b26796f456b04e0911ca40f5e6c4713246f29134` — 3 arquivos, +603: `test/transversal/sentinelas.test.ts`, a entrega e o `passagens.jsonl`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent=true --reporter=dot` — 140 arquivos, 2756 de 2756
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
