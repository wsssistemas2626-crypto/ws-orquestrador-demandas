---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T45-testes
agente: qa-automacao
leu: [contrato-passagem.md, padrao-tecnico.md (seções 1 a 10), pedido.json (até os critérios preliminares), tarefas.json (início), 2026-10-25-ws-orquestrador-demandas-plano.md (T38 a T46 e rastreabilidade), 01-analista-requisitos.md (RF-11 a RF-26 e RNF), 06-T45-engenheiro-frontend.md, 06-T45-tech-lead.md, 06-T44-qa-automacao.md, git show --stat 8464b66, "src/app/(painel)/configuracao/agentes/{acoes.ts,page.tsx,acoes.test.ts,pagina.test.ts}", src/components/{dados-dos-agentes.ts,dados-dos-agentes.test.ts}, e2e/{agentes-teto.spec.ts,apoio.ts}, playwright.config.ts, src/modules/agentes/{configuracao.ts,teto.ts}, src/modules/historico/registrar.ts, src/db/schema/{agentes.ts,historico.ts}, src/lib/relogio.ts, resumo final da saída do pnpm test gravada pela ferramenta em ~/.claude/projects/.../tool-results/bsmwggwpw.txt]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Testei a T45 no commit `8464b66`. O código cumpre os critérios da tarefa. Nenhum dos testes novos falhou contra ele, e
nada volta para o engenheiro.

### Portões

- `pnpm test`: 189 de 189 arquivos e 3.674 de 3.674 testes. Antes eram 3.664; os 10 a mais são desta etapa.
- `pnpm test:e2e`, a suíte inteira: são 101 testes em 18 arquivos (`--list`). Antes eram 100; o teste a mais é desta
  etapa.
  - A primeira execução inteira terminou com código 1. Não sei qual teste falhou: a saída foi para segundo plano, num
    arquivo em `/tmp`, que não li (ver Pendências).
  - Depois disso rodei os arquivos que faltavam conferir, em três grupos, e passaram 23, 23 e 17 testes. Na primeira
    execução, os 38 primeiros (de `agentes-teto` a `editar-demanda`) já tinham aparecido verdes na saída.
  - A segunda execução inteira terminou com código 0. Com `retries: 0`, isso quer dizer que nenhum teste falhou e que
    não houve 429.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.

### Critérios da T45 e os testes que os cobrem

Siglas:
- `dados` = `src/components/dados-dos-agentes.test.ts`
- `acoes` = `src/app/(painel)/configuracao/agentes/acoes.test.ts`
- `pagina` = `src/app/(painel)/configuracao/agentes/pagina.test.ts`
- `e2e` = `e2e/agentes-teto.spec.ts`

(qa) marca o que foi escrito nesta etapa.

- **Estado inicial: os quatro desligados, "Nunca alterado" e o alerta de teto não definido (CA-19.1, CA-18.3 na tela)**
  - `e2e` › "estado inicial: quatro desligados, \"Nunca alterado\", alerta de teto não definido".
  - `pagina` › "h1, introdução, alerta de teto não definido, gasto do mês, campo do teto e a tabela com os quatro
    desligados e \"Nunca alterado\"".
  - `dados` › "teto 0: o de atenção, mesmo com gasto".
- **Salvar o teto: "Teto salvo: US$ 10,00."; "-1" e "10,123" com as mensagens da 03 (RF-18)**
  - `e2e` › "salvar teto 10,00 → …".
  - `acoes` › "CTO: grava com vírgula, …" e "negativo e formato errado: 400 no campo, …".
  - `dados` › "a validação no navegador dá o mesmo que definirTetoSchema, valor a valor …".
  - Bordas (qa):
    - `acoes` › "o maior teto que o schema aceita (10 dígitos e 2 casas) cabe no numeric(12, 2) do banco e não vira erro
      interno";
    - `acoes` › "espaços nas pontas são aceitos e o valor gravado é o número; número em vez de texto é entrada_invalida,
      e nada muda";
    - `acoes` › "baixar o teto a 0 também grava, com o antes e o depois no evento e a hora do relógio injetado";
    - `acoes` › "duas gravações ao mesmo tempo entram uma depois da outra: o \"antes\" da segunda é o \"depois\" da
      primeira".
