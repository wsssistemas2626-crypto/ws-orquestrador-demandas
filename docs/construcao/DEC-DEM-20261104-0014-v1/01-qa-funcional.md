---
pedido: DEC-DEM-20261104-0014-v1
etapa: 01-reproducao
agente: qa-funcional
leu: [contrato-passagem.md, pedido.json, DEC-DEM-20261104-0013-v1/01-qa-funcional.md, DEC-DEM-20261104-0013-v1/02-tech-lead.md, src/modules/pacotes-decisao/decidir.ts, src/modules/pacotes-decisao/decidir-versoes.test.ts, src/modules/pacotes-decisao/consultas.ts, src/modules/pacotes-decisao/criar.ts, src/modules/pacotes-decisao/desatualizado.ts, src/modules/pedido-construcao/gerar.ts, src/modules/demandas/transicoes.ts, src/modules/demandas/consultas.ts (95-124 e trechos), src/modules/historico/registrar.ts (1-50), src/components/dados-do-pedido.ts, src/components/rotulos.ts (190-249), "src/app/(painel)/pacotes-decisao/[decId]/page.tsx", "src/app/(painel)/pacotes-decisao/[decId]/SecaoPedido.tsx", "src/app/(painel)/demandas/[id]/detalhe.ts (trechos)", "src/app/(painel)/demandas/[id]/page.tsx (trechos)", src/app/api/pacotes-decisao/route.ts, e2e/decisao.spec.ts (1-40, 236-275), e2e/pedido-construcao.spec.ts (1-60), docs/manual-tecnico/04-versoes-e-decisao.md (110-191), docs/manual-tecnico/05-pedido-de-construcao.md (1-60, 170-209), docs/superpowers/specs/2026-10-25-ws-orquestrador-demandas-design.md (trechos), drizzle/0000_amusing_living_lightning.sql (coluna acao)]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

### 1. Resumo do defeito

Com um DEC aprovado, o A-02 (`decidir.ts:93-101` e `:219`) recusa a aprovação de qualquer outro DEC da mesma demanda
com 409 "outro pacote desta demanda já está aprovado.". Por isso, depois da aprovação, nenhuma correção de texto tem
saída dentro da demanda:

- **título ou descrição** (cópia gravada no DEC, `criar.ts:161-162`): o DEC aprovado continua com o texto velho, e o DEC
  novo com o texto corrigido não se aprova;
- **ESP ou RSK**: a versão nova deixa o DEC aprovado desatualizado (409 no gerar, `gerar.ts:79`), e o DEC novo, que cita
  a versão nova, não se aprova;
- **opção escolhida** (texto do próprio DEC): mesmo caso do título.

Desde a 0.1.12 o gerar recusa o pedido com o nome do solicitante no texto (D1 do 0013), e a recusa pode ser falsa
("Santos" cidade, "Campos" ou "Rosa" no começo da frase). A trava passou a aparecer mais. A orientação da própria T11
(`dados-do-pedido.ts:50`) já avisa que outro pacote não se aprova. A única saída hoje é encerrar a demanda e abrir outra,
refazendo ESP, RSK e DEC, e na dupla aprovação a administradora precisa assinar um documento novo. O histórico fica
partido em duas demandas.

**Severidade: alta.** O motivo é o impacto em quem usa, e não a urgência. O fluxo principal do sistema, gerar o Pedido de
Construção, fica bloqueado para a demanda inteira, e isso acontece sem erro da pessoa (falso positivo do D1). O
contorno existe, mas custa refazer todo o trabalho e um documento assinado novo, e quebra a rastreabilidade. Não chega
a crítica: não há dado exposto nem perda de dado, e não achei evidência de demanda real travada.

### 2. Ambiente e dados de teste (todos fictícios)

- Ambiente: desenvolvimento local do `ws-orquestrador-demandas`, ramo `construcao/DEC-DEM-20261104-0014-v1` (base
  89eca46, 0.1.12), banco local com o seed fictício (`scripts/seed-ficticio.ts`). Nunca o banco de produção.
