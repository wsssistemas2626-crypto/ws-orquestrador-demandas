---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T13-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12), 05-tech-lead.md, docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md (G1 a G7, T13), 04-seguranca-aplicacao.md (seções 2 e 3, CV-01 a CV-20), 06-T12-tech-lead.md, 06-T13-engenheiro-frontend.md, commit 472439e, src/app/(painel)/pacotes-decisao/[decId]/page.tsx, FormularioDecisao.tsx, RevisaoDoPacote.tsx, pagina.test.ts, src/components/dados-da-decisao.ts, dados-da-decisao.test.ts, decisao-celular.test.ts, GrupoOpcoes.tsx, DialogoConfirmacao.tsx, src/app/globals.css, e2e/decisao-celular.spec.ts, e2e/decisao.spec.ts, e2e/seguranca.spec.ts, playwright.config.ts]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T13 (T11 no arranjo A e C2; `engenheiro-frontend`). O código está no commit `472439e`. **Parecer: aprovada,
sem Critical nem Important.** Há quatro Minor, que vão para Pendências.

### Pedido do maestro: nenhuma action, regra ou exigência de aprovação mudou

Conferi cada exigência no diff e no código de hoje:

| Exigência | Onde conferi | Resultado |
|---|---|---|
| Server Actions, rotas, papéis, 2FA | G4 (`git diff --stat 198e97d` das superfícies congeladas e dos nove `'use server'`): vazio. `src/modules`: só `resumo-da-fila.*` (T07). `package.json` e lock: só a T02. Nenhum arquivo do commit tem `'use server'` | Não mudou |
| Lógica do formulário | `FormularioDecisao.tsx`: o diff só troca classes (`CLASSE_DO_RODAPE`, `CLASSE_DA_EXPLICACAO`, `max-md:` nos botões) e os ids literais por `ID_DOS_BOTOES`, com os mesmos valores. `onSubmit`, `estadoDoBotao`, `aria-disabled`, `aria-describedby` e o diálogo não mudaram | Não mudou |
| Funções de regra | `dados-da-decisao.ts`: `validarDecisao`, `entradaDaDecisao`, `envioDaDecisao`, `textoDoDialogo` e `formularioDaConta` estão sem diff. Mudou só `idDoAlvo`, que diz para qual elemento o link do resumo de erros leva o foco. Foi a correção do D-T12-01 que eu pedi na T12. Campo, mensagem e ordem dos erros ficaram iguais | Não mudou |
| Quem vê o formulário e com que exigências | `page.tsx`: o `contexto` passado ao formulário tem os mesmos quatro campos e as mesmas fontes (`opcaoFixada`, `pedeDocumento`, `exigeRevisao`, `aprovarIndisponivel`). As condições do lembrete, do pedido (A-03), dos alertas e do substituído são as de hoje, só mudaram de lugar | Não mudou |
| Revisão C-14 visível (CV-12) | `separarRevisao` manda para o recolhível só "Critérios de aceite preliminares" e "Definição de pronto". Termo desconhecido fica visível. O resto está em `RevisaoDoPacote`, fora do recolhível. As Opções completas (descrição, vantagens, desvantagens, quando escolher) são o que o CV-12 deixa recolher. O repositório também aparece no cabeçalho. Os alertas vêm antes de tudo. Testes: unidade, HTML e e2e em 390 px, mais a 2ª rodada do C-14 em `decisao.spec.ts` | Atendido |
| Documento, caixa de revisão, frase fixada, diálogo com repositório e nível | e2e `decisao-celular.spec.ts` (CA-12.1, CA-12.2, CV-12) e a rodada em 390 px de `decisao.spec.ts`: tudo visível e obrigatório. A caixa continua com `aria-required` | Não mudou |
| Nenhuma opção marcada (P-01, CV-13, D-14) | O formulário continua começando com `opcaoEscolhida: ''`. Não há `defaultChecked` nem selo "Recomendada". A Recomendação foi para antes das opções (no DOM, antes do recolhível e do formulário). O e2e em 390 px confere os rádios desmarcados, a falta de "Recomendada" e a ordem pelo `compareDocumentPosition` | Atendido |
| Desatualizado (CV-11, A-03) | e2e em 390 e 1280 px: explicação visível no rodapé, `aria-disabled`, zero POST no clique forçado, pedido escondido. Em 1280 px o rodapé fica `static` | Atendido |

### O que mais foi conferido

- **Arranjo pedido no plano:** a ordem do DOM é a da T13. Em `xl:` o conteúdo fica em 3 de 5 colunas, "Registrar
  decisão" em 2 de 5 e não fixo, e o Pedido na linha toda. O `#rodape-da-decisao` tem as classes do plano, e o CSS dos
  `:has()` é o do plano, sem `url(` nem hexadecimal. O plano B do foco não foi preciso: o CA-12.3 passou no Chromium e o
  Safari vai para o UAT (G2).
- **CV-18:** `h1` = prefixo de hoje + `<bdi>{título}</bdi>`. O título só entra por expressão JSX. O e2e C-18 da T11 roda
  nas duas larguras.
- **CV-19:** "Voltar para a demanda" só existe quando `p.demandaId` casa `RE_ID_DEMANDA`. Essa regex é importada, e não
  copiada, por isso não há duplicação. O `href` é a rota fixa mais o id, e o ícone é SVG com `aria-hidden`.
- **Testes existentes que mudaram (G3.2, CV-20):**
  - `dados-da-decisao.test.ts`: três `idCampo` trocados (só seletor, pelo D-T12-01);
  - `pagina.test.ts`: o `h1` ganhou `<bdi>` com o mesmo texto, e um comentário foi corrigido (M3 da T12);
  - `decisao.spec.ts` e `seguranca.spec.ts`: só acréscimos.
  - Nenhuma asserção saiu. Não há `.skip`, `.only`, `retries`, tempo-limite, regra do axe desligada nem `bypassCSP`.
  - Exceção: o título de um teste perdeu um espaço (M1).
- **TDD:** a unidade foi vista vermelha (15 falhas) e o e2e também (9 falhas). Os trechos estão na entrega.
- **Verde nesta revisão:**
  - `pnpm test`: 5194 testes, 0 falhas (relatório JUnit);
  - `pnpm lint` e `pnpm typecheck` limpos;
  - árvore limpa;
  - o `pnpm test:e2e` não está na minha lista **Pode**. A entrega declara 226 de 226 na terceira rodada, e quem roda de
    novo é a `06-T13-testes`.

### Decisão sobre os desvios declarados

1. **`GrupoOpcoes.tsx` fora da lista: aceito.**
   - É o D-T12-02, que a revisão da T12 mandou para a T13, mais o parecer 1 da 06-T03-tech-lead.
   - Só mudaram classes. Na variante `lista` a expressão do rótulo é a mesma de antes.
   - O bloqueio de clique e de teclado da opção indisponível é o de hoje.
   - `componentes.test.ts` passa sem mudança.
2. **`src/components/decisao-celular.test.ts` novo: aceito.** Ele cobre os dois componentes comuns que mudaram (diálogo
   e cartão), em arquivo próprio, sem tocar nos testes existentes.
3. **Conta que cria versões nos e2e novos (C-36): aceito.**
   - O G3.10 limita só a criação de demanda, e nenhuma demanda é criada.
   - A "administradora" criar ESP, RSK e DEC pela API é permitido pela matriz de hoje, que está congelada (G4 vazio).
   - O e2e roda contra o servidor sem mudança, então reflete a regra vigente.
   - Quem aprova continua sendo a conta certa em cada cenário: a "cto" aprova como CTO, e a "administradora" faz a
     segunda aprovação. Quem cria o DEC não entra na regra testada.
   - Fica o orçamento por conta como pendência para a T16 e a T17 (M3).
4. **Instabilidade de `casca-qa.spec.ts:75`: não bloqueia a T13.**
   - É a gaveta da T05 em `/demandas`, e a T13 não toca a casca nem essa rota.
   - O CSS novo só vale com `#rodape-da-decisao` na página.
   - O `DialogoConfirmacao` não é a gaveta.
   - Vai como Minor (M4) para a `06-T13-testes` e para a T16.
