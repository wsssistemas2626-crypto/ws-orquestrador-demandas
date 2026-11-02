---
pedido: DEC-DEM-20261022-0001-v1
etapa: 08-revisao
agente: maestro
leu: [construir.md seção 3, contrato-passagem.md, 04-seguranca-aplicacao.md, 07-qa-funcional.md, 2026-10-25-ws-orquestrador-demandas-design.md, git diff main...HEAD]
status: devolvido
proximo: engenheiro-backend
devolvido_para: 08-correcao
---
## Entrega

Revisão do ramo `construcao/DEC-DEM-20261022-0001-v1` contra `main`: 625 arquivos e 115 751 linhas. Desse total,
465 arquivos e cerca de 84 mil linhas são código (`src/`, `test/`, `e2e/`, `scripts/`, `drizzle/` e configurações);
o resto é `docs/`.

Revisões usadas:

- **Código:** skill `code-review`, nível alto, só o código. A skill leu os módulos de domínio, os agentes, o worker,
  os jobs, o acesso, as rotas, os scripts e as migrations. Das telas e dos testes leu só uma parte. Os achados vieram
  da leitura e não foram reproduzidos.
- **Segurança:** a skill `security-review` não rodou, porque exige `origin/HEAD` e o repositório não tem. No lugar
  dela, conforme a seção 3 do `construir.md`, o agente `seguranca-aplicacao` revisou o mesmo diff contra o `04`
  (C-01 a C-40) e devolveu os achados na resposta, sem gravar arquivo. Ele rodou `pnpm audit --prod`, mas não rodou
  Vitest nem Playwright.

Portões da construção (últimas entregas da 06): `pnpm test` com 3.674 de 3.674, `pnpm test:e2e` inteiro com
código 0 e 117 testes, `pnpm lint`, `pnpm typecheck` e `pnpm build` limpos. Os 99 critérios de aceite têm teste
automatizado (07).

### Achados por severidade

**Crítico**

- **S-01: dependências com vulnerabilidade conhecida** (`package.json:28`, `:30`, `:37`).
  - `pnpm audit --prod` acusou 3 críticas, 3 altas, 5 moderadas e 2 baixas.
  - next 16.3.8 (≤16.4.0) tem GHSA-2464-fhr4-w9xw e GHSA-673q-mjm6-r5xr (críticas) e GHSA-p3m5-59mp-jv5r (alta,
    negação de serviço nas Server Actions, que o painel inteiro usa).
  - better-auth 1.7.6 tem GHSA-965c-763c-88jm (crítica) e GHSA-r4xp-prcw-77qf (alta). As duas são de OAuth, que este
    sistema não usa.
  - zod 4.6.5 tem GHSA-mrhx-c7xc-m3w5 (alta: esgota memória ao validar coleção grande com limite, num corpo de até
    1 MB).
  - Correção: subir next para ≥16.4.1 (com `eslint-config-next`), better-auth para ≥1.7.7 e zod para ≥4.6.6, e rodar
    a suíte inteira, em especial `sonda-mutacao-qa.test.ts` e `verificacao.test.ts`, porque `bloqueio-verificacao.ts:5`
    depende do plugin 1.7.6. Atualizar no RNF-01 e no registro do pedido a versão do Next, que estava fixada em 16.3.8.

**Alto**

- **A-01: devolver ou arquivar um DEC antigo encerra a demanda mesmo com DEC mais novo**
  (`src/modules/pacotes-decisao/decidir.ts:199`).
  - Cenário: DEC-v1 e DEC-v2 citam a mesma ESP e o mesmo RSK. O CTO aprova o v2 e depois alguém arquiva o v1. A
    demanda vai para `encerrada`, que é status final, e o DEC-v2 aprovado nunca mais leva a `aprovada`.
  - Correção: só o DEC mais novo da demanda pode ser decidido. Para os outros, a resposta é 409.
- **A-02: dois DEC da mesma demanda podem ser aprovados com opções diferentes** (`decidir.ts:190`).
  - Cenário: v1 aprovado com A e v2 com B, os dois atualizados. `gerarPedido` entrega dois Pedidos de Construção com
    decisões opostas.
  - Correção: a mesma regra de A-01; aprovar um DEC quando já existe outro aprovado na demanda é recusado.
- **A-03: o Pedido de Construção sai de DEC aprovado e desatualizado**
  (`src/modules/pedido-construcao/gerar.ts:43`).
  - Cenário: o DEC-v1 é aprovado citando a ESP-v1, e depois alguém grava a ESP-v2. Gerar o pedido do v1 continua
    dando 200 e manda ao /construir a ESP substituída. A tela mostra o botão, porque `secaoDoPedido` também ignora
    `desatualizado`.
  - Correção: `gerarPedido` recusa DEC desatualizado (409), e a tela esconde o botão.
- **A-04: o agente de consolidação escolhe o nível de aprovação** (`src/modules/agentes/schemas.ts:31`).
  - Cenário: uma injeção no texto da demanda faz o modelo devolver `nivelAprovacaoRequerido: 'cto'`. O DEC nasce
    sem a dupla aprovação nem o documento assinado (RF-14), sem decisão humana sobre o nível.
  - Correção: tirar `nivelAprovacaoRequerido` do schema de saída do agente. O nível vem de regra do servidor ou de
    pessoa, nunca do modelo. Teste com saída de agente que tente rebaixar o nível.
- **A-05: C-39 não implementado, sem CI no repositório** (não há `.github/`).
  - Cenário: dependência vulnerável ou segredo chegam à `main` sem nada barrar. A S-01 é exatamente esse caso.
  - Encaminhamento: é da etapa 09 (`devops-sre`), que cria o `.github/workflows/ci.yml`, e o `verificar` da P3 já
    exige esse arquivo. O CI precisa ter `pnpm install --frozen-lockfile`, lint, typecheck, test, test:e2e,
    `pnpm audit --prod --audit-level high`, gitleaks, actions fixadas por SHA e `permissions: contents: read`. O
    reteste (08-reteste) confere o audit; o workflow é conferido na 09 e no `verificar`.

**Médio**

- **M-01** (`entrada-agente.ts:199`): a consolidação lê o RSK da chave da execução, mas o DEC cita o RSK mais novo.
  O resumo pode vir de um parecer diferente do citado.
- **M-02** (`pacotes-decisao/criar.ts:74`): criar ESP, RSK ou DEC não confere o status da demanda. Numa demanda
  `encerrada` ou `entregue`, isso dispara agente pago, aviso por e-mail e possível Pedido.
- **M-03** (`jobs/aviso-dec-pronto.ts:26`): erro inesperado no envio gasta as novas tentativas do pg-boss sem somar
  `aviso_email.tentativas`, e o aviso fica `pendente` para sempre. Já a recusa definitiva do Resend (4xx) é tentada
  de novo.
- **M-04** (C-19, `proxy.ts:35`, `e2e/seguranca.spec.ts:86-88`): o `no-store` das páginas só é conferido no
  `next dev`, com a regra afrouxada; quem garante o `no-store` hoje é o `force-dynamic` do layout. Condição do
  tech-lead na T46: o C-19 tem de passar com `no-store` na homologação.
- **M-05** (C-21, `exigir-pessoa.ts:48`, `(painel)/layout.tsx:35-36`): erro não tratado em página ou layout sai pelo
  `console` do Next, fora do log por lista de permissão. Os parâmetros do Drizzle podem conter o token de sessão.
- **M-06** (C-10, `demandas/consultas.ts:153-164`): token de agente lê `solicitanteNome`, anexos e o nome da conta
  autora pela API, contornando a minimização do RF-20.
- **M-07** (C-37, `scripts/seed-ficticio.ts`): o seed cria contas com senha e segredo TOTP que estão no git, e a
  única guarda é `SEED_FICTICIO=1` com o banco vazio.

**Baixo**

- **B-01** (`auth.ts:94-101`): `/api/auth/update-user` continua aberto para `name`, e esse nome vai para a
  aprovação e para o Pedido.
- **B-02** (`test/estatico/exigir-pessoa.test.ts:20-23`): o teste de C-04 confere o arquivo, não cada função
  exportada.
- **B-03** (`auth.ts:118`): o limite por IP depende de o proxy mandar `x-real-ip`.
- **B-04** (`decidir.ts:132`): `referenciaDocumento` em texto livre fica no histórico imutável (C-30).
- **B-05** (`agentes/gatilhos.ts:41`): `estadoDoAgente` é calculado duas vezes na mesma transação.
- **B-06** (`limites.ts:29`): `autoriaDo` duplicada de `demandas/servico.ts:50`.
- **B-07** (`entrada-agente.ts:72`): `RE_UUID`, `RE_ID_ESP` e `RE_ID_RSK` repetidos, quando já existem em
  `versoes.ts`, `execucoes.ts` e `entradas-pendentes.ts`.

### Controles C-01 a C-40 (pelo `seguranca-aplicacao`)

Estão implementados e testados 36 controles. Três são parciais: C-19 (M-04), C-21 (M-05) e C-35
(`docker-compose.hml.yml`, que é da etapa 09). Um não está implementado: C-39 (A-05). Não houve achado de injeção
SQL, de comando ou de cabeçalho, de XSS, de CSRF, de autorização nem de segredo no histórico. O gerador de QR
próprio (`src/lib/qr.ts`) foi conferido e não tem risco de segurança.

## Decisões tomadas

- A S-01 e as A-01 a A-04 voltam juntas ao `engenheiro-backend` na 08-correcao: todas estão no servidor ou no
  `package.json`, e o reteste confere o conjunto de uma vez.
- A A-05 vai para a 09, e não para a 08-correcao: criar o CI é tarefa do `devops-sre`, e o `verificar` da P3 já o
  exige.
- As severidades dos achados de código foram dadas pelo maestro, porque a skill não as dá. A-01 a A-03 ficaram como
  Alto por quebrarem a integridade da decisão (demanda encerrada sem volta, dois Pedidos opostos, Pedido de conteúdo
  substituído). A-04 ficou como Alto por dispensar a dupla aprovação (RF-14) a partir da saída do modelo.
- A troca de versão do Next, do better-auth e do Zod corrige vulnerabilidade conhecida. É troca de versão de
  dependência que já existe, não dependência nova. Se a lista **Pode** do engenheiro recusar o `pnpm` que instala,
  o bloqueio vai a Fabiano.

## Pendências

- Devolvido ao engenheiro-backend por 1 Crítico e 4 Altos: S-01 (subir next ≥16.4.1 e eslint-config-next, better-auth ≥1.7.7 e zod ≥4.6.6 em `package.json:28,30,37`), A-01 e A-02 (só o DEC mais novo da demanda pode ser decidido, e nunca dois aprovados, em `src/modules/pacotes-decisao/decidir.ts:190,199`), A-03 (`gerarPedido` e a tela recusam DEC desatualizado, em `src/modules/pedido-construcao/gerar.ts:43`) e A-04 (o nível de aprovação sai do schema do agente, em `src/modules/agentes/schemas.ts:31`). Cada um com teste que falha antes da correção.
- Para o `devops-sre` (09): A-05, o CI completo do C-39, e o `docker-compose.hml.yml` do C-35.
- Para Fabiano, na P3: decidir se os médios M-01 a M-07 entram numa correção antes do merge ou vão a `gestao-riscos`
  como risco residual. O `seguranca-aplicacao` não aceita risco residual sozinho. Ler o QR com o Google e o
  Microsoft Authenticator (cenário U-01 do 07).
- Para o backlog: B-01 a B-07.
- Para a `ux-ui-design`: os textos QF-01 e D-01 a D-06 do 07.

## Critério de pronto atendido

- [x] escopo conferido com `git diff main...HEAD --stat`
- [x] revisão de código feita (skill `code-review`, nível alto)
- [x] revisão de segurança feita (agente `seguranca-aplicacao`, porque a skill `security-review` exige `origin/HEAD`)
- [x] achados registrados por severidade, com a revisão usada
- [x] achado crítico ou alto devolvido ao engenheiro dono, com médio e baixo em Pendências
