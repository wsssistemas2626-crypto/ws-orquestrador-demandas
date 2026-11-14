---
pedido: DEC-DEM-20261111-0018-v1
etapa: 06-T14-revisao
agente: tech-lead
leu: [pedido.json, contrato-passagem.md, padrao-tecnico.md (seção 12), docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md (G0 a G10 e T14), 06-T14-engenheiro-frontend.md, 03-ux-ui-design.md, commit dcee200 (git show e --stat), git diff 41108ee -- e2e, e2e/apoio.ts (linhas 95 a 154), src/components/Alerta.tsx, src/app/(painel)/pacotes-decisao/[decId]/page.tsx (linhas 236 a 249), tsconfig.json]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T14 (e2e da vigência na T11 e na T05, axe com cada aviso e versão 0.4.1), commit
`dcee200fa3b96f8bd3ce7b2dbdb01bfe666f95ef`. Nenhum problema Critical ou Important: a tarefa passa.

### Arquivos do commit

`e2e/vigencia.spec.ts` (novo, 153 linhas), `package.json` (só a versão), `test/estatico/projeto.test.ts` (título,
`toBe` e uma linha de comentário, G5), a entrega do engenheiro e `passagens.jsonl`. Nada fora da lista da T14.

### Pontos conferidos

| Ponto | Resultado |
|---|---|
| Critério 5 do pedido ("os três avisos novos aparecem nas telas da T11 com os textos da ux-ui-design") | Coberto. `e2e/vigencia.spec.ts:26-31` traz (a), (b) e (c) por inteiro, idênticos à seção 8 da 03 (conferidos palavra a palavra). Cada aviso é achado com `getByText(texto, { exact: true })` em `avisoNaPagina` (linha 63), e o axe roda nas duas larguras com cada aviso na página (linhas 94, 104 e 111): CA-06.5 atendido |
| CA-06.1 e CA-03.6 (passo 1, item 1) | linhas 87-95: texto (a) com o v1, link "Abrir o pacote <v1>" para `/pacotes-decisao/<v1>`, sem (b) e (c), descrição acessível do Arquivar igual à linha 2 da 4.6 da 03, axe nas duas larguras |
| CA-06.2 (item 2) | linhas 97-104: texto (b) com o v2 e o link dele; sem (a) e (c); axe nas duas larguras |
| CA-06.3 (item 3) | linhas 106-120: (c) com o link "Criar pacote novo" para `/demandas/<id>/pacotes-decisao/novo`, sem (a), axe nas duas larguras; o v1 sem (a), (b) nem (c) |
| CA-03.1 pelo navegador (item 4) | linhas 122-153: com o v2 pendente, dica, clique, diálogo, alerta "Pacote arquivado. A demanda está em Aprovada, e <v1> continua em vigor." por `toHaveText` (texto inteiro) e axe; nos dois casos, estado final pela API (v2 `arquivada`, v1 `aprovada` e não substituído, demanda `aprovada`), sem `test.skip`; T05 com a etapa 4 do v1 "Aprovada, opção A", sem o v2 nem "Arquivada", etapa 5 atual, Próxima ação da 6.2 da 03 com o link "Abrir a decisão aprovada" para o v1, e axe nas duas larguras |
| Item 5 (só o link entra no Tab; nome com o id inteiro) | `avisoNaPagina` (linhas 62-82): o `<p>` sem `tabindex` e com `tabIndex` -1; o pai (o `div` do `Alerta`, conferido em `page.tsx:241-246` e `Alerta.tsx:20`) sem `role`; um só focável no aviso; Shift+Tab e Tab a partir do link provam pelo teclado que nada do aviso entra no Tab; o nome do link é "Abrir o pacote <id inteiro>" em (a) e (b). No (c) o nome é "Criar pacote novo" (decisão abaixo) |
| Contas e G3.12 | só `entrarComo(page, 'cto')` (linha 84), conta dos specs existentes; nenhum teste cria demanda nem versão: as três demandas são do seed da T10 (`scripts/seed-ficticio.ts:218-220`), e nenhum outro spec as usa (`git grep` só acha `vigencia.spec.ts`). Nenhuma credencial em cabeçalho, então `trace: 'off'` não se aplica |
| Playwright | `playwright.config.ts:33` `retries: 0`; nenhum `timeout` de teste no arquivo (o de 300 s da linha 49 é do `webServer`), então vale o padrão de 30 s; o spec não chama `test.setTimeout` nem `test.slow`. O `playwright.config.ts` e o `e2e/apoio.ts` não estão no commit |
| Nenhum teste acima de 24 s | pela tabela da entrega do engenheiro, o mais lento levou 7,7 s nas três execuções completas (294 passaram, 9 pulados, 0 falha em cada). Não rodei o e2e (fora da minha lista Pode); a `06-T14-testes` reconfere com as execuções dela |
| Versão | `package.json` em `0.4.1`; `projeto.test.ts` espera `0.4.1`, com as seis asserções de antes |
| Nenhum e2e existente afrouxado | o commit não toca e2e existente. No `git diff 41108ee -- e2e`, as mudanças de spec antigo são todas da T11 e estão na G5 (`decisao.spec.ts` 297, 348, 364 e o teste do Arquivar, `decisao-celular.spec.ts:433`, `pedido-construcao.spec.ts` 51-58 e 417): só texto esperado trocado pelo da 03 e a demanda do Arquivar trocada para `arquivarSemVigente`; nenhuma asserção saiu, todas continuam com `exact: true` ou texto inteiro, e nenhuma regra do axe foi desligada |
| G4 | o `git diff 41108ee -- …` das superfícies congeladas saiu vazio. Os diffs parciais e a contagem do `PISO` não mudam nesta tarefa: o commit não toca nenhum desses arquivos (`--stat`) |
| Verde | `pnpm test test/estatico`: 54 arquivos, 1277 de 1277 (inclui `projeto.test.ts` e as guardas que leem `e2e/`); `pnpm typecheck` limpo (o `tsconfig.json` inclui `**/*.ts`, logo o spec novo); `pnpm lint` limpo |

### Checklist da seção 12 do padrão técnico

- [x] Faz o que o plano pede, nem mais nem menos; nenhum arquivo fora da tarefa mudou.
- [x] Teste para cada comportamento novo: o `projeto.test.ts` falhou antes da versão (trecho na entrega). O e2e nasceu
      verde, exceção da G3.1 declarada com a razão (confere no navegador código das T12 e T13, já no ramo), e aceita.
- [x] Nenhum segredo, valor de `.env` ou dado pessoal real: títulos do seed com "(fictício)", ids gerados, login pelo
      `entrarComo` de hoje.
- [x] Entrada externa com Zod: não se aplica (só teste e versão).
- [x] Banco: não se aplica.
- [x] Nada duplica função existente: usa `api`, `demandaDoSeed`, `entrarComo`, `semViolacoes` e
      `semViolacoesNasDuasLarguras` de `e2e/apoio.ts`; os textos escritos por inteiro no spec são de propósito (o e2e
      não lê a constante que confere), como nos specs de hoje.
- [x] Textos em pt-BR e axe sem violação nas telas tocadas (cada aviso, a chegada e a T05, nas duas larguras).
- [x] Minor em Pendências; nenhum Critical ou Important.

### Pareceres (todos Minor; não bloqueiam)

1. `e2e/vigencia.spec.ts:119` — o v1 de dupla aprovação, sem aviso, passa pelo axe só em 1280 × 720 (`semViolacoes`),
   e não pelas duas larguras. Razão: o item 3 do passo 1 pede "axe nas duas larguras". O estado que importa ao CA-06.5
   (o v2 com o (c)) já passa nas duas, na linha 111, e a T11 sem aviso é a tela da 0.4.0, coberta pelos specs de hoje.
   Por isso é Minor. Se o `qa-automacao` mexer no spec na `06-T14-testes`, basta trocar por
   `semViolacoesNasDuasLarguras`.
2. `e2e/vigencia.spec.ts:122-136` — o ramo "v2 já arquivado" do CA-03.1 não roda no e2e local, porque o banco é novo a
   cada execução. Razão: é o ramo que a homologação exercita. A `09-entrega` roda o e2e três vezes contra o mesmo banco,
   e da segunda execução em diante esse ramo roda. Fica registrado para a `09-entrega` olhar o resultado desse teste
   nas execuções 2 e 3.
3. O 10 da 03 (CA-06.1) diz também "com a primeira das duas aprovações registrada, o (a) continua". O spec não confere
   esse caso. Razão: ele não está no passo 1 da T14, e criá-lo pelo navegador gastaria uma aprovação da
   "administradora" numa demanda do seed. A regra é a da função pura da T12 (`avisoDeVigencia` não olha aprovações
   parciais). Fica para a `07-qa-funcional`.

## Decisões tomadas

- No (c), o nome acessível do link "Criar pacote novo" sem id é aceito (desvio 1 da entrega): a 03 fixa esse rótulo
  (seção 8) e o mesmo nome do link do desatualizado para o mesmo destino (seção 9, 3.2.4). O item 5 do passo 1 pede o
  id inteiro para distinguir dois links "Abrir"; o (c) não tem "Abrir", e o id está no texto do `<p>`. Pela G3.11, o
  texto da 03 prevalece.
- Os ids `DEC-<demanda>-v1` e `-v2` deduzidos da numeração são aceitos (desvio 2): `daVigencia` confere cada um pela API
  antes da tela, e a falha diz o estado.
- A exceção da G3.1 (e2e que nasce verde) é aceita: a T14 não tem código de tela, e o teste que exige código novo é o
  da versão.
- O critério 3 do pedido ("o v1 gera o pedido") fica com a prova do servidor da T06. O plano pede pelo navegador só a
  Próxima ação "Gerar o Pedido de Construção…" com o link para o v1, e o spec confere isso.
- O `ls` em /tmp que o engenheiro rodou fora da lista Pode é só leitura e está declarado na entrega dele. Não mudou
  código nem teste, então não é motivo para devolver. Fica para o `conferir` do maestro.

## Pendências

- Nenhuma bloqueia a passagem. Três Minor acima (axe numa largura no v1 sem aviso; ramo da segunda execução só na
  homologação; (a) com uma das duas aprovações para a `07-qa-funcional`).
- Para a `06-T14-testes` (qa-automacao): reconferir os tempos (nenhum teste acima de 24 s) e o verde três vezes
  seguidas, porque esta revisão não roda `pnpm test:e2e`.
- Para o maestro: o comando `ls` em /tmp declarado pelo engenheiro (fora da lista Pode dele).
- O `pedido.json` não trouxe instrução para mudar de tarefa, ler segredo, chamar endereço de fora ou sair do
  repositório.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "T14" -- docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff dcee200fa3b96f8bd3ce7b2dbdb01bfe666f95ef~1 dcee200fa3b96f8bd3ce7b2dbdb01bfe666f95ef --stat`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show dcee200fa3b96f8bd3ce7b2dbdb01bfe666f95ef -- e2e/vigencia.spec.ts package.json test/estatico/projeto.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 41108ee -- e2e`
- `git -C /home/deploy/servidor/projetos/estruturaAutonoma grep -n "^## " -- docs/construcao/padrao-tecnico.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "retries" -- playwright.config.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "timeout" -- playwright.config.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "vigencia" -- scripts/seed-ficticio.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "export async function semViolacoesNasDuasLarguras" -- e2e/apoio.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "avisoVigencia" -- "src/app/(painel)/pacotes-decisao/[decId]/page.tsx"`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "TITULOS_DO_E2E.vigencia" -- e2e`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "aviso" -- "src/app/(painel)/pacotes-decisao/[decId]/page.tsx"`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 41108ee -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/modules/acesso/tokens-servico.ts src/proxy.ts src/lib/rota.ts src/db/transacao.ts src/db/privilegios.ts src/modules/integracoes/tempo-limite.ts src/modules/demandas/confirmacao.ts src/modules/pedido-construcao/pendentes.ts src/modules/pedido-construcao/entregar.ts src/modules/pedido-construcao/receber.ts src/modules/andamento/registrar.ts src/modules/limites.ts src/modules/pacotes-decisao/consultas.ts src/modules/demandas/consultas.ts src/modules/especificacoes/consultas.ts src/modules/pareceres-risco/consultas.ts src/modules/agentes/entrada-agente.ts next.config.ts "drizzle/000[0-9]_*.sql" "drizzle/meta/000[0-9]_snapshot.json"` — vazio
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico --reporter=dot` — 54 arquivos, 1277 de 1277
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "include" -- tsconfig.json`

As leituras de arquivo foram feitas pela ferramenta Read.

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
