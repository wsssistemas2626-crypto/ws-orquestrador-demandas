---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T40-testes
agente: qa-automacao
leu: [contrato-passagem.md, pedido.json, padrao-tecnico.md, tarefas.json, 2026-10-25-ws-orquestrador-demandas-plano.md (T39 fim e T40, linhas 3620 a 3740), 01-analista-requisitos.md (RF-01 a RF-26 e a tabela de RNF), 06-T40-engenheiro-frontend.md, 06-T40-tech-lead.md, 06-T39-qa-automacao.md (formato), git show --stat 4031f1e..ffc0880, git diff 4031f1e..ffc0880 (formularios-paginas-qa.test.ts e src/components), "src/app/(painel)/demandas/[id]/{page,detalhe,detalhe.test,acoes,MudarStatus,TextoRecebido,Historico,LinkNestaPagina,demanda-da-pagina}.ts(x)", e2e/detalhe-demanda.spec.ts, "src/app/(painel)/demandas/formularios-paginas-qa.test.ts (cabeçalho e T05)", "src/app/(painel)/demandas/formularios-acoes-qa.test.ts (início)", src/components/{rotulos,formulario}.ts, src/components/{Tabela,Alerta}.tsx, src/lib/acao-painel.ts, src/modules/acesso/{exigir-pessoa,matriz}.ts, src/modules/historico/{consultas,registrar}.ts, src/modules/demandas/{texto-recebido,entrada (início)}.ts, git show HEAD:src/modules/demandas/{servico,transicoes,consultas}.ts, git show HEAD:src/modules/pacotes-decisao/criar.ts, git show HEAD:src/modules/retencao/expurgar.ts, src/jobs/expurgo-texto-bruto.ts, src/modules/agentes/executar.ts (linhas 1 a 200), src/modules/agentes/executar.test.ts (linhas 1 a 350), test/{deps,sessao,auth,sentinelas,provedor-falso}.ts, saída do pnpm test gravada pela ferramenta nesta etapa (tool-results/b91ipz10m.txt, só o fim)]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T40: T05 Detalhe da demanda. O código e os testes do engenheiro estão no `3c9c648`. O `fc9be9e` e o `ffc0880` só mudaram
`passagens.jsonl` e a entrega do engenheiro. Não achei falha no código contra nenhum critério da tarefa.

### Critério da tarefa e teste que o cobre

A T40 cobre RF-06, RF-07 (CA-07.3 e o status manual), RF-12, RF-15 (CA-15.3), RF-16 (falha e "agente trabalhando", T-03),
RF-21, RF-24, RF-26 (CA-26.2) e C-18, mais os itens do texto do plano. Legenda: (E) teste do engenheiro, (Q) teste desta
etapa. Nomes curtos dos arquivos:
- `det.test` = `src/app/(painel)/demandas/[id]/detalhe.test.ts`
- `det-qa` = `src/app/(painel)/demandas/[id]/detalhe-qa.test.ts`
- `det.spec` = `e2e/detalhe-demanda.spec.ts`
- `paginas-qa` = `src/app/(painel)/demandas/formularios-paginas-qa.test.ts`

