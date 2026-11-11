---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T11-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12), tarefas.json, docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md (G1 a G7, T11), 03-ux-ui-design.md (seção 0), 06-T10-tech-lead.md, 06-T11-engenheiro-frontend.md, commits f6558c3 e 3c364f5, src/app/(painel)/demandas/[id]/page.tsx, BarraDeEtapas.tsx, CartaoProximaAcao.tsx, Historico.tsx, detalhe.ts, LinkNestaPagina.tsx, detalhe.test.ts, detalhe-qa.test.ts, src/app/(painel)/demandas/CartoesDaFila.tsx, formularios-paginas-qa.test.ts, src/components/LinhaDoTempo.tsx, src/components/Cartao.tsx, src/app/globals.css, src/modules/acesso/matriz.ts, test/estatico/detalhe-dec.test.ts, e2e/detalhe-a2.spec.ts, e2e/detalhe-demanda.spec.ts, e2e/seguranca.spec.ts, e2e/axe-todas.spec.ts]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T11 (T05 no arranjo A2, `engenheiro-frontend`). O código está no commit `f6558c3`. O `3c364f5` só ajusta a
entrega e o registro do maestro. **Parecer: aprovada, sem Critical nem Important.** Há três Minor, que vão para
Pendências como dívida.

### O que foi conferido

- **Escopo:** os arquivos criados e modificados são os da lista da T11 no plano. Ficam fora dela:
  - `CartoesDaFila.tsx`, só com `export` em `COR_DA_URGENCIA`, sem mudança de valor;
  - `detalhe.ts`: entram três textos (trilha e urgência) e sai o bloco `historico` da tabela;
  - quatro testes existentes, cada um explicado na entrega, trecho a trecho (G3.2).

  A árvore está limpa.
- **Leitura nova e CV-09** (`page.tsx:353-361`):
  - `decResumo = d.pacotesDecisao[0]`;
  - `autorizar(pessoa, 'ler_pacote_decisao')` vem antes do `Promise.all`, e `obterPacoteDecisao(deps.db,
    decResumo.id)` fica no mesmo `Promise.all`. É a forma do plano;
  - o id nunca vem de `params` nem de `searchParams`;
  - o teste estático `detalhe-dec.test.ts` lê a árvore do TypeScript, e 11 casos plantados provam cada regra;
  - o teste de unidade confere a ordem por `invocationCallOrder`, passa `?dec=`/`?decId=` na URL e checa as sentinelas
    de nome e documento do aprovador fora do HTML.
  - Conferi em `src/modules/acesso/matriz.ts:52` que `ler_pacote_decisao` é `LEITURA` (qualquer pessoa). A autorização
    nova não tira o acesso de nenhum papel que já lia a T05.
- **Pendências da T10:** as funções recebem a mesma `esp` que a página já lê (`page.tsx:369`). Não há segunda leitura, e
  o `conferir` da T10 não dispara. A barra e o cartão só desenham o resultado e não chamam regra (CA-09.4).
- **Arranjo A2 (03, seção 5):**
  - a ordem do DOM é trilha, cabeçalho, "Nesta página", alertas, barra, Próxima ação, Dados, Dúvidas, Versões, Status,
    Texto recebido e Histórico;
  - a coluna lateral a partir de 1200 px é só CSS (`xl:col-start-3`), e o `grid-cols-1` evita a rolagem lateral em
    390 px;
  - os testes de unidade (posições no HTML) e o e2e (caixas em 1280 e 390 px) cobrem os dois arranjos.
- **Nada da T05 de hoje some:**
  - continuam os selos, "Editar dados", "Nesta página" (mesma lista, conferida dentro do `nav`), Dúvidas, Versões com os
    botões nas mesmas condições, Mudar status, Texto recebido e os alertas de topo;
  - o histórico tem as mesmas cinco informações, agora em lista e com todos os eventos (CA-10.2);
  - o `h1` ganhou `<bdi>` (CV-18);
  - "Mudar status" também aparece no cabeçalho e leva o foco ao `h2` Status.
- **Tokens:** só nomes da 03 nas linhas novas (`marinho`, `acao`, `acao-escura`, `tinta-media`, `tinta-suave`, `linha`,
  `branco`, `azul-claro`, `texto-claro`, `selo-verde`, `atencao`), todos no `@theme` de `globals.css`. Não há
  hexadecimal, `style=` nem `dangerouslySetInnerHTML`.
- **Testes existentes que mudaram (G3.2):**
  - nenhuma asserção foi apagada sem equivalente. As do `<caption>`, dos `<th>` e de `aria-label="Tabela do
    histórico"` falavam da tabela, que deixou de existir. Elas viraram o texto da ordem antes do `ol`, um `<li>` por
    evento e "Antes: Nova. Depois: Em análise.";
  - as contagens de link do `detalhe-qa.test.ts` continuam 2 fora do cartão, e cada uma ganhou a asserção de 1 dentro
    dele;
  - não houve `.skip`, `.only`, `retries`, tempo-limite nem regra do axe desligada.
- **CV-01 (G4):**
  - o `git diff 198e97d` das superfícies congeladas saiu vazio;
  - `git diff --stat 198e97d -- src/modules package.json` lista só `resumo-da-fila.ts` e o teste dele (T07), mais as
    2 linhas do `package.json` (T02);
  - não há `'use server'` novo.
- **Verde nesta revisão:**
  - `pnpm test`: 5134 testes, 0 falhas (relatório JUnit);
  - `pnpm lint` e `pnpm typecheck` limpos;
  - o `pnpm test:e2e` não está na minha lista **Pode**. A entrega declara 205 de 205, e quem roda de novo é a
    `06-T11-testes`.

### Decisão sobre os desvios declarados pelo engenheiro

1. **O e2e não foi visto vermelho: aceito como Minor.** A suíte de unidade foi vista falhando, e o trecho está na
   entrega. Os seletores do e2e novo (`list "Etapas da demanda"`, `region "Próxima ação"`, `nav "Trilha"`) não
   existiam antes do código, então o e2e não tinha como passar sem ele. Na T09 a decisão foi a mesma.
2. **CA-08.3 e os 30 eventos do CA-10.2 só em unidade: aceito.** Criar ou encerrar demanda no e2e gastaria o C-36
   (G3.10) ou mudaria o dado de outro teste. O e2e confere "todos" contra a API na `etapasDupla`.
3. **Testes existentes fora do G5: aceitos.** Cada mudança é de seletor, de texto literal (`<bdi>`, lista no lugar da
   tabela) ou do escopo da contagem, e todas estão explicadas na entrega.
4. **`data-marca` na marca da barra: aceito.** Segue o princípio do D-15: o teste não depende de nome de classe.
5. **`export` de `COR_DA_URGENCIA`: aceito, com o Minor M1 abaixo.** O mapa não ficou duplicado, mas a dependência
   entre rotas é nova.
6. **Testes dos componentes novos em `detalhe.test.ts`: aceito.** Esse arquivo já tem os dublês da página.

### Pareceres (todos Minor; nenhum bloqueia)

- **M1 — `src/app/(painel)/demandas/[id]/page.tsx:55`**
  - Problema: a página da T05 importa `COR_DA_URGENCIA` de `../CartoesDaFila`, que é um componente da rota da fila
    (T03).
  - Razão: a T05 passa a depender de um arquivo de outra tela. Uma mudança na fila pode quebrar o detalhe, e
    `CartoesDaFila.tsx` também carrega o tipo de `resumo-da-fila`, uma cadeia que o CV-06 vigia. O mapa é rótulo de
    exibição e devia morar em `src/components/` (`rotulos.ts`, junto de `ROTULO_URGENCIA`, ou `dados-da-fila.ts`),
    importado pelas duas telas.
