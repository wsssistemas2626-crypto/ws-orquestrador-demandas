---
pedido: DEC-DEM-20261111-0018-v1
etapa: 06-T12-testes
agente: qa-automacao
leu: [pedido.json, contrato-passagem.md, 01-analista-requisitos.md (RF-03, RF-05, RF-06; CA-03.6, CA-05.1, CA-06.1 a CA-06.5), 03-ux-ui-design.md (seções 4 a 10), 04-seguranca-aplicacao.md (SB-12, por git grep), docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md (T12, T14, G7, G9, G10), 06-T11-qa-automacao.md, 06-T12-engenheiro-frontend.md, 06-T12-tech-lead.md, commit 989acf1 (git show e --stat), src/components/dados-da-decisao-vigencia.test.ts, src/app/(painel)/pacotes-decisao/[decId]/pagina-vigencia.test.ts, src/app/(painel)/pacotes-decisao/[decId]/page.tsx (linhas 95 a 344), src/app/(painel)/pacotes-decisao/[decId]/pacote-da-pagina.ts, src/app/(painel)/demandas/[id]/demanda-da-pagina.ts, src/modules/demandas/arquivamento.ts, src/db/schema/demandas.ts (linhas 1 a 30), test/estatico/vigencia-t11.test.ts, test/estatico/piso-de-assercoes.test.ts (linhas 236 a 269), test/estatico/piso-de-assercoes-0018.test.ts, saída do pnpm test em /tmp]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Testes da T12, commit `989acf1` do `engenheiro-frontend`: avisos (a), (b) e (c), dica do Arquivar e chegada depois de
arquivar (SB-12). O foco foi o pedido do maestro:
- filtros adversariais: todo caso em que o aviso seria falso não o mostra;
- o critério 5 do pedido: os três avisos aparecem na T11 com os textos da `ux-ui-design`.

O código passou em tudo, e nenhum defeito foi achado.

### Critérios da tarefa × testes

| Critério | Teste que cobre |
|---|---|
| CA-06.1, aviso (a) | `src/components/dados-da-decisao-vigencia.test.ts` › "aviso (a)…"; `src/app/(painel)/pacotes-decisao/[decId]/pagina-vigencia.test.ts` › "(a) no v2 pendente…"; **novos**: `dados-da-decisao-vigencia-qa.test.ts` › "filtros dos avisos (a), (b) e (c), em todo estado…" e `pagina-vigencia-qa.test.ts` › "T11 em todo estado… › demanda em pronta_para_decisao / aprovada" (texto inteiro no `<p>`, link certo dentro do próprio aviso) |
| CA-06.2, aviso (b) | os mesmos dois existentes › "(b)…"; **novos**: os mesmos varrimentos, mais `pagina-vigencia-qa.test.ts` › "o v1 substituído pelo v2, com o v3 pendente…" (o (b) do v2 cita o v3) |
| CA-06.3, aviso (c) | os dois existentes › "(c)…" (na página, só um trecho do texto); **novo**: `pagina-vigencia-qa.test.ts` confere o texto (c) **inteiro** na página e o link "Criar pacote novo" dentro do aviso, e não o do alerta de desatualizado |
| CA-06.4 e filtros da 4.2 (nenhum aviso falso) | existentes › "CA-06.4…"; **novos**: os dois varrimentos, com os mutantes plantados; "casos nomeados em que o aviso seria falso…" (DEC aberto mais novo já devolvido ou arquivado; v1 aprovado substituído com v3 pendente; aberto aprovado sem vigente); "corridas e estados de três DECs…" (mais novo já decidido, desatualizado ou só do CTO na releitura; v2 pendente mais velho) |
| Critério 5 do pedido e CA-05.1, CA-06.5 (texto): os três avisos na T11 com os textos da `ux-ui-design` | **novo**: `dados-da-decisao-vigencia-qa.test.ts` › "os textos novos são os da própria entrega da ux-ui-design". Ele **lê** `03-ux-ui-design.md`, seção 8, e compara 12 constantes com a tabela: os três avisos, os dois links, as quatro dicas e os três sucessos. Na página: `pagina-vigencia-qa.test.ts` (texto inteiro de cada aviso no HTML da T11) e `pagina-vigencia.test.ts` ((a) e (b) inteiros). A parte de CA-06.5 no navegador, com axe nas duas larguras, é da T14 (`e2e/vigencia.spec.ts`, pelo plano) |
| CA-03.6 e 4.6 (dica do Arquivar) | existentes › "dica do Arquivar pelo destino…" e "a dica é a de dicaDoArquivar…" (seis estados); **novos**: `dados-da-decisao-vigencia-qa.test.ts` › "dica do Arquivar em todo status e estado do vigente…" (9 status × 3 estados contra a tabela da 4.6 escrita no teste, e o destino dito igual ao que `destinoDoArquivamento` grava no servidor); `pagina-vigencia-qa.test.ts` confere a dica da página em cada estado do varrimento em que o formulário aparece |
| 4.7 (chegada) | existentes › "chegada depois de arquivar…"; **novo**: "chegada depois de arquivar em todo status e estado do vigente". "Encerrada" só aparece com a demanda em Encerrada. O id e "continua em vigor" só aparecem com Aprovada e o vigente atualizado. `?aviso=` diferente do fixo dá nada em todo status |
| SB-12 (d): id fora do formato | existentes › "SB-12 (d)…"; **novos**: mais 12 formas de id de DEC (dígitos de largura total, hífen Unicode, `?`, `#`, `/../`, `javascript:`, vazio) e 8 de demanda. Na página: vigente com id ruim não aparece no HTML; quando a dica o citaria, a página falha com mensagem sem o valor (D-13); mais novo da vista com id ruim não é lido nem vira (b) |
| D-12 (leitura do mais novo) | existente › "D-12…"; **novo**: o varrimento da página confere a lista exata de leituras do pacote em cada estado (528 páginas por status da demanda) |
| G9, SB-12 (a), (b), (c) | existentes: `pagina-vigencia.test.ts` (oráculo, botões e `disabled` com e sem aviso), `test/estatico/vigencia-t11.test.ts`, `dados-da-decisao-vigencia.test.ts` (sem nome de pessoa). Sem mudança |

