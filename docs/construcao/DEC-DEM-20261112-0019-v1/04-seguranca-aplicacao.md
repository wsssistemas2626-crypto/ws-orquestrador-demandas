---
pedido: DEC-DEM-20261112-0019-v1
etapa: 04-reteste
agente: seguranca-aplicacao
leu: [contrato-passagem.md, 01-qa-funcional.md, 02-tech-lead.md, 04-maestro.md, 04-correcao-engenheiro-backend.md, git diff 3576cea~1 3576cea (código e testes), src/modules/acesso/matriz.ts, src/modules/demandas/confirmacao.ts, src/modules/demandas/consultas.ts (370-508), src/modules/pacotes-decisao/consultas.ts (1-40), src/app/api/demandas/route.ts, src/app/api/demandas/[id]/route.ts, src/app/api/demandas/[id]/especificacoes/route.ts, src/app/api/demandas/[id]/pareceres-risco/route.ts, src/app/api/demandas/[id]/pacotes-decisao/route.ts, src/app/api/especificacoes/[espId]/route.ts, src/app/api/pareceres-risco/[rskId]/route.ts, src/app/api/pacotes-decisao/[decId]/route.ts, src/app/api/pacotes-decisao/[decId]/decisao/route.ts, src/app/api/pacotes-decisao/[decId]/pedido-construcao/route.ts, src/db/transacao.ts, src/modules/integracoes/tempo-limite.ts, src/modules/versoes.ts (1-31), src/modules/agentes/executar.ts (150-299), src/modules/agentes/execucoes.ts (100-172), src/modules/agentes/gatilhos.ts, src/jobs/batimento.ts, src/modules/agentes/revisao-0019.test.ts]
status: pronto
proximo: devops-sre
devolvido_para: null
---
## Entrega

Reteste da correção `3576cea` (código) sobre os achados da `04-maestro.md`: três altos (A-1, A-2, A-3) e quatro médios
(M-a a M-d). Os commits `62d9676` e `8b69542` só registram a entrega e não foram retestados como código. Não houve achado
crítico. Li o diff do commit com `git diff <hash>~1 <hash>`, porque o maestro proibiu o `git show` nesta rodada.

**Resultado: os três altos e os quatro médios estão fechados.** Nenhum controle foi afrouxado. Nenhuma asserção de
segurança da 0.3.0 foi apagada. Os únicos testes existentes que mudaram são deste pedido:
- `executar-0019.test.ts` ganhou asserções, e uma delas troca de lugar pela regra do A-3;
- `prazo-total-0019.test.ts` só recebeu acréscimos (e um import).

A evidência vem da leitura do código e dos testes. A minha lista **Pode** não inclui `pnpm test`, então os números da
suíte são os da `04-correcao-engenheiro-backend.md`: 6485 de 6485, mais o e2e com 276 passando e 0 falhas.

### Vereditos dos altos

