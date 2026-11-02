---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T24-testes
agente: qa-automacao
leu: [contrato-passagem.md, 06-T24-qa-automacao.md (entrega da 1ª passada), 06-T24-engenheiro-backend.md (2ª volta, pelo git show ea995db), 06-T24-tech-lead.md (2ª revisão), git show ea995db, git show --stat f83665f 5a59c01 dcc0cd0, git show bd8db7e -- src/modules/agentes/entrada-agente.test.ts, src/modules/dados-pessoais/minimizar.ts, src/modules/dados-pessoais/minimizar.test.ts, src/modules/dados-pessoais/detectores.ts, src/modules/agentes/entrada-agente.test.ts (linhas 1 a 280 e 415 a 455)]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

2ª passada dos testes da T24, depois da correção de `minimizar` no `ea995db`. O `f83665f` e o `5a59c01` só mexem no
registro e na entrega do engenheiro. O `dcc0cd0` é a revisão aprovada. **O defeito da devolução está corrigido.** Os
meus dois testes de regressão do `bd8db7e` passam e não mudaram. A suíte inteira está verde, e não achei defeito novo.

### Conferência da correção

- **Ordem nova** (`minimizar.ts:54` a `:64`): cabeçalho, detectores (e-mail, CNPJ, CPF, telefone) e só depois o nome.
  O e-mail sai inteiro antes que o nome possa desmontá-lo, seja qual for o formato do usuário. Testei três formatos
  além dos da 1ª passada:
  - `nome.x@…`, o caso que travar o `@` não resolveria;
  - nome no domínio (`contato@ficticia.test`). Antes da correção, esse caso também vazava, porque `[` não casa no
    domínio do detector;
  - `NOME_2@…`.
- **Partição pelos marcadores** (`trocarNome`):
  - Com vários nomes na lista, o marcador posto por um nome não é estragado pelo nome seguinte, em qualquer ordem.
    Também não é estragado por nomes como `nome` e `removido`.
  - Um texto só de marcadores colados passa igual. As posições pares do `split` ficam vazias.
- **De ponta a ponta:**
  - pelo montador, na consolidação: o nome em e-mails da demanda, da ESP e do RSK, com resultado exato por campo e
    sem `@` no conteúdo;
  - num texto só com cabeçalho, e-mail com o nome, telefone e o nome solto: as três etapas em ordem.
- **Idempotência:** `minimizar(minimizar(t, op), op) === minimizar(t, op)` nos testes novos de `minimizar`.

### Critério da tarefa → teste que o cobre

