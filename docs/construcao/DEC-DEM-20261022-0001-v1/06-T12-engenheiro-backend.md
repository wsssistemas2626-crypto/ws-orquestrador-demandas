---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T12-construcao
agente: engenheiro-backend
leu: [contrato-passagem.md, pedido.json, padrao-tecnico.md, tarefas.json, 05-tech-lead.md, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6 e T11 a T14 e T32 e T33), src/db/schema/historico.ts, src/db/schema/historico.test.ts, src/db/schema/acesso.ts, src/db/schema/agentes.ts, src/db/schema/index.ts, src/db/schema/comum.ts, src/db/index.ts, src/db/transacao.ts, src/db/privilegios.ts, src/modules/acesso/auth.ts, src/modules/acesso/ator.ts, src/modules/acesso/exigir-pessoa.ts, src/modules/acesso/resolver-ator.ts, src/modules/acesso/tokens-servico.ts, src/modules/acesso/verificacao.test.ts, test/banco.ts, test/deps.ts, test/auth.ts, test/sessao.ts, test/sentinelas.ts, vitest.config.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T12, histórico de eventos sem dado de terceiro. Cobre RF-21 (registro e leitura), C-30, parte de CA-21.3 e CA-02.4
(agente gravado com o prefixo do token).

### Arquivos

- Criado `src/modules/historico/registrar.ts`. Tem:
  - os tipos `AcaoEvento` e `NovoEvento`;
  - `CAMPOS_TEXTO_LIVRE`;
  - `mudancaDeCampo`, que usa uma lista de **permissão**: só `tipo`, `status`, `solicitantePapel`,
    `linhaServicoProvavel` e `urgencia` guardam o valor; qualquer outro campo vira `{ alterado: true }`;
  - `registrarEvento(tx, ev, relogio)`, que grava `ator_tipo`, `ator_id` e `ator_token_prefixo`. O `ator_id` é o
    `usuarioId` para pessoa, o nome do agente para agente e `sistema` para o sistema. A data vem do `Relogio`.
- Criado `src/modules/historico/consultas.ts`. Tem `EventoVisivel`, `AtorVisivel` e `listarHistorico(db, demandaId)`:
  - ordem do mais novo para o mais antigo (`ocorrido_em desc, id desc`);
  - `left join` com `user` só quando o ator é pessoa, para trazer o nome e o papel da conta;
  - o agente sai sem o prefixo do token, e a pessoa sai sem o id interno.
- Criado `src/modules/historico/registrar.test.ts`: 18 testes unitários. Cobrem C-30 para os 7 campos de texto livre,
  com sentinelas, CA-06.4, os 5 campos da lista de permissão, o valor nulo, o campo desconhecido, a diferença de caixa
  e de espaço no nome do campo, e o valor que não é texto num campo da lista.
- Criado `src/modules/historico/consultas.test.ts`: 14 testes de integração com Postgres real, pelo papel do app.
  Cobrem:
  - as colunas gravadas para pessoa, para agente com e sem token e para sistema;
  - `antes` e `depois` gravados em jsonb;
  - a transação desfeita, que leva o evento junto;
  - a ordem da leitura, com desempate pelo id;
  - o nome e o papel vindos da conta;
  - o prefixo que fica na coluna e não sai na leitura (C-09);
  - só os eventos da demanda pedida;
  - a conta que não existe mais;
  - a demanda sem eventos.
- Modificado `src/modules/acesso/auth.ts`. Os eventos `2fa_ativado` e `2fa_desativado` agora passam por
  `registrarEvento`, e o `insert` direto em `evento` saiu. O ator é a pessoa da sessão (`pessoaDaSessao`).
  `AlvoDaVerificacao` ganhou o campo `pessoa`, preenchido só quando há sessão, que é o caso da ativação. O que fica
  gravado não muda, e os testes de C-08 em `verificacao.test.ts` continuam verdes sem edição.

### TDD: teste antes, visto falhando

Os dois arquivos de teste foram escritos antes do código. `pnpm test` falhou porque os módulos ainda não existiam:

```
 FAIL  src/modules/historico/consultas.test.ts [ src/modules/historico/consultas.test.ts ]
Error: Cannot find module './consultas' imported from .../src/modules/historico/consultas.test.ts
 FAIL  src/modules/historico/registrar.test.ts [ src/modules/historico/registrar.test.ts ]
Error: Cannot find module './registrar' imported from .../src/modules/historico/registrar.test.ts
 Test Files  2 failed | 61 passed (63)
      Tests  1011 passed (1011)
```

Depois da implementação: `Test Files 63 passed (63)`, `Tests 1043 passed (1043)`. São 32 testes novos e nenhum falhou.

### Desvios do plano

1. **`EventoVisivel.ator` de pessoa tem `nome: string | null` e `papel: Papel | null`.** O plano tem `string` e
   `Papel`. Razão: `evento.ator_id` não tem FK. Se a conta não existir, o `left join` não acha nome nem papel, e há duas
   saídas sem o nulo: tirar o evento do histórico (fere RF-21) ou inventar um nome e um papel. O nulo só aparece nesse
   caso. Pelo plano, a desativação de conta da T32 mantém a linha de `user` e o app não apaga conta, então pelos
   caminhos do próprio app o valor não fica nulo. Para dar nome ao tipo, foi criado `AtorVisivel`.
2. **Valor que não é texto, num campo da lista de permissão, vira `{ alterado: true }`.** Enumeração é texto ou nulo.
   Um objeto ou uma lista ali indica erro de quem chamou, e assim não vai para o histórico. O plano não fala desse caso.
3. **Teste a mais em `consultas.test.ts`:** a transação desfeita leva o evento junto. Prova a forma de G3.8: o evento
   entra na transação de quem chama.

## Decisões tomadas

- `CAMPOS_TEXTO_LIVRE` é exportado como pede o plano, mas é só informativo. Quem decide o que é gravado é a lista de
  permissão `CAMPOS_COM_VALOR`, para nenhum campo novo vazar por omissão, como pede o passo 3 da T12 no plano.
- O nome e o papel da pessoa vêm sempre da conta (`user`), nunca do `nome` que o ator trazia. Assim o histórico mostra
  a conta de fato, e não o que o chamador informou.
- Desempate por `id desc` quando dois eventos têm o mesmo `ocorrido_em`. Com relógio fixo nos testes, isso acontece, e
  sem o desempate a ordem não seria determinística (RNF-15).
- No `auth.ts`, a pessoa sem papel válido não gera ator, e o evento não é gravado. Isso não acontece: `user.papel` é
  `NOT NULL` com `CHECK` no banco. A alternativa era lançar erro dentro do gancho do Better Auth, que o comentário do
  próprio arquivo evita (C-21).
- `listarHistorico` não confere o formato do id da demanda. Conferir o id é papel de `rota()` (G3.10, T11). A consulta
  é parametrizada pelo query builder.

## Pendências

- **T16 e T40:** `ator.nome` e `ator.papel` podem ser nulos quando a conta não existe mais (desvio 1). A rota de
  histórico e a tela do detalhe precisam tratar esse caso. O texto da tela vem da 03; se a 03 não tiver texto para ele,
  quem decide é o `ux-ui-design` ou o tech-lead.
- **Revisão (`06-T12-revisao`):** julgar o desvio 1. Se o tech-lead preferir o tipo exato do plano, a saída é tirar o
  evento ou usar um valor fixo, e o teste "conta que não existe" muda junto.
- **T32:** confirmar que `desativarConta` mantém a linha de `user`, como diz o plano. É o que faz o histórico mostrar o
  nome de quem já saiu.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format=%h%x20%s` — lista dos arquivos por commit, para achar os módulos da T04 a T11
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — antes do código: 2 arquivos falharam (`Cannot find module './consultas'` e `'./registrar'`), 1011 de 1011 testes dos outros arquivos passaram
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — depois do código: 63 de 63 arquivos, 1043 de 1043 testes, 0 falhas
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — `src/modules/acesso/auth.ts` modificado e `src/modules/historico/` novo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — `src/modules/acesso/auth.ts`, +31 −19

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno (a T12 não cria rota, Server Action nem job)
