---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T38-construcao
agente: engenheiro-frontend
leu: [contrato-passagem.md, pedido.json, tarefas.json, 05-tech-lead.md, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6, fase 7, T36 a T40), 03-ux-ui-design.md (1, 2.1 a 2.8, T01 a T03, T11, T12, 4.5, Decisões e Pendências), 06-T36-engenheiro-frontend.md, 06-T37-engenheiro-frontend.md, src/app/(painel)/demandas/page.tsx, src/app/(painel)/layout.tsx, src/app/entrar/page.tsx, src/app/entrar/entrar.test.ts, src/components/{Alerta,Botao,CabecalhoPainel,Esqueleto,Paginacao,RegiaoAviso,Selecao,Selo,Tabela}.tsx, src/components/rotulos.ts, src/components/componentes.test.ts (início), src/modules/demandas/{consultas,schemas,entradas-pendentes,transicoes}.ts, src/modules/acesso/{exigir-pessoa,matriz}.ts, src/app/api/demandas/route.ts, src/app/api/demandas/[id]/route.ts, src/lib/{fuso,log}.ts, e2e/apoio.ts, e2e/moldura.spec.ts, playwright.config.ts, vitest.config.ts, eslint.config.mjs, scripts/seed-ficticio.ts, test/estatico/{painel-qa,exigir-pessoa,varreduras-qa}.test.ts, node_modules/next/dist/client/form.js]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

A T38 entrega a tela T03 Fila de demandas (`/demandas`). Os textos, os estados e a acessibilidade são os da 03, T03. A
tela também mostra a lista "Entradas aguardando o agente orquestrador" (T-01) e o total que vem da API (T-03). O aviso
de capacidade (RNF-09) continua na moldura, onde a T36 o deixou.

Portões, todos verdes:
- `pnpm test`: 158 arquivos, 3098 de 3098 testes. Os 30 novos estão em `src/app/(painel)/demandas/fila.test.ts`.
- `pnpm test:e2e`: 27 de 27, com axe. Os 5 novos estão em `e2e/fila.spec.ts`; os 22 que já existiam continuam
  passando, inclusive o alerta `aviso=2fa-ativado` da T37.
- `pnpm lint` e `pnpm typecheck`: limpos.
- `pnpm build`: passa, e `/demandas` sai dinâmica.

### O que a tela faz

- **Página** (`page.tsx`, Server Component):
  - começa por `exigirPessoaNaPagina('/demandas')` e depois chama `autorizar(pessoa, 'listar_demandas')`, a mesma ação
    de `GET /api/demandas`;
  - passa o filtro da URL por `filtroDemandasSchema`. Valor vazio quer dizer "Todos", e não filtro inválido. Qualquer
    outro valor fora do schema, inclusive chave repetida, mostra o alerta "Algum filtro do endereço não é válido.
    Mostrando todas as demandas." e a lista sem filtro;
  - mantém o alerta "Verificação em duas etapas ativada." da T37, só com o valor fixo `aviso=2fa-ativado`;
  - mostra o `h1` "Demandas" e o botão "Nova demanda".
- **Filtros** (`FiltrosFila.tsx`, cliente):
  - um `fieldset` com a `legend` "Filtros" e três seleções nativas: "Status", "Tipo" e "Linha de serviço";
  - a primeira opção é "Todos" ou "Todas"; as demais têm os rótulos de `rotulos.ts`;
  - mudar a seleção não aplica nada (WCAG 3.2.2). O filtro só se aplica pelo botão "Filtrar", que navega para
    `/demandas?<só os filtros escolhidos>` e volta à página 1. Sem script, o mesmo formulário funciona como `GET`
    comum para `/demandas`;
  - o link "Limpar filtros" leva a `/demandas`;
  - os filtros ficam na URL, e por isso o "Voltar" do navegador funciona. A chave do componente remonta as seleções
    com o filtro da URL.
- **Tabela** (`fila.tsx`):
  - usa a `Tabela` da T36: região rolável com `tabindex="0"` e `aria-label="Tabela de demandas"`, `th scope="col"` e
    o `caption` da 03, que descreve os filtros ativos;
  - colunas "Id", "Título", "Tipo", "Status", "Urgência", "Linha de serviço" e "Criada em";
  - o id é um link para T05, em fonte monoespaçada. O título é texto puro (C-18) e, quando a demanda veio de agente,
    leva ao lado o selo "Rascunho de agente";
  - o status aparece como selo com texto. Valor ausente aparece como "Não informada". A data vai em `<time dateTime>`.
- **Paginação**: o `Paginacao` da T36, com 20 por página. "Anterior" fica indisponível na página 1. "Próxima" fica
  indisponível quando a página vem incompleta ou quando o total acaba nela.
- **Região de aviso**: uma por página, montada desde o início e fora da parte que recarrega a cada filtro. Ela diz
  "N demandas encontradas." com o `total` (T-03), ou "1 demanda encontrada.".
- **Foco**: depois de filtrar, limpar ou trocar de página, o foco vai ao `caption`. Quando não há tabela, vai ao texto
  do estado vazio ou do erro. Na primeira carga e ao chegar de outra tela, o foco não muda, e vale a regra da moldura
  (o primeiro Tab é o "Pular para o conteúdo"; trocar de tela leva ao `h1`).
- **Estados**:
  - vazio sem nenhuma demanda: "Nenhuma demanda ainda. Crie a primeira colando o texto do pedido." e o botão "Nova
    demanda";
  - vazio com filtro: "Nenhuma demanda com esses filtros." e "Limpar filtros". Numa página além do fim, mostra também
    "Anterior";
  - carregando: o `Suspense` tem a chave do filtro. A cada filtro ou página, aparece a tabela com `aria-busy="true"`,
    cinco linhas de `Esqueleto` e o texto oculto "Carregando demandas…" uma vez;
  - erro de leitura: "Não foi possível carregar as demandas. Tente de novo em instantes." e o botão "Tentar de novo"
    (`router.refresh()`). O erro vai ao `log` por lista de permissão (`evento`, `rota`, `erro`), e nenhum detalhe
    chega à tela.
- **Entradas aguardando** (`EntradasAguardando.tsx`):
  - lê `listarEntradasPendentes` (T28) e só aparece quando há alguma;
  - título `h2` "Entradas aguardando o agente orquestrador (N)";
  - cada linha diz "Recebida em <data às hora> — <papel do solicitante>" (ou "Não informado") e o estado: "O agente
    está preparando os campos." ou "O agente não conseguiu preparar os campos.";
  - na entrada que falhou, aparece "Preencher à mão", que leva a `/demandas/nova?entrada=<id>` e tem a linha como
    descrição (`aria-describedby`);
  - texto, origem e nome do solicitante não aparecem, nem quando a linha os traz (teste com sentinela);
  - se essa leitura falhar, a fila continua sem a lista, e a falha vai ao log.

### Arquivos

- Alterado: `src/app/(painel)/demandas/page.tsx`.
- Criados:
  - `src/app/(painel)/demandas/FiltrosFila.tsx`;
  - `src/app/(painel)/demandas/EntradasAguardando.tsx`;
  - `src/app/(painel)/demandas/fila.tsx` (ver o desvio 1);
  - `src/app/(painel)/demandas/fila.test.ts` (ver o desvio 2);
  - `e2e/fila.spec.ts`.

### Testes criados

- `src/app/(painel)/demandas/fila.test.ts` (30):
  - leitura do filtro: sem parâmetro; válidos com `aviso` e chave desconhecida; vazio como "Todos"; inválido em 5
    formas (status, tipo, chave repetida, offset negativo, limite acima de 100);
  - `caption` com zero, um, dois e três filtros;
  - contagem no plural, no singular e com ponto no milhar;
  - endereço da fila só com o que está ativo;
  - com dados: região, `caption` focável, colunas, link do id, selo de rascunho, rótulos, "Não informada", `<time>`;
  - paginação nas páginas 1, 2 e 3 e na página cheia que é a última;
  - título com HTML sai escapado (C-18);
  - os dois vazios e a página além do fim;
  - erro e carregando;
  - formulário: GET, `fieldset` e `legend`, rótulos, opções, seleção vinda da URL e nenhum `onchange`;
  - entradas: sem nenhuma, título com a quantidade, linha e estado, "Preencher à mão" só na que falhou e sentinelas
    de dado de terceiro.
