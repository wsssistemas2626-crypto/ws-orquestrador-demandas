---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T39-testes
agente: qa-automacao
leu: [contrato-passagem.md, pedido.json, tarefas.json, 2026-10-25-ws-orquestrador-demandas-plano.md (T38 a T40, linhas 3560 a 3700), 01-analista-requisitos.md (linhas 1 a 200 e 300 a 500: RF-01 a RF-11, RF-17 a RF-26 e a tabela de RNF), 05-tech-lead.md (cabeçalho), 06-T39-engenheiro-frontend.md, 06-T39-tech-lead.md, 06-T38-qa-automacao.md (formato), git show --stat d73ca06..0793e00, git show 3bdc321 (demandas/page.tsx e (painel)/not-found.tsx), e2e/nova-demanda.spec.ts, e2e/editar-demanda.spec.ts, e2e/apoio.ts, e2e/servidor.ts, e2e/fila.spec.ts (início), playwright.config.ts, vitest.config.ts, src/components/dados-da-demanda.ts, src/components/dados-da-demanda.test.ts, src/components/CamposDaDemanda.tsx, src/components/formulario.ts, src/components/Alerta.tsx, src/components/Botao.tsx, src/app/(painel)/demandas/nova/{page.tsx,FormularioNovaDemanda.tsx,acoes.ts,formularios.test.ts}, src/app/(painel)/demandas/[id]/{page.tsx,demanda-da-pagina.ts}, src/app/(painel)/demandas/[id]/editar/{page.tsx,acoes.ts,FormularioEditarDemanda.tsx}, src/app/(painel)/demandas/fila-qa.test.ts (início), src/lib/acao-painel.ts, src/lib/acao-painel.test.ts, src/modules/demandas/{entrada.ts,entrada.test.ts,entradas-pendentes.ts}, git show HEAD:src/modules/demandas/{schemas.ts,servico.ts}, git show HEAD:src/db/schema/demandas.ts, git show HEAD:src/modules/limites.ts, src/modules/acesso/{matriz.ts,exigir-pessoa.ts}, src/modules/agentes/gatilhos.test.ts (início), test/{sessao.ts,sentinelas.ts,deps.ts,banco.ts}, test/estatico/{relogio.test.ts,painel-qa.test.ts (início)}, saída do pnpm test gravada pela ferramenta nesta etapa (tool-results/bib2ym8ex.txt, só o fim)]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T39: T04 Nova demanda e T06 Editar dados. O código e os testes do engenheiro estão no `3bdc321`. Depois dele, o `b3e5935`
e o `0793e00` só mudaram `passagens.jsonl` e a entrega do engenheiro. Não achei falha no código contra nenhum critério da
tarefa. Os três arquivos de teste novos não mexem em nenhum arquivo que já existia.

### Critério da tarefa e teste que o cobre

A T39 cobre RF-03 (CA-03.2), RF-05 (modos manual e agente, aviso de minimização), RF-06 (edição), RF-20 (aviso), RNF-04
e RNF-11, mais os itens do texto do plano. Legenda: (E) teste do engenheiro, (Q) teste desta etapa. Nomes curtos dos
arquivos:
- `ddd.test` = `src/components/dados-da-demanda.test.ts`
- `form.test` = `src/app/(painel)/demandas/nova/formularios.test.ts`
- `acoes-qa` = `src/app/(painel)/demandas/formularios-acoes-qa.test.ts`
- `paginas-qa` = `src/app/(painel)/demandas/formularios-paginas-qa.test.ts`
- `qa.spec` = `e2e/demanda-formularios-qa.spec.ts`

