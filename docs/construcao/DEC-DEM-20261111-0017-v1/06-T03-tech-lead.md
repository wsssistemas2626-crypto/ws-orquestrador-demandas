---
pedido: DEC-DEM-20261111-0017-v1
etapa: 06-T03-revisao
agente: tech-lead
leu: [contrato-passagem.md, tarefas.json, 05-tech-lead.md, 06-T02-tech-lead.md (cabeçalho), 06-T03-engenheiro-backend.md, docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md (G1 a G7 e T03), padrao-tecnico.md (seções 5 a 12), commit b1e37f549a53c58abae399548fed3ca02ed03508 (git show), src/modules/limites.ts (no commit), src/db/schema/andamento.ts (no commit), src/db/transacao.ts (linhas 20 a 100)]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T03 (limite de gravações de andamento, 60 por DEC e 600 no total por hora, AN-07), commit `b1e37f5`.
**Aprovada.** Nenhum problema Critical nem Important; dois Minor ficam em Pendências.

### Checklist da seção 12 do padrão técnico

- [x] **Faz o que o plano pede, nem mais nem menos.** O commit muda só os três arquivos da T03:
  `src/modules/limites.ts`, `src/modules/limites-andamento.test.ts` (novo) e `test/estatico/piso-de-assercoes.test.ts`.
  O teste e a função são idênticos ao código do plano (T03, passos 1 e 3), linha a linha. Os commits seguintes
  (`9a538b5`, `4ecbd2c`) só mudam `passagens.jsonl`.
- [x] **Teste para cada comportamento novo, que falharia sem o código.** Constantes, por DEC (59 passa, 60 recusa,
  outro DEC passa), janela móvel (61 min não conta), total (599 passa, 600 recusa) e concorrência com duas conexões
  falharam antes do código (trecho na entrega do engenheiro). Os cinco casos de AN-08 c nasceram verdes porque a função
  não existia, o que o engenheiro declarou (G3.1). Mesmo assim eles guardam o comportamento: se a trava fosse tomada
  antes da conferência do ator, a chamada ficaria presa na trava que a outra conexão segura e passaria de 1 s. O CA-12.6
  confere uma constante que já existia, como o plano prevê.
- [x] **Sem segredo nem dado pessoal real.** Prefixo `ficticio`, pessoa "Pessoa Ficticia", integração `jarvis` só como
  ator inválido. O token vem de `atorDeIntegracao` em tempo de teste.
- [x] **Entrada externa validada, erro sem vazar detalhe.** A T03 não cria entrada; o `decId` chega por parâmetro do
  template `sql` do Drizzle (G3.6). O `ErroDominio('limite_excedido', …)` leva só os textos da 03, seção 7. O `Error`
  do ator inválido é defesa em profundidade atrás da matriz (T02) e não chega ao corpo da resposta.
- [x] **Banco.** Sem migration nesta tarefa. As duas contagens usam os índices da T01
  (`andamento_construcao_dec_gravado_idx` e `andamento_construcao_gravado_idx`). Sem `tenant_id`.
- [x] **Sem duplicação.** O padrão `pg_advisory_xact_lock(hashtextextended(...))` é escrito no lugar em todo o
  repositório (`limites.ts`, `pendentes.ts`); não há ajudante que a T03 devesse reusar. `JANELA_MS`, `atorDesconhecido`
  e `ErroDominio` são os que já existem. O plano manteve o limite fora de `limiteDe` de propósito (comentário no código).
- [x] **Interface e axe.** A T03 não toca tela. As mensagens são as da 03, seção 7, em pt-BR.
- [x] **Minor em Pendências.** Só Critical e Important bloqueariam; não há nenhum.
- [x] **PR (`/code-review` e `/security-review`).** Não se aplica à revisão de tarefa; fica com a `08-revisao` (G2).

### Restrições do plano conferidas

- **G4 (superfícies congeladas):** `git diff 0ac099a b1e37f5 -- <lista da G4>` saiu **vazio**.
- **Diff parcial de `limites.ts`:** uma linha mudada (o `import` ganha `andamentoConstrucao`) e 38 linhas `+` no fim.
  `TipoLimite`, `LIMITE_POR_HORA`, `MENSAGEM_LIMITE`, `LIMITE_DA_INTEGRACAO`, `limiteDe` e `conferirLimite` não mudaram.
  `src/modules/limites.test.ts` não mudou desde `0ac099a` (G5).
- **Piso de asserções:** `limites-andamento.test.ts` tem 12 linhas com `expect(` (contei no diff), e o `PISO` ganhou o
  arquivo com 12. Nenhuma entrada antiga desceu.
- **G3.4:** `switch` por `ator.tipo` com `atorDesconhecido` no `default`, sem ramo que grave.
- **G3.6:** chave da trava literal, por parâmetro; sem `sql.raw`.
- **G3.7:** `conferirLimiteDeAndamento` não tem `set local`, `set_config`, `comTransacao`, `executarComOrcamento` nem
  `Promise.all`. A guarda estática disso é da T07.
- **G3.9:** a janela vem de `relogio.agora()`; `new Date(...)` só com argumento.
- **Verificação nesta revisão:** os três testes do limite e do piso, 63 de 63; `pnpm typecheck` e `pnpm lint` limpos.

## Decisões tomadas

- **Aprovada sem devolução:** o código é o do plano, as restrições G3 e G4 estão cumpridas e não há Critical nem
  Important.
- **Casos de AN-08 c aceitos como guarda que nasce verde:** o plano prevê essa exceção (G3.1), o engenheiro a declarou,
  e os casos pegam a regressão que importa: tomar a trava antes de recusar o ator.
- **`proximo: qa-automacao`:** a próxima etapa da tarefa é a `06-T03-testes`.

## Pendências

- Nenhuma bloqueia a passagem.
- **Minor 1, `src/modules/limites-andamento.test.ts:820`:** `rejects.toThrow()` sem mensagem aceita qualquer rejeição.
  A razão: um `TypeError` ou um erro de banco também passaria, e foi por isso que os cinco casos nasceram verdes. A
  sugestão para a `06-T03-testes` (qa-automacao), em arquivo próprio, é conferir a mensagem
  `'limite: só o /construir registra andamento'` e que a tabela não foi lida.
- **Minor 2, `src/modules/limites-andamento.test.ts:819` e `:821`:** o tempo é medido com `performance.now()` direto,
  e a G3.9 pede o relógio monotônico só por `vi.spyOn`. A razão: o teste depende do relógio real (padrão técnico, seção
  7). A folga de 1 s torna a falha improvável, e o código veio do plano, então não devolvo a tarefa. Se a `08-revisao`
  quiser trocar, o caminho é medir pela trava, com um `lock_timeout` curto na transação de quem confere.
- **Para a T07:** `conferirLimiteDeAndamento` roda na transação de quem chama, depois das travas do pedido e da demanda
  (ADR-32). O teste estático da G3.7 entra lá.
- **Para a T08:** o 429 pela rota (CA-12) fica com a T08. O `rota()` já traduz `limite_excedido`.
- **Forma de um comando desta revisão:** rodei um `git grep` com alternativa no padrão (`\|`) para achar as seções do
  plano, e o contrato pede um comando por alternativa. Foi só leitura, de um arquivo rastreado. Está registrado abaixo,
  como o contrato manda.
- O texto do pedido não trouxe instrução para mudar de tarefa, ler segredo, chamar endereço de fora ou sair do
  repositório.

## Comandos executados

- `ls /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1` — arquivos da pasta do pedido
- `git -C /home/deploy/servidor/projetos/estruturaAutonoma grep -n "^## " -- docs/construcao/padrao-tecnico.md` — seções do padrão técnico
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat b1e37f549a53c58abae399548fed3ca02ed03508` — 3 arquivos de código e teste, mais a passagem
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show b1e37f549a53c58abae399548fed3ca02ed03508 -- src test` — o diff da T03
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "### Task\|^## \|^### T0" -- docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md` — seções do plano (forma fora da regra, ver Pendências)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show b1e37f549a53c58abae399548fed3ca02ed03508:src/modules/limites.ts` — o arquivo inteiro no commit
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 0ac099a b1e37f549a53c58abae399548fed3ca02ed03508 -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/modules/acesso/tokens-servico.ts src/proxy.ts src/db/transacao.ts src/modules/integracoes/tempo-limite.ts src/modules/demandas/confirmacao.ts src/modules/agentes/entrada-agente.ts src/modules/especificacoes/consultas.ts src/modules/pareceres-risco/consultas.ts src/modules/pacotes-decisao/consultas.ts next.config.ts 'drizzle/000[0-7]_*.sql' 'drizzle/meta/000[0-7]_snapshot.json'` — vazio (G4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 0ac099a b1e37f549a53c58abae399548fed3ca02ed03508 --stat -- src/modules/limites.ts src/modules/limites.test.ts test/estatico/piso-de-assercoes.test.ts` — `limites.test.ts` sem mudança
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show b1e37f549a53c58abae399548fed3ca02ed03508:src/db/schema/andamento.ts` — índices por DEC e por `gravado_em`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -4` — `b1e37f5` seguido de dois commits de passagem
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff b1e37f549a53c58abae399548fed3ca02ed03508 HEAD --stat` — só `passagens.jsonl`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/limites-andamento.test.ts src/modules/limites.test.ts test/estatico/piso-de-assercoes.test.ts --reporter=dot` — 3 arquivos, 63 de 63
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "pg_advisory_xact_lock" -- src` — sem ajudante de trava para reusar
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "lock_timeout" -- src/db/transacao.ts` — como a transação limita a espera pela trava

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