5. **Dependência entre os C-18 da T05 e da T11 com banco reaproveitado: Minor, sem bloquear (M2).** Explico abaixo por
   que não é Important.
6. **Detalhe da revisão antes das Opções, dentro do recolhível: aceito.** O CV-12 deixa recolher as duas coisas, e a
   ordem dentro do bloco não afeta o C-14. A leitura por títulos fica melhor.
7. **CA-12.1 em dois DECs, testes juntados (CA-12.3 com CA-12.4, CV-13 com CV-19) e axe com `semViolacoes` em 390 px:
   aceitos.**
   - A cobertura é a do plano, com menos login seguido (o TOTP dá 429).
   - O `semViolacoesNasDuasLarguras` é da T16 (G5).

### Pareceres (todos Minor; nenhum bloqueia)

- **M1 — `e2e/seguranca.spec.ts:186`**
  - Problema: o título do teste existente passou de `'C-19: /demandas/[id] …'` para `'C-19:/demandas/[id] …'`. Perdeu
    o espaço depois dos dois-pontos.
  - Razão: é mudança em teste de segurança existente que a entrega não declarou e que nenhum motivo pede (G3.2, CV-20).
    Também atrapalha quem procura o teste pelo nome (`-g "C-19: "`) e o relatório comparado entre versões. Nenhuma
    asserção mudou.
  - Correção: devolver o espaço. É um caractere.
- **M2 — `e2e/seguranca.spec.ts:143-163`, com `:95` e `:118`**
  - Problema: o C-18 novo da T11 grava ESP, RSK e DEC na `textoDeTerceiro`. O C-18 da T05, que na linha 94 diz "Só lê:
    nada é gravado", espera nessa mesma demanda a Próxima ação "Escrever a especificação técnica.", ou seja, a demanda
    sem ESP.
  - Consequência: o teste da T05 passa a depender de rodar antes do da T11 e de o banco ser novo. Numa segunda execução
    contra o mesmo banco (`BASE_URL` reaproveitado, ou `--repeat-each` neste arquivo), ele reprova. O padrão técnico, na
    seção 7, diz que teste não depende de ordem.
  - Por que é Minor e não Important:
    - nos dois lugares onde a suíte roda, o banco é sempre novo: o servidor local sobe Postgres pelo Testcontainers, e o
      `homologar` da 09 derruba tudo, volumes inclusive (padrão, seção 9);
    - `playwright.config.ts` roda em série (`workers: 1`), então a ordem dentro do arquivo é fixa;
    - o teste novo é idempotente: acha o que já existe e não cria de novo.
  - Correção: uma demanda própria no seed para o C-18 da T11, com o mesmo título de ataque e outra chave em
    `TITULOS_DO_E2E`. O seed é `scripts/`, que é do `engenheiro-backend`. Depois o e2e passa a usar essa chave, o que é
    do `engenheiro-frontend`.
  - Não há tarefa de backend pela frente no plano, então isto vai para a 08. A correção não pode trocar asserção do
    teste da T05 nem pôr `skip` nele (CV-20).
- **M3 — `e2e/decisao-celular.spec.ts:8-19` e `e2e/seguranca.spec.ts:8-12`**
  - Problema: a conta "cto" fica perto do teto de 60 versões por hora na suíte. A folga foi obtida passando a criação
    para a "administradora".
  - Razão: a T16 e a T17 ainda vão acrescentar e2e. Se criarem versões com a "cto", a suíte volta a receber 429 em cascata,
    como na 1ª rodada da entrega.
  - Correção:
    - a T16 e a T17 criam versões com a "administradora", ou com outra conta do seed;
    - a `06-T13-testes` registra o uso por conta da suíte (demandas e versões por hora) num só lugar, para a 08
      conferir.
