---
pedido: DEC-DEM-20261022-0001-v1
etapa: 08-reteste
agente: seguranca-aplicacao
leu: [contrato-passagem.md, 08-maestro.md, 08-correcao-engenheiro-backend.md, git log e git diff 84bc738..ead47f3, package.json, pnpm-lock.yaml, src/lib/env.ts, src/lib/env.test.ts, src/lib/env-worker.ts, src/lib/deps.ts, src/modules/acesso/auth.ts, src/modules/acesso/cookies-seguros.test.ts, src/modules/pacotes-decisao/decidir.ts, src/modules/pacotes-decisao/decidir-versoes.test.ts, src/modules/pacotes-decisao/criar.ts, src/modules/pedido-construcao/gerar.ts, src/components/dados-do-pedido.ts, src/modules/agentes/schemas.ts, src/modules/agentes/executar.ts, src/modules/agentes/nivel-aprovacao.test.ts, src/agents/consolidacao.ts, scripts/seed-ficticio.ts, e2e/servidor.ts, e2e/seguranca.spec.ts, playwright.config.ts]
status: devolvido
proximo: engenheiro-backend
devolvido_para: 08-correcao
---
## Entrega

Reteste da correção de `84bc738` (o `08-maestro.md`) a `ead47f3`, em 7 commits de `08-correcao`. O `HEAD` do ramo é
`ead47f380a54c7a8787231998675a6b3de329b5d` e a árvore está limpa, então o `pnpm audit` rodou sobre o lockfile
commitado. A A-05 (CI) é da 09 e ficou fora deste reteste.

### Veredito por achado crítico ou alto

| Achado | Veredito | Evidência |
|---|---|---|
| S-01 (crítico) | **Aberto. A correção não basta.** | `pnpm audit --prod --audit-level high` termina com código 1: **1 alta** (GHSA-mrhx-c7xc-m3w5, zod <4.6.6) e 5 moderadas. O caminho é `.>better-auth>@better-auth/core>zod`, com 7 caminhos ao todo. `pnpm-lock.yaml:4370`: a entrada `@better-auth/core@1.7.7` ainda depende de `zod: 4.6.5`. `pnpm-lock.yaml:8031`: a entrada `zod@4.6.5: {}` continua no lockfile. As críticas e a alta do next e do better-auth sumiram. |
| A-01 (alto) | Fechado | `src/modules/pacotes-decisao/decidir.ts:212`: o DEC que não é o mais novo dá 409 em qualquer decisão. A versão mais nova é lida sob a trava da demanda (`:205`, `:85-88`). Testes em `decidir-versoes.test.ts:88-149`: v1 arquivado depois do v2 aprovado, v1 decidido com o v2 pendente, dupla aprovação começada no v1 e DEC já decidido. |
| A-02 (alto) | Fechado | `decidir.ts:213` e `:90-98`: aprovar quando outro DEC da demanda já está aprovado dá 409. A conferência roda antes de gravar a aprovação parcial, então nem a primeira das duas entra. Testes em `decidir-versoes.test.ts:151-180`. |
| A-03 (alto) | Fechado | `src/modules/pedido-construcao/gerar.ts:46`: DEC desatualizado dá 409 sem evento. `src/components/dados-do-pedido.ts:40-41`: a tela esconde a seção e o botão. Testes em `gerar-bordas.test.ts` (A-03, ESP v2 e RSK v2), `gerar.test.ts` (o teste de determinismo agora espera 409) e `dados-do-pedido.test.ts` (desatualizado, sem seção). |
| A-04 (alto) | Fechado | `src/modules/agentes/schemas.ts:31,39`: a saída da consolidação não tem `nivelAprovacaoRequerido`, porque o `omit` descarta a chave. `src/modules/pacotes-decisao/criar.ts:30,77`: o DEC de autoria agente nasce sempre `cto_e_administradora`, também pela rota com token de agente. `src/modules/agentes/executar.ts` (destino `consolidacao`) e `src/agents/consolidacao.ts`: o prompt não pede o campo. Testes em `nivel-aprovacao.test.ts` (schema, prompt, serviço com token de agente que tenta `cto`, mais o banco e o evento) e em `executar.test.ts` (worker com saída que tenta rebaixar o nível). |

O engenheiro relatou `pnpm test` com 3.697 de 3.697 e a e2e inteira verde duas vezes seguidas. Este reteste não rodou
Vitest nem Playwright, porque eles não estão na lista **Pode**. A evidência dos altos é o código e os testes citados.

### S-01: o que falta

O `package.json` está certo: next 16.4.1, eslint-config-next 16.4.1, better-auth 1.7.7 e zod 4.6.6. O problema está no
lockfile. A dependência transitiva `@better-auth/core@1.7.7` continua resolvida para o zod 4.6.5. A entrega da correção
diz que "o lockfile da segunda volta resolve tudo para o zod 4.6.6", mas isso não confere com o lockfile commitado.
O `@better-auth/core` valida com o zod os corpos das rotas `/api/auth/*`, que são públicas antes do login. Isso põe a
versão vulnerável no caminho de entrada sem autenticação.

Critério verificável para fechar:

1. `pnpm -C <repo> audit --prod --audit-level high` termina com código 0.
2. `pnpm-lock.yaml` não tem mais nenhuma ocorrência de `zod@4.6.5` nem `zod: 4.6.5`.
3. `pnpm test` fica verde de novo, em especial `verificacao.test.ts` e `sonda-mutacao-qa.test.ts`.

Caminho sugerido: `pnpm dedupe`. Se ele não unificar a versão, use `pnpm.overrides` com `"zod": "4.6.6"` no
`package.json`. O override segura a versão também com `--frozen-lockfile` no CI. As duas formas trocam a versão de
uma dependência que já existe; nenhuma acrescenta dependência nova.

### Os três desvios além da liberação

1. **Cookie `Secure` pelo protocolo do `BETTER_AUTH_URL` (C-07, C-31): aceito, sem afrouxar.**
   - `auth.ts:28` e `:124`: `usarCookiesSeguros` liga o Secure só com https.
   - `env.ts:48-52` e `:73`: com `NODE_ENV=production`, http fora de `127.0.0.1`, `localhost` e `[::1]` lança
     `ErroConfiguracao(['BETTER_AUTH_URL'])`. O erro cita só o nome da variável.
   - O `hostname` sai do `URL` do WHATWG. `localhost.exemplo.test`, `127.0.0.2` e IPs privados ficam de fora, o que é
     mais estrito, e o teste cobre `10.0.0.5` e `192.168.0.10`.
   - Com https, o resultado é o mesmo de antes: `__Secure-` e Secure (`cookies-seguros.test.ts`). Em desenvolvimento
     com https, o resultado ficou mais estrito do que era.
   - O app confere a regra na primeira montagem de `obterDeps` (`deps.ts:18`), e o worker no boot, por
     `lerConfigWorker`. A `criarAuth` de produção só nasce depois de `lerConfigApp`, então o modo é fail-closed.
   - Caso que sobra: produção com `BETTER_AUTH_URL=http://127.0.0.1` atrás de um proxy https. Nesse caso a origem
     confiável do Better Auth e a lista de origens das Server Actions (C-15) não batem com a origem pública, e o
     login é recusado. Continua fail-closed, sem cookie sem Secure trafegando pela rede.
   - Pendência para o `devops-sre`: homologação e produção com `BETTER_AUTH_URL` https.
2. **Seed: as 6 demandas do e2e passaram para a conta `sem2fa` (C-36, C-37, M-07): aceito.**
   - `scripts/seed-ficticio.ts`: as demandas passam pelo mesmo `criarDemanda`, com o mesmo `conferirLimite`. Não há
     variável, exceção nem conta privilegiada nova.
   - A guarda do seed não mudou: `SEED_FICTICIO=1` e o banco sem demanda e sem conta.
   - Ser autora de uma demanda não dá permissão a mais à `sem2fa`, que já tinha papel cto.
   - O DEC de agente do seed agora usa o nível da regra do servidor, o mesmo caminho do worker.
   - A M-07 continua do mesmo tamanho: nem maior, nem resolvida.
3. **e2e contra o build de produção e o C-19 sem a exceção de dev (M-04): aceito, e fecha a condição da T46.**
   - `e2e/seguranca.spec.ts:85-86`: a página e a API exigem `no-store` sempre, e a página não pode ter
     `'unsafe-eval'` na CSP, o que prova o modo de produção.
   - `e2e/servidor.ts`: o `next build` e o `next start` recebem o mesmo ambiente montado do zero, com o segredo e a
     senha de banco fictícios, em `127.0.0.1`.
   - Fica por conferir o C-19 com `BASE_URL` na homologação (09). A M-04 sai do estado parcial no e2e local.

## Decisões tomadas

- A S-01 continua aberta: o critério do maestro e o padrão da AppSec são "dependência vulnerável conhecida bloqueia o
  release", e o audit no nível `high` ainda falha sobre o lockfile commitado.
- A S-01 volta ao `engenheiro-backend`, que fez a correção, e não à 09: a correção é no lockfile, que é parte do
  achado original.
- As A-01 a A-04 fecham com evidência em código e teste. Não precisam voltar na próxima volta, salvo se a correção
  do lockfile mexer nelas.
- Os três desvios foram aceitos porque cada um é igual ou mais estrito que antes e não depende de variável nem de
  exceção de teste no código de produção.
- As 5 moderadas do audit não bloqueiam: o portão combinado é `--audit-level high` (C-39 e A-05). Elas entram na
  decisão dos médios da P3.

## Pendências

- Devolvido ao engenheiro-backend porque a S-01 (crítico) continua aberta. O `pnpm audit --prod --audit-level high` termina com código 1 por GHSA-mrhx-c7xc-m3w5 (alta): o lockfile commitado ainda resolve `@better-auth/core@1.7.7` para `zod: 4.6.5` (`pnpm-lock.yaml:4370`), e a entrada `zod@4.6.5` continua lá (`pnpm-lock.yaml:8031`). Para fechar: audit com código 0, nenhuma ocorrência de zod 4.6.5 no lockfile e `pnpm test` verde. O caminho sugerido é `pnpm dedupe` ou `pnpm.overrides` com `zod` 4.6.6.
- Nova, para o maestro e o tech-lead, de severidade média (integridade do fluxo, não é brecha): A-02 junto com A-03 pode travar a demanda. O DEC v1 é aprovado; depois entra uma ESP ou um RSK novos (M-02: criar não confere o status). O v1 fica desatualizado e o pedido dele dá 409 (A-03). O v2, que cita a versão nova, não pode ser aprovado, porque o v1 já está aprovado (A-02). A demanda fica sem saída. Uma saída possível: recusar ESP, RSK e DEC novos numa demanda com DEC aprovado, que também trata a M-02. Outra: deixar aprovar o mais novo quando o aprovado anterior está desatualizado, e nunca gerar pedido do anterior. A decisão é do tech-lead ou de Fabiano na P3.
- Baixa: `gerarPedido` (`gerar.ts:43`) não pega a trava da demanda antes de ler `desatualizado`. Uma ESP gravada ao mesmo tempo pode passar por milissegundos. O efeito é o mesmo de gerar o pedido um instante antes, e por isso não vira alto. Fica para o backlog, com os B-01 a B-07.
- Para o `devops-sre` (09): `BETTER_AUTH_URL` https na homologação e na produção (`env.ts:73` recusa http público); o CI da A-05 com `pnpm audit --prod --audit-level high` e `--frozen-lockfile`; o C-19 com `BASE_URL` na homologação.
- Para Fabiano, na P3: os médios M-01 a M-07 continuam como o maestro registrou, com a M-04 resolvida no e2e local. Risco residual só passa por `gestao-riscos` e por Fabiano.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline 84bc738..ead47f3` — 7 commits de 08-correcao
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 84bc738 ead47f3` — 37 arquivos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 84bc738 ead47f3 -- package.json src/lib/env.ts src/lib/env.test.ts src/modules/acesso/auth.ts src/modules/acesso/cookies-seguros.test.ts src/modules/pacotes-decisao/decidir.ts src/modules/pedido-construcao/gerar.ts src/components/dados-do-pedido.ts src/modules/agentes/schemas.ts src/modules/agentes/executar.ts src/agents/consolidacao.ts src/modules/pacotes-decisao/criar.ts`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas audit --prod --audit-level high` — código 1: 1 alta (zod <4.6.6 por @better-auth/core) e 5 moderadas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 84bc738 ead47f3 -- pnpm-lock.yaml`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 84bc738 ead47f3 -- src/modules/pedido-construcao/gerar-bordas.test.ts src/modules/pedido-construcao/gerar.test.ts src/components/dados-do-pedido.test.ts src/modules/agentes/nivel-aprovacao.test.ts src/modules/agentes/executar.test.ts src/modules/pacotes-decisao/decidir.test.ts test/estatico/projeto.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 84bc738 ead47f3 -- e2e/servidor.ts playwright.config.ts e2e/seguranca.spec.ts scripts/seed-ficticio.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -1 --format=%H HEAD` — ead47f380a54c7a8787231998675a6b3de329b5d
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat=200 main ead47f3 -- src/modules/acesso src/lib src/app/api/auth`

## Critério de pronto atendido

- [x] (reteste) cada achado crítico ou alto tem veredito e evidência (arquivo:linha ou teste)
- [ ] (reteste) nenhum achado crítico ou alto ficou aberto: a S-01 continua aberta, com 1 alta no audit
