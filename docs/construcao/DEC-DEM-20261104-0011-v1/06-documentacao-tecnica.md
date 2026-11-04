---
pedido: DEC-DEM-20261104-0011-v1
etapa: 06-documentacao
agente: documentacao-tecnica
leu: [contrato-passagem.md, pedido.json, 01-qa-funcional.md, 02-tech-lead.md, 03-engenheiro-backend.md, 04-qa-automacao.md, 04-maestro.md, 05-devops-sre.md, CHANGELOG.md, README.md, docs/manual-tecnico/README.md, docs/manual-tecnico/02-acesso-e-seguranca.md, docs/manual-tecnico/03-demandas.md, docs/manual-tecnico/04-versoes-e-decisao.md, docs/manual-tecnico/06-agentes-de-ia.md, docs/manual-tecnico/08-painel.md, docs/manual-tecnico/09-referencia-api.md, docs/operacao/deploy.md, src/modules/dados-pessoais/minimizar.ts, src/components/dados-da-demanda.ts, src/lib/reduzir-erro.ts, src/lib/sentry.ts, "src/app/api/demandas/[id]/especificacoes/route.ts", "src/app/api/demandas/[id]/pacotes-decisao/route.ts", src/modules/pacotes-decisao/criar.ts (1-125), src/modules/agentes/entrada-agente.ts (Grep)]
status: pronto
proximo: maestro
devolvido_para: null
---
## Entrega

Notas da 0.1.10 no `CHANGELOG.md`. Também conferi e ajustei os trechos de `README.md`, `docs/manual-tecnico/` e do
cabeçalho de `docs/operacao/deploy.md` que citam a minimização do nome (RF-20), a dica e o aviso da tela, a ordem dos 3
`POST`, `reduzirErro` e `capturarErro`. Cada trecho foi achado com Grep (`nome removido`, `minimiz`, `dicaNome`,
`avisoMinimizacao`, `nomesDaDemanda`, `nomesDoSolicitante`, `travarDemanda`, `reduzirErro`, `capturarErro`,
`atual e completo`, `parcial`, `0.1.9`) e comparado com o código do ramo (`minimizar.ts`, `dados-da-demanda.ts`, as
rotas e os serviços, `reduzir-erro.ts`, `sentry.ts`).

### O que a regra nova troca e o que sobra (como ficou escrito no cap. 06, RF-20)

- **Troca:** o nome completo, sem diferença de caixa nem de acento (nos dois sentidos, também em NFD). Troca também
  cada parte do nome com 3 letras ou mais, fora de `PARTICULAS_DO_NOME`, quando no texto ela começa por maiúscula.
  Exemplos: `a Joana pediu`, `JOANA`, `Conceicao` para `Conceição`. O nome completo vira um marcador só, e nada é
  trocado dentro de marcador.
- **Sobra:** a parte escrita toda em minúscula (`a joana pediu`), risco aceito no RSK. O nome completo em minúscula
  continua trocado, pelo código. Sobram também o nome grudado em número, `_` ou CamelCase (`Joana2`,
  `Joana_Ficticia`, `@JoanaFicticia`, B-1 da revisão do 0011), o nome antigo de antes de uma edição (a troca usa só o
  `solicitanteNome` atual) e o nome de outras pessoas (J-03).
- **Falsos positivos aceitos:** palavra com maiúscula igual a uma parte (`Dias depois`, `Paulo` em `São Paulo`). Também
  a parte em comum com o nome de outra pessoa (`Bruno [nome removido] Rocha`). O hífen é borda (`Ana-Clara` vira
  `[nome removido]-[nome removido]`).
- A pessoa e o Pedido de Construção continuam com o original.

### Trechos conferidos (arquivo:linha, na versão gravada) e o que mudou