- Contas: `cto` e `administradora` do seed, as duas com 2FA.
- Solicitantes: **Carla Santos Ficticia** (R1, falso positivo) e **Joana Ficticia** (R2).
- Documento da administradora: `DOC-FICTICIO-014`, de 2026-11-04.
- Sistema e repositório: `sistema-ficticio`, `wsssistemas2626-crypto/sistema-ficticio`.

### 3. Passos de reprodução

**R1: recusa falsa por nome, corrigida na descrição (DEC aprovado não é substituído)**

1. Entrar com a conta `cto`.
2. Criar a demanda: tipo `melhoria`, solicitante `Carla Santos Ficticia`, título `Frete da filial`, contexto
   `A filial de Santos calcula o frete à mão.`
3. Criar a ESP v1: descrição objetiva `Calcular o frete automaticamente`, escopo inclui `Cálculo de frete`, sistema alvo
   e repositório fictícios, critério `O frete sai calculado no pedido`, definição de pronto `pnpm test verde`.
4. Criar o RSK v1: os três níveis em `baixo`, sem texto.
5. Criar o DEC v1, de nível "Só o CTO", com opção A `Calcular no sistema` e opção B `Manter a planilha`, e aprovar a opção A
   na T11.
6. Na T11 do v1, marcar a caixa de confirmação e clicar em "Gerar Pedido de Construção".
   - Hoje dá 422 com `demanda.descricao: nome` e as linhas 1, 2 e 6 da orientação, e é esse o comportamento esperado
     da 0.1.12: "Santos" é parte do nome com inicial maiúscula. O problema é não haver saída depois disso.
7. Seguir a orientação: na demanda, em "Editar dados", trocar o contexto por `A filial do litoral calcula o frete à mão.`
8. Gerar de novo na T11 do v1: continua o 422 com `demanda.descricao: nome`, porque o v1 leva a cópia antiga.
9. Criar o DEC v2, de nível "Só o CTO" e com as mesmas opções. Ele cita a ESP v1 e o RSK v1 e leva a descrição nova.
10. Na T11 do v2, aprovar a opção A.

- **Esperado (ESP aprovada, opção b):** o v2 fica aprovado, com as regras de hoje (2FA, papel, revisão de rascunho,
  desatualizado, demanda em status final). A vista e as listagens do v1 trazem `substituido: true` e o id do v2. A T11
  do v1 mostra o aviso com o link para o v2 e não mostra o botão de gerar. Gerar o v2 dá 200 e passa no D1. Gerar o v1
  pela API dá 409 com mensagem clara. O histórico grava `aprovacao_registrada`, `decisao_registrada` e um evento de
  substituição com os dois ids, sem texto livre.
- **Obtido (lido no código; não executado, ver Decisões):** 409 com o alerta "Não foi possível concluir: outro pacote
  desta demanda já está aprovado." O v2 continua `pendente`, sem linha em `aprovacao` nem em `decisao`. O v1 continua
  aprovado e recusando o pedido para sempre, já que a cópia gravada não muda. A demanda fica sem saída. Evidências:
  - `decidir.ts:219`: `temOutroAprovado` recusa antes de qualquer outra regra de aprovação;
  - `decidir.ts:93-101`: conta qualquer DEC da demanda com decisão `aprovada`, sem olhar a versão;
  - os testes atuais confirmam o 409: `decidir-versoes.test.ts:152-160` e `e2e/decisao.spec.ts:241-265`.

**R2: correção da ESP depois da aprovação (DEC aprovado desatualizado e DEC novo bloqueado)**

1. Repetir R1 com o solicitante `Joana Ficticia`, contexto `O financeiro calcula o frete à mão.` e, na ESP v1, o
   critério `Joana recebe o frete calculado`. Aprovar o DEC v1 (opção A).
2. Gerar na T11: 422 com `criterios_aceite_preliminares[0]: nome` e as linhas 1, 3 e 6 da orientação.
3. Criar a ESP v2, igual à v1 mas com o critério `O financeiro recebe o frete calculado`.
4. Abrir a T11 do v1: o selo e o alerta de desatualizado aparecem, e a seção do pedido sumiu (`secaoDoPedido`,
   `dados-do-pedido.ts:77-80`). `POST /api/pacotes-decisao/<v1>/pedido-construcao` com `{"confirmaSemDadoPessoal":true}`
   dá 409 "o pacote está desatualizado: a demanda tem ESP ou RSK mais nova que a citada.".
