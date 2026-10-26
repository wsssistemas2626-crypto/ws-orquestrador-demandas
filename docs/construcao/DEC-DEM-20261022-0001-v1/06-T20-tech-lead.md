---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T20-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12), 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G5 e T19 a T21), 01-analista-requisitos.md (RF-01 a RF-13), 06-T20-engenheiro-backend.md, 06-T19-tech-lead.md, commit 69b5630, src/modules/pacotes-decisao/desatualizado.ts, src/modules/versoes.ts, src/modules/acesso/matriz.ts, src/modules/pareceres-risco/servico.ts, src/modules/pareceres-risco/consultas.ts]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T20 (pacote de decisão versionado, desatualizado e filtro por status de decisão), commit `69b5630`. Não há
problema Critical nem Important, e a passagem segue para a `06-T20-testes`. Os quatro pontos Minor estão em Pendências,
cada um com arquivo:linha, problema e razão.

### O que foi conferido

- **Escopo do plano.** O commit cria os 9 arquivos da lista da T20 e não altera nenhum outro arquivo de `src/` ou
  `test/`. As interfaces batem com o plano:
  - `opcaoSchema`, `criarPacoteDecisaoSchema` e `filtroPacotesSchema`, campo a campo;
  - os níveis e os status vêm de `NIVEIS_APROVACAO` e `STATUS_DECISAO` do esquema do banco, sem uma segunda lista;
  - `descricaoDaDemanda`, `criarPacoteDecisao(deps, ator, demandaId, entrada, t?, extras?)`, `obterPacoteDecisao` e
    `listarPacotes`.
- **Ordem do serviço.** Em `src/modules/pacotes-decisao/criar.ts:67-123` a ordem é a que o plano pede:
  1. `autorizar`;
  2. `travarDemanda`;
  3. `conferirLimite('artefato')`;
  4. ESP e RSK de maior versão, ou 400 com `faltando` só do que falta, na ordem `especificacao`, `parecer_risco`;
  5. `proximaVersao`;
  6. insert campo a campo, com a cópia de `tipo`, `titulo` e `descricaoDaDemanda(d)`;
  7. evento `pacote_decisao_criado`;
  8. `mudarStatusPeloSistema(tr, deps, demandaId, 'dec_criado')`.

  A leitura da ESP e do RSK acontece sob a trava da demanda, o que fecha a corrida com uma ESP ou um RSK novo. Quando
  recebe a transação de quem chama (G3.8), o serviço lê a vista nessa mesma transação. O aviso por e-mail ficou para a
  T30, como o plano manda.
- **Desatualizado (RF-12).** A leitura usa `expressaoDesatualizado()` da T15 sem mudança. Os aliases `esp_citada` e
  `rsk_citado` (`src/modules/pacotes-decisao/consultas.ts:63-64`) evitam que a junção com a ESP e o RSK citados se
  confunda com as subconsultas, que leem as tabelas pelo nome. Há teste para ESP v2, RSK v2, DEC v2 atualizado com o v1
  desatualizado e ESP v2 de outra demanda.
- **Matriz (C-10).** `criar_pacote_decisao` aceita qualquer pessoa e o agente `consolidacao`. `ler_pacote_decisao` é
  `LEITURA` (`src/modules/acesso/matriz.ts:51-52`). Usar `ler_pacote_decisao` também na listagem está certo: a matriz
  não tem ação própria de listagem de pacote, e a leitura é a mesma. Os testes cobrem `risco` e `insumo_tecnico` pela
  rota (403), e `sistema`, `orquestrador`, `insumo_tecnico` e `risco` pelo serviço.
- **Autoria (C-11).** A autoria vem de `autoriaDo`, e o insert é campo a campo. O schema não tem campo de autoria,
  versão, ESP, RSK nem decisão. Os testes mandam esses campos no corpo, no schema e pela rota, e conferem que foram
  descartados.
- **Evento sem texto livre (C-30).** O `depois` leva só ids, a versão, o rascunho e o nível. O teste põe sentinelas no
  resumo, nas duas opções e na recomendação e confere que nenhuma aparece no histórico.
- **Limite (C-36).** O limite soma ESP, RSK e DEC do mesmo ator. Os testes de serviço e de rota esperam o 429 e conferem
  que outro ator não é afetado.
- **Rotas (C-15, C-17, C-21, CA-11.1).** As três rotas são adaptadores finos sobre `rota()`.
  - `paramId.versao('decId', 'DEC')` e `paramId.demanda` respondem 404 a id fora do formato. O teste confere que isso
    acontece sem consulta e sem conexão.
  - A rota da versão e a do filtro só exportam `GET`; a da lista exporta `GET` e `POST`.
  - O log não traz id, query, sentinela nem token.
- **Leitura (RF-10, RF-23).**
  - `statusDecisao` vale `pendente` quando não há linha em `decisao`. `aprovadores` e `decisao` são montados campo a
    campo, sem `registrada_por` e sem o id de conta.
  - `total` usa o mesmo filtro da página.
  - CA-23.1 roda num banco próprio, o que impede que os DEC dos outros testes entrem no total.
- **Testes.** Os dez testes do plano estão presentes, com corpo, e todo comportamento novo tem teste. Todos falhariam
  sem o código: os módulos não existiam, e a entrega mostra a falha de importação. A concorrência do CA-04.3 é real,
  com três criações em paralelo.
- **Desvios declarados, todos aceitos:**
  - `desatualizado.ts` não mudou, porque a T15 já entregou o que o passo 3 pede;
  - `deps: DepsDemanda`, como na T18 e na T19;
  - `listarPacotesDaDemanda` existe para o `GET` da lista, que a 01 pede (RF-10, rotas), com `{ itens }` e 404 como
    na ESP e no RSK;
  - `decididaPor` traz o nome da conta, e não o id, seguindo a regra das outras vistas;
  - os testes dos schemas ficaram dentro dos dois arquivos de teste da lista.
- **Suíte nesta revisão.** `pnpm test` passou com 1813 de 1813 testes em 97 arquivos. `pnpm lint` e `pnpm typecheck`
  saíram limpos, e a árvore está limpa.

### Checklist da seção 12 do padrão técnico

- [x] A tarefa faz o que o plano pede: os 9 arquivos da lista, sem nenhum outro arquivo de código alterado; o único
  "Modificar" do plano não foi preciso, pelo desvio 1, que foi aceito.
- [x] Há teste para cada comportamento novo, e ele falharia sem o código.
- [x] Nenhum segredo, valor de `.env` ou dado pessoal real. Os dados são fictícios: `Pessoa Ficticia`, `exemplo.test`,
  `SENTINELAS`, `DOC-FICTICIO-001` e um prefixo de token inventado.
- [x] Entrada externa validada com Zod (`criarPacoteDecisaoSchema`, `filtroPacotesSchema` e `paramId`). O 400 não
  devolve o valor recebido, como mostram os testes do corpo inválido e do CA-23.2 pela rota.
- [x] Banco: a tarefa não tem migration nem `tenant_id`, e as tabelas usadas são as da Fundação. Não se aplica.
- [x] Nada duplica função existente: autoria, limite, versão, trava, evento, desatualizado e regex vêm dos módulos já
  entregues. Ficam dois ajudantes locais pequenos que, na 08, devem passar a ser compartilhados (Minor 1 e Minor 2).
- [x] Interface: a tarefa não tem tela; os textos de erro do servidor estão em pt-BR.
- [x] O que é Minor foi para Pendências; nenhum Critical ou Important.
- [x] Os itens de PR (`/code-review` e `/security-review`) são da `08-revisao`, fora desta etapa.

## Decisões tomadas

- Aceito o desvio 1: `expressaoDesatualizado()` já correlaciona com `(demanda_id, versao)`, e mudar o arquivo só para
  cumprir o "Modificar" do plano mexeria em código da T15 sem ganho.
- Aceito `decididaPor` como nome da conta: o id interno de conta não sai em nenhuma vista, e a T21 usa o nome. O tipo
  `string | null` é o mesmo de `Responsavel`.
- Aceito `preenchido` local, mesmo com o Minor 1 da `06-T19-revisao`: o lugar comum (`src/modules/demandas/` ou um
  módulo novo, com a troca no RSK) fica fora da lista de arquivos da T20. Juntar as regras é trabalho da 08 (Minor 1).
- Aceito o DEC em qualquer status da demanda, com o status mudando só a partir de `nova`, `em_analise` e
  `aguardando_informacao`: o RF-07 não proíbe a criação, e o comportamento tem teste. A confirmação com a 01 fica como
  Minor 3.
- Status `pronto`: só sobraram pontos Minor, e pela seção 12 Minor não bloqueia a passagem.

## Pendências

1. **Minor.** `src/modules/pacotes-decisao/criar.ts:27`
   - Problema: `preenchido` é a segunda cópia da regra de texto opcional vazio, ao lado de `textoOuNulo`
     (`src/modules/pareceres-risco/servico.ts:20`). As duas também não são iguais: `preenchido` apara o texto antes de
     comparar, e `textoOuNulo` supõe que o Zod já aparou. A ESP e a demanda seguem gravando `''`.
   - Razão: são três regras para o mesmo tipo de campo. Quem lê (T10, T11, T22) continua tendo de tratar `''` e `null`
     como iguais na ESP e na demanda, e a próxima tarefa que gravar texto opcional vai escolher uma das duas cópias.
   - Sugestão: na 08, criar um ajudante único, por exemplo `textoOpcionalOuNulo` num módulo comum, e usá-lo no RSK, no
     DEC e na ESP. Na demanda, é preciso preservar o `null` que limpa um campo no `alterarDemandaSchema`.
2. **Minor.** `src/modules/pacotes-decisao/criar.ts:54-57`
   - Problema: `maisNova` é a terceira leitura da maior versão de ESP ou RSK de uma demanda. As outras duas são
     `proximaVersao` (`src/modules/versoes.ts:25-31`) e as duas consultas de `obterParecerRisco`
     (`src/modules/pareceres-risco/consultas.ts:81-82`).
   - Razão: a T21 e a T22 também vão precisar da versão mais nova. Sem um ajudante comum, cada tarefa escreve a sua.
   - Sugestão: na 08, ou na primeira tarefa que tiver `src/modules/versoes.ts` na lista, criar
     `maisNovaVersao(tx, tabela, demandaId): Promise<{ id: string; versao: number } | undefined>` em `versoes.ts` e
     usá-la nos três lugares. Até lá, a T21 importa a de `criar.ts`, se puder exportá-la, em vez de criar uma quarta.
3. **Minor.** `src/modules/pacotes-decisao/criar.ts:72-121`
   - Problema: o DEC é aceito também quando a demanda está em status final (`encerrada`, `entregue`) ou em
     `em_construcao`. O status não muda e não há aviso.
   - Razão: o RF-10 e o RF-07 não proíbem, e o plano não restringe. Mesmo assim, um DEC pendente numa demanda encerrada
     aparece no filtro `statusDecisao=pendente` da fila de decisão (RF-23), e não há transição manual que leve a
     demanda de volta.
   - Sugestão: a `07-qa-funcional` confere com a 01 se o DEC deve ser recusado nos status finais. Se deve, a correção na
     08 é um 409 em `criar.ts`, logo depois de `travarDemanda`, com o teste correspondente.
4. **Minor, para a T22.** `src/modules/pacotes-decisao/criar.ts:37-42`
   - Problema: uma demanda sem contexto, sem problema e sem impacto gera um DEC com `demandaDescricao` vazia. O
     `validarPedido` recusa a descrição vazia, e o pedido desse DEC vai responder 422. O engenheiro já registrou isso.
   - Razão: a pessoa só descobre o problema depois da aprovação, na hora de gerar o pedido.
   - Sugestão: a T22 devolve o 422 com a mensagem da 03. Se a 01 quiser recusar já na criação do DEC, entra junto com o
     Minor 3, na mesma correção da 08.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 69b5630da3b258c79f5b173ec0cee99e2f64ef70` — 11 arquivos: os 9 da T20, a entrega do engenheiro e `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 69b5630da3b258c79f5b173ec0cee99e2f64ef70 -- src/modules/pacotes-decisao/schemas.ts src/modules/pacotes-decisao/criar.ts src/modules/pacotes-decisao/consultas.ts src/app/api/demandas/[id]/pacotes-decisao/route.ts src/app/api/pacotes-decisao/route.ts src/app/api/pacotes-decisao/[decId]/route.ts` — código de produção da tarefa
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 69b5630da3b258c79f5b173ec0cee99e2f64ef70 -- src/modules/pacotes-decisao/criar.test.ts` — 29 testes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 69b5630da3b258c79f5b173ec0cee99e2f64ef70 -- src/modules/pacotes-decisao/consultas.test.ts` — 21 testes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 69b5630da3b258c79f5b173ec0cee99e2f64ef70 -- src/app/api/pacotes-decisao/pacotes.test.ts` — 25 testes
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 1813 de 1813, 97 arquivos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, ramo `construcao/DEC-DEM-20261022-0001-v1`

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
