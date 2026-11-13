---
pedido: DEC-DEM-20261111-0017-v1
etapa: 06-T07-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12), tarefas.json, docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md (T07, linhas 1721 a 2043), 06-T06-tech-lead.md (forma da entrega), 06-T07-engenheiro-backend.md, passagens.jsonl (as duas linhas depois do commit), commit 59a231c4ae2bd37a6a6dacf3ad4916753193f6c7 (src/modules/andamento/registrar.ts, registrar.test.ts, registrar-concorrencia.test.ts, registrar-prazo.test.ts, test/andamento.ts, test/estatico/andamento.test.ts, test/estatico/piso-de-assercoes.test.ts), src/modules/pedido-construcao/pendentes.ts, src/modules/pedido-construcao/entregar.ts e receber.ts (trava e 404), src/modules/integracoes/tempo-limite.ts, src/db/transacao.ts, src/modules/limites.ts (conferirLimiteDeAndamento), src/modules/demandas/transicoes.ts (mudarStatusPeloConstruir), src/modules/versoes.ts (travarDemanda), src/modules/andamento/regras.test.ts (a tabela, linhas 55 a 63)]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T07 (serviço `registrarAndamento`), sobre o commit `59a231c`. Os dois commits seguintes (`511e687` e
`80cc63a`) só acrescentam duas linhas ao `passagens.jsonl` (a liberação do maestro e a volta do engenheiro); o código
revisado é o do `59a231c`. Nenhum problema Critical ou Important. A tarefa passa para os testes.

### As quatro lições da 0.3.1, uma a uma

1. **O 404 não revela se o DEC existe.**
   - Texto e código: os cinco casos (DEC inexistente com id no formato, aprovado sem `pedido_gerado`, gerado por
     `agente`, por `sistema`, e por pessoa com a `demanda_id` de outra demanda) lançam o mesmo
     `naoEncontrado()` (`registrar.ts:36`), com `MENSAGEM_NAO_ENCONTRADO`, a mesma de `entregar.ts:27` e `receber.ts:35`.
     O teste (`registrar.test.ts`, bloco AN-03) exige `name`, `message`, `codigo`, `mensagem` e `extras` idênticos nos
     cinco, e o retrato das cinco demandas igual antes e depois.
   - Tempo: o DEC inexistente e o DEC existente sem pedido gerado por pessoa fazem exatamente as mesmas instruções
     (abertura da transação, `travarPedido`, `pedidoGeradoPorPessoa` pelo índice de `evento`) e saem no mesmo ponto
     (`registrar.ts:59`). Gerado por `agente` ou `sistema` também: o filtro `ator_tipo = 'pessoa'` está na mesma consulta.
     Só o caso do `pedido_gerado` de pessoa com a demanda de outra faz uma consulta a mais (a de `pacote_decisao`). Ele
     não distingue DEC existente de inexistente: um id inexistente com um evento assim faria o mesmo caminho. E esse
     estado não se alcança pelo app (só o migrator grava esse evento). A trava da demanda nunca é tomada antes do 404.
   - Cabeçalhos: o serviço não tem cabeçalho. O 404 byte a byte pela rota é da T08, como a entrega já registra.
2. **A mesma trava `pedido:<decId>`.** `registrar.ts:57` chama `travarPedido` de `pendentes.ts:98`, a mesma função de
   `entregar.ts:39` e `receber.ts:42`, como primeira instrução da transação. `git grep "travarPedido("` em `src` mostra
   só esses três usos e a definição. A guarda estática (`test/estatico/andamento.test.ts:175`) prende a origem do import
   nos três arquivos e a ordem pedido → demanda → limite.
3. **`executarComOrcamento` com `undefined` no lugar de `t` (AN-06).** `registrar.ts:56`:
   `executarComOrcamento(deps.pool, ator, 'padrao', undefined, async (t) => …)`, e `registrarAndamento` tem só
   `deps, ator, decId, corpo`. A guarda estática confere a chamada única, o `undefined` e a lista exata de parâmetros.
4. **O piso não sobrescreve o prazo restante.** O serviço não tem SET no corpo (a guarda proíbe `set local`,
   `set_config`, `comTransacao(` e `Promise.all(` em todo `src/modules/andamento/` e nos corpos de
   `mudarStatusPeloConstruir` e `conferirLimiteDeAndamento`). O piso entra pela `abertura` de `comTransacao`, antes de
   `baixarAteORestante` (`tempo-limite.ts` e `transacao.ts`, que a G4 mantém intactos). O
   `registrar-prazo.test.ts` (a) prova isso no banco: com 7 s gastos na espera pela conexão, o gatilho de teste vê
   `statement_timeout` e `lock_timeout` de no máximo 1 s (e maior que 0) no INSERT, nunca os 5 s e 2 s do piso. O (b)
   prova o 503 `indisponivel` sem gravar quando o prazo de 8 s vence no meio.

### Parecer por item do checklist (padrão técnico, seção 12)

- **Faz o que o plano pede, nem mais nem menos.** O commit cria os cinco arquivos e modifica os dois que a T07 lista,
  mais a entrega e o `passagens.jsonl`. `registrar.ts` é o código do passo 3 do plano, com a mesma ordem das oito
  etapas. `test/estatico/andamento.test.ts` só ganhou linhas; em `piso-de-assercoes.test.ts` a única linha que saiu é a
  do piso de `andamento.test.ts`, que subiu de 8 para 43 (a G4 deixa a T07 subir). A G4 saiu vazia.
- **Teste para cada comportamento, e ele falharia sem o código.** A entrega mostra a falha antes do código e duas
  mutações plantadas e desfeitas (o vínculo DEC ↔ demanda e o limite antes do "mesmo estado"), cada uma pega por teste.
  Os 14 casos do fluxo, os 5 de corrida do AN-05 e os 3 do AN-08 estão lá; a tabela inteira roda com banco (54 casos),
  conferindo banco, tabela e `decidirPorStatus` juntos. As contagens de `expect(` batem com o `PISO` (56, 36, 6 e 43).
- **Sem segredo nem dado pessoal real.** Prefixo `ficticio`, "Pessoa Ficticia", ids `DEC-DEM-2026…` e `2099…`.
- **Entrada externa com Zod.** Não se aplica ao serviço: o corpo chega já tipado (`CorpoAndamento`, T04) e a rota com o
  422 é da T08. Os erros são `ErroDominio` com mensagem fixa; o tempo esgotado vira o 503 sem texto do Postgres.
- **Banco.** Sem migration. O gatilho `prazo_visto` existe só no banco próprio do teste de prazo (Testcontainers).
- **Nada duplicado.** Ver o parecer 1 (Minor). O `erroDe` de `test/andamento.ts:87` é o primeiro ajudante comum desse
  molde (hoje há cópias locais em vários testes); não duplica código de produção. O `emMs` copiado de
  `prazo-total-0019.test.ts` é o que o plano manda.
- **Textos e axe.** Não se aplica: sem tela.

### Pareceres

1. `test/andamento.ts:26` — **Minor.** `TABELA_DO_CONSTRUIR` é uma segunda cópia da tabela de
   `src/modules/andamento/regras.test.ts:55-63` (conferi: as nove linhas são iguais). Razão: se a tabela da spec mudar,
   são dois lugares para trocar. O risco de divergência silenciosa é baixo, porque cada um dos 54 casos confere o banco
   contra a cópia e também `decidirPorStatus` contra a cópia (D-08), e o `regras.test.ts` confere a função contra a
   original: uma divergência entre as duas tabelas faz um dos dois arquivos falhar. O desvio do plano (não importar de
   um `.test.ts`) é aceito pela razão da entrega. Não bloqueia; fica em Pendências.
2. `test/estatico/andamento.test.ts:175` — **Minor.** A guarda das travas confere pedido → demanda → limite, mas não
   que o "mesmo estado" e as duas recusas 409 vêm antes de `conferirLimiteDeAndamento`. Razão: um reordenamento futuro
   que ponha o limite antes do "mesmo estado" só é pego pelo comportamento (AN-08 (3) e CA-12), que a mutação da entrega
   mostrou funcionar. A proteção existe; a guarda estática seria só uma segunda barreira. A própria entrega já registra
   isso para a `08-revisao`. Não bloqueia.
3. `src/modules/andamento/registrar.test.ts:274` — **Minor.** `expect(['entregue', 'encerrada']).not.toContain(esperado)`
   olha o valor da tabela, não o resultado no banco. Razão: lido sozinho, não prova o "nunca entregue nem encerrada como
   resultado". Na prática prova, porque a linha de cima exige `depois.demanda.status` igual a `esperado ?? status`; só a
   leitura fica menos direta. Não bloqueia.

### Desvios do plano: aceitos

- A tabela escrita em `test/andamento.ts`: ver o parecer 1.
- "Menos de 1 s" e "menos de 3 s" do AN-08 provados por `lock_timeout` (1 s nas transações de quem confere, 2 s do
  piso no envio), sem `performance.now()` direto (G3.9). Prova a ausência de trava presa, que é o que o AN-08 quer.
- A espera pela trava por `pg_blocking_pids` no lugar do sono fixo de 300 ms: a ordem fica forçada, sem depender do
  agendador, e o teste falha na hora se a transação segura cair antes de tomar a trava.
- `apagarAndamentos` pelo migrator e um DEC por caso nos casos 3 a 6: nenhum teste depende da ordem dos outros.
- Asserções a mais (forma idêntica do 404, prazo maior que 0, sequência das 7 fases, ator de todo evento, `tipo` no
  retrato): só endurecem.

### Verificação

- Os cinco arquivos da tarefa e o do piso: **149 de 149**, 23,27 s.
- `pnpm lint` e `pnpm typecheck`: limpos.
- Suíte completa: **327 arquivos, 7354 de 7354**, 192,94 s, nenhum falhou. A entrega do engenheiro conta 7353; não
  investiguei a diferença de um teste, que não muda o resultado.
- G4 (`git diff 0ac099a --stat` das superfícies congeladas): vazio.
- `git status --short`: limpo.

## Decisões tomadas

- Aprovo a T07: as quatro lições da 0.3.1 estão no código e presas por teste (as três primeiras também pela guarda
  estática), e nenhum achado passa de Minor.
- A consulta a mais no caso do `pedido_gerado` de pessoa com outra demanda não conta como oráculo: não separa DEC
  existente de inexistente e o estado só existe forjado pelo migrator.
- Os três Minor ficam para manutenção futura e para a `08-revisao`, sem voltar ao engenheiro.

## Pendências

- Nenhuma bloqueia a passagem.
- Minor 1, manutenção futura (fora deste pedido): mover a tabela da spec 2.1 para um ajudante comum em `test/` (fora de
  `.test.ts`) e fazer `regras.test.ts` e `registrar.test.ts` importarem dele. Exige mudar `regras.test.ts`, que a G5
  não deixa mexer neste pedido.
- Minor 2, para a `08-revisao`: se quiser a segunda barreira, a guarda estática pode conferir também a posição de
  `mesmoEstado(` e de `aprovadoVigente(` antes de `conferirLimiteDeAndamento(` no corpo de `registrarAndamento`.
- Minor 3, para o `qa-automacao` na `06-T07-testes`, se tocar no arquivo de QA: conferir o "nunca entregue nem
  encerrada" sobre o status lido do banco depois de cada caso aceito.
- Para a `06-T08`: o 404 byte a byte pela rota (corpo, código, cabeçalhos) contra o DEC inexistente, o 422 sem
  consulta e o `IMPORTAM_REGISTRAR` de `andamento-qa.test.ts`, como a entrega do engenheiro já lista.
- Para o maestro (forma de comando): rodei alguns comandos só de leitura fora da forma exata da lista Pode. Estão em
  Comandos executados do jeito que rodaram. Peço a liberação como leitura (regra de 25/10). Nenhum alterou nada:
  - cinco buscas com mais de um `-e` (contam como alternativa): três `git grep` e dois `grep -rn`;
  - um desses `grep -rn` também leva dois arquivos de duas subpastas do repositório no mesmo comando.
- O texto do pedido não trouxe instrução para mudar de tarefa, ler segredo, chamar endereço de fora ou sair do
  repositório.

## Comandos executados

