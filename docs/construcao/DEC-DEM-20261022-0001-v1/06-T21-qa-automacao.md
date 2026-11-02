---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T21-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G5 e T21 e T22), 01-analista-requisitos.md (glossário e RF-01 a RF-15), 06-T21-engenheiro-backend.md, git show do commit 3ebf24a, src/modules/pacotes-decisao/decidir.ts, src/modules/pacotes-decisao/schemas.ts, src/app/api/pacotes-decisao/[decId]/decisao/route.ts, src/modules/pacotes-decisao/decidir.test.ts, src/modules/pacotes-decisao/concorrencia.test.ts, src/app/api/pacotes-decisao/decisao.test.ts, src/modules/pacotes-decisao/desatualizado.ts, src/modules/demandas/transicoes.ts, src/modules/demandas/servico.ts, src/modules/demandas/schemas.ts, test/banco.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Verificação da T21 (decisão e dupla aprovação), commit `3ebf24a`. Os commits seguintes do ramo (`863bc5c`, `4b5f2c9`
e `a715de4`, da `06-T21-revisao`) só mudaram arquivos em `docs/construcao/`. O código testado é o do `3ebf24a`.

Os 66 testes do engenheiro cobrem todos os critérios da tarefa, com asserções fortes:

- corpo exato do 400 e do 409;
- conferência de "nada gravado" em `decisao`, `aprovacao` e `evento`;
- linha gravada lida pelo migrator;
- sentinelas fora do log e do histórico.

Nenhum critério ficou sem teste. Acrescentei um arquivo com 6 testes de borda e de concorrência que faltavam (ver
"Testes acrescentados").

### Critérios da tarefa e testes que os cobrem

Arquivos: **D** = `src/modules/pacotes-decisao/decidir.test.ts`, **C** = `src/modules/pacotes-decisao/concorrencia.test.ts`,
**R** = `src/app/api/pacotes-decisao/decisao.test.ts`, **B** = `src/modules/pacotes-decisao/decidir-bordas.test.ts` (novo).

