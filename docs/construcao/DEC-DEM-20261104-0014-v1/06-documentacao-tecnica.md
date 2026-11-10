---
pedido: DEC-DEM-20261104-0014-v1
etapa: 06-documentacao
agente: documentacao-tecnica
leu: [contrato-passagem.md, pedido.json, 01-qa-funcional.md, 02-tech-lead.md, 03-engenheiro-backend.md, 04-qa-automacao.md, 04-maestro.md, 04-correcao-engenheiro-backend.md, 04-seguranca-aplicacao.md, 05-devops-sre.md, passagens.jsonl, src/modules/pacotes-decisao/decidir.ts, src/modules/pacotes-decisao/substituido.ts, src/modules/pacotes-decisao/consultas.ts (140-180), src/modules/pedido-construcao/gerar.ts, src/components/dados-do-pedido.ts (38-87), src/components/dados-da-decisao.ts (36-47, 365-370), src/components/rotulos.ts (50-69, 212-227), "src/app/(painel)/pacotes-decisao/[decId]/page.tsx (1-150)", "src/app/(painel)/demandas/[id]/page.tsx (200-229)", src/app/api (rotas de pacotes-decisao, por Grep), e2e/decisao.spec.ts e e2e/pedido-construcao.spec.ts (títulos e axe, por Grep), README.md, CHANGELOG.md (1-180), docs/manual-tecnico/README.md, 01-arquitetura.md (1-8, 44), 03-demandas.md (1-12, 100-169), 04-versoes-e-decisao.md, 05-pedido-de-construcao.md, 08-painel.md, 09-referencia-api.md, docs/operacao/deploy.md (1-12, 196-231)]
status: pronto
proximo: maestro
devolvido_para: null
---
## Entrega

Documentação da 0.1.13 no ramo `construcao/DEC-DEM-20261104-0014-v1`, sem commit. O manual descreve o código do ramo
depois da correção do S-01 (`995ce77`). Os três pontos pedidos pelo maestro estão no manual e no CHANGELOG:

- **Regra da substituição:** regra 5 do RF-13 e "Limite conhecido" do RF-14 em `04-versoes-e-decisao.md`, como a 02
  indica, mais uma seção nova "Substituição do DEC aprovado" com a regra inteira.
- **Recusa do S-01:** um DEC só do CTO não substitui um aprovado que exigiu o CTO e a administradora (409, nada
  gravado; o inverso é permitido). Está no cap. 04 (regras de papel e nível, seção nova e RF-14), no cap. 05 (passo 3
  de "Corrigir uma recusa"), no cap. 09 (exemplo e tabela de erros) e no CHANGELOG.
- **Risco do S-02:** a regra de uso "não use Pedido de Construção gerado de DEC substituído" está no cap. 04
  ("Regra de uso"), no `README.md`, no CHANGELOG (primeira pendência aberta) e já estava no `deploy.md`, seção 6, para
  a volta à 0.1.12.

### Trechos conferidos e o que mudou

Achados com Grep por `A-02`, `outro pacote`, `outroAprovado`, `não se aprova`, `nunca dois DEC`, `0.1.12`, `E5`,
`0014`, `passo <n>`, `desatualizado.ts`, `pacotes-decisao/` e pelas âncoras citadas.

