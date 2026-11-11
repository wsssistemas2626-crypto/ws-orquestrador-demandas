---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T16-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12), tarefas.json, docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md (G1 a G6, T15 a T17), 06-T16-engenheiro-frontend.md, commit f66188b (git show, código e testes), 06-T03-tech-lead.md, 06-T05-tech-lead.md (atual e bd54155), 06-T09-tech-lead.md, 06-T09-qa-automacao.md, 06-T13-tech-lead.md, 06-T14-tech-lead.md, 06-T15-tech-lead.md, src/app/globals.css, src/components/Botao.tsx, src/components/Paginacao.tsx, src/components/GrupoOpcoes.tsx (linhas 1 a 75), src/app/(painel)/layout.tsx, src/app/(painel)/demandas/[id]/page.tsx (linhas 96 a 295), src/app/(painel)/demandas/fila.tsx (linhas 90 a 227), src/app/(painel)/demandas/FiltrosFila.tsx, src/app/(painel)/demandas/ContadoresDaFila.tsx, e2e/casca-qa.spec.ts (linhas 1 a 90)]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T16 (axe em T01 a T12 nas duas larguras, alvo de toque e fim dos nomes antigos de token), commit `f66188b`.
**Aprovada.** Não há Critical nem Important. Ficam três Minor, em Pendências, e as duas decisões que o maestro pediu.

### Checklist da seção 12 do padrão técnico

| Item | Resultado |
|---|---|
| Faz o que o plano pede, nem mais nem menos; só arquivos da tarefa | Sim. O plano da T16 está todo feito: `semViolacoesNasDuasLarguras` em `e2e/apoio.ts`; a troca do G5 na `axe-todas`, com "Mais filtros", a gaveta e o recolhível da T11 abertos; o bloco dos nove apelidos fora do `@theme`; as 23 classes antigas trocadas pelo mapa da 03, 2.1; `classes-antigas.test.ts` e `alvo-de-toque.spec.ts` criados. Os arquivos fora da lista vêm dos itens que o maestro passou, e cada um bate com o pedido da revisão de origem (ver a tabela abaixo). Conferi o diff de `src/` linha a linha: só mudaram classe, constante de classe, import, `export` e comentário. Nenhum texto, condição, `aria-*` ou chamada mudou |
| Teste para cada comportamento novo, que falharia sem o código | Sim. A entrega mostra quatro saídas vermelhas antes do código: `classes-antigas` com 23 achados e os nove apelidos; `tipografia-h2` com 16 achados; o "Ver" com 26 × 24 px no `alvo-de-toque`; o peso `400` do id no `fontes-qa`. Isso atende ao Minor 4 da T09 e ao Minor 3 da T05. O que ficou sem teste (o `min-h-11` de "Ver agentes e teto") está no Minor 1 |
| Sem segredo, `.env` ou dado pessoal real | Sim. Os testes usam só as contas fictícias e as demandas do seed |
| Entrada externa com Zod; erro sem detalhe | Não se aplica: nenhuma rota, Server Action nem esquema mudou. CV-01 (G4) saiu vazio. Em `src/modules` só aparecem `resumo-da-fila.*` (T07), e `package.json` e o lock só têm as linhas da T02 |
| Banco: migration, migrator, RLS | Não se aplica |
| Nada duplica função que já existe | Em `src/`, sim: o `Icone`, a `CLASSE_DA_ETIQUETA` e o `NAO_INFORMADA` ficaram cada um num lugar só. Em `e2e/`, sobram cópias de auxiliar (Minor 2) |
| Textos em pt-BR; axe sem violação nas telas tocadas | Sim. Nenhum texto de interface mudou. Toda tela da `axe-todas` roda o axe em 1280 × 720 e em 390 × 844, com a regra `target-size` ligada e o `header` incluído. A entrega declara 240 de 240 na suíte e2e. Eu não rodo e2e: a `06-T16-testes` é quem roda |
| Minor em Pendências; só Critical e Important bloqueiam | Sim |
| No PR: `/code-review` e `/security-review` | Fica com a `08-revisao`, pela G2 |

Nesta revisão também conferi:

- `pnpm test`: 5211 testes, 0 falhas, 0 erros. O `piso-de-assercoes` e o `decisao-e2e` estão nessa conta;
- `pnpm lint` e `pnpm typecheck`: limpos;
- a árvore ficou limpa depois dos testes.

### Testes que já existiam e mudaram (G3.2, CV-20)

