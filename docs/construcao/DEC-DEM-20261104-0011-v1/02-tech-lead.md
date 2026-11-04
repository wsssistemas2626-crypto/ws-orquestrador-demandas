---
pedido: DEC-DEM-20261104-0011-v1
etapa: 02-triagem
agente: tech-lead
leu: [contrato-passagem.md, pedido.json, 01-qa-funcional.md, engenheiro-backend.md (Pode), src/modules/dados-pessoais/minimizar.ts, src/modules/dados-pessoais/minimizar.test.ts, src/components/dados-da-demanda.ts, src/components/dados-da-demanda.test.ts (45-64), src/lib/reduzir-erro.ts, src/lib/sentry.ts, "src/app/api/demandas/[id]/especificacoes/route.ts", "src/app/api/demandas/[id]/pareceres-risco/route.ts", "src/app/api/demandas/[id]/pacotes-decisao/route.ts", src/modules/especificacoes/servico.ts, src/modules/pareceres-risco/servico.ts, src/modules/pacotes-decisao/criar.ts, src/modules/versoes.ts, src/db/transacao.ts, src/modules/demandas/consultas.ts (1-30, 180-308), src/modules/agentes/executar.ts (85-124), "src/app/(painel)/demandas/[id]/especificacoes/nova/acoes.ts", src/app/api/demandas/nomes-antes-de-gravar.test.ts, src/app/api/demandas/demandas.test.ts (465-499), test/estatico/pacote-sem-extras.test.ts, test/sentinelas.ts]
status: pronto
proximo: engenheiro-backend
devolvido_para: null
---
## Entrega

Base conferida: ramo `construcao/DEC-DEM-20261104-0011-v1`, limpo, sobre `fb675ee` (0.1.9). As causas apontadas pela
01 batem com o código. Um engenheiro só para a 03: `engenheiro-backend`. Tudo o que muda está em `src/`, `test/` e
`package.json`, dentro da **Pode** dele; a dica e o aviso são constantes de `src/components/dados-da-demanda.ts`, sem
mudança de tela.

Ordem de trabalho na 03: D-4, D-5, D-1, D-2, D-3. Os três primeiros são unitários e não dependem de banco. O D-2 depende
do texto do D-1. O D-3 é o único com Testcontainers e mexe no tipo de retorno de três serviços. Em cada defeito, o
teste vem primeiro e tem de ser visto falhando na base (comando e trecho da saída na entrega).

### D-1 (M-1 do 0009): cada parte do nome do solicitante vira marcador

**Causa provável.** `padraoDoNome` (`src/modules/dados-pessoais/minimizar.ts:36-40`) monta uma regex só, com o nome
inteiro (`partes.join('\\s+')`). Não existe regra de parte. A regex `giu` também não iguala letra com e sem acento
(`Conceicao` não casa com `Conceição`), apesar de a ESP dizer "como hoje".

**Arquivos.** `src/modules/dados-pessoais/minimizar.ts` e `src/modules/dados-pessoais/minimizar.test.ts`. A entrada do
worker (`src/modules/agentes/entrada-agente.ts`) e as vistas da API (`src/modules/demandas/consultas.ts` e as vistas
mínimas de ESP, RSK e DEC) já chamam `minimizar`/`minimizarValor` e **não mudam**: a correção chega a elas pela função.

**Interface (assinaturas de hoje mantidas):**

```ts
export const PARTICULAS_DO_NOME: ReadonlySet<string>; // minúscula e sem acento
export function partesDoNome(nome: string): string[]; // exportada para teste
export function minimizar(texto: string, op?: { nomes?: readonly string[] }): string;   // igual
export function minimizarValor(v: unknown, nomes: readonly string[]): unknown;          // igual
```

**Regra a implementar** (decisões do maestro e desta triagem, em "Decisões tomadas"):

1. Ordem dentro de `minimizar`: cabeçalhos, detectores (como hoje), depois **o nome completo de cada item de `nomes`**,
   e só depois **as partes de todos os nomes**. Nome completo antes de parte, para virar um marcador só.
