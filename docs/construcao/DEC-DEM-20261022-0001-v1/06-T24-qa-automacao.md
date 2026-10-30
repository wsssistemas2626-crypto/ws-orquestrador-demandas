---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T24-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 2026-10-25-ws-orquestrador-demandas-plano.md (T24 e cabeçalho G1 a G3), 01-analista-requisitos.md (glossário e RF-20), 06-T24-engenheiro-backend.md, 06-T24-tech-lead.md, git diff 8e92ce8..4fc3c17, src/modules/dados-pessoais/minimizar.ts, src/modules/dados-pessoais/minimizar.test.ts, src/modules/dados-pessoais/detectores.ts, src/modules/agentes/entrada-agente.ts, src/modules/agentes/entrada-agente.test.ts, src/db/schema/versoes.ts, src/db/schema/demandas.ts, src/modules/versoes.ts, src/modules/demandas/gerar-id.ts, test/sentinelas.ts]
status: devolvido
proximo: engenheiro-backend
devolvido_para: 06-T24-construcao
---
## Entrega

Verificação da T24 (minimização e montador da entrada de cada agente), código no intervalo `8e92ce8..4fc3c17` (o
código e os testes estão no `198a23b`). **A T24 volta para a construção.** Há um defeito na ordem da minimização: um
e-mail não vira o marcador de e-mail quando o usuário dele é o nome do solicitante, e o domínio chega ao provedor. Dois
testes novos reproduzem o defeito e falham. Fora isso, os critérios da tarefa estão cobertos, e os 12 testes novos de
borda passam.

### Defeito encontrado (criticidade alta)

`minimizar` troca o nome do solicitante (passo 2) **antes** dos detectores (passo 3). Se o usuário do e-mail termina no
nome inteiro do solicitante, o nome vira `[nome removido]`. Sobra `]` antes do `@`, e o detector de e-mail
(`[A-Za-z0-9._%+-]+@…`) não acha mais nada:

```
minimizar('Escreva para ficticia@empresa-exemplo.test hoje', { nomes: ['Ficticia'] })
// esperado: 'Escreva para [e-mail removido] hoje'
// obtido:   'Escreva para [nome removido]@empresa-exemplo.test hoje'
```

- **O que quebra:** a RN de RF-20 diz que "endereços de e-mail […] são trocados por marcadores antes do envio". Nesse
  caso o e-mail não vira o marcador, e o domínio vai ao provedor. O domínio pode identificar a pessoa ou a empresa dela.
- **Quando acontece:** solicitante com nome de uma palavra só, de 3 letras ou mais, e e-mail no formato `nome@…` ou
  `x.nome@…`. É um formato comum. Também passa pelo montador, de ponta a ponta: o orquestrador recebe
  `[nome removido]@empresa-exemplo.test`.
- **Por que os testes atuais não pegaram:** o conteúdo não tem o nome nem um e-mail que os detectores reconheçam. Por
  isso `semDadoDoCliente` e `encontrarDadosPessoais` dão o conteúdo como limpo, e a própria barreira de detectores deixa
  de servir de rede.
- **Origem:** o desvio 2 da construção (`{ nomes }` e `MARCADOR_NOME`), que entrou depois do passo do plano.
- **Correção sugerida (a escolha é do engenheiro):** rodar os detectores antes do nome (cabeçalho, detectores, nome).
  Outra saída é o padrão do nome não casar quando está colado a `@`. Nas duas formas, os dois testes abaixo passam como
  estão. Se a ordem mudar, vale conferir que um nome igual a uma palavra de marcador (por exemplo "removido") não estraga
  o marcador. Hoje não há teste para isso.

### Critério da tarefa → teste que o cobre

