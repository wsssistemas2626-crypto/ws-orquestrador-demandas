---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T06-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 01-analista-requisitos.md, 06-T06-engenheiro-backend.md, 06-T06-tech-lead.md, docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md (G1 a G7 e T06), git diff c1a8e5c HEAD (commits f4eba63 e 3833c4e da T06), scripts/seed-ficticio.ts, scripts/scripts.test.ts, test/estatico/sem-controle-bidi.test.ts, src/modules/pacotes-decisao/criar.ts, src/modules/avisos/aviso-dec.ts, src/lib/fila.ts, src/db/transacao.ts, src/db/schema/decisao.ts, src/db/schema/versoes.ts, src/db/schema/demandas.ts, test/deps.ts, vitest.config.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Verificação da T06 (seed fictício das demandas dos e2e novos), sobre os commits `f4eba63` (volta 1) e `3833c4e` (volta
2, correção do U+202E). Os critérios da tarefa estão cobertos. Acrescentei três testes em `scripts/scripts.test.ts`,
num bloco novo `qa-automacao T06: estado das demandas do e2e da 0.2.0`. Cada teste semeia o próprio banco
(Testcontainers) com relógio fixo. Suíte inteira verde, lint e typecheck limpos.

### Critério da tarefa → teste que cobre

Critérios da T06 no plano: "os oito cenários no seed, idempotente, só dado fictício; `TOTAL_DEMANDAS_DO_SEED`
continua derivado; CV-01". A tarefa também dá apoio aos CA-08.1, CA-09.1, CA-12.1 e CA-12.2, que os e2e das T09 a T13
vão exercitar.

| Critério | Arquivo | Teste (`describe` > `it`) |
|---|---|---|
| Oito cenários: títulos exatos, cada um uma vez, `melhoria`, `sob_medida`, "(fictício)", "Pessoa Ficticia …", contexto preenchido | `scripts/scripts.test.ts` | `seed fictício (padrão técnico seção 9, C-37)` > `T06: os oito títulos dos e2e novos, cada um uma vez, melhoria, sob_medida e só com dado fictício` |
| As seis sem versão seguem em Nova, sem ESP, RSK nem DEC, pela conta `sem2fa`; as duas com versão em `pronta_para_decisao` | `scripts/scripts.test.ts` | `seed fictício …` > `as demandas próprias do e2e: uma por título, de títulos diferentes, sem versão nenhuma, em Nova e pela conta sem2fa` |
| `etapasDupla`: ESP v1, RSK v1 e DEC v1 de pessoa, `cto_e_administradora`, pendente, aprovação do CTO na opção A pela conta "cto" | `scripts/scripts.test.ts` | `seed fictício …` > `T06: \`etapasDupla\` tem ESP v1, RSK v1 e um DEC v1 de pessoa, cto_e_administradora, pendente, com a aprovação do CTO na opção A` |
| `etapasDupla` no estado que o CA-08.1 e o CA-09.1 leem: ESP sem dúvidas em aberto, DEC atual (cita a ESP v1 e o RSK v1), aprovação sem revisão de rascunho e sem a da administradora | `scripts/scripts.test.ts` | **novo** `qa-automacao T06 …` > `CA-08.1 e CA-09.1: \`etapasDupla\` com ESP sem dúvidas, DEC atual e só a aprovação do CTO; \`decisaoRecomendaB\` com DEC de agente atual; tudo na hora do relógio injetado` |
| `decisaoRecomendaB`: ESP, RSK e DEC de agente (rascunho), recomendação `Recomendo a opção B (fictício).`, sem aprovação nem decisão | `scripts/scripts.test.ts` | `seed fictício …` > `T06: \`decisaoRecomendaB\` tem ESP, RSK e um DEC de agente (rascunho), cuja recomendação cita a opção B`; e o teste novo acima (DEC cita a ESP e o RSK mais novos da própria demanda) |
| `textoDeTerceiro`: o título gravado tem o U+202E, e o caractere vem de código, nunca cru no fonte | `scripts/scripts.test.ts`, `test/estatico/sem-controle-bidi.test.ts` | `T06: os oito títulos …` (`toContain(String.fromCodePoint(0x202e))` e igualdade com o banco); `sem caractere de controle bidirecional cru no fonte` > os cinco testes |
| Idempotente | `scripts/scripts.test.ts` | `seed fictício …` > `T06: rodar o seed de novo não duplica demanda, versão, aprovação nem aviso`; `qa-automacao T33: borda, falha e concorrência` > `duas subidas ao mesmo tempo semeiam uma vez só (trava consultiva), e o aviso do DEC fictício entra com um job` (três DECs, três avisos, três jobs) |
| Atomicidade das versões novas (falha tardia desfaz tudo e não trava o seed seguinte) | `scripts/scripts.test.ts` | **novo** `qa-automacao T06 …` > `falha no aviso do terceiro DEC (o último passo das versões do e2e) desfaz o seed inteiro, aprovação do CTO inclusive, e o seed roda de novo` |
| Só dado fictício | `scripts/scripts.test.ts` | `T06: os oito títulos …`; `as credenciais fictícias não têm o formato do token de serviço nem e-mail fora do .test`; e o teste novo do CA-08.1, que confere "(fictício)" na ESP, no RSK e no DEC da `etapasDupla` |
| `TOTAL_DEMANDAS_DO_SEED` continua derivado | `scripts/scripts.test.ts` | **novo** `qa-automacao T06 …` > `TOTAL_DEMANDAS_DO_SEED segue derivado: uma demanda de cada tipo mais uma por título do e2e`; `seed cria contas …` (contagem no banco igual à constante) |
| CV-01 (superfícies congeladas) | comando do G4 | `git diff --stat 198e97d -- <lista do G4>` vazio; `git diff --stat 198e97d -- src/modules` vazio |

### Testes acrescentados (`scripts/scripts.test.ts`, bloco `qa-automacao T06: estado das demandas do e2e da 0.2.0`)

1. **`TOTAL_DEMANDAS_DO_SEED segue derivado …`**: a constante é `TIPOS_DEMANDA.length + Object.keys(TITULOS_DO_E2E).length`
   e a mensagem `semeado` cita o número. Se alguém escrever o total à mão, ou um título do e2e ficar sem demanda (ou o
   contrário), o teste falha.
2. **`CA-08.1 e CA-09.1 …`**: semeia um banco novo com `relogioFixo('2026-11-10T09:00:00Z')` e confere:
   - `etapasDupla`: a ESP v1 tem `duvidas_em_aberto = []`, sem o que a barra mostraria "Com dúvidas em aberto" e não
     "Feita";
   - o DEC cita `especificacao_versao = 1` e `parecer_risco_versao = 1`, as únicas versões, sem o que a barra mostraria
     "Desatualizado";
   - o DEC copia o título e a descrição `Contexto: <contexto>` da demanda;
   - a única aprovação é a do CTO, opção A, com `revisou_rascunhos = false`, gravada na hora do relógio fixo. Falta a
     administradora, que é quem age no CA-09.1;
   - ESP, RSK e DEC dessa demanda trazem "(fictício)";
   - `decisaoRecomendaB`: o DEC de agente cita a ESP v1 e o RSK v1 de agente da própria demanda;
   - relógio injetado: as 18 demandas do e2e, as ESP, os RSK e os DECs delas têm todos o mesmo `criada_em`, o do relógio
     fixo. Nada no caminho da T06 lê o relógio real.
3. **`falha no aviso do terceiro DEC …`**: a fila de verdade embrulhada, que falha no terceiro `aviso.dec-pronto`, o do
   DEC da `decisaoRecomendaB`, último passo de `criarVersoesDoE2E`. Antes de falhar, ela lê pela conexão da transação
   que já havia 23 demandas, 3 DECs e 1 aprovação: a falha vem depois da aprovação do CTO. O teste confere que:
   - o seed sobe o erro;
   - nenhuma linha fica em `user`, `account`, `two_factor`, `evento`, `demanda`, `especificacao_tecnica`,
     `parecer_risco`, `pacote_decisao`, `aprovacao`, `decisao`, `aviso_email`, `preco_modelo`, nem job
     `aviso.dec-pronto`;
   - a subida seguinte semeia por inteiro (23 demandas, 3 DECs, 1 aprovação).

   Isso prova que `registrarDecisao` e os serviços novos do seed usam a transação do seed. Antes, o teste de falha
   (T33) só quebrava o seed no preço, antes de qualquer demanda.

Os três testes são novos e passam no código de `3833c4e`. Não são teste de regressão de defeito: a T06 não tem defeito
aberto.

### Resultado

- `pnpm test scripts/scripts.test.ts`: 1 arquivo, **48 de 48** (45 de antes + 3 novos).
- `pnpm test` (suíte inteira): **219 arquivos, 4832 de 4832** (4829 da construção + 3), 0 falhas.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.

### Conferência do `git diff` da T06 (testes existentes)

Fiz a conferência em `git diff c1a8e5c HEAD -- scripts/scripts.test.ts scripts/seed-ficticio.ts`. Nenhum teste foi
apagado e nenhum ganhou `.skip`, `.only` ou `.todo`. Nenhuma asserção ficou mais fraca. Cada mudança acompanha o dado
novo:

- `TOTAL_DEMANDAS_DO_SEED` 15 → 23 e `titulos` 10 → 18: oito demandas novas, e a contagem no banco continua igual à
  constante;
