---
pedido: DEC-DEM-20261104-0013-v1
etapa: 02-triagem
agente: tech-lead
leu: [contrato-passagem.md, pedido.json, 01-qa-funcional.md, DEC-DEM-20261104-0012-v1/02-tech-lead.md (formato), engenheiro-backend.md (Pode), src/modules/pedido-construcao/gerar.ts, src/modules/pedido-construcao/montar.ts, src/modules/pedido-construcao/conteudo.ts, src/modules/pedido-construcao/gerar.test.ts (1-230, 300-460), src/modules/pedido-construcao/gerar-bordas.test.ts (100-238), src/modules/dados-pessoais/minimizar.ts, src/modules/dados-pessoais/detectores.ts, src/modules/pacotes-decisao/consultas.ts, src/modules/pacotes-decisao/decidir.ts (1-230), src/modules/pacotes-decisao/criar.ts, src/modules/pacotes-decisao/schemas.ts, src/modules/demandas/consultas.ts (150-230), src/modules/historico/registrar.ts, src/modules/historico/consultas.ts, src/modules/versoes.ts, src/lib/rota.ts, src/lib/acao-painel.ts, src/lib/erros.ts, src/lib/corpo.ts, src/vendor/construir/pedido.mjs, "src/app/api/pacotes-decisao/[decId]/pedido-construcao/route.ts", "src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.ts", "src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.test.ts (1-101, 180-249)", "src/app/(painel)/pacotes-decisao/[decId]/SecaoPedido.tsx", "src/app/(painel)/pacotes-decisao/[decId]/page.tsx", "src/app/(painel)/pacotes-decisao/[decId]/FormularioDecisao.tsx", "src/app/(painel)/demandas/[id]/Historico.tsx", "src/app/(painel)/demandas/[id]/detalhe.ts", src/components/dados-do-pedido.ts, src/components/CaixaSelecao.tsx, src/components/Botao.tsx, src/components/rotulos.ts (1-40, 120-255)]
status: pronto
proximo: engenheiro-backend
devolvido_para: null
---
## Entrega

Base conferida: ramo `construcao/DEC-DEM-20261104-0013-v1`, limpo, sobre `c2340e6` (0.1.11), com os commits `00-inicio`
e `01-reproducao` do maestro. As três causas da 01 (D1, D2, D3) batem com o código lido. Um engenheiro só para a 03:
`engenheiro-backend`. Tudo o que muda está em `src/` e `package.json`, na **Pode** dele, inclusive a caixa da T11
(`SecaoPedido.tsx`) e a Server Action (`acoes-pedido.ts`). O ajuste de `e2e/` fica com a `04-regressao`.

Ordem de trabalho na 03: **D2** (aprovadoPor, o menor), **D1** (nome: `minimizar.ts`, depois os valores do pedido,
depois `gerar.ts`), **D3** (confirmação: serviço, rota, Server Action, tela e histórico), **textos da T11**, **versão**.
Em cada defeito o teste vem primeiro e tem de ser visto falhando na base (comando e trecho da saída na entrega). Só
nomes fictícios; e-mail só no domínio `exemplo.test`.

---

### D2: `aprovadoPor` com o nome de quem aprovou

**Causa provável.** `aprovadoPor` (`src/modules/pedido-construcao/montar.ts:34-39`) faz `.map((a) => a.nome)`; o
`nome` é o `nomeAprovador` gravado na aprovação (`pacotes-decisao/consultas.ts:126`). O papel gravado na mesma linha já
está na vista (`Aprovador.papel`, `consultas.ts:30`).

**Arquivos.** `src/modules/pedido-construcao/montar.ts`, `src/modules/pedido-construcao/gerar.test.ts`,
`src/modules/pedido-construcao/gerar-bordas.test.ts`.

**Regra a implementar.**

- `aprovadoPor` = os **papéis** das aprovações (`a.papel`, valores de `PAPEIS_APROVACAO`: `cto`, `administradora`), na
  **ordem da aprovação**: por `registradaEm` crescente e, no mesmo instante, pela ordem de `PAPEIS_APROVACAO`; unidos por
  `' e '`. Exemplos: `'cto'` (nível "Só o CTO"); `'administradora e cto'` (a administradora aprovou primeiro);
  `'cto e administradora'` (o CTO primeiro, ou as duas no mesmo instante). O `validarPedido` do /construir só exige texto
  preenchido (`src/vendor/construir/pedido.mjs:38`): aceita os três.
