---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T44-construcao
agente: engenheiro-frontend
leu: [contrato-passagem.md, pedido.json, tarefas.json, 05-tech-lead.md (início), 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G4, T40 a T46, rastreabilidade), 03-ux-ui-design.md (1, 2.1 a 2.8, 3, T09 a T12), 06-T22-engenheiro-backend.md, 06-T43-engenheiro-frontend.md, 06-T43-tech-lead.md, 06-T43-qa-automacao.md, src/modules/pedido-construcao/{gerar,serializar}.ts, src/modules/dados-pessoais/detectores.ts, src/vendor/construir/pedido.mjs, src/app/api/pacotes-decisao/[decId]/pedido-construcao/route.ts, src/modules/pacotes-decisao/{consultas,criar,decidir (até a linha 80),schemas}.ts, src/modules/demandas/{schemas,transicoes}.ts, src/modules/especificacoes/servico.ts, src/modules/{limites,versoes}.ts, src/lib/{acao-painel,erros,rota (até a linha 60)}.ts, src/components/{BlocoJson,RegiaoAviso,Alerta,Botao,AvisosDaMoldura}.tsx, src/components/{formulario,dados-da-decisao}.ts, src/components/dados-da-decisao.test.ts (início), "src/app/(painel)/layout.tsx", "src/app/(painel)/pacotes-decisao/[decId]/{page.tsx,FormularioDecisao.tsx,acoes.ts,acoes.test.ts,pagina.test.ts}", src/app/configurar-2fa/AssistenteDoisFatores.tsx, scripts/seed-ficticio.ts, test/sessao.ts (até a linha 60), test/estatico/{painel-qa,exigir-pessoa,varreduras-qa}.test.ts, playwright.config.ts, e2e/{apoio,decisao.spec,editar-demanda.spec (até a linha 40)}.ts, resumo final da saída do pnpm test gravada pela ferramenta em ~/.claude/projects/.../tool-results/buoo8valc.txt]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

A T44 põe a seção "Pedido de Construção" na T11 Decisão do pacote (`/pacotes-decisao/[decId]`). Ela segue a 03 (T11),
o RF-22, a CA-26.3, o C-16 e o C-28.

Portões, todos verdes:
- `pnpm test`: 186 arquivos e 3.619 testes, nenhuma falha. Antes eram 184 e 3.599; os 20 novos estão na lista abaixo.
- `pnpm test:e2e`, a suíte inteira: código 0, com `retries: 0`. São 94 testes em 17 arquivos (`--list`): os 90 de antes e
  os 4 novos de `e2e/pedido-construcao.spec.ts`. Nenhum 429.
- `pnpm lint` e `pnpm typecheck`: limpos.
- `pnpm build`: passa. `/pacotes-decisao/[decId]` continua dinâmica.

### O que a tela faz

- **Quando a seção aparece** (`secaoDoPedido`): só com a decisão aprovada completa (`statusDecisao` aprovada e a linha
  de `decisao` presente). Pendente, aprovação parcial, devolvido e arquivado não mostram a seção. O tipo que vale é o
  copiado no pacote (`demandaTipo`), o mesmo que `gerarPedido` usa.
- **Lugar**: uma `section` com `h2` "Pedido de Construção", depois de "Registrar decisão" (03, wireframe da T11).
- **Estudo**: só "Demanda do tipo Estudo não gera Pedido de Construção.", sem botão nem link.
- **Antes de gerar** (`SecaoPedido.tsx`, componente de cliente):
  - o texto da 03: "Gere o pedido, baixe ou copie o JSON e grave-o na pasta pedidos/ da estruturaAutonoma. O envio ao
    /construir é manual nesta versão.";
  - o aviso de C-28, num alerta de atenção: "O pedido vai para o repositório git da estruturaAutonoma. Não deixe nome,
    e-mail ou telefone de cliente na ESP nem no parecer de risco.";
  - o botão "Gerar Pedido de Construção".

  Nada é gerado só por abrir a página.
- **Gerar** (C-16): o botão chama a Server Action `gerarPedidoNoPainel`, que é um POST. Enquanto ela roda, o botão mostra
  "Gerando o pedido…" e a seção fica com `aria-busy`. O e2e confere que nenhum GET pede o pedido. Quando dá certo:
  - "Pedido de Construção gerado." vai para a região de aviso (`role="status"`), e o foco volta ao botão;
  - aparece o link "Baixar <DEC-id>.json", com `download="<DEC-id>.json"` e
    `href="data:application/json;charset=utf-8,<encodeURIComponent(json)>"`;
  - aparece o botão "Copiar JSON";
  - aparece o `BlocoJson` "Conteúdo do Pedido de Construção", com o texto exato devolvido;
  - aparece a nota "O mesmo pacote gera sempre o mesmo pedido."
