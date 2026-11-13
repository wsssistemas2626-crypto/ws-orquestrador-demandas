---
pedido: DEC-DEM-20261111-0018-v1
etapa: 03-interface
agente: ux-ui-design
leu: [pedido.json, 01-analista-requisitos.md, padrao-tecnico.md, contrato-passagem.md, docs/construcao/DEC-DEM-20261111-0017-v1/03-ux-ui-design.md (formato e seções 2, 7 a 9), src/app/(painel)/pacotes-decisao/[decId]/page.tsx, src/app/(painel)/pacotes-decisao/[decId]/FormularioDecisao.tsx (dicas e ids), src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts (asserções das dicas), src/components/dados-da-decisao.ts, src/components/dados-do-pedido.ts, src/components/dados-das-etapas.ts, src/components/dados-do-andamento.ts (textos), src/components/rotulos.ts (ROTULO_STATUS, selos, textoDoEvento), src/components/Alerta.tsx, src/modules/pacotes-decisao/decidir.ts, src/modules/pacotes-decisao/substituido.ts, src/modules/pedido-construcao/conferir.ts, src/modules/demandas/transicoes.ts, src/modules/demandas/consultas.ts (PacoteResumo)]
status: pronto
proximo: seguranca-aplicacao
devolvido_para: null
---
## Entrega

### 0. Escopo e regra de leitura

Interface da 0.4.1 do WS Orquestrador de Demandas. A maior parte do pedido não tem tela (rota de situação, D1, teste
instável, plano da consulta, piso de asserções). O que chega ao painel:

- **T11 Decisão do pacote:** os três avisos novos (RF-06), a revisão dos textos do substituído (RF-05), a dica do
  Arquivar e o alerta de sucesso depois de arquivar, que mudam com o S-04 (RF-03), o 409 do S-01 e o 409 do substituído
  no gerar, e a linha 6 da orientação do 422 (RF-05).
- **T05 Demanda:** a frase do histórico `pacote_decisao_substituido` (RF-05) e o efeito do S-04 na barra de etapas e
  na Próxima ação (seção 6, recomendação).
- **API sem texto novo:** a rota de situação (RF-01) responde só o enum; 403, 404 e 503 usam as mensagens de hoje.

Regras que valem em todo o documento:

- RF-NN e CA-NN.n são os do `01-analista-requisitos.md` deste pedido. "Pendência 1" é a Pendência 1 dessa entrega
  (destino da demanda ao arquivar o mais novo com o vigente desatualizado).
- Base visual: a 0.4.0 na `main`. **Nenhum token, cor, componente do design system ou variação nova.** Pontos de quebra
  os de hoje (celular abaixo de 768 px, computador a partir de 1200 px); larguras de teste 1280 × 720 e 390 × 844;
  reflow em 320 px.
- Texto que **não muda** é citado pela constante do código. Texto **novo ou alterado** está por inteiro onde aparece e,
  de novo, na seção 8, que é a fonte para o CA-05.1.
- `<v>` é o id do aprovado vigente da demanda; `<p>` é o id do DEC mais novo pendente; `<id>` é o id do substituto
  (`substituidoPor`). Todos só no formato de DEC (`RE_ID_DEC`); nenhum texto leva nome de pessoa (C-30).
- Termo de tela para a vigência: **"em vigor"** (já usado no 409 do S-01). A palavra "situação" não aparece em texto de
  tela sobre vigência: na T05 ela já é a situação da construção (Pendência 3 do 01).
- Exemplos com dados fictícios: `DEC-DEM-20991231-0001-v1` (v1) e `DEC-DEM-20991231-0001-v2` (v2).

### 1. Mapa: RF com interface → fluxo → tela

| RF | Interface | Fluxo | Tela / seção |
|---|---|---|---|
| RF-06 (a) | aviso no DEC pendente com aprovado vigente | F1 | 4.2, 4.3 |
| RF-06 (b) | aviso no aprovado vigente com DEC mais novo pendente | F1 | 4.2, 4.4 |
| RF-06 (c) | aviso no DEC `cto` pendente com vigente `cto_e_administradora` | F2 | 4.2, 4.5 |
| RF-03 | dica do Arquivar e alerta de sucesso depois de arquivar; efeito na T05 | F3 | 4.6, 4.7, 6 |
| RF-05 | selo, aviso e link do substituído; 409 do substituído; 409 do S-01; linha 6 da orientação; frase do histórico | F1, F2, F4 | 4.8, 5, 7 |
| RF-01 | sem tela; enum na API, mensagens de erro de hoje | — | 7 |
| RF-02, RF-04, RF-07 a RF-10 | sem interface (D1 usa o 422 de hoje, sem texto novo) | — | — |

### 2. Design system: o que esta versão usa

| Uso nesta versão | O que já existe |
|---|---|
| Avisos (a), (b) e (c) | `Alerta` tipo `atencao`, estático (sem `role="alert"`), `flex flex-col items-start gap-2`, com `<p>` e um link solto `CLASSE_LINK_SOLTO`, igual ao aviso do substituído de hoje |
| Link do aviso | `next/link` com `CLASSE_LINK_SOLTO` (44 px de alvo abaixo de 768 px); href só por constante de rota mais id que casa `RE_ID_DEC` ou `RE_ID_DEMANDA` (CV-19) |
| Dica do Arquivar | o `<p id="decisao-consequencia-arquivar">` de hoje, `CLASSE_DA_NOTA`, ligado ao botão por `aria-describedby`; só o texto muda |
| Sucesso depois de arquivar | `AlertaDeResultado` de hoje; só o texto muda |
| 409 do S-01 e do substituído | o alerta da 2.8 ("Não foi possível concluir: " + mensagem do servidor) de hoje |
| Selo Substituído | `SELO_SUBSTITUIDO` (cinza), sem mudança |
| Histórico | `LinhaDoTempo` e `textoDoEvento`, só texto |

