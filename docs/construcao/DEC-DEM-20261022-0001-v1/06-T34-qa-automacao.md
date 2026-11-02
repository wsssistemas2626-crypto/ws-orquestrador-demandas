---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T34-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md (seções 1 a 7), contrato-passagem.md, tarefas.json, 2026-10-25-ws-orquestrador-demandas-plano.md (início, G1 e G2, T29 a T35 início), 01-analista-requisitos.md (RF-20 a RF-26, seção 3 RNF, seção 5 rastreabilidade), 04-seguranca-aplicacao.md (2.12 a 2.17 e C-20 a C-23), 05-tech-lead.md (início), 06-T34-engenheiro-backend.md, git show b26796f, test/transversal/sentinelas.test.ts, test/sentinelas.ts, test/provedor-falso.ts, test/sessao.ts, src/lib/erros.ts, src/modules/agentes/provedor.ts (início), saída do pnpm test gravada pela ferramenta nesta etapa (tool-results/bslf1apb1.txt, só o fim)]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Verificação da T34, o teste transversal de sentinelas do commit `b26796f`. O teste do engenheiro cobre o que o plano
pede e passou em todas as corridas. A leitura crítica achou quatro pontos da RNF-10 e da C-22 que ele exercitava sem
conferir. Acrescentei essas asserções no mesmo `it`, sem afrouxar nenhuma das que já existiam. Nenhum vazamento foi
achado no código: nada de `src/` mudou, e a tarefa não volta à construção.

### Critério → teste

Todos os critérios estão em `test/transversal/sentinelas.test.ts`, teste
`fluxo completo e caminhos de erro sem nenhum sentinela no pino, no Sentry falso, no pgboss nem em execucao_agente`.

| Critério | O que confere | Quem escreveu |
|---|---|---|
| RNF-10: sem texto bruto, e-mail, telefone, token nem senha no pino e no Sentry | `contemSentinela` no pino, no console e nos envelopes do Sentry, depois do fluxo completo | engenheiro |
| RNF-10: sem cookie | os valores dos cookies de sessão das duas contas `cto` não aparecem em nenhuma saída: como vieram, decodificados e só o token de sessão. O token de serviço real do `insumo_tecnico` também não | **qa (novo)** |
| RNF-10: sem conteúdo de prompt e de resposta de IA | a resposta: `SENTINELAS.texto` em `descricaoProblema`, conferido pelo engenheiro. O prompt: confere que o texto sentinela chegou mesmo ao provedor, e que os 60 primeiros caracteres do prompt de sistema de cada uma das 5 chamadas não aparecem em nenhuma saída | engenheiro + **qa (novo)** |
| RNF-10 e C-20: erro ao usuário sem pilha, SQL nem nome interno | os corpos das 7 respostas de erro (422, 400 de validação, 400 de JSON inválido, 409, 500 do CHECK, 401 do token, 401 do login) não têm sentinela, pilha (`at `, `.ts:<linha>`, `node_modules`), SQL nem nome interno (`insert into`, `t34_sem_sentinela`, `23514`, `violates`, `postgres`, `drizzle`, `ErroDominio`, `ZodError`, `pgboss`). O 500 é exatamente `{ erro: 'erro_interno', mensagem: MENSAGEM_ERRO_INTERNO }` | **qa (novo)** |
| C-21 ampliado: fluxo completo e caminhos de erro (400, 409, restrição, fora do schema, Resend falhando), zero sentinela no pino e no Sentry falso | os passos 1 a 3 do teste e as asserções finais de sentinela, com as asserções de exercício (eventos, 5 chamadas ao provedor, `23514` e `ErroEnvioEmail` no Sentry) | engenheiro |
| C-21: login que falhou sem o e-mail | evento `login_falhou` presente, e o e-mail sentinela ausente do pino | engenheiro |
| C-22: nenhum sentinela no esquema `pgboss` nem em `execucao_agente` | `select *` de toda tabela do esquema `pgboss`, pelo catálogo, e de `execucao_agente`, com `contemSentinela` | engenheiro |
| C-22: payload de job só com ids | cada job de `agente.executar` tem só a chave `execucaoId` (pelo menos 4 jobs), e cada um dos 3 jobs de `aviso.dec-pronto` tem só `decId` | **qa (novo)** |
| Critério preliminar 13: nenhum log com texto bruto, e-mail, token ou senha | o mesmo que a RNF-10 | engenheiro |

### Testes acrescentados

São 63 linhas a mais no mesmo arquivo e no mesmo `it`, porque um `it` separado dependeria da ordem e do estado deixado pelo
primeiro:

- o ajudante `guardarErro(rotulo, resposta)`, que guarda o corpo de cada resposta de erro (por `clone()`, sem consumir a
  resposta);
