---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T18-construcao
agente: engenheiro-frontend
leu: [contrato-passagem.md, pedido.json, tarefas.json, 05-tech-lead.md, docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (G1 a G7, T17 passo 1 a 4, T18, T19 e início da T20), 03-ux-ui-design.md (inteiro), 06-T08-engenheiro-backend.md, 06-T08-tech-lead.md, 06-T08-qa-automacao.md, 06-T15-tech-lead.md, 06-T15-qa-automacao.md, 06-T16-engenheiro-frontend.md, 06-T17-engenheiro-frontend.md, 06-T17-tech-lead.md, 06-T17-qa-automacao.md, src/app/(painel)/demandas/[id]/page.tsx, MudarStatus.tsx, CartaoProximaAcao.tsx, detalhe.ts, acoes.ts, LinkNestaPagina.tsx, demanda-da-pagina.ts, detalhe.test.ts (linhas 1 a 680), src/components/dados-da-confirmacao.ts, dados-das-etapas.ts (linhas 20 a 100 e 180 a 225), Botao.tsx, RegiaoAviso.tsx, Alerta.tsx, Cartao.tsx, formulario.ts, LinhaDoTempo.tsx, src/lib/acao-painel.ts, src/lib/fuso.ts, src/proxy.ts, src/app/(painel)/demandas/fila-origem.test.ts (linhas 1 a 40), e2e/apoio.ts, e2e/seguranca.spec.ts, e2e/seguranca-qa.spec.ts, e2e/demanda-formularios-qa.spec.ts, e2e/especificacao-qa.spec.ts, e2e/alvo-de-toque.spec.ts (linhas 1 a 60), scripts/seed-ficticio.ts (linhas 1 a 130 e 240 a 370), .prettierrc, a saída do pnpm test e do pnpm test:e2e]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T18: a T05 da demanda aberta pelo Awave. Entraram a origem nos Dados, o selo "Aguardando confirmação", a seção
"Confirmação do Awave" com o botão "Confirmar demanda" e a ligação da linha 14 da Próxima ação. Cobre RF-06 (CA-06.7),
RF-10 no detalhe (CA-10.1, CA-10.4 e CA-10.7), RF-15 (ator de integração no histórico), IN-07 (Origin de outro site na
Server Action) e C-18. Segue a base visual da 0.2.0 e a 03, sem componente, token nem cor nova: `Cartao` com `h2`
focável (a `Secao` da página), `Botao` primário, `Alerta`, `RegiaoAviso` e o `Selo` âmbar da T17.

### Conferência antes do código

A T18 do plano cria `src/app/(painel)/demandas/[id]/ConfirmarDemanda.tsx` e `e2e/confirmacao-awave.spec.ts`. Também
modifica `page.tsx`, `CartaoProximaAcao.tsx` e `e2e/seguranca.spec.ts` (caso IN-07). Todos ficam em `src/` e `e2e/`,
dentro da minha lista Pode. Os dois arquivos que entraram além do plano (um teste novo e uma linha de
`detalhe.test.ts`, ver Desvios) também ficam em `src/`. Não houve motivo para devolver ao plano.

### Pendências das entregas 06-T01 a 06-T17 que citam a T18

Achei as entregas com `git log -S T18` na pasta do pedido: 05-tech-lead, as três da T08, 06-T15-tech-lead,
06-T15-qa-automacao, 06-T16-engenheiro-frontend (só no `leu`) e as três da T17.

