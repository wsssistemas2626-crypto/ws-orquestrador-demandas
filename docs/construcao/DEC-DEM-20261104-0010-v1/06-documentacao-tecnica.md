---
pedido: DEC-DEM-20261104-0010-v1
etapa: 06-documentacao
agente: documentacao-tecnica
leu: [contrato-passagem.md, pedido.json, 01-qa-funcional.md, 02-tech-lead.md, 03-engenheiro-backend.md, 04-qa-automacao.md, 04-maestro.md, 05-devops-sre.md, CHANGELOG.md, README.md, docs/manual-tecnico/README.md, docs/manual-tecnico/02-acesso-e-seguranca.md, docs/manual-tecnico/03-demandas.md, docs/manual-tecnico/04-versoes-e-decisao.md, docs/manual-tecnico/06-agentes-de-ia.md, docs/manual-tecnico/08-painel.md, docs/manual-tecnico/09-referencia-api.md, docs/operacao/deploy.md, package.json, src/lib/reduzir-erro.ts, src/lib/sentry.ts, src/lib/console-saneado.ts, src/lib/log.ts, src/components/rotulos.ts, "src/app/api/demandas/[id]/pacotes-decisao/route.ts"]
status: pronto
proximo: maestro
devolvido_para: null
---
## Entrega

Documentação da 0.1.9 (`package.json:3`). O texto descreve o código do ramo: conferi `reduzir-erro.ts`, `sentry.ts`,
`console-saneado.ts`, `log.ts` (`normalizarErro`), `rotulos.ts` e a rota `POST` de `pacotes-decisao`. Também conferi
que os quatro arquivos de teste novos existem. Os trechos foram achados com Grep. Os termos procurados foram
`reduzirErro`, `lerCode`, `erroJaReduzido`, `capturarErro`, `console saneado`, `digest`, `demanda_final`,
`MOTIVO_IGNORADO`, `nomesDaDemanda`, `criarPacoteDecisao`, `extras`, `especificacaoId`, `classe`, `Sentry`, `0.1.8`
e `0.1.9`.

### Trechos conferidos e o que mudou

| Arquivo:linha (depois da edição) | O que mudou |
|---|---|
| `CHANGELOG.md:6-135` | Seção nova `0.1.9 — 2026-11-04`. Tem o que mudou nos cinco baixos (B-1 e B-3 do 0009, B-a do 0008, B-1 e B-5 do 0006), a convenção de `CLASSES_DO_PROJETO`, os testes e a versão. Traz também as verificações (3.999 testes, e2e 143 de 143 três vezes, `pnpm build`) e as pendências abertas: B-1 a B-5 da revisão do 0010, o que as etapas registraram e o que segue aberto das versões anteriores |
| `README.md:5-6` | Versão 0.1.9 e data 04/11/2026 |
| `README.md:139-142` | Regra nova em "Regras que valem para quem mexe no código": classe de erro nova termina em `Error`/`Exception` ou entra em `CLASSES_DO_PROJETO`. Diz também que o teste estático reprova quando falta, com link para o cap. 02 |
| `docs/manual-tecnico/README.md:5-6` | Versão 0.1.9, com os quatro comportamentos que mudam, e data |
| `docs/manual-tecnico/02-acesso-e-seguranca.md:5` | "Atualizado em" com a 0.1.9 |
| `docs/manual-tecnico/02-acesso-e-seguranca.md:8` | Fontes: acrescentei `src/lib/reduzir-erro.ts` e `src/lib/sentry.ts` |
| `docs/manual-tecnico/02-acesso-e-seguranca.md:104-108` | `erroJaReduzido` passa a citar `classeAceita` no lugar de "formato de identificador" |
| `docs/manual-tecnico/02-acesso-e-seguranca.md:109-124` | Item novo: a regra da classe e do `code`. Cobre `DIGITOS_DEMAIS`, `classeAceita`, a lista `CLASSES_DO_PROJETO`, a convenção e o teste estático `classes-de-erro.test.ts`. Separa o `Error` com `name` fora da regra (sai `Error`) do objeto já reduzido (sai `desconhecido`), como faz `normalizarErro` |
| `docs/manual-tecnico/02-acesso-e-seguranca.md:125-128` | Sentry: a marca por objeto (`WeakSet`) em `capturarErro`. Vale nas duas ordens e é por objeto, não por mensagem |
| `docs/manual-tecnico/02-acesso-e-seguranca.md:154-159` | Console saneado: a conferência do B-a no fonte do Next, com o route handler sem `digest` e a página com `digest`. Diz que o caso real é o Better Auth e que o log não é deduplicado |
| `docs/manual-tecnico/02-acesso-e-seguranca.md:160-175` | Limites: saíram o limite antigo do B-1 do 0009 e o do B-a, que fecharam. Entraram os B-1, B-2, B-4 e B-5 da revisão do 0010 e a conferência parcial do Next (middleware/proxy e Server Action). O "B-2" antigo passou a "B-2 da 0.1.6", para não confundir com o B-2 da revisão do 0010 |
| `docs/manual-tecnico/04-versoes-e-decisao.md:5` | "Atualizado em" com a 0.1.9 |
| `docs/manual-tecnico/04-versoes-e-decisao.md:26-33` | Parágrafo novo: nos três `POST`, os nomes são lidos antes do serviço. Diz o que acontece na falha (500, nada gravado) e que 404, 409, 429 e 400 não mudam. Registra o limite B-3 da revisão do 0010 |
| `docs/manual-tecnico/04-versoes-e-decisao.md:85-91` | RF-10: o teste estático `pacote-sem-extras.test.ts` e o que ele reprova, com o limite B-5 |
| `docs/manual-tecnico/06-agentes-de-ia.md:5` | "Atualizado em" com a 0.1.9 |
| `docs/manual-tecnico/06-agentes-de-ia.md:52-57` | O trecho "`demanda_final` ainda não tem rótulo (B-5 da 0.1.5)" virou a lista dos quatro rótulos de `MOTIVO_IGNORADO` e o texto exato do histórico, conferido em `rotulos.ts:107-111,164-169,223-225` |
| `docs/manual-tecnico/09-referencia-api.md:5` | "Atualizado em" com a 0.1.9 |
| `docs/manual-tecnico/09-referencia-api.md:130-132` | Parágrafo novo: os três `POST` leem os nomes antes de gravar, e repetir depois do 500 cria uma versão só |
| `docs/operacao/deploy.md:5` | Versão 0.1.9 (o campo que a `05-devops-sre.md` deixou para esta etapa) |
| `docs/operacao/deploy.md:10` | "Atualizado em" com a entrada da `documentacao-tecnica` |
| `docs/operacao/deploy.md:288-291` | Corrigi o parêntese da seção 8. A classe fora da regra sai `Error` no log e no Sentry, e `desconhecido` só no log, quando o erro já chega reduzido (`log.ts:59-68`). O texto da 05 dizia "`desconhecido` no log" para todo caso. É só texto: não exige mudar `Dockerfile` nem workflow |

### Conferidos sem mudança

- `docs/manual-tecnico/03-demandas.md:82-90`: cita `nomesDaDemanda` como utilitário compartilhado e o M-1 do 0009,
  que segue aberto. Continua certo.
- `docs/manual-tecnico/08-painel.md:10-11,56-58`: os rótulos vêm de `rotulos.ts`, e a tela de erro não mostra
  `digest`. Continua certo.
- `docs/manual-tecnico/02-acesso-e-seguranca.md:134-141` (exemplo do `erro_requisicao`): `erroId` segue
  `FORMATO_ERRO_ID`, que não mudou, e `ErroLeituraSessao` está em `CLASSES_DO_PROJETO`. Continua certo.
- `docs/manual-tecnico/07-worker-avisos-retencao.md:55-58` (`aviso_email_falhou` no Sentry): `ErroEnvioEmail` segue
  aceito pela lista. Continua certo.
- `docs/manual-tecnico/09-referencia-api.md:34,37,40` (tabela das rotas): o 201 com a vista mínima não mudou.
- `docs/operacao/deploy.md:125,197-210`: são as seções 4 e 6 da `05-devops-sre.md` e batem com o código.
- `CHANGELOG.md`, seções 0.1.5 a 0.1.8: são o registro de cada versão. As pendências que fecharam agora estão marcadas
  como fechadas na seção 0.1.9, e o texto antigo não foi reescrito.

### Links internos

O link novo do `README.md:142` aponta para
`docs/manual-tecnico/02-acesso-e-seguranca.md#log-e-sentry-rnf-10-c-20-c-21`. A âncora é a mesma que o
`deploy.md:287` e o `08-painel.md:58` já usam. O link novo do `09-referencia-api.md:132` aponta para
`04-versoes-e-decisao.md`. Os dois arquivos existem. A seção do `CHANGELOG.md` não tem link.

## Decisões tomadas

- A convenção de `CLASSES_DO_PROJETO` foi para o `README.md` ("Regras que valem para quem mexe no código") e para o cap. 02 do manual, que são os lugares do repositório onde quem mexe no código procura regra. O `padrao-tecnico.md` da estruturaAutonoma está fora da minha Pode, então fica como pendência.
- A regra do log foi descrita como `normalizarErro` a aplica (`log.ts:59-68`): um `Error` sai `Error`, e um objeto já reduzido sai `desconhecido`. A nota da 03 e o texto da 05 no `deploy.md` simplificavam isso. Corrigi o `deploy.md`, que está na minha Pode e não pede mudança de `Dockerfile` nem de workflow.
- As pendências fechadas (B-1 e B-3 da 0.1.8, B-a da 0.1.7, B-1 e B-5 da 0.1.5) ficaram registradas na seção 0.1.9 e não foram apagadas das seções antigas, que são o histórico de cada versão.
- O B-4 da 0.1.5 aparece uma vez só, em "Seguem abertas", com a nota de que é de interface e vai num pedido próprio.

## Pendências

- Para pedido próprio: registrar a convenção de `CLASSES_DO_PROJETO` no `padrao-tecnico.md` da estruturaAutonoma (02, 03, 04-maestro). Hoje ela está só no `README.md` e no manual deste sistema.
- Para a Parada 3 do maestro: homologação, `ensaiar-rollback` e o CI do PR (`05-devops-sre.md`). As pendências de produto (B-1 a B-5 da revisão do 0010, M-1 do 0009 no pedido 0011) estão no `CHANGELOG.md`, seção 0.1.9.

## Comandos executados

Nenhum.

## Critério de pronto atendido

- [x] (06) o `CHANGELOG.md` tem a entrada da versão do `package.json`, com o que foi corrigido e as pendências abertas
- [x] (06) todo trecho de `README.md` e `docs/manual-tecnico/` que cita a função, o arquivo ou o RF corrigido descreve o código depois da correção (trechos achados com Grep e listados na entrega)
- [x] os links internos apontam para arquivos que existem
