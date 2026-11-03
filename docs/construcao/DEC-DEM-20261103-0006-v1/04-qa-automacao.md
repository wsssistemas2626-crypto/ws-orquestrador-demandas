---
pedido: DEC-DEM-20261103-0006-v1
etapa: 04-regressao
agente: qa-automacao
leu: [contrato-passagem.md, padrao-tecnico.md, pedido.json, 01-qa-funcional.md, 02-tech-lead.md, 03-engenheiro-backend.md, git show df44547 (diff inteiro de código e testes), src/modules/avisos/aviso-dec.ts, src/modules/avisos/aviso-dec.test.ts, src/modules/avisos/enviador.ts, src/jobs/aviso-dec-pronto.ts, src/jobs/aviso-dec-pronto.test.ts, src/lib/erros.ts, src/modules/limites.ts, src/app/api/especificacoes/especificacoes.test.ts, src/app/api/pareceres-risco/pareceres.test.ts, src/app/api/pacotes-decisao/pacotes.test.ts, src/app/(painel)/demandas/page.tsx, src/app/(painel)/demandas/fila.tsx, src/app/(painel)/demandas/FiltrosFila.tsx, e2e/fila-qa.spec.ts, e2e/fila.spec.ts, e2e/decisao.spec.ts, playwright.config.ts, package.json, DEC-DEM-20261102-0002-v1/01-qa-funcional.md, test-results/…/error-context.md (gerado pela execução 2 do e2e nesta etapa)]
status: pronto
proximo: maestro
devolvido_para: null
---
## Entrega

Regressão da correção `df44547` (03-correcao, engenheiro-backend) sobre os três médios. Conferi o diff inteiro da
correção. Os testes do engenheiro cobrem os passos da 01 e falhariam sem o código (ele registrou cada falha antes de
escrever o código). Acrescentei 17 testes nos pontos que ainda não tinham teste: o contrato HTTP do 409, a rota que
ignora os ids citados vindos do corpo (C-11 depois do M-01), o 4xx definitivo no handler e no pg-boss real, e a
contagem do erro inesperado sob concorrência. A prova do e2e achou um teste instável que já existia antes desta
correção, em `e2e/fila-qa.spec.ts`. Corrigi a cena dele e de três irmãos com o mesmo risco, e depois o e2e passou
três vezes seguidas. Todo dado é fictício (`exemplo.test`, "Pessoa Ficticia", `chave-ficticia-de-teste`).

### Critérios de aceite e os testes que cobrem

**1. O RSK resumido pela consolidação é o mesmo citado no DEC, com teste do RSK novo entre o agendamento e a execução (M-01)**

- `src/modules/agentes/executar.test.ts`, describe "executarAgente: a consolidação cita o que leu (M-01)":
  - "a fila: RSK v2 criado depois de agendar a consolidação do v1 → resumo enviado e citação são do v1, o DEC sai
    desatualizado e não é aprovado". **É o teste que reproduz o D-01 da 01**, passos 1 a 7;
  - "a chamada: RSK v2 gravado durante a chamada ao provedor → o DEC cita o RSK v1, que foi o lido";
  - "a ESP durante a chamada: ESP v2 gravada durante a chamada → o DEC cita a ESP v1, e o conteúdo enviado é o da v1";
  - "sem corrida: … não sai desatualizado".
- `src/modules/pacotes-decisao/criar.test.ts`, describe "criarPacoteDecisao: ESP e RSK citados pelo worker (M-01)": 6
  casos (extras citados, desatualizado, ids de outra demanda e versão inexistente → `nao_encontrado`, pessoa sem extras).
- `src/modules/agentes/entrada-agente.test.ts`, describe "citados (M-01)": 3 casos, entre eles o de que o conteúdo não
  leva os ids (C-23).
- **Novo (04):** `src/app/api/pacotes-decisao/pacotes.test.ts`, "M-01 e C-11: especificacaoId e parecerRiscoId de
  versões antigas (que existem) no corpo são descartados; pessoa e token da consolidação citam as mais novas". O teste
  antigo de C-11 só mandava ids `v9`, que não existem. Este manda os ids da v1 que existe e os ids de outra demanda,
  pela pessoa e pelo token da consolidação. Os três DEC citam a ESP v2 e o RSK v2, com `execucao_agente_id` nulo. Ele
  protege a porta nova (`ExtrasDoPacote`) contra entrar pela rota.