- `e2e/fila.spec.ts` (5):
  - vazio com filtro, com axe; "Limpar filtros" volta à lista, com o foco no `caption` e as seleções em "Todos";
  - CA-26.1 (detalhado abaixo);
  - filtro inválido na URL: alerta, lista sem filtro, seleções em "Todos", contagem igual à da API e axe;
  - paginação: "Anterior" indisponível na página 1; "Próxima" leva à página 2, com o foco no `caption`, "Página 2"
    marcada e axe; "Anterior" volta à página 1;
  - axe no vazio, no filtrado por tipo, com dados e em 320 px, onde só a região da tabela rola, e não a página.
- O CA-26.1 do e2e:
  - cria 5 demandas pela API e leva duas a "Aguardando informação", uma a "Em análise" e uma a "Encerrada";
  - a seleção não muda a URL; "Filtrar" muda;
  - o foco vai ao `caption` da 03;
  - todas as linhas estão com o status filtrado;
  - as duas demandas aparecem e as outras três não;
  - a Região de aviso diz "N demandas encontradas.";
  - axe no estado filtrado.

### Teste escrito antes e visto falhando

`pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/demandas"`, antes do código:
```
 FAIL  src/app/(painel)/demandas/fila.test.ts [ src/app/(painel)/demandas/fila.test.ts ]
Error: Cannot find module '/src/app/(painel)/demandas/EntradasAguardando' imported from .../src/app/(painel)/demandas/fila.test.ts
 Test Files  1 failed (1)
```

`pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/fila.spec.ts --max-failures=3`, antes do código:
```
  ✘  1 › vazio com filtro: … getByText('Nenhuma demanda com esses filtros.') … element(s) not found
  ✘  2 › CA-26.1: … locator.selectOption: Test timeout of 30000ms exceeded. … waiting for getByLabel('Status')
  ✘  3 › filtro inválido na URL … getByText('Algum filtro do endereço não é válido. Mostrando todas as demandas.') … element(s) not found
  3 failed, 2 did not run
```

Depois do código:
- os unitários passaram com 30 de 30;
- na primeira rodada do e2e, 4 de 5 passaram. O "Limpar filtros" deixava a seleção em "entregue", porque eu tinha dado a
  mesma chave aos filtros e à lista, e o React acusou chave repetida. Com chaves distintas, foram 5 de 5.

### Desvios do plano

1. **`fila.tsx`, fora da lista de arquivos.**
   - O que tem: a leitura do filtro, o `caption`, a contagem, o endereço da paginação e os estados da lista (com dados,
     vazios, erro e carregando).
   - Por que não ficou na página: o Next não aceita outros exports em `page.tsx`.
   - Por que não ficou em `FiltrosFila.tsx`: esse arquivo é de cliente, e a leitura do filtro usa
     `filtroDemandasSchema`, que puxa o esquema do banco. Esse código não pode ir ao navegador.
2. **`fila.test.ts`, teste unitário além do e2e do plano.** Ele cobre pelo `pnpm test` o que dá para ver no HTML do
   servidor. É o mesmo desvio 4 da T37, que o tech-lead aceitou.
3. **O vazio sem nenhuma demanda não está no e2e.** O seed cria cinco demandas, uma de cada tipo, e o banco do e2e é
   compartilhado entre os testes. Por isso o estado não existe no e2e, e o teste "vazio" do plano não teria um tipo sem
   demanda para filtrar. O texto e o botão desse estado são conferidos em `fila.test.ts`. O e2e cobre o vazio com
   filtro, com uma combinação que nenhum teste cria (entregue, produto próprio, linha indefinida), e passa nele o axe.
4. **CA-26.1 com contagem pela API**, e não `toHaveCount(2)` fixo.
   - O número de linhas é conferido contra `GET /api/demandas?status=aguardando_informacao` (entre 2 e 20), e as duas
     criadas têm de estar entre elas.
   - Assim, o teste roda também na homologação (`BASE_URL`), que pode já ter outras demandas nesse status.
   - As duas vão a "Aguardando informação" pelas transições manuais (Nova → Em análise → Aguardando informação), e não
     por ESP com dúvida: o resultado na fila é o mesmo, e o teste não depende do schema da ESP.
5. **A lista de entradas aguardando não está no e2e.** Para existir uma entrada pendente, o agente orquestrador teria de
   ser ligado com teto acima de zero, e isso mudaria a configuração para os outros testes do mesmo banco. A lista é
   conferida no HTML, em `fila.test.ts`.

## Decisões tomadas