| Critério | Teste |
|---|---|
| CA-03.2: preencher e salvar cria a demanda; o detalhe mostra "Demanda DEM-… criada com status Nova."; a fila mostra o id | `e2e/nova-demanda.spec.ts` › `CA-03.2: preencher e salvar cria a demanda…` (E); `acoes-qa` › `CA-03.2 e CA-05.1: modo manual com texto, origem e anexos…`, que confere campo a campo o que foi gravado (Q); `paginas-qa` › `?aviso=demanda-criada: "Demanda <id> criada com status <status>."…` (Q) |
| RF-05 / CA-05.1: modo manual com o agente desligado: texto bruto associado e nenhum job de IA | `acoes-qa` › `CA-03.2 e CA-05.1…`, com o texto em `entrada_bruta` igual ao colado (com espaços e quebras) e nenhum job nem execução novos (Q); `e2e/nova-demanda.spec.ts` › CA-03.2, com o texto ausente da vista (E) |
| RF-05: modos desligado, suspenso e ligado | `form.test` › os três modos (E); `paginas-qa` › `pede a pessoa com /demandas/nova… o modo vem de estadoDoAgente(db, "orquestrador", relogio)` e `estado %s do agente chega à tela` (Q), que ligam a página ao formulário |
| RF-05: modo agente pela Server Action | `acoes-qa` › `modo agente com o orquestrador ligado e teto: { tipo: "pendente" }…`, `…desligado: conflito…` e `…teto atingido: conflito com o texto do teto…` (Q) |
| RF-20: aviso de minimização; no modo agente, classificação e anexos não vão | `form.test` › `aviso de minimização e o botão "Enviar ao agente"` (E); `ddd.test` › `modo agente: só texto, solicitante e origem` (E); `acoes-qa` › `modo agente com o orquestrador ligado…`: o contexto e o anexo digitados não chegam à pendente (Q) |
| RNF-04 / CA-05.3: 100.001 caracteres recusados, nada gravado | `e2e/nova-demanda.spec.ts` › `texto com 100.001 caracteres…` (E, no cliente); `ddd.test` › limites e texto acima de 100.000 (E); `acoes-qa` › `CA-05.3 e RNF-04 no servidor: 100.001 caracteres enviados direto à Server Action…` (Q): sem a validação do cliente, o servidor recusa e não grava nada |
| RNF-04: lista de até 50 anexos | `acoes-qa` › `51 anexos enviados direto → "Limite de 50 anexos atingido."` (Q); `paginas-qa` › `com 50 anexos: "Adicionar anexo" indisponível…` e `com 49 anexos…` (Q) |
| RF-06: edição; só o que mudou vai; volta à T05 com "Alterações salvas…" | `e2e/editar-demanda.spec.ts` › `salvar alterações volta à T05…` (E); `acoes-qa` › `RF-06: só o que mudou vai; campo esvaziado é limpo…`, com o histórico conferido campo a campo (Q); `qa.spec` › `T06 com anexos: remover o 1º, acrescentar um link e limpar a urgência…` (Q) |
| RF-06: sem mudança, "Nada foi alterado." | `e2e/editar-demanda.spec.ts` › `sem mudança` (E); `acoes-qa` › `sem mudança: o servidor responde "Nada foi alterado." sem campos…` (Q) |
| RF-06 e RF-07: a edição não muda o status | `acoes-qa` › `a edição não muda o status: a chave status é descartada…` (Q) |
| Plano: erros da API no resumo, campo a campo | `ddd.test` › `errosDaApi…` (E, com mensagens supostas); `acoes-qa` › os dois `contrato com errosDaApi…` da T04 e o da edição (Q), com os erros reais do servidor |
| Plano: o que foi digitado nunca se perde num erro | `e2e/nova-demanda.spec.ts` › `erros: nome, título e tipo…` (E); `e2e/editar-demanda.spec.ts` › `erro de validação…` (E) |
| Plano: confirmação ao sair com conteúdo não salvo | `e2e/nova-demanda.spec.ts` › `sair com conteúdo não salvo…` (E); `e2e/editar-demanda.spec.ts` › `"Cancelar" com alteração…` (E); `qa.spec` › `fechar a aba com conteúdo não salvo pede o aviso do navegador (beforeunload)…` (Q) |
| Plano: contador "0 de 100.000 caracteres" | `form.test` › `dicas da 03 ligadas ao campo, e o contador…` (E); `e2e/nova-demanda.spec.ts` › `100.001 de 100.000 caracteres` (E). O anúncio a partir de 90 % segue com a 07 (pendência do engenheiro) |
| Plano: `?entrada=<id>` preenche o texto e envia `entradaPendenteId` | `form.test` › `"Preencher à mão"…` (E); `ddd.test` › `"Preencher à mão": manda o id…` (E); `paginas-qa` › `"Preencher à mão"`, 5 testes (Q); `acoes-qa` › `o texto gravado é o da entrada pendente, e não o que vier no corpo…` e `a mesma pendente enviada de novo…` (Q) |
| Achado 3 da 06-T39-revisao: o 404 com status HTTP | `qa.spec` › `404 com status HTTP 404, e não 200, em toda tela de demanda que não existe` (Q): 8 endereços, entre eles `?entrada=` vazio e repetido |
| C-04, C-12: pessoa e autorização nas páginas e nas ações | `paginas-qa`: ordem de `exigirPessoaNaPagina` e `autorizar`, papel fora da matriz, falta de sessão e administradora, nas três páginas (Q); `acoes-qa` › sem sessão e administradora, nas duas ações (Q) |
| C-17: id pela regex antes do banco | `paginas-qa` › `C-17: id fora do formato (%s)…`, 5 ids na T06 e 5 na T05 (Q); `acoes-qa` › `C-17: id fora do formato → entrada_invalida…` (Q) |
| C-18: texto e título escapados | `form.test` (E); `paginas-qa` › texto e origem da pendente, título na T06 e na T05 (Q) |
| C-21: nada do texto nem do solicitante na resposta e no log | `acoes-qa` › `uma linha por chamada, só com os campos da lista…` (Q); `qa.spec` › `duplo clique…`, com o corpo da resposta da Server Action conferido no navegador (Q) |
| `?aviso=` só com valores fixos | `paginas-qa` › `?aviso=%j fora da lista…`, 6 casos (Q); `qa.spec` › `alerta de chegada só com os valores fixos de ?aviso=…` (Q), na fila e no detalhe |
| RNF-11: axe sem violação | `e2e/nova-demanda.spec.ts` e `e2e/editar-demanda.spec.ts` (E); `qa.spec`: 404 do painel e detalhe com o alerta (Q) |

