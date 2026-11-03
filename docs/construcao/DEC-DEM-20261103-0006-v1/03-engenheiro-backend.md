---
pedido: DEC-DEM-20261103-0006-v1
etapa: 03-correcao
agente: engenheiro-backend
leu: [contrato-passagem.md, padrao-tecnico.md, pedido.json, 01-qa-funcional.md, 02-tech-lead.md, src/modules/demandas/transicoes.ts, src/modules/demandas/transicoes.test.ts, src/lib/erros.ts, src/lib/fila.ts, src/lib/sentry.ts, src/modules/especificacoes/servico.ts, src/modules/especificacoes/servico.test.ts, src/modules/pareceres-risco/servico.ts, src/modules/pacotes-decisao/criar.ts, src/modules/pacotes-decisao/criar.test.ts, src/modules/pacotes-decisao/decidir.ts, src/modules/pacotes-decisao/schemas.ts, src/app/api/demandas/[id]/pacotes-decisao/route.ts, src/modules/agentes/entrada-agente.ts, src/modules/agentes/entrada-agente.test.ts, src/modules/agentes/executar.ts, src/modules/agentes/executar.test.ts, src/modules/agentes/gatilhos.ts, src/modules/agentes/gatilhos.test.ts, src/modules/avisos/aviso-dec.ts, src/modules/avisos/aviso-dec.test.ts, src/modules/avisos/enviador.ts, src/jobs/aviso-dec-pronto.ts, src/jobs/aviso-dec-pronto.test.ts, src/components/rotulos.ts, src/components/rotulos-qa.test.ts, test/deps.ts, test/provedor-falso.ts, test/enviador-falso.ts, test/estatico/projeto.test.ts, package.json]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Correção dos três médios (M-01, M-02 e M-03) na ordem da triagem, passo a passo, com o teste escrito antes e visto
falhando em cada passo. Todo dado de teste é fictício (`exemplo.test`, "Pessoa Ficticia", "Resumo fictício do RSK v1").

### Arquivos alterados

Código:
- `src/modules/demandas/transicoes.ts`: `STATUS_FINAIS` (de `Object.keys(FINAIS)`, congelada), `ehStatusFinal`,
  `MENSAGEM_DEMANDA_FINAL` e `recusarSeDemandaFinal` (lança `ErroDominio('conflito', MENSAGEM_DEMANDA_FINAL)`). Nenhuma
  segunda lista de estados finais.
- `src/modules/especificacoes/servico.ts`, `src/modules/pareceres-risco/servico.ts`, `src/modules/pacotes-decisao/criar.ts`:
  `recusarSeDemandaFinal(status)` logo depois de `travarDemanda`, na mesma transação, antes de `conferirLimite` e de
  qualquer insert, evento, gatilho, aviso ou job. Comentário de cabeçalho com o passo novo (trava → recusa 409 → limite).
- `src/modules/pacotes-decisao/criar.ts` (M-01): `extras` passa a aceitar `especificacaoId` e `parecerRiscoId`
  (`ExtrasDoPacote`). Com eles, sob a trava, lê essa versão por `id` **e** `demandaId` (`citada`); id inexistente ou de
  outra demanda → `ErroDominio('nao_encontrado', MENSAGEM_NAO_ENCONTRADO)`. Sem eles (pessoa, rota, Server Action),
  segue `maisNova`. A rota não passa os extras (conferido em `route.ts`): continuam fora do corpo e do schema Zod (C-11).
- `src/modules/agentes/entrada-agente.ts` (M-01): `montarEntrada` devolve `{ conteudo, demandaId, citados }`
  (`CitadosNaEntrada`, `EntradaDoAgente`). O `id` da ESP e do RSK é lido fora da lista de permissão, só para `citados`;
  `escolher` continua copiando só `CAMPOS_DA_ESPECIFICACAO` e `CAMPOS_DO_PARECER` (C-23). Orquestrador e insumo técnico
  com os dois nulos; risco só com a ESP.
- `src/modules/agentes/executar.ts`: (M-02) passo 3b, `demandaEmStatusFinal` lê só `demanda.status` antes de montar a
  entrada e encerra `ignorada` + `agente_ignorado` com motivo `demanda_final` (novo em `MotivoIgnorada`), sem chamar o
  provedor; o orquestrador (demanda nula) não passa por isso. (M-01) guarda a entrada inteira e passa `citados` de
  `tratarResposta` a `destino.gravar`; a consolidação manda `{ execucaoAgenteId, especificacaoId, parecerRiscoId }` ao
  `criarPacoteDecisao` (nulo → `nao_encontrado`, que vira `recusada_pelo_servico` sem nova tentativa).
