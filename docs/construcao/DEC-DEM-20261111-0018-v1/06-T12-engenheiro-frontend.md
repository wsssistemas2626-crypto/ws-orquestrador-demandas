---
pedido: DEC-DEM-20261111-0018-v1
etapa: 06-T12-construcao
agente: engenheiro-frontend
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md (G0 a G10 e T12), 03-ux-ui-design.md (seções 0 a 10), 02-arquiteto-solucoes.md, 04-seguranca-aplicacao.md e a spec 2026-11-13-ws-orquestrador-demandas-sobras-design.md (SB-12 e ADR-40, por git grep), 06-T06-engenheiro-backend.md, 06-T11-engenheiro-frontend.md, 06-T11-tech-lead.md, 06-T11-qa-automacao.md (linhas 1 a 30), src/components/dados-da-decisao.ts, src/components/dados-da-decisao.test.ts (linhas 1 a 80, 540 a 594 e 695 a 712), src/components/textos-0018.test.ts, src/components/rotulos.ts (linhas 1 a 40), src/components/dados-das-etapas.ts (linhas 1 a 40), src/components/Alerta.tsx, src/modules/demandas/arquivamento.ts, src/modules/pacotes-decisao/substituido.ts, src/app/(painel)/pacotes-decisao/[decId]/page.tsx, FormularioDecisao.tsx, pacote-da-pagina.ts, pagina.test.ts (linhas 1 a 215, 293 a 452 e 1005 a 1103), nivel-do-pedido.test.ts (linhas 1 a 70), recebimento-qa.test.ts (linhas 1 a 45), src/app/(painel)/demandas/[id]/demanda-da-pagina.ts, test/estatico/importacoes.ts, test/estatico/arquivamento.test.ts, test/estatico/piso-de-assercoes.test.ts (linhas 160 a 263), test/estatico/piso-de-assercoes-0018.test.ts, test/sentinelas.ts, e2e/decisao-botoes.spec.ts (linhas 255 a 304), e2e/decisao.spec.ts (linhas 300 a 380), saídas do pnpm test e do pnpm test:e2e em /tmp]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T12 (SB-12; RF-03, RF-05, RF-06; CA-03.6, CA-05.1, CA-06.1 a CA-06.4; ADR-40; D-10 a D-13): na T11, os três avisos da
vigência, a dica do Arquivar pelo destino da tabela do servidor e a chegada depois de arquivar pelo status gravado da
demanda, com os textos da 03, seção 8 (e 4.2, 4.6, 4.7), por inteiro.

### Arquivos alterados

Código:
- `src/components/dados-da-decisao.ts`:
  - `TEXTOS_DECISAO` ganha `avisoVigente(v)`, `avisoMaisNovoPendente(p)`, `avisoNivelMenor(v)`,
    `dicaArquivarSemMudanca(status)`, `dicaArquivarAprovada(v)`, `dicaArquivarEmAnalise(v)`,
    `sucesso.arquivadaAprovada(v)` e `sucesso.arquivadaEm(status)`. `dicaArquivar`, `sucesso.arquivada` e
    `criarPacoteNovo` não mudam.
  - Novos: `ContextoDaVigencia`, `AvisoDeVigencia`, `avisoDeVigencia(p, c)` (o código da T12 do plano), `dicaDoArquivar(destino,
    statusAtual, vigenteId)` (`switch` com `never` sobre o destino), `ContextoDaChegada` e o terceiro argumento de
    `chegadaNaDecisao(params, p, c)`.
  - O rótulo de status sai só de `ROTULO_STATUS` com `Object.hasOwn`. O id do vigente da dica e da chegada passa por
    `RE_ID_DEC`. Fora disso, as funções lançam um `Error` com texto fixo, sem o valor (D-13). Nos avisos, o id fora do
    formato faz o aviso não aparecer (SB-12).
  - Continua sem importar valor de `src/modules/`: só `import type { Status }` de `modules/demandas/schemas` (D-11).
    `RE_ID_DEC` vem de `./dados-do-pacote`, `RE_ID_DEMANDA_NA_TELA` de `./dados-das-etapas` e `ROTULO_STATUS` de
    `./rotulos`.
- `src/app/(painel)/pacotes-decisao/[decId]/page.tsx`:
  - Depois de `recebidoEm`, com o mesmo `db`: `vigenteDaDemanda(db, p.demandaId)`.
  - `lerPacoteDaPagina(maisNovo.id)` só com o aberto vigente e o mais novo outro, pendente e não desatualizado (D-12).
  - Calcula `avisoDeVigencia`, `dicaDoArquivar(destinoDoArquivamento(d.status, estadoDoVigente(vigente)), …)` e
    `chegadaNaDecisao(…, { statusDaDemanda: d.status, vigente })`.
  - O aviso é um `Alerta` `atencao` sem `role`, com o `<p>` em `[overflow-wrap:anywhere]` e o link com
    `CLASSE_LINK_SOLTO`. Fica entre o aviso do substituído e o alerta de desatualizado.
  - A página passa `dicaArquivar` ao formulário.
- `src/app/(painel)/pacotes-decisao/[decId]/FormularioDecisao.tsx`: prop nova `dicaArquivar: string`, mostrada no
  `<p id="decisao-consequencia-arquivar">` no lugar de `t.dicaArquivar` (D-10). O id e o `aria-describedby` não mudam.

Testes novos:
- `src/components/dados-da-decisao-vigencia.test.ts` (34 testes, 64 linhas com `expect(`):
  - os textos exatos da 03, seção 8;
  - os avisos (a), (b) e (c) dos CA-06.1 a CA-06.3, com o link de cada um;
  - os filtros da 4.2 e o CA-06.4;
  - SB-12 (d): id do vigente, do pendente ou da demanda fora do formato;
  - a dica nas linhas 1 a 4 da 4.6, com status fora de `ROTULO_STATUS` e destino fora da tabela lançando;
  - a chegada da 4.7, inclusive `?aviso=` com texto livre;
  - SB-12 (a, b): nenhum nome de pessoa nem sentinela.
- `src/app/(painel)/pacotes-decisao/[decId]/pagina-vigencia.test.ts` (22 testes, 69 linhas com `expect(`):
  - oráculo da G9: sessão negada, `ler_pacote_decisao` negado e DEC inexistente não leem o vigente nem o mais novo;
  - o vigente é lido uma vez, depois de autorizar e de ler o pacote, sem ação nova na matriz;
  - os três avisos no HTML (Alerta estático, `<p>` e link solto), CA-06.4 e o v1 substituído só com o aviso dele;
  - a ordem da faixa: resultado, lembrete, (b), desatualizado, rascunho; e resultado, (a) ou (c), rascunho;
  - SB-12 (c): os botões e os atributos `disabled`/`aria-disabled` são iguais com e sem cada aviso;
  - D-12: quando o mais novo é lido e quando não é, inclusive a corrida em que ele já não está pendente;
  - a dica na página igual a `dicaDoArquivar` para o destino lido, em seis estados, e a chegada pelo status lido.
- `test/estatico/vigencia-t11.test.ts` (15 testes, 25 linhas com `expect(`):
  - em `PaginaDecisao`, a ordem `exigirPessoaNaPagina` → `autorizar(pessoa, 'ler_pacote_decisao')` →
    `lerPacoteDaPagina(decId)` → `notFound()` → `vigenteDaDemanda` → `lerPacoteDaPagina(maisNovo.id)`;
  - a leitura do vigente aparece uma vez e vem de `pacotes-decisao/substituido`;
  - nenhum `dangerouslySetInnerHTML` em `page.tsx`, `FormularioDecisao.tsx` e `dados-da-decisao.ts`;
  - `dados-da-decisao.ts` sem valor de `src/modules/`;
  - um caso plantado para cada regra.

Testes existentes (G5 e desvios abaixo):
- `src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts`: só o `vi.mock` de `modules/pacotes-decisao/substituido`,
  com `vigenteDaDemanda` dublê que devolve `null`. A asserção da linha 313 ("vai para Encerrada") passa sem mudança.
- `src/components/dados-da-decisao.test.ts`: as chamadas de `chegadaNaDecisao` ganham o terceiro argumento:
  `{ statusDaDemanda: 'encerrada', vigente: null }` nos casos de arquivada e
  `{ statusDaDemanda: 'pronta_para_decisao', vigente: null }` nos outros. Nenhuma asserção mudou: 206 linhas com
  `expect(` antes e depois.
