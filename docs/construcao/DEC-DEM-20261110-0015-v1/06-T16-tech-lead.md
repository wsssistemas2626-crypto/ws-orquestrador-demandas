---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T16-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12), pedido.json, tarefas.json, 06-T16-tech-lead.md (revisão anterior), 06-T16-qa-automacao.md (a devolução), 06-T16-engenheiro-frontend.md (volta da devolução), commit 0f47b8c (git show, código e teste), src/app/(painel)/pacotes-decisao/[decId]/RevisaoDoPacote.tsx, src/app/(painel)/pacotes-decisao/[decId]/page.tsx (linhas 55 a 194), src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts (linhas 820 a 839), playwright.config.ts, e2e/apoio.ts (linhas 80 a 149), e2e/parecer-risco.spec.ts (linhas 190 a 239), e2e/reflow-qa.spec.ts (linhas 80 a 139), .github/workflows/ci.yml]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da volta da T16 (commit `0f47b8c`), feita sobre a revisão anterior (`f66188b`, aprovada com três Minor).
**Aprovada.** A correção resolve o defeito que a `06-T16-testes` achou. Não há Critical nem Important. Sobre os dois
timeouts do axe na suíte e2e inteira: não bloqueiam esta tarefa, mas são risco real para os três verdes seguidos da
definição de pronto e para o CI. A recomendação está na seção própria abaixo.

### A correção

- **`RevisaoDoPacote.tsx:19`: correto.** O `CLASSE_LINK` deste arquivo só é usado no link da ESP e do RSK (`:35`). Por
  isso, mudar a própria constante não atinge nenhum outro link. As classes `inline-flex min-h-11 items-center` e
  `md:min-h-6` seguem o molde do "Ver" das versões e de "Ver agentes e teto". O `inline-flex` é necessário, porque sem
  ele o `min-height` não vale num `<a>` inline. Com 24 px a partir de 768 px, o alvo continua dentro do mínimo do
  WCAG 2.2 (2.5.8). O link fica dentro de um `span` `inline-flex flex-wrap` junto com o selo, e a altura de 44 px não
  mexe na quebra do selo.
- **`page.tsx:63`, `CLASSE_LINK_SOLTO`: correto, e é o desenho certo.** Uma constante nova, em vez de mudar o
  `CLASSE_LINK`, deixa os links dentro de frase do cabeçalho (id da demanda, `:135`, e os dois "Ver" entre parênteses,
  `:148` e `:153`) sem os 44 px, como manda a 03, 2.4. Os três usos (`:164`, `:172`, `:180`) são os links fora do `<p>`
  do `Alerta`, sem texto solto ao lado, que a qa apontou. Nenhum texto, rota, condição, `aria-*` ou chamada mudou.
- **O desvio (os três alertas) fica aceito.** A qa recomendou os alertas, o arquivo já é da T11/T16, a mudança é só de
  classe e o teste vem junto. Deixar para depois seria entregar a 0.2.0 sabendo de três alvos fora do RNF-03.

### Checklist da seção 12 do padrão técnico

| Item | Resultado |
|---|---|
| Faz o que o plano pede, nem mais nem menos; só arquivos da tarefa | Sim. O commit muda `RevisaoDoPacote.tsx` (constante e comentário), `page.tsx` (constante, comentário e três `className`) e `pagina.test.ts` (+64), além da entrega e do registro. Não toca nada do G4 (CV-01) nem nenhum outro arquivo |
| Teste para cada comportamento novo, que falharia sem o código | Sim. O e2e da qa (`alvo-de-toque.spec.ts:114`) entrou sem mudança, falhou antes do código (240 × 24) e passa depois. O teste novo de HTML falhou antes nos dois casos de alvo (2 falhas) e passa depois. O teste de controle trava a fronteira entre link solto e link de frase. O teste dos alertas cobre os três estados que o e2e não cria |
| Sem segredo, `.env` ou dado pessoal real | Sim. O teste usa só "Pessoa Ficticia CTO" e os ids fictícios do arquivo |
| Entrada externa com Zod; erro sem detalhe | Não se aplica: nenhuma rota, action ou esquema mudou |
| Banco: migration, migrator, RLS | Não se aplica |
| Nada duplica função que já existe | Sim. `link()` e `classes()` são locais ao describe novo. O molde de classe é o mesmo do "Ver" e de "Ver agentes e teto", sem cópia de lógica |
| Textos em pt-BR; axe sem violação nas telas tocadas | Sim. Nenhum texto mudou. A entrega declara a `axe-todas` verde nas duas larguras, com a T11 e o recolhível aberto. Eu não rodo e2e, porque quem roda é a `06-T16-testes` |
| Minor em Pendências; só Critical e Important bloqueiam | Sim |
| No PR: `/code-review` e `/security-review` | Fica com a `08-revisao`, pela G2 |

