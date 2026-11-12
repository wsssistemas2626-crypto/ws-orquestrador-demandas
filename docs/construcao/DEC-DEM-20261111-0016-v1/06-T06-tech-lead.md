---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T06-revisao
agente: tech-lead
leu: [tarefas.json, docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (G1 a G8, T05 passo 3, T06), 06-T06-engenheiro-backend.md, passagens.jsonl (linhas da 06-T06-construcao), padrao-tecnico.md (seção 12), contrato-passagem.md, src/modules/demandas/servico.ts, src/modules/demandas/consultas.ts, src/app/api/demandas/criacao-awave.test.ts, test/integracoes.ts]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T06 ("O Awave cria demanda: autoria, campos, sem disparo, limite e contrato (IN-05)"), engenheiro
`engenheiro-backend`. O commit informado (fafb47e) só regrava a entrega e acrescenta a linha de `passagens.jsonl`; o
código da tarefa está em f40e2a7, e a revisão cobriu o diff inteiro da construção, `f19c224..fafb47e` (8 arquivos).

**Resultado: aprovada, sem Critical nem Important.** Os pareceres abaixo são todos Minor e vão para Pendências.

### Checklist da seção 12 do padrão técnico

| Item | Situação |
|---|---|
| Faz o que o plano pede, nem mais nem menos; arquivos fora da tarefa não mudaram | Cumprido. Os 4 arquivos a modificar e os 2 a criar são exatamente os da seção "Arquivos" da T06. G4 (superfícies congeladas e `src/lib/rota.ts`) vazio contra a9fd9b8. IN-16: nenhum teste da lista do D-17 nem o `piso-de-assercoes.test.ts` mudou na T06. G8 #6, #7 e #10 conferidos: `switch` com `never` em `autoriaDaDemanda`, `camposDaEntrada`, `dispararAoCriar`, `naTransacaoDaCriacao` e `vistaDaDemandaPara`; integração com lista de permissão de cinco campos do corpo (IN-05); disparo só para pessoa e agente (IN-06). Os sete desvios declarados foram avaliados um a um (ver Decisões tomadas): todos reforçam o plano ou evitam mudança de comportamento de ator existente (RNF-09) |
| Teste para cada comportamento novo, e ele falharia sem o código | Cumprido. 21 testes novos em 2 arquivos, um por critério da T06 (CA-01.3, CA-01.4, CA-04.1 a CA-04.6, CA-05.1, CA-05.2, CA-07.4, CA-08.1 a CA-08.4, CA-09.1, CA-09.2, CA-09.4, CA-10.6, CA-11.1 API, CA-11.3, IN-14) e o caso do G5. A rodada vermelha na entrega mostra 17 falhas antes do código; os 5 que passaram antes são guardas declaradas (403 com cookie, 401, formato do 400, 400 sem gastar id, regressão da pessoa), o que é aceitável pelo G3.1 |
| Nenhum segredo, valor de `.env` ou dado pessoal real | Cumprido. Dados com "(fictício)", "Pessoa Ficticia", "Maria Ficticia", sentinelas `SENTINELA-…-a6f2` e domínio `.test`; tokens só nascem no teste e as asserções sobre token e prefixo usam `includes(...)` ou `===` com `toBe`, sem imprimir o valor |
| Entrada externa validada com Zod; erro sem vazar detalhe | Cumprido. O POST segue por `rota()` com `criarDemandaSchema` (sem mudança); 400, 401, 403, 429 e 503 com mensagem fixa, provados por teste |
| Banco: migration, papel migrator, RLS | Não se aplica: nenhuma migration, GRANT ou tabela nova |
| Nada duplica função existente | Cumprido. Reusa `semPermissao`, `executarComOrcamento`, `conferirLimite`, `vistaDaIntegracao`, `NOME_DA_INTEGRACAO` e `dispararSeLigado` |
| Textos de interface em pt-BR; axe | Não se aplica: nenhuma tela tocada |
| Minor para Pendências; só Critical e Important bloqueiam | Cumprido: 5 pareceres Minor, nenhum bloqueante |

### Conferência própria