- `comPacote` passou a filtrar por `demanda_titulo <> all(TITULOS_DO_E2E)`: a asserção do DEC de rascunho da T43 ficou
  igual, e os DECs novos são conferidos nos testes próprios;
- no laço das demandas do e2e, as duas com versão têm asserção própria e mais estrita (`pronta_para_decisao`, 1, 1, 1).
  As outras dezesseis seguem com a de antes;
- no teste T33 da concorrência, "um aviso e um job" virou "um aviso e um job por DEC, e exatamente três DECs". A
  conferência do DEC original continua.

Meu diff só acrescenta: um bloco `describe` novo e dois imports (`type Fila` na linha de `FILAS`, e `TIPOS_DEMANDA`).

## Decisões tomadas

- Os testes novos ficam em `scripts/scripts.test.ts`, num `describe` próprio no fim, no padrão dos casos do qa-automacao
  da T33. Arquivo novo repetiria os ajudantes (`contar`, imports do banco).
- Cada teste novo semeia o próprio banco, em vez de usar o seed do primeiro `it` do bloco "seed fictício". Assim nenhum
  depende de ordem: é a dívida Minor que a revisão já registrou para aquele bloco.
- A falha foi injetada pela fila (`Fila` é objeto simples) e não por mudança em `src/`, que está fora da minha lista
  Pode. O terceiro `aviso.dec-pronto` é o ponto mais tardio do seed que se alcança sem tocar no código.
- A leitura do estado dentro da transação, antes de falhar, transforma o comentário "a falha vem depois da aprovação" em
  asserção.
- CV-01 conferido por comando, como o G4 manda, e não por teste novo: a guarda é da revisão (tech-lead e 08).
- Não acrescentei e2e. O CA-08.1, o CA-09.1, o CA-12.1 e o CA-12.2 são de tela, das T09 a T13, e `e2e/` dessas tarefas
  é do `engenheiro-frontend` (G1). O que cabe aqui é garantir o estado do seed que eles vão ler.

## Pendências

- Para o `engenheiro-frontend` (T10 a T13), sem bloquear: o teste novo do CA-08.1 garante que a `etapasDupla` nasce com
  ESP sem dúvidas e DEC atual. Se um e2e criar ESP ou RSK nova nessa demanda, o DEC fica desatualizado e o CA-08.1 deixa
  de valer para ela. Nenhum e2e deve escrever versão nem decidir a `etapasDupla`, como a revisão já pediu.
- Minor, sem mudança (já registrada pelo tech-lead): os quatro testes T06 do bloco "seed fictício" dependem do seed feito
  no primeiro `it` do `describe`. O Vitest roda em ordem fixa e o `vitest.config.ts` não embaralha, então não há
  instabilidade hoje. Os três testes novos cobrem os mesmos estados de forma independente.
- Minor, sem mudança (já registrada pelo tech-lead): o glob de `test/estatico/sem-controle-bidi.test.ts` não varre
  `drizzle/*.sql`, `.github/workflows/*.yml`, `package.json` nem `.js` e `.mjs` fora da raiz.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261110-0015-v1`, árvore limpa no início
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -12` — commits da T06: `f4eba63` e `3833c4e`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat c1a8e5c HEAD` — código: só `scripts/scripts.test.ts`, `scripts/seed-ficticio.ts` e `test/estatico/sem-controle-bidi.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff c1a8e5c HEAD -- scripts/scripts.test.ts scripts/seed-ficticio.ts` — diff dos testes existentes conferido
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/scripts.test.ts` — 1 arquivo, 48 de 48
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 219 arquivos, 4832 de 4832
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — `scripts/scripts.test.ts`, 134 inserções e 1 remoção (a linha do import de `FILAS`)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — só `scripts/scripts.test.ts` modificado; nenhum arquivo temporário
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 198e97d -- src/proxy.ts src/proxy.test.ts next.config.ts src/app/api src/db drizzle src/modules/acesso src/worker src/jobs src/agents src/lib/auth.ts src/lib/auth-cliente.ts src/lib/qr.ts src/lib/log.ts src/lib/erros.ts src/instrumentation.ts pnpm-workspace.yaml "src/app/(painel)/configuracao/agentes/acoes.ts" "src/app/(painel)/demandas/[id]/acoes.ts" "src/app/(painel)/demandas/[id]/editar/acoes.ts" "src/app/(painel)/demandas/[id]/especificacoes/nova/acoes.ts" "src/app/(painel)/demandas/[id]/pacotes-decisao/novo/acoes.ts" "src/app/(painel)/demandas/[id]/pareceres-risco/novo/acoes.ts" "src/app/(painel)/demandas/nova/acoes.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes.ts"` — vazio (CV-01)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 198e97d -- src/modules` — vazio (CA-15.2)

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
