---
pedido: DEC-DEM-20261104-0013-v1
etapa: 06-documentacao
agente: documentacao-tecnica
leu: [contrato-passagem.md, pedido.json, 01-qa-funcional.md, 02-tech-lead.md, 03-engenheiro-backend.md, 04-qa-automacao.md, 04-maestro.md, 05-devops-sre.md, package.json, CHANGELOG.md, README.md, docs/manual-tecnico/README.md, docs/manual-tecnico/02-acesso-e-seguranca.md, docs/manual-tecnico/03-demandas.md, docs/manual-tecnico/05-pedido-de-construcao.md, docs/manual-tecnico/06-agentes-de-ia.md, docs/manual-tecnico/08-painel.md, docs/manual-tecnico/09-referencia-api.md, docs/operacao/deploy.md, docs/superpowers/specs/2026-10-25-ws-orquestrador-demandas-design.md, src/modules/pedido-construcao/gerar.ts, src/modules/pedido-construcao/montar.ts, src/modules/pedido-construcao/schemas.ts, src/modules/dados-pessoais/minimizar.ts, src/modules/demandas/consultas.ts, src/components/dados-do-pedido.ts, src/components/rotulos.ts, SecaoPedido.tsx]
status: pronto
proximo: maestro
devolvido_para: null
---
## Entrega

A documentação da 0.1.12 descreve o código do ramo `construcao/DEC-DEM-20261104-0013-v1`, conferido em `gerar.ts`,
`montar.ts`, `schemas.ts`, `minimizar.ts` (`trocarNomes`, `temNome`), `consultas.ts` (`nomesDoSolicitante`),
`dados-do-pedido.ts`, `rotulos.ts` e `SecaoPedido.tsx`. `package.json` está em `0.1.12`.

### Arquivos alterados