### 3. Fluxos

#### F1. Trocar o pacote em vigor por um mais novo (RF-06 a e b; RF-05)

1. A demanda tem o v1 aprovado e em vigor. Alguém cria o v2 (pendente).
2. Quem abre a T11 do **v1** vê o aviso (b): há um pacote mais novo pendente, `<p>`, com link para ele.
3. Quem abre a T11 do **v2** vê o aviso (a): já existe um pacote em vigor, `<v>`, e o que acontece se o v2 for aprovado,
   com link para o v1.
4. A pessoa aprova o v2 (nível `cto`: uma aprovação; nível `cto_e_administradora`: duas). A primeira aprovação da dupla
   não troca nada: o aviso (a) continua até a segunda.
5. Com a aprovação completa, o v1 fica com o selo "Substituído" e o aviso do substituído com o link "Abrir o pacote
   `<v2>`"; o histórico grava a frase da 4.8. O v2 mostra a seção "Pedido de Construção". Os avisos (a) e (b) somem.
6. Caminho de erro: se a pessoa tentar gerar o pedido do v1 com a página aberta de antes (corrida), o servidor responde
   o 409 do substituído (seção 5).

#### F2. DEC só do CTO quando o vigente exigiu dupla aprovação (RF-06 c; RF-05)

1. O v1 `cto_e_administradora` está em vigor; o v2 `cto` está pendente.
2. A T11 do v2 mostra o aviso (c), com o link "Criar pacote novo". O aviso (a) não aparece. O botão "Aprovar a opção X"
   continua como hoje (o aviso só informa; RF-06).
3. Se o CTO aprovar mesmo assim, o servidor responde 409 com a mensagem do S-01 (seção 5), no alerta da 2.8. Nada é
   gravado.
4. Saídas: Devolver (a demanda vai para Em análise, como hoje), Arquivar (dica da 4.6: a demanda vai para Aprovada e o
   v1 continua em vigor) ou criar um pacote novo de dupla aprovação.
5. Na T11 do v1, nenhum aviso (b): o v2 não pode substituí-lo.

#### F3. Arquivar o mais novo com um aprovado em vigor (RF-03, S-04)

1. O v1 está aprovado; o v2 está pendente; a demanda está numa origem do arquivamento (`nova`, `em_analise`,
   `aguardando_informacao`, `pronta_para_decisao`).
2. Antes de agir, a dica sob o botão Arquivar diz o destino certo (4.6): Aprovada com o v1 atualizado; Em análise com o
   v1 desatualizado (recomendação da Pendência 1); Encerrada sem aprovado; "continua em …" quando o status não muda.
3. A pessoa clica em Arquivar, confirma no diálogo de hoje e volta à T11 com o alerta de sucesso (4.7).
4. Com destino Aprovada, a T05 mostra a Próxima ação da linha 10 (gerar o pedido do v1) e a barra de etapas com o v1 na
   etapa 4 (seção 6). O v1 gera o pedido normalmente.

#### F4. Pedido recusado na validação (RF-05, linha 6)

1. Na T11 do vigente, "Gerar Pedido de Construção" devolve o 422 com a lista de erros.
2. A orientação mostra a linha do nome (se houver), as linhas 2 a 5 por campo e a linha 6, que muda pelo nível do pacote
   (seção 5): o pacote novo precisa ter o mesmo nível de aprovação, senão o S-01 o recusa.

### 4. T11 Decisão do pacote

#### 4.1 O que muda

1. Três avisos novos na faixa de alertas do topo (4.2 a 4.5).
2. A dica do Arquivar escolhe o texto pelo destino (4.6).
3. O alerta de sucesso depois de arquivar diz o status em que a demanda ficou (4.7).
4. O texto do aviso do substituído e o nome do link (4.8).
5. As mensagens do servidor do S-01 e do substituído e a linha 6 da orientação (seção 5).

Nada sai do que a T11 mostra hoje; a ordem do DOM continua a da 0.2.0.

#### 4.2 Condições dos avisos (a regra é da tela; quem decide é o servidor)

Todos os três **só** aparecem com a demanda **fora** de status final (`entregue`, `encerrada`): em status final não há
decisão (M-08) e o pedido não é gerado, então o aviso seria ruído. "Vigente" é o aprovado não substituído da demanda (a
mesma regra de `vigenteDe` da T05). "Mais novo" é `d.pacotesDecisao[0]`.

| Aviso | Aparece quando, todas juntas | Cita | Link |
|---|---|---|---|
| (a) | o DEC aberto está pendente (sem `decisao`; inclui a dupla com uma aprovação); é o mais novo da demanda; **não** está desatualizado; existe vigente; **não** é o caso (c) | `<v>` | "Abrir o pacote `<v>`" → `/pacotes-decisao/<v>` |
| (b) | o DEC aberto é o vigente; o mais novo da demanda é outro DEC, pendente e **não** desatualizado; **não** é o caso em que o pendente é `cto` e o aberto é `cto_e_administradora` | `<p>` | "Abrir o pacote `<p>`" → `/pacotes-decisao/<p>` |
| (c) | o DEC aberto está pendente, é o mais novo, **não** está desatualizado, é de nível `cto`, e o vigente é `cto_e_administradora` | `<v>` | "Criar pacote novo" → `/demandas/<demandaId>/pacotes-decisao/novo` |

