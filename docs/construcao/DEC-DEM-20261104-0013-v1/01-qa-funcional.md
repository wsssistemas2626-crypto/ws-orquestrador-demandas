---
pedido: DEC-DEM-20261104-0013-v1
etapa: 01-reproducao
agente: qa-funcional
leu: [contrato-passagem.md, pedido.json, src/modules/pedido-construcao/gerar.ts, src/modules/pedido-construcao/montar.ts, src/modules/pedido-construcao/conteudo.ts, src/modules/pedido-construcao/serializar.ts, src/modules/pedido-construcao/gerar.test.ts, src/modules/pedido-construcao/gerar-bordas.test.ts, src/modules/dados-pessoais/minimizar.ts, src/modules/dados-pessoais/detectores.ts, src/app/api/pacotes-decisao/[decId]/pedido-construcao/route.ts, src/app/(painel)/pacotes-decisao/[decId]/SecaoPedido.tsx, src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.ts, src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.test.ts, src/app/(painel)/pacotes-decisao/[decId]/page.tsx, src/components/dados-do-pedido.ts, src/modules/acesso/matriz.ts, src/modules/pacotes-decisao/decidir.ts (trechos), src/modules/pacotes-decisao/consultas.ts (trechos), src/modules/demandas/consultas.ts (trechos), src/modules/historico/registrar.ts (trechos), src/modules/versoes.ts (trecho), src/lib/rota.ts (trechos), src/vendor/construir/pedido.mjs (trecho), scripts/seed-ficticio.ts (trecho), e2e/pedido-construcao.spec.ts, pareceres/2026-11-04-gestao-riscos-M-1-do-0009.md (seção 5), pareceres/2026-11-04-juridico-contratos-pedido-de-construcao-com-nomes.md, pareceres/2026-11-04-seguranca-aplicacao-pedido-de-construcao-com-nomes.md]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

### 1. Resumo do defeito

O Pedido de Construção (RF-22) leva para o `/construir`, que roda na assinatura pessoal onde o JUR-2026-002, item 7.4,
proíbe dado pessoal real:

- **D1:** o nome do solicitante, inteiro ou em parte, quando está no título, na descrição, na ESP, no RSK ou na opção
  escolhida. O `gerarPedido` só barra e-mail, telefone e CPF;
- **D2:** o nome de quem aprovou, em `decisao.aprovadoPor`;
- **D3:** a geração não pede a quem gera nenhuma confirmação de que o texto está sem dado pessoal, nem pela T11 nem pela
  API, e o histórico não registra confirmação nenhuma.

**Severidade: alta.** Ela vem do impacto sobre o titular, e não da urgência. O nome de terceiro sai da empresa para um
provedor de IA contratado por pessoa física, sem contrato de operador (parecer jurídico, art. 33). Depois entra no
histórico git de dois repositórios (estruturaAutonoma `pedidos/` e o repositório do sistema), e apagá-lo exige
reescrever o histórico. Não sobe para crítica porque, pelos pareceres, nenhum Pedido de demanda real foi gerado ainda e
a regra de uso já está em vigor. É a mesma classificação da `seguranca-aplicacao`.

### 2. Ambiente e dados de teste (todos fictícios)

- Ambiente: desenvolvimento local do `ws-orquestrador-demandas`, ramo `construcao/DEC-DEM-20261104-0013-v1` (base
  c2340e6, 0.1.11), banco local com o seed fictício. Nunca o banco de produção.
- Contas: `cto` e `administradora` do seed, com 2FA.
- Solicitante da demanda: **Joana Ficticia**.
- Aprovadores: o nome da conta que aprovar. Nos testes unitários são "Pessoa Ficticia CTO" e "Pessoa Ficticia Adm".

### 3. Passos de reprodução

**R1: nome do solicitante no texto vai para o pedido (D1)**

1. Entrar com a conta `cto`.
2. Criar a demanda: tipo `melhoria`, solicitante `Joana Ficticia`, título `Relatório mensal pedido pela Joana`, contexto
   `A Joana Ficticia monta o relatório à mão todo mês.`