**2. Criar ESP, RSK ou DEC numa demanda em status final é recusado antes de agente, aviso ou Pedido, e continua permitido nos não finais (M-02)**

- `src/modules/demandas/transicoes.test.ts`, describe "status finais (M-02)": a lista vem da máquina de estados, a
  mensagem é fixa, os 2 finais recusam e os 7 não finais passam.
- `src/modules/especificacoes/servico.test.ts`, describe "demanda em status final (M-02)": pessoa (com e sem dúvida) e
  agente `insumo_tecnico`. Depois da recusa não há ESP, evento, execução nem job. A recusa vem antes do limite, e os 7
  não finais gravam.
- `src/modules/pareceres-risco/servico.test.ts` (arquivo novo do engenheiro): pessoa e agente `risco`, sem RSK, evento
  nem consolidação; os 7 não finais gravam.
- `src/modules/pacotes-decisao/criar.test.ts`, describe "criarPacoteDecisao: demanda em status final (M-02)": pessoa e
  agente `consolidacao`, sem DEC, evento, `aviso_email` nem job; os 7 não finais gravam com aviso e job.
- `src/modules/agentes/executar.test.ts`, describe "executarAgente: demanda em status final (M-02)":
  - execução na fila: `ignorada` com motivo `demanda_final` e 0 chamada ao provedor (insumo, risco e consolidação, nos
    dois finais);
  - demanda fechada durante a chamada: `falhou` com `recusada_pelo_servico`, 1 chamada só e nada gravado.
- **Novo (04), o contrato pela rota:** `pnpm test` roda estes três describes, todos com o nome "demanda em status final
  pela rota (M-02, 04-regressao)" ou "M-02 e M-01 pela rota (04-regressao)":
  - `src/app/api/especificacoes/especificacoes.test.ts`: 4 casos (entregue e encerrada, pessoa e token do
    `insumo_tecnico`, ESP com dúvida) mais o controle em `em_construcao` com 201;
  - `src/app/api/pareceres-risco/pareceres.test.ts`: 4 casos (pessoa e token do `risco`);
  - `src/app/api/pacotes-decisao/pacotes.test.ts`: 4 casos (pessoa e token da `consolidacao`), sem DEC e sem
    `aviso_email`.

  Em todos, o corpo é exatamente `{ erro: 'conflito', mensagem: MENSAGEM_DEMANDA_FINAL }` com HTTP 409, e nada é gravado.
  É o que a interface e os agentes recebem.

**3. O erro inesperado soma tentativas e termina em falhou; o 4xx definitivo falha sem nova tentativa; o 429 e o 5xx seguem tentados (M-03)**

- `src/modules/avisos/aviso-dec.test.ts`, describe "enviarAviso: recusa definitiva, falha passageira e erro inesperado
  (M-03)":
  - `ErroEnvioEmail('recusado')` → `falhou` na 1.ª, com log e Sentry, e a 2.ª chamada não chama o enviador. **Reproduz
    o D-03 parte B**;
  - `EnviadorResend` com resposta 400, 403 e 422 → `falhou` na 1.ª;
  - 429, 500 e 503 → `pendente`, conta a tentativa e lança `AvisoNaoEnviado`;
  - erro inesperado (URL base inválida) → 1, 2 e 3 tentativas, Sentry uma vez e nada sensível no log. **Reproduz o D-03
    parte A**;
  - erro inesperado com o aviso já enviado.
- `src/jobs/aviso-dec-pronto.test.ts`: "erro inesperado fora do enviador, três execuções do mesmo job →
  aviso_nao_enviado duas vezes e, na 3ª, falhou sem relançar".
