---
pedido: DEC-DEM-20261103-0009-v1
etapa: 06-documentacao
agente: documentacao-tecnica
leu: [contrato-passagem.md, 02-tech-lead.md, 03-engenheiro-backend.md, 04-qa-automacao.md, 04-maestro.md, 05-devops-sre.md, CHANGELOG.md, README.md, docs/manual-tecnico/README.md, docs/manual-tecnico/02-acesso-e-seguranca.md, docs/manual-tecnico/03-demandas.md, docs/manual-tecnico/06-agentes-de-ia.md, docs/manual-tecnico/09-referencia-api.md, docs/operacao/deploy.md]
status: pronto
proximo: maestro
devolvido_para: null
---
## Entrega

Documentação da 0.1.8 (M-a e B-b da revisão do 0008). Trechos achados com Grep (`0\.1\.7`, `M-a`, `minimiz`,
`normalizarErro`, as três vistas, `primeira publicação`, `bloque`) em `README.md`, `docs/manual-tecnico/` e
`docs/operacao/`; ao fim, Grep por `M-a, aberto`, `Ainda saem sem minimizar`, `ainda não minimiza` e
`bloqueia a primeira publicação` não acha mais nada.

### Trechos conferidos e o que mudou

| Arquivo:linha | O que mudou |
|---|---|
| `CHANGELOG.md:6-108` | Seção nova `## 0.1.8 — 2026-11-03`, no estilo da 0.1.7: fim do bloqueio da primeira publicação (exige 0.1.8 ou posterior), o que mudou (M-a com os campos de DEC, ESP e RSK, sete leituras e 201 dos três `POST`; B-b com `erroJaReduzido`), testes, versão, documentação, verificações (3.918 de 3.918, e2e 143 de 143 três vezes, `pnpm build`, `docker build` adiado à homologação) e pendências abertas (M-1 risco residual, B-1, B-3, observação da 04-regressao e as herdadas). A seção 0.1.7 ficou como estava (registro histórico) |
| `README.md:5` | Versão 0.1.7 para 0.1.8 |
| `docs/manual-tecnico/README.md:5` | Versão do sistema 0.1.8 e os dois comportamentos que mudam |
| `docs/manual-tecnico/README.md:81` | Glossário "Vista mínima": texto livre minimizado também em ESP, RSK e DEC e no 201, desde a 0.1.8 |
| `docs/manual-tecnico/02-acesso-e-seguranca.md:5` | "Atualizado em" com a 0.1.8 |
| `docs/manual-tecnico/02-acesso-e-seguranca.md:75-79` | Saiu "ainda saem sem minimizar (M-a, aberto, bloqueia a primeira publicação)"; entrou a minimização das três vistas nas sete leituras e no 201, e o limite do M-1 do 0009 como risco residual |
| `docs/manual-tecnico/02-acesso-e-seguranca.md:104-107` | B-b: `normalizarErro` reduz objeto que não é `Error` a `{ "classe": "desconhecido" }`, `code` por `lerCode`, exceção `erroJaReduzido` |
| `docs/manual-tecnico/02-acesso-e-seguranca.md:135-138` | Limites conhecidos passam a citar 0.1.6 à 0.1.8 e ganham o B-1 do 0009 |
| `docs/manual-tecnico/03-demandas.md:5` | "Atualizado em" com a 0.1.8 |
| `docs/manual-tecnico/03-demandas.md:82-90` | Saiu o limite "M-a, aberto, bloqueia a primeira publicação"; entrou o M-a fechado na 0.1.8, os utilitários compartilhados de `consultas.ts` e o M-1 do 0009 como limite que não bloqueia |
| `docs/manual-tecnico/06-agentes-de-ia.md:5` | "Atualizado em" com a 0.1.8 |
| `docs/manual-tecnico/06-agentes-de-ia.md:123-127` | RF-20: saiu "Fora da demanda, a API ainda não minimiza"; entrou a minimização de DEC, ESP e RSK desde a 0.1.8 e o limite do M-1 |
| `docs/manual-tecnico/09-referencia-api.md:5` | "Atualizado em" com a 0.1.8 |
| `docs/manual-tecnico/09-referencia-api.md:34,37,40` | Resposta 201 dos três `POST` de criação: "(ao agente, a vista mínima)" |
| `docs/manual-tecnico/09-referencia-api.md:111-130` | Saiu "Ainda saem sem minimizar … (M-a, aberto)"; entrou a lista dos campos minimizados de DEC, ESP e RSK, nulos e ausentes preservados, campos iguais nos dois atores, Pedido com o original e o limite do M-1 |
| `docs/operacao/deploy.md:5` | Campo "Versão" 0.1.7 para 0.1.8 (deixado pela 05) |
| `docs/operacao/deploy.md:10` | "Atualizado em" com a versão 0.1.8 pela `documentacao-tecnica` |

Conferidos sem mudança: `docs/operacao/deploy.md:104-110` e `:197-206` (seções 4 e 6, já da 05, coerentes com o
código descrito nas entregas); `README.md` não cita minimização nem bloqueio de publicação. Links novos apontam para
`../../CHANGELOG.md` e `09-referencia-api.md#exemplo-ler-demanda-com-token-de-agente`, que existem.

## Decisões tomadas

- A seção 0.1.7 do CHANGELOG não foi reescrita: é registro do que valia naquela versão; a 0.1.8 diz que o bloqueio saiu.
- O M-1 do 0009 aparece como risco residual que não bloqueia, como na 04-maestro e no `deploy.md` da 05.
- Contagem de testes do `log.test.ts` como quatro: três da 03 e um da 04-regressao.

## Pendências

- Para Fabiano e a `gestao-riscos`: aceitar ou não o M-1 do 0009 antes da primeira publicação.
- Para pedido futuro: B-1 e B-3 do 0009.
- Para a Parada 3: homologação (imagem da 0.1.8), `ensaiar-rollback` e CI do PR.

## Comandos executados

Nenhum.

## Critério de pronto atendido

- [x] (06) o `CHANGELOG.md` tem a entrada da versão do `package.json`, com o que foi corrigido e as pendências abertas
- [x] (06) todo trecho de `README.md` e `docs/manual-tecnico/` que cita a função, o arquivo ou o RF corrigido descreve o código depois da correção (trechos achados com Grep e listados na entrega)
- [x] os links internos apontam para arquivos que existem
