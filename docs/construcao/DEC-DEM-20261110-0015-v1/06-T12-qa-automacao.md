---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T12-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md (G1 a G7, T12), 01-analista-requisitos.md (RF-11, RF-12), 06-T12-engenheiro-frontend.md, 06-T12-tech-lead.md, 06-T11-qa-automacao.md (formato), commit 200c31a (por git diff 200c31a~1 200c31a), src/components/dados-da-decisao.ts, src/components/dados-da-decisao.test.ts, src/app/(painel)/pacotes-decisao/[decId]/page.tsx (formulário), src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts, e2e/decisao-botoes.spec.ts, e2e/apoio.ts, playwright.config.ts, test/estatico/decisao-e2e.test.ts, test/estatico/piso-de-assercoes.test.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Testes da T12 (T11: um formulário, três botões; `engenheiro-frontend`). O código está no commit `200c31a`. O `9485df1` e
o `2ce6e23` só mexem na entrega e no registro. Conferi o código e os testes da construção contra o plano (T12) e o
RF-11.

Acrescentei **8 testes de unidade e 2 e2e**. Nenhum arquivo de código mudou, e nenhum teste existente mudou.

O pedido do maestro foi provar por teste que todas as exigências de aprovação de hoje continuam e que nenhuma opção vem
marcada por padrão. Isso está em três camadas:

- **Regra:** uma malha de 6.048 combinações confere `envioDaDecisao` contra a regra escrita por extenso, e não contra
  `validarDecisao`.
- **HTML:** 5 contas × 4 estados conferem o que a tela mostra.
- **Navegador:** 2 e2e.

O servidor não mudou: o diff do G4 contra `198e97d` saiu vazio, e `src/modules` só tem o `resumo-da-fila` (T07).

### Critério de aceite da tarefa e o teste que o cobre

"(eng.)" é teste do engenheiro; "(qa)" é teste acrescentado nesta etapa. Siglas:

- DD = `src/components/dados-da-decisao.test.ts`;
- PG = `src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts`;
- BT = `e2e/decisao-botoes.spec.ts`;
- QA = `e2e/decisao-botoes-qa.spec.ts`;
- DS = `e2e/decisao.spec.ts`.

