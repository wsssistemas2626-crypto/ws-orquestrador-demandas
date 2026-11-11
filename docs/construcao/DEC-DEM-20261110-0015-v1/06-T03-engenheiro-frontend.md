---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T03-construcao
agente: engenheiro-frontend
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 05-tech-lead.md, docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md (cabeçalho, G1 a G7, T01 a T03), 01-analista-requisitos.md (RF-01 a RF-03), 03-ux-ui-design.md (seções 0 a 3.2), 06-T02-engenheiro-frontend.md, playwright.config.ts, src/app/globals.css, src/components/rotulos.ts, Selo.tsx, Botao.tsx, Alerta.tsx, CampoTexto.tsx, AreaTexto.tsx, Selecao.tsx, GrupoOpcoes.tsx, CaixaSelecao.tsx, Interruptor.tsx, Tabela.tsx, Paginacao.tsx, DialogoConfirmacao.tsx, Esqueleto.tsx, BlocoJson.tsx, ListaTextos.tsx, src/app/configurar-2fa/AssistenteDoisFatores.tsx (início), test/estatico/painel-qa.test.ts, src/components/rotulos.test.ts, src/components/componentes.test.ts, src/app/(painel)/demandas/fila-qa.test.ts, src/app/(painel)/demandas/fila.test.ts (trechos), src/app/(painel)/demandas/[id]/detalhe-qa.test.ts (cabeçalho e ajudantes)]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T03 (tokens da marca, contraste, foco e componentes base) feita. Suíte de unidade, e2e, lint e typecheck verdes; G4
(CV-01) vazio.

### Arquivos alterados

Código:

- `src/app/globals.css`: `@theme` com a paleta da 03, 2.1 (30 tokens, valor exato do manual), os nove nomes da 0.1.13
  como apelidos por `var()` (D-01, saem na T16), `--radius-campo: 10px` e `--radius-cartao: 16px`. Base: `--cor-foco`
  (`acao-escura`) em `:root` e `branco` em `.superficie-escura`; `:focus-visible` com `var(--cor-foco)`; `html` em
  `tinta` sobre `superficie`; escala da 03, 2.3 (`h1` 22/28 px, 800, −0,02 em, `marinho`; `h2` 18/700; `h3` 16/600);
  link em `acao-escura`. O `@theme inline` das fontes (T02) e o bloco de `prefers-reduced-motion` não mudaram.
- `src/components/rotulos.ts`: `CorSelo` com os nomes da 03, 2.5 e os mapas `COR_STATUS`, `COR_DECISAO`, `COR_NIVEL` e
  os três selos fixos (D-03). Os textos `ROTULO_*` não mudaram.
- `src/components/Selo.tsx`: `data-cor` (D-15), 13 px, peso 700, pílula, par texto/fundo por token. O rascunho continua
  tracejado.
- `src/components/Botao.tsx`: variantes com tokens; novas `sobre-escuro` e `claro-sobre-escuro`; estado `aria-disabled:`
  na base (fundo `selo-cinza-fundo`, texto `tinta-media`, borda tracejada `tinta-suave`). O botão não ganhou
  comportamento novo: o clique em `aria-disabled` continua sendo de quem usa (T12).
- `src/components/Alerta.tsx`: os quatro tipos com os pares de tokens (`informacao` em `nevoa`, com borda `acao-escura`).
- `src/components/CampoTexto.tsx` (`classeDoCampo`): borda `tinta-suave`, erro `border-2 border-erro`, fundo `branco`,
  `text-base` (16 px), raio de campo. Vale para `Selecao`, `AreaTexto` e `ListaTextos`, que usam a mesma função.
- `src/components/GrupoOpcoes.tsx`: `variante?: 'lista' | 'cartao'`. O cartão é clicável inteiro (o rótulo estica a área
  de clique com `after:absolute after:inset-0`), tem no mínimo 44 px e borda `tinta-suave`; marcado:
  `has-[:checked]:border-2 border-marinho bg-nevoa`. Ids, `name` e `aria-*` são os mesmos da lista, e um teste confere
  isso atributo a atributo. A lista continua com o HTML de antes, menos a cor do rádio, que passou a `accent-acao-escura`.
- `CaixaSelecao.tsx` (rádio/checkbox em `acao-escura`), `Interruptor.tsx`, `Tabela.tsx` (tabela `branco`, cabeçalho
  `superficie` e `tinta-media`, divisória `linha`), `Paginacao.tsx`, `DialogoConfirmacao.tsx` (raio de cartão, borda
  `linha`, véu `tinta/50`), `Esqueleto.tsx` (`linha`, visível sobre o fundo novo `superficie`), `BlocoJson.tsx`.
- Novo: `src/components/Cartao.tsx`, `section` com `rounded-cartao border border-linha bg-branco p-4 md:p-6`, sem sombra
  e com `aria-labelledby` opcional (`rotuloPor`).

Testes novos:

- `test/estatico/contraste-tokens.test.ts`: o do plano, sem mudança. Fórmula, 34 pares de texto (≥ 4,5:1), 11 pares não
  textuais (≥ 3:1) e 5 vetados (abaixo do mínimo). **Nenhum par reprovou**, então não há volta à 03 (P-03).
- `test/estatico/cores-so-por-token.test.ts`: CA-01.1 (`hexForaDoTema`, com casos plantados e a única exceção, o QR da
  T02 com `#ffffff` e `#000000`; `hexForaDoBlocoTheme` no `globals.css`), CA-01.2 (nenhum `style={` em `src/`) e
  CA-01.3 (as 13 cores do manual com valor exato no `@theme`).

Testes existentes que mudaram:

- Previstos em G5:
  - `painel-qa.test.ts`: a tabela de tokens passou a ser a da 03, 2.1, com os apelidos e o `--radius-cartao`. O valor
    com parênteses é escapado na regex. O foco passou a `var(--cor-foco)`. Entrou um teste novo para `--cor-foco`,
    `.superficie-escura`, o fundo `superficie` e o `h1` `marinho`.
  - `rotulos.test.ts`: o mapa da 03, 2.5.
  - `componentes.test.ts`: classes do `Botao` (`bg-acao`, `border-tinta-suave`, `bg-erro`) e do `Selo` (`violeta`).
    Entraram testes novos para as variantes novas do `Botao`, o estado `aria-disabled`, a ausência de paleta do
    Tailwind, o `Cartao`, o `GrupoOpcoes` cartão, o `data-cor` e os pares das 10 cores do `Selo`, o `Alerta` de
    informação e `classeDoCampo`.
  - `fila-qa.test.ts:370`: a regex de classe virou `data-cor="${COR_STATUS[st]}"`.
- **Fora de G5. Cada trecho troca só o seletor de classe que o próprio componente mudou nesta tarefa; nenhuma asserção
  saiu e nenhuma regra testada mudou:**
  - `src/app/(painel)/demandas/fila.test.ts`:
    - linhas 126 e 127: `bg-blue-100`/`bg-amber-100` viraram `data-cor="violeta"`/`data-cor="ambar"`, pelo D-15. O
      teste continua conferindo o selo com o texto de cada status.
    - linha 192: `border-perigo` virou `border-erro` (o `Alerta` de erro).
    - linha 198: `<tr class="border-t border-borda">` virou `border-linha` (a divisória da `Tabela`). O teste continua
      contando as 5 linhas do esqueleto.
  - `src/app/(painel)/demandas/[id]/detalhe-qa.test.ts`:
    - linha 113: o localizador das linhas do histórico passou de `border-borda` a `border-linha`.
    - linha 117: o mapa `ALERTA`, que acha cada alerta pela classe do tipo, ganhou as classes novas do `Alerta`. As
      quatro asserções de RF-16, RF-24, RF-21/C-30 e CA-15.3 ficaram iguais.

### Comandos e resultado

- Visto falhando (antes do código), os 6 arquivos: `painel-qa.test.ts` com 50 testes e 43 falhas, e
  `contraste-tokens.test.ts` com 51 testes e 50 falhas (`Error: token --color-tinta-suave ausente no @theme`).
  `cores-so-por-token.test.ts` falhou no CA-01.3 (`expected '\n  --color-texto: #1f2937;…' to match
  /--color-marinho:\s*#12385f;/i`). Também falharam `componentes`, `rotulos` e `fila-qa`, pelas classes e pelo
  `Cartao` que não existiam. O CA-01.1 e o CA-01.2 já passavam no código de hoje: 5 passaram e 13 foram pulados. Ali, o
  "visto falhando" são os casos plantados, como no CV-02 da T01.
- Depois do código:
  - os 6 arquivos: 229 de 229;
  - `pnpm test`: **211 arquivos, 4707 de 4707**;
  - `pnpm test:e2e`: **154 de 154** (5,7 min), com a `axe-todas` sem violação nas 12 telas sobre os tokens novos e a
    vigia da T01 sem achado;
  - `pnpm lint` e `pnpm typecheck`: limpos;
  - G4: `git diff 198e97d --stat` nos arquivos congelados e em `src/modules`: vazio.

### Desvios do plano

1. Dica, mensagem de erro, contador do `AreaTexto`, dica do `ListaTextos` e texto da opção indisponível do `GrupoOpcoes`
   **ficaram com os nomes da 0.1.13** (`text-texto-suave`, `text-perigo`). Pelo D-01, eles valem exatamente
   `tinta-media` e `erro`, então a cor na tela é a mesma da 03. Razão: cinco arquivos de teste fora de G5
   (`lista-textos.test.ts`, `componentes-qa.test.ts`, `detalhe.test.ts`, `pagina.test.ts` e o próprio `detalhe-qa`)
   fixam essas classes literais. Trocar o nome agora mexeria em testes fora da tarefa sem mudar nada no visual. A T16,
   que apaga os apelidos com teste estático, troca as classes e esses seletores juntos. Por isso `AreaTexto.tsx`,
   `ListaTextos.tsx` e `Selecao.tsx` não aparecem no diff: o que mudou neles veio de `classeDoCampo`.
2. A tabela do plano para o `Selo` foi seguida como estava. No `Botao`, a variante `perigo` ficou sem `hover`, como no
   plano (`bg-erro text-branco`); a de hoje tinha `hover:bg-red-800`, da paleta do Tailwind.

## Decisões tomadas

- Divisória da `Tabela` em `linha`, não em `tinta-suave`: na 03, 2.1, `linha` é o divisor decorativo, e a linha da
  tabela não é fronteira de controle.
- `Esqueleto` em `linha`: com o fundo da tela agora em `superficie`, a barra em `superficie` sumiria.
- O véu do `DialogoConfirmacao` passou de `bg-black/50` a `bg-tinta/50`, para não sobrar classe da paleta do Tailwind
  para a T16.
- O cartão do `GrupoOpcoes` estica o rótulo (`after:absolute`) em vez de envolver o rádio no `label`. Assim os ids, o
  `htmlFor`, o `<p>` da dica e o `aria-describedby` ficam iguais aos da lista, e um `<p>` não vai parar dentro de um
  `label`.
- `Cartao` com props explícitas (`id`, `rotuloPor`, `className`, `children`), sem espalhar atributos, para não abrir
  caminho a `style`.
- Na regex de hexadecimal, entidades HTML e identificadores ficam de fora (`#conteudo`, `#resultado-da-fila`), e o
  teste prova isso.

## Pendências

- Para a T16 (não bloqueia): trocar `text-texto-suave` e `text-perigo` em `CampoTexto` (`Dica`, `MensagemDeErro`),
  `AreaTexto`, `ListaTextos` e `GrupoOpcoes`, junto com os seletores de `lista-textos.test.ts:155,166` e de
  `componentes-qa.test.ts:280`, e conferir `detalhe.test.ts` e `pagina.test.ts` (desvio 1).
- Para a 07 (não bloqueia): o `GrupoOpcoes` cartão ainda não é usado em tela (entra na T13). Foco, clique no cartão
  inteiro e opção indisponível no cartão ficam para a conferência à mão depois da T13.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261110-0015-v1`, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -12` — topo 88e0e7e (06-T02-testes)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/contraste-tokens.test.ts test/estatico/cores-so-por-token.test.ts test/estatico/painel-qa.test.ts src/components/componentes.test.ts src/components/rotulos.test.ts "src/app/(painel)/demandas/fila-qa.test.ts"` — visto falhando (painel-qa 43 de 50, contraste 50 de 51, CA-01.3 e os demais)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — 1 erro, no teste novo do `Cartao` (`children` no `createElement`)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/contraste-tokens.test.ts test/estatico/cores-so-por-token.test.ts test/estatico/painel-qa.test.ts src/components/componentes.test.ts src/components/rotulos.test.ts "src/app/(painel)/demandas/fila-qa.test.ts"` — 229 de 229
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 13 falhas em 6 arquivos fora de G5 (seletores de classe)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — só os arquivos da tarefa
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/demandas/fila.test.ts" "src/app/(painel)/demandas/[id]/detalhe.test.ts" "src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts" src/components/lista-textos.test.ts src/components/componentes-qa.test.ts --reporter=dot` — 3 falhas, todas em `fila.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 18 arquivos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/demandas/[id]/detalhe-qa.test.ts" "src/app/(painel)/demandas/fila.test.ts" --reporter=dot` — 4 falhas, em `detalhe-qa.test.ts` (seletor de alerta e de linha)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — 211 arquivos, 4707 de 4707
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --reporter=dot` — 154 de 154 (5,7 min)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 198e97d --stat -- src/proxy.ts src/proxy.test.ts next.config.ts src/app/api src/db drizzle src/modules src/worker src/jobs src/agents src/lib/auth.ts src/lib/auth-cliente.ts src/lib/qr.ts src/lib/log.ts src/lib/erros.ts src/instrumentation.ts pnpm-workspace.yaml "src/app/(painel)/configuracao/agentes/acoes.ts" "src/app/(painel)/demandas/[id]/acoes.ts" "src/app/(painel)/demandas/[id]/editar/acoes.ts" "src/app/(painel)/demandas/[id]/especificacoes/nova/acoes.ts" "src/app/(painel)/demandas/[id]/pacotes-decisao/novo/acoes.ts" "src/app/(painel)/demandas/[id]/pareceres-risco/novo/acoes.ts" "src/app/(painel)/demandas/nova/acoes.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes.ts"` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — 20 modificados e 3 novos, todos da tarefa

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa (os dois testes fora de G5 mudaram só no seletor, trecho a trecho em Entrega)
- [x] os textos são os de `03-ux-ui-design.md`, em pt-BR, e o axe não acusa violação nas telas tocadas (nenhum texto mudou; a `axe-todas` passou nas 12 telas)
