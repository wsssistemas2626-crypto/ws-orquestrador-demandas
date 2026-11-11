---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T14-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12), tarefas.json, 05-tech-lead.md, docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md (G1 a G6, T14, T16), 03-ux-ui-design.md (2.1, 2.2, 2.4, 8.1, 8.2), 06-T14-engenheiro-frontend.md, commit 9278fd2 (git show), src/components/Cartao.tsx, src/components/CamposDaDemanda.tsx, src/app/(painel)/demandas/nova/FormularioNovaDemanda.tsx, src/app/(painel)/demandas/[id]/especificacoes/nova/FormularioEspecificacao.tsx, src/app/(painel)/demandas/[id]/especificacoes/nova/page.tsx, src/app/(painel)/demandas/[id]/pareceres-risco/novo/FormularioParecer.tsx, src/app/(painel)/demandas/[id]/pareceres-risco/novo/page.tsx, e2e/nova-demanda.spec.ts (teste da linha 171)]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T14 (T04, T06, T07 e T08 com cartões e tokens; RF-14, CA-14.1, CA-14.2), commit 9278fd2. **Aprovada.**
Nenhum Critical nem Important. Três Minor, em Pendências; nenhum bloqueia.

### Checklist da seção 12 do padrão técnico

| Item | Resultado |
|---|---|
| Faz o que o plano pede, nem mais nem menos; só arquivos da tarefa | Sim. Os 10 arquivos de `src/` são as páginas e os formulários das quatro telas e `CamposDaDemanda.tsx`, todos listados na T14; `e2e/reflow.spec.ts` é o arquivo a criar. O diff é só `Cartao`, classe e comentário: nenhum campo, ordem, texto, validação, diálogo, condição ou chamada mudou (conferido linha a linha no `git show`). `Secao` de `CamposDaDemanda` só é importada por `FormularioNovaDemanda.tsx` (conferido no `git log -G`), então a troca não alcança tela de outra tarefa |
| Teste para cada comportamento novo, que falharia sem o código | Sim. `reflow.spec.ts` foi visto falhando (3 de 3, "fora de cartão" com a lista dos campos soltos); confere zero campo fora de cartão, o número exato de cartões por tela (5, 4, 7, 7) e o formulário com até 760 px em 1280 px, o que sem `max-w-190` não passa. O caso novo de `formularios.test.ts` veio depois do código (Minor 1), mas reprova sem a T14: a regex exige `class="rounded-cartao` na `section` e um `section` em volta do fieldset do modo, e nenhum dos dois existia |
| Sem segredo, `.env` ou dado pessoal real | Sim. O spec usa as contas fictícias do seed e a demanda `espListaDeTextos`, só para leitura |
| Entrada externa com Zod; erro sem detalhe | Não se aplica: nenhuma rota, Server Action nem validação mudou |
| Banco: migration, migrator, RLS | Não se aplica: nada de banco. CV-01 (G4) vazio; `src/modules` só com `resumo-da-fila.ts` e o teste dele (T07); `package.json` só com as duas linhas `@fontsource` (T02) |
| Nada duplica função que já existe | Sim. Usa o `Cartao` da T03 (com `rotuloPor` e `className`, que já existiam) em vez de criar outro invólucro |
| Textos em pt-BR; axe sem violação nas telas tocadas | Sim. Nenhum texto mudou. Axe nas quatro telas em 390 px no `reflow.spec.ts` e, pelos e2e de cada tela, em 1280 px e 320 px; suíte e2e inteira 231 de 231 na entrega (eu não rodo e2e: fica com a `06-T14-testes`) |
| Minor em Pendências; só Critical e Important bloqueiam | Sim |
| No PR: `/code-review` e `/security-review` | Fica com a `08-revisao`, pela G2 |

### Pareceres

Nenhum problema Critical ou Important. Os desvios que a entrega declara foram conferidos e ficam aceitos:

- `src/app/(painel)/demandas/nova/FormularioNovaDemanda.tsx:128`, `FormularioEditarDemanda.tsx:81`,
  `FormularioEspecificacao.tsx:164`, `FormularioParecer.tsx:137` (`gap-8` → `gap-5`): aceito. É classe, cabe no "só
  classes" da T14, e a 03 (2.4) pede 20 px entre blocos; o valor de antes era o da 0.1.13. Não foi mudança feita só para
  calar o axe: ela é a que a 03 pede, e a regra do axe e o teste ficaram iguais.
- `FormularioEspecificacao.tsx:184-185` e `FormularioParecer.tsx:138,152-154` (campo solto com `Cartao` próprio):
  aceito. O molde 8.2 põe cada bloco do formulário num cartão; campo solto entre cartões ficaria fora do molde.
- `src/components/CamposDaDemanda.tsx:132` (borda do fieldset "Anexo N" em `linha`, não `tinta-suave`): aceito. A 03
  (2.1) reserva `tinta-suave` para borda de campo e de controle, e a 2.2 só proíbe `linha` como única fronteira de um
  **controle**; o fieldset é agrupamento com `legend`, e cada campo dentro dele mantém a sua borda.
- `src/components/CamposDaDemanda.tsx:33-43` (`Secao` vira o próprio `Cartao`): aceito. Evita `section` dentro de
  `section`, mantém `aria-labelledby` e `h2`, e as regex de HTML de hoje passam sem mudança (CA-14.1).
- Tokens antigos de `ListaTextos`, `CampoTexto` e `GrupoOpcoes` mantidos: aceito. São componentes comuns a outras telas;
  a troca e o teste estático `classes-antigas.test.ts` são da T16 (D-01).

### Decisão sobre a pendência do axe `target-size` sob a barra fixa: fica para a T16