2. Nome completo: regra de hoje (sem diferença de caixa, `\s+` entre os pedaços separados por espaço, sem ser pedaço de
   outra palavra, mínimo de 3 caracteres), mais a igualdade sem acento do item 5.
3. Partes (`partesDoNome`): o nome é cortado em espaço, hífen (`-`, `‐`, `‑`) e apóstrofo (`'`, `’`, `ʼ`); cada pedaço
   perde as pontas que não são letra nem número (`(Ficticia)` vira `Ficticia`); entra se tiver 3 letras (`\p{L}`) ou
   mais e se, sem caixa e sem acento, não estiver em `PARTICULAS_DO_NOME`; sem repetição.
4. `PARTICULAS_DO_NOME`, lista fechada exportada: `da, das, de, do, dos, du, del, della, di, van, von, der, den, le, la,
   e, y` e os sufixos de parentesco `filho, filha, neto, neta, junior` (a comparação sem acento cobre `Júnior`; pode
   gravar as duas formas, como o maestro listou) e `sobrinho`.
5. Sem acento, nos dois sentidos: `Conceicao` no texto casa com o nome `Conceição`, e `Conceição` no texto casa com o
   nome `Conceicao`. Caminho recomendado, que preserva os índices do texto original:
   - dobrar o nome com `normalize('NFD')` e tirar `\p{M}`;
   - dobrar o texto **caractere a caractere, sem mudar o comprimento**: o caractere composto (NFC) vira a letra base
     quando o NFD dele é uma letra de uma unidade mais marcas; a marca combinante solta (texto em NFD) fica onde está;
   - na regex, cada letra do nome dobrado vem seguida de `\p{M}*`, e as bordas passam a ser
     `(?<![\p{L}\p{M}\p{N}_])` e `(?![\p{L}\p{M}\p{N}_])`;
   - casar no texto dobrado e trocar a mesma faixa no texto original.
   Outro caminho é aceito se passar nos mesmos testes; não normalize o texto que sai (o resto do texto não pode mudar).
6. Maiúscula na parte: a parte só é trocada se, **no texto original**, o primeiro caractere do trecho casado for
   maiúsculo (`/^\p{Lu}/u`, **sem** a flag `i`). O resto do trecho é sem diferença de caixa (`JOANA` sai). Atenção: com
   as flags `iu`, `\p{Lu}` casa letra minúscula também; por isso a conferência fica no callback do `replace` (ou numa
   regex sem `i`), e não dentro da regex com `i`. Recomendado: uma regex só, em alternância, com todas as partes (da mais
   longa para a mais curta), uma passada por trecho fora de marcador.
7. Nada é trocado dentro de marcador: as partes passam pelo mesmo `trocarNome` (split em `RE_MARCADOR`). Partes como
   `Nome` e `Removido` não podem estragar `[nome removido]` nem `[e-mail removido]`.
8. Atualizar o comentário do topo do arquivo com a ordem nova.

**Testes de regressão esperados** (`minimizar.test.ts`, bloco novo "M-1 do 0009: cada parte do nome"; nomes
fictícios). Cada linha da tabela do D-1 da 01 é um caso, com o esperado da 01, mais:

| Nome | Texto | Esperado |
|---|---|---|
| `Joana Ficticia` | `A Joana pediu o relatório. Falei com a Ficticia ontem. Joana Ficticia confirmou.` | `A [nome removido] pediu o relatório. Falei com a [nome removido] ontem. [nome removido] confirmou.` |
| `Joana Conceição Ficticia` | `a Conceicao pediu` | `a [nome removido] pediu` |
| `Joana Conceicao Ficticia` | `a Conceição pediu; CONCEIÇÃO aprovou` | `a [nome removido] pediu; [nome removido] aprovou` |
| `Joana Conceição Ficticia` | `joana conceicao ficticia ligou` | `[nome removido] ligou` (nome completo, sem caixa e sem acento) |
| `Joana Conceição Ficticia` | o texto `a Conceição pediu` em NFD (`'Conceição'`) | `a [nome removido] pediu` |
| `Érica Ícaro Ficticia` | `a Érica e o ÍCARO` | `a [nome removido] e o [nome removido]` |
| `Ana-Clara D'Ávila` | `a Clara e a Ávila; D'Ávila assinou` | `a [nome removido] e a [nome removido]; D'[nome removido] assinou` |
| `Carlos Ficticio Neto` | `o Neto do cliente e o Carlos` | `o Neto do cliente e o [nome removido]` (sufixo fica) |
| `Ana dos Santos` | `Dos Santos e Da Silva` | `Dos [nome removido] e Da Silva` (partícula com maiúscula fica) |
| `Joana Ficticia` | `a joana pediu` | igual (risco que sobra, aceito no RSK) |

Mais: `PARTICULAS_DO_NOME` contém exatamente a lista do item 4; `partesDoNome('Ana dos Santos Filho')` é
`['Ana', 'Santos']`; idempotência (`minimizar(minimizar(t, op), op) === minimizar(t, op)`) em todos os casos novos;
tempo: nome de 200 caracteres com muitas partes sobre texto de 100.000 caracteres termina em menos de 1 s (teste com
folga, sem medir milissegundo).

Testes de integração (casos novos, nos arquivos que já existem para isso):
- `src/app/api/demandas/demandas.test.ts`: demanda de `Joana Ficticia` com título `Relatório da Joana` e contexto
  `A Joana pediu o relatório mensal.`; com token de agente, `GET /api/demandas/<id>` e `GET /api/demandas?limit=100`
  saem com `[nome removido]`; com a sessão da pessoa, o original.
- `src/modules/agentes/entrada-agente.test.ts`: `montarEntrada` de `insumo_tecnico` (`demanda:<id>`) e de
  `orquestrador` (`entrada:<uuid>`, texto `Oi, aqui é a Joana, do financeiro.`) sem `Joana` no conteúdo.
- `src/app/api/pacotes-decisao/pedido.test.ts`: o Pedido de Construção de um DEC aprovado com `A Joana pediu` no texto
  leva o original (contraprova do CA 3).

**Testes existentes cujo esperado muda (pela decisão 3 do maestro e pela regra nova), e só estes podem mudar sem
explicação adicional:**
- `minimizar.test.ts:252`: `'Pedido de Ana [nome removido] Lima'` (parte `Exemplo` em comum com o nome de outra pessoa).
- `demandas.test.ts:489`: `'Pedido de [nome removido], falar com Bruno [nome removido] Rocha'`; `:490`:
  `'Pedido de Ana [nome removido] Lima, falar com [nome removido]'` (mesma razão).
- `minimizar.test.ts:204`: `'[nome removido] assinou; [nome removido] também.'` (a parte `nome` de `'nome removido'`
  troca `Nome`, que começa por maiúscula).

Se `pnpm test` acusar outro esperado que mude (fixtures com `Maria Ficticia Teste`, `Pessoa Ficticia`, `Pessoa
Ficticia Sentinela`, `Fulana Fictícia Teste` em `vistas-para-agente.test.ts`, `entrada-agente.test.ts`,
`demandas.test.ts` ou outro), só ajuste o esperado quando a mudança vier de uma destas duas regras: parte em comum com
o nome de outra pessoa, ou palavra com inicial maiúscula igual a uma parte do nome do solicitante. Na entrega, liste cada
ajuste com arquivo:linha, o antes, o depois e a regra. Não troque fixture para fugir do efeito. Esperado que mude por
outro motivo é regressão: corrija o código.

### D-2 (agravante do M-1): a dica e o aviso prometem mais do que o sistema faz

**Causa provável.** Os textos fixos de `src/components/dados-da-demanda.ts:29-30` (`avisoMinimizacao`) e `:34`
(`dicaNome`).

