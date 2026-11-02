---
pedido: DEC-DEM-20261102-0002-v1
etapa: 01-reproducao
agente: qa-funcional
leu: [pedido.json, contrato-passagem.md, e2e/apoio.ts, e2e/agentes-teto.spec.ts, e2e/decisao.spec.ts, e2e/parecer-risco-qa.spec.ts, e2e/axe-todas.spec.ts, e2e/detalhe-demanda.spec.ts, e2e/editar-demanda.spec.ts, e2e/fila.spec.ts, e2e/fila-qa.spec.ts, e2e/nova-demanda.spec.ts, e2e/especificacao-qa.spec.ts, e2e/especificacao.spec.ts, e2e/demanda-formularios-qa.spec.ts, e2e/pacote-decisao.spec.ts, e2e/parecer-risco.spec.ts, e2e/seguranca.spec.ts, e2e/seguranca-qa.spec.ts, e2e/servidor.ts, playwright.config.ts, .github/workflows/ci.yml, scripts/seed-ficticio.ts, src/modules/limites.ts, src/app/(painel)/layout.tsx, src/app/(painel)/configuracao/agentes/page.tsx, src/app/(painel)/configuracao/agentes/acoes.ts, src/app/(painel)/configuracao/agentes/TabelaAgentes.tsx, src/app/(painel)/pacotes-decisao/[decId]/page.tsx, src/app/(painel)/pacotes-decisao/[decId]/pacote-da-pagina.ts, src/app/(painel)/pacotes-decisao/[decId]/acoes.ts, src/app/(painel)/pacotes-decisao/[decId]/FormularioDecisao.tsx, src/components/dados-da-decisao.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Reprodução feita a partir do código, do log do CI copiado pelo maestro (execução 41249512830, commit e0f3933) e do
histórico registrado nos comentários das specs. Não rodei nada: o meu papel não tem Bash. Cada falha vem com o caminho
pelo qual ela aparece e com o que um teste precisa fazer para mostrá-la sempre.

**Achado principal: as três falhas não são independentes.** O 429 de `parecer-risco-qa.spec.ts:183` é consequência da
falha de `decisao.spec.ts:151`. A conta "cto" fecha a suíte limpa com exatamente 30 de 30 demandas na hora, e a falha
em `decisao.spec` faz o Playwright subir um worker novo, que cria mais uma demanda (seção 3).

### Ambiente

- CI do PR #1, job `e2e (Playwright contra o build de produção)` (`.github/workflows/ci.yml`, `pnpm test:e2e`).
- `playwright.config.ts`: `workers: 1`, `fullyParallel: false`, `retries: 0`, Chromium, sem `BASE_URL`. Nesse caso o
  `e2e/servidor.ts` sobe um Postgres descartável, roda as migrations e o seed fictício, depois `next build` e
  `next start` em 127.0.0.1:3101.
- As specs rodam uma de cada vez, em ordem alfabética de arquivo, todas no mesmo banco.
- Dados: só as contas e demandas fictícias do seed (`cto@ficticio.test`, `administradora@ficticio.test`) e as demandas
  "(fictício)" que as specs criam.

---

### 1. `e2e/agentes-teto.spec.ts:106`, "ligar o risco": axe em T12 com agente ligado (`document-title`, serious, alvo `html`)

**Passos (o que o teste faz)**
1. Entra como "cto" (`entrarComo`, `apoio.ts:31`) e dá ao agente de risco o `MODELO_FICTICIO` pela API (linha 110).
2. Abre `/configuracao/agentes`. A página tem `<title>` estático: `export const metadata = { title: TEXTOS_AGENTES.tituloAba }`
   (`page.tsx:31`), com o template `%s — WS Orquestrador de Demandas` de `(painel)/layout.tsx:19`.
3. Clica no interruptor "Agente de risco (RSK)", cancela o diálogo, clica de novo e escolhe "Ligar agente" (linhas 115 a 131).
4. A Server Action `alternarAgenteNoPainel` (`acoes.ts:36`) responde. `TabelaAgentes.tsx:72-74` aplica o estado novo na
   hora (`setTroca`, `avisar`) e depois roda `iniciarTransicao(() => router.refresh())`.
5. O teste confere o aviso, `aria-checked`, a API e a linha com o `<time datetime>` novo (linhas 132 a 142). Isso só
   prova que o corpo da página já recebeu os dados novos do servidor.
6. Na linha 143 roda `semViolacoes(page, 'T12 com agente ligado')`. O axe é chamado logo, em `apoio.ts:53`, sem esperar
   nada da página.

**Esperado:** `violacoes` igual a `[]`, como nas outras chamadas de axe dessa tela.
**Obtido (CI):** `expect(violacoes, 'axe em T12 com agente ligado').toEqual([])` falhou em `apoio.ts:55` com
`{ regra: 'document-title', impacto: 'serious', alvos: ['html'] }`. Na nova execução do mesmo código, passou.

**Causa aparente:** é uma corrida entre o axe e o `router.refresh()`. No Next 16, o metadado da página chega por
streaming, separado do corpo. Durante a re-renderização do refresh há um intervalo em que o corpo já está atualizado e
o `<title>` ainda não voltou ao `document`. O axe pode cair nesse intervalo. Duas evidências de que o título existe e só
não está lá naquele instante:
- o mesmo teste de tela confere `toHaveTitle('Agentes e teto de gasto — WS Orquestrador de Demandas')` no carregamento
  (linha 47);
- a nova execução passou.

### 2. `e2e/decisao.spec.ts:151`, "nível cto: aprovar A": axe em T11 decidido (`document-title`, serious, alvo `html`)

**Passos**
1. Entra como "cto". `prepararPacote(page, 'cto')` reaproveita a demanda da spec, guardada em `demandaDaSpec`, e cria um
   DEC de nível cto.
2. Abre `/demandas/<id>` e clica em "Abrir decisão DEC-…". É uma navegação no cliente para `/pacotes-decisao/<decId>`, e
   o título vem de `generateMetadata` (`page.tsx:43`, `metadadosDoPacote` em `pacote-da-pagina.ts:27`).
3. Marca Aprovar, Opção A e o comentário. Em "Registrar decisão" e "Confirmar e registrar", a Server Action
   `registrarDecisaoNoPainel` responde.
4. `FormularioDecisao.tsx:75-77`: `router.replace('/pacotes-decisao/<decId>?aviso=…')`, por `caminhoDepoisDeDecidir`
   (`dados-da-decisao.ts:437`). Mais uma navegação no cliente, com o metadado de `generateMetadata` chegando por streaming.
5. O teste confere o alerta, o foco, os textos e `main form` com 0 (linhas 166 a 174). São conteúdos do corpo
   re-renderizado.
6. Na linha 175 roda `semViolacoes(page, 'T11 decidido')` logo em seguida.

**Esperado:** `[]`.
**Obtido (CI):** `document-title` (serious, `html`) em `apoio.ts:55`, chamado de `decisao.spec.ts:175`. Na nova
execução, passou.

**Causa aparente:** a mesma do item 1. O corpo do destino já está na tela e o `<title>` do `generateMetadata` ainda não
chegou. O título existe, como mostra `decisao.spec.ts:92`, que confere `toHaveTitle('Decisão do pacote — WS Orquestrador
de Demandas')` na mesma rota.

### 3. `e2e/parecer-risco-qa.spec.ts:183`, "T07 da ESP com a correção da Lista de textos": `POST /api/demandas respondeu 429`

**Regra envolvida:** `conferirLimite` (`src/modules/limites.ts:45-55`) recusa com `limite_excedido` (HTTP 429) quando o
ator já tem 30 demandas com `criadaEm` na última hora (`total >= 30`). Conta pela autoria, e cada conta tem o seu
limite.

**Orçamento da conta "cto" na suíte limpa, em ordem de execução** (contei à mão, pelo código):

| Origem | Demandas da "cto" | Acumulado |
|---|---|---|
| seed fictício (`seed-ficticio.ts:240` e `:251`: as 5 de `DEMANDAS`, com a hora do sistema, antes do `next build`) | 5 | 5 |
| `decisao.spec.ts` (`demanda()`, criada uma vez no P1-b e guardada em `demandaDaSpec`, linhas 29-38) | 1 | 6 |
| `detalhe-demanda.spec.ts` (CA-07.3 e 409, `comPacoteAprovado`) | 2 | 8 |
| `editar-demanda.spec.ts` (5 testes, um `criar` cada) | 5 | 13 |
| `fila-qa.spec.ts` (3 + 1 + 1) | 5 | 18 |
| `fila.spec.ts` (CA-26.1: 5; paginação: 0, porque o total do banco já passa de 20) | 5 | 23 |
| `nova-demanda.spec.ts` (CA-03.2, "erros" e "anexos" salvam pela tela) | 3 | 26 |
| `parecer-risco-qa.spec.ts` beforeAll (2), duplo clique (1) e linha 183 (1) | 4 | **30** |

As demais specs não criam demanda pela "cto": `agentes-teto`, `axe-todas`, `seguranca`, `seguranca-qa` e
`pedido-construcao` usam as demandas do seed ou só versões, e as outras usam a "administradora". Isso confere com o
comentário de `parecer-risco-qa.spec.ts:17-18` ("a conta cto está em 30 de 30 demandas na suíte inteira"). Na execução
limpa, a linha 183 é a 30ª criação: encontra 29 e passa. **Não sobra folga nenhuma.**

**O que aconteceu na execução 41249512830**
1. `decisao.spec.ts:151` falhou (item 2).
2. Com `retries: 0`, o Playwright derruba o worker depois de uma falha e sobe outro para os testes seguintes. O módulo da
   spec é carregado de novo e `demandaDaSpec` volta a `null` (`decisao.spec.ts:29`).
3. O teste seguinte que usa `demanda()` é o CA-12.4 (linha 225, `prepararPacote`). Ele faz um segundo
   `POST /api/demandas` pela "cto": +1, e o orçamento da conta passa a 31.
4. `parecer-risco-qa.spec.ts`, beforeAll e duplo clique: as criações 28, 29 e 30 passam.
5. Na linha 185, `criar(page)` (linha 42) encontra 30 demandas na hora e recebe 429.
   `expect(r.ok(), 'POST /api/demandas respondeu 429').toBe(true)` falha em `apoio.ts:67`.

**Esperado:** o teste abre a T07 de uma demanda da "cto" e confere a Lista de textos.
**Obtido (CI):** `POST /api/demandas respondeu 429` em `apoio.ts:67`, chamado de `parecer-risco-qa.spec.ts:185`. Na nova
execução, `decisao.spec.ts:151` não falhou, não houve worker novo e o 429 não apareceu.

**Consequência para a triagem:** qualquer falha em `decisao.spec.ts`, em qualquer teste antes do último, produz o mesmo
429 no fim da suíte. O 429 esconde a falha de origem atrás de uma segunda falha, sem relação com ela. Corrigir só o axe
reduz a chance, mas o orçamento continua em 30 de 30.

---

### O que um teste precisa fazer para mostrar cada falha de forma determinística

**Falhas 1 e 2 (`document-title`)**

Não dá para controlar o momento exato do streaming. O que dá é montar no teste o estado que o axe viu no CI: página
pronta e sem `<title>`.

- **Reprodução da corrida.** Abrir qualquer tela do painel (ex.: `/configuracao/agentes` com a "cto") e esperar o título.
  Remover o título com `page.evaluate(() => document.querySelectorAll('title').forEach((t) => t.remove()))` e agendar a
  volta dele na própria página, com `setTimeout(() => { document.title = 'Agentes e teto de gasto — WS Orquestrador de Demandas' }, 500)`.
  Em seguida, chamar `semViolacoes` na hora.
  - Hoje: falha sempre com `document-title`.
  - Depois da correção (a) da ESP: tem de passar, porque o `semViolacoes` espera o `<title>` não vazio.
- **Controle negativo (critério 2 do pedido).** Mesma tela, título removido e sem `setTimeout`. `semViolacoes` tem de
  rejeitar. Por exemplo, `await expect(semViolacoes(page, 'sem título')).rejects.toThrow()`, aceitando o erro da espera
  pelo título ou a violação `document-title`. Prova que nenhuma regra foi desligada e que uma tela sem título continua
  reprovada.
- **Opcional, sem garantia de determinismo.** Atrasar com `page.route` a resposta RSC do `router.refresh()` (requisição
  com cabeçalho `rsc: 1`) e rodar o axe sem esperar. Depende de como o Next 16 aplica o metadado. Fica só como apoio, não
  como prova.

**Falha 3 (429)**

O orçamento da "cto" tem de estar em 30 antes da linha 185. Dois caminhos:

- **Orçamento esgotado de propósito.** Com o servidor do e2e recém-subido (o seed já deu 5 à "cto"), criar pela API, com
  a "cto", 25 demandas fictícias (`titulo: 'Esgotar limite (fictício) n'`). Depois rodar só o teste da linha 183, com
  `--grep "T07 da ESP com a correção da Lista de textos"` e o beforeAll do describe fora do filtro. A linha 185 recebe 429
  sempre.
  - Depois da correção (b) da ESP, o mesmo cenário tem de passar.
  - O teste também deve registrar `page.on('request')` e conferir que nenhum `POST /api/demandas` saiu dele (critério 3).
- **Cascata.** Na suíte inteira, fazer qualquer teste de `decisao.spec.ts` antes do CA-12.4 falhar (ex.: um `expect`
  impossível só para a reprodução). O worker novo recria a demanda da spec e a linha 185 recebe 429 sempre.

O 429 em si continua coberto fora do e2e (`src/modules/limites.test.ts`, `src/app/api/demandas/demandas.bordas.test.ts`).
Nada disso pede mudar `conferirLimite`, variável de ambiente, conta ou cabeçalho.

### Arquivos suspeitos

- `e2e/apoio.ts:52-56`: `semViolacoes` roda o axe sem esperar o `<title>` (falhas 1 e 2).
- `e2e/agentes-teto.spec.ts:131-143`: axe logo depois do `router.refresh()` de `TabelaAgentes.tsx:74`.
- `e2e/decisao.spec.ts:165-175`: axe logo depois do `router.replace` de `FormularioDecisao.tsx:76-77`.
- `e2e/decisao.spec.ts:29-38`: `demandaDaSpec` guardada no módulo. Um worker novo recria a demanda, e é esse +1 que leva
  ao 429.
- `e2e/parecer-risco-qa.spec.ts:42` e `:183-186`: a última criação de demanda da "cto" na suíte, sem folga.
- `scripts/seed-ficticio.ts:138-182`: `TITULOS_DO_E2E` e `DEMANDAS_DO_E2E` (autoria `sem2fa`), onde entra a demanda
  própria da linha 183.
- O código do sistema (`(painel)/layout.tsx:19`, `configuracao/agentes/page.tsx:31`, `pacotes-decisao/[decId]/page.tsx:43`)
  não é suspeito de defeito. O título existe e chega, como mostram `toHaveTitle` nas linhas 47 da agentes-teto e 92 da
  decisao.

### Severidade

**Baixa.** Nenhum efeito para quem usa o painel: o `<title>` chega em toda tela, e o 429 é o C-36 funcionando como foi
especificado. O efeito é no fluxo de entrega: o CI fica vermelho sem regressão, o merge trava e não se cumpre a definição
de pronto "pnpm test:e2e verde três vezes seguidas". Além disso, o 429 em cascata esconde a falha de origem.

### Casos exploratórios sugeridos para a regressão

- Rodar a suíte inteira com uma falha forçada em `decisao.spec.ts`. Depois da correção, só esse teste deve falhar, sem
  429 no fim.
- Rodar `parecer-risco-qa.spec.ts` sozinho e depois da suíte inteira. Os dois resultados devem ser iguais.
- `fila.spec.ts`, teste da paginação (linha 92): ele cria demandas pela "cto" até o total passar de 20. Rodado sozinho ou
  contra um banco com poucas demandas, gasta até 16 do limite da "cto". É candidato a usar demandas do seed, como diz o
  item (c) da ESP.
- O limite de 60 versões por hora da "cto" também está alto na suíte, perto de 45 pela minha contagem à mão. Vale o
  `qa-automacao` conferir com número exato.

## Decisões tomadas

- Tratei o 429 como consequência da falha da decisao.spec, e não como acaso: a conta da tabela fecha em 30 de 30 na suíte limpa e em 31 com um worker novo.
- Contei as demandas da "cto" pelo código e pelos comentários C-36 das specs: sem Bash, não pude contar no banco.
- Severidade baixa: o critério é o impacto em quem usa, e o produto não muda; o efeito é só no pipeline.
- Para a corrida do título, propus montar o estado no teste (título removido e devolvido depois), porque o tempo do streaming do Next não se controla de forma confiável.

## Pendências

- Não confirmei a ordem dos testes nem o worker novo no log completo do CI: só tenho os trechos que o maestro copiou. A triagem pode conferir no log da execução 41249512830 se aparece um worker novo depois de `decisao.spec.ts:151` e o CA-12.4 criando uma segunda demanda.
- A explicação do streaming do metadado no Next 16 vem do pedido e do comportamento observado; não li o código do Next.

## Comandos executados

Nenhum.

## Critério de pronto atendido

- [x] (01) os passos de reprodução estão completos e o resultado obtido está descrito