- **M2 — `src/components/LinhaDoTempo.tsx:18`**
  - Problema: `antesEDepois` é uma regra de exibição (omite a parte vazia e junta "Antes: …" com "Depois: …") e está
    num componente.
  - Razão: o G3.7 diz que regra de exibição fica em função pura de `src/components/dados-*.ts`, com teste de unidade
    próprio. Hoje ela só é testada por dentro do `Historico.tsx`. O efeito é pequeno, porque a função é pura e está
    coberta.
- **M3 — `src/app/(painel)/demandas/[id]/BarraDeEtapas.tsx:24`**
  - Problema: o `<svg>` do visto não tem `aria-hidden="true"` próprio. Quem esconde é o `span` pai.
  - Razão: o G3.4 pede o atributo no SVG. Para o leitor de tela não muda nada, porque o pai já está escondido. É
    aderência ao padrão, para o teste estático da T16 não ter exceção.

## Decisões tomadas

- A T11 está aprovada. Não há Critical nem Important, e os três Minor vão para Pendências (seção 12: só Critical e
  Important bloqueiam).
- Os seis desvios declarados foram aceitos, cada um pela razão escrita acima. Nenhum afrouxa o CV-09, o CV-18 nem o
  CV-01, e nenhum apaga asserção sem equivalente.
- A autorização nova de `ler_pacote_decisao` não é regressão de acesso, porque a matriz a dá a toda pessoa
  (`matriz.ts:52`).

## Pendências

- **Minor, dívida de código (D-T11-01, M1):**
  - mover `COR_DA_URGENCIA` para `src/components/` e fazer `CartoesDaFila.tsx` e `page.tsx` importarem de lá;
  - onde: na T16, que já passa por tokens e rótulos, ou numa correção da 08;
  - custo: cerca de 15 minutos, sem mudança de teste.
- **Minor, dívida de padrão (D-T11-02, M2):**
  - mover `antesEDepois` e `TEXTOS_LINHA_DO_TEMPO` para um `dados-*.ts`, com teste de unidade próprio (antes vazio,
    depois vazio, os dois e nenhum);
  - onde: na T16 ou na 08;
  - custo: cerca de 20 minutos.
- **Minor, dívida de padrão (D-T11-03, M3):**
  - pôr `aria-hidden="true"` no `<svg>` do `Visto` (`BarraDeEtapas.tsx:24`);
  - onde: na T16, que fecha a acessibilidade das telas;
  - custo: 1 linha.
- **Para o `qa-automacao` (06-T11-testes), sem bloquear:** o `ipFicticio()` de `e2e/apoio.ts` zera o contador quando o
  Playwright troca de worker depois de uma falha. Os logins seguintes repetem IPs dentro da janela de 1 minuto e
  recebem 429, e assim uma falha vira três.
  - Peço que a 06-T11-testes rode o e2e de novo sabendo disso. Se o 429 aparecer, a causa está nesse ponto e não na
    T11.
  - A correção (semente do contador por `testInfo.workerIndex` ou pelo relógio) fica com a T16 ou com a 08. O dono é o
    `engenheiro-frontend`, porque o G1 só dá `e2e/` a ele.