| Critério | Testes |
|---|---|
| CA-13.1 (CTO aprova A, nível cto: `aprovada`, `dataAprovacao`, pessoa em `aprovadores`) | D `CA-13.1: CTO aprova A em DEC pendente, atualizado, de nível cto → aprovada, com dataAprovacao e a pessoa em aprovadores`; R `CA-13.1 pela rota: CTO aprova A → 200 com o pacote aprovado e o resultado, no-store` |
| CA-13.2 (opção C → 400) e CA-13.3 (aprovada sem opção → 400) | D `CA-13.2 e CA-13.3: opção C e aprovada sem opção → 400 (schema)`; R `CA-13.2 e CA-13.3 pela rota: opção C e aprovada sem opção → 400 com o campo, sem o valor recebido, e nada gravado` |
| CA-13.4 (rascunho de agente sem confirmação → 400, nada gravado) | D `CA-13.4: DEC do agente consolidacao sem revisouRascunhosDeAgente → 400 e nada gravado`, `%s citada também exige a confirmação` (ESP do insumo_tecnico e RSK do risco), `devolver e arquivar também exigem a confirmação quando há rascunho citado`, `sem rascunho citado, a confirmação não é exigida`; R `CA-13.4 pela rota: …`; B `com DEC rascunho de agente, a confirmação de revisão é exigida de cada aprovador, e cada aprovação guarda a sua` |
| CA-13.5 (nome da sessão, não do corpo) e C-11 | D `CA-13.5 e C-11: aprovadorNome e papelAprovacao do body são ignorados`, `C-11: nenhum campo de autoria passa pelo schema`; R `CA-13.5 e C-11 pela rota: nome, papel e autoria do corpo são ignorados` |
| CA-14.1 (só a do CTO: `pendente`, sem `dataAprovacao`) | D `CA-14.1: só com a do CTO → pendente, sem dataAprovacao e sem decisão, com a aprovação parcial visível`; R `CA-14.1 a CA-14.3 pela rota: …`; B `com só a aprovação do CTO na dupla, a demanda não vai a aprovada (409); com as duas, vai`. A parte "não gera Pedido de Construção" é da T22 (ver Pendências) |
| CA-14.2 (com a da administradora e o documento: `aprovada`, dois aprovadores) | D `CA-14.2: com a da administradora (referência e data) → aprovada com as duas em aprovadores`, `a administradora pode aprovar primeiro; a do CTO completa`; R `CA-14.1 a CA-14.3 pela rota: …`; C `CTO e administradora aprovando ao mesmo tempo a mesma opção → as duas aprovações e uma decisão aprovada` |
| CA-14.3 (administradora sem documento → 400) | D `CA-14.3: administradora sem referência ao documento → 400 com o campo, e nada gravado` (três combinações de campo faltando); R `CA-14.1 a CA-14.3 pela rota: …` |
| CA-14.4 (CTO A, administradora B → 409) | D `CA-14.4: CTO com A e administradora com B → 409 que cita o CTO, e nada gravado`, `CA-14.4 ao contrário: …`; R `CA-14.4 pela rota: …`; B `CA-14.4: CTO com A e administradora com B ao mesmo tempo → …` |
| CA-12.2 (desatualizado não aprova, 409, segue `pendente`) | D `CA-12.2 e CA-12.3: desatualizado não aprova (409, continua pendente) e devolve (aceito)`, `CA-12.2 na dupla aprovação: …`; R `CA-12.2 pela rota: DEC desatualizado → 409 ao aprovar, e continua pendente`; C `aprovação e ESP v2 ao mesmo tempo: …`, `aprovação e RSK v2 ao mesmo tempo: …` (C-13) |
| CA-12.3 (desatualizado pode ser devolvido) | D `CA-12.2 e CA-12.3: …`, `CA-12.3: desatualizado por RSK novo também arquiva` |
| CA-11.3 (segunda decisão → 409) | D `CA-11.3: segunda decisão no mesmo DEC → 409`, `CA-11.3: depois de devolvida, aprovar → 409`; R `CA-11.3 pela rota: …`; C `duas aprovações do CTO ao mesmo tempo, nível cto → …`; B `CA-11.3: duas aprovações ao mesmo tempo no nível cto → …` |
| CA-02.1 (token de agente → 403, nada muda) e C-12 | R `CA-02.1: token de cada agente (o risco inclusive) → 403, e nada muda no DEC nem no histórico`, `pessoa sem 2FA → 403; sem sessão nem token → 401; nada gravado`, `C-12 e P1-b pela rota: …`; D `C-12: ator agente e ator sistema → 403 também chamando a função direto (como o worker)`, `C-12: CTO com registrarComo administradora → 403, em qualquer nível, e nada gravado` |
| RF-07 (automáticas da decisão) e P1-d | D `devolvida leva a demanda a em_analise; arquivada a encerrada; aprovada não muda o status (P1-d)`, `a mudança automática é do ator sistema, depois do evento da decisão`; R `devolvida → 200 e a demanda volta a em_analise; arquivada → encerrada`; B `devolvida com a demanda já em em_analise (mudança manual): a decisão é gravada e não há segunda mudança de status` |
| P1-a | D `o modo da 0.1.0 é somente_propria`, `somente_propria: …`, `cto_com_referencia: …` |
| P1-b | D `P1-b e C-12: administradora em DEC de nível cto → 403, e nada gravado`, `administradora devolve ou arquiva um DEC de nível cto (só aprovar é do CTO)`; R `C-12 e P1-b pela rota: …` |
| C-13 (corrida decisão × ESP ou RSK nova) | C `aprovação e ESP v2 ao mesmo tempo: nunca DEC aprovado depois da ESP v2` (20 rodadas), `aprovação e RSK v2 ao mesmo tempo: a mesma garantia` (10 rodadas) |
| Histórico (RF-21, C-30) e log (C-21) | D `RF-21 e C-30: aprovacao_registrada e decisao_registrada com a pessoa, sem o comentário`, `decisao_registrada da devolução, sem opção e sem aprovação`; R `uma linha por requisição, com o padrão da rota; sem id, corpo, sentinela nem token` |
| G3.8 (transação de quem chama) | D `com a transação de quem chama, o rollback desfaz aprovação, decisão, eventos e status`, `com a transação de quem chama, a vista devolvida já enxerga a decisão` |

### Testes acrescentados

Arquivo novo: `src/modules/pacotes-decisao/decidir-bordas.test.ts`, com 6 testes. Os testes do engenheiro não foram
alterados.

1. `com DEC rascunho de agente, a confirmação de revisão é exigida de cada aprovador, e cada aprovação guarda a sua`:
   CA-13.4 na dupla aprovação. A confirmação do CTO não dispensa a da administradora (400 com o campo, nada gravado).
   Com as duas, `revisou_rascunhos` fica `true` nas duas linhas.
2. `com só a aprovação do CTO na dupla, a demanda não vai a aprovada (409); com as duas, vai`: liga a T21 à transição
   manual da T15 (RF-07, P1-d). A aprovação parcial não conta como DEC aprovado (409 com `MOTIVOS_TRANSICAO.semPacote`).
   Depois da segunda aprovação, a mudança à mão para `aprovada` passa.
3. `devolvida com a demanda já em em_analise (mudança manual): a decisão é gravada e não há segunda mudança de status`:
   transição automática quando a demanda já saiu de `pronta_para_decisao`. A decisão é gravada e não sai nenhum
   `status_alterado` a mais.
