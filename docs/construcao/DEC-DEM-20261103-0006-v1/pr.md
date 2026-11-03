# Orquestrador 0.1.5: médios M-01, M-02 e M-03 do pedido 0001 · DEC-DEM-20261103-0006-v1

## Resumo

Este é um pedido de correção (cadeia curta, risco médio) sobre a `main` (`cf36ec5`, versão 0.1.4). Ele fecha os três
médios de regra de domínio que a 08-revisao do pedido DEC-DEM-20261022-0001-v1 deixou para a primeira publicação
(CA-P5-18 no backlog do `/construir`). Fabiano autorizou, em 03/11, seguir as recomendações do maestro, com commit e
merge, até as 15h30 de Brasília.

O que mudou:

- **M-01, a citação da consolidação:** o DEC criado pelo agente de consolidação cita a ESP e o RSK que a entrada dele
  leu, e não os mais novos no momento da gravação. Se uma versão nova entrou no meio, o DEC nasce desatualizado e a
  aprovação dele é barrada pela regra que já existia. Os ids citados nunca vêm do corpo da requisição nem da saída do
  modelo; id de outra demanda dá 404 sem gravar.
- **M-02, a demanda em status final:** criar ESP, RSK ou DEC numa demanda `entregue` ou `encerrada` é recusado com 409
  e mensagem fixa, pela pessoa e pelo agente, logo depois da trava da demanda e antes de limite, insert, evento,
  agente, aviso ou job. A execução de agente que já estava na fila fica `ignorada` com motivo `demanda_final`, sem
  chamar o provedor pago.
- **M-03, o aviso por e-mail:** a recusa definitiva do Resend (4xx que não é 429) marca `falhou` na primeira vez; o
  erro inesperado conta tentativa numa transação própria, com a trava da linha, e termina `falhou` na terceira; 429 e
  5xx continuam tentados de novo.
- **Testes:** 17 novos em unidade e integração; a 04 estabilizou um teste e2e da fila que já era instável (espera a
  Região de aviso antes de clicar), sem tirar asserção.
- **Versão e documentação:** 0.1.5, `CHANGELOG.md`, `deploy.md`, README e manual técnico (com a correção de um trecho
  antigo do cap. 06 sobre recusa do serviço).

Sem migration, coluna ou variável de ambiente nova. Nada em `src/db/`, `drizzle/`, `scripts/` nem `.github/`.

## Etapas e tempos

| Etapa | Passagens | Minutos |
|---|---|---|
| 01 reprodução (qa-funcional) | 1 | 4 |
| 02 triagem (tech-lead) | 3 | 7 |
| 03 correção (engenheiro-backend) | 1 | 19 |
| 04 regressão (qa-automacao) | 3 | 56 |
| 04 revisão (maestro) | 1 | 3 |
| 05 entrega (devops-sre) | 3 | 8 |
| 06 documentação (documentacao-tecnica) | 1 | 8 |
| **Total** | **13** | **105** |

Houve 3 bloqueios, todos registrados no `passagens.jsonl`:
- na 02, um `ls -la` da pasta do pedido, só de leitura, liberado pelo maestro (regra de Fabiano de 25/10);
- na 04, um `find`, um `tail` em saída gravada e um `git diff -G`, só de leitura, liberados pelo maestro (mesma regra);
- na 05, o `docker build` local com o caminho absoluto do repositório, que cria só a imagem local e não publica,
  liberado pelo maestro por delegação de Fabiano de 03/11.

Na 03, um `cd <repo> && pnpm test` (só teste) foi refeito na forma permitida e está em prosa na entrega. Na 04 e na 05,
Glob e Grep apareceram indisponíveis aos subagentes, a causa que a R1.1 do parecer da `governanca-ia` de 03/11 aponta.

## Verificação (`verificar`)

| Verificação | Resultado | Detalhe |
|---|---|---|
| ramo | ok | `construcao/DEC-DEM-20261103-0006-v1` |
| árvore limpa | ok | limpa |
| versão | ok | 0.1.4 → 0.1.5 |
| changelog | ok | seção 0.1.5 |
| ci | ok | `.github/workflows/ci.yml` |
| remoto | ok | github.com/wsssistemas2626-crypto/ws-orquestrador-demandas |
| test | ok | 3.811 de 3.811 |
| lint | ok | limpo |
| typecheck | ok | limpo |

A primeira passada do `verificar` deu `test` reprovado: 2 testes de `src/app/api/saude/route.test.ts` responderam 503
no lugar de 200, com a máquina em carga 13,8 (8 vCPU) durante a própria suíte. Esse arquivo não mudou neste pedido e
passou 6 de 6 rodado sozinho; a segunda passada inteira deu 3.811 de 3.811. A saída da primeira passada ficou fora do
ramo, para não sujar a árvore. Fica como pendência: o teste de saúde é sensível a carga.

## Homologação (`homologar`)

