---
pedido: DEC-DEM-20261104-0014-v1
etapa: 02-triagem
agente: tech-lead
leu: [contrato-passagem.md, pedido.json, 01-qa-funcional.md, DEC-DEM-20261104-0013-v1/02-tech-lead.md (formato e E5), engenheiro-backend.md (Pode), qa-automacao.md (Pode), documentacao-tecnica.md (Pode), src/modules/pacotes-decisao/decidir.ts, src/modules/pacotes-decisao/decidir-versoes.test.ts, src/modules/pacotes-decisao/consultas.ts, src/modules/pacotes-decisao/desatualizado.ts, src/modules/pedido-construcao/gerar.ts, src/modules/demandas/consultas.ts (1-280), src/modules/demandas/transicoes.ts, src/modules/historico/registrar.ts, src/modules/historico/consultas.ts, src/components/dados-do-pedido.ts, src/components/dados-da-decisao.ts, src/components/dados-do-pacote.ts (1-40), src/components/rotulos.ts (1-80, 180-257), "src/app/(painel)/pacotes-decisao/[decId]/page.tsx", "src/app/(painel)/pacotes-decisao/[decId]/SecaoPedido.tsx", "src/app/(painel)/demandas/[id]/page.tsx (190-230)", "src/app/(painel)/demandas/[id]/Historico.tsx", src/app/api/pacotes-decisao/route.ts, e2e/decisao.spec.ts (1-30, 205-284), scripts/seed-ficticio.ts (1-180), docs/superpowers/specs/2026-10-25-ws-orquestrador-demandas-design.md]
status: pronto
proximo: engenheiro-backend
devolvido_para: null
---
## Entrega

Base conferida: ramo `construcao/DEC-DEM-20261104-0014-v1`, limpo, sobre `89eca46` (0.1.12), com os commits
`00-inicio` e `01-reproducao` do maestro. A causa da 01 bate com o código lido. Um engenheiro só para a 03:
`engenheiro-backend`. Tudo o que muda está em `src/`, `scripts/` e `package.json`, na **Pode** dele, inclusive a T11, a
T05 e os textos do painel. `e2e/` fica com a `04-regressao`; manual, CHANGELOG e README com a `06-documentacao`.

**Causa provável.** A regra A-02 está em `decidir.ts:93-101` (`temOutroAprovado`) e é aplicada em `decidir.ts:219`,
antes de toda outra conferência da aprovação. Ela conta qualquer DEC da demanda com decisão `aprovada`. A única
proteção contra dois Pedidos de Construção válidos é essa recusa na aprovação: `gerarPedido` (`gerar.ts:76-79`) só
confere `aprovada` e `desatualizado`. Por isso não dá para só tirar o A-02. A proteção tem de passar para o gerar, lida
sob a trava da demanda (C-13), e a vista tem de dizer qual DEC foi substituído.

Ordem de trabalho na 03: **S1** (substituído na leitura), **S2** (decidir), **S3** (gerar), **S4** (histórico),
**S5** (telas e textos), **S6** (seed do e2e), **versão**. Em cada passo, o teste vem primeiro e tem de ser visto
falhando na base, com o comando e um trecho da saída na entrega. Use só dados fictícios, como `Carla Santos Ficticia`,
`Joana Ficticia` e `DOC-FICTICIO-014`, e e-mail só no domínio `exemplo.test`.

---

### Regra fixada (responde E1, E8, o caso 3 e o caso 13 da 01)

- **Aprovado mais novo** é o DEC de maior `versao` da demanda com decisão `aprovada`. A comparação é por versão, e não
  por data, porque não pode depender do relógio. Pelo A-01, que continua valendo, ele é sempre o último aprovado.
- **Substituído** é o DEC com decisão `aprovada` que não é o aprovado mais novo. É calculado na leitura, sem coluna, sem
  migration e sem status novo. `statusDecisao` continua `aprovada`.
- **`substituidoPor`** é o id do aprovado mais novo **atual**, e não o do DEC que aprovou logo depois. Com v1, v2 e v3
  aprovados, v1 e v2 apontam para o v3: o link leva sempre ao único DEC que gera (caso 13).
- O DEC pendente, com aprovação parcial, devolvido ou arquivado não substitui nada e não é substituído (E2). Na dupla
  aprovação, a substituição só acontece quando a decisão `aprovada` é gravada, na segunda aprovação.
- No gerar, o 409 do substituído vem **antes** do 409 do desatualizado e do 422 do Estudo (caso 3). A mensagem aponta o
  DEC que gera; a do desatualizado manda criar um pacote novo, que já existe.

### S1: `substituido` e `substituidoPor` na leitura

**Arquivos.** `src/modules/pacotes-decisao/substituido.ts` (novo), `consultas.ts`, `src/modules/demandas/consultas.ts`
e os testes de cada um.

**Interface.**

```ts
// substituido.ts, no padrão de desatualizado.ts: subconsulta correlacionada com a linha de `pacote_decisao` da consulta
// externa. Aliases próprios (ex.: alias(pacoteDecisao, 'dec_aprovado'), alias(decisao, 'decisao_aprovado')), para não
// se confundir com a tabela externa nem com as subconsultas de expressaoDesatualizado.
// Devolve o id do DEC de maior versão da mesma demanda com decisão 'aprovada' e versão maior que a da linha; nulo se não há.
export function expressaoSubstituidoPor(): SQL;

// Lido sob a trava da demanda por quem chama (decidir): o id do aprovado mais novo da demanda, ou null.
export async function aprovadoMaisNovo(tx: Db, demandaId: string): Promise<string | null>;
```

- `PacoteDecisaoVista` (`pacotes-decisao/consultas.ts:41-70`) ganha `substituido: boolean` e `substituidoPor: string | null`.
  Em `selecao`, acrescente `substituidoPor: sql<string | null>\`${expressaoSubstituidoPor()}\``. Em `vistaDe`, os
  dois campos só valem com `statusDecisao === 'aprovada'`; fora disso, `false` e `null`.
- `PacoteResumo` (`demandas/consultas.ts:19`, lista de DEC da T05 e de `GET /api/demandas/:id`) ganha os mesmos dois
  campos, com a mesma expressão em `pacotesDe` (`:98-124`).
- Na **vista mínima** (E6), as duas listas são de permissão, e o campo novo só sai se for incluído: em
  `vistaDoPacotePara` (`pacotes-decisao/consultas.ts:203-237`) e no `map` de `vistaDaDemandaPara`
  (`demandas/consultas.ts:247`). São id e booleano, sem texto livre, e passam sem `minimizar`.
- O filtro `statusDecisao=aprovada` da fila (RF-23) continua trazendo o substituído, marcado com `substituido: true`.
  Não há filtro novo.

**Testes de regressão esperados.** Primeiro, os testes, vistos falhando na base:

1. Leitura (o arquivo de teste que já cobre `obterPacoteDecisao` e `listarPacotesDaDemanda`): com v1 aprovado e v2
   aprovado, o v1 tem `{ statusDecisao: 'aprovada', substituido: true, substituidoPor: v2 }` e o v2 tem `{ substituido:
   false, substituidoPor: null }`. Com v3 aprovado depois, v1 e v2 apontam para o v3. Um DEC pendente, devolvido ou
   arquivado tem `false` e `null`. O v1 aprovado com o v2 em aprovação parcial tem `false`.
2. `listarPacotes` com `statusDecisao: 'aprovada'` traz v1 e v2, com os campos certos em cada um.
3. `obterDemanda`: `pacotesDecisao` com os dois campos, iguais aos da vista do DEC.
4. Vista mínima, com token de agente: `GET /api/pacotes-decisao/:decId`, `GET /api/pacotes-decisao` e
   `GET /api/demandas/:id` trazem `substituido` e `substituidoPor`, e nenhum nome. Se houver teste que confere as
   chaves exatas da vista mínima, acrescente as duas e cite o teste na entrega.

### S2: decidir sem o A-02, com a substituição

**Arquivos.** `src/modules/pacotes-decisao/decidir.ts`, `decidir-versoes.test.ts` e o teste da rota
`PATCH /api/pacotes-decisao/[decId]/decisao`.

- Apague `temOutroAprovado` (`:93-101`), a chamada (`:219`) e `MENSAGENS_DECISAO.outroAprovado` (`:46`). Se houver
  cópia dessa mensagem num componente ou teste, o typecheck aponta: tire também.