| Critério | Teste |
|---|---|
| CA-11.1 (marcar B, "Aprovar a opção B", diálogo, grava B) | BT (eng.) `CA-11.1 e CV-10: decisaoOpcaoB …`; DD (eng.) `CV-10: o v devolvido é o que vai ao diálogo …`; DD (qa) `confirma só com cada exigência da ação cumprida …` (a opção gravada, o rótulo e o diálogo citam a mesma, em toda combinação) |
| CA-11.2 (Aprovar sem opção: erro, nada enviado, sem diálogo) | DD (eng.) `CA-11.2 …`; DS (eng.) `C-14: …` (primeiro envio); DD (qa) `CV-13: o formulário começa sem opção nem decisão …` (o erro não escolhe opção); QA (qa) `administradora em 390 px: …` (os quatro erros na ordem, diálogo fechado, zero POST) |
| CA-11.3 (desatualizado: "Aprovar" indisponível e explicado; Devolver e Arquivar funcionam) | BT (eng.) `CA-11.3 …` e `CV-11 …`; DS (eng.) `CA-12.4 …`; PG (eng.) `desatualizado: …`; PG (qa) `$nome: revisão, recomendação, …` (5 contas: `aria-disabled` só no principal, sem `disabled` nos três, texto da explicação) |
| CA-11.4 (Devolver sem a revisão: erro, nada enviado) | DD (eng.) `CA-11.4 e CV-14 …`; BT (eng.) `foco volta ao botão ativado …`; DD (qa) malha (revisão exigida nas três ações); QA (qa) `administradora em 390 px: …` ("Arquivar" sem a revisão) |
| CA-11.5 (administradora, aprovar sem o documento: dois erros, nada enviado) | DD (eng.) `CA-11.5 e CA-11.6 …`; BT (eng.) `CV-10 e D-05 …`; DS (eng.) `dupla aprovação …`; DD (qa) malha (documento e data só para aprovar, e espaço em branco é vazio); QA (qa) `administradora em 390 px: …` |
| CA-11.6 (Devolver não leva o documento) | DD (eng.) `CA-11.5 e CA-11.6 …`; DD (qa) malha (devolver e arquivar sem opção nem documento na entrada); QA (qa) `administradora em 390 px: …` ("Devolver" sem o documento abre o diálogo: o documento não é exigido a mais) |
| CA-11.7 (nenhuma asserção de regra mudou em `dados-da-decisao.test.ts`) | Conferido no `git diff 200c31a~1 200c31a`: só os textos `dicaDevolver`, `referencia` e `dataAssinatura`, mais uma linha com os textos novos. Concordo com a revisão |
| CV-10 (o botão ativado é a decisão; o mesmo `v` vai ao diálogo e à ação) | DD (eng.) `CV-10: …` (2); BT (eng.) os três e2e; DD (qa) `CV-10: o botão vale sobre o statusDecisao que estiver no estado, só neste envio; o estado não muda`; QA (qa) `Enter num rádio de opção e na caixa de revisão …` |
| CV-11 (desatualizado: zero POST) | BT (eng.) `CV-11: …`; DD (eng.) `CV-11: …`; DD (qa) malha ("aprovada" com o pacote desatualizado é `nada` em todas as 432 combinações) |
| CV-13 / P-01 (nenhuma opção marcada; recomendação em texto antes das opções; sem "Recomendada") | BT (eng.) `CV-13: …` (1280 e 390 px); PG (eng.) `nível cto, conta cto …`; PG (qa) `$nome: …` (5 contas × com e sem rascunho × atual e desatualizado: nenhum rádio nem caixa com `checked`, a recomendação antes do `<form>`); DD (qa) `CV-13: …`; QA (qa) os dois testes (ao abrir, depois do erro e depois do diálogo, em 390 px) |
| CV-14 (revisão obrigatória nas três ações) | DD (eng.) `CA-11.4 e CV-14 …`; DD (qa) malha; PG (qa) `$nome: …` (caixa com `aria-required` sempre que o pacote cita rascunho); QA (qa) os dois testes |
| CV-15 (sem `action` nem `method`; campos digitados sem `name`) | PG (eng.) `CV-15: …`; BT (eng.) `CV-15: …` |
| C-14 (diálogo com ação, repositório e nível) | DD (eng.) `diálogo de confirmação …`; BT (eng.) CA-11.1; DD (qa) malha (repositório e nível em toda confirmação); PG (qa) `$nome: …` (revisão, repositório e nível antes do formulário nas 20 combinações); QA (qa) os dois testes |
| Dupla aprovação, opção fixada | DS (eng.) `dupla aprovação …`; PG (eng.) `dupla aprovação, depois do CTO …`; PG (qa) `$nome: …` (as duas ordens: a frase da fixada sem rádios e o principal com a opção); DD (qa) malha (a fixada vale sobre a marcada no que é gravado) |
| CV-01 | `git diff --stat 198e97d -- <lista do G4>` vazio; `src/modules` só com `resumo-da-fila.*` e `package.json` com 2 linhas (T02) |

### Testes acrescentados