| Verificação | Resultado | Detalhe |
|---|---|---|
| subir | ok | http://127.0.0.1:3200 |
| saúde | ok | `/api/saude` respondeu 200 |
| e2e | ok | 143 passaram, contra o build de produção e com `CI` definido |
| derrubar | ok | projeto e volumes removidos |

## Ensaio de rollback (`ensaiar-rollback`)

| Verificação | Resultado | Detalhe |
|---|---|---|
| migrations da `main` | ok | nenhuma alterada |
| migrations novas | ok | nenhuma |
| versão anterior | ok | a versão da `main` respondeu 200 em 210 s |
| backup | ok | 106 KB, impressão `6373e21aec7c8621` |
| versão nova | ok | a versão do ramo, sobre o banco da `main`, respondeu 200 em 44 s |
| restauração | ok | o banco ficou igual ao backup (impressão `6373e21aec7c8621`) |
| volta | ok | a versão da `main` voltou sobre o banco migrado e de novo sobre o backup, e respondeu 200 em 12 s |
| ida de novo | ok | a versão do ramo, depois da volta, respondeu 200 em 65 s |

Voltar desta versão para a anterior **não** exige restaurar o backup (`volta_sem_restaurar: true`). Nenhuma migration
altera dado existente.

## Testes

- Unidade e integração: 3.811 de 3.811 (17 novos nas etapas 03 e 04).
- Ponta a ponta: 143 de 143 na homologação; na 04, 143 de 143 em três rodadas seguidas com banco novo, depois da
  estabilização do teste da fila.
- `docker build` local: passou na 05.

## Achados da revisão (04)

Revisões feitas: leitura integral do diff pelo maestro, skill `code-review` em nível baixo e agente
`seguranca-aplicacao`. A skill `security-review` não rodou: o `origin/HEAD` já existe no repositório, mas a skill lê a
pasta da sessão (estruturaAutonoma), e não o repositório do pedido.

- Crítico, Alto e Médio: nenhum.
- **B-1:** a regra de que os ids citados só vêm do worker está garantida por comentário; falta um teste estático de
  que nada em `src/app/` passa os `extras` de `criarPacoteDecisao`.
- **B-2:** erro depois de o e-mail ter saído ainda conta tentativa; a chave de idempotência segura o reenvio, mas o
  aviso pode terminar `falhou` com o e-mail entregue. Já acontecia antes.
- **B-3:** `STATUS_FINAIS` é usado só nos testes.
- **B-4:** a fila pode perder o foco do resultado quando o filtro ou a paginação vêm antes de o React assumir a lista
  (WCAG 2.4.3). Defeito do produto, que o teste agora evita sem afrouxar.
- **B-5:** o motivo `demanda_final` não tem rótulo em `src/components/rotulos.ts`.
- **B-6:** três comentários de cabeçalho passam de 120 colunas.

## Pendências

Entram no pedido seguinte, DEC-DEM-20261103-0007-v1 (já escrito):
- **M-08 (médio novo, da 02):** aprovar DEC (`registrarDecisao`, `decidir.ts:201-219`) e gerar Pedido (`gerarPedido`,
  `pedido-construcao/gerar.ts:42-61`) não conferem o status da demanda;
- **408 e 409 do Resend (observação da 04):** com a regra nova, viram `falhou` na hora, mas são passageiros;
- os médios M-05, M-06 e M-07 do pedido 0001 e as actions fixadas por SHA.

Para um pedido seguinte, Baixos: B-1, B-4, B-5, B-2 e B-3 se o arquivo for mexido, B-6 numa passada de formatação, e o
teste de `/api/saude` sensível a carga.

Para o `/construir` (estruturaAutonoma): a `security-review` no repositório do pedido; a forma do `grep` de
`process.env` na lista do `devops-sre`; Glob e Grep para os subagentes (R1.1 do parecer da `governanca-ia`).

Para Fabiano, da primeira publicação (CA-P5-16):
- a leitura do QR com um autenticador real;
- os segredos do GitHub e a credencial do GHCR no Easypanel;
- os serviços no Easypanel;
- a primeira publicação pela seção 4 do `deploy.md`, com snapshot no hPanel antes.

## Publicação

Esta versão não tem migration nova. No push da `main`, o `deploy.yml` publica a imagem no GHCR (tags sha, v0.1.5 e
latest) e chama os webhooks do Easypanel. Os segredos `EASYPANEL_WEBHOOK_APP` e `EASYPANEL_WEBHOOK_WORKER` ainda não
existem, então o passo dos webhooks fica vermelho e nada vai para produção. Se for preciso voltar, o caminho A da
seção 6 do `deploy.md` leva à `v0.1.4`.

Merge: pela política (`construir.mjs merge`, CA-P7-05) quando ela está ligada e permite; senão, de Fabiano. Serviço no
Easypanel é ação de Fabiano.