4. `CA-11.3: duas aprovações ao mesmo tempo no nível cto → uma passa, a outra 409; uma aprovação e uma decisão só`,
   em 10 rodadas. O teste de concorrência do engenheiro com nome parecido faz aprovar × arquivar. Este faz aprovar ×
   aprovar, o caso em que, sem a trava, ficariam duas linhas em `aprovacao`.
5. `CA-14.4: CTO com A e administradora com B ao mesmo tempo → uma aprovação parcial, a outra 409 que cita quem
   aprovou, nenhuma decisão`, em 5 rodadas.
6. `duas contas cto aprovando ao mesmo tempo na dupla → uma aprovação de papel cto, a outra 409, e o DEC segue
   pendente`, em 5 rodadas.

Os testes novos não dependem de ordem nem do relógio real:

- cada teste (e cada rodada) cria a própria demanda, num dia próprio do `relogioFixo`;
- o banco é exclusivo do arquivo (`novoBanco`);
- as corridas não supõem quem ganha: conferem o vencedor e cobram do perdedor a mensagem certa.

Dados só fictícios: contas `u-bordas-*`, e-mails `@exemplo.test`, documento `DOC-FICTICIO-BORDA`.

### Resultado

- Arquivos da T21 juntos (os 3 do engenheiro e o novo): 4 arquivos, 72 de 72.
- `pnpm test`: 101 arquivos, 1898 de 1898. Antes eram 100 arquivos e 1892 testes; a diferença são os 6 novos.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.

### Conferência de afrouxamento

- O commit `3ebf24a` não mexeu em nenhum teste que já existia: os três arquivos de teste são novos. Nenhum `.skip`,
  `.only` nem `.todo` neles.
- Depois desta etapa, `git diff --stat` sai vazio e `git status` mostra só o arquivo novo de teste. Nenhum teste foi
  apagado ou alterado.

## Decisões tomadas

- **Arquivo novo em vez de editar os do engenheiro:** o diff desta etapa fica só com testes acrescentados, e a
  conferência de que nada foi afrouxado fica imediata.
- **Não reescrevi a cobertura de schema pela rota** (`dataDocumento` fora do formato, referência com mais de 200):
  o schema já é testado direto em D, e o mapeamento Zod → 400 da `rota()` já é testado em R com `opcaoEscolhida` e
  `statusDecisao`.
- **Não testei decisão em DEC de demanda `encerrada` à mão:** nem o RF-07 nem o RF-13 dizem se isso deve ser aceito.
  Um teste agora fixaria uma regra que ninguém decidiu.
- **Retirei um teste de rascunho** ("DEC devolvido não habilita a ida a aprovada"): o 409 vinha da tabela de transições,
  `em_analise` → `aprovada` fora da tabela, e não da decisão. Era asserção que passaria por outro motivo.
- **Os testes de corrida não foram vistos falhando:** sem permissão para editar `src/` fora de `*.test.ts`, não pude
  tirar a trava para provar a falha. A garantia vem do desenho: sem `travarDemanda`, as duas transações leem
  `aprovadores` vazio e as duas gravam.

## Pendências

- **Para a T22:** a parte "não gera Pedido de Construção" do CA-14.1 só pode ser testada quando `gerarPedido` existir.
  O plano já prevê o teste: `CA-22.4: pendente, devolvida e só uma das duas aprovações → 409`.
- **Minor, para a 08:** o teste de `concorrencia.test.ts` chamado
  `duas aprovações do CTO ao mesmo tempo, nível cto → uma passa, a outra 409, uma decisão só` faz aprovar × arquivar,
  e não duas aprovações. O comportamento está certo; o nome engana. O caso de duas aprovações está agora em B (teste 4).
- **Para a 08 ou a T43, regra não decidida:** um DEC ainda `pendente` cuja demanda foi encerrada à mão aceita decisão.
  Arquivar não muda o status e não grava `status_alterado`; aprovar é aceito. Se a regra for recusar, cabe ao
  `analista-requisitos` e ao tech-lead.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 3ebf24a84a49cfe4ec68b5faf4460fb0069364d8` — 8 arquivos, 3 testes novos, nenhum teste existente alterado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo no início, ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -6` — 3 commits da `06-T21-revisao` depois do `3ebf24a`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat a715de4 4b5f2c9 863bc5c` — só `docs/construcao/`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/pacotes-decisao/decidir-bordas.test.ts` — 6 de 6
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/pacotes-decisao/decidir-bordas.test.ts src/modules/pacotes-decisao/concorrencia.test.ts src/modules/pacotes-decisao/decidir.test.ts src/app/api/pacotes-decisao/decisao.test.ts` — 72 de 72
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 1898 de 1898, 101 arquivos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — só `src/modules/pacotes-decisao/decidir-bordas.test.ts` novo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — vazio: nenhum arquivo rastreado alterado

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
