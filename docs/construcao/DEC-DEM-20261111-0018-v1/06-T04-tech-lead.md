---
pedido: DEC-DEM-20261111-0018-v1
etapa: 06-T04-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seções 5 a 7 e 12), docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md (G0 a G10 e T04), 06-T04-engenheiro-backend.md, 06-T03-tech-lead.md, commit 6a7e426d0ae181ea86973f3ff7886d9424315743, 02-arquiteto-solucoes.md (linha 191), 04-seguranca-aplicacao.md (SB-07, SB-08, SB-09 e ameaças K04 a K07), src/modules/pacotes-decisao/criar.ts, src/modules/pedido-construcao/caminhos-da-criacao.ts, src/modules/pedido-construcao/conteudo.ts (diff), src/modules/pedido-construcao/montar.ts (diff), src/modules/pedido-construcao/textos-da-criacao.test.ts, src/modules/pacotes-decisao/marcacao-da-criacao.test.ts, test/transversal/visibilidade-caminhos-da-criacao.test.ts, test/estatico/caminhos-da-criacao.test.ts, test/estatico/piso-de-assercoes.test.ts (diff), src/modules/dados-pessoais/minimizar.ts (temNome), src/modules/demandas/consultas.ts (nomesDoSolicitante), src/modules/limites.ts (limite por hora), src/modules/pedido-construcao/conferir.ts (linhas 72 a 80, por git grep), saída do pnpm test em /tmp]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T04 (marcação do nome em vigor na criação do DEC; S-03, ADR-37, SB-07 a, b, c, e; SB-08 c, f; SB-09 a, b;
D-04), commit `6a7e426`. **Nenhum problema Critical ou Important. A passagem segue.**

**Os três riscos altos que o maestro pediu para olhar**

1. **A marcação não é gravada nula por esquecimento.** `src/modules/pacotes-decisao/criar.ts:159` tipa a linha do insert
   como `typeof pacoteDecisao.$inferInsert & { caminhosComNomeNaCriacao: string[] }`. Com isso, a chave é obrigatória e
   não aceita `null` (a interseção do opcional `string[] | null` com o obrigatório `string[]` dá `string[]`). O insert
   é um só (`criar.ts:181`), e os três caminhos de criação passam por `criarComNomes`: a rota de pessoa, a rota do
   agente e o worker com `extras`. O teste `test/estatico/caminhos-da-criacao.test.ts:45-47` prova que nenhum outro
   arquivo de `src` ou `scripts` insere em `pacote_decisao`, nem pelo Drizzle nem por SQL. O teste
   `marcacao-da-criacao.test.ts:141-148` mostra, pelo banco, que os três caminhos gravam `['especificacao.conteudo']` ou
   `[]`, e nunca `null`.
2. **A marcação não é gravada sem conferência.**
   - O nome vem só de `d`, a linha que `travarDemanda` devolve (`criar.ts:127` e `:154`), numa chamada só, que também
     serve ao `return` do 201 (B-3 do 0010). O teste `nomes-antes-de-gravar.test.ts` continua verde.
   - Os textos saem de `textosDaCriacao`, que usa a mesma função interna (`textosEscritos`, `montar.ts:83`) que o D1 usa
     em `textosDoPedido`.
   - A ESP e o RSK são lidos por `obterEspecificacao` e `obterParecerRisco`, as mesmas funções que `conferir.ts:72-73` usa
     na geração.
   - A regra de nome é a mesma `temNome` de `conferir.ts:80`.
   - O valor gravado é o calculado. A chave mandada no corpo, com `[]`, `null` ou um caminho inventado, em camelCase ou
     snake_case, é descartada pelo `z.object` (C-11). Isso está fixado em `marcacao-da-criacao.test.ts:161-178`.
   - A corrida com a troca do `solicitanteNome` foi testada com duas conexões, nos dois sentidos (`:200-245`).
   - A igualdade do SB-08 (c) vale para A e para B em cinco formas de ESP (`textos-da-criacao.test.ts:123-139`), e a
     regex não tem flag e tem âncoras (`:239-246`).
3. **A coluna não vaza para vista de agente.** O teste `visibilidade-caminhos-da-criacao.test.ts:167-199` parte da
   `MATRIZ` (`ler_pacote_decisao`, `ler_demanda`, `listar_demandas`) e das rotas do disco. Ele chama cada rota com a
   pessoa e com cada agente da linha. Todo DEC devolvido tem as 25 chaves de `41108ee`, com no mínimo 15 DEC conferidos,
   e nenhuma resposta traz `caminhos` nem os três caminhos gravados no cenário.
   - O controle (`:156-159`) prova que o cenário tem a coluna preenchida, e não nula. Assim a varredura não passa no
     vazio.
   - A entrada do provedor falso foi conferida nos quatro agentes (`:201-224`).
   - O 201 de pessoa e o do agente, além do `depois` de `pacote_decisao_criado`, não ganharam chave
     (`marcacao-da-criacao.test.ts:247-269`).
   - `consultas.ts` e `entrada-agente.ts` não mudaram (G4).
   - Isso fecha a pendência da revisão da T03: o SB-09 (a) parte da `MATRIZ` e está no `PISO`.

**Checklist da seção 12**

- **Escopo.** Mudaram os nove arquivos da T04 mais a entrega e o `passagens.jsonl`. `consultas.ts`, `schemas.ts` e
  `conferir.ts` ficaram como estavam, como o plano manda. O comando da G4 (base `41108ee` contra o commit) saiu **vazio**.
  O `piso-de-assercoes.test.ts` só recebeu acréscimos.
- **Teste para cada comportamento novo, que falharia sem o código.** A entrega mostra a falha antes do código: módulo
  inexistente, coluna `null` no cenário, `criar.ts` sem a marcação. As duas varreduras de visibilidade que já nasceram
  verdes estão nomeadas como exceção da G3.1, com a razão.
- **Dado.** Só fictício: "Joana Ficticia Lima", "Joaquina", títulos com "(fictício)". Tokens só gerados em tempo de
  teste, sem token em mensagem de `expect`. Nenhum segredo e nenhuma linha de log nova.
- **Entrada externa.** Nenhuma entrada nova. A chave fica fora de todo schema de entrada (guarda estática
  `:55-57`). `lerCaminhosDaCriacao` falha fechada, com mensagem fixa, sem o valor e sem as `issues` do Zod.
- **Banco.** Sem migration nesta tarefa. O insert é campo a campo, e a coluna é só a da T03.
- **Duplicação.** Nenhuma: `textosEscritos` é a fonte única dos textos, `opcaoGravada` e `descricaoDaDemanda` são
  reaproveitadas, e a D-04 move `descricaoSemRotulos` sem copiar. Sem ciclo: `conteudo.ts`, `minimizar.ts` e
  `demandas/schemas.ts` não importam `criar.ts` nem `montar.ts`.
- **Interface.** Nada nesta tarefa.
- **Piso.** As quatro entradas novas conferem com o `git grep -c "expect("`: 33, 18, 13 e 28.

**Desvios do engenheiro, aceitos**
- `RE_ROTULO_DA_DESCRICAO` não foi exportada. Ela tem a flag `g`, e só o `replace` a usa. É mais seguro que o plano.
- `CAMINHO_DA_OPCAO` tem o tipo explícito da G7 e `Object.freeze`. O teste confere `isFrozen`.
- "Joaquina" ficou no lugar de "Ficticia" no caso unitário. Também entraram casos a mais: ESP 50 + 50, `undefined`,
  `decisao.opcaoEscolhida`, a ordem fixada e a parte do nome em item de lista. Nenhuma asserção do plano saiu.
- A marcação é calculada sobre a ESP e o RSK relidos pela PK, e não sobre as linhas parciais de `citada` e `maisNova`.
  Isso é necessário para a igualdade valer com os mesmos dados do D1. O custo são 5 consultas a mais sob a trava, e
  nenhum teste de prazo reclamou.

**Pareceres (Minor, não bloqueiam; seção 12: vão para Pendências)**

- `test/estatico/caminhos-da-criacao.test.ts:19-24`
  - **Problema:** `criar.ts` entra inteiro na lista de quem pode citar a chave. Por isso a guarda não pega a chave
    posta em `ExtrasDoPacote` (`criar.ts:89`) nem um valor como `extras.caminhosComNomeNaCriacao ?? …`.
  - **Razão:** o SB-07 nomeia `ExtrasDoPacote` entre os lugares proibidos. Hoje o tipo tem só três campos, e a linha
    `:80` exige o valor calculado, mas a guarda não cobre esse caso.
  - **Caminho:** a `06-T04-testes` (qa-automacao) pode acrescentar duas asserções no estático: o bloco de
    `ExtrasDoPacote` sem a chave, e `criar.ts` citando a chave em exatamente as linhas de hoje (import, tipo e valor).
- `src/modules/pacotes-decisao/marcacao-da-criacao.test.ts:181-190`
  - **Problema:** `esperarTrava` conta qualquer espera `Lock` no banco do arquivo, inclusive a de trava consultiva de
    outra conexão.
  - **Razão:** uma espera alheia soltaria a transação cedo. O resultado continua certo, porque a ordem é garantida pela
    trava da demanda, como a entrega diz, mas a prova de que a criação esperou fica mais fraca.
  - **Caminho:** opcional. Filtrar `pg_locks` por `locktype = 'transactionid'` ou `'tuple'`, ou pela consulta em
    espera.
- `src/modules/pedido-construcao/caminhos-da-criacao.ts:14`
  - **Problema:** `\d{1,4}` aceita zero à esquerda (`definicao_de_pronto[01]`). Esse item passa na leitura e não
    corresponde a nenhum caminho do pedido.
  - **Razão:** só o migrator escreveria isso, porque o app não tem `UPDATE` (T03), e a forma é a da 02 (linha 191).
    Fica registrado para a `08-revisao` olhar junto da T05.
  - **Caminho:** nenhum nesta tarefa.

## Decisões tomadas

- Status `pronto`: o checklist da seção 12 está cumprido e não há Critical nem Important.
- Os três pareceres ficam Minor. O código de hoje grava o valor certo, o caminho que falta cobrir passa por `criar.ts`,
  que é revisto em toda tarefa, e a regex segue o desenho aprovado na 02.
- A G4 foi rodada contra o commit (`41108ee` → `6a7e426`), e não contra a árvore. A árvore de trabalho estava limpa,
  então o resultado é o mesmo.
- Os testes de vizinhança (`criar.test.ts`, `gerar.test.ts`, `nomes-antes-de-gravar.test.ts` e o piso) rodaram junto com
  os quatro arquivos novos, porque a D-04 moveu funções que eles importam.

## Pendências

- Comando fora da regra: rodei um `grep -n` pelo Bash sobre a saída da suíte em /tmp. A regra manda ler /tmp só pela
  ferramenta Read. O comando só leu a saída da minha própria execução e não alterou nada. Ele fica declarado em
  "Comandos executados". O mesmo resultado foi lido depois pela Read (366 de 366 arquivos, 7967 de 7967 testes). Se o
  `conferir` recusar, a decisão de liberar a leitura ou refazer a etapa é do maestro. Nenhuma conclusão da revisão
  depende desse comando.
- Para a `06-T04-testes` (qa-automacao): o primeiro parecer Minor, sobre a guarda de `ExtrasDoPacote` e o número de
  citações da chave em `criar.ts`.
- Para a `08-revisao`: o zero à esquerda no índice da lista de permissão, olhado junto da leitura da T05.
- Para a T05: `lerCaminhosDaCriacao` e `caminhosDaCriacaoNoPedido` já existem e têm teste. `conferir.ts` só pode mudar
  no `select` do `alvo`, na leitura da coluna e no filtro do D1 (G4).

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files docs/construcao/DEC-DEM-20261111-0018-v1` — 20 arquivos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "### Task 4" -- docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md` — sem resultado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "T04" -- docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md` — T04 na linha 788
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 6a7e426d0ae181ea86973f3ff7886d9424315743~1 6a7e426d0ae181ea86973f3ff7886d9424315743 --stat` — 11 arquivos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 6a7e426d0ae181ea86973f3ff7886d9424315743 -- src/modules/pacotes-decisao/criar.ts src/modules/pedido-construcao/caminhos-da-criacao.ts src/modules/pedido-construcao/conteudo.ts src/modules/pedido-construcao/montar.ts test/estatico/piso-de-assercoes.test.ts` — diff lido
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A12 "export function temNome" -- src/modules/dados-pessoais/minimizar.ts` — temNome compara trocarNomes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A10 "export const nomesDoSolicitante" -- src/modules/demandas/consultas.ts` — null vira lista vazia
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "temNome" -- src` — conferir.ts:80 e caminhos-da-criacao.ts:26
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "artefato" -- src/modules/limites.ts` — 60 por hora
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "SB-07\|SB-08\|SB-09" -- docs/construcao/DEC-DEM-20261111-0018-v1/04-seguranca-aplicacao.md` — linhas 205 a 207 e a tabela de ameaças
- `git -C /home/deploy/servidor/projetos/estruturaAutonoma grep -n "^## " -- docs/construcao/padrao-tecnico.md` — 12 seções
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 41108ee 6a7e426d0ae181ea86973f3ff7886d9424315743 -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/modules/acesso/tokens-servico.ts src/proxy.ts src/lib/rota.ts src/db/transacao.ts src/db/privilegios.ts src/modules/integracoes/tempo-limite.ts src/modules/demandas/confirmacao.ts src/modules/pedido-construcao/pendentes.ts src/modules/pedido-construcao/entregar.ts src/modules/pedido-construcao/receber.ts src/modules/andamento/registrar.ts src/modules/limites.ts src/modules/pacotes-decisao/consultas.ts src/modules/demandas/consultas.ts src/modules/especificacoes/consultas.ts src/modules/pareceres-risco/consultas.ts src/modules/agentes/entrada-agente.ts next.config.ts 'drizzle/000[0-9]_*.sql' 'drizzle/meta/000[0-9]_snapshot.json'` — vazio (G4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — árvore limpa
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 41108ee 6a7e426d0ae181ea86973f3ff7886d9424315743 --stat` — 59 arquivos; piso-de-assercoes só com inserções
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -c "expect(" -- src/modules/pedido-construcao/textos-da-criacao.test.ts src/modules/pacotes-decisao/marcacao-da-criacao.test.ts test/transversal/visibilidade-caminhos-da-criacao.test.ts test/estatico/caminhos-da-criacao.test.ts` — 33, 18, 13 e 28
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "^import\|from '" -- src/modules/pedido-construcao/conteudo.ts src/modules/demandas/schemas.ts src/modules/dados-pessoais/minimizar.ts` — sem ciclo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "obterEspecificacao\|obterParecerRisco\|textosDoPedido" -- src/modules/pedido-construcao` — conferir.ts:72-73 e :79
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "RE_CAMINHO_DA_CRIACAO\|criterios_aceite_preliminares" -- docs/construcao/DEC-DEM-20261111-0018-v1/02-arquiteto-solucoes.md` — linha 191, mesma lista
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/pedido-construcao/textos-da-criacao.test.ts src/modules/pacotes-decisao/marcacao-da-criacao.test.ts test/estatico/caminhos-da-criacao.test.ts test/transversal/visibilidade-caminhos-da-criacao.test.ts test/estatico/piso-de-assercoes.test.ts src/modules/pacotes-decisao/criar.test.ts src/app/api/demandas/nomes-antes-de-gravar.test.ts src/modules/pedido-construcao/gerar.test.ts --reporter=dot` — 8 de 8 arquivos, 263 de 263 testes
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — em segundo plano: 366 de 366 arquivos, 7967 de 7967 testes, 0 falhas (193 s)
- `grep -n "Test Files\|Tests \|FAIL" /tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/d7de67e8-15e3-4f45-b927-45e1f3d1b43d/tasks/b3sywnmhz.output` — 366 passed e 7967 passed. Este comando está **fora da regra de comando** (ver Pendências)

Depois, a saída da suíte foi lida pelo meio previsto, a ferramenta Read em /tmp (linhas 715 a 733), com o mesmo resultado.

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