- `src/modules/avisos/aviso-dec.ts` (M-03): no `catch` do enviador, `recusado` (4xx que não é 429) marca `falhou` na
  1.ª; `transitorio` segue como estava. A transação do envio virou `envio`; se ela lança, `contarErroInesperado` conta a
  tentativa numa transação nova com `select ... for update` (sem linha → `sem_aviso`; fora de `pendente` → o mesmo
  resultado do envio, sem somar; `pendente` → soma 1 e marca `falhou` na 3.ª). Se a própria contagem lança, sobe o
  **erro original**. O pós-processamento existente faz o resto (`aviso_email_falha` + `AvisoNaoEnviado`, ou
  `aviso_email_falhou` + log de erro + Sentry). Comentário de cabeçalho atualizado.
- `src/jobs/aviso-dec-pronto.ts`: só o comentário de cabeçalho.
- `package.json`: `version` 0.1.5.

Testes:
- `test/estatico/projeto.test.ts`: versão 0.1.5, com o comentário pedido na triagem.
- `src/modules/demandas/transicoes.test.ts`: describe "status finais (M-02)" (12 casos): lista ordenada
  `['encerrada', 'entregue']` e congelada; igual ao conjunto dos status sem transição manual; recusa `conflito` com a
  mensagem fixa nos dois finais; não lança nos sete não finais.
- `src/modules/especificacoes/servico.test.ts`: describe "demanda em status final (M-02)" (14 casos), com fila e o agente
  de risco ligado: recusa em `entregue` e `encerrada`, pela pessoa (com e sem dúvida) e pelo agente `insumo_tecnico`, sem
  ESP, sem evento, sem mudança de status, sem `execucao_agente` e sem job; recusa antes do limite (60 artefatos → 409, e
  não 429); os sete não finais gravam. O `it.each` antigo da linha 201 perdeu `encerrada` (ficou `['aprovada',
  'em_construcao']`); o caso `encerrada` com dúvida está no describe novo.
- `src/modules/pareceres-risco/servico.test.ts` (arquivo novo; não havia teste de serviço do RSK): recusa em `entregue`
  e `encerrada` pela pessoa e pelo agente `risco`, com ESP gravada antes e a consolidação ligada, sem RSK, sem evento,
  sem execução e sem job; os sete não finais gravam; controle de que o RSK em status aberto continua disparando a
  consolidação; demanda inexistente → `nao_encontrado`.
- `src/modules/pacotes-decisao/criar.test.ts`: describe M-02 (12 casos), com fila: recusa em `entregue` e `encerrada`
  pela pessoa e pelo agente `consolidacao`, sem DEC, sem evento, sem `aviso_email` e sem job `aviso.dec-pronto`; recusa
  antes do "faltam itens"; os sete não finais gravam, com aviso e job. Describe M-01 (6 casos): extras citam a versão
  pedida e o DEC sai `desatualizado`; extras iguais às mais novas → não desatualizado; `parecerRiscoId` ou
  `especificacaoId` de outra demanda → `nao_encontrado` e 0 DEC; versão inexistente → `nao_encontrado`; pessoa sem
  extras cita as mais novas. O `it.each` antigo da linha 242 perdeu `encerrada` e ganhou `devolvida`.
- `src/modules/agentes/entrada-agente.test.ts`: describe "citados (M-01)" (3 casos): consolidação traz a ESP mais nova
  lida e o RSK da chave, e o conteúdo não tem os ids; risco traz só a ESP; insumo técnico e orquestrador, os dois nulos.
- `src/modules/agentes/executar.test.ts`: describe M-02 (10 casos): na fila, para `insumo_tecnico`, `risco` e
  `consolidacao` em `encerrada` e `entregue`, `ignorada`, 0 chamada, 0 uso, evento `agente_ignorado` com
  `motivo: 'demanda_final'` e 0 artefato; durante a chamada (provedor que leva a demanda a `entregue`), `falhou` com
  `recusada_pelo_servico`, 1 chamada só, uso `erro`, 0 artefato e 0 aviso; controle com demanda em `em_construcao`.
  Describe M-01 (4 casos): a fila (RSK v2 criado depois de agendar a consolidação do v1: conteúdo com o resumo do v1 e
  sem o do v2, DEC cita RSK v1 versão 1, `desatualizado = true`, aprovação barrada com `conflito` e
  `MENSAGENS_DECISAO.desatualizado`); RSK v2 durante a chamada → DEC cita o v1; ESP v2 durante a chamada → DEC cita a
  ESP v1 e o conteúdo enviado é o montado com a v1; sem corrida → não desatualizado.