| De onde | O que diz | Como ficou |
|---|---|---|
| 06-T08-tech-lead, parecer 3 | `confirmarDemanda` devolve `{ jaConfirmada: false }` com o insumo ligado ou desligado; a tela não pode deduzir da resposta que o agente foi acionado | **Respeitado.** `ConfirmarDemanda` só usa `r.ok` (sucesso ou erro). O estado da seção vem do histórico, por `estadoDaConfirmacao` (D-06), e nunca da resposta. Nenhum texto da tela diz que o agente foi acionado: o sucesso é "Demanda confirmada.", e a consequência fica no condicional da 03. Um teste barra `acionad`, `começou a` e `iniciad` no HTML da seção |
| 06-T08-engenheiro-backend | `confirmarDemandaNoPainel({ id })` devolve `{ ok: true, dados: { id } }` ou `{ ok: false, erro, mensagem }` (`conflito` com as duas mensagens, `nao_encontrado`, `nao_autenticado`, `sem_2fa`); repetir também é `ok` | **Feito.** `ok` dá o aviso, o foco no `h2` e `router.refresh()`. O resto vai a `errosDoResultado` de hoje: `conflito` ganha "Não foi possível concluir: ", e os outros códigos mostram a mensagem do servidor. Sem resposta (rede, ou a recusa do Next), `MENSAGEM_ERRO_INTERNO`. O controle do e2e do IN-07 confere na tela o 409 `outraOrigem` (demanda de pessoa) |
| 06-T08-qa-automacao | CA-06.7 (tela) fica com a T17 e a T18 | **Feito** em `e2e/confirmacao-awave.spec.ts` (quatro testes) e em `confirmar-demanda.test.ts` |
| 06-T15-tech-lead | as três do Awave estão em `nova`, `nova` e `encerrada`, sem `demanda_confirmada`; o teste de confirmar consome a `awaveConfirmar`, e o pulo "exige banco recém-semeado" cobre a repetição | **Feito como o plano.** Só o teste "confirmar" grava, e grava só na `awaveConfirmar`. O IN-07 usa a `awaveAguardando` e não grava nada (se o controle falhasse, ele reprovaria) |
| 06-T17-engenheiro-frontend | `aguardaConfirmacaoDoAwave: estado.tipo === 'aguardando'`; selo só em `aguardando`; seção quando `estado.tipo !== 'nao_se_aplica'`; `confirmada(ator, formatarDataHora(em))` com `<time dateTime>`; `finalSem(ROTULO_STATUS[status])`; "Origem" com `ROTULO_ORIGEM[origemDoResponsavel(d.responsavel)]` antes de "Criada por"; `CartaoProximaAcao` sem mudança | **Feito, item a item.** Um único `estado` na página alimenta selo, seção, "Nesta página" e a marca da linha 14 |
| 06-T17-tech-lead, Minor 2 | a T18 deve ter teste de página ou e2e que confira selo, seção e Próxima ação juntos nos três estados | **Feito nos dois níveis.** No HTML da página (`confirmar-demanda.test.ts`): aguardando, confirmada, encerrada sem confirmação e agente trabalhando. No navegador (`confirmacao-awave.spec.ts`): aguardando, confirmada (depois do clique) e encerrada |
| 06-T17-tech-lead, revisão da T18 (P-01) | botão sem `DialogoConfirmacao`; consequência no parágrafo `id="confirmacao-consequencia"` acima do botão, ligada por `aria-describedby`; nenhum uso da resposta além de sucesso ou erro; nome em "Confirmada por" só como JSX | **Feito.** Não há diálogo nem "Cancelar" (teste). O parágrafo vem antes do botão (teste de ordem), e o `aria-describedby` é conferido no HTML e no navegador. O nome entra como texto: no teste C-18, `<img onerror>` sai escapado |
| 06-T17-qa-automacao | o e2e precisa conferir selo, seção e Próxima ação juntos nos três estados | **Feito** (linha acima) |
| 06-T15-qa-automacao | título com "[nome removido]" na vista do Awave | Não é da T18: é a vista da API do Awave. O painel mostra o título original para pessoa. Segue com a 07 ou a 08 |

### Arquivos criados