- `test/estatico/piso-de-assercoes.test.ts`: só acréscimo das três entradas novas (64, 69 e 25).

### TDD

Com os três testes novos escritos e sem o código:
`pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-da-decisao-vigencia.test.ts "src/app/(painel)/pacotes-decisao/[decId]/pagina-vigencia.test.ts" test/estatico/vigencia-t11.test.ts --reporter=dot`
→ **43 falharam e 28 passaram, de 71**. Trechos:

```
⎯⎯⎯⎯⎯⎯ Failed Tests 43 ⎯⎯⎯⎯⎯⎯⎯
 FAIL  src/components/dados-da-decisao-vigencia.test.ts > textos exatos da 03, seção 8 (CA-05.1, CA-06.5) > os três avisos
TypeError: TEXTOS_DECISAO.avisoVigente is not a function
 FAIL  src/components/dados-da-decisao-vigencia.test.ts > textos exatos da 03, seção 8 (CA-05.1, CA-06.5) > a dica do Arquivar (4.6) e o sucesso depois de arquivar (4.7)
TypeError: TEXTOS_DECISAO.dicaArquivarSemMudanca is not a function
 FAIL  src/components/dados-da-decisao-vigencia.test.ts > aviso (a): o DEC pendente mais novo com um aprovado em vigor (CA-06.1) > v2 cto_e_administradora pendente, vigente v1 cto: o texto com o id do v1 e o link para ele
TypeError: avisoDeVigencia is not a function
```

Os 28 que passaram antes do código não dependem dele:
- os casos plantados e as guardas do estático que o código de hoje já cumpre (sem `dangerouslySetInnerHTML`, sem
  valor de `src/modules/`);
- os negativos da página: nenhum aviso no CA-06.4; o mais novo não lido nos casos do D-12; nenhuma leitura com a
  sessão negada.

Depois do código, uma asserção do próprio teste da página foi corrigida: no teste do aviso (c) do bloco SB-12 (c), o
`disabled` passou a ser procurado como atributo do botão (`\s(?:disabled|aria-disabled)(?:=|\s|>)`), e não em qualquer lugar da tag. A
`class` do `Botao` tem as variantes `disabled:` e `aria-disabled:`, e a forma antiga falhava sempre. A correção não
tirou nenhuma asserção.

### Resultados

- Arquivos da tarefa, isolados: 7 arquivos, 184 passaram e 1 falhou, de 185. A falha era a asserção do `disabled`
  corrigida acima. Depois da correção, `pagina-vigencia.test.ts` passou com 22 de 22.
- Piso e estático: `piso-de-assercoes`, `piso-de-assercoes-0018` e `vigencia-t11` passaram com 198 de 198.
- `pnpm test` completo, em segundo plano: 389 arquivos, **8388 de 8388**, 0 falha (227 s).
- `pnpm typecheck` e `pnpm lint`: limpos.
- `pnpm test:e2e` completo (retries 0, 1 worker): **290 passaram, 9 pulados (`capturas.spec.ts`, como hoje), 0 falha**,
  em 10,4 min, com saída 0.
  - O `✘` do `vigia.spec.ts:5` ("CV-03 (negativo)") é a falha esperada do próprio teste e conta entre os 290.
  - O maior teste levou 11,7 s (`pedido-construcao.spec.ts:264`, C-28). Nenhum passou de 24 s.
  - Telas tocadas da T11 que passaram, com o axe sem violação onde o teste o roda:
    - "Arquivar → Encerrada" (`decisao.spec.ts:455`), com a chegada `sucesso.arquivada` sem mudança;
    - a substituição (`decisao.spec.ts:305`). Pela regra, a T11 do v2 pendente passa a mostrar o aviso (a) antes da
      aprovação. O spec não confere o aviso (isso é da T14), mas o fluxo de aprovar pela tela passou com ele na página;
    - o desatualizado (`decisao.spec.ts:420`, `decisao-botoes.spec.ts:278` e `decisao-celular.spec.ts:371`);
    - o caminho completo do 0.1.13 (`pedido-construcao.spec.ts:344`);
    - as T11 do `axe-todas.spec.ts`.
- G4: o `git diff 41108ee -- …` das superfícies congeladas saiu **vazio**. `substituido.ts`, `arquivamento.ts`,
  `decidir.ts` e `transicoes.ts` não foram tocados.

### Desvios do plano

1. `src/app/(painel)/pacotes-decisao/[decId]/nivel-do-pedido.test.ts` e `recebimento-qa.test.ts` também renderizam a
   T11 com o banco dublê (`{ dubleDoBanco: true }`). Sem dublê, a `vigenteDaDemanda` real chamaria `db.select` no dublê
   e quebraria os dois. Por isso receberam o mesmo `vi.mock` de `pagina.test.ts`, com `vigenteDaDemanda` devolvendo
   `null`. A G5 citava só `pagina.test.ts`. Nenhuma asserção mudou: as linhas com `expect(` continuam 9 e 21. Nenhum dos
   dois está no `PISO`.
2. Em `page.tsx`, o mais novo lido de novo só vira `pendenteMaisNovo` se ainda estiver `pendente`. Isso cobre a corrida
   em que ele é decidido entre a leitura da demanda e a dele. O esboço do plano não tinha essa conferência. O caso está
   coberto em `pagina-vigencia.test.ts` ("corrida").
3. O terceiro argumento de `chegadaNaDecisao` tem tipo exportado com nome, `ContextoDaChegada`. A assinatura é a da G7.
4. O estático também confere que `lerPacoteDaPagina(maisNovo.id)` vem depois da leitura do vigente, aparece uma vez, e
   de onde vem a importação de `vigenteDaDemanda`. São acréscimos ao esboço do plano.
5. `e2e/decisao-botoes.spec.ts:285`, da linha da G5 que só valia em um caso: **não mudou**. A demanda
   `decisaoDevolverComOpcao` do `decDesatualizado` não tem aprovado vigente e está numa origem do arquivamento. Por isso
   o destino é Encerrada, e a descrição acessível continua "Arquivar: a demanda vai para Encerrada.". O teste "CA-11.3"
   passou sem mudança no `pnpm test:e2e`.

## Decisões tomadas

- Um bloco só para os três avisos, entre o do substituído e o de desatualizado. `avisoDeVigencia` devolve no máximo um
  aviso, e o (b) nunca aparece com o do substituído, porque um é do vigente e o outro do substituído. A ordem da 4.2 fica
  garantida, e a página tem um `Alerta` a menos.
- `dicaDoArquivar` usa um `switch` com `never` sobre o destino (G3.4). Os seis status que a tabela do arquivamento nunca
  devolve lançam, e status novo quebra o `typecheck`. Assim a dica não cai num texto errado.
- As mensagens dos `Error` de D-13 são fixas e não levam o valor (status ou id). Assim, o valor incoerente não chega ao
  log nem ao Sentry.
- A chegada de "aprovada" sem vigente, ou com vigente desatualizado, usa "está em Aprovada" (linha "qualquer outro" da
  4.7). Só o vigente atualizado leva ao texto com `<v>`.
- `vigenteDaDemanda` ficou dublê em todo teste que renderiza a T11 com o banco dublê. Assim o teste não depende de
  banco, e a regra é provada por `pagina-vigencia.test.ts` e pelos testes do servidor da T06.
- Os três testes novos entram no `PISO` (G3.9): são o teste de segurança do SB-12 e o oráculo da G9.

## Pendências

- Para o tech-lead: ratificar os desvios 1 a 4 acima. Os dois testes da página só ganharam o dublê, e nenhuma asserção
  saiu.
- Para a T14 (plano, "axe na T14"): o e2e com as demandas da vigência do seed (`vigenciaComPendente`,
  `vigenciaNivelMenor`, `vigenciaArquivar`) e o axe com cada aviso em 1280 × 720 e 390 × 844. Nenhum e2e de hoje
  confere um aviso nem roda o axe com um aviso na página. O seed da T10 tem as demandas, mas os specs que as usam são
  da T14. Nesta tarefa, o axe passou nas telas da T11 que os specs de hoje já conferem.
- Para a `07-qa-funcional` (G2): foco, teclado e leitor de tela nos três avisos, na dica e na chegada, à mão (03,
  seções 4 e 9).
