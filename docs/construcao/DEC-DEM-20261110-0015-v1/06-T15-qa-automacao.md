---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T15-testes
agente: qa-automacao
leu: [pedido.json, contrato-passagem.md, tarefas.json, 05-tech-lead.md, docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md (G1, T14, T15, T16, T17 e rastreabilidade), 01-analista-requisitos.md (RF-08 a RF-15), 06-T15-engenheiro-frontend.md, 06-T15-tech-lead.md, 06-T14-qa-automacao.md, commit d53dc1f (git diff e1d668b d53dc1f -- src e2e), e2e/reflow.spec.ts, e2e/reflow-qa.spec.ts, e2e/apoio.ts, e2e/agentes-teto.spec.ts, playwright.config.ts, src/components/Cartao.tsx, src/components/Tabela.tsx, src/components/ResumoErros.tsx, src/components/dados-do-pacote.ts, src/components/dados-dos-agentes.ts, src/app/(painel)/layout.tsx, src/app/(painel)/configuracao/agentes/page.tsx, TabelaAgentes.tsx, FormularioTeto.tsx, src/app/(painel)/demandas/[id]/pacotes-decisao/novo/FormularioPacote.tsx]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

A T15 passa. O código cumpre os critérios da tarefa (CA-14.1 e CA-14.2 para T09, T10 e T12, e CV-01). Nenhum teste do
engenheiro está errado ou instável. O `reflow.spec.ts` mede T09, T10 e T12 **do jeito que abrem**. Acrescentei um e2e,
em 320 px, com os estados que fazem a tela crescer:

- a T09 com erros e texto longo;
- a T12 com o diálogo de ligar aberto e com o erro do teto.

O e2e novo também mede **se cada elemento cabe no cartão**, e não só se está dentro dele. Ele fecha a Minor 2 da
06-T15-tech-lead: o `<dialog>` da T12 tem de estar dentro do cartão "Agentes". O teste passou de primeira e nas três
rodadas da suíte inteira.

### Critérios da tarefa e os testes que os cobrem

| Critério | Teste (arquivo › nome) |
|---|---|
| CA-14.1 (os e2e de T09, T10 e T12 de hoje passam só com mudança de seletor ou texto) | `e2e/pacote-decisao.spec.ts` (T09), `e2e/especificacao.spec.ts` e `e2e/parecer-risco.spec.ts` (abrem a T10), `e2e/agentes-teto.spec.ts` (T12). **Nenhuma linha deles mudou no commit d53dc1f**: o diff de `e2e/` tem só o `reflow.spec.ts`. As 4 linhas que eles mudaram desde 198e97d são da T01 (importação de `./apoio`). As regex de HTML dos quatro `pagina.test.ts` dessas telas passam sem mudança. Verdes nas três rodadas |
| CA-14.2 (390 px sem rolagem horizontal fora das regiões de tabela que já rolam hoje), T09, T10 e T12 | `e2e/reflow.spec.ts` › "T15 em 390 px › T09, T10 e T12: sem rolagem lateral, e cada seção num cartão" e "T15 em 320 px › …" (telas como abrem). **Novo:** `e2e/reflow-t15-qa.spec.ts` › "T15 em 320 px com conteúdo e estados que crescem › T09 com erros e texto longo, T10 e T12 com diálogo e erro do teto: …". Ele confere a página sem rolagem lateral e cada cartão dentro da janela. Também confere cada elemento visível de cada cartão dentro da largura do cartão. Fica de fora só o conteúdo da região rolável da tabela "Agentes de IA", que é a região que já rola hoje; a região em si tem de caber |
| Molde 03, 8.2: cada seção/campo num cartão; formulário da T09 até 760 px | `e2e/reflow.spec.ts` (as três larguras; 5, 7, 7 e 2 cartões; `form` da T09 ≤ 760 px em 1280 px). **Novo:** `e2e/reflow-t15-qa.spec.ts`: com os erros à vista, cada campo da T09 **e a mensagem de erro dele** (`[id$="-erro"]`, 4) ficam dentro de `section.rounded-cartao`. Na T12, o campo do teto, a mensagem e o resumo de erros ficam no cartão "Gasto do mês", e o diálogo fica no cartão "Agentes" |
| `Interruptor` com trilho `acao`/`tinta-suave` e o texto do estado de hoje | `src/components/componentes.test.ts` › "Interruptor (03, 2.3 e T12) › trilho ligado em acao e desligado em tinta-suave, botão branco nos dois" (do engenheiro, visto falhando antes do código). Contraste do trilho com o agente ligado: axe do `agentes-teto.spec.ts` › "ligar o risco: …" ("T12 com agente ligado") |
| Nenhuma condição muda; o interruptor segue a regra de quem liga (C-12) | `e2e/agentes-teto.spec.ts` sem mudança (administradora com os controles desabilitados e o 403 da API). **Novo:** o diálogo de ligar abre e cancela como hoje, com o foco de volta ao interruptor. O resumo de erros da T09 traz os 4 erros na ordem da tela, com o texto de hoje |
| CV-01 | `git diff --stat 198e97d -- <lista do G4>`: vazio |

### Teste acrescentado: `e2e/reflow-t15-qa.spec.ts` (novo, 1 teste)

Fica num arquivo `-qa` próprio, sem mexer na spec do engenheiro. Roda tudo em 320 × 844, com um login só (conta "cto",
a única que abre o diálogo e o erro do teto da T12). Usa a demanda do seed `etapasDupla`, que o teste só lê.

- **T09 Novo pacote de decisão:**
  - "Descrição da opção A" e "Vantagens da opção A" com texto longo sem espaço;
  - "Recomendação" com 10.001 caracteres; o resumo, a descrição B e o nível ficam vazios;
  - o resumo de erros traz exatamente estes 4 links, nesta ordem: "Resumo executivo: Informe o resumo executivo.",
    "Descrição da opção B: Descreva a opção B.", "Recomendação: Este campo aceita até 10.000 caracteres." e "Nível de
    aprovação requerido: Escolha o nível de aprovação requerido.";
  - o link do resumo executivo foca o campo, e o link do nível foca o primeiro rádio (o rádio fica dentro do cartão do
    `GrupoOpcoes`); o resumo e os dois alvos ficam fora da barra de 56 px.
- **T10 Ver ESP e Ver RSK:** em 320 px, os 7 cartões de cada versão dentro da janela, e cada `h2`, `dl`, `dt` e `dd`
  dentro da largura do cartão.
- **T12 Agentes e teto:**
  - antes do clique, confere que o agente de consolidação está desligado. Ligado, o clique o desligaria sem diálogo,
    e isso grava;
  - o diálogo "Ligar o agente de consolidação?":
    - fica dentro do `section` com `aria-labelledby="agentes"` e cabe em 320 px;
    - mostra "Ligar agente" e "Cancelar" na janela;
    - passa no axe em 320 px;
  - "Cancelar" fecha o diálogo, o interruptor continua `aria-checked="false"` e o foco volta a ele;
  - teto "-1" e "Salvar teto": o resumo de erros recebe o foco, e o link "Teto mensal de gasto (US$): O teto não pode
    ser negativo." foca o campo, fora da barra. O campo, a mensagem e o resumo ficam no cartão "Gasto do mês";
  - a região da tabela "Agentes de IA" cabe no cartão, nos dois estados.
- **Em cada estado:**
  - nenhuma rolagem lateral;
  - cada cartão dentro da janela e cada elemento dentro do cartão;
  - axe sem violação em 320 px, com a página no topo (Minor 3 da 06-T14), e em 1280 px no mesmo estado.
- **Nada gravado:**
  - zero POST em cada aba;
  - `GET /api/demandas/:id`, `GET /api/configuracao/teto` e `GET /api/agentes` iguais no começo e no fim.
- **Estabilidade:**
  - cada tela abre numa aba nova do mesmo contexto, para o aviso de saída do formulário sujo não segurar a navegação;
  - antes do primeiro clique, o teste espera a hidratação do `form` (`__reactProps$`);
  - não depende de ordem nem do relógio: só lê o seed, não cria demanda nem versão (C-36) e não muda teto nem agente,
    que valem para o sistema inteiro.

### Resultado

- `e2e/reflow-t15-qa.spec.ts` sozinho: **1 de 1** (33 s).
- `pnpm test`: **5202 de 5202**, em 230 arquivos.
- `pnpm test:e2e`, suíte inteira, **três rodadas seguidas: 236, 236 e 236 de 236** (8,6 min, 9,6 min e 9,0 min). Os
  236 são os 235 da entrega do engenheiro mais o teste novo.
- `pnpm lint` e `pnpm typecheck`: limpos.
- `git status`: só o spec novo e esta entrega; nenhum temporário. Nenhum teste existente mudou nesta etapa.
- Diff de testes do commit d53dc1f:
  - `componentes.test.ts` só ganhou um caso (14 linhas, nenhuma removida);
  - `e2e/reflow.spec.ts` só ganhou linhas (87, depois do fim do arquivo): os testes da T14 ficaram iguais;
  - sem `.skip`, `.only`, `.todo`, `retries`, aumento de tempo-limite, regra do axe desligada nem `bypassCSP`.

## Decisões tomadas

- **Medir se o elemento cabe no cartão, e não só se está dentro dele:** o `closest('.rounded-cartao')` aprova um
  conteúdo que vaza para fora do cartão, desde que a página não ganhe rolagem. Medir o retângulo pega isso.
- **Dentro de `section.rounded-cartao`, e não de `.rounded-cartao`:** o `<dialog>` também tem a classe e aprovaria a si
  mesmo (Minor 2 da 06-T15-tech-lead). O teste novo diz em qual cartão cada coisa está, pelo `aria-labelledby`.
- **Conteúdo da tabela fora da medida, mas a região dentro:** é a exceção do próprio CA-14.2. A tabela da T12 rola na
  região dela, como hoje.
- **Conta "cto":** só ela tem o interruptor e o campo do teto habilitados. A administradora fica coberta pelo
  `reflow.spec.ts` e pelo `agentes-teto.spec.ts`.
- **O diálogo é cancelado, e o teto barrado pela validação da tela:** teto e agentes valem para o sistema inteiro. O
  teste não grava nada, e por isso não precisa do `finally` de restauração do `agentes-teto.spec.ts`.
- **320 px, e não 390 px:** é a largura mais estreita que o `reflow.spec` cobre (RNF-05).

## Pendências

- **Mantidas da 06-T15-tech-lead (não bloqueiam):**
  - Minor 1 (T16): os `h2` das seções da T10 e da T12 com `text-xl font-semibold`, quando a 03 (2.3) pede 18 px/700;
  - Minor 2 (T16): trocar `closest('.rounded-cartao')` por `closest('section.rounded-cartao')` em `secoesEmCartoes`, se
    a T16 mexer no `reflow.spec.ts`. Enquanto isso, o `reflow-t15-qa.spec.ts` já confere o diálogo no cartão "Agentes";
  - Minor 3 (`07-qa-funcional`, à mão): o interruptor ligado, o interruptor desabilitado na conta administradora e o
    foco depois de ligar e de desligar.
- **Para a T16 (não bloqueia):** `ResumoErros.tsx` ainda usa `border-perigo`, `bg-red-50`, `text-texto` e
  `text-perigo`. O resumo aparece agora dentro do cartão "Gasto do mês" da T12. O axe passa nas duas larguras, mas o
  `classes-antigas.test.ts` da T16 vai acusar essas classes.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261110-0015-v1`, limpo no início
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -6` — d53dc1f (construção), f68c930 e bdff42d (revisão)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff e1d668b d53dc1f -- src e2e` — só `Cartao`, classes e comentários; 3 testes acrescentados ao `reflow.spec.ts`; 1 caso acrescentado em `componentes.test.ts`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/reflow-t15-qa.spec.ts --reporter=line` — 1 de 1
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent --reporter=dot` — 5202 de 5202, 230 arquivos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --reporter=dot` — rodada 1: 236 de 236 (8,6 min)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 198e97d HEAD -- e2e` — `pacote-decisao`, `especificacao`, `parecer-risco` e `agentes-teto` só com as 4 linhas da T01
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 198e97d -- src/proxy.ts src/proxy.test.ts next.config.ts src/app/api src/db drizzle src/modules/acesso src/worker src/jobs src/agents src/lib/auth.ts src/lib/auth-cliente.ts src/lib/qr.ts src/lib/log.ts src/lib/erros.ts src/instrumentation.ts pnpm-workspace.yaml "src/app/(painel)/configuracao/agentes/acoes.ts" "src/app/(painel)/demandas/[id]/acoes.ts" "src/app/(painel)/demandas/[id]/editar/acoes.ts" "src/app/(painel)/demandas/[id]/especificacoes/nova/acoes.ts" "src/app/(painel)/demandas/[id]/pacotes-decisao/novo/acoes.ts" "src/app/(painel)/demandas/[id]/pareceres-risco/novo/acoes.ts" "src/app/(painel)/demandas/nova/acoes.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes.ts"` — vazio (CV-01)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — só o spec novo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --reporter=dot` — rodada 2: 236 de 236 (9,6 min)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --reporter=dot` — rodada 3: 236 de 236 (9,0 min)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — só o spec novo; nenhum temporário

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