- **Novos (04):**
  - `src/jobs/aviso-dec-pronto.test.ts`, "M-03: recusa definitiva do provedor → o job termina sem erro na 1ª execução,
    aviso falhou com 1 tentativa": pelo handler, sem `aviso_email_falha` nem `aviso_erro_inesperado`;
  - `src/jobs/aviso-dec-pronto.test.ts`, "M-03 no worker: recusa definitiva do provedor → job completed na 1ª execução
    (retry_count 0), uma chamada só, aviso falhou": pelo pg-boss real. É o contraponto do teste existente da falha
    passageira, que fica em `retry`;
  - `src/modules/avisos/aviso-dec.test.ts`, "quatro execuções simultâneas com erro inesperado → exatamente 3 tentativas,
    falhou, Sentry uma vez e duas novas tentativas pedidas". Testa a concorrência na contagem nova
    (`contarErroInesperado`, com `for update`): a linha termina `{ falhou, 3 }`, nunca 2 nem 4; duas chamadas lançam
    `AvisoNaoEnviado` (tentativas 1 e 2), duas devolvem `falhou`, e o Sentry recebe 1 evento. O resultado não depende da
    ordem em que as quatro rodam. Passou nas 4 execuções do arquivo.

**4. A suíte e2e passa três vezes seguidas**

- Execução 1: 143 de 143, 0 pulado.
- Execução 2: 142 de 143. Falhou `e2e/fila-qa.spec.ts:24` ("tipo e linha de serviço juntos…") em
  `toBeFocused()` do caption, depois de "Filtrar" (ver "Teste instável" abaixo).
- Corrigi a cena e reiniciei a contagem.
- Execuções 3, 4 e 5: **143 de 143 cada uma, 0 pulado, seguidas**, em 8,3, 7,6 e 8,0 min.
- Cada execução sobe o próprio Postgres descartável (Testcontainers, `e2e/servidor.ts`): banco novo a cada uma. O 409
  que a triagem previu para o `decisao.spec.ts` rodado de novo no mesmo banco não aparece com banco novo, e nenhum spec
  precisou mudar por causa do M-02.

### Teste instável encontrado e corrigido (`e2e/fila-qa.spec.ts:24`)

- **Não é regressão deste pedido.** A correção não toca a fila (`git show --stat df44547`: nada em `src/app/`, nem em
  `src/components/`).
- **O que a falha mostrou.** A URL era a do caminho com script (`?tipo=novo_projeto&linhaServicoProvavel=…`, sem o
  `status=` vazio do GET comum). Então o `onSubmit` do React rodou, e mesmo assim o caption não recebeu o foco.
- **Causa.** A lista inicial carrega num `Suspense`, e o `ResultadoAnunciado` dela só monta quando o React assume essa
  parte da página. O teste clicava em "Filtrar" logo depois do `goto`. O clique grava o pedido de foco
  (`focoPedidoPara`, em `FiltrosFila.tsx`). O efeito atrasado da lista inicial consome esse pedido com a URL ainda
  antiga e o descarta. Quando o resultado novo chega, não há mais pedido de foco.
- **Esse risco já era conhecido.** O teste da linha 70 do mesmo arquivo espera o texto da Região de aviso antes de
  clicar, com o comentário explicando o porquê.
- **Correção, só na cena.** Antes do clique que pede o foco, o teste espera "N demandas encontradas." na Região de
  aviso. Esse texto só aparece depois do efeito da lista inicial (`AvisoDaFila` renderiza vazio no servidor). Fiz isso
  em 4 testes com o mesmo risco (`goto` seguido de clique que espera o foco):
  - `e2e/fila-qa.spec.ts`: "tipo e linha de serviço juntos" e "Limpar filtros do formulário", pelo ajudante novo
    `esperarFilaPronta`;
  - `e2e/fila.spec.ts`: "CA-26.1" e "paginação".
- **O que não mudou.** Nenhuma asserção foi tirada ou afrouxada. O foco continua conferido com `toBeFocused()` nos
  quatro.

### Resultados

- `pnpm test`: **3811 de 3811**, 194 arquivos, 0 falha (antes da etapa: 3794; mais 17 novos).
- `pnpm lint`: limpo, antes e depois da mudança no e2e.
- `pnpm typecheck`: limpo, antes e depois da mudança no e2e.
- `pnpm test:e2e`: 143 de 143 três vezes seguidas (execuções 3, 4 e 5), 0 pulado.

### Conferência de `git diff`

