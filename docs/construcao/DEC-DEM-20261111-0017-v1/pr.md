# Orquestrador 0.4.0: andamento do Pedido de Construção registrado pelo /construir · DEC-DEM-20261111-0017-v1

## Resumo

Melhoria de cadeia completa e risco médio. O andamento real de um pedido existia só no `/construir`. No Orquestrador,
"Em construção" era marcado à mão, e quem olhava a fila não sabia a fase do pedido. Esta versão recebe o andamento
enviado pelo `/construir`, que já estava pronto e desligado desde 11/11 (CA-F-04, `enviar-andamento.mjs`). O envio usa
o token `construir` da 0.3.0.

- **Rota nova:** `POST /api/pedidos-construcao/[decId]/andamento`. Ela grava fase, situação e tarefas prontas, com
  limite de 60 por DEC e 600 por hora (P-03). Responde 409 para DEC substituído (P-01) e 404 sem oráculo para DEC
  inexistente ou fora do escopo.
- **Fila:** o selo de fase com as tarefas prontas aparece na demanda Em construção.
- **Detalhe:** a seção "Andamento da construção" mostra o pedido, a fase, a situação, a barra de tarefas e a hora da
  última mudança. Há alertas para construção cancelada e para DEC substituído.
- **Status pelo `/construir`:** Aprovada vai para Em construção quando a construção começa, e Em construção vai para
  Devolvida pela construção quando ela é cancelada. Entregue continua sempre de pessoa (A1). O evento no histórico sai
  só na mudança de fase ou de situação (A2). O pedido escrito direto fica sem andamento (A3).
- **Awave:** a leitura da demanda ganha a chave `andamento` (sete chaves), com a mesma regra de visibilidade da 0.3.1.
  O agente e o `sistema` não veem a demanda do Awave antes da confirmação de pessoa.
- **Seed fictício:** passou de 28 para 36 demandas, 5 delas com andamento.
- **Migrations:** `0008` (tabela `andamento_construcao`) e `0009` (GRANT e RLS), só aditivas. Não há processo, job,
  pacote nem variável de ambiente nova.

Versão 0.3.1 → 0.4.0.

## Etapas e tempos (cadeia completa)

| Etapa (agente) | Passagens | Minutos |
|---|---|---|
| 01 requisitos (analista-requisitos) | 1 | 8 |
| 02 arquitetura (arquiteto-solucoes) | 1 | 6 |
| 03 interface (ux-ui-design) | 1 | 9 |
| 04 ameaças (seguranca-aplicacao) | 1 | 8 |
| P1 (Fabiano, aprovada em nome dele) | 1 | 6 |
| 05 plano (tech-lead e maestro) | 3 | 38 |
| P2 (Fabiano, até o fim) | 1 | 0 |
| 06 construção (dados-bd, backend, frontend) | 25 | 881 |
| 06 revisão (tech-lead) | 25 | 259 |
| 06 testes (qa-automacao) | 27 | 241 |
| 06 registros do maestro e de Fabiano (bloqueios, liberações, ajustes) | 37 | 0 |
| 07 QA funcional (qa-funcional) | 1 | 6 |
| 08 revisão (maestro, ultracode) | 1 | 7 |
| 09 entrega (devops-sre) | 3 | 35 |
| 10 documentação (documentacao-tecnica) | 1 | 15 |
| **Total** | **129** | **1.519** |

**Status das passagens:** 51 prontas, 37 bloqueios, 35 liberações, 4 ajustes e 2 aprovações.
- **Os bloqueios** foram todos por comando fora da lista Pode, quase sempre leitura (`git grep` com alternativa,
  leitura da saída de teste em `/tmp`, `sed -i` na T09). Nenhum foi por defeito.
- **A parada longa:** a T09 ficou cerca de 4h30 parada, na madrugada de 13/11, esperando Fabiano liberar um `sed -i`.
  Daí saiu a decisão D-CONSTRUIR-2026-11-13: o maestro decide sozinho essas paradas. Ela virou regra escrita do
  `/construir` em `e44299e`, na estruturaAutonoma.
- **Os 4 ajustes** são da regra nova: a leitura fora da forma faz a etapa ser refeita.
- **Erro do maestro:** a 09 teve uma volta porque o maestro, no prompt, tirou do devops-sre o `homologar` e o
  `ensaiar-rollback`.

## Verificação (`verificar`)

| Verificação | Resultado | Detalhe |
|---|---|---|
| ramo | ok | `construcao/DEC-DEM-20261111-0017-v1` |
| árvore limpa | ok | limpa |
| versão | ok | 0.3.1 → 0.4.0 |
| changelog | ok | seção 0.4.0 |
| ci | ok | `.github/workflows/ci.yml` |
| remoto | ok | github.com/wsssistemas2626-crypto/ws-orquestrador-demandas |
| test | ok | 7.741 de 7.741 |
| lint | ok | limpo |
| typecheck | ok | limpo |

## Homologação (`homologar`)

| Verificação | Resultado | Detalhe |
|---|---|---|
| subir | ok | http://127.0.0.1:3200 |
| saúde | ok | `/api/saude` respondeu 200 |
| e2e | ok | 281 passaram, contra o build de produção |
| derrubar | ok | projeto e volumes removidos |

## Ensaio de rollback (`ensaiar-rollback`)

| Verificação | Resultado | Detalhe |
|---|---|---|
| migrations da `main` | ok | nenhuma alterada |
| migrations novas | ok | 2; nenhuma altera dado existente (`alteram_dado: false`) |
| versão anterior | ok | a versão da `main` (0.3.1) respondeu 200 em 51 s |
| backup | ok | 127 KB, impressão `a2d09a64129004d9` |
| versão nova | ok | a versão do ramo, sobre o banco da `main`, respondeu 200 em 37 s |
| restauração | ok | o banco ficou igual ao backup |
| volta | ok | a versão da `main` só volta com o backup restaurado; respondeu 200 em 11 s |
| ida de novo | ok | a versão do ramo respondeu 200 em 37 s |
| derrubar | ok | projeto e volumes removidos |

> **A volta desta versão exige restaurar o backup do banco** (`volta_sem_restaurar: false`). O que for gravado depois
> do backup se perde. Antes de qualquer volta, veja se basta desligar o envio, revogar o token ou corrigir o status à
> mão (`deploy.md`, seção 6).

## Testes

- **Unidade e integração:** 7.741 de 7.741 na verificação. Eram 6.489 na 0.3.1.
  - Cada tarefa da 06 passou por construção, revisão do tech-lead e testes do qa-automacao, com teste visto falhando
    antes do código.
  - As mudanças em teste existente são só as aprovadas pela G5 e G3.2 do plano, sem tirar asserção:
    - totais do seed, de 28 para 36;
    - seis para sete chaves na leitura do Awave;
    - 5 para 6 consultas em `desempenho/leitura`.
- **Ponta a ponta:** 281 na homologação, contra o build de produção.
- **Instabilidade conhecida sob carga**, em arquivos que não usam código deste pedido:
  - `scripts/scripts.test.ts` T33;
  - `test/desempenho/leitura.test.ts` (p95, 522 ms contra 500 ms uma vez);
  - `src/app/api/saude/route.test.ts`;
  - `resumo-da-fila` e `minimizar`.

  Falharam por tempo em algumas rodadas da suíte inteira e passam rodados sozinhos. Na verificação final, nenhum falhou.

## Achados da revisão (08)

Revisão final por Workflow ultracode, por pedido de Fabiano (execução `wf_b1132e9b-520`, 12 agentes).
- **Revisores:** seis, por dimensão: permissões e visibilidade, concorrência, prazos e transações, contratos de rota e
  tela, testes que afrouxam, segurança.
- **Verificação adversarial:** dois a três verificadores por achado.

**Resultado:** nenhum crítico, alto ou médio. Dois baixos confirmados:
- **B-08-1:** `andamentosDasDemandas` (`src/modules/andamento/consultas.ts:45`) lê todas as linhas de andamento das
  demandas da página para devolver a última. O resultado é certo, mas o custo de `/demandas` cresce com o tempo.
  Correção: `LATERAL … ORDER BY id DESC LIMIT 1` por demanda, e o teste de plano sem Sort.
- **B-08-2:** `src/modules/andamento/registrar-qa.test.ts` (69 `expect(`, cobre o AN-03, AN-05 e AN-06) ficou fora do
  PISO de asserções.

O **EXP-01** da 07 (a fila mostrar "Construção concluída" para o andamento de um DEC já substituído) não é defeito: o
RF-08 não pede vigência na fila, e o detalhe avisa. Fica como ponto de produto, em Pendências.

## Pendências

**Fabiano, antes do merge e da publicação** (`deploy.md`, seção 5, "Publicação 0.3.1 → 0.4.0"):
1. "Auto Deploy" desligado no `app` e no `worker`, e **nenhum outro merge** até o fim da publicação.
2. `"andamento_ligado": false` em `pedidos/config/orquestrador.json` do `/construir`.
3. Imagens em uso rotuladas `:v0.3.1`, e o `docker pull` do GHCR funcionando.
4. Backup do banco antes. **Snapshot da VPS: não tirar.** Até a Hostinger resolver, o snapshot congela o servidor
   (regra da VPS de 06/11). O `deploy.md` ainda o cita como opcional, e a linha 13 manda tirá-lo; alinhar à D5 depois.
5. As migrations `0008` e `0009` num passo separado, pelo comando `!` de Fabiano, e depois o Deploy do `worker` e o do
   `app`.

**Depois da publicação:**
- **P-04:** decidir o envio do andamento por usuário próprio do sistema. Hoje o crontab do envio roda como `deploy`, o
  mesmo usuário dos agentes. Aceitar o risco residual com a `gestao-riscos`, e só então `"andamento_ligado": true`.
- **P-05:** conferir a tool do Awave com a chave `andamento` antes da parte 3 da E01.
- **V-02 e RNF-01:** medir com a tabela de andamento povoada. Ainda não rodaram, porque precisam de comandos fora da
  lista da 09.
- Os tokens de produção das integrações continuam não emitidos ("amanhã, após 1 dia estável", decisão de 12/11).

**Para Fabiano decidir (produto):**
- **EXP-01:** a fila e o Awave devem esconder o andamento de DEC substituído? Isso pediria consulta de vigência na
  fila, contra a ADR-35, ou o selo só depois do primeiro andamento do DEC novo.

**Para a 0018 ou a dívida da 0.4.x:**
- Os dois baixos da 08 (B-08-1 e B-08-2).
- **Minors da T05:** títulos antigos que dizem "seis chaves", e o `a === null` em `paraIntegracao`.
- **Minors da T09:** o comentário de `leitura.test.ts:244` (Seq Scan com o banco vazio), e o isolamento explícito dos
  casos sem CHECK.
- **Minors da T11:** a lista de status escrita à mão, e a guarda estática das importações de `dados-do-andamento.ts`.
- **Minors da T13:** o ramo morto em `SecaoAndamento.tsx`, e os testes de `secaoDoAndamento` no arquivo de
  `dados-das-etapas`. O teste estático de `style=` (CV-02) não foi localizado, mas a CSP e o e2e cobrem isso na
  execução.
- As capturas do manual (cap. 08) ainda sem o selo e a seção do andamento.
- A spec chama a migration de `0009_rls_privilegios_andamento`; o arquivo é `0009_rls_andamento_construcao.sql`.
- A instabilidade de tempo sob carga, listada em Testes.
- **Comandos dos revisores do Workflow:** rodaram 95 comandos só de leitura, alguns fora da forma da lista Pode. Estão
  registrados no `08-maestro.md`. Na próxima revisão por Workflow, o prompt traz a regra de comando da cadeia.

**Já resolvido:** o Minor da T14 (`status_alterado` em `e2e/andamento-construir.spec.ts`), que hoje está preso à
transição.

## Publicação

Merge: pela política (`construir.mjs merge`, CA-P7-05) quando ela está ligada e permite; senão, de Fabiano. Serviço no
Easypanel é ação de Fabiano.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