- **Ligar abre o diálogo da 03; desligar não pede confirmação; o histórico diz quem mudou e quando (RF-19, CA-19.3)**
  - `e2e` › "ligar o risco: diálogo de 03, \"Agente de risco ligado.\"; desligar sem confirmação; histórico com quem
    mudou".
  - `acoes` › "com o modelo gravado pela API: liga e desliga, …".
  - `dados` › "risco: o título e o texto da 03, por inteiro" e "os outros agentes trocam o nome e o gatilho".
  - Bordas (qa):
    - `acoes` › "CA-19.3 por inteiro: quem ligou e desligou e quando, pelo relógio injetado, com o antes e o depois no
      evento";
    - `acoes` › "ligar o que já está ligado não grava nem gera evento, e a última mudança continua a primeira";
    - `acoes` › "duas tentativas de ligar ao mesmo tempo: as duas respondem ligado, e o histórico tem um evento só".
- **Falha ao ligar: o interruptor volta e aparece "Não foi possível ligar o agente de <nome>. Ele continua desligado."**
  - `e2e` › "falha ao ligar: …".
  - `acoes` › "ligar sem modelo com preço vigente: 409 com a frase da 03, …" e "o painel não escolhe o modelo: …".
  - `dados` › "ligar com 409 (sem modelo com preço vigente): …".
  - Borda (qa): `acoes` › "modelo com preço que só vale no futuro: 409 com a frase da 03 até a vigência; no instante da
    vigência, liga". O teste confere um milissegundo antes da vigência e o instante exato.
- **Administradora: controles desabilitados, a nota da 03 e os valores legíveis; a API decide (C-12, C-26)**
  - `e2e` › "administradora: controles desabilitados com …". Confere também o 403 do `PUT` da API.
  - `pagina` › "lê a página: a nota …" e "a nota vem antes dos controles".
  - `acoes` › "C-12 e C-26: a administradora recebe 403 …", no teto e no interruptor.
  - Borda (qa): `acoes` › "C-12 e C-26 no outro sentido: a administradora também não desliga um agente ligado, e nada
    muda".
- **Último expurgo: a data ou "O expurgo ainda não rodou." (C-31)**
  - `e2e` › "mostra a data do último expurgo ou \"O expurgo ainda não rodou.\"".
  - `pagina` › "teto definido e gasto: …", com `<time datetime>`.
  - `dados` › "a data do último expurgo, ou \"O expurgo ainda não rodou.\"".
- **Alertas do worker (RNF-05)**
  - `pagina` › "RNF-05: worker sem sinal e duas instâncias, cada um no seu alerta".
  - `dados` › "worker sem sinal e duas instâncias, …".
- **Gasto do mês e suspensão pelo teto (P1-f, RF-18)**
  - `pagina` › "teto atingido: só o alerta de suspensão, …".
  - `dados` › os describes "gasto do mês" e "alerta do teto, um por vez".
- **Sessão, 2FA e entrada (C-04, C-11, C-17)**
  - `acoes` › "sem sessão: 401; sem 2FA: sem_2fa; …", "C-11: autoria enviada no corpo é descartada; …" e "C-17: agente
    fora da lista fechada …".
  - Borda (qa): `acoes` › "sem 2FA: sem_2fa no interruptor, e nada muda".
- **Log sem valor nem agente (C-21)**
  - `acoes` › "uma linha por chamada, só com a ação, o tempo, o tipo de ator e o código; …".
- **Axe (RNF-11)**
  - `e2e`, em seis estados: inicial, com erro de teto, com o diálogo aberto, com agente ligado, com falha ao ligar e na
    conta administradora.
