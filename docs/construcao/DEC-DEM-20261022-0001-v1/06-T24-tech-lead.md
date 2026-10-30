---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T24-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md, tarefas.json, 2026-10-25-ws-orquestrador-demandas-plano.md (cabeçalho, G1 a G6, mapa das fases, T23 a T28), 06-T24-engenheiro-backend.md, 06-T23-tech-lead.md, 04-seguranca-aplicacao.md (seções 1, 2.17 e 3), git show 198a23b 3b5774d 4fc3c17, src/modules/dados-pessoais/minimizar.ts, src/modules/dados-pessoais/minimizar.test.ts, src/modules/agentes/entrada-agente.ts, src/modules/agentes/entrada-agente.test.ts, src/db/schema/versoes.ts, src/modules/versoes.ts, src/modules/demandas/gerar-id.ts, src/lib/rota.ts (linhas 1 a 80)]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T24 (minimização e montador da entrada de cada agente), intervalo `8e92ce8..4fc3c17`. O código e os testes
estão no `198a23b`. O `3b5774d` só mexe no registro, e o `4fc3c17` só regrava a entrega e o registro (6 linhas a menos
na entrega). **Não há problema Critical nem Important.** A passagem segue para a `06-T24-testes`. Os três pontos Minor
estão nos Pareceres e em Pendências.

### Conferência contra o plano

| Item do plano | Situação |
|---|---|
| Arquivos | Os 4 da lista, todos novos. Nenhum arquivo existente mudou (`git diff --stat` e `git show --stat` dos três commits) |
| `MARCADORES` | Os quatro textos do plano, testados por igualdade |
| `CABECALHOS_DE_EMAIL` | Os 11 cabeçalhos do plano e de C-23, mais `Enviado em` (desvio 4, aceito). Flags `gim`. A linha sai inteira, com a quebra. "De:" no meio da linha, "Assunto:", "Data:" e as palavras que só começam igual ficam (testado) |
| `minimizar` | Usa os `DETECTORES` da T22 com `replace`, sem regex nova de dado pessoal. A ordem é cabeçalho, nome, e-mail, CNPJ, CPF e telefone. A chamada de um parâmetro, como no plano, continua valendo (desvio 2, aceito) |
| `CAMPOS_POR_AGENTE` | Igual ao plano, comparado inteiro no teste. Os 8 campos de demanda são os do plano. As listas da ESP e do RSK têm só colunas de conteúdo de `versoes.ts`, sem id, versão, autoria, execução nem data (conferido no esquema) |
| `delimitarComoDado` | Instrução antes do bloco, JSON numa linha só, `</dados>` do conteúdo vira `[/dados]`. O texto da instrução mudou porque o texto do plano contém `</dados>` e quebraria o próprio teste de C-24 do plano (desvio 1, aceito) |
| `montarEntrada` | Assinatura do plano. As chaves batem com a T28 (`entrada:`, `demanda:`, `esp:`, `rsk:`). Uma chave fora do formato dá `nao_encontrado` sem consulta, e o `Db` com Proxy que quebra ao ser tocado prova isso (G3.10, C-17) |
| Passo 3 | A minimização vale para todo campo de texto, inclusive para os itens das listas `escopoInclui`, `criteriosAceitePreliminares`, `recomendacoesMitigacao` e as demais (testado no risco e na consolidação) |

### Cobertura dos critérios e controles

- **CA-20.1:** o caso do plano em `minimizar.test.ts` e o mesmo texto pelo orquestrador, de ponta a ponta no montador.
- **CA-20.2:** o caso do plano, mais a comparação do JSON inteiro do bloco. O nome, o papel, o anexo (referência e
  descrição), a origem e os ids não aparecem, e os detectores não acham nada no conteúdo.
- **C-23:** os 12 cabeçalhos testados um por um. O `contexto` com e-mail e com `De: Pessoa Ficticia <…@exemplo.test>`
  passa pelo montador, como o 04 pede. A lista de permissão está no próprio SELECT (`colunas(...)`), e o
  `solicitanteNome` é lido só para ser trocado no texto.
- **C-24 (parte do montador):** o caso do plano, mais marcas falsas com caixa, espaço e tab real, marca dentro de chave
  de objeto, e os quatro agentes passando pelo delimitador. A neutralização antes do `JSON.stringify` fecha o caso do
  `</dados\t>`, que depois do JSON viraria `\t` escapado e escaparia da troca.
- **RF-20 (nome no texto):** o nome do solicitante citado no texto vira `[nome removido]`, sem diferença de caixa e
  nunca como pedaço de outra palavra. O caractere especial do nome é tratado como literal.

Os testes falhariam sem o código: os dois arquivos falharam por módulo ausente, com o comando e o trecho na entrega. Os
testes de comportamento conferem valores exatos (texto final, JSON inteiro e contagem de marcas), e não só a ausência
do sentinela.

### Verificação própria

- `pnpm test`: 116 arquivos, 2232 de 2232.
- `pnpm lint` e `pnpm typecheck` limpos.
- O aviso do undici "Using `patch`" segue na saída, como na `06-T23-revisao`. Não vem desta tarefa, que não tem rota.
- `git log -S` confirma que a regex de id de ESP já existia em `src/lib/rota.ts` desde a T11 (Minor 1). Não há
  ajudante de UUID exportado antes desta tarefa: os outros dois commits com essa regex são de teste e de esquema.

### Checklist da seção 12

- [x] Faz o que o plano pede, nem mais nem menos. Os arquivos fora da tarefa não mudaram. Os quatro desvios declarados
      estão aceitos (ver Decisões).
- [x] Há teste para cada comportamento novo, e ele falharia sem o código.
- [x] Não há segredo, valor de `.env` nem dado pessoal real. Os dados são fictícios: domínio `.test`, "Pessoa
      Ficticia", `SENTINELAS`, CPF e CNPJ de exemplo do plano.
- [x] Entrada externa validada: a tarefa não tem rota nem Server Action. A chave de entrada é conferida pela regex
      antes de qualquer consulta, e o erro é o `nao_encontrado` genérico, sem a chave recebida.
- [x] Banco: não se aplica (sem migration nem tabela nova). As leituras usam só `SELECT`, que o papel do app já tem.
- [x] Nenhuma função nova repete uma que já existe, com uma exceção pequena: duas regex de id já existem em
      `src/lib/rota.ts` (Minor 1).
- [x] Textos em pt-BR. A tarefa não tem tela, então o axe não se aplica.
- [x] Os Minor estão em Pendências. Não há Critical nem Important.
- [x] PR (`/code-review`, `/security-review`): não se aplica a esta etapa, fica com a `08-revisao`.

### Pareceres (todos Minor; não bloqueiam)

| # | Arquivo:linha | Problema | Razão |
|---|---|---|---|
| 1 | `src/modules/agentes/entrada-agente.ts:73` e `:74` | `RE_ID_ESP` e `RE_ID_RSK` repetem as regex que `src/lib/rota.ts:24` a `:29` já expõe por `reIdVersao('ESP')` e `reIdVersao('RSK')`. O `RE_ID_DEMANDA`, também repetido em `gerar-id.ts`, tem um teste que prende as duas cópias. Estas duas não têm | Se o formato do id mudar só na rota, o montador passa a dar `nao_encontrado` para uma chave válida. A falha fecha (nada vaza, só a execução falha), por isso não bloqueia. Importar `lib/rota` no módulo traria `deps`, Sentry e acesso junto, o que explica a cópia. Correção para a 08: levar o mapa por prefixo para `src/modules/versoes.ts`, que já tem `RE_ID_VERSAO` e não depende da rota, e fazer a rota e o montador lerem dele. Pode ir junto com o ajudante único dos Minor da T21 a T23 |
| 2 | `src/modules/dados-pessoais/minimizar.ts:25` | O cabeçalho que continua na linha de baixo sai só pela metade. É o caso de `Para:` ou `Cc:` com vários destinatários quebrados em linhas que começam com espaço, sem o nome do cabeçalho. Os e-mails dessas linhas caem nos detectores, mas os nomes ficam. No outro sentido, uma linha legítima que começa por "Para:" (por exemplo "Para: resolver até sexta") também sai | O primeiro caso é mais um limite da mesma natureza dos dois que a entrega já registrou para a 08: o nome que não é o do solicitante continua no texto. O segundo só tira contexto e não vaza nada. Fica para a `seguranca-aplicacao` na `08-revisao` decidir se a continuação de cabeçalho (linha seguinte com espaço inicial, logo depois de um cabeçalho removido) entra na regra |
| 3 | `src/modules/agentes/entrada-agente.ts:199` | Na consolidação, o RSK é o da chave e a ESP é a mais nova da demanda, e não a ESP que o risco leu. Se uma ESP v2 entrar depois do RSK v1 e a execução `rsk:RSK-…-v1` rodar atrasada, o agente recebe o RSK v1 com a ESP v2 | O `parecer_risco` não guarda a ESP de origem, e a ESP mais nova é a que o `criarPacoteDecisao` cita. A escolha é a única possível com o modelo atual, e o DEC continua passando pela revisão humana e pelo cálculo de desatualizado (RF-12). Fica como aviso para a T28 |

## Decisões tomadas

- **Desvio 1 aceito (texto da instrução do bloco).** Razão: o texto do plano contém `</dados>` e quebraria o teste de
  C-24 do próprio plano. O texto novo mantém o sentido e passa na regex `/não (é|são) instruç/i` que a T26 usa.
- **Desvio 2 aceito (`minimizar(texto, { nomes })` e `MARCADOR_NOME`).** Razão: o RF-20 proíbe o nome do solicitante no
  provedor, e o nome aparece no texto colado. A chamada do plano continua valendo, e o mínimo de 3 letras evita apagar
  palavra comum.
- **Desvio 3 aceito (exportações a mais).** Razão: as listas da ESP e do RSK tornam explícito o que o plano deixava
  implícito ("demanda + ESP"). A `INSTRUCAO_DO_BLOCO` exportada evita que a T26 e a T27 redijam outra.
- **Desvio 4 aceito (`Enviado em:`).** Razão: é a forma do Outlook em pt-BR. Sem ela, a linha passaria inteira, e o
  C-23 pede que o cabeçalho saia.
- **A lista de permissão no SELECT está correta como desenho.** Razão: uma coluna nova na tabela não chega ao provedor
  sem mudança na lista. O teste que compara o JSON inteiro quebra se a lista crescer sem querer.
- **`proximo: qa-automacao`.** Razão: a revisão não tem bloqueio, e a próxima etapa da cadeia é a `06-T24-testes`.

## Pendências

- **Para a 08 (ajudante único):** o Minor 1, junto com os Minor 1 e 2 da `06-T21-revisao`, o Minor 1 da
  `06-T22-revisao` e o Minor 3 da `06-T23-revisao`.
- **Para a 08 (`seguranca-aplicacao`):**
  - o Minor 2: continuação de cabeçalho de e-mail;
  - os dois limites que a entrega da T24 já registrou: só o nome inteiro sai, e os detectores cobrem só o formato
    brasileiro.
- **Para a T27 (`engenheiro-backend`):** as notas da entrega valem como estão.
  - `nao_encontrado` do `montarEntrada` é falha da execução, sem nova tentativa.
  - O `conteudo` vai como está na mensagem do usuário, e o prompt da T26 vai em `sistema`.
- **Para a T28 (`engenheiro-backend`):**
  - as chaves são exatamente `entrada:`, `demanda:`, `esp:` e `rsk:`, e outro prefixo dá `nao_encontrado`;
  - o Minor 3: a consolidação usa a ESP mais nova. Se a T28 disparar a consolidação pelo RSK, o disparo deve sair
    depois da ESP que vale.
- **Para a `06-T24-testes` (`qa-automacao`):** o aviso do undici "Using `patch`" segue aberto desde a `06-T23-revisao`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -8` — último commit 4fc3c17 (06-T24-construcao engenheiro-backend)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 8e92ce8..4fc3c17` — 6 arquivos, 4 de código e teste, todos novos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --format=%h --name-only -1 -- docs/superpowers/plans` — caminho do plano
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat --format=%h%x20%s 198a23b 3b5774d 4fc3c17` — código e testes só no 198a23b; os outros dois só no registro e na entrega
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -S "[0-9a-f]{8}-[0-9a-f]{4}" -- src` — 198a23b, bc88cf2 (T06) e 6e06587 (T04)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -S "ESP-DEM-\d{8}-\d{4}-v\d{1,4}" -- src` — 198a23b e 9caf56c (T11, `src/lib/rota.ts`; Minor 1)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat --format=%h bc88cf2` — esquema e testes da T06, sem ajudante de UUID exportado
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 116 arquivos, 2232 de 2232
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
