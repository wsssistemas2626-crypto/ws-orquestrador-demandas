# 07. Worker, aviso por e-mail e expurgo

| Campo | Valor |
|---|---|
| Atualizado em | 03/11/2026 (0.1.6: 408 e 409 do Resend tentados de novo, no RF-25) |
| Dono | `documentacao-tecnica` (sistema: Fabiano) |
| Cobre | RF-24, RF-25; RNF-05, RNF-08 |
| Fontes no código | `src/worker/index.ts`, `src/worker/iniciar.ts`, `src/jobs/`, `src/modules/avisos/` (`aviso-dec.ts`, `enviador.ts`), `src/modules/retencao/expurgar.ts`, `src/modules/agentes/situacao-worker.ts`, `src/lib/env-worker.ts` |

## O processo worker

`pnpm worker` confere a configuração (`lerConfigWorker`: a do app mais `ANTHROPIC_API_KEY`, `RESEND_API_KEY`,
`EMAIL_REMETENTE` e `EMAIL_AVISO_DECISAO`), liga o Sentry se houver `SENTRY_DSN`, abre o pg-boss com o papel da
aplicação e `migrate: false`, e registra:

| Fila | Agenda | Concorrência | O que faz |
|---|---|---|---|
| `agente.executar` | ao gravar artefato | 1 | execução de agente ([cap. 06](06-agentes-de-ia.md)) |
| `worker.batimento` | a cada minuto | 1 | batimento e varredura de execuções órfãs |
| `aviso.dec-pronto` | ao gravar DEC | 1 | e-mail de DEC pronto |
| `retencao.expurgo` | todo dia às 03:00 de São Paulo | 1 | expurgo |

Configuração inválida: o worker não sobe e loga `worker_configuracao_invalida` com os nomes das variáveis. Outra falha
na subida: `worker_falha_ao_subir`. Sem a chave da Anthropic, as execuções ficam `ignorada`. Sem os três do e-mail, o
boot loga `aviso_email_sem_provedor` e os avisos ficam `sem_provedor`. No `SIGTERM`, para de pegar jobs, fecha a fila
e o pool e sai.

## Batimento

Cada instância grava o próprio batimento em `worker_batimento` ao subir e a cada minuto. A tela
`/configuracao/agentes` mostra:

- alerta quando o último batimento tem mais de 5 minutos;
- alerta "Há duas instâncias do worker rodando. Deixe só uma: com duas, o teto pode ser ultrapassado." quando duas
  instâncias bateram nos últimos 2 minutos (RNF-05);
- a hora e a quantidade do último expurgo.

## RF-25. Aviso por e-mail

- Ao gravar um DEC, na mesma transação, nasce uma linha em `aviso_email` (`pendente`, uma por DEC) e o job
  `aviso.dec-pronto` com payload só `{ decId }`.
- O worker trava a linha durante o envio: dois jobs do mesmo DEC mandam um e-mail só. O cabeçalho `Idempotency-Key`
  (`dec-<decId>`) do Resend é a segunda barreira.
- O e-mail leva só o id do DEC, o id da demanda e o link `<BETTER_AUTH_URL>/pacotes-decisao/<decId>`. Não traz o
  conteúdo da demanda. O destinatário vem só de `EMAIL_AVISO_DECISAO`, o remetente de `EMAIL_REMETENTE`; nada vem de
  cabeçalho de requisição.
- Status: `enviado` (com o id do provedor e a data), `sem_provedor` (falta chave, remetente ou destinatário; não chama
  ninguém), `pendente` ou `falhou`. `enviado`, `sem_provedor` e `falhou` não tentam de novo.
- Tentativas: 3 no total (1 + as 2 novas tentativas da fila, `retryLimit: 2`; `TENTATIVAS_AVISO` em `aviso-dec.ts`).
  Cada falha soma 1 em `aviso_email.tentativas`. O que acontece depende do tipo de falha (`enviador.ts` classifica, e
  `enviarAviso` decide; regra da 0.1.5, M-03, com o 408 e o 409 desde a 0.1.6):

  | Falha | Classificação | O que acontece |
  |---|---|---|
  | Resend responde 4xx que não é 408, 409 nem 429 (por exemplo 400, 401, 403, 410, 413, 422) | `recusado` | `falhou` na hora, na 1ª tentativa; log de erro `aviso_email_falhou` e Sentry; o job termina sem erro |
  | Resend responde 408, 409, 429 ou 5xx (`TRANSITORIOS_4XX` em `enviador.ts`); erro de rede; tempo limite; resposta fora do formato | `transitorio` | conta a tentativa e fica `pendente`; log `aviso_email_falha` e a fila tenta de novo; na 3ª, `falhou`, `aviso_email_falhou` e Sentry |
  | Erro fora do enviador (montar o e-mail, banco no meio do envio) | erro inesperado | desfaz a transação do envio; a tentativa é contada numa transação nova, com a trava da linha, e segue a regra do `transitorio` |
  | Banco fora (nem a contagem grava) | erro inesperado | sobe sem contar; o handler (`src/jobs/aviso-dec-pronto.ts`) loga `aviso_erro_inesperado`, manda ao Sentry e relança para a fila |

  Com a trava, jobs concorrentes do mesmo DEC com erro inesperado não somam a mesma tentativa duas vezes: o aviso
  termina com exatamente 3. Se o aviso já saiu de `pendente` quando o erro é contado, nada é somado.
- O 409 cobre a requisição concorrente com a mesma `Idempotency-Key`, que é passageira. O Resend usa o mesmo 409 para a
  mesma chave com corpo diferente, que não passa: esse caso também gasta as 3 tentativas e termina `falhou`. É limitado,
  e foi aceito na triagem da 0.1.6.
- Limite conhecido (B-2 da 0.1.5): um erro depois de o Resend aceitar o e-mail (falha ao gravar `enviado` ou no commit)
  também conta tentativa. O `Idempotency-Key` impede o reenvio, mas, depois de três erros assim, o aviso fica `falhou`
  com o e-mail entregue.
- Resend com tempo limite de 10 s. Nos testes e no CI não há envio real (RNF-14).
- Remetente: o domínio de `EMAIL_REMETENTE` precisa de SPF e DKIM no Resend ([deploy.md, seção 3](../operacao/deploy.md)).

## RF-24. Expurgo do texto bruto

Job diário `retencao.expurgo` (`expurgar.ts`), numa transação, com trava consultiva (uma execução por vez):

- texto bruto e origem recebidos há mais de `RETENCAO_TEXTO_BRUTO_DIAS` (padrão 90): ficam nulos, com a data do
  expurgo; um evento `texto_expurgado` por demanda, ator `sistema`, sem o conteúdo;
- entrada pendente recebida antes do mesmo prazo: apagada, com evento `entrada_pendente_expurgada`;
- sessão vencida há mais de 30 dias e verificação vencida: apagadas;
- `rotina_execucao` guarda a hora e a soma, que o painel mostra.

O prazo é conferido no boot do app e do worker: inteiro de 1 a 365; fora disso, o processo não sobe. A segunda
execução não repete evento. Os campos estruturados da demanda ficam. O detalhe da demanda mostra a data em que o texto
será apagado.

O backup do banco também guarda o texto bruto. Com backup de no máximo 30 dias, o prazo efetivo do texto bruto é de
90 + 30 dias ([deploy.md, seção 3](../operacao/deploy.md)).
