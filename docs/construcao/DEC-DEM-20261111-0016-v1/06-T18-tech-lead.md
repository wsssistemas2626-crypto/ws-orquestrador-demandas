---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T18-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12), docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (G1 a G5, D-17, T17 e T18), 03-ux-ui-design.md (5.4, estados 3 a 5), 06-T18-engenheiro-frontend.md, 06-T17-tech-lead.md, commit 0632f78 (diff inteiro de src/ e e2e/ contra 0632f78~1), src/app/(painel)/demandas/[id]/page.tsx (linhas 100 a 196 e 395 a 544), src/app/(painel)/demandas/[id]/detalhe.test.ts (linhas 615 a 644), src/app/(painel)/demandas/[id]/CartaoProximaAcao.tsx, src/app/(painel)/demandas/[id]/MudarStatus.tsx (função MudarStatus), src/components/Cartao.tsx, src/components/Botao.tsx (função Botao), src/components/dados-da-confirmacao.ts, src/components/formulario.ts (linhas 1 a 60), saída do pnpm test]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T18 (detalhe da demanda do Awave: "Origem" nos Dados, selo "Aguardando confirmação", seção "Confirmação do
Awave" com o botão "Confirmar demanda", linha 14 da Próxima ação e o caso IN-07). Commit da construção `0632f78`
(0632f78b3c5b9388d935d33b6e8a0d790d81f495), sobre `fbe3de3`.

**Resultado: aprovada. Nenhum problema Critical ou Important.** Os três pontos Minor estão em Pendências.

### Decisão sobre os pontos que o maestro pediu

| Ponto | Decisão | Razão |
|---|---|---|
| `src/app/(painel)/demandas/[id]/detalhe.test.ts:638`, fora da G5: `'Origem'` entra na lista exata de `dt` | **Aceito** | O G3.2 do plano admite mudança fora da G5 quando ela vem explicada na entrega, e a revisão decide. A mudança só acrescenta um termo a uma lista exata. Nenhuma asserção sai, e a lista fica mais estrita, porque agora também confere a posição de "Origem". O arquivo não está no piso do D-17. Sem essa linha o teste quebraria por um comportamento que o próprio plano manda criar ("Origem" antes de "Criada por", T18 passo 3; 03, 5.1 item 1). A falha é do plano: a G5 devia listar esse arquivo, e o erro é meu (05-plano). |
| Desvio 1: `CartaoProximaAcao.tsx` não mudou | **Aceito** | `CartaoProximaAcao.tsx:18` já resolve `ID_SECAO[link.destino.secao]`, e a T17 já pôs a chave `confirmacao` em `ID_SECAO`. A mudança do plano não teria efeito. O teste de página confere o `href="#confirmacao"` (`confirmar-demanda.test.ts:197`), e o e2e confere o clique com o foco no `h2`. |
| Desvio 2: `aria-busy` no `div` do conteúdo (`ConfirmarDemanda.tsx:97`), e não no `<section>` | **Aceito** | `Cartao.tsx:6` só aceita `id`, `rotuloPor`, `className` e `children`. Mudar um componente da 0.2.0 para isso sai da tarefa. O `div` envolve tudo o que muda durante o envio (os três parágrafos, o alerta e o botão), como o `MudarStatus` já faz no `form`. Só a `RegiaoAviso` fica de fora, e de propósito: assim o anúncio "Demanda confirmada." não espera o fim do `aria-busy`. Isso atende à intenção da 03 (5.4, estado 3). A conferência com leitor de tela já é da `07-qa-funcional` (G2). |
| Desvio 3: teste novo `confirmar-demanda.test.ts` | **Aceito** | É um arquivo novo, então nenhum teste que já existia mudou (IN-16 intacto). Ele cumpre o Minor 2 da 06-T17-revisao: selo, seção, "Nesta página" e Próxima ação conferidos juntos, no HTML da página, nos estados aguardando, confirmada, encerrada sem confirmação e com agente trabalhando. |
| Demais desvios (o componente recebe `SecaoDaConfirmacao`; asserções além do plano no e2e; controle do reenvio no IN-07; `useEffect` que devolve o foco) | **Aceitos** | A data é formatada no servidor, então o HTML do servidor e o da hidratação não divergem. O controle do IN-07 mostra que a recusa vem do Origin e não do reenvio. O foco segue o molde do `MudarStatus`. Todos aumentam a cobertura, sem afrouxar nada. |

### Conferência do código

| Ponto | Onde | Parecer |
|---|---|---|
| Um único estado alimenta o selo, a seção, "Nesta página" e a linha 14 | `page.tsx:411` a `:414` e `:422` | **Correto.** `aguardaConfirmacaoDoAwave: estado.tipo === 'aguardando'`, e a seção só aparece quando `secaoDaConfirmacao(estado)` não é `null`. Não há como a tela discordar de si mesma. |
| Seção depois de Dados, na coluna principal | `page.tsx:502` a `:506`; `Secao` em `:123` a `:125` | **Correto.** Sem `className`, a `Secao` usa `PRINCIPAL`. A `GRADE` com `repeat(6,auto)` cobre as seis seções possíveis da coluna principal, e o Histórico continua em `row-[2/-1]`. |
| P-01: sem diálogo; consequência acima do botão e ligada a ele | `ConfirmarDemanda.tsx:99` e `:109` | **Cumprido.** O `id` está no P2, e o botão leva `aria-describedby`. Os testes cobrem: ordem dos elementos, ausência de `<dialog>` e de "Cancelar", e o atributo no navegador. |
| A tela não diz que o agente foi acionado (parecer 3 da 06-T08) | `ConfirmarDemanda.tsx:78` a `:85` | **Cumprido.** Da resposta, só o `r.ok` é usado. Um teste barra `acionad`, `começou a` e `iniciad`. |
| Erro: prefixo de conflito e nenhum vazamento | `ConfirmarDemanda.tsx:85` a `:87`; `formulario.ts:34` a `:45` | **Correto.** `conflito` mostra "Não foi possível concluir: " seguido da mensagem fixa do servidor, e `erro_interno` sempre mostra `MENSAGEM_ERRO_INTERNO`. O `?? r.mensagem` só vale para um 400 com campos, que não acontece com `{ id }`. Nesse caso a mensagem é a fixa da 2.8. |
| C-18: nome da pessoa | `ConfirmarDemanda.tsx:40` a `:52` | **Correto.** O nome entra só como texto JSX. O `lastIndexOf` impede que um nome contendo a data desloque o `<time>`. Os dois casos têm teste. |
| IN-07 | `e2e/seguranca.spec.ts:251` a `:296` | **Correto e forte.** O ataque leva o id da demanda do Awave que está aguardando. Se o Origin passasse, a demanda seria confirmada e `confirmacoes(id)` daria 1, reprovando o teste. O controle (mesmo reenvio, Origin do painel) chega à ação e recebe o 409. |
| Dados fictícios | os três arquivos de teste | "Ana Ficticia", "Pessoa Ficticia", o prefixo `ficticio` e `atacante.test`. Nenhum token. |

### Checklist da seção 12 do padrão técnico

- **A tarefa faz o que o plano pede, sem mais nem menos:** cumprido. Os arquivos do plano entraram, menos o
  `CartaoProximaAcao.tsx` (desvio 1, aceito), mais o teste novo (desvio 3) e uma linha de `detalhe.test.ts` (aceita
  acima). O `git diff --stat` do commit mostra só esses arquivos, a entrega e o `passagens.jsonl`.
- **Teste para cada comportamento novo, visto falhando:** cumprido. A entrega traz o módulo inexistente, depois 13 de
  14 testes falhando com o componente vazio e 4 e2e falhando. O único que passava é guarda nomeada: o ator do histórico
  já existia desde a T02.
- **Sem segredo, `.env` ou dado pessoal real:** cumprido.
- **Zod e erro sem vazar detalhe:** a validação de `{ id }` é da Server Action da T08, já revisada. A tela só mostra
  mensagens fixas.
- **Banco:** não se aplica.
- **Duplicação:** um ponto Minor (Pendências, item 3).
- **Textos em pt-BR, os da 03:** cumprido. Os textos vêm de `TEXTOS_CONFIRMACAO`, que a T17 conferiu letra a letra.
- **axe sem violação nas telas tocadas:** fica pela evidência do engenheiro. Ele rodou `pnpm test:e2e` inteiro com 273
  testes, 264 passaram, 9 foram pulados (capturas) e a saída foi 0, com o axe nas duas larguras para aguardando,
  confirmada e encerrada sem confirmação. Não rodei de novo porque `pnpm test:e2e` está fora da minha lista Pode.
- **G4:** o diff das superfícies congeladas, com `src/lib/rota.ts`, de `a9fd9b8` a `0632f78`, saiu vazio. Não há
  arquivo `'use server'` novo. IN-16: nenhum arquivo do D-17 foi tocado.
- **Rodei de novo:** `pnpm test` passou com 287 de 287 arquivos e 6337 de 6337 testes. `pnpm typecheck` e `pnpm lint`
  saíram limpos.

## Decisões tomadas

- Aprovada sem devolução: não há Critical nem Important, e os três achados Minor não bloqueiam (seção 12).
- Aceita a linha 638 de `detalhe.test.ts` fora da G5: só acrescenta um termo, não remove asserção, está fora do D-17 e
  é consequência do comportamento que o plano pede. A omissão foi da G5.
- Aceito o `aria-busy` no conteúdo: mudar o `Cartao` sairia da tarefa, e o padrão `MudarStatus` já é esse.
- Aceito o `CartaoProximaAcao.tsx` sem mudança, porque a troca do plano não teria efeito.

## Pendências

- Nenhuma bloqueia a T18. Pontos Minor:
  1. `src/app/(painel)/demandas/[id]/page.tsx:194`. O comentário de `Dados` ainda diz "Os 12 itens", e agora são 13.
     Razão: o comentário contradiz o código logo abaixo. Ajuste de uma palavra, que pode ir na T20 ou na 08.
  2. `e2e/confirmacao-awave.spec.ts:48`. A tolerância da largura toda no celular desconta `2 * 24` px, que é o
     preenchimento a partir de 768 px. Em 390 px o `Cartao` usa `p-4` (16 px). Razão: a asserção aceita um botão até
     16 px mais estreito que o conteúdo do cartão. Ela ainda reprova sem `max-md:w-full`, mas fica mais frouxa do que
     precisa. Sugestão para a `06-T18-testes`: descontar `2 * 16` mais a borda.
  3. `e2e/seguranca.spec.ts:251` e `e2e/confirmacao-awave.spec.ts:66`. O teste "é Server Action" (`POST` com
     `next-action`) aparece escrito à mão nos dois arquivos novos e em três specs de QA (`parecer-risco-qa`,
     `especificacao-qa`, `demanda-formularios-qa`). Razão: são cinco cópias de uma regra que depende de um detalhe
     interno do Next. Sugestão para uma tarefa futura: um `ehServerAction` em `e2e/apoio.ts`.
- Para a `07-qa-funcional` (G2): conferir à mão a leitura do botão com a consequência, o anúncio "Demanda confirmada."
  e o foco no `h2`, já que o `aria-busy` está no conteúdo e não no `<section>`.
- Para a 08, registro do plano: a G5 devia listar `detalhe.test.ts` ("Origem" na lista exata de Dados, T18).
- Ferramentas: Grep e Glob não estavam disponíveis nesta sessão. Li com Read e localizei trechos com `git log -L` e
  `git log -S`.
- Comando com argumento fora da regra do maestro: o 4º item de "Comandos executados" (`git log -G`) leva `|` dentro da
  expressão do `-G`. É um `git log` só de leitura, da lista Pode, e não alterou nada. Mesmo assim fica fora da regra de
  argumentos do maestro. Eu o declaro aqui em vez de omiti-lo. Ele não influiu no parecer: a T18 foi localizada pelo
  `-L` do item seguinte.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 0632f78b3c5b9388d935d33b6e8a0d790d81f495~1 0632f78b3c5b9388d935d33b6e8a0d790d81f495` — 8 arquivos: 6 de `src/` e `e2e/`, a entrega e o `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 0632f78b3c5b9388d935d33b6e8a0d790d81f495~1 0632f78b3c5b9388d935d33b6e8a0d790d81f495 -- src e2e` — diff inteiro do código e dos testes, revisado (saída lida com Read)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -1 --format=%h -L "/^#.*T18/,+3:docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md"` — a T18 começa na linha 2408 do plano
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -1 --format=%h -G "^### Task 18|^### T18|^## T18|Tarefa 18" -- docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md` — 404105c (ver Pendências: `|` no argumento)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -1 --format=%h -L "/G5/,+14:docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md"` — G3.2 (mudança fora da G5 explicada, a revisão decide)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -1 --format=%h -L "/^. D-17/,+2:docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md"` — `detalhe.test.ts` não está no D-17
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — árvore limpa
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff a9fd9b8 0632f78b3c5b9388d935d33b6e8a0d790d81f495 -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/proxy.ts src/db/privilegios.ts next.config.ts src/lib/rota.ts "drizzle/000[0-6]_*.sql" "drizzle/meta/000[0-6]_snapshot.json"` — vazio (G4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -4` — 0632f78 é a T18, sobre fbe3de3
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -1 --format=%h -L "/^export function Botao/,+40:src/components/Botao.tsx"` — o `Botao` desabilita com `carregando` e repassa `aria-describedby`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -1 --format=%h -L "/function MudarStatus/,+80:src/app/(painel)/demandas/[id]/MudarStatus.tsx"` — molde: `aria-busy` no `form`, `RegiaoAviso` fora dele
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -1 --format=%h -L "/Confirmando/,+6:docs/construcao/DEC-DEM-20261111-0016-v1/03-ux-ui-design.md"` — 03, 5.4, estados 3 a 5
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --format=%h --name-only -S "next-action" -- e2e src test` — a regra "é Server Action" em 5 specs, sem ajudante em `apoio.ts`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 287 de 287 arquivos, 6337 de 6337 testes, código 0 (em segundo plano, saída lida com Read)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — a suíte não deixou arquivo alterado

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