| Critério | Teste |
|---|---|
| CA-26.2: ESP v1 e v2, RSK v1 e DEC v1 desatualizado; as quatro versões, a marca de desatualizado e o histórico | `det.spec` › `CA-26.2: ESP v1, v2, RSK v1 e DEC v1 desatualizado…` (E); `det.test` › `CA-26.2 (HTML)…` (E) |
| RF-12: marca de desatualizado no painel (selo e alerta, só o DEC mais novo) | `det.test` › `pacote desatualizado: o mais novo, com o id na frase` (E); `det.spec` › CA-26.2 (E) |
| CA-07.3: Em construção → Entregue pela tela; o histórico registra a pessoa | `det.spec` › `CA-07.3: em_construcao → Entregue pelo painel…` (E); `det-qa` › `CA-07.3: Em construção → Entregue; a resposta só tem { id, status }; o evento leva a pessoa, o antes e o depois` (Q) e `Em construção: o grupo com Entregue e Devolvida pela construção…` (Q) |
| RF-07 / CA-07.1: Aprovada sem DEC aprovado e atualizado dá 409 e o status não muda | `det.spec` › `409 ao mudar status…` (E, DEC desatualizado depois de a tela abrir); `det-qa` › `CA-07.1: Pronta para decisão com o DEC pendente → Aprovada é recusada; a tela já marcava a opção indisponível, com o mesmo motivo` (Q) |
| RF-07 / CA-07.2: Estudo não vai para construção | `det.test` › `Em construção num Estudo…` (E, só a opção); `det-qa` › `CA-07.2: Estudo em Aprovada → Em construção é recusada, e a tela marca a mesma opção…` (Q) |
| RF-07 / CA-07.5: status final não muda | `det.test` › `status final…` (E, só o texto); `det-qa` › `CA-07.5: a partir de %s, nenhum dos nove status passa…`, para Entregue e Encerrada (Q) |
| RF-07: transição fora da tabela e o mesmo status | `det-qa` › `fora da tabela do RF-07 (Nova → Entregue, que a tela não oferece)…; o mesmo status: "Nada foi alterado."` (Q) |
| Plano: opção indisponível no grupo com `aria-disabled` e o motivo por `aria-describedby` | `det.test` › `MudarStatus.tsx` › `status atual, grupo "Novo status"…` (E); `det.spec` › `409…`, com `toHaveAccessibleDescription` (E) |
| Mudar status: sem opção marcada, o resumo com foco | `det.spec` › `sem opção marcada…` (E) |
| Mudar status: a Server Action pela regra do servidor (C-11, C-17, C-04, C-21) | `det-qa` › `entrada adulterada…`, `sem sessão: nao_autenticado…; a administradora também muda o status…` e `C-21: uma linha de log por chamada…` (Q) |
| CA-15.3: aguardando informação lista as dúvidas da ESP mais nova, com a nota | `det.spec` › `CA-15.3…` (E); `det.test` › `CA-15.3 (HTML)…` (E); `det-qa` › `CA-15.3 e RF-15: ESP v1 com dúvidas leva a "Aguardando informação"…; ESP v2 sem dúvida tira a seção, o link do alerta e o item da navegação` (Q) |
| RF-16: alerta de falha pelo último `falha_agente` e "agente trabalhando" por `agentesEmAndamento` | `det.test` › os 9 testes de `alertas de topo` (E, com eventos montados à mão); `det-qa` › `RF-16: execução pendente → "agente trabalhando"; 3 tentativas fora do schema (falha_agente real) → alerta de erro com o botão; RSK feito à mão → o alerta some` (Q) |
| RF-21: histórico com quem, o que, antes e depois | `det.test` › `histórico: Antes e Depois…` e `Historico.tsx` (E); `det.spec` › CA-26.2 e CA-07.3 (E); `det-qa` › `RF-21 e C-30 com os eventos reais da T06…` (Q) |
| RF-24: texto expurgado ("O texto recebido foi apagado em <data>…") | `det.test` › `expurgado e sem texto…` (E, com a vista montada à mão); `det-qa` › `RF-24: com 89 dias o texto continua; com 91, o expurgo real apaga texto e origem da página…` (Q) |
| Plano: texto recebido em `details` fechado, `pre` com `pre-wrap`, aviso e "Será apagado em"; sem texto | `det.test` › `TextoRecebido.tsx` (E); `det.spec` › `texto recebido fechado por padrão…` (E); `det-qa` › RF-24 (Q, com a data calculada pelo prazo) |
| RF-06: o texto bruto só pela leitura de pessoa, nunca na vista | `det.test` › `pessoa antes de autorizar…; o texto recebido pela leitura própria de pessoa` (E); `paginas-qa` › `pede a pessoa com /demandas/<id>…`, com a lista exata de autorizações (Q, endurecido nesta etapa) |
| C-18: texto como texto | `det.test` › `anexos como texto, nunca como link…` e `TextoRecebido.tsx` (E); `det.spec` › `C-18…` (E); `det-qa` › CA-15.3 e RF-24, com marcação nas dúvidas e no texto (Q) |
| C-17: id pela regex antes do banco | `det.test` › `id fora do formato: 404 sem nenhuma leitura…` (E); `paginas-qa` › `C-17…` (Q, da T39); `det-qa` › `entrada adulterada…`, na Server Action (Q) |
| RNF-11: axe sem violação | `det.spec`: recém-criada, com versões, com erro de status, aguardando informação, texto aberto e 320 px (E) |

