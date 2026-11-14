---
pedido: DEC-DEM-20261111-0018-v1
etapa: 10-documentacao
agente: documentacao-tecnica
leu: [contrato-passagem.md, pedido.json, spec 2026-11-13-ws-orquestrador-demandas-sobras-design.md, plano 2026-11-13-ws-orquestrador-demandas-sobras-plano.md (cabeçalho, G1, G2 e mapa RF/SB, por busca), 01-analista-requisitos.md (RF-09, RF-10, CA-04.4, CA-09.1, CA-10.x), 02-arquiteto-solucoes.md (títulos), 06-T02-engenheiro-backend.md (por busca), 06-T06-qa-automacao.md (por busca), 06-T08-engenheiro-backend.md, 06-T08-tech-lead.md (por busca), 06-T09-engenheiro-backend.md (por busca), 06-T10-engenheiro-backend.md (por busca), 06-T14-qa-automacao.md, 07-qa-funcional.md (seção 0 e 1), 08-maestro.md, 09-devops-sre.md, DEC-DEM-20261111-0017-v1/10-documentacao-tecnica.md (formato), DEC-DEM-20261022-0001-v1/10-documentacao-tecnica.md e DEC-DEM-20261104-0014-v1/06-documentacao-tecnica.md (precedente da spec), README.md, CHANGELOG.md, docs/manual-tecnico (README e caps. 01, 02, 03, 04, 05, 08, 09, 10), docs/operacao/deploy.md (cabeçalho, seções 2 e 5), docs/operacao/tokens-de-integracao.md, spec 2026-10-25-ws-orquestrador-demandas-design.md (tabela dos RF), spec 2026-11-11-ws-orquestrador-demandas-integracoes-design.md (seção 3.4), package.json (versão), test/estatico/docs-sem-token.test.ts, test/estatico/piso-de-assercoes.test.ts (por busca), test/sessoes-do-banco.ts, src/modules/pedido-construcao (situacao.ts, conferir.ts, caminhos-da-criacao.ts, montar.ts), src/app/api/pedidos-construcao/[decId]/situacao/route.ts, src/modules/demandas (arquivamento.ts, transicoes.ts), src/modules/pacotes-decisao (substituido.ts, decidir.ts e criar.ts, por trechos), src/modules/acesso/matriz.ts (por busca), src/modules/andamento/consultas.ts (por busca), src/lib/erros.ts (por busca), src/components (dados-da-decisao.ts, dados-do-pedido.ts e dados-das-etapas.ts, por trechos; rotulos.ts, por busca), src/app/(painel)/pacotes-decisao/[decId]/page.tsx (por trechos), scripts/seed-ficticio.ts (por trechos), drizzle/0010_magical_cammi.sql (por nome)]
status: pronto
proximo: maestro
devolvido_para: null
---
## Entrega

Documentação da 0.4.1 (sobras da 0.1.13 e da revisão final da 0.4.0), escrita a partir do código do ramo
`construcao/DEC-DEM-20261111-0018-v1`. Onde as entregas e o código diferem, vale o código (padrão técnico, seção 11).
Nenhuma divergência de comportamento foi achada nesta etapa; as diferenças de texto estão em Pendências.

### Arquivos alterados

| Arquivo | O que mudou |
|---|---|
| `CHANGELOG.md:6` | Seção nova **0.4.1 — 2026-11-14** (passa na regra `^##\s+\[?v?0\.4\.1\]?(\s|$)`): opção e acréscimos de 13/11 e 14/11; base `41108ee`; migration `0010`; a publicação em cinco passos, pela primeira vez com o serviço `migrar`; a volta só com o backup e o `migrar` parado; o que muda para quem usa (S-04 com a tabela, dica e chegada do Arquivar, três avisos, textos revistos, T05, S-03, fila); o que mudou na API (rota de situação e respostas, "informa, não autoriza", 409 com texto novo); o que mudou no código (matriz, situação, nome da criação, arquivamento, LATERAL, painel, **C-27 com a causa escrita como "causa provável"** e a correção, piso, seed com 40, testes, versão, documentação); o que ficou fora; verificações (inclusive o que não rodou: RNF-01 e RNF-05); pendências para Fabiano (publicação e `migrar`, risco do `migrar`, aceite do risco residual, S-02 do lado do `/construir`, **R-08-1 e R-08-2 como pendência conhecida, não defeito**, spec com o maestro, UAT, RNF-01/RNF-05, pedido futuro) e para outras áreas; o que fecha com a versão |
| `README.md:5-6`, `:67` a `:79`, `:94`, `:218-220` | Versão 0.4.1 e data; parágrafo da 0.4.1 (situação, D1, arquivamento, `migrar`); linha da spec e do plano da 0.4.1; a regra de migration com o `migrar`. Os comandos de instalar e verificar não mudaram e já eram os do padrão técnico |
| `docs/manual-tecnico/README.md` | Versão 0.4.1, data; parágrafo da spec (a atualização da spec fica com o maestro); parágrafo da spec da 0.4.1; caps. 01, 04 e 05 na tabela; RF-07 e RF-22 no mapa; seção nova **"Requisitos das sobras (0.4.1)"** (`:169`) com RF-01 a RF-10 do pedido; glossário: "Aprovado vigente" com o termo de tela, **"Em vigor"**, **"Situação do pedido"**, **"Caminhos da criação"** e "Situação da construção" distinguida da situação do pedido |
| `docs/manual-tecnico/04-versoes-e-decisao.md` | Cabeçalho e fontes; passo 8 do RF-13 (devolver e arquivar separados); 409 do S-01 com o texto revisto e o aviso (c); frase do histórico; "No painel" com os textos revistos; **regra de uso do S-02 revista** (a rota existe, o lado do `/construir` não); seção nova **"Arquivar o DEC mais novo (0.4.1)"** (`:265`) com a tabela status × estado do vigente; **"Limite conhecido"** reescrito: o que a 0.4.1 fechou (S-04, S-03, avisos) e os limites que ficam (S-02 do lado do `/construir`, **S-03 nos DEC anteriores à 0.4.1**, **`vigente` não é "pode construir"** — DEC desatualizado e demanda em status final —, R-08-1) |
| `docs/manual-tecnico/08-painel.md` | Cabeçalho e "Cobre"; parágrafo da 0.4.1; linha da T11 na tabela de telas; etapa 4 da barra e quando a Decisão conta como feita; linha 6 da Próxima ação; parágrafo de qual linha vale depois do arquivamento; ordem dos alertas da T11; consequência do Arquivar; seção nova **"Avisos da vigência e Arquivar (0.4.1)"** (`:431`): os três avisos com condição, texto e link, dica do Arquivar por destino, chegada por status, tabela dos textos revistos; e2e `vigencia.spec.ts`; seed com 40; pendências: bloco novo da 0.4.1 com **R-08-1**, pedido futuro e capturas; o item dos textos da 0.1.13 marcado como fechado |
| `docs/manual-tecnico/05-pedido-de-construcao.md` | Cabeçalho, "Cobre" e fontes; passo 6 com o 409 revisto; D1 no passo 10; determinismo; subseção nova **"Nome da criação (0.4.1)"** (`:167`), com a marcação, a leitura que falha fechada, exemplo fictício e o **limite do S-03 para DEC antigo** (inclusive o DEC criado pela 0.4.0 no intervalo da publicação); "O que a conferência não pega"; linha 6 da orientação nas duas variações; entrega; seção nova **"Situação do pedido (0.4.1)"** (`:580`): rota, tabela de respostas, ordem das conferências, limites (**`vigente` com demanda encerrada**, desatualizado, sem limite de taxa, corrida) e o que o `/construir` deve fazer com cada resposta (falhar fechado) |
| `docs/manual-tecnico/03-demandas.md` | Cabeçalho; RF-07: o arquivamento sai de `AUTOMATICAS`, com o destino pelo vigente; RF-21: frase revista do `pacote_decisao_substituido` |
| `docs/manual-tecnico/09-referencia-api.md` | Cabeçalho e fontes; rota nova na tabela; status depois de arquivar no `PATCH .../decisao`; 403 nas cinco rotas do `/construir`; exemplo novo **"o /construir consulta a situação do pedido"** (`:180`); 409 do substituído e do S-01 com os textos revistos; exemplo do arquivamento com vigente; 404 da situação na tabela de erros |
| `docs/manual-tecnico/02-acesso-e-seguranca.md` | Cabeçalho; `construir` com cinco ações na tabela das integrações; sem limite de taxa na situação; sete pares e **25 ações** na matriz; linha `ler_situacao_pedido` |
| `docs/manual-tecnico/01-arquitetura.md` | Cabeçalho, "Cobre" e fontes; a leitura nova no desenho; módulos (`arquivamento.ts`, `situacao.ts`, `caminhos-da-criacao.ts`, `vigenteDaDemanda`, LATERAL); 11 migrations; migration de produção pelo `migrar`; bloco da **migration `0010`**; **ADR-36 a ADR-40** e onde está o texto completo |
| `docs/manual-tecnico/10-configuracao-e-scripts.md` | Cabeçalho; `DATABASE_URL_MIGRATOR` como única variável do `migrar` (só pelo nome); seed com 40; tabela das quatro demandas da vigência, conferida em `VIGENCIAS` do `seed-ficticio.ts` |
| `docs/operacao/tokens-de-integracao.md` | Versão 0.4.1 e data; linha do `construir` na tabela; seção nova "O token `construir` lê a situação do pedido desde a 0.4.1" (SB-17: emissão sem mudança; lê a situação de todo DEC com pedido gerado por pessoa, inclusive substituído e de demanda em status final; rota consultiva; cliente falha fechado; sem limite de taxa; revogar pelo prefixo); volta da 0.4.1 em "Se a integração der problema" |
| `docs/operacao/deploy.md:5`, `:10` | Campo **Versão** 0.4.1 e a linha da `documentacao-tecnica` no "Atualizado em". O roteiro das seções 1 a 6 e 10, inclusive o do serviço `migrar`, ficou como o `devops-sre` escreveu |

### Conferências

- CA-04.4: o `CHANGELOG.md`, em "O que mudou no código", traz a causa do C-27 como **"Causa provável"**, a correção, o
  teste permanente (CA-04.3), as 8 asserções antes e depois e as 20 execuções (texto da `06-T08-engenheiro-backend.md`).
- CA-10.1: `package.json` tem `"version": "0.4.1"`, e o CHANGELOG tem a seção 0.4.1.
- CA-10.2: a rota de situação está nos caps. 02, 05 e 09; a regra do arquivamento, nos caps. 03, 04 e 08. Varredura
  pelo Grep: nenhum texto do manual nem de `docs/operacao` diz que arquivar o v2 sempre encerra a demanda (as duas
  menções a `decisao_arquivada` dizem "até a 0.4.0").
- CA-09.1: **não atendido nesta etapa** (spec fora da lista Pode; ver Pendências, com o texto proposto).
- Textos de tela conferidos contra o código, e não contra a 03: `TEXTOS_DECISAO` (`dados-da-decisao.ts:47-102`,
  `:164-167`), `MENSAGENS_PEDIDO.substituido` (`conferir.ts:45`), `MENSAGENS_DECISAO.nivelMenorQueOVigente`
  (`decidir.ts:56-57`), `ORIENTACAO.aviso` e `avisoDupla` (`dados-do-pedido.ts:56-58`) e `textoDoEvento`
  (`rotulos.ts:314-315`). As condições dos avisos saíram de `avisoDeVigencia`, a tabela do arquivamento de
  `destinoDoArquivamento`, as respostas da rota de `situacao.ts` e `route.ts`, o 404 de `MENSAGEM_NAO_ENCONTRADO`, a
  etapa 4 e a linha 6 de `dados-das-etapas.ts:144-146` e `:246`, e o alvo de 44 px de `CLASSE_LINK_SOLTO`
  (`min-h-11`, `page.tsx:82`).
- Varredura do formato de token (`wsod_` + 43 caracteres) nos arquivos editados: nenhuma ocorrência. Os exemplos usam
  `wsod_<token da integração construir>`.
- Variáveis de ambiente: nenhuma nova; a `DATABASE_URL_MIGRATOR` aparece só pelo nome.
- Links internos novos: todos apontam para arquivos que existem e para títulos que existem. Âncoras conferidas pelo
  Grep contra os títulos: `#arquivar-o-dec-mais-novo-041` (cap. 04, `:265`), `#nome-da-criação-041` (cap. 05, `:167`),
  `#situação-do-pedido-041` (cap. 05, `:580`), `#avisos-da-vigência-e-arquivar-041` (cap. 08, `:431`),
  `#exemplo-o-construir-consulta-a-situação-do-pedido` (cap. 09, `:180`), `#requisitos-das-sobras-041` (README do
  manual, `:169`), além das que já existiam (`#nome-do-solicitante`, `#substituição-do-dec-aprovado`, `#módulos`,
  `#acessibilidade-rnf-11`, `#matriz-de-acesso`, `#pendências-de-interface-conhecidas`, `#demanda-t05-rf-08-a-rf-10`,
  `#rf-07-status-e-transições`). Arquivos citados por caminho: `drizzle/0010_magical_cammi.sql`,
  `src/app/(painel)/demandas/[id]/detalhe-vigente-banco-qa.test.ts`, a spec e o plano da 0.4.1 e o
  `02-arquiteto-solucoes.md` (seção 9, ADRs) existem.

## Decisões tomadas

- O manual descreve o código: textos, condições, tabela do arquivamento, respostas da rota e seed saíram dos arquivos
  do ramo, citados acima, e não da 03 nem da spec.
- A causa do C-27 foi copiada da `06-T08-engenheiro-backend.md` com "Causa provável" em destaque e a frase de que não foi
  reproduzida, como pedem a 08, a T08 e o maestro; a prova definitiva (CI do PR) ficou em "Verificações".
- R-08-1 e R-08-2 entraram como pendência conhecida, não como defeito, no CHANGELOG e, a R-08-1, também nos caps. 04 e
  08, onde quem lê a tela vai procurar.
- Os dois limites pedidos ficaram no lugar onde a pessoa procura: o S-03 para DEC antigo no cap. 05 ("Nome da criação")
  e no cap. 04 ("Limite conhecido"); a rota de situação com demanda encerrada no cap. 05 ("Situação do pedido",
  Limites), no cap. 04 e no exemplo do cap. 09. Acrescentei o caso do DEC desatualizado, que o código também responde
  `vigente` (`situacao.ts` só usa `aprovadoVigente`).
- No `deploy.md`, só o campo Versão e o registro: o roteiro do `devops-sre`, inclusive o do `migrar`, não foi tocado.
  O manual (caps. 01 e 10 e README) só aponta para ele.
- A rota de situação ficou no cap. 05 junto das outras rotas do `/construir`, como a decisão 7.2, item 8, pede para a
  spec; o mesmo lugar lógico no manual.
- A spec do sistema e a das integrações **não** foram editadas: `docs/superpowers/specs/` está fora da minha lista
  Pode (só `README.md`, `CHANGELOG.md`, `docs/manual-tecnico/` e `docs/operacao/`). Segui o precedente do 0001 e do
  0014 (a spec fica com o maestro na Parada 3) e deixei o texto pronto em Pendências. Não marquei `bloqueado` porque o
  critério de pronto da etapa não inclui a spec e o resto da entrega não depende dela.

## Pendências

