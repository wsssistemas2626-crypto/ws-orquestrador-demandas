---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T26-testes
agente: qa-automacao
leu: [contrato-passagem.md, pedido.json, tarefas.json, 2026-10-25-ws-orquestrador-demandas-plano.md (cabeçalho, G1, G2, T26 e início da T27), 01-analista-requisitos.md (RF-15 a RF-21), 02-arquiteto-solucoes.md (ADR-02 a ADR-12), 04-seguranca-aplicacao.md (2.17, C-01 a C-40), 06-T26-engenheiro-backend.md, 06-T26-tech-lead.md, 06-T25-qa-automacao.md, git show 2d83472, src/agents/comum.ts, src/agents/index.ts, src/agents/orquestrador.ts, src/agents/insumo-tecnico.ts, src/agents/risco.ts, src/agents/consolidacao.ts, src/agents/prompts.test.ts, src/modules/agentes/schemas.ts, src/modules/agentes/entrada-agente.ts, src/modules/agentes/provedor.ts, src/modules/agentes/provedor.test.ts (linhas 1 a 80), src/modules/demandas/schemas.ts, src/modules/especificacoes/schemas.ts, src/modules/pareceres-risco/schemas.ts, src/modules/pacotes-decisao/schemas.ts, src/modules/dados-pessoais/detectores.ts, src/modules/acesso/ator.ts, src/vendor/construir/pedido.d.mts, test/estatico/varreduras-qa.test.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Testes da T26, sobre o commit `2d83472`. **O código cumpre todos os critérios da tarefa.** Os 55 testes do engenheiro
passam e não mudaram. Acrescentei 75 testes de borda e de contrato num arquivo novo,
`src/agents/prompts.bordas.test.ts`. A suíte inteira está verde, e o lint e o typecheck estão limpos.

Um dos testes novos achou o nome `fabianojp06` no prompt do insumo técnico. É a conta pessoal do GitHub do CTO, que vem
de `DONOS_REPOSITORIO`. O teste do engenheiro não pega esse nome, porque procura só `Fabiano` com F maiúsculo. Não
devolvi a tarefa, porque o nome é uma conta exigida pelo `validarPedido`. O caso fica como Minor em Pendências, para a
08 decidir.

### Critério da tarefa → teste que o cobre

Arquivos: `src/agents/prompts.test.ts` (o do engenheiro, que chamo de **E**) e `src/agents/prompts.bordas.test.ts` (o
novo, que chamo de **Q**).

| Critério | Teste |
|---|---|
| RF-16: prompts dos quatro agentes em `src/agents/` | E: `PROMPTS e SCHEMA_DE_SAIDA têm exatamente os quatro agentes`. Q: `ADR-10: … cada agente tem o seu arquivo em src/agents/` |
| RF-16: cada prompt vem do agente certo da estrutura (insumo técnico do Operacional; risco da Gestão de Riscos com o Jurídico; orquestrador e consolidação do Orquestrador Central) | Q: `RF-16: %s: a primeira linha é o papel, dentro do WS Orquestrador de Demandas` (× 4); `os quatro textos são diferentes entre si` |
| RF-16 e ADR-09: a saída é validada pelo **mesmo** schema da rota | E: `SCHEMA_DE_SAIDA usa os mesmos schemas da API (ADR-09)`; `ADR-09: o exemplo de saída passa no schema da rota` (× 4). Q: `cada campo comum é o mesmo objeto de schema da rota da demanda`; `o mapa SCHEMA_DE_SAIDA é congelado…` |
| ADR-09: o orquestrador usa a demanda sem nome, papel e anexos, mais as flags | E: `a saída do orquestrador não tem os campos do solicitante`, e o `describe('saidaOrquestradorSchema')`. Q: `as chaves são as da demanda menos nome, papel e anexos, mais perguntasParaSolicitante e flags` |
| ADR-09: o prompt acompanha o schema (o exemplo de cada prompt passa no schema) | E: `ADR-09: o exemplo de saída passa no schema da rota`. Q (× 4): `o schema devolve o exemplo igual…`; `o exemplo tem todas as chaves do schema…`; `o JSON que fecha o texto do prompt é o próprio exemplo e passa no schema`; `o exemplo segue a regra de formato do próprio prompt…` |
| ADR-10: prompts como constantes `.ts`, sem leitura de arquivo no contêiner | Q: `nenhum arquivo de src/agents/ lê arquivo nem tem prompt fora de .ts`; `o texto é o mesmo a cada carga do módulo (sem data, sorteio nem ambiente)` |
| C-24: instrução de que ordens dentro do bloco `<dados>` não valem | E: `C-24: maxTokens ≤ 8.000 e instrução sobre o bloco <dados>` (× 4). Q (× 4): `o prompt cita as duas marcas do bloco que o montador usa, e a ordem dentro dele não vale`; `as regras gerais vêm antes do exemplo, e o exemplo fecha o texto` |
| C-24: `maxTokens` por agente de no máximo 8.000 | E: `C-24: maxTokens ≤ 8.000…` e `maxTokens é inteiro de 1 a 8.000…` (× 4). Q: `maxTokens %s lança RangeError` (0, -1, 8001, 1.5, NaN, Infinity); `maxTokens %s é aceito` (1 e 8000); `o teto é o mesmo do provedor (8.000)` |
| C-24 de ponta a ponta (T24 × T25 × T26): o prompt vai inteiro em `system`, sem ferramenta, e o texto do cliente vai só no bloco da mensagem | Q: `inteiro em system, com o maxTokens do agente, sem ferramenta, e o texto do cliente só no bloco da mensagem` (× 4). Usa o `ProvedorAnthropic` com `fetch` falso, o `delimitarComoDado` com uma injeção fictícia e uma resposta que copia o exemplo, que passa no schema |
| Plano: sem nome de pessoa e sem dado de cliente | E: `sem dado pessoal nem nome de pessoa` (× 4). Q: `nenhum nome de pessoa da empresa no texto nem no exemplo, com ou sem acento e em qualquer caixa, fora das contas do GitHub` (× 4) |
| Plano: o resultado é rascunho que uma pessoa revisa; o agente não aprova nem envia | E: `diz que o resultado é rascunho…` (× 4) |
| C-11 e C-25 no schema de cada agente (autoria, status e id mandados pelo modelo saem) | E: `o exemplo de saída não traz campo de autoria…`; `descarta também o papel do solicitante…`. Q: `C-11 e C-25: autoria, status, id e versão mandados pelo modelo saem no schema do agente` (× 4) |

### Testes acrescentados (75, em `src/agents/prompts.bordas.test.ts`)

1. **ADR-09, contrato do exemplo com o schema** (8 por agente, 32 no total):
   - o `parse` devolve o exemplo igual. Se o exemplo tivesse uma chave que o Zod descarta, o `safeParse` do engenheiro
     passaria, e o modelo aprenderia a mandar uma chave que se perde;
   - o exemplo tem todas as chaves do schema, inclusive as quatro de cada opção do DEC. O prompt diz "use só as chaves
     do exemplo", então uma chave que faltasse no exemplo nunca viria do modelo;
   - o JSON depois de `Exemplo:` no texto do prompt é o próprio exemplo e passa no schema;
   - nenhum campo do exemplo tem texto vazio nem `null`, como o próprio prompt pede;
   - C-11 e C-25: o exemplo com `autorTipo`, `rascunhoAgente: false`, `status: aprovada`, `opcaoEscolhida`, `id`,
     `versao` e `solicitanteNome` a mais sai igual ao exemplo;
   - nenhum nome de pessoa da empresa, sem acento e em qualquer caixa, fora das contas do GitHub;
   - o exemplo é congelado em todos os níveis, e acrescentar uma chave lança `TypeError`;
   - o `maxTokens` cabe uma resposta do tamanho do exemplo, contando 2 caracteres por token, o que é conservador.
2. **Schema do orquestrador e mapas** (4): as chaves batem com a regra da ADR-09, e cada campo comum é o mesmo objeto
   de `criarDemandaSchema` (`toBe`). `SCHEMA_DE_SAIDA` e `PROMPTS` são congelados: trocar uma entrada lança `TypeError`.
3. **Guarda de `maxTokens` do `montarPrompt`** (9). A guarda não tinha teste direto: o engenheiro só conferiu os quatro
   valores em uso.
4. **C-24 de ponta a ponta** (3 por agente, 12 no total). O corpo enviado tem só `model`, `max_tokens`, `system` e
   `messages`. O `system` é o prompt inteiro, e o `max_tokens` é o do agente. A mensagem é o bloco do montador com a
   injeção fictícia, e o `system` não leva nada dela. O prompt cita `<dados>` e `</dados>`, as mesmas marcas do
   `delimitarComoDado`, nessa ordem: regras, limites, formato e o exemplo por último.
5. **RF-16** (5): a primeira linha diz o papel e o olhar do agente da estrutura, e os quatro textos são diferentes.
6. **O exemplo obedece ao próprio prompt** (10):
   - orquestrador: título de até 120 caracteres, até cinco perguntas, e os limites de `flags` citados com as constantes;
   - insumo técnico: o exemplo passa em `validarCamposDeConstrucao` nos cinco tipos de demanda (o engenheiro testou
     `melhoria` e `estudo`), e não tem dúvida em aberto;
   - consolidação: as opções A e B são diferentes e têm os quatro campos, e o prompt diz "na dúvida, o nível mais alto";
   - risco: o prompt diz "na dúvida, o nível mais alto".
7. **ADR-10** (3):
   - os arquivos `src/agents/<agente>.ts` existem;
   - nenhum arquivo de `src/agents/` importa `fs` ou `path`, chama `readFile` ou usa `require`, e não há prompt em
     `.md`, `.txt`, `.json` ou `.yaml`;
   - depois de `vi.resetModules`, o módulo carregado de novo é outro objeto, com o mesmo texto, o mesmo `maxTokens` e o
     mesmo exemplo.

### Resultado

- `prompts.bordas.test.ts` isolado: 75 de 75 na rodada final. Na primeira rodada, 74 de 75: o teste do nome falhou
  por causa de `fabianojp06`, como explicado acima e em Pendências.
- `pnpm test`: 119 arquivos, **2439 de 2439** (2364 da revisão mais 75 novos), sem nenhuma falha. O aviso do undici
  "Using `patch`" segue igual, aberto desde a `06-T23-revisao`.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.
- `git status`: só o arquivo novo, sem rastreio. `git diff --stat`: vazio, nenhum arquivo rastreado mudou. Nenhum
  `.skip`, `.only` ou `.todo`, e nenhuma asserção afrouxada.

### Estabilidade e relógio

- Os testes novos não usam relógio, nem banco, nem rede, e não dependem de outro teste.
- Cada teste do provedor monta o próprio `fetch` falso, sem `vi.stubGlobal`.
- O `vi.resetModules` só afeta o `import()` dinâmico do próprio teste. Os imports do topo seguem os mesmos, e o teste
  confere que o módulo novo é outro objeto, para não passar sem efeito.
- Dados só fictícios: a chave é `chave-ficticia-de-teste`, o nome é `Pessoa Ficticia`, os ids são do ano 2099 e a
  injeção é um texto inventado.

## Decisões tomadas

- **Pronto, sem devolução.** Razão: cada critério da T26 (RF-16, ADR-09, ADR-10 e C-24) tem teste e passa. O único
  achado é um nome de conta exigido por uma regra compartilhada (`validarPedido`), sem efeito no schema nem no que é
  gravado.
- **Arquivo novo, em vez de mexer no `prompts.test.ts`.** Razão: os testes do engenheiro ficam intactos, e o `git diff`
  prova isso sem leitura linha a linha. Segue o molde de `servico.bordas.test.ts`.
- **O teste do nome tira as contas de `DONOS_REPOSITORIO` antes de procurar.** Razão: ele prende a exceção que existe
  hoje e falha com qualquer outro nome. Se a 08 tirar a conta pessoal do prompt, o teste continua valendo sem mudança.
- **Verificação de ponta a ponta com o `ProvedorAnthropic` real e o `fetch` falso.** Razão: C-24 junta três tarefas
  (montador T24, provedor T25 e prompt T26), e cada uma só tinha teste isolado.
- **A estimativa de tokens usa 2 caracteres por token.** Razão: é a estimativa mais pessimista para texto em pt-BR com
  JSON. O teste não pretende medir tokens. Ele só pega um `maxTokens` reduzido por engano, que cortaria toda resposta e
  gastaria três chamadas pagas até `falha_agente`.
- **Os limites de cinco perguntas e de 120 caracteres valem só para o exemplo.** Razão: são limites do prompt, que o
  schema não impõe (Minor 2 da revisão). O teste confere que o exemplo não ensina o contrário, sem tratar o limite como
  garantia.

## Pendências

- **Para a `08-revisao` (`seguranca-aplicacao`) e o `tech-lead`, Minor:** o prompt do insumo técnico manda ao provedor
  de IA o nome `fabianojp06`, conta pessoal do GitHub do CTO.
  - **Origem:** a regra `repositorioDestino: … com a conta ${DONOS_REPOSITORIO.join(' ou ')}` em
    `src/agents/insumo-tecnico.ts:45`.
  - **Por que o teste do engenheiro não pegou:** o `not.toMatch(/Débora|Fabiano|Marcus/)` é sensível à caixa.
  - **Conflito com o plano:** o plano diz "sem nome de pessoa", e a conta leva o primeiro nome dele.
  - **Por que é Minor:** não é dado de terceiro; é a conta que o `validarPedido` aceita, e o prompt já manda sistema
    novo para `wsssistemas2626-crypto`.
  - **Opções:**
    - (a) citar no prompt só `wsssistemas2626-crypto` e deixar que quem revisa troque a conta quando o sistema for da
      conta pessoal. O `validarCamposDeConstrucao` continua aceitando as duas;
    - (b) aceitar e registrar a exceção.
  - **Se escolherem (a):** o teste `insumo técnico: as contas aceitas para o repositório destino` do engenheiro
    (`prompts.test.ts:136`) precisa mudar junto, porque exige as duas contas no texto. O meu teste não muda.
- Seguem abertos, sem mudança:
  - os três Minor da `06-T26-revisao` (contradição sobre inventar sistema, limites só no prompt, conta fixa no texto),
    para a T27 e a T28;
  - as pendências da `06-T25-testes` para a T27 e a 08;
  - o aviso do undici "Using `patch`".

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 2d8347242f8ff7a74c348f6181473ee405b4b596` — 10 arquivos: 8 de código e teste, a entrega do engenheiro e o registro
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:docs/superpowers/plans/` — o plano
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:test/estatico/` — arquivos dos testes estáticos, para seguir o molde da varredura
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/agents/prompts.bordas.test.ts` — 74 de 75: o teste do nome achou `fabianojp06` no prompt do insumo técnico
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/agents/prompts.bordas.test.ts` — depois de excluir as contas de `DONOS_REPOSITORIO` da busca: 75 de 75
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 119 arquivos, 2439 de 2439, sem falha
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — só `src/agents/prompts.bordas.test.ts`, sem rastreio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — vazio: nenhum arquivo rastreado mudou

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