3. Criar a ESP: descrição objetiva `Gerar o relatório mensal`, situação atual `Hoje a Ficticia junta as planilhas`,
   escopo inclui `Relatório mensal`, sistema alvo `sistema-ficticio`, repositório
   `wsssistemas2626-crypto/sistema-ficticio`, critérios `JoanaFicticia recebe o relatório no dia 1`, definição de
   pronto `pnpm test verde`.
4. Criar o RSK: técnico `medio`, operacional `baixo`, jurídico `baixo`, comentário do risco técnico
   `Depende de a Joana_Ficticia validar o layout`.
5. Criar o DEC de nível "Só o CTO", com opção A `Enviar o relatório para a Joana` e opção B `Manter o processo manual`.
6. Aprovar o DEC com a opção A.
7. Abrir a T11 (`/pacotes-decisao/<DEC-id>`), seção "Pedido de Construção", e clicar em "Gerar Pedido de Construção".

- **Esperado:** 422 com a mensagem "O pedido não passou na validação do /construir. Nada foi entregue." e a lista
  `demanda.titulo: nome`, `demanda.descricao: nome`, `especificacao.conteudo: nome`, `risco.conteudo: nome`,
  `decisao.opcaoEscolhida: nome` e `criterios_aceite_preliminares[0]: nome` (ver o achado E1 no item 5). A lista não
  traz "Joana" nem "Ficticia" em parte nenhuma. Não sai arquivo e não é gravado evento `pedido_gerado`.
- **Obtido (lido no código; não executado, ver Decisões):** 200, e a tela mostra o JSON, o link "Baixar <DEC-id>.json"
  e "Copiar JSON". O JSON traz "Joana", "Ficticia", "Joana Ficticia", "JoanaFicticia" e "Joana_Ficticia" nos seis
  campos. Um evento `pedido_gerado` é gravado com `antes` e `depois` nulos. Evidências:
  - `gerar.ts:42`: `DADOS_PESSOAIS_DO_PEDIDO = ['e-mail', 'telefone', 'CPF']`;
  - `gerar.ts:67-68`: é a única recusa por dado pessoal;
  - `montar.ts:49-54`: o texto original vai para o pedido sem minimizar;
  - `gerar.ts:54`: a demanda travada (`demandaTravada.solicitanteNome`) já está em mãos e não é usada para conferir o
    nome.

**R2: `aprovadoPor` com o nome (D2)**

1. Repetir R1 sem nome nenhum no texto. Por exemplo: título `Relatório mensal`, contexto
   `O financeiro monta o relatório à mão.`, critérios `O financeiro recebe o relatório no dia 1`.
2. Gerar o pedido na T11.
3. Repetir com um DEC de nível "CTO e administradora", aprovado primeiro pela `administradora` (com referência
   `DOC-FICTICIO-001`) e depois pelo `cto`.

- **Esperado:** `decisao.aprovadoPor` leva o papel: `cto` no nível "Só o CTO" e, na dupla aprovação, os dois papéis em
  ordem fixa (cto, administradora; o formato fica com a triagem). O `validarPedido` aceita.
- **Obtido:** `aprovadoPor` leva o nome da conta, `Pessoa Ficticia CTO` ou `Pessoa Ficticia CTO e Pessoa Ficticia Adm`.
  O código monta assim em `montar.ts:34-39` (`.map((a) => a.nome)`) e `montar.ts:55`, e os testes atuais confirmam esse
  comportamento: `gerar.test.ts:175`, `:212`, `:221` e `:673`, e `gerar-bordas.test.ts:132` e `:233`.

**R3: geração sem confirmação, pela T11 e pela API (D3)**

1. Com o DEC de R2, abrir a T11.
2. Ver a seção: há o texto, o alerta de C-28 e o botão. Não há caixa de confirmação (`SecaoPedido.tsx:73-81`).
3. Sem a tela: `POST /api/pacotes-decisao/<DEC-id>/pedido-construcao` com a sessão da conta `cto`, `Origin` do painel,
   `content-type: application/json` e corpo `{}`.
4. Consultar o histórico do DEC.

