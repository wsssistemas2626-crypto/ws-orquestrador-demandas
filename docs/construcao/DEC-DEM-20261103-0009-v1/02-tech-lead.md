---
pedido: DEC-DEM-20261103-0009-v1
etapa: 02-triagem
agente: tech-lead
leu: [pedido.json, 01-qa-funcional.md, contrato-passagem.md, src/modules/pacotes-decisao/consultas.ts, src/modules/demandas/consultas.ts, src/modules/especificacoes/consultas.ts, src/modules/pareceres-risco/consultas.ts, src/app/api/demandas/[id]/pacotes-decisao/route.ts, src/app/api/demandas/[id]/especificacoes/route.ts, src/app/api/pacotes-decisao/[decId]/decisao/route.ts, src/db/schema/decisao.ts, src/lib/log.ts, src/lib/reduzir-erro.ts]
status: pronto
proximo: engenheiro-backend
devolvido_para: null
---
## Entrega

### Causa provável

**M-a (RF-20, alta).** O M-2 do 0008 criou as vistas por ator (`vistaDoPacotePara`, `vistaDaEspecificacaoPara`,
`vistaDoParecerPara`) só para a autoria: o texto livre é copiado sem `minimizarValor`. O M-1 do 0008 fez a
minimização só na demanda (`vistaDaDemandaPara`, `src/modules/demandas/consultas.ts:207-232`). Além disso, os três POST
de criação devolvem o retorno do serviço direto, sem a vista do ator:
- `src/app/api/demandas/[id]/pacotes-decisao/route.ts:13`
- `src/app/api/demandas/[id]/especificacoes/route.ts:12`
- `src/app/api/demandas/[id]/pareceres-risco/route.ts:12` (pela 01; conferir)

Nenhuma das três vistas tem o `solicitanteNome` da demanda, que precisa estar entre os nomes trocados.

**B-b (baixa).** `src/lib/log.ts:59` (`normalizarErro`) devolve como veio o objeto que não é `Error`. A única proteção é o
`redact` de um nível, e `motivo` e `cpf` não estão nele.

### Caminho da correção (engenheiro-backend)

1. **Utilitários compartilhados.** Exportar `nomesDoSolicitante`, `textoMinimo` e `textoMinimoOuNulo`
   (`src/modules/demandas/consultas.ts:193-195`) e acrescentar `listaMinimaOuNula(xs: string[] | null, nomes)`, em que a
   lista nula continua nula. Sem cópia em cada módulo (regra de não duplicar).
2. **Nome do solicitante.** Uma função `nomesDosSolicitantes(db, demandaIds: string[]): Promise<Map<string, string[]>>`
   (uma consulta com `inArray` em `demanda`) e as três vistas passam a receber `nomes: readonly string[]` como terceiro
   parâmetro. Não pôr o `solicitanteNome` dentro de `PacoteDecisaoVista`, `EspecificacaoVista` nem `ParecerRiscoVista`:
   as vistas da pessoa e o gerar do Pedido de Construção não mudam (risco do RSK-0009).
3. **`vistaDoPacotePara`** (`src/modules/pacotes-decisao/consultas.ts:180-212`). Para ator que não é pessoa:
   - minimizar `demandaTitulo`, `demandaDescricao`, `resumoExecutivo` e `recomendacao` (pode ser nulo);
   - em `opcaoA` e `opcaoB`, minimizar subcampo a subcampo (`descricao`, `vantagens?`, `desvantagens?`,
     `quandoEscolher?`, tipo `Opcao` em `src/db/schema/decisao.ts:20`), sem criar chave que não veio;
   - minimizar `decisao.comentarios` (pode ser nulo) e `especificacaoCitada.criteriosAceitePreliminares` e
     `.definicaoDePronto` (listas que podem ser nulas);
   - deixar como estão `sistemaAlvo`, `repositorioDestino`, `niveisRisco`, `statusDecisao`, ids, datas e
     `rascunhosCitados`.
4. **`vistaDaEspecificacaoPara`** (`src/modules/especificacoes/consultas.ts:75-103`). Minimizar `descricaoObjetiva`,
   `situacaoAtual`, `situacaoDesejada`, `escopoInclui`, `escopoExclui`, `sistemasErp`,
   `sistemasEcommerceMarketplace`, `sistemasApisTerceiros`, `sistemasServicosInternos`, `dadosEntidades`,
   `dadosCamposCriticos`, `restricoesTecnicas`, `duvidasEmAberto`, `criteriosAceitePreliminares` e
   `definicaoDePronto`. Ficam iguais `sistemaAlvo`, `repositorioDestino`, `versaoMaisNova`, ids e datas.
5. **`vistaDoParecerPara`** (`src/modules/pareceres-risco/consultas.ts:62-84`). Minimizar `resumo`, os três
   `risco*Comentario`, `recomendacoesMitigacao`, `preCondicoes` e `envolverJuridicoOuAdministradoraQuando`. Ficam iguais
   os níveis, `versaoMaisNova` e `especificacaoMaisNova`.