| Critério | Arquivo | Teste |
|---|---|---|
| CA-20.1 (e-mail, telefone e CPF viram marcador) | `src/modules/dados-pessoais/minimizar.test.ts` | `CA-20.1: e-mail, telefone e CPF fictícios viram marcadores`; `%s vira %s, e o resto do texto fica` (10 formatos); `todas as ocorrências, não só a primeira`; `nada dos quatro tipos sobra no resultado, pelos próprios detectores` |
| CA-20.1 pelo orquestrador | `src/modules/agentes/entrada-agente.test.ts` | `CA-20.1: e-mail, telefone e CPF fictícios do texto bruto não chegam`; `orquestrador recebe só o texto minimizado, sem nome, papel e origem` |
| CA-20.1 com o nome do solicitante no e-mail (**falha**) | `minimizar.test.ts` e `entrada-agente.test.ts` | `regressão RF-20: e-mail cujo usuário é o nome do solicitante vira o marcador de e-mail, sem sobrar o domínio`; `regressão RF-20 (CA-20.1 pelo orquestrador): e-mail com o nome do solicitante como usuário não deixa o domínio no conteúdo` |
| CA-20.2 (sem nome do solicitante nem anexo) | `entrada-agente.test.ts` | `CA-20.2: insumo_tecnico não recebe nome do solicitante nem referência de anexo`; `recebe só os campos permitidos da demanda, minimizados, e devolve o id da demanda` |
| RF-20 (lista de permissão por agente) | `entrada-agente.test.ts` | `a lista é a do plano`; `nenhuma lista tem campo do solicitante, de anexo, de autoria, de status ou de id`; `risco recebe demanda + ESP minimizadas`; `consolidacao recebe demanda + ESP + RSK` |
| RF-20 (nome do solicitante no texto) | `minimizar.test.ts` e `entrada-agente.test.ts` | `o nome inteiro vira marcador…`; `nome com acento em maiúscula também vira marcador` (novo); `letra acentuada colada ao nome conta como parte de outra palavra` (novo); `o nome do solicitante citado no texto vira marcador`; `o nome do solicitante citado na ESP e no RSK vira marcador na consolidação` (novo) |
| C-23 (cabeçalhos de e-mail e todo campo de texto) | `minimizar.test.ts` e `entrada-agente.test.ts` | `C-23: linhas de cabeçalho de e-mail encaminhado saem inteiras, em pt-BR e em inglês`; `a linha "%s: ..." sai inteira, com a quebra de linha` (12); `maiúscula ou minúscula, …`; `quebra de linha CRLF…`; `C-23: contexto com e-mail fictício e um cabeçalho "De: …" não chegam`; itens das listas da ESP e do RSK em `risco recebe demanda + ESP minimizadas` e `consolidacao recebe demanda + ESP + RSK` |
| C-24 (texto do cliente delimitado como dado) | `entrada-agente.test.ts` | `C-24: o conteúdo fica entre <dados> e </dados>, e um </dados> do cliente não fecha o bloco`; `abertura e fechamento falsos, …`; `chave com marca de bloco também é neutralizada, …`; `o conteúdo do bloco é uma linha só de JSON…`; `em todo agente o conteúdo passa pelo delimitador` |
| G3.10 (id validado antes do banco) | `entrada-agente.test.ts` | `%s com "%s" → nao_encontrado, sem consultar o banco` (14); `%s com %j (espaço ou quebra nas pontas) → nao_encontrado, sem consultar o banco` (5, novo); `%s: aceita o id de versão exatamente quando RE_ID_VERSAO aceita e o prefixo é %s…` (2, novo) |

### Testes acrescentados (14; só em arquivos `*.test.ts`)

`src/modules/dados-pessoais/minimizar.test.ts` (3):
- `nome com acento em maiúscula também vira marcador`: confere a caixa com acento (`PESSOA FICTÍCIA`) no modo `iu`.
- `letra acentuada colada ao nome conta como parte de outra palavra`: confere que a borda do nome usa `\p{L}` e não
  `\b`, que trataria `é` como fora da palavra.
- `regressão RF-20: e-mail cujo usuário é o nome do solicitante vira o marcador de e-mail, sem sobrar o domínio`:
  **falha** (o defeito acima).

`src/modules/agentes/entrada-agente.test.ts` (11):
- `%s com %j (espaço ou quebra nas pontas) → nao_encontrado, sem consultar o banco` (5 casos): espaço ou `\n` no
  começo ou no fim da chave não passam pela regex. É o caso do `$` sem a flag `m`.
- `%s: aceita o id de versão exatamente quando RE_ID_VERSAO aceita e o prefixo é %s…` (risco e consolidação): teste
  de contrato com `RE_ID_VERSAO` de `src/modules/versoes.ts`, que o teste da rota já prende a `reIdVersao`. Ele cobre o
  Minor 1 da `06-T24-revisao`: se `RE_ID_ESP` ou `RE_ID_RSK` se afastarem da regex da rota, o teste quebra. Não é
  preciso importar `lib/rota`.
- `id da pendente em maiúscula é o mesmo uuid e é lido`: a regex aceita maiúscula e o Postgres lê. Nada de 500 nem de
  `nao_encontrado` indevido.