Razões dos filtros a mais (registradas em Decisões): o DEC desatualizado já tem o alerta de erro dizendo que não pode
ser aprovado; o DEC pendente que não é o mais novo não pode ser decidido (A-01); no caso S-01 o pendente não substitui o
vigente, e o aviso (b) diria algo falso. Em nenhum caso (a) e (c) aparecem juntos; (b) nunca aparece junto de (a) ou (c),
porque um é do aprovado e os outros do pendente.

Ordem na faixa de alertas: resultado de envio, lembrete (P1-d), substituído, **(b)**, **(a) ou (c)**, desatualizado,
rascunho de agente. O (b) pode aparecer junto do lembrete (v1 aprovado com a demanda em Pronta para decisão): os dois
são verdadeiros.

Textos (por inteiro na seção 8):

- **(a):** "Esta demanda já tem um pacote aprovado em vigor: `<v>`. Quando a aprovação deste pacote ficar completa, ele
  passa a valer no lugar de `<v>`, e um pedido já gerado de `<v>` deixa de valer."
- **(b):** "Há um pacote mais novo pendente nesta demanda: `<p>`. Quando a aprovação dele ficar completa, ele passa a
  valer no lugar deste, e um pedido já gerado deste pacote deixa de valer."
- **(c):** "A aprovação deste pacote será recusada: o pacote em vigor nesta demanda, `<v>`, exigiu a aprovação do CTO e
  da administradora, e um pacote só do CTO não pode substituí-lo. Você pode devolver ou arquivar este pacote. Para
  substituir `<v>`, crie um pacote novo com aprovação do CTO e da administradora."

#### 4.3 Wireframe, computador (1280 × 720), aviso (a) no v2 de dupla aprovação, com a do CTO registrada

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ DEC-DEM-20991231-0001-v2  [Decisão pendente]                                             │
│ Decisão: Relatório semanal fictício                                                      │
│ Demanda DEM-20991231-0001 · Nível de aprovação: CTO e administradora · Criado em …       │
│ Repositório destino: …                                                                   │
│ Cita: ESP-… (Ver) · RSK-… (Ver)                                                          │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│ ▌ Esta demanda já tem um pacote aprovado em vigor: DEC-DEM-20991231-0001-v1. Quando a    │  Alerta atencao
│ ▌ aprovação deste pacote ficar completa, ele passa a valer no lugar de                   │
│ ▌ DEC-DEM-20991231-0001-v1, e um pedido já gerado de DEC-DEM-20991231-0001-v1 deixa de   │
│ ▌ valer.                                                                                 │
│ ▌ Abrir o pacote DEC-DEM-20991231-0001-v1                                                │  link solto
├───────────────────────────────────────────────────────┬──────────────────────────────────┤
│ Aprovações                                            │ Registrar decisão                │
│  CTO: … aprovou a opção A em …                        │  (formulário da administradora,  │
│  Administradora: pendente.                            │   como hoje)                     │
│ Resumo executivo · Recomendação · Revisão …           │  Devolver: a demanda volta para  │
│                                                       │  Em análise.                     │
│                                                       │  Arquivar: a demanda vai para    │
│                                                       │  Aprovada, e DEC-…-v1 continua   │
│                                                       │  em vigor.                       │
│                                                       │  [Aprovar a opção A] [Devolver]  │
│                                                       │  [Arquivar]                      │
└───────────────────────────────────────────────────────┴──────────────────────────────────┘
```

#### 4.4 Wireframe, celular (390 × 844), aviso (b) no v1

```
┌──────────────────────────────────────┐
│ ‹ Voltar para a demanda              │
│ DEC-DEM-20991231-0001-v1 [Aprovada]  │
│ Decisão: Relatório semanal fictício  │
│ …                                    │
├──────────────────────────────────────┤
│ ▌ A demanda continua em Pronta para  │  lembrete (de hoje, se valer)
│ ▌ decisão até alguém mudar …         │
│ ▌ Ir para a demanda                  │
├──────────────────────────────────────┤
│ ▌ Há um pacote mais novo pendente    │  Alerta atencao (b)
│ ▌ nesta demanda:                     │
│ ▌ DEC-DEM-20991231-0001-v2. Quando a │
│ ▌ aprovação dele ficar completa, ele │
│ ▌ passa a valer no lugar deste, e um │
│ ▌ pedido já gerado deste pacote      │
│ ▌ deixa de valer.                    │
│ ▌ Abrir o pacote                     │  link solto, 44 px de alvo
│ ▌ DEC-DEM-20991231-0001-v2           │
├──────────────────────────────────────┤
│ Aprovações · Resumo · …              │
│ Registrar decisão: Decisão           │
│ registrada: Aprovada, opção A, …     │
│ Pedido de Construção [Gerar …]       │
└──────────────────────────────────────┘
```

#### 4.5 Wireframe, computador, aviso (c) no v2 `cto`

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ DEC-DEM-20991231-0001-v2  [Decisão pendente]                                             │
│ … Nível de aprovação: Só o CTO …                                                         │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│ ▌ A aprovação deste pacote será recusada: o pacote em vigor nesta demanda,               │  Alerta atencao
│ ▌ DEC-DEM-20991231-0001-v1, exigiu a aprovação do CTO e da administradora, e um pacote   │
│ ▌ só do CTO não pode substituí-lo. Você pode devolver ou arquivar este pacote. Para      │
│ ▌ substituir DEC-DEM-20991231-0001-v1, crie um pacote novo com aprovação do CTO e da     │
│ ▌ administradora.                                                                        │
│ ▌ Criar pacote novo                                                                      │
├───────────────────────────────────────────────────────┬──────────────────────────────────┤
│ Resumo executivo · Recomendação · Revisão …           │ Registrar decisão                │
│                                                       │  [Aprovar a opção A] (como hoje) │
│                                                       │  Arquivar: a demanda vai para    │
│                                                       │  Aprovada, e DEC-…-v1 continua   │
│                                                       │  em vigor.                       │
└───────────────────────────────────────────────────────┴──────────────────────────────────┘
```