| Achado | Veredito | Evidência |
|---|---|---|
| **A-1** (`GET /api/pacotes-decisao` lista DEC de demanda do Awave não confirmada) | **Fechado** | A rota passa a chamar `listarPacotesPara(deps.db, query, ator)` (`src/app/api/pacotes-decisao/route.ts:13`). Em `src/modules/pacotes-decisao/consultas.ts:317-329`: pessoa sem filtro; agente e sistema com `soVisiveisAoAgente: true`; integração com `semPermissao()` antes de ler; ator desconhecido com `atorDesconhecido`. O filtro entra no mesmo `onde` dos itens e do `total` (`consultas.ts:303` e `:310`), por `demandaVisivelAoAgente(pacote_decisao.demanda_id)` (`src/modules/demandas/confirmacao.ts:75-77`). Ele é um `exists` sobre `demanda` com `condicaoVisivelAoAgente()`. O DEC sem demanda não entra, então a regra falha fechada. Teste `src/app/api/pacotes-decisao/visibilidade-0019.test.ts:99-128`, com rota e token `risco` reais, sem filtro e com `statusDecisao=pendente`: o DEC escondido não está nos itens e o `total` é 2. Nem o id do DEC nem o `demandaId` escondido aparecem no corpo da resposta, o que fecha o oráculo. Também cobre `limit`/`offset` na borda sem buraco, `statusDecisao=aprovada` com total 0, a pessoa vendo os três e o agente vendo o DEC depois da confirmação por pessoa. A 04-correcao registra o teste falhando antes do código (`total: 3`, DEC escondido na lista). |
| A-1, varredura das rotas de leitura | **Sem rota aberta** | Ações da matriz abertas a agente (`src/modules/acesso/matriz.ts:49-61`): `listar_demandas`, `ler_demanda`, `ler_especificacao`, `ler_parecer_risco`, `ler_pacote_decisao`, os três `criar_*` e `criar_demanda` (só `orquestrador`). O ator `sistema` não passa em nenhuma ação (`matriz.ts:98-99`). Conferi as rotas `route.ts` de `src/app/api`, achadas por `git log --diff-filter=A`, e todas as que leem com essas ações aplicam a regra: `demandas` GET via `listarDemandasPara` (`src/modules/demandas/consultas.ts:490-507`, filtro em `:441`, `onde` comum a itens e total em `:458` e `:462`); `demandas/[id]` via `lerDemandaPara` (`consultas.ts:389-392`); `demandas/[id]/especificacoes`, `/pareceres-risco` e `/pacotes-decisao`, com `exigirVisivelPara` antes de listar (linhas 26, 26 e 28 de cada `route.ts`); `especificacoes/[espId]`, `pareceres-risco/[rskId]` e `pacotes-decisao/[decId]`, com `exigirVisivelPara` logo depois do `obter*` e com o mesmo 404 (linhas 15, 16 e 16). Ficam fora da regra só rotas fechadas a agente pela matriz: `historico`, `entrada`, `decisao`, `pedido-construcao`, `agentes`, `configuracao/teto`, os três de `pedidos-construcao` (só `construir`), `saude` e `auth`. Os POST de ESP, RSK e DEC passam pelos serviços com `exigirVisivelPara` desde a 03, revisados na 04-revisao sem achado. |
| **A-2** (o piso do `SET LOCAL` passa por cima do restante do prazo) | **Fechado** | `executarComOrcamento` passa `limitarTempo` como `abertura` e não o chama mais no corpo (`src/modules/integracoes/tempo-limite.ts:86-88`). `naConexao` roda a `abertura` direto na conexão logo depois do BEGIN e, com prazo, `baixarAteORestante` em seguida (`src/db/transacao.ts:132-133`). Essa função lança `PrazoDaTransacaoEsgotado` com o restante ≤ 0 e, com o restante abaixo do piso, aplica `min(piso, restante)` por `set_config` com parâmetros (`transacao.ts:76-88`, G3.6 mantido). `p.aplicado` começa igual a `PISO_MS` (`transacao.ts:111`), que coincide com os literais de `limitarTempo` (`tempo-limite.ts:25-28` e `:37-39`). Nenhum `SET` do piso passa mais pelo Proxy depois do prazo. Teste `src/modules/integracoes/prazo-total-0019.test.ts:121-149`: com pool de 1 conexão segura e relógio parado, sobra 1 s, e a primeira instrução de quem chama vê `{ stmt: 1000, lock: 1000 }` em `awave/padrao` e em `construir/entrega`. O controle sem espera mantém o piso de 5 s e 2 s nas duas instruções. A 04-correcao registra o teste falhando antes (`{ stmt: 5000, lock: 2000 }`). |
| **A-3** (confirmação com o agente desligado gasta a chave) | **Fechado** | O batimento calcula os agentes indisponíveis com `estadoDoAgente`, que só lê, e não reenfileira a pendente adiada de um deles (`src/jobs/batimento.ts:49-52` e `:62`). "Adiada" é `adiadaAteConfirmacao`: existe o `agente_ignorado` com `motivo = 'sem_confirmacao'` da execução (`src/modules/agentes/execucoes.ts:165-172`), sem coluna nova nem migration. As guardas do worker não mudaram: ligado, preço, teto, demanda da chave, status final e confirmação (`src/modules/agentes/executar.ts:260-285`), e `semEsperaDeConfirmacao` continua no batimento (`batimento.ts:61`). Testes `src/modules/agentes/revisao-0019.test.ts:123-185`. Com o agente desligado ou o teto em 0, o batimento não manda job e a execução fica `pendente`. Ao religar, sai 1 job, e uma passada dá 1 chamada ao provedor, 1 ESP e `concluida`, sem `desligado` nem `falha_agente`. Depois disso, o batimento não manda de novo. Na regressão, a pendente comum de agente desligado continua reenfileirada, como na 0.3.0. |

### Vereditos dos médios