- `src/components/dados-da-decisao.test.ts`: describe novo `envioDaDecisao: as exigências de aprovação de hoje em toda
  combinação (06-T12-testes, qa-automacao)`, com **3 testes** (eram 50, agora 53).
  - **A malha:** 7 botões, incluindo `pendente`, vazio, `null` e `undefined`, × 3 opções fixadas × documento × revisão ×
    desatualizado × 3 opções marcadas × 3 identificadores (vazio, só espaço, preenchido) × data × revisão marcada.
    - O oráculo é a regra escrita por extenso. Para cada caso, confere que:
      - "aprovar" com o pacote desatualizado não faz nada (`nada`);
      - os erros são exatamente os que faltam, na ordem da tela;
      - a confirmação só acontece com tudo cumprido;
      - a entrada passa no `registrarDecisaoSchema`;
      - a opção gravada é a fixada, senão a marcada;
      - o documento só vai na conta da administradora e só ao aprovar;
      - o diálogo cita a ação, o repositório e o nível.
    - Os valores entram com `Object.freeze`, e o teste reprova se o envio mexer no estado.
    - Os três resultados possíveis têm piso de contagem, para a malha não passar vazia.
  - **CV-10:** o botão vale sobre qualquer `statusDecisao` que estiver no estado, só para aquele envio.
  - **CV-13:** o formulário começa sem opção nem decisão, cada formulário recebe um objeto novo, e "Aprovar" sem opção
    não escolhe opção por ninguém.
- `src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts`: describe novo `T11 com três botões: as exigências de hoje em
  cada conta e estado (06-T12-testes, qa-automacao)`, com **5 testes** (`it.each`; eram 25, agora 30).
  - As cinco contas que decidem: nível cto; dupla com o CTO primeiro; dupla com a administradora primeiro; administradora
    depois do CTO; CTO depois da administradora.
  - Cada uma com e sem rascunho, e atual e desatualizado. No HTML de cada caso, o teste confere:
    - antes do `<form>`: a revisão, o repositório, o nível, a recomendação em texto e "Aprovações" na dupla;
    - os alertas de rascunho e de desatualizado;
    - os rádios sem `checked`, e nenhum "Recomendada";
    - a frase da fixada no lugar dos rádios;
    - o documento só para a administradora, com "(obrigatório para aprovar)";
    - a caixa de revisão com `aria-required` e desmarcada sempre que há rascunho;
    - "Comentários (opcional)";
    - os três botões na ordem, com o texto do principal;
    - nenhum `disabled` em repouso, e `aria-disabled` só em "Aprovar" com o pacote desatualizado;
    - as descrições de Devolver e Arquivar.
- `e2e/decisao-botoes-qa.spec.ts`: arquivo novo, com **2 testes**. Os dois só leem, no DEC de agente do seed da
  `decisaoRecomendaB`. Não criam demanda nem versão (C-36), e a API confere no fim que o DEC continua pendente e sem
  aprovação.
  - **Enter num rádio e na caixa de revisão.** É o que a revisão (06-T12-tech-lead) pediu para a 07; aqui ficou
    automatizado.
    - O Enter no rádio B envia pelo principal e cai na validação: resumo focado, só o erro da revisão, diálogo fechado.
    - O Enter na caixa marcada abre o diálogo "Aprovar a opção B." com o repositório e o nível.
    - "Voltar" devolve o foco ao principal.
    - Zero POST de Server Action.
  - **Administradora em 390 × 844:**
    - estão visíveis o alerta de rascunho, os dois campos do documento, a caixa de revisão (desmarcada, com
      `aria-required`) e os três botões;
    - nenhuma opção vem marcada, e o principal é "Aprovar";
    - "Aprovar" sem nada dá os quatro erros na ordem, e continua sem opção marcada;
    - roda o axe nesse estado;
    - "Arquivar" sem a revisão pede só a revisão;
    - "Devolver" com a revisão e sem o documento abre o diálogo de devolução, e o foco volta ao "Devolver";
    - zero POST de Server Action.

Cada teste novo falharia com o erro que ele procura:

| Erro na tela ou na regra | Teste que reprova |
|---|---|
| uma opção vem marcada (`defaultChecked`, valor inicial, recomendação pré-marcada) | PG (qa) `$nome: …`, DD (qa) `CV-13: …`, QA (os dois) |
| a validação ou o erro marcam uma opção pela pessoa | DD (qa) `CV-13: …`, QA `administradora em 390 px …` |
| a revisão deixa de valer em Devolver ou Arquivar, ou a caixa some numa conta | DD (qa) malha, PG (qa) `$nome: …`, QA `administradora em 390 px …` |
| o documento deixa de ser exigido para aprovar, ou passa a ser exigido para devolver ou arquivar | DD (qa) malha, QA `administradora em 390 px …` |
| o documento some da conta da administradora, ou aparece para o CTO | PG (qa) `$nome: …` |
| a segunda aprovação grava ou mostra outra opção que não a fixada | DD (qa) malha, PG (qa) `$nome: …` |
| "Aprovar" desatualizado valida, abre o diálogo ou vira `disabled` (perde o foco) | DD (qa) malha, PG (qa) `$nome: …` |
| o diálogo deixa de repetir o repositório ou o nível | DD (qa) malha, QA (os dois) |
| o envio muda o estado da tela, ou o estado anterior vale mais que o botão | DD (qa) `CV-10: …` |
| o Enter num rádio ou numa caixa grava direto, sem validação e sem diálogo | QA `Enter num rádio …` |
| a revisão, o repositório, o nível ou a recomendação vão para depois do formulário | PG (qa) `$nome: …` |

### Resultado

- `pnpm test src/components/dados-da-decisao.test.ts`: **53 de 53**.
- `pnpm test "src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts"`:
  - 1ª rodada: 25 de 30. O erro estava no meu teste: o `not.toContain('aria-disabled')` pegava a variante
    `aria-disabled:` das classes do `Botao`;
  - troquei por `not.toMatch(/\saria-disabled=/)`, que confere o atributo;
  - 2ª rodada: **30 de 30**.
- `pnpm test` (relatório JUnit): **5181 testes, 0 falhas** (eram 5173; +8).
- `pnpm test:e2e`:
  - **217 de 217**, na primeira rodada (eram 215; +2);
  - a vigia de origem e CSP da T01 rodou em todos;
  - não houve 429 nem falha instável.
- `pnpm lint` e `pnpm typecheck`: limpos.
- `git diff --stat`: `pagina.test.ts` (+133) e `dados-da-decisao.test.ts` (+102), 0 remoções, mais o arquivo novo
  `e2e/decisao-botoes-qa.spec.ts`. Não há `.skip`, `.only` nem `.todo`. Nenhuma linha de teste existente foi tirada ou
  trocada.

### Conferência dos testes que a construção mudou (G3.2)

Li o `git diff 200c31a~1 200c31a` de `dados-da-decisao.test.ts`, `pagina.test.ts`, `componentes.test.ts`,
`decisao.spec.ts`, `axe-todas.spec.ts` e `pedido-construcao.spec.ts`. Concordo com a revisão:

- só mudaram texto literal e o passo equivalente (`check` do rádio "Aprovar" para o clique no botão);
- as asserções que saíram têm equivalente:
  - "Escolha a decisão." virou o erro da opção, porque a decisão vazia deixou de existir;
  - "rádio não marcado" no desatualizado virou "diálogo fechado e sem resumo de erros";
  - "grupo de opção com contagem 0" virou "visível desde o início" (03, 6.4).
- Não houve regra do axe desligada, `retries`, tempo-limite nem `bypassCSP`.
- O piso de asserções passa.

O `decisao-botoes.spec.ts` tem 8 testes, e os 8 cobrem o que o plano listou (CA-11.1, CV-10 ×2, CV-11, CV-13, CV-15,
CA-11.3, foco).

## Decisões tomadas

- O oráculo da malha é a regra escrita por extenso, e não `validarDecisao`. Se a validação e o envio mudarem juntos,
  comparar um com o outro passaria. Comparar com a regra reprova.
- A malha inclui o identificador só com espaço. Ele conta como vazio para aprovar, e não vai na entrada.
- O teste de HTML usa `it.each` com um tipo explícito (`readonly Caso[]`), e não `as const` com funções. Assim não volta
  o TS7024 da 06-T11-testes.
- O teste de HTML não confere a frase da opção fixada com o pacote desatualizado. Hoje ela não aparece, como na 0.1.13,
  mas a T13 pode querer mostrá-la, e isso não afrouxa nada. Os rádios ausentes nesse estado continuam conferidos.
