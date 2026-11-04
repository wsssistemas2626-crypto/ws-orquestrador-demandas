---
pedido: DEC-DEM-20261104-0011-v1
etapa: 01-reproducao
agente: qa-funcional
leu: [contrato-passagem.md, pedido.json, src/modules/dados-pessoais/minimizar.ts, src/modules/dados-pessoais/minimizar.test.ts, src/modules/dados-pessoais/detectores.ts, src/modules/agentes/entrada-agente.ts, src/modules/demandas/consultas.ts, src/components/dados-da-demanda.ts, src/lib/reduzir-erro.ts, src/lib/sentry.ts, "src/app/api/demandas/[id]/especificacoes/route.ts", "src/app/api/demandas/[id]/pareceres-risco/route.ts", "src/app/api/demandas/[id]/pacotes-decisao/route.ts", src/modules/especificacoes/servico.ts, src/modules/pareceres-risco/servico.ts, src/modules/pacotes-decisao/criar.ts, src/modules/versoes.ts (travarDemanda), src/app/api/demandas/nomes-antes-de-gravar.test.ts (cabeçalho), src/app/api/demandas/demandas.test.ts (470-494), src/app/api/pacotes-decisao/pedido.test.ts (295-340), test/sentinelas.ts (nome), DEC-DEM-20261103-0009-v1/04-maestro.md, DEC-DEM-20261104-0010-v1/04-maestro.md, pareceres/2026-11-04-gestao-riscos-M-1-do-0009.md]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Cinco defeitos, todos reproduzidos pela leitura do código da base deste ramo (`main` `fb675ee`, 0.1.9). Não executei
nada: o qa-funcional não tem Bash. O "resultado obtido" de cada passo foi deduzido da semântica das regex e do fluxo
do código citado, linha a linha. Os passos abaixo servem para a 04-regressao e para a triagem confirmarem rodando.
Todos os nomes, e-mails e textos são fictícios.

**Severidade geral do pedido: média.** Ela vem do D-1: dado pessoal (prenome de terceiro) chega ao provedor de IA. Não
é alta porque hoje os agentes estão desligados, com teto 0, sem chave e sem token emitido (parecer da gestao-riscos,
cenário 1). No dia em que um agente for ligado, a probabilidade sobe para 4 (cenário 2, nível 12).

### D-1 (M-1 do 0009): o primeiro nome ou o sobrenome sozinho sai em claro para o agente. Severidade: média

**Causa aparente.** `padraoDoNome` (`src/modules/dados-pessoais/minimizar.ts:36-40`) monta uma regex só, com o nome
inteiro (`partes.join('\\s+')`). Só a sequência completa do `solicitanteNome` atual casa. Uma parte sozinha não casa.

**Pré-condição.** Ambiente de teste (Testcontainers ou o banco de teste do e2e), um token de serviço de agente (por
exemplo `risco`) e uma sessão de pessoa.

**Passos (unidade, sem banco):**

1. Chamar `minimizar('A Joana pediu o relatório. Falei com a Ficticia ontem. Joana Ficticia confirmou.', { nomes: ['Joana Ficticia'] })`.

- **Obtido:** `'A Joana pediu o relatório. Falei com a Ficticia ontem. [nome removido] confirmou.'`
- **Esperado (ESP do pedido):** `'A [nome removido] pediu o relatório. Falei com a [nome removido] ontem. [nome removido] confirmou.'`

**Passos (API de quem não é pessoa):**

1. Como pessoa, criar a demanda com `solicitanteNome: 'Joana Ficticia'`, `titulo: 'Relatório da Joana'` e
   `contexto: 'A Joana pediu o relatório mensal.'`.
2. Com o token do agente `risco`, fazer `GET /api/demandas/<id>`.
3. Com o mesmo token, fazer `GET /api/demandas?limit=100`.

- **Obtido:** em 2, `titulo: 'Relatório da Joana'` e `contexto: 'A Joana pediu o relatório mensal.'`, em claro
  (`vistaDaDemandaPara`, `consultas.ts:225-250`, usa `nomesDoSolicitante` = `['Joana Ficticia']`). Em 3, o item sai com
  `titulo: 'Relatório da Joana'` (`listarDemandasPara`, `consultas.ts:303-307`). O mesmo vale para as vistas mínimas de
  ESP, RSK e DEC (GET e o 201 dos POST), que usam `nomesDaDemanda` e o mesmo `minimizarValor`.
- **Esperado:** `'Relatório da [nome removido]'` e `'A [nome removido] pediu o relatório mensal.'`.

**Passos (entrada do worker):**

