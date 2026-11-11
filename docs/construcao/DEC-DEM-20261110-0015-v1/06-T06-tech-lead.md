---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T06-revisao
agente: tech-lead
leu: [contrato-passagem.md, tarefas.json, 06-T06-engenheiro-backend.md, docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md (G1 a G7, T06, T07 a T12), padrao-tecnico.md (seção 12 e seção 7), git show f4eba63 (scripts/seed-ficticio.ts, scripts/scripts.test.ts), scripts/seed-ficticio.ts (linhas 159-162, criarVersoesDoE2E, seedFicticio), scripts/scripts.test.ts (linhas 420-427, 476-479, 550-558), e2e/decisao.spec.ts (cabeçalho e idDoDecDeRascunhoDoSeed)]
status: devolvido
proximo: engenheiro-backend
devolvido_para: 06-T06-construcao
---
## Entrega

Revisão da T06 (seed fictício das demandas dos e2e novos), commit `f4eba63`. Volta 2: além de tirar o comando do
padrão técnico de "Comandos executados", como o maestro pediu, **o status mudou de `pronto` para `devolvido`**. Ao
regravar, vi que a conferência do U+202E da volta 1 estava errada (explicação no parecer 1). Com o que dá para ver só
lendo os arquivos, o fonte guarda o **caractere de controle de direção cru**, e não a sequência de escape que a
entrega do engenheiro descreve. Isso é Important e bloqueia a passagem. O resto da tarefa está certo e não precisa ser
refeito.

### O que foi conferido e está certo

- **Escopo (G1, G4):** o commit muda só `scripts/seed-ficticio.ts` e `scripts/scripts.test.ts` (além da entrega e do
  `passagens.jsonl`). O comando do G4 (CV-01) saiu **vazio**; `git diff 198e97d --stat -- src/modules` não lista nada;
  `package.json` só traz as duas linhas da T02. Nenhuma regra de `src/modules/` mudou.
- **Os oito cenários da tabela da T06:** as oito chaves de `TITULOS_DO_E2E` com os títulos do plano, tipo `melhoria`,
  linha `sob_medida`, solicitante `Pessoa Ficticia Produto`, contexto preenchido. `etapasDupla` com ESP v1, RSK v1, DEC
  v1 de pessoa `cto_e_administradora` e a aprovação da conta "cto" na opção A, sem linha em `decisao`;
  `decisaoRecomendaB` com ESP, RSK e DEC de agente (`rascunho_agente = true`) e recomendação
  `Recomendo a opção B (fictício).`; as outras seis só com a demanda. Bate com o que a T11 (CA-08.1, CA-09.1) e a T12
  (CV-13) vão procurar.
- **Pelos serviços, com Zod:** toda entrada passa pelo schema da rota, na mesma transação e trava consultiva do seed; a
  recomendação trocada é revalidada por `criarPacoteDecisaoSchema.parse`.
- **Idempotência e `TOTAL_DEMANDAS_DO_SEED`:** continua derivado (23); a segunda execução devolve `recusado`, e o teste
  novo confere as oito tabelas antes e depois.
- **Teste antes do código:** 7 falhas no vermelho com trecho, 45 de 45 depois; os quatro testes novos falhariam sem o
  código.
- **Teste existente alterado (G3.2):** cada mudança explicada trecho a trecho; nenhuma asserção apagada; o que o teste
  provava continua provado, filtrado pelo título ou pelo id.
- **Dado fictício e segredo:** só dado inventado; nenhum segredo nem valor de `.env`.
- **Verificação própria (volta 1):** `pnpm test` verde (exit 0; no log, `seed_ficticio` `semeado` com
  `quantidade: 23` e a segunda execução `recusado`), `pnpm typecheck` e `pnpm lint` limpos.

### Pareceres

1. **Important** — `scripts/seed-ficticio.ts:162` e `scripts/scripts.test.ts:478`: o título `textoDeTerceiro` tem o
   caractere U+202E (RIGHT-TO-LEFT OVERRIDE) **cru** dentro do literal, e não a sequência de escape.
   - **Razão:** é o padrão "Trojan Source" (CVE-2021-42574). Em editor, no diff do GitHub e na revisão, o resto da
     linha depois do caractere aparece invertido, inclusive o fecho `',` do literal: quem revisa não vê com segurança
     onde a string acaba. O GitHub marca o arquivo com o aviso de texto bidirecional, e a `08-revisao` com
     `/security-review` vai apontar o mesmo. A entrega diz o contrário ("escrito como escape, para o caractere
     invisível não ficar cru no fonte"), então a decisão registrada não é a que está no código.
   - **Causa provável:** a ferramenta de edição recebe o texto em JSON; a sequência barra-u-202E digitada no
     parâmetro é decodificada para o próprio caractere antes de chegar ao arquivo. Aconteceu também nesta revisão: as
     buscas da volta 1 que eu achei que procuravam o escape procuraram o caractere cru, e a busca com `-G` não provava
     nada, porque o `git log -G` usa regex estendida e `\{1,3\}` virou chave literal. A leitura de
     `scripts/seed-ficticio.ts:162`, de `scripts/scripts.test.ts:478` e do meu próprio rascunho (onde o escape digitado
     também virou o caractere) aponta o caractere cru no fonte.
   - **Caminho para o engenheiro** (só `scripts/` e `test/`, como no G1):
     1. Teste que falha primeiro: `test/estatico/sem-controle-bidi.test.ts`, que varre `src/`, `scripts/`, `test/` e
        `e2e/` (`.ts`, `.tsx`, `.css`) e reprova qualquer caractere de U+202A a U+202E e de U+2066 a U+2069, dizendo
        arquivo e linha. Monte a classe da regex com `String.fromCodePoint(0x202a)` etc. e `new RegExp(...)`, nunca
        com o caractere nem com escape digitado. Um caso plantado (texto montado com `String.fromCodePoint(0x202e)`)
        prova que a regra reprova. Rode e veja falhar nas duas linhas acima.
     2. Correção: em `TITULOS_DO_E2E`, monte o título com o caractere vindo de código, por exemplo uma constante
        `const RLO = String.fromCodePoint(0x202e);` e o título em template literal. Se o `as const` perder o tipo
        literal dessa chave, tudo bem: nenhum consumidor depende do literal. **Não digite** a sequência barra-u em Edit
        ou Write: ela vira o caractere de novo. No teste de `scripts/scripts.test.ts:478`, compare com o mesmo título
        montado da mesma forma (ou com `TITULOS_DO_E2E.textoDeTerceiro`, mais
        `expect(TITULOS_DO_E2E.textoDeTerceiro).toContain(String.fromCodePoint(0x202e))`, para o e2e continuar recebendo
        o caractere).
     3. Corrija também o comentário de `scripts/seed-ficticio.ts:160`, que cita `VERSOES_DO_E2E` (o nome não existe; a
        função é `criarVersoesDoE2E`).
     4. `pnpm test`, `pnpm lint`, `pnpm typecheck` verdes; na entrega, o trecho da falha do teste novo e a nota de que
        o título gravado no banco continua com o U+202E (o teste T06 de títulos já confere isso).

2. Minor — `scripts/seed-ficticio.ts:389-391`: **desvio de autoria aceito.** O plano pede ESP, RSK e DEC da
   `etapasDupla` pela conta "cto"; o engenheiro usou a `sem2fa` (papel cto) e deixou a aprovação com a "cto". A regra
   aplicada é a mesma, nenhum e2e planejado confere o autor dessas versões, e poupar o limite da "cto" segue o G3.10.
3. Minor — `scripts/scripts.test.ts:476-558`: os quatro testes novos dependem do seed feito no primeiro teste do mesmo
   `describe`, como os vizinhos de hoje. Dívida do bloco inteiro (seed num `beforeAll`), não desta tarefa.
4. Minor — `scripts/scripts.test.ts:423-424`: o comparador `(x, y) => (x < y ? -1 : x > y ? 1 : 0)` repetido duas
   vezes seguidas; uma constante resolveria.

## Decisões tomadas

- Status `devolvido`, e não `pronto` como pedia o motivo da volta 2: o parecer 1 é Important, e a seção 12 manda
  Important bloquear. Entregar `pronto` sabendo da falha na conferência seria registrar uma verificação que não houve.
- Não rodei comando nesta volta, como o maestro pediu: a conclusão do parecer 1 vem da leitura dos arquivos. O
  engenheiro confirma com o teste estático do passo 1, que reprova se eu estiver certo e passa se não estiver; nos
  dois casos, o teste fica como guarda.
- Aceito o desvio de autoria da `etapasDupla` e a exportação de `RECOMENDACAO_DO_E2E` (fora do G7, evita que a
  T12/T13 copie o literal).

## Pendências

- Devolvido à `06-T06-construcao`: U+202E cru em `scripts/seed-ficticio.ts:162` e `scripts/scripts.test.ts:478` (Trojan Source); caminho no parecer 1.
- Maestro: o motivo da volta 2 pedia `pronto`. Mudei para `devolvido` pelo parecer 1, que corrige a conferência da
  volta 1. Os outros itens da revisão continuam valendo e não precisam ser refeitos.
- `engenheiro-frontend` (T09 a T13): ao usar `TITULOS_DO_E2E.textoDeTerceiro` nos e2e, importe a constante e nunca
  copie o título; vale o mesmo cuidado com a sequência barra-u em Edit e Write.
- `engenheiro-frontend` (T12 e T13), sem bloquear: agora há dois DECs de agente pendentes no seed. A função
  `idDoDecDeRascunhoDoSeed` de `e2e/decisao.spec.ts` (linhas 107-114) pode passar a achar o da `decisaoRecomendaB`;
  se a T12 ou a T13 decidir num DEC achado por ela, o CV-13 perde a demanda pendente. Trocar pela busca do DEC da
  demanda do seed pelo título (mudança de seletor, dentro do G3.2).
- `engenheiro-frontend` (T11 a T13): nenhum e2e deve decidir a `etapasDupla`, que a T11 (CA-08.1) precisa em
  "1 de 2 aprovações".
- `10-documentacao`: as versões da `etapasDupla` são da conta `sem2fa` (papel cto) e a aprovação é da "cto".
- Dívida do bloco "seed fictício" de `scripts/scripts.test.ts`: testes dependentes do primeiro (parecer 3).

## Comandos executados

Nenhum nesta volta 2. Os da volta 1:

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat f4eba63` — 4 arquivos: a entrega, `passagens.jsonl`, `scripts/scripts.test.ts`, `scripts/seed-ficticio.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show f4eba63 -- scripts/scripts.test.ts scripts/seed-ficticio.ts` — diff revisado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -1 --name-only --format=%h -- docs/superpowers/plans` — caminho do plano
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 198e97d -- src/proxy.ts src/proxy.test.ts next.config.ts src/app/api src/db drizzle src/modules/acesso src/worker src/jobs src/agents src/lib/auth.ts src/lib/auth-cliente.ts src/lib/qr.ts src/lib/log.ts src/lib/erros.ts src/instrumentation.ts pnpm-workspace.yaml "src/app/(painel)/configuracao/agentes/acoes.ts" "src/app/(painel)/demandas/[id]/acoes.ts" "src/app/(painel)/demandas/[id]/editar/acoes.ts" "src/app/(painel)/demandas/[id]/especificacoes/nova/acoes.ts" "src/app/(painel)/demandas/[id]/pacotes-decisao/novo/acoes.ts" "src/app/(painel)/demandas/[id]/pareceres-risco/novo/acoes.ts" "src/app/(painel)/demandas/nova/acoes.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes.ts"` — vazio (CV-01)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 198e97d --stat -- src/modules package.json` — só `package.json`, 2 inserções (T02); `src/modules` sem mudança
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S<U+202E> --format=%h -- scripts` — f4eba63 (o caractere cru chegou ao comando no lugar do escape digitado; aqui escrito por extenso)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S'<U+202E>' --format=%h -- scripts` — f4eba63 (idem)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S$'<U+202E>' --format=%h -- scripts` — f4eba63 (idem)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S$'Pedido <U+202E> com texto' --format=%h -- scripts/seed-ficticio.ts` — f4eba63 (idem)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S'Pedido <U+202E> com texto' --format=%h -- scripts/seed-ficticio.ts` — f4eba63 (idem: confirma o caractere cru, não o escape)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G"Pedido .\{1,3\} com texto" --format=%h -- scripts` — vazio, mas inconclusivo: `-G` usa regex estendida, e `\{1,3\}` é chave literal
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=json --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/0a919744-0e04-42d0-bf4b-e75d6acefb82/scratchpad/t06-revisao-suite.json` — exit 0, suíte inteira verde
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261110-0015-v1`, árvore limpa

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
