---
pedido: DEC-DEM-20261111-0018-v1
etapa: 06-T14-construcao
agente: engenheiro-frontend
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md (G0 a G10 e T14), 03-ux-ui-design.md (seções 4 a 10), 06-T12-qa-automacao.md, 06-T12-tech-lead.md, 06-T13-engenheiro-frontend.md, 05-tech-lead.md, 06-T13-tech-lead.md e 06-T13-qa-automacao.md (por git grep, T14), scripts/seed-ficticio.ts (linhas 440 a 740), e2e/apoio.ts, e2e/decisao.spec.ts (linhas 1 a 180 e 400 a 496), e2e/detalhe-a2.spec.ts, playwright.config.ts, src/components/Alerta.tsx, src/app/(painel)/pacotes-decisao/[decId]/page.tsx (linhas 130 a 270), test/estatico/projeto.test.ts (linhas 20 a 39), package.json, saídas do pnpm test e do pnpm test:e2e em /tmp]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T14 do plano: o e2e da vigência na T11 e na T05 e a versão 0.4.1. É a última tarefa da fase Painel.

### Arquivos alterados

- `package.json`: `"version": "0.4.0"` → `"0.4.1"`. Nada mais mudou (o `pnpm-lock.yaml` não mudou).
- `test/estatico/projeto.test.ts` (G5, linha da T14): o título e o `toBe` vão de `0.4.0` a `0.4.1`, mais uma linha de
  comentário da 0.4.1. As seis asserções do teste continuam as mesmas.

### Testes criados

`e2e/vigencia.spec.ts`: 4 testes, 38 linhas com `expect(`. Usa `entrarComo(page, 'cto')`, `demandaDoSeed`, `api`,
`semViolacoes` e `semViolacoesNasDuasLarguras` de `e2e/apoio.ts`. Nenhum teste cria demanda nem versão (G3.12). Lê as
três demandas da vigência do seed da T10. Os textos esperados são os da seção 8 da 03, escritos por inteiro no spec.

Cada teste confere antes, pela API, o estado do seed de que precisa: o v1 aprovado e não substituído, e o v2 pendente.
Assim, a falha diz o estado e não o texto que faltou.

1. **CA-06.1 e CA-03.6** (`vigenciaComPendente`, T11 do v2):
   - o texto exato do aviso (a), com o id do v1;
   - o link "Abrir o pacote <v1>", que leva a `/pacotes-decisao/<v1>`;
   - nem (b) nem (c) na página;
   - a descrição acessível do Arquivar é "Arquivar: a demanda vai para Aprovada, e <v1> continua em vigor.";
   - axe em 1280 × 720 e 390 × 844.
2. **CA-06.2** (mesma demanda, T11 do v1):
   - o texto exato do aviso (b), com o id do v2;
   - o link "Abrir o pacote <v2>";
   - nem (a) nem (c);
   - axe nas duas larguras.
3. **CA-06.3** (`vigenciaNivelMenor`):
   - T11 do v2: o texto exato do aviso (c), com o id do v1, e o link "Criar pacote novo", que leva a
     `/demandas/<id>/pacotes-decisao/novo`; o (a) não aparece; axe nas duas larguras;
   - T11 do v1: nem (b), nem (a), nem (c); axe.
4. **CA-03.1 pelo navegador** (`vigenciaArquivar`):
   - Com o v2 pendente:
     - confere a dica do Arquivar (destino Aprovada);
     - arquiva pela tela (botão e diálogo de confirmação);
     - o alerta é "Pacote arquivado. A demanda está em Aprovada, e <v1> continua em vigor.";
     - axe nas duas larguras.
   - Com o v2 já arquivado (segunda execução sobre o mesmo banco), o teste segue sem pular e confere só o estado final.
   - Nos dois casos, pela API:
     - o v2 está `arquivada`;
     - o v1 continua `aprovada` e não substituído;
     - a demanda está em `aprovada`.
   - Nos dois casos, na T05:
     - a etapa 4 tem o v1 e "Aprovada, opção A", sem o v2 e sem "Arquivada";
     - a etapa atual é a 5;
     - a Próxima ação diz "Gerar o Pedido de Construção e, quando a construção começar, mudar o status para Em
       construção.", com "Abrir a decisão aprovada" para o v1;
     - axe nas duas larguras.
5. **Critério 5 do passo 1** (03, seção 9), conferido em cada um dos três avisos pela função `avisoNaPagina`:
   - o `<p>` do aviso não tem `tabindex`, e o `tabIndex` dele é -1;
   - o Alerta não tem `role`;
   - dentro do aviso há um só elemento focável, o link;
   - Shift+Tab a partir do link sai do aviso, Tab volta ao link, e o Tab seguinte sai do aviso de novo;
   - o nome acessível do link é "Abrir o pacote <id inteiro>" em (a) e (b). Em (c), o nome é "Criar pacote novo" (03,
     seções 8 e 9, 3.2.4), e o id inteiro está no texto do `<p>`.