### Testes acrescentados

1. `src/components/dados-da-decisao-vigencia-qa.test.ts`: 56 testes, 51 linhas com `expect(`.
   - **Varrimento dos filtros.** Todas as demandas com 1 a 3 DECs, cada um com nível, decisão (pendente, aprovada,
     devolvida, arquivada) e desatualizado. Em cada uma, cada DEC aberto e os 9 status: **115.344 casos**.
   - **Oráculo independente.** É a tabela da 4.2 sobre o modelo: o vigente é o aprovado mais novo, e o mais novo é o de
     maior versão. Ele não usa a função testada. Exige o texto e o link exatos, ou nada.
   - **Duas rodadas.**
     - Com o contexto da D-12.
     - Com o pendente mais novo passado **a mais**: aberto que não é o vigente, mais novo desatualizado. Assim, a própria
       função tem de filtrar.
   - **Ramos não vazios.** Contagem de cada ramo.
   - **Status.** Nos dois status finais, nenhum aviso. Nos 7 outros, o mesmo número de avisos.
   - **Mutantes plantados.** Oito mutantes, cada um com um filtro da 4.2 a menos: status final, pendente, mais novo,
     aberto atualizado, S-01 no (a), aberto vigente, pendente atualizado, S-01 no (b). O oráculo reprova cada um, o que
     prova que a enumeração tem o contraexemplo. Há também um controle sem mutação e dois casos plantados da vista
     incoerente: vigente igual ao aberto e pendente igual ao aberto.
   - **Textos lidos da entrega 03.** Mais a dica e a chegada em todo status, e os ids fora do formato (acima).
2. `src/app/(painel)/pacotes-decisao/[decId]/pagina-vigencia-qa.test.ts`: 13 testes, 31 linhas com `expect(`.
   - **Varrimento pela T11 inteira.** Usa o `renderToStaticMarkup` da página real. Cobre todas as demandas com 1 ou 2
     DECs, cada DEC aberto e a demanda em Pronta para decisão, Aprovada, Entregue e Encerrada: 528 páginas por status.
   - **O que confere em cada página.** Nenhum começo de aviso quando o oráculo diz nenhum. Quando diz um, o texto inteiro
     no `<p class="[overflow-wrap:anywhere]">`, o `Alerta` atencao sem `role` e um só link, com href, classe e rótulo.
     Também a lista exata de leituras (D-12) e a dica (4.6).
   - **Contagem exata dos esperados.** (a) 6, (b) 6, (c) 2 por status não final, e 0 nos finais.
   - **Casos plantados.** O dublê do banco mente sobre o vigente, e a conferência acusa o aviso falso, o aviso que falta
     e a dica errada.
   - **Corridas e três DECs.** Os casos da tabela acima.
   - **SB-12 (d) na página.** Os casos da tabela acima.
3. `test/estatico/piso-de-assercoes.test.ts`: os dois arquivos novos entram no `PISO` com a contagem do fim da etapa (51
   e 31). Só acréscimo: o diff tem 4 linhas a mais e nenhuma a menos.

Os dois arquivos usam ids `DEC-DEM-20991231-0007/0008-*`, nomes "Pessoa Ficticia …", "DOC-FICTICIO-1" e datas fixas de
2099. Não há relógio real. Cada teste monta os próprios dublês, e o `beforeEach` os limpa. Nenhum importa de outro
`*.test.ts`.

### Resultados

- `dados-da-decisao-vigencia-qa.test.ts`: **56 de 56** (2,8 s de teste). `pagina-vigencia-qa.test.ts`: **13 de 13**
  (cerca de 6 s; o teste mais lento é o varrimento de um status, bem abaixo do `testTimeout` de 30 s).
- PISO, PISO-0018 e os dois arquivos novos juntos: **254 de 254**, depois do último ajuste (um comentário no PISO).
- `pnpm test` completo: **391 arquivos, 8461 de 8461**, 0 falha (200,6 s). Eram 389 e 8388 na entrega do engenheiro. A
  diferença de 73 testes vem de 69 testes novos, 2 entradas do PISO e 2 casos de estáticos que rodam por arquivo.
- `pnpm typecheck`: limpo. `pnpm lint`: limpo.
- `git diff --stat`: só `test/estatico/piso-de-assercoes.test.ts` (+4). `git status`: os dois testes novos e esta
  entrega. Nenhum teste existente foi apagado ou afrouxado, e não há `.skip`, `.only` nem `.todo`.
- Não rodei o e2e. Não mudei código nem spec e2e, e o engenheiro rodou a suíte e2e inteira sobre o mesmo commit (290, 0
  falha). A prova no navegador dos três avisos, com axe, é a T14.

## Decisões tomadas

- Oráculo por modelo da demanda, e não por contexto montado à mão. Com ele, cada estado possível de 1 a 3 DECs vira um
  caso, inclusive os que ninguém lembraria de escrever. Os mutantes plantados provam que cada filtro tem contraexemplo no
  espaço varrido.
- Rodada com o pendente passado "a mais". Se um dia a página relaxar a D-12, o aviso falso continua barrado pela função.
- Varrimento também pela página real, além da função. A página monta o contexto (vigente, mais novo, releitura), e esse
  é o ponto em que um aviso falso nasceria sem a função ter culpa.
- Os textos de comparação estão escritos por inteiro nos testes e, num teste à parte, lidos do próprio
  `03-ux-ui-design.md`. Assim, o critério "com os textos da ux-ui-design" fica ligado ao documento-fonte, e não a uma
  cópia.
- Sem e2e novo: o plano dá `e2e/vigencia.spec.ts` (CA-06.5, axe nas duas larguras) à T14, que usa as demandas do seed
  da T10. Criar outro spec agora duplicaria o da T14 e mexeria no estado do seed que ela usa.
- Os dois arquivos novos entram no PISO, como pediu o maestro, porque cobrem SB-12 (d), D-13 e o oráculo.

## Pendências

- Para a T14: o critério 5 do pedido no navegador. Os três avisos com o texto exato, nas demandas `vigenciaComPendente`
  e `vigenciaNivelMenor`, e o axe com cada aviso em 1280 × 720 e 390 × 844 (CA-06.5). Na T12, a prova é pelo HTML do
  servidor da página real.
- Para o tech-lead: nenhum defeito. Segue aberto o Minor da revisão: `dicaDoArquivar` roda também quando o formulário não
  aparece. O teste novo de SB-12 (d) mostra o efeito: com vigente de id incoerente e a demanda nas origens, a T11 inteira
  cai na tela de erro (D-13), mesmo num DEC sem formulário. Não bloqueia: o CHECK do banco impede o caso.
