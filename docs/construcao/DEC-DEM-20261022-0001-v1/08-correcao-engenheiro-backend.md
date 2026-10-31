---
pedido: DEC-DEM-20261022-0001-v1
etapa: 08-correcao
agente: engenheiro-backend
leu: [pedido.json, contrato-passagem.md, 08-seguranca-aplicacao.md, 08-correcao-engenheiro-backend.md (volta anterior), package.json, pnpm-lock.yaml, pnpm-workspace.yaml]
status: bloqueado
proximo: engenheiro-backend
devolvido_para: null
---
## Entrega

Quarta volta da 08-correcao. Ela trata só da S-01, que o reteste (`08-seguranca-aplicacao.md`) devolveu. Nada foi
alterado: a árvore do repositório continua limpa, igual ao `HEAD` que o reteste avaliou.

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
- **S-01, parte já feita:** o `package.json` está em next 16.4.1, eslint-config-next 16.4.1, better-auth 1.7.7 e
  zod 4.6.6. As críticas e a alta do next e do better-auth saíram do audit.

### S-01: por que não fechou nesta volta

O lockfile commitado ainda resolve a dependência transitiva `@better-auth/core@1.7.7` para o `zod 4.6.5`
(`pnpm-lock.yaml:4370`), e a entrada `zod@4.6.5: {}` continua no lockfile (`pnpm-lock.yaml:8031`). A entrega
anterior dizia que o lockfile resolvia tudo para o 4.6.6. Isso estava errado, e o reteste confirmou o erro.

Testei o caminho que a minha lista **Pode** permite: `pnpm.overrides` no `package.json`, com `"zod": "4.6.6"`, e
depois `pnpm install`. O pnpm 12.6.0 do projeto ignora esse campo:

```
[WARN] The "pnpm" field in package.json is no longer read by pnpm. The following keys were ignored: "pnpm.overrides".
Already up to date
```

O lockfile não mudou. Desfiz a edição do `package.json`, porque um campo que o pnpm ignora só confundiria quem lê.
No pnpm 12, o override fica no `pnpm-workspace.yaml`, onde o projeto já guarda o `allowBuilds`. Esse arquivo não está
na lista de arquivos da raiz que posso editar. O `pnpm dedupe` também está fora da lista **Pode**. Parei aqui, como
o maestro mandou.

## Decisões tomadas

- Não editei o `pnpm-lock.yaml` à mão para trocar 4.6.5 por 4.6.6. O arquivo está na lista Pode, mas o maestro pediu
  o comando do pnpm que reescreve o lockfile. A edição manual também não segura a versão numa próxima resolução.
- Prefiro o override no `pnpm-workspace.yaml` ao `pnpm dedupe`. O override segura o zod 4.6.6 também com
  `--frozen-lockfile` no CI e numa atualização futura. O `dedupe` só unifica se a faixa do `@better-auth/core` aceitar
  o 4.6.6, e não impede que a versão volte a cair.
- Não rodei `pnpm test` nem o audit nesta volta. A árvore ficou idêntica ao `HEAD` do reteste, então os resultados
  seriam os já registrados ali: audit com código 1, 1 alta. O `pnpm audit` também não está na minha lista Pode.

## Pendências

- Bloqueado: para fechar a S-01 é preciso reescrever o lockfile por um caminho fora da minha lista Pode. O pnpm 12.6.0 ignora `pnpm.overrides` no `package.json` ("The "pnpm" field in package.json is no longer read by pnpm"), e o override tem de ficar no `pnpm-workspace.yaml`. Peço liberação para uma destas duas opções (a recomendada é a 1):
  1. editar `/home/deploy/servidor/projetos/ws-orquestrador-demandas/pnpm-workspace.yaml` para acrescentar estas duas linhas:
     ```yaml
     overrides:
       zod: 4.6.6
     ```
     e depois rodar `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas install`, que já está na lista Pode;
  2. ou rodar `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas dedupe`.
- As duas opções só trocam a versão de uma dependência que já existe e não acrescentam pacote novo. Com qualquer uma,
  também é preciso liberar a conferência `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas audit --prod --audit-level high`.
  Depois dela, rodo `pnpm test`, `pnpm lint` e `pnpm typecheck` e confiro que o lockfile não tem mais `zod@4.6.5` nem
  `zod: 4.6.5`.
- Para Fabiano, na P3, sem tratar nesta volta: o achado médio novo do reteste. A-02 junto com A-03 pode deixar a
  demanda sem saída:
  - o v1 é aprovado e depois entra uma ESP ou um RSK novos;
  - o pedido do v1 dá 409, porque ele ficou desatualizado;
  - o v2 não pode ser aprovado, porque o v1 já está aprovado.
- Continuam das voltas anteriores:
  - para o `devops-sre` (09): `BETTER_AUTH_URL` https na homologação e na produção; o CI com
    `pnpm audit --prod --audit-level high` e `--frozen-lockfile`; o C-19 com `BASE_URL` na homologação;
  - documentação fora da minha lista: a versão do Next (16.4.1), do better-auth (1.7.7) e do Zod (4.6.6) no RNF-01 e
    no padrão técnico, o comentário de `bloqueio-verificacao.ts:5` e o e2e local contra `next build` e `next start`;
  - para a `ux-ui-design`: o texto das mensagens de 409 da decisão e de pedido desatualizado.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --branch` — limpo, ramo construcao/DEC-DEM-20261022-0001-v1
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas install` — "pnpm.overrides" ignorado pelo pnpm 12.6.0, "Already up to date", lockfile sem mudança
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo depois de desfazer a edição do package.json

## Critério de pronto atendido

- [ ] o teste foi escrito antes do código e visto falhando: o teste da S-01 é o audit, que falhou com código 1 no reteste; a correção não foi feita
- [ ] `pnpm test` passa: não rodou nesta volta, porque não houve mudança
- [ ] `pnpm lint` e `pnpm typecheck` passam limpos: não rodaram nesta volta, porque não houve mudança
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa (nenhum arquivo mudou)
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno (sem mudança desde o reteste)