- `src/app/(painel)/demandas/[id]/ConfirmarDemanda.tsx` (`'use client'`, no molde de `MudarStatus.tsx`):
  - `ID_CONSEQUENCIA = 'confirmacao-consequencia'` e o tipo `SecaoDaConfirmacao` (o estado da seção já em texto);
  - **aguardando:** os três parágrafos da 03 (o segundo com o id da consequência), o `Alerta` de erro acima do botão e o
    `Botao` primário "Confirmar demanda", com `aria-describedby`, 44 px (`min-h-11` do `Botao`) e `max-md:w-full`;
  - **durante o envio:** "Confirmando…", botão desabilitado e `aria-busy` no conteúdo;
  - **sucesso:** "Demanda confirmada." na `RegiaoAviso` (montada desde o início e em todo estado), foco no `h2` da seção
    e `router.refresh()`;
  - **erro:** `errosDoResultado` de hoje, com o alerta focável;
  - **confirmada:** "Confirmada por <ator> em <time>." e "Desde a confirmação, a demanda segue o fluxo de qualquer
    outra.". O texto sai da constante `TEXTOS_CONFIRMACAO.confirmada`, e a data entra no `<time>` pelo `lastIndexOf`;
  - **final sem confirmação:** `finalSem(<rótulo do status>)`.
- `src/app/(painel)/demandas/[id]/confirmar-demanda.test.ts`: 14 testes, HTML do componente e da página.
- `e2e/confirmacao-awave.spec.ts`: 4 testes, conta "cto".

### Arquivos alterados

| Arquivo | O que mudou |
|---|---|
| `src/app/(painel)/demandas/[id]/page.tsx` | `origem = origemDoResponsavel(d.responsavel)`. `estado = estadoDaConfirmacao({ origem, status, historico })`. `aguardaConfirmacaoDoAwave: estado.tipo === 'aguardando'`. O selo depois do de rascunho, só em `aguardando`. "Origem" (`ROTULO_ORIGEM`) antes de "Criada por". A seção `ID_SECAO.confirmacao` logo depois de Dados, e o item dela em "Nesta página", quando o estado não é `nao_se_aplica`. `GRADE` com `repeat(6,auto)`. `secaoDaConfirmacao` passa o estado a texto: data por `formatarDataHora`, ISO e rótulo do status |
| `e2e/seguranca.spec.ts` | Caso novo IN-07, mais uma linha no comentário do cabeçalho. Nenhum teste existente mudou |
| `src/app/(painel)/demandas/[id]/detalhe.test.ts` | Linha 638: `'Origem'` entra na lista exata de `dt`, entre `'Criada em'` e `'Criada por'` (ver Desvios) |

`CartaoProximaAcao.tsx` não mudou (ver Desvios).

### Testes

`confirmar-demanda.test.ts` (14):
- **Componente:**
  - aguardando: os três parágrafos exatos, o id no segundo, o botão `type="button"` com `aria-describedby` e as classes
    de 44 px, primário e largura toda no celular;
  - a `RegiaoAviso` montada, `aria-busy="false"`, nenhum `role="alert"`, diálogo, "Cancelar" nem texto de "acionado";
  - a consequência vem antes do botão;
  - confirmada: o `<time dateTime>` exato e o apoio, sem botão, com a `RegiaoAviso`;
  - C-18: o nome sai escapado;
  - o nome que contém o texto da data não desloca o `<time>`;
  - final sem confirmação: o texto do status, sem botão.
- **Página:**
  - aguardando: o selo depois do de rascunho, a seção depois de Dados (no `h2` e em "Nesta página"), a linha 14 com o
    link `#confirmacao`, o parágrafo da consequência e o botão;
  - confirmada: sem selo nem linha 14, com quem e quando, sem botão;
  - encerrada: sem selo, com a linha 1, o texto final e sem botão;
  - com agente trabalhando: a linha 2 vence a 14, e o selo e a seção ficam;
  - "Origem" e "Criada por" com "Awave", mesmo com o `solicitanteNome` editado (CA-10.4);
  - pessoa e agente: "Pessoa" e "Agente de IA", sem seção, sem item em "Nesta página", sem selo e sem linha 14 (CA-10.1);
  - a `GRADE` de 6 linhas;
  - o ator "Awave (prefixo ficticio)" no histórico.

