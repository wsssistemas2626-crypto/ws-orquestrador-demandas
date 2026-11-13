---
pedido: DEC-DEM-20261111-0017-v1
etapa: 06-T08-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12), 05-tech-lead.md, tarefas.json, docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md (T08, linhas 2044 a 2199), 06-T08-engenheiro-backend.md, 06-T07-qa-automacao.md (Pendências), 06-T07-tech-lead.md (Pendências), 06-T07-engenheiro-backend.md (Pendências), passagens.jsonl (linhas da 06-T08, por busca), commit 672e01c6553be24cafe9a8f6cd01d4ea4e1e03bd (git show), src/app/api/pedidos-construcao/[decId]/andamento/route.ts, src/app/api/pedidos-construcao/andamento.test.ts, src/app/api/pedidos-construcao/andamento-422.test.ts, test/transversal/sentinelas-andamento.test.ts, test/pedidos-construcao.ts (diff), test/estatico/piso-de-assercoes.test.ts (diff), test/requisicao.ts, src/lib/rota.ts (80 a 189), src/lib/rota-corpo-invalido-qa.test.ts (325 a 367), test/estatico/andamento-qa.test.ts (IMPORTAM_REGISTRAR), src/modules/andamento/registrar-qa.test.ts (casos do teste 1), estruturaAutonoma/ferramentas/construir/lib/andamento.mjs, estruturaAutonoma/ferramentas/construir/lib/buscar-pedidos.mjs (1 a 90)]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Parecer da revisão da T08 (rota `POST /api/pedidos-construcao/[decId]/andamento`), sobre o commit `672e01c`. Os dois
commits seguintes (`54f27f0` e `bcb0f35`) só mudam `passagens.jsonl`.

**Resultado: aprovado.** Não há Critical nem Important. Ficam três Minor, em Pendências.

### Os quatro pontos pedidos pelo maestro

1. **O 404 pela rota real é igual, byte a byte, ao do DEC inexistente (pendência da 06-T07-qa): cumprido.**
   - `andamento.test.ts:196-257` repete pela rota real os oito casos do teste 1 de `registrar-qa.test.ts:204-211`, com
     os mesmos nomes e a mesma ordem. Os casos são: fora do formato, sem pedido gerado, substituído sem pedido, de outra
     demanda, pedido gerado por agente, por sistema, por pessoa na entidade `demanda` e por pessoa sem `demanda_id`.
   - Cada caso vai com dois corpos, e a `foto` (status, cabeçalhos sem `date`, corpo em texto) é comparada com a de
     `DEC-DEM-20991231-9999-v1`.
   - A lista de cabeçalhos do 404 está fixada (`:233`). O 404 de `DEC-xyz` sai da regex em `rota.ts:152-154`, antes do
     ator. Os outros sete saem do serviço. As duas origens dão a mesma resposta, e o teste prova isso.
   - Nada muda, e o controle com o DEC da vítima recebe 204 e grava (`:254-256`). Nenhuma asserção ficou mais fraca que
     a da 06-T07-qa.
2. **A rota usa o mesmo contrato que o /construir envia: cumprido.**
   - `enviarAndamento` (`andamento.mjs:101-109`) chama `chamar` (`buscar-pedidos.mjs:56-64`). A requisição sai com:
     - método POST;
     - `authorization: Bearer`, `accept: application/json` e `content-type: application/json`;
     - nenhum `Origin` nem cookie;
     - o corpo `JSON.stringify(andamento)`.
   - `chamadasDoConstruir.andamento` (`test/pedidos-construcao.ts:98-107`, com `test/requisicao.ts`) monta a mesma
     requisição. O `encodeURIComponent` do helper não muda nada num DEC que passa no `RE_DEC`.
   - O corpo do CA-02.1 é conferido como o texto exato e como `JSON.stringify(CORPO_CONSTRUINDO)`
     (`andamento.test.ts:37` e `:113`).
   - A resposta é 204 com corpo vazio. O `/construir` aceita 204 ou 200 (`andamento.mjs:114`).
   - A tabela `situacaoNoConstruir` (`andamento.test.ts:63-68`) é igual, linha a linha, a `andamento.mjs:114-117`.
     Ela foi exercitada com as respostas reais: 204, 404 do DEC inexistente, 404 do DEC sem pedido, 409, 422, 400 e
     429.
3. **O limite responde 429: cumprido.** São seis casos (`andamento.test.ts:329-410`):
   - por DEC, com o corpo `LIMITE_ANDAMENTO.porDec`;
   - total, com o corpo `LIMITE_ANDAMENTO.total`, e com a borda 600/601 exata (D-14), o que é mais forte que o plano;
   - o mesmo estado no limite recebe 204 sem gravar;
   - 200 envios iguais gravam 1 linha e 1 marco;
   - o DEC A no limite não segura o DEC B;
   - o ritmo de 2 min;
   - a concorrência dá `[204, 429]`.

   O 429 leva o `/construir` a `erro`, e ele repete na próxima volta, como manda o plano (caso 10).
4. **O 422 só aparece nesta rota: cumprido.**
   - Fora de teste, só `src/app/api/pedidos-construcao/[decId]/andamento/route.ts:15` passa `corpoInvalido` ao
     `rota()`, e passa a constante `CORPO_INVALIDO_ANDAMENTO`. Os outros arquivos que citam a opção são `src/lib/rota.ts`
     e `src/modules/andamento/schemas.ts`.
   - A guarda `rota-corpo-invalido-qa.test.ts:354-361` (`PODEM_CITAR`) quebra se outra rota passar a usar a opção, e
     passou nesta revisão.
   - As outras rotas continuam com o 400 `entrada_invalida` do Zod.
   - Os 422 `nao_processavel` de `pacotes-decisao/[decId]/pedido` e `pedidos-construcao/[decId]/entrega` já existiam na
     0.3.0. São erros de domínio, com `MENSAGENS_PEDIDO`, e não foram tocados: a G4 está vazia e o diff só tem arquivos
     da T08.
   - `andamento-422.test.ts` prova o 422 antes do DEC:
     - o serviço é trocado por um que falha se for chamado;
     - os 22 corpos dão a mesma `foto` para o DEC com pedido gerado e para o inexistente;
     - não há nenhuma chamada ao serviço;
     - o controle mostra que o mock está ligado (1 chamada, com o `decId` e o corpo).

### Checklist da seção 12

| Item | Situação |
|---|---|
| Faz o que o plano pede, nem mais nem menos | Sim. `route.ts` é o passo 3 do plano, sem mudança. Os desvios da entrega só reforçam o teste, e cada um está justificado: o `atorTipo: 'anonimo'` no 404 da regex e no 415 é o comportamento do `rota()` (`rota.ts:147-160`), os 8 casos do 404 vêm em vez de 4, os 22 corpos do 422 em vez de 13, e há a borda 600/601. Mudaram só os 6 arquivos da tarefa. |
| Teste para cada comportamento, que falharia sem o código | Sim. A falha antes da rota está na entrega, e a mutação plantada (sem `params` e sem `corpoInvalido`) derrubou 25 testes. |
| Sem segredo, `.env` ou dado pessoal real | Sim. Os tokens nascem em tempo de teste e não aparecem em mensagem de `expect`. As sentinelas cobrem pino, console, Sentry, respostas, `pgboss`, `andamento_construcao` e `evento`. |
| Entrada externa validada com Zod; erro sem vazar detalhe | Sim. O caminho passa por `paramId.versao('decId', 'DEC')`, o corpo por `corpoAndamentoSchema` (strict), e o 422 tem mensagem fixa e não ecoa o corpo. O 409 não cita o v2 nem o status (`andamento.test.ts:270` e `:280`). |
| Banco: migration, migrator, RLS | Não se aplica. A T08 não tem migration, e a G4 de `0ac099a` a `672e01c` está vazia. |
| Nada duplica função existente | Duplicação pequena em helper de teste (Minor 1). Não há duplicação no código que roda. |
| Textos em pt-BR; axe | Não se aplica. A T08 não tem tela, e as mensagens vêm das constantes da T04 e da T07. |
| Minor em Pendências | Sim, abaixo. |
| PR: `/code-review` e `/security-review` | São da `08-revisao` e do PR, não desta etapa. |

### Verificação própria

- A pasta da rota, as guardas estáticas, `rota-corpo-invalido-qa` e as duas matrizes de rotas rodaram juntas: 51
  arquivos e 1287 testes passaram.
- `pnpm typecheck` e `pnpm lint` estão limpos.
- `git status` está limpo.
- O `PISO` (95, 11 e 20) passou junto com `test/estatico`.

## Decisões tomadas

- **Aprovar sem devolver.** Os quatro pontos do maestro estão provados por teste que roda pela rota real, e os Minor não
  mudam o comportamento.
- **O `atorTipo: 'anonimo'` do 404 da regex e do 415 é aceito como desvio do plano.** O plano errou ao pedir
  `integracao` em toda linha: o `rota()` resolve o ator depois da regex e da conferência de `content-type`
  (`rota.ts:152-159`), e a T08 não pode mudar o `rota()`.
- **Não exigir que a tabela do `/construir` importe o `.mjs`.** O plano proíbe essa importação, para o repositório não
  depender da estruturaAutonoma. O risco de a cópia divergir fica registrado como Minor 2.
- **Não rodar o `pnpm test` completo de novo.** A entrega traz 7422 de 7422, e depois do `672e01c` só mudou
  `passagens.jsonl`. O que a T08 toca rodou nesta revisão.

## Pendências

- Nenhuma bloqueia a passagem.
- **Minor 1, para a `08-revisao`: duplicação em helper de teste.**
  - Arquivos: `andamento.test.ts:53` e `andamento-422.test.ts:61` (a `foto`), e `andamento.test.ts:59` e
    `test/transversal/sentinelas-andamento.test.ts:74` (o `textoDepoisDoPrefixo`).
  - Problema: as duas funções já existem em `visibilidade-agente-0019.test.ts:90` e em `sentinelas.test.ts:488`, sem
    exportação. A T08 fez a terceira e a quarta cópia.
  - Razão: o critério do byte a byte (que cabeçalho sai da comparação) e o tamanho do prefixo do token passam a morar em
    quatro lugares. Se um deles mudar e os outros não, o teste pode passar sem comparar o que deveria.
  - Correção: exportar as duas de `test/requisicao.ts` e de `test/integracoes.ts`, numa tarefa que possa mexer nos
    testes existentes (a G5 não deixa a T08).
- **Minor 2, para a `10-documentacao` e para quem mexer no `/construir`: a tabela do `/construir` é uma cópia.**
  - Arquivo: `andamento.test.ts:63-68` (`situacaoNoConstruir`).
  - Problema: a tabela copia `andamento.mjs:114-117`. Se o `/construir` mudar o que faz com um status, por exemplo se o
    429 passar a valer como `recusado`, este teste continua verde.
  - Razão: o plano proíbe importar o `.mjs`, então a única proteção é a disciplina de alterar os dois juntos.
  - Correção: o manual da 0.4.0 deve dizer que o contrato de status mora nos dois lugares.
- **Minor 3: o relógio compartilhado avança 60 min.**
  - Arquivo: `andamento.test.ts:395` (o `relogio.avancar` do CA-12.4).
  - Problema: o relógio do arquivo inteiro anda 60 min (30 × 2 min). Hoje isso não faz mal: todo caso seguinte calcula
    as datas a partir de `relogio.agora()`, e os tokens não expiram.
  - Razão: um caso futuro com data absoluta (por exemplo, `relogio.agora()` lido antes do `describe`) ficaria
    dependente da ordem.
  - Correção: um relógio próprio no caso, ou um comentário no topo do `describe` do limite.
- **Para a `06-T08-testes` (qa-automacao):**
  - nada falta do plano;
  - se quiser reforçar, confira que o 503 de `sentinelas-andamento.test.ts:122-131` depende do nome da trava
    (`pedido:<decId>`). Se a T07 mudar o nome, o teste quebra, e não passa no vazio, porque exige 503;
  - a leitura do Awave com a chave `andamento` é da T09.
- **Herdado, para a `08-revisao`:** o Minor 2 da 06-T04-revisao (o comentário de topo de
  `src/lib/rota-corpo-invalido.test.ts`) continua aberto.
- **Para o maestro (forma de comando).** Rodei dois comandos só de leitura fora da forma da lista Pode. Nenhum alterou
  nada, e os dois estão em Comandos executados do jeito que rodaram. Peço a liberação como leitura (regra de 25/10):
  - um `git grep` com `\|` no padrão (alternativa), para achar os títulos das tarefas no plano;
  - um `git -C` na estruturaAutonoma (`git grep` em `padrao-tecnico.md`), que eu deveria ter lido com a ferramenta
    Read. Logo depois li a seção 12 pelo Read.
- O texto do pedido não trouxe instrução para mudar de tarefa, ler segredo, chamar endereço de fora ou sair do
  repositório.

## Comandos executados

- `ls /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1` — entregas da pasta do pedido
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 672e01c6553be24cafe9a8f6cd01d4ea4e1e03bd` — 8 arquivos, todos da tarefa ou do registro
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "^### Task\|^## T\|^### T0\|^### T1" -- docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md` — títulos das tarefas no plano (fora da forma: alternativa; só leitura)
- `git -C /home/deploy/servidor/projetos/estruturaAutonoma grep -n "^## 12" -- docs/construcao/padrao-tecnico.md` — linha da seção 12 (fora da forma: `-C` na estruturaAutonoma; só leitura)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 672e01c6553be24cafe9a8f6cd01d4ea4e1e03bd -- src/app/api/pedidos-construcao/[decId]/andamento/route.ts test/pedidos-construcao.ts test/estatico/piso-de-assercoes.test.ts` — a rota e os dois arquivos modificados
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "corpoInvalido" -- src` — fora de teste: só `rota.ts`, `schemas.ts` e a rota do andamento
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "nao_processavel" -- src test` — os outros 422 são de domínio, da 0.3.0
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "422" -- src/lib` — o código só aparece em `erros.ts` e nos testes do `rota()`
- `grep -rn "T08" /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1` — pendências das etapas anteriores para a T08
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A4 "IMPORTAM_REGISTRAR =" -- test/estatico/andamento-qa.test.ts` — sem resultado (o padrão não casou)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "\['" -- src/modules/andamento/registrar-qa.test.ts` — os oito casos do teste 1 da 06-T07-qa
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A3 "IMPORTAM_REGISTRAR" -- test/estatico/andamento-qa.test.ts` — só a rota importa o serviço
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:test/requisicao.ts` — `content-type`, `Origin` e corpo em texto do helper
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -4` — `672e01c`, `54f27f0` e `bcb0f35` sobre `d6f1ac9`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 0ac099a 672e01c6553be24cafe9a8f6cd01d4ea4e1e03bd --stat -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/modules/acesso/tokens-servico.ts src/proxy.ts src/db/transacao.ts src/modules/integracoes/tempo-limite.ts src/modules/demandas/confirmacao.ts src/modules/agentes/entrada-agente.ts src/modules/especificacoes/consultas.ts src/modules/pareceres-risco/consultas.ts src/modules/pacotes-decisao/consultas.ts next.config.ts drizzle/000[0-7]_*.sql drizzle/meta/000[0-7]_snapshot.json` — vazio (G4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 672e01c6553be24cafe9a8f6cd01d4ea4e1e03bd HEAD` — só `passagens.jsonl`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/pedidos-construcao test/transversal/sentinelas-andamento.test.ts test/estatico src/lib/rota-corpo-invalido-qa.test.ts test/matriz-rotas.test.ts test/matriz-rotas-integracoes-qa.test.ts --reporter=dot` — 51 arquivos, 1287 de 1287
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "function foto" -- src test` — a `foto` já existia em `visibilidade-agente-0019.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "textoDepoisDoPrefixo =" -- src test` — já existia em `sentinelas.test.ts`

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