- **Esperado:** a T11 mostra, antes do botão, uma caixa de marcar com rótulo associado ("título, descrição, ESP e RSK
  não têm dado pessoal de ninguém"), e o botão só envia com ela marcada. A API com corpo `{}`, sem o campo booleano,
  responde 422 com mensagem clara e sem evento. Com a confirmação, o evento `pedido_gerado` registra que ela foi dada,
  sem texto livre.
- **Obtido:** sem caixa na tela. A API responde 200 com o JSON: a rota não declara corpo (`route.ts:8-15`) e a Server
  Action só recebe `decId` (`acoes-pedido.ts:15`). O e2e atual confirma o 200 com `data: {}` em
  `e2e/pedido-construcao.spec.ts:73-77` e `:123-124`. O evento sai com `antes: null` e `depois: null`
  (`gerar.ts:73`; testes em `gerar.test.ts:446-447` e `acoes-pedido.test.ts:232-235`).

### 4. Arquivos suspeitos

| Arquivo | Linhas | Por quê |
|---|---|---|
| `src/modules/pedido-construcao/gerar.ts` | 42, 54, 65-73 | Não confere o nome; não recebe confirmação; evento sem a confirmação |
| `src/modules/pedido-construcao/montar.ts` | 34-39, 55 | `aprovadoPor` com `a.nome`; o papel já está em `a.papel` (`consultas.ts`, tipo `Aprovador`) |
| `src/modules/dados-pessoais/minimizar.ts` | 107-111, 132-146, 212-241 | `padraoDoNome`, `padraoDasPartes`, `aceitarParte` e `trocarNoTrecho` são internas: falta a função exportada que diga se e onde há o nome, sem trocar |
| `src/modules/dados-pessoais/detectores.ts` | 4, 59 | `TipoDadoPessoal` não tem `nome`. Pôr `nome` ali obriga a mexer em `MARCADORES` e `DETECTORES` (`Record`). A triagem decide o tipo do erro |
| `src/app/api/pacotes-decisao/[decId]/pedido-construcao/route.ts` | 8-15 | Sem `corpo` declarado; a confirmação não chega |
| `src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.ts` | 15-18 | A entrada é só `paramId.versao('decId', 'DEC')` |
| `src/app/(painel)/pacotes-decisao/[decId]/SecaoPedido.tsx` | 73-81 | Sem a caixa de confirmação |
| `src/components/dados-do-pedido.ts` | 20, 32 | O aviso diz "nome ... de cliente" (a `seguranca-aplicacao` pede "de qualquer pessoa ou do cliente"); a orientação não serve para o nome no título (achado E5) |
| `e2e/pedido-construcao.spec.ts` | 73-77, 109, 123, 138, 160, 173, 190 | Clique em "Gerar" sem a caixa e POST com `{}` |
| Testes unitários | `gerar.test.ts`, `gerar-bordas.test.ts`, `acoes-pedido.test.ts` | Esperam `aprovadoPor` com nome, evento com `depois: null` e chamada sem confirmação |

### 5. Achados exploratórios para a triagem (lidos no código, a confirmar por teste)

- **E1, lacuna na lista de campos da ESP do pedido.** A ESP lista "título, descrição, conteúdo da ESP e do RSK, opção
  escolhida". Ficam de fora `criterios_aceite_preliminares` e `definicao_de_pronto`, que são texto livre da ESP e saem no
  topo do pedido, fora de `especificacao.conteudo` (`conteudo.ts:10`). O C-28 já confere esses campos
  (`gerar.test.ts:315-322`). Sugestão: conferir o nome no pedido inteiro, como o C-28, e não só nos cinco campos.
- **E2, falso positivo vindo dos rótulos do próprio sistema.** A conferência sobre o pedido montado também lê os rótulos
  que `conteudo.ts` e a descrição acrescentam, todos com inicial maiúscula: "Campos críticos", "Risco técnico", "Alto",
  "Baixo", "Resumo", "Contexto", "Problema" e outros. Com o solicitante `Carlos Campos Ficticio` e o campo "Campos
  críticos" preenchido na ESP, o pedido seria recusado sem o nome estar em texto nenhum, e reescrever o texto não
  resolve. Sugestão: conferir os valores antes de receberem o rótulo, ou deixar os rótulos fora da conferência, mantendo
  o caminho do erro.
- **E3, não reaproveitar o `minimizar` inteiro.** Fazer a conferência como "`minimizar(t) !== t`" recusaria um texto
  com linha que começa por "Para:" ou "De:" (`CABECALHOS_DE_EMAIL`, `minimizar.ts:36-37`), que é comum em português
  ("Para: o financeiro"). A função nova deve usar só a etapa do nome (nome completo e partes).
- **E4, ordem e completude do 422.** Com o nome depois do passo 5, um campo com e-mail e nome devolve só `e-mail`. A
  pessoa corrige, gera de novo e recebe `nome`: duas rodadas. A ESP manda conferir depois do C-28. Fica com a triagem
  juntar as duas listas num 422 só.
- **E5, recusa sem saída (anterior a este pedido, que a deixa mais frequente).** Pelo A-02 (`decidir.ts:93-101, 219`),
  com um DEC aprovado nenhum outro DEC da demanda pode ser aprovado. A orientação da tela, "Corrija criando uma versão
  nova da ESP e um pacote novo", leva a: ESP nova → DEC v1 desatualizado (409) → DEC v2 que não se aprova (409
  "outro pacote desta demanda já está aprovado."). Com o nome no título ou na descrição, que são cópia gravada no DEC, a
  pessoa também precisa editar a demanda. Um falso positivo ("Santos" cidade, "Campos", "Rosa" no começo da frase)
  trava a demanda. Sugiro que o `tech-lead` decida se a saída entra aqui ou num pedido próprio. A `seguranca-aplicacao`
  contava com "ESP nova, DEC novo e nova aprovação", e o A-02 não deixa.