### Leitura crítica dos testes do engenheiro

- **As duas Server Actions não tinham teste.** O `ddd.test` confere a montagem da entrada contra o schema, e o e2e passa
  pelo navegador. Ninguém chamava `registrarEntradaNoPainel` e `alterarDadosNoPainel` com o banco real. O `acoes-qa` faz
  isso com o mesmo `next/headers` falso do `acao-painel.test.ts`.
- **O contrato de erro era suposto.** Os testes de `errosDaApi` usam mensagens escritas à mão (`'Campo obrigatório.'`,
  `'Valor inválido.'`). Os novos alimentam `errosDaApi` com o que o servidor devolve de verdade:
  - obrigatórios vazios;
  - tipo vazio;
  - link `javascript:` e `data:`;
  - 51 anexos;
  - 100.001 caracteres;
  - "Nada foi alterado.";
  - pendente que já foi convertida.

  Em todos, o texto final é o da 03, na linha certa da tela, com o índice do anexo convertido de volta.
- **A edição podia mudar o status?** O schema da ação é `omit({ status })`, e o adaptador descarta chave desconhecida
  (C-11). O teste novo prova as duas coisas: `{ id, status }` sozinho dá "Nada foi alterado.", e `status` junto com um
  título muda só o título, sem evento `status_alterado`.
- **As páginas não tinham teste.** O `form.test` gera só o HTML dos formulários. O `paginas-qa` chama as três páginas e
  o `generateMetadata`. Os dublês ficam só na sessão, no banco e nas leituras, e a matriz de acesso é a real. Os pontos
  provados:
  - a ordem do acesso;
  - o 404 só para "não encontrado": outra falha sobe para a tela de erro;
  - a entrada repetida;
  - a entrada codificada no caminho de volta do `/entrar`;
  - o título da aba, que não diz a quem não tem sessão se o id existe.
- **Estabilidade.**
  - Na primeira corrida embaralhada, um teste meu dependia de ordem: contava jobs em absoluto, e o teste do modo agente
    deixava um job. Corrigi para contar em delta. Depois, 3 corridas embaralhadas (339 de 339 cada), uma delas com a
    semente que tinha falhado.
  - O e2e inteiro rodou duas vezes, 51 de 51 nas duas.
  - Os e2e novos criam com a conta `administradora`. Assim não somam no limite de 30 demandas por hora (C-36) da conta
    `cto`, que os outros e2e usam.

### Testes acrescentados (67, em 3 arquivos novos, sem editar nenhum existente)

| Arquivo | Testes |
|---|---|
| `src/app/(painel)/demandas/formularios-acoes-qa.test.ts` | 20, com Testcontainers e Better Auth reais. T04: gravação campo a campo, ida e volta pela tela de edição, sem sessão, administradora, 100.001 caracteres no servidor, dois contratos de erro, chaves de autoria descartadas, "Preencher à mão" (texto da pendente e reenvio) e modo agente (desligado, ligado e teto). T06: mudanças com histórico, sem mudança, status descartado, C-17, contrato de erro e acesso. Mais o log das duas ações |
| `src/app/(painel)/demandas/formularios-paginas-qa.test.ts` | 42, com dublês. T04 (6 de acesso e modo, 5 de "Preencher à mão"), T06 (9, com os 5 ids fora do formato), título da aba (6), T05 provisória (13), anexos no limite (2) e o 404 do painel (1) |
| `e2e/demanda-formularios-qa.spec.ts` | 5: status 404, duplo clique, `?aviso=` fora da lista, T06 com anexos e `beforeunload` |

