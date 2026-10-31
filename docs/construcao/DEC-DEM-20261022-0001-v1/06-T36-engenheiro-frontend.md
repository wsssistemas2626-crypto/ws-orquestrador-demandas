---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T36-construcao
agente: engenheiro-frontend
leu: [contrato-passagem.md, pedido.json, padrao-tecnico.md, 05-tech-lead.md, parada-PF-T36.md, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6, Fase 7 e T36, T37, Rastreabilidade), 03-ux-ui-design.md (seções 1, 2, T01 a T07, T11, T12, 5 e Decisões), package.json, vitest.config.ts, eslint.config.mjs, next.config.ts, tsconfig.json, postcss.config.mjs, .gitignore, src/app/layout.tsx, src/app/layout.test.ts, src/app/page.tsx, src/app/page.test.ts, src/app/api/saude/route.ts, src/proxy.ts, src/proxy.test.ts, src/lib/acao-painel.ts, src/lib/deps.ts, src/lib/env.ts, src/lib/erros.ts, src/lib/fila.ts, src/lib/fuso.ts, src/lib/log.ts, src/lib/relogio.ts, src/modules/acesso/ator.ts, src/modules/acesso/auth.ts, src/modules/acesso/exigir-pessoa.ts, src/modules/acesso/mensagens.ts, src/modules/agentes/teto.ts, src/modules/agentes/executar.ts (eventos), src/modules/demandas/consultas.ts, src/modules/demandas/schemas.ts, src/modules/demandas/servico.ts (eventos), src/modules/historico/consultas.ts, src/modules/historico/registrar.ts, src/modules/limites.ts, src/modules/pacotes-decisao/decidir.ts (eventos), src/modules/pedido-construcao/gerar.ts, src/modules/retencao/expurgar.ts, src/db/schema/demandas.ts, src/db/schema/decisao.ts, src/db/schema/versoes.ts, scripts/migrate.ts, scripts/seed-ficticio.ts, scripts/start-hml.ts, scripts/lib/saida.ts, test/setup-global.ts, test/banco.ts, test/auth.ts, test/sessao.ts, test/estatico/exigir-pessoa.test.ts, test/estatico/projeto.test.ts, test/estatico/variaveis.test.ts, test/estatico/varreduras-qa.test.ts, test/estatico/relogio.test.ts, test/estatico/eslint.test.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

A tarefa T36 está feita: design system, moldura do painel, páginas comuns de erro e a infraestrutura do e2e. Os quatro
portões estão verdes: `pnpm test` (2826 de 2826), `pnpm test:e2e` (5 de 5, com axe), `pnpm lint` e `pnpm typecheck`
limpos. O `pnpm build` também passa.

### Arquivos criados

- Design system (03, 2.1 a 2.6):
  - `src/app/globals.css`: tokens `@theme` de 2.1, base tipográfica, foco visível global, `scroll-padding-top` do
    cabeçalho fixo e `prefers-reduced-motion`.
  - `src/components/rotulos.ts`: `ROTULO_STATUS`, `COR_STATUS`, `ROTULO_DECISAO`, `COR_DECISAO`, `ROTULO_NIVEL`,
    `COR_NIVEL`, `SELO_RASCUNHO`, `SELO_DESATUALIZADO`, `ROTULO_TIPO`, `ROTULO_PAPEL_SOLICITANTE`, `ROTULO_LINHA`,
    `ROTULO_URGENCIA`, `ROTULO_NIVEL_APROVACAO`, `ROTULO_AGENTE`, `NOME_AGENTE`, `ROTULO_PAPEL`, `ROTULO_CAMPO_DEMANDA`,
    `formatarDinheiro`, `rotuloAtor` e `textoDoEvento`. Só importa tipos dos módulos, então pode ir ao navegador.
  - `src/components/formulario.ts`: `TITULO_RESUMO_ERROS`, `PREFIXO_CONFLITO`, `idDoCampo` e
    `errosDoResultado(ResultadoAcao, rotulos)`. Devolve os campos para o Resumo de erros, a mensagem por campo, o
    alerta com o texto de 2.8 (409 com o prefixo; 5xx sempre com o texto fixo, nunca a mensagem que chegou) e os
    `erros` do 422.
  - Os 17 componentes de 2.3, em `src/components/`: `Botao`, `CampoTexto`, `AreaTexto`, `Selecao`, `GrupoOpcoes`,
    `CaixaSelecao`, `Interruptor`, `Selo`, `Alerta`, `ResumoErros`, `Tabela`, `Paginacao`, `DialogoConfirmacao`,
    `Esqueleto`, `BlocoJson`, `RegiaoAviso` e `CabecalhoPainel` (todos `.tsx`). O que cada um garante:
    - alvo de 44 px;
    - rótulo visível, com dica e erro ligados por `aria-describedby` e `aria-invalid` só quando há erro;
    - `Interruptor` como `button role="switch"`, com `aria-checked` e o estado em texto;
    - opção indisponível com `aria-disabled` e o motivo ligado ao campo;
    - `DialogoConfirmacao` com `<dialog>` nativo: foco no título, Esc fecha e o foco volta à origem;
    - `BlocoJson` com `tabindex="0"`, `role="region"` e rótulo;
    - `Tabela` com `caption` focável, `th scope="col"` e região rolável;
    - `ResumoErros` que recebe o foco e tem um link por campo.
- Moldura e páginas (03, 2.7 e 2.8):
  - `src/app/(painel)/layout.tsx`: a moldura. O primeiro elemento focável é "Pular para o conteúdo", que leva a
    `main#conteudo`. Depois vêm o cabeçalho, o aviso de suspensão (RF-18) e o de capacidade acima de 9.000 demandas
    (RNF-09). O título segue o modelo "%s — WS Orquestrador de Demandas".
  - `src/app/(painel)/demandas/page.tsx`: página provisória, com `exigirPessoaNaPagina('/demandas')` e o `h1`
    "Demandas".
  - `src/app/sem-permissao/page.tsx`, `src/app/not-found.tsx` e `src/app/error.tsx`: os textos de 2.8.
- Infraestrutura do e2e:
  - `playwright.config.ts`: usa `BASE_URL` quando existe; sem ela, sobe o `webServer`.
  - `e2e/servidor.ts`: sobe o Postgres pelo Testcontainers, cria o papel do app, roda `migrar` e `seedFicticio`
    (com `SEED_FICTICIO=1` só dentro do processo) e depois o `next dev -p 3101 -H 127.0.0.1`. O ambiente do app é
    montado do zero e não leva chave de provedor.
  - `e2e/apoio.ts`: `entrarComo`, `semViolacoes`, `api` e `TAGS_AXE`.
- Testes:
  - `src/components/rotulos.test.ts` (18);
  - `src/components/formulario.test.ts` (8);
  - `src/components/componentes.test.ts` (20);
  - `e2e/moldura.spec.ts` (5).

### Arquivos alterados

- `src/app/layout.tsx`: importa `./globals.css`. `lang="pt-BR"` e o título raiz continuam como estavam.
- `test/estatico/varreduras-qa.test.ts`: a regex `PAGINA_PUBLICA` passa a aceitar `src/app/sem-permissao/page.tsx`,
  com um caso que entra e outro que não entra (desvio 2).

### Teste escrito antes e visto falhando

- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components` deu FAIL nas 3 suítes:
  ```
  FAIL  src/components/rotulos.test.ts [ src/components/rotulos.test.ts ]
  Error: Cannot find module './rotulos' imported from .../src/components/rotulos.test.ts
  Test Files  3 failed (3)
  ```
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` falhou nos 5 testes, com o login pela API
  já funcionando:
  ```
  ✘ moldura: pular para o conteúdo ... — Locator: getByRole('link', { name: 'Pular para o conteúdo' }) ... element(s) not found
  ✘ sem sessão, o painel leva a /entrar — Received string: "http://127.0.0.1:3101/demandas"
  ✘ 404 com o texto de 03, 2.8 — getByRole('heading', { name: 'Página não encontrada' }) ... element(s) not found
  5 failed
  ```

### Resultado final

| Comando | Resultado |
|---|---|
| `pnpm test` | 144 arquivos, 2826 de 2826 passaram (antes da T36: 141 arquivos e 2780 testes; a T36 soma 46) |
| `pnpm test:e2e` | 5 de 5 passaram, com axe (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`) sem violação na moldura (1280 px e 320 px com o menu aberto), na 404 e em "Sem permissão" |
| `pnpm lint` | limpo, 0 erros e 0 avisos |
| `pnpm typecheck` | limpo |
| `pnpm build` | passa; todas as rotas ficam dinâmicas (ƒ) |

### Desvios do plano

1. **O modelo do título fica em `src/app/(painel)/layout.tsx`, não no layout raiz.** O `layout.test.ts` da
   06-T01-testes exige `metadata.title` igual à string "WS Orquestrador de Demandas" no layout raiz. As telas de fora
   do painel (404 e "Sem permissão") declaram o título inteiro.
2. **`varreduras-qa.test.ts` mudou.** O plano manda criar `src/app/sem-permissao/page.tsx`, mas a varredura de C-04 só
   aceitava raiz, entrar e configurar-2fa fora do grupo `(painel)`. Dentro do painel, a página teria de chamar
   `exigirPessoaNaPagina`, que leva justamente a `/sem-permissao` quando o papel é inválido: seria um laço sem fim. A
   página é texto fixo, sem sessão e sem dado.
3. **Testes além dos do plano.**
   - `componentes.test.ts` e `formulario.test.ts`: o HTML de cada componente e o padrão de 2.5.
   - Casos a mais em `rotulos.test.ts`: as enumerações e os eventos do histórico.
   - Em `moldura.spec.ts`: um teste com a administradora, o link de pular e o botão "Menu" em 320 px com axe; um teste
     de "Sem permissão"; e, no teste da 404, o texto, o título e o axe.
4. **Rotas dinâmicas.** `export const dynamic = 'force-dynamic'` no layout do painel e em `/sem-permissao`, e
   `connection()` na 404. Sem isso, o `next build` tentava pré-renderizar `/demandas` sem as variáveis do app (C-33) e
   falhava. Além disso, uma página estática sairia com scripts sem o nonce da CSP (C-19), que é novo a cada
   requisição. Efeito colateral: a raiz `/` também passou a ser dinâmica.
5. **"Sair" provisório.** O botão chama `fetch('/api/auth/sign-out')` e depois `router.replace('/entrar')`. A T37 troca
   por `authClient.signOut`, como está no plano. Sem isso, a moldura de 2.7 teria um botão morto.
6. **`next dev` preso em `127.0.0.1` (`-H`).** O plano diz só `next dev -p 3101`, mas sem `-H` o servidor de
   desenvolvimento ficaria aberto na interface pública da VPS durante o e2e.
7. **O `next dev` sobe direto pelo `node`, sem `pnpm`.** O `e2e/servidor.ts` chama o binário do `next` com o
   `process.execPath`, para o ambiente do filho ser só o montado ali.
8. **A Lista de textos (2.4) não entrou.** No plano, ela é da T41 ("T41 Lista de textos, T07…"), e a T36 não a lista.

## Decisões tomadas

- A moldura não decide acesso. Ela só lê a pessoa com `exigirPessoa`; sem sessão, mostra só o conteúdo, e quem
  redireciona com o `callbackURL` certo é a página. O layout não sabe o caminho atual e roda em paralelo com a página.
- O aviso de suspensão só aparece com teto maior que 0. O teto 0, que é o de fábrica, é o caso "Teto não definido"
  da tela T12. Se o aviso valesse também para ele, apareceria em todas as telas desde o primeiro dia.
- Ao trocar de tela, o foco vai ao `h1` comparando o caminho anterior, e não "já rodou uma vez". O modo estrito do
  React roda o efeito duas vezes e roubava o foco do "Pular para o conteúdo" na primeira carga.
- `rotuloAtor` com conta sem nome mostra só o papel, e sem nenhum dos dois, "Não informado". Hoje isso não acontece,
  porque o app não apaga conta, mas a tela não quebra se acontecer.
- `textoDoEvento` cobre os 23 eventos de `AcaoEvento`, porque o `switch` é exaustivo no tipo. Os textos que não estão
  na 03 estão na primeira pendência.
- `entrarComo` manda um `x-real-ip` fictício (198.18.0.0/15) por login. O limite de 10 logins por minuto por IP (C-06)
  passa a não ligar um teste ao outro quando as telas da T37 à T46 somarem dezenas de logins. Atrás de proxy, o
  cabeçalho é trocado pelo IP real.
- `semViolacoes` lista regra, impacto e alvo da violação, sem o HTML da página.
- Senha, segredo e credenciais do `e2e/servidor.ts` são fictícios e escritos no próprio arquivo:
  `SEGREDO-FICTICIO-DO-E2E-…`, `app_e2e_ficticia` e `migrator_e2e_ficticio`. Só valem para o contêiner descartável. O
  erro de subida mostra só a classe, nunca a URL.
- `GrupoOpcoes` não deixa marcar a opção com `aria-disabled` (o `onClick` é bloqueado). A opção não usa `disabled`
  porque precisa continuar encontrável e explicada (03, T05 e T11).
- A `Paginacao` indisponível é um `<a role="link" aria-disabled="true">` sem `href`, e não um `span`. Assim o
  controle continua com o papel de link no leitor de tela.
- Nesta etapa rodou também um comando de troca de texto em `e2e/servidor.ts`, arquivo da tarefa, fora da lista Pode.
  Fabiano liberou esse comando, e a liberação está registrada em `passagens.jsonl`.

## Pendências

- Textos que não estão na 03, para o `ux-ui-design` confirmar (o código está em `src/components/rotulos.ts`):
  - motivo de `agente_ignorado`: "agente desligado", "modelo sem preço vigente", "provedor de IA não configurado";
  - artefato na falha de agente: "os campos da demanda" (orquestrador), "a especificação técnica" (insumo técnico),
    "o pacote de decisão" (consolidação). Para o agente de risco vale o "o parecer" do exemplo da 03;
  - "1 tentativa", no singular;
  - os eventos que não são de demanda (ligar e desligar agente, teto, 2FA, conta, token, entrada pendente expurgada);
  - o título da aba da página de erro: "Não foi possível carregar esta página — WS Orquestrador de Demandas".
- T37: trocar o `fetch` do "Sair" por `authClient.signOut` e criar `/entrar`. Hoje, sem sessão, o painel leva a
  `/entrar`, que ainda dá 404. Na T01, o foco no `h1` ao abrir a tela fica para a própria página.
- T38: a `RegiaoAviso` e o `caption` da `Tabela` já estão prontos para "12 demandas encontradas." e para o foco depois
  de filtrar.
- 07-qa-funcional: o que o axe não pega e o e2e não cobre:
  - o foco no `h1` ao navegar pelo menu;
  - o diálogo prendendo e devolvendo o foco;
  - o anúncio do contador da `AreaTexto` a partir de 90 % do limite.
- 09-entrega (`homologar`): o e2e só rodou contra o `next dev`, onde a CSP também aceita `'unsafe-eval'`. Ainda falta
  conferir, contra o `next start` da homologação, que os scripts levam o nonce. Não apareceu nenhum sinal de problema.
- O contêiner do e2e é parado pelo `SIGTERM` que o Playwright manda no fim (`gracefulShutdown`); se não for, o Ryuk do
  Testcontainers o remove. Não consegui conferir que nenhum contêiner ficou de pé, porque `docker ps` está fora da
  minha lista.
- As linhas de log do pino deixam a saída do `pnpm test` com mais de 38 KB. O resumo final (144 arquivos, 2826 testes)
  saiu da saída que a ferramenta guardou da execução completa.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -15` — último commit ddf362c (PF-T36 fabiano)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --stat -3` — PF-T36 só com `parada-PF-T36.md` e `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat=200 4b825dc642cb6eb9a060e54bf8d69288fbe5e1d4 HEAD -- src test e2e scripts public package.json playwright.config.ts vitest.config.ts eslint.config.mjs next.config.ts tsconfig.json postcss.config.mjs .gitignore` — erro `bad object` (árvore vazia ausente)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --max-parents=0 --stat=200 --format=%h` — commit raiz 2aba8e1
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat=200 --stat-count=1000 2aba8e1 HEAD -- src test e2e scripts public package.json playwright.config.ts vitest.config.ts eslint.config.mjs next.config.ts tsconfig.json postcss.config.mjs .gitignore` — lista de 285 arquivos rastreados
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components` — FAIL, 3 suítes, módulos ausentes (teste antes do código)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — 0 de 5 (teste antes do código)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components` — 45 de 45
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — 3 de 5 (foco roubado pelo efeito em modo estrito)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — 5 de 5
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — 0 erros, 1 aviso (`window.location.assign`)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — 7 erros (tipo do `env` do spawn e `children` nos testes)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — FAIL (saída truncada pelo log do pino)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent --reporter=dot` — FAIL, 1 teste (saída truncada)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent test/estatico src/app/layout.test.ts src/app/page.test.ts test/next-config.test.ts test/next-config-qa.test.ts src/proxy.test.ts` — erro de argumento do Vitest (`--silent` sem valor)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico src/app/layout.test.ts src/app/page.test.ts test/next-config.test.ts test/next-config-qa.test.ts src/proxy.test.ts` — 68 de 68
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot test/matriz-rotas.test.ts test/matriz-rotas-qa.test.ts test/banco.test.ts test/deps.test.ts src/lib src/components src/app/api/saude src/app/api/auth src/db/index.test.ts src/instrumentation.test.ts src/instrumentation-qa.test.ts src/vendor` — 514 de 515 (a falha era uma asserção nova minha, sobre a ordem dos atributos)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot src/components` — 46 de 46
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — 2826 de 2826, 144 arquivos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas build` — falhou ao pré-renderizar `/demandas` (`ErroConfiguracao`)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas build` — passou; `/sem-permissao` e `/_not-found` ainda estáticas
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas build` — passou; todas as rotas dinâmicas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — 2 alterados e 32 novos, todos da tarefa
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — 5 de 5
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — 2826 de 2826, 144 arquivos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — `src/app/layout.tsx` (+3) e `test/estatico/varreduras-qa.test.ts` (+19 −5)

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] os textos são os de `03-ux-ui-design.md`, em pt-BR, e o axe não acusa violação nas telas tocadas
