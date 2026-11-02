---
pedido: DEC-DEM-20261022-0001-v1
etapa: 08-reteste
agente: seguranca-aplicacao
leu: [contrato-passagem.md, 08-seguranca-aplicacao.md (passada anterior, 070aee2), 08-correcao-engenheiro-backend.md, git log, git show 643168d, git diff 070aee2..643168d de pnpm-lock.yaml e pnpm-workspace.yaml, pnpm-lock.yaml (linhas 155-169, 4225-4239, 4355-4374, 8015-8032)]
status: pronto
proximo: devops-sre
devolvido_para: null
---
## Entrega

Segunda passada do reteste. A primeira (commit `070aee2`) fechou a A-01 até a A-04, aceitou os três desvios e devolveu
só a S-01. Entre `070aee2` e `643168d` entraram 5 commits de `08-correcao`. O `HEAD` do ramo é
`643168d8e9188a6b1f275dccafddf192a9f53aa9` e a árvore está limpa, então o `pnpm audit` rodou sobre o lockfile
commitado. A diferença desde `070aee2` mexe em só 4 arquivos: `pnpm-lock.yaml`, `pnpm-workspace.yaml`, a entrega da
correção e o `passagens.jsonl`. Nenhum código nem teste mudou, e por isso a A-01 até a A-04 continuam fechadas, com a
evidência da passada anterior. A A-05 (CI) é da 09 e fica fora deste reteste.

### Veredito por achado crítico ou alto

| Achado | Veredito | Evidência |
|---|---|---|
| S-01 (crítico) | **Fechado** | `pnpm audit --prod --audit-level high` termina com código 0 e mostra "5 vulnerabilities found, Severity: 5 moderate", sem nenhuma alta nem crítica. A GHSA-mrhx-c7xc-m3w5 (zod <4.6.6) saiu. `pnpm-workspace.yaml:7-8` tem `overrides: zod: 4.6.6`, e `pnpm-lock.yaml:165-166` registra o mesmo override. `pnpm-lock.yaml:4370`: o snapshot `@better-auth/core@1.7.7` agora depende de `zod: 4.6.6`, e `:4360` e `:4366` resolvem o `better-call` com `(zod@4.6.6)`. `pnpm-lock.yaml:4231-4238` (`packages:`) e `:8027-8031` (`snapshots:`): a única versão do pacote `zod` é a 4.6.6. A entrada `zod@4.6.5` sairia entre `zod-validation-error` e `zod@4.6.6` pela ordem alfabética, e não está em nenhuma das duas seções. O `git diff 070aee2 643168d -- pnpm-lock.yaml` tira as três ocorrências de 4.6.5 que existiam: a entrada de `packages:`, a dependência do `@better-auth/core` e a entrada `zod@4.6.5: {}` de `snapshots:`. |
| A-01 (alto) | Fechado (sem mudança desde `070aee2`) | `src/modules/pacotes-decisao/decidir.ts:212`, com a leitura da versão mais nova sob a trava da demanda (`:205`, `:85-88`). Testes em `decidir-versoes.test.ts:88-149`. |
| A-02 (alto) | Fechado (sem mudança desde `070aee2`) | `decidir.ts:213` e `:90-98`: 409 ao aprovar com outro DEC da demanda já aprovado, antes de gravar a aprovação parcial. Testes em `decidir-versoes.test.ts:151-180`. |
| A-03 (alto) | Fechado (sem mudança desde `070aee2`) | `src/modules/pedido-construcao/gerar.ts:46`: DEC desatualizado dá 409 sem evento. `src/components/dados-do-pedido.ts:40-41` esconde a seção e o botão. Testes em `gerar-bordas.test.ts`, `gerar.test.ts` e `dados-do-pedido.test.ts`. |
| A-04 (alto) | Fechado (sem mudança desde `070aee2`) | `src/modules/agentes/schemas.ts:31,39`: o `omit` tira `nivelAprovacaoRequerido` da saída da consolidação. `src/modules/pacotes-decisao/criar.ts:30,77`: o DEC de autoria agente nasce `cto_e_administradora`. Testes em `nivel-aprovacao.test.ts` e `executar.test.ts`. |

O engenheiro relatou `pnpm test` com 192 arquivos e 3.697 de 3.697 testes, mais `pnpm lint` e `pnpm typecheck`
limpos, depois do override. Este reteste não rodou Vitest, porque ele não está na lista **Pode**. A correção não mexe
em código, então o risco de regressão funcional está só na troca de 4.6.5 para 4.6.6, uma versão de correção do zod
que o próprio app já usava direto.

### S-01: como a correção fecha o achado

- O override fica no `pnpm-workspace.yaml`, que é onde o pnpm 12 lê a configuração. O campo `pnpm.overrides` do
  `package.json` é ignorado nessa versão, e o engenheiro o tirou de lá. Não sobrou configuração morta.
- O override vale também com `--frozen-lockfile`: se alguém mudar o lockfile sem mudar o override, o install do CI
  falha. Isso segura o zod 4.6.6 numa atualização futura do better-auth.
- Nenhuma dependência nova entrou. O `pnpm install` deu "Packages: +1 -1": trocou uma versão por outra.
- As rotas `/api/auth/*`, que são públicas antes do login, agora validam o corpo com o zod 4.6.6.

### Os três desvios além da liberação (aceitos na passada anterior, sem mudança)

1. **Cookie `Secure` pelo protocolo do `BETTER_AUTH_URL` (C-07, C-31): aceito, sem afrouxar.** `auth.ts:28` e
   `:124`; `env.ts:48-52` e `:73` recusam http fora do loopback em produção, citando só o nome da variável. O modo é
   fail-closed: produção com `http://127.0.0.1` atrás de proxy https recusa o login, sem cookie sem Secure na rede.
2. **Seed: as 6 demandas do e2e na conta `sem2fa` (C-36, C-37, M-07): aceito.** O seed passa pelo mesmo
   `criarDemanda` e `conferirLimite`, sem variável, exceção ou conta privilegiada nova. A guarda `SEED_FICTICIO=1` não
   mudou.
3. **e2e contra o build de produção e o C-19 sem a exceção de dev (M-04): aceito, e fecha a condição da T46.**
   `e2e/seguranca.spec.ts:85-86` exige `no-store` e CSP sem `'unsafe-eval'`. `e2e/servidor.ts` roda o `next build` e o
   `next start` em `127.0.0.1` com ambiente fictício montado do zero.

## Decisões tomadas

- A S-01 fecha: o critério combinado na passada anterior era o audit no nível `high` com código 0 e nenhum zod 4.6.5
  no lockfile, e os dois conferem sobre o `HEAD` commitado.
- A A-01 até a A-04 e os três desvios não foram reabertos: a correção desta volta não tocou em código nem em teste.
- As 5 moderadas do audit não bloqueiam: o portão é `--audit-level high` (C-39 e A-05). Elas vão para a decisão dos
  médios na P3.
- O `proximo` é o `devops-sre` (09), porque não sobrou achado crítico ou alto aberto.
- A conferência do lockfile foi feita com Read nas seções onde o zod aparece e com o `git diff` desde `070aee2`. A
  ferramenta Grep não estava disponível nesta sessão, e o `grep` pelo Bash está fora da lista **Pode**.

## Pendências

- Média, para o maestro, o tech-lead ou Fabiano na P3 (integridade do fluxo, não é brecha): a A-02 junto com a A-03
  pode deixar a demanda sem saída. O DEC v1 é aprovado e depois entra uma ESP ou um RSK novos (M-02: criar não confere
  o status). O v1 fica desatualizado, e o pedido dele dá 409 (A-03). O v2, que cita a versão nova, não pode ser
  aprovado, porque o v1 já está aprovado (A-02). Uma saída: recusar ESP, RSK e DEC novos numa demanda com DEC
  aprovado, o que também trata a M-02. Outra: deixar aprovar o mais novo quando o aprovado anterior estiver
  desatualizado, e nunca gerar pedido do anterior. Quem decide é o tech-lead ou Fabiano, na P3.
- Baixa: `gerarPedido` (`gerar.ts:43`) não pega a trava da demanda antes de ler `desatualizado`. Uma ESP gravada ao
  mesmo tempo pode passar por milissegundos. O efeito é o mesmo de gerar o pedido um instante antes. Fica no backlog,
  com a B-01 até a B-07.
- Para o `devops-sre` (09):
  - `BETTER_AUTH_URL` com https na homologação e na produção, porque `env.ts:73` recusa http público;
  - o CI da A-05 com `pnpm audit --prod --audit-level high` e `--frozen-lockfile`, respeitando o `overrides` do
    `pnpm-workspace.yaml`;
  - o C-19 conferido com `BASE_URL` na homologação.
- Para a documentação (10): registrar o override do zod no `pnpm-workspace.yaml` e as versões novas (Next 16.4.1,
  better-auth 1.7.7, zod 4.6.6) no RNF-01 e no padrão técnico. Quem atualizar o better-auth deve conferir se o override
  ainda é preciso.
- Para Fabiano, na P3: a M-01 até a M-07 continuam como o maestro registrou, com a M-04 resolvida no e2e local, e as 5
  moderadas do audit. Risco residual só se aceita por `gestao-riscos` e por Fabiano.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -8` — 5 commits de 08-correcao depois de 070aee2
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 643168d8e9188a6b1f275dccafddf192a9f53aa9` — entrega da correção e passagens.jsonl
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 070aee2 643168d` — 4 arquivos: entrega, passagens.jsonl, pnpm-lock.yaml e pnpm-workspace.yaml
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 070aee2 643168d -- pnpm-lock.yaml pnpm-workspace.yaml` — override zod 4.6.6; saíram as 3 ocorrências de zod 4.6.5
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas audit --prod --audit-level high` — código 0: 5 moderadas, 0 alta, 0 crítica
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -1 --format=%H HEAD` — 643168d8e9188a6b1f275dccafddf192a9f53aa9

## Critério de pronto atendido

- [x] (reteste) cada achado crítico ou alto tem veredito e evidência (arquivo:linha ou teste)
- [x] (reteste) nenhum achado crítico ou alto ficou aberto
