# 05. Pedido de Construção

| Campo | Valor |
|---|---|
| Atualizado em | 04/11/2026 (0.1.12: recusa com o nome do solicitante, confirmação sem dado pessoal no corpo e na T11, `aprovadoPor` com o papel, no RF-22); 04/11/2026 (0.1.11: detector de e-mail linear e com acento no usuário, no passo de C-28 do RF-22); 03/11/2026 (0.1.6: trava da demanda e recusa em status final na geração) |
| Dono | `documentacao-tecnica` (sistema: Fabiano) |
| Cobre | RF-22, RF-23; RNF-15 |
| Fontes no código | `src/modules/pedido-construcao/` (`gerar.ts`, `montar.ts`, `conteudo.ts`, `serializar.ts`, `schemas.ts`), `src/modules/dados-pessoais/detectores.ts`, `src/modules/dados-pessoais/minimizar.ts` (`temNome`), `src/modules/pacotes-decisao/criar.ts` (`descricaoSemRotulos`), `src/vendor/construir/pedido.mjs`, `src/app/api/pacotes-decisao/[decId]/pedido-construcao/route.ts`, `src/app/(painel)/pacotes-decisao/[decId]/` (`SecaoPedido.tsx`, `acoes-pedido.ts`), `src/components/dados-do-pedido.ts`, `src/app/api/pacotes-decisao/route.ts` |

## RF-22. Gerar o pedido

`POST /api/pacotes-decisao/:decId/pedido-construcao`, só pessoa com 2FA, com o corpo
`{ "confirmaSemDadoPessoal": true }` (desde a 0.1.12, D3 do 0013). É `POST`, e não `GET`, porque a geração grava
evento; `GET` nessa rota responde 405. No painel, a tela de decisão (`/pacotes-decisao/[decId]`) mostra a seção do
pedido, com a caixa de confirmação, gerar, baixar e copiar, só para DEC aprovado e não desatualizado
([Na T11](#na-t11)).

O corpo passa pelo `confirmacaoDoPedidoSchema` (`schemas.ts`), o mesmo na rota e na Server Action
`gerarPedidoNoPainel`. Tipo errado (`"true"`, `1`), JSON inválido ou `POST` sem corpo → 400 `entrada_invalida`, como em
toda rota com corpo. Chave a mais é descartada (C-11). A falta do campo, ou `false`, não é erro de formato: quem recusa
é o `gerarPedido` (passo 2).

Ordem das conferências (`gerar.ts`). Do passo 3 em diante, numa transação. Recusado em qualquer passo, nada é entregue
e nenhum evento é gravado:

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
6. DEC desatualizado, lido sob a trava → 409 "o pacote está desatualizado: a demanda tem ESP ou RSK mais nova que a
   citada." (A-03 da 08);
7. demanda do tipo `estudo`, pela cópia gravada no DEC → 422 "demanda do tipo estudo não gera Pedido de Construção";
8. montagem só com a ESP e o RSK citados no DEC;
9. dado pessoal no pedido montado → **um 422 só**, "O pedido não passou na validação do /construir. Nada foi
   entregue.", com `erros` no formato `<caminho>: <tipo>`, sem o valor. Primeiro vem a lista do C-28, depois a do nome:
   - **C-28:** e-mail, telefone ou CPF em qualquer campo. CNPJ não bloqueia o pedido. A busca é
     `encontrarDadosPessoais`, com os `DETECTORES` de `detectores.ts`. Desde a 0.1.11 (M-a e B-2 da revisão do 0011),
     o detector de e-mail tem custo linear (100 mil caracteres abaixo de 200 ms; antes, cerca de 20 s com o event loop
     travado) e aceita letra com acento no usuário. No reteste da `seguranca-aplicacao`, com 300 mil textos sorteados,
     nenhum texto que a 0.1.10 bloqueia deixou de ser bloqueado ([cap. 06](06-agentes-de-ia.md#detector-de-e-mail));
   - **nome do solicitante** (desde a 0.1.12, D1 do 0013): o tipo é `nome`. Ver [Nome do solicitante](#nome-do-solicitante);
10. `validarPedido` da cópia em `src/vendor/construir/pedido.mjs` (a mesma regra do `/construir`, conferida por SHA-256
    em teste) → 422 com a mesma mensagem e os `erros` dele;
11. evento `pedido_gerado` e a resposta. Desde a 0.1.12, o evento grava `depois: { "confirmaSemDadoPessoal": true }`,
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
  enquanto a geração é aceita (o nome conferido no passo 9 é o atual; ver abaixo). O mesmo DEC gerado na 0.1.11 e na
  0.1.12 dá arquivos diferentes, por causa do `aprovadoPor`.

O pedido é **baixado e copiado à mão** para `pedidos/` da estruturaAutonoma. O sistema não envia nada ao `/construir`
e não recebe o andamento de volta: os status `em_construcao`, `entregue` e `devolvida` mudam à mão.

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
6. sempre que houver linha de 2 a 5: "Atenção: com este pacote aprovado, outro pacote desta demanda não pode ser
   aprovado nesta versão. Fale com o CTO antes de refazer o texto.";
7. nenhuma linha de 2 a 5 valeu (por exemplo, erro do `validarPedido` fora desses caminhos): "Corrija criando uma
   versão nova da ESP e um pacote novo.".

Nenhuma linha traz valor do pedido. A correção depende sempre de um DEC novo: título e descrição do pedido vêm da cópia
gravada no DEC, então editar a demanda só muda o pedido de um DEC criado depois; ESP ou RSK novos deixam o DEC
desatualizado (409, passo 6). E, pela A-02 ([cap. 04](04-versoes-e-decisao.md#rf-13-decisão)), com um DEC aprovado
nenhum outro DEC da mesma demanda é aprovado (409 "outro pacote desta demanda já está aprovado."). Na 0.1.12, a recusa
num DEC aprovado não tem saída dentro da demanda: a saída é encerrar a demanda e abrir outra com o texto limpo. A
mudança da A-02 (o DEC aprovado mais novo substitui o anterior, opção (b) decidida por Fabiano em 04/11) está no
pedido `DEC-DEM-20261104-0014-v1` (E5 do 0013) e não entrou nesta versão.

### Na T11

A seção "Pedido de Construção" (`SecaoPedido.tsx`, textos em `TEXTOS_PEDIDO`, `dados-do-pedido.ts`) mostra, nesta
ordem, o texto da seção, o aviso de C-28, a caixa de confirmação e o botão "Gerar Pedido de Construção":

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

Os textos do aviso, da caixa, do erro da caixa e da orientação foram escritos na triagem do 0013 e esperam a revisão da
`ux-ui-design` ([cap. 08](08-painel.md#pendências-de-interface-conhecidas)).

## RF-23. Pacotes por status de decisão

`GET /api/pacotes-decisao?statusDecisao=<valor>` (pessoa ou qualquer agente), com `limit` (1 a 100, padrão 20) e
`offset`. `statusDecisao` aceita `pendente`, `aprovada`, `devolvida` e `arquivada`; sem ele, lista todos. `pendente` é
derivado: é o DEC sem linha em `decisao`, inclusive o que tem só uma das duas aprovações.
