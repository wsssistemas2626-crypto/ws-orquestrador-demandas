---
pedido: DEC-DEM-20261103-0008-v1
etapa: 06-documentacao
agente: documentacao-tecnica
leu: [contrato-passagem.md, pedido.json, 01-qa-funcional.md (pela 02 e 04), 02-tech-lead.md, 03-engenheiro-backend.md, 04-qa-automacao.md, 04-maestro.md, 05-devops-sre.md, CHANGELOG.md, README.md, docs/manual-tecnico/README.md, docs/manual-tecnico/02-acesso-e-seguranca.md, docs/manual-tecnico/03-demandas.md, docs/manual-tecnico/06-agentes-de-ia.md, docs/manual-tecnico/09-referencia-api.md, docs/operacao/deploy.md, src/app/api/demandas/demandas.test.ts (marcadores)]
status: pronto
proximo: maestro
devolvido_para: null
---
## Entrega

Entrada **0.1.7** no `CHANGELOG.md` (versão do `package.json`) e os trechos de `README.md`, `docs/manual-tecnico/` e
`docs/operacao/deploy.md` que citam o que foi corrigido (M-1, M-2, M-3, B-1) passam a descrever o código depois da
correção. O CHANGELOG registra que o **M-1 fechou na demanda** (leitura, criação e listagem) e que o **M-a** da
`04-maestro.md` continua aberto (`demandaTitulo`, `demandaDescricao`, `decisao.comentarios` e o texto de ESP e RSK sem
minimizar para o agente) e **continua bloqueando a primeira publicação** até o pedido 0009 ou o aceite de Fabiano e da
`gestao-riscos`.

### Trechos conferidos (achados com Grep por `vistaDaDemandaPara`, `M-1`, `minimizarValor`, `console-saneado`, `console_erro`, `onRequestError`, `vista mínima`, `referenciaDocumento`, `decididaPor`, `listarDemandas`, `0.1.6`, `M-a`)

| Arquivo:linha | O que mudou |
|---|---|
| `CHANGELOG.md:6-105` | Entrada nova 0.1.7: o que mudou (M-1 na demanda, M-2, M-3, B-1, testes, versão, documentação), verificações e pendências abertas (M-a bloqueando a primeira publicação, B-a, B-b, risco do M-3, pendências herdadas da 0.1.6) |
| `README.md:5` | Versão 0.1.6 → 0.1.7 |
| `docs/manual-tecnico/README.md:5` | Versão do sistema 0.1.7 e os quatro comportamentos que mudam |
| `docs/manual-tecnico/README.md:81` | Glossário "Vista mínima": texto livre minimizado desde a 0.1.7 e corte nas leituras de ESP, RSK e DEC |
| `docs/manual-tecnico/03-demandas.md:5` | Cabeçalho "Atualizado em" com a 0.1.7 |
| `docs/manual-tecnico/03-demandas.md:65-88` | RF-06: vista mínima passa o texto livre por `minimizarValor`; listagem por `listarDemandasPara`, sem `solicitanteNome`; limite conhecido M-1/M-2 trocado pelo M-a |
| `docs/manual-tecnico/02-acesso-e-seguranca.md:5` | Cabeçalho "Atualizado em" com a 0.1.7 |
| `docs/manual-tecnico/02-acesso-e-seguranca.md:70-77` | "Ler não é ver tudo": M-1 e M-2 fechados (sete rotas, cortes), M-a aberto |
| `docs/manual-tecnico/02-acesso-e-seguranca.md:115-135` | Console saneado: `console.error` sem `digest` vai ao Sentry (M-3), B-1 com `reduzirErro`; limite M-3 aberto trocado pelo risco de runtime e pelo B-a |
| `docs/manual-tecnico/06-agentes-de-ia.md:5` | Cabeçalho "Atualizado em" com a 0.1.7 |
| `docs/manual-tecnico/06-agentes-de-ia.md:119-125` | RF-20: a API usa a mesma `minimizarValor` da entrada do agente; alcance restante é o M-a |
| `docs/manual-tecnico/09-referencia-api.md:5` | Cabeçalho "Atualizado em" com a 0.1.7 |
| `docs/manual-tecnico/09-referencia-api.md:103-112` | Exemplo de leitura com token de agente: texto minimizado com exemplo fictício (marcadores conferidos em `demandas.test.ts:418`), cortes do M-2 e o M-a |
| `docs/operacao/deploy.md:5` | Versão 0.1.6 → 0.1.7 (campo deixado pela `05-devops-sre.md`) |
| `docs/operacao/deploy.md:10` | "Atualizado em": versão 0.1.7 pela `documentacao-tecnica` |
| `docs/operacao/deploy.md:104-110` e `:193-198` | Conferidos sem mudança: a `05-devops-sre.md` já registra o bloqueio pelo M-a (seção 4) e o rollback da 0.1.7 (seção 6) |

Conferidos sem mudança, por citarem só a 0.1.6 em contexto histórico correto: cap. 04, 05, 07, 08 e 10 do manual.

Links internos novos: `03-demandas.md` → `06-agentes-de-ia.md#rf-20-minimização` (título `## RF-20. Minimização`, l.
106) e `09-referencia-api.md#exemplo-ler-demanda-com-token-de-agente` (título na l. 79); os outros links são os que já
existiam (`../../CHANGELOG.md`, `03-demandas.md#rf-06-consultar-e-alterar`).

## Decisões tomadas

- O M-1 aparece no CHANGELOG como "fechado na demanda", com o M-a logo depois: a 04-maestro diz que fora da demanda o M-1 não fechou, e a publicação segue bloqueada.
- Os limites "M-1, aberto" e "M-2, aberto" do manual foram trocados pelo M-a, e não apagados sem substituto: documentação desatualizada é pior que ausente.
- O limite do M-3 no cap. 02 virou o risco de runtime (prova de unidade) e o B-a: o código já envia, mas o caminho no Next 16 não foi conferido.
- O exemplo do cap. 09 usa o texto e os marcadores exatos do teste (`demandas.test.ts:418`), com dados fictícios: exemplo real conferido vale mais que descrição.
- As seções 4 e 6 do `deploy.md` ficaram como a `05-devops-sre.md` deixou; só o campo "Versão" e o "Atualizado em" eram desta etapa.

## Pendências

- M-a (médio, RF-20, dado pessoal): bloqueia a primeira publicação até o pedido 0009 ou o aceite de Fabiano e da `gestao-riscos` (herdada da `04-maestro.md`).
- B-a e B-b, e o risco do M-3 no runtime do Next 16, para a Parada 3 (registrados no CHANGELOG).
- Nenhuma divergência entre o código descrito pelas entregas e o manual que exija reabrir a cadeia.

## Comandos executados

Nenhum.

## Critério de pronto atendido

- [x] (06) o `CHANGELOG.md` tem a entrada da versão do `package.json`, com o que foi corrigido e as pendências abertas
- [x] (06) todo trecho de `README.md` e `docs/manual-tecnico/` que cita a função, o arquivo ou o RF corrigido descreve o código depois da correção (trechos achados com Grep e listados na entrega)
- [x] os links internos apontam para arquivos que existem