- Reescreva o comentário do topo (`:1-18`). O passo 5 sai, e a ordem fica: autorizar; trava e status final; já
  decidido; não é o mais novo (A-01); desatualizado; rascunho; devolvida ou arquivada; aprovada. Acrescente uma linha:
  "a aprovação completa do DEC mais novo substitui o aprovado anterior da demanda (0.1.13, opção b do E5 do 0013): o
  anterior fica `substituido` na leitura, e só o aprovado mais novo gera o Pedido de Construção (gerar.ts)".
- Quando a decisão `aprovada` é gravada, nos dois ramos de `aprovar` (`:169-171` e `:186-189`), siga esta ordem:
  1. ler `anterior = await aprovadoMaisNovo(tx, demandaId)` **antes** do insert em `decisao`, ainda sob a trava. Depois
     do insert, o mais novo seria o próprio DEC;
  2. `gravarDecisao(...)`, como hoje;
  3. se `anterior !== null`, registrar o evento da S4.

  Faça isso num helper só, por exemplo `fecharAprovacao(c, opcao, comentarios)`, para os dois ramos não divergirem. A
  aprovação parcial não lê nem grava nada disso.
- Nenhuma outra regra muda: 2FA e sessão (rota), `autorizar`, P1-a, P1-b, mesma opção, documento da administradora,
  revisão de rascunho, desatualizado, A-01, status final (M-08) e P1-d. A aprovação que substitui não muda o status
  da demanda.

**Testes de regressão esperados.** Primeiro, os testes, vistos falhando na base. O bloco A-02 de
`decidir-versoes.test.ts:151-180` é **substituído**, porque a regra mudou por decisão de Fabiano. Liste na entrega cada
teste trocado (arquivo:linha, antes e depois). O teste `:174-179` (v1 devolvido não conta) fica.

| # | Entrada | Esperado |
|---|---|---|
| 1 | v1 aprovado com A; v2 "Só o CTO" aprovado com **B** pela `cto` (E3) | `aprovada`; uma linha em `aprovacao` e uma em `decisao` no v2; v1 `substituidoPor: v2` |
| 2 | v1 aprovado; v2 `cto_e_administradora`; a `administradora` aprova com `DOC-FICTICIO-014` | `aprovacao_parcial`; v1 **não** substituído; nenhum evento de substituição |
| 3 | caso 2, e depois a `cto` aprova a mesma opção | `aprovada`; v1 substituído; um evento de substituição |
| 4 | caso 2 com a `cto` na opção diferente, papel repetido, ou a administradora sem documento | 409 `opcaoDiferente`, 409 `aprovacaoJaRegistrada` e 400 dos campos, como hoje; v1 não substituído |
| 5 | v2 nível cto aprovado pela `administradora` | 403, como hoje (P1-b); nada substituído; nenhum evento |
| 6 | v2 que cita rascunho de agente, sem `revisouRascunhosDeAgente` | 400, como hoje; v1 não substituído |
| 7 | v1 aprovado, v2 criado, ESP v2 gravada (v2 desatualizado) | aprovar o v2: 409 `desatualizado`; v1 não substituído |
| 8 | v1 aprovado, v2 pendente, demanda `encerrada` | 409 `demandaFinal` (M-08) |
| 9 | v1 aprovado e v2 pendente; aprovar o v1 de novo, ou decidir um v1 pendente com o v2 criado | 409 `jaDecidido` e 409 `naoEhOMaisNovo`, como hoje (A-01) |
| 10 | v1, v2 e v3 aprovados, nesta ordem | dois eventos: v1→v2 na aprovação do v2 e v2→v3 na do v3; v1 e v2 com `substituidoPor: v3` |
| 11 | substituição com a demanda em `aprovada`, `em_construcao` e `devolvida` (E9; o status é posto pelo migrator) | aprova e substitui; o status da demanda não muda (P1-d) |
| 12 | corrida (C-13): duas aprovações do v2 nível cto ao mesmo tempo (`Promise.allSettled`, duas conexões do `poolApp`) | uma `aprovada` e a outra 409 `jaDecidido`; uma linha em `decisao`; um evento de substituição |
| 13 | corrida: na dupla aprovação do v2, `cto` e `administradora` ao mesmo tempo, mesma opção | uma parcial e uma completa; um evento de substituição |
| 14 | rota `PATCH .../decisao` (R4 da 01): v1 aprovado, `cto` com 2FA, `Origin` do painel | 200 com `resultado: 'aprovada'`; sem 2FA, ou com token de agente: 401/403 como hoje, nada substituído |

### S3: gerar só do aprovado mais novo

**Arquivos.** `src/modules/pedido-construcao/gerar.ts`, `gerar.test.ts` e `gerar-bordas.test.ts` (ou o arquivo que
já tem as gerações concorrentes), mais o teste da rota `POST .../pedido-construcao` e `acoes-pedido.test.ts`.

```ts
// MENSAGENS_PEDIDO (gerar.ts:39-48). Em minúscula: a tela acrescenta "Não foi possível concluir: ". Texto da triagem,
// para revisão da ux-ui-design. Só ids, sem texto livre.
substituido: (id: string) =>
  `o pacote foi substituído por ${id}, aprovado depois dele; só o pacote aprovado mais novo gera o Pedido de Construção.`,
```

- Em `gerarPedido`, logo depois de `naoAprovado` (`:77`) e **antes** do desatualizado (`:79`), escreva
  `if (dec.substituidoPor) throw new ErroDominio('conflito', MENSAGENS_PEDIDO.substituido(dec.substituidoPor))`. O
  `dec` já é lido sob a trava (`:74-76`), por isso uma aprovação do v2 em paralelo ou espera esta transação, ou já é
  vista. Não há leitura fora da trava.
- Atualize o comentário do topo (`:1-15`), passo 3: "...com decisão `aprovada` completa, ou 409 (CA-22.4); substituído
  por um aprovado mais novo → 409 (0.1.13); desatualizado → 409 (A-03)". O recusado em 3 não grava evento.
- O aprovado mais novo gera como hoje: D1, C-28, `validarPedido` e CA-22.2 ficam iguais.

**Testes de regressão esperados.** Primeiro, os testes, vistos falhando na base:

| # | Entrada | Esperado |
|---|---|---|
| 1 | R1 da 01: solicitante `Carla Santos Ficticia`, contexto com "Santos"; v1 aprovado; gerar o v1 | 422 com `demanda.descricao: nome` (como hoje) |
| 2 | caso 1, contexto trocado por `A filial do litoral calcula o frete à mão.`, v2 criado e aprovado | gerar o v1: 409 `substituido(v2)`, sem evento `pedido_gerado`; gerar o v2: 200, `validarPedido` ok, duas gerações iguais byte a byte (CA-22.2) |
| 3 | v1 com A e v2 com B, só texto do DEC mudou (nada desatualizado: o caso que a 01, item 4, aponta) | v1: 409 `substituido`; v2: 200 com `decisao.opcaoEscolhida` começando por `B: ` |
| 4 | R2 da 01: ESP v2 depois do v1 aprovado; v2 aprovado | v1 desatualizado **e** substituído: 409 `substituido` (vem antes); v2: 200 com a ESP v2 |
| 5 | v1 aprovado, v2 em aprovação parcial | v1 continua gerando: 200 (E2) |
| 6 | corrida (C-13, E4a), dez rodadas, cada uma num v2 novo: aprovar o v2 e gerar o v1 ao mesmo tempo | o gerar do v1 ou dá 409 `substituido`, ou dá 200 com o evento `pedido_gerado` do v1 de `id` **menor** que o do evento de substituição. Nunca 200 depois do commit do v2. No fim, um só aprovado mais novo |
| 7 | rota `POST .../pedido-construcao` do v1 substituído, com a confirmação | 409 `{ erro: 'conflito', mensagem: substituido(v2) }` |
| 8 | Server Action `gerarPedidoNoPainel` do v1 substituído | `{ ok: false, erro: 'conflito', mensagem }`; `erroDoPedido` mostra `Não foi possível concluir: o pacote foi substituído por <v2>...`, sem lista e sem orientação |

### S4: evento de substituição no histórico

**Arquivos.** `src/modules/historico/registrar.ts`, `src/components/rotulos.ts`, `decidir.ts` e os testes de `rotulos`.

- `AcaoEvento` ganha `'pacote_decisao_substituido'`. A coluna `acao` é `text` sem check, então não precisa de migration.
- O evento, na mesma transação e depois de `aprovacao_registrada` e `decisao_registrada`:
  `{ ator: pessoa, demandaId, entidade: 'pacote_decisao', entidadeId: <DEC substituído>, acao: 'pacote_decisao_substituido', depois: { substituido: <DEC substituído>, substituidoPor: <DEC que aprovou> } }`.
  Leva só os dois ids, sem comentário, opção ou nome (C-30).
- `textoDoEvento` (`rotulos.ts:185`): `${substituido} foi substituído por ${substituidoPor}, aprovado depois`. Use
  `e.entidadeId` para o substituído. Se `d.substituidoPor` não for texto no formato de id de DEC (a regex
  `RE_ID_DEC`, `dados-do-pacote.ts:13`; se importar de lá criar ciclo, copie a regex, como os outros componentes fazem),
  use `${e.entidadeId} foi substituído por um pacote aprovado depois`.
- Confira em `valoresDoEvento` (`demandas/[id]/detalhe.ts`) que as colunas Antes e Depois ficam vazias para este evento.
  Elas mostram só enumerações (C-30).

**Testes de regressão esperados.** Para o caso 1 da S2, o histórico da demanda tem, nesta ordem de gravação,
`aprovacao_registrada`, `decisao_registrada` e `pacote_decisao_substituido`, com `depois` igual a exatamente
`{ substituido, substituidoPor }`. O `rotulos` cobre os dois textos (o normal e o de reserva). Na aprovação parcial não
há evento de substituição (caso 2 da S2).

### S5: telas (T11 e T05) e textos

**Arquivos.** `src/components/dados-da-decisao.ts`, `src/components/dados-do-pedido.ts`, `src/components/rotulos.ts`,
`src/app/(painel)/pacotes-decisao/[decId]/page.tsx`, `src/app/(painel)/demandas/[id]/page.tsx` e os testes deles
(`dados-do-pedido.test.ts:161`, `acoes-pedido.test.ts:40` e o teste de `dados-da-decisao`).

Os textos são da triagem, para revisão da `ux-ui-design`, porque a cadeia curta não tem etapa de interface:

- `SELO_SUBSTITUIDO: SeloFixo = { texto: 'Substituído', cor: 'gray', tracejado: false }` em `rotulos.ts`, ao lado de
  `SELO_DESATUALIZADO`.
- `TEXTOS_DECISAO.substituido: (id) => \`Este pacote foi substituído por ${id}, aprovado depois dele. Só o pacote aprovado mais novo gera o Pedido de Construção. Não use um pedido gerado deste pacote.\``
  e `TEXTOS_DECISAO.abrirSubstituto: (id) => \`Abrir ${id}\``.
- `alertaDeSubstituido(p: Pick<PacoteDecisaoVista, 'substituidoPor'>): { texto; link: { rotulo; href } } | null` em
  `dados-da-decisao.ts`, no padrão de `alertaDeDesatualizado` (`:345-359`). O `href` é `/pacotes-decisao/${id}`, e o
  nome acessível do link leva o id.
- **T11** (`page.tsx`):
  - o selo "Substituído" depois do selo da decisão (`:84`);
  - o alerta `tipo="atencao"` com o texto e o link, antes do alerta de desatualizado (`:127`). Com os dois valendo,
    aparecem os dois;
  - o lembrete de P1-d (`:76`) só para o DEC que não é substituído.
- `secaoDoPedido` (`dados-do-pedido.ts:77-80`) recebe também `substituidoPor` e devolve `'nenhuma'` quando ele não é
  nulo. Com isso, o DEC substituído não mostra caixa nem botão de gerar. Atualize o comentário.
- **T05** (`demandas/[id]/page.tsx:210-220`): o selo "Substituído" ao lado de "Aprovada" na linha do pacote substituído.
- **Linha 6 da orientação** (`ORIENTACAO.aviso`, `dados-do-pedido.ts:50`), no lugar do texto de hoje:
  `Depois de corrigir, crie um pacote novo e aprove-o: o pacote aprovado mais novo substitui este, e só ele gera o Pedido de Construção.`
  Atualize o comentário `:61-63`, que hoje diz que outro pacote não se aprova.

**Testes de regressão esperados.** Primeiro, os testes, vistos falhando na base:

- `secaoDoPedido` com aprovado e `substituidoPor` preenchido dá `'nenhuma'`, e sem ele dá `'gerar'`. Os casos de hoje
  não mudam.
- `alertaDeSubstituido` dá `null` com `substituidoPor` nulo, e com um id devolve o texto e o link.
- `orientacaoDoPedido` com a linha 6 nova. Os testes que comparam o texto antigo (`dados-do-pedido.test.ts:161`,
  `acoes-pedido.test.ts:40`) passam a comparar o novo.