Depois de "Aprovar" e confirmar, o alerta de envio da 2.8, com foco nele como hoje: "Não foi possível concluir: o
pacote aprovado em vigor nesta demanda exigiu a aprovação do CTO e da administradora, e um pacote só do CTO não pode
substituí-lo. Devolva ou arquive este pacote, ou crie um pacote novo com aprovação do CTO e da administradora."

#### 4.6 Dica do Arquivar (RF-03; CA-03.6)

Só aparece onde o formulário aparece (DEC pendente e mais novo, como hoje). A tela calcula o destino pela mesma regra
do servidor (RF-03 e a Pendência 1), na ordem abaixo; vale a primeira linha que casar. "Atualizado" é o vigente não
desatualizado.

| # | Condição | Destino | Texto |
|---|---|---|---|
| 1 | status da demanda **fora** das origens (`aprovada`, `em_construcao`, `devolvida`) | não muda | "Arquivar: a demanda continua em `<Status>`." (rótulo de `ROTULO_STATUS`) |
| 2 | nas origens, com vigente atualizado | `aprovada` | "Arquivar: a demanda vai para Aprovada, e `<v>` continua em vigor." |
| 3 | nas origens, com vigente desatualizado, **se a Pendência 1 ficar com Em análise** | `em_analise` | "Arquivar: a demanda vai para Em análise, porque `<v>`, o pacote em vigor, está desatualizado." Com a demanda já em Em análise, vale a linha 1 com "Em análise". |
| 3' | o mesmo caso, **se a Pendência 1 ficar com Encerrada** (padrão provisório) | `encerrada` | o texto da linha 4 |
| 4 | nas origens, sem vigente | `encerrada` | "Arquivar: a demanda vai para Encerrada." (`dicaArquivar` de hoje, sem mudança) |

A linha 1 corrige um texto que hoje já é falso: com a demanda em Aprovada e um DEC novo pendente, arquivar não muda o
status, e a dica diz "vai para Encerrada". A dica do Devolver não muda neste pedido (Pendências).

#### 4.7 Alerta de sucesso depois de arquivar

Escolhido pelo estado gravado depois da ação (o status da demanda lido na página), nunca pela URL:

| Status da demanda depois | Texto |
|---|---|
| `encerrada` | "Pacote arquivado. A demanda foi para Encerrada." (`sucesso.arquivada` de hoje) |
| `aprovada`, com vigente atualizado | "Pacote arquivado. A demanda está em Aprovada, e `<v>` continua em vigor." |
| qualquer outro | "Pacote arquivado. A demanda está em `<Status>`." |

#### 4.8 Substituído (revisão dos textos da 0.1.13)

- Selo: "Substituído", cinza (`SELO_SUBSTITUIDO`), **sem mudança**: curto, diz o fato, e o cinza o separa de Aprovada
  (verde) sem parecer erro.
- Aviso (`TEXTOS_DECISAO.substituido`), **alterado**: "Este pacote foi substituído por `<id>`, aprovado depois dele, e
  não gera mais o Pedido de Construção. Se um pedido deste pacote já foi gerado, não o use. O pedido que vale é o de
  `<id>`."
- Link (`abrirSubstituto`), **alterado**: "Abrir o pacote `<id>`". A mesma função serve aos links de (a) e (b).

#### 4.9 Estados da T11

| Estado | O que aparece |
|---|---|
| Carregando | a navegação de hoje (Server Component, sem esqueleto próprio); durante o envio, o botão acionado com "Registrando…" (`registrando`) e os outros indisponíveis, como hoje; gerar o pedido mostra "Gerando o pedido…" |
| Vazio (sem condição) | nenhum dos três avisos: demanda sem vigente, DEC já decidido que não é o vigente, DEC desatualizado ou demanda em status final (CA-06.4); a dica do Arquivar na linha 4 da 4.6 |
| Erro | id fora do formato ou inexistente: 404 de hoje; falha de leitura: tela de erro de hoje; aprovar no caso (c): 409 do S-01 no alerta de envio (4.5); gerar um pedido de pacote substituído na corrida: 409 do substituído na seção do pedido; 422 de validação: lista e orientação com a linha 6 (seção 5) |
| Sucesso | aviso (a), (b) ou (c) com o texto exato; depois de arquivar, o alerta da 4.7; depois da aprovação completa do v2, o v1 com selo e aviso do substituído (4.8) e o v2 com a seção do pedido |

### 5. Mensagens do servidor que aparecem na T11 (pt-BR, por inteiro)