- `src/modules/avisos/aviso-dec.test.ts`: describe M-03 (9 casos): `ErroEnvioEmail('recusado')` → `falhou` na 1.ª sem
  relançar, linha `{ falhou, 1 }`, log `aviso_email_falhou` com tentativa 1, um evento no Sentry com
  `aviso_email_falhou`, e a 2.ª chamada não chama o enviador; `EnviadorResend` com `fetch` injetado em 400, 403 e 422 →
  `falhou` na 1.ª; em 429, 500 e 503 → `pendente`, tentativas 1 e `AvisoNaoEnviado`; erro inesperado com
  `urlBase = 'ftp://orquestrador.exemplo.test'` → 1, 2 e 3, `falhou` na 3.ª, Sentry uma vez só (na 3.ª), enviador nunca
  chamado, nenhum log nem evento com a URL, o remetente, o destinatário ou a mensagem do erro; controle com aviso já
  enviado.
- `src/jobs/aviso-dec-pronto.test.ts`: o handler com o mesmo `urlBase`, três execuções do mesmo job: `aviso_nao_enviado`
  duas vezes, a 3.ª resolve com `aviso_job_tratado` e `status: 'falhou'`, sem `aviso_erro_inesperado`, linha
  `{ falhou, 3 }`. O teste `:129` (pool que falha no `connect`) ficou como está e continua verde: é o "sem banco, sobe
  sem contar".

### Teste antes do código (falhas vistas)

- Passo 0: `pnpm --dir ... test test/estatico/projeto.test.ts` → 1 falhou, 10 passaram:
  `AssertionError: expected '0.1.4' to be '0.1.5'`.
- Passo 1: `transicoes.test.ts` → 12 falharam, 27 passaram (`TypeError: STATUS_FINAIS is not iterable`;
  `recusarSeDemandaFinal is not a function`).
- Passo 2 (e a parte de `criar.ts` do passo 4): ESP, RSK e DEC → 20 falharam, 114 passaram. Trechos:
  `expected { …(24) } to be an instance of ErroDominio` (a ESP foi gravada em demanda final);
  `expected ErroDominio: limite_excedido … to match` (o limite vinha antes); `promise resolved "{ …(23) }" instead of
  rejecting` (extras de outra demanda aceitos).
- Passos 3 e 4: `entrada-agente.test.ts` e `executar.test.ts` → 12 falharam, 97 passaram. Trechos:
  `expected 'falhou' to be 'ignorada'` (execução na fila chamava o caminho do serviço);
  `- "parecer_risco_id": "RSK-DEM-20261026-0053-v1" + "parecer_risco_id": "RSK-DEM-20261026-0053-v2"` (o DEC citava o
  RSK mais novo, não o lido); o mesmo para a ESP (`ESP-…-v2` no lugar de `ESP-…-v1`).
- Passo 5: `aviso-dec.test.ts` e `aviso-dec-pronto.test.ts` → 6 falharam, 62 passaram. Trechos:
  `AvisoNaoEnviado: aviso_nao_enviado` (o 4xx era tentado de novo);
  `expected RangeError: aviso: URL base inválida to match object { tentativa: 1 }` (o erro inesperado subia sem contar);
  `expected 'aviso_erro_inesperado' to be 'aviso_nao_enviado'` (handler).

### Resultado final

- `pnpm test`: 3794 de 3794 testes passaram, 0 falharam (194 arquivos), em 163 s.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.

### Desvios do plano

- `src/modules/pareceres-risco/servico.test.ts` foi **criado**: a triagem fala em "o teste dele", mas o arquivo não
  existia na base. Os casos são os pedidos na triagem para o RSK.
- Acrescentei casos além dos pedidos, todos de controle e sem afrouxar nada: recusa antes do limite (ESP) e antes do
  "faltam itens" (DEC), extras de ESP de outra demanda e de versão inexistente, controle de status aberto no executor e
  no RSK, e erro inesperado com aviso já enviado.
- Nenhum outro teste precisou mudar de cena: a suíte inteira passou sem ajuste fora dos arquivos listados na triagem.

## Decisões tomadas

