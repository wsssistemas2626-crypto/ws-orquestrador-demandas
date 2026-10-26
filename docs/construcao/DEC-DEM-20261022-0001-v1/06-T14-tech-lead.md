---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T14-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12 e seções 5 a 7), tarefas.json, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6 e mapa das fases e T14 e início da T15), 06-T14-engenheiro-backend.md, commit 5704fe2, src/modules/demandas/gerar-id.ts, src/modules/demandas/gerar-id.test.ts, src/modules/versoes.ts, src/modules/versoes.test.ts, src/lib/rota.ts, src/lib/erros.ts, src/lib/reduzir-erro.ts, src/db/schema/demandas.ts, test/banco.ts]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T14 (gerador de id, número de versão e trava da demanda), commit `5704fe2`. Nenhum problema Critical ou
Important. A tarefa segue para `06-T14-testes`. Os três pareceres abaixo são Minor e ficam registrados em Pendências.

### O que foi conferido

- **Escopo.** O commit cria só os quatro arquivos que o plano lista: `gerar-id.ts`, `gerar-id.test.ts`, `versoes.ts` e
  `versoes.test.ts`. Os outros dois arquivos do commit são a entrega e o registro do maestro. Nenhum arquivo existente
  mudou.
- **Interfaces.** Todas as que o plano define para a T14 existem com a assinatura pedida: `RE_ID_DEMANDA`,
  `RE_ID_VERSAO`, `proximoIdDemanda`, `totalDeDemandas`, `LIMITE_AVISO_CAPACIDADE = 9000`, `travarDemanda`,
  `proximaVersao` e `idVersao`.
- **RF-04 e CA-04.1 a CA-04.4.**
  - A data vem de `aaaammddSaoPaulo(relogio.agora())`, e a virada do dia em São Paulo tem teste.
  - A sequência é global e não reinicia no dia seguinte.
  - O número tem 4 dígitos, com zeros à esquerda.
  - Só o `2200H`, lido por `reduzirErro` (que também lê o `cause` do Drizzle), vira `capacidade_de_ids_esgotada` (409),
    com a mensagem do plano.
  - O teste prova que, nesse caso, nada fica gravado.
  - O corpo do 409 não traz `nextval`, `demanda_seq` nem `maximum`.
- **CA-04.3.**
  - A trava é `FOR UPDATE` na linha da demanda e funciona com o papel do app.
  - A concorrência tem quatro testes:
    - ordem forçada, com a espera vista em `pg_stat_activity`;
    - 2 transações em paralelo;
    - 5 transações em paralelo;
    - a restrição única `(demanda_id, versao)` como segunda barreira, com `23505`.
  - Nenhum desses testes depende do relógio para dar certo. O `setTimeout` de 5 ms em `esperarBloqueio` só espaça as
    consultas e tem limite de tentativas.
  - `esperarBloqueio` filtra por `current_database()`, e o banco é próprio do arquivo (`test/banco.ts`). Por isso ele
    não pega trava de outro arquivo de teste rodando em paralelo.
- **C-36.** O `nextval` roda dentro da transação que recebe, e o comentário de `gerar-id.ts` registra o contrato:
  validar antes, chamar dentro da transação que grava. Quem garante a ordem é a T15, e isso está em Pendências.
- **Checklist da seção 12:**
  - Não há segredo nem dado pessoal: os nomes são "Pessoa Ficticia" e os ids são fictícios.
  - O SQL usa só o template `sql` e o query builder, sem `sql.raw`.
  - Não há `console.*` nem `new Date()` sem argumento.
  - A tarefa não tem entrada externa: não cria rota, Server Action nem job.
  - Não há migration nova.
  - Não há tela.
- **TDD.** A entrega mostra a falha antes do código (`Cannot find module` nos dois arquivos). Cada comportamento novo
  tem um teste que falharia sem o código.
- **Desvios declarados.** Os desvios 2 a 5 são aceitos:
  - `import type` de `PrefixoVersao`;
  - `max()` do Drizzle com `?? 0`, que dá o mesmo resultado que `coalesce`;
  - a troca do `!` por um erro explícito;
  - os testes extras.
  O desvio 1 é o parecer 1.
- **Rodado nesta revisão:** `pnpm test` (74 de 74 arquivos, 1183 de 1183 testes), `pnpm lint` e `pnpm typecheck`
  limpos.

### Pareceres

1. **`src/modules/demandas/gerar-id.ts:14` — Minor.**
   - **Problema:** `RE_ID_DEMANDA` repete a regex de `src/lib/rota.ts:22`.
   - **Razão:** o checklist pede que nada duplique o que já existe. A repetição vem do próprio plano, que manda a T14
     exportar a constante quando a T11 já a tinha. A saída do engenheiro tem dois méritos:
     - não faz o domínio (e o worker) depender do adaptador HTTP;
     - tem um teste que falha se as duas regex se afastarem (`source` e `flags`, mais a equivalência de
       `RE_ID_VERSAO` com as três regex de `rota()`).

     O risco está contido. O certo é o adaptador depender do domínio: `rota.ts` importar `RE_ID_DEMANDA` de
     `gerar-id.ts` e apagar a sua cópia. Isso não cabe na T14, porque `rota.ts` está fora dos arquivos da tarefa. Fica
     registrado como dívida em Pendências.
2. **`src/modules/demandas/gerar-id.test.ts:92` — Minor.**
   - **Problema:** o teste "erro do banco que não é o de capacidade não vira capacidade_de_ids_esgotada" não chama
     `proximoIdDemanda`. O `select 1/0` lança antes, e o teste só exercita `comTransacao` e `mapearErro`.
   - **Razão:** o teste não falharia se o `catch` de `proximoIdDemanda` convertesse qualquer erro em capacidade. Quem
     cobre esse caminho de verdade é o teste seguinte (linha 103), com a transação abortada e o `25P02` passando pelo
     `catch`. Não há buraco de cobertura, só um teste redundante. Ele pode ser apagado, ou trocado por um que faça o
     `nextval` falhar por outro motivo, na próxima vez que o arquivo for tocado.
3. **`src/modules/versoes.ts:25` — Minor.**
   - **Problema:** depois da versão 9999 de uma demanda, `proximaVersao` devolve 10000. O `CHECK versao between 1 and
     9999` recusa a gravação com `23514`, que vira 500 genérico.
   - **Razão:** o caso é quase impossível de alcançar (9.999 versões de um artefato numa só demanda), e o 500 não vaza
     detalhe nem grava nada. Não bloqueia. Se a T18 quiser uma mensagem clara, ela converte o `23514` desse `CHECK`
     num `ErroDominio('conflito', ...)` no serviço que grava a versão, sem mudar a T14.

## Decisões tomadas

- **Status `pronto`, sem devolução:** os três pareceres são Minor, e pela seção 12 só Critical e Important bloqueiam a
  passagem.
- **Desvio 1 aceito, como dívida:** o domínio não deve importar o adaptador HTTP, e o teste de igualdade das regex
  segura a repetição até `rota.ts` passar a importar do domínio.
- **O limite de 10.000 versões não entra na T14:** o caso é quase impossível de alcançar, e cuidar dele é do serviço
  que grava a versão (T18 a T20).
- **`proximo: qa-automacao`:** a etapa seguinte da tarefa é `06-T14-testes`.

## Pendências

- **Dívida técnica, sem prazo de pagamento:** a primeira tarefa que puder editar `src/lib/rota.ts` faz a troca, apaga a
  cópia de `rota.ts:22` e mantém o teste de igualdade (`gerar-id.test.ts:126`) até a cópia sumir.
  - **Troca:** `rota.ts` passa a importar `RE_ID_DEMANDA` de `src/modules/demandas/gerar-id.ts`, ou de um módulo de ids
    sem dependência de banco.
  - **Impacto:** baixo, porque o teste de igualdade quebra se as regex se afastarem.
  - **Custo:** menos de uma hora.
- **T15 (C-36):** chamar `proximoIdDemanda` só depois do Zod e de `conferirLimite`, dentro da transação que insere a
  demanda. O buraco na sequência quando a transação é desfeita é esperado.
- **T18 a T20 (opcional):** converter o `23514` do `CHECK` de `versao` num `ErroDominio` com mensagem pt-BR, se
  quiserem resposta clara para a versão 10.000.
- **Teste redundante:** apagar ou reescrever `gerar-id.test.ts:92` (parecer 2) na próxima vez que o arquivo for tocado.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 5704fe2ea44792d1c19436cd3d3a9508efd96af1` — 6 arquivos: os 4 da tarefa, a entrega e `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 5704fe2ea44792d1c19436cd3d3a9508efd96af1 -- src` — diff dos 4 arquivos de código e teste
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 74 de 74 arquivos, 1183 de 1183 testes
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