Nesta revisão também conferi:

- `pnpm test`: **5217 de 5217**, em 232 arquivos (210 s, rodado sozinho). Eram 5214, e os 3 a mais são os testes novos;
- `pnpm lint` e `pnpm typecheck`: limpos;
- a árvore ficou limpa depois dos testes.

### Testes que já existiam e mudaram (G3.2, CV-20)

Nenhum. O commit só acrescenta um describe em `pagina.test.ts`, e nenhuma asserção existente mudou. O e2e da qa entrou
sem mudança.

### Os dois timeouts do axe: avaliação do risco

**O que aconteceu.** Na suíte e2e inteira, rodada logo depois da de unidade (16,3 min, contra 10,4 min na rodada
anterior), dois testes estouraram o tempo-limite de 30 s **por teste**, o padrão do Playwright. O estouro aconteceu
dentro de `AxeBuilder.analyze` (`e2e/apoio.ts:115`), nestes dois testes:

- `parecer-risco.spec.ts:203`: um teste longo com login, duas versões pela API, navegação, cerca de 20 esperas e um axe;
- `reflow-qa.spec.ts:99`: três telas (T06, T07, T08) num teste só, cada uma com uma aba nova, preenchimento, resumo de
  erros e `axeNasDuasLarguras`. São seis análises do axe dentro dos mesmos 30 s.

Nenhuma asserção falhou. Os dois testes não usam os arquivos desta volta e passaram 8 de 8 quando rodaram sozinhos. Na
rodada inteira da qa, também passaram.

**Leitura.** Não é defeito da T16 nem desta correção. O que aparece é um teste longo perto do limite de 30 s, que
estoura quando a máquina está carregada. O axe é o passo mais pesado do teste e por isso é onde o tempo acaba. O
`semViolacoes` não mudou na T16. O que a T16 aumentou foi o tempo total da suíte, com o axe nas duas larguras da
`axe-todas`, e não o tempo desses dois testes.

**Risco para a homologação: médio.** O `construir.mjs homologar` roda `pnpm test:e2e` nesta mesma VPS, contra o
`docker-compose.hml.yml`, enquanto o NutriDebby, o Awave e o próprio Orquestrador estão no ar. O
`playwright.config.ts` tem `retries: 0` e `workers: 1`, então um estouro reprova a rodada inteira. A definição de pronto
pede `pnpm test:e2e` verde **três vezes seguidas**, o que reforça o RNF-12 da T17. Com 2 estouros em 240 numa rodada
carregada, três verdes seguidos não estão garantidos.

**Risco para o CI: médio a alto.** O job `e2e` do `ci.yml` roda em `ubuntu-latest`. No repositório privado, o runner
padrão tem menos CPU do que a VPS. Ele faz `next build` e Testcontainers antes da suíte e tem `timeout-minutes: 40`.
Os testes que hoje chegam perto de 30 s na VPS tendem a passar do limite lá. A definição de pronto pede "PR com CI
verde".

**O que fazer (para a `06-T16-testes`, sem mexer no código desta volta):**

1. Rodar a suíte e2e inteira sozinha, sem outra suíte nem `lint` ou `typecheck` ao mesmo tempo, com `--reporter=list`,
   que mostra a duração de cada teste. Anotar os testes acima de 15 s, que é metade do limite.
2. Se algum passar de 15 s, a correção preferida é **dividir o teste**, sem tirar asserção. Exemplos:
   - o `reflow-qa.spec.ts:99` vira três testes (T06, T07 e T08), cada um com o login e a demanda do seed. É mudança de
     estrutura, e cada `expect` continua igual e no mesmo estado (G3.2);
   - no `parecer-risco.spec.ts:203`, a parte depois do axe ("Criar nova versão a partir desta") vira um teste próprio.
3. **Não** resolver com `retries`, com aumento de `timeout` global ou por teste, nem com `test.slow()`. A revisão
   anterior registrou que não havia nenhum deles, e o CV-20 vigia isso. Se dividir não bastar, a qa devolve com a
   medição, e a decisão de mexer no tempo-limite vem para mim, com a razão escrita.