As de 409 começam em minúscula: a tela acrescenta "Não foi possível concluir: ".

| Constante | Situação | Texto |
|---|---|---|
| `MENSAGENS_DECISAO.nivelMenorQueOVigente` (**alterado**) | aprovar DEC `cto` com vigente `cto_e_administradora` (S-01) | "o pacote aprovado em vigor nesta demanda exigiu a aprovação do CTO e da administradora, e um pacote só do CTO não pode substituí-lo. Devolva ou arquive este pacote, ou crie um pacote novo com aprovação do CTO e da administradora." |
| `MENSAGENS_PEDIDO.substituido` (**alterado**) | gerar ou entregar o pedido de DEC substituído | "o pacote foi substituído por `<id>`, aprovado depois dele. Só o pacote aprovado mais novo gera o Pedido de Construção." |
| `ORIENTACAO.aviso` (linha 6, **alterado**, nível `cto`) | 422 de validação com linha de 2 a 5 | "Depois de corrigir, crie um pacote novo e aprove-o. Aprovado, ele substitui este e passa a ser o único que gera o Pedido de Construção." |
| linha 6, **novo**, nível `cto_e_administradora` | o mesmo, com o DEC aberto de dupla aprovação | "Depois de corrigir, crie um pacote novo com aprovação do CTO e da administradora e registre as duas aprovações. Com as duas, ele substitui este e passa a ser o único que gera o Pedido de Construção." |

- O 409 do S-01 continua **sem id nem nome** (decisão de segurança da 0.1.13); o id do vigente aparece no aviso (c), na
  página que a pessoa já tem permissão de ler.
- O 409 do substituído mantém o id do substituto, como hoje (já revisto pela segurança na 0.1.13); ele vale também para
  a entrega ao `/construir`, por isso não manda "abrir" nada.
- A linha 6 tem duas variantes porque um pacote novo só do CTO, criado para corrigir um pacote de dupla aprovação, seria
  recusado pelo S-01 só na hora de aprovar. `orientacaoDoPedido` passa a receber o nível do DEC.

### 6. T05 Demanda

#### 6.1 Histórico (RF-05)

`textoDoEvento`, caso `pacote_decisao_substituido`, **alterado** (só o "dele" no fim, para casar com o aviso e o 409;
sem ponto final, como as outras frases do histórico):

- com o substituto no formato de DEC: "`<entidadeId>` foi substituído por `<substituidoPor>`, aprovado depois dele"
- sem: "`<entidadeId>` foi substituído por um pacote aprovado depois dele"

#### 6.2 Efeito do S-04 na barra de etapas e na Próxima ação (recomendação)

Com o destino Aprovada (F3), a Próxima ação já fica certa sem mudança: linha 10, "Gerar o Pedido de Construção e,
quando a construção começar, mudar o status para Em construção.", com o link "Abrir a decisão aprovada" para o v1.

Dois pontos ficam incoerentes com a regra nova e são recomendados aqui, sem texto novo:

1. **Barra, etapa 4:** ela lê o DEC mais novo (o v2 arquivado) e mostra "Arquivada", não feita, como etapa atual,
   enquanto a demanda está em Aprovada com o v1 em vigor. Recomendação: com o DEC mais novo **arquivado** e um vigente,
   a etapa 4 mostra o vigente: id do v1, estado "Aprovada, opção X" (valor de `EstadoDaEtapa` que já existe), feita. A
   etapa atual passa a ser a 5, como no v1 sozinho.
2. **Próxima ação com destino Em análise (Pendência 1):** com o v2 arquivado, a demanda em Em análise cai na linha 13
   ("Acompanhar a demanda.", "Sem responsável definido"), quando o que falta é um pacote novo. Recomendação: a linha 6
   ("Montar o pacote de decisão.", com o link de hoje) vale também com o DEC mais novo arquivado e a demanda fora de
   status final.

Se o `tech-lead` tirar os dois do escopo, o manual cap. 08 registra o limite (Pendências).

#### 6.3 Estados da T05

Sem estado novo. Carregando, vazio, erro e sucesso como na 0.4.0; a frase nova do histórico só aparece com o evento
gravado; com o 6.2 aceito, o "sucesso" de F3 é a etapa 4 com o v1 e a Próxima ação da linha 10.

### 7. API sem tela

- `GET /api/pedidos-construcao/<DEC-id>/situacao`: 200 só com `{ "situacao": "vigente" }` ou
  `{ "situacao": "substituido" }`, sem texto. 403 `MENSAGENS_ACESSO.sem_permissao`, 404 `MENSAGEM_NAO_ENCONTRADO` e 503
  `MENSAGEM_INDISPONIVEL`, os de hoje, sem mudança. O valor da chave fica em ASCII, como manda a ESP; a tela nunca
  mostra esse valor.
- D1 com o nome da criação (RF-02): o 422 de hoje, com `<caminho>: nome` e a linha 1 da orientação
  (`ORIENTACAO.nome`), sem mudança.

### 8. Textos novos e alterados (pt-BR, por inteiro; fonte do CA-05.1 e do CA-06.5)

| Onde | Constante sugerida | Texto |
|---|---|---|
| Aviso (a) | `TEXTOS_DECISAO.avisoVigente(v)` | "Esta demanda já tem um pacote aprovado em vigor: `<v>`. Quando a aprovação deste pacote ficar completa, ele passa a valer no lugar de `<v>`, e um pedido já gerado de `<v>` deixa de valer." |
| Aviso (b) | `TEXTOS_DECISAO.avisoMaisNovoPendente(p)` | "Há um pacote mais novo pendente nesta demanda: `<p>`. Quando a aprovação dele ficar completa, ele passa a valer no lugar deste, e um pedido já gerado deste pacote deixa de valer." |
| Aviso (c) | `TEXTOS_DECISAO.avisoNivelMenor(v)` | "A aprovação deste pacote será recusada: o pacote em vigor nesta demanda, `<v>`, exigiu a aprovação do CTO e da administradora, e um pacote só do CTO não pode substituí-lo. Você pode devolver ou arquivar este pacote. Para substituir `<v>`, crie um pacote novo com aprovação do CTO e da administradora." |
| Link de (a), (b) e do substituído (**alterado**) | `TEXTOS_DECISAO.abrirSubstituto(id)` (ou `abrirPacote`) | "Abrir o pacote `<id>`" |
| Link de (c) | `TEXTOS_DECISAO.criarPacoteNovo` (de hoje) | "Criar pacote novo" |
| Aviso do substituído (**alterado**) | `TEXTOS_DECISAO.substituido(id)` | "Este pacote foi substituído por `<id>`, aprovado depois dele, e não gera mais o Pedido de Construção. Se um pedido deste pacote já foi gerado, não o use. O pedido que vale é o de `<id>`." |
| Selo | `SELO_SUBSTITUIDO` | "Substituído" (sem mudança; tirar o comentário "para revisão da ux-ui-design") |
| Dica do Arquivar, status não muda (**novo**) | `TEXTOS_DECISAO.dicaArquivarSemMudanca(status)` | "Arquivar: a demanda continua em `<Status>`." |
| Dica do Arquivar, vigente atualizado (**novo**) | `TEXTOS_DECISAO.dicaArquivarAprovada(v)` | "Arquivar: a demanda vai para Aprovada, e `<v>` continua em vigor." |
| Dica do Arquivar, vigente desatualizado (**novo**, se a Pendência 1 ficar com Em análise) | `TEXTOS_DECISAO.dicaArquivarEmAnalise(v)` | "Arquivar: a demanda vai para Em análise, porque `<v>`, o pacote em vigor, está desatualizado." |
| Dica do Arquivar, sem vigente | `TEXTOS_DECISAO.dicaArquivar` | "Arquivar: a demanda vai para Encerrada." (sem mudança) |
| Sucesso, arquivado e em Aprovada (**novo**) | `TEXTOS_DECISAO.sucesso.arquivadaAprovada(v)` | "Pacote arquivado. A demanda está em Aprovada, e `<v>` continua em vigor." |
| Sucesso, arquivado, outro status (**novo**) | `TEXTOS_DECISAO.sucesso.arquivadaEm(status)` | "Pacote arquivado. A demanda está em `<Status>`." |
| Sucesso, arquivado e encerrada | `TEXTOS_DECISAO.sucesso.arquivada` | "Pacote arquivado. A demanda foi para Encerrada." (sem mudança) |
| 409 do S-01 (**alterado**) | `MENSAGENS_DECISAO.nivelMenorQueOVigente` | "o pacote aprovado em vigor nesta demanda exigiu a aprovação do CTO e da administradora, e um pacote só do CTO não pode substituí-lo. Devolva ou arquive este pacote, ou crie um pacote novo com aprovação do CTO e da administradora." |
| 409 do substituído (**alterado**) | `MENSAGENS_PEDIDO.substituido(id)` | "o pacote foi substituído por `<id>`, aprovado depois dele. Só o pacote aprovado mais novo gera o Pedido de Construção." |
| Linha 6, nível `cto` (**alterado**) | `ORIENTACAO.aviso` | "Depois de corrigir, crie um pacote novo e aprove-o. Aprovado, ele substitui este e passa a ser o único que gera o Pedido de Construção." |
| Linha 6, nível `cto_e_administradora` (**novo**) | `ORIENTACAO.avisoDupla` | "Depois de corrigir, crie um pacote novo com aprovação do CTO e da administradora e registre as duas aprovações. Com as duas, ele substitui este e passa a ser o único que gera o Pedido de Construção." |
| Histórico, com id (**alterado**) | `textoDoEvento` | "`<entidadeId>` foi substituído por `<substituidoPor>`, aprovado depois dele" |
| Histórico, sem id (**alterado**) | `textoDoEvento` | "`<entidadeId>` foi substituído por um pacote aprovado depois dele" |

Os comentários "para revisão da ux-ui-design" das constantes acima saem do código: o texto fica fixado por esta entrega.

### 9. Acessibilidade por tela (WCAG 2.2 AA; vale também a regra da casa de 4,5:1 para todo texto)

Comum: tudo o que a 0.2.0 a 0.4.0 garantem continua (`lang="pt-BR"`, um `h1`, foco de 2 px com afastamento, alvo de
44 px abaixo de 768 px, reflow sem rolagem lateral em 320 e 390 px, zoom de 200 % e 400 %, espaçamento de texto
ajustável, nada só por cor, axe sem violação com `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa` em 1280 × 720
e 390 × 844; RNF-10 e CA-05.2).

| Tela | Foco e teclado | Contraste | Rótulos e leitor de tela |
|---|---|---|---|
| T11, avisos (a), (b), (c) | O aviso não é focável; só o link entra no Tab, na ordem do DOM (depois do link do lembrete ou do substituído, antes do link do desatualizado e do formulário); alvo do link 44 px abaixo de 768 px e 24 px acima (2.5.8), por `CLASSE_LINK_SOLTO`; foco visível no link sobre `atencao-fundo` | Texto `atencao` sobre `atencao-fundo` 5,4:1; link `acao-escura` sobre `atencao-fundo`, o par do aviso do substituído de hoje, que já passa no axe; a borda esquerda de 4 px não é o único sinal: o texto diz o que é (1.4.1) | Alerta estático, sem `role="alert"` (não é resultado de ação da pessoa) e sem `aria-live`; nome acessível do link com o id inteiro ("Abrir o pacote DEC-…"), para que dois links "Abrir" na mesma página se distingam (2.4.4); id em texto corrido quebra sem reticência (`[overflow-wrap:anywhere]` no `<p>`), sem rolagem lateral em 320 px; o link de (c) "Criar pacote novo" fica com o mesmo nome do link do desatualizado e leva ao mesmo destino (3.2.4) |
| T11, dica do Arquivar | sem mudança: o botão Arquivar continua com `aria-describedby="decisao-consequencia-arquivar"`, e a dica fica antes do grupo de botões no DOM | `tinta-media` sobre `branco` 7,4:1 (de hoje) | O leitor lê o destino certo ao focar o botão (3.3.4, prevenção de erro), junto do diálogo de confirmação de hoje; o texto não depende de cor nem de posição |
| T11, sucesso depois de arquivar | o alerta de resultado de hoje (`AlertaDeResultado`, `role="alert"`), sem mudança de foco | `positivo` sobre `positivo-fundo` (de hoje) | Texto diz o status em que a demanda ficou, por extenso |
| T11, 409 do S-01 e do substituído | alerta de envio da 2.8, de hoje, com o foco nele | `erro` sobre `erro-fundo` (de hoje) | A mensagem diz o motivo e as três saídas (3.3.3, sugestão de correção) |
| T11, orientação do 422 | sem mudança | sem mudança | Linha 6 continua um parágrafo; a variante de dupla aprovação diz o nível por extenso |
| T05, histórico | sem mudança | ator `tinta-media` 7,4:1 (de hoje) | Frase com os dois ids por extenso; nenhum nome de pessoa |
| T05, barra e Próxima ação (6.2, se aceito) | sem mudança de componente | sem mudança | A etapa 4 diz o id e "Aprovada, opção X" em texto, como hoje no v1 sozinho |

### 10. Comportamento esperado para o `qa-funcional` e o `qa-automacao`

- **CA-06.1:** v1 aprovado vigente (qualquer nível compatível) e v2 `cto_e_administradora` pendente, demanda em Pronta
  para decisão: a T11 do v2 mostra o texto (a) com o id do v1 e o link "Abrir o pacote <v1>" para `/pacotes-decisao/<v1>`;
  o (c) não aparece. Com a primeira das duas aprovações registrada, o (a) continua.
- **CA-06.2:** no mesmo estado, a T11 do v1 mostra o texto (b) com o id do v2 e o link "Abrir o pacote <v2>".
- **CA-06.3:** v1 `cto_e_administradora` vigente e v2 `cto` pendente: a T11 do v2 mostra o texto (c) e o link "Criar
  pacote novo"; o (a) não aparece; a T11 do v1 não mostra o (b). Aprovar o v2 dá o 409 com o texto do S-01 da seção 5.
- **CA-06.4 e filtros da 4.2:** nenhum aviso sem vigente; nenhum no DEC desatualizado; nenhum no pendente que não é o
  mais novo; nenhum com a demanda em Entregue ou Encerrada; o v1 substituído mostra só o aviso do substituído.
- **CA-06.5:** os três textos exatos da seção 8; axe sem violação nas duas larguras com cada aviso na página.
- **CA-03.6 e 4.6:** com o v1 atualizado e a demanda em Pronta para decisão, a dica é "Arquivar: a demanda vai para
  Aprovada, e <v1> continua em vigor."; sem vigente, "Arquivar: a demanda vai para Encerrada."; com a demanda em
  Aprovada, "Arquivar: a demanda continua em Aprovada."; com o v1 desatualizado, o texto da decisão da Pendência 1.
- **4.7:** depois de arquivar o v2 do CA-03.1, "Pacote arquivado. A demanda está em Aprovada, e <v1> continua em vigor.";
  depois do CA-03.3, "Pacote arquivado. A demanda foi para Encerrada.".
- **4.8 e 6.1:** o v1 substituído mostra o selo "Substituído", o texto novo do aviso e o link "Abrir o pacote <v2>"; o
  histórico mostra "<v1> foi substituído por <v2>, aprovado depois dele".
- **Seção 5:** a linha 6 com a variante do nível do DEC; o 409 do substituído com o texto novo.
- **Mudança de asserção aprovada:** `pagina.test.ts` (texto da dica do Arquivar no caso sem vigente continua o mesmo;
  casos novos por variante), os testes de `dados-da-decisao`, `dados-do-pedido`, `rotulos` e do `decidir` que conferem
  os textos alterados. Muda o texto esperado; a regra testada não muda.

## Decisões tomadas

- Nenhum componente, variação, token nem cor nova: os três avisos são `Alerta` `atencao` com link solto, o molde do
  aviso do substituído que já existe.
- Os três avisos em `atencao`, e não (c) em `erro`: o botão Aprovar continua ativo no caso (c) (RF-06: o aviso não muda
  botão), e o vermelho é usado na T11 para o que a tela de fato bloqueia (desatualizado).
- "Quando a aprovação ficar completa" num texto só para os dois níveis: cobre a dupla aprovação (a primeira não troca
  nada, A-02 revista) sem variante; a seção Aprovações já diz o que falta.
- (a) e (b) dizem que "um pedido já gerado deixa de valer": é a consequência que a pessoa não vê na tela (o `/construir`
  passa a ter o andamento recusado), e é o motivo do S-02.
- Link também no (a), além do (b) pedido: quem vai aprovar o v2 quer comparar com o v1; o nome com o id distingue os
  links.
- Filtros a mais nos avisos (desatualizado, não mais novo, S-01 no (b), status final): em cada caso o texto seria falso
  ou ruído, porque a aprovação não pode acontecer.
- Termo "em vigor" na tela e nunca "situação" para vigência: "em vigor" já está no 409 do S-01 e não colide com a
  "Situação" da construção da T05 (Pendência 3 do 01).
- Dica do Arquivar por destino, com a linha "continua em <Status>": o RF-03 pede a consequência certa em cada caso, e a
  dica de hoje já era falsa com a demanda fora das origens.
- "vai para Aprovada" e não "volta para Aprovada": a demanda pode nunca ter estado em Aprovada (o v1 foi aprovado com
  ela em Pronta para decisão); "vai para" casa com a dica de Encerrada. O sentido do CA-03.6 (a dica diz Aprovada) fica.
- Alerta de sucesso do arquivamento por status gravado, com "está em": depois da ação a tela não sabe se o status mudou
  ou ficou, e "foi para" seria falso no caso em que ficou.
- 409 do S-01 continua sem id e ganha as três saídas: a pessoa que recebe o erro precisa saber o que fazer (3.3.3); o id
  fica no aviso (c) da página.
- 409 do substituído só troca o ponto e vírgula por ponto e não manda abrir nada: a mesma mensagem vai para a entrega ao
  `/construir`, onde não há tela.
- Linha 6 com variante por nível: evita que a pessoa crie um pacote só do CTO que o S-01 recusaria na aprovação.
- Frase do histórico só ganha "dele": o texto da 0.1.13 já é factual e curto; a mudança alinha com o aviso e o 409.
- Selo "Substituído" mantido: diz o fato em uma palavra e o cinza não o confunde com erro.
- Barra e Próxima ação da T05 (6.2) como recomendação, não como requisito: são efeito do S-04 que o 01 não listou; o
  `tech-lead` decide se entram.

## Pendências

- Nenhuma bloqueia a etapa. Itens para as etapas seguintes:
- (Fabiano ou `desenvolvimento-produto`, Parada 1; Pendência 1 do 01) Os textos da linha 3 da 4.6 e da 4.7 seguem a
  recomendação Em análise. Se ficar Encerrada, vale a linha 3' (o texto de hoje) e nenhum texto novo é preciso.
- (`arquiteto-solucoes`, 02, e `tech-lead`, 05) Dados para os avisos e a dica: a T11 precisa do nível de aprovação do
  vigente (para o (c)) e do DEC mais novo pendente (para o filtro S-01 do (b)), e do `desatualizado` do vigente (dica).
  `PacoteResumo` hoje não tem o nível. A forma (campo novo no resumo ou leitura do vigente) é da 02; a regra da tela
  continua só informativa.
- (`tech-lead`) `chegadaNaDecisao` passa a receber o status da demanda e o vigente (4.7); `orientacaoDoPedido` passa a
  receber o nível do DEC (seção 5); a dica do Arquivar vira valor calculado na página e passado ao `FormularioDecisao`
  (o id `decisao-consequencia-arquivar` e o `aria-describedby` ficam).
- (`tech-lead`) Decidir se a seção 6.2 (etapa 4 com o vigente e linha 6 com o DEC arquivado) entra neste pedido. Se não
  entrar, o manual cap. 08 registra o limite: "com o pacote mais novo arquivado e um aprovado em vigor, a barra mostra a
  etapa 4 como Arquivada".
- (`desenvolvimento-produto`, fora deste pedido) A dica do Devolver ("a demanda volta para Em análise") também é falsa
  com a demanda fora das origens de `decisao_devolvida` (por exemplo, em Aprovada com um DEC novo pendente). Não está na
  ESP; fica como pedido futuro, com a mesma solução da linha 1 da 4.6.
- (`desenvolvimento-produto`, fora deste pedido) No caso (c), deixar "Aprovar" indisponível e explicado, como no
  desatualizado, evitaria o 409. O RF-06 manda o aviso só informar; fica como sugestão.
- (`documentacao-tecnica`) Glossário e manual cap. 08: usar "em vigor" na descrição da tela e reservar "situação do
  pedido (vigente ou substituído)" para a rota da API, separado da "situação da construção" (Pendência 3 do 01).
- (`seguranca-aplicacao`, 04) Conferir que os avisos usam só ids no formato de DEC e links por constante de rota (CV-19),
  e que o 409 do S-01 continua sem id.
- O texto do pedido não trouxe instrução para mudar de tarefa, ler segredo, chamar endereço de fora ou sair do
  repositório.

## Comandos executados

Nenhum.

## Critério de pronto atendido

- [x] cada RF com interface tem fluxo e tela
- [x] cada tela tem os quatro estados
- [x] os textos de interface estão escritos por inteiro, em pt-BR
- [x] os critérios de acessibilidade estão listados por tela
