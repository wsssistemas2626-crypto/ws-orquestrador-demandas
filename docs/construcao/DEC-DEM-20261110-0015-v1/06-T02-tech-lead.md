---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T02-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12), 06-T02-tech-lead.md (revisão anterior), 06-T02-qa-automacao.md, 06-T02-engenheiro-frontend.md (volta 1), commit 1c8dd70 (diff de e2e/fontes.spec.ts), e2e/fontes.spec.ts, test/estatico/fontes-qa.test.ts]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Segunda revisão da T02 (Fontes Noto servidas pelo próprio app, `engenheiro-frontend`, risco alto), só sobre a correção
do teste instável que a `06-T02-testes` devolveu. Commit da correção: `1c8dd70`; commit da construção informado:
`f106749` (os outros dois só registram passagens). **Aprovada, sem Critical nem Important.** A revisão anterior
(commit `f6e8b4b`) continua valendo para o resto da tarefa.

### O que mudou

`git diff --stat bae998e f106749`: no código, só `e2e/fontes.spec.ts` (19 linhas a mais, 4 a menos). Desde o commit
revisado antes (`f6e8b4b`), as únicas outras mudanças de código são os dois arquivos do qa-automacao
(`e2e/fontes-qa.spec.ts` e `test/estatico/fontes-qa.test.ts`). `playwright.config.ts`, `vitest.config.ts`,
`package.json`, `pnpm-lock.yaml` e `pnpm-workspace.yaml` sem diff. Árvore de trabalho limpa: a sonda temporária
`e2e/tmp-corrida-fontes.spec.ts` não ficou no repositório nem em commit.

### A correção resolve a causa

- **Causa** (a mesma que o qa-automacao apontou): a lista da T03 chega por `<Suspense>` depois do `load`; o
  `document.fonts.ready` lido antes da revelação resolve sem a Noto Sans Mono pedida, e a leitura única seguinte a
  encontrava `loading`.
- **`e2e/fontes.spec.ts:27`**: com `temMono`, espera `main .font-mono:visible` antes do `ready`. Ataca a causa: o texto
  mono só pede a fonte quando é desenhado, e a espera garante que ele foi desenhado antes do `ready`.
- **`e2e/fontes.spec.ts:45-49`**: a carga é relida até passar, por até 5 s (`toPass({ timeout: 5_000 })`), em vez de
  uma leitura só. É retentativa da leitura, não do teste: `retries` e o tempo-limite do `playwright.config.ts` não
  mudaram. Sem `waitForTimeout`.
- **`e2e/fontes.spec.ts:32`**: a família do mono passa a vir do primeiro `.font-mono` desenhado dentro do `main`, e não
  do primeiro do documento, que podia estar no nó escondido do Suspense.

### Nenhuma asserção saiu nem afrouxou (G3.2, CV-20)

| Asserção de antes | Agora |
|---|---|
| `expect(r.carregadas).toContain(r.corpo)` | `expect(carregadas).toContain(r.corpo)` (`:47`), mesmo valor esperado, lido de novo a cada tentativa |
| `if (temMono) expect(r.carregadas).toContain(r.mono)` | `if (temMono) expect(carregadas).toContain(r.mono)` (`:48`) |
| `@font-face` só `local(...)`/`.woff2` da mesma origem em `/_next/static/media/` | sem mudança (`:50`, `:57`, `:61`) |
| respostas `.woff2` da mesma origem com `font/woff2` | sem mudança (`:64`, `:65`) |

- O critério continua o mesmo: status `loaded` da família que o corpo e o id de fato usam. A janela de 5 s só tira a
  corrida; se a fonte não carregar, o teste reprova como antes.
- `r.mono` nulo continua reprovando (`toContain(null)`), e a espera do `:27` já falha antes se não houver id visível.
- Piso da CV-20: linhas com `expect(` em `e2e/fontes.spec.ts` passaram de 7 para 8 (`:45`, `:47`, `:48`, `:50`, `:57`,
  `:61`, `:64`, `:65`); o piso de `test/estatico/fontes-qa.test.ts:250` é 7 e passa (rodei `test/estatico`: 227 de
  227).
- O desvio de `toPass` em vez do `expect.poll` sugerido pelo qa-automacao é aceito: mesma retentativa, e as duas linhas
  de asserção ficam iguais às de antes. Com `expect.poll`, o piso do arquivo cairia para 5.

### Checklist da seção 12 do padrão técnico (só sobre esta volta)

| Item | Resultado |
|---|---|
| Faz o que o plano pede, nem mais nem menos; arquivos fora da tarefa não mudaram | Sim. Só `e2e/fontes.spec.ts`, e só `conferirFontes` e duas constantes; o resto da T02 é o que foi aprovado na revisão anterior |
| Teste para cada comportamento novo, e ele falharia sem o código | Sim. As asserções da CV-04 são as mesmas; a forma antiga foi vista falhando 2 de 90 na sonda com carga e 2 de 6 no qa-automacao; a nova passou 90 de 90 na sonda e 6 de 6 nas rodadas do arquivo, e 154 de 154 na e2e inteira, segundo a entrega do engenheiro |
| Nenhum segredo, `.env` ou dado pessoal real | Sim. Seed fictício, conta `cto` de teste |
| Entrada externa validada com Zod | Não se aplica: só teste |
| Banco | Não se aplica |
| Nada duplica função existente | Sim. `familiasCarregadas` é local ao spec; o `fontes-qa.spec.ts` tem leitura parecida, mas é arquivo do qa-automacao com propósito próprio (ligar família a arquivo) |
| Textos em pt-BR; axe sem violação nas telas tocadas | Nenhuma tela mudou |
| Minor vai para Pendências | Sim (abaixo) |
| PR: `/code-review` e `/security-review` | Não se aplica nesta etapa: fica com a `08-revisao` |

### Verificação local

- `pnpm test test/estatico`: 21 arquivos, 227 de 227 (piso da CV-20 e regras da vigia sobre o `e2e/`).
- `pnpm lint` e `pnpm typecheck`: limpos.
- A suíte de unidade inteira não roda o `e2e/`; a única mudança de código é um spec do Playwright, coberto pelos testes
  estáticos acima. O `pnpm test:e2e` não está na minha lista Pode e fica com a `06-T02-testes`.

## Decisões tomadas

- Aprovar sem devolver: a correção ataca a causa (espera o id desenhado antes do `ready`) e mantém as duas asserções
  com o mesmo texto e o mesmo valor esperado.
- Aceitar `toPass` com 5 s explícitos: é retentativa da leitura dentro do teste, igual em efeito ao `expect.poll`, sem
  mexer em `retries` nem no tempo-limite global.
- Aceitar a espera também na T11: não muda o que é conferido e protege a T13, que vai refazer a tela.

## Pendências

- Minor (para a `08-revisao`): `e2e/fontes.spec.ts:32` usa `getClientRects().length > 0`, e a espera do `:27` usa o
  `:visible` do Playwright, que também exclui `visibility: hidden` e caixa vazia. O comentário diz que é "o mesmo
  elemento", mas os dois critérios podem divergir. Hoje não muda nada (todo `.font-mono` tem a mesma família pela
  classe). Razão: se a T09 trouxer variante escondida por `visibility`, a leitura da família pode vir de outro nó que o
  da espera; trocar por `page.locator(MONO_VISIVEL).first().evaluate(...)` alinharia os dois.
- Minor (para o qa-automacao): o piso de `e2e/fontes.spec.ts` em `fontes-qa.test.ts:250` pode ficar em 7. A linha a
  mais (`:45`, `await expect(async () => {`) é o invólucro do `toPass`, não uma asserção nova; subir o piso para 8 não
  protege nada a mais.
- Minor (do engenheiro, para o qa-automacao e a `08-revisao`): `--repeat-each` acima de 3 em spec que chama
  `entrarComo` esbarra no limite de taxa do login (`429` em `sign-in/email` e `two-factor/verify-totp`). Quem for
  provar estabilidade de teste com login deve usar várias rodadas curtas.
- Para a `06-T02-testes`: repetir `e2e/fontes.spec.ts` (fora da lista Pode do tech-lead) e a e2e inteira para
  confirmar a estabilidade da T03.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -8` — f106749, 1b0136d, 1c8dd70, bae998e, …, f6e8b4b
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat bae998e f106749` — no código, só `e2e/fontes.spec.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 1c8dd70~1 1c8dd70 -- e2e` — só `conferirFontes` e duas constantes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat f6e8b4b f106749 -- e2e src test playwright.config.ts vitest.config.ts package.json pnpm-lock.yaml pnpm-workspace.yaml` — `e2e/fontes.spec.ts` e os dois arquivos do qa-automacao
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico` — 21 arquivos, 227 de 227
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
