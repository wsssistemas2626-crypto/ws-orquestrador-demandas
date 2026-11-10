---
pedido: DEC-DEM-20261104-0014-v1
etapa: 04-regressao
agente: qa-automacao
leu: [contrato-passagem.md, padrao-tecnico.md, pedido.json, passagens.jsonl, 01-qa-funcional.md, 02-tech-lead.md, 03-engenheiro-backend.md, playwright.config.ts, package.json, test/estatico/decisao-e2e.test.ts, e2e/decisao.spec.ts (diff), e2e/pedido-construcao.spec.ts (diff)]
status: pronto
proximo: maestro
devolvido_para: null
---
## Entrega

Regressão da correção de `d6df360` (`07b50d4` só regravou a entrega da 03; o código é o mesmo), no ramo
`construcao/DEC-DEM-20261104-0014-v1`, sem commit. Só mudaram `e2e/decisao.spec.ts` e `e2e/pedido-construcao.spec.ts`.
O trabalho dos dois arquivos é o da volta interrompida (sessão caída às 07h47 BRT): fica como estava, sem refazer.

### Critérios de aceite do pedido e os testes que os cobrem

| # | Critério (`pedido.json`) | e2e (esta etapa) | Unidade e integração (03, rodados de novo aqui) |
|---|---|---|---|
| 1 | O DEC mais novo pode ser aprovado com outro DEC já aprovado, com todas as regras de aprovação de hoje | `e2e/decisao.spec.ts:263` "substituição: com um DEC aprovado na demanda, aprovar o mais novo dá "Aprovada"; ..."; `e2e/pedido-construcao.spec.ts:341` "0.1.13, caminho completo: ..." (o v2 aprovado pela tela) | `src/modules/pacotes-decisao/substituicao.test.ts` (S2, casos 1 a 13: 2FA, papéis, dupla aprovação, rascunho, desatualizado, status final, A-01); `decidir-versoes.test.ts`; `src/app/api/pacotes-decisao/decisao.test.ts` (R4, sem 2FA e token de agente) |
| 2 | Só o DEC aprovado mais novo gera Pedido de Construção; o substituído dá 409, inclusive em corrida | `e2e/pedido-construcao.spec.ts:341`: a aba velha do v1 dá "Não foi possível concluir: o pacote foi substituído por <v2>...", com foco e sem JSON; a API do v1 dá 409 `{ erro: 'conflito', mensagem }` sem `content-disposition`; o v2 dá 200, igual na tela e na API (CA-22.2) | `src/modules/pedido-construcao/gerar-substituido.test.ts` (casos 1 a 6, a corrida do caso 6 com 10 rodadas e o v3); `substituicao.test.ts` (corridas 12 e 13); `pedido.test.ts`; `acoes-pedido.test.ts` |
| 3 | A substituição fica no histórico com os dois ids, e a T11 do substituído mostra o aviso e o link, sem violação de axe | `e2e/decisao.spec.ts:263`: selo, aviso (texto inteiro) e link na T11 do anterior, sem a seção do pedido nem o lembrete do P1-d, axe "T11 substituído"; selo só na linha do anterior na T05, frase fixa do histórico, axe "T05 com DEC substituído"; `GET .../historico` com `depois` igual a exatamente `{ substituido, substituidoPor }`. `e2e/pedido-construcao.spec.ts:341`: axe na recusa por nome, na aba velha com o 409 e no v1 substituído | `substituicao.test.ts` (S4, ordem dos três eventos); `rotulos.test.ts`; `pagina.test.ts` da T11 |
| 4 | O caminho completo (recusa por nome, nova ESP, novo DEC, aprovação, geração) passa no e2e | `e2e/pedido-construcao.spec.ts:341`, na demanda `TITULOS_DO_E2E.substituicao` do seed (R1 da 01: "Santos" no contexto; correção em "Editar dados", que é a saída que a orientação manda para `demanda.descricao`) | `gerar-substituido.test.ts` casos 1, 2 e 4 (R1 e R2, inclusive a ESP nova) |
| 5 | A suíte e2e passa três vezes seguidas | execuções 3 (refeita), 4 e 5 desta volta: 144 de 144 cada uma (abaixo) | não se aplica |

A linha 6 nova da orientação (`ORIENTACAO.aviso`) é conferida em `e2e/pedido-construcao.spec.ts:261` (C-28) e no
caminho completo.

### Teste que reproduz o defeito da 01

`e2e/pedido-construcao.spec.ts:341` reproduz o R1 da 01 de ponta a ponta, e `e2e/decisao.spec.ts:263` reproduz o R4 pela
tela. Na base (`89eca46`), a aprovação do v2 recebe o 409 `outroAprovado` (`decidir.ts:219`, citado pela 01 e pela 03),
então a espera por "Decisão registrada: Aprovada, opção A." falha nos dois testes. O teste de `e2e/decisao.spec.ts` que
foi trocado esperava exatamente esse 409. Os dois testes não foram rodados contra a base nesta etapa, porque a **Pode**
não tem troca de ramo. A falha na base da mesma regra foi vista pela 03, com os comandos e o trecho da saída na entrega
dela.

### Testes acrescentados e trocados em `e2e/`

| Arquivo | Teste | O que mudou |
|---|---|---|
| `e2e/decisao.spec.ts:263` | "substituição: ..." | **Trocado**, no lugar de "A-02: com um DEC aprovado na demanda, aprovar outro mostra o conflito e o pacote continua pendente". A regra mudou por decisão de Fabiano (opção b), e a asserção ficou mais forte: estado dos dois DEC pela API, um só aprovado mais novo, status da demanda, T11 do anterior e do novo, T05, histórico e dois axe |
| `e2e/decisao.spec.ts:218` | "nível cto: aprovar A ..." | A pré-condição perdeu "sem DEC aprovado", que vinha do A-02. Ficou a do status (`ORIGENS_DO_FLUXO`), que o P1-d exige. As asserções não mudaram |
| `e2e/decisao.spec.ts:330` | "dupla aprovação: ..." | Saiu a pré-condição `exigeBancoRecemSemeado(!temDecAprovado)` do A-02: com a substituição, um DEC aprovado antes não impede mais a aprovação. As asserções não mudaram, e o teste passa a rodar em qualquer banco |
| `e2e/pedido-construcao.spec.ts:341` | "0.1.13, caminho completo: ..." | **Novo**. Inclui a aba velha (E5 da 01), com o v2 aprovado em outra aba do mesmo contexto. O `finally` devolve o contexto do seed, mesmo se falhar |
| `e2e/pedido-construcao.spec.ts:261` | "C-28: ..." | `ORIENTACAO.aviso` com o texto novo da linha 6. Continua sendo comparado por inteiro |
| cabeçalhos das duas specs | — | Os comentários do A-02 viraram os da substituição. O uso por conta (C-36) foi atualizado: "cto" com 0 demandas e 16 versões em `pedido-construcao.spec.ts`; `decisao.spec.ts` continua com 0 demandas |

### Execuções

| Execução | Volta | Resultado |
|---|---|---|
| `pnpm test:e2e` nº 1 | interrompida (antes das 07h47 BRT) | 144 de 144 (informado pelo maestro) |
| `pnpm test:e2e` nº 2 | interrompida | 144 de 144 (informado pelo maestro) |
| `pnpm test:e2e` nº 3 | interrompida | morta pela queda da sessão no teste 76, sem falha até ali; não conta |
| `pnpm test:e2e` nº 3, refeita | esta | 144 de 144, 5,7 min |
| `pnpm test:e2e` nº 4 | esta | 144 de 144, 5,1 min |
| `pnpm test:e2e` nº 5 | esta | 144 de 144, 5,2 min |
| `pnpm test` | esta | 202 arquivos, 4460 de 4460 |
| `pnpm lint` | esta | limpo |
| `pnpm typecheck` | esta | limpo |

**Três vezes seguidas:** as execuções 3 (refeita), 4 e 5 foram rodadas nesta volta, uma depois da outra, sobre a mesma
árvore e sem falha entre elas. Cada uma sobe um banco novo pelo Testcontainers (`e2e/servidor.ts`), então não precisei
do `docker compose`. Rodei a 4 e a 5 porque a 1 e a 2 vêm da volta interrompida: não consigo conferir se a árvore era
a mesma, e a 3 dela não terminou. Somando as duas voltas, são cinco execuções completas, todas 144 de 144.

## Decisões tomadas

- Mantive os dois arquivos de `e2e/` como a volta interrompida deixou, como o maestro mandou. Revisei o diff contra os
  itens do critério de pronto, e nada precisou mudar.
- Fechei a regra das três vezes seguidas com três execuções nesta volta, porque não tenho como verificar a árvore das
  execuções 1 e 2.
- As corridas (C-13) ficam na unidade e na integração (`gerar-substituido.test.ts`, `substituicao.test.ts`), e não no
  e2e. O e2e roda em série, com `workers: 1`, e não consegue fazer duas transações concorrentes de forma confiável.
  Forçar isso no e2e daria um teste instável.
- As pré-condições `exigeBancoRecemSemeado` só mudaram onde vinham do A-02. A do "Arquivar" e a do CA-12.4 não
  mudaram. `test/estatico/decisao-e2e.test.ts` (dentro dos 4460) confirma que a spec só pula pela pré-condição, sem
  `only`, `fixme` nem `todo`, e que o cabeçalho segue a largura de 120.
- Os dados de teste são todos fictícios: `Carla Santos Ficticia` e o contexto do seed com "Santos" cidade. Os testes
  novos não usam o relógio. A ordem dos eventos é conferida pela ação e pelos ids, e não pela data.

## Pendências

- `Comandos executados`: da volta interrompida, só conheço as três execuções do e2e que o maestro informou. Se ela
  rodou outro comando (por exemplo `git status` ou `git diff`), ele está no registro da sessão do maestro, e não nesta
  entrega.
- Para a `04-revisao`: o "dupla aprovação" de `e2e/decisao.spec.ts:330` perdeu a pré-condição do A-02 e passou a rodar
  em qualquer banco. Num banco reaproveitado, ele faz a demanda `duplaAprovacao` acumular substituições a cada
  execução. Isso é esperado na 0.1.13, e as asserções conferem só o DEC do próprio teste.

## Comandos executados

- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — volta interrompida, execução 1: 144 de 144
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — volta interrompida, execução 2: 144 de 144
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — volta interrompida, execução 3: morta no teste 76 pela queda da sessão, sem falha
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — só `e2e/decisao.spec.ts` e `e2e/pedido-construcao.spec.ts` modificados
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff` — as mudanças da volta interrompida, revisadas
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — execução 3 refeita: 144 de 144
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — execução 4: 144 de 144
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — execução 5: 144 de 144
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 4460 de 4460, 202 arquivos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — só os dois arquivos de `e2e/`

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] (04 regressão) há um teste que reproduz o defeito descrito em `01-qa-funcional.md`
