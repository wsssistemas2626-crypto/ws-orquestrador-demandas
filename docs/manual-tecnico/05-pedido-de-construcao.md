# 05. Pedido de Construção

| Campo | Valor |
|---|---|
| Atualizado em | 12/11/2026 (0.3.0: conferência e montagem em `conferir.ts`, a mesma da geração e da entrega; seção "Entrega ao /construir", com as três rotas novas; texto da seção do pedido e "Recebido pelo /construir em …" na T11); 10/11/2026 (0.1.13: só o DEC aprovado mais novo gera, 409 do substituído, linha 6 da orientação e T11 do substituído, no RF-22; substituído marcado no RF-23); 04/11/2026 (0.1.12: recusa com o nome do solicitante, confirmação sem dado pessoal no corpo e na T11, `aprovadoPor` com o papel, no RF-22); 04/11/2026 (0.1.11: detector de e-mail linear e com acento no usuário, no passo de C-28 do RF-22); 03/11/2026 (0.1.6: trava da demanda e recusa em status final na geração) |
| Dono | `documentacao-tecnica` (sistema: Fabiano) |
| Cobre | RF-22, RF-23; RNF-15; RF-12 a RF-15 do pedido 0016 (0.3.0) |
| Fontes no código | `src/modules/pedido-construcao/` (`gerar.ts`, `conferir.ts`, `entregar.ts`, `receber.ts`, `pendentes.ts`, `montar.ts`, `conteudo.ts`, `serializar.ts`, `schemas.ts`), `src/modules/dados-pessoais/detectores.ts`, `src/modules/dados-pessoais/minimizar.ts` (`temNome`), `src/modules/pacotes-decisao/criar.ts` (`descricaoSemRotulos`), `src/modules/pacotes-decisao/substituido.ts`, `src/vendor/construir/pedido.mjs`, `src/app/api/pacotes-decisao/[decId]/pedido-construcao/route.ts`, `src/app/(painel)/pacotes-decisao/[decId]/` (`SecaoPedido.tsx`, `acoes-pedido.ts`), `src/components/dados-do-pedido.ts`, `src/components/dados-da-decisao.ts` (`linhaDoRecebimento`), `src/app/api/pacotes-decisao/route.ts`, `src/app/api/pedidos-construcao/` |

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
grava à mão em `pedidos/`. Nos dois caminhos, o sistema não chama o `/construir` (é o `/construir` que chama) e não
recebe o andamento da construção: os status `em_construcao`, `entregue` e `devolvida` mudam à mão.

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

`entregarPedido` (`entregar.ts`), numa transação com o tempo limite da entrega (10 s):

1. sem `pedido_gerado` por pessoa para esse DEC → 404, igual ao do DEC que não existe;
2. `conferirEMontarPedido`: as mesmas conferências e a mesma montagem da geração, passos 3 a 11 do
   [RF-22](#rf-22-gerar-o-pedido), **sem** pedir de novo a confirmação sem dado pessoal (ela foi dada na geração). As
   recusas são as da geração (404, 409 e 422, com as mesmas mensagens), sem evento. O nome conferido é o atual do
   solicitante, então um solicitante renomeado depois da geração pode fazer a entrega ser recusada;
3. o SHA-256 dos bytes é calculado pelo servidor. Se esse hash ainda não foi entregue para o DEC, grava
   `pedido_entregue` com `{ sha256 }`. Repetir a entrega dos mesmos bytes não grava de novo (um evento por hash);
4. 200, `content-type: application/json; charset=utf-8`, com o corpo **byte a byte igual** ao da geração (CA-22.2).

A rota é `POST`, e não `GET`, porque grava evento. Ela não tem corpo: o `/construir` manda só o Bearer, sem `Origin` e
sem `content-type`.

### Recebimento (`confirmar_recebimento_pedido`)

`receberPedido` (`receber.ts`), com o corpo `{ "sha256": "<64 hexadecimais minúsculos>" }`, numa transação sob uma
trava por DEC:

| Situação | Resposta |
|---|---|
| `sha256` ausente ou fora do formato, ou chave a mais | 400 `entrada_invalida`, com "Informe o sha256 com 64 caracteres hexadecimais minúsculos." em `campos`, antes de olhar o DEC |
| DEC inexistente ou sem `pedido_gerado` por pessoa | 404 |
| DEC sem nenhuma entrega | 409 "Este pedido ainda não foi entregue ao /construir. Peça a entrega antes de confirmar o recebimento." |
| hash diferente de todo `pedido_entregue` do DEC | 409 "O SHA-256 enviado não confere com o pedido entregue. Busque o pedido de novo.", sem evento |
| hash igual ao de uma entrega | 204 e `pedido_recebido` com o hash do servidor |
| o mesmo recebimento de novo | 204, sem evento novo |

O recebimento compara com os hashes que a entrega gravou e não remonta o pedido. Por isso, um DEC substituído,
desatualizado ou com a demanda em status final **depois** da entrega ainda confirma o recebimento.

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

## RF-23. Pacotes por status de decisão

`GET /api/pacotes-decisao?statusDecisao=<valor>` (pessoa ou qualquer agente), com `limit` (1 a 100, padrão 20) e
`offset`. `statusDecisao` aceita `pendente`, `aprovada`, `devolvida` e `arquivada`; sem ele, lista todos. `pendente` é
derivado: é o DEC sem linha em `decisao`, inclusive o que tem só uma das duas aprovações. Desde a 0.1.13, `aprovada`
traz também o DEC substituído, com `substituido: true` e `substituidoPor` com o id do aprovado vigente; não há filtro
nem status próprio para ele ([cap. 04](04-versoes-e-decisao.md#substituição-do-dec-aprovado)). Quem busca o DEC que
gera filtra `substituido: false`.
