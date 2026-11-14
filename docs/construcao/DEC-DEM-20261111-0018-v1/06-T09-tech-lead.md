---
pedido: DEC-DEM-20261111-0018-v1
etapa: 06-T09-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seções 6, 7 e 12), docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md (T09), 06-T09-engenheiro-backend.md, commit 7b318ea9434a3a1ec885f814c3e816da174c0a91, test/estatico/piso-de-assercoes.test.ts, test/estatico/piso-de-assercoes-0018.test.ts, 01-analista-requisitos.md (RF-08, CA-08.1 a CA-08.3, Pendência 7), 04-seguranca-aplicacao.md (SB-15, pela busca), cabeçalho dos testes candidatos listados no parecer P1]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T09 (B-08-2, SB-15; RF-08, CA-08.1 a CA-08.3, D-18), commit `7b318ea`. O commit só toca
`test/estatico/piso-de-assercoes.test.ts` (40 linhas acrescentadas, 0 removidas), cria
`test/estatico/piso-de-assercoes-0018.test.ts` e grava a entrega do engenheiro e o `passagens.jsonl`. Nada fora da
tarefa mudou.

### As quatro conferências pedidas pelo maestro

1. **Cada número do PISO da T09 é a contagem atual: sim.** Recontei com `git grep -c "expect("` em `src`, `test`,
   `e2e` e `scripts`. As 38 entradas da T09 (de `registrar-qa.test.ts`, 69, até `piso-de-assercoes-0018.test.ts`, 3)
   batem uma a uma com a contagem de hoje. As 34 entradas de T01 a T08 deste pedido também batem. Seis entradas
   anteriores a 41108ee estão abaixo da contagem de hoje (parecer P2). Isso não é falha da T09, que só pedia a recontagem
   das entradas novas.
2. **Nenhum valor desceu: sim.** `git diff 41108ee -- test/estatico/piso-de-assercoes.test.ts` só tem linhas `+`,
   todas depois da linha 92. As linhas 9 a 92 (o PISO de 41108ee) não mudaram. Contei 63 entradas nesse trecho e
   conferi o `PISO_41108EE` do teste novo contra ele: as 63 chaves e os 63 valores são iguais. O plano diz 84 (parecer
   P3), mas o número certo é 63, e o caso `toHaveLength(63)` trava a cópia.
3. **`registrar-qa.test.ts` e a lista da 0.3.x e da 0.4.0 entraram: sim.** `registrar-qa.test.ts` está no PISO com 69,
   igual à contagem de hoje (CA-08.1). Os 25 arquivos da Pendência 7 de 01 e os 12 arquivos da 0.4.0 da tabela da T09
   entraram com a contagem recontada. `deps-qa.test.ts` já entrou na T08 com 8 e não foi duplicado. O teste novo também
   entrou com 3. Os seis arquivos de tela e de seed que a tabela marca "não entram" ficaram fora, cada um com a razão.
4. **Nenhum teste de segurança ficou de fora: não.** A tarefa cumpriu a lista do plano. Essa lista, que escrevi na
   `05-plano`, está incompleta: ficaram de fora testes da 0.3.0 (DEC-0016) e da 0.3.1 (DEC-0019) que atendem ao
   critério do RF-08 (parecer P1). Pela RF-08 e pelo CA-08.2, quem confere e acrescenta os candidatos é a
   `06-T09-testes` (qa-automacao), por isso P1 não bloqueia esta passagem. Ela vai como obrigatória para a próxima etapa.

### Pareceres

**P1. Testes de segurança da 0.3.x fora do PISO** (obrigatório para a `06-T09-testes`, CA-08.2)

- **Onde:** `test/estatico/piso-de-assercoes.test.ts:198` (fim do PISO).
- **Problema:** os arquivos abaixo atendem ao critério do RF-08, que inclui controle de acesso, visibilidade, 404 sem
  oráculo, sentinela, prazo total e imutabilidade. A versão e o motivo saem do cabeçalho de cada arquivo, que li. Ao
  lado de cada um está a contagem de `expect(` de hoje:
  - 0.3.0, DEC-0016:
    - `scripts/token-integracao.test.ts` (62): emissão, troca e revogação do token, com sentinelas;
    - `scripts/token-integracao-qa.test.ts` (48): 401 depois da revogação, pela rota;
    - `src/modules/integracoes/tempo-limite.test.ts` (32) e `tempo-limite-qa.test.ts` (16): prazo total (IN-14,
      ADR-28), sem nada gravado;
    - `src/app/api/demandas/leitura-awave.test.ts` (28) e `leitura-awave-qa.test.ts` (36): visibilidade e 404 sem
      oráculo (IN-08, ADR-23), com falha fechada;
    - `src/app/api/demandas/criacao-awave.test.ts` (81) e `criacao-awave-qa.test.ts` (35): token e lista de permissão
      do Awave (IN-05);
    - `src/modules/agentes/gatilhos-awave.test.ts` (28), `gatilhos-awave-qa.test.ts` (40) e
      `src/modules/agentes/executar-awave.test.ts` (20): nenhum agente age antes da confirmação por pessoa (IN-06);
    - `test/tokens-do-e2e.test.ts` (15): arquivo de token com permissão 600, apagado no fim (IN-04);
    - `test/estatico/docs-sem-token.test.ts` (6): token fora de docs (IN-18, C-39), o mesmo critério do
      `trace-e2e.test.ts`, que entrou.
  - 0.3.1, DEC-0019:
    - `scripts/criar-token-0019.test.ts` (8): falha fechada na emissão;
    - `src/db/transacao-prazo.test.ts` (26): prazo total da transação (M-3);
    - `src/modules/agentes/executar-0019.test.ts` (53): falha fechada da guarda de confirmação (M-5).
  - Versão a confirmar, de segurança pelo cabeçalho:
    - `test/matriz-rotas-qa.test.ts` (22): 401 e 403 em todo método e em toda rota. `matriz-rotas.test.ts` já está no
      PISO.
  - Na fronteira, para a qa-automacao decidir com uma linha de razão:
    - `src/modules/agentes/revisao-0019.test.ts` (31): concorrência da execução adiada;
    - `src/modules/demandas/origem.test.ts` e `origem-qa.test.ts` (67 e 43): origem pela autoria (C-17);
    - `src/app/api/demandas/contrato-awave.test.ts` (17): contrato da tool.
- **Razão:** o SB-15 (04) lista como ameaça "R" o teste de segurança da 0.3.x que perde asserção sem ninguém ver. Sem
  essas entradas, esses arquivos podem perder asserção sem que o piso acuse. A falha vem do plano: a tabela da T09 foi
  tirada da Pendência 7 de 01, e a Pendência 7 diz que a lista "não é fechada". O engenheiro achou a maior parte desses
  arquivos e os registrou na Pendência 2 da entrega dele.
- **Caminho:** a `06-T09-testes` põe cada arquivo no PISO com a contagem do fim da etapa, num bloco com o comentário
  de origem, ou escreve a linha de razão de por que não é teste de segurança (CA-08.2). Se algum entrar, o
  `DO_B_08_2` do `piso-de-assercoes-0018.test.ts` pode ganhar a mesma chave, para o caso 3 travá-lo também.

**P2. Seis entradas antigas do PISO abaixo da contagem de hoje** (Minor)

- **Onde:**
  - `test/estatico/piso-de-assercoes.test.ts:9`: `e2e/seguranca.spec.ts`, 28 no PISO e 70 hoje;
  - `:18`: `test/estatico/painel-qa.test.ts`, 14 e 19;
  - `:27`: `src/modules/acesso/matriz.test.ts`, 44 e 47;
  - `:38`: `test/matriz-rotas.test.ts`, 17 e 18;
  - `:39`: `test/transversal/sentinelas.test.ts`, 59 e 99;
  - `:50`: `test/estatico/andamento.test.ts`, 43 e 50.
- **Problema:** o piso fica abaixo do arquivo. `e2e/seguranca.spec.ts` pode perder 42 linhas de asserção, e
  `sentinelas.test.ts` 40, sem o teste acusar.
- **Razão:** a T09 só pedia a recontagem das entradas novas, então isso não é falha da tarefa. Mas é o mesmo risco do
  SB-15. Subir esses valores não fere o CA-08.3, porque o piso só sobe.
- **Caminho:** a `06-T09-testes` pode subir esses seis valores para a contagem do fim da etapa, com uma linha de
  comentário. Se não subir, o assunto fica como sobra para um pedido futuro.

**P3. O plano diz 84 entradas em 41108ee; são 63** (Minor, do plano)

- **Onde:**
  - `docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md:1695`;
  - `test/estatico/piso-de-assercoes-0018.test.ts:11`.
- **Problema:** o comentário do plano fala em "as 84 entradas de 41108ee".
- **Razão:** o diff contra 41108ee prova que o PISO daquela versão são as linhas 9 a 92, com 63 entradas. O engenheiro
  seguiu o código, não o comentário, e o caso 1 trava o 63. O desvio do engenheiro está certo.
- **Caminho:** nada a fazer no código. Fica registrado aqui para quem ler o plano.

### O que conferi no código novo (`piso-de-assercoes-0018.test.ts`)

- O teste falharia sem as entradas: entrada ausente vira 0, e o caso 3 cobra a contagem de 41108ee, não só `> 0`. O
  engenheiro viu o teste falhar no `registrar-qa.test.ts` antes das entradas. Esse desvio é mais forte que o plano e
  está certo.
- A leitura do PISO falha do lado seguro. Se a entrada for comentada, trocar de aspas ou mudar de formato, ela deixa de
  casar com a expressão, vira 0 e o teste fica vermelho com o nome do arquivo.
- Não há duplicação: nenhum outro teste do repositório lê o PISO pelo fonte. O `PISO_41108EE` repete valores do PISO
  de propósito, porque é a fotografia de 41108ee que o CA-08.3 exige.
- Não há segredo, valor de `.env` nem dado pessoal. Não há rota, Server Action, job nem banco (os itens de Zod e de
  migration não se aplicam).
- O teste não depende de ordem nem do relógio.
- Os três arquivos do piso dão 211 de 211. `pnpm lint` e `pnpm typecheck` passaram limpos.

## Decisões tomadas

- Status `pronto` com P1 obrigatório para a `06-T09-testes`, sem devolver a tarefa. A tarefa fez o que o plano pede,
  nem mais nem menos (seção 12). A RF-08 e o CA-08.2 dão à qa-automacao a conferência e a inclusão dos candidatos fora
  da lista. Devolver ao engenheiro gastaria uma volta de construção e revisão para um trabalho que a próxima etapa já
  tem como dono.
- P2 e P3 ficaram como Minor. Nenhum dos dois é falha da T09 nem deixa o piso descer.
- Não rodei a suíte inteira. Os três arquivos do piso, o lint e o typecheck bastam para um diff que só acrescenta
  entradas a um teste estático e cria outro teste estático. O engenheiro registrou 8227 de 8227 na suíte inteira.
- A versão dos testes do P1 saiu do cabeçalho de cada arquivo, que cita o DEC de origem, e não do `git log`, que não
  está na regra de comando desta passagem.

## Pendências

1. Para a `06-T09-testes` (qa-automacao): P1 é obrigatório. Cada arquivo da lista entra no PISO ou ganha a linha de
   razão (CA-08.2).
2. Para a `06-T09-testes`, opcional: P2, subir as seis entradas antigas para a contagem atual.
3. Ficaram fora da faixa da RF-08 (0.3.0, 0.3.1 e 0.4.0), e portanto fora deste pedido, testes de segurança anteriores
   à 0.3 que também não estão no PISO. Pelo nome, são de autenticação e de proteção de dados:
   - `src/modules/acesso/auth*.test.ts`, `verificacao*`, `bloqueio-verificacao`, `cookies-seguros`, `destino-seguro*`,
     `exigir-pessoa*` e `sonda-mutacao-qa`;
   - `src/db/imutabilidade.test.ts`;
   - `src/modules/dados-pessoais/*`;
   - `src/modules/retencao/expurgar.test.ts`;
   - `src/lib/log.test.ts`, `console-saneado.test.ts`, `reduzir-erro.test.ts` e `sentry.test.ts`;
   - `src/modules/historico/consultas*.test.ts` e `registrar-qa.test.ts`.

   Ficam como sobra para um pedido futuro, a critério do Orquestrador.
4. Um comando fora da lista **Pode**: rodei uma vez
   `git -C /home/deploy/servidor/projetos/estruturaAutonoma grep` para achar as seções do `padrao-tecnico.md`. O comando
   só lê, mas o `git grep` da lista é só no repositório do sistema, e o arquivo devia ter sido lido com a ferramenta
   Read. Está declarado abaixo, do jeito que rodou.
5. O texto do `pedido.json` não trouxe instrução fora do escopo nesta etapa.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 7b318ea9434a3a1ec885f814c3e816da174c0a91 --stat` — 4 arquivos, 320 inserções
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 7b318ea9434a3a1ec885f814c3e816da174c0a91 -- test/estatico/piso-de-assercoes.test.ts test/estatico/piso-de-assercoes-0018.test.ts` — diff dos dois testes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "Task 9\|### T09\|## T09\|T09" -- docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md` — T09 na linha 1674
- `git -C /home/deploy/servidor/projetos/estruturaAutonoma grep -n "^## " -- docs/construcao/padrao-tecnico.md` — seção 12 na linha 130 (fora da lista Pode; ver Pendência 4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 41108ee -- test/estatico/piso-de-assercoes.test.ts` — só acréscimos depois da linha 92
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "CA-08\|RF-08\|SB-15\|B-08-2" -- docs/construcao/DEC-DEM-20261111-0018-v1/01-analista-requisitos.md docs/construcao/DEC-DEM-20261111-0018-v1/04-seguranca-aplicacao.md` — RF-08, CA-08 e SB-15
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -c "expect(" -- src` — contagem por arquivo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -c "expect(" -- test` — contagem por arquivo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -c "expect(" -- e2e` — contagem por arquivo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -c "expect(" -- scripts` — contagem por arquivo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "matchAll" -- test/estatico` — nenhum outro leitor do PISO
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 7b318ea9434a3a1ec885f814c3e816da174c0a91~1 7b318ea9434a3a1ec885f814c3e816da174c0a91 --stat` — 4 arquivos, só os da tarefa e da passagem
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/piso-de-assercoes-0018.test.ts test/estatico/piso-de-assercoes.test.ts test/estatico/piso-de-assercoes-qa.test.ts --reporter=dot` — 211 de 211, 3 arquivos
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