| Achado | Veredito | Evidência |
|---|---|---|
| M-a (o adiamento decide fora da trava) | **Fechado** | `adiarAteConfirmacao` trava a demanda e confere `aguardaConfirmacao` de novo dentro da transação (`executar.ts:211-213`). A execução só segue para `montarEntrada` quando a releitura sob a trava diz "não aguarda", ou seja, quando já existe confirmação de pessoa. O evento de confirmação só é inserido e não é desfeito, então o D1 não afrouxa (`executar.ts:282-285`). Teste `revisao-0019.test.ts:187-211`: com a corrida provocada, a execução fica `concluida`, com 1 chamada e 1 ESP; sem a confirmação, ela continua adiada e o provedor não é chamado. |
| M-b (`reenfileirarPendente` sem `atualizadaEm`) | **Fechado** | `UPDATE ... SET atualizada_em = agora ... RETURNING`, com o mesmo `where` de antes: agente, chave, `pendente` e sem hora marcada (`execucoes.ts:145-156`). O relógio é repassado por `gatilhos.ts:71`. Teste `revisao-0019.test.ts:213-226`: `atualizada_em` fica igual à hora da confirmação, e o batimento seguinte reenfileira 0, com um job vivo só. |
| M-c (SQL e TS divergem para autoria desconhecida) | **Fechado** | `condicaoVisivelAoAgente` passa a ser `autor_tipo in ('pessoa','agente')` OU (`autor_tipo = 'integracao'` E confirmação de pessoa) (`confirmacao.ts:66-71`). Isso é igual a `aguardaConfirmacao`, que devolve `true` no `default` (`confirmacao.ts:24-39`). Vale para as três regras SQL: listagem de demandas, listagem de DEC e `semEsperaDeConfirmacao` (`confirmacao.ts:81-83`). Teste `src/modules/demandas/autor-desconhecido-0019.test.ts:52-83`. Com autoria `robo`, com e sem confirmação de pessoa: a regra TS diz que aguarda, a SQL diz que não é visível, `exigirVisivelPara` dá o 404 do inexistente e o batimento trata a execução como em espera. |
| M-d (a tela aceita `demanda_confirmada` de qualquer ator) | **Fechado** | `findLast` com `e.acao === 'demanda_confirmada' && e.ator.tipo === 'pessoa'` (`src/components/dados-da-confirmacao.ts:50`), a mesma regra de `jaConfirmada` no servidor (`confirmacao.ts:14-15`). Teste `src/components/dados-da-confirmacao-0019.test.ts:17-34`. Eventos de agente, sistema, integração `awave` e integração nula deixam a seção em "aguardando" ou "final sem confirmação", e não tomam o lugar da confirmação de pessoa. |

### Os três pontos novos da 04-correcao (Pendências do engenheiro)

1. **SQL novo** (`demandaVisivelAoAgente`, `confirmacao.ts:75-77`, e `adiadaAteConfirmacao`, `execucoes.ts:165-172`):
   **sem injeção.** Os dois usam o template `sql` do Drizzle só com objetos de coluna e `eq()`, que viram parâmetros, e
   literais constantes (`'agente_ignorado'`, `'execucao_agente'`, `'sem_confirmacao'`, `::text`). Nenhum valor vem de
   requisição. O `exists` aninhado resolve `demanda` no escopo interno, e o teste do A-1 confirma o resultado (total 2
   contra 3).
2. **`abertura` fora do Proxy do prazo** (`transacao.ts:132`): **aceitável hoje.**
   - O único chamador é `executarComOrcamento` (`tempo-limite.ts:86`), conferido por `git log -S "abertura"`, que só acha
     `transacao.ts` e `tempo-limite.ts` em código de produção.
   - Ela roda só os `SET LOCAL` literais de `limitarTempo` (`tempo-limite.ts:37-39`), instantâneos e sem trava.
   - O prazo é conferido logo depois, por `baixarAteORestante` (`transacao.ts:133`).
   - Fica como dívida baixa (O-1): a opção aceita qualquer função e, no futuro, pode rodar consulta sem prazo.
3. **`travarDemanda` no worker** (`executar.ts:212`; `versoes.ts:18-22`): **sem risco novo.**
   - É `SELECT ... FOR UPDATE` pelo id, por parâmetro. A linha lida é descartada e não vai a log, provedor nem resposta.
   - A ordem das travas é demanda e depois execução, igual em `confirmarDemanda` → `dispararOuReenfileirar` →
     `reenfileirarPendente`. A reivindicação do worker já comitou antes, então não há espera cruzada.
   - Se a demanda sumisse, sairia o `ErroDominio` `nao_encontrado`, sem texto interno. Hoje isso é inalcançável, porque o
     `aguardaConfirmacao` anterior devolve `false` para demanda inexistente.

## Decisões tomadas