- `STATUS_FINAIS` sai de `Object.keys(FINAIS)` e `ehStatusFinal` usa `hasOwnProperty` em `FINAIS`: a fonte é uma só, e o teste amarra a lista aos status sem transição manual.
- Recusa com `conflito` (409), como a triagem decidiu: com ela, o executor cai em `recusada_pelo_servico` na 1.ª vez, e o teste "durante a chamada" prova uma chamada só.
- `criarPacoteDecisao` lê o id citado com `id` **e** `demandaId` numa consulta só: id de outra demanda e id inexistente dão o mesmo 404 com a mensagem padrão, sem dizer qual dos dois.
- O tipo dos extras virou `ExtrasDoPacote`, exportado, com o comentário de que só o worker passa os dois ids: deixa visível na revisão que rota e Server Action não os aceitam.
- `citadosDaConsolidacao` lança `nao_encontrado` quando falta um dos ids: pela chave `rsk:` isso não acontece, mas o tipo obriga, e o código cai em `recusada_pelo_servico` sem nova chamada.
- Em `contarErroInesperado`, o `catch` sem variável relança o erro original: a triagem pede "sem banco, sobe sem contar", e o handler continua mandando ao Sentry como `aviso_erro_inesperado`.
- Um erro depois de o enviador aceitar (o `update` para `enviado` falhar) também conta como tentativa e pede nova execução; o cabeçalho `Idempotency-Key` (`dec-<DEC-id>`), que já existia, faz o Resend devolver o mesmo envio, sem e-mail duplicado.
- A tabela `MOTIVO_IGNORADO` de `src/components/rotulos.ts` **não** foi mudada: sem o rótulo, o histórico mostra "Agente de risco não rodou" (caminho de reserva já testado em `rotulos-qa.test.ts`), sem quebrar a tela. Acrescentar o texto é decisão de interface, e a triagem proíbe inventar texto; ficou em Pendências.
- Os comandos foram rodados com `pnpm --dir <repo>` porque o Bash do agente volta para a pasta da estruturaAutonoma a cada chamada; `--dir` só no repositório do pedido.
- O primeiro comando da etapa saiu por engano como `cd <repo> && pnpm test test/estatico/projeto.test.ts` (só leitura: rodou o teste da versão). Por ter `&&`, não está em "Comandos executados"; repeti logo em seguida na forma permitida, com o mesmo resultado (1 falhou, 10 passaram), e é essa repetição que está registrada.

## Pendências

- Para `ux-ui-design` ou `tech-lead`, à parte: o motivo `demanda_final` de `agente_ignorado` não tem rótulo em `MOTIVO_IGNORADO` (`src/components/rotulos.ts:163`). Hoje o histórico mostra "Agente X não rodou", sem o motivo. Sugestão a validar, sem uso neste pedido: "demanda em status final", que repete o termo de `MENSAGEM_DEMANDA_FINAL`.
- Para a `06-documentacao`: a tabela de motivos de `agente_ignorado` do manual técnico, se houver, ganha `demanda_final`; a regra de nova tentativa do aviso muda (4xx definitivo falha na hora; erro inesperado conta tentativa).
- Seguem válidas as pendências da triagem fora deste pedido: `registrarDecisao` e `gerarPedido` não conferem o status da demanda (novo médio à parte); o `e2e/decisao.spec.ts` rodado de novo no mesmo banco passa a receber 409 depois do "Arquivar" (esperado, para a `04-regressao`).

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo construcao/DEC-DEM-20261103-0006-v1, limpo, antes de começar
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/projeto.test.ts` — 1 falhou, 10 passaram (antes do `version` 0.1.5)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/demandas/transicoes.test.ts test/estatico/projeto.test.ts` — 12 falharam, 27 passaram (antes do código de `transicoes.ts`)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/demandas/transicoes.test.ts src/modules/especificacoes/servico.test.ts src/modules/pareceres-risco/servico.test.ts src/modules/pacotes-decisao/criar.test.ts` — 20 falharam, 114 passaram (antes da recusa e dos extras)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format= -- src/modules/pareceres-risco src/modules/agentes src/modules/demandas test` — lista dos arquivos de teste dos módulos
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/agentes/entrada-agente.test.ts src/modules/agentes/executar.test.ts` — 12 falharam, 97 passaram (antes de `citados` e do passo 3b)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/agentes src/modules/demandas/transicoes.test.ts src/modules/especificacoes src/modules/pareceres-risco src/modules/pacotes-decisao test/estatico/projeto.test.ts` — 692 de 692
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/avisos src/jobs/aviso-dec-pronto.test.ts` — 6 falharam, 62 passaram (antes do M-03)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/avisos src/jobs/aviso-dec-pronto.test.ts` — 68 de 68 (depois do M-03)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S sem_preco --name-only --format=` — onde ficam os rótulos de `agente_ignorado`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S "provedor de IA não configurado" --name-only --format=` — o teste dos rótulos
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 3794 de 3794 (194 arquivos), 0 falha
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — só os arquivos da triagem, mais o teste novo do RSK
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff src/modules/avisos/aviso-dec.ts src/modules/agentes/executar.ts` — revisão do próprio diff

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno
