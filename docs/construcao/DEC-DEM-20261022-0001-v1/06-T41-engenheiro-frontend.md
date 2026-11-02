---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T41-construcao
agente: engenheiro-frontend
leu: [contrato-passagem.md, pedido.json, padrao-tecnico.md, 05-tech-lead.md, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6, mapa das fases, T37 a T43), 03-ux-ui-design.md (1, 2.1 a 2.8, 3, T04, T05, T06, T07, T08, T09, T10, início de T11), 06-T40-engenheiro-frontend.md, src/modules/especificacoes/{schemas,servico,consultas}.ts, src/modules/demandas/{schemas,consultas,servico (início),gerar-id}.ts, src/modules/versoes.ts, src/modules/limites.ts, src/modules/acesso/{matriz,exigir-pessoa}.ts, src/modules/pareceres-risco/{schemas,servico (início)}.ts, src/modules/pacotes-decisao/{schemas,criar (início)}.ts, src/vendor/construir/{pedido.mjs,pedido.d.mts}, src/lib/{acao-painel,erros}.ts, src/app/api/demandas/[id]/especificacoes/route.ts, src/app/api/especificacoes/[espId]/route.ts, "src/app/(painel)/demandas/[id]/{page.tsx,detalhe.ts,demanda-da-pagina.ts,detalhe.test.ts (início)}", "src/app/(painel)/demandas/[id]/editar/{page,acoes,FormularioEditarDemanda}.ts(x)", "src/app/(painel)/demandas/nova/{page,acoes}.ts(x)", "src/app/(painel)/demandas/formularios-acoes-qa.test.ts (início)", "src/app/(painel)/not-found.tsx", src/components/{formulario,dados-da-demanda,rotulos}.ts, src/components/{CamposDaDemanda,CampoTexto,AreaTexto,Botao,Selecao,ResumoErros,Alerta,Selo,DialogoConfirmacao}.tsx, src/components/rotulos-qa.test.ts (início), test/sessao.ts, test/estatico/{exigir-pessoa,painel-qa,varreduras-qa}.test.ts, vitest.config.ts, playwright.config.ts, e2e/{apoio,editar-demanda.spec,detalhe-demanda.spec}.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

A T41 entrega três coisas:
- a Lista de textos (03, 2.4);
- a T07 Nova versão da especificação técnica (`/demandas/[id]/especificacoes/nova`);
- a T10 Ver ESP (`/especificacoes/[espId]`).

Os textos, os estados e a acessibilidade são os da 03. O detalhe (T05) ganhou o alerta de chegada da T07.

Portões, todos verdes:
- `pnpm test`: 170 arquivos e 3.376 testes, sem falha. Os 73 testes novos estão em cinco arquivos (lista abaixo).
- `pnpm test:e2e`: a suíte inteira terminou com código 0. Os 9 testes novos estão em `e2e/especificacao.spec.ts`. Os
  testes que já existiam continuam passando, inclusive os do detalhe (T40), que agora tem o alerta da T07.
- `pnpm lint` e `pnpm typecheck`: limpos.
- `pnpm build`: passa. `/demandas/[id]/especificacoes/nova` e `/especificacoes/[espId]` saem dinâmicas.

### Lista de textos (`ListaTextos.tsx` e `lista-textos.ts`)

- A lista é um `fieldset` com a `legend` do campo. Cada item é um Campo de texto "Item N", com o botão "Remover", cujo
  nome acessível é "Remover item N de <campo>". O botão "Adicionar item" fica ao fim.
- Ao adicionar, o foco vai ao campo novo. Ao remover, vai ao item anterior ou, sem item anterior, ao "Adicionar item".
- Com 50 itens, "Adicionar item" fica desabilitado, com a dica "Limite de 50 itens atingido." ligada por
  `aria-describedby`.
- O item vazio é descartado no envio. Os índices dos itens enviados ficam guardados, para que o erro da API (`campo.N`)
  volte à linha certa da tela.
- Erros:
  - o erro de um item aparece abaixo dele, com `aria-invalid`;
  - o erro da lista (por exemplo, "ao menos um item") aparece abaixo da `legend`, ligado ao `fieldset` e ao primeiro
    item. É para o primeiro item que o link do Resumo de erros leva;
  - sem nenhum item na tela, o link leva ao "Adicionar item".
- Não há arrastar para reordenar.
- A T42 (RSK) usa o mesmo componente.

### T07 Nova versão da ESP

- **Página** (Server Component). A ordem é esta:
  1. `exigirPessoaNaPagina`;
  2. `criar_especificacao`;
  3. a demanda, lida só depois de o id passar pela regex (C-17). Id fora do formato ou inexistente dá 404;
  4. com ESP na demanda, `ler_especificacao` e depois a versão de partida.
- **Versão de partida**: a mais nova da demanda, ou a indicada por `?base=<espId>` vinda da T10. Uma `base` de outra
  demanda, repetida ou fora do formato é ignorada sem leitura nenhuma, e a página parte da mais nova.
- **Informação no topo**:
  - "Esta será a ESP-…-vN. A vK continua guardada e não muda.", em que vK é a versão de partida;
  - sem ESP, "Esta será a primeira especificação técnica desta demanda, a v1.";
  - partindo de um rascunho de agente, também "Os campos vieram da vK, um rascunho do agente de insumo técnico. Revise
    antes de gravar.".
- **Formulário** (`FormularioEspecificacao.tsx`):
  - seções em `fieldset`/`legend`: Problema, Escopo (com a dica de escopo), Sistemas envolvidos e Dados. Depois vêm
    "Restrições técnicas", a lista "Dúvidas em aberto" (com a dica) e a Construção;
  - na Construção:
    - a `legend` é a da 03, com a variante para Estudo;
    - "Sistema alvo" tem a dica, e a "Conta do repositório" é uma seleção;
    - as contas são as de `DONOS_REPOSITORIO` do vendor, com `wsssistemas2626-crypto` primeiro;
    - o texto "Repositório destino: <conta>/<sistema alvo>" tem `id` próprio, ligado ao sistema alvo por
      `aria-describedby`. Ele é atualizado a cada tecla, sem anúncio.
- **Envio**:
  - a validação acontece no envio, na ordem da tela, com as mensagens da 03;
  - o botão mostra "Gravando…" e o formulário fica com `aria-busy`;
  - com dúvida preenchida, abre o diálogo "Gravar com dúvidas em aberto?", com "Gravar mesmo assim" e "Voltar". Esc e
    "Voltar" devolvem o foco ao botão "Gravar", inclusive quando o envio foi pela tecla Enter;
  - os erros da API (400) entram no mesmo resumo, campo a campo; o resto vira alerta com o texto da 2.8;
  - o que foi digitado nunca se perde. Sair com conteúdo não salvo pede confirmação (`useConfirmarSaida` da T39).
- **Server Action** (`acoes.ts`):
  - `acaoDoPainel({ acao: 'criar_especificacao' })` sobre `criarEspecificacao`, com o schema da API mais `demandaId`
    (pela regex) e `versaoEsperada`;
  - a autoria vem só da sessão (C-11);
  - a resposta leva só `{ id, demandaId, conflito, decDesatualizado }`.
- **Chegada na T05** (`chegadaDaEspecificacao`):
  - "ESP-…-vN gravada.";
  - mais "A demanda foi para Aguardando informação.", quando a versão gravada é a mais nova, tem dúvida e a demanda está
    nesse status;
  - mais "O pacote DEC-…-vN ficou desatualizado. Crie um pacote novo para decidir.", quando houver;
  - no conflito, "Outra versão foi gravada enquanto você editava. Sua versão foi gravada como vN; confira as duas no
    detalhe.". A versão e o DEC da URL só valem se forem desta demanda, e o DEC só se estiver pendente e desatualizado.

### T10 Ver ESP

- **Ordem**: `exigirPessoaNaPagina`, `ler_especificacao`, a ESP (regex de ESP antes do banco), `ler_demanda` e a
  demanda (para o título). Id fora do formato, de RSK ou de DEC, ou que não existe, dá 404 "Versão não encontrada".
- **Cabeçalho**:
  - o id e o selo "Rascunho de agente", quando for o caso;
  - o `h1` "Especificação técnica vN — <título>";
  - "Criada em <data> por <ator>".
- **Avisos**:
  - "Esta versão não muda. Para corrigir, crie uma nova versão a partir dela.";
  - o aviso de rascunho da 03;
  - "Existe uma versão mais nova: ESP-…-vN.", com link.
- **Conteúdo**: um `h2` e uma `dl` por grupo. Campo vazio mostra "Não informado." e lista vazia mostra "Nenhum item.";
  as listas aparecem como `ul`.
- **Ações**: o link-botão "Criar nova versão a partir desta" leva a `/nova?base=<espId>`, e há o link "Voltar para a
  demanda". Não existe botão nem formulário de editar ou de excluir (RF-11).

### Arquivos