| Arquivo | O que mudou |
|---|---|
| `CHANGELOG.md:6-156` | Seção nova `0.1.12 — 2026-11-04`: D1, D3, D2, aviso e orientação da T11, testes, versão e documentação, a partir do texto da Pendência 1 da 03. Verificações da 04 e da 05. Pendências: E5 no pedido 0014 (opção (b) de Fabiano), B-1 a B-4 da 04-maestro, o que a conferência do nome não pega, textos para a `ux-ui-design`, Prettier, sha completo do `b9e52d6` e divergência da spec. Fecho parcial da pendência da 0.1.10 sobre o nome no Pedido |
| `README.md:5` | Versão 0.1.11 → 0.1.12 |
| `README.md:15-18` | A descrição do Pedido passou a dizer que ele exige a confirmação, que é recusado com o nome do solicitante e que leva o papel de quem aprovou, com link para o cap. 05 |
| `docs/operacao/deploy.md:5` | Versão 0.1.11 → 0.1.12 (pedido do maestro e Pendência 2 da 05) |
| `docs/operacao/deploy.md:10` | "Atualizado em" com a entrada da `documentacao-tecnica`, pedido 0013 |
| `docs/manual-tecnico/README.md:5` | Versão do sistema 0.1.12, com o resumo da mudança |
| `docs/manual-tecnico/README.md:15-17` | Nota nova: a spec da Parada 1 ainda descreve o C-28 sem o nome e a T11 sem a caixa; vale o código |
| `docs/manual-tecnico/README.md:83-84` | Glossário: "Pedido de Construção" com o que muda na 0.1.12; termo novo "Confirmação sem dado pessoal" |
| `docs/manual-tecnico/05-pedido-de-construcao.md:5,8` | "Atualizado em" e "Fontes no código" (entram `schemas.ts`, `temNome`, `descricaoSemRotulos`, `SecaoPedido.tsx`, `acoes-pedido.ts`, `dados-do-pedido.ts`) |
| `docs/manual-tecnico/05-pedido-de-construcao.md:10-61` | RF-22: corpo `{ "confirmaSemDadoPessoal": true }`, o schema e o 400. A ordem foi renumerada de 9 para 11 passos, como em `gerar.ts`: matriz, confirmação (422 antes do banco), 404, 409 final, 409 não aprovado, 409 desatualizado, 422 estudo, montagem, um 422 só com C-28 e depois o nome, `validarPedido` e evento com a confirmação e o texto do histórico |
| `docs/manual-tecnico/05-pedido-de-construcao.md:71,79-103` | Exemplo de `aprovadoPor` com `cto e administradora`. Explicação do papel (ordem da aprovação, desempate, papel gravado e não da conta, B-4). "Fica de fora" com o nome de quem aprovou. O CA-22.2 "quando aceito" e a diferença entre 0.1.11 e 0.1.12. Limite B-01: o nome da conta não vai mais ao `aprovadoPor` |
| `docs/manual-tecnico/05-pedido-de-construcao.md:105-170` | Seção nova "Nome do solicitante": onde confere (tabela de caminhos de `textosDoPedido`), com que regra (`temNome` sobre `trocarNomes`), nome atual da demanda travada, exemplo fictício, recusa falsa, o que não pega (outras pessoas, nome antigo, minúscula, hífen ou ponto do B-1, `JOANAFICTICIA`, `AnaBelax`, B-2) e custo (B-3) |
| `docs/manual-tecnico/05-pedido-de-construcao.md:172-196` | Seção nova "Corrigir uma recusa": as sete linhas de `orientacaoDoPedido`. A correção sempre pede DEC novo, e a A-02 o impede; a saída de hoje é encerrar a demanda. O E5 está no pedido 0014 |
| `docs/manual-tecnico/05-pedido-de-construcao.md:198-218` | Seção nova "Na T11": aviso, caixa, validação no envio, foco, Espaço, chamada da Server Action e textos para a `ux-ui-design` |
| `docs/manual-tecnico/06-agentes-de-ia.md:5` | "Atualizado em" com a 0.1.12 |
| `docs/manual-tecnico/06-agentes-de-ia.md:241-244` | "o Pedido de Construção continua com o texto original" ganhou a frase da 0.1.12: o Pedido usa a mesma etapa do nome (`trocarNomes`, `temNome`) para recusar, com link ao cap. 05 |
| `docs/manual-tecnico/03-demandas.md:5` | "Atualizado em" com a 0.1.12 |
| `docs/manual-tecnico/03-demandas.md:160-165` | RF-21 (C-30): o `pedido_gerado` passou a gravar o booleano da confirmação, e o texto do histórico mudou |
| `docs/manual-tecnico/08-painel.md:5` | "Atualizado em" com a 0.1.12 |
| `docs/manual-tecnico/08-painel.md:29` | Linha da T11: caixa de confirmação, com link ao cap. 05 |
| `docs/manual-tecnico/08-painel.md:48-53` | Parágrafo novo sobre o e2e do pedido (Pendência 1 da 04): caixa, corpo com a confirmação, os sete estados do axe e o que o "CA-26.3" confere |
| `docs/manual-tecnico/08-painel.md:71-76` | Pendência de interface nova: textos da T11 para a `ux-ui-design`, inclusive a linha "corrija na demanda", que não diz que a edição só vale para DEC novo |
| `docs/manual-tecnico/09-referencia-api.md:5` | "Atualizado em" com a 0.1.12 |
| `docs/manual-tecnico/09-referencia-api.md:45` | Coluna "Corpo" do `POST .../pedido-construcao` com a confirmação |
| `docs/manual-tecnico/09-referencia-api.md:126-128` | "continua gerado com o texto original" ganhou a recusa por nome, com link ao exemplo novo |
| `docs/manual-tecnico/09-referencia-api.md:161-163` | O 409 de status final cita o `POST` com a confirmação |
| `docs/manual-tecnico/09-referencia-api.md:165-201` | Exemplo novo "gerar o Pedido de Construção": requisição, 200, 422 sem a confirmação, 400 por tipo errado ou sem corpo, e o 422 único com `e-mail` e `nome`, com dados fictícios |
| `docs/manual-tecnico/09-referencia-api.md:240` | Linha `nao_processavel` da tabela de erros: sem a confirmação e com o nome do solicitante |

### Trechos conferidos sem mudança (descrevem o código depois da correção)

- `docs/manual-tecnico/05-pedido-de-construcao.md:79`: `demanda` vem da cópia gravada no DEC. Continua certo, e a
  seção "Corrigir uma recusa" passou a tirar a consequência disso.
- `docs/manual-tecnico/06-agentes-de-ia.md:187-188` e `:206`: o detector de e-mail é o mesmo no bloqueio do Pedido, e o
  Pedido usa `search`. Não mudou.
- `docs/manual-tecnico/02-acesso-e-seguranca.md:70-84`: o que sobra do nome **para o agente**. A 0.1.12 não muda a
  minimização.
- `docs/manual-tecnico/03-demandas.md:126-128`, `docs/manual-tecnico/04-versoes-e-decisao.md:128` e `:155` (A-02) e
  `docs/manual-tecnico/09-referencia-api.md:146`: o 409 de status final, de DEC desatualizado e de outro DEC aprovado.
  Não mudaram.
- `docs/manual-tecnico/01-arquitetura.md:33` e `:50`: o módulo e o fluxo do pedido. Não mudaram.
- `docs/operacao/deploy.md:203-218`: o rollback da 0.1.12, escrito pela 05, bate com o código. A 0.1.11 não lê o corpo
  da rota. O `depois` booleano é o único valor novo, e `rotulos.ts` usa o texto antigo para o evento sem a confirmação.
- `docs/operacao/deploy.md:120`, `:222`, `:231`, `:241-242`, `:249` e `:275`: são parágrafos de versões anteriores ou
  falam do agente. Descrevem aquela versão e ficam como estão.
- `README.md:118-133`: os comandos do `package.json` não mudaram.

### Links internos

As âncoras novas existem nos arquivos de destino:

- `05-pedido-de-construcao.md`: `#na-t11`, `#nome-do-solicitante` e `#corrigir-uma-recusa`;
- `09-referencia-api.md`: `#exemplo-gerar-o-pedido-de-construção`;
- `08-painel.md`: `#pendências-de-interface-conhecidas`;
- `04-versoes-e-decisao.md`: `#rf-13-decisão`.

Também existem os arquivos citados: `CHANGELOG.md`, os capítulos 03, 04, 05, 06, 08 e 09, `README.md` e a spec.

## Decisões tomadas

- O RF-22 do cap. 05 foi renumerado pela ordem de `gerar.ts`, com a confirmação como passo 2 e o C-28 e o nome num
  passo só. Os passos citados no próprio capítulo foram ajustados, e nenhum outro documento cita esses números.
- O E5 entrou como fato da 0.1.12: a recusa num DEC aprovado não tem saída dentro da demanda por causa da A-02. Não
  descrevi a opção (b) como comportamento, porque ela está só no pedido 0014.
- A orientação "corrija na demanda" foi descrita como está no código. Que ela não diz que a edição só vale para um DEC
  novo ficou como pendência de texto da `ux-ui-design`. Não é divergência entre entrega e código, porque a 02 escreveu
  essa linha junto com a linha 6.
- A spec da Parada 1 (C-28 na linha 183; T11 nas linhas 152 e 159) não foi editada: `docs/superpowers/` está fora da
  minha lista **Pode**. A diferença está no README do manual e nas pendências do CHANGELOG, como manda o padrão técnico
  (seção 11).
- O texto do CHANGELOG partiu da Pendência 1 da 03 e foi conferido no código. Há três acréscimos: o tipo errado e o
  `POST` sem corpo dão 400, o 403 vem antes da confirmação, e o evento antigo fica com o texto antigo. A ordem dos
  papéis foi descrita como está em `montar.ts` (instante e, no empate, `cto` primeiro).
- Os exemplos usam só nomes fictícios (`Joana Ficticia`, `Rosa Dias Ficticia`, `Maria dos Santos Neto Ficticia`,
  `Carlos Campos Ficticio`) e e-mail no domínio `exemplo.test`.

## Pendências

1. Para a Parada 3 (Fabiano): a spec `docs/superpowers/specs/2026-10-25-ws-orquestrador-demandas-design.md` diverge do
   código no C-28 (linha 183, sem o nome) e na T11 (linhas 152 e 159, sem a caixa de confirmação). Se a spec tiver de
   acompanhar o código, quem edita é o dono dela.
2. Para a `ux-ui-design`: os textos da T11 da 0.1.12 (aviso, rótulo e erro da caixa, mensagem do 422 sem a confirmação
   e as sete linhas da orientação), em especial a linha "corrija na demanda".
3. Para o pedido 0014 (E5, opção (b) de Fabiano): quando ele entrar, revisar a seção "Corrigir uma recusa" do cap. 05,
   a linha 6 da orientação ("outro pacote desta demanda não pode ser aprovado nesta versão") e a A-02 do cap. 04.
4. Herdadas da 04-maestro e da 05, registradas no CHANGELOG: B-1 (pedido futuro), B-2 e B-3 (RSK do sistema), B-4
   (`juridico-contratos`), Prettier não rodado e sha completo do `b9e52d6` no `deploy.md`.

## Comandos executados

Nenhum.

## Critério de pronto atendido

- [x] (06) o `CHANGELOG.md` tem a entrada da versão do `package.json`, com o que foi corrigido e as pendências abertas
- [x] (06) todo trecho de `README.md` e `docs/manual-tecnico/` que cita a função, o arquivo ou o RF corrigido descreve o código depois da correção (trechos achados com Grep e listados na entrega)
- [x] os links internos apontam para arquivos que existem
