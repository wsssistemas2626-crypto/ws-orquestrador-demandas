---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T06-revisao
agente: tech-lead
leu: [contrato-passagem.md, tarefas.json, 06-T06-engenheiro-backend.md, docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md (G1 a G7, T06, T07 a T12), padrao-tecnico.md (seção 12 e seção 7), git show f4eba63 (scripts/seed-ficticio.ts, scripts/scripts.test.ts), scripts/seed-ficticio.ts (seedFicticio), e2e/decisao.spec.ts (cabeçalho e idDoDecDeRascunhoDoSeed)]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T06 (seed fictício das demandas dos e2e novos), commit `f4eba63`. Sem problema Critical nem Important: a
passagem segue para a `06-T06-testes`.

### O que foi conferido

- **Escopo (G1, G4):** o commit muda só `scripts/seed-ficticio.ts` e `scripts/scripts.test.ts` (além da entrega e do
  `passagens.jsonl`). O comando do G4 (CV-01) saiu **vazio**; `git diff 198e97d --stat -- src/modules` não lista nada;
  `package.json` só traz as duas linhas da T02. Nenhuma regra de `src/modules/` mudou (Passo 3 da T06).
- **Os oito cenários da tabela da T06:** as oito chaves de `TITULOS_DO_E2E` com os títulos do plano letra a letra, tipo
  `melhoria`, linha `sob_medida`, solicitante `Pessoa Ficticia Produto`, contexto preenchido. `etapasDupla` com ESP v1,
  RSK v1, DEC v1 de pessoa `cto_e_administradora` e a aprovação da conta "cto" na opção A, sem linha em `decisao`;
  `decisaoRecomendaB` com ESP, RSK e DEC de agente (`rascunho_agente = true`) e recomendação
  `Recomendo a opção B (fictício).`; as outras seis só com a demanda. Bate com o que a T11 (CA-08.1, CA-09.1: "1 de 2
  aprovações", "Quem age: Administradora") e a T12 (CV-13 na `decisaoRecomendaB`) vão procurar.
- **U+202E (Trojan Source):** o fonte guarda a sequência de escape, não o caractere cru. Conferido com
  `git log -S'Pedido ‮ com texto'` (acha f4eba63) e `git log -G"Pedido .\{1,3\} com texto"` (vazio: nenhum
  caractere curto cru entre as palavras em `scripts/`).
- **Pelos serviços, com Zod:** toda entrada passa pelo schema da rota (`criarDemandaSchema`, `criarEspecificacaoSchema`,
  `criarParecerRiscoSchema`, `criarPacoteDecisaoSchema`, `registrarDecisaoSchema`), na mesma transação e trava
  consultiva do seed. A recomendação trocada é revalidada por `criarPacoteDecisaoSchema.parse`, sem espalhar a saída do
  agente direto.
- **Idempotência e `TOTAL_DEMANDAS_DO_SEED`:** continua derivado (`DEMANDAS.length + DEMANDAS_DO_E2E.length` = 23). A
  segunda execução devolve `recusado` pela regra de hoje (banco com demanda ou conta), e o teste novo confere as oito
  tabelas antes e depois.
- **Teste antes do código:** a entrega mostra 7 falhas no vermelho, com trecho de cada tipo de falha, e 45 de 45 depois.
  Os quatro testes novos falhariam sem o código (título ausente, `status` de `undefined`, contagens 1 em vez de 3).
- **Teste existente alterado (G3.2):** cada mudança está explicada trecho a trecho na entrega. Nenhuma asserção foi
  apagada: o "um DEC de agente fora do e2e" e o "um aviso e um job com payload só `{ decId }`" seguem provados, agora
  filtrados pelo título ou pelo id, e as contagens novas (3 DECs, 3 avisos, 3 jobs) ganharam asserção própria. Mudar a
  consulta em vez do número é a escolha certa: o número sozinho teria escondido o que o teste provava.
- **Dado fictício e segredo:** títulos com "(fictício)", "Pessoa Ficticia …", repositório `painel-ficticio`; nenhum
  segredo, valor de `.env` nem dado real.
- **Verificação própria:** `pnpm test` verde (exit 0; o log mostra `seed_ficticio` `semeado` com `quantidade: 23` e a
  segunda execução `recusado`), `pnpm typecheck` e `pnpm lint` limpos.

### Pareceres (todos Minor; nenhum bloqueia)

1. `scripts/seed-ficticio.ts:389-391` — **Desvio de autoria aceito.** O plano pede ESP, RSK e DEC da `etapasDupla` pela
   conta "cto"; o engenheiro usou a `sem2fa` (papel cto) e deixou só a aprovação com a "cto". Razão de aceitar: a regra
   aplicada é a mesma (mesma função, ator de papel cto), nenhum e2e planejado confere o autor dessas versões (CA-08.1 e
   CA-09.1 olham estado, papel que falta e link), e poupar o limite de artefatos da "cto" segue a lógica do G3.10.
   Registrado aqui para a `10-documentacao` não descrever a autoria como "cto".
2. `scripts/scripts.test.ts:476-558` — Os quatro testes novos dependem do seed feito no primeiro teste do mesmo
   `describe`. Fere a letra da seção 7 do padrão ("teste não depende de ordem"), mas repete o arranjo que os vizinhos de
   hoje já usam nesse bloco; consertar só os novos criaria dois modelos no mesmo arquivo. Fica como dívida do bloco
   inteiro (mover o seed para um `beforeAll`), não desta tarefa.
3. `scripts/scripts.test.ts:423-424` — O comparador `(x, y) => (x < y ? -1 : x > y ? 1 : 0)` aparece duas vezes
   seguidas no mesmo teste. Duplicação pequena e local; uma constante `porTexto` resolveria. Não bloqueia.

## Decisões tomadas

- Status `pronto`: o checklist da seção 12 está cumprido e os três pareceres são Minor (a seção 12 manda Minor para
  Pendências).
- Aceito o desvio de autoria da `etapasDupla` (parecer 1): o comportamento que os e2e vão ler é o pedido, e a razão do
  engenheiro (limite C-36 da "cto") segue a restrição G3.10 do próprio plano.
- Aceita a exportação de `RECOMENDACAO_DO_E2E`, fora do G7: evita que a T12/T13 copie o literal, como já se faz com
  `TITULOS_DO_E2E`.

## Pendências

- `engenheiro-frontend` (T12 e T13), sem bloquear: agora há dois DECs de agente pendentes no seed. A função
  `idDoDecDeRascunhoDoSeed` de `e2e/decisao.spec.ts` (linhas 107-114) pega o primeiro DEC pendente com `rascunhoAgente`
  da lista da API e pode passar a achar o da `decisaoRecomendaB`. Hoje nenhum teste daquela spec registra decisão nele,
  então nada quebra; mas, se a T12 ou a T13 decidir num DEC achado por essa função, a `decisaoRecomendaB` deixa de estar
  pendente para o CV-13. Caminho: na T12, trocar a busca por `demandaDoSeed(page, TITULOS_DO_E2E.<chave>)` e o DEC dela,
  ou filtrar pelo título da demanda do seed da T43; é mudança de seletor, dentro do G3.2.
- `engenheiro-frontend` (T11 a T13): a `etapasDupla` nasce em `pronta_para_decisao` com a aprovação do CTO gravada. Só
  a "administradora" completa a decisão dela; nenhum e2e deve decidi-la, porque a T11 (CA-08.1) precisa do estado
  "1 de 2 aprovações". Os e2e que gravam decisão usam `decisaoOpcaoB`, `decisaoDevolverComOpcao`,
  `decisaoCelularCto` e `decisaoCelularDupla`.
- `10-documentacao`: as versões da `etapasDupla` são da conta `sem2fa` (papel cto) e a aprovação é da "cto" (parecer 1).
- Dívida do bloco "seed fictício" de `scripts/scripts.test.ts`: testes dependentes do primeiro (parecer 2).
- `pnpm test:e2e` não roda nesta etapa (G1: comando do `engenheiro-frontend`); os e2e que leem estas demandas rodam a
  partir da T09.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat f4eba63` — 4 arquivos: a entrega, `passagens.jsonl`, `scripts/scripts.test.ts`, `scripts/seed-ficticio.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show f4eba63 -- scripts/scripts.test.ts scripts/seed-ficticio.ts` — diff revisado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -1 --name-only --format=%h -- docs/superpowers/plans` — caminho do plano
- `git -C /home/deploy/servidor/projetos/estruturaAutonoma show HEAD:docs/construcao/padrao-tecnico.md --format=` — padrão técnico, seção 12
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 198e97d -- src/proxy.ts src/proxy.test.ts next.config.ts src/app/api src/db drizzle src/modules/acesso src/worker src/jobs src/agents src/lib/auth.ts src/lib/auth-cliente.ts src/lib/qr.ts src/lib/log.ts src/lib/erros.ts src/instrumentation.ts pnpm-workspace.yaml "src/app/(painel)/configuracao/agentes/acoes.ts" "src/app/(painel)/demandas/[id]/acoes.ts" "src/app/(painel)/demandas/[id]/editar/acoes.ts" "src/app/(painel)/demandas/[id]/especificacoes/nova/acoes.ts" "src/app/(painel)/demandas/[id]/pacotes-decisao/novo/acoes.ts" "src/app/(painel)/demandas/[id]/pareceres-risco/novo/acoes.ts" "src/app/(painel)/demandas/nova/acoes.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes.ts"` — vazio (CV-01)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 198e97d --stat -- src/modules package.json` — só `package.json`, 2 inserções (T02); `src/modules` sem mudança
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S‮ --format=%h -- scripts` — f4eba63 (sem aspas: o shell buscou `u202E`)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S'‮' --format=%h -- scripts` — f4eba63
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S$'‮' --format=%h -- scripts` — f4eba63 (inconclusivo: o locale do shell pode não converter)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S$'Pedido ‮ com texto' --format=%h -- scripts/seed-ficticio.ts` — f4eba63 (idem)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S'Pedido ‮ com texto' --format=%h -- scripts/seed-ficticio.ts` — f4eba63: o escape está no fonte
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G"Pedido .\{1,3\} com texto" --format=%h -- scripts` — vazio: nenhum caractere cru
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=json --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/0a919744-0e04-42d0-bf4b-e75d6acefb82/scratchpad/t06-revisao-suite.json` — exit 0, suíte inteira verde (relatório JSON fora do repositório, numa linha só; a contagem 4824 de 4824 é a da entrega do engenheiro)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261110-0015-v1`, árvore limpa

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