**Arquivos.** `src/components/dados-da-demanda.ts`, `src/components/dados-da-demanda.test.ts:54-55` e
`src/app/(painel)/demandas/nova/formularios.test.ts:66,121` (citados pela 01).

**Textos novos (exatos):**
- `dicaNome`: `O campo não vai ao agente de IA. Evite repetir o nome no texto: o sistema troca o nome do solicitante, mas não o de outras pessoas.`
- `avisoMinimizacao`: `O agente recebe só o texto, sem a origem e com e-mails, telefones, CPF e CNPJ trocados por marcadores. O nome do solicitante e cada parte dele escrita com inicial maiúscula também viram marcador; nomes de outras pessoas, não. Você revisa a proposta antes de qualquer decisão.`

**Teste de regressão esperado.** Os testes que conferem as frases passam a conferir as novas (primeiro mudar o
esperado e ver falhar, depois mudar a constante), e um teste novo garante que nenhum dos dois textos contém `não é
enviado ao agente` nem `sem o nome do solicitante`.

### D-3 (B-3 do 0010): o 201 dos 3 POST minimiza com o nome lido fora da trava

**Causa provável.** As três rotas (`especificacoes/route.ts:17`, `pareceres-risco/route.ts:17`,
`pacotes-decisao/route.ts:18`) chamam `nomesDaDemanda` fora da transação, antes de `travarDemanda`
(`src/modules/versoes.ts:18-22`). A linha travada (`atual` em ESP e RSK, `d` no DEC) já traz `solicitanteNome` e é
descartada.

**Arquivos.** `src/modules/especificacoes/servico.ts`, `src/modules/pareceres-risco/servico.ts`,
`src/modules/pacotes-decisao/criar.ts`, as três rotas, `src/app/api/demandas/nomes-antes-de-gravar.test.ts` e
`test/estatico/pacote-sem-extras.test.ts`.

**Interface.** Os três serviços de hoje ficam com a assinatura e o retorno iguais, para não mexer no worker
(`executar.ts:100,105,113`), nas três Server Actions nem nos testes que os chamam. Cada módulo ganha uma função para as
rotas, com 4 argumentos e sem `t` nem `extras`:

```ts
export function criarEspecificacaoComNomes(deps: DepsComFila, ator: Ator, demandaId: string, entrada: CriarEspecificacao): Promise<{ vista: EspecificacaoVista; nomes: string[] }>;
export function criarParecerRiscoComNomes(deps: DepsComFila, ator: Ator, demandaId: string, entrada: CriarParecerRisco): Promise<{ vista: ParecerRiscoVista; nomes: string[] }>;
export function criarPacoteDecisaoComNomes(deps: DepsComFila, ator: Ator, demandaId: string, entrada: CriarPacoteDecisao): Promise<{ vista: PacoteDecisaoVista; nomes: string[] }>;
```

Dentro de cada módulo, um núcleo comum (não exportado) roda o `corpo` de hoje e devolve `{ id, nomes }`, com
`nomes = nomesDoSolicitante(<linha travada>.solicitanteNome)` calculado **dentro da transação, depois de
`travarDemanda`**. `criarX` devolve só a vista (como hoje); `criarXComNomes` devolve a vista e os nomes. A rota passa a
ser `const { vista, nomes } = await criarXComNomes(deps, ator, params.id, corpo)` e não chama mais `nomesDaDemanda` no
POST. Os GET ficam como estão. Atualizar os comentários das rotas e dos serviços.

**Testes de regressão esperados:**
1. Corrida, nas três rotas (novo, em `nomes-antes-de-gravar.test.ts` ou num arquivo novo ao lado): com uma conexão do
   `poolMigrator`, abrir transação, `SELECT ... FOR UPDATE` na demanda e `UPDATE` do `solicitante_nome` de `Joana
   Ficticia Antiga` para `Carla Ficticia Nova`; disparar o POST com token de agente e texto `Falar com Carla Ficticia
   Nova sobre o relatório.`; esperar o POST ficar em espera de trava (consultar `pg_stat_activity` com
   `wait_event_type = 'Lock'`, com prazo); fazer `commit`; o 201 tem de sair com `Falar com [nome removido] sobre o
   relatório.`. Na base, esse teste falha (a rota lê o nome antigo antes da trava): mostre a falha na entrega.