- as asserções de cookie e de token de serviço reais;
- as de prompt de sistema;
- as de forma do payload de job (C-22);
- as de corpo de erro;
- a igualdade exata do corpo do 500 (C-20).

As asserções que já existiam ficaram intactas. Só a linha do 422 passou a guardar o corpo, com o mesmo
`expect(...).toBe(422)`.

### Prova de que a asserção nova pega o vazamento

Escrevi uma sonda temporária que punha o token da sessão da conta autora no console capturado. Com ela, o teste
falhou na asserção nova:

```
AssertionError: segredo real de 32 caracteres numa saída: expected true to be false
 ❯ test/transversal/sentinelas.test.ts:427:123
 Tests  1 failed (1)
```

A sonda foi removida, e o `git diff` final não tem a sonda.

### Estabilidade

O arquivo passou nas 4 corridas sem a sonda: três isoladas e uma dentro da suíte, em 17 a 20 s. O relógio dos dados é
o `relogioFixo`. O único tempo real é o `expect.poll` (30 s, a cada 250 ms) que espera o `boss.work` do pg-boss pôr os
3 avisos em `retry`. Ele é uma espera com teto, não uma conta com o relógio. As asserções novas não dependem de ordem
nem de relógio: a lista de rótulos é a sequência fixa do próprio `it`.

### Resultado

- `pnpm test`: **140 arquivos, 2756 de 2756**, nenhum falhou. O total não mudou, porque as asserções entraram no `it`
  que já existia. O aviso do undici "Using `patch`" continua igual.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.
- `git diff --stat`: só `test/transversal/sentinelas.test.ts`, com 63 linhas a mais e 1 a menos (a linha do 422).

## Decisões tomadas

- **Endurecer o mesmo `it`, sem criar outro.** Um `it` novo teria de refazer o fluxo inteiro, uns 15 s, ou ler o estado
  do primeiro, o que é dependência de ordem.
- **Conferir o cookie e o token de serviço reais, além dos sentinelas.** A RNF-10 cita o cookie, e nenhum sentinela é
  um cookie: sem essa asserção, o cookie ficava sem teste.
- **Conferir só um trecho de 60 caracteres do prompt de sistema.** Basta para pegar um prompt jogado no log, e a
  asserção não depende do texto inteiro, que muda quando o prompt é ajustado.
- **Conferir os corpos de erro.** A RNF-10 inclui "erro ao usuário sem pilha, SQL ou nome interno", e o teste do
  engenheiro só olhava o status. O 500 do CHECK é o caso de mais risco, por isso ganhou a igualdade exata.
- **Na C-22, conferir a forma exata do payload, além da ausência de sentinela.** Um campo de texto novo no payload
  passaria se não levasse sentinela; a forma exata pega qualquer campo que não seja id.

## Pendências

- Seguem abertas para a revisão, sem mudança nesta etapa: a observação Minor do engenheiro sobre objeto simples em
  `erro`, no `normalizarErro` de `src/lib/log.ts`; o parecer 1 da `06-T32-revisao`, sobre `test/auth.ts`; e o aviso do
  undici. Nenhuma das três é falha de teste.
- Para ver o total de testes, li o fim do arquivo em que a ferramenta gravou a saída do meu `pnpm test` desta etapa
  (`tool-results/bslf1apb1.txt`). É o mesmo procedimento das entregas anteriores.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat b26796f456b04e0911ca40f5e6c4713246f29134` — 3 arquivos, só `test/transversal/sentinelas.test.ts` de código
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:docs/construcao/DEC-DEM-20261022-0001-v1/04-seguranca-aplicacao.md --stat` — a saída foi grande e não foi lida; li o arquivo pelo Read
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/transversal/sentinelas.test.ts` — antes das mudanças: 1 de 1
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/transversal/sentinelas.test.ts` — com as asserções novas: 1 de 1
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/transversal/sentinelas.test.ts` — com a sonda temporária: 0 de 1, falha na asserção de segredo real
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 140 arquivos, 2756 de 2756
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — só `test/transversal/sentinelas.test.ts`, com 63 linhas a mais e 1 a menos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff` — sem `.skip`, `.only` nem `.todo`, sem asserção afrouxada e sem a sonda
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/transversal/sentinelas.test.ts` — corrida de estabilidade: 1 de 1

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste (RNF-10, C-21 ampliado, C-22 e critério preliminar 13, na tabela da Entrega)
- [x] a suíte inteira passa (2756 de 2756)
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real (asserções no mesmo `it`, sobre o `relogioFixo`)
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real. Só os sentinelas fictícios de `test/sentinelas.ts` e os cookies e tokens gerados na hora pelo próprio teste, que nunca são escritos em arquivo
