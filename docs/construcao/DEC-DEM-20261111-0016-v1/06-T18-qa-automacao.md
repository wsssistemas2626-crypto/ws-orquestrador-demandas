---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T18-testes
agente: qa-automacao
leu: [contrato-passagem.md, pedido.json, tarefas.json, 01-analista-requisitos.md (RF-04 a RF-16 e RNF), docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (T18), 06-T18-engenheiro-frontend.md, 06-T18-tech-lead.md, commit 0632f78 (diff de src/ e e2e/), src/app/(painel)/demandas/[id]/ConfirmarDemanda.tsx, src/app/(painel)/demandas/[id]/confirmar-demanda.test.ts, src/app/(painel)/demandas/[id]/page.tsx (linhas 34 a 53, 112 a 136 e 380 a 545), src/app/(painel)/demandas/[id]/detalhe.ts (secoes, duvidasEmAberto, rotuloResponsavel), src/components/dados-da-confirmacao.ts, src/components/Cartao.tsx, src/modules/historico/consultas.ts (AtorVisivel), e2e/confirmacao-awave.spec.ts, e2e/seguranca.spec.ts (caso IN-07), e2e/apoio.ts (semViolacoesNasDuasLarguras), scripts/seed-ficticio.ts (TITULOS_DO_E2E), playwright.config.ts, package.json, saída de pnpm test e pnpm test:e2e]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Testes da T18 (detalhe da demanda do Awave: "Origem" nos Dados, selo "Aguardando confirmação", seção "Confirmação do
Awave" com o botão, linha 14 da Próxima ação e o caso IN-07). Commit da construção `0632f78`. O código passa em todos os
testes; nada volta ao engenheiro. Rodei o `pnpm test:e2e` inteiro, que a revisão não tinha rodado, com o axe nas telas
novas.

### Critérios da tarefa e o teste que cobre cada um

| Critério | Teste (arquivo › nome) |
|---|---|
| CA-06.7: a tela mostra "aguardando confirmação" ou "confirmada" (quem e quando), e o controle só no primeiro caso | `e2e/confirmacao-awave.spec.ts` › "aguardando: selo, Próxima ação, origem, histórico e axe" e "confirmar: "Confirmando…", aviso, foco no h2, quem e quando, sem selo"; `src/app/(painel)/demandas/[id]/confirmar-demanda.test.ts` › "aguardando: selo depois do de rascunho; …" e "confirmada: sem selo nem linha 14; …"; **novo:** `confirmar-demanda-qa.test.ts` › "confirmada e depois encerrada: a seção diz quem e quando, nunca "não foi confirmada"; …" |
| CA-06.7 (status final sem confirmação, sem botão) | `e2e/confirmacao-awave.spec.ts` › "encerrada sem confirmação: sem botão, texto do status final"; `confirmar-demanda.test.ts` › "encerrada sem confirmação: …"; **novo:** `confirmar-demanda-qa.test.ts` › "entregue sem confirmação: o texto final com o rótulo de Entregue, sem botão nem selo" |
| CA-06.7 (estado de erro da 03, 5.4) | `e2e/seguranca.spec.ts` › IN-07 (controle, mensagem 409); **novo:** `e2e/confirmacao-awave-qa.spec.ts` › "erro de conflito: alerta com o prefixo e foco, botão de volta, selo e linha 14 intactos, axe nas duas larguras; nada gravado" |
| CA-10.1 no detalhe (origem certa por autoria) | `e2e/confirmacao-awave.spec.ts` › "aguardando: …" (Origem: Awave) e "demanda de pessoa: …" (Origem: Pessoa); `confirmar-demanda.test.ts` › "demanda de pessoa e de agente: "Origem" certa; …"; **novo:** `confirmar-demanda-qa.test.ts` › "demanda de agente com demanda_confirmada no histórico (dado incoerente): a origem manda, …" |
| CA-10.4 (solicitanteNome editado não muda a origem) | `confirmar-demanda.test.ts` › "Dados: "Origem" antes de "Criada por", da autoria (CA-10.4: …)"; **novo, o contrário:** `confirmar-demanda-qa.test.ts` › "o contrário do CA-10.4: demanda de pessoa com solicitanteNome "Awave" é "Pessoa", …" |
| CA-10.7 no detalhe (axe, 1280 × 720 e 390 × 844) | `e2e/confirmacao-awave.spec.ts` › aguardando, confirmada e encerrada (três `semViolacoesNasDuasLarguras`); **novo:** `e2e/confirmacao-awave-qa.spec.ts` › "erro de conflito: …" (axe com o alerta na tela) |
| RF-15 (ator de integração no histórico) | `e2e/confirmacao-awave.spec.ts` › "aguardando: …" ("Awave (prefixo ficticio)"); `confirmar-demanda.test.ts` › "histórico: o ator de integração com o prefixo (RF-15)" |
| IN-07 (Origin de outro site na Server Action) | `e2e/seguranca.spec.ts` › "IN-07: "Confirmar demanda" com Origin de outro site é recusada; …" |
| C-18 (nome só como texto) | `confirmar-demanda.test.ts` › "C-18: o nome da pessoa em "Confirmada por" sai como texto" e "o nome que contém o texto da data não desloca o <time>: …" |
| 03, seção 10 (consequência ligada ao botão) | `confirmar-demanda.test.ts` › "aguardando: três parágrafos, …" (HTML); `e2e/confirmacao-awave.spec.ts` › "aguardando: …" (atributo); **novo:** `e2e/confirmacao-awave-qa.spec.ts` › "aguardando: a descrição acessível de "Confirmar demanda" é a consequência, no computador e no celular" (árvore de acessibilidade) |
| 03, 5.1 itens 3 e 6 (ordem das seções e grade de 6 linhas) | `confirmar-demanda.test.ts` › "aguardando: …" e "grade a partir de 1200 px com seis linhas …"; **novo:** `confirmar-demanda-qa.test.ts` › "com dúvidas da entrada: Confirmação logo depois de Dados e antes de Dúvidas, …" (o único caso com as seis seções da coluna principal) |
| 03, 5.2 (botão com a largura toda no celular) | `e2e/confirmacao-awave.spec.ts` › "aguardando: …", asserção **apertada** nesta etapa (abaixo) |

### Testes acrescentados

- `src/app/(painel)/demandas/[id]/confirmar-demanda-qa.test.ts` (novo, 5 testes), HTML do servidor da página com os
  mesmos dublês do teste do engenheiro e a matriz real:
  1. confirmada e depois encerrada: "Confirmada por Bia Ficticia (CTO) em <time>", o apoio, nada de "não foi
     confirmada", sem selo, sem botão, sem linha 14, a seção em "Nesta página";
  2. entregue sem confirmação: `finalSem(ROTULO_STATUS.entregue)`, sem "Confirmada por", sem botão, sem selo;
  3. com dúvidas da entrada: h2 e "Nesta página" na ordem Dados, Confirmação do Awave, Dúvidas em aberto, Versões, Mudar
     status, Texto recebido, Histórico; grade `repeat(6,auto)`; selo e botão presentes;
  4. o contrário do CA-10.4: autoria de pessoa com `solicitanteNome: 'Awave'` dá "Origem: Pessoa", sem seção, selo,
     linha 14 nem item em "Nesta página";
  5. autoria de agente com um `demanda_confirmada` no histórico: "Origem: Agente de IA", sem seção nem "Confirmada por".
- `e2e/confirmacao-awave-qa.spec.ts` (novo, 2 testes, conta "cto", sem gravar nada):
  1. a descrição acessível do botão é o P2 da 03 em 1280 e em 390 px (`toHaveAccessibleDescription`): confere que o
     `aria-describedby` resolve no navegador, e não só que o atributo existe;
  2. erro de conflito: a chamada da Server Action vai com o id trocado pelo de uma demanda de pessoa (como o controle do
     IN-07), e a tela mostra "Não foi possível concluir: Só demanda aberta pelo Awave precisa de confirmação.", com o
     foco no alerta, o botão habilitado de novo, `aria-busy="false"`, nenhum "Demanda confirmada.", o selo e a linha 14
     intactos e exatamente uma chamada. Depois, axe nas duas larguras e nenhum `demanda_confirmada` nas duas demandas.
     Se o corpo da chamada não trouxer o id da `awaveAguardando`, a rota aborta, para nunca confirmá-la. O clique se
     repete só enquanto nenhuma chamada saiu (clique antes da hidratação), no molde do `abrirGaveta`.
- `e2e/confirmacao-awave.spec.ts`, linha 48 (Minor 2 da 06-T18-revisao): a tolerância da largura do botão em 390 px
  passou de `cartao - 2 * 24` (o preenchimento de 768 px) para `cartao - 2 * 16 - 2 - 1` (`p-4`, borda de 1 px e 1 px
  de arredondamento). A asserção ficou 15 px mais estrita; nada foi afrouxado.

### Resultados

- `pnpm test` (suíte inteira), 1ª rodada: 287 de 288 arquivos e 6342 de 6343 testes; 1 falha fora da T18:
  `src/modules/dados-pessoais/minimizar.test.ts` › "20 mil e-mails colados por "%" viram 20 mil marcadores, em menos de
  200 ms" (306 ms medidos). O arquivo sozinho passou (273 de 273), e a 2ª rodada da suíte inteira passou: **288 de 288
  arquivos, 6343 de 6343 testes, código 0**, em 209 s. Ver Pendências.
- `pnpm test:e2e` (build de produção, porta 3101, banco recém-semeado): **275 testes, 266 passaram e 9 foram pulados
  (as capturas), código 0**, em 13,4 min. O `✘` de `e2e/vigia.spec.ts:5` é o controle negativo esperado e conta entre os
  que passaram. Os 4 da T18, os 2 novos e o IN-07 passaram, com o axe sem violação em aguardando, confirmada, encerrada
  sem confirmação e no erro de conflito, em 1280 × 720 e 390 × 844. Também passaram `axe-todas`, `alvo-de-toque`,
  `detalhe-demanda` e `detalhe-a2`, que leem a T05.
- Rodada focada antes da completa (`confirmacao-awave-qa`, `confirmacao-awave` e `seguranca`): 14 de 14.
- Tempo dos testes novos e alterados: de 0,8 s a 7,4 s (o maior foi o de erro de conflito com o axe), abaixo dos 24 s.
  `retries: 0` sem mudança.
- `pnpm typecheck` e `pnpm lint`: limpos.
- `git status --short`: só os 3 arquivos desta etapa (1 alterado e 2 novos), mais esta entrega.

## Decisões tomadas

- Testes de QA em arquivos `-qa` novos, no padrão do repositório: o arquivo do engenheiro só mudou na asserção que a
  revisão pediu para apertar.
- O erro de conflito usa o mesmo reenvio com o id trocado do controle do IN-07: é o único 409 que se provoca sem gravar
  nada no seed e sem depender de outra aba.
- A rota aborta a chamada sem o id esperado: um erro no reenvio não pode confirmar a `awaveAguardando`, de que outros
  três testes dependem.
- O clique repetido só enquanto não saiu chamada evita a corrida da hidratação sem risco de envio duplo: o botão fica
  desabilitado durante o envio, e o teste confere exatamente uma chamada.
- Datas fixas nos testes de página (`2026-11-11T13:05Z` e `17:32Z`); os e2e não leem o relógio, só o formato da data.
  Nenhum teste novo depende de ordem: os e2e acham as demandas pelo título e não gravam.
- Não mexi em `minimizar.test.ts`: subir o limite de 200 ms seria afrouxar a asserção, e o teste não é da T18.

## Pendências

- Nenhuma bloqueia a T18.
- Para `tech-lead` e `qualidade` (teste instável fora da T18): `src/modules/dados-pessoais/minimizar.test.ts:642`, "20
  mil e-mails colados por "%" … em menos de 200 ms", mede o relógio real (`performance.now()`) e falhou com 306 ms na
  suíte inteira, com os 288 arquivos disputando CPU; sozinho e na 2ª rodada passou. Pela regra, teste intermitente se
  resolve na hora. Sugestão: medir a complexidade sem relógio (contar operações ou comparar 10 mil com 20 mil e exigir
  crescimento linear) ou isolar o arquivo num projeto do Vitest sem paralelismo. Fica para uma tarefa própria (T13, T20
  ou a 08), com o dono do teste, porque mudar o limite afrouxaria a asserção.
- Minor 3 da 06-T18-revisao (`ehServerAction` copiado à mão): o arquivo novo `e2e/confirmacao-awave-qa.spec.ts` traz a
  sexta cópia, igual à do IN-07. Juntar todas num ajudante de `e2e/apoio.ts` cabe numa tarefa só de testes, para não
  mexer em cinco specs nesta etapa.
- Minor 1 da 06-T18-revisao (comentário "Os 12 itens" em `page.tsx`) é código de `src/`, fora da minha lista Pode;
  segue para a T20 ou a 08.
- Para a `07-qa-funcional` (G2): seguem as conferências à mão do engenheiro e da revisão (leitor de tela no botão, o
  anúncio "Demanda confirmada." e o foco no `h2`; o 409 com a demanda encerrada em outra aba; zoom de 200 % e 400 %).
- Para a T20: a regra "e2e verde três vezes seguidas" vale para a suíte toda; esta etapa rodou uma vez a completa e uma a
  focada.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261111-0016-v1`, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 0632f78b3c5b9388d935d33b6e8a0d790d81f495~1 0632f78b3c5b9388d935d33b6e8a0d790d81f495` — 8 arquivos: 6 de `src/` e `e2e/`, a entrega e o `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -1 --format=%h -L "/^#.*T18/,+140:docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md"` — a T18 do plano
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -4 --name-only --format=%h%x20%s -- docs/construcao/DEC-DEM-20261111-0016-v1` — as entregas da T18 (construção e revisão)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 0632f78b3c5b9388d935d33b6e8a0d790d81f495~1 0632f78b3c5b9388d935d33b6e8a0d790d81f495 -- e2e/seguranca.spec.ts "src/app/(painel)/demandas/[id]/page.tsx" "src/app/(painel)/demandas/[id]/detalhe.test.ts"` — o IN-07, a página e a linha de `detalhe.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -1 --format=%h -L "/export const TITULOS_DO_E2E/,+45:scripts/seed-ficticio.ts"` — as demandas do seed
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -1 --format=%h -L "/export function duvidasEmAberto/,+25:src/app/(painel)/demandas/[id]/detalhe.ts"` — quando a seção de dúvidas aparece
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -1 --format=%h -L "/export async function semViolacoesNasDuasLarguras/,+30:e2e/apoio.ts"` — o axe nas duas larguras
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -1 --format=%h -L "/secoes: /,+12:src/app/(painel)/demandas/[id]/detalhe.ts"` — os rótulos das seções
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -1 --format=%h -L "/export type AtorVisivel/,+8:src/modules/historico/consultas.ts"` — o ator do evento
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/demandas/[id]/confirmar-demanda-qa.test.ts"` — 5 de 5
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/confirmacao-awave-qa.spec.ts e2e/confirmacao-awave.spec.ts e2e/seguranca.spec.ts` — 14 de 14
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — em segundo plano, saída lida com Read: 6342 de 6343, 1 falha de tempo em `minimizar.test.ts` (306 ms, fora da T18)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff` — só a asserção apertada em `e2e/confirmacao-awave.spec.ts`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/dados-pessoais/minimizar.test.ts` — sozinho: 273 de 273
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — em segundo plano, saída lida com Read: 288 de 288 arquivos, 6343 de 6343 testes, código 0
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — em segundo plano, saída lida com Read: 275 testes, 266 passaram, 9 pulados, código 0, em 13,4 min
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — 1 alterado e 2 novos, todos desta etapa

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa (288 de 288 arquivos e 6343 de 6343 testes; e2e com 266 que passaram e 9 pulados, código 0)
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`: a única mudança aperta a tolerância da largura)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real (contas e demandas fictícias do seed, "Bia Ficticia", "Pessoa Ficticia QA", o prefixo `ficticio`)
