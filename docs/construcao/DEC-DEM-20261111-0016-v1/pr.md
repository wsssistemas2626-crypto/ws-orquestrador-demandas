# Orquestrador 0.3.0: atores de integração awave (criar e ler a própria demanda) e construir (buscar o Pedido de Construção) · DEC-DEM-20261111-0016-v1

## Resumo

O Orquestrador ganha dois atores de **integração**, cada um com token de serviço próprio e uma matriz fechada de
permissões.

- **`awave`:**
  - **Cria a própria demanda** (`POST /api/demandas`) e **lê só as dele**: uma demanda de outro autor ou inexistente
    recebe o mesmo 404. A leitura devolve uma vista de 6 chaves, com título minimizado.
  - Limite de **10 demandas por hora**.
  - A demanda chega como **"Aguardando confirmação"**. Nenhum agente de IA age nela antes de uma pessoa com 2FA tocar
    em **"Confirmar demanda"** na página da demanda (decisões D1 e P-01).
- **`construir`:**
  - **Busca os Pedidos de Construção aprovados** (`GET /api/pedidos-construcao/pendentes`) e
    **pega a entrega** (`/:decId/entrega`). `pedido_entregue` é gravado uma vez por hash.
  - **Confirma o recebimento** (`/:decId/recebimento`).
  - A tela de decisão mostra "Recebido pelo /construir em …".
- **Painel:** filtro e indicação de **Origem** (Pessoa, Agente de IA, Awave) na fila; origem, selo e seção de
  confirmação na demanda; textos novos no histórico, com o ator e o prefixo do token.
- **Scripts:** emissão, troca e revogação dos tokens de integração. O token nunca vai a log, resposta nem evento.
- **Tempo-limite e trava:** as transações das integrações têm tempo-limite e devolvem 503 com mensagem fixa.
- **Migration 0007** (aditiva): coluna e índice novos, CHECKs refeitos e `token_servico.agente` passa a aceitar nulo,
  com o CHECK `num_nonnulls = 1`. **Não altera dado existente.**
- **Seed fictício:** 28 demandas, entre elas três do Awave e dois pedidos para o /construir.

**Fica igual:** a aprovação é de pessoa com 2FA, e nenhum agente aprova nem se passa por pessoa. `src/lib`,
`proxy.ts`, `resolver-ator.ts`, `exigir-pessoa.ts`, `auth.ts` e `privilegios.ts` não têm diff (IN-15). Não entra
dependência nova.

## Etapas e tempos

| Etapa | Passagens | Minutos |
|---|---|---|
| 01 requisitos | 1 | 7 |
| 02 arquitetura | 1 | 8 |
| 03 interface | 1 | 7 |
| 04 ameaças | 1 | 7 |
| P1 spec aprovada por Fabiano (com as recomendações) | 1 | 140 (espera) |
| 05 plano (20 tarefas, 6 fases) | 4 | 32 |
| P2 plano aprovado, modo `ate_o_fim` | 2 | 0 |
| 06 construção T01 a T20 (construção, revisão e testes de cada uma) | 81 | 735 |
| 07 testes funcionais | 1 | 10 |
| 08 revisão de código e de segurança | 1 | 6 |
| 09 entrega | 1 | 32 |
| 10 documentação | 1 | 15 |
| **Total** | **96** | **999** |

**Bloqueios:** foram 11, todos de comando só de leitura fora da lista Pode, liberados pela regra de 25/10. Os mais
comuns: `git grep`, e `|` dentro de `-G`.

**Volta:** uma só, na T07. A chave `origem` quebrava testes do painel fora da lista do engenheiro-dados-bd. O plano
foi ajustado (D-22 e D-23): o nome ficou e a guarda de `entrada-qa.test.ts` ficou mais forte, com uma lista fechada
das nove chaves e `origem === 'pessoa'`.

**Queda:** o servidor reiniciou às 13h33 UTC de 12/11, no meio dos testes da T20. A etapa rodou de novo e usou os
arquivos que a execução interrompida tinha deixado.

## Verificação (`verificar`)

| Verificação | Resultado | Detalhe |
|---|---|---|
| ramo | ok | `construcao/DEC-DEM-20261111-0016-v1` |
| árvore limpa | ok | limpa |
| versão | ok | 0.2.0 → 0.3.0 |
| changelog | ok | seção 0.3.0 |
| ci | ok | `.github/workflows/ci.yml` |
| remoto | ok | github.com/wsssistemas2626-crypto/ws-orquestrador-demandas |
| test | ok | 6.387 de 6.387 |
| lint | ok | limpo |
| typecheck | ok | limpo |

## Homologação (`homologar`)

| Verificação | Resultado | Detalhe |
|---|---|---|
| subir | ok | http://127.0.0.1:3200 |
| saúde | ok | `/api/saude` respondeu 200 |
| e2e | ok | 271 passaram, contra o build de produção, com `retries: 0` |
| derrubar | ok | projeto e volumes removidos |

## Ensaio de rollback (`ensaiar-rollback`)

| Verificação | Resultado | Detalhe |
|---|---|---|
| migrations da `main` | ok | nenhuma alterada |
| migrations novas | ok | 1, nenhuma altera dado existente |
| versão anterior | ok | a versão da `main` respondeu 200 em 72 s |
| backup | ok | 117 KB, impressão `dc699d8026ff1274` |
| versão nova | ok | a versão do ramo, sobre o banco da `main`, respondeu 200 em 49 s |
| restauração | ok | o banco ficou igual ao backup (impressão `dc699d8026ff1274`) |
| volta | ok | a versão da `main` só volta com o backup restaurado; respondeu 200 em 12 s |
| ida de novo | ok | a versão do ramo, depois da volta, respondeu 200 em 50 s |
| derrubar | ok | projeto e volumes removidos |

> **A volta desta versão exige restaurar o backup do banco** (`volta_sem_restaurar: false`). O dado gravado depois da
> publicação se perde na volta. Nenhuma migration altera dado existente (`alteram_dado: false`).

## Testes

- **Unidade e integração:** 6.387 de 6.387.
  - Cada tarefa foi escrita com o teste antes do código.
  - Os testes que já existiam mudaram só em contagem, seletor ou lista, sem perder asserção, e cada mudança tem
    justificativa na revisão da tarefa.
  - Cobertos: matriz × rotas, a leitura só da própria demanda, nenhum disparo de agente antes da confirmação (com o
    gatilho ligado e uma demanda de controle), nenhum token em resposta ou log, limite e 503.
- **Ponta a ponta:** 271 de 271 na homologação; na T20, 276 passaram, 0 falharam e 9 capturas foram puladas. Nenhum
  teste passou de 24 s. O axe não acusou violação nas telas novas, no computador e em 390 px.
- **Testes funcionais (07):** todos os critérios de aceite estão cobertos e não houve devolução. A 07 deixou um
  roteiro de aceite para depois da publicação.

## Achados da revisão (08)

- **Código:** skill `code-review`, nível alto. **Segurança:** agente `seguranca-aplicacao` com o diff do ramo, porque a
  skill `security-review` revisa o ramo da sessão, que é outro repositório.
- **Nenhum achado crítico ou alto.**
- **Médios.** Recomendação: corrigir numa 0.3.1 **antes de emitir os tokens de produção**. Sem token emitido, nenhuma
  integração alcança as rotas novas (401).
  - **M-1:** o token de agente lê e escreve ESP/RSK em demanda do Awave ainda não confirmada. Segue o CA-10.6, mas o D1
    só vale no worker. A correção muda o CA-10.6, então a decisão é de Fabiano.
  - **M-2:** o 201 do POST do Awave é lido depois do COMMIT, fora do orçamento de tempo. Com o banco lento, a nova
    tentativa do Awave pode duplicar a demanda.
  - **M-3:** o orçamento de tempo vale por instrução, não pela transação, e a espera por conexão não tem limite.
  - **M-4:** recebimento e entrega usam travas diferentes; numa corrida, o recebimento grava o hash antigo.
  - **M-5:** a guarda do worker usa `demandaId`, e não a chave da entrada, e gasta a chave quando bloqueia.
    Inalcançável hoje.
- **Baixos:**
  - falta `trace: 'off'` em `e2e/integracoes.spec.ts`;
  - falta um `else throw` no script de token;
  - `jaConfirmada` deve exigir que o ator seja pessoa;
  - a migration cria índice sem `CONCURRENTLY`;
  - há cópias de `ehAgente`, de `RE_PREFIXO` e da regra "origem Awave";
  - há consultas a mais em cada gatilho;
  - ESP/RSK/DEC podem ser montados à mão numa demanda do Awave não confirmada.

## Pendências

- **Fabiano, antes de emitir os tokens:**
  - decidir o M-1 (muda o CA-10.6) e aprovar a 0.3.1 com M-1 a M-5;
  - QF-0016-01: o nome "Awave" vira "[nome removido]" no título que o Awave e os agentes recebem;
  - confirmar o endereço completo do Awave na rede interna (UAT-03 e UAT-04).
- **Depois do deploy, com Fabiano:**
  - emitir os tokens de produção;
  - ligar o `pedidos/config/orquestrador.json`;
  - rodar V-01/V-02 (W16/W17) pela rede interna;
  - roteiro de aceite da 07.
- **Outras áreas:**
  - aceite formal dos riscos residuais com `gestao-riscos` (P-04, já aceito por Fabiano);
  - rede própria do Easypanel (`seguranca-informacao`);
  - retenção do texto do Awave (`juridico-contratos`);
  - QF-0016-02 (texto do seed);
  - QF-0016-03 (`minimizar.test.ts:642` instável, fora do pedido).

## Publicação

Esta versão **tem a migration 0007**. O `deploy.md` (seções 4, 5 e 6) traz os passos: backup antes, migration num passo
separado, deploy do worker e depois do app, e conferência. A volta para a 0.2.0 **exige restaurar o backup**.

Os serviços no ar usam a imagem que o Easypanel monta a partir do GitHub, no ramo `main`. Depois deste merge, **qualquer
Deploy do `app` leva a 0.3.0 e a migration junto**. Por isso, nada de Deploy sem o roteiro da seção 5. O repositório
não tem webhook nem os segredos de deploy, então o merge sozinho não publica nada.

Merge: pela política (`construir.mjs merge`, CA-P7-05) quando ela está ligada e permite; senão, de Fabiano. Serviço no
Easypanel é ação de Fabiano.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
