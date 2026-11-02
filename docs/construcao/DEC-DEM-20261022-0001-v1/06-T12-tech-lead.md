---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T12-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12 e o resto do arquivo), 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6 e T12 a T14), tarefas.json, 06-T12-engenheiro-backend.md, 04-seguranca-aplicacao.md (seção 3 e seção 4), commit e98dfcf5d332602f103d1ba024ff82155ae6b7f8, src/modules/acesso/auth.ts, src/modules/acesso/ator.ts, src/modules/acesso/resolver-ator.ts, src/modules/acesso/tokens-servico.ts, src/db/schema/historico.ts, src/db/schema/agentes.ts]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T12 (histórico de eventos sem dado de terceiro), commit `e98dfcf`. Não há problema Critical nem Important.
A tarefa passa. Os quatro pontos abaixo são Minor e vão para Pendências, pela regra da seção 12.

### Checklist da seção 12 do padrão técnico

- [x] **Faz o que o plano pede, nem mais nem menos.** Os quatro arquivos criados e o `auth.ts` modificado são
  exatamente os da lista de arquivos da T12. As interfaces batem com as do plano: `AcaoEvento` com as 23 ações,
  `NovoEvento`, `registrarEvento(tx, ev, relogio)`, `CAMPOS_TEXTO_LIVRE`, `mudancaDeCampo` e
  `listarHistorico(db, demandaId)`. A única diferença é o desvio 1, julgado abaixo. O `passagens.jsonl` do commit é do
  maestro.
- [x] **Há teste para cada comportamento novo, e ele falharia sem o código.** O teste falhando foi mostrado
  (`Cannot find module` nos dois arquivos). `registrar.test.ts` tem 18 testes:
  - C-30 nos sete campos de texto livre, com sentinelas;
  - a lista de permissão nos cinco campos;
  - campo desconhecido e variação de caixa ou de espaço no nome;
  - valor que não é texto num campo da lista.

  `consultas.test.ts` tem 14 testes contra o Postgres real, pelo papel do app. Cobrem:
  - as colunas de cada tipo de ator, com CA-02.4 e o prefixo nulo do worker;
  - a ordem com desempate pelo id;
  - o nome e o papel vindos da conta;
  - C-09, o prefixo que não sai na leitura;
  - o filtro pela demanda;
  - a transação desfeita, que leva o evento junto (G3.8).

  O C-08 continua coberto por `verificacao.test.ts`, sem edição. Conferi com `pnpm test`: 63 de 63 arquivos e 1043 de
  1043 testes.
- [x] **Sem segredo, `.env` ou dado pessoal real.** São só nomes "Pessoa Ficticia", domínios `exemplo.test`,
  sentinelas de `test/sentinelas.ts` e um prefixo de token inventado (`Ab3dE5gH`). O evento de 2FA leva só o booleano.
- [x] **Entrada externa validada com Zod.** A tarefa não cria rota, Server Action nem job. `listarHistorico` não
  confere o formato do id, e isso está certo: a regex é de `rota()` (G3.10). A consulta é parametrizada pelo query
  builder.
- [x] **Banco.** Não há migration nem tabela nova. A leitura usa o índice `evento_demanda_ocorrido_idx` da T04.
- [x] **Nada duplica função existente.** O insert direto em `evento` do `auth.ts`, deixado pela T09, saiu e passou a
  usar `registrarEvento`. Há uma ressalva Minor sobre `ehAgente` (parecer 2).
- [x] **Textos de interface e axe.** Não há tela nesta tarefa.
- [x] **Minor vai para Pendências.** Os quatro pareceres abaixo são Minor.
- [x] **`/code-review` e `/security-review` no PR.** Ficam com a `08-revisao` (G2 do plano). Não se aplicam a esta
  passagem.

`pnpm lint` e `pnpm typecheck` estão limpos.

### Julgamento dos desvios declarados

1. **`nome: string | null` e `papel: Papel | null` em `EventoVisivel.ator` de pessoa: aceito.** `evento.ator_id` não
   tem FK. As outras saídas seriam tirar o evento do histórico, o que fere RF-21, ou inventar nome e papel, o que fere
   a prestação de contas (D8). O tipo do plano estava errado nesse ponto. A consequência vai para Pendências (T16 e
   T40).
2. **Valor que não é texto, num campo da lista de permissão, vira `{ alterado: true }`: aceito.** É o lado seguro de
   C-30, e há teste.
3. **Teste a mais da transação desfeita: aceito.** Prova G3.8 para quem vai chamar `registrarEvento` dentro do serviço.

### Pareceres (todos Minor, nenhum bloqueia)