- **"Preencher à mão" só na entrada que falhou.** A 03 liga o botão ao estado "O agente não conseguiu preparar os
  campos.", e o fluxo da T04 o usa depois das 3 falhas. Enquanto o agente trabalha, não há botão.
- **A lista de entradas aparece sempre que há alguma, mesmo com o agente desligado.** É a regra do plano. Uma entrada que
  falhou continua precisando de "Preencher à mão" depois que alguém desliga o agente.
- **`caption` com mais de um filtro.** A 03 só dá o exemplo de status. Com dois ou mais, as partes seguem a ordem dos
  campos, ligadas por vírgula e "e". Exemplo: "Demandas com status Nova, tipo Bug e linha de serviço Indefinida, da mais
  nova para a mais antiga".
- **"1 demanda encontrada."** no singular. É a concordância do texto da 03, e não um texto novo.
- **"Criada em" só com a data** ("22/10/2026"), como no wireframe da 03. O `<time dateTime>` leva a data e a hora
  completas.
- **Foco só quando a pessoa filtra ou pagina.**
  - O submit e o clique nos links da fila guardam o endereço de destino.
  - O resultado novo só toma o foco se a navegação terminou nesse endereço. Um pedido que ficou para trás (Ctrl+clique)
    é descartado.
  - Para o mesmo endereço, o foco vai já ao resultado da tela.
  - Assim, a regra da moldura (o primeiro Tab e o `h1` ao trocar de tela) não é atropelada.
- **A Região de aviso fica fora do `Suspense`.** Ela é limpa e reescrita depois de 100 ms, para o leitor de tela anunciar
  de novo o mesmo número depois de outro filtro.
- **Valor vazio na URL é "Todos".** O formulário sem script envia `status=`, e tratar isso como filtro inválido
  mostraria um alerta falso.
- **`autorizar(pessoa, 'listar_demandas')` na página**, além do `exigirPessoaNaPagina`. É a mesma ação da rota da API,
  e as duas portas ficam iguais.
- **"Tentar de novo" com `router.refresh()`.** Ele lê a fila de novo no servidor e mantém os filtros da URL.

## Pendências

- **07-qa-funcional**, pelo teclado e pelo leitor de tela (G2):
  - o anúncio de "N demandas encontradas." na Região de aviso depois de filtrar;
  - o foco no `caption` depois de "Voltar" do navegador. Hoje o foco não muda nesse caso: o "Voltar" não passa pelo
    botão nem pelos links;
  - o esqueleto durante a carga.
- **ux-ui-design (textos):**
  - (a) o `caption` com mais de um filtro (formato acima);
  - (b) o estado sem total, "Página com 20 demandas.", não é usado, porque a API sempre devolve o `total` (T-03);
  - (c) a 03 diz que a lista de entradas aparece "só com o agente orquestrador ligado", e o plano diz "só quando há
    alguma". Segui o plano: uma entrada que falhou continua visível depois de o agente ser desligado.
- **T39:** `/demandas/nova?entrada=<id>` ainda dá 404 até a T39 existir. O link "Preencher à mão" já usa esse endereço.
- Seguem valendo as pendências da T36 e da T37: o nonce da CSP no 09-entrega, os textos fora da 03 e o QR com um leitor
  de verdade.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format=%h%x20%s -- src/app src/components e2e src/modules/demandas src/modules/entrada` — arquivos do painel e do módulo de demandas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --ignored node_modules/next/dist/client/form.js` — sem saída (o arquivo existe e é ignorado)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/demandas"` — FAIL, módulo `EntradasAguardando` ausente (teste antes do código)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/fila.spec.ts --max-failures=3` — FAIL, 3 de 3 e 2 sem rodar (teste antes do código)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/demandas"` — 30 de 30
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — 1 erro (`react-hooks/error-boundaries`: JSX dentro do `try`), corrigido
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/fila.spec.ts` — 4 de 5 (chave repetida entre os filtros e a lista), corrigido
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/fila.spec.ts` — 5 de 5
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — 27 de 27
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — 3098 de 3098, 158 arquivos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas build` — passou; `/demandas` dinâmica
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — 1 alterado e 5 novos, todos da tarefa (com os desvios 1 e 2)

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] os textos são os de `03-ux-ui-design.md`, em pt-BR, e o axe não acusa violação nas telas tocadas