### S6: demanda do seed para o e2e do caminho completo

**Arquivo.** `scripts/seed-ficticio.ts`. Fica com o engenheiro porque `scripts/` não está na **Pode** da
`qa-automacao`.

- Acrescente em `TITULOS_DO_E2E` a chave `substituicao: 'Frete da filial: substituição do pacote (fictício)'` e a demanda
  em `DEMANDAS_DO_E2E`: tipo `melhoria`, solicitante `Carla Santos Ficticia`, papel `operacoes`, linha `sob_medida`,
  contexto `A filial de Santos calcula o frete à mão.` (R1 da 01). Ela nasce sem ESP, RSK nem DEC, como as outras, e
  não gasta o limite C-36 da conta.
- Atualize o comentário de `:135-142`, que cita o A-02: "com o A-02, a demanda só tem um DEC aprovado" passa a dizer que
  cada teste que aprova precisa de uma demanda própria para começar sem DEC aprovado.
- Se algum teste unitário do seed conta as demandas semeadas, ajuste a contagem e cite-o na entrega.

### Versão

`package.json` com `0.1.13`, na **Pode** do `engenheiro-backend`.

### Definição de pronto do pedido, por etapa da cadeia curta

| Item | Etapa dona |
|---|---|
| `pnpm test`, `pnpm lint` e `pnpm typecheck` verdes | `03-correcao` (`engenheiro-backend`), e de novo na `04-regressao` |
| `pnpm test:e2e` verde três vezes seguidas, com o ajuste de `e2e/` descrito em Pendências, item 2 | `04-regressao` (`qa-automacao`) |
| `CHANGELOG.md` com a versão 0.1.13; manual técnico (`04-versoes-e-decisao.md:155, 188-191`; `05-pedido-de-construcao.md:23-39, 185-196`; `09-referencia-api.md:43, 236`) e README, se citarem o A-02 | `06-documentacao` (`documentacao-tecnica`) |
| PR com CI verde (e `docker build`, se a entrega pedir) | `05-entrega` (`devops-sre`) |

## Decisões tomadas

- Um engenheiro só, o `engenheiro-backend`: tudo o que muda está em `src/`, `scripts/` e `package.json`, na Pode dele,
  como no 0013.
- E1: "aprovado mais novo" é definido pela maior versão entre os aprovados, e não pela data, para não depender do
  relógio. O A-01 garante que é o último aprovado.
- Caso 13: `substituidoPor` aponta para o aprovado mais novo atual, para o link levar sempre ao único DEC que gera. O
  histórico guarda a cadeia (v1→v2, v2→v3), e a rastreabilidade não se perde.
- Caso 3: o 409 do substituído vem antes do desatualizado, porque diz para onde ir (o DEC que gera). O do desatualizado
  manda criar um pacote que já existe.
- O substituído é calculado numa subconsulta lida junto com o DEC, sob a trava no gerar e no decidir. É o mesmo
  mecanismo do `desatualizado` (C-13), sem consulta solta fora da trava.
- `anterior` é lido antes do insert da decisão. Depois do insert, o aprovado mais novo seria o próprio DEC, e o evento
  perderia o id do substituído.
- E8: o evento é do DEC substituído (`entidadeId`), com os dois ids em `depois`. Assim ele aparece em qualquer leitura
  por entidade do DEC antigo, e o `depois` traz os dois ids que a ESP exige, sem texto livre.
- E7: `temPacoteAprovadoAtualizado` (`desatualizado.ts:14-22`) **não** muda. O DEC novo cita ESP e RSK de versão maior
  ou igual às do antigo, então o substituído atualizado implica o substituto atualizado: a troca não teria efeito
  visível, e um teste não conseguiria vê-la falhar. A guarda pedida pela 01 vai como teste: com v1 substituído e v2
  aprovado atualizado, a transição manual para `aprovada` passa; depois de uma ESP nova, recusa com `semPacote`. Esse
  teste pode passar na base, e a entrega deve dizer isso.
- E2: a T11 do v1 **não** avisa que existe um pacote mais novo pendente. A T05 já lista os pacotes, e o v1 continua
  sendo o que gera até o v2 ser aprovado. O aviso fica para a `ux-ui-design`, em Pendências.
