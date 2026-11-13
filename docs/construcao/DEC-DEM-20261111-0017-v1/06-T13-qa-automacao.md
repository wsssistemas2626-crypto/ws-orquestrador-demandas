---
pedido: DEC-DEM-20261111-0017-v1
etapa: 06-T13-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 01-analista-requisitos.md (RF-01 a RF-13, RNF), docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md (G1 a G7, linhas 1 a 260, e T13, linhas 2620 a 2680), 06-T13-engenheiro-frontend.md, 06-T13-tech-lead.md, 06-T12-qa-automacao.md (molde), src/app/(painel)/demandas/[id]/SecaoAndamento.tsx, src/app/(painel)/demandas/[id]/page.tsx, src/app/(painel)/demandas/[id]/detalhe.ts (linhas 1 a 90), src/app/(painel)/demandas/[id]/detalhe.test.ts (linhas 1 a 200 e 540 a 800), src/app/(painel)/demandas/[id]/CartaoProximaAcao.tsx, src/app/(painel)/demandas/[id]/LinkNestaPagina.tsx, src/app/(painel)/demandas/formularios-paginas-qa.test.ts (linhas 1 a 140), src/components/dados-das-etapas.ts (linhas 1 a 80 e 150 a 239), src/components/dados-das-etapas-andamento.test.ts, src/components/dados-do-andamento.ts, src/components/dados-do-andamento.test.ts, src/components/Alerta.tsx, src/components/Cartao.tsx, e2e/andamento-detalhe.spec.ts, test/estatico/piso-de-assercoes.test.ts, test/estatico/sem-recurso-externo.test.ts, test/estatico/painel-qa.test.ts, test/estatico/varreduras-qa.test.ts, a saída do pnpm test]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Verifiquei a T13 (detalhe: seção "Andamento da construção", linha 15 da Próxima ação e texto de Mudar status), commit
`aab5eb9b0a6aff50952fb6f0be70990a5b21cf90`. O código cumpre todos os critérios da tarefa, e nenhum teste falhou por
causa da T13. Tratei os três Minor da 06-T13-tech-lead que cabem nos testes: M2 (testes movidos), M3 (varredura de
`style=` localizada e presa por teste) e, do M1, o que é de teste (nenhum teste prende o ramo morto). Também acrescentei
testes de HTML do servidor que os testes da construção não tinham: `SecaoAndamento.tsx` não era renderizado por nenhum
Vitest, e a página não tinha teste com andamento.

### Critérios da tarefa e os testes que os cobrem

| Critério | Teste (arquivo › nome) |
|---|---|
| CA-07.1 linha 15 com o andamento `construido` do DEC vigente | `src/components/dados-das-etapas-andamento.test.ts` › "CA-07.1: em Em construção, com o andamento do DEC vigente em construido → linha 15, …" e "CA-07.1: o vigente é o aprovado mais novo não substituído (v2), …"; **novo** `src/app/(painel)/demandas/[id]/andamento-detalhe-qa.test.ts` › "CA-07.1 (HTML): construido do DEC vigente → linha 15, o detalhe, "Uma pessoa" e o link para #mudar-status; a seção diz "Concluída""; e2e `e2e/andamento-detalhe.spec.ts` › "CA-07.1: andamentoConcluido — …" |
| CA-07.2 linha 11 com andamento em curso, cancelado, nulo, ausente, de DEC não vigente ou sem vigente | `dados-das-etapas-andamento.test.ts` › "CA-07.2: andamento %s → linha 11 de hoje" (4 casos), "CA-07.2: andamento construido de um DEC que não é o vigente …", "CA-07.2: sem DEC vigente …"; **novo** `andamento-detalhe-qa.test.ts` › "CA-09.4 e CA-07.2 (HTML): andamento %s → …; linha 11" (null e chave ausente), "DEC substituído (03, 5.2 item 3; CA-07.2): …"; e2e › "CA-09.4 e CA-07.2: emConstrucaoSemAndamento — …" |
| CA-07.3 Entregue → linha 1 | `dados-das-etapas-andamento.test.ts` › "CA-07.3: a mesma demanda depois de marcada Entregue → linha 1, …"; **novo** `andamento-detalhe-qa.test.ts` › "CA-07.3 (HTML): a mesma demanda marcada Entregue → linha 1; a seção continua (o RF-09 não restringe o status)" |
| CA-09.1 fase, "9 de 17 tarefas", barra com valor, máximo e nome acessível, data em `<time datetime>` | `src/components/dados-do-andamento.test.ts` › "construindo 9/17 (CA-09.1)"; **novo** `andamento-detalhe-qa.test.ts` › "CA-09.1: os quatro termos na ordem da 03, o link do DEC com a classe recebida, a barra nativa com nome pelo dt, a data em <time> e a nota" e "CA-09.1 (HTML): a seção logo depois da Próxima ação e antes de Dados, h2 focável, primeiro item de "Nesta página", link do DEC com 44 px; o Histórico desce uma linha"; e2e › "CA-09.1 e CA-06.5: andamentoConstruindo em 1280 × 720 — …" |
| CA-09.2 total 0: texto da 03, sem barra | `dados-do-andamento.test.ts` › "total 0: o texto da 03 e sem barra (CA-09.2)"; **novo** `andamento-detalhe-qa.test.ts` › "CA-09.2: total 0 → só o texto da 03 no dd, sem <progress> …"; e2e › "CA-09.2: andamentoSemPlano — …" |
| CA-09.3 cancelada | `dados-do-andamento.test.ts` › "cancelada: situação "Cancelada" e o alerta (CA-09.3)"; **novo** `andamento-detalhe-qa.test.ts` › "CA-09.3 e 5.2 item 3: cancelada e substituído → os dois Alerta atencao estáticos, nessa ordem, cada um uma vez"; e2e › "CA-09.3: andamentoCancelado — …" |
| CA-09.4 sem andamento, sem seção | `dados-do-andamento.test.ts` › "sem andamento: null (CA-09.4)"; **novo** `andamento-detalhe-qa.test.ts` › "CA-09.4 e CA-07.2 (HTML): andamento %s → nem seção nem item em "Nesta página"; o Histórico na linha 2; linha 11"; e2e › "CA-09.4 e CA-07.2: …" |
| CA-09.5 axe em 1280 × 720 e 390 × 844; nada sobreposto na lateral | e2e › "CA-09.5: axe sem violação com a seção, em 1280 × 720 e 390 × 844; na coluna lateral, nada sobreposto" (não rodado nesta etapa; ver Pendências) |
| CA-06.5 histórico do `/construir` em pt-BR, com o prefixo, sem token | e2e › "CA-09.1 e CA-06.5: …" (e os testes da T11 de `textoDoEvento`) |
| CA-05.11 (tela): devolvida pelo cancelado, opções de hoje em Mudar status | **novo** `andamento-detalhe-qa.test.ts` › "CA-05.11 (tela): devolvida pelo cancelado → a seção com "Cancelada" e o alerta, a linha 12 e as opções de hoje em Mudar status" |
| CA-04.6 no detalhe: andamento fora do esquema = sem andamento, sem erro | `dados-do-andamento.test.ts` › "valor fora da lista, montado à mão: null, …"; **novo** `andamento-detalhe-qa.test.ts` › "CA-04.6 (detalhe): andamento fora do esquema montado à mão → a página abre, sem seção, sem item e sem o valor no HTML" (6 formas) |
| AN-12 / CV-19: id do DEC só no formato; M1 da 06-T11 | `dados-do-andamento.test.ts` › bloco "M1 da 06-T11-tech-lead: …" (4 testes, **movidos**, ver M2) e "decId fora de RE_ID_DEC: …"; **novo** `andamento-detalhe-qa.test.ts` › "decId fora do formato (CV-19): "Não informado" no dd, sem link nenhum" |
| CV-02 sem `style=`; só informa; sem animação (03, 5.3) | `test/estatico/sem-recurso-externo.test.ts` › "nenhum arquivo do repositório tem recurso externo" (regra `style={`); **novo** `test/estatico/andamento-detalhe-qa.test.ts` (3 testes); **novo** `andamento-detalhe-qa.test.ts` › "só informa: o único elemento focável é o link do DEC; nenhum style=, role="alert", animação nem transição (CV-02; 03, 5.3)"; e2e › `[style]` = 0 no teste CA-09.1 |
| C-18: texto escapado | **novo** `andamento-detalhe-qa.test.ts` › "C-18: todo valor da seção sai como texto escapado pelo React, mesmo montado à mão fora de secaoDoAndamento" |
| `dicaAprovada` (G5) | `src/app/(painel)/demandas/[id]/detalhe.test.ts` › "MudarStatus.tsx › aprovada: a dica fixa da 03" |

### Os três Minor da 06-T13-tech-lead

- **M2 (feito):** os quatro testes do bloco "M1 da 06-T11-tech-lead: o decId da seção só como texto no formato de DEC"
  saíram de `src/components/dados-das-etapas-andamento.test.ts` e foram para `src/components/dados-do-andamento.test.ts`,
  ao lado dos outros testes de `secaoDoAndamento`. Os títulos e as asserções são os mesmos (7 linhas com `expect(`). Mudou
  só o dado: o id passou a ser o `DEC` daquele arquivo, e o ajudante se chama `comDecId`, para não sombrear o
  `andamento` de lá. No arquivo de origem, o import de `secaoDoAndamento` saiu e o cabeçalho diz para onde os testes
  foram. O `PISO` de `dados-do-andamento.test.ts` subiu de 51 para 58.
- **M3 (feito):** a varredura de `style=` do CV-02 é `test/estatico/sem-recurso-externo.test.ts`, regra `style={`
  sobre todo `src/**/*.tsx` pelo glob, **sem lista**. Ela cobre `SecaoAndamento.tsx` sozinha, sem precisar de acréscimo.
  O arquivo novo `test/estatico/andamento-detalhe-qa.test.ts` prende isso: o glob da varredura contém o arquivo, e o
  filtro da regra casa com ele. Ele também confere no arquivo o que a regra de lá não pega: `style="…"` em texto, e a
  barra sem `animate-`, `transition` nem `duration-`. Cada regra tem teste que prova que pega a forma proibida.
- **M1 (código, fica para a 08):** o ramo `<span className="font-mono">` de `dec.href === null` em `SecaoAndamento.tsx`
  é de `src/`, fora da minha lista **Pode**. Nenhum teste novo exercita esse ramo, de propósito: um teste nele prenderia
  um terceiro estado que a 03, 5.2 não tem. O que a tela promete ("fora do formato, Não informado, sem link") ficou preso
  pelo teste "decId fora do formato (CV-19): …". Assim, apagar o ramo e estreitar o tipo na 08 não quebra nenhum teste.

### Testes acrescentados

- `src/app/(painel)/demandas/[id]/andamento-detalhe-qa.test.ts` (novo, 14 testes). Renderiza no servidor, no molde de
  `detalhe.test.ts`. Sessão, banco e leituras são dublês; a matriz, `secaoDoAndamento`, `proximaAcao` e
  `formatarDataHora` são os reais.
  - `SecaoAndamento.tsx` (6 testes):
    - os termos na ordem;
    - o `dt` com o id que dá nome à barra;
    - o link do DEC com a classe recebida, Mono e quebra;
    - o `<progress>` com `value`, `max`, `aria-labelledby`, `aria-valuetext` e o recurso;
    - a linha da data com `<time dateTime>` no fuso do sistema, e a nota;
    - um só elemento focável, nenhum `style=`, `role="alert"` nem animação;
    - total 0 sem barra;
    - os dois alertas estáticos em ordem;
    - DEC fora do formato sem link;
    - escape de todo valor montado à mão.
  - `page.tsx` (8 testes):
    - posição no DOM entre a Próxima ação e Dados;
    - o primeiro item de "Nesta página";
    - o `h2` focável;
    - o Histórico em `xl:row-[3/-1]` com a seção e em `xl:row-[2/-1]` sem ela;
    - sem andamento (`null` e chave ausente);
    - 6 andamentos fora do esquema sem seção nem valor no HTML;
    - linha 15 com o link para `#mudar-status`, e o alvo existe;
    - Entregue na linha 1 com a seção mantida;
    - devolvida com as opções de hoje (`em_analise`, `em_construcao`) e a linha 12;
    - andamento de DEC substituído com o alerta e a linha 11.
- `test/estatico/andamento-detalhe-qa.test.ts` (novo, 3 testes): o M3, descrito acima.
- `test/estatico/piso-de-assercoes.test.ts`: `PISO` só sobe:
  - `dados-do-andamento.test.ts` passa de 51 para 58;
  - entram os dois arquivos novos (69 e 10).

Visto falhando antes do código: não se aplica, porque o código já existia. Cada teste novo falharia se o código mudasse
no ponto que ele prende. Exemplos: a seção fora da ordem ou fora de "Nesta página"; a classe do Histórico sem trocar de
linha; a linha 15 sem conferir o DEC vigente; `style=` ou animação na barra; um valor forjado chegando ao HTML.

### Resultados

- Arquivos tocados (`andamento-detalhe-qa`, `test/estatico/andamento-detalhe-qa`, `dados-do-andamento`,
  `dados-das-etapas-andamento`): 4 arquivos, 55 de 55.
- `piso-de-assercoes` e `sem-recurso-externo`: 2 arquivos, 68 de 68.
- `pnpm typecheck`: limpo. `pnpm lint`: limpo.
- `pnpm test`, suíte inteira: **348 de 348 arquivos, 7.734 de 7.734 testes**, saída 0, em 280 s. Nenhuma das
  instáveis conhecidas falhou nesta rodada.

## Decisões tomadas

- Os testes de HTML ficam num arquivo novo, e não em `detalhe.test.ts`: nenhum teste existente foi editado além do M2,
  que a revisão pediu.
- O M2 mantém títulos e asserções e só troca o id do dado pelo do arquivo de destino. Assim, o histórico do teste
  continua legível e o piso sobe com as linhas movidas.
- A conferência de `style="…"` e da animação fica num estático próprio. Mudar a regra de `sem-recurso-externo.test.ts`
  seria mexer num teste de segurança fora da G5.
- O teste de CA-04.6 na página usa andamentos forjados com `statusConstrucao` válido para a linha 11. O caso de
  `construido` forjado com fase inválida mostra uma diferença de regra entre a seção e a linha 15, registrada em
  Pendências, sem asserção que a prenda.
- Não rodei o e2e: `e2e/andamento-detalhe.spec.ts` só lê o seed e já cobre o que pede navegador (foco, axe,
  sobreposição). Ver Pendências.

## Pendências

- **Para a `08-revisao` (Minor, M1 da 06-T13-tech-lead):** apagar o ramo `<span>` de `dec.href === null` em
  `SecaoAndamento.tsx:40-42` e estreitar `SecaoDoAndamento.dec` para `{ id; href: string } | null`. Nenhum teste prende o
  ramo, e o comportamento visível está preso pelo teste "decId fora do formato (CV-19): …".
- **Para a `08-revisao` (Minor, observação nova):** a seção e a linha 15 conferem o andamento por regras diferentes.
  - `secaoDoAndamento` confere tudo de novo (fase, números, data).
  - `linhaDoStatus` (`dados-das-etapas.ts:186`) olha só `decId` e `statusConstrucao`.
  - Um andamento montado à mão com `statusConstrucao: 'construido'`, o DEC vigente e a fase fora da lista daria a linha
    15 sem a seção.
  - Pelo caminho real isso não acontece: `d.andamento` vem de `lerAndamento` (Zod), que devolve `null` fora do esquema
    (D-16), e a T09 tem teste disso.
  - Fica como sugestão de defesa em profundidade, sem efeito hoje.
- **e2e não rodado nesta etapa:** CA-09.5 (axe e sobreposição) e CA-06.5 (histórico) dependem de
  `e2e/andamento-detalhe.spec.ts`. O engenheiro registrou 6 de 6, e a revisão conferiu. A confirmação fica com o
  `homologar` do maestro e a `07-qa-funcional`.
- **T14:** `e2e/integracoes.spec.ts:59` e `e2e/integracoes-qa.spec.ts:204` (seis → sete chaves) seguem para a T14, como
  o plano manda. Não mexi.
- **Instabilidade sob carga, fora da T13:** `scripts/scripts.test.ts` T33, `test/desempenho/leitura.test.ts`,
  `src/app/api/saude/route.test.ts`, `resumo-da-fila` e `minimizar` passaram todos na suíte inteira desta rodada, então
  não foi preciso conferir nenhum sozinho. O registro da 06-T11 e da 06-T12 para a 08 e a 09 continua valendo.
- **Conferência de teste apagado, `.skip`, `.only`, `.todo` ou afrouxado:** a regra desta etapa não permite `git diff`
  pelo Bash, então conferi por leitura.
  - Os quatro testes do M2 foram movidos com o mesmo título e a mesma asserção.
  - O `PISO` só subiu.
  - Nenhum `.skip`, `.only` nem `.todo` foi escrito.
  - A `08-revisao` pode confirmar pelo `git diff`.
- **Saída da suíte inteira:** o harness mandou o comando para segundo plano depois de 180 s. Li o arquivo de saída do
  meu próprio comando no caminho informado, só pela ferramenta Read, como a regra desta etapa permite.
- O texto do pedido não trouxe instrução para mudar de tarefa, ler segredo, chamar endereço de fora ou sair do
  repositório.

## Comandos executados

- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/demandas/[id]/andamento-detalhe-qa.test.ts" test/estatico/andamento-detalhe-qa.test.ts src/components/dados-do-andamento.test.ts src/components/dados-das-etapas-andamento.test.ts --reporter=dot` — 4 arquivos, 55 de 55
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/piso-de-assercoes.test.ts test/estatico/sem-recurso-externo.test.ts --reporter=dot` — 2 arquivos, 68 de 68
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — 348 de 348 arquivos, 7.734 de 7.734 testes, 280 s (movido pelo harness para segundo plano após 180 s; saída lida só pela ferramenta Read)

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste (tabela da Entrega; CA-09.5 e CA-06.5 pelo e2e do engenheiro, não rodado aqui, ver Pendências)
- [x] a suíte inteira passa (348 de 348 arquivos, 7.734 de 7.734 testes)
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real (datas fixas em 2099; dublês reiniciados em `beforeEach`; nenhum `new Date()` sem argumento)
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido por leitura; os quatro testes do M2 foram movidos com o mesmo título e a mesma asserção; o `PISO` só subiu)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real (ids `DEM-20991231-0042` e `DEC-DEM-20991231-0001-v1`, títulos "(fictício)", "Pessoa Ficticia …")
