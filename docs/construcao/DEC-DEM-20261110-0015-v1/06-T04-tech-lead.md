---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T04-revisao
agente: tech-lead
leu: [tarefas.json, docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md (G1 a G7, T03 e T04), 06-T04-engenheiro-frontend.md, 03-ux-ui-design.md (seção 7), padrao-tecnico.md (seção 12), contrato-passagem.md, diff do commit 6255e25, e2e/apoio.ts, e2e/autenticacao-qa.spec.ts, playwright.config.ts, src/components/Cartao.tsx]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T04 (marca e moldura pública: Entrar, 2FA, Sem permissão, erro e 404), commit `6255e25`. **Aprovada**, sem
achado Critical nem Important. Os quatro pontos abaixo são Minor ou observação e vão para Pendências.

### Conferência do checklist (padrão técnico, seção 12)

| Item | Resultado |
|---|---|
| Faz o que o plano pede, nem mais nem menos | Sim. Arquivos novos e alterados são exatamente os da lista "Arquivos" da T04 (`MarcaWs.tsx`, `MolduraPublica.tsx`, `moldura-publica.spec.ts`; `entrar/page.tsx`, `FormularioEntrar.tsx`, `configurar-2fa/page.tsx`, `AssistenteDoisFatores.tsx`, `sem-permissao/page.tsx`, `error.tsx`, `not-found.tsx`), mais o teste de unidade da moldura e dois testes de hoje com a regex do cabeçalho trocada (ver P-T04-03). Interfaces `MarcaWs({ variante, compacta?, comLink? })` e `MolduraPublica({ comLinkNaMarca, children })` batem com o plano. |
| Teste para cada comportamento novo, que falharia sem o código | Sim. 17 testes de unidade (marca, moldura, cinco telas, `w-full`, sentinela de `message`/`digest` no erro) e 4 e2e (RF-13 T01, RF-13 Sem permissão e 404, CA-13.2 QR, CA-13.3 axe nas duas larguras). A entrega mostra as falhas antes do código: módulo ausente, 6 de 15 na unidade e 3 de 4 no e2e. |
| Nenhum segredo, `.env` ou dado pessoal real | Sim. Contas de `CONTAS_FICTICIAS`, IP da faixa 198.18.0.0/15, sentinelas "SENTINELA-ficticia" e "Pessoa Ficticia". |
| Entrada externa com Zod; erro sem vazar detalhe | Nenhuma entrada nova. `destinoSeguro(callbackURL)` (C-40) continua no servidor, sem mudança. `error.tsx` continua sem ler `message`, `stack`, `digest` nem `cause`, e o teste de unidade prova com sentinela. |
| Banco: migration, migrator, RLS | Não se aplica: nenhuma mudança em `src/db`, `drizzle` ou `src/modules`. |
| Nada duplica função existente | Sim. A moldura usa `Cartao` (T03) e `classeDoBotao`; o axe usa `semViolacoes` de `e2e/apoio.ts`. A função local de duas larguras não duplica nada que exista hoje (ver P-T04-01). |
| Textos em pt-BR; axe sem violação nas telas tocadas | Sim. Textos de hoje, sem mudança (03, 7.2). Axe em T01 vazia, com erro e no passo 2, T02 passos 1 e 2, Sem permissão e 404, em 1280 × 720 e 390 × 844, com a vigia de origem e CSP da T01. A tela de erro fica na unidade (P-T04-02). |
| Minor vai para Pendências | Sim, P-T04-01 a P-T04-04. |

### Superfícies congeladas (G4, CV-01)

- O comando do G4, contra `198e97d`, saiu **vazio**: `src/lib/auth.ts`, `auth-cliente.ts`, `qr.ts`, `src/modules/acesso`,
  `src/proxy.ts`, `next.config.ts`, `src/app/api`, `src/db`, `drizzle` e os nove arquivos `'use server'` sem diff.
- `git diff 198e97d --stat -- src/modules package.json`: só `package.json` com 2 linhas (as duas `@fontsource` da T02,
  CV-05). Nenhum `'use server'` novo no commit.
- QR (CA-13.2): `rect fill="#ffffff"` e `path fill="#000000"` sem mudança; só saiu a classe `border-borda` do `svg`, e a
  borda decorativa `linha` foi para o invólucro `bg-branco p-4`. O e2e confere as duas cores, a área branca de 16 px e o
  fundo branco.
- C-40: T01 e T02 sem nenhum link (o e2e confere `getByRole('link')` com contagem 0 em `/entrar`, e a unidade confere
  T01 e T02). A marca com link sai só para a constante `DESTINO_DA_MARCA = '/demandas'` (CV-19).

### Pontos verificados no código

- `MarcaWs.tsx`: só HTML e classes de token (`marinho`, `branco`, `tinta-media`, `superficie`, `texto-claro-apoio`), sem
  `style=`, `<img>`, `<svg>` nem nome antigo de token (G3.4, G3.5). `size-9`/`size-8` = 36/32 px, `min-h-11` = 44 px
  no link, nome acessível do próprio texto (sem `aria-label`).
- `MolduraPublica.tsx`: `max-w-110` = 440 px, `px-4` = 16 px, sem leitura nem estado; um só `main#conteudo`
  (`tabIndex={-1}`), o que mantém `painel-qa.test.ts` válido para Sem permissão, erro e 404.
- `error.tsx`: sem `(painel)/error.tsx` no repositório, o erro de qualquer tela do painel cai neste arquivo, como hoje;
  a moldura pública com a marca para `/demandas` não cria caminho novo (a fila continua guardada pelo proxy e por
  `exigirPessoaNaPagina`).
- `FormularioEntrar.tsx` e `AssistenteDoisFatores.tsx`: só classes e o invólucro do QR. Campos, textos, `trustDevice`,
  foco e fluxo sem mudança; `entrar.spec.ts`, `configurar-2fa.spec.ts` e `autenticacao-qa.spec.ts` passam sem mudança
  (CA-13.1).
- O e2e da T02 usa a conta `sem2fa` só até o passo 2, como `autenticacao-qa.spec.ts` já faz; a suíte roda com
  `workers: 1`, então a conta não é disputada entre testes.

### Desvios declarados pelo engenheiro (aceitos)

1. QR conferido no passo 2, não no 1: correto, o QR só existe no passo 2; o comentário do plano estava errado.
2. Função local de axe nas duas larguras: aceita até a T16 (P-T04-01).
3. Marca num `header` fora do `main`: aceito. A 03, 7.2 é ambígua ("`main` com a marca acima do cartão"); fora do `main`
   a marca vira landmark `banner`, os alertas da tela continuam os únicos dentro do `main` e os testes de unidade de hoje
   (marca num `header`) seguem valendo sem troca de regra.
4. Clique na marca no 404 sem sessão: teste a mais, dentro do comportamento de hoje.

## Decisões tomadas

- Status `pronto`: nenhum achado Critical ou Important; G4 vazio; `pnpm test`, `pnpm lint` e `pnpm typecheck` verdes
  rodados nesta revisão.
- A troca da regex do cabeçalho em `entrar.test.ts:46` e `configurar-2fa/pagina-qa.test.ts:29` é aceita como "texto
  literal" do G3.2: a asserção (nome do sistema no `header`) é a mesma, a contagem de `expect(` não muda e a entrega
  explica trecho a trecho, como o G3.2 exige para mudança fora do G5.
- Não rodei `pnpm test:e2e`: não está na minha lista Pode. O engenheiro declarou 158 de 158 e a passagem
  `06-T04-testes` (qa-automacao) é a dona dessa conferência.

## Pendências

- P-T04-01 (Minor, T16): `e2e/moldura-publica.spec.ts:25` declara `semViolacoesNasDuasLargurasDaMoldura` local. Quando
  a T16 criar `semViolacoesNasDuasLarguras` em `e2e/apoio.ts` (G7), trocar a local pela comum, mantendo a conferência de
  rolagem lateral em 390 px (pode ir para a comum). Razão: duas funções com o mesmo papel divergem com o tempo.
- P-T04-02 (Minor, 07-qa-funcional): `src/app/error.tsx` não tem e2e (provocar o erro no build de produção exige falha
  plantada no servidor). A unidade cobre marca, textos e a ausência de `message`/`digest`; a 07 abre a tela de verdade e
  confere foco e axe à mão, junto com o foco no link da marca (contorno `acao-escura` sobre `superficie`) e a T02 em
  320 px com a chave longa, que o engenheiro já listou.
- P-T04-03 (observação, 08-revisao): dois testes de unidade de hoje mudaram fora do G5 (`src/app/entrar/entrar.test.ts:46`
  e `src/app/configurar-2fa/pagina-qa.test.ts:29`), só na regex do nome no `header`. Registrar na contagem do CV-20 da
  08 que o número de `expect(` desses arquivos não mudou.
- P-T04-04 (observação, marketing-comunicacao P-02): se o bloco "WS" for vetado, a troca fica só em
  `src/components/marca/MarcaWs.tsx`; os testes de unidade e e2e que procuram ">WS<" e `getByText('WS')` mudam junto.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -8` — topo 6255e25 (06-T04-construcao)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 6255e25~1 6255e25` — 15 arquivos, todos da tarefa ou da pasta do pedido
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --format=%H -1 -- docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md` — plano rastreado (080356f)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 6255e25~1 6255e25 -- src e2e` — diff lido por inteiro
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 198e97d -- src/proxy.ts src/proxy.test.ts next.config.ts src/app/api src/db drizzle src/modules/acesso src/worker src/jobs src/agents src/lib/auth.ts src/lib/auth-cliente.ts src/lib/qr.ts src/lib/log.ts src/lib/erros.ts src/instrumentation.ts pnpm-workspace.yaml "src/app/(painel)/configuracao/agentes/acoes.ts" "src/app/(painel)/demandas/[id]/acoes.ts" "src/app/(painel)/demandas/[id]/editar/acoes.ts" "src/app/(painel)/demandas/[id]/especificacoes/nova/acoes.ts" "src/app/(painel)/demandas/[id]/pacotes-decisao/novo/acoes.ts" "src/app/(painel)/demandas/[id]/pareceres-risco/novo/acoes.ts" "src/app/(painel)/demandas/nova/acoes.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes.ts"` — vazio (G4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 198e97d --stat -- src/modules package.json` — só `package.json`, 2 linhas (T02)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 198e97d 6255e25 -- docs/construcao/DEC-DEM-20261110-0015-v1/03-ux-ui-design.md` — 03 rastreada
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — 213 arquivos, 4768 de 4768
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
