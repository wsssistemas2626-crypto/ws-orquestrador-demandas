---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T01-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (inteiro; checklist da seção 12), 2026-10-25-ws-orquestrador-demandas-plano.md (cabeçalho, G1 a G6, mapa das fases e T01; o trecho lido avança até o início da T02), 06-T01-engenheiro-backend.md, git show 46f6e24 (só a entrega e o passagens.jsonl), git show aba6bcc (código da T01), .gitignore]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T01 (Esqueleto do projeto, relógio e fuso), com o código do commit `aba6bcc` e a entrega regravada no
commit `46f6e24`. O `46f6e24` só mexe em `06-T01-engenheiro-backend.md` e no `passagens.jsonl` (este, do maestro);
nenhum arquivo de código mudou entre as duas voltas.

Conferi de novo no ramo `construcao/DEC-DEM-20261022-0001-v1`, com a árvore limpa: `pnpm test` com 8 de 8 testes
passando em 3 arquivos, e `pnpm lint` e `pnpm typecheck` limpos.

Não achei nenhum problema Critical ou Important. Os quatro pareceres abaixo são Minor e não seguram a passagem
(padrão técnico, seção 12).

### Pareceres (todos Minor)

1. **`src/lib/relogio.ts:11`**. Problema: o `RangeError` de data inválida em `relogioFixo` (Desvio 4) é um
   comportamento novo, fora do plano, e nenhum teste o cobre. Razão: o padrão pede teste para cada comportamento novo;
   hoje, se essa guarda sumir, nenhum teste quebra. Caminho: um `it` em `relogio.test.ts` com
   `expect(() => relogioFixo('nao-e-data')).toThrow(RangeError)` e o mesmo para `definir`. Pode entrar na
   `06-T01-testes` (qa-automacao) ou na próxima tarefa do backend que tocar `relogio.ts`.
2. **`package.json:43`**. Problema: `@types/node` ficou em `^26.6.5`, mas o runtime é o Node 24 (`engines.node >=24`;
   Dockerfile sobre `node:24-bookworm-slim`, padrão seção 9). Razão: com os tipos do 26, o `typecheck` aceita uma API
   que só existe no Node 26 e que quebraria em execução no 24. O plano não fixou a versão (`@types/node` sem número),
   então o engenheiro seguiu o plano; o ajuste é `@types/node@^24`. Registro como dívida para a próxima tarefa do backend
   que rodar `pnpm add`, sem volta agora.
3. **`src/lib/fuso.ts:21`**. Problema: se `timeZoneName` não vier, o deslocamento cai em `+00:00` (UTC) sem aviso; o
   plano usava `-03:00` como reserva. Razão: com `timeZoneName: 'longOffset'` o Node 24 sempre devolve a parte, então
   hoje esse ramo não roda; mas, se rodar, o erro seria silencioso, com o mês do teto de gasto deslocado em 3 horas.
   Melhor lançar erro do que adivinhar. Fica para quando `fuso.ts` for tocado de novo.
4. **`.gitignore:10`**. Problema: `next-env.d.ts` fora do repositório faz o `tsc --noEmit` rodar sem os tipos ambiente
   do Next quando não houve `next build` ou `next dev` antes (no CI, por exemplo). Razão: hoje não afeta nada (sem
   import de imagem nem de CSS module), mas a primeira tela que importar um desses quebra o `typecheck` do CI e passa
   na máquina do engenheiro. Caminho: a `09-entrega` (devops-sre) roda `next typegen` antes do `typecheck` no
   `ci.yml`. Ignorar o arquivo segue a recomendação atual do Next e está certo.

### Checklist da seção 12 do padrão técnico

- [x] A tarefa faz o que o plano pede, nem mais nem menos; arquivos fora da tarefa não mudaram. Os arquivos são os da
  lista da T01. Ficam aceitos estes extras: `pnpm-workspace.yaml`, criado pelo `pnpm add` e necessário para o
  `pnpm install` (ver Decisões); `*.tsbuildinfo` e `next-env.d.ts` no `.gitignore`, que são artefatos gerados; e os
  Desvios 2 a 7 da entrega, que melhoram ou detalham o código do plano sem mudar as interfaces produzidas.
- [x] Há teste para cada comportamento novo, e ele falharia sem o código. `relogio.test.ts`, `fuso.test.ts` (com a
  virada de ano a mais) e `compose.test.ts` cobrem as interfaces do plano, e a falha do passo 3 está na entrega. A
  exceção é a guarda do parecer 1, que é Minor.
- [x] Nenhum segredo, valor de `.env` ou dado pessoal real em código, teste, log ou fixture. As credenciais de
  `docker-compose.dev.yml` são as fictícias do plano, de uso local, e a porta está só em `127.0.0.1`.
- [x] Entrada externa validada com Zod; erro sem vazar detalhe. Não se aplica: a T01 não cria rota, Server Action nem
  job, e `page.tsx` só redireciona.
- [x] Banco: migration gerada, papel migrator, RLS e guarda quando houver `tenant_id`. Não se aplica: a T01 não tem
  migration; o compose de dev usa o usuário `migrator_dev`, como no plano.
- [x] Nada duplica função que já existe no repositório. O repositório não tinha código antes da T01.
- [x] Textos de interface em pt-BR; axe sem violação nas telas tocadas. `lang="pt-BR"` e o título do plano estão no
  layout. A T01 não tem tela própria: `/` só redireciona, então não há axe a rodar.
- [x] O que é Minor vai para Pendências; só Critical e Important bloqueiam a passagem. Os pareceres 1 a 4 estão em
  Pendências.
- [x] No PR: `/code-review`, correções e `/security-review`. Não se aplica nesta etapa: é da `08-revisao`, pela G2 do
  plano.

## Decisões tomadas

- Passagem aprovada com status `pronto`: não há Critical nem Important; os quatro achados são Minor e o padrão manda
  registrá-los, não segurar a passagem.
- `pnpm-workspace.yaml` fica no repositório (era a pergunta da entrega). Razão: sem o `allowBuilds`, o pnpm 12.6.0
  falha em todo `pnpm install` seguinte, inclusive o `--frozen-lockfile` do Dockerfile da `09-entrega`. Os valores
  (`esbuild: true` e o resto `false`) estão certos: `lint`, `test` e `typecheck` passam sem os builds negados.
- O caminho usado para preencher o `allowBuilds` (`pnpm add --allow-build`, sem editar o arquivo à mão) está aceito:
  era o único dentro da lista Pode.
- Desvio 2 (deslocamento do próprio dia 1º em `fuso.ts`) aceito. Razão: é o mais correto se o horário de verão
  voltar, e a interface não muda. Desvio 5 (`target: ES2022`) e Desvio 6 (`printWidth: 120`) aceitos: nenhum dos dois
  contraria o padrão técnico.
- A leitura dos 7 arquivos do NutriDebby na primeira volta não muda o código e já foi tratada por Fabiano, que liberou
  a etapa na volta 1 do `passagens.jsonl`. Não volta para o engenheiro.

## Pendências

- Parecer 1 (Minor): falta teste do `RangeError` de `relogioFixo` (`src/lib/relogio.ts:11`). Sugestão: entra na
  `06-T01-testes`.
- Parecer 2 (Minor): passar `@types/node` para `^24` (`package.json:43`) na próxima tarefa do backend que rodar
  `pnpm add`.
- Parecer 3 (Minor): trocar a reserva silenciosa `+00:00` por um erro em `src/lib/fuso.ts:21` na próxima vez que o
  arquivo for tocado.
- Parecer 4 (Minor), para a `09-entrega` (devops-sre): rodar `next typegen` antes do `typecheck` no `ci.yml`, porque o
  `next-env.d.ts` está no `.gitignore`.
- Plano (tech-lead): a G1 não lista `pnpm-workspace.yaml` entre os arquivos do `engenheiro-backend`. Mudança futura
  nesse arquivo passa pelo tech-lead, para entrar na G1, ou vai ao `devops-sre`. Não altero o plano nesta etapa, porque
  a entrega da revisão é só este arquivo.
- Para o padrão técnico (`padrao-tecnico.md`, seção 1): `eslint` 9.39.5 marcado como obsoleto pelo pnpm. Trocar de
  linha (10.x) é decisão do padrão, fora desta tarefa.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 46f6e240dc2e4e51d111ca65321a982239047b00` — 2 arquivos: a entrega e o `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat aba6bcc` — 21 arquivos da T01
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show aba6bcc -- src test vitest.config.ts package.json docker-compose.dev.yml eslint.config.mjs next.config.ts tsconfig.json .gitignore .prettierrc pnpm-workspace.yaml postcss.config.mjs` — diff do código, sem o lockfile
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 46f6e240dc2e4e51d111ca65321a982239047b00` — diff da entrega regravada; nenhum código
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — árvore limpa no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 3 arquivos, 8 de 8 passaram
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
