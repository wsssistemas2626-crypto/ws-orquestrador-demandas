# Orquestrador 0.1.13: o DEC aprovado mais novo substitui o anterior (E5 do 0013, opção b) · DEC-DEM-20261104-0014-v1

## Resumo

Este é um pedido de correção (cadeia curta, risco alto) sobre a `main` (`89eca46`, versão 0.1.12). Ele resolve o E5 do
pedido 0013: com um DEC aprovado, o A-02 não deixava aprovar outro DEC da mesma demanda. Por isso uma recusa do Pedido
de Construção por nome de pessoa, inclusive a falsa, ou qualquer correção de ESP ou RSK depois da aprovação, não tinha
saída dentro da demanda. Fabiano decidiu em 04/11 pela opção (b) do tech-lead e autorizou commit e merge em 10/11
(CA-P5-26 no backlog do `/construir`).

O que mudou:

- **Aprovação que substitui:**
  - O `registrarDecisao` deixa aprovar o DEC mais novo da demanda mesmo com outro DEC já aprovado. Continuam valendo
    todas as regras de hoje: só o mais novo se decide (A-01), 2FA, papéis, dupla aprovação, revisão de rascunhos,
    desatualizado e demanda em status final.
  - A mensagem do A-02 saiu do fluxo.
- **Substituído, calculado na leitura:**
  - O DEC aprovado que não é o aprovado de maior versão da demanda é "substituído". Sem migration, coluna ou status
    novo.
  - A vista do DEC, a lista da demanda, `listarPacotes` e a vista mínima do agente trazem `substituido` e
    `substituidoPor`.
  - O `substituidoPor` aponta sempre o aprovado vigente.
- **Um só Pedido de Construção válido:**
  - O `gerarPedido` recusa com 409 todo DEC substituído, lido sob a trava da demanda e antes do desatualizado. A
    mensagem cita só o id do DEC que gera.
  - O aprovado mais novo gera como antes (CA-22.2).
- **Histórico:** a aprovação que substitui grava `pacote_decisao_substituido` no DEC antigo, com só os dois ids e sem
  texto livre, depois de `aprovacao_registrada` e `decisao_registrada`.
- **Nível ao substituir (S-01, da revisão):**
  - Um DEC só do CTO não substitui um aprovado que exigiu CTO e administradora: 409 antes de gravar, sem aprovação,
    decisão nem evento.
  - O inverso continua permitido, com as duas aprovações.
- **T11:**
  - O DEC substituído mostra selo, aviso e link para o DEC que o substituiu, e não oferece gerar o pedido.
  - Na aba velha, "Gerar" dá o alerta do 409, com foco e sem JSON.
- **Seed:** ganhou uma demanda fictícia própria para o caminho completo do e2e (C-36).
- **Versão e documentação:**
  - 0.1.13 em `CHANGELOG.md`, `deploy.md` (volta para a `v0.1.12` pelo caminho A), README e manual técnico (caps. 03,
    04, 05, 08 e 09).
  - Spec do sistema (RF-13 e RF-22): editada pelo maestro, porque nenhum agente da cadeia curta tem o arquivo na
    **Pode**. Entrou no commit da 06.

Sem migration, dependência ou variável de ambiente nova. Nada muda em `src/db/`, `drizzle/`, `.github/` nem no
`pnpm-lock.yaml`.

## Etapas e tempos

| Etapa | Passagens | Minutos |
|---|---|---|
| 01 reprodução (qa-funcional) | 1 | 4 |
| 02 triagem (tech-lead) | 1 | 5 |
| 03 correção (engenheiro-backend) | 3 | 22 |
| 04 regressão (qa-automacao) | 1 | 20 |
| 04 revisão (maestro) | 1 | 5 |
| 04 correção (engenheiro-backend) | 1 | 7 |
| 04 reteste (seguranca-aplicacao) | 1 | 2 |
| 05 entrega (devops-sre) | 3 | 4 |
| 06 documentação (documentacao-tecnica) | 1 | 7 |
| **Total** | **13** | **76** |

**Bloqueios:** houve 2, só de leitura, liberados pela regra de 25/10.
- Na 03: `cd <repo> &&` antes dos `pnpm`, e `grep`/`tail` sobre a saída do próprio `pnpm test`.
- Na 05: um `git grep`.

**Revisão:** a 04-revisao devolveu uma vez, pelo S-01 (alto).

**Queda da sessão:** às 07h47 BRT, na 3ª execução do e2e da 04-regressao (teste 76, sem falha). Fabiano mandou retomar.
A volta começou às 11h35 UTC, e os minutos da regressão contam só ela.

## Verificação (`verificar`)

| Verificação | Resultado | Detalhe |
|---|---|---|
| ramo | ok | `construcao/DEC-DEM-20261104-0014-v1` |
| árvore limpa | ok | limpa |
| versão | ok | 0.1.12 → 0.1.13 |
| changelog | ok | seção 0.1.13 |
| ci | ok | `.github/workflows/ci.yml` |
| remoto | ok | github.com/wsssistemas2626-crypto/ws-orquestrador-demandas |
| test | ok | 4.465 de 4.465 |
| lint | ok | limpo |
| typecheck | ok | limpo |

## Homologação (`homologar`)

| Verificação | Resultado | Detalhe |
|---|---|---|
| subir | ok | http://127.0.0.1:3200 |
| saúde | ok | `/api/saude` respondeu 200 |
| e2e | ok | 144 passaram, contra o build de produção, com a correção do S-01 |
| derrubar | ok | projeto e volumes removidos |

## Ensaio de rollback (`ensaiar-rollback`)

| Verificação | Resultado | Detalhe |
|---|---|---|
| migrations da `main` | ok | nenhuma alterada |
| migrations novas | ok | nenhuma |
| versão anterior | ok | a versão da `main` respondeu 200 em 159 s |
| backup | ok | 106 KB, impressão `ad11a829db3dc32e` |
| versão nova | ok | a versão do ramo, sobre o banco da `main`, respondeu 200 em 37 s |
| restauração | ok | o banco ficou igual ao backup (impressão `ad11a829db3dc32e`) |
| volta | ok | a versão da `main` voltou sobre o banco migrado e de novo sobre o backup, e respondeu 200 em 11 s |
| ida de novo | ok | a versão do ramo, depois da volta, respondeu 200 em 42 s |
| derrubar | ok | projeto e volumes removidos |

Voltar desta versão para a anterior **não** exige restaurar o backup (`volta_sem_restaurar: true`). Nenhuma migration
altera dado existente.

## Testes

- **Unidade e integração:** 4.465 de 4.465.
  - A 03 trouxe `substituicao.test.ts` (casos de aprovação, níveis, rascunho, desatualizado, M-08, A-01 e as corridas
    do C-13) e `gerar-substituido.test.ts` (409 do substituído, geração do mais novo, dez corridas de aprovar com
    gerar). Também casos na rota, na vista e no histórico.
  - Os testes do A-02 foram substituídos pela regra nova, e não afrouxados.
  - A 04-correcao inverteu o caso entre níveis e acrescentou a recusa pela rota `PATCH`.
- **Ponta a ponta:** 144 de 144 na homologação.
  - Na 04, 144 de 144 em três execuções seguidas, depois de duas execuções 144 de 144 na volta que a queda interrompeu.
  - Cobre o caminho completo: aprovar, recusa por nome, nova ESP, novo DEC, aprovar, gerar o novo e 409 do antigo.
  - Cobre também a aba velha e o axe na T11 do substituído e no alerta.
  - A correção do S-01 não mexeu na T11 nem em `e2e/`, e a homologação rodou a suíte inteira depois dela.
- **Build:** o `pnpm build` passou na 05. O `docker build` roda na homologação e no CI.

## Achados da revisão (04)

Revisões feitas:
- o agente `feature-dev:code-reviewer` não achou nada de confiança alta;
- o maestro conferiu os testes trocados do A-02;
- o agente `seguranca-aplicacao`, obrigatório pela ESP, revisou o ramo e retestou o S-01 no commit `995ce77`.

- **Crítico:** nenhum.
- **S-01 (alto), corrigido e fechado no reteste:** uma aprovação só do CTO substituía um DEC aprovado com a
  administradora.
- **S-02 (médio):** um Pedido de Construção já copiado do DEC antigo continua valendo do lado do `/construir`, inclusive
  com a demanda `em_construcao`. É o risco aceito no RSK, e o controle é só processual (a regra de uso, mostrada na T11 e
  no histórico).
- **S-03 (baixo):** o D1 confere o nome atual do solicitante. Já existia (E11 da 01).
- **S-04 (baixo):** arquivar o v2 pendente encerra a demanda e tira o v1 da geração. Já existia.
- **Controles:** nenhum afrouxado (C-10, C-13, C-21, C-23, C-28, A-03, axe, C-36, 2FA e dupla aprovação, esta depois
  do S-01).
- **Dependências:** `pnpm audit --prod` com 5 moderadas transitivas, já existentes.
- **Dado pessoal:** nenhum dado pessoal real no diff.

## Pendências

- **Para `gestao-riscos` e um pedido futuro:** o S-02 (a `00-inicio` do `/construir` consultar `substituido` no
  Orquestrador e parar).
- **Para pedidos futuros:** S-03 (conferir também o nome em vigor quando o DEC foi criado) e S-04.
- **Para a `ux-ui-design`:**
  - revisar os textos novos (selo, aviso da T11, link, 409 do substituído, `nivelMenorQueOVigente`, frase do histórico
    e linha 6);
  - avaliar três avisos: na T11 do DEC pendente, que aprová-lo substitui o vigente; que um DEC só do CTO não substitui o
    vigente de dupla aprovação; e, na T11 do aprovado, que há um pacote mais novo pendente.
- **Para a `qa-automacao`:** num banco reaproveitado, o teste de dupla aprovação de `e2e/decisao.spec.ts` acumula
  substituições a cada execução. É esperado, e as asserções conferem só o DEC do próprio teste.
- **Para Fabiano, a primeira publicação (CA-P5-16):**
  - ler o QR da 2FA;
  - criar os segredos e a credencial do GHCR;
  - criar os serviços no Easypanel;
  - seguir a seção 4 do `deploy.md`, com snapshot no hPanel antes.

  Nenhum agente é ligado nem token é emitido antes do aceite do J-03.

## Publicação

Esta versão não tem migration nova. No push da `main`, o `deploy.yml` publica a imagem no GHCR com as tags sha, v0.1.13
e latest, e chama os webhooks do Easypanel. Os segredos dos webhooks ainda não existem, então esse passo fica vermelho e
nada vai para produção. Se for preciso voltar, o caminho A da seção 6 do `deploy.md` leva à `v0.1.12`.

Merge: pela política (`construir.mjs merge`, CA-P7-05) quando ela está ligada e permite; senão, de Fabiano. Serviço no
Easypanel é ação de Fabiano.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
