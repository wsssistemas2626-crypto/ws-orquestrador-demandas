---
pedido: DEC-DEM-20261104-0013-v1
etapa: 04-revisao
agente: maestro
leu: [construir.md seção 3, contrato-passagem.md, pedido.json, 01-qa-funcional.md, 02-tech-lead.md, 03-engenheiro-backend.md, 04-qa-automacao.md, git diff c2340e6...HEAD]
status: pronto
proximo: devops-sre
devolvido_para: null
---
## Entrega

Revisei o ramo `construcao/DEC-DEM-20261104-0013-v1` contra a sua base, `c2340e6`, o último commit do pedido 0012
(0.1.11), que entrou na `main` pelo PR #13 (`b9e52d6`). O commit da correção é `ff3697d`. Sem migration. Nada mudou em
`src/db/`, `drizzle/` nem `.github/`.

- **Recusa por nome:** `gerarPedido` confere o nome do solicitante da demanda travada em todo valor escrito por pessoa
  no pedido montado. A conferência vale para o nome inteiro e para cada parte, pela mesma regra de `minimizar`
  (`temNome` sobre `trocarNomes`, sem cópia). Os campos conferidos são:
  - título, descrição, ESP, RSK e opção escolhida;
  - sistema e repositório;
  - cada critério de aceite e cada item da definição de pronto.

  Os rótulos do sistema ficam de fora. O nome entra no mesmo 422 do C-28, com o caminho e o tipo, sem o valor, e antes
  do `validarPedido`.
- **Confirmação:** o POST e a Server Action da T11 exigem `confirmaSemDadoPessoal: true`, pelo mesmo schema, logo
  depois do `autorizar` e antes do banco. O evento `pedido_gerado` grava só o booleano. A T11 tem uma caixa nativa com
  rótulo, `aria-required`, `aria-invalid` e o erro ligado por `aria-describedby`.
- **aprovadoPor:** leva os papéis gravados nas aprovações, na ordem da aprovação.
- **CA-22.2, C-28, A-03 e o 409 da demanda final:** continuam, na mesma ordem.

Revisões usadas:

- **Código:** li o diff de `src/` e chamei o agente `feature-dev:code-reviewer`. Ele não achou nada de confiança alta.
- **Segurança:** o agente `seguranca-aplicacao` revisou o commit da correção contra a base real, `c2340e6`. Ele
  conferiu que a correção atende ao parecer dele de 04/11 e mediu em memória o custo da conferência. Não gravou
  arquivo no repositório.

Critérios de aceite:

1. Nome do solicitante, inteiro ou em parte, em qualquer valor do pedido → 422 com caminho e tipo, sem valor, sem
   evento (`src/modules/pedido-construcao/gerar.test.ts`, `src/app/api/pacotes-decisao/pedido.test.ts`).
2. Palavra comum em minúscula e rótulos do sistema não impedem a geração; mesmo DEC, mesmo pedido (mesmos arquivos).
3. Sem a confirmação → 422; com ela, o evento registra a confirmação (`acoes-pedido.test.ts`, `pedido-bordas.test.ts`).
4. A caixa da T11 é acessível (04, axe nos quatro estados).
5. `aprovadoPor` com o papel, aceito pelo `validarPedido` (`montar` e `gerar.test.ts`).
6. `pnpm test` 4.415 de 4.415, lint e typecheck limpos, e2e 143 de 143 três vezes seguidas, com `e2e/pedido-construcao.spec.ts` marcando a caixa (04).

### Achados por severidade

**Crítico, Alto e Médio:** nenhum.

**Baixo** (todos da `seguranca-aplicacao`)

- **B-1** (`src/modules/dados-pessoais/minimizar.ts:112`): o nome em minúsculas ligado por hífen ou ponto passa
  (`joana-ficticia`, `joana.ficticia`). Em `sistema_alvo` e `repositorio_destino`, que só aceitam minúsculas, a
  conferência nunca dispara. A confirmação cobre esse caso. Sugestão: aceitar `-` e `.` entre as partes do nome
  inteiro, com teste.
- **B-2:** quem quer esconder o nome consegue, com espaço invisível, letra cirílica ou letra de largura total. O
  controle mira o descuido de uma pessoa confiável com 2FA. Sugestão: registrar no RSK como risco que sobra.
- **B-3** (`gerar.ts:74-94`): a conferência roda segurando a trava da demanda. No pior caso medido, com 512 KB em NFD,
  leva até cerca de 1 s. Sugestão: só registrar o limite.
- **B-4** (`montar.ts:42`): o papel identifica a pessoa, porque `cto` e `administradora` têm uma pessoa cada. Está
  dentro do que foi aprovado. O `juridico-contratos` confirma.

Segurança: sem achado crítico ou alto. Nenhum segredo, nenhum dado pessoal real e nenhuma dependência nova.

## Decisões tomadas

- B-1 a B-4 vão para Pendências: o roteiro só devolve crítico e alto.
- Comparei com a base real do ramo (`c2340e6`), e não com a `main` local antiga: o ramo nasceu do último commit do 0012
  para não esperar o merge do PR #13.
- Liberação nesta cadeia, só de leitura e pela regra de 25/10: na 03, um `pnpm test` com filtro `-t "a|b"`. O
  `conferir` leu como pipe o `|` dentro das aspas.
- Na triagem, o maestro respondeu aos achados da 01. O E5 não muda aqui: Fabiano decidiu em 04/11 pela opção (b), e
  ela está no pedido `DEC-DEM-20261104-0014-v1`, já preparado.

## Pendências

- Para o pedido 0014: o E5 (o DEC aprovado mais novo substitui o anterior).
- Para um pedido futuro: B-1 (hífen e ponto no nome inteiro).
- Para o RSK do sistema: B-2 e B-3 como risco que sobra.
- Para o `juridico-contratos`: B-4.
- Para a `05-entrega` e a `06-documentacao`: a 0.1.12 no `CHANGELOG.md` (texto na Pendência da 03) e no `deploy.md`.

## Critério de pronto atendido

- [x] escopo conferido com `git diff c2340e6...HEAD --stat`
- [x] revisão de código feita (leitura do diff de `src/` e agente `feature-dev:code-reviewer`)
- [x] revisão de segurança feita (agente `seguranca-aplicacao`, porque a skill `security-review` lê a pasta da sessão)
- [x] achados registrados por severidade, com a revisão usada
- [x] sem achado crítico ou alto aberto
