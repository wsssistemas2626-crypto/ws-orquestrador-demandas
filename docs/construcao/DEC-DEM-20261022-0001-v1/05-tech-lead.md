---
pedido: DEC-DEM-20261022-0001-v1
etapa: 05-plano
agente: tech-lead
leu: [pedido.json, 2026-10-25-ws-orquestrador-demandas-design.md, 01-analista-requisitos.md, 02-arquiteto-solucoes.md, 03-ux-ui-design.md, 04-seguranca-aplicacao.md, padrao-tecnico.md, contrato-passagem.md, construir.mjs, cadeias.mjs, permissoes.mjs, pedido.mjs, engenheiro-backend.md, engenheiro-frontend.md, engenheiro-dados-bd.md]
status: pronto
proximo: engenheiro-backend
devolvido_para: null
---
## Entrega

- Plano: `docs/superpowers/plans/2026-10-25-ws-orquestrador-demandas-plano.md` (formato writing-plans: cabeçalho,
  restrições globais G1 a G6, 46 tarefas com arquivos, interfaces, passos TDD com o código e rastreabilidade de RF e
  controles).
- Lista de tarefas: `docs/construcao/DEC-DEM-20261022-0001-v1/tarefas.json` (46 linhas, mesma ordem do plano, todas
  com `risco`; passa em `construir.mjs tarefas`).

### Fases e tarefas

| Fase | Tarefas | Engenheiros | Riscos | Por que nesta ordem |
|---|---|---|---|---|
| Fundação | T01 a T13 | backend (10), dados-bd (3) | 9 alto, 1 medio, 3 baixo | Log por lista de permissão e mapeador de erro antes de qualquer rota (C-20, C-21); guarda de privilégios com a primeira migration (C-34); autenticação, matriz e teste que percorre as rotas antes das rotas de demanda (C-01, C-02, C-04, C-09 a C-12, C-15, C-17) |
| Demandas | T14 a T17 | backend | 2 alto, 1 medio, 1 baixo | Id, serviço, rotas e entrada manual: base de todo artefato |
| Versões e decisão | T18 a T22 | backend | 2 alto, 3 medio | O caminho manual completo, sem IA, até o Pedido de Construção |
| Agentes de IA | T23 a T29 | backend | 6 alto, 1 medio | Interruptor e teto antes do provedor; provedor e minimização antes da execução; execução antes dos gatilhos |
| Avisos e retenção | T30, T31 | backend | 2 alto | Jobs do worker que dependem do DEC e da entrada |
| Operação | T32 a T35 | backend (3), dados-bd (1) | 3 alto, 1 baixo | Scripts, teste de sentinelas e desempenho com o sistema de pé |
| Painel | T36 a T46 | frontend | 6 alto, 5 baixo | Telas sobre módulos já testados; e2e e axe por tela |

Todas as fases têm tarefa de risco `alto`; no modo `por_risco` da Parada 2, o maestro para antes de cada fase depois
da primeira.

| Tarefa | Engenheiro | Risco | Tarefa | Engenheiro | Risco |
|---|---|---|---|---|---|
| T01 Esqueleto, relógio e fuso | backend | baixo | T24 Minimização e montador | backend | alto |
| T02 Log e Sentry | backend | alto | T25 Provedor de IA e fábrica | backend | alto |
| T03 Mapeador de erro e corpo | backend | baixo | T26 Prompts dos quatro agentes | backend | alto |
| T04 Banco base, acesso, histórico, guarda | dados-bd | alto | T27 Execução de agente | backend | alto |
| T05 Demanda, versões e decisão | dados-bd | alto | T28 Gatilhos e orquestrador | backend | alto |
| T06 Agentes, uso, avisos, operação | dados-bd | alto | T29 Worker, batimento, varredura | backend | medio |
| T07 Fila pg-boss | backend | medio | T30 Aviso por e-mail | backend | alto |
| T08 Better Auth fechado | backend | alto | T31 Expurgo | backend | alto |
| T09 exigirPessoa e verificação | backend | alto | T32 Scripts de conta | backend | alto |
| T10 Tokens, resolverAtor, matriz | backend | alto | T33 Scripts de token, seed, hml | backend | alto |
| T11 Adaptador de rota, cabeçalhos, saúde | backend | alto | T34 Sentinelas transversais | backend | alto |
| T12 Histórico | backend | baixo | T35 Desempenho | dados-bd | baixo |
| T13 Estáticos e matriz × rotas | backend | alto | T36 Design system, moldura, e2e | frontend | baixo |
| T14 Id, versão e trava | backend | baixo | T37 Entrar e 2FA | frontend | alto |
| T15 Serviço de demanda | backend | alto | T38 Fila | frontend | baixo |
| T16 Rotas de demanda | backend | medio | T39 Nova demanda e edição | frontend | alto |
| T17 Entrada manual | backend | alto | T40 Detalhe | frontend | alto |
| T18 ESP | backend | medio | T41 ESP no painel | frontend | baixo |
| T19 RSK | backend | medio | T42 RSK no painel | frontend | baixo |
| T20 DEC | backend | medio | T43 DEC e decisão | frontend | alto |
| T21 Decisão e dupla aprovação | backend | alto | T44 Pedido na tela de decisão | frontend | alto |
| T22 Pedido de Construção | backend | alto | T45 Agentes e teto | frontend | alto |
| T23 Interruptores, teto, preço, uso | backend | alto | T46 Transversais do painel | frontend | baixo |

### Cobertura

- Os 26 RF de 01 e as 18 RNF estão na tabela "RF de 01 → tarefas" do plano.
- Os 40 controles de 04 estão na tabela "Controles de 04 → tarefas". C-35 e C-39 ficam divididos: a parte que mora
  no código (compose de dev em `127.0.0.1`, `packageManager`, `audit:prod`, lockfile) está na T01; o
  `docker-compose.hml.yml` e os portões do CI são da `09-entrega` (G2 do plano), porque nenhum engenheiro edita
  `.github/` nem o compose da homologação.
- Cada tarefa começa pelo teste que falha. Nas três que cobrem controles já construídos (T34, T35, T46), o plano manda
  mostrar a falha provocada antes do verde.

## Decisões tomadas

- P1-a a P1-f com os padrões aprovados na Parada 1 (G4 do plano): só a própria administradora registra a aprovação dela (constante `MODO_APROVACAO_ADMINISTRADORA` deixa o outro modo a uma linha); administradora não aprova DEC de nível `cto`; sem regra mínima de nível; aprovação não muda o status da demanda; 3 tentativas com esperas de 30 s e 2 min; moeda USD.
- T-01: entrada enviada ao orquestrador fica em `entrada_pendente`, apagada quando a demanda nasce ou no expurgo; mantém `entrada_bruta` com PK = `demanda_id` e o `UPDATE` só nas três colunas de C-34.
- T-02: as conferências do pg-boss 12.34.0 viraram testes de integração da T07, com caminho alternativo escrito; as filas são criadas pelo migrator no `migrate.ts`, porque `createQueue` pode exigir DDL, e o papel do app nunca ganha DDL.
- T-03: `agentesEmAndamento` vem de `execucao_agente` e `GET /api/demandas` devolve `total`; nenhuma tela lê o esquema do pg-boss.
- T-04: `scripts/desativar-conta.ts` entra na 0.1.0 (T32), porque fecha a remoção de conta da LGPD (D6) com pouco código.
- T-05: estrutura do RSK como desenhada na T08 (três pares nível + comentário, duas listas, um texto).
- Todo o modelo físico nasce na Fundação (T04 a T06), porque só o `engenheiro-dados-bd` gera migration e as tarefas de backend não podem esperar por ele no meio.
- Migrations custom com o nome `rls_<nome>`, o único formato da lista Pode do `engenheiro-dados-bd`.
- Todas as dependências do padrão instaladas na T01, porque o `engenheiro-dados-bd` não roda `pnpm add` nem edita `vitest.config.ts`.
- `src/vendor/construir/pedido.mjs` entra na T18 (não na T22), para a regra de donos de repositório da ESP vir da mesma cópia que valida o pedido, sem duplicar.
- Detectores de dado pessoal em `src/modules/dados-pessoais/`, usados pelo pedido (C-28) e pela minimização (C-23): uma regra só.
- Ordem dentro de `rota()`: parâmetro pela regex, CSRF, ator, `autorizar`, Zod, função. O 403 sai antes de qualquer consulta, e o teste da matriz passa a cobrir sozinho cada rota nova.
- Serviços aceitam a transação de quem chama (G3.8), para o worker gravar artefato, execução e job juntos (ADR-02, ADR-06).
- Opções A e B do DEC como objetos em `jsonb` validado por Zod e coluna `recomendacao`: um schema só para as duas opções.
- IP do cliente pelo `x-real-ip` (configurável), que o Traefik do Easypanel sobrescreve; a 10 confirma no `deploy.md`.
- Dados do e2e criados pela API com a conta fictícia, e contas fictícias separadas por cenário no seed, para o mesmo e2e rodar na homologação e nenhum teste depender da ordem.
- Rotas do painel `/configuracao/agentes`, `.../pareceres-risco/novo` e `.../pacotes-decisao/novo`, como a 03 (divergência da spec, seção 8).
- Testes de integração longos (T09, T13, T15 a T33) trazem o corpo dos casos principais e o roteiro dos demais no nome e no comentário; o critério de cada um está no nome do teste, e o engenheiro escreve o corpo no mesmo molde.

## Pendências

- Esta volta regrava só esta entrega, a pedido do maestro: o plano e o `tarefas.json` ficam como estavam, e nenhum comando git foi rodado.
- X-01 (Fabiano, antes da 06): confirmar se os comandos git da lista Pode dos três engenheiros (`git status`, `git diff`, `git log`) passam no `conferir` como estão escritos. O plano não depende de git, mas a entrega dos engenheiros costuma listar esses comandos.
- `09-entrega` (`devops-sre`): `Dockerfile`, `ci.yml` (lint, typecheck, test, e2e, build e os portões de C-39), `deploy.yml`, `docker-compose.hml.yml` (usando `scripts/hml/criar-papeis.sql` e `pnpm start:hml` da T33; `db` sem publicação, C-35) e `.env.example` com os nomes de G6.
- `10-documentacao` (`documentacao-tecnica`): README, manual técnico, `deploy.md` com os itens de O-01 e as pré-condições para ligar agente (04, seção 5, item 7), CHANGELOG 0.1.0.
- T45 tem três textos que a 03 não previu (último expurgo, worker sem sinal, duas instâncias); o plano manda escrevê-los no estilo de 03, 2.8 e registrar na entrega. Se o maestro preferir, a `ux-ui-design` revisa na 07 ou na 08.
- T36 e T09 são as maiores tarefas (perto de dois dias); se a construção estourar, a quebra natural é T36 em componentes e moldura + infraestrutura do e2e, e T09 em `exigirPessoa` + bloqueio da verificação.
- J-01, J-02, J-03, O-02 e F-01 da spec seguem com as áreas donas; nenhuma bloqueia a construção.

## Comandos executados

- `node /home/deploy/servidor/projetos/estruturaAutonoma/ferramentas/construir/construir.mjs tarefas /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261022-0001-v1/tarefas.json` — `{ "ok": true, "erros": [] }`

## Critério de pronto atendido

- [x] (05) cada RF de 01 e cada controle de 04 é coberto por ao menos uma tarefa
- [x] (05) cada tarefa do plano começa pelo teste que falha
- [x] (05) `tarefas.json` passa em `construir.mjs tarefas` e tem as tarefas do plano, na mesma ordem
- [x] (05) toda tarefa tem `risco`, pela regra da Entrega
