---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T08-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12), docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (G1 a G8, T07 passo 4, T08), 06-T08-engenheiro-backend.md, 06-T06-tech-lead.md (parecer 2 e Pendências), src/modules/demandas/confirmacao.ts, src/modules/demandas/confirmar.ts, src/modules/demandas/servico.ts (linhas 150 a 239), src/modules/agentes/gatilhos.ts (diff), src/modules/agentes/executar.ts (linhas 150 a 258), src/app/(painel)/demandas/[id]/acoes.ts (diff), src/components/rotulos.ts (diff), src/modules/versoes.ts, src/db/transacao.ts, src/modules/especificacoes/servico.ts, src/modules/demandas/confirmar.test.ts, src/modules/agentes/gatilhos-awave.test.ts, src/modules/agentes/executar-awave.test.ts, src/app/(painel)/demandas/[id]/acoes-confirmar.test.ts]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T08 ("Confirmação da demanda do Awave e nenhum agente de IA antes dela (IN-06, IN-07)"), engenheiro
`engenheiro-backend`, risco alto. O commit informado (d4a7a20) e o anterior (4e84920) só regravam a entrega e
`passagens.jsonl` (`git diff --stat 9ce66b2 d4a7a20`: 2 arquivos, ambos na pasta do pedido). O código está em 9ce66b2, e a
revisão cobriu o diff inteiro da construção, `e82f615..9ce66b2` (13 arquivos: 11 de código e teste, a entrega e
`passagens.jsonl`).

**Resultado: aprovada, sem Critical nem Important.** O desvio 1 (`servico.ts`) foi aceito. Os pareceres abaixo são
Minor e vão para Pendências.

### Checklist da seção 12 do padrão técnico

| Item | Situação |
|---|---|
| Faz o que o plano pede, nem mais nem menos; arquivos fora da tarefa não mudaram | Cumprido, com o desvio 1 aceito (ver Decisões tomadas). Os 6 arquivos a criar e os 4 a modificar são os da seção "Arquivos" da T08; o 11º é `src/modules/demandas/servico.ts`, uma expressão, pela Pendência da 06-T06-revisao. O código segue o passo 3 do plano quase literalmente: `confirmacao.ts` igual ao do plano; `confirmar.ts` com a ordem do D-08 sob `travarDemanda` (outra origem → 409; já confirmada → `{ jaConfirmada: true }`; status final → 409), evento antes do disparo na mesma transação e `t?: Transacao` (G3.6); guarda na primeira linha de `dispararSeLigado` (G8 #25); passo 3c logo depois do M-02 e antes de `montarEntrada` (D-07, G8 #26); Server Action em `acoes.ts`, que já existia (G4), com `z.strictObject` e a regex do id. `entrada-agente.ts` não mudou (D-15, G8 #27). G8 #23 e #24: `switch` com `never` em `aguardaConfirmacao` (desconhecido → `true`, falha fechada) e `ehDoAwave`. G4 vazio contra a9fd9b8, inclusive `src/lib/rota.ts`. IN-16: nenhum teste da lista do D-17 nem o `piso-de-assercoes.test.ts` mudou; `gatilhos.test.ts`, `gatilhos.bordas.test.ts`, `executar.test.ts`, `executar.bordas.test.ts`, `criacao-awave.test.ts` e `test/estatico/exigir-pessoa.test.ts` também não |
| Teste para cada comportamento novo, e ele falharia sem o código | Cumprido. 40 testes em 4 arquivos, um ou mais por critério (CA-06.1 a CA-06.6, IN-06 no gatilho e no worker, IN-07, D-08, D-18, C-11, C-17, C-21, C-34, P-01). A entrega mostra a rodada 1 (módulo inexistente) e a rodada 2 com só os dois módulos novos, em que as guardas do gatilho e do worker falham de fato (`expected 'concluida' to be 'ignorada'`); os 24 que passaram na rodada 2 são os de `confirmar.test.ts` (o módulo já existia ali) e regressões declaradas, aceitável pelo G3.1. A concorrência do IN-07 é provada com `Promise.all` e o resultado `[false, true]`, não só pela contagem. Ressalva Minor: parecer 1 |
| Nenhum segredo, valor de `.env` ou dado pessoal real | Cumprido. "Pessoa Ficticia", e-mails `@exemplo.test`, "Demanda (fictício)", prefixo `ficticio`; nenhum token gerado nesta tarefa; a linha de log da Server Action é conferida sem o id da demanda (C-21) |
| Entrada externa validada com Zod; erro sem vazar detalhe | Cumprido. `confirmarSchema = z.strictObject({ id: z.string().regex(RE_ID_DEMANDA) })`; chave a mais, id fora do formato, número, `null`, objeto vazio e string solta dão `entrada_invalida` sem tocar o banco; os dois 409 levam as mensagens fixas da 03 (`MENSAGENS_CONFIRMACAO`), e o inexistente, `MENSAGEM_NAO_ENCONTRADO` |
| Banco: migration, papel migrator, RLS | Não se aplica: nenhuma migration, GRANT, tabela ou coluna nova. "Confirmada" é a existência do evento (ADR-25, C-34), e o teste C-11/C-34 confere a linha da demanda inteira igual antes e depois. O único DDL é o `drop constraint` num banco descartável do teste de falha fechada, dentro do próprio teste |
| Nada duplica função existente | Cumprido. Reusa `travarDemanda`, `registrarEvento`, `dispararSeLigado`, `ignorar`, `ehStatusFinal`, `exigirAtorPessoa`, `autorizar` e `acaoDoPainel`. `ehDoAwave` não duplica `origemDaAutoria` (T07): esta lança para `construir`, e a confirmação precisa responder 409, não 500; é a função que o plano pede (G8 #24) |
| Textos de interface em pt-BR; axe | Não se aplica a tela (a T18 faz o botão). Os textos novos são os da 03, seção 9, e o D-18, em pt-BR, e o D-18 é conferido pelo `textoDoEvento` do histórico |
| Minor para Pendências; só Critical e Important bloqueiam | Cumprido: 3 pareceres Minor, nenhum bloqueante |

### Conferência própria

- `pnpm typecheck` e `pnpm lint`: limpos.
- Os 4 arquivos novos e as regressões vizinhas (`gatilhos.test.ts`, `gatilhos.bordas.test.ts`, `executar.test.ts`,
  `executar.bordas.test.ts`, `criacao-awave.test.ts`, que cobre a linha do desvio 1 com o `depois` exato do CA-04.5, e
  `test/estatico/exigir-pessoa.test.ts`): 10 arquivos, 155 de 155, em 24 s.
- Concorrência: `comTransacao` roda em READ COMMITTED (`begin` sem nível), então a segunda confirmação, depois de
  esperar o `FOR UPDATE` de `travarDemanda`, lê numa consulta nova o evento que a primeira gravou e devolve
  `{ jaConfirmada: true }`. A chave única `(agente, chave_entrada)` da execução segue como segunda barreira.
- Todos os chamadores de `dispararSeLigado` com chave de demanda passam o `demandaId` (`criarDemanda`,
  `criarEspecificacao` com `esp:`, o RSK com `rsk:`); o teste 1 de `gatilhos-awave.test.ts` prova ESP e RSK de pessoa
  numa demanda do Awave não confirmada sem execução nem job.
- A suíte inteira não foi rodada nesta revisão: a entrega registra 265 arquivos e 5661 de 5661, e a 06-T08-testes roda
  de novo.

### Pareceres (todos Minor)

1. **`src/modules/agentes/gatilhos-awave.test.ts:96`** — Problema: `expect(provedor.chamadas).toEqual([])` confere um
   `ProvedorFalso` (linha 88) que não é passado a nenhuma função do teste, então a asserção é verdadeira por construção.
   Razão: ela não prova nada e faz a entrega (teste 1) dizer "provedor sem chamada" sobre um caminho em que o provedor nem
   está ligado. A garantia real do teste vem das linhas 94 e 95 (nenhuma execução, nenhum job), e o "sem chamar o
   provedor" do IN-06 está provado de verdade em `executar-awave.test.ts:89` e `:114`. Na próxima tarefa que tocar o
   arquivo, retirar a asserção ou rodar `executarAgente` com esse provedor; asserção a menos aqui não é teste de
   segurança do D-17.
2. **`src/modules/agentes/executar.ts:239`** — Problema: o passo 3c só roda com `exec.demandaId !== null`; uma execução
   com chave `demanda:`, `esp:` ou `rsk:` e `demanda_id` nulo passaria direto a `montarEntrada`. Razão: hoje nenhum
   caminho do código cria essa linha (todos os gatilhos passam o `demandaId`, conferido acima), e o plano escreveu a guarda
   assim, então não há falha; mas a defesa em profundidade do IN-06 depende de uma coluna que não é derivada da chave.
   Fica para a `08-revisao` (`/security-review`, foco em gatilhos) decidir se basta, ou se a guarda passa a derivar a
   demanda da chave ou se um CHECK amarra os dois.
3. **`src/modules/demandas/confirmar.ts:57`** — Problema: o retorno de `dispararSeLigado` é descartado, então
   `confirmarDemanda` devolve `{ jaConfirmada: false }` igual com o insumo ligado ou desligado. Razão: é o que o plano
   e a 03 pedem (a tela relê o histórico, D-06), e o CA-06.2 prova o evento sem execução; registro só para a T17 e a T18
   não deduzirem da resposta que o agente foi acionado.

## Decisões tomadas

- Desvio 1 aceito (`servico.ts:223`, `entrada.tipo` → `campos.tipo` no `depois` do `demanda_criada`): fecha o parecer 2
  da 06-T06-revisao, que a Pendência endereçou à T08; é uma expressão, sem mudança de comportamento (o Zod restringe à
  enumeração e `camposDaEntrada` copia), alinha o evento ao que foi gravado pela lista de permissão (G3.5, IN-12), e o
  `criacao-awave.test.ts` (CA-04.5, `depois` exato) segue verde sem mudança; `servico.ts` não é superfície do G4 e o
  `servico.test.ts` do D-17 não mudou.
- Desvio 2 aceito (`Object.freeze` em `MENSAGENS_CONFIRMACAO`): mesmos textos e mesmo tipo de leitura do G7, e impede
  troca em tempo de execução.
- Desvios 3 e 4 aceitos (testes além do plano e usuário fictício no `beforeAll`): reforçam a T08 (teto no CA-06.2, agente
  no CA-06.4, D-08 depois de encerrar, falha fechada, M-02 antes do 3c, log da Server Action) e permitem conferir o nome
  da pessoa no histórico do CA-06.1.
- A Server Action devolver só `{ id }` está de acordo com o G7 e com a P-01; não pede mudança.

## Pendências

- Nenhuma bloqueia a passagem. Os 3 pareceres acima são Minor.
- Para quem tocar `src/modules/agentes/gatilhos-awave.test.ts` de novo: o parecer 1.
- Para a `08-revisao` (`/security-review`, foco em gatilhos): o parecer 2.
- Para a T17 e a T18: o parecer 3 (a resposta não diz se o insumo foi acionado; o estado vem do histórico, D-06).
- Herdadas, sem mudança nesta tarefa: os pareceres 1, 3, 4 e 5 da 06-T06-revisao seguem com os destinos dados lá (T13 e
  08; `pnpm format` em `test/integracoes.ts`; regex com `alta` e tempo do CA-08.4 com a 06-T06-testes).
- As caixas `- [ ]` da T08 no plano continuam desmarcadas (o G1 não deixa a 06 editar `docs/`); a marcação fica com o
  maestro.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -6` — código da T08 em 9ce66b2, base e82f615 (06-T07-testes); 4e84920 e d4a7a20 são regravações
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff e82f615 9ce66b2 --stat` — 13 arquivos: 11 de código e teste, a entrega e `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 9ce66b2 d4a7a20 --stat` — só a entrega e `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff e82f615 9ce66b2 -- src/app/(painel)/demandas/[id]/acoes.ts src/components/rotulos.ts src/modules/agentes/executar.ts src/modules/agentes/gatilhos.ts src/modules/demandas/confirmacao.ts src/modules/demandas/confirmar.ts src/modules/demandas/servico.ts` — não rodou: o shell recusou os parênteses sem aspas (erro de sintaxe); repetido abaixo com aspas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff e82f615 9ce66b2 -- "src/app/(painel)/demandas/[id]/acoes.ts" src/components/rotulos.ts src/modules/agentes/executar.ts src/modules/agentes/gatilhos.ts src/modules/demandas/confirmacao.ts src/modules/demandas/confirmar.ts src/modules/demandas/servico.ts` — o código da T08 e o desvio 1
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — árvore limpa
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff a9fd9b8 9ce66b2 -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/proxy.ts src/db/privilegios.ts next.config.ts 'drizzle/000[0-6]_*.sql' 'drizzle/meta/000[0-6]_snapshot.json' src/lib/rota.ts` — vazio (G4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat e82f615 9ce66b2 -- src/modules/acesso/matriz.test.ts src/modules/acesso/matriz-qa.test.ts src/modules/acesso/resolver-ator.test.ts src/modules/acesso/resolver-ator-qa.test.ts src/modules/acesso/tokens-servico.test.ts src/modules/acesso/tokens-servico-qa.test.ts src/modules/demandas/servico.test.ts src/modules/historico/registrar.test.ts src/modules/limites.test.ts src/db/privilegios.test.ts src/app/api/vistas-para-agente.test.ts test/matriz-rotas.test.ts test/transversal/sentinelas.test.ts test/estatico/sem-controle-bidi.test.ts test/estatico/sem-recurso-externo.test.ts test/estatico/leituras-da-fila.test.ts test/estatico/piso-de-assercoes.test.ts` — vazio (IN-16)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat e82f615 9ce66b2 -- src/modules/agentes/gatilhos.test.ts src/modules/agentes/gatilhos.bordas.test.ts src/modules/agentes/executar.test.ts src/modules/agentes/executar.bordas.test.ts src/app/api/demandas/criacao-awave.test.ts test/estatico/exigir-pessoa.test.ts` — vazio (testes de hoje sem mudança)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/demandas/confirmar.test.ts src/modules/agentes/gatilhos-awave.test.ts src/modules/agentes/executar-awave.test.ts "src/app/(painel)/demandas/[id]/acoes-confirmar.test.ts" src/modules/agentes/gatilhos.test.ts src/modules/agentes/gatilhos.bordas.test.ts src/modules/agentes/executar.test.ts src/modules/agentes/executar.bordas.test.ts src/app/api/demandas/criacao-awave.test.ts test/estatico/exigir-pessoa.test.ts` — 10 arquivos, 155 de 155 (saída lida com Read)

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