- **M4 — `e2e/casca-qa.spec.ts:75`**
  - Problema: o teste falhou uma vez em três suítes, com "subtree intercepts pointer events" em `abrirGaveta`.
  - Razão: um teste instável na suíte vai derrubar o `homologar` da 09 de vez em quando. A causa provável é a espera pela
    animação da gaveta (Minor 1 da revisão da T05), e não a T13.
  - Correção: a `06-T13-testes` roda a suíte de novo e diz se a falha se repete. A T16, do `engenheiro-frontend`, faz o
    apoio da gaveta esperar o fim da animação (`animationend`, ou a gaveta estável) antes do clique, sem aumentar o
    tempo-limite.

## Decisões tomadas

- A T13 está aprovada. Não há Critical nem Important, e os quatro Minor vão para Pendências (seção 12: só Critical e
  Important bloqueiam).
- Nenhuma action, regra ou exigência de aprovação mudou:
  - as superfícies do G4 estão sem diff, e também as funções de regra de `dados-da-decisao.ts` e a lógica do formulário;
  - a única mudança de comportamento é o alvo do foco do link do resumo (D-T12-01), que leva a um elemento que existe;
  - nenhuma opção vem marcada (P-01).
- Os sete desvios foram aceitos, cada um pela razão escrita acima. Nenhum afrouxa CV-10 a CV-15, CV-18, CV-19, CV-20 nem
  CV-01.
- A dependência entre os C-18 fica Minor, com correção pelo seed na 08. Os ambientes onde a suíte roda sempre usam banco
  novo, e corrigir agora exigiria `scripts/`, que não é do engenheiro desta tarefa.
- O M1 vai para a T16, que já mexe nos e2e. Por um caractere não abro correção nesta passagem.

## Pendências

- **Minor M1, para a T16 (`engenheiro-frontend`):** devolver o espaço do título em `e2e/seguranca.spec.ts:186`
  (`'C-19: /demandas/[id] …'`).
- **Minor M2, para a 08 (maestro) e, se ele abrir correção, para o `engenheiro-backend` e depois o
  `engenheiro-frontend`:**
  - uma demanda própria no seed para o C-18 da T11 (`scripts/seed-ficticio.ts`, chave nova em `TITULOS_DO_E2E`, mesmo
    título de ataque);
  - o caso da T11 de `seguranca.spec.ts` passa a usar essa chave;
  - sem tocar nas asserções do caso da T05.
  - Até lá, nenhum `pnpm test:e2e` deve rodar duas vezes contra o mesmo banco.
- **Minor M3, para a T16, a T17 e a `06-T13-testes`:**
  - versões novas dos e2e com a "administradora", ou com outra conta do seed, nunca com a "cto";
  - a `06-T13-testes` registra o uso por conta da suíte.
- **Minor M4:**
  - para a `06-T13-testes` (`qa-automacao`): rodar a suíte e dizer se `casca-qa.spec.ts:75` se repete;
  - para a T16 (`engenheiro-frontend`): estabilizar `abrirGaveta` esperando a animação, sem `retries` nem tempo-limite.
- **Para a `06-T13-testes` (`qa-automacao`):** rodar de novo `decisao-celular.spec.ts`, `decisao.spec.ts`,
  `seguranca.spec.ts` e a suíte inteira.
- **Para a 07 (`qa-funcional`), como a entrega já lista:**
  - o recolhível com leitor de tela;
  - o diálogo empilhado nas outras telas em 390 px;
  - o cartão indisponível.
