---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T24-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12), 06-T24-tech-lead.md (revisão anterior), 06-T24-qa-automacao.md, 06-T24-engenheiro-backend.md, git diff bd8db7e..5a59c01, git show --stat ea995db f83665f 5a59c01, src/modules/dados-pessoais/minimizar.ts, src/modules/dados-pessoais/minimizar.test.ts (linhas 120 a 193), src/modules/dados-pessoais/detectores.ts]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Segunda revisão da T24, intervalo `bd8db7e..5a59c01`. A correção está no `ea995db` (`minimizar.ts` e
`minimizar.test.ts`). O `f83665f` só acrescenta uma linha ao registro. O `5a59c01` só regrava a entrega do engenheiro e
acrescenta uma linha ao registro. **Não há problema Critical nem Important.** O defeito que a `06-T24-testes` devolveu
está corrigido, e os dois testes de regressão do qa-automacao passam sem mudança. A passagem volta para a
`06-T24-testes`. Há um Minor novo (Minor 4), que está nos Pareceres e em Pendências.

### Conferência da correção

| Ponto | Situação |
|---|---|
| Defeito da devolução (`ficticia@…` com nome `Ficticia` virava `[nome removido]@domínio`) | Corrigido. A ordem passou a ser cabeçalho, detectores (e-mail, CNPJ, CPF, telefone) e nome (`minimizar.ts:55` a `:62`). O e-mail sai inteiro antes que o nome possa desmontá-lo. Os dois testes de regressão do qa-automacao (`minimizar.test.ts:171` e o teste do montador em `entrada-agente.test.ts`) não mudaram no diff e passam |
| Escolha entre trocar a ordem e travar o `@` no padrão do nome | Correta. Travar o `@` não resolve `x.nome@…` nem `nome.x@…`. Com a ordem nova, o formato do usuário não importa. O segundo caso do teste de regressão (`contato.ficticia@…`) prova isso |
| Risco que a ordem nova cria (nome igual a palavra de marcador) | Coberto. `trocarNome` (`minimizar.ts:47` a `:52`) parte o texto pelos marcadores com `split` e um grupo de captura, e só troca o nome nas posições pares. Conferi a paridade: com um grupo de captura, o `split` põe sempre o separador nas posições ímpares, mesmo quando o texto começa ou termina por marcador ou tem dois marcadores seguidos (sobra texto vazio nas pares). `RE_MARCADOR` é montado a partir de `MARCADORES` e `MARCADOR_NOME`, com `escaparRegex`. Um marcador novo já entra protegido, sem lista à parte |
| Borda do nome | Não mudou (`minimizar.ts:39`). `[` e `]` não são letra, número nem `_`, então o nome colado a um marcador continua sendo trocado. O teste `o nome colado a um marcador, fora dele, ainda vira marcador` prende isso |
| A troca do nome pode criar dado que os detectores pegariam? | Não. O nome vira `[nome removido]`, que não tem dígito nem `@`, e os colchetes separam o que estava em volta. Os detectores não precisam rodar de novo depois do nome |
| Idempotência | `minimizar(minimizar(t, op), op) === minimizar(t, op)` nos 8 casos de marcador. Isso sustenta a nova tentativa da T27 com a mesma entrada |
| Arquivos | Só `minimizar.ts` e `minimizar.test.ts` no código. `entrada-agente.ts` não mudou, e a correção vale pelo montador porque ele chama `minimizar(texto, { nomes })` |
| Comentário do topo | Diz a ordem nova e a razão, e bate com o código |

### Testes novos e TDD

- `nome igual a palavra de marcador ("%s") não estraga marcador, nem chamando de novo` (8 casos): o texto tem os quatro
  tipos de dado e o nome, e o resultado é comparado inteiro, não só pela falta do sentinela. A entrega mostra a falha
  antes da correção, com o recebido `[e-mail [nome removido]]`. É o teste que a `06-T24-testes` pediu para o caso de a
  ordem mudar.
- `o nome colado a um marcador, fora dele, ainda vira marcador`: já passava antes da correção, como a entrega declara.
  Serve de guarda da partição. Se alguém partir o texto de outro jeito e esconder o vizinho do marcador, ele quebra.
- Nenhum teste existente foi apagado, afrouxado ou marcado com `.skip`, `.only` ou `.todo`. O diff do arquivo de teste
  só acrescenta linhas.

### Verificação própria

- `pnpm test`: 116 arquivos, 2255 de 2255.
- `pnpm lint` e `pnpm typecheck`: limpos.
- `git status`: limpo.
- O aviso do undici "Using `patch`" segue na saída, como nas revisões anteriores. Não vem desta tarefa.

### Checklist da seção 12

- [x] Faz o que a devolução pede, nem mais nem menos. Só os dois arquivos da T24 mudaram no código. Não há desvio novo
      do plano: a ordem "cabeçalho, depois detectores" do plano continua, e o passo do nome é o desvio 2 já aceito.
- [x] Há teste para cada comportamento novo (ordem nova e partição pelos marcadores), e ele falharia sem o código
      (saída da falha na entrega do engenheiro).
- [x] Não há segredo, valor de `.env` nem dado pessoal real. Os domínios são `.test`, e o nome é "Ficticia". O CPF, o
      CNPJ e o telefone são os de exemplo.
- [x] Entrada externa validada: a tarefa não tem rota, Server Action nem job. O montador não mudou.
- [x] Banco: não se aplica.
- [x] Nada duplica função existente. `escaparRegex` já era deste arquivo, e `RE_MARCADOR` é montado a partir das
      constantes que já existem.
- [x] Textos em pt-BR. A tarefa não tem tela.
- [x] O Minor está em Pendências. Não há Critical nem Important.
- [x] PR (`/code-review`, `/security-review`): não se aplica a esta etapa, fica com a `08-revisao`.

### Pareceres

Os Minor 1, 2 e 3 da primeira revisão seguem como estavam e não se repetem aqui. Estão em Pendências. O Minor 1 agora
tem o teste de contrato que a `06-T24-testes` acrescentou.

| # | Arquivo:linha | Problema | Razão |
|---|---|---|---|
| 4 (Minor) | `src/modules/dados-pessoais/minimizar.ts:58` com `src/modules/dados-pessoais/detectores.ts:9` | O usuário de e-mail com letra acentuada ainda deixa um pedaço do nome. O detector de e-mail aceita só `[A-Za-z0-9._%+-]` no usuário e não tem borda à esquerda. Em `fictícia@empresa-exemplo.test` com o nome `Fictícia`, ele pega só `cia@empresa-exemplo.test`. Sai `fict[e-mail removido]`, e o nome inteiro não está mais no texto para ser trocado. Antes da correção, o mesmo caso deixava o domínio. Agora o domínio sai e sobra só o pedaço do nome | Não bloqueia: e-mail com acento no usuário é raro (exige SMTPUTF8), o domínio não vaza, e sobra só parte do nome. É o mesmo tipo do limite "só o nome inteiro sai", que já está registrado para a 08. Uma saída para a `seguranca-aplicacao` avaliar na `08-revisao`: o detector de e-mail aceitar `\p{L}` no usuário, ou ganhar uma borda à esquerda que leve a palavra inteira. Isso mexe no detector da T22, que o Pedido de Construção também usa (C-28), e por isso não cabe nesta tarefa |

## Decisões tomadas

- **A correção foi aceita sem ressalva.** Razão: a ordem nova fecha o defeito para qualquer formato de usuário do
  e-mail, e a partição pelos marcadores fecha o risco que a ordem nova criaria, sem lista de palavras à parte.
- **O caso do acento no usuário do e-mail é Minor, não Important.** Razão: o formato é raro, o domínio já não vaza e
  sobra só parte do nome. A correção está no detector compartilhado da T22, fora do escopo desta tarefa.
- **Nenhum teste novo foi pedido para o Minor 4.** Razão: fixar em teste o comportamento atual (`fict[e-mail
  removido]`) prenderia um limite que a 08 pode decidir mudar.
- **`proximo: qa-automacao`.** Razão: a revisão não tem bloqueio, e a próxima etapa da cadeia é a `06-T24-testes`.

## Pendências

- **Para a 08 (`seguranca-aplicacao`):**
  - o Minor 4 desta revisão (usuário de e-mail com acento, `detectores.ts:9`);
  - o Minor 2 da primeira revisão (continuação de cabeçalho de e-mail);
  - os dois limites que a entrega da T24 registrou: só o nome inteiro sai, e os detectores cobrem só o formato
    brasileiro.
- **Para a 08 (ajudante único):** o Minor 1 da primeira revisão (`RE_ID_ESP` e `RE_ID_RSK` repetem a regex da rota).
  Agora há teste de contrato, mas a duplicação continua. Vai junto com os Minor 1 e 2 da `06-T21-revisao`, o Minor 1 da
  `06-T22-revisao` e o Minor 3 da `06-T23-revisao`.
- **Para a T27 (`engenheiro-backend`):** `nao_encontrado` do `montarEntrada` é falha da execução, sem nova tentativa. O
  `conteudo` vai como está na mensagem do usuário, e o prompt da T26 vai em `sistema`. O montador é determinístico e
  `minimizar` é idempotente, então a nova tentativa recebe a mesma entrada.
- **Para a T28 (`engenheiro-backend`):** as chaves são exatamente `entrada:`, `demanda:`, `esp:` e `rsk:`, e outro
  prefixo dá `nao_encontrado`. Fica também o Minor 3 da primeira revisão: a consolidação usa a ESP mais nova, então, se a
  T28 disparar a consolidação pelo RSK, o disparo deve sair depois da ESP que vale.
- **Para a `06-T24-testes` (`qa-automacao`):** o aviso do undici "Using `patch`" segue aberto desde a `06-T23-revisao`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -8` — topo 5a59c01; correção em ea995db
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat bd8db7e..5a59c01` — 4 arquivos: minimizar.ts, minimizar.test.ts, a entrega do engenheiro e o registro
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff bd8db7e..5a59c01 -- src` — ordem nova e `trocarNome` em minimizar.ts, 2 testes novos (9 casos), sem linha de teste removida
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat --format=%h%x20%s ea995db f83665f 5a59c01` — código só no ea995db; f83665f só no registro; 5a59c01 só na entrega e no registro
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 116 arquivos, 2255 de 2255
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
