# 04. Versões e decisão

| Campo | Valor |
|---|---|
| Atualizado em | 14/11/2026 (0.4.1: arquivar o DEC mais novo com um aprovado em vigor deixa de encerrar a demanda, no passo 8 do RF-13 e na seção nova "Arquivar o DEC mais novo"; textos revistos do 409 do S-01 e da T11 do substituído; regra de uso do S-02 com a rota de situação; S-03 e S-04 em "Limite conhecido"); 12/11/2026 (0.3.1: recusa da demanda do Awave não confirmada para o agente, antes do status final e do limite, na ordem da criação); 10/11/2026 (0.1.13: o DEC aprovado mais novo substitui o anterior, no lugar da recusa da A-02, com a recusa do DEC só do CTO sobre um aprovado de dupla aprovação, no RF-13 e no RF-14); 04/11/2026 (0.1.10: nomes do 201 tirados da demanda travada nos três `POST` e guarda dos `extras` também em `criarPacoteDecisaoComNomes`, no RF-10); 04/11/2026 (0.1.9: nomes lidos antes de gravar nos três `POST` e teste estático dos `extras` do DEC, no RF-10); 03/11/2026 (0.1.6: decisão recusada em demanda em status final, no RF-13) |
| Dono | `documentacao-tecnica` (sistema: Fabiano) |
| Cobre | RF-08 a RF-14 |
| Fontes no código | `src/modules/especificacoes/`, `src/modules/pareceres-risco/`, `src/modules/pacotes-decisao/` (`criar.ts`, `decidir.ts`, `desatualizado.ts`, `substituido.ts`, `consultas.ts`, `schemas.ts`), `src/modules/demandas/consultas.ts` (`PacoteResumo`), desde a 0.4.1 `src/modules/demandas/arquivamento.ts` e `mudarStatusPorArquivamento` (`src/modules/demandas/transicoes.ts`), `src/modules/historico/registrar.ts`, `src/modules/versoes.ts`, `drizzle/0003_rls_privilegios_dominio.sql` |

Toda gravação de ESP, RSK ou DEC é uma versão nova. Criar, decidir e gerar o Pedido fazem `SELECT … FOR UPDATE` na
linha da demanda:
isso serializa a versão N e fecha a corrida entre uma aprovação e uma ESP nova (C-13). Cada criação conta no limite de
60 versões por hora por ator (ESP, RSK e DEC somados); acima, 429.

Na criação de ESP, RSK e DEC, a ordem dentro da transação é: trava da demanda → (desde a 0.3.1, só para agente e
`sistema`) recusa da demanda do Awave não confirmada, com o 404 da demanda inexistente (`exigirVisivelPara`,
[cap. 03](03-demandas.md#demanda-aberta-pelo-awave-030)) → recusa em status final → limite por ator → o resto. Numa demanda `entregue` ou `encerrada` ([cap. 03](03-demandas.md#rf-07-status-e-transições)), a
criação, pela pessoa ou pelo agente, responde 409:

```json
{ "erro": "conflito", "mensagem": "Esta demanda está em status final. Não aceita nova especificação, parecer de risco nem pacote de decisão." }
```

A recusa vem antes de qualquer insert, evento, agente disparado, aviso ou job, e antes do limite: numa demanda final,
o ator que já passou do limite recebe 409, e não 429 (`recusarSeDemandaFinal`, `src/modules/demandas/transicoes.ts`).

Nos três `POST` da API (`.../especificacoes`, `.../pareceres-risco` e `.../pacotes-decisao`), os nomes do solicitante
usados na vista do 201 vêm **da linha da demanda travada, dentro da transação da gravação** (B-3 da revisão do 0010,
desde a 0.1.10). A rota chama `criarEspecificacaoComNomes`, `criarParecerRiscoComNomes` ou
`criarPacoteDecisaoComNomes`, com 4 argumentos e sem `t` nem `extras`. Ela não chama mais `nomesDaDemanda` no `POST`.
O serviço tira os nomes com `nomesDoSolicitante` sobre a linha que `travarDemanda` devolveu, no fim do corpo da
transação, depois de todas as gravações (no DEC, inclusive o status e o aviso). Ele devolve a vista e os nomes. Uma renomeação do solicitante no meio do
`POST` não sai em claro no 201, porque o nome usado é o da linha travada.

Se essa conta falhar, a transação inteira volta. A resposta é 500 `erro_interno` e nada é gravado: nem a versão, nem o
evento, nem a mudança de status, nem o aviso do DEC (B-3 do 0009, desde a 0.1.9). A nova tentativa cria a versão
seguinte, sem duplicar. Demanda inexistente continua 404, vindo de `travarDemanda`, e o 409, o 429 e o 400 com
`faltando` também continuam vindo do serviço. `criarEspecificacao`, `criarParecerRisco` e `criarPacoteDecisao` têm a
mesma assinatura e o mesmo retorno de antes e são os que o worker e as Server Actions usam. Os `GET` continuam lendo os
nomes com `nomesDaDemanda`.

## RF-08. Especificação técnica (ESP)

`POST /api/demandas/:id/especificacoes` (pessoa ou agente `insumo_tecnico`); lista em `GET` na mesma rota; uma versão
em `GET /api/especificacoes/:espId`. No painel, `/demandas/[id]/especificacoes/nova` começa com o conteúdo da mais nova.

| Campo | Regra |
|---|---|
| `descricaoObjetiva` | obrigatório |
| `escopoInclui` | lista obrigatória |
| `escopoExclui`, `duvidasEmAberto` | listas, padrão vazias |
| `situacaoAtual`, `situacaoDesejada`, `sistemasErp`, `sistemasEcommerceMarketplace`, `sistemasApisTerceiros`, `sistemasServicosInternos`, `dadosEntidades`, `dadosCamposCriticos`, `restricoesTecnicas` | texto opcional |
| `sistemaAlvo` | letras minúsculas, números e hífen, até 100 |
| `repositorioDestino` | `<dono>/<sistemaAlvo>`, com o dono da lista do `validarPedido` copiado (`DONOS_REPOSITORIO`) |
| `criteriosAceitePreliminares`, `definicaoDePronto` | listas |

- Fora do tipo `estudo`, os quatro campos de construção (`sistemaAlvo`, `repositorioDestino`,
  `criteriosAceitePreliminares`, `definicaoDePronto`) são obrigatórios. No `estudo` são opcionais, mas o repositório
  informado segue a mesma regra. A conferência usa as mesmas listas do `validarPedido` do `/construir`
  (`validarCamposDeConstrucao`). Erro dá 400 com a lista de `campos`.
- ESP com `duvidasEmAberto` leva a demanda a `aguardando_informacao` ([cap. 03](03-demandas.md#rf-15-dúvida-em-aberto)).
  ESP sem dúvida dispara o agente `risco`, se ligado.

## RF-09. Parecer de risco (RSK)

`POST /api/demandas/:id/pareceres-risco` (pessoa ou agente `risco`); lista em `GET` na mesma rota; uma versão em
`GET /api/pareceres-risco/:rskId`. No painel, `/demandas/[id]/pareceres-risco/novo`.

| Campo | Regra |
|---|---|
| `riscoTecnicoNivel`, `riscoOperacionalNivel`, `riscoJuridicoNivel` | obrigatórios: `baixo`, `medio` ou `alto` |
| `riscoTecnicoComentario`, `riscoOperacionalComentario`, `riscoJuridicoComentario`, `resumo`, `envolverJuridicoOuAdministradoraQuando` | texto opcional |
| `recomendacoesMitigacao`, `preCondicoes` | listas, padrão vazias |

RSK gravado numa demanda que já tem ESP dispara o agente `consolidacao`, se ligado.

## RF-10. Pacote de decisão (DEC)

`POST /api/demandas/:id/pacotes-decisao` (pessoa ou agente `consolidacao`); lista em `GET` na mesma rota; um DEC em
`GET /api/pacotes-decisao/:decId`. No painel, `/demandas/[id]/pacotes-decisao/novo`.

- Corpo: `resumoExecutivo` (obrigatório), `opcaoA` e `opcaoB` (cada uma com `descricao` obrigatória e `vantagens`,
  `desvantagens`, `quandoEscolher` opcionais), `recomendacao` opcional e `nivelAprovacaoRequerido` (`cto` ou
  `cto_e_administradora`).
- Qual ESP e qual RSK o DEC cita, lidos sob a trava da demanda:
  - DEC de pessoa (painel, rota ou Server Action) e DEC pela rota com o token da `consolidacao`: a ESP e o RSK **de
    maior versão** da demanda no momento da gravação;
  - DEC gravado pelo worker da consolidação: a ESP e o RSK **que o agente leu** (`citados` de `montarEntrada`, passados
    como `especificacaoId` e `parecerRiscoId` em `ExtrasDoPacote`). A leitura filtra por id e por demanda; id
    inexistente ou de outra demanda dá 404 e nada é gravado. Se entrou versão mais nova depois da leitura, o DEC nasce
    desatualizado (RF-12) (M-01, corrigido na 0.1.5).
  - `especificacaoId` e `parecerRiscoId` nunca vêm do corpo da requisição nem da saída do modelo: o schema da rota não
    tem esses campos, e o que vier a mais é descartado (C-11, C-25). Desde a 0.1.9 (B-1 do 0006), o
    `test/estatico/pacote-sem-extras.test.ts` lê pela AST do TypeScript os arquivos de `src/app/` que não são teste.
    Ele reprova o uso de `criarPacoteDecisao` (e, desde a 0.1.10, de `criarPacoteDecisaoComNomes`, que a rota usa)
    com mais de 4 argumentos (o 5º é a transação, o 6º são os `extras`),
    com argumento espalhado ou fora da chamada direta (variável, `.call`, `.apply`, `bind`). Segue import renomeado e
    por namespace. Só o worker (`src/modules/agentes/executar.ts`) passa os `extras`. O teste não segue reexport,
    barrel nem `import()` dinâmico (B-5 da revisão do 0010).
- O DEC grava uma cópia do tipo, do título e da descrição da demanda, que não muda se a demanda for editada.
- Sem ESP ou sem RSK: 400 "Faltam itens para o pacote." com `faltando: ["especificacao", "parecer_risco"]` (o que
  faltar).
- **DEC de agente nasce sempre `cto_e_administradora`** (`NIVEL_DO_DEC_DE_AGENTE`, A-04 da 08): o schema de saída da
  consolidação não tem o campo, e o que vier é ignorado. Rebaixar para `cto` é decisão de pessoa, gravando uma versão
  nova do DEC.
- Na mesma transação: a demanda vai a `pronta_para_decisao` (ator `sistema`) e o aviso por e-mail fica pendente, com
  o job ([cap. 07](07-worker-avisos-retencao.md#rf-25-aviso-por-e-mail)).
- Demanda em status final: 409 antes de gravar (início deste capítulo; M-02, corrigido na 0.1.5 para a criação).
  Decidir um DEC já existente (RF-13) e gerar o Pedido dele ([cap. 05](05-pedido-de-construcao.md)) também dão 409
  desde a 0.1.6 (M-08).

## RF-11. Imutabilidade

O papel `orquestrador_app` só tem `SELECT` e `INSERT` em `especificacao_tecnica`, `parecer_risco`, `pacote_decisao`,
`aprovacao`, `decisao` e `evento`. Uma versão gravada não muda nem pelo app nem por SQL com o papel da aplicação. A
decisão e as aprovações ficam em tabelas próprias; `statusDecisao` e `aprovadores` são derivados delas.

## RF-12. DEC desatualizado

Um DEC está desatualizado quando a demanda tem ESP ou RSK de **versão** maior que a citada nele
(`expressaoDesatualizado`). A marca é recalculada a cada leitura e relida sob a trava da demanda na decisão e na
geração do pedido.

- DEC desatualizado não pode ser aprovado: 409 "o pacote está desatualizado e não pode ser aprovado.". Devolver e
  arquivar continuam possíveis.
- O DEC da consolidação pode **nascer** desatualizado: ele cita a ESP e o RSK que o agente leu, e uma versão mais nova
  pode ter entrado entre o agendamento e a gravação (RF-10). Ele leva a demanda a `pronta_para_decisao` e agenda o aviso
  como qualquer DEC; a execução disparada pela versão nova gera o DEC que cita a mais nova.
- Pedido de Construção de DEC desatualizado: 409, e a tela esconde a seção do pedido
  ([cap. 05](05-pedido-de-construcao.md)).

## RF-13. Decisão

`PATCH /api/pacotes-decisao/:decId/decisao`, só pessoa com 2FA. Agente e sistema recebem 403, também quando o worker
chama a função direto (C-12).

Corpo (`registrarDecisaoSchema`):

| `statusDecisao` | Campos |
|---|---|
| `aprovada` | `opcaoEscolhida` (`A` ou `B`, obrigatória), `referenciaDocumento` (até 200), `dataDocumento` (data ISO), `registrarComo` (`administradora`), `comentarios`, `revisouRascunhosDeAgente` |
| `devolvida`, `arquivada` | `comentarios`, `revisouRascunhosDeAgente` |

Não existe opção C ou D: recusar as duas opções é `devolvida` ou `arquivada`.

Conferências, nesta ordem, dentro de uma transação:

1. o DEC existe (senão 404) e a demanda é travada;
2. demanda `entregue` ou `encerrada` (`ehStatusFinal`) → 409 "a demanda está em status final; o pacote não pode mais
   ser decidido." (`MENSAGENS_DECISAO.demandaFinal`; M-08, desde a 0.1.6). Vem antes de ler o DEC: vale para aprovar,
   devolver e arquivar, para o DEC já decidido e para a segunda aprovação de um DEC `cto_e_administradora`. Nada é
   gravado em `aprovacao`, `decisao` nem `evento`;
3. já tem decisão → 409 "este pacote já tem decisão registrada.";
4. não é o DEC mais novo da demanda → 409 "a demanda tem um pacote mais novo; só o mais novo pode ser decidido."
   (A-01 da 08);
5. outro DEC da demanda já aprovado **não** recusa a aprovação, desde a 0.1.13 (A-02 revista pela opção (b) do E5 do
   0013, decidida por Fabiano em 04/11). A aprovação completa deste DEC substitui o aprovado anterior, com a regra de
   nível do S-01 ([Substituição do DEC aprovado](#substituição-do-dec-aprovado)). Até a 0.1.12, a resposta era 409
   "outro pacote desta demanda já está aprovado." (A-02 da 08); a mensagem saiu do código;
6. aprovar DEC desatualizado → 409;
7. o DEC cita rascunho de agente e `revisouRascunhosDeAgente` não é `true` → 400 no campo;
8. `devolvida`: grava a decisão, e a demanda vai a `em_analise` pelo ator `sistema` (transição `decisao_devolvida`).
   `arquivada`: grava a decisão, lê o aprovado vigente sob a trava e muda a demanda pelo ator `sistema` conforme a
   tabela de [Arquivar o DEC mais novo](#arquivar-o-dec-mais-novo-041) (desde a 0.4.1: `aprovada`, `em_analise`,
   `encerrada` ou nada);
9. `aprovada`: as regras de papel e nível abaixo.

A matriz vem antes de tudo isso (`autorizar`): token de agente recebe 403 e quem não tem credencial recebe 401, também
numa demanda final. Depois de um "Arquivar" que leva a demanda a `encerrada` (sem aprovado vigente), decidir de novo o
mesmo DEC recebe o 409 do passo 2, e não o do passo 3. Com a demanda fora de status final, recebe o 409 do passo 3. O texto do passo 2 foi escrito na triagem e espera a revisão da `ux-ui-design` (B-4 da
0.1.6).

Regras de papel e nível:

- O papel da aprovação é o da conta da sessão. `registrarComo: "administradora"` só seria aceito vindo da conta `cto`
  no modo `cto_com_referencia`; o modo em vigor é `somente_propria` (`MODO_APROVACAO_ADMINISTRADORA` em
  `decidir.ts`, P1-a), então só a própria administradora, com conta e 2FA, registra a aprovação dela.
- Nível `cto`: só a conta `cto` aprova (P1-b); a administradora recebe 403. A aprovação grava a decisão na hora.
  Desde a 0.1.13 (S-01 da revisão do 0014), se o aprovado vigente da demanda é de nível `cto_e_administradora`, a
  aprovação da `cto` recebe 409 antes de gravar ([Substituição do DEC aprovado](#substituição-do-dec-aprovado)).
- A aprovação **não** muda o status da demanda (P1-d).

O histórico leva o papel, a opção e, na da administradora, a referência e a data do documento; nunca o comentário.

### Substituição do DEC aprovado

Desde a 0.1.13 (pedido `DEC-DEM-20261104-0014-v1`, opção (b) do E5 do 0013, decidida por Fabiano em 04/11), o DEC
aprovado mais novo da demanda substitui o aprovado anterior. Uma recusa do Pedido de Construção, inclusive a falsa
(`Santos` cidade, `Rosa` no começo da frase), ou uma correção de ESP, RSK, título, descrição ou opção depois da
aprovação, passa a ter saída dentro da demanda: crie um DEC novo e aprove-o. Fontes: `substituido.ts`, `decidir.ts`
(`fecharAprovacao` e `aprovar`), `consultas.ts` e `src/modules/demandas/consultas.ts`.

**Termos.**

- **Aprovado vigente** (ou aprovado mais novo): o DEC de maior `versao` da demanda com decisão `aprovada`
  (`aprovadoVigente` e `aprovadoMaisNovo`). A comparação é pela versão, e não pela data, para não depender do relógio.
  Pela regra 4 (A-01), só o DEC mais novo se decide, então o vigente é sempre o último aprovado.
- **Substituído:** o DEC com decisão `aprovada` que não é o aprovado vigente. É calculado na leitura
  (`expressaoSubstituidoPor`), como o desatualizado: não há coluna, migration nem status novo, e o `statusDecisao`
  continua `aprovada`. DEC pendente, com só uma das duas aprovações, devolvido ou arquivado nunca é substituído e não
  substitui nada.

**Quando acontece.** Na gravação da decisão `aprovada`: no nível `cto`, na aprovação da `cto`; no nível
`cto_e_administradora`, na segunda aprovação (RF-14). A primeira aprovação da dupla não substitui: até a segunda, o
anterior continua vigente e continua gerando o Pedido. Valem todas as regras de hoje (2FA, matriz, P1-a, P1-b, mesma
opção, documento da administradora, revisão de rascunho, desatualizado, A-01, status final), e a aprovação que
substitui não muda o status da demanda (P1-d), também com a demanda em `aprovada`, `em_construcao` ou `devolvida`.

**Regra de nível (S-01).** Um DEC só do CTO não substitui um aprovado vigente que exigiu o CTO e a administradora. Na
aprovação de um DEC de nível `cto`, depois do P1-b e antes de gravar, o sistema lê o vigente sob a trava da demanda. Se
ele é `cto_e_administradora`, a resposta é 409:

```json
{ "erro": "conflito", "mensagem": "o pacote aprovado em vigor nesta demanda exigiu a aprovação do CTO e da administradora, e um pacote só do CTO não pode substituí-lo. Devolva ou arquive este pacote, ou crie um pacote novo com aprovação do CTO e da administradora." }
```

(`MENSAGENS_DECISAO.nivelMenorQueOVigente`, texto revisto pela `ux-ui-design` na 0.4.1; continua sem id e sem nome).
Nada é gravado: nem aprovação, nem decisão, nem evento, e o vigente continua vigente. A administradora num DEC `cto`
continua recebendo o 403 do P1-b, que vem antes. O inverso é permitido: um DEC `cto_e_administradora`, com as duas
aprovações, substitui um vigente `cto`. O nível é escolhido por quem cria o DEC (RF-10), e a criação não é recusada: o
DEC `cto` recusado pode ser devolvido ou arquivado, e a saída é um DEC novo de nível `cto_e_administradora`. A T11
desse DEC `cto` mostra o formulário de aprovar. Desde a 0.4.1, ela avisa antes do envio que a aprovação será recusada
(aviso (c), [cap. 08](08-painel.md#avisos-da-vigência-e-arquivar-041)); o botão "Aprovar" continua disponível, e quem
recusa é o servidor.

**Na leitura.** A vista do DEC (`PacoteDecisaoVista`) e o resumo da lista de DEC da demanda (`PacoteResumo`) têm
`substituido` (booleano) e `substituidoPor` (o id do aprovado vigente, ou `null`). Saem em
`GET /api/pacotes-decisao/:decId`, `GET /api/pacotes-decisao`, `GET /api/demandas/:id/pacotes-decisao` e em
`pacotesDecisao` de `GET /api/demandas/:id`, também na vista mínima do agente (são id e booleano, sem texto livre).
`substituidoPor` aponta sempre para o vigente **atual**: com v1, v2 e v3 aprovados, v1 e v2 apontam para o v3, o único
que gera. O filtro `statusDecisao=aprovada` (RF-23) continua trazendo o substituído, marcado com `substituido: true`.

**No histórico.** Na mesma transação, depois de `aprovacao_registrada` e `decisao_registrada`, a aprovação que
substitui grava o evento `pacote_decisao_substituido`, com `entidadeId` igual ao DEC substituído e
`depois: { "substituido": <DEC substituído>, "substituidoPor": <DEC aprovado agora> }`, só os dois ids, sem comentário,
opção nem nome (C-30). A T05 mostra "<DEC substituído> foi substituído por <DEC aprovado>, aprovado depois dele", com
Antes e Depois vazios. Se `substituidoPor` não tem o formato de id de DEC, a frase é "<DEC substituído> foi substituído
por um pacote aprovado depois dele" (`textoDoEvento`, `src/components/rotulos.ts`; texto revisto na 0.4.1). Cada substituição grava o seu evento: com v1, v2
e v3 aprovados nessa ordem, ficam v1→v2 e v2→v3.

**Concorrência (C-13).** O vigente é lido sob a trava da demanda e antes do insert em `decisao`. Duas aprovações do
mesmo DEC ao mesmo tempo dão uma `aprovada` e um 409 "este pacote já tem decisão registrada.", com um evento de
substituição só. Uma geração do DEC antigo ao mesmo tempo que a aprovação do novo ou termina antes dela (o pedido sai
legítimo e o `pedido_gerado` fica antes da substituição no histórico) ou recebe o 409 do substituído
([cap. 05](05-pedido-de-construcao.md#rf-22-gerar-o-pedido)).

**No painel.** Na T11 do DEC substituído: o selo "Substituído" (cinza) depois do selo da decisão; um alerta de atenção
"Este pacote foi substituído por <id>, aprovado depois dele, e não gera mais o Pedido de Construção. Se um pedido deste
pacote já foi gerado, não o use. O pedido que vale é o de <id>.", com o link "Abrir o pacote <id>" para a T11 do
vigente, antes do alerta de desatualizado (com os dois valendo, aparecem os dois); sem a seção do Pedido de Construção e
sem o lembrete de levar a demanda a "Aprovada" (P1-d). Na T05, o selo "Substituído" ao lado de "Aprovada" na linha do
DEC substituído. Os textos foram revistos pela `ux-ui-design` na 0.4.1. Desde a 0.4.1, a T11 também avisa **antes** da
substituição: no DEC pendente que vai substituir o vigente e no vigente que tem um DEC mais novo pendente
([cap. 08](08-painel.md#avisos-da-vigência-e-arquivar-041)).

**Regra de uso (S-02, risco aceito no RSK do 0014; revista na 0.4.1).** Não use Pedido de Construção gerado de DEC
substituído. O sistema recusa gerar de novo do substituído, e a entrega e o andamento pelo `/construir` também o
recusam (409). Um pedido já baixado e copiado para `pedidos/` da estruturaAutonoma antes da substituição, ou uma
construção já em curso, só param se o `/construir` perguntar. Desde a 0.4.1, ele tem como perguntar: a rota
`GET /api/pedidos-construcao/<DEC-id>/situacao` responde `vigente` ou `substituido`
([cap. 05](05-pedido-de-construcao.md#situação-do-pedido-041)). O lado do `/construir` que usa a rota (a `00-inicio`
parar com o DEC substituído e o aviso por e-mail) é de outra frente e ainda não está no ar. Até ele entrar, antes de
usar um pedido, confira na T05 (ou em `GET /api/pacotes-decisao/:decId`) que o DEC dele não tem `substituido: true`.

### Arquivar o DEC mais novo (0.4.1)

Desde a 0.4.1 (pedido `DEC-DEM-20261111-0018-v1`, S-04, decisão S1 de Fabiano e decisão 7.1), arquivar o DEC mais
novo de uma demanda que tem um aprovado vigente não encerra mais a demanda. Até a 0.4.0, a transição automática
`decisao_arquivada` levava sempre a `encerrada`, e aí o aprovado vigente também deixava de gerar o Pedido (M-08).

Só o DEC mais novo se decide (passo 4, A-01), então o arquivado é sempre o mais novo. Depois de gravar a decisão
`arquivada`, sob a mesma trava da demanda, `decidir.ts` lê o aprovado vigente (`vigenteDaDemanda`, `substituido.ts`,
com o `desatualizado` dele) e chama `mudarStatusPorArquivamento` (`transicoes.ts`). O destino sai de uma tabela só,
`destinoDoArquivamento` (`src/modules/demandas/arquivamento.ts`), que a T11 também lê para a dica do Arquivar:

| Status da demanda | Sem aprovado vigente | Vigente atualizado | Vigente desatualizado |
|---|---|---|---|
| `nova`, `aguardando_informacao`, `pronta_para_decisao` | `encerrada` (como antes) | `aprovada` (S1) | `em_analise` (7.1) |
| `em_analise` | `encerrada` | `aprovada` | nada muda (já está em `em_analise`) |
| `aprovada`, `em_construcao`, `devolvida` | nada muda | nada muda | nada muda |
| `entregue`, `encerrada` | — (a decisão já é recusada no passo 2) | — | — |

- A mudança é do ator `sistema`, com o `status_alterado` de sempre. Destino nulo ou igual ao status atual não grava
  nada, nem evento.
- O vigente lido é o aprovado mais novo da demanda, depois da decisão gravada: o DEC que acabou de ser arquivado não
  conta.
- Com o destino `aprovada`, o vigente continua gerando o Pedido de Construção. `aprovada` só sai com o mesmo critério
  da transição manual para `aprovada` (um pacote aprovado e atualizado).
- Devolver não mudou: continua levando a `em_analise` pela transição `decisao_devolvida`, das mesmas origens.
- Corridas: o arquivamento, uma ESP nova e uma mudança manual de status da mesma demanda passam pela mesma trava; os
  testes rodam as corridas com duas conexões, 50 vezes, sem *deadlock* (SB-11).

A T11 avisa o destino antes do envio, na dica do Arquivar, e mostra depois o alerta pelo status gravado
([cap. 08](08-painel.md#avisos-da-vigência-e-arquivar-041)). Na T05, a etapa 4 da barra mostra o vigente quando o DEC
mais novo está arquivado ([cap. 08](08-painel.md#demanda-t05-rf-08-a-rf-10)).

## RF-14. Dupla aprovação

Nível `cto_e_administradora`:

1. A primeira aprovação (de qualquer um dos dois papéis) é gravada em `aprovacao`; o resultado é `aprovacao_parcial`
   e o DEC continua sem decisão.
2. A aprovação da administradora exige `referenciaDocumento` e `dataDocumento` (o documento assinado fica fora do
   sistema; aqui só a referência). Faltando, 400 nos campos.
3. O mesmo papel de novo → 409 "a aprovação do CTO já está registrada." (ou da administradora).
4. A segunda aprovação precisa ser da **mesma opção** da primeira; senão 409 citando quem aprovou primeiro.
5. Com as duas, a decisão `aprovada` é gravada. Se a demanda já tinha um aprovado vigente, ele passa a ser substituído
   nesse momento, e não na primeira aprovação ([Substituição do DEC aprovado](#substituição-do-dec-aprovado)).

A regra de nível do S-01 não se aplica a este nível: um DEC `cto_e_administradora` nunca tem nível menor que o vigente.

Limite conhecido. O médio do reteste da 08 (a A-02, que impedia dois DEC aprovados, junto com a regra do desatualizado
deixava a demanda sem saída) foi fechado na 0.1.13: com o v1 aprovado e uma ESP ou um RSK novos, o v1 fica desatualizado,
e o v2, que cita as versões novas, pode ser aprovado e substitui o v1. Da revisão do 0014
([CHANGELOG](../../CHANGELOG.md)), a 0.4.1 fechou:

- **S-04:** arquivar o v2 não encerra mais a demanda que tem um aprovado vigente
  ([Arquivar o DEC mais novo](#arquivar-o-dec-mais-novo-041));
- **S-03:** o D1 confere também o nome do solicitante em vigor na criação do DEC
  ([cap. 05](05-pedido-de-construcao.md#nome-do-solicitante));
- os avisos da T11 antes do envio: no DEC pendente que substituirá o vigente, no vigente com um DEC mais novo pendente e
  no DEC `cto` com vigente de dupla aprovação ([cap. 08](08-painel.md#avisos-da-vigência-e-arquivar-041)).

Ficam, como limites conhecidos da 0.4.1:

- **S-02, lado do `/construir`:** o Orquestrador já responde a situação do pedido, mas o `/construir` ainda não a
  consulta (outra frente). A regra de uso de [Substituição do DEC aprovado](#substituição-do-dec-aprovado) continua
  valendo até isso entrar. Mesmo depois, um DEC pode ser substituído entre a resposta `vigente` e o início da
  construção (risco residual baixo, para aceite com a `gestao-riscos`).
- **S-03 nos DEC antigos:** o DEC criado antes da 0.4.1 não tem os caminhos da criação gravados (coluna nula) e confere
  só o nome atual. Trocar o `solicitanteNome` ainda pode fazer um DEC desses, antes recusado, passar.
- **Situação `vigente` não quer dizer "pode construir":** a rota de situação responde `vigente` também para o DEC
  desatualizado e para o DEC de demanda em status final. A entrega e o andamento continuam recusando esses casos (409),
  e a geração pela pessoa também.
- **R-08-1 (pendência conhecida, não defeito):** com o DEC mais novo arquivado, o vigente desatualizado e a demanda em
  `em_analise`, a T05 marca a etapa 4 como feita, mas a Próxima ação pede um pacote novo
  ([cap. 08](08-painel.md#pendências-de-interface-conhecidas)).