### Leitura crítica dos testes do engenheiro

- **A Server Action "Mudar status" não tinha teste sem navegador.** O `det.test` a substitui por um dublê, e o e2e só
  passa por duas recusas (409 com DEC desatualizado e nenhuma opção). O `det-qa` a chama direto, com o banco e o Better
  Auth reais. Ele cobre cada recusa do RF-07: status final, fora da tabela, sem pacote, Estudo e o mesmo status. Cobre
  também a entrada adulterada, a sessão, a administradora e o log. Para cada recusa, o teste confere o texto que a tela
  mostra, por `errosDoResultado`.
- **A tela e o servidor podiam discordar.** `opcoesDeStatus` repete no cliente a regra de `conferirTransicaoManual`. O
  `det-qa` monta as opções com a vista real e confere que a opção marcada indisponível é a que o servidor recusa, com o
  mesmo motivo.
- **O alerta de falha dependia de uma forma de evento escrita à mão.** O `det.test` monta
  `depois: { agente, tentativas, motivo }`, e o tech-lead conferiu a forma lendo `executar.ts`. O `det-qa` roda a
  execução real três vezes com o provedor falso fora do schema. Depois, lê a página com o banco real. O teste prova
  quatro coisas:
  - o "agente trabalhando" com a execução pendente, inclusive entre duas tentativas;
  - o alerta de erro com o botão depois da 3ª tentativa;
  - nenhum sentinela da resposta do provedor na página;
  - o alerta some quando a pessoa grava o RSK.
- **O texto expurgado só era testado com a vista montada à mão.** O `det-qa` grava a entrada pela `registrarEntrada`
  (T17) e roda o `expurgar` real (T31) com 89 dias e depois com 91. A página perde o texto, a origem e o `details`, e o
  histórico mostra "Apagou o texto recebido (retenção de 90 dias)" com o Sistema.
- **O Antes e Depois só era testado com eventos montados à mão.** O `det-qa` usa os eventos que `alterarDemanda` grava
  de verdade:
  - enumeração com o rótulo;
  - nulo como "Não informado";
  - texto livre com as duas células vazias.

  Ele confere também que o valor antigo do título e do contexto não aparece em nenhum lugar da página (C-30).
- **Asserção afrouxada pelo engenheiro (desvio 3).** No `paginas-qa`, `toHaveBeenCalledExactlyOnceWith(CTO, 'ler_demanda')`
  virou `toHaveBeenNthCalledWith(1, …)`, que aceitaria qualquer autorização a mais. A troca tinha razão, porque a página
  agora também autoriza `ler_historico`. Mesmo assim, ela deixava passar uma autorização extra. Acrescentei a lista
  exata, `[[CTO, 'ler_demanda'], [CTO, 'ler_historico']]`, e a asserção voltou a ser tão estrita quanto a da T39. Nenhuma
  outra asserção do engenheiro mudou: o resto do diff é a fixture e os dublês, conferidos linha a linha.
- **e2e:** os 8 testes do engenheiro usam a API para preparar e o navegador para conferir, com axe. Não achei espera
  fixa nem dependência de ordem. Cada teste cria a própria demanda.

### Testes acrescentados (14, em 1 arquivo novo, mais 1 asserção endurecida)

| Arquivo | Testes |
|---|---|
| `src/app/(painel)/demandas/[id]/detalhe-qa.test.ts` | 14, com Testcontainers e Better Auth reais. Server Action: CA-07.3, CA-07.5 (×2), CA-07.1, CA-07.2, fora da tabela e mesmo status, entrada adulterada, sessão e administradora, log (C-21). Página com o banco real: RF-16 (worker), RF-24 (expurgo), RF-21/C-30 (eventos da T06), CA-15.3/RF-15 (ESP com e sem dúvida) e "Mudar status" com as opções lidas do banco |
| `src/app/(painel)/demandas/formularios-paginas-qa.test.ts` | 1 asserção a mais no teste da T05: a lista exata das autorizações |