4. Se a rodada sozinha passar e nenhum teste chegar a 15 s, o risco fica registrado para a T17, que roda os três verdes
   seguidos, e para a `09-entrega`. A divisão vira a primeira ação se o estouro voltar.

O mesmo padrão explica as 2 falhas de unidade sob carga que a qa viu e não identificou. A suíte de unidade rodou sozinha
duas vezes depois daquilo, na volta do engenheiro e nesta revisão, e passou inteira nas duas. A regra fica: cada suíte
roda sozinha.

### Pareceres

1. **Minor: `src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts:833-834` (caso do desatualizado).**
   - **Problema:** o caso não usa o auxiliar `link()` do próprio describe. Ele monta a regex à mão, com o id
     `DEM-20261022-0042` escrito por extenso, em vez de `ID`. Assim, não confere que existe exatamente um link nem
     confere o texto do link.
   - **Razão:** o teste continua reprovando se o link sumir, porque `classes('')` não contém as classes. Mesmo assim,
     é o único dos três casos que não segue o padrão, e o id por extenso se afasta do fixture se o `ID` mudar.
   - **Correção:** usar `link(desatualizado, \`/demandas/${ID}/pacotes-decisao/novo\`, <rótulo do link>)`, como nos
     outros dois casos. Pode entrar junto com a próxima mudança da T17 neste arquivo, sem volta própria.

## Decisões tomadas

- Status `pronto`, porque o checklist da seção 12 está cumprido, a correção é a que a devolução pediu e não há Critical
  nem Important.
- O desvio dos três alertas fica aceito: é a mesma classe de defeito, no mesmo arquivo da tarefa, com teste.
- A constante nova no `page.tsx`, em vez de mudar o `CLASSE_LINK`, fica aceita. Ela separa o link solto do link de
  frase, e o teste de controle trava essa separação.
- Os timeouts do axe não bloqueiam a T16, porque estão fora do código desta volta e passam sozinhos. Mesmo assim, entram
  como risco para a homologação e o CI, com medição e divisão de teste na `06-T16-testes`. Retry e tempo-limite maior
  ficam vetados sem decisão minha.
- Registro de erro meu: rodei uma vez, por engano, um `git diff --stat` só de leitura no repositório da
  estruturaAutonoma, para achar a seção 12 do `padrao-tecnico.md`. O maestro pede git só no repositório do pedido. O
  comando não alterou nada e está em "Comandos executados" para o histórico ficar completo. O conteúdo da seção 12 eu
  li depois com Read.

## Pendências

- **Para a `06-T16-testes` (`qa-automacao`):**
  - rodar a suíte e2e inteira sozinha, com a duração de cada teste;
  - se `parecer-risco.spec.ts:203`, `reflow-qa.spec.ts:99` ou outro teste passar de 15 s, dividir o teste sem tirar
    asserção (seção "Os dois timeouts do axe");
  - sem `retries`, sem `timeout` maior e sem `test.slow()`.
- **Para a T17 (`engenheiro-frontend`), passada pelo maestro:**
  - o Minor 1 desta revisão, quando a T17 mexer em `pagina.test.ts`;
  - o Minor 3 da revisão anterior (`h3` da T05), antes das capturas.
- **Para a T17 e a `09-entrega`:** se a qa não dividir os testes, o risco de estouro nos três verdes seguidos e no CI
  fica registrado aqui.
- Seguem como estavam, sem mudança:
  - os itens da 08 e da `10-documentacao` da revisão anterior;
  - o M2 da 06-T13-tech-lead;
  - a dívida de `opcoesDaDecisao`, `legendaDecisao`, `aprovar` e `devolver`;
  - o suporte sem script, depois do pedido.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 0f47b8c` — 5 arquivos: `RevisaoDoPacote.tsx`, `page.tsx`, `pagina.test.ts`, a entrega e o registro
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -6` — topo 0f47b8c, depois 4503631 (06-T16-testes)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 0f47b8c -- src` — diff de código e teste lido por inteiro
- `git -C /home/deploy/servidor/projetos/estruturaAutonoma diff --stat 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD -G "^## 12" -- docs/construcao/padrao-tecnico.md` — por engano, fora do repositório do pedido, só leitura (ver Decisões tomadas)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD -G "test:e2e" -- .github package.json` — `ci.yml` e `package.json`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent --reporter=dot --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/0a919744-0e04-42d0-bf4b-e75d6acefb82/scratchpad/t16-revisao-v2-suite.txt` — 5217 de 5217, 232 arquivos, 210 s
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — vazio
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