Nenhum teste novo usa o relógio real. O de banco usa o relógio fixo dos `Deps` de teste, um dia por teste. Os de página
usam datas fixas no dado de teste. O e2e não lê data.

### Resultado

- `pnpm test` (suíte inteira, numa rodada): 163 arquivos e **3254 de 3254**. São os 3192 que já existiam mais os 62 novos.
- `pnpm test:e2e`: **51 de 51**, duas vezes (2,9 min e 2,7 min). São os 46 que já existiam mais os 5 novos.
- `pnpm lint` e `pnpm typecheck`: limpos.
- `git status --short --untracked-files=all`: só os 3 arquivos novos. `git diff --stat` vazio: nenhum arquivo rastreado
  mudou.

### Classificação de falhas

Nenhuma falha no código contra critério da T39. As falhas que apareceram eram minhas, e todas foram corrigidas antes da
corrida final:
- uma asserção esperava o texto do modo agente sem trim (o schema da T17 apara esse texto; ver o achado 1);
- uma asserção esperava antes e depois do título no histórico (ver o achado 2);
- uma asserção de sessão sem 2FA dependia do relógio real e saiu (ver Decisões);
- uma regex pegou `disabled:` da classe CSS em vez do atributo;
- a contagem de jobs dependia de ordem (ver Estabilidade).

Achados (Minor, sem critério da T39 ferido):

| # | Criticidade | Onde | Achado |
|---|---|---|---|
| 1 | Minor | `src/modules/demandas/entrada.ts:48` (T17) | No modo agente, o texto colado é aparado (`z.string().trim()`) antes de ir para `entrada_pendente`, e a demanda nasce com ele aparado. No modo manual, o texto fica como chegou. A diferença não fere critério, mas o comentário do arquivo ("O texto não passa por trim: é guardado como chegou") só vale para o manual. O teste novo documenta o comportamento atual |
| 2 | Minor | `src/components/dados-da-demanda.ts:35-36, 51` (textos da 03) e `src/modules/historico` (T12) | "As alterações ficam no histórico, com o valor de antes e o de depois" e "O histórico registra o antes e o depois." só valem para as enumerações. Para texto livre (título, contexto e outros), o evento `campo_alterado` grava só `{ alterado: true }`, sem os valores (C-30, de propósito). A tela promete mais do que o histórico guarda |

## Decisões tomadas

- **Arquivos `-qa` novos, sem editar os do engenheiro.** Assim o `git diff` só tem acréscimo, e dá para conferir que
  nenhuma asserção foi afrouxada.
- **Ações com o banco real, páginas com dublês.** A ação é onde mora o risco alto (texto bruto, dado pessoal, autoria),
  e só o banco prova o que foi gravado. A página só decide acesso, 404 e o que vai ao formulário. Para isso bastam dublês
  nas bordas, com a matriz real.
- **O contrato de erro é testado pelo caminho da tela.** A entrada sai de `entradaDoFormulario` e de `mudancasDaEdicao`
  com a validação do cliente pulada, e o resultado passa por `errosDaApi`. Isso trava a tela e o servidor juntos: se um
  dos dois mudar a mensagem ou o caminho do campo, o teste quebra.
- **Tirei a asserção de sessão sem 2FA.** Ela vence em 15 min pelo relógio dos `Deps`, que nos testes anda um dia por
  teste. O resultado dependia da data real. O caso segue coberto em `src/lib/acao-painel.test.ts` (T11).
- **Duplo clique conferido pelo número de envios.** Contar demandas logo depois do alerta não pega um segundo envio
  atrasado. O segundo clique, se enviasse, sairia antes da resposta do primeiro. Por isso o teste conta os pedidos com
  `next-action`.
- **O título da aba no 404 de `?entrada=` não foi travado.** É o achado 4 da revisão, Minor e aceito pelo tech-lead. O
  teste confere o status e a tela, e um comentário aponta o achado.
- **Os achados 1 e 2 não devolvem a tarefa.** Nenhum fere critério da T39, e os dois nasceram em tarefas anteriores
  (T17, T12 e os textos da 03).

## Pendências

- **Para o `tech-lead` (Minor, achado 1):** alinhar o comentário de `entrada.ts`, ou o trim do modo agente, com a regra
  "guardado como chegou". O teste `acoes-qa` › `modo agente com o orquestrador ligado…` trava hoje o texto aparado e
  precisa mudar junto.