**Decisão:** não bloqueia a T14 e passa à T16, como Minor (Minor 3 em Pendências).

**Razão:**

- Hoje não há falha: a suíte e2e inteira deu 231 de 231 na entrega.
- A causa não é da T14. Depois de `setViewportSize`, a ancoragem de rolagem do Chromium deixa um campo sob a barra fixa
  de 56 px da casca (T05). O resultado do axe passa a depender da posição de rolagem em que o teste está, e não da tela.
- A T16 é a dona do assunto:
  - cria o `semViolacoesNasDuasLarguras`, que troca a largura em todo estado da `axe-todas` (D-06) e é onde o efeito
    vai aparecer em massa;
  - cuida do alvo de toque (RNF-03) e do zero violação nas duas larguras (RNF-13).
- Corrigir agora na T14 seria mexer em `e2e/apoio.ts`, que é arquivo da T16.

**Caminho para a T16:** entra no Passo 1 da T16, antes do código.

1. Em `semViolacoesNasDuasLarguras`, depois de cada `setViewportSize`, levar a página a uma posição de rolagem
   determinada antes do axe: `window.scrollTo(0, 0)`, ou rolar até o elemento focado com `block: 'center'` quando
   houver foco fora do `body`. Escrever o motivo num comentário que cite esta revisão.
2. Se o `nova-demanda.spec.ts:171` voltar a falhar, ele recebe o mesmo passo depois do `setViewportSize(320 × 640)`.
   Isso conta como passo de interação equivalente (G3.2) e vai explicado na entrega, trecho a trecho. Nenhuma asserção
   sai.
3. Não vale:
   - desligar ou filtrar a regra `target-size`;
   - excluir o `header` da casca do axe;
   - mudar espaçamento ou layout de tela só para tirar o campo de baixo da barra.
4. Se a violação continuar com a página no topo, ela é real. Corrige-se na tela, pela 03 (2.4: alvo de 44 × 44 px e
   `scroll-padding-top` de 64 px abaixo de 768 px).

## Decisões tomadas

- T14 aprovada sem devolução: o checklist da seção 12 está cumprido e não há Critical nem Important.
- O `target-size` sob a barra fixa fica com a T16: hoje não falha, a causa é a troca de largura com a casca da T05, e o
  remédio está no `e2e/apoio.ts` da T16.
- O caso de `formularios.test.ts` escrito depois do código fica como Minor, sem refazer: ele cobre o único cartão que o
  e2e não alcança (agente ligado), e a regex reprova o código de antes.
- A borda `linha` no fieldset "Anexo N" fica aceita: é agrupamento, não controle, e cumpre a 2.1 e a 2.2 da 03.
- Volta 2: o maestro liberou o `git log -G` que conferia quais formulários renderizam `CamposDaDemanda` (o `<` do
  argumento conta como redirecionamento). Por instrução dele, o comando saiu de Comandos executados. O parecer não mudou.

## Pendências

- **Minor 1 (T14, não bloqueia):** o caso "T14: o grupo 'Como criar a demanda?' e as seções ficam em cartões" de
  `src/app/(painel)/demandas/nova/formularios.test.ts:123` foi escrito depois do código, sem saída vermelha guardada
  (desvio 1 da entrega). A revisão conferiu que a regex reprova o HTML de antes. Nas próximas tarefas, até o caso
  complementar entra antes do código.
- **Minor 2 (`07-qa-funcional`, à mão):** o cartão do grupo "Como criar a demanda?" com o agente orquestrador ligado. O
  e2e sobe com os agentes desligados, e só o teste de HTML cobre esse cartão. Este item repete a pendência da entrega.
- **Minor 3 (T16, não bloqueia):** axe `target-size` sob a barra fixa de 56 px depois de `setViewportSize`. O caminho
  está na Entrega, em "Decisão sobre a pendência do axe `target-size`".

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 9278fd2` — 13 arquivos: 10 de `src/`, 1 spec novo, a entrega e o registro do maestro
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 9278fd2 -- src e2e` — só `Cartao`, classes e comentários; spec novo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 198e97d -- src/proxy.ts src/proxy.test.ts next.config.ts src/app/api src/db drizzle src/modules/acesso src/worker src/jobs src/agents src/lib/auth.ts src/lib/auth-cliente.ts src/lib/qr.ts src/lib/log.ts src/lib/erros.ts src/instrumentation.ts pnpm-workspace.yaml "src/app/(painel)/configuracao/agentes/acoes.ts" "src/app/(painel)/demandas/[id]/acoes.ts" "src/app/(painel)/demandas/[id]/editar/acoes.ts" "src/app/(painel)/demandas/[id]/especificacoes/nova/acoes.ts" "src/app/(painel)/demandas/[id]/pacotes-decisao/novo/acoes.ts" "src/app/(painel)/demandas/[id]/pareceres-risco/novo/acoes.ts" "src/app/(painel)/demandas/nova/acoes.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes.ts"` — vazio (CV-01)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 198e97d --stat -- src/modules package.json` — só `resumo-da-fila.ts` e o teste dele, e 2 linhas em `package.json` (T02)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G "Secao.*CamposDaDemanda" --name-only --format= -- src` — só `FormularioNovaDemanda.tsx`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G "import .*CamposDaDemanda" --name-only --format= -- src` — 7 formulários importam o arquivo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 9278fd2:docs/construcao/DEC-DEM-20261110-0015-v1/03-ux-ui-design.md --stat` — saída longa, sem uso; a 03 foi lida pelo Read
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent --reporter=junit --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/0a919744-0e04-42d0-bf4b-e75d6acefb82/scratchpad/t14-revisao-suite.xml` — 5201 testes, 0 falhas, 0 erros

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