1. Com a demanda do passo anterior, chamar `montarEntrada(db, 'insumo_tecnico', 'demanda:<id>')`.
2. Criar uma entrada pendente com `texto: 'Oi, aqui é a Joana, do financeiro. Preciso do relatório.'` e
   `solicitanteNome: 'Joana Ficticia'`. Chamar `montarEntrada(db, 'orquestrador', 'entrada:<uuid>')`.

- **Obtido:** em 1, o `conteudo` (bloco `<dados>`) tem `"titulo":"Relatório da Joana"` e `"contexto":"A Joana pediu o
  relatório mensal."` (`entrada-agente.ts:210-211`, `nomes = [d.solicitanteNome]`). Em 2, o `textoRecebido` tem
  `"Oi, aqui é a Joana, do financeiro..."` (`entrada-agente.ts:195`).
- **Esperado:** `Joana` vira `[nome removido]` nos dois.

**O que tem de continuar igual (contraprova, deve passar hoje e depois):**

1. Como pessoa, `GET /api/demandas/<id>` devolve o `contexto` original, `'A Joana pediu o relatório mensal.'`.
2. O Pedido de Construção de um DEC aprovado dessa demanda leva título, descrição, ESP e RSK originais
   (`pedido.test.ts:295-340` cobre só o nome completo `'Joana Fictícia Teste'`; falta o caso da parte sozinha).

**Casos da ESP, com o resultado esperado depois da correção** (hoje todos saem como no texto de entrada, salvo o
nome completo):

| Nome do solicitante | Texto | Esperado |
|---|---|---|
| `Joana Ficticia` | `Joana Ficticia confirmou` | `[nome removido] confirmou` (um marcador só: nome completo antes das partes) |
| `Ana dos Santos` | `A Ana pediu os dados dos clientes; Santos aprovou.` | `A [nome removido] pediu os dados dos clientes; [nome removido] aprovou.` (`dos` fica nas duas posições) |
| `Bruno Dias Lima` | `Prazo de 30 dias; suco de lima; Lima aprovou.` | `Prazo de 30 dias; suco de lima; [nome removido] aprovou.` |
| `Bruno Dias Lima` | `Dias depois o Bruno ligou.` | `[nome removido] depois o [nome removido] ligou.` (falso positivo aceito na ESP) |
| `Carla Rosa Campos` | `camisa rosa, os campos do formulário; Rosa e Campos assinaram` | `camisa rosa, os campos do formulário; [nome removido] e [nome removido] assinaram` |
| `Joana Ficticia` | `JOANA pediu` | `[nome removido] pediu` (começa por maiúscula; o resto sem diferença de caixa) |
| `Joana Ficticia` | `a joana pediu` | `a joana pediu` (risco que sobra, aceito no RSK) |
| `Joana Ficticia` | `Escreva para joana.ficticia@exemplo.test ou Joana@exemplo.test` | `Escreva para [e-mail removido] ou [e-mail removido]` |
| `Joana Conceição Ficticia` | `a Conceição pediu; CONCEIÇÃO aprovou` | `a [nome removido] pediu; [nome removido] aprovou` |
| `Joana Conceição Ficticia` | `a Conceicao pediu` (sem acento) | Ambíguo na ESP; ver Pendência 1 |
| `Removido Ficticia` | `[e-mail removido] Removido` | `[e-mail removido] [nome removido]` (nada trocado dentro de marcador) |
| `Joana Ficticia` | `Joanabela e Ficticias` | igual (parte não casa como pedaço de outra palavra) |

### D-2 (agravante do M-1): a dica do nome e o aviso de minimização prometem mais do que o sistema faz. Severidade: média

**Causa aparente.** Os textos de `src/components/dados-da-demanda.ts:29-30` (`avisoMinimizacao`) e `:34` (`dicaNome`).

**Passos:**

1. Como pessoa, abrir `/demandas/nova`.
2. Ler a dica do campo "Nome do solicitante (obrigatório)" (`CamposDaDemanda.tsx:94`).
3. Escolher "Pedir ao agente orquestrador que proponha os campos" e ler o alerta de informação
   (`FormularioNovaDemanda.tsx:174`).
4. Preencher o nome `Joana Ficticia`, colar `Oi, aqui é a Joana, do financeiro.` e enviar.

- **Obtido:** em 2, "Digite o nome. Ele não é enviado ao agente de IA."; em 3, "O agente recebe só o texto, sem o
  nome do solicitante, sem a origem e ...". Em 4, o agente recebe `Joana` em claro (D-1, entrada do orquestrador). Quem
  preenche entende que o nome nunca chega ao agente.