| Critério | Arquivo | Teste |
|---|---|---|
| CA-20.1 (e-mail, telefone e CPF viram marcador) | `src/modules/dados-pessoais/minimizar.test.ts` | `CA-20.1: e-mail, telefone e CPF fictícios viram marcadores`; `%s vira %s, e o resto do texto fica` (10 formatos); `todas as ocorrências, não só a primeira`; `nada dos quatro tipos sobra no resultado, pelos próprios detectores` |
| CA-20.1 pelo orquestrador | `src/modules/agentes/entrada-agente.test.ts` | `CA-20.1: e-mail, telefone e CPF fictícios do texto bruto não chegam`; `orquestrador recebe só o texto minimizado, sem nome, papel e origem` |
| CA-20.1 com o nome do solicitante no e-mail (defeito da 1ª passada) | `minimizar.test.ts` | `regressão RF-20: e-mail cujo usuário é o nome do solicitante vira o marcador de e-mail, sem sobrar o domínio`; `regressão RF-20: nome no começo do usuário (nome.x@) ou no domínio do e-mail não desmonta o e-mail` (novo); `cabeçalho, e-mail com o nome, telefone e o nome solto juntos: a ordem completa num texto só` (novo) |
| Idem, pelo montador | `entrada-agente.test.ts` | `regressão RF-20 (CA-20.1 pelo orquestrador): e-mail com o nome do solicitante como usuário não deixa o domínio no conteúdo`; `regressão RF-20 (consolidação): e-mail com o nome do solicitante no usuário ou no domínio vira marcador em demanda, ESP e RSK` (novo) |
| CA-20.2 (sem nome do solicitante nem anexo) | `entrada-agente.test.ts` | `CA-20.2: insumo_tecnico não recebe nome do solicitante nem referência de anexo`; `recebe só os campos permitidos da demanda, minimizados, e devolve o id da demanda` |
| RF-20 (lista de permissão por agente) | `entrada-agente.test.ts` | `a lista é a do plano`; `nenhuma lista tem campo do solicitante, de anexo, de autoria, de status ou de id`; `risco recebe demanda + ESP minimizadas`; `consolidacao recebe demanda + ESP + RSK` |
| RF-20 (nome do solicitante no texto) | `minimizar.test.ts` e `entrada-agente.test.ts` | `o nome inteiro vira marcador…`; `nome com acento em maiúscula também vira marcador`; `letra acentuada colada ao nome conta como parte de outra palavra`; `o nome colado a um marcador, fora dele, ainda vira marcador`; `o nome do solicitante citado no texto vira marcador`; `o nome do solicitante citado na ESP e no RSK vira marcador na consolidação` |
| RF-20 (o nome não estraga marcador, risco da ordem nova) | `minimizar.test.ts` | `nome igual a palavra de marcador ("%s") não estraga marcador, nem chamando de novo` (8, do engenheiro); `vários nomes (%j): o marcador posto por um não é estragado pelo seguinte` (3, novo); `texto que só tem marcadores, com o nome igual a palavra de marcador, passa igual` (novo) |
| C-23 (cabeçalhos de e-mail e todo campo de texto) | `minimizar.test.ts` e `entrada-agente.test.ts` | `C-23: linhas de cabeçalho de e-mail encaminhado saem inteiras, em pt-BR e em inglês`; `a linha "%s: ..." sai inteira, com a quebra de linha` (12); `maiúscula ou minúscula, …`; `quebra de linha CRLF…`; `C-23: contexto com e-mail fictício e um cabeçalho "De: …" não chegam`; listas da ESP e do RSK em `risco recebe…` e `consolidacao recebe…` |
| C-24 (texto do cliente delimitado como dado) | `entrada-agente.test.ts` | `C-24: o conteúdo fica entre <dados> e </dados>, e um </dados> do cliente não fecha o bloco`; `abertura e fechamento falsos, …`; `chave com marca de bloco também é neutralizada, …`; `o conteúdo do bloco é uma linha só de JSON…`; `em todo agente o conteúdo passa pelo delimitador` |
| G3.10 (id validado antes do banco) | `entrada-agente.test.ts` | `%s com "%s" → nao_encontrado, sem consultar o banco` (14); `%s com %j (espaço ou quebra nas pontas) → nao_encontrado, sem consultar o banco` (5); `%s: aceita o id de versão exatamente quando RE_ID_VERSAO aceita e o prefixo é %s…` (2) |

### Testes acrescentados nesta passada (7; só em arquivos `*.test.ts`)

`src/modules/dados-pessoais/minimizar.test.ts` (6):
- `regressão RF-20: nome no começo do usuário (nome.x@) ou no domínio do e-mail não desmonta o e-mail`. Com a ordem
  antiga, falharia: `ficticia.contato@…` daria `[nome removido][e-mail removido]`, e `contato@ficticia.test` daria
  `contato@[nome removido].test`, com o domínio exposto.
- `vários nomes (%j): o marcador posto por um não é estragado pelo seguinte` (3 casos, resultado exato). Sem a
  partição, `['Pessoa Ficticia', 'nome']` daria `[[nome removido] removido]`.
- `cabeçalho, e-mail com o nome, telefone e o nome solto juntos: a ordem completa num texto só`.
- `texto que só tem marcadores, com o nome igual a palavra de marcador, passa igual`.