- Fora deste pedido (03, Pendências): a dica do Devolver também é falsa com a demanda fora das origens de
  `decisao_devolvida`. Não mudou aqui.
- O texto do `pedido.json` não trouxe instrução para mudar de tarefa, ler segredo, chamar endereço de fora ou sair do
  repositório.

## Comandos executados

- `ls /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0018-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "T12" -- docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "^#" -- docs/construcao/DEC-DEM-20261111-0018-v1/03-ux-ui-design.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "vigenteDaDemanda\|VigenteDaDemanda" -- src/modules/pacotes-decisao/substituido.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "export const RE_ID_DEC\|export const RE_ID_DEMANDA_NA_TELA\|export const ROTULO_STATUS\|export const RE_ID_DEMANDA\b" -- src`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "SB-12\|dicaDoArquivar\|chegadaNaDecisao\|avisoDeVigencia\|ADR-40" -- docs/superpowers/specs/2026-11-13-ws-orquestrador-demandas-sobras-design.md docs/construcao/DEC-DEM-20261111-0018-v1/04-seguranca-aplicacao.md docs/construcao/DEC-DEM-20261111-0018-v1/02-arquiteto-solucoes.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "vi.mock\|^import\|^const \|^function \|^async function \|describe(\|vi.hoisted\|beforeEach\|obterDeps\|recebimento" -- "src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts"`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A8 "export type PacoteResumo" -- src/modules/demandas/consultas.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "chegadaNaDecisao" -- src test e2e`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "Object.hasOwn" -- src`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -ln "pacotes-decisao/\[decId\]/page'\|from './page'" -- src test`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "vi.mock\|obterDeps\|testcontainers\|criarBanco\|bancoDeTeste" -- "src/app/(painel)/pacotes-decisao/[decId]/nivel-do-pedido.test.ts" "src/app/(painel)/pacotes-decisao/[decId]/recebimento-qa.test.ts"`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files test/estatico`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "0018\|T06\|T09\|^const PISO\|^};\|arquivamento" -- test/estatico/piso-de-assercoes.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -5`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A20 "async function decDesatualizado" -- e2e`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "vai para Encerrada\|dicaArquivar\|foi para Encerrada" -- e2e src test scripts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "Object.keys(TEXTOS_DECISAO\|Object.keys(t.sucesso\|keys(TEXTOS_DECISAO.sucesso\|TEXTOS_DECISAO)" -- src test e2e`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "dangerouslySetInnerHTML\|dados-da-decisao" -- test/estatico src/components/dados-da-decisao.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "FormularioDecisao\b\|<FormularioDecisao" -- src test e2e`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "export type Status\b\|export type Status =\|export const STATUS" -- src/modules/demandas/schemas.ts src/db/schema/demandas.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "sentinela\|SENTINELA" -- test/transversal/sentinelas.test.ts test/sentinelas.ts test`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-da-decisao-vigencia.test.ts "src/app/(painel)/pacotes-decisao/[decId]/pagina-vigencia.test.ts" test/estatico/vigencia-t11.test.ts --reporter=dot` — antes do código: 43 falharam e 28 passaram, de 71 (falha esperada)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A2 ": never = " -- src/components`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-da-decisao-vigencia.test.ts "src/app/(painel)/pacotes-decisao/[decId]/pagina-vigencia.test.ts" test/estatico/vigencia-t11.test.ts src/components/dados-da-decisao.test.ts "src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts" "src/app/(painel)/pacotes-decisao/[decId]/nivel-do-pedido.test.ts" "src/app/(painel)/pacotes-decisao/[decId]/recebimento-qa.test.ts" --reporter=dot` — 184 passaram e 1 falhou, de 185 (a asserção do `disabled`, corrigida no teste)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/pacotes-decisao/[decId]/pagina-vigencia.test.ts" --reporter=dot` — 22 de 22
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep --untracked -c "expect(" -- src/components/dados-da-decisao-vigencia.test.ts "src/app/(painel)/pacotes-decisao/[decId]/pagina-vigencia.test.ts" test/estatico/vigencia-t11.test.ts` — 64, 69 e 25
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -c "expect(" HEAD -- src/components/dados-da-decisao.test.ts "src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts" "src/app/(painel)/pacotes-decisao/[decId]/nivel-do-pedido.test.ts" "src/app/(painel)/pacotes-decisao/[decId]/recebimento-qa.test.ts"` — 206, 243, 9 e 21
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -c "expect(" -- src/components/dados-da-decisao.test.ts "src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts" "src/app/(painel)/pacotes-decisao/[decId]/nivel-do-pedido.test.ts" "src/app/(painel)/pacotes-decisao/[decId]/recebimento-qa.test.ts"` — 206, 243, 9 e 21 (iguais)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "prettier\|format" -- package.json .github/workflows/ci.yml`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — em segundo plano: 8388 de 8388 (389 arquivos)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "decisaoDevolverComOpcao" -- scripts e2e`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "retries\|timeout\|workers\|webServer" -- playwright.config.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "Abrir o pacote\|getByRole('link'" -- e2e/decisao.spec.ts e2e/pedido-construcao.spec.ts e2e/decisao-celular.spec.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -- src/components/dados-da-decisao.ts`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo (de novo, com a suíte rodando)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "nivel-do-pedido\|recebimento-qa\|pagina.test" -- test/estatico/piso-de-assercoes.test.ts`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo (de novo)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 41108ee -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/modules/acesso/tokens-servico.ts src/proxy.ts src/lib/rota.ts src/db/transacao.ts src/db/privilegios.ts src/modules/integracoes/tempo-limite.ts src/modules/demandas/confirmacao.ts src/modules/pedido-construcao/pendentes.ts src/modules/pedido-construcao/entregar.ts src/modules/pedido-construcao/receber.ts src/modules/andamento/registrar.ts src/modules/limites.ts src/modules/pacotes-decisao/consultas.ts src/modules/demandas/consultas.ts src/modules/especificacoes/consultas.ts src/modules/pareceres-risco/consultas.ts src/modules/agentes/entrada-agente.ts next.config.ts 'drizzle/000[0-9]_*.sql' 'drizzle/meta/000[0-9]_snapshot.json'` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -- "src/app/(painel)/pacotes-decisao/[decId]/FormularioDecisao.tsx"`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/piso-de-assercoes.test.ts test/estatico/piso-de-assercoes-0018.test.ts test/estatico/vigencia-t11.test.ts --reporter=dot` — 198 de 198
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo (de novo)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -- "src/app/(painel)/pacotes-decisao/[decId]/page.tsx"`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo (de novo)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo (de novo)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — em segundo plano: 290 passaram, 9 pulados, 0 falha (10,4 min); maior teste 11,7 s
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components --reporter=dot` — 995 de 995 (39 arquivos), com o e2e rodando
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/pacotes-decisao/[decId]" --reporter=dot` — 103 de 103 (6 arquivos), com o e2e rodando
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico --reporter=dot` — 1256 de 1256 (53 arquivos), com o e2e rodando
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo (de novo, com o e2e rodando)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo (de novo, com o e2e rodando)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — 8 alterados e 4 novos (os 3 testes e esta entrega)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-da-decisao-vigencia.test.ts src/components/textos-0018.test.ts --reporter=dot` — 39 de 39
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -- src/components/dados-da-decisao.test.ts`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/piso-de-assercoes.test.ts --reporter=dot` — 179 de 179
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/pacotes-decisao/[decId]/pagina-vigencia.test.ts" "src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts" --reporter=dot` — 71 de 71
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 8 arquivos, 237 linhas a mais e 26 a menos
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/pacotes-decisao/[decId]/nivel-do-pedido.test.ts" "src/app/(painel)/pacotes-decisao/[decId]/recebimento-qa.test.ts" --reporter=dot` — 9 de 9
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/vigencia-t11.test.ts --reporter=dot` — 15 de 15
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-da-decisao.test.ts --reporter=dot` — 56 de 56
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/piso-de-assercoes-0018.test.ts --reporter=dot` — 4 de 4
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep --untracked -n "RASCUNHO\|RESULTADO_E2E\|E2E_285\|COMANDOS" -- docs/construcao/DEC-DEM-20261111-0018-v1/06-T12-engenheiro-frontend.md` — sem saída

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] os textos são os de `03-ux-ui-design.md`, em pt-BR, e o axe não acusa violação nas telas tocadas