`e2e/confirmacao-awave.spec.ts` (4), sobre o seed, sem criar demanda nem versão:
- **aguardando:**
  - o selo, a linha 14 e o detalhe dela;
  - "Nesta página" na ordem Dados, Confirmação do Awave, Versões, Mudar status, Texto recebido e Histórico;
  - "Ir para a confirmação" leva o foco ao `h2`;
  - o `aria-describedby` e o texto da consequência, P1 e P3;
  - "Origem: Awave" e "Criada por: Awave";
  - "Awave (prefixo ficticio)" no histórico;
  - o botão com 44 px nas duas larguras e a largura toda do cartão em 390 px;
  - axe nas duas larguras.
- **confirmar:**
  - a resposta da Server Action fica presa até o teste ver "Confirmando…", o botão desabilitado e `aria-busy="true"`;
  - depois, "Demanda confirmada." na `role="status"` e o foco no `h2`;
  - "Confirmada por Pessoa Ficticia CTO (CTO) em dd/mm/aaaa às hh:mm.", com o `datetime` em ISO, e o apoio;
  - sem botão, sem selo e sem a linha 14; "Confirmou a demanda aberta pelo Awave" no histórico; a seção fica em
    "Nesta página";
  - axe nas duas larguras;
  - pula com o motivo escrito se a demanda já foi confirmada.
- **encerrada sem confirmação:** o texto final, sem botão, sem selo, a linha 1 ("Nada. A demanda está em Encerrada.") e
  axe nas duas larguras.
- **demanda de pessoa:** sem seção, sem selo, "Nesta página" sem o item, sem a linha 14 e "Origem: Pessoa".

`e2e/seguranca.spec.ts`, caso IN-07. A rota do teste reenvia a chamada da Server Action em dois modos:
1. **Controle:** o Origin do painel e o corpo com o id trocado pelo de uma demanda de pessoa. A ação recebe a chamada e
   responde 200 com o 409 da regra, e a tela mostra "Não foi possível concluir: Só demanda aberta pelo Awave precisa de
   confirmação.".
2. **Ataque:** o mesmo pedido com `Origin: https://atacante.test`. O Next recusa antes da ação, com status diferente de
   200, e a tela mostra o alerta de erro com o foco.

Depois dos dois modos: nenhum `demanda_confirmada` nas duas demandas, e, ao recarregar, a demanda continua com o selo e o
botão. O controle prova que a recusa vem do Origin, e não do reenvio.

### Teste antes do código (visto falhando)

1. `pnpm --dir … test "src/app/(painel)/demandas/[id]/confirmar-demanda.test.ts"`, com os testes escritos e nenhum
   código:
   ```
   Error: Cannot find module '/src/app/(painel)/demandas/[id]/ConfirmarDemanda' imported from …/confirmar-demanda.test.ts
    Test Files  1 failed (1)
         Tests  no tests
   ```
2. O e2e não subia o servidor (o build confere os tipos, e o teste importava um módulo inexistente). Por isso criei um
   `ConfirmarDemanda.tsx` vazio (devolvia `null`, sem mexer na página) e rodei de novo:
   ```
    ❯ src/app/(painel)/demandas/[id]/confirmar-demanda.test.ts (14 tests | 13 failed) 88ms
        × aguardando: três parágrafos, o segundo com o id da consequência; …
        × confirmada: sem selo nem linha 14; a seção fica, com quem e quando em <time>; sem botão
        × Dados: "Origem" antes de "Criada por", da autoria (CA-10.4: nunca do solicitanteNome)
        …
   AssertionError: expected [] to deeply equal [ Array(3) ]
   ```
   O que passou é guarda: o ator "Awave (prefixo ficticio)" no histórico já saía da T02.
