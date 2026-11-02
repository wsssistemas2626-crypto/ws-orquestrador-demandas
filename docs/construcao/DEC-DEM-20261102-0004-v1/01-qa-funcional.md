---
pedido: DEC-DEM-20261102-0004-v1
etapa: 01-reproducao
agente: qa-funcional
leu: [contrato-passagem.md, pedido.json, DEC-DEM-20261102-0003-v1/04-maestro.md, e2e/decisao.spec.ts, e2e/apoio.ts, scripts/seed-ficticio.ts, playwright.config.ts, src/modules/demandas/transicoes.ts, src/modules/pacotes-decisao/decidir.ts, src/modules/pacotes-decisao/criar.ts, src/modules/especificacoes/servico.ts, src/components/dados-da-decisao.ts, estruturaAutonoma/ferramentas/construir/construir.mjs (homologar)]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

### Defeito

**B-01: o teste "Arquivar" passa sem provar a mudança de status quando a demanda já está `encerrada`.** O teste fica em
`e2e/decisao.spec.ts:343-366`.

- **Severidade: baixa.** O defeito está só no teste; o sistema se comporta como a regra manda. O impacto é um falso
  verde: se a transição automática `decisao_arquivada` quebrasse, o teste continuaria passando em toda execução que
  reaproveita o banco. No CI e no `construir.mjs homologar` o banco é sempre novo, e lá a mudança fica provada.
- **Ambiente:** e2e Playwright do ramo `main` (0.1.2), com `workers: 1` e `fullyParallel: false`
  (`playwright.config.ts:19-20`), num banco que já passou uma vez pelo "Arquivar". Isso acontece em três situações:
  com `--repeat-each` maior que 1, com `BASE_URL` apontando para uma homologação reaproveitada, ou com o teste rodado
  duas vezes no mesmo servidor.

### Por que o teste aceita a partida errada (leitura do código)

1. O seed (`scripts/seed-ficticio.ts:188-195` e `:285`) cria a "Demanda da decisão (fictício)"
   (`TITULOS_DO_E2E.decisao`) com status `nova`, sem ESP, RSK nem DEC. A demanda é uma só por banco, e todos os testes
   da `decisao.spec.ts` a acham pelo título (`demandaDoSeed`, `e2e/apoio.ts:76-84`). Nenhuma outra spec usa essa
   demanda.
2. As transições automáticas estão em `src/modules/demandas/transicoes.ts:54-59`:
   - `dec_criado`: de `nova`, `em_analise` ou `aguardando_informacao` para `pronta_para_decisao`;
   - `decisao_devolvida`: de `nova`, `aguardando_informacao` ou `pronta_para_decisao` para `em_analise`;
   - `decisao_arquivada`: de `nova`, `em_analise`, `aguardando_informacao` ou `pronta_para_decisao` para `encerrada`.

   Quando o status atual está fora da origem, `mudarStatusPeloSistema` (`:63-78`) sai sem fazer nada e sem gravar
   evento. `encerrada` não está em nenhuma origem e é final (`MANUAIS`, `:24`).
3. Criar um DEC não depende do status da demanda: `src/modules/pacotes-decisao/criar.ts:127` só chama `dec_criado`.
   Arquivar também não depende: `decidir.ts:221-222` grava a decisão e chama `decisao_arquivada`. Por isso o teste
   consegue criar e arquivar um DEC numa demanda `encerrada` sem erro.
4. O alerta "Pacote arquivado. A demanda foi para Encerrada." é texto fixo (`src/components/dados-da-decisao.ts:127`).
   Ele aparece quando o arquivamento grava, mude o status ou não. A conferência da linha 353 não prova a transição.
5. `ORIGENS_DO_FLUXO` (`e2e/decisao.spec.ts:35`) é exatamente a origem de `decisao_arquivada`. A pré-condição da
   linha 348, porém, é `[...ORIGENS_DO_FLUXO, 'encerrada'].includes(status)`, que aceita `encerrada` de propósito (o
   comentário da linha 347 diz isso). Com essa partida, a linha 354, `expect(statusDa(...)).toBe('encerrada')`, passa
   sem que nada tenha mudado.
6. `exigeBancoRecemSemeado` (`:40-44`) não ajuda nesse caso, por dois motivos:
   - a condição que recebe já é verdadeira com `encerrada`, então ele nem reprova (com `CI`) nem pula (sem `CI`);
   - o furo não depende de `CI`: com `CI=1` e um banco reaproveitado, o falso positivo também acontece. Hoje o CI só
     fica protegido porque o banco é novo (Testcontainers em `playwright.config.ts:1-3`; `homologar` faz `down -v`,
     `construir.mjs:324`).

