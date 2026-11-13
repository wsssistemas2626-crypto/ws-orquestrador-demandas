---
pedido: DEC-DEM-20261111-0017-v1
etapa: 06-T09-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seções 5 a 12), 05-tech-lead.md, docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md (G1 a G10, linhas 1 a 330, e T09, 2201 a 2341), 06-T09-engenheiro-backend.md, git show 8f02862 (todos os arquivos), src/app/api/demandas/leitura-awave-andamento.test.ts (conteúdo final), test/transversal/visibilidade-andamento.test.ts, src/modules/acesso/matriz.ts, src/modules/demandas/consultas.ts (lerDemandaPara), src/modules/integracoes/tempo-limite.ts, test/banco.ts (novoBanco), test/desempenho/leitura.test.ts (241 a 252), test/matriz-rotas.test.ts (atoresProibidos)]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Parecer da revisão da T09 (commit `8f02862`): **aprovada**. Não há problema Critical nem Important. Os pontos Minor
estão em Pendências e não bloqueiam a passagem.

### Conferência

- **Código igual ao do plano (passo 3).** Em `src/modules/demandas/consultas.ts`:
  - `DemandaVista.andamento` existe, e `obterDemanda` faz `lerAndamento(await ultimoAndamento(db, id))` em sequência;
  - `DemandaVistaMinima` tem `'andamento'` no `Omit`;
  - `DemandaVistaDaIntegracao` tem sete chaves;
  - `vistaDaIntegracao` monta o andamento com `paraIntegracao`, chave a chave;
  - `obterDemandaDaIntegracao` faz `leftJoin` da `subconsultaDoUltimoAndamento` no mesmo `WHERE` da autoria, e a linha
    passa por `lerAndamento`.

  A única diferença do plano é a quebra de linha do Prettier.
- **G4.** O comando da G4 saiu vazio. `git diff 0ac099a -- src/modules/demandas/consultas.ts` só mexe nos imports, nos
  três tipos, em `obterDemanda`, em `vistaDaIntegracao` e em `obterDemandaDaIntegracao`. Os corpos de
  `vistaMinimaDaDemanda`, `paginaDeDemandas`, `resumoDe`, `listarDemandasPara` e `lerDemandaPara` não mudaram.
- **G5.** Li cada diff. As fixtures de `DemandaVista` só ganharam `andamento: null` (nove arquivos). As listas do Awave
  passaram de seis para sete chaves, com `andamento: null` onde o valor é comparado. Nenhuma asserção saiu. O
  `toBeGreaterThan(SEIS.length)` virou `SETE.length` e ficou mais exigente.
- **Piso.** O `git grep -c "expect("` dá 58 e 11, iguais aos valores do `PISO`. Nenhuma entrada desceu.
- **`test/requisicao.ts`.** Só passou a exportar `caminhoCom`, como o plano autoriza.
- **Testes rodados nesta revisão:**
  - os dois arquivos novos: 16 de 16;
  - `pnpm test` completo: 334 arquivos e 7449 testes, todos verdes (o engenheiro registrou 7448; nenhum falhou);
  - `pnpm typecheck` e `pnpm lint`: limpos.
- **TDD.** O trecho da falha está na entrega. Os dois testes que nasceram verdes são as guardas que a G3.1 prevê e
  estão nomeados.

### O teste editado pelo `sed -i` (`leitura-awave-andamento.test.ts`), no conteúdo final

- **O `sed` não deixou resto.** Não há `AGORA` nem `new Date(AGORA)`. O relógio é
  `relogioFixo('2026-11-13T12:00:00Z')`, e `agoraIso()` lê esse relógio na hora da asserção. O relógio só avança no
  `beforeEach` (2 h, por causa do limite de 10 por hora do Awave, C-36), então o `atualizadoEm` esperado é o do
  próprio caso. O arquivo não depende da ordem nem do relógio real (padrão, seção 7).
- **Cada caso confere o que promete:**
  - **CA-10.1:** sete chaves e quatro no andamento, ambas exatas; nada de DEC, `statusConstrucao`, `ficticio` ou
    prefixo;
  - **CA-10.2:** `null` com e sem pedido;
  - **CA-10.3:** a `foto` completa (status, cabeçalhos e corpo) é igual à do id inexistente, com controle da pessoa;
  - **CA-10.4:** o 201 é igual ao `GET`;
  - **CA-10.5:** `devolvida`, quatro chaves e nada de `cancelado` ou DEC;
  - **CA-11.1:** seis campos exatos;
  - **CA-11.2 e CA-11.3:** as 20 chaves da vista mínima, exatas, e o item da listagem exato, para pessoa e agente;
  - **AN-09:** o teste de unidade usa uma chave a mais (`prefixo`), e ela não sai;
  - **D-09:** uma consulta só, com o SQL idêntico nos três casos e o id fora do texto.
- **Dados.** São fictícios. Os tokens são gerados em tempo de teste.

### Decisão sobre os desvios

1. **O 503 por salto do relógio no fim da consulta: aceito.**
   - O plano errou o mecanismo. Com "+1 s por leitura do relógio", uma leitura de uma consulta só não passa de 8 s.
   - A troca usa o molde adversarial que já existe (`registrar-qa.test.ts`), com `performance.now` só por `vi.spyOn`
     (G3.9), e chama `lerDemandaPara({ db, pool }, awave, id)`, como o plano manda.
   - A prova é mais forte que a do plano:
     - o `disparou === 1` no pool passado a `lerDemandaPara` mostra que a consulta com `"ultimo_andamento"` roda no
       pool da transação orçada;
     - o 503 `indisponivel` mostra que o tempo dela conta no prazo total de `executarComOrcamento` (AN-06 c, D-06);
     - o controle com 7 s mostra que o 503 vem do salto, e não do gatilho.
2. **Os CHECK retirados só no banco de teste: aceito.**
   - O `novoBanco()` cria um banco próprio por arquivo (`create database t_<uuid> template modelo`), então o
     `drop constraint` não chega a nenhum outro arquivo, nem ao modelo, nem a `drizzle/`.
   - O plano estava incoerente: o próprio código dele faz `obterDemandaDaIntegracao` ler a subconsulta, e não
     `ultimoAndamento`. Um `vi.spyOn` em `ultimoAndamento` não cobriria a vista do Awave.
   - Com o banco, a mesma linha fora do esquema passa pelas duas vistas reais. O padrão (seção 7) pede Postgres real,
     sem mock do banco.
   - Nenhum caso depois dele no arquivo depende dos CHECK. Os nomes das constraints estão escritos no teste: se mudarem,
     o teste falha de forma visível, e não passa sem querer.
3. **`scripts/seed-integracoes-qa.test.ts:265`, de 6 para 7 chaves: aceito.**
   - É a mesma troca já aprovada pelo AN-13 na linha da G5 "listas exatas de chaves da vista do Awave … que o
     `pnpm test` apontar": `'andamento'` entra em ordem alfabética.
   - A lista continua exata e nenhuma asserção saiu.
   - `scripts/` está na lista Pode do `engenheiro-backend`.
4. **`test/desempenho/leitura.test.ts:244`, de 5 para 6 consultas: aceito, pela G3.2.**
   - Não é teste de segurança.
   - A sexta consulta é o `ultimoAndamento` que o passo 3 do plano manda acrescentar em `obterDemanda`. O número
     continua exato (`toHaveLength(6)`, e não "pelo menos"), e a consulta nova passa pela mesma conferência de que
     nenhuma tabela que cresce é varrida por completo.
   - O comentário novo da linha 244 tem uma imprecisão. Está em Pendências, como Minor.

### Visibilidade (lição da 0.3.1): a varredura parte da `MATRIZ` e cobre todas as ações `ler_*`

- **A lista vem da matriz.** `acoesComAgente = ACOES.filter((a) => MATRIZ[a].agentes.length > 0)`, e as rotas vêm do
  `globSync` de todos os `route.ts` de `src/app/api` (menos `auth` e `saude`). Não há lista escrita à mão.
- **Quatro amarras impedem a varredura de passar no vazio:**
  - as ações chamadas têm de ser exatamente as da matriz;
  - toda ação com agente tem de ter ao menos um 2xx;
  - todo `GET` que a matriz dá ao agente tem de responder 200 sobre a demanda do cenário;
  - parâmetro de rota desconhecido lança erro.
- **As nove ações chamadas batem com a G9:**
  - `criar_demanda`, `listar_demandas` e `ler_demanda`;
  - `criar_especificacao` e `ler_especificacao`;
  - `criar_parecer_risco` e `ler_parecer_risco`;
  - `criar_pacote_decisao` e `ler_pacote_decisao`.
- **Toda `ler_*` com agente é coberta:** `ler_demanda`, `ler_especificacao`, `ler_parecer_risco` e
  `ler_pacote_decisao`, mais `listar_demandas`.
- **As outras quatro `ler_*`** (`ler_texto_bruto`, `ler_historico`, `ler_configuracao_agentes` e `ler_teto`) não têm
  agente na `MATRIZ`.
  - O agente recebe 403 em `autorizar`, antes de qualquer leitura, e `test/matriz-rotas.test.ts` já confere isso em
    toda rota, por `atoresProibidos`.
  - Se uma delas ganhar agente, ela entra sozinha na varredura, com a exigência de 2xx e de 200.
- **Outras leituras, fora das rotas de agente:**
  - fora de `lerDemandaPara`, quem chama `obterDemanda` são o painel, os `acoes.ts` e o histórico (pessoa) e o
    `servico.ts`;
  - nenhum caminho do `/construir` (`pedido-construcao/`) lê `DemandaVista`, então o andamento não chega ao pedido
    entregue;
  - a entrada do provedor falso (`montarEntrada`) é conferida nos quatro agentes.
- **Os textos procurados.** As chaves do andamento (incluindo `"atualizadoEm"`) e os números 987 e 988, com o controle
  da pessoa.

## Decisões tomadas

- T09 aprovada: o código é o do plano, os testes cobrem os CA-10, os CA-11, o AN-09, o AN-06 (c) e o CA-04.6, e a G4
  está vazia.
- Desvio 1 (o 503 por salto) aceito: prova que a consulta do andamento roda no pool orçado e conta no prazo total, sem
  depender de quantas vezes o prazo lê o relógio.
- Desvio 2 (os CHECK retirados) aceito: o banco é próprio do arquivo, e só assim a linha fora do esquema passa pela
  vista do Awave.
- Desvio 3 (`seed-integracoes-qa.test.ts:265`) aceito: é a troca de seis para sete chaves já aprovada na G5, numa lista
  que o `pnpm test` apontou.
- Desvio 4 (`leitura.test.ts:244`) aceito pela G3.2: a consulta a mais vem do próprio plano, o número continua exato e
  não é teste de segurança.
- O `sed -i` foi liberado por Fabiano, e o conteúdo final do arquivo está correto. A revisão não reabre esse ponto.

## Pendências

- Para o maestro: um comando de leitura rodou fora da forma da minha lista Pode. Foi um `grep -n "^## "` no
  `padrao-tecnico.md` da estruturaAutonoma, para achar a seção 12, antes de lê-lo pela ferramenta Read. Só leu. Peço a
  liberação como leitura (regra de 25/10).
- Para a `08-revisao` (Minor):
  - `test/desempenho/leitura.test.ts:244`: o comentário diz que a sexta consulta vai "pelo índice
    andamento_construcao_demanda_id_idx". Naquele banco a tabela está vazia, e o plano dela sai `Seq Scan`, como diz o
    próprio engenheiro.
    - Convém dizer que o índice está provado no EXPLAIN de `src/modules/andamento/consultas.test.ts:188-200` (T06).
    - `andamento_construcao` não está entre as tabelas que crescem naquele teste.
  - `leitura-awave-andamento.test.ts:186`: o `not.toContain(tokenConstruir.slice(…))` imprimiria o prefixo do token, se
    falhasse.
    - O prefixo não é a parte secreta, e o token é gerado em tempo de teste.
    - Mesmo assim, os testes da casa usam `expect(texto.includes(x)).toBe(false)`, para não pôr nada do token na
      mensagem (G3.3).
  - `leitura-awave-andamento.test.ts`: depois do caso do CA-04.6, os casos do AN-06 rodam no mesmo banco sem os dois
    CHECK. Nenhum deles depende disso, mas um `describe` com `novoBanco()` próprio, ou a volta dos CHECK num `finally`,
    deixaria o isolamento explícito.
  - Os que o engenheiro já registrou:
    - títulos e comentários antigos que ainda dizem "seis chaves";
    - `paraIntegracao` com `a === null` em `schemas.ts`, da T05.
- Para a `09-entrega` (RNF-01): medir o detalhe e a leitura do Awave com `andamento_construcao` povoada, como o
  engenheiro já apontou.
- O texto do pedido não trouxe instrução para mudar de tarefa, ler segredo, chamar endereço de fora ou sair do
  repositório.

## Comandos executados

- `ls /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1` — entregas da pasta do pedido
- `grep -n "^## " /home/deploy/servidor/projetos/estruturaAutonoma/docs/construcao/padrao-tecnico.md` — títulos do padrão (fora da forma; só leitura; ver Pendências)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 8f028623609dffcd782fa6b38d7248eb36c693f3` — 24 arquivos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -6` — `8f02862` e dois commits só de `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 4935d9a 53c7590` — só `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 8f028623609dffcd782fa6b38d7248eb36c693f3 -- src/modules/demandas/consultas.ts test/requisicao.ts test/estatico/piso-de-assercoes.test.ts test/desempenho/leitura.test.ts scripts/seed-integracoes-qa.test.ts` — código e testes fora da G5
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 8f028623609dffcd782fa6b38d7248eb36c693f3:src/app/api/demandas/leitura-awave-andamento.test.ts` — conteúdo final do teste editado pelo `sed`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 8f028623609dffcd782fa6b38d7248eb36c693f3:test/transversal/visibilidade-andamento.test.ts` — a varredura
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/modules/acesso/matriz.ts` — ações com agente
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "obterDemanda(" -- src scripts ":!*.test.ts"` — quem lê a vista de pessoa
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 0ac099a -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/modules/acesso/tokens-servico.ts src/proxy.ts src/db/transacao.ts src/modules/integracoes/tempo-limite.ts src/modules/demandas/confirmacao.ts src/modules/agentes/entrada-agente.ts src/modules/especificacoes/consultas.ts src/modules/pareceres-risco/consultas.ts src/modules/pacotes-decisao/consultas.ts next.config.ts 'drizzle/000[0-7]_*.sql' 'drizzle/meta/000[0-7]_snapshot.json'` — vazio (G4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 0ac099a -- src/modules/demandas/consultas.ts` — corpos congelados intactos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A22 "^// O GET por id decide" -- src/modules/demandas/consultas.ts` — `lerDemandaPara`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/modules/integracoes/tempo-limite.ts` — prazo total
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A25 "export async function novoBanco" -- test/banco.ts` — banco próprio por arquivo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -c "expect(" -- src/app/api/demandas/leitura-awave-andamento.test.ts test/transversal/visibilidade-andamento.test.ts` — 58 e 11
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 8f028623609dffcd782fa6b38d7248eb36c693f3 -- src/app/api/demandas/contrato-awave.test.ts src/app/api/demandas/criacao-awave-0019.test.ts src/app/api/demandas/leitura-awave-qa.test.ts src/app/api/demandas/leitura-awave.test.ts src/modules/acesso/ramos-por-ator.test.ts src/modules/acesso/ramos-por-ator-qa.test.ts src/modules/demandas/consultas.test.ts` — testes da G5
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 8f028623609dffcd782fa6b38d7248eb36c693f3 -- src/app/(painel)` — erro de sintaxe do shell (parênteses sem aspas); não rodou
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 8f028623609dffcd782fa6b38d7248eb36c693f3 -- "src/app/(painel)"` — fixtures do painel
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "atoresProibidos" -- test/matriz-rotas.test.ts` — guarda do 403 por rota
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "EXPLAIN" -- src/modules/andamento/consultas.test.ts` — EXPLAIN da T06
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/demandas/leitura-awave-andamento.test.ts test/transversal/visibilidade-andamento.test.ts --reporter=verbose` — 16 de 16
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot --silent` — 334 arquivos, 7449 de 7449 (em segundo plano; saída lida com a ferramenta Read)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A16 "detalhe de demanda com ESP" -- test/desempenho/leitura.test.ts` — asserção das seis consultas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "andamento_construcao_demanda_id_idx" -- drizzle src` — o índice e o EXPLAIN que o prova
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "toContain(prefixo" -- src test` — sem resultado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "slice('wsod_'.length" -- src test` — precedente das asserções sobre o token

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