| Arquivo:linha (depois da edição) | O que mudou |
|---|---|
| `CHANGELOG.md:6-141` | Entrada nova `## 0.1.13 — 2026-11-10`: contexto (E5, opção b), o que mudou (substituição, S-01, substituído na leitura, gerar só do vigente, histórico, T11 e T05, seed, testes, versão, documentação), verificações e pendências abertas (S-02 primeiro, e2e depois do S-01, S-03, S-04, textos para a `ux-ui-design`, observação do revisor, spec do sistema) |
| `README.md:5-6` | Versão 0.1.13 e data |
| `README.md:15-18` | Só o DEC aprovado mais novo gera; não se usa pedido de DEC substituído; link para o cap. 04 |
| `docs/manual-tecnico/README.md:5-6` | Versão 0.1.13, resumo e data |
| `docs/manual-tecnico/README.md:17-19` | A substituição revê a A-02; a spec fica com o maestro |
| `docs/manual-tecnico/README.md:28` | Cap. 04 com a substituição |
| `docs/manual-tecnico/README.md:55` | RF-13 no mapa |
| `docs/manual-tecnico/README.md:82-83` | Glossário: "Aprovado vigente" e "Substituído" |
| `docs/manual-tecnico/README.md:87` | Glossário: o Pedido sai do aprovado vigente |
| `docs/manual-tecnico/01-arquitetura.md:5, 44` | Data; módulo `pacotes-decisao/` com o substituído |
| `docs/manual-tecnico/03-demandas.md:5` | Data |
| `docs/manual-tecnico/03-demandas.md:155-158` | Ação `pacote_decisao_substituido` na lista do RF-21 |
| `docs/manual-tecnico/03-demandas.md:165-168` | O `depois` do evento e a frase do histórico |
| `docs/manual-tecnico/04-versoes-e-decisao.md:5, 8` | Data; fontes com `substituido.ts`, `demandas/consultas.ts` e `registrar.ts` |
| `docs/manual-tecnico/04-versoes-e-decisao.md:155-158` | Regra 5: outro DEC aprovado não recusa mais; o 409 da A-02 saiu do código |
| `docs/manual-tecnico/04-versoes-e-decisao.md:174-176` | Nível `cto`: a recusa do S-01 |
| `docs/manual-tecnico/04-versoes-e-decisao.md:181-253` | Seção nova "Substituição do DEC aprovado": termos, quando acontece, regra de nível (S-01) com o 409, leitura, histórico, concorrência, painel e regra de uso (S-02) |
| `docs/manual-tecnico/04-versoes-e-decisao.md:264-267` | RF-14: a substituição na segunda aprovação; o S-01 não se aplica a este nível |
| `docs/manual-tecnico/04-versoes-e-decisao.md:269-282` | "Limite conhecido": o médio do reteste da 08 fechou; ficam S-02, S-04 e os avisos da T11 |
| `docs/manual-tecnico/05-pedido-de-construcao.md:5, 8` | Data; fontes com `substituido.ts` |
| `docs/manual-tecnico/05-pedido-de-construcao.md:14-17` | A seção do pedido só no DEC não substituído; só o vigente gera |
| `docs/manual-tecnico/05-pedido-de-construcao.md:38-43` | Passo 6 novo: 409 do substituído, antes do desatualizado. Os passos seguintes passaram de 6-11 para 7-12 |
| `docs/manual-tecnico/05-pedido-de-construcao.md:103` | Referência ao passo do nome: 9 → 10 |
| `docs/manual-tecnico/05-pedido-de-construcao.md:192-193` | Linha 6 da orientação com o texto novo |
| `docs/manual-tecnico/05-pedido-de-construcao.md:199-209` | "Corrigir uma recusa": passo 7; a saída dentro da demanda em quatro passos, com o S-01; sai o parágrafo que mandava encerrar a demanda |
| `docs/manual-tecnico/05-pedido-de-construcao.md:229-233` | "Na T11": DEC substituído e a aba velha com o 409 |
| `docs/manual-tecnico/05-pedido-de-construcao.md:242-245` | RF-23: `aprovada` traz o substituído marcado |
| `docs/manual-tecnico/08-painel.md:5, 23, 29` | Data; T05 e T11 na tabela de telas |
| `docs/manual-tecnico/08-painel.md:55-60` | Axe e e2e da substituição; corridas na unidade |
| `docs/manual-tecnico/08-painel.md:81-90` | Linha 6 nas pendências da 0.1.12; item novo com os textos da 0.1.13 e os três avisos que a T11 não mostra |
| `docs/manual-tecnico/09-referencia-api.md:5` | Data |
| `docs/manual-tecnico/09-referencia-api.md:43` | `substituido` e `substituidoPor` na leitura do DEC |
| `docs/manual-tecnico/09-referencia-api.md:203-232` | Exemplo novo "DEC substituído": leitura, 409 do gerar e 409 do S-01, com dados fictícios |
| `docs/manual-tecnico/09-referencia-api.md:266` | `conflito`: sai "outro DEC aprovado"; entram o S-01 e o Pedido de DEC substituído |
| `docs/operacao/deploy.md:5, 10` | Versão 0.1.13 e "Atualizado em" (a 05 deixou o campo para esta etapa) |

Conferidos sem mudança, porque já descrevem o código depois da correção:

- `docs/operacao/deploy.md:203-228` (rollback da 0.1.13, escrito na `05-entrega`): bate com o código. Não há
  contradição que exija mudar `Dockerfile` ou workflow.
- `docs/manual-tecnico/03-demandas.md:115` ("ir para `aprovada` exige um DEC aprovado e não desatualizado"): vale
  como está; o substituído também conta, sem efeito (E7, observação no CHANGELOG).
- `docs/manual-tecnico/05-pedido-de-construcao.md:95-97` (determinístico): a recusa do substituído é uma geração não
  aceita, já coberta pelo texto.
- `docs/manual-tecnico/05-pedido-de-construcao.md:56-58` (passo 4) e `04-versoes-e-decisao.md:164-167` (passos 2 e 3):
  a numeração não mudou.
- A entrada 0.1.12 do `CHANGELOG.md` é histórico: a pendência E5 dela fecha na 0.1.13, e o texto antigo fica como foi
  publicado.

### Links internos conferidos

Âncoras usadas e os títulos que existem: `04-versoes-e-decisao.md#substituição-do-dec-aprovado` (`:181`),
`#rf-13-decisão` (`:131`), `03-demandas.md#rf-07-status-e-transições` (`:100`),
`05-pedido-de-construcao.md#rf-22-gerar-o-pedido` (`:10`), `#na-t11` (`:211`),
`08-painel.md#pendências-de-interface-conhecidas` (`:61`), `../../CHANGELOG.md` e
`docs/manual-tecnico/04-versoes-e-decisao.md` a partir do `README.md`.

## Decisões tomadas

- Mantive a numeração das regras do RF-13 e reescrevi a regra 5 no lugar da recusa da A-02: a 02 aponta "regra 5" como
  o lugar da regra, e os passos 2 e 3 são citados no próprio capítulo.
- A regra inteira ficou numa seção própria do RF-13, com âncora, para os capítulos 03, 05, 08, 09 e o README apontarem
  para um lugar só.
- No cap. 05, o substituído virou o passo 6, na ordem do `gerar.ts`, e renumerei os seguintes, com as duas
  referências internas (`passo 9` → `10`, `passo 6` → `7`).
- O S-02 aparece como regra de uso no imperativo, no manual e na primeira pendência do CHANGELOG, porque o controle é
  só de processo e o sistema não alcança o pedido já copiado.
- Registrei que as três execuções verdes do e2e são de antes da correção do S-01, porque a `04-regressao` rodou antes
  da `04-correcao` e nenhuma etapa rodou o e2e depois (`passagens.jsonl`).
- Variáveis de ambiente não aparecem nesta mudança; nenhum valor foi escrito.

## Pendências

- **Spec do sistema, para o maestro na Parada 3:** `docs/superpowers/specs/2026-10-25-ws-orquestrador-demandas-design.md`
  não foi editada (fora da minha Pode). Proposta da 02: no RF-13, "aprovar o DEC mais novo substitui o aprovado
  anterior (0.1.13, A-02 revista)"; no RF-22, "só o DEC aprovado mais novo da demanda gera; o substituído dá 409
  (0.1.13)".
- **e2e depois do S-01:** a homologação da Parada 3 roda a suíte de novo (pendência 2 da `04-correcao`).
- **Textos para a `ux-ui-design`** e os três avisos que a T11 não mostra: registrados no cap. 08 e no CHANGELOG.
- **S-02 para a `gestao-riscos`** e um pedido futuro (a `00-inicio` do `/construir` consultar `substituido`); S-03 e
  S-04 para pedidos futuros: no CHANGELOG.
- A publicação desta documentação fora da empresa depende de aprovação de Fabiano; o uso é interno.

## Comandos executados

Nenhum.

## Critério de pronto atendido

- [x] (06) o `CHANGELOG.md` tem a entrada da versão do `package.json`, com o que foi corrigido e as pendências abertas
- [x] (06) todo trecho de `README.md` e `docs/manual-tecnico/` que cita a função, o arquivo ou o RF corrigido descreve o código depois da correção (trechos achados com Grep e listados na entrega)
- [x] os links internos apontam para arquivos que existem