3. `pnpm --dir … test:e2e e2e/confirmacao-awave.spec.ts e2e/seguranca.spec.ts`, contra esse build:
   ```
     ✘   1 … aguardando: selo, Próxima ação, origem, histórico e axe
     -   2 … confirmar: … (pulou: sem o botão)
     ✘   3 … encerrada sem confirmação: sem botão, texto do status final
     ✘   4 … demanda de pessoa: sem seção, sem item em "Nesta página", sem selo
     ✘  12 … IN-07: "Confirmar demanda" com Origin de outro site é recusada; …
   Error: expect(locator).toBeVisible() failed — getByText('Aguardando confirmação', { exact: true })
     4 failed, 1 skipped, 7 passed
   ```

Depois do código:
- os testes da pasta `[id]`: 1 falha, a de `detalhe.test.ts:626`, porque a lista exata de `dt` ganhou "Origem". Ela foi
  ajustada, ver Desvios;
- os dois specs: **12 de 12**, nas duas rodadas, antes e depois do controle do IN-07.

### Resultado

- `pnpm test` (suíte inteira): **287 de 287 arquivos e 6337 de 6337 testes, 0 falharam**, em 162 s.
- Os arquivos da tarefa, os da T17 e `test/estatico`: 39 de 39 arquivos, 963 de 963 testes.
- `pnpm test:e2e` (local, build de produção, porta 3101), depois da última mudança: **273 testes, 264 passaram e 9
  pularam (capturas), saída 0**, em 9,9 min. O `✘` de `e2e/vigia.spec.ts:5` é o controle negativo esperado e conta entre
  os que passaram. Passaram também `alvo-de-toque.spec.ts`, `axe-todas.spec.ts`, `detalhe-a2.spec.ts` e
  `detalhe-demanda.spec.ts`, que leem a T05.
- Tempo dos testes novos: de 0,6 s a 5,2 s cada, longe dos 24 s. `retries` e o tempo-limite não mudaram.
- `pnpm build`: compilou, sem rota nova, e não deixou arquivo rastreado alterado.
- `pnpm typecheck` e `pnpm lint`: limpos.
- G4: o `git diff --stat a9fd9b8` das superfícies congeladas, com `src/lib/rota.ts`, saiu vazio. Não há arquivo
  `'use server'` novo: `ConfirmarDemanda.tsx` é `'use client'` e chama a ação que já está em `acoes.ts`.
- `git status --short`: só os 6 arquivos da tarefa (3 alterados e 3 novos).

### Desvios do plano

1. **`CartaoProximaAcao.tsx` não mudou.** O plano mandava trocar `secao: 'confirmacao'` por `ID_SECAO.confirmacao`, mas o
   cartão já resolve `ID_SECAO[link.destino.secao]`, e a T17 já pôs a chave (06-T17-engenheiro-frontend). O link
   "Ir para a confirmação" sai como `href="#confirmacao"`, e isso é conferido no HTML da página e no clique do e2e.
2. **`aria-busy` no conteúdo da seção, e não no `<section>`.** O `<section>` é o `Cartao` do design system, que não aceita
   `aria-busy`, e mudar um componente da 0.2.0 sai da tarefa e da regra "sem componente novo". O atributo fica no `div`
   que junta tudo o que muda no envio (parágrafos, alerta e botão), como o `MudarStatus` faz no `form`. A `RegiaoAviso`
   fica fora dele, para o anúncio não esperar o fim do `aria-busy`.
3. **`ConfirmarDemanda` recebe `SecaoDaConfirmacao`, o estado já em texto, e não o `EstadoDaConfirmacao`.** A data é
   formatada no servidor (`formatarDataHora`), e o navegador não formata nada. Assim, o HTML do servidor e o da
   hidratação não podem divergir. O componente cobre os três estados da seção, então a `RegiaoAviso` não desmonta quando
   o `router.refresh()` troca "aguardando" por "confirmada", e o anúncio "Demanda confirmada." não se perde.
4. **`src/app/(painel)/demandas/[id]/detalhe.test.ts:638` (fora da G5).** A lista exata dos termos de Dados ganhou
   `'Origem'` entre `'Criada em'` e `'Criada por'`, pela 03, 5.1 item 1. Nenhuma asserção saiu, os outros 12 termos e a
   ordem deles ficaram, e o arquivo não está no piso do D-17 (`git diff --stat`: 1 linha a mais, nenhuma a menos).