- **Para Fabiano (UAT, P-04):** a T11 em 390 px no Safari do iOS, já que o plano B do foco não entrou.
- **Para a T16 (já registrado na entrega):**
  - `text-texto-suave` na variante `lista` do `GrupoOpcoes`;
  - a limpeza de `opcoesDaDecisao`, `legendaDecisao`, `aprovar` e `devolver` sem uso.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 472439e` — 15 arquivos: 13 de código e teste, a entrega e `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 472439e -- src/components/dados-da-decisao.ts src/components/GrupoOpcoes.tsx src/components/DialogoConfirmacao.tsx src/app/globals.css "src/app/(painel)/pacotes-decisao/[decId]/FormularioDecisao.tsx" "src/app/(painel)/pacotes-decisao/[decId]/RevisaoDoPacote.tsx"` — diff dos componentes, do CSS e do formulário
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 472439e -- "src/app/(painel)/pacotes-decisao/[decId]/page.tsx"` — diff da página
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 472439e -- src/components/dados-da-decisao.test.ts src/components/decisao-celular.test.ts "src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts"` — diff dos testes de unidade e de HTML
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 472439e -- e2e/decisao.spec.ts e2e/seguranca.spec.ts` — diff dos e2e existentes (achado M1)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 198e97d -- src/proxy.ts src/proxy.test.ts next.config.ts src/app/api src/db drizzle src/modules/acesso src/worker src/jobs src/agents src/lib/auth.ts src/lib/auth-cliente.ts src/lib/qr.ts src/lib/log.ts src/lib/erros.ts src/instrumentation.ts pnpm-workspace.yaml "src/app/(painel)/configuracao/agentes/acoes.ts" "src/app/(painel)/demandas/[id]/acoes.ts" "src/app/(painel)/demandas/[id]/editar/acoes.ts" "src/app/(painel)/demandas/[id]/especificacoes/nova/acoes.ts" "src/app/(painel)/demandas/[id]/pacotes-decisao/novo/acoes.ts" "src/app/(painel)/demandas/[id]/pareceres-risco/novo/acoes.ts" "src/app/(painel)/demandas/nova/acoes.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes.ts"` — vazio (CV-01)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 198e97d -- src/modules package.json pnpm-lock.yaml` — só `package.json` (+2) e lock (+16) da T02 e `resumo-da-fila.*` da T07
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent --reporter=junit --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/0a919744-0e04-42d0-bf4b-e75d6acefb82/scratchpad/t13-revisao.xml` — 5194 testes, 0 falhas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -n 1 --format=%h -S "CV-12" -- docs/construcao/DEC-DEM-20261110-0015-v1/04-seguranca-aplicacao.md` — fcb8be1 (confirma o CV-12 no 04; li o texto com Read)

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`

Checklist da seção 12:

- [x] A tarefa faz o que o plano pede, nem mais nem menos; arquivos fora da tarefa não mudaram. Os acréscimos
  (`GrupoOpcoes.tsx`, `decisao-celular.test.ts` e `pagina.test.ts`) são das pendências da T03 e da T12 e da mesma tela.
  Foram aceitos acima.
- [x] Há teste para cada comportamento novo, e ele falharia sem o código. A unidade e o e2e foram vistos vermelhos, com
  trecho na entrega. Cada critério (CA-12.1 a CA-12.6, CV-11, CV-12, CV-13, CV-18, CV-19) tem caso.
- [x] Nenhum segredo, valor de `.env` ou dado pessoal real em código, teste, log ou fixture. Só aparecem "Pessoa Ficticia
  …", `DOC-FICTICIO-0013`, `…/sistema-ficticio` e títulos com "(fictício)".
- [x] Entrada externa validada com Zod; erro sem vazar detalhe. Nenhuma rota, Server Action ou schema mudou (G4 vazio).
  O `href` novo sai de id validado por regex (CV-19).
- [x] Banco: migration gerada, papel migrator, RLS e guarda quando houver `tenant_id`. Não se aplica: a tarefa não toca
  banco nem esquema.
- [x] Nada duplica função que já existe no repositório. `RE_ID_DEMANDA` é importada, e não copiada. A revisão reaproveita
  `itensDaRevisao`, e os ids dos botões têm uma só fonte (`ID_DOS_BOTOES`).
- [x] Textos de interface em pt-BR; axe sem violação nas telas tocadas. Os textos novos são os da 03, seção 9, com teste
  literal. O axe roda na T11 em 390 px em todos os estados (pendente, erro, diálogo, recolhível aberto, desatualizado,
  decidida e substituída). A nova execução é da `06-T13-testes`.
- [x] O que é Minor vai para Pendências; só Critical e Important bloqueiam a passagem.
- [x] No PR: `/code-review` uma vez, correção do Critical/Important, re-revisão só do diff das correções e
  `/security-review` no fim. Não se aplica a esta etapa: é da `08-revisao`.