- A ordenação fica explícita em `montar.ts` (não depende da ordem da consulta). O papel vem de `Aprovador.papel`, o
  gravado na aprovação, e **nunca** de `user.papel`: trocar o papel ou o nome da conta depois não muda o arquivo
  (CA-22.2, E7).
- Atualize o comentário de `montar.ts:32-33` e o do topo (`:1-4`), que passa a dizer que nenhum nome de pessoa entra.

**Testes de regressão esperados (primeiro, vistos falhando na base):**

1. `gerar.test.ts:175`: `aprovadoPor: 'cto'`.
2. `gerar.test.ts:205-215`: com a administradora em 01/12 e o CTO em 03/12, `'administradora e cto'`; ajuste o título
   do teste ("na ordem da aprovação").
3. `gerar.test.ts:217-222`: as duas no mesmo instante, `'cto e administradora'` (desempate pela ordem do papel).
4. `gerar-bordas.test.ts:233`: `aprovadoPor: 'administradora e cto'`.
5. `gerar-bordas.test.ts:125-136` é **substituído** por: depois da aprovação, trocar o `name` **e** o `papel` da conta
   do CTO (`user`); o JSON gerado é igual ao de antes, byte a byte, e `aprovadoPor` continua `'cto'`. Restaure a conta
   no `finally`, como hoje.
6. Em todos os casos, `validarPedido(p)` é `{ ok: true, erros: [] }` e o JSON não contém `Pessoa Ficticia CTO` nem
   `Pessoa Ficticia Adm`.

### D1: nome do solicitante no texto vai para o pedido

**Causa provável.** `gerarPedido` só procura e-mail, telefone e CPF (`gerar.ts:42`, `:67-68`); o nome do solicitante da
demanda travada (`gerar.ts:54`, `demandaTravada.solicitanteNome`) não é usado. A regra de nome existe só dentro de
`minimizar` (`minimizar.ts:248-254`), sem função exportada de detecção.

**Arquivos.** `src/modules/dados-pessoais/minimizar.ts` e `minimizar.test.ts`; `src/modules/pedido-construcao/conteudo.ts`,
`montar.ts`, `gerar.ts` e os testes; `src/modules/pacotes-decisao/criar.ts` (só a função exportada abaixo).

**1. Detecção em `minimizar.ts`, sem cópia da regra.**

```ts
// Passos 3 e 4 de `minimizar` (nome completo e partes), sem o cabeçalho de e-mail e sem os detectores.
function trocarNomes(s: string, nomes: readonly string[]): string;
// true quando a etapa do nome mudaria o texto: o nome completo ou uma parte aceita pela mesma regra.
export function temNome(texto: string, nomes: readonly string[]): boolean; // = trocarNomes(texto, nomes) !== texto
```

- Extraia de `minimizar` (`:248-254`) o trecho dos nomes para `trocarNomes`; `minimizar` passa a chamá-la, sem mudar
  o resultado (a suíte de `minimizar.test.ts` continua verde sem mexer em esperado).
- `temNome` usa **só** a etapa do nome (E3): `Para: o financeiro` e `De: ...` não contam, e e-mail, telefone e CPF ficam
  com o C-28. A igualdade `!== texto` é exata: a troca só acontece fora de marcador e sempre põe `[nome removido]` no
  lugar de um trecho que não é esse marcador.
- Comente no topo de `minimizar.ts` que o Pedido de Construção usa `temNome` (D1 do 0013).

**2. Os valores do pedido, sem os rótulos do sistema (E1, E2).** O nome é conferido nos **valores** escritos por
pessoa, antes de receberem rótulo, e o erro aponta o caminho do pedido onde o valor sai:

```ts
// conteudo.ts: os mesmos CAMPOS_DA_ESP e RISCOS de textoDaEspecificacao e textoDoParecer, só os valores preenchidos,
// lista achatada item a item. Nível ("Alto", "Médio", "Baixo") e rótulos ("Campos críticos", "Comentário") não entram.
export function valoresDaEspecificacao(esp: EspecificacaoVista): string[];
export function valoresDoParecer(rsk: ParecerRiscoVista): string[];

// criar.ts, ao lado de descricaoDaDemanda e com a mesma PARTES_DA_DESCRICAO: a descrição gravada no DEC sem os rótulos
// "Contexto: ", "Problema: " e "Impacto percebido: " do começo de cada bloco (início do texto ou depois de "\n\n").
export function descricaoSemRotulos(descricao: string): string;

// montar.ts: na ordem das chaves do pedido; um item por caminho.
export type TextoDoPedido = { caminho: string; valores: string[] };
export function textosDoPedido(dados: { dec: PacoteDecisaoVista; esp: EspecificacaoVista; rsk: ParecerRiscoVista }): TextoDoPedido[];
```

`textosDoPedido` devolve, nesta ordem: `demanda.titulo` (`dec.demandaTitulo`); `demanda.descricao`
(`descricaoSemRotulos(dec.demandaDescricao)`); `especificacao.conteudo` (`valoresDaEspecificacao(esp)`);
`risco.conteudo` (`valoresDoParecer(rsk)`); `decisao.opcaoEscolhida` (só a `descricao` da opção escolhida, sem o
`"A: "`); `sistema_alvo` e `repositorio_destino` (quando não nulos); `criterios_aceite_preliminares[i]` e
`definicao_de_pronto[i]`, um caminho por item. Ficam fora os valores que o sistema gera: ids, `tipo`, `nivel`,
`aprovadoPor` (agora papel) e `aprovadoEm`. A opção escolhida sai de `montarPedido` por uma função interna comum, para
as duas não divergirem.

**3. `gerar.ts`.** Depois da montagem, numa conferência só (E4):

```ts
const nomes = nomesDoSolicitante(demandaTravada.solicitanteNome); // demandas/consultas.ts:193
const comNome = textosDoPedido({ dec, esp, rsk })
  .filter((t) => t.valores.some((v) => temNome(v, nomes)))
  .map((t) => `${t.caminho}: nome`);
const erros = [...encontrarDadosPessoais(pedido, DADOS_PESSOAIS_DO_PEDIDO).map((d) => `${d.caminho}: ${d.tipo}`), ...comNome];
if (erros.length > 0) throw naoPassou(erros);
```

- Um 422 só, com a lista do C-28 primeiro, na ordem de hoje, e depois os caminhos com `nome`, na ordem de
  `textosDoPedido`. Sem o valor, nada entregue, nenhum evento. Depois, o `validarPedido`, como hoje.
- `nome` **não** entra em `TipoDadoPessoal` (`detectores.ts:4`): exigiria marcador e detector novos, e a minimização da
  T24 não muda. O texto `nome` é montado só em `gerar.ts`.
- Atualize o comentário do topo de `gerar.ts` (passo 5 com e-mail, telefone, CPF e nome).

**Testes de regressão esperados (primeiro, vistos falhando na base).** Solicitante `Joana Ficticia`, salvo indicação;
"422" = `nao_processavel`, `MENSAGENS_PEDIDO.naoPassou`, sem evento `pedido_gerado`, e `JSON.stringify(e.extras)` sem
`Joana` nem `Ficticia` (sem diferença de caixa):