- **E6, nome usado na conferência.** O nome conferido é o `solicitanteNome` atual da demanda travada
  (`demandas/consultas.ts:193`). Por isso: solicitante nulo não confere nada; editar o nome do solicitante depois pode
  fazer o mesmo DEC, antes aceito, passar a ser recusado. O CA-22.2 continua valendo "quando aceito", e o risco está no
  RSK. Há teste a criar para os dois casos.
- **E7, `aprovadoPor` estável.** O papel deve vir do papel gravado na aprovação (`Aprovador.papel`), e não do papel atual
  da conta (`user.papel`). Trocar o papel da conta depois da aprovação não pode mudar o arquivo (CA-22.2). Esse teste
  substitui o de `gerar-bordas.test.ts:125-136`, que hoje confere o nome.
- **E8, onde a confirmação é conferida.** Um Zod no corpo da rota devolve 400 (`entrada_invalida`, `rota.ts:80-84`), e a
  ESP pede 422. Conferir dentro do `gerarPedido` mantém a regra também para quem chama a função direto, no padrão do
  403. Falta definir a ordem em relação ao 404 e ao 409. Os testes de 409 em `acoes-pedido.test.ts:190-221` mudam
  conforme essa ordem. O corpo continua sem chave desconhecida (C-11): campo extra dá 400.
- **E9, e2e que passa pelo motivo errado.** Os POST de `pedido-construcao.spec.ts:173` (C-28) e `:190` (Estudo) esperam
  422 e já passariam só pela falta da confirmação. Eles precisam mandar a confirmação para continuar testando o que
  dizem testar.
- **E10, evento.** `registrarEvento` grava `depois` como recebe (`registrar.ts:83-93`). A confirmação deve ser um campo
  booleano fixo (por exemplo `{ confirmouSemDadoPessoal: true }`, nome a decidir), sem texto. Conferir como a tela de
  histórico mostra esse evento.

### 6. Casos de teste sugeridos para a correção (dados fictícios)

