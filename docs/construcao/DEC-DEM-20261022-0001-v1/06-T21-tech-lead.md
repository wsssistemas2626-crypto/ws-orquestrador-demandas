---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T21-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12), tarefas.json, 05-tech-lead.md, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G5 e T20 a T22), 01-analista-requisitos.md (glossário e RF-11 a RF-14), 06-T21-engenheiro-backend.md, 06-T20-tech-lead.md, commit 3ebf24a, src/modules/pacotes-decisao/decidir.ts, src/modules/pacotes-decisao/schemas.ts, src/modules/pacotes-decisao/consultas.ts, src/modules/pacotes-decisao/decidir.test.ts, src/modules/pacotes-decisao/concorrencia.test.ts, src/app/api/pacotes-decisao/[decId]/decisao/route.ts, src/app/api/pacotes-decisao/decisao.test.ts, src/db/schema/decisao.ts, src/modules/demandas/transicoes.ts, src/modules/acesso/matriz.ts, src/lib/erros.ts]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T21 (decisão e dupla aprovação), commit `3ebf24a`. Não há problema Critical nem Important, e a passagem
segue para a `06-T21-testes`. Os três pontos Minor estão em Pendências, cada um com arquivo:linha, problema e razão.

### O que foi conferido

- **Escopo do plano.** O commit mexe só nos 6 arquivos da lista da T21: cria `decidir.ts`, `decidir.test.ts`,
  `concorrencia.test.ts`, a rota `[decId]/decisao/route.ts` e `decisao.test.ts`, e modifica `schemas.ts`. Fora deles,
  só a entrega do engenheiro e o `passagens.jsonl` do maestro. As interfaces batem com o plano:
  - `registrarDecisaoSchema` é a união discriminada do plano, campo a campo, com a opção vinda de `OPCOES_DECISAO` do
    esquema do banco, sem uma segunda lista (`src/modules/pacotes-decisao/schemas.ts:44-55`);
  - `MODO_APROVACAO_ADMINISTRADORA = 'somente_propria'` (P1-a) e
    `registrarDecisao(deps, ator, decId, entrada, t?)`, que devolve `{ pacote, resultado }` com os quatro resultados
    do plano.
- **Ordem do serviço** (`src/modules/pacotes-decisao/decidir.ts:168-205`), a mesma do plano:
  1. `autorizar(ator, 'registrar_decisao')`, antes de abrir a transação;
  2. o `demandaId` do DEC (404 se não existe) e `travarDemanda`;
  3. a vista relida com `obterPacoteDecisao(tx, …)` **depois** da trava, e 409 se já há decisão (CA-11.3);
  4. 409 de desatualizado só para `aprovada` (CA-12.2, CA-12.3);
  5. 400 em `revisouRascunhosDeAgente` quando há rascunho citado (CA-13.4);
  6. devolvida ou arquivada: `decisao` com `decidida_por` da sessão, `decisao_registrada` e `mudarStatusPeloSistema`;
  7. aprovada: papel da conta, P1-b, os três 400/409 da dupla aprovação, `aprovacao_parcial` sem `decisao`, e a
     demanda sem mudança de status (P1-d).
- **Concorrência (C-13 e CA-11.3).** Em READ COMMITTED, cada comando depois da trava vê o que a outra transação gravou
  antes de soltá-la; a vista é lida depois da trava, então a ESP ou o RSK novos e a aprovação simultânea entram na
  conta. O banco tem a segunda barreira: PK de `decisao` por DEC e `unique (pacote_decisao_id, papel_aprovacao)` em
  `aprovacao` (`src/db/schema/decisao.ts:93`, `:106-108`). O `CHECK` de documento da administradora
  (`src/db/schema/decisao.ts:96-99`) também é cumprido pelo serviço antes do insert, com o 400 de CA-14.3. Os quatro
  testes de corrida cobrem ESP v2 (20 rodadas), RSK v2 (10), aprovar × arquivar e CTO × administradora (5).
- **Autoria (C-11, C-12, CA-13.5).** O insert de `aprovacao` e de `decisao` é campo a campo, com nome, conta e papel do
  ator (`decidir.ts:112-123`, `:83-91`). O schema não tem nenhum dos dez nomes de autoria de G3.9, e o teste manda oito
  deles no corpo e confere que só sobram `statusDecisao` e `opcaoEscolhida`. `registrarComo` vindo do CTO dá 403 nos
  dois níveis; agente e sistema dão 403 chamando a função direto, como o worker.
- **Status da demanda (RF-07, P1-d).** `decisao_devolvida` leva a `em_analise` e `decisao_arquivada` a `encerrada`, pelo
  ator `sistema` e depois do evento da decisão; aprovar deixa a demanda em `pronta_para_decisao`.
- **Histórico (RF-21, C-30).** `aprovacao_registrada` leva papel, opção e, só na da administradora, identificador e data
  do documento, como o plano manda; `decisao_registrada` leva status e opção. O comentário nunca entra: o teste usa
  três sentinelas nos comentários e confere o histórico inteiro.
- **Rota (CA-02.1, C-15, C-17, C-21).** `PATCH` é adaptador fino sobre `rota()` com
  `paramId.versao('decId', 'DEC')`; só `PATCH` é exportado. O teste confere 403 com o token de cada um dos quatro
  agentes, 403 sem 2FA, 401 sem credencial, 403 de `Origin` e 415 de `Content-Type`, 404 a id fora do formato sem
  consulta nem conexão, os corpos exatos de 400 e 409, e o log sem id, corpo, sentinela nem token. O
  `test/matriz-rotas.test.ts` passou a cobrir a rota nova sem mudança nele.
- **Transação de quem chama (G3.8).** Com `t`, o serviço grava e lê a vista na mesma transação; o rollback desfaz
  aprovação, decisão, eventos e status, com teste.
- **Testes.** Os 14 testes do plano estão presentes, com corpo, e todo comportamento novo tem teste: 44 no serviço, 4
  de concorrência e 18 pela rota. Todos falhariam sem o código: os módulos não existiam, e a entrega mostra a falha de
  importação dos três arquivos.
- **Desvios declarados, todos aceitos:**
  - `deps: DepsDemanda`, como na T18, na T19 e na T20;
  - `papelDaAprovacao(ator, entrada, modo?)` exportada, com o modo como parâmetro: é o que deixa o teste provar o outro
    modo de P1-a sem mudar a constante;
  - `MENSAGENS_DECISAO` exportadas para a T43 usar os mesmos textos;
  - `LIMITE_REFERENCIA_DOCUMENTO` e o tipo `RegistrarDecisao` em `schemas.ts`.
- **Suíte nesta revisão.** `pnpm test` passou com 1892 de 1892 testes em 100 arquivos, o mesmo número da entrega.
  `pnpm lint` e `pnpm typecheck` saíram limpos, e a árvore está limpa no
  ramo `construcao/DEC-DEM-20261022-0001-v1`.

### Checklist da seção 12 do padrão técnico

- [x] A tarefa faz o que o plano pede: os 6 arquivos da lista, nenhum outro arquivo de código alterado; as exportações
  a mais servem ao teste de P1-a e à T43.
- [x] Há teste para cada comportamento novo, e ele falharia sem o código.
- [x] Nenhum segredo, valor de `.env` ou dado pessoal real: `Pessoa Ficticia`, `exemplo.test`, `SENTINELAS`,
  `DOC-FICTICIO-00N` e prefixo de token inventado.
- [x] Entrada externa validada com Zod (`registrarDecisaoSchema` e `paramId`). O 400 não devolve o valor recebido, como
  mostram os testes com sentinela em `opcaoEscolhida` e em `statusDecisao`.
- [x] Banco: a tarefa não tem migration nem `tenant_id`; usa as tabelas da T05, com as restrições de unicidade e de
  documento que ela já trazia. Não se aplica.
- [x] Nada duplica função existente: autorização, trava, vista, desatualizado, transição automática, evento e
  mapeamento de erro vêm dos módulos já entregues. Ficam duas cópias pequenas que a 08 deve juntar (Minor 1 e Minor 2).
- [x] Interface: a tarefa não tem tela; os textos de erro são os da 03, em pt-BR.
- [x] O que é Minor foi para Pendências; nenhum Critical ou Important.
- [x] Os itens de PR (`/code-review` e `/security-review`) são da `08-revisao`, fora desta etapa.

## Decisões tomadas

- Aceita a confirmação de revisão também para devolver e arquivar: o passo 5 do plano vem antes do 6, e a RN do RF-13
  diz "sem isso a decisão é recusada", sem distinguir o tipo.
- Aceita a administradora devolvendo ou arquivando DEC de nível `cto`: P1-b só restringe a aprovação, e
  `registrar_decisao` é `QUALQUER_PESSOA_SEM_AGENTE` na matriz.
- Aceito o 409 "a aprovação do CTO já está registrada." para papel repetido: a 03 não tem o texto, e ele segue o molde
  dos outros 409 do plano.
- Aceito `decisao.comentarios` com o comentário de quem completou a dupla aprovação: cada aprovação guarda o seu em
  `aprovacao.comentario`, então nenhum comentário se perde.
- Aceita a ordem do 403 de `registrarComo` depois dos 409 e do 400 de rascunho: é a ordem dos passos do plano (passo 7
  depois do 3 ao 5), e nos dois casos nada é gravado.
- Status `pronto`: só sobraram pontos Minor, e pela seção 12 Minor não bloqueia a passagem.

## Pendências

1. **Minor.** `src/modules/pacotes-decisao/decidir.ts:62`
   - Problema: `textoOuNulo` é a terceira cópia da regra de texto opcional vazio, depois de `textoOuNulo` no RSK
     (`src/modules/pareceres-risco/servico.ts:20`) e `preenchido` no DEC (`src/modules/pacotes-decisao/criar.ts:27`).
   - Razão: é o Minor 1 da `06-T20-revisao` crescendo; cada tarefa nova que grava texto opcional escolhe uma cópia.
   - Sugestão: entra na mesma correção da 08 do Minor 1 da T20 (um ajudante único, usado no RSK, no DEC, na decisão e
     na ESP). O lugar comum fica fora da lista de arquivos da T21.
2. **Minor.** `src/modules/pacotes-decisao/decidir.ts:55`
   - Problema: `MENSAGEM_CORRIJA_OS_CAMPOS` repete o literal "Corrija os campos abaixo para continuar." que `deZod` já usa
     (`src/lib/erros.ts:79`), sem constante exportada.
   - Razão: o 400 de campo do serviço e o do Zod precisam do mesmo texto, porque a T43 mostra os dois iguais; com duas
     cópias, uma mudança na 03 pode atualizar só uma.
   - Sugestão: na 08, exportar a constante de `src/lib/erros.ts`, usá-la em `deZod`, e `decidir.ts` reexportar ou
     importar de lá.
3. **Minor, para quem ligar o outro modo de P1-a.** `src/modules/pacotes-decisao/decidir.ts:115`
   - Problema: no modo `cto_com_referencia`, a aprovação de papel `administradora` registrada pelo CTO grava
     `nome_aprovador` com o nome da conta do CTO. O engenheiro registrou isso.
   - Razão: o modo da 0.1.0 é `somente_propria` e o plano não diz de onde viria o nome da administradora, então não há
     defeito hoje; mas a constante "a uma linha de distância" não basta para ligar o outro modo.
   - Sugestão: a mudança de modo, se vier, entra com a regra do nome (por exemplo, o nome da conta de papel
     `administradora`) e um teste; até lá, nada a fazer.
4. **Para a T22**, registrado pelo engenheiro e confirmado aqui: `aprovadores` vem por `registrada_em` e, no mesmo
   instante, pela ordem alfabética do papel (`src/modules/pacotes-decisao/consultas.ts:109`). `aprovadoPor` deve ser
   montado pela ordem do papel (cto, administradora), e não pela ordem da vista.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 3ebf24a84a49cfe4ec68b5faf4460fb0069364d8` — 8 arquivos: os 6 da T21, a entrega do engenheiro e `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/estruturaAutonoma log --oneline -1 -- docs/construcao/padrao-tecnico.md` — 8fcea5b, arquivo rastreado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 3ebf24a84a49cfe4ec68b5faf4460fb0069364d8 -- src/modules/pacotes-decisao/decidir.ts src/modules/pacotes-decisao/schemas.ts src/app/api/pacotes-decisao/[decId]/decisao/route.ts` — código de produção da tarefa
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 3ebf24a84a49cfe4ec68b5faf4460fb0069364d8 -- src/modules/pacotes-decisao/decidir.test.ts` — 44 testes
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 1892 de 1892, 100 arquivos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, ramo `construcao/DEC-DEM-20261022-0001-v1`

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