5. Criar o DEC v2 (cita a ESP v2 e o RSK v1) e aprovar a opção A.

- **Esperado:** o mesmo de R1. O v2 aprovado substitui o v1, e o gerar do v2 dá 200 com a ESP v2.
- **Obtido:** o mesmo 409 de R1 no passo 5. O v1 está desatualizado e o v2 não se aprova, e nenhum DEC da demanda gera
  pedido. Variante com o RSK: um RSK v2 no passo 3 dá o mesmo resultado.

**R3: dupla aprovação no DEC que substituiria**

1. A partir de R2, passo 3, criar o DEC v2 de nível "CTO e administradora".
2. Entrar com a `administradora` e aprovar a opção A, com referência `DOC-FICTICIO-014` e data `2026-11-04`.

- **Esperado:** a primeira aprovação é gravada (`aprovacao_parcial`) e o v1 ainda não é substituído. Com a do `cto` na
  mesma opção, o v2 fica aprovado e substitui o v1. Nenhuma regra do RF-14 fica mais fraca.
- **Obtido:** 409 `outroAprovado` já na primeira aprovação, sem linha em `aprovacao`. Confirmado em
  `decidir-versoes.test.ts:162-172`.

**R4: pela API, sem a tela**

`PATCH /api/pacotes-decisao/<v2>/decisao` com a sessão da conta `cto`, `Origin` do painel e corpo
`{"statusDecisao":"aprovada","opcaoEscolhida":"A"}`.

- **Esperado:** 200, com `resultado: "aprovada"`.
- **Obtido:** 409 `{ "erro": "conflito", "mensagem": "outro pacote desta demanda já está aprovado." }`.

### 4. Risco da correção ingênua (o que a triagem não pode deixar de fora)

Tirar só o `temOutroAprovado` abre o risco que o A-02 fechava. O `gerarPedido` (`gerar.ts:76-79`) só confere se o DEC
está `aprovada` e não está desatualizado. Quando a correção mexe só no texto do DEC (título, descrição, opção) e não na
ESP nem no RSK, o v1 substituído continua não desatualizado. Se nada mais mudar, ele também gera 200, e passam a existir
**dois Pedidos de Construção válidos da mesma demanda**, que podem ter opções opostas (v1 com A, v2 com B). A
conferência "é o aprovado mais novo" tem de entrar no `gerarPedido` e ser lida **sob a trava da demanda**, como o
desatualizado hoje. Só assim uma aprovação do v2 ao mesmo tempo que o gerar do v1 não deixa o v1 escapar (C-13).

### 5. Arquivos suspeitos