`src/modules/agentes/entrada-agente.test.ts` (1):
- `regressão RF-20 (consolidação): e-mail com o nome do solicitante no usuário ou no domínio vira marcador em demanda,
  ESP e RSK`. Confere campo a campo e, depois, que o conteúdo não tem `@`, `empresa-exemplo` nem `ficticia.test`.

Não pude rodar os testes novos sobre o código anterior ao `ea995db`, porque `git checkout` está fora da lista
**Pode**. A falha com a ordem antiga foi deduzida do código antigo, que está no diff do `ea995db`.

### Resultado

- T24 isolada: 2 arquivos, **113 de 113** (106 de antes mais 7 novos).
- `pnpm test`: 116 arquivos, **2262 de 2262** (os 2255 da 2ª revisão mais 7 novos), nenhum falhou.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.
- `git diff`: 2 arquivos de teste, com 52 linhas acrescentadas e nenhuma removida. Nenhum `.skip`, `.only` ou `.todo`,
  e nenhuma asserção afrouxada. Desde o `bd8db7e`, o engenheiro só acrescentou linhas a `minimizar.test.ts`
  (`git show ea995db`), e `entrada-agente.test.ts` não mudou.

### Estabilidade e relógio

Os testes novos de `minimizar` são puros, sem banco, sem relógio e sem estado entre chamadas. O teste novo do montador
usa o `relogioFixo` do `beforeEach` do arquivo e cria a própria demanda, ESP e RSK. Não depende de outro teste. O aviso
do undici "Using `patch`" segue na saída da suíte. Ele não vem da T24.

## Decisões tomadas

- **Pronto, sem devolução.** Razão: o defeito está fechado para todos os formatos de usuário e domínio que testei, e a
  partição fecha o risco que a ordem nova criaria. A suíte, o lint e o typecheck estão limpos.
- **Os testes novos comparam o texto exato.** Razão: uma asserção só de "não contém o domínio" deixaria passar um
  marcador partido ou aninhado.
- **Não fixei em teste o caso de nomes que se sobrepõem** (`['Ficticia', 'Pessoa Ficticia']` deixa `Pessoa [nome
  removido]`). Razão: o montador passa um nome só por demanda. Esse resultado é o limite "só o nome inteiro sai", que já
  está registrado para a 08, e um teste prenderia um comportamento que a 08 pode querer mudar.
- **Não pus teste para o Minor 4 da 2ª revisão** (usuário de e-mail com acento). Razão: concordo com o tech-lead. O
  ajuste fica no detector da T22, na 08, e um teste agora prenderia `fict[e-mail removido]`.
- **Dados só fictícios.** Os domínios são `.test`, os nomes são "Ficticia" e "Pessoa Ficticia", e o telefone é o de
  exemplo (G3.2 e JUR-2026-002, 7.4).

## Pendências

- Seguem abertos, sem mudança nesta etapa:
  - para a 08 (`seguranca-aplicacao`): o Minor 4 da 2ª revisão (usuário de e-mail com acento, `detectores.ts:9`), o
    Minor 2 da 1ª revisão (continuação de cabeçalho), e os limites "só o nome inteiro sai" e "detectores só no formato
    brasileiro";
  - o Minor 1 da 1ª revisão (`RE_ID_ESP` e `RE_ID_RSK` repetem a regex da rota), já com teste de contrato;
  - o aviso do undici "Using `patch`", aberto desde a `06-T23-revisao`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -12` — topo dcc0cd0; correção em ea995db
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show ea995db` — ordem nova e `trocarNome` em minimizar.ts; minimizar.test.ts só com acréscimos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat f83665f 5a59c01 dcc0cd0` — só registro e entregas, sem código
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show bd8db7e -- src/modules/agentes/entrada-agente.test.ts` — testes da 1ª passada no montador
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo antes dos testes novos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/dados-pessoais/minimizar.test.ts src/modules/agentes/entrada-agente.test.ts` — 113 de 113
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 116 arquivos, 2262 de 2262
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff` — 2 arquivos de teste, só acréscimos, sem `.skip`, `.only`, `.todo` nem asserção afrouxada

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
