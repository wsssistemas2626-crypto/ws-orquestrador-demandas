---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T19-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12), 2026-10-25-ws-orquestrador-demandas-plano.md (T18 e T19), 06-T19-engenheiro-backend.md, 06-T18-tech-lead.md, commit 930d924, src/modules/acesso/matriz.ts, src/db/schema/versoes.ts, src/db/schema/historico.ts, src/modules/limites.ts, src/modules/historico/registrar.ts, src/modules/historico/consultas.ts, src/modules/especificacoes/servico.ts, src/modules/especificacoes/consultas.ts, src/modules/demandas/schemas.ts, src/modules/demandas/servico.ts, src/lib/rota.ts]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T19 (parecer de risco versionado), commit `930d924`. Não há problema Critical nem Important, e a passagem
segue para a `06-T19-testes`. Os três pontos Minor estão em Pendências, cada um com arquivo:linha, problema e razão.

### O que foi conferido

- **Escopo do plano.** O commit cria só os 7 arquivos da lista da T19 e não altera nenhum outro arquivo de `src/` ou
  `test/`. As interfaces são as do plano:
  - `NIVEIS` vem de `NIVEIS_RISCO` (`src/db/schema/versoes.ts:10`), com os mesmos valores do plano, e não há uma segunda
    lista para o `CHECK` do banco;
  - `criarParecerRiscoSchema` é campo a campo igual ao do plano;
  - `criarParecerRisco(deps, ator, demandaId, entrada, t?, extras?)`;
  - `listarPareceresRisco`;
  - `obterParecerRisco`, com `versaoMaisNova` e `especificacaoMaisNova`.
- **Ordem do serviço.** Em `src/modules/pareceres-risco/servico.ts:30-66` o fluxo é o da ESP, como o plano pede:
  1. `autorizar`;
  2. `travarDemanda`;
  3. `conferirLimite('artefato')`;
  4. `proximaVersao`;
  5. insert campo a campo;
  6. evento `parecer_risco_criado`.

  Não há gatilho de status nem exigência de ESP. A transação de quem chama é aceita (G3.8), e a vista é lida na mesma
  transação.
- **Matriz (C-10).** `criar_parecer_risco` aceita qualquer pessoa e o agente `risco`; `ler_parecer_risco` é
  `LEITURA` (`src/modules/acesso/matriz.ts:49-50`). Os testes cobrem `consolidacao` e `insumo_tecnico` pela rota (403)
  e `sistema`, `orquestrador`, `insumo_tecnico` e `consolidacao` pelo serviço.
- **Autoria (C-11).** A autoria vem de `autoriaDo` da T15, sem cópia. O insert é campo a campo, e há testes no schema e
  na rota com `rascunhoAgente:false`, `autorTipo`, `autorId`, `id`, `versao` e `demandaId` no corpo.
- **Limite (C-36).** `conferirLimite` já soma ESP, RSK e DEC (`src/modules/limites.ts:51`). O teste monta 30 ESP e
  30 RSK do mesmo ator, espera 429 e confere que outro ator não é afetado.
- **Evento sem texto livre (C-30).** O `depois` leva só `{ versao, rascunhoAgente }`. O teste põe sentinelas em
  todos os campos de texto e de lista e confere que nenhuma aparece no histórico.
- **Rotas (C-15, C-17, C-21, CA-11.1).** As duas rotas são adaptadores finos sobre `rota()`.
  - `paramId.versao('rskId', 'RSK')` usa a regex de `src/lib/rota.ts:26`, e o teste confere que um id fora do formato
    responde 404 sem nenhuma consulta nem conexão.
  - A rota da versão só exporta `GET`.
  - O log é conferido sem id, sem token e sem sentinela.
- **Testes.** Os seis testes do plano estão presentes, com corpo, e todos os comportamentos novos têm teste. Todos
  falhariam sem o código: os módulos não existiam, e a entrega mostra a falha de importação. A concorrência do
  CA-04.3 é real, com duas requisições em paralelo, uma por cookie e outra por token.
- **Desvios declarados, todos aceitos:**
  - `deps: DepsDemanda`, como na T18;
  - `{ itens }` com 404 para demanda que não existe, como na T18;
  - os testes do serviço em `pareceres.test.ts`, porque a lista de arquivos do plano não tem `servico.test.ts` e eles
    usam o mesmo banco.
- **Texto opcional vazio gravado como `null`.** É a resposta ao Minor 3 da `06-T18-revisao`, e a regra está certa
  para o RSK. Sobra a diferença em relação à ESP e à demanda (Minor 1).
- **Suíte nesta revisão.** `pnpm test` passou com 1700 de 1700 testes em 94 arquivos. `pnpm lint` e `pnpm typecheck`
  saíram limpos, e a árvore está limpa.

### Checklist da seção 12 do padrão técnico

