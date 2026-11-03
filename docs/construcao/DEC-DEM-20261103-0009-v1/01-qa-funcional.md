---
pedido: DEC-DEM-20261103-0009-v1
etapa: 01-reproducao
agente: qa-funcional
leu: [pedido.json, src/modules/pacotes-decisao/consultas.ts, src/modules/pacotes-decisao/criar.ts, src/app/api/demandas/[id]/pacotes-decisao/route.ts, src/modules/especificacoes/consultas.ts, src/modules/pareceres-risco/consultas.ts, src/modules/demandas/consultas.ts, src/lib/log.ts, src/db/schema/decisao.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Reprodução por leitura do código na base do ramo (main 3c8a942, versão 0.1.7). Dados de teste fictícios.

### Dado de teste (fictício)

- Conta pessoa: `pessoa.teste@exemplo.invalid`; ator agente: token de agente de teste (ex.: `analista-requisitos`).
- Demanda com `solicitanteNome = "Joana Fictícia Teste"`, título `"Erro no cadastro da Joana Fictícia Teste"`,
  descrição contendo `contato joana.ficticia@exemplo.invalid, CPF 000.000.001-91, telefone (11) 90000-0001`.
- ESP com o mesmo trecho em `descricaoObjetiva`, `situacaoAtual`, `escopoInclui[0]`, `duvidasEmAberto[0]`,
  `criteriosAceitePreliminares[0]`.
- RSK com o mesmo trecho em `resumo`, `riscoTecnicoComentario`, `recomendacoesMitigacao[0]`, `preCondicoes[0]`.
- DEC com o mesmo trecho em `resumoExecutivo`, `opcaoA.descricao`, `opcaoA.vantagens`, `opcaoB.desvantagens`,
  `recomendacao`; decisão registrada com `comentarios` contendo o mesmo trecho.

### Defeito 1 (M-a, RF-20): texto livre de DEC, ESP e RSK sai sem minimizar para o agente

Passos:
1. Como pessoa, criar a demanda, a ESP, o RSK e o DEC acima; registrar a decisão com o comentário.
2. Como agente, `POST /api/demandas/:id/especificacoes` e `POST /api/demandas/:id/pareceres-risco` e
   `POST /api/demandas/:id/pacotes-decisao` com os mesmos textos; observar o corpo do 201.
3. Como agente, `GET /api/pacotes-decisao`, `GET /api/pacotes-decisao/:decId`, `GET /api/demandas/:id/pacotes-decisao`.
4. Como agente, ler a ESP e o RSK pelas rotas de leitura por id e de listagem da demanda.
5. Como agente, `GET /api/demandas/:id` (controle: já minimiza na 0.1.7).
6. Repetir 3 e 4 como pessoa.

Resultado esperado:
- Passos 2 a 4 (agente): e-mail, CPF, telefone e "Joana Fictícia Teste" trocados pelo `minimizarValor`
  (`src/modules/dados-pessoais/minimizar.ts`) em todo campo de texto e lista de texto; ids, `sistemaAlvo`,
  `repositorioDestino`, níveis de risco, status e enumerados iguais.
- Passo 5: minimizado (já é).
- Passo 6 (pessoa): texto original.
- O Pedido de Construção gerado do DEC continua com o texto original (lê o banco).

Resultado obtido:
- Passo 2: o 201 do DEC devolve o retorno de `criarPacoteDecisao` direto, sem `vistaDoPacotePara`
  (`src/app/api/demandas/[id]/pacotes-decisao/route.ts:13`); o 201 da ESP e do RSK idem
  (`src/app/api/demandas/[id]/especificacoes/route.ts:12`, `src/app/api/demandas/[id]/pareceres-risco/route.ts:12`),
  com o texto original e a autoria completa.
- Passo 3: `vistaDoPacotePara` (`src/modules/pacotes-decisao/consultas.ts:180-212`) copia sem minimizar
  `demandaTitulo`, `demandaDescricao` (:189-190), `resumoExecutivo`, `opcaoA`, `opcaoB`, `recomendacao` (:191-194),
  `decisao.comentarios` (:202) e `especificacaoCitada.criteriosAceitePreliminares` e `.definicaoDePronto` (:207-208).
  O agente recebe e-mail, CPF, telefone e nome do solicitante em claro.
- Passo 4: `vistaDaEspecificacaoPara` (`src/modules/especificacoes/consultas.ts:75-103`) e `vistaDoParecerPara`
  (`src/modules/pareceres-risco/consultas.ts:62-84`) só reduzem a autoria; todo texto sai original.
- Passo 5: minimizado (controle ok).
- Passo 6: original (correto).

Observações para a correção:
- Nenhuma das três vistas carrega o `solicitanteNome` da demanda: a correção precisa obtê-lo (junção com `demanda`
  ou parâmetro) para a troca do nome, como faz `vistaDaDemandaPara` (`src/modules/demandas/consultas.ts:207-232`).
- `Opcao` é objeto (`descricao`, `vantagens?`, `desvantagens?`, `quandoEscolher?`, `src/db/schema/decisao.ts:20`):
  minimizar cada subcampo, preservando os opcionais ausentes.
- `especificacaoCitada.criteriosAceitePreliminares` e `.definicaoDePronto` no DEC são lista de texto da ESP e devem
  entrar na minimização (a spec cita "todo campo de texto"; a regra é por lista de permissão).
- Listas nulas continuam nulas; `versaoMaisNova` e `especificacaoMaisNova` são ids e ficam iguais.
- O gerar do Pedido de Construção não pode passar a usar a vista (risco do RSK-0009).

### Defeito 2 (B-b): `normalizarErro` deixa passar objeto que não é Error

Passos:
1. Chamar o logger com `{ erro: { motivo: 'falha para joana.ficticia@exemplo.invalid', cpf: '000.000.001-91' } }`.
2. Ler a linha gravada no destino de teste.

Resultado esperado: `erro` reduzido a `{ classe, code }`, sem `motivo` nem `cpf`.

Resultado obtido: `src/lib/log.ts:59` devolve o objeto como veio; só as chaves cobertas pelo `redact` de um nível
(`*.message`, `*.email`, `*.texto` etc.) são ocultadas, e `motivo` e `cpf` saem em claro.

### Arquivos suspeitos

- `src/modules/pacotes-decisao/consultas.ts` (vistaDoPacotePara, :180-212)
- `src/app/api/demandas/[id]/pacotes-decisao/route.ts` (:13, 201 sem vista)
- `src/app/api/demandas/[id]/especificacoes/route.ts` (:12) e `src/modules/especificacoes/consultas.ts` (:75-103)
- `src/app/api/demandas/[id]/pareceres-risco/route.ts` (:12) e `src/modules/pareceres-risco/consultas.ts` (:62-84)
- rotas `GET /api/pacotes-decisao` e `GET /api/pacotes-decisao/:decId` e as de leitura de ESP e RSK (usam as vistas acima)
- `src/lib/log.ts` (normalizarErro, :57-61)

### Severidade

- Defeito 1: alta. Dado pessoal de terceiro (e-mail, CPF, telefone, nome) entregue ao agente pela API, contrariando
  RF-20 e a minimização já feita na entrada do agente; bloqueia a primeira publicação (CA-P5-16, CA-P5-21). Só não é
  crítica porque o sistema não está publicado e os dados são fictícios.
- Defeito 2: baixa. Depende de alguém registrar objeto simples como `erro`; o efeito é dado em claro no log interno.

## Decisões tomadas

- Reprodução por leitura de código, sem executar: o agente não tem Bash e a lista Pode é só leitura e escrita da entrega.
- Incluí `especificacaoCitada` do DEC no defeito 1: é lista de texto livre da ESP que sai pela vista do DEC.

## Pendências

- Confirmar na triagem os caminhos das rotas de leitura por id e de listagem de ESP e RSK (não abertos nesta etapa).

## Comandos executados

Nenhum.

## Critério de pronto atendido

- [x] (01) os passos de reprodução estão completos e o resultado obtido está descrito
