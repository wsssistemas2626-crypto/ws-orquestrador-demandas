# Orquestrador 0.1.12: Pedido de Construção sem nome de pessoa (recusa, confirmação na T11 e aprovadoPor com o papel) · DEC-DEM-20261104-0013-v1

## Resumo

Este é um pedido de correção (cadeia curta, risco médio) sobre a `main` (`b9e52d6`, versão 0.1.11). O ramo nasceu de
`c2340e6`, o último commit do pedido 0012, que já está dentro da `main`. Ele corrige o achado dos pareceres de 04/11:
- `gestao-riscos`, seção 5;
- `juridico-contratos`;
- `seguranca-aplicacao`, que o classificou como alto.

O achado é que o Pedido de Construção leva nomes de pessoa ao `/construir`, que roda numa assinatura pessoal, e o
JUR-2026-002, item 7.4, proíbe isso. Fabiano aprovou o pedido em 04/11 e autorizou a conclusão com commit e merge
(CA-P5-25 no backlog do `/construir`).

O que mudou:

- **Recusa por nome:**
  - O que é conferido: todo valor escrito por pessoa no pedido montado, contra o nome do solicitante da demanda travada,
    pela mesma regra da minimização (`temNome` sobre `trocarNomes`, sem cópia).
  - Campos: título, descrição, ESP, RSK, opção escolhida, sistema, repositório, critérios de aceite e definição de
    pronto.
  - Formas detectadas: nome inteiro e partes, sem acento, grudado.
  - Os rótulos do sistema não contam.
  - A recusa é um 422 só, junto com o C-28 (e-mail, telefone e CPF primeiro), com o caminho e o tipo, sem o valor, e
    nenhum evento.
- **Confirmação:**
  - O POST `/api/pacotes-decisao/:decId/pedido-construcao` e a Server Action da T11 exigem
    `confirmaSemDadoPessoal: true`, pelo mesmo schema, logo depois do `autorizar` e antes do banco.
  - O evento `pedido_gerado` grava só o booleano.
  - A T11 tem uma caixa nativa com rótulo, `aria-required`, `aria-invalid` e o erro ligado por `aria-describedby`. Com a
    caixa desmarcada, nada é enviado e o foco vai para ela.
- **aprovadoPor:** leva os papéis gravados nas aprovações, na ordem da aprovação, e não o nome.
- **Mantidos:** o CA-22.2 (mesmo DEC, mesmo pedido), o C-28, o A-03, o CA-22.4 e o 409 da demanda final, na mesma ordem.
- **Versão e documentação:** 0.1.12 em `CHANGELOG.md`, `deploy.md` (volta para a `v0.1.11` pelo caminho A), README,
  manual técnico e spec.

Sem migration, coluna, dependência ou variável de ambiente nova. Nada muda em `src/db/`, `drizzle/` nem `.github/`. O
`e2e/pedido-construcao.spec.ts` passou a marcar a caixa.

## Etapas e tempos

| Etapa | Passagens | Minutos |
|---|---|---|
| 01 reprodução (qa-funcional) | 1 | 6 |
| 02 triagem (tech-lead) | 1 | 9 |
| 03 correção (engenheiro-backend) | 3 | 39 |
| 04 regressão (qa-automacao) | 1 | 33 |
| 04 revisão (maestro) | 1 | 0 |
| 05 entrega (devops-sre) | 1 | 4 |
| 06 documentação (documentacao-tecnica) | 1 | 7 |
| **Total** | **9** | **98** |

Houve 1 bloqueio, só de leitura, liberado pela regra de 25/10. Foi na 03: um `pnpm test` com filtro `-t "a|b"`, cujo
`|` entre aspas o `conferir` leu como pipe. A 05 voltou uma vez da conferência por um erro de contrato: o campo `leu`
estava vazio.

## Verificação (`verificar`)

| Verificação | Resultado | Detalhe |
|---|---|---|
| ramo | ok | `construcao/DEC-DEM-20261104-0013-v1` |
| árvore limpa | ok | limpa |
| versão | ok | 0.1.11 → 0.1.12 |
| changelog | ok | seção 0.1.12 |
| ci | ok | `.github/workflows/ci.yml` |
| remoto | ok | github.com/wsssistemas2626-crypto/ws-orquestrador-demandas |
| test | ok | 4.415 de 4.415 |
| lint | ok | limpo |
| typecheck | ok | limpo |

## Homologação (`homologar`)

| Verificação | Resultado | Detalhe |
|---|---|---|
| subir | ok | http://127.0.0.1:3200 |
| saúde | ok | `/api/saude` respondeu 200 |
| e2e | ok | 143 passaram, contra o build de produção |
| derrubar | ok | projeto e volumes removidos |

## Ensaio de rollback (`ensaiar-rollback`)

| Verificação | Resultado | Detalhe |
|---|---|---|
| migrations da `main` | ok | nenhuma alterada |
| migrations novas | ok | nenhuma |
| versão anterior | ok | a versão da `main` respondeu 200 em 214 s |
| backup | ok | 106 KB, impressão `a5e1ecd30903d7fa` |
| versão nova | ok | a versão do ramo, sobre o banco da `main`, respondeu 200 em 37 s |
| restauração | ok | o banco ficou igual ao backup (impressão `a5e1ecd30903d7fa`) |
| volta | ok | a versão da `main` voltou sobre o banco migrado e de novo sobre o backup, e respondeu 200 em 11 s |
| ida de novo | ok | a versão do ramo, depois da volta, respondeu 200 em 42 s |
| derrubar | ok | projeto e volumes removidos |

Voltar desta versão para a anterior **não** exige restaurar o backup (`volta_sem_restaurar: true`). Nenhuma migration
altera dado existente.

## Testes

- **Unidade e integração:** 4.415 de 4.415. A 03 escreveu cada teste antes do código e os viu falhar na base, com 177
  falhas. A 04 acrescentou 1 teste e ajustou o e2e.
- **Ponta a ponta:** 143 de 143 na homologação e, na 04, 143 de 143 em três rodadas seguidas, com `retries: 0`.
- **Build:** o `pnpm build` passou na 05. O `docker build` roda na homologação e no CI.

## Achados da revisão (04)

Revisões feitas:
- o maestro leu o diff de `src/` contra a base `c2340e6`;
- o agente `feature-dev:code-reviewer` não achou nada de confiança alta;
- o agente `seguranca-aplicacao` revisou o commit da correção, `ff3697d`, conferiu o parecer dele de 04/11 e mediu o
  custo em memória.

- **Crítico, alto e médio:** nenhum.
- **B-1:** nome em minúsculas ligado por hífen ou ponto passa (`joana-ficticia`). Fica coberto pela confirmação.
- **B-2:** quem quiser esconder o nome consegue, com espaço invisível ou letra parecida. É risco que sobra.
- **B-3:** a conferência roda segurando a trava da demanda. No pior caso medido leva cerca de 1 s.
- **B-4:** o papel identifica a pessoa, porque cada papel tem uma pessoa. Está dentro do que foi aprovado.

## Pendências

- **Pedido `DEC-DEM-20261104-0014-v1`, já preparado (CA-P5-26):** o E5. Hoje, uma recusa por nome, inclusive a falsa,
  não tem saída dentro da demanda por causa do A-02. Fabiano decidiu em 04/11 pela opção (b): o DEC aprovado mais novo
  substitui o anterior.
- **Para um pedido futuro:** o B-1 (hífen e ponto no nome inteiro). Para o RSK do sistema: B-2 e B-3. Para
  `juridico-contratos`: o B-4.
- **Para Fabiano, a primeira publicação (CA-P5-16):**
  - ler o QR da 2FA;
  - criar os segredos e a credencial do GHCR;
  - criar os serviços no Easypanel;
  - seguir a seção 4 do `deploy.md`, com snapshot no hPanel antes.

  Nenhum agente é ligado nem token é emitido antes do aceite do J-03.

## Publicação

Esta versão não tem migration nova. No push da `main`, o `deploy.yml` publica a imagem no GHCR com as tags sha, v0.1.12
e latest, e chama os webhooks do Easypanel. Os segredos dos webhooks ainda não existem, então esse passo fica vermelho e
nada vai para produção. Se for preciso voltar, o caminho A da seção 6 do `deploy.md` leva à `v0.1.11`.

Merge: pela política (`construir.mjs merge`, CA-P7-05) quando ela está ligada e permite; senão, de Fabiano. Serviço no
Easypanel é ação de Fabiano.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