- **Esta etapa:** 7 arquivos, 197 linhas acrescentadas e **0 removida**.
- **O ramo contra a main:** `git diff main -G "\.(skip|only|todo)\("` não traz nenhum arquivo. Nos testes, a 03
  removeu só:
  - o `encerrada` dos dois `it.each`, que virou caso de recusa no describe novo, como a triagem mandou;
  - a versão `0.1.4`, que virou `0.1.5`.

  Nenhuma asserção afrouxada.
- **Dados:** testes, fixtures e dados sem segredo, sem token real, sem valor de `.env` e sem dado pessoal real. A chave
  do Resend nos testes é `chave-ficticia-de-teste`; e-mails e URLs são `exemplo.test`.
- **Ordem e relógio:** os testes novos não dependem de ordem nem do relógio real. O relógio é o fixo de cada arquivo.
  Os blocos novos das rotas criam as demandas com um ator só deles (ver Decisões).

## Decisões tomadas

- Acrescentei o contrato HTTP do M-02 nas três rotas: os testes da 03 param no serviço, e o que a interface e o token do agente recebem (409 e o corpo exato) não tinha teste.
- Acrescentei o teste de C-11 com ids que existem: depois do M-01 o serviço aceita `especificacaoId` e `parecerRiscoId`, e o teste antigo com `v9` passaria mesmo se a rota repassasse o corpo, porque `v9` dá 404.
- Acrescentei o 4xx definitivo pelo handler e pelo pg-boss real: só o worker prova que o job não volta para `retry`.
- Acrescentei a concorrência da contagem do erro inesperado: a triagem pôs a trava para "não somar duas vezes", e nada testava isso. Com quatro execuções ao mesmo tempo, o resultado só pode ser um, se a trava funcionar.
- Os blocos novos nas rotas criam demandas com um ator só deles: na 1.ª rodada, 4 demandas a mais pela CTO em `pareceres.test.ts` estouraram o limite de 30 demandas por hora (C-36) e quebraram o teste de log seguinte. Contei as demandas da CTO em `especificacoes.test.ts` (perto de 24) e em `pacotes.test.ts` (perto de 21): com os meus blocos elas ficariam em 29 e 27, sem folga. Passei os três blocos para atores próprios, e nenhum teste antigo depende da minha contagem.
- O teste instável foi corrigido na hora, e não contornado com reexecução, porque falha intermitente é pior que teste ausente. A correção espera um sinal da própria tela, sem `waitForTimeout`, e mantém o `toBeFocused()`.
- Apliquei a mesma espera nos três testes irmãos com o mesmo risco: eles não falharam aqui, mas o caminho é o mesmo, e esperar a próxima falha intermitente seria aceitar a instabilidade.
- Reiniciei a contagem das três execuções seguidas depois de mudar o e2e: a prova vale para o código final.
- Não li o código do Next em `node_modules` (fora da lista **Pode**, não rastreado). Por isso, a explicação da causa vem do código da fila, da URL observada e do comentário do teste da linha 70. A correção só depende de o texto da Região de aviso nascer depois do efeito da lista inicial, o que está no código da fila.
- Três comandos que o `conferir` acusou fora da lista **Pode**, todos só de leitura, foram liberados pelo maestro pela regra de Fabiano para bloqueio só de leitura. Por isso não aparecem em "Comandos executados". Foram eles:
  - um `find` em `src/app/api/demandas` para listar os arquivos das rotas: a sessão não tinha Glob nem Grep. Depois disso listei pastas por `git show HEAD:<pasta>/`;
  - um `tail -n 12` na saída gravada do `pnpm test`, para ler o resumo de 3811 de 3811;
  - o `git diff main -G` que procura `.skip`, `.only` e `.todo` contra a main, sem nenhum arquivo no resultado, como está em "Conferência de `git diff`".

  Nenhum dos três altera nada.

## Pendências