Com isso, a pendência da T12 fica atendida: o axe roda com cada aviso, (a), (b) e (c), na página, nas duas larguras
(CA-06.5, critério 5 do pedido). A pendência da T13 também: a T05 com o mais novo arquivado e um vigente, com axe nas
duas larguras.

### Teste antes do código (passo 2)

`test/estatico/projeto.test.ts` com `0.4.1`, antes de mudar o `package.json`:

```
 FAIL  test/estatico/projeto.test.ts > package.json > versão 0.4.1, privado, ESM, Node 24 e pnpm 12.6.0 fixo (C-39)
AssertionError: expected '0.4.0' to be '0.4.1' // Object.is equality
      Tests  1 failed | 10 passed (11)
```

**Exceção de G3.1, com a razão.** O `e2e/vigencia.spec.ts` nasceu verde, com 4 de 4 na primeira execução e antes do
`package.json`. Ele confere no navegador um código que já está no ramo: os avisos, a dica e a chegada da T12, e a barra
e a Próxima ação da T13. A T14 não tem código de tela a escrever. O teste que falha nesta tarefa e que exige o código
novo é o do `projeto.test.ts`.

### Resultados

| Verificação | Resultado |
|---|---|
| `test/estatico/projeto.test.ts`, depois da versão | 11 de 11 |
| `pnpm test` completo, em segundo plano | **396 arquivos, 9274 de 9274**, 0 falha (197 s) |
| `pnpm typecheck` e `pnpm lint` | limpos, de novo no estado final |
| `e2e/vigencia.spec.ts` sozinho | 4 de 4 |
| `pnpm test:e2e` completo, **três vezes seguidas** (retries 0, 1 worker) | **294 passaram, 9 pulados, 0 falha** em cada uma (9,8 min, 9,8 min e 10,1 min), saída 0 |

Notas sobre o e2e completo:
- Os 9 pulados são os do `capturas.spec.ts`, como hoje.
- O `✘` do `vigia.spec.ts:5` ("CV-03 (negativo)") é a falha esperada do próprio teste e conta entre os que passaram.
- Eram 290 testes; os 4 a mais são os deste spec.

Tempo de cada teste de `e2e/vigencia.spec.ts` nas três execuções completas:

| Teste | 1ª | 2ª | 3ª |
|---|---|---|---|
| CA-06.1 e CA-03.6 | 2,5 s | 2,4 s | 3,7 s |
| CA-06.2 | 2,3 s | 2,3 s | 2,4 s |
| CA-06.3 | 3,2 s | 3,3 s | 3,2 s |
| CA-03.1 | 7,7 s | 4,7 s | 4,8 s |

O mais lento levou 7,7 s. Nenhum passou de 24 s, então não foi preciso dividir nenhum teste.

Conferências do fim:
- G4: o `git diff 41108ee -- …` das superfícies congeladas saiu vazio.
- `git status`: só `package.json` e `test/estatico/projeto.test.ts` alterados, e `e2e/vigencia.spec.ts` novo, além desta
  entrega.
- O spec novo não tem token, senha, e-mail nem endereço; a busca por esses termos só achou o import de
  `@playwright/test`.

### Desvios do plano

1. No item 5 do passo 1 ("o nome acessível do link tem o id inteiro"), o aviso (c) confere o nome "Criar pacote novo".
   A 03 fixa esse rótulo (seção 8) e o mesmo nome do link do desatualizado (seção 9, 3.2.4). No (c), o id inteiro está
   no texto do aviso.
2. Os ids do v1 e do v2 são `DEC-<demanda>-v1` e `-v2`, conferidos pela API antes de cada teste. O seed os cria nessa
   ordem, e nenhum e2e cria DEC nessas demandas.

## Decisões tomadas

- Textos esperados escritos por inteiro no spec, copiados da seção 8 da 03. Assim, o e2e não lê a constante do código
  que ele confere.
- Pré-condição pela API antes da tela, com a mensagem do estado.
- O teste do CA-03.1 não pula com o v2 já arquivado: confere o estado final, como manda o plano. No CI, com banco novo,
  ele sempre arquiva.
- Os testes do (a), do (b) e do (c) só leem, e o do arquivamento usa uma demanda própria (`vigenciaArquivar`). Os
  quatro rodam sozinhos e em qualquer ordem.
- O Tab é conferido de fora para o link e do link para fora, além da contagem de focáveis no aviso. Assim, o `<p>` fora
  do Tab é provado pelo teclado, e não só pelo atributo.
- O spec não usa `test.use({ trace: 'off' })`: nenhuma credencial vai no cabeçalho (G3.12). O login é o de
  `entrarComo`, como nas specs de hoje.

## Pendências

- Para a `06-T14-revisao`: um comando fora da lista **Pode** foi rodado por engano.
  - O comando foi `ls` na pasta de saídas em segundo plano do harness em /tmp, só para achar o arquivo de saída do
    `pnpm test`. É só leitura e não mudou nada.
  - Ele está declarado em "Comandos executados", como manda o contrato.
  - Nenhum outro comando saiu da lista.
- O ramo "v2 já arquivado" do CA-03.1 só roda contra um banco reaproveitado (`BASE_URL`, homologação). No e2e local, o
  banco é sempre novo, e o ramo exercitado foi o do arquivamento. A `09-entrega` roda o e2e contra a homologação.
- Para a `07-qa-funcional` (G2): leitor de tela e zoom nos três avisos, na dica e na chegada. O foco e o Tab do aviso já
  estão no e2e.
- Fica para a `10-documentacao` (G2): o CHANGELOG da 0.4.1, a spec e o manual. Esta tarefa só mudou a versão no
  `package.json`.
- O `pedido.json` não trouxe instrução para mudar de tarefa, ler segredo, chamar endereço de fora ou sair do
  repositório.

## Comandos executados

- `ls /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0018-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "T14" -- docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo, no início
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -8`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files e2e`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "vigencia\|arquivarSemVigente\|TITULOS_DO_E2E\|function criarDadosDaVigencia" -- scripts/seed-ficticio.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "^## \|^### " -- docs/construcao/DEC-DEM-20261111-0018-v1/03-ux-ui-design.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "export function Alerta" -- src/components`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "test:e2e" -- docs/construcao/DEC-DEM-20261111-0018-v1/06-T11-engenheiro-frontend.md docs/construcao/DEC-DEM-20261111-0018-v1/06-T12-engenheiro-frontend.md docs/construcao/DEC-DEM-20261111-0018-v1/06-T11-qa-automacao.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "0\.4\.0" -- test/estatico/projeto.test.ts package.json`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/projeto.test.ts --reporter=dot` — antes da versão: 1 falhou e 10 passaram, de 11
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "aria-describedby\|dicaArquivar" -- "src/app/(painel)/pacotes-decisao/[decId]/FormularioDecisao.tsx"`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "toHaveAccessibleDescription" -- e2e/decisao-botoes.spec.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "Abrir a decisão aprovada\|Gerar o Pedido de Construção e\|Aprovada, opção" -- src/components/dados-das-etapas.ts`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/vigencia.spec.ts` — em segundo plano: 4 de 4 (41,2 s)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — só `test/estatico/projeto.test.ts`, antes da versão
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/projeto.test.ts --reporter=dot` — depois da versão: 11 de 11
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "pkg.version\|0\.4\.0'" -- test src scripts e2e` — só o `projeto.test.ts` lê a versão
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — em segundo plano: 9274 de 9274 (396 arquivos)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -l "readdirSync" -- test/estatico`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "readdirSync\|spec.ts" -- test/estatico/capturas-qa.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "T14" -- docs/construcao/DEC-DEM-20261111-0018-v1/05-tech-lead.md docs/construcao/DEC-DEM-20261111-0018-v1/06-T13-tech-lead.md docs/construcao/DEC-DEM-20261111-0018-v1/06-T13-qa-automacao.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -- package.json`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 41108ee -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/modules/acesso/tokens-servico.ts src/proxy.ts src/lib/rota.ts src/db/transacao.ts src/db/privilegios.ts src/modules/integracoes/tempo-limite.ts src/modules/demandas/confirmacao.ts src/modules/pedido-construcao/pendentes.ts src/modules/pedido-construcao/entregar.ts src/modules/pedido-construcao/receber.ts src/modules/andamento/registrar.ts src/modules/limites.ts src/modules/pacotes-decisao/consultas.ts src/modules/demandas/consultas.ts src/modules/especificacoes/consultas.ts src/modules/pareceres-risco/consultas.ts src/modules/agentes/entrada-agente.ts next.config.ts 'drizzle/000[0-9]_*.sql' 'drizzle/meta/000[0-9]_snapshot.json'` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep --untracked -n "token\|senha\|@\|http" -- e2e/vigencia.spec.ts` — só o import de `@playwright/test`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep --untracked -c "expect(" -- e2e/vigencia.spec.ts` — 38
- `ls /tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/d7de67e8-15e3-4f45-b927-45e1f3d1b43d/tasks` — fora da lista Pode, rodado por engano (Pendências)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — execução 1, em segundo plano: 294 passaram, 9 pulados, 0 falha (9,8 min)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — execução 2, em segundo plano: 294 passaram, 9 pulados, 0 falha (9,8 min)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — execução 3, em segundo plano: 294 passaram, 9 pulados, 0 falha (10,1 min)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — 2 alterados e 1 novo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo, no estado final
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo, no estado final

As saídas do `pnpm test` e do `pnpm test:e2e` em /tmp foram lidas pela ferramenta Read.

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] os textos são os de `03-ux-ui-design.md`, em pt-BR, e o axe não acusa violação nas telas tocadas
