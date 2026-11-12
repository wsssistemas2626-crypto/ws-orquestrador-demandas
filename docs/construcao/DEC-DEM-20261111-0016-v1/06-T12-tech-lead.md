---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T12-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12), tarefas.json, 05-tech-lead.md, docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (cabeçalho, G1 a G8, fim da T11, T12 e T13), 06-T12-engenheiro-backend.md, o diff do commit cb40601 (receber.ts, recebimento/route.ts, recebimento.test.ts), src/modules/pedido-construcao/pendentes.ts, src/modules/pedido-construcao/entregar.ts, src/modules/integracoes/tempo-limite.ts, src/modules/limites.ts, src/lib/rota.ts, src/app/api/pedidos-construcao/entrega.test.ts (linhas 1 a 120), src/app/api/pedidos-construcao/recebimento.test.ts (linhas 92 a 139 e 325 a 384), a saída do pnpm test]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T12 (confirmação de recebimento pelo `/construir`; RF-14, RNF-08 parte 2, IN-11, IN-12, CA-14.1 a CA-14.5,
D-04), commit `cb40601`. **Nenhum Critical nem Important.** Três Minor, nas Pendências. A tarefa segue para a
`06-T12-testes`.

### O que foi conferido

| Item | Resultado |
|---|---|
| Escopo | O commit cria só os três arquivos que a T12 lista (`receber.ts`, `[decId]/recebimento/route.ts`, `recebimento.test.ts`), mais a entrega e a linha de `passagens.jsonl`. Nenhum arquivo existente de `src/` ou `test/` mudou, e a G5 não pede nenhum para a T12 |
| Código contra o plano | `receber.ts` segue o esboço da T12 passo a passo: `autorizar` antes da transação; `executarComOrcamento(..., 'padrao', t, ...)`; trava `pedido:<decId>` com a chave por parâmetro (G3.6); 404 igual ao inexistente sem `pedido_gerado` de pessoa (IN-10); 409 `naoEntregue` e 409 `shaDiferente`; repetição sem gravar; `pedido_recebido` com `depois = { sha256 }` do servidor (IN-12, G3.5). As assinaturas são as do G7 |
| Desvios declarados | (1) `RE_SHA256` vem de `./pendentes`, a fonte única que a 06-T10 e a 06-T11 pediram: certo. (2) `find` sem `!`, com `undefined` levando ao 409 `shaDiferente`: o comportamento é o mesmo e tira uma asserção de não nulo. (3) Testes além do plano: só reforçam o IN-10, o IN-11, o IN-12 e o IN-14. Os três ficam aceitos |
| Rota | Adaptador fino: `paramId.versao('decId', 'DEC')` (C-17, 404 antes de autenticar), `corpo: recebimentoSchema` (validado em `rota()` antes da função, então o 400 não consulta o DEC, D-04), 204 sem corpo pelo `montarResposta` de hoje. `rota.ts` não mudou |
| Testes do plano | Todos os itens do passo 1 da T12 têm caso: CA-14.1 a CA-14.5, o 404 (inexistente, sem `pedido_gerado`, `pedido_gerado` de agente), os três casos do RF-14 e o IN-11 |
| O teste falharia sem o código | Sim. A entrega mostra a falha antes do código (`Cannot find module .../receber`) e a prova com a trava retirada: o IN-11 determinístico (`expected [ …(2) ] to have a length of 1`) e o IN-14 caem. O teste das três chamadas simultâneas sozinho não prova a trava, e o arquivo diz isso no comentário da linha 344 |
| Dados e segredos | Token só gerado em tempo de teste (`criarTokenDeIntegracao`, `tokenDeIntegracao`), fora de mensagens de `expect`; prefixo fictício `ficticio` nos eventos do migrator; nomes "Pessoa Ficticia …" e "Carlos Exemplar", o mesmo da `entrega.test.ts` já revisada; nenhum `.env` |
| Zod e erro | `z.strictObject` com `z.custom` (D-04: o `mapearErro` repassa o texto da 03 em `campos`); chave a mais, lista, `null` e corpo que não é JSON dão 400. 404, 409 e 503 com mensagens fixas, sem hash nem id |
| Log (G3.10) | Nenhuma linha nova em `receber.ts`. O teste do log confere que as linhas do 204 e do 409 não levam `decId`, hash, prefixo nem token |
| Banco | Sem migration, sem GRANT, sem tabela. As leituras são as da T10, no mesmo `tx`, depois da trava |
| Duplicação | O código de produção reaproveita `pendentes.ts`, `executarComOrcamento`, `registrarEvento` e `autorizar`, sem reescrever nenhum. Há repetição nos testes e uma função de uma linha (Minor 1 e 2) |
| Interface | A T12 não toca tela; o axe não se aplica |
| G4 | `git diff --stat a9fd9b8` das superfícies congeladas, com `src/lib/rota.ts`: vazio |
| IN-16 | Nenhum teste existente mudou no commit. O piso de asserções (`test/estatico/piso-de-assercoes.test.ts`) está verde na suíte |
| Verificação | `recebimento.test.ts` 20 de 20; `pnpm test` 274 de 274 arquivos e 5784 de 5784 testes; `pnpm typecheck` e `pnpm lint` limpos |

### Pareceres