- Os e2e novos ficaram num arquivo próprio (`*-qa.spec.ts`), como o `casca-qa` e o `fila-qa`, sem mexer na spec do
  engenheiro. Eles só leem o DEC de agente do seed, e por isso não gastam versão do C-36. Um não depende do outro.
- O teste em 390 px confere presença e visibilidade das exigências, e não posição. O rodapé fixo e o `:has()` são da
  T13. O teste continua valendo depois dela, porque o RF-12 manda manter tudo visível.
- O Enter num rádio e numa caixa foi conferido no Chromium, o único projeto do `playwright.config.ts`. O Safari continua
  com a UAT de Fabiano (G2).
- Dados só fictícios: `DOC-FICTICIO-*`, `wsssistemas2626-crypto/ficticio`, "Pessoa Ficticia …" e datas fixas. Não há
  `Date` sem argumento.

## Pendências

- Nenhuma da T12.
- Os Minor da revisão (D-T12-01 a D-T12-03) continuam com o `engenheiro-frontend` na T13 e na T16. O M2 (`z-10` do rádio
  sem `isolate` no cartão) deve ser conferido no e2e em 390 px da T13, com o rodapé fixo.
- Para a 07 (`qa-funcional`): o Enter num rádio e na caixa de revisão já está automatizado no Chromium. Continuam à mão o
  leitor de tela, o anúncio da troca do texto do principal e o foco de volta no Safari.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — limpo no início
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -12` — topo 14a16a5; código da T12 em 200c31a
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 200c31a~1 200c31a` — 13 arquivos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 200c31a~1 200c31a -- src/components/dados-da-decisao.ts src/components/GrupoOpcoes.tsx "src/app/(painel)/pacotes-decisao/[decId]/FormularioDecisao.tsx" "src/app/(painel)/pacotes-decisao/[decId]/page.tsx"` — diff do código
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 200c31a~1 200c31a -- src/components/dados-da-decisao.test.ts src/components/componentes.test.ts` — só texto e casos novos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 200c31a~1 200c31a -- "src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts" e2e/axe-todas.spec.ts e2e/pedido-construcao.spec.ts` — seletor e passo equivalente
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 200c31a~1 200c31a -- e2e/decisao.spec.ts` — passo equivalente; asserções com equivalente
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 198e97d -- src/proxy.ts src/proxy.test.ts next.config.ts src/app/api src/db drizzle src/modules/acesso src/worker src/jobs src/agents src/lib/auth.ts src/lib/auth-cliente.ts src/lib/qr.ts src/lib/log.ts src/lib/erros.ts src/instrumentation.ts pnpm-workspace.yaml "src/app/(painel)/configuracao/agentes/acoes.ts" "src/app/(painel)/demandas/[id]/acoes.ts" "src/app/(painel)/demandas/[id]/editar/acoes.ts" "src/app/(painel)/demandas/[id]/especificacoes/nova/acoes.ts" "src/app/(painel)/demandas/[id]/pacotes-decisao/novo/acoes.ts" "src/app/(painel)/demandas/[id]/pareceres-risco/novo/acoes.ts" "src/app/(painel)/demandas/nova/acoes.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes.ts"` — vazio (CV-01)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 198e97d -- src/modules package.json` — `package.json` (+2) e `resumo-da-fila.*` (T07)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-da-decisao.test.ts` — 53 de 53
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts"` — 25 de 30 (regex do meu teste pegava a classe `aria-disabled:`; corrigido)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts"` — 30 de 30
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --reporter=dot` — 217 de 217
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — 2 testes modificados e 1 novo; nenhum temporário no repositório
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent --reporter=junit --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/0a919744-0e04-42d0-bf4b-e75d6acefb82/scratchpad/t12-qa-suite.xml` — 5181 testes, 0 falhas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 2 arquivos, 235 inserções, 0 remoções

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
