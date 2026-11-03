---
pedido: DEC-DEM-20261103-0006-v1
etapa: 01-reproducao
agente: qa-funcional
leu: [pedido.json, docs/construcao/DEC-DEM-20261022-0001-v1/08-maestro.md, src/modules/agentes/entrada-agente.ts, src/modules/agentes/executar.ts, src/modules/agentes/gatilhos.ts, src/modules/pacotes-decisao/criar.ts, src/modules/pacotes-decisao/decidir.ts, src/modules/pedido-construcao/gerar.ts, src/modules/especificacoes/servico.ts, src/modules/pareceres-risco/servico.ts, src/modules/demandas/transicoes.ts, src/modules/versoes.ts, src/modules/avisos/aviso-dec.ts, src/modules/avisos/enviador.ts, src/jobs/aviso-dec-pronto.ts, src/lib/fila.ts, src/lib/erros.ts, src/lib/env.ts, src/modules/pacotes-decisao/criar.test.ts, src/modules/especificacoes/servico.test.ts, src/modules/agentes/executar.test.ts, src/modules/agentes/gatilhos.test.ts, src/modules/avisos/aviso-dec.test.ts, src/jobs/aviso-dec-pronto.test.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Base lida: ramo `construcao/DEC-DEM-20261103-0006-v1`, igual à main (0.1.4). Os três defeitos foram reproduzidos pela
leitura do código, passo a passo, com o caminho exato de execução. Não rodei nada: este agente não tem Bash. Os passos
abaixo estão escritos para virar teste de integração (Vitest + Postgres de teste, como os `*.test.ts` atuais) sem
precisar de interpretação. Todo dado é fictício: demanda `DEM-20261103-0901` e seguintes, textos "fictício", domínio
`exemplo.test`.

Severidade geral do pedido: **média** (é a classificação de cada um dos três, justificada abaixo).

---

### D-01 (M-01): a consolidação resume um RSK e o DEC cita outro

**Ambiente:** serviço e worker (`executarAgente`), banco de teste; agente `consolidacao` ligado, com modelo e preço
fictícios; provedor falso que devolve `PROMPTS.consolidacao.exemploSaida`.

**Passos para reproduzir**

1. Criar a demanda fictícia `DEM-20261103-0901` (tipo `bug`, status `em_analise`) pela pessoa CTO.
2. Criar a ESP v1 sem dúvida em aberto (`criarEspecificacao`, ator CTO).
3. Ligar o agente `consolidacao`.
4. Criar o RSK v1 pela pessoa CTO com `resumo: "Resumo fictício do RSK v1"`. O gatilho
   (`pareceres-risco/servico.ts:75`) cria a execução de consolidação com chave `rsk:RSK-DEM-20261103-0901-v1` e o job.
   Não executar ainda.
5. Criar o RSK v2 pela pessoa CTO com `resumo: "Resumo fictício do RSK v2"`. O gatilho cria uma segunda execução, com
   chave `rsk:RSK-DEM-20261103-0901-v2`.
6. Executar só a primeira execução (`executarAgente(deps, idDaExecucaoV1)`), capturando o `conteudo` que o provedor
   falso recebe.
7. Ler o DEC gravado (`DEC-DEM-20261103-0901-v1`).

**Resultado obtido (pelo código)**

- No passo 6, `montarEntrada` (`entrada-agente.ts:198`) lê o parecer **da chave** (`lerParecer(db, id)`): o bloco
  `<dados>` enviado ao provedor traz `parecer.resumo = "Resumo fictício do RSK v1"`.
- No mesmo passo, `criarPacoteDecisao` (`criar.ts:84`) cita o RSK **mais novo** da demanda (`maisNova(tx, parecerRisco,
  demandaId)`): o DEC sai com `parecerRiscoId = RSK-DEM-20261103-0901-v2`, `parecerRiscoVersao = 2`.
- O resumo executivo e as opções do DEC foram escritos pelo modelo a partir do RSK v1, mas a tela de decisão e o Pedido
  de Construção (`gerar.ts:51`, que monta com `dec.parecerRiscoId`) mostram o RSK v2. Nada acusa a divergência: o DEC
  não fica `desatualizado`, porque cita justamente o mais novo.
- A segunda execução, quando rodar, gera o DEC v2 (citando o RSK v2, coerente), e o DEC v1 incoerente continua na fila
  de decisão até alguém notar que não é o mais novo.

**Resultado esperado (ESP do pedido)**

O RSK cujo conteúdo foi enviado ao modelo é o mesmo RSK citado no DEC. Um teste cria o RSK v2 depois de agendar a
consolidação do v1 e confere que resumo enviado e citação batem.

**Janela adicional encontrada (mesmo defeito, outro momento)**

- A divergência não depende só do intervalo entre agendamento e execução. A chamada ao provedor
  (`executar.ts:227`) roda **fora de transação** e pode levar até 120 s (RNF-06). Um RSK v2 gravado durante essa
  chamada, depois de `montarEntrada`, também faz o DEC citar o v2. Por isso a opção "a consolidação usa o RSK mais
  novo" só fecha o defeito se o `gravar` conferir de novo, já com a trava da demanda, que o RSK lido continua sendo
  o mais novo. A opção "o DEC cita o RSK da execução" fecha as duas janelas de uma vez: o DEC sai `desatualizado`
  (existe RSK mais novo) e a aprovação dele já é barrada por `MENSAGENS_DECISAO.desatualizado` (`decidir.ts:214`).
- O mesmo padrão vale para a ESP: `montarEntrada` lê a ESP mais nova na hora (`entrada-agente.ts:199`) e
  `criarPacoteDecisao` lê de novo na hora de gravar (`criar.ts:83`). Uma ESP v2 gravada durante a chamada ao provedor
  dá um DEC que cita a ESP v2 com texto escrito a partir da v1. Isso não está no texto do M-01; registro para a
  triagem decidir se entra junto (o risco é o mesmo, e a correção é a mesma).

**Arquivos suspeitos**

- `src/modules/agentes/entrada-agente.ts:198-199` (o RSK da chave; a ESP mais nova no momento da leitura)
- `src/modules/pacotes-decisao/criar.ts:83-84` (`maisNova` para ESP e RSK no momento da gravação)
- `src/modules/agentes/executar.ts:91-104` (destino `consolidacao`: não passa ao serviço qual RSK e qual ESP foram lidos)

**Severidade: média.** O impacto é sobre a decisão humana: Fabiano pode aprovar uma recomendação escrita sobre um
parecer de risco que não é o que aparece citado e que vai no Pedido. Não chega a alta porque exige dois RSK em
sequência curta, o DEC é sempre rascunho de agente com dupla aprovação (`cto_e_administradora`, A-04) e a revisão dos
rascunhos citados é obrigatória antes de decidir.

**Teste existente que cobre o cenário:** nenhum. `executar.test.ts:268-274` usa um RSK só.

---

### D-02 (M-02): ESP, RSK e DEC são aceitos em demanda encerrada ou entregue

**Ambiente:** serviço (pessoa e agente), banco de teste; para o caminho do agente, os quatro agentes ligados e
provedor falso.

**Estados terminais pela máquina de estados:** `FINAIS` em `src/modules/demandas/transicoes.ts:27` traz `entregue` e
`encerrada` (as duas com `MANUAIS[...] = lista()`). Não há outro estado terminal hoje.

**Passos para reproduzir (pessoa)**

1. Criar a demanda fictícia `DEM-20261103-0902` e levá-la a `encerrada` (pelo ajuste direto de status que os testes
   já usam em `novaDemanda('bug', 'encerrada')`, ou arquivando o DEC dela, `decidir.ts:222`).
2. Ligar `risco` e `consolidacao`.
3. Pela pessoa CTO, `criarEspecificacao(deps, cto, 'DEM-20261103-0902', esp())`, sem dúvida em aberto.
4. Pela pessoa CTO, `criarParecerRisco(deps, cto, 'DEM-20261103-0902', rsk())`.
5. Pela pessoa CTO, `criarPacoteDecisao(deps, cto, 'DEM-20261103-0902', dec())`.
6. Repetir de 1 a 5 com a demanda `DEM-20261103-0903` em `entregue`.

**Resultado obtido (pelo código)**

- Passo 3: a ESP v1 é gravada (`especificacoes/servico.ts:35-67`); `travarDemanda` devolve a linha, mas o status não é
  lido. Sem dúvida, `dispararSeLigado(..., 'risco', ...)` (linha 76) cria execução e job do agente de risco: chamada
  paga ao provedor numa demanda fechada.
- Passo 4: o RSK v1 é gravado (`pareceres-risco/servico.ts:44-67`) e, como há ESP, dispara a consolidação (linha 75):
  outra chamada paga.
- Passo 5: o DEC v1 é gravado (`criar.ts:80-112`); `mudarStatusPeloSistema(..., 'dec_criado')` não muda nada (a
  origem não inclui estados finais), e `agendarAviso` (linha 129) grava o `aviso_email` pendente e o job: o e-mail de
  "pacote pronto para decisão" sai para uma demanda encerrada.
- Depois do passo 5, em `encerrada` sem DEC aprovado anterior: `registrarDecisao` (`decidir.ts:201-219`) não confere o
  status da demanda e aprova o DEC; `gerarPedido` (`gerar.ts:42-61`) também não confere e gera o Pedido de Construção.
  Em `entregue`, a aprovação de um DEC novo costuma ser barrada por `temOutroAprovado` (linha 213), mas o agente pago e o
  aviso já aconteceram.
- O teste `src/modules/pacotes-decisao/criar.test.ts:242` **afirma o comportamento defeituoso** para `encerrada`
  ("em %s (fora da origem), o DEC é gravado e o status não muda", com `linhasDec` de tamanho 1). Ele precisa ser
  mudado junto com a correção: `encerrada` sai da lista e vira caso de recusa; `pronta_para_decisao`, `aprovada` e
  `em_construcao` continuam gravando.
- `src/modules/especificacoes/servico.test.ts:201` usa `encerrada` no caso "com dúvida ... o status não muda": também
  vai mudar de sentido (passa a ser recusa) e tem de ser ajustado.

**Passos para reproduzir (agente)**

1. Criar a demanda fictícia `DEM-20261103-0904` com `insumo_tecnico` ligado: o gatilho cria a execução
   `demanda:DEM-20261103-0904`. Não executar.
2. Levar a demanda a `encerrada`.
3. Executar a execução do insumo técnico com o provedor falso devolvendo `PROMPTS.insumo_tecnico.exemploSaida`.

**Resultado obtido:** o provedor é chamado (linha de uso gravada), a ESP é gravada com autor agente e o agente de risco
é disparado em cadeia. O mesmo vale para uma execução de `risco` ou `consolidacao` que estava na fila quando a demanda
foi encerrada.

**Resultado esperado (ESP do pedido)**

Criar ESP, RSK ou DEC, por pessoa ou por agente, numa demanda `encerrada` ou `entregue` é recusado com `ErroDominio` e
mensagem fixa, dentro da mesma trava (`travarDemanda`), antes de qualquer insert, agendamento de agente, aviso ou
Pedido. Nos estados não terminais (`nova`, `em_analise`, `aguardando_informacao`, `pronta_para_decisao`, `aprovada`,
`em_construcao`, `devolvida`) a criação continua permitida.

**Pontos que a triagem precisa decidir (encontrados na reprodução)**

1. **Código do `ErroDominio`.** No caminho do agente, `tratarResposta` (`executar.ts:291-297`) trata
   `entrada_invalida` como saída inválida e **tenta de novo** (mais duas chamadas pagas), e `limite_excedido` também
   reagenda. Se a recusa usar um desses códigos, o defeito de custo continua. Com `conflito` (409) ou
   `nao_processavel` (422), a execução cai em `falhar(c, 'recusada_pelo_servico')` na primeira vez, sem nova chamada.
2. **A chamada paga da execução que já estava na fila.** A recusa no serviço impede o artefato, mas a chamada ao
   provedor do passo 3 do caminho do agente já aconteceu. Se a meta é "não gastar agente pago em demanda fechada",
   `executarReivindicada` (ou `montarEntrada`) precisa conferir o status antes de chamar o provedor e encerrar como
   `ignorada` ou `falhou`. A ESP do pedido diz "antes de qualquer ... agendamento de agente": isso cobre o gatilho, não
   a execução já agendada. Registro para a triagem decidir se entra.
3. **Fonte única dos terminais.** `FINAIS` é um objeto privado de `transicoes.ts`. A ESP pede que os terminais venham da
   máquina de estados: exportar a lista dali evita uma segunda lista nos três serviços.

**Arquivos suspeitos**

- `src/modules/especificacoes/servico.ts:35`
- `src/modules/pareceres-risco/servico.ts:44`
- `src/modules/pacotes-decisao/criar.ts:80`
- `src/modules/demandas/transicoes.ts:27` (de onde deveria vir a lista de terminais)
- `src/modules/agentes/executar.ts:201-232` e `:288-298` (caminho do agente e tratamento do erro do serviço)
- `src/modules/pacotes-decisao/criar.test.ts:242` e `src/modules/especificacoes/servico.test.ts:201` (testes que
  afirmam o comportamento atual)

**Severidade: média.** Impacto: gasto de agente pago sem propósito, e-mail de decisão sobre demanda fechada (ruído que
leva a decisão errada) e possibilidade de Pedido de Construção a partir de demanda encerrada. Não chega a alta porque
aprovar e gerar o Pedido continuam exigindo ação humana com 2FA, e nada sai da empresa sem Fabiano.

**Teste existente que cobre o cenário:** nenhum que recuse; dois que afirmam o contrário (citados acima).

---

### D-03 (M-03): erro inesperado no aviso não conta tentativa, e o 4xx definitivo é tentado de novo

**Ambiente:** handler `tratarAvisoDecPronto` e `enviarAviso`, banco de teste; fila `aviso.dec-pronto` com
`retryLimit: 2` (`src/lib/fila.ts:39`), ou seja, 3 execuções do job no total.

**Parte A: erro inesperado**

Passos:

1. Criar um DEC fictício pronto (`decPronto()` do teste atual), por exemplo `DEC-DEM-20261103-0905-v1`: o
   `aviso_email` fica `pendente`, `tentativas = 0`.
2. Montar `DepsAviso` com remetente e destinatário fictícios (`aviso@exemplo.test`, `decisao@exemplo.test`), um
   enviador falso que daria certo, e `config.urlBase = 'ftp://orquestrador.exemplo.test'` (forma de provocar um erro
   que não vem do enviador e acontece dentro da transação; uma falha do banco no `update` ou no `select ... for update`
   tem o mesmo efeito).
3. Chamar `tratarAvisoDecPronto(deps, [{ id: 'job-a', data: { decId } }])` três vezes seguidas (simula a 1ª execução e as
   duas novas tentativas do pg-boss).
4. Ler a linha do `aviso_email` e o estado do job.

Resultado obtido (pelo código):

- `montarEmailDoAviso` (`aviso-dec.ts:139`) é chamado **fora** do `try` que conta a tentativa (linhas 141-151) e lança
  `RangeError('aviso: URL base inválida')`. A transação desfaz tudo.
- O handler (`aviso-dec-pronto.ts:27-29`) registra `aviso_erro_inesperado`, manda ao Sentry e relança
  `aviso_erro_inesperado` nas três vezes: três eventos no Sentry, nenhum incremento.
- Depois da terceira, a linha continua `status = 'pendente'`, `tentativas = 0`, e o job do pg-boss termina `failed`.
  Nada mais agenda o aviso (o job tem `singletonKey` = id do DEC e nenhum outro código lê `aviso_email` pendente):
  o aviso fica pendente para sempre, sem o `aviso_email_falhou` que a falha comum gera.
- Observação: o caso "erro inesperado **do enviador**" já conta tentativa (`aviso-dec.test.ts:353`), porque cai no
  `catch` da linha 143. O defeito é o erro que nasce fora da chamada ao enviador. O teste do handler
  `aviso-dec-pronto.test.ts:129` confere só que relança, e não olha `tentativas` nem o status final.

Resultado esperado (ESP do pedido): o erro inesperado também soma `aviso_email.tentativas`; na 3ª, o aviso fica
`falhou`, vai ao Sentry como a falha comum (`aviso_email_falhou`) e o job termina sem erro.

Nota para a triagem: como o erro desfaz a transação do envio, o incremento precisa ser gravado depois, numa transação
própria (e com a trava da linha, para não somar duas vezes com um job concorrente do mesmo DEC). Se o próprio banco
estiver fora, nem esse incremento grava; vale decidir o que o handler faz nesse caso (relançar sem contar parece o
único possível, e deve ficar escrito).

**Parte B: recusa definitiva do Resend (4xx que não é 429)**

Passos:

1. Criar outro DEC fictício pronto, `DEC-DEM-20261103-0906-v1`.
2. Usar `EnviadorResend` com chave fictícia e `fetch` injetado que devolve `new Response('{}', { status: 422 })`
   (ou um enviador falso que lança `new ErroEnvioEmail('recusado')`).
3. Chamar `enviarAviso(deps, decId)` uma vez.

Resultado obtido (pelo código):

- `classificar(422)` dá `recusado` (`enviador.ts:45`), corretamente.
- Em `enviarAviso`, o `catch` (`aviso-dec.ts:143-150`) só separa `sem_provedor`; `recusado` segue o mesmo caminho do
  transitório: `tentativas = 1`, `status = 'pendente'`, lança `AvisoNaoEnviado`, e o handler relança
  `aviso_nao_enviado` para o pg-boss tentar de novo.
- O aviso só chega a `falhou` na 3ª chamada, depois de duas novas requisições ao Resend que vão ser recusadas de novo
  (`retryDelay: 60` com backoff: alguns minutos de atraso para um resultado já conhecido).

Resultado esperado: `recusado` marca `falhou` na primeira vez (`tentativas = 1`), com `aviso_email_falhou` no log e
Sentry, sem relançar.

**Parte C: o que deve continuar como está (controle de regressão)**

- `fetch` devolvendo 429, 500 ou 503, erro de rede, tempo limite ou resposta fora do formato: `transitorio`, conta a
  tentativa, fica `pendente` e relança até a 3ª (teste atual `aviso-dec.test.ts:309` e `:320`). Hoje funciona; a
  correção não pode mudar.

**Arquivos suspeitos**

- `src/modules/avisos/aviso-dec.ts:116-154` (a montagem do e-mail e as leituras e escritas fora do `try` que conta;
  o `catch` que não separa `recusado`)
- `src/jobs/aviso-dec-pronto.ts:24-30` (o erro inesperado relança sem contar, e vai ao Sentry a cada vez)
- `src/modules/avisos/enviador.ts:45` (a classificação, correta, que o chamador ignora)

**Severidade: média.** Impacto: o aviso de pacote pronto some em silêncio (fica pendente para sempre, sem alerta de
falha), e o 4xx gasta chamadas e atrasa o `falhou`. Não chega a alta porque o DEC continua visível na fila do painel
(o aviso é conveniência, não o único caminho) e nenhum dado vaza.

---

### Critério de aceite 4 ("a suíte e2e passa três vezes seguidas")

Não é defeito a reproduzir: é condição de pronto do pedido. Fica com `qa-automacao` (04-regressao) e com o CI.

### Resumo para a triagem

| Defeito | Onde | Severidade | Teste que hoje afirma o contrário |
|---|---|---|---|
| D-01 (M-01) | `entrada-agente.ts:198-199`, `criar.ts:83-84` | média | nenhum (sem cobertura) |
| D-02 (M-02) | `especificacoes/servico.ts:35`, `pareceres-risco/servico.ts:44`, `criar.ts:80` | média | `criar.test.ts:242`, `especificacoes/servico.test.ts:201` |
| D-03 (M-03) | `aviso-dec.ts:139-150`, `aviso-dec-pronto.ts:24-30` | média | nenhum (o `:129` do handler não confere tentativas) |

## Decisões tomadas

- Reproduzi pela leitura do código, com o caminho de execução linha a linha: o agente não tem Bash, e o contrato pede
  passos completos e o resultado obtido, não a execução.
- Para o erro inesperado do D-03 usei `urlBase` inválida: é determinística e acontece dentro da transação, como a
  falha de banco que é o caso real em produção (`BETTER_AUTH_URL` é validada pelo Better Auth no app).
- Registrei a janela da chamada ao provedor (D-01) e a ESP com o mesmo padrão: o critério "resumo e citação batem"
  falha também nesses casos, e a escolha de opção da triagem depende disso.
- Registrei o código do `ErroDominio` (D-02) como ponto de decisão: com `entrada_invalida` a correção reintroduz o
  gasto de agente pago pela nova tentativa do executor.
- Severidade média nos três, pelo impacto no usuário (decisão humana, custo e aviso perdido), com o motivo de não
  ser alta escrito em cada um.

## Pendências

- Para a triagem (`tech-lead`): escolher a opção do M-01 (o DEC cita o RSK da execução, ou a consolidação usa o mais
  novo com nova conferência sob a trava) e registrar o motivo, como a ESP exige.
- Para a triagem: decidir se a ESP mais nova (mesmo padrão do M-01) e a conferência de status antes da chamada paga
  (D-02, ponto 2) entram neste pedido ou viram registro à parte.
- Para a triagem: definir o código do `ErroDominio` da recusa por estado terminal e a mensagem fixa.
- Os testes `criar.test.ts:242` e `especificacoes/servico.test.ts:201` mudam de sentido com a correção do M-02; o
  engenheiro e o `qa-automacao` precisam ajustá-los, não apagá-los (os estados não terminais continuam cobertos ali).

## Comandos executados

Nenhum.

## Critério de pronto atendido

- [x] (01) os passos de reprodução estão completos e o resultado obtido está descrito