Nenhum Critical nem Important. Os Minor estão nas Pendências, com arquivo, linha e razão.

## Decisões tomadas

- A T12 passa sem devolução: o checklist da seção 12 está cumprido, e os três achados são Minor, que pela própria seção
  12 não bloqueiam.
- Os três desvios declarados pelo engenheiro ficam aceitos: a fonte única de `RE_SHA256` foi pedida em revisão anterior,
  o `find` sem `!` tem o mesmo comportamento com menos asserção de não nulo, e os testes extras só reforçam controles do 04.
- A regra "um `pedido_recebido` por hash entregue" fica como o plano escreveu (`recebidoComSha` da T10). O RF-14 não pede
  outra.
- A trava consultiva por DEC, e não `travarDemanda`, fica aceita: o recebimento não remonta o pedido (ADR-26), e assim não
  disputa a trava da demanda com a entrega nem com a edição. A corrida entre uma entrega ainda não gravada e um
  recebimento dá 409 `naoEntregue`, e o `/construir` só confirma depois do 200 da entrega.

## Pendências

- Nenhuma bloqueia a T12.
- **Minor 1:** `src/app/api/pedidos-construcao/recebimento.test.ts:44-136` repete quase linha a linha
  `src/app/api/pedidos-construcao/entrega.test.ts:42-117`: `ESP_COMPLETA`, `RSK_PADRAO`, `novoDec`, `aprovar`,
  `prepararDec`, `listar`, `entregar`, `LinhaEvento`. **Razão:** a T13 vai montar o mesmo fluxo do `/construir` (geração,
  pendentes, entrega, recebimento) em `sentinelas.test.ts` e em `log-das-integracoes.test.ts`, e seria a terceira e a
  quarta cópia. Mudança no contrato do DEC ou no seed obrigaria a corrigir todas. **Caminho:** na T13, extrair para um
  ajudante em `test/` (por exemplo, `test/pedidos-construcao.ts`), sem mudar asserção dos arquivos já revisados. Se mexer
  nos dois arquivos, a T13 explica a mudança trecho a trecho (G3.2).
- **Minor 2:** `src/modules/pedido-construcao/receber.ts:34` cria `naoEncontrado()`, a terceira cópia da mesma linha
  (`src/lib/rota.ts:78` e `src/modules/pedido-construcao/entregar.ts:24`). **Razão:** é pequena e idêntica, mas três
  cópias do mesmo 404 são três lugares para manter iguais o IN-10 e o C-17. `rota.ts` está congelado (G4). **Caminho:**
  na `08-revisao` ou num pedido de sobras, exportar uma fábrica de `src/lib/erros.ts` e usar nos dois módulos de
  `pedido-construcao`, sem tocar em `rota.ts` neste pedido.
- **Minor 3:** em `src/app/api/pedidos-construcao/recebimento.test.ts:368-375`, o laço que espera o pedido entrar na fila
  da trava sai calado depois de 50 tentativas e faz o `commit` assim mesmo. **Razão:** numa máquina lenta em que o pedido
  ainda não chegou à trava, o teste passa sem provar a espera, e a prova da trava fica de novo nas mãos do agendamento.
  Não dá falso vermelho, só enfraquece a prova sem avisar. **Caminho (para a `06-T12-testes`):** guardar se a espera foi
  vista e afirmar `expect(viuEspera).toBe(true)` antes do `commit`, sem mexer nas outras asserções.
- Para a `06-T12-testes`: os casos que a entrega do engenheiro listou (token `construir` revogado → 401 e o outro token
  segue; cookie com Bearer → 400; `http://orquestrador_app`; `decId` fora da regex → 404 antes de autenticar; C-15 com
  cookie e sem `Origin`), como a 06-T11-testes fez na entrega. Também o Minor 3.
- Para a `08-revisao`: a regra "a entrega depois do recebimento continua 200 e só grava `pedido_entregue` com hash novo"
  segue sem decisão explícita, como as entregas da 06-T11 e da 06-T12 registraram. O RF-14 não pede outra.
- As caixas `- [ ]` da T12 no plano ficam com o maestro (G1: a 06 não edita `docs/`).
- Glob e Grep não estavam disponíveis nesta sessão. Li tudo com Read e localizei a T12 no plano por leitura em trechos.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -12` — HEAD em cb40601 (06-T12-construcao), sobre 0ab191b (06-T11-testes)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat cb4060103f8a98b58e9f3293dfed6b48ea607961~1 cb4060103f8a98b58e9f3293dfed6b48ea607961` — 5 arquivos, 741 inserções: a entrega, `passagens.jsonl` e os três arquivos novos da T12
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — árvore limpa
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff cb4060103f8a98b58e9f3293dfed6b48ea607961~1 cb4060103f8a98b58e9f3293dfed6b48ea607961 -- src` — o código e o teste da T12
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat a9fd9b8 -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/proxy.ts src/db/privilegios.ts next.config.ts 'drizzle/000[0-6]_*.sql' 'drizzle/meta/000[0-6]_snapshot.json' src/lib/rota.ts` — vazio (G4)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/pedidos-construcao/recebimento.test.ts` — 20 de 20
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 274 de 274 arquivos, 5784 de 5784 testes, em 157,6 s (saída lida com Read)

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