| # | Entrada | Esperado |
|---|---|---|
| 1 | título `Pedido da Joana Ficticia` | 422 `['demanda.titulo: nome']` |
| 2 | contexto `JOANA FICTICIA monta à mão`; depois `joana ficticia monta à mão` | 422 `['demanda.descricao: nome']` nos dois |
| 3 | ESP `situacaoAtual` `Hoje a Joána Fictícia junta` | 422 `['especificacao.conteudo: nome']` |
| 4 | RSK `resumo` só com `Joana`; depois só com `Ficticia` | 422 `['risco.conteudo: nome']` |
| 5 | opção A `Enviar para JoanaFicticia`, `Joana_Ficticia` e `Joana2` (três DEC) | 422 `['decisao.opcaoEscolhida: nome']` |
| 6 | critério `['ok', 'Joana recebe']` e definição de pronto `['Ficticia aprova']` | 422 `['criterios_aceite_preliminares[1]: nome', 'definicao_de_pronto[0]: nome']` |
| 7 | solicitante `Rosa Dias Ficticia`; ESP `camisa rosa em 30 dias` | gera; duas gerações iguais byte a byte (CA-22.2) |
| 8 | solicitante `Maria dos Santos Neto Ficticia`; RSK `o Neto do cliente e dos fornecedores` | gera (partícula fora) |
| 9 | solicitante `Carlos Campos Ficticio`; ESP com `dadosCamposCriticos` `valor do frete`; RSK com nível `alto` e solicitante `Alto Ficticio` noutro DEC | gera nos dois (rótulo "Campos críticos" e nível "Alto" não contam, E2) |
| 10 | solicitante `Contexto Ficticio`; contexto `Importação diária` | gera (rótulo da descrição não conta) |
| 11 | ESP com a linha `Para: o financeiro` | gera (E3) |
| 12 | demanda sem solicitante (`solicitanteNome` nulo) | gera |
| 13 | e-mail e nome no mesmo campo: ESP `Joana Ficticia, contato@exemplo.test` | 422 `['especificacao.conteudo: e-mail', 'especificacao.conteudo: nome']` (E4) |
| 14 | título com nome, telefone no RSK | 422 `['risco.conteudo: telefone', 'demanda.titulo: nome']` (C-28 primeiro) |
| 15 | DEC gerado com sucesso; depois o solicitante é renomeado (`alterarDemanda`) para `Pedidos Ficticio` | a 2ª geração dá 422 com `demanda.titulo: nome` na lista (com o fixture de `gerar.test.ts`, também `demanda.descricao: nome`); o nome conferido é o atual da demanda travada (E6) |
| 16 | nome com menos de 3 letras (`Li`) | nada a conferir; gera |

Unitários novos:

- `minimizar.test.ts`, bloco "temNome (D1 do 0013)": `temNome(t, nomes) === (minimizar(t, { nomes }) !== minimizar(t))`
  para cada caso de nome já existente no arquivo cuja entrada não tem e-mail, telefone, CPF, CNPJ nem cabeçalho; e
  `temNome('Para: o financeiro', ['Joana Ficticia'])` e `temNome('contato@exemplo.test', ['Contato Ficticio'])` são
  `false`; `temNome('a joana pediu', ['Joana Ficticia'])` é `false` (parte em minúscula, risco aceito no 0011).
- `montar` ou `conteudo` (arquivo de teste que já cobre a montagem), guarda contra divergência: com ESP e RSK de
  **todos** os campos de `CAMPOS_DA_ESP` e `RISCOS` preenchidos com palavras sentinela distintas, cada sentinela que
  aparece no pedido montado aparece em algum valor de `textosDoPedido`, no caminho certo; e nenhum rótulo de
  `CAMPOS_DA_ESP`, `RISCOS`, `ROTULO_DO_NIVEL` e `PARTES_DA_DESCRICAO` aparece nos valores.
- `criar` (arquivo que já cobre `descricaoDaDemanda`): `descricaoSemRotulos(descricaoDaDemanda(x))` contém os três
  valores e nenhum rótulo; descrição vazia continua vazia.

**Testes existentes:** os de C-28 (`gerar.test.ts:305-325`, `gerar-bordas.test.ts:152-203`) não mudam de esperado. Se
algum teste existente passar a dar 422 por `nome`, confira se o texto do fixture contém o solicitante (`Pessoa
Ficticia`, ou o sentinela) com inicial maiúscula; só então troque o **solicitante** do fixture por outro nome fictício
e liste cada troca na entrega (arquivo:linha, antes, depois). Não troque o texto que o teste quer provar.

### D3: geração sem confirmação, e o histórico sem registro