- **Estado global depois da spec (pendência da `06-T45-revisao`)**
  - `e2e` › "depois desta spec: teto 0 e os quatro agentes desligados, como o seed os deixou" (qa).

### Testes acrescentados (11, todos verdes)

Em `src/app/(painel)/configuracao/agentes/acoes.test.ts` (10, com Testcontainers e Better Auth reais, relógio fixo):
- describe "salvarTetoNoPainel: bordas e concorrência (qa-automacao)":
  - **o maior teto aceito.** `9999999999,99` grava `9999999999.99`. Esse é o limite em que o schema e o `numeric(12, 2)`
    precisam concordar: se o banco recusasse, a pessoa veria um erro interno. Com 11 dígitos, o servidor recusa com a
    mensagem de formato, e nada muda.
  - **espaços e tipo errado.** `"  7,25  "` grava 7,25. Número, `null`, objeto vazio, `null` no lugar do corpo e texto
    solto dão `entrada_invalida`, e nada muda.
  - **baixar a 0.** Grava, com dois eventos `teto_alterado`. O primeiro vai de 0 a 10, o segundo de 10 a 0, e a hora é a
    do relógio injetado.
  - **concorrência.** Duas gravações com `Promise.all` (7 e 9) geram dois eventos. O "antes" do segundo é o "depois" do
    primeiro, e o banco fica com o valor do último evento. Isso confere a trava de linha de `definirTeto`.
- describe "alternarAgenteNoPainel: bordas e concorrência (qa-automacao)":
  - **CA-19.3 por inteiro.** Quem e quando: `ocorrido_em` dos dois eventos e `atualizado_em` iguais ao relógio
    injetado, com o antes e o depois de cada mudança.
  - **ligar o que já está ligado.** Nenhum evento novo, e a última mudança continua a primeira.
  - **concorrência.** Duas vezes ligar ao mesmo tempo: as duas respondem `ligado: true`, e o histórico tem um evento só.
    Isso confere a trava `for update` de `alterarAgente`.
  - **preço futuro.** Modelo com preço que só vale a partir de 01/11/2026 03:00 UTC. Às 02:59:59.999 dá 409 e não
    grava evento; no instante da vigência, liga.
  - **administradora no outro sentido.** Desligar um agente ligado também dá 403, e o agente continua ligado, sem
    evento.
  - **sem 2FA no interruptor.** Dá `sem_2fa`, e nada muda.

Em `e2e/agentes-teto.spec.ts` (1):
- **"depois desta spec: teto 0 e os quatro agentes desligados, como o seed os deixou".**
  - Só lê. Confere pela API o teto 0, os quatro agentes desligados e "Nunca alterado" nos três que nenhum teste liga.
  - Na tela da Nova demanda, confere "Agente orquestrador desligado. Preencha os campos abaixo.".
  - Se um `finally` deixar de restaurar, este teste acusa.
  - Passa também sozinho (`--grep`), porque é o estado do seed.

Nenhum teste existente mudou: o `git diff -U0` só mostra linhas acrescentadas, 140 inserções e nenhuma remoção.

### C-36: uso da suíte e2e por conta

O teste novo não cria demanda nem versão: só faz um login, dois `GET` e abre uma tela.

| Conta | Demandas | Versões |
|---|---|---|
| "cto" | 30 de 30 | 35 de 60 |
| "administradora" | 30 de 30 | 35 de 60 |

- Das T44 a T46, foram usadas 0 das 2 demandas que a regra do maestro (C-36 da `06-T43-revisao`) permite. Também vale
  o teto mais apertado da `06-T44-revisao`: nenhuma demanda nova na T45 nem na T46.
- Nenhum controle foi tocado: nada mudou em `limites.ts`, no seed, no `playwright.config.ts`, em variável de ambiente
  nem no relógio.

## Decisões tomadas

