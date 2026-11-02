---
pedido: DEC-DEM-20261102-0005-v1
etapa: 03-correcao
agente: engenheiro-frontend
leu: [contrato-passagem.md, pedido.json, 01-qa-funcional.md, 02-tech-lead.md, e2e/decisao.spec.ts, test/estatico/projeto.test.ts, package.json, playwright.config.ts]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Segui a triagem da `02-tech-lead.md` passo a passo. O axe não achou violação na tela arquivada, então `src/` não mudou.

### Arquivos alterados

- `test/estatico/projeto.test.ts`: o `it` da versão passa para 0.1.4, no título e no `expect`. O comentário de cima é
  o que a triagem propôs: `// 0.1.4: DEC-DEM-20261102-0005-v1 (axe no estado arquivado da decisão e cabeçalho da decisao.spec.ts, sem mudança de comportamento).`
- `package.json`: só o `version`, de `0.1.3` para `0.1.4`.
- `e2e/decisao.spec.ts`:
  - **D-1:** no fim do teste "Arquivar", depois da conferência `toBe('encerrada')`, entrou
    `await semViolacoes(page, 'T11 arquivado');`. Fora essa linha, o teste está igual ao da 0.1.3 (título, comentários,
    pré-condição `exigeBancoRecemSemeado(ORIGENS_DO_FLUXO.includes(status), ...)`, `novoPacote`, o "antes de arquivar",
    o alerta, `arquivada` e `encerrada`). Não há `disableRules`, `exclude`, `include` nem `AxeBuilder` próprio, e
    `e2e/apoio.ts` não mudou.
  - **D-2:** refiz a quebra das linhas do cabeçalho:
    - O primeiro parágrafo (antes linhas 1 a 11, agora 1 a 13) usa o texto que a triagem propôs. A linha órfã
      `(08-correcao, A-04: o nível` sumiu. A frase do axe agora lista todos os estados que têm axe, o arquivado incluído.
    - No segundo bloco, as quatro linhas que mudaram (antes 20 a 23, agora 22 a 25) também usam o texto da triagem.
    - Os marcadores `//`, `//   - ` e `//     ` não mudaram, nem a linha `// Uso por conta deste arquivo: ...`.
    - No `git diff`, as únicas linhas mudadas no cabeçalho começam com `//`. Nenhuma linha de código mudou.

### Largura do cabeçalho (linhas 1 a 28)

Contei os caracteres à mão, linha a linha, pelo `Read`. Cada `//`, espaço e letra acentuada conta como um caractere.
A linha mais longa tem **120**: a linha 20 (`//   - exigem banco recém-semeado: ...`), que não mudou e já tinha 120.
Entre as linhas mudadas, a mais longa tem **118** (linha 11, que termina em `diálogo aberto,`, e linha 24, que
termina em `e a`). Nenhuma linha começa com uma palavra que caberia na linha de cima. A linha 13 (`// arquivado).`) é o
fim do parágrafo: `arquivado).` não cabe na linha 12, que ficaria com 128.

### Testes

- Nenhum teste novo. Mudaram o teste estático da versão e o e2e "Arquivar", que agora passa pelo axe.
- **Teste que falha primeiro (passo 0):** com o `it` em 0.1.4 e o `package.json` ainda em 0.1.3, o `pnpm test`
  reprovou:
  ```
  FAIL  test/estatico/projeto.test.ts > package.json > versão 0.1.4, privado, ESM, Node 24 e pnpm 12.6.0 fixo (C-39)
  AssertionError: expected '0.1.3' to be '0.1.4' // Object.is equality
  Test Files  1 failed | 191 passed (192)
       Tests  1 failed | 3696 passed (3697)
  ```
  Com o `version` em 0.1.4: 3697 de 3697 aprovados, 192 de 192 arquivos.
- **Axe no arquivado (passo 2)**, rodado com o banco novo que o `webServer` do e2e sobe (Testcontainers):
  `✓ 1 [chromium] › e2e/decisao.spec.ts:348:1 › Arquivar → "Pacote arquivado. A demanda foi para Encerrada."`,
  `1 passed`. Foi aprovado, não pulado, e o axe não acusou nada em `axe em T11 arquivado`.
- **Suíte e2e inteira, uma vez, com banco novo:** 143 aprovados, 0 pulado, 0 falha (5,4 min).
- **`e2e/decisao.spec.ts --repeat-each=3`, num banco só, sem `CI`:** 19 aprovados, 8 pulados, 0 falha. Bate com o
  esperado na triagem:
  - 1.ª repetição: os 9 aprovados, o "Arquivar" e o axe dele incluídos;
  - 2.ª e 3.ª: 5 aprovados cada (C-14, M-01, P1-b, A-02 e o de 404 e sessão) e 4 pulados cada ("nível cto: aprovar A",
    "dupla aprovação", "CA-12.4" e "Arquivar"), que são os testes que exigem banco recém-semeado.

### Desvios do plano

Nenhum. Usei o texto que a triagem propôs para o cabeçalho, sem trocar palavras. `src/` não mudou porque o axe não
acusou violação.

## Decisões tomadas

- Usei o reflow que a triagem propôs, em vez de um meu: ela já tinha contado as larguras, e o mesmo texto deixa a revisão mais fácil.
- Na linha 24 do cabeçalho, "são" ficou no começo da linha, embora coubesse na linha 23. Foi o texto da triagem e cumpre a regra: a linha 24 não é uma palavra sozinha.
- `src/` ficou como estava porque o axe passou na tela arquivada. A ESP só manda mexer na tela quando há violação.
- O banco novo veio do `webServer` do Playwright, que sobe um Testcontainers a cada execução. Por isso não usei o `docker-compose.dev.yml`.
- Na primeira vez em que rodei a suíte de unidade para ver a falha, passei a saída por um pipe só para cortá-la. Esse formato está fora da lista Pode, então repeti o `pnpm test` sem pipe antes de mudar o `package.json`, e ele reprovou do mesmo jeito (1 falha, `expected '0.1.3' to be '0.1.4'`). Só a execução sem pipe aparece em Comandos executados. O maestro liberou a primeira por ser só leitura.

## Pendências

- Para o maestro, na `04-revisao`: medir com uma ferramenta a largura das linhas 1 a 28 do cabeçalho. Contei à mão, porque nenhum comando da minha lista mede colunas.
- Para a `04-regressao`: o reporter `list` não mostra o motivo do pulo. Os 8 pulados do `--repeat-each=3` são os quatro testes que exigem banco recém-semeado, mas confirme no relatório HTML ou no trace que a mensagem é `exige banco recém-semeado: ...`.
- `CHANGELOG.md` com a 0.1.4 fica com a `06-documentacao`, como manda a triagem.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo construcao/DEC-DEM-20261102-0005-v1, só `test/estatico/projeto.test.ts` alterado naquela hora
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — reprovou como o esperado: 1 falha (`expected '0.1.3' to be '0.1.4'`) e 3696 aprovados de 3697
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff` — só as linhas `//` do cabeçalho, a chamada `semViolacoes` nova, o `version` e o `it` da versão
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent` — 3697 de 3697 aprovados, 192 de 192 arquivos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/decisao.spec.ts --grep "Arquivar"` — 1 aprovado, 0 pulado
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — 143 aprovados, 0 pulado, 0 falha
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/decisao.spec.ts --repeat-each=3` — 19 aprovados, 8 pulados, 0 falha
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 3 arquivos: e2e/decisao.spec.ts, package.json, test/estatico/projeto.test.ts

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] os textos são os de `03-ux-ui-design.md`, em pt-BR, e o axe não acusa violação nas telas tocadas