| Arquivo | Linhas | Por quê |
|---|---|---|
| `src/modules/pacotes-decisao/decidir.ts` | 5-9, 46, 93-101, 219 | A-02: `temOutroAprovado`, a mensagem `outroAprovado` e o comentário da ordem. Não há evento de substituição |
| `src/modules/pedido-construcao/gerar.ts` | 1-15, 39-48, 76-79 | Sem a conferência "aprovado mais novo"; falta a mensagem do 409 do substituído |
| `src/modules/pacotes-decisao/consultas.ts` | 41-70, 138-177, 203-237, 255-281 | `PacoteDecisaoVista` sem `substituido` e sem o id do substituto. A vista mínima (`vistaDoPacotePara`) é lista de permissão: campo novo só sai para agente se for incluído ali |
| `src/modules/demandas/consultas.ts` | 19, 98-124, 247 | `PacoteResumo` (lista de DEC da T05 e de `GET /api/demandas/:id`, inclusive a vista mínima) sem `substituido` |
| `src/modules/historico/registrar.ts` | 11-34 | `AcaoEvento` sem a ação de substituição. A coluna `acao` é `text` sem check (`drizzle/0000_amusing_living_lightning.sql:88`), então não precisa de migration |
| `src/components/rotulos.ts` | 207-231 | `textoDoEvento` sem o texto do evento de substituição |
| `src/components/dados-do-pedido.ts` | 44-51, 61-70, 77-80 | A linha 6 da orientação (`aviso`) diz que outro pacote não se aprova. `secaoDoPedido` não considera o substituído |
| `src/app/(painel)/pacotes-decisao/[decId]/page.tsx` | 77-91, 214-218 | Sem o aviso e o link do substituído; a seção do pedido aparece para todo aprovado não desatualizado |
| `src/app/(painel)/demandas/[id]/page.tsx` | 211-212 | O selo do DEC na T05 mostra "Aprovada" também para o substituído |
| `src/modules/pacotes-decisao/desatualizado.ts` | 12-22 | `temPacoteAprovadoAtualizado` conta qualquer DEC aprovado. Ver E7 |
| `src/modules/pacotes-decisao/decidir-versoes.test.ts` | 151-180 | O bloco A-02 espera o 409 e passa a ser o teste da substituição |
| `e2e/decisao.spec.ts` | 9-27, 216, 241-265, 269-272 | O teste do A-02 espera o 409, e as pré-condições "exige banco recém-semeado" contam com o A-02 |
| `e2e/pedido-construcao.spec.ts` | 11-14, 38-43, 259 | Comentários e o texto `aviso` da orientação |
| `src/components/dados-do-pedido.test.ts`, `src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.test.ts` | 161; 40 | Texto `aviso` da orientação |
| `docs/manual-tecnico/04-versoes-e-decisao.md` | 155, 188-191 | Regra 5 (A-02) e o "Limite conhecido" |
| `docs/manual-tecnico/05-pedido-de-construcao.md` | 23-39, 185-196 | Ordem das conferências do gerar (falta o 409 do substituído); linha 6 da orientação e o parágrafo que manda encerrar a demanda |
| `docs/manual-tecnico/09-referencia-api.md` | 43, 236 | Campos novos na vista; a lista de motivos de `conflito` |

### 6. Achados exploratórios para a triagem (lidos no código, a confirmar por teste)

- **E1, "aprovado mais novo" por versão.** Pelo A-01 (`decidir.ts:218`), só o DEC de maior versão se decide. Logo, o
  último aprovado é sempre o de maior versão entre os aprovados. Sugiro definir assim (maior `versao` com decisão
  `aprovada`), e não pela data, para não depender do relógio.
- **E2, DEC novo ainda pendente.** Com o v1 aprovado e o v2 pendente, aprovação parcial ou devolvido, o v1 continua
  sendo o aprovado mais novo e, pela ESP, continua gerando. Na dupla aprovação, a substituição só acontece quando a
  decisão `aprovada` é gravada, na segunda aprovação. Falta o teste: o v2 com só uma aprovação não substitui o v1 nem
  grava o evento. A triagem decide se a T11 do v1 avisa que há pacote mais novo pendente.
- **E3, opções opostas.** O v2 pode ser aprovado com a opção oposta à do v1 (A no v1, B no v2). O A-02 nasceu para isso
  (`decidir-versoes.test.ts:1-4`). A ESP aceita a troca, e a garantia passa a ser só o gerar (item 4). Precisa de teste
  com as opções opostas.
- **E4, corrida.** Há duas corridas a testar, e as duas passam pela trava da demanda: (a) aprovar o v2 enquanto o v1 gera:
  o v1 gera antes e o pedido sai legítimo, registrado no histórico (risco aceito no RSK), ou recebe 409; nunca 200 depois
  do commit da aprovação do v2; (b) duas aprovações do v2 ao mesmo tempo: uma aprova e a outra recebe `jaDecidido`, com
  um só evento de substituição.
- **E5, tela aberta e velha.** A T11 do v1 está aberta numa aba, e o v2 é aprovado em outra. Clicar em "Gerar" no v1
  precisa dar o 409 novo com "Não foi possível concluir: ..." e foco no alerta, sem JSON. O axe roda nesse estado.
- **E6, vista mínima e listagens.** `substituido` e o id do substituto são ids e booleanos, sem dado pessoal, mas só saem
  para token de agente se entrarem na lista de permissão de `vistaDoPacotePara` (`consultas.ts:203-237`) e na de
  `PacoteResumo` (`demandas/consultas.ts:247`). Falta o teste com token de agente em `GET /api/pacotes-decisao/:decId`,
  `GET /api/pacotes-decisao` e `GET /api/demandas/:id`. Falta decidir também se o filtro `statusDecisao=aprovada` da
  fila (RF-23) traz o substituído. Sem status novo, traz, marcado `substituido: true`.