- **As bordas ficam no teste de integração, e não no e2e.** Assim as contas do C-36 não pesam, e o teste roda com o
  relógio injetado, o que deixa a vigência do preço exata ao milissegundo.
- **A concorrência é conferida por invariantes, e não pela ordem.** Não se sabe qual das duas chamadas entra primeiro.
  Por isso o teste confere o encadeamento (o "antes" de um evento é o "depois" do anterior) e o número de eventos. Ele
  não depende do agendamento.
- **O guarda do estado global é um teste e2e, e não um `afterAll`.** Assim ele aparece na lista e no relatório. Também
  roda sozinho, sem depender dos testes que vêm antes dele.
- **O modelo de preço futuro tem nome próprio, `modelo-ficticio-futuro`, e o insert usa `on conflict do nothing`.** O
  `beforeEach` do arquivo não apaga `preco_modelo`, e o teste não interfere no `modelo-ficticio` dos outros testes.
- **Sem teste de componente.** O Vitest do repositório não tem ambiente de DOM. O foco, o "Alterando…" e o teclado do
  interruptor ficam com o e2e e com a `07-qa-funcional`.

## Pendências

- **Para o maestro: a primeira execução inteira do `pnpm test:e2e` terminou com código 1, e não identifiquei o teste.**
  - A saída foi para segundo plano em
    `/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/f803aa58-06d4-40d8-998e-0da08e5f62a0/tasks/bcvz2hk12.output`.
    Não li esse arquivo, porque fica em `/tmp`.
  - Os 101 testes passaram em grupos, e a segunda execução inteira terminou com código 0. Pode ser um teste instável,
    ou uma interferência do `pnpm test:e2e --list` que rodei enquanto a primeira execução ainda estava em andamento.
    Não confirmei nenhuma das duas hipóteses.
  - Peço que o maestro leia o arquivo para dizer qual teste falhou. Se for instável, ele precisa de uma tarefa de
    correção, porque teste intermitente não pode ficar na suíte.
- **Para o maestro: li um arquivo de saída fora do repositório.** O `pnpm test` passou do limite de exibição, e a
  ferramenta gravou a saída em `~/.claude/projects/.../tool-results/bsmwggwpw.txt`. Li só o resumo final desse arquivo,
  que a minha própria execução gerou nesta etapa. Não li nada em `/tmp`.
- **Para a `07-qa-funcional`:** seguem os itens de G2 da `06-T45-revisao`: foco do diálogo, foco depois de ligar,
  desligar e falhar, anúncio de "Alterando…", Espaço e Enter no interruptor, região de aviso e Resumo de erros.
- **Para o tech-lead:** os cinco Minor da `06-T45-revisao` continuam como estão. Nenhum teste desta etapa os muda.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 8464b66490fadab73bcf707aff3d3c7cd505ec8b` — 12 arquivos, 1.813 inserções
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/configuracao/agentes/acoes.test.ts"` — 21 de 21
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/agentes-teto.spec.ts` — 7 de 7
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/agentes-teto.spec.ts --grep "depois desta spec"` — 1 de 1, sozinho
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 189 de 189 arquivos, 3.674 de 3.674 testes
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — código 1, a suíte inteira (foi para segundo plano depois de 180 s; teste não identificado)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 2 arquivos, 140 inserções
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -U0 --diff-filter=M` — só linhas acrescentadas
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --list` — 101 testes em 18 arquivos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/entrar.spec.ts e2e/especificacao-qa.spec.ts e2e/especificacao.spec.ts` — 23 de 23
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/fila-qa.spec.ts e2e/fila.spec.ts e2e/moldura.spec.ts e2e/nova-demanda.spec.ts` — 23 de 23
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/pacote-decisao.spec.ts e2e/parecer-risco-qa.spec.ts e2e/parecer-risco.spec.ts e2e/pedido-construcao.spec.ts` — 17 de 17
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — código 0, a suíte inteira (em segundo plano)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — 2 arquivos de teste alterados e a entrega

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
