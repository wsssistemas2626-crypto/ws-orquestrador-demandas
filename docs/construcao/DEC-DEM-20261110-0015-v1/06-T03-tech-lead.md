---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T03-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12), 05-tech-lead.md, docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md (cabeçalho, G1 a G7, T03), 06-T03-engenheiro-frontend.md, commit d452a76 (diff completo), src/components/Botao.tsx, src/components/GrupoOpcoes.tsx, src/components/Alerta.tsx, 03-ux-ui-design.md (seções 0 e 1)]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T03 (tokens da marca, contraste, foco e componentes base), código no commit d452a76 (d0f82cf e 001264a só
registram passagens e regravam a entrega). **Nenhum problema Critical ou Important.** Três pontos Minor, que vão para
Pendências e não bloqueiam a passagem.

### Conferência contra o plano (T03)

- `globals.css`: os 30 tokens da 03, 2.1 com o valor do plano, letra a letra; os nove apelidos D-01 por `var()`;
  `--radius-campo: 10px` e `--radius-cartao: 16px`; `--cor-foco` em `:root` (`acao-escura`) e em `.superficie-escura`
  (`branco`); `:focus-visible` com `var(--cor-foco)`, 2 px e afastamento 2 px; `html` em `tinta` sobre `superficie`;
  `h1` 22/28 px, 800, −0,02 em, `marinho`; `h2` 18/700; `h3` 16/600; link `acao-escura`. Igual ao Passo 3.
- `rotulos.ts`: `CorSelo` e `COR_STATUS`, `COR_DECISAO`, `COR_NIVEL` e os três selos fixos exatamente como o D-03; os
  `ROTULO_*` não mudaram.
- `Selo.tsx`: tabela `CORES` idêntica à do plano, `data-cor` (D-15), 13 px, `font-bold`, pílula, tracejado mantido.
  Todo par texto/fundo usado pelo selo está no `TEXTO` do teste de contraste.
- `Botao.tsx`: as seis variantes e o estado `aria-disabled:` com as classes do plano; `classeDoBotao` já existia e
  continua a única fonte das classes (sem duplicação). `perigo` sem `hover`, como no plano (desvio 2 da entrega).
- `Alerta`, `CampoTexto` (`classeDoCampo`), `CaixaSelecao`, `Interruptor`, `Tabela`, `Paginacao`,
  `DialogoConfirmacao`, `Esqueleto`, `BlocoJson`: só classes, com tokens da 03; nenhum comportamento mudou.
  `AreaTexto`, `Selecao` e `ListaTextos` herdam de `classeDoCampo`, por isso não aparecem no diff (desvio 1, aceito).
- `GrupoOpcoes`: `variante?: 'lista' | 'cartao'`, padrão `lista`; o teste compara atributo a atributo (`input`,
  `label`, `p`, `fieldset`, `legend`, sem `class`) as duas variantes, então ids, `name` e `aria-*` ficaram iguais, como
  o plano exige. O bloqueio da opção indisponível (`impedir` no clique, `opcaoMarcavel` no `change`) não mudou e vale
  também para o clique no pseudo-elemento do rótulo.
- `Cartao.tsx`: `section` com `rounded-cartao border border-linha bg-branco p-4 md:p-6`, sem sombra; props explícitas,
  sem espalhar atributos (fecha caminho a `style`).
- Testes novos: `contraste-tokens.test.ts` é o do plano sem mudança; `cores-so-por-token.test.ts` segue a estrutura
  pedida (função pura, casos plantados, varredura, exceção nominal do QR com só `#ffffff` e `#000000`, CA-01.3 com as
  13 cores). A regex de `@theme\s*\{` não pega o `@theme inline {` da T02, então o CA-01.1 olha o bloco certo.
- Testes existentes: os quatro de G5 mudaram só no previsto. Fora de G5, `fila.test.ts` (linhas 126, 127, 192, 198) e
  `detalhe-qa.test.ts` (linhas 113 e 117) trocaram **só o seletor de classe** do componente que a tarefa mudou;
  conferi no diff: nenhuma asserção saiu, nenhuma contagem mudou, e cada trecho está explicado na entrega (G3.2).

### Checklist da seção 12 do padrão técnico

- A tarefa faz o que o plano pede, nem mais nem menos: sim. As decisões do engenheiro fora do texto do plano
  (divisória da `Tabela` em `linha`, `Esqueleto` em `linha`, véu `tinta/50`) ficam dentro dos arquivos da tarefa e
  estão justificadas. `package.json` e `pnpm-lock.yaml` sem diff.
- Teste para cada comportamento novo, que falharia sem o código: sim (variantes e `aria-disabled` do `Botao`, `Cartao`,
  `GrupoOpcoes` cartão, `data-cor` e pares do `Selo`, `Alerta`, `classeDoCampo`, `--cor-foco`, contraste e paleta). O
  CA-01.1 e o CA-01.2 já passavam no código de antes (são vigias de regressão); o "visto falhando" deles são os casos
  plantados, como no CV-02 da T01. Aceito.
- Segredo, `.env` ou dado pessoal: nenhum; o único dado de teste novo é "Indisponível (fictício).".
- Entrada externa com Zod: não se aplica (nenhuma entrada nova).
- Banco: não se aplica. G4 (CV-01) vazio, inclusive `src/modules` inteiro; nenhum `'use server'` novo ou alterado.
- Duplicação: nenhuma; `Cartao` é novo e não havia equivalente.
- Textos em pt-BR e axe: nenhum texto de interface mudou. O `pnpm test:e2e` (com a `axe-todas` nas 12 telas) não está
  na minha lista Pode; vale o resultado da entrega do engenheiro (154 de 154), que a `06-T03-testes` pode repetir.
- Minor em Pendências: sim, abaixo.
- `/code-review` e `/security-review` no PR: não se aplica à revisão de tarefa (fica com a 08).

### Pareceres

1. **Minor** — `src/components/GrupoOpcoes.tsx:33` e `:63`. Problema: na variante `cartao`, a opção indisponível
   continua com `cursor-pointer` no rótulo esticado ao cartão inteiro e o cartão não muda de aparência (só o texto do
   rótulo vai a `text-texto-suave`; borda e fundo são os da opção disponível). Razão: o cartão inteiro anuncia clique
   que o `impedir` bloqueia, e a indisponibilidade fica pouco visível num alvo grande. Não bloqueia porque o cartão
   ainda não é usado em tela (entra na T13); a T13 confere contra a 03, 2.6 e tira o `cursor-pointer` quando
   `o.desabilitada`.
2. **Minor** — `src/components/GrupoOpcoes.tsx:63` e `:83`, e `Dica` e `MensagemDeErro` em
   `src/components/CampoTexto.tsx`. Problema: código tocado nesta tarefa ainda usa os nomes da 0.1.13
   (`text-texto-suave`, `text-perigo`), contra o G3.5. Razão para aceitar agora: pelo D-01 o apelido dá exatamente
   `tinta-media` e `erro`, e trocar exigiria mexer em cinco arquivos de teste fora do G5 sem mudar nada na tela. Fica
   para a T16, com a lista do desvio 1 da entrega.
3. **Minor** — `src/components/Botao.tsx:13`. Problema: o visual de `aria-disabled:` está na base e vale para as seis
   variantes, mas só o `primario` foi coberto por teste. Razão: nas variantes `link`, `sobre-escuro` e
   `claro-sobre-escuro` o resultado (fundo cinza e borda tracejada sobre o marinho ou num link) não foi visto em tela.
   A primeira tarefa que usar `aria-disabled` numa dessas variantes (T05 ou T12) confere o resultado contra a 03, 2.6.

## Decisões tomadas

- Status `pronto`: só há Minor, e pela seção 12 só Critical e Important bloqueiam a passagem.
- Mudança em teste fora do G5 aceita: é troca de seletor de classe trecho a trecho, sem asserção a menos, como o G3.2
  permite com explicação na entrega.
- Desvio 1 (nomes antigos em `Dica`, `MensagemDeErro`, `AreaTexto`, `ListaTextos` e `GrupoOpcoes`) aceito até a T16:
  a cor na tela é a da 03, e a troca junto com os seletores dos testes é mais segura numa tarefa só.
- `pnpm test:e2e` não rodado nesta revisão: está fora da minha lista Pode; a `06-T03-testes` é a etapa que confirma.

## Pendências

- T13 (`engenheiro-frontend`): parecer 1, cartão indisponível sem `cursor-pointer` e com aparência de indisponível,
  conferido contra a 03, 2.6.
- T16 (`engenheiro-frontend`): parecer 2, trocar `text-texto-suave` e `text-perigo` em `CampoTexto` (`Dica`,
  `MensagemDeErro`), `AreaTexto`, `ListaTextos` e `GrupoOpcoes`, junto com os seletores de `lista-textos.test.ts`,
  `componentes-qa.test.ts`, `detalhe.test.ts`, `pagina.test.ts` e `detalhe-qa.test.ts`.
- T05 ou T12 (`engenheiro-frontend`): parecer 3, conferir o `aria-disabled` na variante que usar primeiro fora do
  `primario`.
- `07-qa-funcional`: o cartão do `GrupoOpcoes` (foco, clique no cartão inteiro, opção indisponível) só pode ser visto
  à mão depois da T13, como a entrega do engenheiro já registrou.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -8` — topo d0f82cf; código da T03 em d452a76
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat d452a76~1 d452a76` — 25 arquivos, nenhum fora da tarefa além dos dois testes explicados
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff d452a76~1 d452a76 -- src/app/globals.css src/components` — lido por inteiro
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff d452a76~1 d452a76 -- test src/app/(painel)` — não rodou (erro de sintaxe do shell nos parênteses sem aspas); repetido com aspas no item seguinte
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff d452a76~1 d452a76 -- test "src/app/(painel)"` — lido por inteiro
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 198e97d --stat -- src/proxy.ts src/proxy.test.ts next.config.ts src/app/api src/db drizzle src/modules src/worker src/jobs src/agents src/lib/auth.ts src/lib/auth-cliente.ts src/lib/qr.ts src/lib/log.ts src/lib/erros.ts src/instrumentation.ts pnpm-workspace.yaml "src/app/(painel)/configuracao/agentes/acoes.ts" "src/app/(painel)/demandas/[id]/acoes.ts" "src/app/(painel)/demandas/[id]/editar/acoes.ts" "src/app/(painel)/demandas/[id]/especificacoes/nova/acoes.ts" "src/app/(painel)/demandas/[id]/pacotes-decisao/novo/acoes.ts" "src/app/(painel)/demandas/[id]/pareceres-risco/novo/acoes.ts" "src/app/(painel)/demandas/nova/acoes.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes.ts"` — vazio (G4, CV-01)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — 211 arquivos, 4707 de 4707
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
