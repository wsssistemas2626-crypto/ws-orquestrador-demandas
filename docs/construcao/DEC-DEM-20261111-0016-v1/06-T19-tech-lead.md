---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T19-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12), 05-tech-lead.md, docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (fim da T17, T18, T19 e início da T20), 06-T19-engenheiro-frontend.md, o diff do commit d45c909 em src/ e e2e/, src/app/(painel)/pacotes-decisao/[decId]/page.tsx (linhas 55 a 189), src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts (linhas 1 a 135), src/modules/pedido-construcao/pendentes.ts]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T19 (commit `d45c9091c7c848852e987b5b6c42133fc8f07a7e`, engenheiro-frontend): "Recebido pelo /construir em …"
no cabeçalho da T11 e o texto novo da seção "Pedido de Construção" (RF-15: CA-15.1, CA-15.2, CA-15.4; RF-16: CA-16.3;
D-11). **Nenhum problema Critical ou Important. A passagem segue para a `06-T19-testes`.**

### O que o commit muda (conferido no diff)

| Arquivo | Conferência |
|---|---|
| `src/components/dados-da-decisao.ts` | `TEXTOS_DECISAO.recebido(data)` e `linhaDoRecebimento(Date \| null)` com a assinatura do G7: `null` sem recebimento, `{ texto, iso }` com a data por `formatarDataHora`. Sem texto de "aguardando" (CA-15.2) |
| `src/components/dados-do-pedido.ts` | `TEXTOS_PEDIDO.texto` igual, letra por letra, ao do teste do plano (CA-16.3) |
| `src/app/(painel)/pacotes-decisao/[decId]/page.tsx` | a leitura `recebimentoDoPedido((await obterDeps()).db, p.id)` vem depois de `autorizar(pessoa, 'ler_pacote_decisao')`, do pacote e da demanda (os `notFound` de hoje acontecem antes, sem ler o histórico). Nenhuma ação nova na matriz. A linha entra depois de "Repositório destino" e antes de "Cita:", em toda situação do DEC; visto SVG `aria-hidden` e `focusable="false"` em `text-positivo`, texto em `text-tinta`, data em `<time dateTime>` com o ISO |
| `src/components/recebimento.test.ts` (novo) | os 3 testes do plano, mais a virada do dia em UTC por igualdade exata |
| `pagina.test.ts` | dublê de `recebimentoDoPedido` (padrão `null` no `beforeEach`), a troca do texto na linha 599 e o `describe` T19 com 5 testes: ordem autorizar → pacote → leitura, ações autorizadas inalteradas, 404 sem ler, ausência da linha, HTML do `<p>`, toda situação do DEC e falha da leitura subindo para a tela de erro |
| `dados-do-pedido.test.ts`, `e2e/pedido-construcao.spec.ts` | só a string do texto trocada, mesma asserção |
| `e2e/recebido-construir.spec.ts` (novo) | o teste do plano (linha visível, `datetime` em `Z`, axe nas duas larguras) com asserções a mais de ordem, ícone, foco e texto da seção; um segundo teste em 390 × 844 sem rolagem lateral |

`src/modules`, `src/lib`, `src/db`, `drizzle/`, `src/proxy.ts` e `next.config.ts` não mudaram no commit, e o G4 contra
`a9fd9b8` saiu vazio.

### Desvios declarados pelo engenheiro

- **Desvio 1 (`pagina.test.ts` fora da G5): aceito.** A página passa a chamar `recebimentoDoPedido`; sem o dublê, o arquivo
  inteiro quebraria. O diff mostra só o `vi.mock`, o `mockResolvedValue(null)`, a troca da string na linha 599 e o
  `describe` novo. Nenhuma asserção saiu.
- **Desvio 2 (texto antigo em `dados-do-pedido.test.ts` e `e2e/pedido-construcao.spec.ts`): aceito.** A T19 manda trocar
  o texto (CA-16.3); os testes que o conferiam por inteiro tinham de acompanhar. Cada um troca só a string, com a mesma
  asserção.
- **Desvios 3 a 5 (testes a mais, leitura depois da demanda, componente local): aceitos.** A leitura continua depois de
  `ler_pacote_decisao`, como o plano pede, e fica mais restrita (não lê para pacote ou demanda inexistente). O
  componente é de uso único e segue o molde de `VoltarParaDemanda` na mesma página.

### Checklist da seção 12 do padrão técnico

| Item | Resultado |
|---|---|
| Faz o que o plano pede, nem mais nem menos; nada fora da tarefa | ok: os 5 arquivos do plano e os 3 testes que conferiam o texto trocado (desvios 1 e 2) |
| Teste para cada comportamento novo, que falharia sem o código | ok: vermelho mostrado na entrega (10 falhas no Vitest; 3 no e2e com o esboço vazio); o CA-15.2 da página é guarda e passa sem código, o que a entrega declara |
| Sem segredo, `.env` ou dado pessoal real | ok: contas e DEC fictícios, datas fixas, nenhum token |
| Entrada externa validada; erro sem vazar detalhe | ok: nenhuma entrada nova; o `decId` já passa por `RE_ID_DEC` e a leitura usa o `p.id` vindo do banco; falha sobe para a tela de erro de hoje |
| Banco: migration, migrator, RLS | não se aplica: só leitura por função da T10 |
| Nada duplica função existente | ok: reaproveita `recebimentoDoPedido`, `formatarDataHora`, `obterDeps` e o visto dos contadores |
| Textos em pt-BR; axe sem violação nas telas tocadas | ok: textos da 03 (6.1, 6.2, seção 9); axe na T11 com a linha em 1280 × 720 e 390 × 844, pela entrega |
| Minor vai para Pendências | ok: abaixo |
| `/code-review` e `/security-review` no PR | fica com a `08-revisao` (G2 do plano) |

### Pareceres (todos Minor; nenhum bloqueia)

1. `src/app/(painel)/pacotes-decisao/[decId]/page.tsx:105-106`, Minor. A data é formatada duas vezes (uma dentro de
   `linhaDoRecebimento`, outra no componente) e a quebra da frase depende de `lastIndexOf` achar a data no texto. Se um
   dia `TEXTOS_DECISAO.recebido` deixar de conter a data, `i` vale `-1` e o `<p>` sai com a frase cortada e a data
   repetida, sem teste que acuse fora do `pagina.test.ts`. Razão para não bloquear: hoje o texto sempre contém a data, o
   `pagina.test.ts` confere o `<p>` inteiro e a T18 usa o mesmo molde. Se a assinatura do G7 for revista, devolver também
   `data` em `linhaDoRecebimento` elimina a busca.
2. `src/app/(painel)/pacotes-decisao/[decId]/page.tsx:104`, Minor. `if (!linha) return null` não é alcançável: o
   componente só é montado com `em` do tipo `Date`, e `linhaDoRecebimento` só devolve `null` para `null`. É ruído, sem
   efeito.

## Decisões tomadas

- Status `pronto`: o checklist da seção 12 está cumprido e os dois pareceres são Minor, que a seção 12 manda para
  Pendências.
- Desvios 1 e 2 aceitos: a troca do texto é o próprio CA-16.3, e o diff mostra que nenhuma asserção saiu.
- Não rodei o `pnpm test:e2e`: não está na minha lista Pode. A `06-T19-testes` confere o e2e.

## Pendências

- Nenhuma bloqueia a T19.
- Para a `06-T19-testes` (qa-automacao): rodar `e2e/recebido-construir.spec.ts` e `e2e/pedido-construcao.spec.ts` e
  conferir o axe da T11 com a linha nas duas larguras (CA-15.4).
- Minor 1 e 2 desta revisão, para quem mexer de novo na T11 ou no G7.
- Para a 07 ou a 08 (`engenheiro-backend`, `scripts/seed-ficticio.ts`): o Minor 2 da 06-T15-revisao segue aberto. O DEC
  do `pedidoRecebido` mostra no Resumo executivo "exige as duas aprovações" num DEC de nível "Só o CTO".
- Para a `07-qa-funcional`: à mão, a leitura da linha no leitor de tela (o visto não deve ser lido) e o zoom de 200 % e
  400 % da T11 com a linha.
- Para a `10-documentacao`: o manual da seção "Pedido de Construção" com o texto novo (CA-16.3) e a linha "Recebido pelo
  /construir em …" no cabeçalho da T11.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -8` — HEAD em d45c909 (06-T19-construcao)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat d45c9091c7c848852e987b5b6c42133fc8f07a7e~1 d45c9091c7c848852e987b5b6c42133fc8f07a7e` — 10 arquivos, 429 inserções e 4 remoções (8 de código e teste, a entrega e o `passagens.jsonl`)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -U0 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD -G "^### T19" -- docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md --stat` — saída grande (o plano inteiro como arquivo novo); a T19 foi lida depois com Read
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff d45c9091c7c848852e987b5b6c42133fc8f07a7e~1 d45c9091c7c848852e987b5b6c42133fc8f07a7e -- src e2e` — o diff de código revisado acima
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat d45c9091c7c848852e987b5b6c42133fc8f07a7e~1 d45c9091c7c848852e987b5b6c42133fc8f07a7e -- src/modules src/lib src/db drizzle next.config.ts src/proxy.ts` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — árvore limpa
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/recebimento.test.ts src/components/dados-do-pedido.test.ts src/components/dados-da-decisao.test.ts "src/app/(painel)/pacotes-decisao"` — 6 de 6 arquivos, 153 de 153 testes
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat a9fd9b8 HEAD -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/proxy.ts src/db/privilegios.ts next.config.ts src/lib/rota.ts "drizzle/000[0-6]_*.sql" "drizzle/meta/000[0-6]_snapshot.json"` — vazio (G4)

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
