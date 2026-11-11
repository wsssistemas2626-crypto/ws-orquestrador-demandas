---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T13-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md (G1 a G7, T12 e T13), 01-analista-requisitos.md (RF-11, RF-12), 06-T13-engenheiro-frontend.md, commit 472439e (git diff 472439e~1 472439e), e2e/decisao-celular.spec.ts, e2e/decisao-botoes.spec.ts, e2e/apoio.ts, e2e/casca-qa.spec.ts, e2e/casca.spec.ts (auxiliar da gaveta), playwright.config.ts, src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts, FormularioDecisao.tsx, src/components/dados-da-decisao.ts, GrupoOpcoes.tsx, ResumoErros.tsx, CamposDaDemanda.tsx (início), src/modules/acesso/auth.ts, scripts/seed-ficticio.ts (contas e cabeçalho)]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

A T13 passa. O código cumpre todos os critérios da tarefa, e nenhum teste do engenheiro está errado. Como a tarefa é
sensível, acrescentei testes que provam três coisas, **no computador (1280 × 720) e em 390 × 844**:

- todas as exigências de aprovação continuam à vista;
- elas continuam **obrigatórias**: o engenheiro provou que elas aparecem e que o caminho feliz passa; faltava provar
  que cada uma ainda barra o envio pelo rodapé fixo;
- nenhuma opção vem marcada, e nada vem preenchido.

A falha de `casca-qa.spec.ts:75` não voltou em nenhuma medição. Ainda assim, deixei o auxiliar da gaveta imune a ela
(seção "Instabilidade de casca-qa.spec.ts:75").

### Critérios da tarefa e os testes que os cobrem

| Critério | Teste (arquivo › nome) |
|---|---|
| CA-12.1 (390 px: frase fixada, documento, caixa e rodapé à vista, sem rolagem lateral) | `e2e/decisao-celular.spec.ts` › "CA-12.1 e CA-12.2: administradora em decisaoCelularDupla…" e "CV-12 e CA-12.1: administradora no DEC de agente em 390 px…"; **novo** `e2e/decisao-celular-qa.spec.ts` › "segunda aprovação nas duas larguras: a frase fixada no lugar das opções; o documento obrigatório só para aprovar; nada enviado sem confirmar"; **novo** `pagina.test.ts` › "T13: nenhuma exigência de aprovação escondida em alguma largura" › caso "dupla, a administradora depois do CTO na A" |
| CA-12.2 (aprovar pelo rodapé, diálogo, "O pacote está aprovado.") | `e2e/decisao-celular.spec.ts` › "CA-12.1 e CA-12.2…" |
| CA-12.3 (nada com foco sob o rodapé nem sob a barra) | `e2e/decisao-celular.spec.ts` › "CA-12.3 e CA-12.4: Tab do primeiro ao último campo…"; **novo** `e2e/decisao-celular-qa.spec.ts`, nos dois testes: o resumo de erros e cada campo focado pelos links dele ficam fora do rodapé e da barra |
| CA-12.4 (rodapé até 160 px, botões de 44 × 44) | `e2e/decisao-celular.spec.ts` › "CA-12.3 e CA-12.4…"; `pagina.test.ts` › "rodapé (03, 6.3): fixo embaixo só abaixo de 768 px…" |
| CA-12.5 (decidido: sem rodapé, "Decisão registrada: …") | `e2e/decisao-celular.spec.ts` › "CA-12.5 e CV-11: DEC já decidido sem rodapé…"; `pagina.test.ts` › "CA-12.5: sem formulário (decidido, ou a conta não decide) não há rodapé" |
| CA-12.6 (desatualizado: alerta visível, principal indisponível e explicado) | `e2e/decisao-celular.spec.ts` › "CA-12.6 e CV-11: desatualizado em 390 px…"; **novo** `pagina.test.ts` › "T13: nenhuma exigência…" (alerta, selo e explicação, em cada conta) |
| CV-11 (A-03 e aviso do C-28 nas duas larguras) | `e2e/decisao-celular.spec.ts` › "CA-12.6 e CV-11…" (pedido escondido em 390 e 1280) e "CA-12.5 e CV-11…" (aviso do C-28 em 390 e 1280); `e2e/decisao-botoes.spec.ts` › "CV-11: DEC desatualizado…" |
| CV-12 (revisão de C-14 sem abrir nada; só critérios, definição e opções no recolhível) | `e2e/decisao-celular.spec.ts` › "CV-12 e CA-12.1…" e "recolhível: …"; `e2e/decisao.spec.ts` › "C-14: revisão visível…" (2ª rodada em 390 px); `pagina.test.ts` › "CV-12 e D-16…"; `dados-da-decisao.test.ts` › "D-16 e CV-12: separarRevisao…"; **novo** `pagina.test.ts` › "T13: nenhuma exigência…" |
| CV-13 em 390 px (nada marcado, sem "Recomendada") | `e2e/decisao-celular.spec.ts` › "CV-13 e CV-19…"; `e2e/decisao-botoes.spec.ts` › "CV-13: … (1280 e 390 px)"; **novo** `e2e/decisao-celular-qa.spec.ts` › "administradora no DEC de agente, nas duas larguras: nada marcado ao abrir; opção, documento e revisão obrigatórios pelos três botões; nada enviado" (rádios, caixa, identificador, data e comentários vazios, com a conta da administradora) |
| CV-18 (cabeçalho da T11) | `e2e/seguranca.spec.ts` › "C-18 e CV-18: no cabeçalho da T11 de um DEC da textoDeTerceiro…"; `pagina.test.ts` › "cabeçalho: "Voltar para a demanda"…" |
| CV-19 ("Voltar para a demanda") | `e2e/decisao-celular.spec.ts` › "CV-13 e CV-19…"; `pagina.test.ts` › "cabeçalho…"; **novo** `pagina.test.ts` › caso plantado (o link é o único `md:hidden` acusado) |
| Revisão (C-14) antes do formulário no DOM | `pagina.test.ts` › "C-14: a revisão antes de decidir vem antes do formulário…" e "ordem do DOM: …" |
| Diálogo de hoje, sem mudança de texto | `e2e/decisao-celular.spec.ts` › "CA-12.1 e CA-12.2…"; **novo** `e2e/decisao-celular-qa.spec.ts` (o texto exato, o repositório e o nível nas duas larguras); `decisao-celular.test.ts` › "os textos e o título ligado continuam os de hoje" |
| CV-01 | `git diff --stat 198e97d -- <lista do G4>`: vazio (em Comandos executados) |

### Testes acrescentados

**1. `e2e/decisao-celular-qa.spec.ts`** (novo, 2 testes). Cada largura abre numa aba nova do mesmo contexto, para o
aviso de saída do formulário sujo não segurar a navegação. Antes do primeiro clique, o teste espera a hidratação do
botão principal: um clique antes dela faria o envio nativo do formulário (GET).

- **"administradora no DEC de agente, nas duas larguras: nada marcado ao abrir; opção, documento e revisão
  obrigatórios pelos três botões; nada enviado"**, no DEC de agente do seed, que só é lido:
  - em 390 px, o rodapé é `fixed`; em 1280 px, `static`;
  - nada vem marcado nem preenchido: rádios A e B, caixa, identificador, data e comentários; não aparece
    "Recomendada"; o principal diz "Aprovar";
  - a revisão com o nível, a recomendação, o documento, a caixa (`aria-required`) e os três botões estão à vista, e no
    celular os três botões estão na janela;
  - "Aprovar" sem nada dá os quatro links do resumo, na ordem da tela, e o diálogo não abre;
  - cada link do resumo foca o seu campo, e no celular o campo fica fora do rodapé e da barra;
  - "Devolver" e "Arquivar" sem a caixa dão só o erro da revisão;
  - cada exigência sozinha volta a barrar o "Aprovar": a opção; a data; o identificador em branco (`'   '`); a caixa;
  - com tudo cumprido, o diálogo abre com "Aprovar a opção B.", o repositório e "CTO e administradora."; "Voltar"
    devolve o foco ao principal;
  - nenhum POST de Server Action; a API confirma o pacote pendente, sem aprovação nem decisão.
