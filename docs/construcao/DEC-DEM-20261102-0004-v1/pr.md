# Orquestrador 0.1.3: teste "Arquivar" prova a mudança de status também fora do CI · DEC-DEM-20261102-0004-v1

## Resumo

Este é um pedido de correção (cadeia curta) sobre a `main` (`b8a8c44`, versão 0.1.2). Ele fecha o B-01 da 04-revisao
do pedido DEC-DEM-20261102-0003-v1.

O problema: numa execução repetida contra o mesmo banco, o teste "Arquivar" de `e2e/decisao.spec.ts` aceitava como
ponto de partida uma demanda que já estava `encerrada`. Nesse caso, o `toBe('encerrada')` passava sem provar que o
arquivamento tinha mudado o status.

O que mudou:

- **Pré-condição:** o "Arquivar" só aceita como partida um status de `ORIGENS_DO_FLUXO`. Com `CI` definido (GitHub
  Actions e `homologar`), uma partida fora disso reprova. Fora do CI, o teste é pulado com a mensagem "exige banco
  recém-semeado: …".
- **Conferências:** o teste confere o status antes de arquivar (`pronta_para_decisao`) e depois (`encerrada`), e
  também o `statusDecisao` do pacote (`arquivada`).
- **Teste de 404 e sessão:** o trecho que antes ficava dentro do "Arquivar" virou um teste próprio, que roda em qualquer
  banco. Usa o DEC de rascunho do seed e não faz POST. Todas as conferências de antes continuam.
- **Versão e CHANGELOG:** versão 0.1.3, com a entrada no `CHANGELOG.md`.

Nenhum comportamento do sistema mudou: nada em `src/`, `scripts/` nem `.github/`. A regra A-02, o C-36 e o axe
continuam sem exceção.

## Etapas e tempos

| Etapa | Passagens | Minutos |
|---|---|---|
| 01 reprodução (qa-funcional) | 1 | 10 |
| 02 triagem (tech-lead) | 1 | 4 |
| 03 correção (engenheiro-frontend) | 1 | 29 |
| 04 regressão (qa-automacao) | 1 | 31 |
| 04 revisão (maestro) | 1 | 3 |
| 05 entrega (devops-sre) | 3 | 7 |
| 06 documentação (documentacao-tecnica) | 1 | 2 |
| **Total** | **9** | **86** |

Houve 1 bloqueio: um `ls` só de leitura fora da lista Pode, liberado pelo maestro por delegação de Fabiano em 02/11.

## Verificação (`verificar`)

| Verificação | Resultado | Detalhe |
|---|---|---|
| ramo | ok | `construcao/DEC-DEM-20261102-0004-v1` |
| árvore limpa | ok | limpa |
| versão | ok | 0.1.2 → 0.1.3 |
| changelog | ok | seção 0.1.3 |
| ci | ok | `.github/workflows/ci.yml` |
| remoto | ok | github.com/wsssistemas2626-crypto/ws-orquestrador-demandas |
| test | ok | 3.697 de 3.697 |
| lint | ok | limpo |
| typecheck | ok | limpo |

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
| versão anterior | ok | a versão da `main` respondeu 200 em 151 s |
| backup | ok | 106 KB, impressão `8753c8e7afee2e5b` |
| versão nova | ok | a versão do ramo, sobre o banco da `main`, respondeu 200 em 36 s |
| restauração | ok | o banco ficou igual ao backup (impressão `8753c8e7afee2e5b`) |
| volta | ok | a versão da `main` voltou sobre o banco migrado e de novo sobre o backup, e respondeu 200 em 11 s |
| ida de novo | ok | a versão do ramo, depois da volta, respondeu 200 em 35 s |

Voltar desta versão para a anterior **não** exige restaurar o backup (`volta_sem_restaurar: true`). Nenhuma migration
altera dado existente.

## Testes

- Unidade e integração: 3.697 de 3.697.
- Ponta a ponta: 143 de 143 na homologação. Na 04 foram 143 de 143 em três rodadas seguidas em banco novo, sem teste
  pulado. Com `--repeat-each=3` no mesmo banco, foram 19 aprovados, 8 pulados com mensagem e nenhuma falha.

## Achados da revisão (04)

Revisões feitas: leitura integral do diff pelo maestro, skill `code-review` em nível baixo (sem achado) e agente
`seguranca-aplicacao`. A skill `security-review` não rodou porque exige `origin/HEAD`.

- Crítico, Alto e Médio: nenhum. Segurança: sem achado.
- **B-1** (Baixo, estético): em `e2e/decisao.spec.ts:6-8`, a quebra de linha do comentário de cabeçalho ficou torta.
  Dá para ajustar quando o arquivo for mexido de novo.

## Publicação

Esta versão não tem migration nova. No push da `main`, o `deploy.yml` publica a imagem no GHCR (tags sha, v0.1.3 e
latest) e chama os webhooks do Easypanel. Os segredos `EASYPANEL_WEBHOOK_APP` e `EASYPANEL_WEBHOOK_WORKER` ainda não
existem, então o passo dos webhooks fica vermelho e nada vai para produção. Se for preciso voltar, o caminho A da
seção 6 do `deploy.md` leva à `v0.1.2`.

## Pendências para Fabiano

Continuam valendo as do PR #1:
- os médios M-01 a M-07 e o médio do reteste do pedido DEC-DEM-20261022-0001-v1;
- a leitura do QR com um autenticador real;
- fixar `actions/checkout` e `actions/setup-node` por SHA;
- os segredos do GitHub e a credencial do GHCR no Easypanel;
- os serviços no Easypanel;
- o ADR do Next 16.4;
- a primeira publicação pela seção 4 do `deploy.md`, com snapshot no hPanel antes.

Merge: pela política (`construir.mjs merge`, CA-P7-05) quando ela está ligada e permite; senão, de Fabiano. Criar o
serviço no Easypanel é ação de Fabiano.
