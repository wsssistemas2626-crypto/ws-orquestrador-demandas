---
pedido: DEC-DEM-20261104-0012-v1
etapa: 06-documentacao
agente: documentacao-tecnica
leu: [contrato-passagem.md, pedido.json, 01-qa-funcional.md, 02-tech-lead.md, 03-engenheiro-backend.md, 04-qa-automacao.md, 04-maestro.md, 05-devops-sre.md, passagens.jsonl, package.json, CHANGELOG.md, README.md, docs/manual-tecnico/README.md, docs/manual-tecnico/02-acesso-e-seguranca.md, docs/manual-tecnico/03-demandas.md, docs/manual-tecnico/05-pedido-de-construcao.md, docs/manual-tecnico/06-agentes-de-ia.md, docs/manual-tecnico/08-painel.md, docs/manual-tecnico/09-referencia-api.md, docs/operacao/deploy.md, src/modules/dados-pessoais/detectores.ts, src/modules/dados-pessoais/minimizar.ts, src/components/dados-da-demanda.ts, src/lib/reduzir-erro.ts, src/lib/erros.ts, src/lib/sentry.ts, src/lib/console-saneado.ts, "src/lib/log.ts, src/instrumentation.ts, sentry.test.ts e minimizar.test.ts (por busca)"]
status: pronto
proximo: maestro
devolvido_para: null
---
## Entrega

Entrada da 0.1.11 no `CHANGELOG.md`, versão no `README.md`, no manual técnico e no `deploy.md`, e os trechos do manual
que descrevem o detector de e-mail, as bordas do nome, a redução de erro e o aviso e a dica, reescritos pelo código do
ramo (`package.json` em `0.1.11`). Os trechos foram achados com Grep (`0\.1\.10`, `grudad`, `reduzirErro`, `detector`,
`escapa da`, `C-28`) e conferidos contra `detectores.ts`, `minimizar.ts`, `reduzir-erro.ts`, `erros.ts`, `sentry.ts`,
`console-saneado.ts` e `dados-da-demanda.ts`.

### Trechos conferidos e o que mudou

| Arquivo:linha (depois da edição) | O que mudou |
|---|---|
| `CHANGELOG.md:6-162` | Entrada nova `0.1.11 — 2026-11-04`: M-a (âncora, `DetectorDeEmail` com a tentativa sticky, e-mail colado no fim de outro continua virando dois marcadores, tempos medidos), B-2 (acento e NFD no usuário; domínio segue ASCII), B-1 (`[\s_]+` no nome completo, `haFronteira` nas partes, exemplos, falsos positivos aceitos `RosaTech` e `MariAna`), B-3 (`reduzirErro`, `lerCode`, `erroJaReduzido` e `mapearErro` sem lançar; `ehErro` e `lerDigest`), B-2 da revisão de segurança (`stack` lido uma vez), B-4 (frases inteiras, com "dos, das e Júnior"), testes, versão, documentação, verificações (4.288 testes, e2e 143 de 143 três vezes seguidas, as duas voltas da 03) e pendências (B-a, I-1, B-3, B-4 e T11 da `04-maestro.md`; revisão da `ux-ui-design`; as herdadas, com o que sobra do M-1 do 0009 atualizado) |
| `README.md:5` | Versão 0.1.10 → 0.1.11 |
| `docs/manual-tecnico/README.md:5` | Versão do sistema 0.1.11, com os cinco comportamentos que mudam |
| `docs/manual-tecnico/README.md:83` | Glossário, "Parte do nome": desde a 0.1.11, também grudada em número, `_` ou CamelCase (`haFronteira`) |
| `docs/manual-tecnico/02-acesso-e-seguranca.md:5` | "Atualizado em" com a 0.1.11 |
| `docs/manual-tecnico/02-acesso-e-seguranca.md:80-84` | Vista mínima: a parte grudada é trocada; o que sobra passou a ser minúscula, toda em maiúscula sem separador, `AnaBelax`, nome antigo e outras pessoas (saiu "nome grudado") |
| `docs/manual-tecnico/02-acesso-e-seguranca.md:101-103` | Proteção das rotas: `mapearErro` não lança; Proxy ou getter que lança vira 500 `erro_interno` |
| `docs/manual-tecnico/02-acesso-e-seguranca.md:128-136` | Item novo: as funções de `reduzir-erro.ts` nunca lançam (`reduzirErro`, `lerCode`, `erroJaReduzido`, `ehErro`, `lerDigest`) |
| `docs/manual-tecnico/02-acesso-e-seguranca.md:144-150` | Sentry: saiu "Se `reduzirErro` ou o envio lançarem"; só o envio pode falhar; `quadrosDaPilha` lê `e.stack` uma vez |
| `docs/manual-tecnico/02-acesso-e-seguranca.md:177-180` | Console saneado e `onRequestError` com `ehErro` e `lerDigest`; Proxy cujo protótipo não se lê sai sem `erro` |
| `docs/manual-tecnico/02-acesso-e-seguranca.md:187-192` | Limites conhecidos: saiu o B-3 do 0011 (fechado); entrou o B-4 da revisão do 0012 (`digest: undefined` explícito) |
| `docs/manual-tecnico/03-demandas.md:5`, `:90-98` | "Atualizado em"; parágrafo novo da parte grudada; o que sobra do M-1 atualizado como no cap. 02 |
| `docs/manual-tecnico/05-pedido-de-construcao.md:5`, `:8`, `:29-34` | "Atualizado em"; `detectores.ts` nas fontes; passo 7 do RF-22 com o detector linear e com acento, e o resultado do reteste (nenhum bloqueio da 0.1.10 perdido) |
| `docs/manual-tecnico/06-agentes-de-ia.md:5` | "Atualizado em" com a 0.1.11 |
| `docs/manual-tecnico/06-agentes-de-ia.md:114-122` | Itens 2 e 3 do RF-20: detectores compartilhados com o Pedido; nome completo com `_` e borda só de letra e marca |
| `docs/manual-tecnico/06-agentes-de-ia.md:137-145` | Regras da troca: `haFronteira` (o que é e o que não é fronteira) e o recomeço depois de parte recusada; saiu "letra, marca, número e `_` colados impedem a troca" |
| `docs/manual-tecnico/06-agentes-de-ia.md:153-183` | Tabela do que é trocado desde a 0.1.11, o que sobra (minúscula, toda em maiúscula sem separador, `AnaBelax`, nome antigo, outras pessoas) e os falsos positivos de CamelCase |
| `docs/manual-tecnico/06-agentes-de-ia.md:185-217` | Seção nova "Detector de e-mail": acento e NFD, custo linear, e-mail colado, separador colado, o que é coberto (sete caminhos do `RegExp`) e o que sobra (I-1 e B-a) |
| `docs/manual-tecnico/06-agentes-de-ia.md:219-233` | Na tela: frases inteiras da dica e do aviso da 0.1.11, com a origem de "3 letras" e das partículas |
| `docs/manual-tecnico/06-agentes-de-ia.md:242-244` | Resumo do que sobra do M-1, igual à lista |
| `docs/manual-tecnico/08-painel.md:5`, `:56-63` | "Atualizado em"; pendência do B-4 trocada pelo texto novo, ainda à espera da `ux-ui-design` |
| `docs/manual-tecnico/09-referencia-api.md:5`, `:132-135`, `:203` | "Atualizado em"; exemplo da parte grudada e o que sobra; `erro_interno` também para erro que lança ao ser lido |
| `docs/operacao/deploy.md:5` | Versão 0.1.10 → 0.1.11 |
| `docs/operacao/deploy.md:10` | "Atualizado em" com a entrada da `documentacao-tecnica` do pedido 0012 |

Conferidos e mantidos sem mudança, porque já descrevem o código da 0.1.11: `deploy.md:112-121` (seção 4, risco
residual), `:203-221` (seção 6, rollback) e `:331-340` (seção 8, passo 2), todos da `05-devops-sre.md`;
`docs/manual-tecnico/01-arquitetura.md:49` (módulo `dados-pessoais`, sem detalhe de regra).

## Decisões tomadas

- Escrevi a entrada do `CHANGELOG.md` a partir das entregas 01 a 05 e do código. O texto sugerido na 1ª volta da 03
  não existe mais: a 2ª volta regravou `03-engenheiro-backend.md`, e eu não tenho Bash para ler a versão anterior pelo
  git. A Pendência 2 da 2ª volta (e-mail colado vira dois marcadores; "dos, das e Júnior") está atendida.
- Citei "dos, das e Júnior", e não "da, dos e Júnior" do critério 5, porque é o que o código diz
  (`dados-da-demanda.ts:34`), e registrei a razão (B-1 da revisão de segurança).
- I-1: a `04-maestro.md` lista também "`test` encadeado" entre os caminhos sem a tentativa extra. Pelo código, `test`
  no próprio detector passa pelo `exec` da subclasse, e a 04-regressao o conferiu a partir de cada `lastIndex`. No
  manual descrevi só o que o código mostra (`split` e `new RegExp(detector)`); no CHANGELOG, a afirmação do reteste e a
  leitura do código, lado a lado.
- O B-a (`é@b.cc@b.cc`) foi descrito como "sobra `@domínio`", porque o comentário de `detectores.ts:22-23` afirma
  cobertura total. A divergência entre comentário e comportamento fica nas pendências, sem mexer em `src/`.
- Nas linhas de tempo, usei as medições das entregas (200 ms, 1 s, 66 ms em 1 milhão de caracteres), sem medir nada.
- Não mudei o "Atualizado em" do `README.md` nem do manual: a data já é 04/11/2026.

## Pendências

- Para a Parada 3: o comentário de `detectores.ts:22-23` diz que todo caractere coberto pela regex da 0.1.10 continua
  coberto, e o B-a da revisão mostra que não, com dois `@` no domínio e acento antes do primeiro. O manual descreve o
  comportamento (cap. 06, "Detector de e-mail"); o comentário fica para o pedido futuro do B-a.
- Para a Parada 3: a divergência do I-1 sobre o `test` encadeado (decisão acima) pode ser fechada no mesmo pedido
  futuro, junto com o comentário da classe `DetectorDeEmail`.
- Os textos do aviso e da dica continuam à espera da revisão da `ux-ui-design` (cap. 08).

## Comandos executados

Nenhum.

## Critério de pronto atendido

- [x] (06) o `CHANGELOG.md` tem a entrada da versão do `package.json`, com o que foi corrigido e as pendências abertas
- [x] (06) todo trecho de `README.md` e `docs/manual-tecnico/` que cita a função, o arquivo ou o RF corrigido descreve o código depois da correção (trechos achados com Grep e listados na entrega)
- [x] os links internos apontam para arquivos que existem