- E6: o filtro `statusDecisao=aprovada` da fila traz o substituído marcado, sem filtro nem status novo, como manda a ESP.
- O seed ganha uma demanda própria para o caminho completo do e2e, para não gastar o limite C-36 (E10). Ela fica com o
  engenheiro, porque `scripts/` está fora da Pode da `qa-automacao`.
- Os testes do A-02 (`decidir-versoes.test.ts:151-172` e `e2e/decisao.spec.ts:241-265`) são substituídos, e não
  afrouxados: a regra mudou por decisão de Fabiano (opção b). Cada troca vai listada na entrega.

## Pendências

1. **Spec do sistema, para o maestro na Parada 3.** A ESP manda "atualizar a spec do sistema (A-02 e CA-22.4)", mas
   `docs/superpowers/specs/2026-10-25-ws-orquestrador-demandas-design.md` não tem o texto do A-02 nem o dos CA-22.x, só
   as linhas da RF-13 e da RF-22 (`:42`, `:51`). E nenhum agente da cadeia curta tem esse arquivo na **Pode**: a
   `documentacao-tecnica` edita só `README.md`, `CHANGELOG.md`, `docs/manual-tecnico/` e `docs/operacao/`. Proposta:
   na linha da RF-22, acrescentar "só o DEC aprovado mais novo da demanda gera; o substituído dá 409 (0.1.13)"; na da
   RF-13, "aprovar o DEC mais novo substitui o aprovado anterior (0.1.13, A-02 revisto)". O texto completo da regra fica
   no manual (`04-versoes-e-decisao.md`, regra 5 e "Limite conhecido"), com a `06-documentacao`.
2. **Para a `04-regressao` (`qa-automacao`), em `e2e/`:**
   - `e2e/decisao.spec.ts:241-265`: o teste do A-02 vira o da substituição. O segundo DEC é aprovado, o primeiro fica
     `substituido: true`, e a T11 do primeiro mostra o selo, o aviso e o link, sem a seção do pedido. O axe roda nesse
     estado.
   - Os comentários e as pré-condições que supõem o A-02 (`:9-13`, `:20-27`, `:216`, `:269-272`) mudam.
     `exigeBancoRecemSemeado` continua onde o teste precisa de demanda sem DEC aprovado.
   - O caminho completo (R1 da 01), na demanda `TITULOS_DO_E2E.substituicao` da S6: aprovar o v1; gerar dá 422 com
     `demanda.descricao: nome`; editar o contexto em "Editar dados"; criar o v2 e aprová-lo; gerar o v2 dá 200; gerar o
     v1 pela API dá 409.
   - A aba velha (E5): a T11 do v1 é aberta antes da aprovação do v2, e "Gerar" depois dá o alerta "Não foi possível
     concluir: o pacote foi substituído por ...", com foco e sem JSON. O axe roda no alerta.
   - `e2e/pedido-construcao.spec.ts:11-14, 38-43, 259`: comentários e o texto da linha 6.
   - Atualizar a conta de uso por conta (C-36) no cabeçalho de cada spec tocada, e rodar a suíte três vezes seguidas.
3. **Para a `ux-ui-design`, na próxima rodada de interface:** revisar os textos da S3 a S5 (selo, aviso da T11,
   mensagem do 409, frase do histórico, linha 6). Avaliar também dois avisos que ficaram de fora: na T11 do DEC
   pendente, que aprová-lo substitui o aprovado atual; na do DEC aprovado, que há um pacote mais novo pendente (E2).
4. **Para a `seguranca-aplicacao`, na 04:** E11 da 01 (trocar o `solicitanteNome` faz o DEC antigo deixar de recusar),
   só para conhecimento, sem mudança neste pedido. Fica também uma observação de comportamento que existe desde a
   0.1.0 e não muda aqui: com o v1 aprovado, **arquivar** o v2 pendente leva a demanda a `encerrada` se ela estiver em
   `pronta_para_decisao` (`transicoes.ts:76`), e aí o v1 também deixa de gerar (M-08). É decisão da pessoa e está fora
   do escopo da ESP.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -n 5` — `e1700e8`, `79d62bb`, `89eca46`, `8ea0069`, `f1e177b`

## Critério de pronto atendido

- [x] (02 triagem) `proximo` é um dos três engenheiros
- [x] (02 triagem) cada item da definição de pronto do pedido está atribuído a uma etapa da cadeia curta, pela lista da Entrega
