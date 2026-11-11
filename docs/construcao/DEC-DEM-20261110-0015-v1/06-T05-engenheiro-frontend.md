---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T05-construcao
agente: engenheiro-frontend
leu: [pedido.json, contrato-passagem.md, 06-T05-qa-automacao.md, 06-T05-engenheiro-frontend.md (entrega anterior), e2e/casca.spec.ts, e2e/apoio.ts, playwright.config.ts, src/modules/acesso/auth.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Volta da T05 pela `06-T05-qa-automacao.md`. O e2e `e2e/casca.spec.ts`, "clique no véu e item da tela atual fecham e
devolvem o foco a Menu" (linha 200), era instável. Corrigi só o teste, sem tirar nem afrouxar asserção. O código da T05
(85ace62) e a entrega anterior desta etapa continuam valendo; o que segue é só o desta volta.

### Causa

A causa é a que a qa-automacao apontou. O `abrirGaveta` termina quando o `<dialog>` fica visível, o que acontece no
começo da animação `gaveta-entra` (200 ms). Nesse instante a gaveta ainda está fora da tela, e o ponto (160, 500) ainda
é o véu. O `page.mouse.click(160, 500)` caía no véu e fechava a gaveta, como o produto manda.

### Correção (só no teste)

Arquivo alterado: `e2e/casca.spec.ts`, no teste da linha 200, entre a segunda abertura da gaveta e o clique "dentro
dela":

- Uma espera pelo fim das animações do diálogo:
  `await gaveta(page).evaluate((d) => Promise.all(d.getAnimations().map((a) => a.finished)).then(() => undefined))`.
  O `.then(() => undefined)` evita devolver objetos `Animation`, que não são serializáveis.
- Duas asserções novas, que deixam o teste mais forte:
  - a gaveta parou em `x = 0`;
  - a largura dela passa de 160 px, então o ponto do clique fica dentro da gaveta.

  Se a animação ou a largura mudarem, o teste vai falhar com uma mensagem que diz isso, e não com "a gaveta fechou".
- O clique continua por coordenada em (160, 500), entre os itens e a conta. Assim ele prova o que o teste sempre provou:
  um clique na área vazia da gaveta não fecha. O clique no texto da conta já está coberto em `casca-qa.spec.ts`.
- Nenhuma asserção saiu nem mudou. O clique no véu em (370, 400), o item da tela atual, o foco em "Menu" e a URL
  continuam como antes.

Testes criados: nenhum arquivo novo. O teste existente recebeu duas asserções.

### Visto falhando antes da correção

`pnpm -C … test:e2e e2e/casca.spec.ts -g "clique no véu" --repeat-each=3 --reporter=line`: 1 falhou e 2 passaram. A
falha foi a mesma da qa-automacao:

```
Error: expect(locator).toBeVisible() failed
Locator: getByRole('dialog', { name: 'Menu' })
Error: element(s) not found
> 212 |     await expect(gaveta(page)).toBeVisible();
```

### Depois da correção

| Execução | Resultado |
|---|---|
| Os três specs juntos (`casca`, `casca-qa` e `moldura`), `--repeat-each=3` | **78 de 78** |
| `casca.spec.ts` inteiro, `--repeat-each=3` | **39 de 39** |
| Só o teste, `--repeat-each=3`, duas rodadas | **3 de 3** e **3 de 3** |
| Só o teste, `--repeat-each=10` | 7 passaram; as 3 falhas foram 429 no login, antes do corpo do teste (ver abaixo) |
| Só o teste, `--repeat-each=5` | 3 passaram; as 2 falhas foram 429 no login, antes do corpo do teste |
| `pnpm test` | **218 arquivos, 4820 de 4820** |
| `pnpm lint` e `pnpm typecheck` | limpos |

Somando as rodadas, o corpo do teste rodou 16 vezes sozinho e 3 vezes junto com os outros dois specs, além das 3 do
`casca.spec` inteiro. Não falhou nenhuma vez, nem na linha 212 nem nas asserções novas.

### As falhas 429 nas rodadas longas do teste sozinho

As falhas 429 não vêm desta correção:

- Todas caem em `e2e/apoio.ts:79` (`entrarComo`, verificação do TOTP), antes da primeira linha do corpo do teste.
- O mesmo acontece com um teste que eu não toquei. "Fechar menu" fecha e devolve o foco a Menu, rodado sozinho com
  `--repeat-each=5`, também deu 3 que passaram e 2 com 429 na mesma linha.
- O padrão é o mesmo nos dois testes: a partir do quarto login seguido do mesmo teste curto, a verificação do TOTP
  devolve 429.
- Com testes diferentes intercalados, isso não aconteceu. Os 39 logins do `casca.spec` e os 78 dos três specs juntos
  passaram.

Por isso, as rodadas "sozinho" ficaram em blocos de `--repeat-each=3`.

### Desvios do plano

Nenhum. A correção é a primeira das duas que a qa-automacao sugeriu: esperar o fim da animação. Não mexi em
`e2e/apoio.ts`, que é de todos os specs.

## Decisões tomadas

- **Esperar a animação, e não clicar por localizador.** Com a espera, o teste continua provando o mesmo caso: clique na
  área vazia da gaveta, fora de qualquer elemento. O clique no texto da conta já está coberto em `casca-qa.spec.ts`.
- **Conferir a posição e a largura antes de clicar.** Se a animação ou a largura da gaveta mudarem, o teste falha com uma
  mensagem que diz isso, e não com um "a gaveta fechou" ambíguo.
- **Não corrigir o 429 desta vez.** Ele aparece em qualquer teste curto repetido sozinho, fica no apoio comum a todos os
  specs (ou no limite do Better Auth) e não é desta tarefa. Ficou registrado em Pendências.

## Pendências

- Para o tech-lead e a qa-automacao (não bloqueia): quando um teste curto do celular roda sozinho com
  `--repeat-each` acima de 3, o quarto `entrarComo('cto')` seguido recebe 429 em `/api/auth/two-factor/verify-totp`
  (`e2e/apoio.ts:79`).
  - Aconteceu com "clique no véu…" e também com "Fechar menu…", que eu não toquei.
  - Não aconteceu no `casca.spec.ts` inteiro (39 logins) nem nos três specs juntos (78 logins).
  - Quem for medir instabilidade com `--repeat-each` alto vai ver esse falso positivo. Não investiguei a causa: o
    limite do Better Auth e o apoio comum ficam fora desta tarefa.
- Seguem as pendências da entrega anterior para a 07 e para o UAT: leitor de tela, foco branco sobre marinho, zoom de
  200 % e 400 %, e o `<dialog>` no Safari do iOS.
- Segue também a observação da qa-automacao para a revisão e para a ux-ui-design (baixa): um toque durante os 200 ms da
  entrada, no lugar onde a gaveta vai parar, fecha a gaveta.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/casca.spec.ts -g "clique no véu" --repeat-each=3 --reporter=line` — visto falhando antes da correção: 1 falhou e 2 passaram (linha 212, `element(s) not found`)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/casca.spec.ts -g "clique no véu" --repeat-each=10 --reporter=line` — 7 passaram e 3 falharam, todas por 429 no login (`apoio.ts:79`); nenhuma no corpo do teste
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/casca.spec.ts e2e/casca-qa.spec.ts e2e/moldura.spec.ts --repeat-each=3 --reporter=dot` — 78 de 78
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/casca.spec.ts -g "clique no véu" --repeat-each=3 --reporter=line` — 3 de 3
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/casca.spec.ts -g "clique no véu" --repeat-each=5 --reporter=line` — 3 passaram e 2 falharam, por 429 no login (`apoio.ts:79`)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/casca.spec.ts -g "Fechar menu" --repeat-each=5 --reporter=line` — controle com teste não tocado: 3 passaram e 2 falharam, pelo mesmo 429 no login
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/casca.spec.ts --repeat-each=3 --reporter=dot` — 39 de 39
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/casca.spec.ts -g "clique no véu" --repeat-each=3 --reporter=line` — 3 de 3
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — 218 arquivos, 4820 de 4820
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — só `M e2e/casca.spec.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff` — 6 linhas acrescentadas no teste da linha 200, nenhuma removida

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (nesta volta só o teste mudou; a falha dele foi reproduzida antes da correção, com o comando e o trecho da saída na Entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa (só `e2e/casca.spec.ts`)
- [x] os textos são os de `03-ux-ui-design.md`, em pt-BR, e o axe não acusa violação nas telas tocadas (nenhum texto nem tela mudou; o axe da casca e da gaveta passou nas rodadas acima)