O relógio é sempre o fixo dos `Deps`, um dia por teste. O teste do expurgo põe o relógio em datas fixas (julho e
setembro de 2026). Nenhum teste lê `Date.now` nem depende de outro.

### Resultado

- `pnpm test` (suíte inteira, numa rodada): 165 arquivos e **3.303 de 3.303**. São os 3.289 que já existiam mais os 14
  novos.
- `pnpm test "src/app/(painel)" src/components --sequence.shuffle`: 388 de 388, duas vezes (sementes 1793419551017 e
  1793419572989).
- `pnpm test:e2e` inteiro: código de saída 0. `pnpm test:e2e --list` dá **59 testes em 10 arquivos**: os 51 da T39 e os 8
  da T40. A saída passou de 180 s e a ferramenta a levou para segundo plano. Não li o arquivo em `/tmp`. A numeração vista
  chegou ao 58 sem falha, e o Playwright sai com código diferente de 0 se algum teste falhar. Isso confirma a contagem que
  o tech-lead pediu.
- `pnpm test:e2e e2e/detalhe-demanda.spec.ts`: **8 de 8**, numa segunda corrida (estabilidade).
- `pnpm lint` e `pnpm typecheck`: limpos.
- `git status --short --untracked-files=all`: o arquivo novo e o `paginas-qa`. O `git diff` do `paginas-qa` só acrescenta
  linhas.

### Classificação de falhas

Nenhuma falha no código contra critério da T40. O único erro que apareceu era meu: um tipo de teste que o `pnpm typecheck`
recusou. Corrigi usando o tipo de falha do próprio `ResultadoAcao`.

Achado (Minor, sem critério da T40 ferido):

| # | Criticidade | Onde | Achado |
|---|---|---|---|
| 1 | Minor | `src/app/(painel)/demandas/[id]/detalhe.ts:165` (T40) e `src/modules/agentes/executar.ts:195` (T27) | Quando o worker cai no meio da 3ª tentativa e a trava vence, a execução grava `falha_agente` com `tentativas: 4` e motivo `tentativas_esgotadas`. A suíte mostra isso no log (`"tentativa":4`). A tela repete o número e diz "depois de 4 tentativas", mas o provedor foi chamado no máximo 3 vezes (RNF-06). É o outro lado do achado 4 do tech-lead, que trata o campo ausente. A correção que resolve os dois é limitar o número a `TENTATIVAS_MAXIMAS`, ou omitir o número |

## Decisões tomadas

- **Um arquivo `-qa` novo, sem editar os testes do engenheiro.** Assim o `git diff` só tem acréscimo.
- **Endureci o `paginas-qa` em vez de aceitar o afrouxamento.** O arquivo é desta squad (06-T39-testes). Acrescentar a
  lista exata devolve o rigor da T39 sem desfazer a troca do engenheiro.
- **Server Action e página com o banco real, sem dublê nas leituras.** O risco da T40 é exibir o que vem do worker, do
  expurgo e da T06. Só os gravadores reais provam o contrato. Os dublês ficam no `next/headers` (o cookie), no roteador
  do cliente e no Sentry.
- **Estado de partida pelo migrator (`update demanda set status`) em quatro testes.** O que se testa é a regra a partir
  daquele status, e não o caminho até ele. O caminho real até Pronta para decisão (ESP, RSK e DEC) fica no teste do
  CA-07.1, e o caminho pela tela fica no e2e.
- **Expurgo com entrada de julho.** O expurgo também apaga a sessão vencida há mais de 30 dias pelo relógio dos `Deps`. A
  sessão do Better Auth vence pela hora real mais 8 h (`test/sessao.ts`). Com a entrada em 01/07 e o expurgo em 30/09, o
  limite das sessões fica em 31/08/2026, e a sessão do teste não é apagada. Por isso o teste não depende da ordem.