- **E7, transição manual para `aprovada`.** `temPacoteAprovadoAtualizado` (`desatualizado.ts:14-22`) aceita qualquer DEC
  aprovado e atualizado, inclusive um substituído. Pela leitura, o substituído atualizado implica o substituto também
  atualizado, porque o A-01 e o desatualizado barram aprovar um DEC que nasceu velho. Então hoje não vejo efeito, mas
  vale um teste de guarda ou a regra explícita "aprovado mais novo" também aqui.
- **E8, evento de substituição.** O texto da ESP é "um evento com os dois ids, sem texto livre". Faltam a entidade e o
  `entidadeId` (o DEC novo ou o substituído) e o nome da ação. A lista do histórico da demanda deve mostrar uma frase
  fixa, como "O <DEC novo> substituiu o <DEC antigo>", sem comentário (C-30). O tipo `AcaoEvento` é uma união
  exaustiva em `textoDoEvento`, e o typecheck obriga o caso novo.
- **E9, status da demanda.** Criar o DEC v2 só muda o status a partir de `nova`, `em_analise` e `aguardando_informacao`
  (`transicoes.ts:74`). Com a demanda em `aprovada`, `em_construcao` ou `devolvida`, o v2 nasce e a demanda fica onde
  está. Falta testar a substituição nesses três status (em `em_construcao`, o pedido do v1 provavelmente já foi copiado:
  risco do RSK) e confirmar que `entregue` e `encerrada` continuam com o 409 de status final, antes da substituição.
- **E10, e2e e o limite por conta (C-36).** O caminho completo do e2e cria ESP, RSK e dois DEC e edita a demanda. As
  specs atuais contam o uso por conta no cabeçalho (`e2e/pedido-construcao.spec.ts:15-16`), e a conta nova precisa
  caber no limite de artefatos. Hoje o `exigeBancoRecemSemeado` de `e2e/decisao.spec.ts:216` e `:272` supõe o A-02, e
  com a substituição a pré-condição pode mudar.
- **E11, fora do escopo, para a `seguranca-aplicacao`.** Hoje existe um contorno do D1 que não é saída legítima: trocar o
  `solicitanteNome` da demanda faz o v1 deixar de recusar (E6 do 0013, risco aceito e coberto pela confirmação). Com a
  substituição, a saída legítima fica disponível. Sugiro só registrar, sem mudar neste pedido.

### 7. Casos de teste sugeridos para a correção (dados fictícios)