- **Para a `ux-ui-design` e a T40 (Minor, achado 2):** decidir o texto do aviso da T06 e do alerta de sucesso, ou a
  forma como a T05 mostra `{ alterado: true }` no histórico. Hoje a 03 promete "o valor de antes e o de depois" para
  todos os campos.
- **Para a `07-qa-funcional`:** seguem as pendências do engenheiro e do tech-lead:
  - o "Voltar" do navegador sem confirmação;
  - o anúncio do contador a 90 %;
  - o foco no `h1`;
  - a volta do foco depois do diálogo;
  - a dica de anexos solta (achado 5).

  O `beforeunload` agora tem e2e.
- **Achado 3 da 06-T39-revisao:** resolvido nesta etapa (`qa.spec` › `404 com status HTTP 404…`).
- **Ferramentas Grep e Glob indisponíveis nesta sessão.** Achei a T39 no plano e os RF nos requisitos só com o Read, por
  trechos, e a lista de arquivos com `git log --name-only`.
- **Saída do `pnpm test`.** Com o log do pino, ela passou de 32 KB. Li só o fim do arquivo que a ferramenta gravou
  (`tool-results/bib2ym8ex.txt`, fora de `/tmp`). Segue valendo a tarefa à parte de silenciar o pino nos testes,
  proposta pelo tech-lead para o `qa-automacao`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -8` — 3bdc321, b3e5935 e 0793e00 depois de d73ca06
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat d73ca06..0793e00` — 18 arquivos no 3bdc321; o b3e5935 e o 0793e00 só mexem em passagens.jsonl e na entrega
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format=%h%x20%s -- src/lib src/app/entrar "src/app/(painel)" test/apoio test/estatico` — testes do painel e do adaptador
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format=%h%x20%s -- src/modules/demandas src/modules/agentes/gatilhos.ts src/modules/agentes/gatilhos.test.ts test` — testes de entrada e ajudantes de teste
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/db/schema/demandas.ts` — colunas de entrada_pendente
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 3bdc321 -- "src/app/(painel)/demandas/page.tsx" "src/app/(painel)/not-found.tsx"` — aviso entrada-enviada e 404 do painel
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/modules/demandas/schemas.ts` — alterarDemandaSchema
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/demandas/formularios-acoes-qa.test.ts"` — 17 de 20 (asserções minhas: trim do modo agente, histórico de texto livre e sessão sem 2FA)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/demandas/formularios-acoes-qa.test.ts"` — 20 de 20
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/demandas/formularios-paginas-qa.test.ts"` — 41 de 42 (minha regex pegou a classe `disabled:`)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/demandas/formularios-paginas-qa.test.ts"` — 42 de 42
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/modules/demandas/servico.ts --format= --` — "Nada foi alterado." e o limite C-36
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/modules/limites.ts` — 30 demandas por hora por ator
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/demanda-formularios-qa.spec.ts` — 5 de 5
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — 1 aviso (import sem uso no meu arquivo), corrigido
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/demandas" src/components --sequence.shuffle` — 338 de 339, semente 1793416480504 (contagem de jobs em absoluto no meu teste), corrigido
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/demandas" src/components --sequence.shuffle --sequence.seed=1793416480504` — 339 de 339
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/demandas" src/components --sequence.shuffle` — 339 de 339, semente 1793416525501
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/demandas" src/components --sequence.shuffle` — 339 de 339, semente 1793416536510
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 163 arquivos, **3254 de 3254**, 95,4 s
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — 51 de 51 (2,9 min)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — 51 de 51 (2,7 min, segunda corrida, estabilidade)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — só os 3 arquivos novos de teste
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — vazio, nenhum arquivo rastreado mudou

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste: CA-03.2, RF-05 (CA-05.1, CA-05.3, os três modos), RF-06, RF-20, RNF-04, RNF-11 e os itens do plano, na tabela da Entrega
- [x] a suíte inteira passa (3254 de 3254; e2e 51 de 51, duas vezes)
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real: relógio fixo dos `Deps` de teste e datas fixas; contagens em delta; 3 corridas com `--sequence.shuffle`; a asserção que dependia da data real saiu
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada: `git diff --stat` vazio e só arquivos novos no `git status`
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real: só "Pessoa Ficticia", "(fictício)", `exemplo.test`, ids `DEM-20261022-…`, UUID fictício e os sentinelas de `test/sentinelas.ts`
