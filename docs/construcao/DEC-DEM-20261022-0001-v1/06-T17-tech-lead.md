---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T17-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seções 1 a 12), 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6 e mapa das fases e T15 a T18), tarefas.json, 06-T16-tech-lead.md, 06-T17-engenheiro-backend.md, commit eab8cf7, src/modules/demandas/entrada.ts, src/modules/demandas/entrada.test.ts, src/modules/demandas/texto-recebido.ts, src/app/api/demandas/entrada/route.ts, src/app/api/demandas/[id]/route.ts, src/modules/acesso/ator-pessoa.ts, src/modules/acesso/ator-pessoa.test.ts, src/modules/demandas/servico.ts, src/modules/demandas/schemas.ts, src/db/schema/demandas.ts, src/lib/corpo.ts, src/lib/fuso.ts, src/modules/limites.ts, src/modules/acesso/exigir-pessoa.ts]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T17 (entrada colando o texto, no modo manual, e leitura do texto recebido), commit `eab8cf7`. **Nenhum
problema Critical ou Important.** A tarefa passa. Os achados abaixo são Minor e vão para Pendências (seção 12 do
padrão técnico).

### Conferência contra o plano

- **Arquivos:** os 4 da T17 foram criados (`entrada.ts`, `entrada.test.ts`, `entrada/route.ts`, `texto-recebido.ts`).
  Fora deles, mudaram 3 arquivos: `ator-pessoa.ts` e `ator-pessoa.test.ts` (novos) e `[id]/route.ts`. Essa troca é a
  pendência M-02 da `06-T16-revisao`, que pediu à T17 exatamente isso: levar o estreitamento para
  `src/modules/acesso/`, com teste do 403, e trocar o uso em `[id]/route.ts`. Fica aceita. O comportamento do `PATCH`
  não muda, e os testes da T16 seguem verdes.
- **Interfaces:** `origemSchema`, `entradaManualSchema`, `entradaAgenteSchema`, `entradaSchema`, `registrarEntrada`,
  `TextoRecebido` e `obterTextoRecebido` batem com o plano.
- **Desvios de assinatura (aceitos):**
  - `registrarEntrada` recebe `t?: Transacao` no fim. É a G3.8, e o teste de rollback depende disso.
  - `registrarEntrada` e `obterTextoRecebido` pedem um recorte de `Deps` (`DepsDemanda`, `DepsTextoRecebido`). Quem
    passa `Deps` inteiro continua compatível.
- **Comportamento fixado na tarefa:**
  - modo agente: 409 com "O agente orquestrador está desligado. Preencha os campos abaixo.";
  - `entradaPendenteId`: 404 até a T28;
  - modo manual: `criarDemanda(..., t)` e a linha de `entrada_bruta` na mesma transação, com `recebida_em` vindo do
    `Relogio`;
  - rota: `rota({ acao: 'registrar_entrada', corpo: entradaSchema })`, 201 `{ demanda }`.
- **Regras G3:**
  - rota só por `rota()` (G3.6);
  - id conferido por `RE_ID_DEMANDA` antes da consulta (G3.10, C-17), com a regex importada de `gerar-id.ts`, sem cópia;
  - autoria só do ator (G3.9, C-11): `criarDemanda` grava campo a campo (`servico.ts:69-88`), então `modo`, `texto`,
    `origem` e `entradaPendenteId` não chegam à `demanda`;
  - sem `console.*`, sem `sql.raw(` e sem `new Date()` sem argumento.
- **Limite do corpo:** `LIMITE_CORPO_PADRAO` é 512 KB (`src/lib/corpo.ts:5`). Um texto de 100.000 caracteres de até
  4 bytes cabe junto com os outros campos. Por isso o CA-05.3 dá 400 do Zod, e não 413.
- **Rodado por mim, no commit `eab8cf7`:**
  - `pnpm typecheck` e `pnpm lint` limpos;
  - `pnpm test`: 85 de 85 arquivos e 1455 de 1455 testes.

### Checklist da seção 12