- **Copiar**: usa `navigator.clipboard.writeText`. Em caso de sucesso, mostra "JSON copiado para a área de
  transferência." em `role="status"`. Em caso de falha, mostra "Não foi possível copiar. Selecione o conteúdo abaixo e
  copie com Ctrl+C." no mesmo lugar, e o bloco continua visível.
- **Erros** (`erroDoPedido`): aparecem num alerta de erro (`role="alert"`), que recebe o foco.
  - 422 da validação: "O pedido não passou na validação do /construir. Nada foi entregue. Erros:", a lista da API e
    "Corrija criando uma versão nova da ESP e um pacote novo.". A lista diz o campo e o tipo, por exemplo
    `especificacao.conteudo: e-mail`, nunca o valor (C-28).
  - 422 do Estudo: o texto da 03.
  - 409: "Não foi possível concluir: …".
  - 403, 404 e erro interno: os textos da 2.8. A mensagem crua do erro interno nunca aparece.
  - Com erro, o link de baixar e o bloco somem.
- **Server Action** (`acoes-pedido.ts`, `'use server'`):
  - usa `acaoDoPainel({ acao: 'gerar_pedido_construcao', entrada: paramId.versao('decId', 'DEC') })` sobre
    `gerarPedido`;
  - a autorização e o schema do id são os da rota da API, e o id passa pela regex de DEC antes do banco (C-17);
  - a resposta leva só `{ nomeArquivo, json }`, os mesmos bytes da rota;
  - a linha de log de `acaoDoPainel` leva só o nome da ação.

### Arquivos

- Criados:
  - `src/app/(painel)/pacotes-decisao/[decId]/SecaoPedido.tsx` (plano)
  - `src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.ts` (plano)
  - `e2e/pedido-construcao.spec.ts` (plano)
  - `src/components/dados-do-pedido.ts` (desvio 1)
  - `src/components/dados-do-pedido.test.ts`
  - `src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.test.ts`
- Modificados:
  - `src/app/(painel)/pacotes-decisao/[decId]/page.tsx` (plano): a seção depois de "Registrar decisão" e o comentário do
    topo;
  - `src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts` (desvio 2): um `vi.mock('./acoes-pedido')` e o describe
    novo. Nenhum teste existente foi alterado nem afrouxado.

### Testes criados (20 unitários e de integração, 4 e2e)

- `src/components/dados-do-pedido.test.ts` (10):
  - os textos da 03 e o aviso de C-28, por inteiro;
  - as mensagens copiadas para o navegador são iguais às de `MENSAGENS_PEDIDO` (`gerar.ts`);
  - `secaoDoPedido`:
    - sem seção em pendente, parcial, devolvida, arquivada e Estudo pendente;
    - "gerar" nos quatro tipos construídos;
    - "estudo" pelo tipo copiado no pacote;
    - sem seção na vista incoerente;
  - `hrefDoPedido`: ida e volta sem perda, com acentos, aspas, `#`, `%` e quebras de linha, e nada que corte o URL;
  - `erroDoPedido`:
    - 422 de validação com a lista;
    - 422 do Estudo;
    - 409, 403, 404 e erro interno (sem a mensagem crua);
    - 422 sem lista;
    - erro de campo.
- `src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.test.ts` (6, Testcontainers, com banco e Better Auth reais):
  - aprovado: o resultado é igual ao de `gerarPedido` chamado direto, byte a byte, e gerar de novo devolve o mesmo
    (CA-22.2);
  - a administradora também gera;
  - pendente dá 409, com o texto da tela;
  - Estudo dá 422, com o texto da tela;
  - C-28: e-mail fictício na ESP dá 422 com `especificacao.conteudo: e-mail`, e o valor não aparece em parte nenhuma do
    resultado;
  - C-17: id fora do formato ou de outra versão dá `entrada_invalida`; DEC inexistente dá 404; sem sessão dá 401.
- `src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts`, describe "T11: Pedido de Construção (T44)" (4):
  - sem a seção em pendente, parcial, devolvido e arquivado;
  - aprovado: a seção vem depois de "Registrar decisão", com o texto, o aviso de C-28, o botão e a região de aviso vazia,
    e sem link, bloco, `data:` nem `<form>`;
  - Estudo pelo tipo copiado no pacote: só a frase, sem botão;
  - a administradora também vê a seção.
- `e2e/pedido-construcao.spec.ts` (4):
  - CA-26.3:
    - sem seção enquanto o pacote está pendente; depois de aprovar, o texto e o aviso;
    - gerar: o `role="status"`, o foco no botão, o bloco com `tabindex="0"`, a nota e o link com `download` e `data:`;
    - o arquivo baixado tem o nome `<DEC-id>.json` e é igual, byte a byte, ao POST da API, e igual ao texto do bloco;
    - nenhum GET pede o pedido (C-16).
  - Copiar JSON: "JSON copiado…" em `role="status"`, e a área de transferência tem o texto do bloco. Com o `writeText`
    recusando, aparece "Não foi possível copiar…".
  - C-28:
    - o alerta com "Erros:", o item `especificacao.conteudo: e-mail` e a orientação, com o foco no alerta;
    - o e-mail não aparece em `main`;
    - sem link e sem bloco;
    - a API devolve 422, sem `Content-Disposition` e sem o valor.
  - Estudo: a frase, nenhum botão nem link na seção, e a API devolve 422.

  O axe roda em quatro estados: aprovado antes de gerar, gerado, com erro 422 e Estudo aprovado. Nenhuma violação.

### Teste escrito antes e visto falhando

`pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-do-pedido.test.ts "src/app/(painel)/pacotes-decisao/[decId]"`, antes do código:
```
 FAIL  src/components/dados-do-pedido.test.ts
Error: Cannot find module './dados-do-pedido' imported from .../src/components/dados-do-pedido.test.ts
 FAIL  src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.test.ts
Error: Cannot find module '/src/components/dados-do-pedido' imported from .../acoes-pedido.test.ts
 ❯ src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts (21 tests | 3 failed)
     × aprovado: a seção vem depois de "Registrar decisão", com o texto da 03, o aviso de C-28 e o botão; nada gerado ainda
     × aprovado de Estudo (tipo copiado no pacote): só "Demanda do tipo Estudo não gera Pedido de Construção.", sem botão
     × a administradora também vê a seção num pacote aprovado de nível cto
 Test Files  3 failed | 1 passed (4)
```

`pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/pedido-construcao.spec.ts --max-failures=2`, antes do código:
```
  ✘  1 › CA-26.3: … getByRole('region', { name: 'Pedido de Construção', exact: true }) … element(s) not found
  ✘  2 › Copiar JSON: … locator.click: Test timeout of 30000ms exceeded … waiting for getByRole('button', { name: 'Gerar Pedido de Construção' })
  2 failed, 2 did not run
```

Depois do código:
- os testes novos passaram de primeira: 4 arquivos, 49 de 49;
- o `typecheck` acusou um tipo no ajudante `falha` do teste. Corrigi, e o `typecheck` ficou limpo;
- a spec nova passou: 4 de 4;
- a suíte inteira passou nos dois portões: 3.619 de 3.619 no `pnpm test`, e código 0 no `pnpm test:e2e`.

### C-36: uso da suíte e2e por conta

A spec nova **não cria nenhuma demanda**. Ela usa duas demandas que o seed já cria, achadas por
`GET /api/demandas?tipo=…`:
- "Portal de acompanhamento de pedidos (fictício)", de tipo `novo_projeto`;
- "Estudo de atendimento com IA e revisão humana (fictício)", de tipo `estudo`.

Cada teste cria pela API, na conta "cto", a própria ESP, o próprio RSK e um DEC de nível `cto`, e aprova o DEC. O caso
de C-28 é só uma ESP nova, com o e-mail fictício, na mesma demanda. O comentário do topo da spec traz a conta.

| Conta | Demandas antes | Esta spec | Total | Versões antes | Esta spec | Total |
|---|---|---|---|---|---|---|
| "cto" (com as 5 do seed) | 30 | 0 | 30 de 30 | 23 | 12 | 35 de 60 |
| "administradora" | 30 | 0 | 30 de 30 | 35 | 0 | 35 de 60 |

O "antes" vem da tabela da `06-T43-testes`. A suíte inteira terminou com código 0 e `retries: 0`, sem nenhum 429.

### Desvios do plano

1. **`dados-do-pedido.ts` e o teste dele, fora da lista.** Guardam a regra da seção: os textos, quando ela aparece, o
   link de baixar e o texto de cada erro. Tudo é testado sem tela. É o molde de `dados-do-pacote.ts` e
   `dados-da-decisao.ts`, aceito na T41 a T43.
2. **`pagina.test.ts` mudou, e `acoes-pedido.test.ts` é novo.** O teste da página que a tarefa modifica ganhou o
   describe da seção. Ganhou também o `vi.mock('./acoes-pedido')`, no mesmo molde do `vi.mock('./acoes')` que já
   existia. Nenhum teste existente mudou.
3. **Nenhuma demanda nova no e2e.** A revisão da T43 permitia 1. A tabela da `06-T43-testes` mostrou as duas contas em
   30 de 30, e a 31ª demanda daria 429. Por isso a spec usa as demandas do seed, como a revisão já previa para o caso
   Estudo. Nenhum controle de C-36 foi tocado.
