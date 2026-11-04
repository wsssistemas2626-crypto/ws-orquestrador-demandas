---
pedido: DEC-DEM-20261104-0013-v1
etapa: 04-regressao
agente: qa-automacao
leu: [contrato-passagem.md, padrao-tecnico.md, pedido.json, 01-qa-funcional.md, 02-tech-lead.md, 03-engenheiro-backend.md, "git diff c2340e6 HEAD (src/ e testes)", e2e/pedido-construcao.spec.ts, e2e/apoio.ts, e2e/axe-todas.spec.ts, e2e/editar-demanda.spec.ts, playwright.config.ts, package.json, scripts/seed-ficticio.ts, "src/app/(painel)/pacotes-decisao/[decId]/SecaoPedido.tsx", src/components/dados-do-pedido.ts, src/components/CaixaSelecao.tsx, src/components/CampoTexto.tsx, src/modules/pedido-construcao/gerar.ts, src/modules/pedido-construcao/montar.ts, src/modules/especificacoes/schemas.ts, src/modules/historico/consultas.ts, "src/app/(painel)/demandas/[id]/Historico.tsx", "src/app/api/demandas/[id]/route.ts", "src/app/api/demandas/[id]/historico/route.ts"]
status: pronto
proximo: maestro
devolvido_para: null
---
## Entrega

Base: ramo `construcao/DEC-DEM-20261104-0013-v1`, limpo no início, com o código da correção em `ff3697d` (o que o 0013
mudou é `git diff c2340e6 HEAD`; `main...HEAD` também traz o 0012, que ainda não está na main). Conferi os três defeitos
da 01 contra os testes da 03 e fiz a Pendência 2 da 02 (`e2e/`). Acrescentei um teste unitário para o "422 só com todos os
tipos".

### Cada critério com o teste que o cobre

| Critério (pedido.json e notas do maestro) | Teste |
|---|---|
| CA 1: recusa com o **nome inteiro** (título; descrição em maiúscula e em minúscula; com acento na ESP) | `src/modules/pedido-construcao/gerar.test.ts` > "gerarPedido: nome do solicitante no texto (D1 do 0013)" > `1:`, `2:`, `3:`; rota: `src/app/api/pacotes-decisao/pedido.test.ts` > "D1 do 0013: o nome inteiro do solicitante em todo texto → 422 com cada caminho…" (seis caminhos) |
| CA 1: recusa com o **primeiro nome** e com o **sobrenome** | `gerar.test.ts` > `4: só o primeiro nome e só o sobrenome no RSK`; `6: critério de aceite e definição de pronto` (`Joana recebe`, `Ficticia aprova`); `pedido.test.ts` > "D1 do 0013: \"A Joana pediu\"… → 422 em todo campo" |
| CA 1: recusa com o **nome grudado** (CamelCase, `_`, número) | `gerar.test.ts` > `5: nome grudado na opção escolhida`; unidade: `src/modules/dados-pessoais/minimizar.test.ts` > "temNome (D1 do 0013)" (79 casos de equivalência com `minimizar` e os casos fixos) |
| CA 1: **qualquer campo** do pedido, com o caminho e o tipo, sem o valor e sem evento | `gerar.test.ts` casos 1 a 6 (título, descrição, ESP, RSK, opção, critério, definição de pronto, cada um com `recusaComNome`: sem `Joana`/`Ficticia` em `extras`, sem evento); guarda `textosDoPedido (D1 do 0013)` (toda sentinela que sai no pedido está na lista conferida, no mesmo caminho); e2e `e2e/pedido-construcao.spec.ts` > "C-28: … D1 do 0013: com o nome do solicitante, um 422 só com os dois" |
| Um 422 só com **todos os tipos** | `gerar.test.ts` > `13:` (e-mail + nome no mesmo campo), `14:` (telefone + nome) e **novo** `14b: e-mail, telefone, CPF e nome (primeiro nome e nome grudado) em campos diferentes → um 422 só, com todos os tipos`; e2e "C-28 … D1 do 0013" (`['especificacao.conteudo: e-mail', 'demanda.titulo: nome']` na tela e na API) |
| CA 2: aceite com **palavra comum em minúscula** igual a parte do nome, e mesmo DEC gera o mesmo pedido | `gerar.test.ts` > `7:` (`camisa rosa em 30 dias`, duas gerações iguais byte a byte), `8:` (partícula), `16:` (nome curto); `pedido.test.ts` > "M-a: palavra comum em minúscula igual a parte do nome do solicitante sai como gravada" |
| Aceite com **rótulos do sistema** ("Campos críticos", nível "Alto", "Contexto") e com `Para:` | `gerar.test.ts` > `9:`, `10:`, `11:`; guarda "nenhum rótulo do sistema … aparece nos valores" |
| CA 3: **sem a confirmação**, 422 | serviço: `gerar.test.ts` > "gerarPedido: confirmação sem dado pessoal (D3 do 0013)" (`{}`, `false`, antes do 404, depois do 403); rota: `pedido.test.ts` > "confirmação sem dado pessoal (D3 do 0013)" (`{}`/`false` → 422, `"true"`/`1` → 400, sem corpo → 400, agente → 403); Server Action: `acoes-pedido.test.ts` > "D3 do 0013: sem a confirmação…"; e2e > "CA-26.3" (`{}` e `false` pela API → 422 com a mensagem, sem download) |
| CA 3: **com ela, o evento** com a confirmação | `gerar.test.ts` > "cada geração grava evento pedido_gerado com a pessoa e a confirmação"; `gerar-bordas.test.ts` > "cinco gerações ao mesmo tempo, com a confirmação…"; `pedido.test.ts` > "com a confirmação e uma chave a mais → 200…"; `acoes-pedido.test.ts` > "RF-21: …a confirmação"; `rotulos.test.ts` (texto do histórico); e2e "CA-26.3": `GET /api/demandas/:id/historico` com dois `pedido_gerado`, cada um `depois: { confirmaSemDadoPessoal: true }`, e a T05 mostra duas vezes "Gerou o Pedido de Construção de <DEC>, com a confirmação de que o texto não tem dado pessoal" |
| CA 4: **caixa acessível na T11**, botão só envia com ela, **axe** sem violação | e2e "CA-26.3": caixa com nome acessível igual ao rótulo, `aria-required`, desmarcada, botão habilitado; clique desmarcado não faz POST à página (sem Server Action), erro na caixa, `aria-invalid`, `toHaveAccessibleDescription`, foco na caixa; Espaço marca e limpa o erro; a caixa segue marcada depois de gerar. Axe em: antes de marcar, caixa com erro, caixa marcada, gerado, 422 de e-mail, 422 de e-mail e nome, Estudo. Unidade: `pagina.test.ts` (caixa entre o aviso e o botão) e `dados-do-pedido.test.ts` > "entradaDoPedido" |
| CA 5: **aprovadoPor com o papel** e `validarPedido` aceita | `gerar.test.ts` > "D2 do 0013: só o CTO → aprovadoPor \"cto\"", duas de dupla aprovação, "D2 do 0013: aprovadoPor na ordem da aprovação"; `gerar-bordas.test.ts` > troca de nome **e** papel da conta (arquivo igual byte a byte) e "dupla aprovação com a opção B"; `pedido.test.ts` (download); e2e "CA-26.3" (`decisao.aprovadoPor: 'cto'`, sem o nome da conta) |
| **Mesmo DEC, mesmo pedido** (CA-22.2) | `gerar.test.ts` > "CA-22.2: o mesmo DEC, duas vezes…", `7:`; `gerar-bordas.test.ts` (cinco concorrentes, troca da conta, um ano depois); `acoes-pedido.test.ts` > "aprovado: … gerar de novo devolve o mesmo"; e2e "CA-26.3" (baixado = resposta da API = bloco) |
| E6: o nome conferido é o atual da demanda | `gerar.test.ts` > `15:`; e2e "C-28 … D1": troca o solicitante para `Portal Ficticio` (parte do título), recusa com o nome, devolve o nome do seed num `finally` e volta a só `e-mail` |
| CA 6: e2e verde três vezes seguidas | três rodadas de `pnpm test:e2e`, 143 de 143 em cada (comandos abaixo) |

### O que mudou nesta etapa

`e2e/pedido-construcao.spec.ts` (Pendência 2 da 02):

- `postDaApi(page, decId, corpo = CONFIRMADO)`: todo POST que deve passar, ou que prova outra recusa, manda a confirmação
  (E9). O C-28 confere agora o corpo inteiro do 422 (`erros: ['especificacao.conteudo: e-mail']`) e o Estudo, a mensagem
  dele: os dois provam a própria recusa, e não a falta da confirmação.
- "CA-26.3": aviso novo, caixa (estado inicial, clique desmarcado sem Server Action, teclado, marcada depois de gerar),
  `aprovadoPor: 'cto'`, 422 sem a confirmação pela API e o histórico (API e T05) com a confirmação.
- "Copiar JSON": marca a caixa antes de gerar.
- "C-28": marca a caixa; a orientação conferida parágrafo a parágrafo (linhas 3 e 6 da 02). A frase "Corrija criando uma
  versão nova da ESP e um pacote novo." deixou de aparecer neste caso por regra da 02 (linha 7 só sem campo do pedido na
  lista); o teste agora confere que ela **não** aparece. Parte nova do D1 descrita na tabela.
- "Estudo": nenhuma caixa na seção.
- Cabeçalho: estados do axe e conta do C-36 (continua 0 demanda e 12 versões; o teste de C-28 faz dois PATCH na própria
  demanda).

`src/modules/pedido-construcao/gerar.test.ts`: o teste `14b` (os quatro tipos em campos diferentes, um 422 só, C-28 na
ordem das chaves e depois os caminhos com nome, sem `exemplo.test`, `90000` nem `456.789` na resposta).

### Seed fictício (Pendência 2 da 02)

`scripts/seed-ficticio.ts` não precisa mudar. As demandas do pedido usam `DO_PORTAL`, solicitante `Pessoa Ficticia
Financeiro`. Nem os títulos, nem o contexto, nem os textos que o e2e grava na ESP, no RSK ou no DEC têm "Pessoa",
"Ficticia" ou "Financeiro" com inicial maiúscula. "(fictício)" está em minúscula e com acento. A demanda de Estudo
(`Pessoa Ficticia Outro`) é recusada antes de chegar à conferência do nome. As três rodadas verdes confirmam.

### Conferência do diff (nada afrouxado)

`git diff --numstat c2340e6 HEAD -- "*.test.ts"` e o diff de cada arquivo. Nenhum `.skip`, `.only` nem `.todo`. As linhas
tiradas pela 03 são de três tipos:

- a chamada nova com `CONFIRMADO`;
- `aprovadoPor` com nome trocado por papel (D2);
- `orientacao: null` trocado por `[]` (interface da 02).

Os três testes M-a de `pedido.test.ts` passaram de 200 para 422, como o D1 pede. O 422 é conferido por inteiro: lista,
nenhum valor e nenhum evento. Para o M-a seguir provado, entraram dois testes novos com 200: o nome de outra pessoa e a
palavra comum em minúscula. A troca de solicitante em `test/transversal/sentinelas.test.ts:291` segue a regra da 02 e não
muda o texto que o teste prova.

Nesta etapa saíram 15 linhas de `e2e/`, cada uma trocada por uma conferência igual ou mais forte:

- o aviso antigo, pelo texto novo;
- `data: {}`, pelo corpo com a confirmação;
- `toBe(422)` do Estudo, pelo status e pela mensagem;
- `toContainText('Corrija…')`, pela lista exata de parágrafos e pela ausência da frase;
- o `toMatchObject` do JSON, pelo mesmo `toMatchObject` com `aprovadoPor`;
- títulos e comentários.

### Resultado

- `pnpm test`: **201 arquivos, 4415 testes, 0 falhas** (JUnit `tests="4415" failures="0" errors="0"`; 4414 da 03 + 1).
- `pnpm lint`: limpo. `pnpm typecheck`: limpo.
- `pnpm test:e2e`: **143 de 143** nas rodadas 1 (7,6 min), 2 (6,4 min) e 3 (7,1 min), seguidas, com `retries: 0`.

## Decisões tomadas

- O D1 no e2e reaproveita a demanda própria do teste de C-28 e troca o solicitante pela API, em vez de criar demanda: a
  spec continua sem criar demanda (C-36), e A-02 impede um segundo DEC aprovado na mesma demanda. O nome é devolvido num
  `finally`, para o seed não ficar alterado.
- Para saber se a Server Action foi chamada, o teste conta os POST para a própria página, em vez de olhar só a tela: assim
  prova que "a caixa desmarcada não chama a ação".
- O histórico é conferido pela API e pela T05: a API prova o booleano gravado, e a T05 o texto que a pessoa lê.
- `sistema_alvo` e `repositorio_destino` não ganharam teste de nome com valor real. O schema da ESP só aceita minúscula e
  `<dono>/<sistema>`, e a parte do nome só conta com inicial maiúscula. A guarda de `textosDoPedido` garante que os dois
  são conferidos.
- Não mexi em teste da 03: os que cobrem os critérios estão corretos e passam pelos motivos certos.

## Pendências

1. Para a `06-documentacao`: o e2e da T11 mudou (caixa, corpo do POST com a confirmação, histórico). Se o manual técnico
   descreve a suíte e2e, inclua isso.
2. A Pendência 3 da 03 (Prettier não rodou) continua: `pnpm format` não está na minha lista Pode. O lint passou.
3. E5 (recusa por nome sem saída por causa do A-02) continua com Fabiano, como a 02 registrou. O pedido 0014 trata disso.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --branch` — ramo do pedido, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat main...HEAD` — inclui o 0012, que ainda não está na main
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -n 8` — `ff3697d` no topo, base `c2340e6`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat c2340e6 HEAD` — 29 arquivos do 0013
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff c2340e6 HEAD -- src/modules/pedido-construcao/gerar.test.ts` — conferido, sem afrouxar
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff c2340e6 HEAD -- "*.test.ts" ":!src/modules/pedido-construcao/gerar.test.ts" ":!src/modules/dados-pessoais/minimizar.test.ts"` — conferido, sem afrouxar
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format= -- e2e "src/app/api/demandas/*route.ts" "src/app/api/demandas/**/route.ts"` — specs e2e e rotas de demanda
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot src/modules/pedido-construcao/gerar.test.ts` — 71 de 71
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --reporter=line` — rodada 1: 143 de 143
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --numstat c2340e6 HEAD -- "*.test.ts"` — linhas por arquivo de teste
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff c2340e6 HEAD -- src/modules/dados-pessoais/minimizar.test.ts` — só acréscimos
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --reporter=dot` — rodada 2: 143 de 143
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --reporter=dot` — rodada 3: 143 de 143
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot --reporter=junit --outputFile.junit=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/f803aa58-06d4-40d8-998e-0da08e5f62a0/scratchpad/suite-04.xml` — 4415 de 4415, 0 falhas
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — só `e2e/pedido-construcao.spec.ts` e `gerar.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --numstat` — 145/15 no e2e, 20/0 no `gerar.test.ts`

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] (04 regressão) há um teste que reproduz o defeito descrito em `01-qa-funcional.md`