| Item | Resultado |
|---|---|
| Faz o que o plano pede, nem mais nem menos; nada fora da tarefa mudou | Cumprido. Os 3 arquivos fora da lista são a pendência M-02 da T16, endereçada a esta tarefa |
| Teste para cada comportamento novo, que falharia sem o código | Cumprido. A falha antes do código está na entrega (`Cannot find module` nos dois arquivos). Os 6 casos do passo 1 estão no arquivo, cada um afirmado no banco (linhas de `demanda`, `entrada_bruta`, `entrada_pendente`, `evento`, `execucao_agente`, `pgboss.job` e a sequência), e não só pelo status. Rollback, C-36, C-15, C-21 e o 403 do token cobrem os controles que passam pela rota nova. Exceção: o ramo 202 da rota (M-02) |
| Sem segredo, `.env` ou dado pessoal real | Cumprido. Só `SENTINELAS`, "Pessoa Ficticia", domínio `.test`, uuid fictício e o token gerado no próprio teste. O teste de C-21 confere que o token e os sentinelas não aparecem no log |
| Entrada externa validada com Zod; erro sem vazar detalhe | Cumprido. `entradaSchema` (`discriminatedUnion`) valida o corpo na `rota()`. O 400 traz só `campo` e `mensagem`, sem sentinela. O 404, o 409 e o 403 trazem as mensagens fixas |
| Banco: migration, migrator, RLS e guarda | Não se aplica. A T17 não tem migration nem tabela nova: `entrada_bruta` é da T05 |
| Nada duplica função que já existe | Cumprido. Reaproveita `criarDemanda`, `criarDemandaSchema.extend`, `RE_ID_DEMANDA`, `LIMITE_NOME`, `PAPEIS_SOLICITANTE`, `MENSAGEM_NAO_ENCONTRADO` e `MENSAGENS_ACESSO`. A cópia local `somentePessoa` saiu de `[id]/route.ts` e virou `exigirAtorPessoa`, em um lugar só. `apagarEmDe` não tem par no repositório: `fuso.ts` não soma dias |
| Textos em pt-BR; axe | Textos em pt-BR, com a mensagem do 409 fixada no plano. O axe não se aplica, porque a T17 não tem tela |
| Minor em Pendências; só Critical e Important bloqueiam | Cumprido. Não há Critical nem Important, e os Minor estão abaixo |
| `/code-review` e `/security-review` no PR | É da `08-revisao`, não desta etapa |

### Desvios declarados pelo engenheiro

1. **`exigirAtorPessoa` em `src/modules/acesso/ator-pessoa.ts`, com teste, e troca em `[id]/route.ts`.** Aceito. É o
   M-02 da T16, fechado como pedido.
2. **`t?: Transacao` em `registrarEntrada`.** Aceito. É a G3.8.
3. **`obterTextoRecebido` com `{ db, config.retencaoDias }`.** Aceito. Quem passa `Deps` segue compatível, e o worker
   da T31 pode chamar a função sem Better Auth.
4. **Testes de rota em `entrada.test.ts`.** Aceito. O plano lista um arquivo de teste só, e os casos de rota
   (400, 409, 404, 403, 401, C-15, C-21) cobrem o que a T17 diz cobrir.

### Pareceres (todos Minor)

- **M-01:** `src/modules/demandas/entrada.ts:35` (`texto: z.string().max(LIMITE_TEXTO_BRUTO)`) e
  `src/modules/demandas/schemas.ts:31` (`textoLivre`).
  - **Problema:** nenhum schema de texto recusa o caractere nulo (`\u0000`). O JSON aceita esse caractere, mas o
    Postgres recusa em coluna `text` (erro 22021). Um corpo com esse caractere passa no Zod e quebra no `insert`. A
    resposta vira 500 em vez de 400, e o número da sequência já foi gasto. A mensagem do 500 sai genérica, então
    nada vaza.
  - **Razão:** o texto bruto é o campo mais provável de trazer caractere de controle, porque vem colado de e-mail ou
    de mensagem. Ainda assim, o defeito não é da T17: `textoLivre` (T15) tem o mesmo comportamento em todos os campos.
    A correção certa é uma só, no schema de base, e não um remendo só no `texto`. Por isso fica como Minor, para a
    `08-revisao` ou para a próxima tarefa que tocar `schemas.ts`. O ajuste: recusar `\u0000` em `textoLivre`, no
    `texto` da entrada e no nome do solicitante, com mensagem de campo.
- **M-02:** `src/app/api/demandas/entrada/route.ts:10`.
  - **Problema:** o ramo `{ status: 202, json: { entradaId } }` não tem teste e hoje não pode ser alcançado, porque
    `registrarEntrada` nunca devolve `pendente`.
  - **Razão:** o ramo existe para o tipo `ResultadoEntrada` do plano fechar no `typecheck`, e é uma linha. Mas é
    código sem teste. A T28, que liga o caminho, precisa entrar com o teste do 202 `{ entradaId }` pela rota.