- Alterado:
  - `src/app/(painel)/demandas/[id]/page.tsx`: `alertaDeChegada` agora devolve `{ tipo, texto }` e chama
    `chegadaDaEspecificacao`.
- Criados:
  - `src/components/ListaTextos.tsx` e `src/components/lista-textos.ts` (desvio 1)
  - `src/components/dados-da-especificacao.ts` (desvio 1)
  - `src/app/(painel)/demandas/[id]/especificacoes/nova/page.tsx`
  - `src/app/(painel)/demandas/[id]/especificacoes/nova/FormularioEspecificacao.tsx`
  - `src/app/(painel)/demandas/[id]/especificacoes/nova/acoes.ts`
  - `src/app/(painel)/especificacoes/[espId]/page.tsx`
  - `src/app/(painel)/especificacoes/[espId]/especificacao-da-pagina.ts` (desvio 2)
  - `src/app/(painel)/especificacoes/[espId]/not-found.tsx` (desvio 3)
  - `e2e/especificacao.spec.ts`
  - testes unitários: os cinco abaixo

### Testes criados

- `src/components/lista-textos.test.ts` (10): limite igual ao do servidor, itens iniciais, o que vai ao servidor, ids e
  alvo do resumo, textos da 2.4, e o HTML (legend, "Item N", nome do "Remover", 50 itens com o botão desabilitado e a
  dica, erro de item e erro da lista, valor escapado).
- `src/components/dados-da-especificacao.test.ts` (32):
  - mensagens iguais às do servidor (`MENSAGENS_CONSTRUCAO`) e às da 03;
  - limites e contas iguais aos do servidor e do vendor;
  - rótulos da Construção (com e sem Estudo);
  - valores iniciais e conta tirada do repositório;
  - validação na ordem da tela;
  - entrada que passa em `criarEspecificacaoSchema` e em `validarCamposDeConstrucao`, e não leva autoria;
  - erros da API com o índice e a mensagem da 03;
  - chegada na T05, com o que vem da URL conferido;
  - seções da T10.
- `src/app/(painel)/demandas/[id]/especificacoes/nova/acoes.test.ts` (8, Testcontainers, contra o banco e o Better Auth
  reais):
  - v1 com a autoria da sessão;
  - dúvida que leva a `aguardando_informacao`;
  - conflito de versão;
  - DEC desatualizado na resposta;
  - recusa do servidor sem a validação da tela;
  - tipo que mudou fora da tela;
  - C-17 e 404;
  - sem sessão.
- `src/app/(painel)/demandas/[id]/especificacoes/nova/pagina.test.ts` (12): ordem de autorização e leitura, C-17, 404,
  sem permissão, `?base=` só da mesma demanda, HTML da v1 e da v3, base de rascunho, Estudo, C-18.
- `src/app/(painel)/especificacoes/[espId]/pagina.test.ts` (10): ordem, C-17 com RSK e DEC, 404 e falha que sobe,
  título da aba, a página 404, cabeçalho e ações sem editar nem excluir, `dl` por seção, rascunho, versão mais nova,
  C-18.
- `e2e/especificacao.spec.ts` (9): primeira ESP; v2 a partir da v1 com o DEC desatualizado; lista de textos (foco e
  50 itens); repositório calculado com erros do cliente e da API; diálogo de dúvidas (Voltar, Esc, Gravar mesmo
  assim); conflito de versão; T10 com "Criar nova versão a partir desta", saída sem salvar e 404; sem sessão; 320 px.
  O axe roda na T07 vazia, preenchida, com 50 itens, com erro, com erro da API, com o diálogo, em 320 px e depois de
  gravar, e também na T10 e no 404.

### Teste escrito antes e visto falhando

`pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/lista-textos.test.ts src/components/dados-da-especificacao.test.ts "src/app/(painel)/demandas/[id]/especificacoes/nova" "src/app/(painel)/especificacoes"`, antes do código:
```
 FAIL  src/components/dados-da-especificacao.test.ts
Error: Cannot find module './dados-da-especificacao' imported from .../dados-da-especificacao.test.ts
 FAIL  src/components/lista-textos.test.ts
Error: Cannot find module './lista-textos' imported from .../lista-textos.test.ts
 FAIL  src/app/(painel)/especificacoes/[espId]/pagina.test.ts
Error: Cannot find module '/src/app/(painel)/especificacoes/[espId]/not-found' ...
 Test Files  5 failed (5)
```

`pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/especificacao.spec.ts --max-failures=3`, antes do código:
```
  ✘  1 › primeira ESP … getByRole('heading', { name: 'Nova versão da especificação técnica', level: 1 }) … element(s) not found
  ✘  2 › v2 começa preenchida … getByText('Esta será a ESP-DEM-20261031-0007-v2. A v1 continua guardada e não muda.') … element(s) not found
  ✘  3 › lista de textos … element(s) not found
  3 failed, 6 did not run
```

Depois do código:
- **unitários**: 68 de 73 na primeira rodada. Os 5 que falharam eram do próprio teste: quatro regex esperavam uma ordem
  de atributos, e uma procurava "disabled" dentro do `class`. Com os testes ajustados, 73 de 73;
- **e2e novos**: 2 de 9 na primeira rodada. `getByLabel('Item 1')` também casava com o "Remover item 1 de …" e quebrava
  o modo estrito. Os testes que falharam cedo fizeram os logins ficarem colados, e o `verify-totp` respondeu 429. Com
  `getByRole('textbox', { name: 'Item N', exact: true })`, 9 de 9.

### Desvios do plano

1. **`lista-textos.ts` e `dados-da-especificacao.ts`, fora da lista.** A regra (ids, validação, entrada, erros da API,
   chegada na T05 e seções da T10) é usada pelo Server Component, pelo formulário de cliente e pela T05. Uma função
   exportada de um arquivo `'use client'` chega ao servidor como referência de cliente, e não como função. Por isso a
   regra ficou em módulos sem a diretiva, como o `dados-da-demanda.ts` da T39 e o `detalhe.ts` da T40. A T42 reusa os
   dois módulos da lista.
2. **`especificacao-da-pagina.ts`, fora da lista.** É a leitura com `cache` usada pela página e pelo
   `generateMetadata`, pelo mesmo padrão de `demanda-da-pagina.ts`. Com ela, o 404 tem o título "Versão não encontrada"
   para quem tem acesso, e o título não revela, a quem não tem sessão, se a versão existe.
3. **`not-found.tsx` da T10, fora da lista.** A 03, T10, pede o 404 "Versão não encontrada.". O 404 do painel diz
   "Página não encontrada". A página mantém o texto e o botão da 2.8.
4. **`src/app/(painel)/demandas/[id]/page.tsx` (T40) alterado.** A T40 deixou a chegada da T07 para esta tarefa
   (Pendências dela). As chegadas da T04 e da T06 continuam iguais, e os testes da T40 e da `06-T40-testes` passam sem
   edição.
5. **Estado "Carregando" (esqueleto) não implementado.** O motivo é o mesmo da T39 e da T40: com `loading.tsx`, o
   `notFound()` não troca mais o status para 404. A página chega pronta do servidor. "Gravando…" no envio está feito.
6. **Duas leituras de `obterDemanda` na Server Action**, antes e depois da gravação. Só assim se sabe, sem mudar o
   serviço, qual DEC pendente ficou desatualizado por esta versão (03, T07, Sucesso).

## Decisões tomadas

- **"Descrição objetiva (obrigatório)".** O schema exige o campo (`min(1)`) e a 2.5 manda marcar no rótulo. A 03 traz
  só "Descrição objetiva".
- **Os rótulos da Construção mudam no Estudo:** sem "(obrigatório)" e sem a dica "Ao menos um item.", porque os campos
  são opcionais (CA-08.4).
- **O repositório destino vai sempre num tipo construído**, mesmo sem sistema alvo (vai `<conta>/`). Assim, o servidor
  responde só "Informe o sistema alvo.". No Estudo, o repositório vai só com o sistema alvo, porque `<conta>/` sozinho
  seria recusado.
- **O erro do repositório destino que vem da API** aparece na "Conta do repositório", porque a tela não tem campo de
  repositório. Quando vem junto com o erro do sistema alvo, ele repete o mesmo problema e sai.
- **Conflito de versão:** a ESP é gravada como a próxima versão, e a tela volta à T05 com o texto da 03 num alerta de
  erro (`role="alert"`). A 03 lista esse texto em "Erro", mas a versão já existe: ficar no formulário convidaria a
  gravar de novo.
- **"Gravar mesmo assim" fecha o diálogo e envia.** Se o envio falhar, o foco vai ao Resumo de erros ou ao alerta.
  Deixar o diálogo aberto durante o envio faria o evento `close` devolver o foco ao botão "Gravar" depois de o resumo
  recebê-lo.
- **`?base=` só vale para uma ESP da própria demanda.** A conferência é pela lista de versões que a página já tem, sem
  ler a outra versão.