- `pnpm typecheck` e `pnpm lint`: limpos.
- Os 2 arquivos novos, `ramos-por-ator.test.ts` e as regressões `servico.test.ts` (C-11), `limites.test.ts` (C-36),
  `vistas-para-agente.test.ts` e `leitura-awave.test.ts`: 7 arquivos, 109 de 109. O 503 do IN-14 saiu em 2017 ms (o
  `lock_timeout` de 2 s), e os 11 POSTs simultâneos do CA-08.4 terminaram com o mais lento em 268 ms.
- A suíte inteira não foi rodada nesta revisão: a entrega registra 258 arquivos e 5582 de 5582, e a 06-T06-testes roda
  de novo.

### Pareceres (todos Minor)

1. **`src/modules/demandas/servico.ts:228`** — Problema: no POST do Awave, a leitura do 201 (`obterDemanda(deps.db, id)`)
   roda depois do COMMIT e fora do orçamento de tempo da integração, com o `statement_timeout` de 10 s do pool. Razão: um
   erro só nessa leitura daria 500 com a demanda já gravada, e o Awave pode repetir e duplicar dentro do limite de 10 por
   hora. O próprio engenheiro registrou; é o mesmo risco residual que a 04 (seção 6) já aceita para o 201 perdido, e a
   rota não deveria mudar nesta tarefa. Fica para a T13 (testes transversais do IN-14) e a 08 decidirem se a leitura
   entra na transação só para integração.
2. **`src/modules/demandas/servico.ts:222`** — Problema: o `depois` do `demanda_criada` lê `entrada.tipo`, e não
   `campos.tipo`. Razão: hoje o valor é o mesmo (o Zod restringe à enumeração e `camposDaEntrada` copia), mas o
   princípio do G3.5 e do IN-12 é que o evento descreva o que foi gravado, pela lista de permissão. Trocar por
   `campos.tipo` numa tarefa que já mexa em `criarDemanda` (T08) deixa a fonte única.
3. **`test/integracoes.ts:23`** — Problema: `export const atorDeIntegracao =(integracao: …` sem espaço depois do `=`.
   Razão: a linha foi reescrita sem passar pelo Prettier (`pnpm format`); o `eslint .` não acusa formatação. Só estilo;
   corrigir na próxima tarefa que tocar o arquivo.
4. **`src/app/api/demandas/criacao-awave.test.ts:140`** — Problema: a regex de ausência inclui a palavra solta `alta`.
   Razão: qualquer coluna futura da demanda, ou um texto fictício novo, que contenha "alta" como parte de palavra (ex.:
   "Faltam", "exaltado") faz o teste falhar sem que o IN-05 tenha sido violado. Trocar por uma sentinela própria para a
   urgência não é possível (é enumeração); a alternativa robusta é conferir `urgencia: null`, que o `toMatchObject` acima
   já faz, e tirar `alta` da regex.
5. **`src/app/api/demandas/criacao-awave.test.ts:347`** — Problema: o CA-08.4 depende de as 11 transações
   serializadas pela trava consultiva terminarem dentro do `lock_timeout` de 2 s. Razão: numa máquina carregada, o 11º
   POST pode sair 503 em vez de 429, e o teste falha por tempo, não por regra. Hoje a folga é grande (268 ms no pior
   caso desta rodada). Já sinalizado pelo engenheiro e pela 06-T04-testes; a 06-T06-testes acompanha e, se oscilar,
   registra para a 08, sem subir tempo-limite (G3.2).

## Decisões tomadas

- Desvio 1 (`vistaDaDemandaPara` confere a autoria) aceito: é mais restritivo que o plano, mantém o IN-08 mesmo se a
  função for chamada fora do POST no futuro, e o caso do G5 ganhou asserções (nenhuma retirada).
- Desvio 2 (três assinaturas de sobrecarga) aceito: preserva o tipo de retorno de quem passa pessoa, agente ou sistema
  e evita mexer em `ramos-por-ator-qa.test.ts`, que está fora do G5.
- Desvio 3 (`executarComOrcamento` só para integração) aceito: aplicá-lo a todo ator, como o plano dizia, traduziria o
  57014 do pool de pessoa e agente em 503, mudança de comportamento de ator existente (RNF-09). O plano estava impreciso
  aqui; o IN-14 fala das transações de integração.
- Desvio 4 (`camposDaEntrada` e `dispararAoCriar` lançam para `sistema`) aceito: falha fechada; `autorizar` e
  `autoriaDaDemanda` já recusam antes, e `autoriaDo` já lançava para sistema antes da T06, então não há mudança de
  comportamento.
- Desvio 5 (INSERT campo a campo de `campos`) aceito: é o que o G3.5 pede.
- Desvios 6 e 7 (testes além do plano e um banco por `describe`) aceitos: o primeiro reforça a cobertura do IN-12 e do
  IN-14; o segundo atende à seção 7 do padrão técnico (teste não depende de ordem).
- O comando com pipe da primeira rodada vermelha foi liberado pelo maestro (`passagens.jsonl`, volta 1) e não entra
  nesta revisão como problema do código.

## Pendências

- Nenhuma bloqueia a passagem. Os 5 pareceres acima são Minor.
- Para a T08: trocar `entrada.tipo` por `campos.tipo` no `depois` do `demanda_criada` (parecer 2), já que a T08 mexe na
  guarda do IN-06 junto de `criarDemanda`.
- Para a T13 e a 08: decidir a leitura do 201 fora do orçamento (parecer 1).
- Para a 06-T06-testes: acompanhar o tempo do CA-08.4 (parecer 5) e a regex com `alta` (parecer 4).
- Para quem tocar `test/integracoes.ts` de novo: rodar `pnpm format` no arquivo (parecer 3).
- Registro de fora da T06, herdado da entrega: o teste de cronômetro de `src/modules/dados-pessoais/minimizar.test.ts`
  ("… em menos de 200 ms") falhou uma vez por 4,8 ms numa rodada da suíte inteira; o módulo não mudou no ramo. Fica para
  a 08 ou para quem cuidar da suíte.
- As caixas `- [ ]` dos passos da T06 no plano continuam desmarcadas (o G1 não deixa a 06 editar `docs/`); a marcação
  fica com o maestro.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat fafb47e1c908c099995e74fd01690588f885e1df~1 fafb47e1c908c099995e74fd01690588f885e1df` — só a entrega e `passagens.jsonl` (regravação da entrega)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff fafb47e1c908c099995e74fd01690588f885e1df~1 fafb47e1c908c099995e74fd01690588f885e1df` — a regravação sem o comando com pipe
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -15` — código da T06 em f40e2a7, base f19c224 (06-T05-testes)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat f19c224 fafb47e1c908c099995e74fd01690588f885e1df` — 8 arquivos, todos da T06 ou da pasta do pedido
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff f19c224 fafb47e1c908c099995e74fd01690588f885e1df -- src/modules/demandas/servico.ts src/modules/demandas/consultas.ts src/modules/acesso/ramos-por-ator.test.ts test/integracoes.ts` — o código e o caso do G5
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff f19c224 fafb47e1c908c099995e74fd01690588f885e1df -- src/app/api/demandas/contrato-awave.test.ts src/app/api/demandas/criacao-awave.test.ts` — os dois arquivos de teste novos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff a9fd9b8 fafb47e1c908c099995e74fd01690588f885e1df -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/proxy.ts src/db/privilegios.ts next.config.ts 'drizzle/000[0-6]_*.sql' 'drizzle/meta/000[0-6]_snapshot.json' src/lib/rota.ts` — vazio (G4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat f19c224 fafb47e1c908c099995e74fd01690588f885e1df -- src/modules/acesso/matriz.test.ts src/modules/acesso/matriz-qa.test.ts src/modules/acesso/resolver-ator.test.ts src/modules/acesso/resolver-ator-qa.test.ts src/modules/acesso/tokens-servico.test.ts src/modules/acesso/tokens-servico-qa.test.ts src/modules/demandas/servico.test.ts src/modules/historico/registrar.test.ts src/modules/limites.test.ts src/db/privilegios.test.ts src/app/api/vistas-para-agente.test.ts test/matriz-rotas.test.ts test/transversal/sentinelas.test.ts test/estatico/sem-controle-bidi.test.ts test/estatico/sem-recurso-externo.test.ts test/estatico/leituras-da-fila.test.ts test/estatico/piso-de-assercoes.test.ts` — vazio (IN-16: a T06 não tocou teste de segurança)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — árvore limpa
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/demandas/contrato-awave.test.ts src/app/api/demandas/criacao-awave.test.ts src/modules/acesso/ramos-por-ator.test.ts src/modules/demandas/servico.test.ts src/modules/limites.test.ts src/app/api/vistas-para-agente.test.ts src/app/api/demandas/leitura-awave.test.ts` — 7 arquivos, 109 de 109

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