- **M-03:** `src/modules/demandas/entrada.ts:71-79` (origem descartada quando não há texto).
  - **Problema:** se a pessoa preenche a origem e deixa o texto vazio, a origem some sem aviso. A demanda nasce, e a
    resposta é 201.
  - **Razão:** a decisão está certa para o banco. O `CHECK` de `entrada_bruta` pede texto enquanto não há expurgo, e
    origem sem texto não descreve nada. O risco fica na tela: a T39 (Nova demanda) precisa deixar a origem desligada
    enquanto o texto estiver vazio, ou avisar. Senão a pessoa acha que a origem foi guardada.
- **M-04:** `src/modules/demandas/texto-recebido.ts:20` (`DIA_MS`) e `src/modules/demandas/entrada.test.ts:23`.
  - **Problema:** a constante de um dia em milissegundos aparece duas vezes, uma no código e outra no teste.
  - **Razão:** é pequeno. O que importa é a regra "recebida + prazo", que já está exportada em `apagarEmDe`. A T31
    deve usar `apagarEmDe`, ou a mesma comparação no SQL, e não uma terceira cópia. Assim a data que a tela mostra é a
    mesma em que o expurgo apaga.

## Decisões tomadas

- **Status `pronto`:** nenhum achado é Critical ou Important. Os quatro são Minor e ficam com as tarefas que já vão
  tocar o código.
- **Os 4 desvios foram aceitos:** o primeiro fecha o M-02 da T16, e os outros seguem a G3.8 ou só restringem o tipo de
  entrada, sem mudar o comportamento.
- **M-01 não devolve a T17:** o defeito vem do schema de base da T15 e vale para todos os campos de texto. Corrigir só
  o `texto` deixaria a regra em dois lugares.
- **Validação do commit:** rodei a suíte inteira, o lint e o typecheck, sem me apoiar só na entrega. Assim, a revisão
  vale para o commit `eab8cf7`.

## Pendências

- **`08-revisao` ou próxima tarefa que tocar `schemas.ts` (M-01):** recusar `\u0000` em `textoLivre`, em
  `nomeSolicitante` e no `texto` de `entrada.ts`, com 400 no campo. Isso evita 500 e número de sequência gasto.
- **T28 (M-02):** teste do 202 `{ entradaId }` pela rota, junto com a gravação de `entrada_pendente` e a resolução de
  `entradaPendenteId`. Ver também as pendências da entrega do engenheiro.
- **T39 (M-03):** campo de origem desligado, ou com aviso, enquanto o texto colado estiver vazio.
- **T31 (M-04):** usar `apagarEmDe` (ou a mesma regra) no expurgo.
- **T21 e as próximas rotas só de pessoa:** usar `exigirAtorPessoa` de `src/modules/acesso/ator-pessoa.ts`. O M-02 da
  T16 está fechado.
- **T40:** a tela de detalhe lê o texto por `obterTextoRecebido`, depois de `exigirPessoaNaPagina` (C-04). Não existe
  rota GET do texto, e o plano não pede uma.
- **Herdados da T16, sem mudança:** M-01 (T35), M-03 (limite de 30 em `demandas.test.ts`), M-04 (formatação), M-05
  (`agentesEmAndamento`, T27 e T40), M-06 (`z.coerce`).
- **Aviso `[UNDICI-FETCH-patch]` na suíte:** apareceu também na minha rodada, igual à da T16. Não quebra nada e fica
  para a `08-revisao` localizar.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat eab8cf78e43233ef896cdc30107685d7ea8fa247` — 9 arquivos: os 4 da T17, os 2 de `ator-pessoa`, `[id]/route.ts`, a entrega e `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -n 5` — HEAD em `eab8cf7`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show eab8cf78e43233ef896cdc30107685d7ea8fa247 -- src/modules/demandas/entrada.ts src/modules/demandas/texto-recebido.ts src/app/api/demandas/entrada/route.ts src/modules/acesso/ator-pessoa.ts src/modules/acesso/ator-pessoa.test.ts src/app/api/demandas/[id]/route.ts` — diff do código de produção e do teste de `ator-pessoa`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, ramo `construcao/DEC-DEM-20261022-0001-v1`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 85 de 85 arquivos, 1455 de 1455 testes

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
