# Parada da fase Avisos e retenção · DEC-DEM-20261022-0001-v1 · WS Orquestrador de Demandas

**Decidir:** liberar o início da fase Avisos e retenção.
**Ler:** `docs/superpowers/plans/2026-10-25-ws-orquestrador-demandas-plano.md`
**Risco do pedido:** alto

## Até aqui
- 146 passagens, 910 min de agentes, 216 min de espera, 3 voltas, 19 bloqueios.

## A fase
- T30 Aviso por e-mail de pacote pronto para decisão (engenheiro-backend, risco alto)
- T31 Expurgo do texto bruto, da entrada pendente e das sessões vencidas (engenheiro-backend, risco alto)

## Para você decidir
- (06-T26-qa-automacao) **Para a `08-revisao` (`seguranca-aplicacao`) e o `tech-lead`, Minor:** o prompt do insumo técnico manda ao provedor de IA o nome `fabianojp06`, conta pessoal do GitHub do CTO. · **Origem:** a regra `repositorioDestino: … com a conta ${DONOS_REPOSITORIO.join(' ou ')}` em `src/agents/insumo-tecnico.ts:45`. · **Por que o teste do engenheiro não pegou:** o `not.toMatch(/Débora|Fabiano|Marcus/)` é sensível à caixa. · **…
- (06-T27-engenheiro-backend) Seguem abertos, sem mudança: os Minor 2 e 3 da `06-T26-revisao`, o Minor de `fabianojp06` da `06-T26-testes` e o aviso do undici "Using `patch`".
- (06-T27-qa-automacao) Seguem abertos, sem mudança: os quatro Minor da `06-T27-revisao`, os Minor 2 e 3 da `06-T26-revisao`, o Minor de `fabianojp06` da `06-T26-testes` e o aviso do undici "Using `patch`".
- (06-T27-tech-lead) Seguem abertos, sem mudança: os Minor 2 e 3 da `06-T26-revisao`, o Minor de `fabianojp06` da `06-T26-testes` e o aviso do undici "Using `patch`".
- (06-T28-engenheiro-backend) Seguem abertos, sem mudança: os quatro Minor da `06-T27-revisao`, os Minor 2 e 3 da `06-T26-revisao`, o Minor de `fabianojp06` da `06-T26-testes` e o aviso do undici "Using `patch`".
- (06-T28-qa-automacao) Seguem abertos, sem mudança: os Minor 1 a 6 da `06-T28-revisao`, os quatro Minor da `06-T27-revisao`, os Minor 2 e 3 da `06-T26-revisao`, o Minor de `fabianojp06` da `06-T26-testes` e o aviso do undici "Using `patch`".
- (06-T28-tech-lead) Seguem abertos, sem mudança: os quatro Minor da `06-T27-revisao`, os Minor 2 e 3 da `06-T26-revisao`, o Minor de `fabianojp06` da `06-T26-testes` e o aviso do undici "Using `patch`".
- Mais 76 pendências que não bloqueiam, nos arquivos da pasta do pedido.

## Opções
- Sigo
- Ajuste (com o texto)
- Cancelo (com o motivo)