2. Falha não grava nada (refazer o bloco de hoje): o ponto de falha deixa de ser `nomesDaDemanda` na rota e passa a ser
   `nomesDoSolicitante` chamado pelo serviço dentro da transação (mesmo `vi.mock` de `modules/demandas/consultas`,
   armado uma vez). Esperado igual ao de hoje: 500 com `erro_interno`, nem versão, nem evento, nem status, nem aviso;
   a nova tentativa cria a v1 (DEC) ou a v2 (ESP, RSK), pelos atores pessoa e agente.
3. Os códigos 404, 409, 429 e 400 com `faltando` continuam iguais (bloco de hoje, sem mudança de esperado).
4. O teste "uma leitura por POST" vira: o POST não chama `nomesDaDemanda` (zero chamadas) e chama `nomesDoSolicitante`
   uma vez, com o nome da linha travada.
5. `test/estatico/pacote-sem-extras.test.ts`: a varredura cobre também `criarPacoteDecisaoComNomes`, com o mesmo
   máximo de 4 argumentos e as mesmas regras de referência; o teste "enxerga os dois chamadores" passa a aceitar a
   rota chamando a função nova. A guarda do B-1 do 0006 (C-11, C-25) não pode ficar mais fraca.

### D-4 (B-2 do 0010): `reduzirErro` usa `name` que não é string, ou que muda entre leituras

**Causa provável.** `src/lib/reduzir-erro.ts:56` lê `e.name` duas vezes e não confere o tipo; `RegExp.test` converte o
argumento para string.

**Arquivos.** `src/lib/reduzir-erro.ts` e o teste dele (`src/lib/reduzir-erro.test.ts`, ou o arquivo de teste que já
cobre `reduzirErro`).

**Correção.** Ler `e.name` uma vez, numa variável local `unknown`, e usar só ela:
`const classe = typeof nome === 'string' && classeAceita(nome) ? nome : 'Error'`.

**Teste de regressão esperado.** Os três passos do D-4 da 01 (getter que muda, objeto com `toString` que muda, array),
todos com `{ classe: 'Error' }` (mais o `code`, se houver), e, com o transporte de teste do Sentry, o título enviado é
`Error`.

### D-5 (B-4 do 0010): `capturarErro` marca o erro antes de enviar

**Causa provável.** `src/lib/sentry.ts:47-50` grava em `jaEnviados` antes de `reduzirErro` (`:51`) e de
`Sentry.captureException` (`:55`).

**Arquivos.** `src/lib/sentry.ts` e o teste dele.

**Correção.** Manter o `jaEnviados.has(e)` no começo e mover o `jaEnviados.add(e)` para depois de
`Sentry.captureException` voltar. Nada mais muda no fluxo.

**Teste de regressão esperado.** O D-5 da 01: `code` com getter que lança (ou `vi.mock` de `reduzirErro` lançando na
primeira chamada); a primeira `capturarErro` lança e não envia; a segunda envia **um** evento. E o teste do B-a do 0008
(mesmo objeto por `console.error` e `onRequestError`) continua com um evento só.

### Versão

`package.json` com `0.1.10` (na **Pode** do `engenheiro-backend`).

### Definição de pronto do pedido, por etapa da cadeia curta

| Item | Etapa dona |
|---|---|
| `pnpm test`, `pnpm lint` e `pnpm typecheck` verdes | `03-correcao` (`engenheiro-backend`), e de novo na `04-regressao` |
| `pnpm test:e2e` verde três vezes seguidas (e qualquer ajuste em `e2e/`) | `04-regressao` (`qa-automacao`) |
| `CHANGELOG.md` com a versão 0.1.10 (e README e manual técnico, se mudarem) | `06-documentacao` (`documentacao-tecnica`) |
| PR com CI verde (e `docker build`, se a entrega pedir) | `05-entrega` (`devops-sre`) |

## Decisões tomadas

- Um engenheiro só, `engenheiro-backend`: tudo está em `src/`, `test/` e `package.json`, na Pode dele; a dica e o aviso
  são constantes, sem componente de tela.
- Acento (resposta 1 do maestro): nome completo e parte casam sem acento nos dois sentidos, e o texto em NFD também;
  caminho recomendado por dobra de mesmo comprimento, porque troca só a faixa casada e não normaliza o resto do texto.
- Hífen e apóstrofo (resposta 2): cortam partes; as pontas que não são letra nem número saem do pedaço, para
  `(Ficticia)` virar `Ficticia` e o caso de hoje da linha 147 do teste seguir igual.
- Sufixos de parentesco (resposta 2): `filho, filha, neto, neta, junior/júnior, sobrinho` entram em
  `PARTICULAS_DO_NOME`; `sobrinha` não, porque não está na lista do maestro.
- Partícula comparada sem caixa e sem acento, para `Dos` e `Da` com maiúscula ficarem.
- Parte em comum com o nome de outra pessoa (resposta 3): aceita; esperados de teste ajustados listados acima
  (`minimizar.test.ts:204,252`, `demandas.test.ts:489,490`), e o engenheiro lista cada outro ajuste na entrega.
- Todos os nomes completos antes de todas as partes: num `nomes` com mais de um item, a parte de um nome não quebra o
  nome completo do outro.
- Nome completo segue sem diferença de caixa em toda a extensão, inclusive o nome de uma palavra só (`ana` continua
  trocado pelo nome `Ana`): é o comportamento de hoje, que a ESP manda manter.
- A conferência da maiúscula fica fora da regex com `i`, porque em JavaScript `\p{Lu}` com `iu` casa minúscula.
- Texto do aviso diz "cada parte dele escrita com inicial maiúscula", para não prometer a troca de `joana` em
  minúscula, que é o risco que sobra.
- B-3 com função nova de 4 argumentos por serviço, e não mudança do retorno de hoje: o worker, as Server Actions e os
  testes que chamam os serviços não mudam, e a rota não tem como passar `t` nem `extras`.
- A guarda estática do B-1 do 0006 passa a cobrir `criarPacoteDecisaoComNomes`, para nenhum controle ficar mais fraco.
- O teste da corrida usa a trava de linha real e a espera em `pg_stat_activity`, e não mock de tempo: é determinístico
  e falha na base.
- Fora do escopo (resposta 4): orientar ESP e RSK a escrever "o solicitante" e o nome original no Pedido de Construção
  ficam com Fabiano e `juridico-contratos`.

## Pendências

1. Para a `04-regressao` (`qa-automacao`): se algum teste de `e2e/` conferir a frase antiga da dica do nome ou do aviso
   de minimização, o ajuste é dela (o `engenheiro-backend` não edita `e2e/`). Não foi possível conferir: a triagem não
   tem Grep nesta sessão.
2. Para a `04-revisao` (maestro), só registro: `lerCode` com getter de `code` que lança faz `reduzirErro` e
   `capturarErro` lançarem. Depois do D-5 o erro deixa de ficar marcado sem envio, mas quem chama `capturarErro` continua
   recebendo a exceção. A ESP não pede mudança aqui; fica para a revisão decidir se vira baixo de outro pedido.
3. Fora do escopo, como a 01 e o maestro disseram: orientação de escrita de ESP e RSK e o nome no Pedido de Construção
   (Fabiano e `juridico-contratos`).

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --branch` — ramo `construcao/DEC-DEM-20261104-0011-v1`, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -3` — `c1488ee`, `e7c35ab`, `fb675ee`

## Critério de pronto atendido

- [x] (02 triagem) `proximo` é um dos três engenheiros
- [x] (02 triagem) cada item da definição de pronto do pedido está atribuído a uma etapa da cadeia curta, pela lista da Entrega
