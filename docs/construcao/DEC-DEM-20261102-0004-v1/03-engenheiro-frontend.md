---
pedido: DEC-DEM-20261102-0004-v1
etapa: 03-correcao
agente: engenheiro-frontend
leu: [contrato-passagem.md, pedido.json, 01-qa-funcional.md, 02-tech-lead.md, e2e/decisao.spec.ts, test/estatico/projeto.test.ts, package.json, playwright.config.ts]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Correção do B-01 pelo caminho (a) da triagem: o "Arquivar" só aceita partida de `ORIGENS_DO_FLUXO` e confere o
status antes e depois de arquivar. As conferências de 404 e de sessão foram para um teste próprio, sem pré-condição.

### Arquivos alterados

- `e2e/decisao.spec.ts`
  - "Arquivar" (título sem "; 404 e sem sessão"):
    - pré-condição `exigeBancoRecemSemeado(ORIGENS_DO_FLUXO.includes(status), ...)`, sem aceitar `encerrada`;
    - `pronta_para_decisao` conferido depois do DEC novo e antes de arquivar;
    - depois do alerta, `statusDecisao: 'arquivada'` no DEC e `encerrada` na demanda, as duas com mensagem.
  - Teste novo `404 para DEC inexistente, id de outro tipo e caminho inválido; sem sessão, a decisão vai para /entrar`:
    - sem pré-condição e sem POST;
    - o 404 usa `proximoId` da lista lida no próprio teste (N-01);
    - a sessão usa o DEC de agente do seed (`idDoDecDeRascunhoDoSeed`).
  - Cabeçalho (linhas 4-6 e 18-25): o "Arquivar" passou para os que exigem banco recém-semeado (B-01 do
    DEC-DEM-20261102-0003-v1, corrigido no DEC-DEM-20261102-0004-v1), e o de 404 e sessão foi para os que rodam em
    qualquer banco. O uso por conta continua: "cto" 0 demandas pela API e "administradora" 0.
- `test/estatico/projeto.test.ts`: o `it` da versão espera 0.1.3 (título, `expect` e comentário, conforme a triagem).
- `package.json`: `version` 0.1.2 para 0.1.3.

Não mudaram: `src/`, `scripts/`, `e2e/apoio.ts`, `e2e/preparacao.ts`, `playwright.config.ts`, `exigeBancoRecemSemeado`,
os `semViolacoes` (axe), o C-36 e a A-02. Não há `.skip`, `.only`, `.fixme` nem `.todo` novo, e nenhuma asserção ficou
mais fraca. `git status` mostra só os três arquivos.

### Testes criados ou alterados

- Teste novo: 404 e sessão (`e2e/decisao.spec.ts`).
- Conferências novas no "Arquivar": status antes de arquivar, `statusDecisao` arquivada e status depois com mensagem.
- Teste estático de versão (`test/estatico/projeto.test.ts`).

### Teste antes do código: visto falhando

1. **Versão.** Com o teste em 0.1.3 e o `package.json` ainda em 0.1.2, `pnpm test test/estatico/projeto.test.ts`
   deu 1 falha e 10 aprovados:
   `AssertionError: expected '0.1.2' to be '0.1.3' // Object.is equality`. Depois da troca, `pnpm test` ficou verde.
2. **B-01.** Com as conferências novas e a pré-condição velha, `--grep "Arquivar" --repeat-each=2` deu 1 aprovado e
   1 reprovado. A 2ª repetição falhou em:
   ```
   Error: status da demanda DEM-20261102-0012 antes de arquivar
   Expected: "pronta_para_decisao"
   Received: "encerrada"
   ```
3. **Depois da correção**, o mesmo comando deu 1 aprovado e 1 pulado. A mensagem do pulado, lida no reporter JSON:
   `exige banco recém-semeado: a demanda DEM-20261102-0012 está encerrada, e o arquivamento não prova a mudança para Encerrada`.

### Resultados