- `o nome do solicitante citado na ESP e no RSK vira marcador na consolidação`: o nome da demanda é aplicado também nos
  textos e nos itens de lista da ESP e do RSK. Antes, só a demanda era testada.
- `montar duas vezes a mesma chave dá o mesmo conteúdo (nova tentativa recebe a mesma entrada)`: o montador é
  determinístico, o que a nova tentativa da T27 pressupõe.
- `regressão RF-20 (CA-20.1 pelo orquestrador): e-mail com o nome do solicitante como usuário não deixa o domínio no conteúdo`:
  **falha** (o defeito acima, pelo montador).

### Resultado

- `pnpm test`: 116 arquivos, **2244 de 2246**. Falham só os 2 testes de regressão novos. São 2232 testes de antes
  mais 14 novos.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.
- `git diff`: só os 2 arquivos de teste da T24 mudaram, com 95 linhas acrescentadas e nenhuma removida. Nenhum
  `.skip`, `.only` ou `.todo`, e nenhuma asserção afrouxada.

### Estabilidade e relógio

Os testes novos usam o `relogioFixo` do `beforeEach` do arquivo e criam os próprios dados (demanda, ESP, RSK e
pendente), sem depender de outro teste. O teste de contrato e os de chave usam o `bancoProibido`, sem banco. O aviso do
undici "Using `patch`" segue na saída da suíte, como a `06-T24-revisao` registrou. Ele não vem da T24, que não tem
rota nem `fetch`.

## Decisões tomadas

- **Devolvido, e não Minor.** Razão: a RN de RF-20 manda trocar todo e-mail por marcador, e o caso é comum (nome de uma
  palavra e e-mail `nome@empresa`). Além disso, o defeito tira o dado do alcance dos detectores, que são a última
  barreira.
- **O teste de regressão compara o texto exato, não só a falta do domínio.** Razão: as duas correções naturais (mudar
  a ordem ou tratar o `@` no padrão do nome) dão o mesmo texto, e uma comparação exata não deixa passar uma correção
  pela metade.
- **O contrato da regex de versão é feito com `RE_ID_VERSAO` de `versoes.ts`, e não com `lib/rota`.** Razão: `versoes.ts`
  já está preso à rota por teste e não traz `deps`, Sentry nem acesso para dentro do teste.
- **Domínios só `.test` e nomes só "Ficticia"/"Pessoa Fictícia".** Razão: G3.2 e JUR-2026-002, 7.4.

## Pendências

- Testes que falham: `regressão RF-20: e-mail cujo usuário é o nome do solicitante vira o marcador de e-mail, sem sobrar o domínio` (`src/modules/dados-pessoais/minimizar.test.ts`) e `regressão RF-20 (CA-20.1 pelo orquestrador): e-mail com o nome do solicitante como usuário não deixa o domínio no conteúdo` (`src/modules/agentes/entrada-agente.test.ts`). Em `minimizar`, o nome do solicitante é trocado antes dos detectores, e o e-mail `ficticia@empresa-exemplo.test` sai como `[nome removido]@empresa-exemplo.test`.
- Para a construção: não mexer nos dois testes de regressão. A correção fica em `src/modules/dados-pessoais/minimizar.ts`.
- Para a construção: se a ordem mudar para detectores antes do nome, acrescentar um teste para o nome que é palavra
  de marcador (por exemplo "removido").
- Seguem abertos e sem mudança nesta etapa: os Minor 1, 2 e 3 da `06-T24-revisao`. O Minor 1 agora tem teste de
  contrato, mas a duplicação continua. Seguem também os dois limites que a entrega da T24 registrou para a 08: parte do
  nome e telefone de fora do Brasil.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -8` — topo be928f7 (06-T24-revisao), código da T24 em 198a23b
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 8e92ce8..4fc3c17` — 6 arquivos, 4 de código e teste, todos novos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat be928f7` — só a entrega da revisão e o registro
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --format=%h --name-only -1 -- docs/superpowers/plans` — caminho do plano
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo antes dos testes novos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/dados-pessoais/minimizar.test.ts src/modules/agentes/entrada-agente.test.ts` — 95 de 97, falham os 2 de regressão
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 116 arquivos, 2244 de 2246, falham os 2 de regressão
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 2 arquivos de teste, 95 linhas acrescentadas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff` — só acréscimos, sem `.skip`, `.only`, `.todo` nem asserção afrouxada

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [ ] a suíte inteira passa (falham os 2 testes de regressão do defeito; por isso `devolvido`)
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