### Ordem dos testes da spec e o status da demanda ao longo dela

O arquivo roda em série, na ordem em que os testes estão escritos.

| # | Teste (linha) | Status de partida (1ª passada, banco novo) | Efeito na "Demanda da decisão" | Status ao fim |
|---|---|---|---|---|
| 1 | C-14 (128) | `nova` | nenhum (usa o DEC de agente de outra demanda) | `nova` |
| 2 | M-01 (179) | `nova` | cria ESP v1 e RSK v1 (`espValida` sem dúvida, sem transição) | `nova` |
| 3 | P1-b (194) | `nova` | cria um DEC (`dec_criado`) | `pronta_para_decisao` |
| 4 | nível cto: aprovar A (206) | `pronta_para_decisao` | cria e aprova um DEC; aprovar não muda o status | `pronta_para_decisao` |
| 5 | A-02 (236) | `pronta_para_decisao` | cria outro DEC, que recebe 409 | `pronta_para_decisao` |
| 6 | dupla aprovação (262) | (usa outra demanda) | nenhum | `pronta_para_decisao` |
| 7 | CA-12.4 (310) | `pronta_para_decisao` | cria um DEC e uma ESP nova, e devolve (`decisao_devolvida`) | `em_analise` |
| 8 | Arquivar (343) | `em_analise` | cria um DEC (`dec_criado`: `pronta_para_decisao`) e arquiva (`decisao_arquivada`) | `encerrada` |

Na 1ª passada a mudança fica provada: o status vai de `em_analise` para `pronta_para_decisao` e de lá para
`encerrada`.

Na 2ª passada sobre o mesmo banco, a demanda já começa `encerrada`, e é ali que mora o falso positivo:

- os testes 1, 2, 3 e 5 rodam; o 3 e o 5 criam DECs, e o `dec_criado` não faz nada a partir de `encerrada`;
- o 4 e o 6 são pulados com "exige banco recém-semeado: …", porque já existe DEC aprovado;
- o 7 é pulado porque `encerrada` está fora de `ORIGENS_DO_FLUXO`;
- o 8 lê `encerrada` (linha 346), a linha 348 aceita esse status, cria o DEC (linha 349) e arquiva pela tela
  (linhas 351-352). `mudarStatusPeloSistema` sai sem fazer nada, o alerta fixo aparece (linha 353) e a linha 354 lê
  `encerrada`. O teste **passa** sem que o status tenha mudado.

### Passos para reproduzir

O dado de teste é o seed fictício: conta fictícia "cto" e "Demanda da decisão (fictício)". Não há dado pessoal real.

**Reprodução mínima e determinística.** Sem `BASE_URL`, cada execução do Playwright sobe um banco novo, e o
`--repeat-each` repete o teste dentro dele.

1. Num checkout do ramo, sem `CI` e sem `BASE_URL`, rodar `pnpm test:e2e e2e/decisao.spec.ts --grep "Arquivar" --repeat-each=2`.
2. **1ª repetição:** a demanda sai do seed `nova`; a ESP e o RSK são criados; o DEC leva a demanda a
   `pronta_para_decisao`; o arquivamento a leva a `encerrada`. O teste passa e a transição foi provada.
3. **2ª repetição:** a demanda já está `encerrada`; a linha 348 aceita a partida; DEC criado e arquivado, alerta
   exibido, status `encerrada`. O teste passa.
4. Repetir o passo 1 com `CI=1` na frente dá o mesmo resultado. Isso mostra que o "CI reprova a pré-condição falsa"
   não cobre esse caso, porque a condição da linha 348 é verdadeira.

**Reprodução pela suíte inteira:** rodar `pnpm test:e2e e2e/decisao.spec.ts --repeat-each=2`, sem `CI`. Na 2ª
passada, o "Arquivar" passa a partir de `encerrada`, como na tabela acima.

**Resultado esperado** (critérios do `pedido.json`):

- com `CI` definido, a 2ª repetição **reprova** com "exige banco recém-semeado: a demanda … está encerrada …";
- sem `CI`, a 2ª repetição é **pulada** com essa mensagem, ou usa uma demanda ainda não arquivada;
- em nenhum caso o teste passa sem ter visto o status antes (em `ORIGENS_DO_FLUXO`) e depois (`encerrada`).

**Resultado obtido:** a 2ª repetição **passa**, com e sem `CI`, partindo de `encerrada` e terminando em `encerrada`.
Nenhuma transição acontece e nenhum evento `status_alterado` é gravado.

> As execuções acima vêm da leitura do código e não foram rodadas: o qa-funcional não tem Bash. A 04-regressao do
> pedido anterior (`--repeat-each=3`: 75 aprovados, 6 pulados, nenhuma falha) bate com esta análise: os 6 pulados
> são o "nível cto", a "dupla aprovação" e o "CA-12.4" nas repetições 2 e 3, e o "Arquivar" aparece entre os
> aprovados.

### O que um teste precisa fazer para mostrar a falha de forma determinística

1. **Garantir a partida `encerrada` sem depender da ordem.** Rodar o "Arquivar" duas vezes no mesmo banco
   (`--grep "Arquivar" --repeat-each=2`). A 1ª repetição deixa a demanda `encerrada` e a 2ª parte dela. Não precisa
   de nenhum outro teste nem de mudar o banco à mão.
2. **Rodar com `CI=1` e esperar reprovação na 2ª repetição.** Com a correção, a pré-condição passa a ser
   `ORIGENS_DO_FLUXO.includes(status)`, e a 2ª repetição reprova com a mensagem "exige banco recém-semeado: …". Hoje
   ela passa: é essa diferença que prova o defeito.
3. **Rodar sem `CI` e esperar o pulo com mensagem na 2ª repetição.** Se a triagem escolher a demanda própria, o
   esperado passa a ser usar uma demanda não arquivada. Hoje a 2ª repetição sai como aprovada.
4. **Conferir o status em dois pontos, além do alerta, que é texto fixo e não prova nada:**
   - antes de arquivar: o status lido está em `ORIGENS_DO_FLUXO`. Depois do POST do DEC (linha 349), deve ser
     `pronta_para_decisao`, porque o `dec_criado` sai de `nova`, `em_analise` ou `aguardando_informacao`;
   - depois: `encerrada`.
5. **Opcional, sem servidor:** extrair a pré-condição para uma função pura em `e2e/preparacao.ts`, ao lado de
   `prepararEspERsk`, e testá-la em `e2e/preparacao.spec.ts`. O teste diria que `encerrada` (e `aprovada`,
   `em_construcao`, `entregue`, `devolvida`) não serve de partida e que os quatro status de `ORIGENS_DO_FLUXO` servem.
   Hoje, com a lista da linha 348, o caso `encerrada` falharia.

### Arquivos suspeitos

- `e2e/decisao.spec.ts:347-348`: o comentário e a pré-condição que aceitam `encerrada`. É a causa.
- `e2e/decisao.spec.ts:353-354`: o alerta (texto fixo) e o status final, conferidos sem o status de antes.
- `e2e/decisao.spec.ts:17-22`: o comentário do cabeçalho põe o "Arquivar" entre os testes que "rodam em qualquer
  banco". Ele deve mudar junto com a correção.
- `scripts/seed-ficticio.ts:141-151` e `:188-195`: só entram se a triagem escolher a demanda própria do seed.

## Decisões tomadas

- Severidade baixa: o defeito está só no teste, o sistema não erra, e o CI e a homologação seguem provando a transição
  porque o banco é novo. O risco é perder a regressão de `decisao_arquivada` nas execuções repetidas.
- Usei `--grep "Arquivar" --repeat-each=2` como reprodução mínima: não depende da ordem dos outros testes, e a
  1ª repetição já leva a demanda a `encerrada` a partir do seed.
- Registrei que o furo também vale com `CI=1` num banco reaproveitado. Mostra que a causa é a condição da linha 348, e
  não a falta de `CI`.

## Pendências

- Para o `tech-lead` (02-triagem), escolher o caminho:
  - (a) pular ou reprovar com `ORIGENS_DO_FLUXO.includes(status)`;
  - (b) usar uma demanda própria do seed.

  Mesmo no (b), a demanda própria também fica `encerrada` depois da 1ª execução no banco. Fora do CI, a partir da 2ª
  execução, o pulo com mensagem continua necessário. Criar demanda pela API a cada execução esbarra no C-36: hoje
  este arquivo cria 0 demandas pela API.
- Para o `tech-lead`: se o "Arquivar" for pulado, as conferências de 404 e de sessão (linhas 356-365), que valem em
  qualquer banco, deixam de rodar nas repetições. Pode ser o caso de separá-las num teste próprio, sem pré-condição.
- Para o `analista-requisitos`, fora deste pedido: o sistema aceita criar e arquivar DEC numa demanda `encerrada`
  (status final), e o alerta diz "A demanda foi para Encerrada." mesmo quando ela já estava. Falta confirmar se a
  regra prevê isso. O pedido proíbe mudar comportamento do sistema, então fica só registrado.

## Comandos executados

Nenhum.

## Critério de pronto atendido

- [x] (01) os passos de reprodução estão completos e o resultado obtido está descrito
