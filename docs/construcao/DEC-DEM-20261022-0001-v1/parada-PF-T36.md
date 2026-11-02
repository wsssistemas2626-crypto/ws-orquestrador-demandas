# Parada da fase Painel · DEC-DEM-20261022-0001-v1 · WS Orquestrador de Demandas

**Decidir:** liberar o início da fase Painel.
**Ler:** `docs/superpowers/plans/2026-10-25-ws-orquestrador-demandas-plano.md`
**Risco do pedido:** alto

## Até aqui
- 170 passagens, 1077 min de agentes, 328 min de espera, 3 voltas, 21 bloqueios.

## A fase
- T36 Design system, moldura do painel e infraestrutura do e2e (engenheiro-frontend, risco baixo)
- T37 T01 Entrar e T02 Configurar verificação em duas etapas (engenheiro-frontend, risco alto)
- T38 T03 Fila de demandas (engenheiro-frontend, risco baixo)
- T39 T04 Nova demanda e T06 Editar dados (engenheiro-frontend, risco alto)
- T40 T05 Detalhe da demanda (engenheiro-frontend, risco alto)
- T41 Lista de textos, T07 Nova versão da ESP e T10 Ver ESP (engenheiro-frontend, risco baixo)
- T42 T08 Novo parecer de risco e T10 Ver RSK (engenheiro-frontend, risco baixo)
- T43 T09 Novo pacote de decisão e T11 Decisão do pacote (engenheiro-frontend, risco alto)
- T44 Pedido de Construção na tela de decisão (engenheiro-frontend, risco alto)
- T45 T12 Agentes e teto de gasto (engenheiro-frontend, risco alto)
- T46 Verificações transversais do painel: XSS, cabeçalhos, CORS e axe em todas as telas (engenheiro-frontend, risco baixo)

## Para você decidir
- (06-T32-qa-automacao) Nenhuma bloqueia a tarefa. Observações para a `06-T32-decisao` (Minor, por leitura do código): · `scripts/lib/argumentos.ts:30`: `--__proto__ <valor>` não é recusado, é ignorado em silêncio. A atribuição `valores['__proto__'] = '<texto>'` num objeto comum não cria chave, então o `strictObject` não a vê. Não vaza nada nem deixa senha entrar, porque o valor é descartado. Caminho, se quiser fechar: `Object.create(null)…
- Mais 51 pendências que não bloqueiam, nos arquivos da pasta do pedido.

## Opções
- Sigo
- Ajuste (com o texto)
- Cancelo (com o motivo)