- **O achado 1 não devolve a tarefa.** Ele é Minor, nasce na combinação da T27 com a T40 e não fere critério.

## Pendências

- **Para o `tech-lead` (Minor, achado 1):** juntar com o achado 4 da revisão. O número de tentativas mostrado na falha
  deve ficar limitado a `TENTATIVAS_MAXIMAS`.
- **Para a `07-qa-funcional`:** seguem os cinco itens G2 do engenheiro e do tech-lead:
  - o foco no `h2` com leitor de tela;
  - o anúncio depois do `router.refresh()`;
  - o foco ao chegar a status final;
  - o `target-size` com a página rolada;
  - `details`/`summary`.

  Some-se o achado 1 do tech-lead (opções velhas depois de um 409), que o e2e do 409 contorna com `page.reload()`.
- **Ferramentas Grep e Glob indisponíveis nesta sessão.** Li os arquivos com o Read, por trechos. Achei a lista de
  arquivos com `git log --name-only` e os módulos com `git show HEAD:<arquivo>`.
- **Saída do `pnpm test`.** Com o log do pino, ela passou de 32 KB. Li só o fim do arquivo que a ferramenta gravou
  (`tool-results/b91ipz10m.txt`, fora de `/tmp`). Segue valendo a tarefa à parte de silenciar o pino nos testes.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 4031f1e..ffc0880` — código e testes no 3c9c648; fc9be9e e ffc0880 só em docs
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -8` — d4d106e (06-T40-revisao) depois de ffc0880
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, ramo construcao/DEC-DEM-20261022-0001-v1
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 4031f1e..ffc0880 -- "src/app/(painel)/demandas/formularios-paginas-qa.test.ts" src/components` — desvio 3 e achado 1 da T39
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format= -- test src/modules/agentes src/modules/demandas/texto-recebido.ts src/modules/demandas/texto-recebido.test.ts src/jobs` — ajudantes de teste e módulos do worker
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/modules/demandas/servico.ts` — alterarDemanda e "Nada foi alterado."
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/modules/demandas/transicoes.ts` — tabela e motivos do RF-07
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/modules/retencao/expurgar.ts` — expurgo e sessões
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/modules/demandas/consultas.ts` — agentesEmAndamento
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format= -- src/agents src/modules/pacotes-decisao src/modules/especificacoes src/modules/pareceres-risco src/components/Alerta.tsx` — módulos de versão
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/modules/pacotes-decisao/criar.ts` — criarPacoteDecisao
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/demandas/[id]/detalhe-qa.test.ts"` — 14 de 14
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)" src/components --sequence.shuffle` — 388 de 388, semente 1793419551017
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)" src/components --sequence.shuffle` — 388 de 388, semente 1793419572989
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — 4 erros de tipo no meu arquivo (Falha), corrigido
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — código 0 (passou de 180 s e foi para segundo plano; numeração vista até 58, sem falha)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — o arquivo novo e o paginas-qa
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --list` — 59 testes em 10 arquivos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/detalhe-demanda.spec.ts` — 8 de 8
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 165 arquivos, 3.303 de 3.303, 87,6 s
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff` — só acréscimo no paginas-qa (a lista exata de autorizações)

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste: CA-26.2, RF-12, CA-07.3, CA-07.1, CA-07.2, CA-07.5, CA-15.3, RF-16, RF-21, RF-24, RF-06, C-18, C-17 e RNF-11, na tabela da Entrega
- [x] a suíte inteira passa: 3.303 de 3.303; e2e com código 0, 59 testes, e 8 de 8 do detalhe numa segunda corrida
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real: relógio fixo dos `Deps` e datas fixas; duas corridas com `--sequence.shuffle`; o expurgo usa datas que não apagam a sessão do teste
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada: o `git diff` só acrescenta a lista exata de autorizações no `paginas-qa`, e o afrouxamento do desvio 3 foi compensado
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real: só "Pessoa Ficticia", "(fictício)", `exemplo.test`, `REF-FICTICIA-T40-QA`, `modelo-ficticio-t40` e os sentinelas de `test/sentinelas.ts`