5. **Teste novo fora da lista do plano**, `confirmar-demanda.test.ts`, pela Pendência da 06-T17-revisao (teste de página
   com selo, seção e Próxima ação juntos).
6. **Asserções além do trecho do plano** no e2e (listadas acima). No IN-07 entrou também o controle do reenvio, que o
   plano não descreve.
7. **Foco no sucesso:** o `h2` recebe o foco logo depois da resposta. Um `useEffect` devolve o foco a ele se, depois da
   nova leitura, o foco tiver caído no corpo, como no `MudarStatus`.

## Decisões tomadas

- Um único `estadoDaConfirmacao` por página alimenta selo, seção, "Nesta página" e a marca da linha 14. Assim, as quatro
  partes não podem discordar (Minor 2 da 06-T17-revisao).
- A tela não diz se o agente de insumo foi acionado (parecer 3 da 06-T08-revisao). O que aparece depois da confirmação é
  a regra de hoje: linha 2 e o alerta de agente trabalhando, lidos de `agentesEmAndamento`. O teste de página "com agente
  trabalhando" prova que a linha 2 vence a 14.
- Sem diálogo de confirmação (P-01 e 03, Decisões): o rótulo do botão é a ação, e a consequência fica escrita acima dele
  e ligada por `aria-describedby`.
- Na mensagem de erro, `errosDoResultado(r).alerta ?? r.mensagem`. O `?? r.mensagem` só vale para um 400 com campos, que
  não acontece com a entrada fixa `{ id }`: a tela não inventa texto.
- O IN-07 reenvia a chamada pela rota do Playwright (`route.fetch` com os cabeçalhos completos do navegador e só o
  Origin trocado). Sem o controle, um status diferente de 200 poderia vir do próprio reenvio, e não do Origin.
- O e2e prende a resposta da Server Action até ver "Confirmando…". Sem isso, o estado de envio passaria rápido demais
  para ser conferido sem instabilidade.
- Dados só fictícios: as contas e as demandas do seed, "Ana Ficticia", o prefixo `ficticio` e `https://atacante.test`.
  Nenhum token é gerado nesta tarefa.
- Glob e Grep não estavam disponíveis nesta sessão. Li com Read e localizei arquivos por `git log -S`, `git log -G` e
  `git log -L`.

## Pendências

- Nenhuma bloqueia a T18.
- Para a `06-T18-revisao`:
  - conferir os desvios 2 (`aria-busy` no conteúdo, e não no `Cartao`) e 4 (`detalhe.test.ts:638`, fora da G5);
  - o comentário de `Dados` em `page.tsx` ainda diz "Os 12 itens" (a 0.2.0), com a frase da 0.3.0 logo depois. O
    comentário não foi reescrito, para o diff mostrar só o acréscimo.
- Para a `07-qa-funcional` (G2): à mão, conferir a leitura do botão com a consequência no leitor de tela, o anúncio
  "Demanda confirmada." e o foco no `h2`. Também o 409 de status final com a demanda encerrada em outra aba entre a carga
  e o clique (03, 11), e o zoom de 200 % e 400 % da T05 com a seção nova.
- Para a T20: o e2e precisa rodar verde três vezes seguidas. O teste "confirmar" grava na `awaveConfirmar` e pula numa
  homologação reaproveitada; no e2e local, cada execução semeia um banco novo.