- **`painel-qa.test.ts` e `tokens-em-uso.test.ts`: aceito.** As nove linhas que conferiam os apelidos passaram a
  conferir que eles não existem, com as mesmas chaves e o mesmo número de `expect`. O D-01 manda os apelidos saírem na
  T16, então a regra antiga tinha prazo, e o inverso dela é o que vale agora. Os pisos baixaram pela mesma razão, sem
  folga a mais: `TOKENS.size` passou de 39 para 30, porque os 30 tokens da 03 continuam e os 9 apelidos saíram; os
  `var()` passaram de mais de 9 para pelo menos 7, que são os da base. A conferência de que todo `var()` aponta para um
  token declarado continua igual.
- **`lista-textos`, `componentes-qa`, `detalhe` e `pagina` (T11): aceito.** Trocou só o nome da classe no seletor, pelo
  mapa da 03. Elemento, id, texto e ordem são os mesmos.
- **`fontes-qa.spec.ts`: aceito.** É a decisão 1 da T09: o peso conferido do id deixou de ser 400 fixo e passou a ser
  o peso computado dele. Entrou uma asserção (`'600'`), e nenhuma saiu. A linha do G5 fica registrada por esta revisão,
  como a T09 previu.
- **`casca.spec.ts`, `reflow.spec.ts` e `seguranca.spec.ts`: aceito.** São o M4 e o M1 da T13 e o Minor 2 da T15: um
  passo equivalente, um seletor mais estreito e um espaço no título. Nenhuma asserção mudou.
- Não há `.skip`, `.only`, `retries`, aumento de tempo-limite, regra do axe desligada nem `bypassCSP`.

### Volta ao topo dentro de `semViolacoesNasDuasLarguras`: aceita

É o caminho que a 06-T14-tech-lead definiu. Depois de cada troca de largura, a página vai a uma posição de rolagem
fixa, e o comentário cita a origem. A regra `target-size` continua ligada e o `header` continua no axe. O
`nova-demanda.spec.ts:171` não precisou mudar. Um alvo pequeno de verdade continua reprovando com a página no topo.

### Itens que o maestro passou: conferência um a um

| Origem | Pedido | Situação |
|---|---|---|
| 06-T03-tech-lead, parecer 2 | Classes antigas em `CampoTexto`, `AreaTexto`, `ListaTextos` e `GrupoOpcoes`, com os seletores dos testes | Feito. A varredura do `classes-antigas.test.ts` saiu vazia. O `detalhe-qa.test.ts` da lista não precisou de troca, e a suíte passa |
| 06-T05-tech-lead (bd54155), Minor 1 | "Menu" com `classeDoBotao('sobre-escuro')` mais `shrink-0 px-3` | Feito (`CabecalhoPainel.tsx:43`), no mesmo molde do "Fechar menu" |
| 06-T05-tech-lead (bd54155), Minor 2 | Exportar o `Icone` e usá-lo no "Menu" e no "Fechar menu" | Feito. O `aria-hidden` e o `focusable` ficaram num lugar só (`ItensDoMenu.tsx:14`) |
| 06-T05-tech-lead (bd54155), Pendências | `AvisosDaMoldura` com `max-w-6xl` e `text-atencao-texto` | Feito. A largura e as margens agora são as do `main` de `layout.tsx:60`. O link solto tem 44 px abaixo de 768 px, mas não tem teste (Minor 1) |
| 06-T05-tech-lead (volta 1), Minor 1 | `gavetaParada` junto do `abrirGaveta` | Feito em `casca.spec.ts:45-47` |
| 06-T09-tech-lead, pendência 1 | Id em Mono 600 nas duas formas, `fontes-qa` pelo peso computado, sem o comentário de `fila.tsx:90-91` | Feito |
| 06-T09-tech-lead, pendência 3 | `NAO_INFORMADA` e a classe da etiqueta, cada uma num lugar só | Feito. São três usos da etiqueta: cartão, "Fila" e os termos da T05 |
| 06-T13-tech-lead, M1 | Espaço no título do C-19 | Feito (`seguranca.spec.ts:186`) |
| 06-T13-tech-lead, M3 | Teste novo sem criar versão com a "cto" | Cumprido. Os e2e novos só leem, e o `alvo-de-toque` entra com a "administradora" na T03, T05 e T11 |
| 06-T13-tech-lead, M4, e 06-T13-qa-automacao | `abrirGaveta` só clica com a gaveta fechada e espera a animação | Feito em `casca.spec.ts`. O `casca-qa.spec.ts` já tinha a primeira parte, mas não espera a animação. Os auxiliares seguem copiados (Minor 2) |
| 06-T14-tech-lead, Minor 3 | `target-size` sob a barra fixa | Feito, como descrito acima |
| 06-T15-tech-lead, Minor 1 | `h2` da T10 e da T12 na escala da 03, e os outros `h2` do painel | Feito, com o `tipografia-h2.test.ts` para não voltar. A exceção da etiqueta da 5.5 tem caso plantado. Os `h3` ficaram de fora (Minor 3) |
| 06-T15-tech-lead, Minor 2 | `closest('section.rounded-cartao')` | Feito (`reflow.spec.ts:123`) |
| 06-T13-engenheiro-frontend | `text-texto-suave` da variante `lista` do `GrupoOpcoes` | Feito (`GrupoOpcoes.tsx:77`) |
| 06-T13-engenheiro-frontend | Limpeza de `opcoesDaDecisao`, `legendaDecisao`, `aprovar` e `devolver` | Não entrou, com motivo. Decisão abaixo |
| 06-T09-qa-automacao | Contadores sem script | Não entrou, com motivo. Decisão abaixo |