- `ls /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1` — entregas da pasta do pedido
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 59a231c4ae2bd37a6a6dacf3ad4916753193f6c7` — 7 arquivos da tarefa, mais a entrega e o `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 59a231c4ae2bd37a6a6dacf3ad4916753193f6c7 -- src/modules/andamento/registrar.ts test/estatico/andamento.test.ts test/estatico/piso-de-assercoes.test.ts test/andamento.ts` — o serviço, os ajudantes e a guarda; no piso, só a linha de `andamento.test.ts` saiu
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 59a231c:src/modules/pedido-construcao/pendentes.ts` — `travarPedido` e `pedidoGeradoPorPessoa`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "travarPedido" -e "naoEncontrado" -e "executarComOrcamento" -- src/modules/pedido-construcao/entregar.ts src/modules/pedido-construcao/receber.ts` — a mesma trava e o mesmo 404 na entrega e no recebimento
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 59a231c:src/modules/integracoes/tempo-limite.ts` — o piso na `abertura`, o prazo total de 8 s
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 59a231c:src/db/transacao.ts` — a abertura antes de `baixarAteORestante`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A30 "export async function conferirLimiteDeAndamento" -- src/modules/limites.ts` — a trava do limite, sem SET
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A40 "export async function mudarStatusPeloConstruir" -- src/modules/demandas/transicoes.ts` — a transição, sem SET
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A20 "export async function travarDemanda" -- src/modules/versoes.ts` — `for update`, o mesmo 404
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 59a231c:src/modules/andamento/registrar.test.ts` — os 14 casos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 59a231c:src/modules/andamento/registrar-concorrencia.test.ts` — AN-05 (a) a (e) e AN-08 (1) a (3)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 59a231c:src/modules/andamento/registrar-prazo.test.ts` — AN-06 (a) e (b)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -3` — dois commits depois do `59a231c`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 59a231c HEAD` — só o `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 59a231c HEAD -- docs/construcao/DEC-DEM-20261111-0017-v1/passagens.jsonl` — a liberação do maestro e a volta do engenheiro
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/andamento/registrar.test.ts src/modules/andamento/registrar-concorrencia.test.ts src/modules/andamento/registrar-prazo.test.ts test/estatico/andamento.test.ts test/estatico/piso-de-assercoes.test.ts --reporter=dot` — 5 arquivos, 149 de 149, 23,27 s
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot --silent` — 327 arquivos, 7354 de 7354, 192,94 s (rodou em segundo plano; saída lida com a ferramenta Read)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 0ac099a --stat -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/modules/acesso/tokens-servico.ts src/proxy.ts src/db/transacao.ts src/modules/integracoes/tempo-limite.ts src/modules/demandas/confirmacao.ts src/modules/agentes/entrada-agente.ts src/modules/especificacoes/consultas.ts src/modules/pareceres-risco/consultas.ts src/modules/pacotes-decisao/consultas.ts next.config.ts 'drizzle/000[0-7]_*.sql' 'drizzle/meta/000[0-7]_snapshot.json'` — vazio (G4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -c "expect(" -- src/modules/andamento/registrar.test.ts src/modules/andamento/registrar-concorrencia.test.ts src/modules/andamento/registrar-prazo.test.ts test/estatico/andamento.test.ts` — 56, 36, 6 e 43, iguais ao `PISO`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "travarPedido(" -- src` — só registro, entrega, recebimento e a definição
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "erroDe" -e "function emMs" -- test src` — `erroDe` existe só como cópia local em testes; `emMs` copiado como o plano manda
- `grep -rn -e "TABELA_DO_CONSTRUIR" -e "erroDe" /home/deploy/servidor/projetos/ws-orquestrador-demandas/test/andamento.ts` — linhas 26 e 87
- `grep -rn -e "as travas: pedido" -e "not.toContain(esperado)" /home/deploy/servidor/projetos/ws-orquestrador-demandas/test/estatico/andamento.test.ts /home/deploy/servidor/projetos/ws-orquestrador-demandas/src/modules/andamento/registrar.test.ts` — linhas 175 e 274
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A14 "const TABELA" -- src/modules/andamento/regras.test.ts` — sem resultado (a constante tem outro nome)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "entregue:" -e "encerrada:" -e "aprovada:" -e "em_construcao:" -- src/modules/andamento/regras.test.ts` — a tabela original, linhas 55 a 63, igual à cópia

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