- [x] A tarefa faz o que o plano pede: só os 7 arquivos da lista, sem nenhum outro arquivo de código alterado.
- [x] Há teste para cada comportamento novo, e ele falharia sem o código.
- [x] Nenhum segredo, valor de `.env` ou dado pessoal real. Os dados são fictícios: `Pessoa Ficticia`, `outro.test`,
  `SENTINELAS` e o prefixo de token inventado.
- [x] Entrada externa validada com Zod (`criarParecerRiscoSchema` e `paramId`). O 400 não devolve o valor recebido
  (CA-09.2 e CA-09.3 pela rota).
- [x] Banco: a tarefa não tem migration nem `tenant_id` e usa a tabela da T05. Não se aplica.
- [x] Nada duplica função existente: autoria, limite, versão, trava, evento e regex vêm dos módulos da Fundação. Há um
  ajudante novo que vai ter de ser compartilhado (Minor 1).
- [x] Interface: a tarefa não tem tela. A mensagem do nível ausente fica para a T42 (Minor 2).
- [x] O que é Minor foi para Pendências; nenhum Critical ou Important.
- [x] Os itens de PR (`/code-review` e `/security-review`) são da `08-revisao`, fora desta etapa.

## Decisões tomadas

- Aceito gravar como `null` o texto opcional que fica vazio depois do `trim()`: a versão é imutável, e o RSK nasce sem
  o problema que a ESP tem.
- Não vou pedir agora a mesma mudança na ESP: `src/modules/especificacoes/` está fora da lista da T19, e a diferença
  não quebra nada que existe hoje. Ela fica registrada para a T20 e para a 08 (Minor 1).
- Aceitos os três desvios declarados: os dois primeiros repetem desvios já aceitos na `06-T18-revisao`, e o terceiro
  respeita a lista de arquivos do plano.
- `especificacaoMaisNova` sem vínculo gravado com uma ESP está certo: a tabela da T05 não tem essa coluna, e o plano
  define o campo como a ESP mais nova. O cuidado é com o uso na tela (Minor 3).
- Status `pronto`: só sobraram pontos Minor, e pela seção 12 Minor não bloqueia a passagem.

## Pendências

1. **Minor.** `src/modules/pareceres-risco/servico.ts:20`
   - Problema: `textoOuNulo` é local ao RSK. A ESP (`src/modules/especificacoes/servico.ts:46-61`) e a demanda
     (`src/modules/demandas/servico.ts:79-82`) gravam `''` com `?? null` quando o texto fica vazio depois do `trim()`.
     A base passa a ter duas regras para o mesmo tipo de campo.
   - Razão: a T10 e a T22 continuam tendo de tratar `''` e `null` como iguais na ESP e na demanda. Além disso, a T20
     (DEC) tende a criar uma terceira cópia do ajudante.
   - Sugestão: na T20, levar a regra para um lugar comum, por exemplo um `textoOpcional` em
     `src/modules/demandas/schemas.ts` com `.transform((v) => v || undefined)`, ou o ajudante exportado de um módulo
     compartilhado, e usá-lo no DEC. A ESP e a demanda passam a usar a mesma regra numa correção da 08. Na demanda, é
     preciso cuidado para não mudar a semântica do `null` que limpa um campo no `alterarDemandaSchema`.
2. **Minor.** `src/modules/pareceres-risco/schemas.ts:14`, com `:16` e `:18`
   - Problema: quando um nível falta ou é inválido, o 400 traz "Valor inválido." no campo, e não o texto da 03 para a
     T08 ("Escolha o nível do risco técnico.", e o mesmo para o operacional e o jurídico). O engenheiro já registrou
     isso.
   - Razão: o `mensagemDoIssue` da T03 só repassa a mensagem de issue `custom`. Sem mudança, o texto da 03 só existe
     no cliente.
   - Sugestão: a T42 valida no cliente. Se a 03 exigir o texto também do servidor, a mudança é uma só, em
     `src/lib/erros.ts`, junto com o Minor 5 da `06-T18-revisao`.
3. **Minor.** `src/modules/pareceres-risco/consultas.ts:86`
   - Problema: `especificacaoMaisNova` é a ESP mais nova no momento da leitura, e não a ESP que o parecer avaliou. Na
     leitura de um RSK antigo, ela pode ser uma ESP criada depois dele.
   - Razão: se a T10 mostrar esse campo na versão gravada com o texto da T08 ("se baseia"), a tela diz que o RSK v1 se
     baseou numa ESP que nem existia quando ele foi escrito.
   - Sugestão: a T08 usa o campo só na criação. Na leitura de versão (T10), o rótulo é "ESP mais nova da demanda", ou o
     campo não aparece. Se a 01 quiser o vínculo de verdade, isso pede uma coluna nova (`especificacao_id`) e volta à
     `02-arquitetura`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 930d9249db9f0e7c56d1ac56fea800e28668f38c` — 9 arquivos: os 7 da T19, a entrega do engenheiro e `passagens.jsonl`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 1700 de 1700, 94 arquivos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, ramo `construcao/DEC-DEM-20261022-0001-v1`

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