- **O alerta de chegada não confia na URL:** o id da versão e o do DEC são conferidos contra os da demanda. O
  complemento "foi para Aguardando informação" só aparece se for verdade naquele momento.
- **Aba da T10: "Especificação técnica".** A 03 não define esse título, e a regra é a mesma da T05 (nome fixo da tela).

## Pendências

- **ux-ui-design (textos compostos ou ausentes na 03):**
  - (a) "Informe a descrição objetiva." (o campo é obrigatório no schema, e a 03 não tem a mensagem);
  - (b) "(obrigatório)" no rótulo "Descrição objetiva";
  - (c) os rótulos da Construção sem "(obrigatório)" no Estudo;
  - (d) o rótulo do item no Resumo de erros, "Item N de <campo>";
  - (e) o título da aba da T10, "Especificação técnica", e o `h1` do 404 da T10, "Versão não encontrada", sem ponto;
  - (f) o alerta de conflito na T05, como erro, em vez de na própria T07;
  - (g) o "Repositório destino: <conta>/" quando o sistema alvo está vazio;
  - (h) as frases da chegada na T05, juntas num alerta só, na ordem: gravada, aguardando, DEC.
- **07-qa-funcional (G2):**
  - o foco devolvido ao "Gravar" pelo diálogo com leitor de tela;
  - o foco depois de "Gravar mesmo assim" com falha da API (vai ao resumo, porque o diálogo fecha antes do envio);
  - os grupos aninhados (Escopo > Escopo inclui > Item 1) lidos pelo leitor de tela;
  - os cinco botões "Adicionar item" com o mesmo nome visível, distinguidos só pelo grupo.
- **Limite de verificação TOTP no e2e.** Logins em sequência rápida, quando os testes falham cedo, deram 429 no
  `/api/auth/two-factor/verify-totp` mesmo com IP fictício diferente. É um limite próprio do plugin ou por conta. Com os
  testes verdes, isso não aconteceu. Fica para a `06-T41-testes` e para a pendência de C-06 da T09.
- **Minor:** o selo "Rascunho de agente" e o aviso de rascunho da T07 e da T10 só foram vistos em teste unitário. Com os
  agentes desligados e sem token de serviço no e2e, não dá para gravar um rascunho pela API.
- **e2e inteiro, a contagem.** A suíte terminou com código 0. Ela rodou mais de 180 s, a ferramenta a passou para
  segundo plano, e a saída ficou num arquivo em `/tmp`, que não li. Os 9 testes novos aparecem verdes na parte vista
  (37 a 45). A saída do `pnpm test`, longa demais para a tela, foi gravada pela ferramenta fora de `/tmp`, e dela li
  só o resumo final.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -10` — último commit 4fcdde8 (06-T40-testes)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format=%h -- src/components "src/app/(painel)" e2e src/modules/especificacoes src/app/api/demandas src/app/api/especificacoes src/vendor` — arquivos do painel, dos componentes e da ESP
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format=%h -3 -- src/modules/demandas/servico.ts src/modules/pareceres-risco src/modules/pacotes-decisao test/deps.ts test/banco.ts` — serviços de RSK e DEC
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/lista-textos.test.ts src/components/dados-da-especificacao.test.ts "src/app/(painel)/demandas/[id]/especificacoes/nova" "src/app/(painel)/especificacoes"` — FAIL, 5 arquivos sem módulo (teste antes do código)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/especificacao.spec.ts --max-failures=3` — FAIL, 3 falharam e 6 não rodaram (teste antes do código)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/lista-textos.test.ts src/components/dados-da-especificacao.test.ts "src/app/(painel)/demandas/[id]/especificacoes/nova" "src/app/(painel)/especificacoes"` — 68 de 73 (ordem de atributo nas regex), corrigido nos testes
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/lista-textos.test.ts src/components/dados-da-especificacao.test.ts "src/app/(painel)/demandas/[id]/especificacoes/nova" "src/app/(painel)/especificacoes"` — 73 de 73
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/especificacao.spec.ts` — 2 de 9 (localizador `getByLabel('Item N')` ambíguo), corrigido no teste
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/especificacao.spec.ts` — 9 de 9
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 170 de 170 arquivos, 3.376 de 3.376 testes, 85,4 s
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — código 0, todos verdes (ver Pendências)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — 1 alterado e 15 novos, todos da tarefa (com os desvios 1 a 4)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas build` — passou; as duas rotas novas dinâmicas

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] os textos são os de `03-ux-ui-design.md`, em pt-BR, e o axe não acusa violação nas telas tocadas