**Causa provável.** A rota não declara corpo (`route.ts:8-15`), a Server Action só recebe `decId`
(`acoes-pedido.ts:15`), `gerarPedido` não tem parâmetro de confirmação e grava o evento sem `depois` (`gerar.ts:73`).
A T11 não tem a caixa (`SecaoPedido.tsx:73-81`).

**Arquivos.** `src/modules/pedido-construcao/schemas.ts` (novo), `gerar.ts`, `route.ts`, `acoes-pedido.ts`,
`SecaoPedido.tsx`, `src/components/dados-do-pedido.ts`, `src/components/rotulos.ts` e os testes de cada um.

**Interface.**

```ts
// src/modules/pedido-construcao/schemas.ts: uma regra só para a rota e a Server Action. `z.object` descarta chave
// desconhecida (C-11, como os outros schemas); tipo errado (`"true"`, 1) é 400 entrada_invalida, como em todo corpo.
export const confirmacaoDoPedidoSchema = z.object({ confirmaSemDadoPessoal: z.boolean().optional() });
export type ConfirmacaoDoPedido = z.output<typeof confirmacaoDoPedidoSchema>;

// gerar.ts: a confirmação é parâmetro obrigatório da função; o valor pode faltar (vem do corpo).
export async function gerarPedido(deps: DepsDemanda, ator: Ator, decId: string, entrada: ConfirmacaoDoPedido, t?: Transacao);

MENSAGENS_PEDIDO.semConfirmacao =
  'Confirme que o título, a descrição, a ESP e o parecer de risco não têm dado pessoal de ninguém. Nada foi entregue.';
```

- Ordem em `gerarPedido` (E8): 1. `autorizar` (403); 2. **`entrada.confirmaSemDadoPessoal !== true` → 422**
  `nao_processavel` com `semConfirmacao`, sem `erros`, antes de tocar o banco (vale para quem chama a função direto, no
  padrão do 403, e não diz se o DEC existe); 3. o resto como hoje (404, 409, estudo, montagem, D1, `validarPedido`).
- Evento: `depois: { confirmaSemDadoPessoal: true }`, `antes` nulo. Campo booleano fixo, sem texto (C-30).
- Rota: `corpo: confirmacaoDoPedidoSchema` e `gerarPedido(deps, ator, params.decId, corpo)`. POST sem corpo passa a dar
  400 (JSON inválido), como toda rota com corpo; com `{}` ou `false`, 422.
- Server Action: `entrada: paramId.versao('decId', 'DEC').extend(confirmacaoDoPedidoSchema.shape)` e repassa
  `{ confirmaSemDadoPessoal: entrada.confirmaSemDadoPessoal }`.
- Histórico: em `textoDoEvento` (`rotulos.ts:227-228`), `pedido_gerado` com `depois.confirmaSemDadoPessoal === true`
  diz `Gerou o Pedido de Construção de <DEC-id>, com a confirmação de que o texto não tem dado pessoal`; evento antigo,
  sem `depois`, fica com o texto de hoje.

**T11 (`SecaoPedido.tsx`), no padrão da caixa de revisão de `FormularioDecisao.tsx:169-178` (validação no envio, 03
2.5):**

- Entre o alerta de C-28 e o botão, `CaixaSelecao` com `id` `confirma-sem-dado-pessoal`, `rotulo`
  `TEXTOS_PEDIDO.confirmacao`, `obrigatorio`, `checked` do estado e `erro` do estado. O botão continua habilitado
  (não use `disabled`).
- Clique com a caixa desmarcada: **não** chama a Server Action; mostra `TEXTOS_PEDIDO.semConfirmacao` como erro da
  caixa (aria-describedby pela `CaixaSelecao`) e põe o foco na caixa. Marcar a caixa limpa esse erro.
- Com a caixa marcada: `gerarPedidoNoPainel({ decId, confirmaSemDadoPessoal: true })`. A caixa não é desmarcada depois
  de gerar.
- `erroDoPedido` (`dados-do-pedido.ts:52`) reconhece `semConfirmacao` (cópia em `MENSAGENS_PEDIDO_DO_SERVIDOR`, que o
  teste já confere contra `gerar.ts`) e mostra o texto, sem lista e sem orientação.

**Testes de regressão esperados (primeiro, vistos falhando na base):**