- **"segunda aprovação nas duas larguras: a frase fixada no lugar das opções; o documento obrigatório só para aprovar;
  nada enviado sem confirmar"**:
  - preparo: a administradora cria um DEC "CTO e administradora" na `decisaoCelularDupla`, e a "cto" aprova a A pela
    API;
  - a frase fixada aparece, não há rádio, as duas linhas de "Aprovações" aparecem, o documento está vazio, e o principal
    diz "Aprovar a opção A";
  - sem o documento, dá os erros do identificador e da data; só com o identificador, dá o erro da data;
  - "Devolver" não exige documento: o diálogo de devolução abre, e "Voltar" devolve o foco a "Devolver";
  - com o documento completo, o diálogo de C-14 abre para a opção A;
  - nenhum POST; o pacote continua pendente, só com a aprovação da "cto".
- **C-36:** nenhuma demanda; "cto" com 0 versões; "administradora" com até 3 versões (ESP, RSK e DEC). O teste não
  depende de ordem: roda antes ou depois do CA-12.1 da `decisao-celular.spec` (cada um cria o próprio DEC), contra
  banco novo ou reaproveitado. Datas fixas (`2026-11-11`) e só dados fictícios.

**2. `src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts`**, describe novo "T13: nenhuma exigência de aprovação
escondida em alguma largura (06-T13-testes, qa-automacao)", com 6 testes.

- **A regra conferida:** a T13 só muda classe por largura, sobre um DOM só. O teste percorre os ancestrais de cada
  exigência no HTML do servidor. Nenhum deles, nem a própria tag, pode ter classe que esconda em alguma largura
  (`hidden`, `md:hidden`, `max-md:hidden`, `xl:hidden`, `sr-only`, `invisible`, `collapse`), nem os atributos `hidden`,
  `inert` ou `aria-hidden="true"`.
- **As exigências conferidas:**
  - a revisão com o repositório e o nível;
  - o repositório no cabeçalho;
  - os três níveis de risco;
  - o resumo e a recomendação;
  - os alertas e os selos;
  - "Aprovações";
  - as opções, ou a frase fixada;
  - o documento;
  - a caixa de revisão;
  - Comentários;
  - as consequências;
  - o rodapé e os três botões.
- **Os casos:** as 5 situações de conta (as do describe da 06-T12), cada uma com e sem rascunho citado, atual e
  desatualizado. São 20 renderizações.
- **Os casos plantados** provam que a conferência acusa:
  - o "Voltar para a demanda" (`md:hidden`);
  - o recolhível (`max-md:hidden`), com critérios e "Opções" dentro dele;
  - `xl:sr-only`, `hidden`, `inert`, `aria-hidden` e `max-md:invisible`.

  E provam que ela não acusa um irmão escondido já fechado nem `overflow-hidden`.

### Instabilidade de `casca-qa.spec.ts:75`

**Medição.** A falha não voltou nenhuma vez:

| Rodada | Testes | Resultado |
|---|---|---|
| Suíte inteira, 1 | 228 | 228 de 228; `casca-qa:75` passou |
| Suíte inteira, 2 | 228 | 228 de 228; `casca-qa:75` passou |
| Suíte inteira, 3 | 228 | 228 de 228; `casca-qa:75` passou |
| `casca-qa` e `casca`, `--repeat-each=10` | 210 | 172 passaram |
| `casca-qa` e a spec nova, `--repeat-each=3` | 30 | 30 de 30 |
| `casca-qa` depois da correção, `--repeat-each=3` | 24 | 24 de 24 |

As 38 falhas da repetição de 10 não têm nada a ver com a gaveta:

- 34 são 429 no login ou no TOTP, da 8ª repetição em diante: a suíte entrou 210 vezes em 7 minutos com a "cto", o que
  não acontece numa execução normal;
- 4 vieram do `casca.spec.ts`, nas repetições 4 e 5:
  - 3 são o "cookie antigo depois de sair", que recebeu 200 em vez de 401 no CA-03.5 e no CV-16;
  - 1 é um 429 no TOTP;
  - o "cookie antigo" fica em Pendências.

Nenhuma falha "subtree intercepts pointer events" apareceu: `casca-qa:75` passou 7 de 7 antes dos 429, mais 3 de 3 e 3 de
3.

**Causa provável e correção.** A mensagem que o engenheiro viu só aparece com a gaveta já aberta:

1. o primeiro clique em "Menu" acontece antes da hidratação;
2. o React 19 reaplica esse clique quando a hidratação termina, o que, na suíte inteira (fila com muitas demandas),
   pode levar mais de 1 s;
3. a gaveta abre, mas depois do 1 s da espera;
4. o `toPass` repete o clique em "Menu", e o clique cai no véu do `<dialog>` modal até os 10 s acabarem.

Corrigi o auxiliar `abrirGaveta` do `e2e/casca-qa.spec.ts`, que é meu (06-T05-testes): ele só clica se a gaveta ainda
estiver fechada. Nenhuma asserção mudou, a gaveta continua tendo de abrir pelo "Menu", e o foco em "Fechar menu"
continua conferido logo depois. O `abrirGaveta` do `e2e/casca.spec.ts` (do engenheiro, da T05) tem o mesmo padrão e não
mudou: vai em Pendências.

### Resultado

- `pnpm test`: **5200 de 5200**, em 230 arquivos. Eram 5194; os 6 a mais são deste describe novo. O
  `piso-de-assercoes.test.ts` e o `decisao-e2e.test.ts` passam.
- `pnpm test:e2e`, suíte inteira (228 testes: os 226 de antes mais os 2 novos), **três rodadas seguidas: 228, 228 e
  228**, em 8,8 min, 8,3 min e 8,0 min.
  - A correção do `casca-qa` veio depois das três rodadas. Ela só muda o auxiliar daquele arquivo e passou 24 de 24.
  - Antes dela, os 3 specs da decisão (`decisao-botoes`, `decisao-celular`, `decisao-celular-qa`) passaram 18 de 18.
- `pnpm lint` e `pnpm typecheck`: limpos, rodados depois da última edição.
- `git diff`: só acréscimos em `pagina.test.ts` (148 linhas, nenhuma removida) e a troca de uma linha no auxiliar
  do `casca-qa.spec.ts`, mais o arquivo novo. Nenhum `.skip`, `.only`, `.todo`, `retries`, aumento de tempo-limite,
  regra do axe desligada nem `bypassCSP`.
- Revisão do diff de testes do commit 472439e:
  - nenhuma asserção saiu;
  - as três trocas de `idCampo` em `dados-da-decisao.test.ts` são de seletor: o rádio saiu na T12, e entrou o id do
    botão;
  - o `h1` de `pagina.test.ts` só ganhou o `<bdi>`;
  - os testes de `decisao.spec.ts` e `seguranca.spec.ts` só cresceram.
- `git status`: os 2 arquivos alterados e o novo, e nenhum temporário. O `test-results/` é ignorado.

## Decisões tomadas

- **Testes novos num arquivo `-qa`, sem mexer na spec do engenheiro**, como em `casca-qa`: cada lado fica dono do que
  escreveu, e o piso de asserções dos arquivos dele não muda.
- **Cada largura numa aba nova do mesmo contexto:** o aviso de saída do formulário sujo não segura a navegação, e cabe
  um login só por teste (o TOTP recebe 429 com logins seguidos da mesma conta).
- **Hidratação esperada pelo `__reactProps$` do botão principal:** sem ela, um clique cedo faria o envio nativo (GET) do
  formulário sem `action`, e o teste falharia às vezes.
- **Guarda de visibilidade no HTML do servidor, e não só no navegador:** como só a classe muda por largura, conferir os
  ancestrais cobre as duas larguras e as 20 combinações de conta e estado em milissegundos. O e2e confere a
  obrigatoriedade.
- **Correção do `casca-qa` sem ter reproduzido a falha:** o auxiliar antigo não tem como passar depois que a gaveta
  abre com atraso. A correção só tira essa armadilha, sem afrouxar asserção.
- **Sem axe nos testes novos:** a decisao-celular.spec já roda o axe nos mesmos estados, nas duas larguras.

## Pendências

- **Tech-lead (não bloqueia):** o `abrirGaveta` de `e2e/casca.spec.ts` (T05, do engenheiro) tem o mesmo padrão
  corrigido aqui no `casca-qa`. Ele não falhou em nenhuma medição. Vale aplicar a mesma linha
  (`if (!(await gaveta(page).isVisible()))` antes do clique) numa tarefa do `engenheiro-frontend`, como a T16.