- **Para a 07 (`qa-funcional`), como a entrega já lista:**
  - a ordem de Tab (Próxima ação antes de Dados);
  - o anúncio do `aria-current="step"`;
  - o separador " · " do histórico;
  - os dois "Mudar status", o do cabeçalho e o da navegação, que levam ao mesmo `h2`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat f6558c3` — 17 arquivos, os da T11
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 3c364f5` — só a entrega e `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -1 --format=%h -S "### Tarefa T11" -- docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md` — vazio (o título é `### T11.`; li pelo Read)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show f6558c3 -- "src/app/(painel)/demandas/[id]/page.tsx"` — diff da página
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show f6558c3 -- "src/app/(painel)/demandas/CartoesDaFila.tsx" "src/app/(painel)/demandas/[id]/BarraDeEtapas.tsx" "src/app/(painel)/demandas/[id]/CartaoProximaAcao.tsx" "src/app/(painel)/demandas/[id]/Historico.tsx" "src/app/(painel)/demandas/[id]/detalhe.ts" src/components/LinhaDoTempo.tsx` — diff dos componentes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show f6558c3 -- e2e/axe-todas.spec.ts e2e/detalhe-demanda.spec.ts e2e/seguranca.spec.ts "src/app/(painel)/demandas/[id]/detalhe-qa.test.ts" "src/app/(painel)/demandas/formularios-paginas-qa.test.ts"` — diff dos testes existentes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show f6558c3 -- "src/app/(painel)/demandas/[id]/detalhe.test.ts"` — diff do teste de unidade da T05
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 198e97d -- src/proxy.ts src/proxy.test.ts next.config.ts src/app/api src/db drizzle src/modules/acesso src/worker src/jobs src/agents src/lib/auth.ts src/lib/auth-cliente.ts src/lib/qr.ts src/lib/log.ts src/lib/erros.ts src/instrumentation.ts pnpm-workspace.yaml "src/app/(painel)/configuracao/agentes/acoes.ts" "src/app/(painel)/demandas/[id]/acoes.ts" "src/app/(painel)/demandas/[id]/editar/acoes.ts" "src/app/(painel)/demandas/[id]/especificacoes/nova/acoes.ts" "src/app/(painel)/demandas/[id]/pacotes-decisao/novo/acoes.ts" "src/app/(painel)/demandas/[id]/pareceres-risco/novo/acoes.ts" "src/app/(painel)/demandas/nova/acoes.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes.ts"` — vazio (CV-01)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 198e97d -- src/modules package.json` — `package.json` (2+), `resumo-da-fila.ts` e o teste dele
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — vazio
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=junit --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/0a919744-0e04-42d0-bf4b-e75d6acefb82/scratchpad/t11-revisao.xml --silent` — 5134 testes, 0 falhas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -1 --format=%h --name-only -S "ler_pacote_decisao" -- src/modules/acesso` — `matriz.ts`, quem pode `ler_pacote_decisao`

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`

Checklist da seção 12:

- [x] A tarefa faz o que o plano pede, nem mais nem menos; arquivos fora da tarefa não mudaram. Os acréscimos são os
  desvios 3 a 5, aceitos acima.
- [x] Há teste para cada comportamento novo, e ele falharia sem o código. Unidade vista vermelha; o e2e depende de
  elementos que não existiam (desvio 1).
- [x] Nenhum segredo, valor de `.env` ou dado pessoal real em código, teste, log ou fixture. Só "Pessoa Ficticia …",
  ids `DEM-…` fictícios e sentinelas.
- [x] Entrada externa validada com Zod; erro sem vazar detalhe. Não se aplica: a T11 não cria rota nem Server Action, e
  o id do DEC vem da vista da demanda, não da entrada.
- [x] Banco: migration gerada, papel migrator, RLS e guarda quando houver `tenant_id`. Não se aplica: só leitura por
  função que já existia (`obterPacoteDecisao`), sem esquema novo.
- [x] Nada duplica função que já existe no repositório. `COR_DA_URGENCIA` foi exportado, não copiado; o lugar dele é o
  Minor M1.
- [x] Textos de interface em pt-BR; axe sem violação nas telas tocadas. Os textos estão em constantes da 03, seção 9.
  O axe roda na T05 em 1280 e 390 px (`detalhe-a2.spec.ts`, `detalhe-demanda.spec.ts`, `axe-todas.spec.ts`). A nova
  execução é da 06-T11-testes.
- [x] O que é Minor vai para Pendências; só Critical e Important bloqueiam a passagem.
- [x] No PR: `/code-review` uma vez, correção do Critical/Important, re-revisão só do diff das correções e
  `/security-review` no fim. Não se aplica a esta etapa: é da `08-revisao`.