- O teste dos textos lê `docs/construcao/DEC-DEM-20261111-0018-v1/03-ux-ui-design.md`. Se a pasta do pedido for movida
  ou arquivada, o teste falha e diz o arquivo.
- Nenhuma instrução estranha no `pedido.json`.

## Comandos executados

- `ls /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0018-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "T12" -- docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 989acf1836600ef6348efaf70044a9ab8f8ff03c`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "CA-03.6\|CA-05.1\|CA-06\.\|RF-06" -- docs/construcao/DEC-DEM-20261111-0018-v1/01-analista-requisitos.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "^## \|^### " -- docs/construcao/DEC-DEM-20261111-0018-v1/03-ux-ui-design.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 989acf1836600ef6348efaf70044a9ab8f8ff03c -- src/components/dados-da-decisao.ts "src/app/(painel)/pacotes-decisao/[decId]/page.tsx" "src/app/(painel)/pacotes-decisao/[decId]/FormularioDecisao.tsx"`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "vigencia\|^const PISO\|^};\|toBeGreaterThanOrEqual\|expect(" -- test/estatico/piso-de-assercoes.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "SB-12" -- docs/construcao/DEC-DEM-20261111-0018-v1/04-seguranca-aplicacao.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "export const STATUS\|export type Status\|STATUS_DEMANDA" -- src/modules/demandas/schemas.ts src/db/schema/demandas.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "RE_ID_DEC =\|RE_ID_DEMANDA_NA_TELA =" -- src/components`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "NIVEIS_APROVACAO\|NIVEL_APROVACAO\|STATUS_DECISAO" -- src/db/schema/decisao.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A12 "export type Aprovador\b\|export type Aprovador =" -- src/modules/pacotes-decisao/consultas.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "administradora" -- "src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts"`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A12 "export const ROTULO_STATUS" -- src/components/rotulos.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -3`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "statusDecisao:" -- src/modules/pacotes-decisao/consultas.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "type StatusDecisao\b\|type StatusDecisao =" -- src`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-da-decisao-vigencia-qa.test.ts --reporter=dot` — 41 de 42; o mutante "vigenteOutro" não tinha contraexemplo no modelo e virou caso plantado
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-da-decisao-vigencia-qa.test.ts --reporter=dot` — 42 de 42
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "testTimeout\|hookTimeout\|environment\|include\|pool" -- vitest.config.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A14 "export function alertaDeDesatualizado" -- src/components/dados-da-decisao.ts`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/pacotes-decisao/[decId]/pagina-vigencia-qa.test.ts" --reporter=dot` — 10 de 12; só o limiar de contagem do próprio teste (2 casos de (c) com dois DECs), trocado pela contagem exata
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/pacotes-decisao/[decId]/pagina-vigencia-qa.test.ts" --reporter=dot` — 12 de 12
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/pacotes-decisao/[decId]/pagina-vigencia-qa.test.ts" --reporter=dot` — 13 de 13 (com os casos plantados)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "03-ux-ui-design\|readFileSync" -- src/components/textos-0018.test.ts` — sem saída
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-da-decisao-vigencia-qa.test.ts --reporter=dot` — 56 de 56
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep --untracked -c "expect(" -- src/components/dados-da-decisao-vigencia-qa.test.ts "src/app/(painel)/pacotes-decisao/[decId]/pagina-vigencia-qa.test.ts"` — 51 e 31
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "prettier\|format" -- package.json .github/workflows/ci.yml`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — em segundo plano: 8461 de 8461 (391 arquivos)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 1 arquivo, 4 linhas a mais
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -- test/estatico/piso-de-assercoes.test.ts`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/piso-de-assercoes.test.ts test/estatico/piso-de-assercoes-0018.test.ts src/components/dados-da-decisao-vigencia-qa.test.ts "src/app/(painel)/pacotes-decisao/[decId]/pagina-vigencia-qa.test.ts" --reporter=dot` — 254 de 254
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — 1 alterado e 3 novos (os 2 testes e esta entrega)

A saída do `pnpm test` completo, em /tmp, foi lida pela ferramenta Read.

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