1. **`src/modules/historico/consultas.ts:30`. Problema:** se `ator_tipo` for `agente` e `ator_id` não estiver em
   `AGENTES`, `atorVisivel` devolve `{ tipo: 'sistema' }`. O mesmo vale para qualquer `ator_tipo` fora dos dois
   primeiros ramos. Nenhum teste cobre esse caso. **Razão:** o histórico é prova de autoria (RF-21, D8), e um evento de
   agente aparecer como "sistema" é atribuição errada, e silenciosa. Hoje esse caminho não acontece: o
   `CHECK evento_ator_tipo_check` limita o tipo, e o único que grava é `registrarEvento`, tipado por `Agente`. Por isso
   o parecer é Minor. **Sugestão:** quando a T16 ou a T23 tocar este arquivo, o ramo final passa a ser explícito
   (`atorTipo === 'sistema'`). O caso inconsistente ganha forma própria ou erro, com teste.
2. **`src/modules/historico/consultas.ts:25`. Problema:** `ehAgente` foi declarado localmente, mas o guarda irmão
   `ehPapel` fica em `src/modules/acesso/ator.ts:15`, ao lado de `AGENTES`. **Razão:** a próxima tarefa que precisar
   conferir o nome de um agente vinda do banco ou de entrada (T23, interruptores; T27, execução) tende a redeclarar o
   guarda. **Sugestão:** mover para `ator.ts` como `export const ehAgente` na primeira tarefa que precisar dele de novo.
3. **`src/modules/acesso/auth.ts:39-40`, `:161` e `:175`. Problema:** com papel fora de `PAPEIS`, `pessoaDaSessao`
   devolve `null`, e o evento de 2FA de C-08 não é gravado, sem log. Antes da T12, o evento era gravado sempre que havia
   sessão. Nenhum teste cobre esse ramo. **Razão:** é perda silenciosa de evento de segurança. Hoje é inalcançável,
   porque `user.papel` é `NOT NULL` com `CHECK`, e lançar erro no gancho iria contra C-21, como o engenheiro explicou.
   Por isso é Minor. **Sugestão:** um `log.warn({ evento: 'evento_2fa_sem_ator' })` nesse ramo, que só tem campos da
   lista de permissão, deixa o caso visível sem lançar erro. Fica como dívida pequena.
4. **`src/modules/historico/registrar.ts:83`. Problema:** `registrarEvento` aceita `antes` e `depois` livres. Quem
   garante C-30 é `mudancaDeCampo`, e só quando o serviço o usa. **Razão:** o plano define a assinatura assim, e a T12
   cumpre o que o plano pede. Só que o teste de C-30 que a 04 exige ("`PATCH` de `solicitanteNome` com sentinela e
   nenhum evento contém o sentinela") ainda não existe. Ele depende da rota. **Sugestão:** fica para a T15 e a T16
   (Pendências).

## Decisões tomadas

- Status `pronto`: nenhum problema Critical ou Important. Os quatro Minor vão para Pendências, pela seção 12.
- Desvio 1 aceito: entre perder o evento, inventar o autor e mostrar nulo, só o nulo mantém RF-21 e D8 verdadeiros.
- Parecer 1 classificado como Minor e não Important: o caminho não acontece com os `CHECK` e os tipos que existem hoje.
  Ele vira Important se alguma tarefa futura gravar `evento` fora de `registrarEvento`.
- Parecer 3 não exige correção agora: o ramo é inalcançável pelo `CHECK` do banco, e a correção (só log) não muda o
  comportamento coberto por C-08.

## Pendências

- **T15 e T16 (`engenheiro-backend`):**
  - toda mudança de campo da demanda passa por `mudancaDeCampo`;
  - entra o teste de integração de C-30 pedido pela 04: `PATCH` de `solicitanteNome` com sentinela, e nenhuma linha
    de `evento` contém o sentinela.
- **T16 e T40:** `ator.nome` e `ator.papel` podem vir nulos quando a conta não existe mais (desvio 1). A rota precisa
  devolver esse caso sem erro, e a tela do detalhe precisa ter um texto para ele. Se a 03 não tiver esse texto, quem
  decide é o `ux-ui-design`, antes da T40.
- **T32:** `desativarConta` mantém a linha de `user` (só preenche `desativado_em`). É isso que faz o histórico mostrar o
  nome de quem já saiu. O teste da T32 deve conferir.
- **Minor 1 (`consultas.ts:30`):** tornar explícito o ramo `sistema` de `atorVisivel`, com teste, na próxima tarefa que
  tocar o arquivo.
- **Minor 2 (`consultas.ts:25`):** mover `ehAgente` para `src/modules/acesso/ator.ts` na primeira tarefa que precisar
  dele (T23 ou T27).
- **Minor 3 (`auth.ts:39-40`):** `log.warn` com evento fixo quando o evento de 2FA não for gravado por falta de ator.
  Fica registrado como dívida.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat e98dfcf5d332602f103d1ba024ff82155ae6b7f8` — 7 arquivos: os 5 da T12, a entrega do engenheiro e `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show e98dfcf5d332602f103d1ba024ff82155ae6b7f8 -- src` — diff do código revisado
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 63 de 63 arquivos, 1043 de 1043 testes
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