4. **A Server Action valida o id com `paramId.versao('decId', 'DEC')` de `src/lib/rota.ts`.** É o mesmo schema da rota
   da API e a fonte de verdade. A cópia `RE_ID_DEC` do navegador não foi usada. Não repete a dependência invertida do
   Minor 3 da revisão da T43. As três telas de versão continuam como estão.

## Decisões tomadas

- **O botão "Gerar" continua depois de gerar, e o foco volta para ele.** Assim o foco não cai no corpo da página, e gerar
  de novo devolve o mesmo pedido (CA-22.2).
- **O pedido gerado fica só no estado da tela.** Ao recarregar a página, a pessoa gera de novo. Nada do JSON vai para a
  URL, o armazenamento do navegador ou o log.
- **A cópia que falha vai à região de aviso**, junto com a que dá certo. É o molde do T02 (`AssistenteDoisFatores`). A
  frase já orienta a seleção manual, e o bloco continua na tela.
- **A seção usa `demandaTipo`, a cópia gravada no pacote,** e não o tipo atual da demanda. É o mesmo critério de
  `gerarPedido`: a tela não oferece o que o servidor recusa.
- **Na seção do Estudo, só a frase da 03**, sem o texto de introdução nem o aviso de C-28, que falam de gerar.
- **Quando o 422 vem sem lista, "Erros:" não aparece.** A 03 só prevê o texto com a lista depois dele.

## Pendências

- **tech-lead, para a T46: as duas contas seguem em 30 de 30 demandas.**
  - A revisão da T43 prevê 1 demanda nova de tipo `estudo` em `seguranca.spec.ts` (casos C-18 e C-19). Ela daria 429
    na suíte inteira.
  - Saída que segue o mesmo caminho desta tarefa: usar a demanda de tipo `estudo` do seed, que esta spec já usa, ou
    outra do seed. Cada caso cria só a própria ESP.
  - Versões livres: 25 na "cto" e 25 na "administradora".
- **ux-ui-design: um texto que não está na 03.** É o aviso de C-28: "O pedido vai para o repositório git da
  estruturaAutonoma. Não deixe nome, e-mail ou telefone de cliente na ESP nem no parecer de risco.". O texto vem do
  plano (T44) e da 04.
- **07-qa-funcional (G2):**
  - o foco volta ao botão depois de gerar e vai ao alerta no erro;
  - "Gerando o pedido…" é anunciado pelo leitor de tela;
  - o `BlocoJson` rola pelo teclado;
  - a região de aviso anuncia "gerado", "copiado" e "não foi possível copiar".

  Uma limitação: copiar duas vezes seguidas dá o mesmo texto na região de aviso, e o leitor de tela pode não anunciar a
  segunda.
- **Para o maestro: li um arquivo de saída fora do repositório.**
  - O `pnpm test` passou do limite de exibição, e a ferramenta gravou a saída em
    `~/.claude/projects/.../tool-results/buoo8valc.txt`. Li só o resumo final.
  - O `pnpm test:e2e` inteiro foi para segundo plano depois de 180 s. O resultado (código 0) veio do aviso de fim da
    tarefa, e a contagem veio do `--list`.
  - Não li nada em `/tmp`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -8` — último commit 0d56920 (06-T43-testes)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format=%h -- e2e` — lista das specs
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format=%s --grep=06-T22-construcao` — arquivos do Pedido de Construção
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format= --diff-filter=A -- src/components src/lib "src/app/(painel)/pacotes-decisao" test` — componentes e testes existentes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format=%s --grep=06-T37-construcao -- src` — molde do "Copiar" no T02
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-do-pedido.test.ts "src/app/(painel)/pacotes-decisao/[decId]"` — FAIL: 3 arquivos falharam, 3 testes falharam e 30 passaram (teste antes do código)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/pedido-construcao.spec.ts --max-failures=2` — FAIL: 2 falharam e 2 não rodaram (teste antes do código)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-do-pedido.test.ts "src/app/(painel)/pacotes-decisao/[decId]"` — 4 de 4 arquivos, 49 de 49
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — 1 erro de tipo no ajudante do teste
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/pedido-construcao.spec.ts` — 4 de 4
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 186 de 186 arquivos, 3.619 de 3.619 testes
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — código 0, a suíte inteira (foi para segundo plano depois de 180 s)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --list` — 94 testes em 17 arquivos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas build` — passou; `/pacotes-decisao/[decId]` dinâmica
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — 2 arquivos modificados e 7 novos, todos da tarefa e a entrega
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] os textos são os de `03-ux-ui-design.md`, em pt-BR, e o axe não acusa violação nas telas tocadas
