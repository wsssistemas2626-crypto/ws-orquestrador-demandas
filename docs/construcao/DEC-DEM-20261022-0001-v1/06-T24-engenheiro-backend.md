---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T24-construcao
agente: engenheiro-backend
leu: [contrato-passagem.md, padrao-tecnico.md, 06-T24-qa-automacao.md, 06-T24-tech-lead.md, 06-T24-engenheiro-backend.md (entrega anterior), src/modules/dados-pessoais/minimizar.ts, src/modules/dados-pessoais/minimizar.test.ts, src/modules/dados-pessoais/detectores.ts, src/modules/agentes/entrada-agente.ts, src/modules/agentes/entrada-agente.test.ts (diff do bd8db7e)]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

2ª volta da T24. A `06-T24-testes` devolveu a tarefa por um defeito na ordem da minimização: com o nome trocado antes dos
detectores, o e-mail `ficticia@empresa-exemplo.test` (nome do solicitante `Ficticia`) saía como
`[nome removido]@empresa-exemplo.test`, e o domínio chegava ao provedor. **Corrigido.** Os dois testes de regressão do
qa-automacao passam sem mudança, e a suíte inteira está verde.

### Arquivos alterados (só os da T24)

- `src/modules/dados-pessoais/minimizar.ts`
  - Ordem nova: cabeçalho de e-mail, detectores (e-mail, CNPJ, CPF e telefone), nome do solicitante.
  - O nome é trocado só no texto fora dos marcadores. `RE_MARCADOR` (os quatro de `MARCADORES` e o `MARCADOR_NOME`,
    num grupo de captura) parte o texto com `split`. Os marcadores ficam nas posições ímpares e não são tocados. A
    função nova `trocarNome` aplica o padrão do nome só nas posições pares. A borda do nome (`\p{L}`, `\p{N}`, `_`) não
    muda, porque `[` e `]` não são letra.
  - O comentário do topo diz a ordem nova e a razão dela.
- `src/modules/dados-pessoais/minimizar.test.ts`: 9 testes novos, ao fim do `describe` do nome. Os dois testes de
  regressão do qa-automacao não mudaram.

`src/modules/agentes/entrada-agente.ts` não mudou. Ele chama `minimizar(texto, { nomes })`, e a correção vale também
pelo montador.

### Testes criados

| Teste | O que prova |
|---|---|
| `nome igual a palavra de marcador ("%s") não estraga marcador, nem chamando de novo` (8 casos: `removido`, `Removido`, `e-mail`, `telefone`, `CPF`, `CNPJ`, `nome removido`, `e-mail removido`) | Com os detectores antes do nome, um nome igual a uma palavra de marcador não pode virar `[e-mail [nome removido]]`. O texto tem os quatro tipos e o nome, e o resultado é comparado inteiro. Chamar `minimizar` de novo com o mesmo nome dá o mesmo texto. Esse é o teste que o qa-automacao pediu para o caso de a ordem mudar |
| `o nome colado a um marcador, fora dele, ainda vira marcador` | A partição pelos marcadores não esconde o nome que está logo antes ou logo depois de um marcador |

### TDD: os testes foram vistos falhando antes da correção

Comando: `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/dados-pessoais/minimizar.test.ts src/modules/agentes/entrada-agente.test.ts`.
Rodou com os testes novos e antes de mudar `minimizar.ts`. Trecho da saída:

```
 ❯ src/modules/dados-pessoais/minimizar.test.ts (54 tests | 9 failed)
     × regressão RF-20: e-mail cujo usuário é o nome do solicitante vira o marcador de e-mail, sem sobrar o domínio
     × nome igual a palavra de marcador ("removido") não estraga marcador, nem chamando de novo
     ...
 ❯ src/modules/agentes/entrada-agente.test.ts (52 tests | 1 failed)
     × regressão RF-20 (CA-20.1 pelo orquestrador): e-mail com o nome do solicitante como usuário não deixa o domínio no conteúdo
Expected: "A: [e-mail removido]; B: [telefone removido]; C: [CPF removido]; D: [CNPJ removido]; E: [nome removido]."
Received: "A: [e-mail [nome removido]]; B: [telefone [nome removido]]; C: [CPF [nome removido]]; D: [CNPJ [nome removido]]; E: [nome [nome removido]]."
 Test Files  2 failed (2)
      Tests  10 failed | 96 passed (106)
```

Com a ordem antiga, os 8 casos de marcador falham na 2ª chamada (o nome entra no marcador já posto). Só trocar a ordem,
sem a partição, faria esses 8 casos falharem já na 1ª chamada. O teste do nome colado a um marcador já passava antes. Ele
serve de guarda da partição.

### Resultado

- T24 isolada: 2 arquivos, 106 de 106.
- `pnpm test`: 116 arquivos, **2255 de 2255**, nenhum falhou. São os 2246 da `06-T24-testes` mais os 9 novos.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.
- `git status`: só `minimizar.ts` e `minimizar.test.ts` mudaram.

### Desvios do plano

Nenhum desvio novo. A ordem dentro de `minimizar` muda de "cabeçalho, nome, detectores" para "cabeçalho, detectores,
nome". O passo do nome é o desvio 2 da 1ª volta, já aceito na `06-T24-revisao`. A ordem do plano (cabeçalho, depois os
detectores) continua igual.

## Decisões tomadas

- **Detectores antes do nome, e não só proteger o `@` no padrão do nome.** Razão: travar o `@` resolve `nome@…`, mas
  não `nome.x@…`. Nesse caso o nome seria trocado e o detector pegaria só `x@…`, e sobraria `[nome removido].` no
  texto. Com o e-mail inteiro removido antes, nenhum formato de usuário importa.
- **O nome não é trocado dentro de um marcador, para qualquer nome.** Razão: uma lista de palavras proibidas ("removido",
  "CPF" e outras) teria de acompanhar os marcadores. A partição usa os próprios `MARCADORES` e `MARCADOR_NOME`, e um
  marcador novo já entra protegido.
- **Um texto que já traz um marcador literal também fica protegido.** Razão: é o que deixa `minimizar` idempotente
  com nome, e o conteúdo é igual em cada nova tentativa da T27.
- **Os dois testes de regressão do qa-automacao não mudaram.** Razão: o pedido da devolução. Eles comparam o texto
  exato e passam como estão.

## Pendências

- Seguem abertos, sem mudança nesta volta: os Minor 1, 2 e 3 da `06-T24-revisao` e os dois limites da 1ª entrega para a
  08 (só o nome inteiro sai; os detectores cobrem só o formato brasileiro).

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -6` — topo bd8db7e (06-T24-testes qa-automacao)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo antes da correção
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/dados-pessoais/minimizar.test.ts src/modules/agentes/entrada-agente.test.ts` — antes da correção: 96 de 106, falham os 2 de regressão e os 8 novos de marcador
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/dados-pessoais/minimizar.test.ts src/modules/agentes/entrada-agente.test.ts` — 106 de 106
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 116 arquivos, 2255 de 2255
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — só `minimizar.ts` e `minimizar.test.ts` modificados

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno
