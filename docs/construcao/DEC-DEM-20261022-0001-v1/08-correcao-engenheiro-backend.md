---
pedido: DEC-DEM-20261022-0001-v1
etapa: 08-correcao
agente: engenheiro-backend
leu: [pedido.json, contrato-passagem.md, 08-seguranca-aplicacao.md, 08-correcao-engenheiro-backend.md (volta anterior), liberação do maestro para o pnpm-workspace.yaml (mensagem desta etapa), package.json, pnpm-lock.yaml, pnpm-workspace.yaml]
status: pronto
proximo: seguranca-aplicacao
devolvido_para: null
---
## Entrega

Quarta volta da 08-correcao. Ela trata só da S-01, que o reteste (`08-seguranca-aplicacao.md`) devolveu, e fecha o
achado: `pnpm audit --prod --audit-level high` agora termina com código 0, sem nenhuma alta nem crítica.

### O que as voltas anteriores já corrigiram, aceito no reteste

- **A-01:** o DEC que não é o mais novo da demanda dá 409 em qualquer decisão. A leitura da versão mais nova é feita
  sob a trava da demanda.
- **A-02:** aprovar um DEC quando outro DEC da demanda já está aprovado dá 409, antes de gravar a aprovação parcial.
- **A-03:** o pedido de um DEC desatualizado dá 409 sem gravar evento, e a tela esconde a seção e o botão.
- **A-04:** a saída da consolidação não traz mais `nivelAprovacaoRequerido`, e o DEC de autoria agente nasce sempre
  `cto_e_administradora`.
- **Desvios aceitos:**
  - cookie `Secure` pelo protocolo do `BETTER_AUTH_URL`, com a produção em http recusada fora do loopback;
  - as seis demandas do e2e no seed passaram para a conta `sem2fa`;
  - o e2e roda contra o build de produção, e o C-19 ficou sem a exceção de dev (M-04).
- **S-01, parte já feita antes:** o `package.json` está em next 16.4.1, eslint-config-next 16.4.1, better-auth 1.7.7
  e zod 4.6.6. As críticas e a alta do next e do better-auth já tinham saído do audit.

### S-01: o que mudou nesta volta

O lockfile commitado ainda resolvia a dependência transitiva `@better-auth/core@1.7.7` para o `zod 4.6.5`. A entrega
anterior dizia que tudo resolvia para o 4.6.6, e isso estava errado.

- **Primeira tentativa, desfeita:** `pnpm.overrides` no `package.json`. O pnpm 12.6.0 ignora esse campo ("The "pnpm"
  field in package.json is no longer read by pnpm"). O lockfile não mudou, e a edição saiu do `package.json`.
- **Correção, com a liberação do maestro:** acrescentei ao `pnpm-workspace.yaml`, junto do `allowBuilds` que já
  estava lá:
  ```yaml
  overrides:
    zod: 4.6.6
  ```
  Depois rodei o `pnpm install` ("Packages: +1 -1"). O `pnpm-lock.yaml` mudou em quatro pontos:
  - ganhou a seção `overrides: zod: 4.6.6`;
  - a dependência `zod` do snapshot `@better-auth/core@1.7.7` passou de `4.6.5` para `4.6.6`;
  - saiu a entrada `zod@4.6.5` de `packages:`, com a `resolution`/`integrity` dela;
  - saiu a entrada `zod@4.6.5: {}` de `snapshots:`.
- **Lockfile sem zod 4.6.5:** o `git diff -- pnpm-lock.yaml` mostra que saíram as duas únicas entradas do pacote
  `zod@4.6.5`, em `packages:` e em `snapshots:`. Sem essas entradas, nenhum `zod: 4.6.5` ou `(zod@4.6.5)` pode
  sobrar, porque a referência apontaria para um pacote que não existe e o `pnpm install` falharia. O install passou, e
  o audit não encontra mais o zod <4.6.6. Não fiz a busca com Grep porque a ferramenta não está disponível nesta
  sessão, e a regra da etapa não deixa usar `grep` pelo Bash. O reteste pode conferir com Grep.
- **Arquivos alterados:** `pnpm-workspace.yaml` (+2 linhas) e `pnpm-lock.yaml` (+5 e −5 linhas, gerado pelo pnpm).
  Nenhum código nem teste mudou.

### Resultado

| Conferência | Antes (reteste) | Depois |
|---|---|---|
| `pnpm audit --prod --audit-level high` | código 1: 1 alta (GHSA-mrhx-c7xc-m3w5) e 5 moderadas | **código 0: 0 alta, 0 crítica**, 5 moderadas |
| `pnpm test` | 3.697 de 3.697 (relatado) | **192 arquivos, 3.697 de 3.697**, 0 falhas |
| `pnpm lint` | limpo | limpo |
| `pnpm typecheck` | limpo | limpo |

`verificacao.test.ts` e `sonda-mutacao-qa.test.ts`, que o reteste citou, estão entre os 192 arquivos verdes.

### Teste visto falhando antes da correção

O teste da S-01 é o portão do audit. Antes da correção, `pnpm audit --prod --audit-level high` terminou com
código 1, apontando "1 alta (zod <4.6.6 por @better-auth/core)" no reteste sobre o mesmo `HEAD`. Esta volta não mudou
nada antes da correção, e depois dela o mesmo comando terminou com código 0. Não escrevi teste Vitest novo: a
correção é só no lockfile, e o portão do audit fica no CI da A-05, com a 09.

## Decisões tomadas

- O override ficou no `pnpm-workspace.yaml`, e não num `pnpm dedupe`, porque segura o zod 4.6.6 também com
  `--frozen-lockfile` no CI e numa atualização futura.
- Desfiz o `pnpm.overrides` do `package.json`, porque o pnpm 12 ignora o campo e ele só confundiria quem lê.
- Não editei o lockfile à mão: o `pnpm install` o reescreveu a partir do override.
- As 5 moderadas não entram nesta volta: o portão combinado é `--audit-level high`, e elas seguem para a decisão dos
  médios da P3, como o reteste registrou.

## Pendências

- Para o reteste (08-reteste, `seguranca-aplicacao`):
  - rodar de novo `pnpm audit --prod --audit-level high`;
  - conferir com Grep que o `pnpm-lock.yaml` não tem `zod@4.6.5` nem `zod: 4.6.5`.
- Para Fabiano, na P3, sem tratar nesta volta: o achado médio novo do reteste. A-02 junto com A-03 pode deixar a
  demanda sem saída:
  - o v1 é aprovado e depois entra uma ESP ou um RSK novos;
  - o pedido do v1 dá 409, porque ele ficou desatualizado;
  - o v2 não pode ser aprovado, porque o v1 já está aprovado.
- Continuam das voltas anteriores:
  - para o `devops-sre` (09):
    - `BETTER_AUTH_URL` https na homologação e na produção;
    - o CI com `pnpm audit --prod --audit-level high` e `--frozen-lockfile`, que agora tem de respeitar o
      `overrides` do `pnpm-workspace.yaml`;
    - o C-19 com `BASE_URL` na homologação;
  - documentação fora da minha lista:
    - as versões do Next (16.4.1), do better-auth (1.7.7) e do Zod (4.6.6) no RNF-01 e no padrão técnico;
    - o override do zod no `pnpm-workspace.yaml`;
    - o comentário de `bloqueio-verificacao.ts:5`;
    - o e2e local contra `next build` e `next start`;
  - para a `ux-ui-design`: o texto das mensagens de 409 da decisão e de pedido desatualizado.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --branch` — limpo, ramo construcao/DEC-DEM-20261022-0001-v1
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas install` — "pnpm.overrides" do package.json ignorado pelo pnpm 12.6.0, "Already up to date"
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo depois de desfazer a edição do package.json
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas install` — "Already up to date" (rodou antes de o Edit do pnpm-workspace.yaml gravar; sem mudança)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas install` — com o override no pnpm-workspace.yaml: "Packages: +1 -1", lockfile reescrito
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — pnpm-lock.yaml e pnpm-workspace.yaml
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -- pnpm-lock.yaml` — saíram as entradas zod@4.6.5, e @better-auth/core passou para zod 4.6.6
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 192 arquivos, 3.697 de 3.697, 0 falhas
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas audit --prod --audit-level high` — código 0: "5 vulnerabilities found, Severity: 5 moderate", nenhuma alta nem crítica
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — só pnpm-lock.yaml e pnpm-workspace.yaml alterados

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando: o portão do audit falhou com código 1 no reteste, sobre o mesmo `HEAD`, e passa com código 0 depois da correção
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno
