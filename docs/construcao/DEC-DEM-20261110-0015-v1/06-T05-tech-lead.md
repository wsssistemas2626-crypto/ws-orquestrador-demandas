---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T05-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12), 05-tech-lead.md, docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md (cabeçalho, G1 a G7, T05), 06-T05-engenheiro-frontend.md, 03-ux-ui-design.md (seções 0, 2.6 e 3), commit 85ace62 (diff de src/, e2e/ e test/), src/components/Botao.tsx, src/components/marca/MarcaWs.tsx, e2e/apoio.ts (cabeçalho)]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T05 (casca do painel e gaveta), commit 85ace62. **Aprovada**, sem achado Critical nem Important. Os quatro
achados Minor ficam em Pendências e não bloqueiam a passagem.

### Conferência contra o plano (T05)

- **Arquivos:** os 9 criados e os 4 alterados são os da lista da T05. Os três testes que já existiam
  (`componentes.test.ts`, `componentes-qa.test.ts:203` e `e2e/moldura.spec.ts:28`) são os da G5 para a T05, e mudaram
  só no seletor e na marcação:
  - a regex aceita o `<svg aria-hidden>` antes do texto e os três blocos da `MarcaWs`;
  - o `exact: true` no "Menu" foi preciso por causa do "Fechar menu".

  Nenhuma asserção foi apagada. Entrou um teste novo no mesmo `describe`.
- **Comportamento (03, seção 3; ADR-15):**
  - O `header` é marinho, com `superficie-escura` e `sticky top-0`. A partir de 768 px tem `md:h-screen` e
    `overflow-y-auto`, com 216 px até 1199 px e 248 px a partir de 1200 px.
  - Itens de 44 px, com ícones `aria-hidden` e o atual com fundo, barra de 4 px e peso 700.
  - Conta em `text-sm` (14 px) e "Sair" `sobre-escuro`, com "Saindo…".
  - Abaixo de 768 px: barra de 56 px com "Menu" (`aria-expanded`, `aria-controls="gaveta-menu"`) e a marca compacta.
  - A gaveta é um `<dialog id="gaveta-menu" aria-label="Menu">` com `showModal()`, na ordem da 03, 3.3. O conteúdo só
    existe enquanto ela está aberta (D-09).
  - Foco: abre em "Fechar menu", e o Tab dá a volta por `proximoIndiceCircular`. Esc, véu, "Fechar menu" e o item da
    tela atual devolvem o foco a "Menu"; o item de outra tela deixa o foco com o `FocoNaTrocaDeTela`; a largura põe o
    foco no `main`.
  - A rolagem fica travada por `classList`, e a classe também sai quando a casca desmonta.
  - Bate com a 03, 3.1 a 3.4.
- **CV-01 (G4):** o `git diff 198e97d -- …` da G4 saiu vazio. Desde a base, `src/modules` não tem diff, e o
  `package.json` tem só as duas linhas da T02. Não há arquivo `'use server'` novo nem alterado.
- **CV-16:** a casca não lê sessão, cookie nem armazenamento. Ela não chama `fetch`, não importa leitura do servidor
  nem `autorizar`, e não tem saída por GET.
  - Nome e papel vêm do layout do servidor (`exigirPessoa`), por prop.
  - O `signOut` está só no `BotaoSair`, que é a função de hoje sem mudança.
  - O `test/estatico/casca.test.ts` prova cada regra com caso plantado. O e2e confere o POST para
    `/api/auth/sign-out` e o 401 do cookie antigo pelos dois caminhos (casca e gaveta).
- **CV-19:** a marca leva só à constante `DESTINO_DA_MARCA` (`/demandas`). Os itens têm só `href={l.href}` sobre os
  três `LINKS` de hoje, e o estático garante isso.
- **G3.4 e G3.5:** não há `style=`, hexadecimal fora do `@theme`, `url(` nem recurso externo. As cores do componente
  novo são todas da paleta da 03 (`marinho`, `marinho-luz`, `azul-claro`, `texto-claro`, `branco`).
- **Desvio 1 (`--breakpoint-xl: 75rem`):** está aceito.
  - Atende a G3.6 (`xl:` = 1200 px) e o ponto de quebra do computador da 03, seção 0, e fica no lugar único de token.
  - Conferi que nenhuma classe `xl:` existia em `src/` antes da T05 (`git log -S "xl:"` só acha o 85ace62). A troca
    do padrão de 1280 px para 1200 px não mexe em nenhuma tela já pronta.
- **Desvios 2 a 5:** também estão aceitos.
  - A gaveta como irmã do `header` evita o diálogo modal dentro da landmark e mantém o `^<header` do teste de hoje.
  - O item da tela atual navega, como o mesmo item do menu lateral: limpa o filtro da fila e devolve o foco a "Menu".
    Isso está documentado.
  - O foco vai ao `main` no fechamento por largura, como diz o plano, e a 03 não proíbe.
  - Os testes a mais reforçam a tarefa e não fogem do escopo.

### Checklist da seção 12 do padrão técnico

| Item | Resultado |
|---|---|
| Faz o que o plano pede, nem mais nem menos; nada fora da tarefa | Cumprido (ver acima; `git status --short` limpo depois do commit) |
| Teste para cada comportamento novo, que falharia sem o código | Cumprido. A unidade e o estático foram vistos em vermelho. Os e2e novos dependem de `dialog#gaveta-menu`, "Fechar menu", 248/216 px e `aria-controls="gaveta-menu"`, que não existiam (ver Minor 3) |
| Sem segredo, `.env` ou dado pessoal real | Cumprido: só `CONTAS_FICTICIAS` do seed e o título "(fictício)" |
| Entrada externa validada com Zod; erro sem detalhe | Não se aplica: a tarefa não cria entrada externa |
| Banco: migration, migrator, RLS | Não se aplica: sem banco |
| Nada duplica função existente | Cumprido: a regra de foco, os `LINKS` e o `ehPaginaAtual` saíram do `CabecalhoPainel` e não foram copiados. Sobra uma duplicação de classes de estilo (Minor 1) |
| Textos em pt-BR; axe sem violação nas telas tocadas | Cumprido: os textos são os da 03, 3.3. O axe passa na barra e na gaveta aberta em 390 px (`casca.spec`), na casca em 1280 px e na gaveta em 320 px (`moldura.spec`) |
| Minor em Pendências; só Critical e Important bloqueiam | Cumprido: 0 Critical, 0 Important e 4 Minor |
| No PR: `/code-review` e `/security-review` | É da `08-revisao`, fora desta etapa |

### Pareceres (todos Minor, sem bloqueio)

1. **`src/components/CabecalhoPainel.tsx:42`: estilo do `Botao` copiado no botão "Menu".**
   - Problema: o `<button>` "Menu" repete à mão as classes da variante `sobre-escuro` (`border border-azul-claro …
     text-branco hover:bg-marinho-luz`) e parte da `BASE` de `Botao.tsx:13`.
   - Razão: se a variante mudar (por exemplo, na T16), o "Menu" fica com outro visual que o "Sair" e o "Fechar menu" ao
     lado. O `<button>` cru se justifica pelo `ref`, mas a classe pode vir de `classeDoBotao('sobre-escuro')`,
     acrescida de `shrink-0 px-3`.
2. **`src/components/CabecalhoPainel.tsx:44`, `src/components/casca/GavetaMenu.tsx:126` e
   `src/components/casca/ItensDoMenu.tsx:13`: invólucro do ícone repetido.**
   - Problema: os ícones do "Menu" e do "Fechar menu" repetem os atributos do `svg` que o `Icone` de `ItensDoMenu`
     já encapsula (`viewBox`, `stroke`, `aria-hidden`, `focusable`).
   - Razão: três cópias do contrato do ícone decorativo (`aria-hidden="true"`, `focusable="false"`). Se uma cópia
     esquecer o `aria-hidden`, ela expõe o ícone ao leitor de tela. O teste de hoje pega isso só no HTML do
     `CabecalhoPainel`, e não na gaveta aberta. Exportar o `Icone` resolve.
3. **`e2e/casca.spec.ts`: os e2e não foram vistos falhando antes do código (G3.1).**
   - Problema: a entrega declara que o e2e foi escrito antes, mas rodou só depois.
   - Razão: o passo 2 da T05 pede `pnpm test:e2e` em vermelho. Não bloqueia: os testes novos de gaveta e de largura
     não passariam sem o código, porque não existia `dialog`, "Fechar menu", `aria-controls="gaveta-menu"` nem
     largura de 248/216 px. Os que passariam (CA-03.2, CA-03.4 e CA-03.5) protegem comportamento de hoje que a T05
     não podia quebrar, o que é o papel deles. Nas próximas tarefas do frontend, o vermelho do e2e deve aparecer na
     entrega.
4. **`src/components/casca/GavetaMenu.tsx:112`: o "item da tela atual" compara só o `pathname`.**
   - Problema: em `/demandas/<id>`, o item "Demandas" está com `aria-current`, mas é tratado como "outra tela". Ele
     navega para a fila, e o foco vai ao `h1`, não a "Menu".
   - Razão: é coerente com a 03, 3.1, porque houve navegação e o foco vai ao `h1` da tela nova. Fica registrado para a
     `07-qa-funcional` conferir que a leitura do item atual não confunde quem usa leitor de tela. Não muda código.

## Decisões tomadas

- Status `pronto`: zero Critical e zero Important. Os quatro Minor não mudam comportamento, segurança nem
  acessibilidade de hoje, e vão para Pendências pela regra da seção 12.
- O desvio do `--breakpoint-xl` foi aceito, com a prova de que não havia `xl:` em `src/` antes da T05. Assim, a troca
  de ponto não mexe em tela pronta.
- O e2e da T05 não foi rodado de novo nesta revisão: `pnpm test:e2e` não está na lista Pode do tech-lead, e a
  `06-T05-testes` (`qa-automacao`) roda a suíte.

## Pendências

- Minor 1 e Minor 2 (classes do `sobre-escuro` e invólucro do ícone): o `engenheiro-frontend` resolve na T16, que já
  revisa os componentes e remove os nomes antigos, ou numa tarefa que já toque esses arquivos. Não pede passagem
  própria.
- Minor 3: nas próximas tarefas com e2e novo (T09, T11, T12, T13, T16, T17), a entrega do `engenheiro-frontend` mostra
  o `pnpm test:e2e` em vermelho antes do código, como pede a G3.1.
- Minor 4 e o que a entrega já listou: ficam para a `07-qa-funcional` (leitor de tela na gaveta, foco branco sobre
  marinho, reflow em 320 px, zoom de 200 % e 400 %, e o item "Demandas" com `aria-current` numa tela de demanda). O UAT
  do `<dialog>` no Safari do iOS fica com Fabiano. O `AvisosDaMoldura` com `max-w-6xl` e `text-atencao-texto` fica
  para a T16.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -8` — topo 85ace62 (06-T05-construcao)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 85ace62~1 85ace62` — 18 arquivos, todos da T05 ou da pasta do pedido
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 85ace62~1 85ace62 -- src` — lido por inteiro
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 85ace62~1 85ace62 -- e2e test` — lido por inteiro
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 198e97d -- src/proxy.ts src/proxy.test.ts next.config.ts src/app/api src/db drizzle src/modules/acesso src/worker src/jobs src/agents src/lib/auth.ts src/lib/auth-cliente.ts src/lib/qr.ts src/lib/log.ts src/lib/erros.ts src/instrumentation.ts pnpm-workspace.yaml "src/app/(painel)/configuracao/agentes/acoes.ts" "src/app/(painel)/demandas/[id]/acoes.ts" "src/app/(painel)/demandas/[id]/editar/acoes.ts" "src/app/(painel)/demandas/[id]/especificacoes/nova/acoes.ts" "src/app/(painel)/demandas/[id]/pacotes-decisao/novo/acoes.ts" "src/app/(painel)/demandas/[id]/pareceres-risco/novo/acoes.ts" "src/app/(painel)/demandas/nova/acoes.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes.ts"` — vazio (CV-01)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 198e97d --stat -- src/modules package.json` — só `package.json` com 2 linhas (T02); `src/modules` sem diff
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S "xl:" --oneline -- src` — só 85ace62
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — 216 arquivos, 4795 de 4795

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
