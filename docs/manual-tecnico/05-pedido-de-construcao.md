# 05. Pedido de Construção

| Campo | Valor |
|---|---|
| Atualizado em | 13/11/2026 (0.4.0: seção "Andamento da construção", com a rota `POST /api/pedidos-construcao/<DEC-id>/andamento`, as respostas, a tabela de transições, o evento `andamento_registrado`, o limite e a A3; o parágrafo dos dois caminhos do pedido deixa de dizer que o status muda só à mão); 12/11/2026 (0.3.1: entrega e recebimento sob a mesma trava do DEC; recebimento só do hash da última entrega; entrega grava quando o hash difere do último; prazo total; DEC de demanda do Awave não confirmada fora da lista do agente, no RF-23); 12/11/2026 (0.3.0: conferência e montagem em `conferir.ts`, a mesma da geração e da entrega; seção "Entrega ao /construir", com as três rotas novas; texto da seção do pedido e "Recebido pelo /construir em …" na T11); 10/11/2026 (0.1.13: só o DEC aprovado mais novo gera, 409 do substituído, linha 6 da orientação e T11 do substituído, no RF-22; substituído marcado no RF-23); 04/11/2026 (0.1.12: recusa com o nome do solicitante, confirmação sem dado pessoal no corpo e na T11, `aprovadoPor` com o papel, no RF-22); 04/11/2026 (0.1.11: detector de e-mail linear e com acento no usuário, no passo de C-28 do RF-22); 03/11/2026 (0.1.6: trava da demanda e recusa em status final na geração) |
| Dono | `documentacao-tecnica` (sistema: Fabiano) |
| Cobre | RF-22, RF-23; RNF-15; RF-12 a RF-15 do pedido 0016 (0.3.0); RF-01 a RF-07 e RF-12 do pedido 0017 (0.4.0) |
| Fontes no código | `src/modules/pedido-construcao/` (`gerar.ts`, `conferir.ts`, `entregar.ts`, `receber.ts`, `pendentes.ts`, `montar.ts`, `conteudo.ts`, `serializar.ts`, `schemas.ts`), `src/modules/dados-pessoais/detectores.ts`, `src/modules/dados-pessoais/minimizar.ts` (`temNome`), `src/modules/pacotes-decisao/criar.ts` (`descricaoSemRotulos`), `src/modules/pacotes-decisao/substituido.ts`, `src/vendor/construir/pedido.mjs`, `src/app/api/pacotes-decisao/[decId]/pedido-construcao/route.ts`, `src/app/(painel)/pacotes-decisao/[decId]/` (`SecaoPedido.tsx`, `acoes-pedido.ts`), `src/components/dados-do-pedido.ts`, `src/components/dados-da-decisao.ts` (`linhaDoRecebimento`), `src/app/api/pacotes-decisao/route.ts`, `src/app/api/pedidos-construcao/`; desde a 0.4.0, `src/modules/andamento/` (`schemas.ts`, `regras.ts`, `registrar.ts`, `consultas.ts`), `src/db/schema/andamento.ts`, `src/modules/demandas/transicoes.ts` (`AUTOMATICAS_DO_CONSTRUIR`, `CONTRADIZ_STATUS_FINAL`, `mudarStatusPeloConstruir`), `src/modules/limites.ts` (`LIMITE_ANDAMENTO`, `conferirLimiteDeAndamento`), `src/app/api/pedidos-construcao/[decId]/andamento/route.ts` |

## RF-22. Gerar o pedido

`POST /api/pacotes-decisao/:decId/pedido-construcao`, só pessoa com 2FA, com o corpo
`{ "confirmaSemDadoPessoal": true }` (desde a 0.1.12, D3 do 0013). É `POST`, e não `GET`, porque a geração grava
evento; `GET` nessa rota responde 405. No painel, a tela de decisão (`/pacotes-decisao/[decId]`) mostra a seção do
pedido, com a caixa de confirmação, gerar, baixar e copiar, só para DEC aprovado, não desatualizado e, desde a 0.1.13,
não substituído ([Na T11](#na-t11)). Só o DEC aprovado mais novo da demanda gera o pedido, para nunca haver dois
Pedidos de Construção válidos da mesma demanda ([cap. 04](04-versoes-e-decisao.md#substituição-do-dec-aprovado)).

O corpo passa pelo `confirmacaoDoPedidoSchema` (`schemas.ts`), o mesmo na rota e na Server Action
`gerarPedidoNoPainel`. Tipo errado (`"true"`, `1`), JSON inválido ou `POST` sem corpo → 400 `entrada_invalida`, como em
toda rota com corpo. Chave a mais é descartada (C-11). A falta do campo, ou `false`, não é erro de formato: quem recusa
é o `gerarPedido` (passo 2).

Ordem das conferências (`gerar.ts`). Do passo 3 em diante, numa transação. Recusado em qualquer passo, nada é entregue
e nenhum evento é gravado. Desde a 0.3.0, os passos 3 a 11 ficam em `conferirEMontarPedido` (`conferir.ts`, ADR-26),
que a geração e a entrega ao `/construir` chamam: os bytes da entrega são os da geração por construção:

1. a matriz: só pessoa. Token de agente e ator `sistema` recebem 403, também chamando a função direto;
2. a confirmação (desde a 0.1.12): `confirmaSemDadoPessoal` diferente de `true` → 422 "Confirme que o título, a
   descrição, a ESP e o parecer de risco não têm dado pessoal de ninguém. Nada foi entregue."
   (`MENSAGENS_PEDIDO.semConfirmacao`), sem `erros`. Vem antes de tocar o banco: um DEC que não existe também recebe
   esta mensagem, e a resposta não diz se o DEC existe;
3. o DEC existe (senão 404) e a demanda dele é travada, como na decisão (M-08, desde a 0.1.6);
4. demanda `entregue` ou `encerrada` (`ehStatusFinal`) → 409 "a demanda está em status final; o pacote não gera mais
   Pedido de Construção." (`MENSAGENS_PEDIDO.demandaFinal`). Vem antes de ler o DEC, então também um DEC pendente ou
   arquivado numa demanda final recebe esta mensagem;
5. DEC sem decisão `aprovada` completa (pendente, com só uma das duas aprovações, devolvido ou arquivado) → 409
   "o Pedido de Construção só é gerado de pacote aprovado.";
6. DEC substituído por um aprovado mais novo da demanda (desde a 0.1.13), lido junto com o DEC, sob a trava → 409
   "o pacote foi substituído por <id>, aprovado depois dele; só o pacote aprovado mais novo gera o Pedido de
   Construção." (`MENSAGENS_PEDIDO.substituido(id)`, uma função, com o id do aprovado vigente). Vem antes do
   desatualizado, porque aponta o DEC que gera: um DEC desatualizado e substituído recebe esta mensagem. Uma aprovação
   do DEC mais novo ao mesmo tempo ou espera esta transação, ou já é vista; nunca sai 200 do substituído depois que a
   aprovação do mais novo foi gravada ([cap. 04](04-versoes-e-decisao.md#substituição-do-dec-aprovado));
7. DEC desatualizado, lido sob a trava → 409 "o pacote está desatualizado: a demanda tem ESP ou RSK mais nova que a
   citada." (A-03 da 08);
8. demanda do tipo `estudo`, pela cópia gravada no DEC → 422 "demanda do tipo estudo não gera Pedido de Construção";
9. montagem só com a ESP e o RSK citados no DEC;
10. dado pessoal no pedido montado → **um 422 só**, "O pedido não passou na validação do /construir. Nada foi
   entregue.", com `erros` no formato `<caminho>: <tipo>`, sem o valor. Primeiro vem a lista do C-28, depois a do nome:
   - **C-28:** e-mail, telefone ou CPF em qualquer campo. CNPJ não bloqueia o pedido. A busca é
     `encontrarDadosPessoais`, com os `DETECTORES` de `detectores.ts`. Desde a 0.1.11 (M-a e B-2 da revisão do 0011),
     o detector de e-mail tem custo linear (100 mil caracteres abaixo de 200 ms; antes, cerca de 20 s com o event loop
     travado) e aceita letra com acento no usuário. No reteste da `seguranca-aplicacao`, com 300 mil textos sorteados,
     nenhum texto que a 0.1.10 bloqueia deixou de ser bloqueado ([cap. 06](06-agentes-de-ia.md#detector-de-e-mail));
   - **nome do solicitante** (desde a 0.1.12, D1 do 0013): o tipo é `nome`. Ver [Nome do solicitante](#nome-do-solicitante);
11. `validarPedido` da cópia em `src/vendor/construir/pedido.mjs` (a mesma regra do `/construir`, conferida por SHA-256
    em teste) → 422 com a mesma mensagem e os `erros` dele;
12. evento `pedido_gerado` e a resposta. Desde a 0.1.12, o evento grava `depois: { "confirmaSemDadoPessoal": true }`,
    um booleano fixo, sem texto (C-30); `antes` fica nulo. O histórico mostra "Gerou o Pedido de Construção de
    <DEC-id>, com a confirmação de que o texto não tem dado pessoal". O evento gravado antes da 0.1.12, sem o
    `depois`, continua com "Gerou o Pedido de Construção de <DEC-id>" (`textoDoEvento`, `src/components/rotulos.ts`).

Consequência do passo 4: depois que a demanda vai a `entregue` (ou é encerrada), o Pedido do DEC aprovado não é mais
gerado de novo. Baixe o arquivo enquanto a demanda está em `aprovada` ou `em_construcao` (B-5 da 0.1.6). O texto do
passo 4 espera a revisão da `ux-ui-design` (B-4 da 0.1.6).

Resposta: 200, corpo = o JSON, com `content-disposition: attachment; filename="<decId>.json"`. Exemplo de chamada e de
recusa no [cap. 09](09-referencia-api.md#exemplo-gerar-o-pedido-de-construção).

Formato (seção 3.1 da spec do `/construir`), com as chaves sempre nesta ordem:

```json
{
  "pedido": "DEC-DEM-20261022-0001-v1",
  "demanda": { "id": "DEM-20261022-0001", "tipo": "novo_projeto", "titulo": "…", "descricao": "Contexto: …\n\nProblema: …" },
  "especificacao": { "id": "ESP-DEM-20261022-0001-v1", "conteudo": "…" },
  "risco": { "id": "RSK-DEM-20261022-0001-v1", "nivel": "alto", "conteudo": "…" },
  "decisao": { "id": "DEC-DEM-20261022-0001-v1", "opcaoEscolhida": "A: …", "aprovadoPor": "cto e administradora", "aprovadoEm": "2026-10-22" },
  "sistema_alvo": "ws-orquestrador-demandas",
  "repositorio_destino": "wsssistemas2626-crypto/ws-orquestrador-demandas",
  "criterios_aceite_preliminares": ["…"],
  "definicao_de_pronto": ["…"]
}
```

- `demanda` vem da cópia gravada no DEC: editar a demanda depois não muda o pedido.
- `risco.nivel` é o maior dos três níveis do RSK.
- `decisao.opcaoEscolhida` é a letra e a descrição da opção; `aprovadoEm` é a data, em São Paulo, da aprovação que
  completou a decisão.
- `decisao.aprovadoPor` (desde a 0.1.12, D2 do 0013) são os **papéis** de quem aprovou, e não os nomes: `cto` no nível
  "Só o CTO"; na dupla aprovação, os dois papéis na ordem da aprovação, unidos por " e ". A ordem é pelo instante
  gravado (`registradaEm`) e, no mesmo instante, `cto` antes de `administradora` (`PAPEIS_APROVACAO`). Exemplos:
  `administradora e cto` quando a administradora aprovou primeiro; `cto e administradora` quando o CTO aprovou
  primeiro ou as duas no mesmo instante. O papel vem da aprovação gravada (`Aprovador.papel`), e não da conta: trocar o
  nome ou o papel da conta depois não muda o arquivo. O `validarPedido` só exige texto preenchido e aceita os três
  formatos. Até a 0.1.11, eram os nomes das contas, na ordem CTO e administradora. Como cada papel tem uma pessoa só,
  o papel ainda identifica quem aprovou (B-4 da revisão do 0013, com o `juridico-contratos`). Quem aprovou pelo nome
  fica no histórico do DEC.
- Fica de fora: data de geração, nome do solicitante, nome de quem aprovou, texto bruto, anexos, resumo, recomendação
  e comentários.
- **Determinístico** (RNF-15): só dado imutável, chaves em ordem fixa, dois espaços de recuo e quebra de linha no fim.
  O mesmo DEC gera sempre o mesmo arquivo, byte a byte, enquanto a demanda não está em status final (passo 4) e
  enquanto a geração é aceita (o nome conferido no passo 10 é o atual; ver abaixo). O mesmo DEC gerado na 0.1.11 e na
  0.1.12 dá arquivos diferentes, por causa do `aprovadoPor`.

O pedido chega a `pedidos/` da estruturaAutonoma por um de dois caminhos. Com a busca automática do `/construir`
ligada (desde a 0.3.0), o `/construir` busca o pedido gerado e confirma o recebimento
([Entrega ao /construir](#entrega-ao-construir-030)). Com a busca desligada, a pessoa baixa ou copia o JSON na T11 e o
grava à mão em `pedidos/`. Nos dois caminhos, o sistema não chama o `/construir` (é o `/construir` que chama).

Desde a 0.4.0, o `/construir` informa o andamento do pedido gerado no painel, e duas mudanças de status passam a ser
dele: `aprovada` → `em_construcao` quando a construção começa e `em_construcao` → `devolvida` quando ela é cancelada
([Andamento da construção](#andamento-da-construção-040)). `entregue` continua só de pessoa (A1), e as outras mudanças
de status seguem à mão. O pedido escrito direto em `pedidos/`, sem geração no painel, não tem andamento (A3). O pedido
gerado no painel e copiado à mão tem, porque o que conta é o evento `pedido_gerado`, e não o caminho da cópia.

Limite conhecido (B-01, backlog): o nome da conta ainda pode ser alterado por `/api/auth/update-user`, e esse nome vai
para a aprovação gravada. Desde a 0.1.12, ele não vai mais para o `aprovadoPor` do pedido.

### Nome do solicitante

Desde a 0.1.12 (D1 do 0013, pareceres de 04/11 da `gestao-riscos`, da `juridico-contratos` e da
`seguranca-aplicacao`), a geração é recusada quando um texto escrito por pessoa no pedido tem o nome do solicitante da
demanda, inteiro ou em parte. O pedido vai para a assinatura pessoal onde roda o `/construir`, e lá o JUR-2026-002,
item 7.4, proíbe dado pessoal real. O texto não é trocado por marcador: a geração é recusada, e a pessoa corrige o
texto. Assim o pedido aceito continua com o texto original e o mesmo DEC continua gerando o mesmo arquivo (CA-22.2).

**Onde confere.** `textosDoPedido` (`montar.ts`) devolve os valores escritos por pessoa, antes de receberem rótulo,
com o caminho do pedido onde cada um sai, nesta ordem:

| Caminho no `erros` | Valor conferido |
|---|---|
| `demanda.titulo` | o título copiado no DEC |
| `demanda.descricao` | a descrição copiada no DEC, sem os rótulos "Contexto: ", "Problema: " e "Impacto percebido: " (`descricaoSemRotulos`, `criar.ts`) |
| `especificacao.conteudo` | cada campo preenchido da ESP, sem o rótulo (`valoresDaEspecificacao`, `conteudo.ts`) |
| `risco.conteudo` | cada campo preenchido do RSK, sem o rótulo e sem o nível (`valoresDoParecer`, `conteudo.ts`) |
| `decisao.opcaoEscolhida` | só a descrição da opção, sem o `A: ` |
| `sistema_alvo`, `repositorio_destino` | o valor, quando não é nulo |
| `criterios_aceite_preliminares[i]`, `definicao_de_pronto[i]` | cada item, um caminho por item |

Ficam fora os valores que o sistema gera (ids, `tipo`, `nivel`, `aprovadoPor` e `aprovadoEm`) e os rótulos ("Campos
críticos", "Risco técnico", o nível "Alto", "Contexto"). Por isso um solicitante chamado `Carlos Campos Ficticio` não
recusa o campo "Campos críticos" da ESP. Um teste de guarda (`gerar.test.ts`, "textosDoPedido (D1 do 0013)") preenche
todos os campos da ESP e do RSK com palavras distintas e reprova se alguma que sai no pedido não estiver na lista
conferida, no caminho certo.

**Com que regra.** `temNome(texto, nomes)` (`minimizar.ts`) diz se a etapa do nome da minimização mudaria o texto. Os
passos 3 e 4 de `minimizar` foram extraídos para `trocarNomes`, que as duas usam: a regra existe uma vez só
([cap. 06](06-agentes-de-ia.md#rf-20-minimização)).

- O nome completo conta sem diferença de caixa e de acento, com espaço ou `_` entre os pedaços (`JOANA FICTICIA`,
  `joana ficticia`, `Joána Fictícia`, `Joana_Ficticia`).
- Cada parte com 3 letras ou mais, fora de `PARTICULAS_DO_NOME`, conta quando começa por maiúscula no texto, também
  grudada em número, `_` ou CamelCase (`Joana`, `Ficticia`, `Joana2`, `JoanaFicticia`).
- O cabeçalho de e-mail não conta (`Para: o financeiro` gera), e e-mail, telefone e CPF ficam com o C-28. Um e-mail
  com uma parte do nome com maiúscula (`Joana.Ficticia@…`) aparece como `e-mail` e como `nome` no mesmo caminho.
- O nome conferido é o `solicitanteNome` **atual** da demanda travada (`nomesDoSolicitante`), a mesma fonte da vista
  mínima. Renomear o solicitante depois pode fazer o mesmo DEC, antes aceito, passar a ser recusado. Nome com menos de
  3 letras não confere nada.
- `nome` não é um `TipoDadoPessoal`: não tem detector nem marcador, e a minimização do texto que vai ao agente não
  muda.

Exemplo, com a solicitante fictícia `Joana Ficticia`: título `Pedido da Joana Ficticia` e
`contato@exemplo.test` na ESP dão `["especificacao.conteudo: e-mail", "demanda.titulo: nome"]`. Com o solicitante
`Rosa Dias Ficticia`, a ESP `camisa rosa em 30 dias` gera, e duas gerações saem iguais byte a byte. Com
`Maria dos Santos Neto Ficticia`, o RSK `o Neto do cliente e dos fornecedores` gera (partícula).

**Recusa falsa.** Uma palavra com maiúscula igual a uma parte do nome recusa a geração: `Santos` (cidade), `Rosa` no
começo da frase, `Campos`. Só reescrevendo o texto ela passa. Ver [Corrigir uma recusa](#corrigir-uma-recusa).

**O que a conferência não pega.** A confirmação da T11 e a regra de uso cobrem estes casos; nenhum é recusado:

- o nome de outras pessoas, inclusive de quem aprovou, escrito no texto. Só o nome do solicitante é conferido;
- o nome antigo do solicitante, de antes de uma edição da demanda;
- a parte do nome escrita toda em minúscula (`a joana pediu`), para não recusar a palavra comum. O nome completo em
  minúscula, com espaço ou `_`, é recusado;
- o nome completo em minúscula ligado por hífen ou ponto (`joana-ficticia`, `joana.ficticia`). Em `sistema_alvo` e
  `repositorio_destino`, que só aceitam minúscula, a conferência do nome nunca dispara (B-1 da revisão do 0013);
- o nome todo em maiúscula sem separador entre as partes (`JOANAFICTICIA`) e a parte curta grudada a outra parte que
  começa por ela (`AnaBelax` com `Ana` e `Anabela`), como na minimização;
- quem quer esconder o nome com espaço invisível, letra cirílica ou letra de largura total. O controle mira o descuido
  de uma pessoa com 2FA, e não quem quer burlar (B-2 da revisão do 0013).

**Custo.** A conferência roda com a demanda travada. No pior caso medido pela `seguranca-aplicacao`, com 512 KB de
texto em NFD, leva cerca de 1 s (B-3 da revisão do 0013).

### Corrigir uma recusa

A T11 mostra, depois da lista `erros`, uma orientação por campo (`orientacaoDoPedido`, `dados-do-pedido.ts`), um
parágrafo por linha, só com as linhas que valem e nesta ordem:

1. algum erro termina em `: nome`: "O nome do solicitante, inteiro ou em parte com inicial maiúscula, está nos campos
   da lista. Tire o nome e gere de novo.";
2. `demanda.titulo` ou `demanda.descricao`: "Título e descrição (demanda.titulo, demanda.descricao): corrija na
   demanda, em "Editar dados".";
3. `especificacao.`, `criterios_aceite_preliminares`, `definicao_de_pronto`, `sistema_alvo` ou `repositorio_destino`:
   "ESP, critérios de aceite, definição de pronto, sistema e repositório: corrija numa versão nova da ESP.";
4. `risco.`: "Parecer de risco (risco.conteudo): corrija num parecer de risco novo.";
5. `decisao.`: "Opção escolhida (decisao.opcaoEscolhida): corrija num pacote novo.";
6. sempre que houver linha de 2 a 5 (texto da 0.1.13): "Depois de corrigir, crie um pacote novo e aprove-o: o pacote
   aprovado mais novo substitui este, e só ele gera o Pedido de Construção.";
7. nenhuma linha de 2 a 5 valeu (por exemplo, erro do `validarPedido` fora desses caminhos): "Corrija criando uma
   versão nova da ESP e um pacote novo.".

Nenhuma linha traz valor do pedido. A correção depende sempre de um DEC novo: título e descrição do pedido vêm da cópia
gravada no DEC, então editar a demanda só muda o pedido de um DEC criado depois; ESP ou RSK novos deixam o DEC
desatualizado (409, passo 7). Desde a 0.1.13, o DEC novo pode ser aprovado com o antigo já aprovado, e a aprovação
completa dele substitui o antigo ([cap. 04](04-versoes-e-decisao.md#substituição-do-dec-aprovado)). A saída, dentro da
mesma demanda:

1. Corrija o texto no lugar que a orientação indica (demanda, ESP, RSK ou o próprio DEC).
2. Crie um DEC novo. Ele leva a cópia nova do título e da descrição e cita a ESP e o RSK de maior versão.
3. Aprove o DEC novo. Se o antigo foi aprovado com o CTO e a administradora, o novo precisa do mesmo nível
   (`cto_e_administradora`): um DEC só do CTO recebe 409 (S-01).
4. Gere o Pedido do DEC novo. O antigo passa a responder 409 (passo 6) e não mostra mais a seção do pedido na T11.

Até a 0.1.12, a A-02 recusava a aprovação do DEC novo, e a única saída era encerrar a demanda e abrir outra.

### Na T11

A seção "Pedido de Construção" (`SecaoPedido.tsx`, textos em `TEXTOS_PEDIDO`, `dados-do-pedido.ts`) mostra, nesta
ordem, o texto da seção, o aviso de C-28, a caixa de confirmação e o botão "Gerar Pedido de Construção":

- texto da seção (desde a 0.3.0, CA-16.3 do pedido 0016): "Gere o pedido. Com a busca automática do /construir ligada,
  ele pega o pedido gerado na busca seguinte (a cada 5 minutos), e o recebimento aparece no topo desta página. Com a
  busca desligada, baixe ou copie o JSON e grave-o na pasta pedidos/ da estruturaAutonoma.";

- aviso (desde a 0.1.12): "O pedido vai para o repositório git da estruturaAutonoma. Não deixe nome, e-mail, telefone
  ou CPF de qualquer pessoa ou do cliente no título, na descrição, na ESP nem no parecer de risco.";
- caixa `confirma-sem-dado-pessoal` (`CaixaSelecao`, obrigatória, com rótulo associado), com o rótulo "Confirmo que o
  título, a descrição, a ESP e o parecer de risco deste pacote não têm dado pessoal de ninguém: nome, e-mail, telefone
  ou CPF.". Ela começa desmarcada.
- validação no envio, como a caixa de revisão da decisão: o botão fica habilitado. Com a caixa desmarcada, o clique não
  chama a Server Action (`entradaDoPedido` devolve `null`), mostra "Marque a confirmação para gerar o pedido." como
  erro da caixa (`aria-invalid` e `aria-describedby`) e põe o foco nela. Marcar a caixa, com o mouse ou o Espaço,
  limpa o erro. A caixa continua marcada depois de gerar;
- com a caixa marcada, a tela chama `gerarPedidoNoPainel({ decId, confirmaSemDadoPessoal: true })`. A recusa mostra o
  alerta com o texto, a lista `erros` (campo e tipo, sem valor) e a orientação de [Corrigir uma recusa](#corrigir-uma-recusa).
  O 422 sem a confirmação, que só chega por quem chama a ação sem a tela, mostra a mensagem do servidor, sem lista nem
  orientação.
- DEC substituído (desde a 0.1.13): a seção não aparece (`secaoDoPedido` devolve `'nenhuma'` com `substituidoPor`
  preenchido), e a T11 mostra o selo "Substituído" e o aviso com o link para o DEC que gera
  ([cap. 04](04-versoes-e-decisao.md#substituição-do-dec-aprovado)). Numa aba aberta antes da substituição, o clique em
  "Gerar" recebe o 409 do passo 6 e mostra "Não foi possível concluir: o pacote foi substituído por <id>, …", com o foco
  no alerta, sem lista nem orientação.

Os textos do aviso, da caixa, do erro da caixa e da orientação foram escritos na triagem do 0013 e esperam a revisão da
`ux-ui-design` ([cap. 08](08-painel.md#pendências-de-interface-conhecidas)).

Desde a 0.3.0, o cabeçalho da T11 mostra "Recebido pelo /construir em <data e hora>.", depois de "Repositório destino",
quando o DEC tem `pedido_recebido` ([Entrega ao /construir](#entrega-ao-construir-030)).

## Entrega ao /construir (0.3.0)

Pedido `DEC-DEM-20261111-0016-v1`, RF-12 a RF-15 dele (CA-F-01 do `/construir`). A busca automática do `/construir`
(`ferramentas/construir/buscar-pedidos.mjs` da estruturaAutonoma, no crontab, a cada 5 minutos) pega sozinha o Pedido
de Construção que uma pessoa gerou no painel, sem cópia manual. Ela usa o token da integração `construir`
([cap. 02](02-acesso-e-seguranca.md#atores-de-integração-030)), que só alcança as três rotas abaixo. Ninguém mais
alcança essas rotas: pessoa, agentes e Awave recebem 403.

A busca nasce desligada (`"ligado": false` em `pedidos/config/orquestrador.json`). Ligar, guardar o token e trocá-lo
está em [docs/operacao/tokens-de-integracao.md](../operacao/tokens-de-integracao.md).

### Ciclo de uma busca

1. `GET /api/pedidos-construcao/pendentes` → `{ "itens": [{ "decId": "DEC-…" }] }`.
2. Para cada item, `POST /api/pedidos-construcao/<decId>/entrega` → o JSON do pedido.
3. O `/construir` grava `pedidos/<decId>.json` (ou acha o mesmo arquivo lá) e manda
   `POST /api/pedidos-construcao/<decId>/recebimento` com o SHA-256 do que gravou.
4. Com o recebimento aceito, o DEC sai da lista de pendentes.

Nenhum desses passos muda o status da demanda, a decisão, o DEC ou a demanda. O estado ("pendente", "entregue",
"recebido") sai só dos eventos (ADR-26), sem coluna nova.

### Pendentes (`listar_pedidos_pendentes`)

`listarPendentes` (`pendentes.ts`), numa consulta só, pelo índice `evento_acao_entidade_idx` (ADR-27). Um DEC está
pendente quando:

- tem `pedido_gerado` gravado por **pessoa** (IN-10). Um `pedido_gerado` de outro ator não conta;
- tem decisão `aprovada`, não foi substituído por um aprovado mais novo e não está desatualizado;
- a demanda dele não está em status final;
- não tem `pedido_recebido`.

A lista vai do primeiro `pedido_gerado` mais antigo para o mais novo, e depois pelo id. Cada item tem só `decId`. A
consulta não grava evento. Não há corte por data (P-03): os pedidos gerados antes da 0.3.0 entram na primeira busca. Um
DEC cuja entrega é recusada continua na lista até uma pessoa resolver (P-02), e o `/construir` acusa o erro por e-mail a
cada busca.

### Entrega (`entregar_pedido`)

`entregarPedido` (`entregar.ts`), numa transação com o orçamento da entrega: 10 s por instrução e, desde a 0.3.1, prazo
total de 12 s, contando a espera por conexão ([cap. 02](02-acesso-e-seguranca.md#atores-de-integração-030)):

0. desde a 0.3.1 (M-4), a primeira instrução é a trava consultiva do DEC, `travarPedido` (`pendentes.ts`), a mesma do
   recebimento. A entrega e o recebimento do mesmo DEC entram em fila. A ordem das travas é sempre a do pedido e depois
   a da demanda (dentro de `conferirEMontarPedido`);
1. sem `pedido_gerado` por pessoa para esse DEC → 404, igual ao do DEC que não existe;
2. `conferirEMontarPedido`: as mesmas conferências e a mesma montagem da geração, passos 3 a 11 do
   [RF-22](#rf-22-gerar-o-pedido), **sem** pedir de novo a confirmação sem dado pessoal (ela foi dada na geração). As
   recusas são as da geração (404, 409 e 422, com as mesmas mensagens), sem evento. O nome conferido é o atual do
   solicitante, então um solicitante renomeado depois da geração pode fazer a entrega ser recusada;
3. o SHA-256 dos bytes é calculado pelo servidor. Se ele difere do hash da última entrega do DEC
   (`ultimoShaEntregue`, `pendentes.ts`), grava `pedido_entregue` com `{ sha256 }`. Repetir a entrega dos mesmos bytes
   não grava de novo. Desde a 0.3.1, a sequência X → Y → X grava três eventos, para a última entrega ser de fato a
   última (na 0.3.0, era um evento por hash, e o terceiro não era gravado);
4. 200, `content-type: application/json; charset=utf-8`, com o corpo **byte a byte igual** ao da geração (CA-22.2).

A rota é `POST`, e não `GET`, porque grava evento. Ela não tem corpo: o `/construir` manda só o Bearer, sem `Origin` e
sem `content-type`.

### Recebimento (`confirmar_recebimento_pedido`)

`receberPedido` (`receber.ts`), com o corpo `{ "sha256": "<64 hexadecimais minúsculos>" }`, numa transação com o
orçamento padrão (prazo total de 8 s desde a 0.3.1). A primeira instrução é a trava consultiva do DEC, `travarPedido`,
a mesma da entrega (desde a 0.3.1, M-4). O recebimento só lê os hashes entregues depois de travar, então um recebimento
que chega durante uma entrega espera ela terminar. Ele não trava a demanda, e por isso não espera uma edição de pessoa.

| Situação | Resposta |
|---|---|
| `sha256` ausente ou fora do formato, ou chave a mais | 400 `entrada_invalida`, com "Informe o sha256 com 64 caracteres hexadecimais minúsculos." em `campos`, antes de olhar o DEC |
| DEC inexistente ou sem `pedido_gerado` por pessoa | 404 |
| DEC sem nenhuma entrega | 409 "Este pedido ainda não foi entregue ao /construir. Peça a entrega antes de confirmar o recebimento." |
| hash diferente do da **última** entrega do DEC, inclusive o de uma entrega anterior já substituída (desde a 0.3.1) | 409 "O SHA-256 enviado não confere com o pedido entregue. Busque o pedido de novo.", sem evento. A resposta não diz se o hash já foi entregue |
| hash igual ao da última entrega | 204 e `pedido_recebido` com o hash do servidor |
| o mesmo recebimento de novo | 204, sem evento novo |

O recebimento compara com o hash da última entrega gravada (`ultimoShaEntregue`) e não remonta o pedido. Por isso, um
DEC substituído, desatualizado ou com a demanda em status final **depois** da entrega ainda confirma o recebimento. Na
0.3.0, qualquer hash já entregue confirmava. Um recebimento atrasado de uma entrega antiga tirava o DEC da lista de
pendentes, e a entrega nova ficava sem confirmação. Desde a 0.3.1, ele recebe 409, e o `/construir` busca o pedido de
novo.

### No painel

- T11: "Recebido pelo /construir em <data e hora>." no cabeçalho, com a data do primeiro `pedido_recebido`
  (`recebimentoDoPedido`, `linhaDoRecebimento`). Aparece em toda situação do DEC, porque é fato consumado. Sem
  `pedido_recebido`, a linha não existe. Não há estado "aguardando o /construir": o painel não sabe se a busca está
  ligada.
- Histórico da demanda: "Buscou o Pedido de Construção de <DEC-id>" e "Confirmou o recebimento do Pedido de Construção
  de <DEC-id>", por "/construir (prefixo …)" ([cap. 03](03-demandas.md#rf-21-histórico)).

### Se a busca falhar

Troque `"ligado"` para `false` em `pedidos/config/orquestrador.json`. A cópia manual pela T11 continua valendo. Um token
vazado se revoga pelo prefixo, sem afetar os outros ([tokens-de-integracao.md](../operacao/tokens-de-integracao.md)).

## Andamento da construção (0.4.0)

Pedido `DEC-DEM-20261111-0017-v1`, RF-01 a RF-07 e RF-12 dele. A opção aprovada por Fabiano, como CTO, em 11/11 tem
três decisões que valem em toda esta seção:

- **A1:** `entregue` é sempre marcado por uma pessoa. O `/construir` nunca põe a demanda em `entregue` nem em
  `encerrada`;
- **A2:** o histórico ganha evento só quando muda a fase ou a situação da construção. Tarefa pronta a mais atualiza o
  dado, sem evento;
- **A3:** o pedido escrito direto em `pedidos/`, sem geração no painel, fica sem andamento e recebe 404.

O `/construir` informa em que fase está a construção de um Pedido de Construção e quantas tarefas do plano estão
prontas. Quem envia é `ferramentas/construir/enviar-andamento.mjs` da estruturaAutonoma, pelo crontab, e ele só manda
quando o estado do pedido muda: no máximo um envio a cada 2 minutos por pedido. O envio usa o token da integração
`construir`, o mesmo da busca, que ganhou a ação `registrar_andamento`
([cap. 02](02-acesso-e-seguranca.md#matriz-de-acesso)). Só ele tem essa ação: pessoa, agentes e Awave recebem 403, e
nenhuma Server Action nem job a chama.

O envio nasce desligado (`"andamento_ligado": false` em `pedidos/config/orquestrador.json` da estruturaAutonoma). Ligar
é passo de Fabiano, no fim da publicação da 0.4.0 ([deploy.md, seção 5](../operacao/deploy.md)).

Termos desta seção:

- **situação da construção** (`statusConstrucao`, o campo `status` do corpo): `em_construcao`, `construido` ou
  `cancelado`. Não é o status da demanda. Na tela, "Em andamento", "Concluída" ou "Cancelada";
- **mesmo estado:** DEC, fase, tarefas prontas, total de tarefas e situação iguais aos do último andamento gravado na
  demanda;
- **mudança de marco:** o primeiro andamento da demanda, ou fase, situação ou DEC diferente do último.

### Rota (`registrar_andamento`)

`POST /api/pedidos-construcao/<DEC-id>/andamento`, com `Authorization: Bearer`, sem `Origin` e com
`Content-Type: application/json`. O corpo tem **exatamente** quatro chaves (`corpoAndamentoSchema`, `schemas.ts`, um
`z.strictObject` sem conversão de tipo):

| Chave | Valores aceitos |
|---|---|
| `fase` | `entendendo_o_pedido`, `planejando`, `construindo`, `testando`, `revisando_e_entregando`, `documentando` |
| `tarefasProntas`, `tarefasTotal` | inteiro JSON de 0 a 999, com `tarefasProntas` menor ou igual a `tarefasTotal`. `tarefasTotal` 0 é aceito (pedido ainda sem plano de tarefas). Número escrito como texto, número com fração ou fora da faixa é recusado |
| `status` | `em_construcao`, `construido`, `cancelado` (a situação da construção) |

As listas de fase e de situação são as de `FASES_ANDAMENTO` e `STATUS_CONSTRUCAO` (`src/db/schema/andamento.ts`), as
mesmas dos CHECK do banco. Os números podem diminuir de um envio para o outro, quando o `tech-lead` refaz o plano.

Exemplo, com dados fictícios:

```http
POST /api/pedidos-construcao/DEC-DEM-20261112-0007-v1/andamento HTTP/1.1
Authorization: Bearer wsod_<token da integração construir>
Content-Type: application/json

{ "fase": "construindo", "tarefasProntas": 9, "tarefasTotal": 17, "status": "em_construcao" }
```

### Respostas

Corpo de erro `{ erro, mensagem }`, sem `campos` e sem repetir o que foi enviado.

| Situação | Resposta | Mensagem |
|---|---|---|
| Corpo válido, DEC com pedido gerado: gravado, ou mesmo estado | 204 sem corpo, com `no-store` e `nosniff` | — |
| JSON válido fora do formato: chave a mais ou faltando, fase ou situação fora da lista, número fora da faixa, prontas maior que total | 422 `nao_processavel` | "Andamento fora do formato. Envie só fase, tarefasProntas, tarefasTotal e status, com fase e status da lista e 0 ≤ tarefasProntas ≤ tarefasTotal ≤ 999." |
| DEC inexistente, sem `pedido_gerado` de pessoa, ou com o vínculo DEC ↔ demanda diferente; id fora do formato | 404 `nao_encontrado` | a de sempre, igual nos casos |
| DEC substituído por um aprovado mais novo da demanda | 409 `conflito` | "O pacote deste pedido foi substituído por um aprovado mais novo. O andamento não foi registrado: envie o do pedido novo." |
| Situação que contradiz o status final da demanda (tabela abaixo) | 409 `conflito` | "A demanda deste pedido já está em um status final e não aceita este andamento. Nada foi registrado." |
| O DEC já tem 60 gravações na última hora | 429 `limite_excedido` | "Limite de 60 registros de andamento por hora deste pedido atingido. Tente de novo mais tarde." |
| O `/construir` já tem 600 gravações na última hora, somando todos os DEC | 429 `limite_excedido` | "Limite de 600 registros de andamento por hora do /construir atingido. Tente de novo mais tarde." |
| Prazo esgotado (prazo total de 8 s, `statement_timeout` de 5 s, `lock_timeout` de 2 s) | 503 `indisponivel`, nada gravado | a de sempre ([cap. 02](02-acesso-e-seguranca.md#atores-de-integração-030)) |
| JSON malformado, `content-type` errado, corpo acima de 512 KB, cookie junto com o Bearer | 400, 415, 413, 400 | as de sempre |
| Token inválido ou revogado; ator sem a ação | 401; 403 | as de sempre |

O 422 é igual para DEC existente e inexistente, porque sai em `rota()` antes de qualquer consulta (opção `corpoInvalido`
de `src/lib/rota.ts`, ADR-33). O 409 de status final não diz qual é o status, e o de DEC substituído não cita o
substituto. A linha `requisicao` do log da rota não leva o DEC, o corpo nem o prefixo: a `rota` é o padrão
`/api/pedidos-construcao/[decId]/andamento`, e o ator sai só pelo `atorTipo`, com o `status` e o `codigoErro`.

Pelo contrato do `/construir` (spec do pedido, seção 3.5), o envio trata o 204 como `enviado`; o 404 como
`fora_do_orquestrador` e o 409 e o 422 como `recusado`, e nos três não tenta de novo até o estado do pedido mudar; o
429 e o 503 como `erro`, e tenta de novo na volta seguinte; o 401 e o 403 param a volta inteira. Com o Orquestrador
fora do ar, o `/construir` continua construindo.

### Ordem das conferências

Antes do banco, em `rota()`: o id pela regex do DEC (404), o tipo de conteúdo (415), `resolverAtor` (401),
`autorizar(ator, 'registrar_andamento')` (403), a leitura do JSON (400, 413) e o `corpoAndamentoSchema` (422).

O serviço, `registrarAndamento` (`registrar.ts`), chama `autorizar` de novo na primeira linha. Depois abre uma
transação com o orçamento `padrao` das integrações (`executarComOrcamento`), sem receber transação de quem chama. Ali,
nesta ordem:

1. trava o pedido (`travarPedido`, chave `pedido:<DEC-id>`), a mesma trava da entrega e do recebimento;
2. confere o `pedido_gerado` gravado por **pessoa** (`pedidoGeradoPorPessoa`) e que a demanda desse evento é a demanda
   do próprio DEC (`pacote_decisao.demanda_id`). Faltou um dos dois: 404, sem travar a demanda nem gravar. É aqui que
   cai o pedido escrito direto (A3);
3. trava a demanda (`travarDemanda`). Tudo o que decide daqui em diante é lido depois das travas, sempre na ordem
   pedido → demanda → limite;
4. lê o último andamento da demanda. Mesmo estado: 204 e nada mais, sem linha nova, sem evento, sem mudar a data e sem
   contar no limite. Vem antes dos 409, então repetir o último envio nunca dá erro;
5. o DEC não é o aprovado vigente da demanda: 409 (DEC substituído);
6. `decidirPorStatus`, com o status e o tipo da demanda lidos sob a trava: recusa dá 409 (status final);
7. `conferirLimiteDeAndamento`: 429;
8. grava a linha nova em `andamento_construcao`, com a hora do relógio do sistema e o prefixo do token;
9. se a tabela de transições manda, muda o status (`mudarStatusPeloConstruir`) e grava `status_alterado` com o ator
   `construir`. Sem transição, a demanda não é tocada, nem o `atualizadaEm` dela;
10. se é mudança de marco, grava `andamento_registrado`.

Nada enfileira job, dispara agente nem manda aviso.

### Transições pelo andamento

`decidirPorStatus` (`regras.ts`) e `AUTOMATICAS_DO_CONSTRUIR` e `CONTRADIZ_STATUS_FINAL` (`transicoes.ts`). Status da
demanda × situação enviada, para o DEC vigente e estado novo; "grava" sem mais nada quer dizer que o status não muda:

| Status da demanda | `em_construcao` | `construido` | `cancelado` |
|---|---|---|---|
| `nova`, `em_analise`, `aguardando_informacao`, `pronta_para_decisao` | grava | grava | grava |
| `aprovada` | grava e vai para `em_construcao` (tipo `estudo`: só grava) | grava | grava |
| `em_construcao` | grava | grava, e a Próxima ação pede a uma pessoa que marque Entregue | grava e vai para `devolvida` |
| `devolvida` | grava | grava | grava |
| `entregue` | 409 | grava | 409 |
| `encerrada` | 409 | 409 | grava |

- Só duas transições automáticas, com origem fixa: `aprovada` → `em_construcao` e `em_construcao` → `devolvida`.
  `entregue` e `encerrada` nunca são destino (A1).
- `construido` nunca muda o status. A demanda fica em `em_construcao`, e a Próxima ação da T05 diz "Construção
  concluída: confira e marque como Entregue." ([cap. 08](08-painel.md#demanda-t05-rf-08-a-rf-10)).
- A demanda do tipo `estudo` não vai para `em_construcao`, como na mudança manual.
- A transição grava `status_alterado` com o ator "/construir (prefixo …)", e não "Sistema". As transições manuais
  (`MANUAIS`) e as automáticas do ator `sistema` não mudaram ([cap. 03](03-demandas.md#rf-07-status-e-transições)).
- Andamento errado se corrige pela mudança manual de status, como sempre. A mudança manual não apaga o andamento
  gravado.

### O que fica gravado (`andamento_construcao`)

Tabela nova da 0.4.0 (migrations `0008` e `0009`, [cap. 01](01-arquitetura.md#banco)), só de inclusão para o papel da
aplicação. Uma linha por gravação aceita; o último andamento da demanda é a linha de maior `id`.

| Coluna | Conteúdo |
|---|---|
| `demanda_id` | a demanda conferida no passo 2, nunca tirada do corpo nem da URL |
| `dec_id` | o DEC da URL |
| `fase`, `tarefas_prontas`, `tarefas_total`, `status_construcao` | o corpo, com os mesmos CHECK do Zod |
| `ator_token_prefixo` | o prefixo do token que gravou. Atribui também a gravação que não gera evento. Não sai em nenhuma vista, API nem tela |
| `gravado_em` | a hora do relógio do sistema. É o `atualizadoEm` das leituras |

O andamento não tem dado pessoal: só enumerações, inteiros, ids e datas. Segue a retenção da demanda, sem expurgo
próprio nesta versão. Uma linha lida fora do esquema vale como "sem andamento" (`lerAndamento`, `regras.ts`): a fila,
o detalhe e a API não quebram.

### Evento `andamento_registrado`

Gravado só na mudança de marco (A2), com o ator de integração `construir` e o prefixo do token, `entidade =
'pacote_decisao'` e `entidadeId` = o DEC. O `depois` tem exatamente `fase`, `tarefasProntas`, `tarefasTotal` e
`statusConstrucao`; o `antes` tem o mesmo do andamento anterior, ou `null` no primeiro. Um pedido de 20 tarefas que
passa pelas seis fases gera no máximo 7 eventos. Os textos no histórico estão no
[cap. 03](03-demandas.md#rf-21-histórico).

### Limite (`conferirLimiteDeAndamento`)

Próprio do `construir` e só para esta ação: **60 gravações por DEC e 600 no total**, na janela móvel de 60 minutos
contada pelo relógio do sistema sobre as linhas de `andamento_construcao` (`LIMITE_ANDAMENTO`, `limites.ts`). Só
gravação conta: o envio no mesmo estado não grava e não conta. As gravações esperam umas pelas outras na trava
consultiva `limite:andamento:integracao:construir`, para o total de 600 ser exato. Os limites de pessoa, agentes e
Awave não mudaram. Os números são decisão de Fabiano (P-03), e mudar pede um pedido.

### Quem lê o andamento

| Quem | Onde | O que recebe |
|---|---|---|
| Pessoa | `GET /api/demandas/:id`, T05 e T03 | `andamento` com `decId`, `fase`, `tarefasProntas`, `tarefasTotal`, `statusConstrucao` e `atualizadoEm`, ou `null`; o selo da fila e a seção do detalhe ([cap. 08](08-painel.md#fila-t03-rf-05-a-rf-07)) |
| Awave | `GET /api/demandas/:id` e o 201 de `POST /api/demandas`, só da demanda que ele criou | `andamento` com `fase`, `tarefasProntas`, `tarefasTotal` e `atualizadoEm`, ou `null`; sem `statusConstrucao` nem `decId` ([cap. 03](03-demandas.md#demanda-aberta-pelo-awave-030)) |
| Agentes, `sistema`, `GET /api/demandas` | — | nada: a chave não existe na vista mínima nem na listagem |

O andamento lido é sempre o último da demanda, de qualquer DEC. A leitura não olha se esse DEC foi substituído: o
detalhe avisa, a fila e o Awave não (EXP-01, ponto de produto aberto, [CHANGELOG](../../CHANGELOG.md)).

### Se o envio der problema

- **Envio com defeito ou em excesso:** troque `"andamento_ligado"` para `false` em `pedidos/config/orquestrador.json`.
  O Orquestrador não muda, e o último andamento gravado continua na tela.
- **Status errado:** a pessoa corrige pela mudança manual de status.
- **Token vazado:** revogue pelo prefixo ([tokens-de-integracao.md](../operacao/tokens-de-integracao.md)). A coluna
  `ator_token_prefixo` mostra o que esse token gravou, também sem evento.

## RF-23. Pacotes por status de decisão

`GET /api/pacotes-decisao?statusDecisao=<valor>` (pessoa ou qualquer agente), com `limit` (1 a 100, padrão 20) e
`offset`. `statusDecisao` aceita `pendente`, `aprovada`, `devolvida` e `arquivada`; sem ele, lista todos. `pendente` é
derivado: é o DEC sem linha em `decisao`, inclusive o que tem só uma das duas aprovações. Desde a 0.1.13, `aprovada`
traz também o DEC substituído, com `substituido: true` e `substituidoPor` com o id do aprovado vigente; não há filtro
nem status próprio para ele ([cap. 04](04-versoes-e-decisao.md#substituição-do-dec-aprovado)). Quem busca o DEC que
gera filtra `substituido: false`.

Desde a 0.3.1 (A-1 da revisão do pedido 0019), a rota usa `listarPacotesPara` (`src/modules/pacotes-decisao/consultas.ts`):

- pessoa vê todos os DEC;
- agente e `sistema` não veem o DEC de demanda do Awave que nenhuma pessoa confirmou, nem nos itens nem no `total`
  (`demandaVisivelAoAgente`, [cap. 03](03-demandas.md#demanda-aberta-pelo-awave-030));
- o DEC sem demanda também não entra para eles (falha fechada);
- integração recebe 403 antes de qualquer leitura.