1. `gerar.test.ts`: `gerarPedido` com `{}` e com `{ confirmaSemDadoPessoal: false }` → 422 `semConfirmacao`, sem
   evento; com DEC que não existe e sem confirmação → 422 (a confirmação vem antes do 404); agente e sistema sem
   confirmação → 403 (o 403 vem antes).
2. `gerar.test.ts:440-449`: cada evento com `depois: { confirmaSemDadoPessoal: true }`.
3. `gerar-bordas.test.ts:116-123`: as cinco gerações concorrentes com a confirmação dão o mesmo JSON e cinco eventos,
   cada um com a confirmação.
4. Teste da rota (o arquivo que já cobre `pedido-construcao/route.ts`): corpo `{}` e `{"confirmaSemDadoPessoal":false}`
   → 422 com a mensagem; `{"confirmaSemDadoPessoal":"true"}` → 400 `entrada_invalida`; com a confirmação e uma chave a
   mais → 200 (chave descartada, C-11); token de agente com a confirmação → 403, sem evento.
5. `acoes-pedido.test.ts`: `{ decId }` sem a confirmação → `{ ok: false, erro: 'nao_processavel', mensagem:
   semConfirmacao }`, sem evento, e `erroDoPedido` mostra o texto; `:232-235` com `depois: { confirmaSemDadoPessoal:
   true }`; os 409 de `:190-221` e o 422 de `:246` passam a mandar a confirmação, para continuar provando o que dizem.
6. `rotulos` (arquivo que já cobre `textoDoEvento`): os dois textos de `pedido_gerado`, com e sem a confirmação.
7. Componente (se houver teste de `SecaoPedido`; senão, a regra fica no `dados-do-pedido.ts` e é testada lá): caixa
   desmarcada não chama a ação.

**Todas as chamadas existentes de `gerarPedido` nos testes** passam a mandar a confirmação (um helper local no topo de
cada arquivo, por exemplo `const CONFIRMADO = { confirmaSemDadoPessoal: true } as const`). Nenhum outro esperado muda.

### Textos da T11 (`src/components/dados-do-pedido.ts`)

Escritos aqui, para revisão da `ux-ui-design` (não há etapa de interface na cadeia curta):

- `avisoDadoPessoal`: `O pedido vai para o repositório git da estruturaAutonoma. Não deixe nome, e-mail, telefone ou CPF de qualquer pessoa ou do cliente no título, na descrição, na ESP nem no parecer de risco.`
- `confirmacao` (rótulo da caixa): `Confirmo que o título, a descrição, a ESP e o parecer de risco deste pacote não têm dado pessoal de ninguém: nome, e-mail, telefone ou CPF.`
- `semConfirmacao` (erro da caixa): `Marque a confirmação para gerar o pedido.`
- A orientação do 422 de validação deixa de ser uma frase fixa. Nova função
  `orientacaoDoPedido(erros: readonly string[]): string[]`, usada por `erroDoPedido` (`orientacao` passa a `string[]`,
  e a tela mostra um parágrafo por linha), com estas linhas, nesta ordem e só as que valem:
  1. algum erro termina em `: nome`: `O nome do solicitante, inteiro ou em parte com inicial maiúscula, está nos campos da lista. Tire o nome e gere de novo.`
  2. algum caminho começa por `demanda.titulo` ou `demanda.descricao`: `Título e descrição (demanda.titulo, demanda.descricao): corrija na demanda, em "Editar dados".`
  3. algum começa por `especificacao.`, `criterios_aceite_preliminares`, `definicao_de_pronto`, `sistema_alvo` ou `repositorio_destino`: `ESP, critérios de aceite, definição de pronto, sistema e repositório: corrija numa versão nova da ESP.`
  4. algum começa por `risco.`: `Parecer de risco (risco.conteudo): corrija num parecer de risco novo.`
  5. algum começa por `decisao.`: `Opção escolhida (decisao.opcaoEscolhida): corrija num pacote novo.`
  6. sempre que houver linha de 2 a 5: `Atenção: com este pacote aprovado, outro pacote desta demanda não pode ser aprovado nesta versão. Fale com o CTO antes de refazer o texto.`
  7. nenhuma das linhas 2 a 5 valeu: a frase de hoje, `Corrija criando uma versão nova da ESP e um pacote novo.`
