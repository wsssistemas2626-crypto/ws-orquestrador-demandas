---
pedido: DEC-DEM-20261104-0014-v1
etapa: 04-correcao
agente: engenheiro-backend
leu: [contrato-passagem.md, pedido.json, padrao-tecnico.md, 02-tech-lead.md, 03-engenheiro-backend.md, 04-maestro.md, src/modules/pacotes-decisao/decidir.ts, src/modules/pacotes-decisao/substituido.ts, src/modules/pacotes-decisao/substituicao.test.ts, src/app/api/pacotes-decisao/decisao.test.ts, "src/app/api/pacotes-decisao/[decId]/decisao/route.ts", src/db/schema/decisao.ts, e2e/decisao.spec.ts (200-340)]
status: pronto
proximo: seguranca-aplicacao
devolvido_para: null
---
## Entrega

Correção do S-01 (alto) da `04-revisao`, pela opção (a) que o maestro fixou. Uma aprovação só do CTO não substitui mais
um DEC aprovado que exigiu a assinatura da administradora. Ela é recusada com 409 e uma mensagem fixa nova, antes de
gravar qualquer coisa. O `04-seguranca-aplicacao.md` não existe nesta pasta (o maestro diz que a revisão de segurança não
gravou arquivo), e por isso ele não está em `leu`. O `criar.ts` não mudou.

### Arquivos alterados

| Arquivo | O que mudou |
|---|---|
| `src/modules/pacotes-decisao/substituido.ts` | Nova `aprovadoVigente(tx, demandaId): Promise<{ id; nivel: NivelAprovacao } \| null>`, com a mesma consulta de antes e mais a coluna `nivelAprovacaoRequerido`. `aprovadoMaisNovo` passa a usá-la e devolve só o id, com a assinatura de antes. Assim as duas leituras vêm de uma consulta só |
| `src/modules/pacotes-decisao/decidir.ts` | `MENSAGENS_DECISAO.nivelMenorQueOVigente` (texto abaixo). Em `aprovar`, no ramo de nível `cto`, a guarda fica depois do P1-b (403) e antes de `gravarAprovacao`: lê `aprovadoVigente` sob a trava da demanda e, se o nível dele é `cto_e_administradora`, lança `conflito` (409). O passo 8 do comentário do topo foi atualizado |
| `src/modules/pacotes-decisao/substituicao.test.ts` | O teste de `:355` foi invertido e trocado por um bloco `S-01` com 5 casos (abaixo) |
| `src/app/api/pacotes-decisao/decisao.test.ts` | Caso novo pela rota `PATCH`, no bloco "aprovação que substitui (0.1.13)" |

Mensagem nova (minúscula, porque a tela acrescenta "Não foi possível concluir: "; sem id nem nome; texto para revisão
da `ux-ui-design`):

```
o pacote aprovado em vigor nesta demanda exigiu a aprovação do CTO e da administradora; um pacote só do CTO não pode substituí-lo. Crie um pacote novo com aprovação do CTO e da administradora.
```

A guarda só existe no ramo `cto`. Um DEC `cto_e_administradora` é sempre de nível igual ou maior que o vigente, então
ele não passa por ela. A segunda aprovação desse DEC continua indo para `fecharAprovacao`, e com isso um DEC de dupla
aprovação continua substituindo um aprovado `cto`.

### Testes

**Teste trocado.** `substituicao.test.ts:355-360` foi invertido, porque a regra de antes era o próprio achado.
- Antes: "v1 de dupla aprovação substituído por um v2 só do CTO" esperava `aprovada`, com o v1 apontando para o v2.
- Depois: o mesmo cenário espera 409 `nivelMenorQueOVigente` (primeiro caso do bloco abaixo).

**Bloco novo em `substituicao.test.ts`, "S-01: o nível do DEC que substitui não é menor que o do aprovado vigente":**
1. v1 `cto_e_administradora` aprovado; v2 `cto` aprovado pela `cto`, com B e depois com A: 409 com a mensagem fixa
   nas duas vezes. Nenhuma linha em `aprovacao` ou `decisao` do v2. O número de eventos da demanda não muda: nem
   `aprovacao_registrada`, nem `decisao_registrada`, nem `pacote_decisao_substituido`. O v1 segue `aprovada`, não
   substituído e com `aprovadoMaisNovo` igual a ele, e o v2 segue `pendente`.
2. A mensagem por inteiro.
3. O v2 `cto` recusado ainda pode ser devolvido. Depois disso, um v3 `cto_e_administradora` com as duas aprovações
   substitui o v1, com um evento só (v1→v3).
4. O inverso continua valendo: um v2 `cto_e_administradora`, com as duas aprovações, substitui o v1 `cto`, e o v2 fica
   com 2 aprovações. Depois, um v3 `cto` não substitui o v2 (409, sem aprovação nem decisão), e fica um evento só
   (v1→v2).
5. A administradora no v2 `cto` segue recebendo 403 (P1-b), antes da recusa de nível. Este caso é guarda de ordem e já
   passava na base.

**Caso novo em `decisao.test.ts`, pela rota `PATCH /api/pacotes-decisao/:decId/decisao`.** O v1
`cto_e_administradora` é aprovado pela rota, pelo CTO e pela administradora com documento. Depois, o v2 `cto` aprovado
pelo CTO com 2FA dá 409 com o corpo exato `{ erro: 'conflito', mensagem: <texto fixo> }`. `semMudanca(v2)` confere zero
linhas em `decisao` e em `aprovacao` e zero eventos de aprovação ou decisão. Também não há evento
`pacote_decisao_substituido`, e o v1 continua com 2 aprovações e 1 decisão.

**Os casos 2 e 3 de S2** (v1 `cto` substituído por v2 `cto_e_administradora` com as duas aprovações) não mudaram e
continuam verdes.

### Teste visto falhando antes do código

`pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/pacotes-decisao/substituicao.test.ts src/app/api/pacotes-decisao/decisao.test.ts`
foi rodado com os testes já escritos e sem mudança em `decidir.ts` nem em `substituido.ts`:

```
 ❯ src/app/api/pacotes-decisao/decisao.test.ts (28 tests | 1 failed)
     × v1 aprovado pelo CTO e pela administradora; v2 só do CTO → 409 com a mensagem fixa, nada gravado e nada substituído
 ❯ src/modules/pacotes-decisao/substituicao.test.ts (28 tests | 4 failed)
     × v1 de dupla aprovação aprovado; v2 só do CTO aprovado pela cto → 409 nivelMenorQueOVigente, nada gravado, v1 não substituído
     × a mensagem é fixa, em minúscula (a tela acrescenta o prefixo) e sem id nem nome
     × o v2 só do CTO recusado ainda pode ser devolvido; um v3 de dupla aprovação, com as duas aprovações, substitui o v1
     × um v2 de dupla aprovação substitui um v1 aprovado só do CTO; depois, um v3 só do CTO não substitui o v2
AssertionError: promise resolved "{ pacote: { …(25) }, …(1) }" instead of rejecting
AssertionError: expected 200 to be 409
      Tests  5 failed | 51 passed (56)
```

### Resultado final

- Os dois arquivos: 56 de 56.
- `pnpm test`: 202 arquivos, 4465 de 4465 passaram e 0 falharam. A conta é 4460 da 03, menos o teste invertido, mais 5
  do bloco S-01 e mais 1 da rota.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.
- `git status`: só os 4 arquivos da tabela.

### Desvios do plano

Nenhum. A forma dos comandos `pnpm` é `pnpm -C <repo> …`, como pede o prompt do maestro, porque a sessão não roda dentro
do repositório.

## Decisões tomadas

- A guarda fica no ramo `cto` de `aprovar`, depois do P1-b. A administradora num DEC `cto` continua recebendo o 403 de
  hoje, e a recusa de nível só vale para quem poderia aprovar.
- O vigente é lido com `aprovadoVigente`, sob a trava da demanda que `registrarDecisao` já toma. Pelo A-01, nenhum DEC
  mais antigo se decide enquanto isso, e uma aprovação concorrente do mesmo DEC espera a trava (C-13).
- `aprovadoMaisNovo` foi mantido, agora sobre `aprovadoVigente`. Isso evita duas consultas iguais e não muda quem já a
  chama (`fecharAprovacao` e os testes).
- Só o aprovado vigente é comparado, como o maestro pediu. Uma cadeia "cto_e_administradora aprovado, depois cto
  aprovado" só existiria com dados gravados antes desta correção, e a 0.1.13 não foi para a main. Por isso não há caso
  de dado antigo a tratar.
- Devolver ou arquivar um DEC `cto` com o vigente de dupla aprovação continua permitido, porque a recusa vale só para
  aprovar. Sem isso, a demanda não teria saída para o DEC criado com o nível errado.
- O `criar.ts` não mudou, e a opção (b) do achado ficou de fora, como decidiu o maestro.

## Pendências

1. **Para a `04-reteste` (`seguranca-aplicacao`):** reteste do S-01 com o commit desta correção.
2. **Para a `qa-automacao`:** a T11 e `e2e/` não mudaram. Mesmo assim, vale rodar de novo `e2e/decisao.spec.ts` e
   `e2e/pedido-construcao.spec.ts` (que aprovam DEC `cto` em demanda que já pode ter um aprovado). Se um DEC
   `cto_e_administradora` ficar aprovado na demanda `TITULO` antes desses testes, a aprovação do DEC `cto` passa a dar
   409. Não li `e2e/` inteiro para afirmar que isso não acontece. Dentro da `Pode` deste agente, só dá para rodar
   `pnpm test`, e não `pnpm test:e2e`.
3. **Para a `ux-ui-design`:** revisar o texto de `nivelMenorQueOVigente`. A T11 de um DEC `cto` pendente ainda mostra o
   formulário de aprovar quando o vigente é de dupla aprovação. A recusa aparece só depois de enviar, como o alerta
   "Não foi possível concluir: …". Fica em aberto um aviso antes do envio.
4. **Para a `06-documentacao`:** o manual (`04-versoes-e-decisao.md`) precisa da regra de nível ao substituir. Um DEC
   só do CTO não substitui um aprovado de dupla aprovação, e o inverso é permitido.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/pacotes-decisao/substituicao.test.ts src/app/api/pacotes-decisao/decisao.test.ts` — 5 falharam e 51 passaram, antes do código (esperado)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/pacotes-decisao/substituicao.test.ts src/app/api/pacotes-decisao/decisao.test.ts` — 56 de 56
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 4465 de 4465, 202 arquivos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — os 4 arquivos da correção
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 4 arquivos, 121 linhas a mais e 11 a menos

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno
