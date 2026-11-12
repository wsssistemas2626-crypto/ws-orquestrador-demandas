# 06. Agentes de IA

| Campo | Valor |
|---|---|
| Atualizado em | 12/11/2026 (0.3.0: demanda do Awave só dispara agente depois da confirmação por pessoa; passo de `sem_confirmacao` no worker, no RF-16; integrações fora da tela de agentes, do teto e do uso de IA); 04/11/2026 (0.1.12: `trocarNomes` e `temNome`, a mesma regra do nome usada pelo Pedido de Construção, no RF-20); 04/11/2026 (0.1.11: detector de e-mail linear e com acento no usuário, nome grudado em número, `_` ou CamelCase, aviso e dica com os limites da troca, no RF-20); 04/11/2026 (0.1.10: cada parte do nome do solicitante vira marcador, sem diferença de acento, e a dica e o aviso da tela, no RF-20); 04/11/2026 (0.1.9: rótulo de `demanda_final` no histórico, no RF-16); 03/11/2026 (0.1.8: texto livre de DEC, ESP e RSK minimizado na API, no RF-20; 0.1.7: texto livre da demanda minimizado na API e `minimizarValor` único, no RF-20; 0.1.6: alcance da minimização na leitura pela API) |
| Dono | `documentacao-tecnica` (sistema: Fabiano) |
| Cobre | RF-16 a RF-20; RNF-06, RNF-07, RNF-14 |
| Fontes no código | `src/modules/agentes/` (`executar.ts`, `execucoes.ts`, `espera.ts`, `gatilhos.ts`, `configuracao.ts`, `teto.ts`, `preco.ts`, `uso.ts`, `provedor.ts`, `entrada-agente.ts`, `schemas.ts`), `src/agents/`, `src/modules/dados-pessoais/minimizar.ts`, `src/modules/demandas/confirmacao.ts` (desde a 0.3.0), `src/jobs/agente-executar.ts`, `src/jobs/batimento.ts` |
| Situação na 0.1.0 | **os quatro agentes estão desligados**, com teto 0 e sem `ANTHROPIC_API_KEY`. Nenhuma chamada ao provedor acontece |

## Os quatro agentes

| Agente | Disparado quando | Grava | Prompt (`src/agents/`) | Origem do prompt |
|---|---|---|---|---|
| `orquestrador` | entrada no modo `agente` ([cap. 03](03-demandas.md#rf-05-entrada-colando-o-texto)) | a demanda (e as dúvidas da entrada) | `orquestrador.ts`, até 2.000 tokens de saída | Orquestrador Central |
| `insumo_tecnico` | demanda criada por pessoa ou agente; demanda do Awave confirmada por pessoa (desde a 0.3.0) | ESP | `insumo-tecnico.ts`, até 6.000 | `operacional-desenvolvimento-sistemas` |
| `risco` | ESP gravada sem dúvida | RSK | `risco.ts`, até 3.000 | `gestao-riscos`, com apoio de `juridico-contratos` |
| `consolidacao` | RSK gravado numa demanda com ESP | DEC (sempre `cto_e_administradora`) | `consolidacao.ts`, até 4.000 | Orquestrador Central |

O disparo (`dispararSeLigado`) só cria a execução e o job quando o agente está ligado e o teto não foi atingido, na
mesma transação do artefato que o disparou (ADR-06). Desligado ou suspenso, nada é criado e a pessoa preenche pelo
painel, com os mesmos schemas.

Desde a 0.3.0, o disparo confere antes de tudo, para os quatro agentes, se a demanda é do Awave e ainda não foi
confirmada por uma pessoa (`aguardaConfirmacao`). Se for, nada é criado: nenhum agente de IA trabalha numa demanda do
Awave antes da confirmação, nem quando uma pessoa grava à mão uma ESP ou um RSK nela (D1 e IN-06 do pedido 0016;
[cap. 03](03-demandas.md#demanda-aberta-pelo-awave-030)).

As integrações `awave` e `construir` (0.3.0) não são agentes de IA: não aparecem na tela "Agentes e teto", não têm
interruptor nem modelo, não contam no teto e não gravam `uso_ia` ([cap. 02](02-acesso-e-seguranca.md#atores-de-integração-030)).

Tudo que um agente grava é **rascunho de agente**: a pessoa revisa, e a decisão sobre um DEC que cita rascunho exige
`revisouRascunhosDeAgente: true` ([cap. 04](04-versoes-e-decisao.md#rf-13-decisão)). Agente nunca decide nem envia
nada para fora.

## RF-16. Execução dos agentes

Uma fila só, `agente.executar`, com concorrência 1, num worker só: no máximo uma chamada ao provedor por vez. O payload
do job leva só o id da execução (C-22). A execução (`executar.ts`) segue esta ordem:

1. reivindica a execução por `UPDATE` condicional; se outra já a pegou, termina como `ja_tratada`, sem chamar o
   provedor (execução única);
2. agente desligado, sem modelo com preço vigente ou sem provedor (sem chave) → `ignorada`, com evento
   `agente_ignorado`;
3. gasto do mês maior ou igual ao teto → `ignorada`, com evento `suspensao_por_teto`;
4. demanda da execução em status final (`entregue` ou `encerrada`) → `ignorada`, com evento `agente_ignorado` e motivo
   `demanda_final`, sem chamar o provedor (passo "3b" no comentário de `executar.ts`; M-02, desde a 0.1.5). Lê só o
   status da demanda. O orquestrador, que ainda não tem demanda, não passa por aqui;
   - desde a 0.3.0 (passo "3c", D-07 do pedido 0016): demanda do Awave ainda não confirmada por pessoa → `ignorada`,
     com evento `agente_ignorado` e motivo `sem_confirmacao`, sem chamar o provedor nem gravar uso. É a segunda
     barreira, depois do disparo. Lê só as tabelas `demanda` e `evento`;
5. monta a entrada pela lista de permissão de campos do agente, minimizada (RF-20), com o texto do cliente dentro de um
   bloco `<dados>` e a instrução de que nada ali é ordem. A montagem devolve também `citados`: o id da ESP e do RSK que
   entraram no bloco. Os ids não vão para o conteúdo enviado (C-23);
6. chama o provedor fora de qualquer transação;
7. lê o JSON e valida pelo **mesmo schema Zod da rota** (ADR-09). Válido: o serviço da API grava o artefato com o ator
   `agente` (passa por `autorizar`) e a execução fica `concluida`. Fora do schema, recusado pelo serviço com 400
   (`entrada_invalida`, como os campos de construção da ESP), limite por ator (429) ou erro transitório do provedor: nova
   tentativa. Qualquer outra recusa do serviço (por exemplo, o 409 da demanda que chegou a status final durante a
   chamada, ou o 404 de versão citada inexistente): `falhou` na hora, com o motivo `recusada_pelo_servico`, sem nova
   chamada.

Motivos do evento `agente_ignorado` (`MotivoIgnorada` em `executar.ts`; enumeração fechada, sem texto da entrada nem da
saída): `desligado`, `sem_preco`, `sem_provedor`, `demanda_final` e, desde a 0.3.0, `sem_confirmacao`. O
`suspensao_por_teto` leva o motivo `teto`. No histórico do painel, cada motivo tem rótulo em `MOTIVO_IGNORADO`
(`src/components/rotulos.ts`): "agente desligado", "modelo sem preço vigente", "provedor de IA não configurado", desde
a 0.1.9 (B-5 do 0006) "demanda já entregue ou encerrada" e, desde a 0.3.0, "demanda aberta pelo Awave ainda não
confirmada". O evento aparece como "Agente de consolidação não rodou: demanda já entregue ou encerrada". Motivo sem
rótulo aparece só como "Agente … não rodou".

Novas tentativas (P1-e, `espera.ts`): **3 no total**, com espera de 30 s antes da 2ª e de 2 min antes da 3ª. Na 3ª
falha, `falhou` e evento `falha_agente`, sem conteúdo. Credencial recusada (401 ou 403 do provedor) falha na hora.
No orquestrador, `falhou` e `ignorada` deixam a entrada pendente como `falhou`, para a pessoa preencher à mão.

A saída do modelo não define status, autoria nem ator: o schema descarta chave desconhecida, e a consolidação nem tem
o campo `nivelAprovacaoRequerido` (A-04 da 08).

Provedor (`provedor.ts`): Anthropic pelo `@anthropic-ai/sdk`, endereço fixo, sem ferramentas (o corpo só tem
`model`, `max_tokens`, `system` e `messages`), `maxTokens` até 8.000, tempo limite de 120 s (RNF-06), `maxRetries: 0`
e log do SDK desligado. O provedor só existe com `ANTHROPIC_API_KEY`, lida só pelo worker. Nos testes, o provedor é
falso (RNF-14).

Rede de segurança (`src/jobs/batimento.ts`): a cada minuto, o worker reenfileira a execução `pendente` cuja hora venceu
há mais de 1 min e a `em_andamento` com a trava vencida (150 s). A reivindicação condicional impede que duas rodem.

Citação da consolidação (M-01, corrigido na 0.1.5): a entrada da consolidação lê o RSK da chave da execução
(`rsk:<RSK-id>`) e a ESP de maior versão no momento da leitura. O DEC cita **essas duas**, pelos ids de `citados`, e não
as mais novas no momento da gravação ([cap. 04](04-versoes-e-decisao.md#rf-10-pacote-de-decisão-dec)). Assim, o resumo
escrito pelo modelo, o DEC, a tela de decisão e o Pedido falam do mesmo RSK. Um RSK ou uma ESP gravados entre o
agendamento e a gravação, inclusive durante a chamada ao provedor, fazem o DEC nascer desatualizado, e ele não pode ser
aprovado ([RF-12](04-versoes-e-decisao.md#rf-12-dec-desatualizado)). Se faltar um dos dois ids, a gravação é recusada
com 404 e a execução fica `falhou` (`recusada_pelo_servico`).

## RF-17. Uso por chamada

Cada chamada feita ao provedor grava uma linha em `uso_ia`, em transação própria, com agente, modelo, tokens de
entrada e de saída, custo e resultado. Não grava prompt nem resposta. O custo sai do preço vigente do modelo
(`preco_modelo`, em US$ por milhão de tokens de entrada e de saída), definido só por
`scripts/definir-preco-modelo.ts` ([cap. 10](10-configuracao-e-scripts.md)).

## RF-18. Teto de gasto

- Uma linha em `configuracao_ia`, em US$ (P1-f). **Nasce 0**, e teto 0 é sempre suspenso.
- Gasto do mês = soma de `uso_ia.custo` no mês civil de São Paulo. Gasto maior ou igual ao teto suspende os agentes,
  conferido antes de **cada** chamada. Como só há uma chamada por vez, o teto é ultrapassado em no máximo o custo de
  uma chamada (RNF-07). O gasto volta a zero à meia-noite do dia 1º, em São Paulo.
- `GET /api/configuracao/teto` (pessoa) devolve teto, moeda, gasto, percentual, suspenso, mês e quando vira.
  `PUT /api/configuracao/teto` com `{ "tetoMensal": "10,00" }` (até 2 casas, vírgula ou ponto; negativo recusado), só
  `cto`. A mudança vai ao histórico (`teto_alterado`).
- No painel: `/configuracao/agentes`.

## RF-19. Interruptor e modelo

- Tabela `configuracao_agente`: os quatro nascem **desligados e sem modelo**.
- `PATCH /api/agentes/:agente` com `{ "ligado": true, "modelo": "<id do modelo>" }`, só `cto`. Ligar exige modelo com
  preço vigente; sem isso, 409 "Não foi possível ligar o agente …. Ele continua desligado.". O preço não muda por aqui.
- `GET /api/agentes` (pessoa) lista os quatro com estado, modelo e a última mudança (só o nome da conta).
- Cada mudança vai ao histórico (`agente_ligado`, `agente_desligado`).

## RF-20. Minimização

Vale para todo campo de texto de todo agente, não só para o texto bruto (`minimizar.ts`), nesta ordem:

1. as linhas de cabeçalho de e-mail encaminhado (`De:`, `Para:`, `Cc:`, `Cco:`, `Enviado em:`, `Responder para:` e as
   formas em inglês) saem inteiras;
2. e-mail, CNPJ, CPF e telefone viram `[e-mail removido]`, `[CNPJ removido]`, `[CPF removido]` e
   `[telefone removido]`, pelos mesmos detectores do Pedido de Construção (`DETECTORES`, `detectores.ts`; o detector de
   e-mail está descrito abaixo);
3. o nome completo do solicitante, quando informado, vira `[nome removido]`, sem diferença de caixa e, desde a 0.1.10,
   sem diferença de acento, nos dois sentidos e também com texto em NFD. Qualquer espaço entre os pedaços casa e, desde
   a 0.1.11, também `_` (`Joana_Ficticia` e `joana_ficticia` viram um marcador só). O nome não é trocado quando é
   pedaço de outra palavra: desde a 0.1.11, só letra e marca coladas impedem a troca, e número e `_` colados contam
   como borda (`Joana Ficticia2`). Pedaços sem separador não casam como nome completo (`Ana Lise` não troca `análise`);
4. desde a 0.1.10 (M-1 da revisão do 0009, opção (b) refinada decidida por Fabiano em 04/11), cada **parte do nome**
   de todos os solicitantes informados também vira `[nome removido]`, quando no texto ela começa por letra maiúscula.

A parte do nome sai de `partesDoNome`:

- o nome é cortado em espaço, hífen e apóstrofo, e cada pedaço perde as pontas que não são letra nem número;
- entra o pedaço com 3 letras ou mais, que não está em `PARTICULAS_DO_NOME`, sem repetição;
- `PARTICULAS_DO_NOME` é uma lista fechada, comparada sem caixa e sem acento: `da`, `das`, `de`, `do`, `dos`, `du`,
  `del`, `della`, `di`, `van`, `von`, `der`, `den`, `le`, `la`, `e`, `y`, `filho`, `filha`, `neto`, `neta`, `junior` e
  `sobrinho`.

Regras da troca:

- a primeira letra do trecho tem de ser maiúscula no texto. O resto não diferencia caixa nem acento, então `JOANA` sai;
- todos os nomes completos são trocados antes de todas as partes, então o nome completo vira um marcador só;
- a parte só é trocada quando há fronteira nas duas pontas (`haFronteira`, desde a 0.1.11, B-1 da revisão do 0011),
  conferida no texto original. Há fronteira no começo e no fim do trecho, ao lado de qualquer coisa que não seja letra
  (número, `_`, hífen, pontuação, espaço, `@`), na passagem de minúscula para maiúscula (CamelCase, `Joana|Ficticia`)
  e no fim de uma sigla (maiúscula seguida de maiúscula e minúscula, `JOANA|Ficticia`). Entre duas letras, fora disso,
  não há fronteira (`Ana|bela`, `ANA|TEL`). A marca combinante é pulada na conferência. A mesma regra vale para a ponta
  direita de uma parte e a esquerda da seguinte, então uma segunda chamada de `minimizar` não troca nada a mais;
- uma parte recusada não esconde outra que começa dentro dela: a busca recomeça um caractere depois do início da
  recusada (`AnAna` com a parte `Ana` sai `An[nome removido]`). O custo continua linear;
- nada é trocado dentro de um marcador. O texto original não é normalizado: a busca corre sobre uma cópia dobrada do
  mesmo comprimento, e só a faixa casada muda.

Exemplo com nomes fictícios. Com o solicitante `Bruno Dias Lima`, o texto
`Prazo de 30 dias; suco de lima; o Bruno e o Lima aprovaram.` vai ao agente como
`Prazo de 30 dias; suco de lima; o [nome removido] e o [nome removido] aprovaram.`. Com `Ana dos Santos`, `dos` fica no
texto.

O que a regra **troca**: o primeiro nome, o sobrenome ou outra parte sozinha, com inicial maiúscula (`a Joana
pediu`), em maiúscula (`JOANA`) ou sem acento (`Conceicao` para `Conceição`). Desde a 0.1.11, também a parte grudada,
com o nome `Joana Ficticia`:

| Texto | Vai ao agente |
|---|---|
| `A Joana2 pediu` | `A [nome removido]2 pediu` |
| `Usuário Joana_Ficticia aprovou` | `Usuário [nome removido] aprovou` (nome completo) |
| `Siga @JoanaFicticia` | `Siga @[nome removido][nome removido]` |
| `ContatoJoana e 2Joana e x_Joana` | `Contato[nome removido] e 2[nome removido] e x_[nome removido]` |
| `JOANA2 e JOANA_X` | `[nome removido]2 e [nome removido]_X` |
| `JOANAFicticia` | `[nome removido][nome removido]` (fim de sigla) |
| `JOANAFICTICIA e joana2 e jOANA` | igual (toda em maiúscula sem separador; minúscula) |

O que **sobra** e chega ao provedor:

- a parte escrita toda em minúscula (`a joana pediu`, `joana2`), risco aceito no RSK do 0011. O nome completo em
  minúscula continua trocado, com espaço ou `_` entre os pedaços;
- o nome todo em maiúscula sem separador entre as partes (`JOANAFICTICIA`): entre duas maiúsculas seguidas de outra
  maiúscula não há fronteira;
- a parte curta grudada a outra parte do mesmo nome que começa por ela: com as partes `Ana` e `Anabela`, `AnaBelax`
  fica igual, porque a busca tenta a parte mais longa, que é recusada, e não volta à mais curta na mesma posição (B-3
  da revisão do 0012);
- o nome antigo, de antes de uma edição da demanda: a troca usa só o `solicitanteNome` atual;
- o nome de outras pessoas (J-03 da spec).

Falsos positivos aceitos: palavra com maiúscula igual a uma parte do nome (`Dias depois`, `Paulo` em `São Paulo`) e a
parte que o nome de outra pessoa tem em comum com o do solicitante. Com `Ana Exemplo Lima` como solicitante,
`Bruno Exemplo Rocha` sai `Bruno [nome removido] Rocha`. Desde a 0.1.11, também a parte no começo ou no fim de uma
palavra em CamelCase: `RosaTech` (nome `Carla Rosa Campos`) sai `[nome removido]Tech`, e `MariAna` (nome
`Ana Ficticia`) sai `Mari[nome removido]`. `Mariana`, `Anabela`, `ANATEL` e `ANABELA` ficam.

### Detector de e-mail

`DETECTORES['e-mail']` (`src/modules/dados-pessoais/detectores.ts`) é o mesmo na minimização e no bloqueio do Pedido
de Construção ([cap. 05](05-pedido-de-construcao.md#rf-22-gerar-o-pedido)). Desde a 0.1.11 (M-a e B-2 da revisão do
0011):

- o usuário aceita letra, marca combinante e número de qualquer alfabeto, além de `._%+-`. `joão.ficticia@exemplo.test`
  vira um marcador só, também com o texto em NFD. Até a 0.1.10, saía `joã[e-mail removido]`. O domínio e o TLD seguem
  só ASCII: domínio com acento não é detectado;
- o custo é linear. O início é ancorado por um lookbehind, que só deixa o casamento começar no primeiro caractere de
  uma sequência de usuário. Não há limite de tamanho no usuário nem no domínio. Até a 0.1.10, uma sequência longa sem
  `@` custava tempo quadrático: 100 mil caracteres, o limite do texto bruto, levavam cerca de 20 s e travavam o event
  loop do processo. Nos testes, 100 mil caracteres ficam abaixo de 200 ms nos detectores, em `minimizar` e na busca do
  Pedido;
- o e-mail colado no fim de outro (`ana@exemplo.test+bia@exemplo.test`) continua virando dois marcadores. O detector é
  uma subclasse de `RegExp` (`DetectorDeEmail`). Quando continua uma busca global do ponto onde o casamento anterior
  terminou, o `exec` tenta antes, só naquela posição, a mesma regex sem o lookbehind (flag `y`). Se não casar, segue a
  regex ancorada;
- o separador colado ao e-mail (`------joana.ficticia@exemplo.test`) entra no marcador; com espaço antes, fica.

Cobertura: `replace`, `replaceAll`, `matchAll`, `match`, `search`, `exec` e `test` dão os mesmos casamentos, conferidos
em teste. `minimizar` usa `replace`, e o Pedido de Construção usa `search`. O que fica de fora (pendências da 0.1.11 no
[CHANGELOG](../../CHANGELOG.md)):

- `split` (que cria uma cópia com a flag `y`, e a tentativa extra só roda sem ela) e a cópia feita com
  `new RegExp(detector)` (uma `RegExp` comum, sem o `exec` da subclasse) não passam pela tentativa extra e perderiam o
  e-mail colado no fim de outro. Nenhum chamador usa esses caminhos hoje (I-1 da revisão do 0012);
- com dois `@` no domínio e acento antes do primeiro (`é@b.cc@b.cc`), sobra no texto `@domínio`, sem usuário. É menos
  do que a 0.1.10 deixava, mas contradiz o comentário do código, que diz que tudo o que a regex antiga cobria continua
  coberto (B-a da revisão do 0012).

Ao provedor vai só a lista de campos permitida para cada agente (`entrada-agente.ts`). Risco residual registrado para
aceite (J-03 da spec): nome de outra pessoa dentro de texto livre ainda pode chegar ao provedor.

**Na tela** (`TEXTOS_DEMANDA` em `src/components/dados-da-demanda.ts`, desde a 0.1.10), os textos não prometem mais do
que essa regra faz. Desde a 0.1.11 (B-4 da revisão do 0011), eles dizem também os limites da troca da parte:

- a dica do campo "Nome do solicitante", na criação e na edição: "O campo não vai ao agente de IA. Evite repetir o
  nome no texto: o sistema troca o nome do solicitante, mas não o de outras pessoas nem a parte do nome escrita toda
  em minúscula.";
- o aviso do modo agente: "O agente recebe só o texto, sem a origem e com e-mails, telefones, CPF e CNPJ trocados por
  marcadores. O nome do solicitante também vira marcador, e cada parte com 3 letras ou mais, fora partículas como dos,
  das e Júnior, quando escrita com inicial maiúscula; nomes de outras pessoas, não. Você revisa a proposta antes de
  qualquer decisão.".

O "3 letras" é o `MINIMO_NOME` e as partículas vêm de `PARTICULAS_DO_NOME`, os dois em `minimizar.ts`. Até a 0.1.9, a
dica dizia "Ele não é enviado ao agente de IA", e o aviso dizia "sem o nome do solicitante". Na 0.1.10, o aviso dizia
"cada parte dele escrita com inicial maiúscula", sem o mínimo de letras nem as partículas.

Esta minimização vale para a entrada que o worker monta. Desde a 0.1.7 (M-1), a leitura de demanda pela API com token
de agente usa a mesma regra: `minimizarValor` saiu de `entrada-agente.ts` para `src/modules/dados-pessoais/minimizar.ts`
e é usada pelos dois. A vista mínima ([cap. 03](03-demandas.md#rf-06-consultar-e-alterar)) tira `solicitanteNome`,
`anexos` e o nome da conta e passa o texto livre da demanda (e o `titulo` da listagem) pela minimização, com o nome do
solicitante entre os trocados. Desde a 0.1.8 (M-a), a regra vale também fora da demanda: as leituras e o 201 da
criação de DEC, ESP e RSK passam o texto livre pela mesma minimização para o token de agente, com o nome do solicitante
da demanda ([cap. 09](09-referencia-api.md#exemplo-ler-demanda-com-token-de-agente)). Desde a 0.1.10, as partes do nome
valem em todos esses lugares, porque todos passam por `minimizar` e `minimizarValor`. A pessoa e o Pedido de Construção
continuam com o texto original. Desde a 0.1.12 (D1 do 0013), o Pedido usa a mesma etapa do nome, sem trocar: os passos
3 e 4 de `minimizar` ficaram em `trocarNomes`, e `temNome` diz se ela mudaria o texto. Com o nome do solicitante num
texto do pedido, a geração é recusada ([cap. 05](05-pedido-de-construcao.md#nome-do-solicitante)). O que sobra do M-1 da revisão do 0009 (risco residual, não bloqueia) é a lista acima:
parte em minúscula, nome todo em maiúscula sem separador, parte curta grudada a outra que começa por ela, nome antigo e
nome de outras pessoas ([CHANGELOG](../../CHANGELOG.md)).

## Pré-condições para ligar qualquer agente em produção

Nenhuma delas é do código; todas são de Fabiano e de outras áreas, e precisam estar cumpridas antes do primeiro
`PATCH` que liga um agente:

1. Chave da API no CNPJ da empresa (CA-E-03) e `ANTHROPIC_API_KEY` só no serviço `worker`.
2. Base legal e transferência internacional (LGPD, art. 33) confirmadas por `juridico-contratos` (J-01).
3. Termos comerciais do provedor com a retenção aplicável e, se possível, retenção zero.
4. Registro da operação de tratamento com `compliance-governanca` (J-02).
5. Aceite formal do risco residual por `gestao-riscos` e Fabiano (J-03): nome em texto livre que chega ao provedor e
   instrução injetada que passe pela revisão humana chega ao `/construir`.
6. Teto mensal e preço do modelo definidos por Fabiano.