- Testes: `dados-do-pedido.test.ts` confere cada frase e cada combinação (nome no título; e-mail na ESP; erro do
  `validarPedido` `sistema_alvo fora do formato...`; lista vazia), e que nenhuma linha traz valor do pedido.

### Versão

`package.json` com `0.1.12` (na **Pode** do `engenheiro-backend`).

### Definição de pronto do pedido, por etapa da cadeia curta

| Item | Etapa dona |
|---|---|
| `pnpm test`, `pnpm lint` e `pnpm typecheck` verdes | `03-correcao` (`engenheiro-backend`), e de novo na `04-regressao` |
| `pnpm test:e2e` verde três vezes seguidas, com o ajuste de `e2e/` (marcar a caixa na T11; POST com a confirmação; axe na T11 antes de marcar, marcada, gerada e com o 422) | `04-regressao` (`qa-automacao`) |
| `CHANGELOG.md` com a versão 0.1.12, e README e manual técnico se mudarem (corpo novo do POST, caixa da T11, `aprovadoPor` com papel) | `06-documentacao` (`documentacao-tecnica`) |
| PR com CI verde (e `docker build`, se a entrega pedir) | `05-entrega` (`devops-sre`) |

## Decisões tomadas

- Um engenheiro só, `engenheiro-backend`, como o maestro pediu: tudo está em `src/` e `package.json`, na Pode dele.
- E1 (maestro): o nome é conferido em todo texto escrito por pessoa que sai no pedido, inclusive
  `criterios_aceite_preliminares`, `definicao_de_pronto`, `sistema_alvo` e `repositorio_destino`. Ids, tipo, nível e
  datas ficam fora: o sistema os gera, e "DEM", "ESP" ou "RSK" seriam recusa falsa sem saída.
- E2 (maestro): a conferência é sobre os valores antes do rótulo (`textosDoPedido`), e o caminho do erro continua o do
  pedido. A descrição já chega rotulada do DEC, por isso `descricaoSemRotulos`, com a mesma lista de rótulos de
  `descricaoDaDemanda`. Um teste de guarda impede que um campo novo do pedido fique fora da conferência.
- E3 (maestro): `temNome` usa só a etapa do nome, extraída de `minimizar` para `trocarNomes`, e é definida como "a
  etapa mudaria o texto". Assim a regra não é copiada e não pode divergir.
- E4 (maestro): um 422 só. O C-28 vem primeiro, na ordem de hoje, e o nome depois, para os testes atuais do C-28 não
  mudarem.
- E5 (maestro): o fluxo de decisão e o A-02 não mudam. A orientação da T11 diz que campo corrigir e onde, e avisa sem
  rodeio que outro pacote não se aprova depois deste (linha 6), para ninguém refazer o texto às cegas. As opções
  estão em Pendências.
- E6: o nome conferido é o `solicitanteNome` atual da demanda travada, a mesma fonte da vista mínima. Solicitante nulo
  ou com menos de 3 letras não confere nada. Renomear depois pode passar a recusar um DEC aceito antes: é a proteção
  valendo sobre o nome atual, e o CA-22.2 vale "quando aceito". Nome antigo e nome de outra pessoa continuam sem
  detecção (RSK), cobertos pela confirmação.
- E6: os nomes das contas aprovadoras e de terceiros não entram na conferência. A ESP aprovada fala só do solicitante,
  e o nome de outras pessoas daria recusa falsa sem saída. A confirmação na T11 cobre esses nomes.
- E7: o papel vem da aprovação gravada, e não da conta, para o arquivo não mudar se a conta mudar de papel.
- E8: a confirmação é conferida dentro de `gerarPedido`, logo depois do `autorizar` e antes do banco. O 422 vale também
  para quem chama a função direto, e não revela se o DEC existe. Tipo errado no corpo dá 400, como em toda rota.
  Chave a mais é descartada: o C-11 deste sistema é `z.object`, e não 400 como a 01 supôs.