### Decisão sobre os dois itens que ficaram de fora

1. **Limpeza de `opcoesDaDecisao`, `legendaDecisao`, `TEXTOS_DECISAO.aprovar` e `.devolver`: fica para depois do
   pedido, como dívida técnica.**
   - Código morto não tem efeito na tela, na regra nem na segurança.
   - Para tirar esse código, seria preciso apagar asserções de `src/components/dados-da-decisao.test.ts` e talvez
     baixar o piso desse arquivo no `piso-de-assercoes.test.ts` (D-12). Isso é justamente o que o CV-20 vigia neste
     pedido. Fazer isso na 08 obrigaria a `08-reteste` a justificar um piso menor só para apagar código sem uso.
   - Registro de dívida:
     - **impacto:** baixo (só leitura do código);
     - **custo:** menos de uma hora, numa tarefa do `engenheiro-frontend` de um pedido seguinte da linha 0.2.x;
     - **como fazer:** tirar os quatro símbolos e as asserções deles, e recalcular o piso na base nova.
2. **Contadores sem script: na 08 entra só a correção dos comentários. O suporte sem script fica para depois do
   pedido.**
   - O painel já não funciona sem script desde a 0.1.13. A lista fica no esqueleto, como diz o Minor 1 da 06-T38-testes,
     já aceito. Os contadores desabilitados não tiram de ninguém um caminho que funcionava.
   - O "carregando" com botões desabilitados é desenho da 03, 4.6, e não é decisão do tech-lead.
   - Neste pedido, vale registrar que **o painel exige JavaScript**: é a opção 3 da qa-automacao, e o desenho da 03 fica
     como está.
   - **Na 08:** só os comentários que dizem o contrário, sem mudar nenhuma asserção. São eles:
     `ContadoresDaFila.tsx:4-6` ("sem script, o GET comum filtra do mesmo jeito") e `FiltrosFila.tsx:4-5` ("sem script,
     o mesmo formulário funciona como GET comum"). A correção entra junto com a do M2 da T13, se a 08 abrir correção
     para o `engenheiro-frontend`. Se a 08 não abrir correção, os comentários vão para depois do pedido.
   - **Depois do pedido:** o suporte sem script (lista e contadores) é um item de produto para a
     `desenvolvimento-produto` com a `ux-ui-design`. A razão: pede rever a 03, 4.6 e o carregamento da lista, e muda uma
     asserção de `fila-a1.test.ts`. Quando entrar, o teste-sonda da 06-T09-qa-automacao volta.

### Pareceres (todos Minor; nenhum bloqueia)

1. **`e2e/alvo-de-toque.spec.ts:31-35` (`dentroDeFrase`) e `:3`, `src/components/AvisosDaMoldura.tsx:26`.**
   - **Problema:** o filtro de "link dentro de frase" compara o `textContent` inteiro do pai com o do link. Por isso,
     todo link solto cujo pai tem outro elemento com texto fica fora da medição. É o caso do id no cartão da T03
     (`CartoesDaFila.tsx:66-69`): o pai é a linha que também tem o `Selo`. É também o caso de "Ver agentes e teto",
     cujo pai é o `Alerta` com o `<p>`. Mesmo assim, o cabeçalho do spec diz que os dois são conferidos. Além disso, o
     `min-h-11` novo de "Ver agentes e teto" não tem nenhum teste, porque o estado de agentes suspensos não aparece no
     `alvo-de-toque`.
   - **Razão:** o código de hoje cumpre o RNF-03. O que falta é a vigia: uma regressão nesses links passaria, e o spec
     diz que cobre o que não cobre.
   - **Correção:**
     - considerar "dentro de frase" só quando o pai tem um **nó de texto direto** não vazio, ao lado do link
       (`[...bloco.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim() !== '')`);
     - ajustar o comentário do cabeçalho;
     - pôr um teste de HTML do `AvisosDaMoldura` suspenso, que confira `min-h-11` e `md:min-h-6` no link, no molde do
       `fila-a1.test.ts` para os contadores.
2. **Auxiliares de e2e copiados: `e2e/casca.spec.ts:36-47`, `e2e/casca-qa.spec.ts:44-49`,
   `e2e/axe-todas.spec.ts:87-93` e `:158-163`, `e2e/alvo-de-toque.spec.ts:63-69` e `:108-113`.**
   - **Problema:** "abrir a gaveta só se estiver fechada e esperar a animação" está escrito em quatro lugares, e de dois
     jeitos: o `casca-qa` não espera a animação. O `abrirRecolhivel` está em dois lugares.
   - **Razão:** a instabilidade do M4 da T13 nasceu de duas cópias do `abrirGaveta` que se afastaram uma da outra. A
     T17 vai abrir a gaveta para a captura `gaveta-aberta-390`, e seria a quinta cópia.
   - **Correção:**
     - exportar `abrirGaveta(page)` (clique só com a gaveta fechada, mais o `gavetaParada`) e `abrirRecolhivel(page, nome)`
       de `e2e/apoio.ts`;
     - nos quatro specs, importar esses auxiliares. É passo de interação equivalente (G3.2), e nenhuma asserção muda.
3. **`src/app/(painel)/demandas/[id]/page.tsx:253` (`h3` de `ListaDeVersoes` com `text-lg font-semibold`).**
   - **Problema:** o `h3` fica em 18 px / 600, e a 03, 2.3 pede 16 / 600. Quem anotou foi o próprio engenheiro.
   - **Razão:** é a mesma fuga de escala que a T16 corrigiu nos `h2`. Só o `tipografia-h2.test.ts` vigia, e ele não olha
     `h3`.
   - **Correção:**
     - tirar `text-lg font-semibold` do `h3`;
     - estender a varredura do teste estático a `h3`, com caso plantado;
     - fazer isso **antes** das capturas da T17 (a `t05-demanda-*` mostra esse `h3`), para não precisar do `REGRAVAR` do
       D-04 na 08.

## Decisões tomadas

- Status `pronto`, porque o checklist da seção 12 está cumprido e não há Critical nem Important. Os três achados são
  Minor e vão para Pendências.
- Os testes existentes que mudaram ficam aceitos trecho a trecho. A inversão das conferências dos apelidos é
  consequência direta do D-01, e nenhum `expect` foi apagado.
- A volta ao topo no `semViolacoesNasDuasLarguras` fica aceita: é o caminho da 06-T14-tech-lead, com a regra ligada.
- O critério do engenheiro para o alvo de rádio e de caixa (a linha `min-h-11` ou o cartão) fica aceito: é o padrão do
  `GrupoOpcoes` e da `CaixaSelecao`. O `closest('.isolate')` só casa o cartão de opção: em `src/`, só o
  `GrupoOpcoes.tsx` usa `isolate`.
- A limpeza do código morto da decisão vai para depois do pedido, como dívida registrada acima.
- Os contadores sem script ficam assim: o painel exige script, os comentários são corrigidos na 08 (se ela abrir
  correção do frontend) e o suporte vai para depois do pedido.
- Os Minor 1 e 2 são só de teste e vão para a `06-T16-testes`. O Minor 3 muda tela e vai para a T17, antes das
  capturas.
- A conferência de nomes antigos que a regex do teste não alcança (`divide-`, `var(--color-…)` em `.tsx`, qualquer
  prefixo com `primaria`, `borda`, `texto-suave` ou `perigo`) foi feita com `git diff` contra a árvore vazia e `-G`.
  Esse é o jeito de buscar no conteúdo atual com um comando da lista **Pode**, sem `git grep`. Só apareceram nomes de
  arquivo de teste (`*-bordas.test.ts`), sem nenhuma classe. Sem os apelidos, uma classe antiga com outro prefixo
  sumiria da tela em silêncio, e por isso essa conferência importava.

## Pendências

- **Para a `06-T16-testes` (`qa-automacao`): os Minor 1 e 2.**
  - Minor 1: o filtro de "dentro de frase" por nó de texto direto e o teste de HTML do link do `AvisosDaMoldura`.
  - Minor 2: `abrirGaveta` e `abrirRecolhivel` em `e2e/apoio.ts`, importados nos quatro specs.
  - Depois, rodar a suíte e2e inteira.
  - Se a etapa não fizer o Minor 2, o maestro o passa à T17, antes de escrever `e2e/capturas.spec.ts`.
- **Para a T17 (`engenheiro-frontend`), passada pelo maestro: o Minor 3**, com o teste estático estendido a `h3`, antes
  de gerar as capturas. Se não couber, vai para a 08, com o `REGRAVAR` da `t05-demanda-*`.
- **Para a 08 (maestro):**
  - a correção dos comentários de `ContadoresDaFila.tsx:4-6` e `FiltrosFila.tsx:4-5` (decisão 2), junto com o M2 da T13,
    se houver correção do `engenheiro-frontend`;
  - o M2 da 06-T13-tech-lead segue como estava (demanda própria no seed para o C-18 da T11).
- **Para a `10-documentacao` (`documentacao-tecnica`):** o manual registra que o painel exige JavaScript (decisão 2). O
  plano da T09 ("sem script, o GET comum filtra") fica superado por esta revisão.
- **Para depois do pedido (registro de dívida e de produto):**
  - a limpeza de `opcoesDaDecisao`, `legendaDecisao`, `aprovar` e `devolver` (decisão 1);
  - o suporte sem script da fila, para a `desenvolvimento-produto` com a `ux-ui-design` (decisão 2).
- **Para a `07-qa-funcional`:** o que a entrega já lista:
  - os `h2` em 18 px / 700;
  - o "Menu" com a classe do `sobre-escuro`;
  - os `h3` da T05, se o Minor 3 ainda não tiver entrado.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat f66188b` — 41 arquivos: código, testes, a entrega e o registro
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 198e97d -- src/proxy.ts src/proxy.test.ts next.config.ts src/app/api src/db drizzle src/modules/acesso src/worker src/jobs src/agents src/lib/auth.ts src/lib/auth-cliente.ts src/lib/qr.ts src/lib/log.ts src/lib/erros.ts src/instrumentation.ts pnpm-workspace.yaml "src/app/(painel)/configuracao/agentes/acoes.ts" "src/app/(painel)/demandas/[id]/acoes.ts" "src/app/(painel)/demandas/[id]/editar/acoes.ts" "src/app/(painel)/demandas/[id]/especificacoes/nova/acoes.ts" "src/app/(painel)/demandas/[id]/pacotes-decisao/novo/acoes.ts" "src/app/(painel)/demandas/[id]/pareceres-risco/novo/acoes.ts" "src/app/(painel)/demandas/nova/acoes.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes.ts"` — vazio (CV-01)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 198e97d --stat -- src/modules package.json pnpm-lock.yaml` — só `resumo-da-fila.*` (T07), `package.json` (+2) e lock (+16) da T02
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261110-0015-v1`, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show f66188b -- src/app/globals.css src/components src/app` — diff de `src/` lido por inteiro (saída em arquivo, lida com Read)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show f66188b -- e2e test` — diff de `e2e/` e `test/` lido por inteiro (saída em arquivo, lida com Read)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD -G "Limpar filtros" -- src` — `FiltrosFila.tsx`, `fila.tsx` e três testes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD -G "isolate" -- src` — só `GrupoOpcoes.tsx` e um teste
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD -G "var[(]--color-" -- src` — só `globals.css` e `tokens-em-uso.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD -G "divide-" -- src` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD -G "[a-z]-primaria" -- src` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD -G "[a-z]-borda" -- src` — só nomes de arquivo `*-bordas.test.ts`, nenhuma classe
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD -G "[a-z]-texto-suave" -- src` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD -G "[a-z]-perigo[^a-z-]" -- src` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show bd54155:docs/construcao/DEC-DEM-20261110-0015-v1/06-T05-tech-lead.md` — Minor 1 e 2 e a pendência do `AvisosDaMoldura`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent --reporter=junit --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/0a919744-0e04-42d0-bf4b-e75d6acefb82/scratchpad/t16-revisao-suite.xml` — 5211 testes, 0 falhas, 0 erros
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — vazio

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