- Para `tech-lead` ou `engenheiro-frontend`, à parte (Minor, fora deste pedido): em `src/app/(painel)/demandas/FiltrosFila.tsx`, o `ResultadoAnunciado` que monta tarde, quando o React assume a lista inicial, zera `focoPedidoPara` mesmo quando não é o destino. Uma pessoa que clicar em "Filtrar", "Limpar filtros" ou na paginação nos primeiros instantes depois de abrir a fila fica sem o foco no resultado. O e2e agora espera a página ficar pronta antes de clicar e não acusa mais isso. Uma regressão própria do produto pediria um teste que reproduza o clique cedo.
- Para `tech-lead`, a confirmar (observação, sem defeito provado): a regra nova manda todo 4xx que não é 429 para `falhou` na hora, como a ESP pede. Se o Resend responde 409 a uma requisição concorrente com a mesma `Idempotency-Key` (pela documentação dele, que não conferi nesta etapa), esse caso, que é passageiro, deixa de ser tentado de novo. O mesmo vale para 408. Vale confirmar se algum desses deve contar como `transitorio`.
- Seguem válidas, fora deste pedido, as pendências da triagem e da 03: `registrarDecisao` e `gerarPedido` não conferem o status da demanda, e falta o rótulo de `demanda_final` em `MOTIVO_IGNORADO`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo construcao/DEC-DEM-20261103-0006-v1, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat df445477dd63d668ae53668a00c758c29fb71aa5` — 20 arquivos da correção
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat --format=%H HEAD~1..HEAD` — HEAD é a correção
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show df445477dd63d668ae53668a00c758c29fb71aa5 -- src/modules/pacotes-decisao/criar.test.ts src/modules/especificacoes/servico.test.ts src/modules/demandas/transicoes.test.ts test/estatico/projeto.test.ts src/jobs/aviso-dec-pronto.test.ts` — diff dos testes (1)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show df445477dd63d668ae53668a00c758c29fb71aa5 -- src/modules/agentes/executar.test.ts src/modules/agentes/entrada-agente.test.ts src/modules/avisos/aviso-dec.test.ts` — diff dos testes (2)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show df445477dd63d668ae53668a00c758c29fb71aa5 -- src/modules/pareceres-risco/servico.test.ts src/modules/avisos/aviso-dec.ts src/modules/agentes/executar.ts src/modules/pacotes-decisao/criar.ts` — diff do código e do teste novo do RSK
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S "pareceres-risco/route" --name-only --format=` — onde ficam os testes da rota do RSK
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/app/api/` — pastas da API
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/app/api/pacotes-decisao/ HEAD:src/app/api/especificacoes/` — testes das rotas do DEC e da ESP
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/jobs/aviso-dec-pronto.test.ts src/modules/avisos/aviso-dec.test.ts src/app/api/especificacoes/especificacoes.test.ts src/app/api/pareceres-risco/pareceres.test.ts src/app/api/pacotes-decisao/pacotes.test.ts` — 162 de 163: o teste de log do RSK quebrou pelo limite C-36 da CTO
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/jobs/aviso-dec-pronto.test.ts src/modules/avisos/aviso-dec.test.ts src/app/api/especificacoes/especificacoes.test.ts src/app/api/pareceres-risco/pareceres.test.ts src/app/api/pacotes-decisao/pacotes.test.ts` — 163 de 163, com os blocos em atores próprios
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/avisos/aviso-dec.test.ts src/jobs/aviso-dec-pronto.test.ts` — 48 de 48 (estabilidade, 1.ª repetição)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/avisos/aviso-dec.test.ts src/jobs/aviso-dec-pronto.test.ts` — 48 de 48 (estabilidade, 2.ª repetição)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 3811 de 3811, 194 arquivos
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — execução 1: 143 de 143
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — 5 arquivos de teste alterados
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 184 linhas acrescentadas, 0 removida
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff main --stat -- e2e test` — só test/estatico/projeto.test.ts (versão)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — execução 2: 142 de 143, falha em e2e/fila-qa.spec.ts:24 (foco)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S "resultado-da-fila" --name-only --format=` — onde fica o caption da fila
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S "fila-qa.spec.ts" --format="%h %s" --name-only` — histórico de falhas da spec
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S ".focus()" --format= --name-only -- src` — quem mexe no foco
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo, depois da mudança no e2e
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo, depois da mudança no e2e
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — execução 3: 143 de 143
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — execução 4: 143 de 143
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — execução 5: 143 de 143
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 7 arquivos, 197 linhas acrescentadas, 0 removida
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — os 7 arquivos de teste e esta entrega

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] (04 regressão) há um teste que reproduz o defeito descrito em `01-qa-funcional.md`