- `pnpm test`: 192 arquivos, 3697 de 3697 aprovados.
- `pnpm lint` e `pnpm typecheck`: limpos.
- `--grep "404"`: 1 aprovado.
- `e2e/decisao.spec.ts --repeat-each=3`, num banco só e sem `CI`: 19 aprovados, 8 pulados e 0 falha, como a triagem
  previu.
  - 1ª repetição: 9 de 9 aprovados.
  - 2ª e 3ª: 5 aprovados e 4 pulados em cada uma. Aprovados: C-14, M-01, P1-b, A-02 e 404/sessão. Pulados: "nível
    cto", "dupla aprovação", "CA-12.4" e "Arquivar".
- `pnpm test:e2e` inteiro, três vezes seguidas, cada uma em banco novo: as três terminaram com código de saída 0.
  `test-results/.last-run.json` registrou `"status": "passed"` e `"failedTests": []` depois de cada uma.

### Desvios do plano

- A triagem pedia a suíte e2e uma vez nesta etapa; rodei três vezes, como o maestro pediu.
- Para registrar a mensagem do pulado, rodei o `--grep "Arquivar" --repeat-each=2` uma vez a mais, com
  `--reporter=json`, porque o reporter `list` não mostra o motivo do pulo.
- Nenhum outro desvio.

## Decisões tomadas

- Usei o caminho (a) da triagem: as liberações de `scripts/seed-ficticio.ts` e `scripts/scripts.test.ts` não foram usadas, porque a demanda própria do seed também ficaria `encerrada` depois da 1ª execução.
- `exigeBancoRecemSemeado` ficou igual: só mudou a condição. Com `CI`, a partida fora de `ORIGENS_DO_FLUXO` reprova pelo `expect` que já existe; sem `CI`, pula com a mensagem.
- O status antes de arquivar é conferido como `pronta_para_decisao` exato, porque o `dec_criado` leva qualquer status de `ORIGENS_DO_FLUXO` a ele.
- O teste de 404 e sessão usa o DEC de agente do seed para a sessão: ele existe em qualquer banco, e assim o teste não faz POST.
- Uma linha do cabeçalho ficou mais curta que as outras ("(08-correcao, A-04: o nível"). Não reformatei depois das três execuções da suíte para não rodar de novo um arquivo diferente do que foi testado. É só estética.

## Pendências

- Para a `04-regressao` (qa-automacao): nas três execuções inteiras, não consegui registrar quantos testes passaram e quantos foram pulados. O ambiente passou cada execução para segundo plano depois de 180 s, e a saída completa foi para um arquivo em `/tmp`, que o maestro me proibiu de ler. Ficam provados o código de saída 0 e o `.last-run.json` sem falha. Falta conferir o "0 pulado" em banco novo.
- Para o maestro, opcional, como já está na triagem: a prova direta do ramo do CI precisa de `CI=1 pnpm test:e2e e2e/decisao.spec.ts --grep "Arquivar" --repeat-each=2`, e essa forma de comando está fora da minha lista Pode.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo construcao/DEC-DEM-20261102-0004-v1; só projeto.test.ts alterado
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — falhou como esperado (teste de versão); a saída longa foi cortada
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/projeto.test.ts` — 1 falhou e 10 passaram: expected '0.1.2' to be '0.1.3'
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/decisao.spec.ts --grep "404"` — 1 passou
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/decisao.spec.ts --grep "Arquivar" --repeat-each=2` — antes da correção: 1 passou e 1 falhou em "antes de arquivar"
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/decisao.spec.ts --grep "Arquivar" --repeat-each=2` — depois da correção: 1 passou e 1 pulado
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/decisao.spec.ts --grep "Arquivar" --repeat-each=2 --reporter=json` — 1 esperado, 1 pulado, 0 inesperado; mensagem do pulo registrada
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 3697 de 3697 em 192 arquivos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/decisao.spec.ts --repeat-each=3` — 19 passaram, 8 pulados, 0 falha
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — 1ª execução: código de saída 0, sem teste reprovado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 3 arquivos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — 2ª execução: código de saída 0, sem teste reprovado
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — 3ª execução: código de saída 0, sem teste reprovado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — só os três arquivos da tarefa
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff` — conferido: só os três arquivos da tarefa, sem asserção mais fraca nem .skip/.only novo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] os textos são os de `03-ux-ui-design.md`, em pt-BR, e o axe não acusa violação nas telas tocadas (nenhum texto de tela mudou; os `semViolacoes` ficaram iguais e passaram)