6. **Rotas.** Todo GET que usa as três vistas passa os nomes, e os três POST de criação passam o retorno do serviço pela
   vista do ator, com os nomes da demanda do caminho. As rotas são estas:
   - `GET /api/pacotes-decisao`, com o mapa por `demandaId`, porque a lista cruza demandas;
   - `GET /api/pacotes-decisao/[decId]`;
   - `GET` e `POST /api/demandas/[id]/pacotes-decisao`;
   - `GET` e `POST /api/demandas/[id]/especificacoes`;
   - `GET /api/especificacoes/[espId]`;
   - `GET` e `POST /api/demandas/[id]/pareceres-risco`;
   - `GET /api/pareceres-risco/[rskId]`.

   O `PATCH /api/pacotes-decisao/[decId]/decisao` é só de pessoa e não muda. O `pedido-construcao` continua lendo o
   banco (`vistaDe`) e não pode passar pela vista do ator.
7. **B-b.** Em `src/lib/log.ts`, `normalizarErro` reduz também o objeto que não é `Error`: o resultado é
   `{ classe: 'desconhecido' }` e leva `code` só quando `valor.code` passa no `FORMATO_CODE` de
   `src/lib/reduzir-erro.ts`. Para isso, exportar `lerCode` dali, sem copiar a regex. Atualizar o comentário das linhas
   55-56. Não mudar o retorno de `reduzirErro` para quem já o usa.
8. **Versão.** `package.json` com `0.1.8`. Sem migration. Nenhum controle afrouxado (C-10, C-21, C-23, A-02, axe, C-36).

### Testes de regressão esperados (escritos antes da correção, falhando na 0.1.7)

Dado fictício da 01: solicitante "Joana Fictícia Teste", `joana.ficticia@exemplo.invalid`, CPF `000.000.001-91`,
telefone `(11) 90000-0001`, nos campos de texto e de lista de DEC, ESP e RSK e no `comentarios` da decisão.

- `src/app/api/vistas-para-agente.test.ts` (estender): para cada rota do passo 6, com os dois atores:
  - no agente, nenhum dos quatro fragmentos aparece em nenhum campo de texto ou lista de texto, nem no 201;
  - na pessoa, o texto sai original;
  - ids, `sistemaAlvo`, `repositorioDestino`, níveis, `statusDecisao` e `nivelAprovacaoRequerido` saem iguais nos dois;
  - os subcampos opcionais de `Opcao` ausentes continuam ausentes e as listas nulas continuam nulas.
- `src/app/api/pacotes-decisao/pedido.test.ts` (estender): o Pedido de Construção gerado de um DEC com o dado fictício
  mantém o título, a descrição, a ESP e o RSK originais.
- `src/lib/log.test.ts` (estender): `log.error({ evento, erro: { motivo: 'falha para joana.ficticia@exemplo.invalid',
  cpf: '000.000.001-91' } })` grava `erro` igual a `{ classe: 'desconhecido' }`. Com `code: '23505'`, grava
  `{ classe: 'desconhecido', code: '23505' }`. Com `code` fora do formato, o `code` não sai.

### Definição de pronto do pedido, por etapa da cadeia curta

| Item | Etapa dona |
|---|---|
| `pnpm test`, `pnpm lint` e `pnpm typecheck` verdes | `03-correcao` (engenheiro-backend) |
| `package.json` na versão 0.1.8 | `03-correcao` (engenheiro-backend) |
| `pnpm test:e2e` verde três vezes seguidas (e `e2e/`, se precisar) | `04-regressao` (qa-automacao) |
| `docker build` | `05-entrega` (devops-sre) |
| PR com CI verde | `05-entrega` (devops-sre) |
| `CHANGELOG.md` com a versão 0.1.8 | `06-documentacao` (documentacao-tecnica) |

## Decisões tomadas

- O engenheiro é o `engenheiro-backend`: tudo fica em `src/modules`, `src/app/api` e `src/lib`, sem tela e sem migration.
- Os nomes do solicitante entram como parâmetro da vista, não como campo dela. Assim a vista da pessoa e o gerar do
  Pedido de Construção não mudam.
- Os utilitários de minimização são reaproveitados da demanda, e não copiados, para seguir a regra de não duplicar.
- O B-b fica restrito ao `log.ts`, para não mudar o retorno de `reduzirErro` nos outros pontos que o usam.

## Pendências

- O engenheiro precisa conferir duas coisas que não abri: as linhas do `POST` de `pareceres-risco/route.ts` e o tipo
  que os serviços de criação de ESP e RSK devolvem.
- Desvio desta etapa: rodei dois comandos de shell fora da lista **Pode**, só de leitura (`ls` e `cat` na pasta do
  pedido, no primeiro comando abaixo). Estão declarados como rodaram. Nada foi alterado.

## Comandos executados

- `ls /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261103-0009-v1; cat /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261103-0009-v1/pedido.json` — fora da lista Pode, só leitura
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/app/api`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/app/api/especificacoes HEAD:src/app/api/pareceres-risco HEAD:src/app/api/pacotes-decisao HEAD:src/app/api/demandas/[id]`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/app/api/pacotes-decisao/[decId] HEAD:src/app/api/especificacoes/[espId] HEAD:src/app/api/pareceres-risco/[rskId] HEAD:src/modules/dados-pessoais`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/lib`

## Critério de pronto atendido

- [x] (02 triagem) `proximo` é um dos três engenheiros
- [x] (02 triagem) cada item da definição de pronto do pedido está atribuído a uma etapa da cadeia curta, pela lista da Entrega