| Arquivo:linha | Antes | Agora |
|---|---|---|
| `CHANGELOG.md:6-139` | sem entrada da 0.1.10 | entrada `0.1.10 — 2026-11-04`: o que mudou (M-1 com a regra, o que sobra e os falsos positivos; dica e aviso; B-3, B-2 e B-4 do 0010; testes, com os 6 esperados alterados; versão; documentação), verificações e pendências abertas (M-a e B-1 a B-4 da `04-maestro.md`, relógio real da 04, pedido 0012, o que sobra do M-1 e as herdadas). Baseada no texto da Pendência 1 da `03-engenheiro-backend.md` |
| `README.md:5` | Versão 0.1.9 | Versão 0.1.10. O README não tem trecho sobre RF-20, a dica nem os 3 `POST`. A regra de `CLASSES_DO_PROJETO` (`:139-142`) segue certa com o B-2 |
| `docs/manual-tecnico/README.md:5` | versão 0.1.9 e os quatro comportamentos dela | 0.1.10 e os cinco comportamentos novos |
| `docs/manual-tecnico/README.md:83` | sem o termo | glossário: "Parte do nome" (`partesDoNome`, `PARTICULAS_DO_NOME`) |
| `docs/manual-tecnico/06-agentes-de-ia.md:5` | atualizado na 0.1.9 | entrada da 0.1.10 no RF-20 |
| `docs/manual-tecnico/06-agentes-de-ia.md:116-158` | item 3: "o nome do solicitante, quando informado, vira `[nome removido]`" | item 3: nome completo sem caixa e sem acento. Item 4: as partes. Regras de `partesDoNome` e de `PARTICULAS_DO_NOME`, regras da troca (maiúscula, ordem, borda, marcador, texto não normalizado), exemplo fictício, o que troca, o que sobra e os falsos positivos |
| `docs/manual-tecnico/06-agentes-de-ia.md:160-166` | sem menção à tela | dica e aviso novos (`TEXTOS_DEMANDA`), com o texto antigo citado |
| `docs/manual-tecnico/06-agentes-de-ia.md:174-177` | "só o nome atual e completo do solicitante é trocado; nome antigo ou parcial [...] em claro" | as partes valem em todos os lugares da API; o que sobra remete à lista do RF-20 |
| `docs/manual-tecnico/03-demandas.md:5` | atualizado na 0.1.8 | entrada da 0.1.10 no RF-06 |
| `docs/manual-tecnico/03-demandas.md:87-94` | "só o nome atual e completo [...] nome antigo ou escrito pela metade sai em claro" | partes trocadas desde a 0.1.10; o que sobra: nome antigo, parte em minúscula, nome grudado, nome de outras pessoas |
| `docs/manual-tecnico/02-acesso-e-seguranca.md:5` | atualizado na 0.1.9 | entrada da 0.1.10 |
| `docs/manual-tecnico/02-acesso-e-seguranca.md:77-82` | limite "só o nome atual e completo" | partes desde a 0.1.10, 201 com o nome da demanda travada, e o que sobra |
| `docs/manual-tecnico/02-acesso-e-seguranca.md:121-124` | sem o B-2 | `e.name` lido uma vez, usado só se for texto aceito; o que sai como `Error` |
| `docs/manual-tecnico/02-acesso-e-seguranca.md:133-135` | sem o B-4 | marca do `WeakSet` só depois de `captureException`, e nova tentativa se algo lançar |
| `docs/manual-tecnico/02-acesso-e-seguranca.md:167-174` | limites: "`reduzirErro` não confere se `e.name` é string" e "a marca [...] é gravada antes de `reduzirErro`" | os dois limites saíram, porque foram fechados. Entrou o B-3 da revisão do 0011 (getter que lança). Ficou o registro do objeto reaproveitado |
| `docs/manual-tecnico/04-versoes-e-decisao.md:5` | atualizado na 0.1.9 | entrada da 0.1.10 no RF-10 |
| `docs/manual-tecnico/04-versoes-e-decisao.md:26-41` | a rota lê `nomesDaDemanda` **antes** do serviço; limite B-3 do 0010 (nome lido fora da transação) | a rota chama `criarXComNomes` (4 argumentos), e os nomes saem de `nomesDoSolicitante` sobre a linha travada, no fim da transação. A falha não grava nada. 404, 409, 429 e 400 iguais. `criarX` sem mudança para o worker e as Server Actions. Os `GET` seguem com `nomesDaDemanda`. O limite saiu |
| `docs/manual-tecnico/04-versoes-e-decisao.md:94` | guarda estática só sobre `criarPacoteDecisao` | cobre também `criarPacoteDecisaoComNomes` |
| `docs/manual-tecnico/09-referencia-api.md:5` | atualizado na 0.1.9 | entrada da 0.1.10 |
| `docs/manual-tecnico/09-referencia-api.md:127-139` | "Limite: só o nome atual e completo"; os 3 `POST` "leem esses nomes antes de gravar" | exemplo fictício da parte (`A Joana pediu` vira `A [nome removido] pediu`), o que sobra com link ao cap. 06, nomes do 201 tirados da linha travada. O exemplo da 0.1.7 (`:103-107`) foi conferido e continua certo |
| `docs/manual-tecnico/08-painel.md:5` e `:56-60` | sem a dica | pendência de interface: os textos novos esperam a `ux-ui-design`, e o B-4 da revisão do 0011 fica para ela |
| `docs/operacao/deploy.md:5` e `:10` | Versão 0.1.9 | Versão 0.1.10 e registro desta etapa no "Atualizado em". As seções 4, 6 e 8 são da 05 e foram conferidas: batem com o código e com o CHANGELOG |

Conferidos sem mudança: `docs/manual-tecnico/03-demandas.md:45` (modo agente: o nome vai para `entrada_pendente`, e
a entrada do orquestrador minimiza com ele, `entrada-agente.ts:195`), `:72-86` (vista mínima, regra de `minimizarValor`);
`docs/manual-tecnico/05-pedido-de-construcao.md:61` (o Pedido continua sem o nome do solicitante e com o texto
original); `docs/manual-tecnico/01-arquitetura.md:49`.

## Decisões tomadas

- A seção 0.1.10 partiu do texto da Pendência 1 da 03, com mais detalhe. Escrevi a regra das partes, a lista de
  partículas e os exemplos fictícios, porque é isso que quem lê precisa para prever o que o agente recebe.
- Na seção 0.1.10, escrevi que o nome completo em minúscula continua trocado. Conferi em `padraoDoNome`, que usa a flag
  `giu` sem conferir maiúscula. Assim, "nome todo em minúscula" não é lido como perda do comportamento antigo; o que
  sobra é a **parte** em minúscula.
- Os exemplos com `Bruno Dias Lima` e `Joana Ficticia` foram conferidos à mão contra `minimizar.ts` (bordas, maiúscula e
  ordem). São fictícios e vêm dos casos da 01 e da 02.
- O D-4 está descrito pelo código, e não pelo esperado da 01: o getter que muda devolve o valor da leitura única quando
  ele passa na regra (desvio 1 da 03).
- Em `04-versoes-e-decisao.md`, os nomes "no fim do corpo da transação" seguem o código e o desvio 2 da 03. A 02 dizia
  "logo depois de `travarDemanda`".
- Os limites fechados (B-2 e B-4 no cap. 02, B-3 no cap. 04) foram tirados das listas de limites, e não marcados como
  obsoletos: o texto novo diz o que vale desde a 0.1.10. As entradas antigas do CHANGELOG ficaram como estavam, porque
  são registro de versão.
- A dica e o aviso entraram no cap. 06 (RF-20) e nas pendências do cap. 08. O cap. 08 não tinha os textos de T04 e já
  registra ali os textos que esperam a `ux-ui-design`.
- O `deploy.md` só teve a versão e o cabeçalho mudados: o resto é da 05 e não contradiz o código.

## Pendências

- Para a Parada 3 (Fabiano), herdadas da `04-maestro.md` e registradas no CHANGELOG: um pedido curto com o M-a (regex
  de e-mail, já na `main`) e os baixos B-1 a B-4 da revisão do 0011, e o pedido 0012 (Pedido de Construção sem nome de
  pessoa).
- Para a `ux-ui-design` (registrado no cap. 08): revisar `dicaNome` e `avisoMinimizacao`, que foram escritos na
  triagem, e decidir o B-4 da revisão do 0011.
- Fora desta etapa: a homologação, o `ensaiar-rollback` e o CI do PR seguem com o maestro (`05-devops-sre.md`).

## Comandos executados

Nenhum.

## Critério de pronto atendido

- [x] (06) o `CHANGELOG.md` tem a entrada da versão do `package.json`, com o que foi corrigido e as pendências abertas
- [x] (06) todo trecho de `README.md` e `docs/manual-tecnico/` que cita a função, o arquivo ou o RF corrigido descreve o código depois da correção (trechos achados com Grep e listados na entrega)
- [x] os links internos apontam para arquivos que existem