- **Spec do sistema e spec das integrações (RF-09, CA-09.1), para o maestro na Parada 3.** O maestro pediu a A-02 e os
  CA-22.x no RF-13 e no RF-22 e a rota de situação na spec das integrações, mas os dois arquivos ficam em
  `docs/superpowers/specs/`, fora da lista Pode da `10-documentacao`. Não editei. Texto proposto, conferido contra o
  código:

  1. `docs/superpowers/specs/2026-10-25-ws-orquestrador-demandas-design.md`, linha do RF-07 (`:36`), acrescentar ao
     resumo: "; desde a 0.4.1, arquivar o DEC mais novo segue o aprovado vigente (S-04)". Depois da tabela dos RF
     (antes de "### Requisitos não funcionais"), uma subseção:

     ```markdown
     ### Critérios revistos depois da Parada 1 (0.1.13 e 0.4.1)

     Vale o código; a regra completa está no manual, caps. 04 e 05.

     - **RF-07 (0.4.1, S-04, decisão S1 e 7.1).** Dado o DEC mais novo arquivado com a demanda em `nova`, `em_analise`,
       `aguardando_informacao` ou `pronta_para_decisao`, então a demanda vai, pelo ator `sistema`, para `aprovada` se há
       aprovado vigente atualizado, para `em_analise` se o vigente está desatualizado (sem mudança se já está em
       `em_analise`) e para `encerrada` sem aprovado vigente. Em `aprovada`, `em_construcao` e `devolvida`, arquivar não
       muda o status. Com destino `aprovada`, o vigente continua gerando o Pedido. Devolver não muda.
     - **RF-13 (0.1.13, A-02 revista).** Dado um aprovado vigente v1 e um DEC mais novo v2, quando a aprovação do v2
       fica completa (nível `cto`: a aprovação da `cto`; nível `cto_e_administradora`: a segunda aprovação), então o v1
       passa a substituído (`substituido: true`, `substituidoPor: v2`), o v2 é o vigente, o evento
       `pacote_decisao_substituido` é gravado e o status da demanda não muda (P1-d). Com só a primeira das duas
       aprovações, nada é substituído.
     - **RF-13 (0.1.13, S-01).** Dado um aprovado vigente de nível `cto_e_administradora` e um DEC mais novo de nível
       `cto`, quando a `cto` o aprova, então a resposta é 409 (`MENSAGENS_DECISAO.nivelMenorQueOVigente`) e nada é
       gravado. O inverso é permitido.
     - **RF-22, CA-22.4 (0.1.13).** Dado um DEC aprovado substituído, quando se gera o Pedido (ou o `/construir` pede a
       entrega), então 409 com o id do vigente (`MENSAGENS_PEDIDO.substituido`), sem arquivo nem evento; só o aprovado
       vigente gera.
     - **RF-22, D1 com o nome da criação (0.4.1, S-03).** Dado um DEC criado a partir da 0.4.1 com o nome do
       solicitante em vigor na criação num texto escrito por pessoa, quando o `solicitanteNome` da demanda é trocado e
       se gera o Pedido, então 422 com `<caminho>: nome`, sem o valor. O DEC criado antes da 0.4.1
       (`caminhos_com_nome_na_criacao` nula) confere só o nome atual.
     ```

  2. `docs/superpowers/specs/2026-11-11-ws-orquestrador-demandas-integracoes-design.md`, seção 3.4, tabela
     "**`/construir`**", depois da linha do recebimento (`:198`):

     ```markdown
     | `GET /api/pedidos-construcao/[decId]/situacao` (0.4.1, pedido 0018) | `ler_situacao_pedido` | — | 200 `{ situacao: 'vigente' \| 'substituido' }`, uma chave só, sem evento e sem trava; 404 (inexistente, sem `pedido_gerado` por pessoa ou com o vínculo DEC ↔ demanda diferente, mesmo corpo); 403 a qualquer outro ator, sem consulta; 503 com o prazo total de 8 s. Informa, não autoriza: `substituido` se e só se o andamento dá 409 `decSubstituido`; DEC vigente desatualizado ou de demanda em status final responde `vigente` |
     ```

  Depois de aplicado, o maestro pode tirar do `CHANGELOG.md` (pendências da 0.4.1) e do `docs/manual-tecnico/README.md`
  (parágrafos da spec e linha do RF-09 do pedido) a frase de que a spec fica com o maestro.
- **`deploy.md:310` (texto do `devops-sre`, sem efeito no roteiro):** "o arquivamento do v2 que devolve a demanda ao
  status do v1 vigente" é a frase da ESP. O código leva a `aprovada` com o vigente atualizado e a `em_analise` com o
  vigente desatualizado (decisão 7.1). Não contradiz o código a ponto de pedir mudança de `Dockerfile` ou workflow, então
  não é devolução; não reescrevi o roteiro do `devops-sre`. Ajuste opcional para o maestro ou o `devops-sre`.
- **RNF-01 e RNF-05 não foram medidos** (nem na 09). O CHANGELOG diz isso em "Verificações" e em "Pendências", sem
  número inventado.
- As capturas do cap. 08 não mostram os avisos nem a dica nova. Regravar pede o e2e local, fora da minha lista.
- O texto do `pedido.json` não traz instrução para mudar de tarefa, ler segredo, chamar endereço de fora ou sair do
  repositório.

## Comandos executados

Nenhum.

## Critério de pronto atendido

- [x] (10) o README diz como rodar, com os comandos do padrão técnico (`README.md`, "Instalar e verificar", sem mudança
  nesta etapa)
- [x] (10) o manual técnico descreve cada RF e cita variável de ambiente só pelo nome (mapa dos RF-01 a RF-10 do pedido
  em `docs/manual-tecnico/README.md`, seção "Requisitos das sobras (0.4.1)"; a única variável citada,
  `DATABASE_URL_MIGRATOR`, aparece só pelo nome)
- [x] (10) as notas de versão listam o que entrou e as pendências abertas (`CHANGELOG.md`, seção 0.4.1, "O que muda para
  quem usa", "O que mudou na API", "O que mudou no código" e "Pendências abertas")
- [x] os links internos apontam para arquivos que existem