- A-1 fechado pela rota e pela função por tipo de ator: o filtro está no banco, no mesmo `onde` de itens e `total`, e o teste prova que não há oráculo pelo corpo nem pela contagem.
- A varredura foi feita sobre as ações da matriz, e não só sobre as rotas citadas: o `sistema` não passa em nenhuma ação, e só as nove ações de leitura e criação abertas a agente importam.
- A-2 pela forma "abertura" aceito: o efeito pedido pelo maestro (`min(piso, restante)` antes da primeira instrução, com `p.aplicado` coerente) está no código e no teste. Manter os literais em `limitarTempo` preserva os testes estáticos do G3.6.
- A-3 ampliado ao teto aceito: é mais restritivo e usa a mesma regra de disponibilidade do gatilho.
- Evidência por leitura e pelos números da 04-correcao: `pnpm test` não está na minha lista **Pode**.
- Usei `git diff <hash>~1 <hash>` no lugar do `git show`, proibido pelo maestro nesta rodada. O conteúdo é o mesmo.
- Não rodei `pnpm audit --prod`: a correção não toca `package.json` nem o lockfile (`--stat` do commit), e o portão de dependência fica para a `05-entrega`.

## Pendências

- O-1 (baixo, dívida): `OpcoesDaTransacao.abertura` aceita qualquer função e roda fora do Proxy do prazo. Sugestão para versão futura: teste estático que só permita `limitarTempo` como `abertura`, ou trocar o callback por um tipo fechado (o orçamento).
- O-2 (baixo, funcional, não é de segurança): um job já na fila quando o agente é desligado continua sendo encerrado como `ignorada`/`desligado` pelo worker (CA-19.4 da 0.3.0), e isso vale também para a execução adiada reenfileirada. A janela é curta e não expõe dado; o A-3 cobre o caminho do batimento, que é o pedido. Registrar para o backlog, se o produto quiser fechar.
- O-3 (informativo): `travarDemanda` no worker roda sem `lock_timeout` (ator sistema), limitado pelo `statement_timeout` de 10 s do pool. Se uma pessoa estiver editando a demanda, o adiamento espera essa transação. Não abre falha.
- Seguem do `04-maestro.md`, sem mudança: BR-3 (ids sequenciais deixam deduzir existência, risco residual para `gestao-riscos` e Fabiano), B-7 do 0016 e a centralização da visibilidade (código 10), que o A-1 mostrou ser necessária.
- A ferramenta Grep não estava disponível nesta sessão. Usei Read e `git log -S` / `git log --diff-filter=A` para achar arquivos.
- Não li o `pedido.json`: ele não está na lista **Lê** da `04-reteste`. Nada a registrar sobre instrução fora do escopo.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -6` — topo `8b69542`, correção em `3576cea`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 3576cea8746b2a68465d5cefdd89e5b8b4b82903~1 3576cea8746b2a68465d5cefdd89e5b8b4b82903 --stat` — 18 arquivos, nenhum `package.json` ou lockfile
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 3576cea8746b2a68465d5cefdd89e5b8b4b82903~1 3576cea8746b2a68465d5cefdd89e5b8b4b82903 -- src/app/api/pacotes-decisao/route.ts src/modules/pacotes-decisao/consultas.ts src/modules/demandas/confirmacao.ts src/components/dados-da-confirmacao.ts src/db/transacao.ts src/modules/integracoes/tempo-limite.ts src/jobs/batimento.ts src/modules/agentes/execucoes.ts src/modules/agentes/executar.ts src/modules/agentes/gatilhos.ts src/modules/agentes/executar-0019.test.ts` — diff do código e do teste alterado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 3576cea8746b2a68465d5cefdd89e5b8b4b82903~1 3576cea8746b2a68465d5cefdd89e5b8b4b82903 -- src/app/api/pacotes-decisao/visibilidade-0019.test.ts src/components/dados-da-confirmacao-0019.test.ts src/modules/demandas/autor-desconhecido-0019.test.ts src/modules/integracoes/prazo-total-0019.test.ts` — diff dos testes novos e acrescentados
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --diff-filter=A --name-only --format=%h -- src/app/api` — todas as rotas da API, para a varredura do A-1
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S "abertura" --name-only --format=%h -- src test scripts` — único chamador de `abertura` em código: `tempo-limite.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S "export async function travarDemanda" --name-only --format=%h -- src` — `src/modules/versoes.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo

## Critério de pronto atendido

- [x] (reteste) cada achado crítico ou alto tem veredito e evidência (arquivo:linha ou teste)
- [x] (reteste) nenhum achado crítico ou alto ficou aberto