| # | Entrada | Esperado |
|---|---|---|
| 1 | Solicitante `Joana Ficticia`; título `Pedido da Joana Ficticia` | 422 `demanda.titulo: nome`, sem o valor, sem evento |
| 2 | Mesmo solicitante; descrição com `JOANA FICTICIA` e depois com `joana ficticia` | 422 nos dois (nome inteiro sem diferença de caixa) |
| 3 | Mesmo solicitante; ESP com `Joána Fictícia` (com acento) | 422 `especificacao.conteudo: nome` |
| 4 | Mesmo solicitante; RSK só com `Joana`; depois só com `Ficticia` | 422 `risco.conteudo: nome` (primeiro nome e sobrenome) |
| 5 | Opção A com `JoanaFicticia`, `Joana_Ficticia` e `Joana2` | 422 `decisao.opcaoEscolhida: nome` |
| 6 | Critério `Joana recebe` e definição de pronto `Ficticia aprova` | 422 `criterios_aceite_preliminares[0]: nome` e `definicao_de_pronto[0]: nome` (E1) |
| 7 | Solicitante `Rosa Dias Ficticia`; ESP com `camisa rosa em 30 dias` | 200; duas gerações iguais byte a byte (CA-22.2) |
| 8 | Solicitante `Maria dos Santos Neto Ficticia`; RSK com `o Neto do cliente e dos fornecedores` | 200 (partículas fora) |
| 9 | Solicitante `Carlos Campos Ficticio`; ESP com "Campos críticos" preenchido, sem o nome no valor | 200 esperado (E2); hoje o desenho daria 422 |
| 10 | ESP com a linha `Para: o financeiro` | 200 (E3) |
| 11 | Demanda sem solicitante | 200 |
| 12 | POST com `{}`, `{"confirmacao": false}` e `{"confirmacao": "true"}` (nome do campo a decidir) | 422 com mensagem clara, sem evento |
| 13 | POST com a confirmação e uma chave extra | 400 (C-11) |
| 14 | POST com a confirmação, por agente e pelo ator sistema | 403, sem evento |
| 15 | Geração aceita com a confirmação | evento `pedido_gerado` com a confirmação, sem texto livre |
| 16 | DEC "Só o CTO" e DEC de dupla aprovação | `aprovadoPor` com o papel e em ordem fixa; `validarPedido` aceita |
| 17 | Trocar o nome e o papel da conta depois da aprovação | o arquivo é o mesmo (E7) |
| 18 | T11: caixa desmarcada | o botão não envia; nada é gerado; a caixa tem rótulo associado e é operável pelo teclado (Espaço) |
| 19 | T11: caixa marcada, gerar, recusa 422 de nome | foco no alerta; lista `campo: nome`; `main` sem "Joana" |
| 20 | Axe na T11: antes de marcar, marcada, gerado e com erro 422 | sem violação |
| 21 | Cinco gerações ao mesmo tempo, com a confirmação | o mesmo JSON e cinco eventos |
| 22 | e2e completo | verde três vezes seguidas |

## Decisões tomadas

- Grep e Glob estavam disponíveis e foram usados, além do Read; nenhum comando foi rodado.
- Não executei o sistema (o agente não tem Bash). O resultado obtido vem da leitura do código e dos testes atuais que
  confirmam o comportamento de hoje, com arquivo e linha citados.
- Mantive a severidade alta pelo impacto sobre o titular e pela saída irreversível para o git e para o provedor, e não
  subi para crítica porque não há Pedido de demanda real gerado, segundo os pareceres.
- Separei os achados E1 a E10 da reprodução. Eles não mudam o que foi aprovado, mas a triagem precisa deles para não
  abrir lacuna (E1), recusa falsa (E2, E3) nem demanda travada (E5).
- Usei só nomes fictícios ("Joana Ficticia", "Rosa Dias Ficticia", "Carlos Campos Ficticio", "Maria dos Santos Neto
  Ficticia", "Pessoa Ficticia CTO" e "Pessoa Ficticia Adm").

## Pendências

- E5 (recusa sem saída por causa do A-02) é anterior a este pedido. O `tech-lead` decide se entra na correção ou vira
  pedido próprio. Se mudar o fluxo de decisão, vai a Fabiano.
- E1 e E2 pedem uma interpretação da ESP: conferir o pedido inteiro e deixar os rótulos fora. A decisão é do `tech-lead`
  na triagem; se mudar o que Fabiano aprovou, vai a ele.
- O formato de `aprovadoPor` na dupla aprovação e o nome do campo de confirmação ficam com a triagem.

## Comandos executados

Nenhum.

## Critério de pronto atendido

- [x] (01) os passos de reprodução estão completos e o resultado obtido está descrito
