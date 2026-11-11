---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T15-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12), 05-tech-lead.md, docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md (G1 a G7, T14, T15, T16), 03-ux-ui-design.md (2.1 a 2.6, 8.1, 8.2), 06-T14-tech-lead.md, 06-T15-engenheiro-frontend.md, commit d53dc1f (git show, código da T15), commit f68c930 (git show --stat), src/components/Cartao.tsx, e2e/reflow.spec.ts, src/app/(painel)/demandas/[id]/especificacoes/nova/page.tsx (molde da T14)]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T15 (T09, T10 e T12 com cartões e tokens; RF-14, CA-14.1, CA-14.2), código no commit d53dc1f e entrega
ajustada em f68c930. **Aprovada.** Nenhum Critical nem Important. Três Minor, em Pendências; nenhum bloqueia.

### Checklist da seção 12 do padrão técnico

| Item | Resultado |
|---|---|
| Faz o que o plano pede, nem mais nem menos; só arquivos da tarefa | Sim. As páginas e os formulários de `pacotes-decisao/novo/`, das duas T10 e de `configuracao/agentes/` estão na lista da T15, assim como `e2e/reflow.spec.ts`. O diff de `src/` tem só `Cartao`, classe e comentário. Nenhum campo, ordem, texto, validação, diálogo, condição, leitura nem chamada mudou: conferi linha a linha no `git show d53dc1f`. Os três desvios declarados ficam aceitos (ver Pareceres) |
| Teste para cada comportamento novo, que falharia sem o código | Sim. O `reflow.spec.ts` foi visto falhando (3 de 3 novos). Ele confere: nada fora de cartão; o número exato de `section.rounded-cartao` (5, 7, 7 e 2); o formulário da T09 com até 760 px em 1280 px; nenhuma rolagem lateral em 390 e 320 px. Sem a T15, a T10 e a T12 têm 0 cartões e reprovam por construção. O caso novo do `Interruptor` em `componentes.test.ts` veio antes do código e foi visto falhando (1 de 38). Isso atende à Minor 1 da revisão da T14 |
| Sem segredo, `.env` ou dado pessoal real | Sim. O spec usa as contas fictícias do seed e a demanda `etapasDupla`, só para leitura. O caso de unidade usa "Agente (fictício)" |
| Entrada externa com Zod; erro sem detalhe | Não se aplica: nenhuma rota, Server Action nem validação mudou |
| Banco: migration, migrator, RLS | Não se aplica: nada de banco. O CV-01 (G4) saiu vazio. Em `src/modules` só aparecem `resumo-da-fila.ts` e o teste dele (T07). `package.json` só tem as duas linhas `@fontsource` (T02) |
| Nada duplica função que já existe | Sim. Usa o `Cartao` da T03 (`rotuloPor` e `className` já existiam) e os auxiliares `abrir`, `semRolagemLateral` e `camposEmCartoes` da T14. O `secoesEmCartoes` novo cobre o que o `camposEmCartoes` não alcança: telas sem `form`, com `h2`, `dl` e `table` |
| Textos em pt-BR; axe sem violação nas telas tocadas | Sim. Nenhum texto mudou. O axe roda nas quatro telas em 390 e em 1280 px no `reflow.spec.ts`. A T12 com agente ligado é coberta pelo `agentes-teto.spec.ts`. A entrega declara 235 de 235 na suíte e2e. Eu não rodo e2e: isso fica com a `06-T15-testes` |
| Minor em Pendências; só Critical e Important bloqueiam | Sim |
| No PR: `/code-review` e `/security-review` | Fica com a `08-revisao`, pela G2 |

Eu mesmo conferi:

- `pnpm lint` e `pnpm typecheck` limpos;
- `pnpm test` com 5202 testes, 0 falhas e 0 erros;
- árvore limpa.

### Pareceres

Nenhum problema Critical ou Important. Conferi cada desvio declarado na entrega e decidi:

- **`src/components/Interruptor.tsx:32-34` (trilho `acao`/`tinta-suave`, botão branco nos dois estados): aceito.**
  - O arquivo não está na lista da T15, mas o plano pede o trilho, e o 03 (8.2) também. O trilho só existe no componente.
  - O `git log -G "Interruptor"` mostra que o único consumidor em `src/app/` é o `TabelaAgentes.tsx` da T12, então a
    troca não chega a outra tela.
  - O botão branco quando desligado é necessário. Sobre o trilho cheio em `tinta-suave`, a borda `tinta-suave` de antes
    teria 1:1. Com o branco, os pares ficam assim, todos ≥ 3:1 (WCAG 1.4.11; tabela 2.2 da 03):
    - botão branco contra o trilho: 4,5:1 em `tinta-suave` e 5,0:1 em `acao`;
    - trilho contra o cartão branco: 4,5:1 em `tinta-suave`.
  - O texto "Ligado"/"Desligado" ao lado não mudou: o estado não depende da cor.
- **`src/components/componentes.test.ts:251-264` (caso novo no `describe('Interruptor …')`): aceito.**
  - Acompanha a mudança acima.
  - É só acréscimo: nenhuma asserção antiga mudou (G3.2).
- **`src/app/(painel)/configuracao/agentes/AvisoDaTela.tsx:23` (`gap-8` → `gap-5`): aceito.**
  - É classe, no invólucro que separa os dois cartões da T12 e o rodapé do expurgo.
  - A 03 (2.4) pede 20 px entre blocos.
  - O arquivo é cliente, não `'use server'`, e fica fora da G4.
- **`especificacoes/[espId]/page.tsx:29` e `pareceres-risco/[rskId]/page.tsx:29` (`text-primaria` → `text-acao-escura`),
  e `configuracao/agentes/page.tsx:110` (`text-texto-suave` → `text-tinta-media`): aceito.**
  - É o mapa da 03 (2.1), com a mesma cor: os dois apelidos já apontavam para esses tokens (D-01).
  - Adianta a T16 só nas linhas tocadas.
- **`configuracao/agentes/page.tsx:36-45` (`Secao` vira o próprio `Cartao`) e as seções das duas T10 (`:81-103`): aceito.**
  - Mantêm `aria-labelledby`, `h2` e `dl` sem `section` dentro de `section`, como o `CamposDaDemanda` da T14.
  - As regex de HTML dos quatro `pagina.test.ts` passam sem mudança (CA-14.1).
- **`demandas/[id]/pacotes-decisao/novo/page.tsx:39` (`max-w-190` com `gap-6` no contêiner da página): aceito.**
  - É o mesmo molde da T14 (`especificacoes/nova/page.tsx` tem `flex max-w-190 flex-col gap-6`).
  - O `gap-5` dos 20 px entre blocos está no `form` (`FormularioPacote.tsx:112`), onde estão os cartões.
  - O desvio 3 da entrega ("`gap-6` e `gap-8` viraram `gap-5` nas três telas") vale para os contêineres da T10 e da T12
    e para o `form` da T09, não para o contêiner da página T09. Isso é só redação: o código segue o molde.
- **`demandas/[id]/pacotes-decisao/novo/FormularioPacote.tsx:112-136` (5 cartões): aceito.**
  - Os campos soltos e os `fieldset` ficaram cada um num `Cartao` sem rótulo, como os campos soltos da T14.
  - `section` sem nome acessível não vira região, e o axe passa.
  - O `GrupoOpcoes` continua com a mesma legenda, os mesmos `erro`, `valor` e `onMudar`.

## Decisões tomadas

- T15 aprovada sem devolução: o checklist da seção 12 está cumprido e não há Critical nem Important.
- `Interruptor.tsx` e `componentes.test.ts` fora da lista ficam aceitos. O plano e a 03 (8.2) pedem o trilho, que só
  existe no componente, e o único consumidor dele é a T12.
- O botão branco no estado desligado fica aceito. É a única forma de o botão manter ≥ 3:1 sobre o trilho
  `tinta-suave` que a 03 pede.
- A falha vista só no passo da T09 é suficiente como prova vermelha da T10 e da T12. O mesmo teste conta
  `section.rounded-cartao`, que era 0 nessas telas antes do código.

## Pendências

- **Minor 1 (T16, não bloqueia):**
  - Os `h2` das seções da T10 (`especificacoes/[espId]/page.tsx:82`, `pareceres-risco/[rskId]/page.tsx:82`) e da T12
    (`configuracao/agentes/page.tsx:39`) seguem com `text-xl font-semibold` (20 px/600). A 03 (2.3) pede 18 px/700/1,3.
  - Não é regressão da T15: as classes são de antes.
  - A T16 do plano trata nomes de token, axe e alvo de toque, e não cita tipografia. Por isso, o maestro deve passar
    este item no prompt da T16, junto com os outros `h2` do painel. Se a T16 não o fizer, a `08-revisao` o confere.
- **Minor 2 (teste, não bloqueia):**
  - Em `e2e/reflow.spec.ts`, o `secoesEmCartoes` usa `e.closest('.rounded-cartao')`.
  - Como o `<dialog>` da T12 também tem `rounded-cartao`, os campos do diálogo passam pelo próprio diálogo. A asserção
    não prova que ele está dentro do cartão "Agentes".
  - Hoje está certo: a entrega e o código põem o diálogo dentro da seção.
  - Se a T16 mexer nesse arquivo, trocar para `closest('section.rounded-cartao')`. Não precisa de passagem própria.
- **Minor 3 (`07-qa-funcional`, à mão):** repete a pendência da entrega. Na T12, conferir:
  - o interruptor ligado (trilho `acao`);
  - o interruptor desabilitado na conta administradora (`opacity-70`);
  - o foco no interruptor dentro do cartão, depois de ligar e de desligar.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat d53dc1f f68c930` — 9 arquivos de código e teste em d53dc1f; f68c930 só com a entrega e o registro do maestro
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show d53dc1f -- src e2e` — só `Cartao`, classes e comentários; 3 testes e2e e 1 caso de unidade novos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show f68c930:src/components/Cartao.tsx` — `section` com `aria-labelledby` por `rotuloPor` e `className`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 198e97d f68c930 -- src/proxy.ts src/proxy.test.ts next.config.ts src/app/api src/db drizzle src/modules/acesso src/worker src/jobs src/agents src/lib/auth.ts src/lib/auth-cliente.ts src/lib/qr.ts src/lib/log.ts src/lib/erros.ts src/instrumentation.ts pnpm-workspace.yaml "src/app/(painel)/configuracao/agentes/acoes.ts" "src/app/(painel)/demandas/[id]/acoes.ts" "src/app/(painel)/demandas/[id]/editar/acoes.ts" "src/app/(painel)/demandas/[id]/especificacoes/nova/acoes.ts" "src/app/(painel)/demandas/[id]/pacotes-decisao/novo/acoes.ts" "src/app/(painel)/demandas/[id]/pareceres-risco/novo/acoes.ts" "src/app/(painel)/demandas/nova/acoes.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes.ts"` — vazio (CV-01)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261110-0015-v1`, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 198e97d f68c930 --stat -- src/modules package.json` — só `resumo-da-fila.ts` e o teste dele, e 2 linhas em `package.json` (T02)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show f68c930:e2e/reflow.spec.ts` — arquivo inteiro, auxiliares da T14 reaproveitados
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G "Interruptor" --name-only --format= -- src` — único consumidor em `src/app/`: `TabelaAgentes.tsx` (T12)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent --reporter=junit --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/0a919744-0e04-42d0-bf4b-e75d6acefb82/scratchpad/t15-revisao-suite.xml` — 5202 testes, 0 falhas, 0 erros
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show "f68c930:src/app/(painel)/demandas/[id]/especificacoes/nova/page.tsx"` — molde da T14: `max-w-190` com `gap-6` no contêiner

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