- As caixas `- [ ]` da T18 no plano não foram marcadas: a 06 não edita `docs/` (G1).

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261111-0016-v1`, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format=%h%x20%s -- docs/construcao/DEC-DEM-20261111-0016-v1` — as entregas da pasta do pedido
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S T18 --format=%h --name-only -- docs/construcao/DEC-DEM-20261111-0016-v1` — 05-tech-lead, tarefas.json, as três da T08, 06-T15 (tech-lead e qa), 06-T16-engenheiro e as três da T17
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S "next-action" --format=%h --name-only -- e2e src test` — os e2e que identificam a Server Action
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S "atacante" --format=%h --name-only -- e2e` — `seguranca.spec.ts`, `seguranca-qa.spec.ts` e `entrar.spec.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S "Server Action" --format=%h --name-only -- e2e` — nenhum teste de hoje troca o Origin de uma Server Action
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S "./MudarStatus'" --format=%h --name-only -- src test` — `detalhe.test.ts` renderiza a página
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S "export function origemDoResponsavel" --format=%h --name-only -- src` — `src/modules/demandas/consultas.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -1 -L "/export function origemDoResponsavel/,+20:src/modules/demandas/consultas.ts" --format=%h` — a função
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -1 --format=%h -G "await PaginaDemanda" -- "src/app/(painel)/demandas/[id]/detalhe.test.ts"` — 8328e28
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -1 --format=%h -L "/export type AtorVisivel/,+8:src/modules/historico/consultas.ts"` — o ator de integração no histórico
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/demandas/[id]/confirmar-demanda.test.ts"` — antes do código: módulo inexistente, nenhum teste rodou
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/confirmacao-awave.spec.ts e2e/seguranca.spec.ts` — antes do código: o servidor não subiu (o build confere os tipos do teste novo)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/demandas/[id]/confirmar-demanda.test.ts"` — com o componente vazio: 13 de 14 falharam
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/confirmacao-awave.spec.ts e2e/seguranca.spec.ts` — com o componente vazio: 4 falharam, 1 pulado, 7 passaram
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/demandas/[id]"` — depois do código: 1 falha (`detalhe.test.ts:626`, a lista de `dt` sem "Origem"), 215 passaram
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/confirmacao-awave.spec.ts e2e/seguranca.spec.ts` — 12 de 12
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/confirmacao-awave.spec.ts e2e/seguranca.spec.ts` — com o controle do IN-07: 12 de 12
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — em segundo plano, saída lida com Read: 287 de 287 arquivos, 6337 de 6337 testes, código 0
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat a9fd9b8 -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/proxy.ts src/db/privilegios.ts next.config.ts src/lib/rota.ts "drizzle/000[0-6]_*.sql" "drizzle/meta/000[0-6]_snapshot.json"` — vazio (G4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — 3 alterados e 3 novos, todos da tarefa
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -- "src/app/(painel)/demandas/[id]/page.tsx"` — revisão do diff
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 3 arquivos, 123 inserções e 8 remoções; `detalhe.test.ts` com 1 linha a mais e nenhuma a menos
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas build` — compilou, sem rota nova
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — o build não deixou arquivo rastreado alterado
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/demandas/[id]/confirmar-demanda.test.ts" "src/app/(painel)/demandas/[id]/detalhe.test.ts" src/components/dados-da-confirmacao.test.ts src/components/dados-da-confirmacao-qa.test.ts test/estatico` — 39 de 39 arquivos, 963 de 963 testes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -3` — HEAD em fbe3de3 (06-T17-testes)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -- e2e/seguranca.spec.ts` — revisão do caso IN-07
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — depois de trocar, no IN-07, a espera da segunda resposta por `expect.poll`: limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — em segundo plano, saída lida com Read: 273 testes, 264 passaram, 9 pulados, saída 0, em 9,9 min
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — depois do e2e, só os 6 arquivos da tarefa e esta entrega

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa (287 de 287 arquivos, 6337 de 6337 testes)
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real (só as contas e as demandas fictícias do seed, "Ana Ficticia", o prefixo `ficticio` e `atacante.test`; nenhum token)
- [x] só mudaram os arquivos da tarefa (os do plano, menos `CartaoProximaAcao.tsx`, mais o teste novo e uma linha de `detalhe.test.ts`, explicados nos Desvios)
- [x] os textos são os de `03-ux-ui-design.md`, em pt-BR (5.1, 5.4, 5.5 e seção 9), e o axe não acusa violação nas telas tocadas (T05 aguardando, confirmada e encerrada sem confirmação, em 1280 × 720 e 390 × 844)