- E9: os POST de `e2e/pedido-construcao.spec.ts:173` e `:190` passam a mandar a confirmação, para seguirem testando o C-28
  e o Estudo. O ajuste é da 04.
- E10: o evento grava `{ confirmaSemDadoPessoal: true }`. O histórico mostra a confirmação em `textoDoEvento`, e as
  colunas Antes e Depois continuam vazias para este evento.
- `aprovadoPor` (maestro): papéis na ordem da aprovação, por `registradaEm`, com desempate pela ordem do papel, unidos
  por `' e '`. O `validarPedido` aceita. A ordem antiga, fixa pelo papel (`montar.ts:32-33`), sai. Se "ordem da
  aprovação" tiver de ser a ordem fixa `cto e administradora`, só muda a ordenação de `montar.ts` e os esperados 2 e 4
  de D2.
- Caixa da T11 com validação no envio, e não com o botão desabilitado. É o padrão do painel (03, 2.5, a caixa de
  revisão da T11), e o botão desabilitado não diz por que não envia.
- O e-mail que contém uma parte do nome com maiúscula (`Joana.Ficticia@...`) aparece como `e-mail` e também como `nome`
  no mesmo campo. As duas coisas são verdade, e a correção é uma só.

## Pendências

1. **E5, para Fabiano (não muda neste pedido).** Com um DEC aprovado, o A-02 (`decidir.ts:93-101, 219`) não deixa
   aprovar outro DEC da demanda. Uma recusa por nome, inclusive a falsa ("Santos" cidade, "Campos", "Rosa" no começo
   da frase), não tem saída dentro da demanda. As opções que vejo:
   - (a) Manter como está. Não custa código. A saída é encerrar a demanda e abrir outra com o texto limpo, refazendo
     ESP, RSK, DEC e aprovação, com novo documento assinado da administradora na dupla aprovação. O histórico fica
     partido em duas demandas.
   - (b) DEC aprovado mais novo substitui o anterior. O `decidir` deixa aprovar o DEC mais novo mesmo com outro
     aprovado, e o `gerarPedido` recusa com 409 todo DEC que não seja o aprovado mais novo, para nunca haver dois
     pedidos válidos. Sem migration. Mexe no A-02 e no CA-22.4, com revisão da `seguranca-aplicacao`. É um pedido
     próprio de risco alto, de cadeia curta, com cerca de um dia de cadeia. **Recomendo esta.**
   - (c) Ação "substituir aprovação" na T11: status novo na decisão, com migration, evento, permissão (na dupla
     aprovação, as duas contas?) e tela. É a mais auditável e a mais cara: dois a três dias, cadeia completa, risco
     alto.
   - (d) Gerar com o nome trocado por marcador, em vez de recusar. Custa pouco, mas foi descartada na aprovação deste
     pedido (CA-22.2 com renomeação, texto degradado no falso positivo). Não recomendo.
2. Para a `04-regressao` (`qa-automacao`): ajustar `e2e/pedido-construcao.spec.ts` (`:73-77`, `:109`, `:123`, `:138`,
   `:160`, `:173`, `:190`) para marcar a caixa ou mandar a confirmação; rodar o axe na T11 nos quatro estados; e
   conferir se o seed fictício (`scripts/seed-ficticio.ts`) tem o nome do solicitante com maiúscula no texto de algum
   DEC aprovado que o e2e gera. Se tiver, quem troca o fixture é o `engenheiro-backend` (`scripts/` está na Pode
   dele), com o motivo registrado.
3. Para a `ux-ui-design`, quando houver rodada de interface: revisar os textos da T11 escritos acima.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -n 5` — `639160f`, `2e9cb2e`, `c2340e6`, `cf69705`, `0709bac`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format= -- "src/components/*istor*" "src/app/*istor*"` — `Historico.tsx` e a rota de histórico
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat c2340e6 HEAD` — só a pasta do pedido mudou desde a base

## Critério de pronto atendido

- [x] (02 triagem) `proximo` é um dos três engenheiros
- [x] (02 triagem) cada item da definição de pronto do pedido está atribuído a uma etapa da cadeia curta, pela lista da Entrega