- **Esperado:** a dica diz que o campo não vai ao agente e pede para não repetir o nome no texto (sugestão da ESP: "O
  campo não vai ao agente de IA. Evite repetir o nome no texto: o sistema troca o nome do solicitante, mas não o de
  outras pessoas."). O aviso diz que o nome do solicitante e as partes dele viram marcador, e que o nome de outras
  pessoas não vira. A mesma dica aparece na tela de edição (mesmo componente).

### D-3 (B-3 do 0010): o 201 dos 3 POST minimiza com o nome lido antes da trava. Severidade: baixa

**Causa aparente.** Nas 3 rotas (`especificacoes/route.ts:17`, `pareceres-risco/route.ts:17`,
`pacotes-decisao/route.ts:18`), `nomesDaDemanda(deps.db, params.id)` roda fora da transação, antes de
`travarDemanda` (`versoes.ts:18-22`, `SELECT ... FOR UPDATE`) dentro do serviço. A vista do 201 usa esses nomes. A
linha travada (`atual`/`d`) já tem o `solicitanteNome` certo e é descartada.

**Passos (teste de integração com banco; a corrida não é reproduzível à mão de forma confiável):**

1. Como pessoa, criar a demanda com `solicitanteNome: 'Joana Ficticia Antiga'`.
2. Envolver `nomesDaDemanda` (como `nomes-antes-de-gravar.test.ts` já faz com `vi.mock`) para, depois da leitura
   real, editar a demanda como pessoa para `solicitanteNome: 'Carla Ficticia Nova'` (o commit acontece aí) e só então
   devolver o resultado da leitura.
3. Com o token do agente `insumo_tecnico`, fazer `POST /api/demandas/<id>/especificacoes` com
   `descricaoObjetiva: 'Falar com Carla Ficticia Nova sobre o relatório.'` (e os campos exigidos pelo tipo).
4. Repetir 1 a 3 para `pareceres-risco` (token `risco`, `resumo` com o mesmo texto) e para `pacotes-decisao` (token
   `consolidacao`, `resumoExecutivo` com o mesmo texto, depois de criar ESP e RSK).

- **Obtido:** 201 com `descricaoObjetiva`/`resumo`/`resumoExecutivo` = `'Falar com Carla Ficticia Nova sobre o
  relatório.'` em claro: a vista minimizou com `['Joana Ficticia Antiga']`. No DEC, `demandaTitulo` e
  `demandaDescricao` vêm da linha travada (já com o nome novo, se ele estiver no título), mas também são minimizados com
  o nome antigo.
- **Esperado:** `'Falar com [nome removido] sobre o relatório.'`. Os nomes vêm da linha travada, dentro da transação.
  Se a leitura falhar, nada é gravado (comportamento da 0.1.9). 404, 409, 429 e 400 com `faltando` continuam iguais.

### D-4 (B-2 do 0010): `reduzirErro` aceita `name` que não é string, ou que muda entre duas leituras. Severidade: baixa

**Causa aparente.** `src/lib/reduzir-erro.ts:56`: `classeAceita(e.name) ? e.name : 'Error'`. Não confere o tipo, e
lê `e.name` **duas vezes**. `RegExp.prototype.test` converte o argumento para string.

**Passos (unidade):**

1. `const e = new Error('x'); let n = 0; Object.defineProperty(e, 'name', { get: () => (n++ === 0 ? 'TypeError' : 'Joana Ficticia') });`
   e chamar `reduzirErro(e)`.
2. `const e = new Error('x'); let n = 0; e.name = { toString: () => (n++ < 2 ? 'TypeError' : 'Joana Ficticia') } as never;`
   e chamar `reduzirErro(e)` e depois `capturarErro(e)` com o transporte de teste do Sentry.
3. `const e = new Error('x'); e.name = ['TypeError'] as never;` e chamar `reduzirErro(e)`.

- **Obtido:** em 1, `{ classe: 'Joana Ficticia' }`: a primeira leitura passa em `classeAceita`, a segunda é devolvida
  sem conferência. Em 2, `classe` é o próprio objeto (as duas conversões das regex dão `TypeError`). A terceira conversão,
  no título de `capturarErro` (`sentry.ts:52`), dá `'Joana Ficticia'`, e esse é o título enviado ao Sentry. Em 3,
  `classe` é o array `['TypeError']`, fora do tipo `ErroReduzido`.
- **Esperado:** nos três, `{ classe: 'Error' }` (mais o `code`, se houver), e o título do Sentry é `Error`. A correção
  precisa ler `e.name` uma vez só, numa variável local, e usar só essa leitura. O `typeof` sozinho não fecha o passo 1.

### D-5 (B-4 do 0010): `capturarErro` marca o erro antes de enviar. Severidade: baixa

**Causa aparente.** `src/lib/sentry.ts:47-50` grava em `jaEnviados` antes de `reduzirErro` (`:51`) e de
`Sentry.captureException` (`:55`). Se algo no meio lança, o objeto fica marcado sem ter ido.

**Passos (unidade, com o transporte de teste do Sentry):**

1. `const e = new Error('x'); Object.defineProperty(e, 'code', { get() { throw new Error('falha') } });`
   (`lerCode` faz `'code' in x` e depois lê `.code`, `reduzir-erro.ts:38-39`). Funciona também depois da correção do
   D-4. Alternativa da ESP: `vi.mock` de `reduzirErro` lançando na primeira chamada.
2. Chamar `capturarErro(e)` dentro de `try/catch`.
3. Fazer a leitura de `code` parar de lançar (ou desarmar o mock) e chamar `capturarErro(e)` de novo.

- **Obtido:** em 2, `capturarErro` lança e não chama `captureException`. Em 3, sai pelo `jaEnviados.has(e)`
  (`sentry.ts:48`) sem enviar. Total: zero eventos no Sentry para esse erro. Com a base de hoje, `e.name = Symbol('x')`
  também faz `reduzirErro` lançar (`FORMATO_CLASSE.test` com símbolo dá `TypeError`).
- **Esperado:** em 3, um evento enviado; o objeto só é marcado depois de `captureException` voltar. O envio continua
  único por objeto quando dá certo (B-a do 0008: `console.error` e `onRequestError` com o mesmo objeto).

### Arquivos suspeitos

- `src/modules/dados-pessoais/minimizar.ts` (`padraoDoNome`, `minimizar`; lista de partículas exportada nova): D-1.
- `src/components/dados-da-demanda.ts:29-30,34`: D-2.
- `src/app/api/demandas/[id]/{especificacoes,pareceres-risco,pacotes-decisao}/route.ts` e os serviços
  `src/modules/especificacoes/servico.ts`, `src/modules/pareceres-risco/servico.ts`,
  `src/modules/pacotes-decisao/criar.ts`: D-3.
- `src/lib/reduzir-erro.ts:54-59`: D-4.
- `src/lib/sentry.ts:46-56`: D-5.

### O que a correção vai tocar além do código (para a triagem)

- **Testes cujo esperado muda com a regra nova (não são defeito, é efeito da regra):**
  - `src/modules/dados-pessoais/minimizar.test.ts:251-253` e `src/app/api/demandas/demandas.test.ts:489-490`: os nomes
    fictícios `Ana Exemplo Lima` e `Bruno Exemplo Rocha` têm a parte `Exemplo` em comum. Com a regra nova, o nome do
    outro sai parcialmente trocado: `'Bruno [nome removido] Rocha'`.
  - `src/modules/dados-pessoais/minimizar.test.ts:204`: com o nome `'nome removido'`, a parte `nome` troca
    `'Nome também'`. O esperado passa a ser `'[nome removido] assinou; [nome removido] também.'`.
  - Os fixtures com `Maria Ficticia Teste`, `Pessoa Ficticia` e `Pessoa Ficticia Sentinela` (`test/sentinelas.ts:9`)
    vão trocar `Teste`, `Pessoa` e `Exemplo` com inicial maiúscula em qualquer texto da mesma demanda. Vale conferir
    esses esperados em `vistas-para-agente.test.ts`, `entrada-agente.test.ts` e `demandas.test.ts`.
  - `src/components/dados-da-demanda.test.ts:54-55` e `src/app/(painel)/demandas/nova/formularios.test.ts:66,121`:
    conferem as frases antigas da dica e do aviso.
  - `src/app/api/demandas/nomes-antes-de-gravar.test.ts`: simula a falha em `nomesDaDemanda`. Com os nomes vindos da
    linha travada, esse ponto de falha deixa de existir na rota, e o teste tem de ser refeito para manter "falha não
    grava nada" (ESP do B-3).
- **Quem chama os serviços do D-3:** `src/modules/agentes/executar.ts:100,105,113` (usa `.id`) e as Server Actions
  `src/app/(painel)/demandas/[id]/{especificacoes/nova,pareceres-risco/novo,pacotes-decisao/novo}/acoes.ts`. Se a
  correção mudar o tipo de retorno, os três precisam ser ajustados. O teste estático `test/estatico/pacote-sem-extras.test.ts`
  barra chamada de `criarPacoteDecisao` em `src/app/` com 5 ou mais argumentos.

### Casos exploratórios sugeridos para a 04-regressao

1. Nome digitado em minúscula no campo (`joana ficticia`) e `Joana pediu` no texto: tem de trocar. A regra da
   maiúscula vale para o texto, não para o nome.
2. Parte que começa por letra acentuada: nome `Érica Ícaro Ficticia`, texto `a Érica e o ÍCARO`.
3. Texto em NFD (acento decomposto, comum em texto colado do macOS) com o nome gravado em NFC: `Conceição` não casa
   hoje nem no nome completo.
4. Partícula com maiúscula no texto (`Dos Santos`, `Da Silva`, `Van Der Berg`): `Dos` e `Da` ficam, pela lista, sem
   diferença de caixa.
5. Nome com hífen ou apóstrofo (`Ana-Clara Ficticia`, `Joana D'Ávila`): a ESP não diz se `Clara` ou `Ávila` sozinhos são
   partes (Pendência 2).
6. Sufixos comuns: `Filho`, `Neto`, `Júnior`, `Sobrinho` (`Carlos Ficticio Neto`, texto `o Neto do cliente`).
   Candidatos a entrar na lista de partículas; a ESP não diz.
7. Parte igual a nome de lugar ou produto com inicial maiúscula: `Paulo` em `São Paulo`, `Santos` como cidade,
   `Vitória`, `Natal`. É falso positivo da mesma família do "Dias depois", e convém registrar como aceito.
8. Nome no limite de 200 caracteres com muitas partes curtas, sobre um texto de 100.000 caracteres: tempo de
   `minimizar` (uma regex por parte).
9. Idempotência: `minimizar(minimizar(t, op), op) === minimizar(t, op)` para todos os casos da tabela do D-1.
10. A pessoa e o Pedido de Construção com o texto `A Joana pediu`: original nos dois (CA 3 do pedido).

## Decisões tomadas

- Severidade geral média, pelo D-1: prenome de terceiro vai ao provedor de IA. Os agentes desligados hoje seguram o
  nível, não o impacto.
- D-2 com severidade média: ele induz quem preenche a repetir o nome achando que está protegido, e por isso agrava o D-1.
- D-3, D-4 e D-5 com severidade baixa, a mesma da revisão do 0010: o caminho exige corrida ou erro montado de propósito.
- No D-4, acrescentei o caso do getter de `name` que muda entre leituras (`reduzir-erro.ts:56` lê `e.name` duas vezes).
  Sem ele, uma correção só com `typeof` passaria no teste e deixaria o furo.
- No D-5, usei o getter de `code` que lança para fazer `reduzirErro` lançar. Ele não depende do D-4, que, depois de
  corrigido, tira o caminho do `Symbol`.
- Resultado obtido por leitura do código, sem execução: o agente não tem Bash. Glob e Grep estavam disponíveis e foram
  usados.
- Li também o cabeçalho de `nomes-antes-de-gravar.test.ts`, trechos de `demandas.test.ts` e `pedido.test.ts`,
  `minimizar.test.ts` e `versoes.ts`. Todos são arquivos rastreados do repositório, e servem para apontar o impacto nos
  testes.

## Pendências

1. **Para `analista-requisitos` / `tech-lead` (ambiguidade da ESP, acento):** a ESP diz "sem diferença de caixa no
   resto e de acento, como hoje". Só que hoje há diferença de acento: a regex `giu` não troca `Conceicao` pelo nome
   `Conceição`. A ESP também pede teste de "nome com acento e sem acento". Falta decidir se a parte (e o nome completo)
   deve casar sem acento. A leitura mais protetora é que sim.
2. **Para `tech-lead`:** a ESP não define "parte" para nome com hífen ou apóstrofo, nem diz se sufixos (`Filho`, `Neto`,
   `Júnior`) entram na lista de partículas.
3. **Para `tech-lead`:** o falso positivo de uma parte em comum com o nome de outra pessoa (`Exemplo` no caso de `Ana
   Exemplo Lima` e `Bruno Exemplo Rocha`) não está na ESP. Ele reduz a exposição de terceiros e parece aceitável, mas
   muda o esperado de testes existentes.
4. **Fora do escopo deste pedido (parecer da gestao-riscos, item 3 e seção 5):** orientar quem preenche ESP e RSK a
   escrever "o solicitante"; o Pedido de Construção leva o nome original para o `/construir`, que roda na assinatura
   pessoal. Ficam com Fabiano e `juridico-contratos`.

## Comandos executados

Nenhum.

## Critério de pronto atendido

- [x] (01) os passos de reprodução estão completos e o resultado obtido está descrito