- **Tech-lead (não bloqueia):** sob muitos logins seguidos (repetição de 10), o "Sair" de `casca.spec.ts` às vezes não
  revogou a sessão: o cookie antigo recebeu 200 em vez de 401, 3 vezes. O provável é um 429 na saída, pelo limite de
  IP do Better Auth (o navegador não manda `x-real-ip`). O teste só confere o método do pedido de saída, e não o status,
  e por isso a falha aparece como regra de segurança quebrada. Não acontece na suíte normal (3 de 3 verdes). Vale
  conferir o status 200 da saída em `sairEConferir`, para a falha dizer a causa.
- **Tech-lead (Minor, não bloqueia):** o commit 472439e trocou o título do teste `'C-19: /demandas/[id] e GET …'` por
  `'C-19:/demandas/[id] e GET …'` em `e2e/seguranca.spec.ts`, sem o espaço. A asserção é a mesma. Vale voltar o espaço
  quando o arquivo for tocado de novo.
- **Mantidas da 06-T13-construcao:** banco reaproveitado no C-18 da T11 e "cto" perto de 60 versões por hora. Os testes
  novos daqui não criam versão com a "cto".

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — limpo no início
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -n 5 --format=%h%x20%s` — 472439e (construção) e 697b3f0 (revisão)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 472439e~1 472439e` — 15 arquivos da T13
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -n 1 --format=%h -S "### T13." -- docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md` — 080356f (li o plano com Read)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -n 1 --format=%h -S "export function useConfirmarSaida" -- src/components/CamposDaDemanda.tsx` — 3bdc321
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -n 3 --format=%h%x20%s -S "verify-totp" --` — e776a4b, e49ca6a e c37320a
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --diff-filter=A --name-only --format= -- src/lib/auth* src/lib/limites* src/modules/acesso` — achei `src/modules/acesso/auth.ts`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts"` — 41 de 41
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/decisao-celular-qa.spec.ts e2e/decisao-celular.spec.ts e2e/decisao-botoes.spec.ts --reporter=line` — 18 de 18
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — `pagina.test.ts` e a spec nova
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 472439e~1 472439e -- e2e/seguranca.spec.ts e2e/decisao.spec.ts src/components/dados-da-decisao.test.ts` — só seletor, acréscimo e o título do C-19 sem espaço
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -U0 472439e~1 472439e -- "src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts" src/components/decisao-celular.test.ts` — só o `<bdi>`, um comentário e acréscimos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 198e97d -- src/proxy.ts src/proxy.test.ts next.config.ts src/app/api src/db drizzle src/modules/acesso src/worker src/jobs src/agents src/lib/auth.ts src/lib/auth-cliente.ts src/lib/qr.ts src/lib/log.ts src/lib/erros.ts src/instrumentation.ts pnpm-workspace.yaml "src/app/(painel)/configuracao/agentes/acoes.ts" "src/app/(painel)/demandas/[id]/acoes.ts" "src/app/(painel)/demandas/[id]/editar/acoes.ts" "src/app/(painel)/demandas/[id]/especificacoes/nova/acoes.ts" "src/app/(painel)/demandas/[id]/pacotes-decisao/novo/acoes.ts" "src/app/(painel)/demandas/[id]/pareceres-risco/novo/acoes.ts" "src/app/(painel)/demandas/nova/acoes.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes.ts"` — vazio (CV-01)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — `pagina.test.ts`, 148 inserções e nenhuma remoção
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --reporter=line` — rodada 1: 228 de 228 (8,8 min)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --reporter=line` — rodada 2: 228 de 228 (8,3 min)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --reporter=line` — rodada 3: 228 de 228 (8,0 min)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/casca-qa.spec.ts e2e/casca.spec.ts --repeat-each=10 --reporter=dot` — 172 de 210; 34 falhas por 429 (login e TOTP) da 8ª repetição em diante; 4 no `casca.spec.ts` (3 "cookie antigo" com 200 e 1 TOTP com 429); nenhuma da gaveta
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/casca-qa.spec.ts e2e/decisao-celular-qa.spec.ts --repeat-each=3 --reporter=dot` — 30 de 30 (com o auxiliar antigo)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/casca-qa.spec.ts --repeat-each=3 --reporter=dot` — 24 de 24 (com o auxiliar corrigido)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent --reporter=dot` — 5200 de 5200, 230 arquivos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff` — só acréscimos em `pagina.test.ts` e a troca de uma linha (e do comentário) no auxiliar do `casca-qa.spec.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — 2 modificados e 1 novo; nenhum temporário

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