| # | Entrada | Esperado |
|---|---|---|
| 1 | R1: v1 aprovado; descrição editada; v2 "Só o CTO" aprovado pela `cto` | `aprovada`; v1 `substituido: true` com o id do v2; v2 sem `substituido` |
| 2 | Caso 1, gerar do v1 e do v2 (API e Server Action, com a confirmação) | v1 409 com a mensagem nova, sem evento; v2 200, passa no `validarPedido`, duas gerações iguais byte a byte (CA-22.2) |
| 3 | R2: ESP v2 depois da aprovação; v2 aprovado | igual ao caso 1; gerar do v1 continua 409, o do desatualizado ou o do substituído (a triagem fixa qual vem primeiro) |
| 4 | v1 com A e v2 com B | v2 aprovado; só o v2 gera; o pedido leva `B: ...` |
| 5 | R3: v2 dupla, `administradora` com `DOC-FICTICIO-014` e depois `cto` | parcial grava e não substitui (v1 ainda gera); a segunda substitui; opção diferente, papel repetido e falta do documento seguem com o 409 e o 400 de hoje |
| 6 | v2 aprovado sem 2FA, por token de agente, pelo ator sistema, nível `cto` pela `administradora` | 401/403 como hoje; nada substituído; nenhum evento |
| 7 | v2 que cita rascunho de agente, sem `revisouRascunhosDeAgente` | 400 como hoje; v1 não substituído |
| 8 | v2 desatualizado (ESP v3 depois do v2) | 409 `desatualizado`; v1 não substituído |
| 9 | Demanda `encerrada` com v1 aprovado e v2 pendente | 409 `demandaFinal` (M-08) no aprovar e no gerar |
| 10 | Aprovar o v1 com o v2 pendente | 409 `naoEhOMaisNovo` (A-01 continua) |
| 11 | Corrida: aprovar o v2 e gerar o v1 ao mesmo tempo, dez vezes | nunca 200 do v1 depois do commit do v2; ao fim, um só aprovado mais novo |
| 12 | Corrida: duas aprovações do v2 ao mesmo tempo | uma `aprovada`, outra `jaDecidido`; um só evento de substituição |
| 13 | v3 aprovado depois do v2 aprovado | v1 e v2 substituídos, os dois apontando para o v3 (ou a regra que a triagem fixar); só o v3 gera |
| 14 | Histórico da demanda depois do caso 1 | `aprovacao_registrada`, `decisao_registrada` e o evento de substituição com os dois ids, sem texto livre; frase fixa na T05 |
| 15 | Leitura com token de agente (DEC, fila e demanda) | `substituido` e o id do substituto presentes na vista mínima; nenhum nome |
| 16 | T11 do v1 substituído | aviso com link para o v2 (texto do link com o id); sem caixa nem botão de gerar; axe sem violação |
| 17 | T11 do v1 aberta antes da aprovação do v2; clicar em "Gerar" | alerta "Não foi possível concluir: ..." com foco; sem JSON; axe sem violação |
| 18 | T05 da demanda | o selo ou o texto do v1 indica que ele foi substituído; o v2 aparece como aprovado |
| 19 | Substituição com a demanda em `aprovada`, `em_construcao` e `devolvida` | aprova e substitui; o status da demanda não muda (P1-d) |
| 20 | e2e completo: aprovar o v1; gerar recusa por nome; ESP nova; DEC v2; aprovar; gerar | 200 no v2 e 409 no v1, verde três vezes seguidas |

## Decisões tomadas

- Grep, Glob e Read foram usados; nenhum comando foi rodado.
- Não executei o sistema (o agente não tem Bash). O resultado obtido vem da leitura do código e dos testes atuais que
  confirmam o 409, com arquivo e linha citados.
- Usei uma recusa falsa ("Santos" cidade) em R1 porque é o caso que o pedido cita e o que mais trava sem erro da pessoa.
  R2 cobre a correção da ESP, e R3 a dupla aprovação.
- Severidade alta: o fluxo principal fica bloqueado e o contorno é caro e quebra a rastreabilidade. Não subi para
  crítica porque não há exposição nem perda de dado.
- Pus o item 4 (risco da correção ingênua) fora dos exploratórios: é o controle que não pode ser afrouxado (dois pedidos
  válidos), e a ESP o exige explicitamente.
- Usei só dados fictícios ("Carla Santos Ficticia", "Joana Ficticia", "DOC-FICTICIO-014", "sistema-ficticio").

## Pendências

- A triagem fixa: a definição de "aprovado mais novo" (E1), a ordem do 409 do substituído em relação ao do desatualizado
  no gerar (caso 3), a entidade e o nome do evento de substituição (E8), e se o v3 aponta o v1 para o v2 ou para o v3
  (caso 13).
- A spec do sistema (`docs/superpowers/specs/2026-10-25-ws-orquestrador-demandas-design.md`) não tem o texto do A-02 nem
  o dos CA-22.x, só a linha do RF-22 com "CA-22.1 a CA-22.6". O A-02 hoje existe só nos documentos da 08-correcao do
  0001 e no manual. A ESP manda "atualizar a spec do sistema (A-02 e CA-22.4)", e a triagem diz onde esse texto entra.
- Textos novos (aviso do substituído na T11, mensagem do 409, frase do histórico e a nova linha 6 da orientação) ficam
  para a revisão da `ux-ui-design`, como no 0013: a cadeia curta não tem etapa de interface.
- E11 vai para conhecimento da `seguranca-aplicacao` na 04, sem mudança neste pedido.

## Comandos executados

Nenhum.

## Critério de pronto atendido

- [x] (01) os passos de reprodução estão completos e o resultado obtido está descrito
