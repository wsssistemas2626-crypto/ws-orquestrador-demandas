---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T22-construcao
agente: engenheiro-backend
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 05-tech-lead.md, 06-T21-engenheiro-backend.md, 06-T21-tech-lead.md, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6 e T21 a T23), 01-analista-requisitos.md (glossário e RF-17 a RF-25), 02-arquiteto-solucoes.md, 03-ux-ui-design.md (seções 1 e 2 e T05 a T11), 04-seguranca-aplicacao.md (seções 1 a 3), src/vendor/construir/pedido.mjs, src/vendor/construir/pedido.d.mts, src/vendor/construir/ORIGEM.md, src/vendor/construir/temporario-comparar.test.ts, src/modules/especificacoes/contrato-pedido.test.ts, src/modules/especificacoes/consultas.ts, src/modules/especificacoes/schemas.ts, src/modules/pareceres-risco/consultas.ts, src/modules/pareceres-risco/schemas.ts, src/modules/pacotes-decisao/consultas.ts, src/modules/pacotes-decisao/criar.ts, src/modules/pacotes-decisao/decidir.ts, src/modules/pacotes-decisao/decidir.test.ts, src/modules/acesso/matriz.ts, src/modules/historico/registrar.ts, src/modules/demandas/servico.ts, src/modules/demandas/entrada.ts, src/modules/demandas/schemas.ts, src/modules/demandas/consultas.ts, src/db/schema/decisao.ts, src/db/schema/versoes.ts, src/db/transacao.ts, src/lib/erros.ts, src/lib/rota.ts, src/lib/fuso.ts, src/lib/relogio.ts, src/app/api/pacotes-decisao/[decId]/decisao/route.ts, src/app/api/pacotes-decisao/decisao.test.ts, test/banco.ts, test/deps.ts, test/sessao.ts, test/requisicao.ts, test/sentinelas.ts, test/matriz-rotas.test.ts, test/estatico/varreduras-qa.test.ts, eslint.config.mjs]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T22, Pedido de Construção. A tarefa cobre:

- RF-22: CA-22.1 a CA-22.6;
- os controles C-16, C-28 e C-29, mais C-17 e C-21 na rota nova;
- ADR-05 (a função `validarPedido` da cópia em `src/vendor/construir`);
- RNF-15 (relógio fixo em todos os testes);
- G3.8 (transação de quem chama).

### Arquivos (os 9 da lista do plano, nenhum outro)

Todos são novos. Nenhum arquivo existente foi modificado.

- `src/modules/dados-pessoais/detectores.ts`
  - `TipoDadoPessoal`;
  - `DETECTORES`, com as quatro expressões globais do plano, sem mudança;
  - `encontrarDadosPessoais(valor, tipos, caminho?)`. Percorre texto, lista e objeto e devolve
    `{ caminho, tipo }` no formato `a.b[1].c`, nunca o valor. A busca usa `search`, que não depende do `lastIndex`
    da expressão global.
- `src/modules/pedido-construcao/conteudo.ts`
  - `textoDaEspecificacao(esp)` e `textoDoParecer(rsk)`: campos em ordem fixa, com os rótulos da 03 (T07 e T08). O
    campo vazio fica de fora. Os textos são separados por linha em branco, e cada item de lista vai numa linha com
    hífen;
  - `nivelMaior(rsk)`, com a ordem baixo < medio < alto.
- `src/modules/pedido-construcao/montar.ts`
  - o tipo `PedidoConstrucao`;
  - `MENSAGEM_PEDIDO_SEM_APROVACAO`;
  - `montarPedido({ dec, esp, rsk })`. As chaves são escritas na ordem da seção 3.1 do /construir.
    - `aprovadoPor` sai em ordem de papel: cto e depois administradora. Isso fecha a pendência 4 da
      `06-T21-revisao`.
    - `aprovadoEm` é `dataIsoSaoPaulo(decisao.decididaEm)`.
- `src/modules/pedido-construcao/serializar.ts`: `serializarPedido(p)`, que devolve `JSON.stringify(p, null, 2) + '\n'`.
- `src/modules/pedido-construcao/gerar.ts`: `MENSAGENS_PEDIDO` e `gerarPedido(deps, ator, decId, t?)`. A função
  segue a ordem do plano:
  1. `autorizar`;
  2. o DEC, com 404 se não existe e 409 se não há decisão `aprovada` completa;
  3. 422 se a demanda é do tipo estudo;
  4. a montagem, só com a ESP e o RSK citados no DEC;
  5. 422 se algum campo tem e-mail, telefone ou CPF;
  6. 422 se o `validarPedido` da cópia falha;
  7. o evento `pedido_gerado` e o JSON.
- `src/app/api/pacotes-decisao/[decId]/pedido-construcao/route.ts`: exporta só `POST`, com
  `rota({ acao: 'gerar_pedido_construcao', params: paramId.versao('decId', 'DEC') })`. A resposta é 200, e o corpo é o
  JSON gerado, byte a byte, com `Content-Type: application/json; charset=utf-8` e
  `Content-Disposition: attachment; filename="<DEC-id>.json"`. Os cabeçalhos `nosniff` e `no-store` vêm de `rota()`.
- Testes: `src/modules/dados-pessoais/detectores.test.ts`, `src/modules/pedido-construcao/gerar.test.ts` e
  `src/app/api/pacotes-decisao/pedido.test.ts`.

O `test/matriz-rotas.test.ts` passou a cobrir a rota nova sem mudança no arquivo. Ele confere:

- 403 para cada agente e para pessoa sem 2FA;
- 401 sem credencial;
- 404 para parâmetro fora do formato.

### Testes criados

| Arquivo | Testes | O que prova |
|---|---|---|
| `detectores.test.ts` | 21 | **Os casos do plano:** os 7 valores fictícios, e mais telefone fixo e CNPJ sem pontuação. **Sem falso positivo:** ids do sistema, repositório, sistema alvo e data. **Caminho:** índice de lista, objeto aninhado, raiz com e sem caminho. **Tipos:** só os pedidos (CNPJ fora quando não pedido); um item por tipo, na ordem pedida, sem repetir. **Outros valores:** número, booleano e nulo não são lidos. **Segurança:** o resultado nunca leva o valor; as expressões globais não guardam estado entre chamadas |
| `gerar.test.ts` | 41 | **Montagem:** CA-22.1; o objeto inteiro campo a campo, com a ordem de chaves em todos os níveis e sem data de geração; opção B; `aprovadoEm` no fuso de São Paulo (01:30 UTC do dia 23 é dia 22); na dupla aprovação, `aprovadoPor` na ordem cto e administradora, mesmo com a administradora primeiro ou no mesmo instante, e `aprovadoEm` da aprovação que completou; CA-22.5. **Determinismo:** CA-22.2 depois de editar título, contexto e tipo e de avançar o relógio; ESP e RSK novos depois da aprovação não mudam o pedido; o formato de `serializarPedido`. **Recusas:** CA-22.3 (e o tipo que conta é o copiado no DEC); CA-22.4 com pendente, devolvida, arquivada e cada uma das duas aprovações parciais; o 409 vem antes do estudo; C-28 com `especificacao.conteudo: e-mail`, sem o valor; C-28 com três campos (título, RSK e critério) e sentinelas; CNPJ não é procurado; o `validarPedido` falhando por descrição vazia e por ESP sem os campos de construção, com a lista exata dele; 404. **CA-22.6:** solicitante, texto bruto, origem e anexo fictícios fora do JSON, pela entrada manual. **Histórico:** um `pedido_gerado` por geração, com a pessoa e sem conteúdo. **Transação:** G3.8 com rollback. **Acesso:** os quatro agentes e o `sistema` recebem 403, também com DEC inexistente; a administradora gera. **Funções puras:** `textoDaEspecificacao`, `textoDoParecer` e `nivelMaior` (6 combinações); `montarPedido` passa no `validarPedido`, não leva resumo, opção não escolhida, recomendação, comentário nem documento, e recusa DEC sem aprovação |
| `pedido.test.ts` | 12 | **C-16:** só `POST` exportado. **C-29:** os cabeçalhos do download, o corpo igual ao gerado byte a byte e sem CORS. A administradora gera, e cada geração grava um evento. **Pela rota:** 409 (CA-22.4), 422 do estudo e 422 de C-28 com o corpo exato, sem o valor e sem `Content-Disposition`; 404. **C-17:** id fora do formato, inclusive com aspas e quebra de linha para forjar cabeçalho, responde 404 sem consulta nem conexão. **Acesso:** token de cada agente 403, sem evento; sem 2FA 403; 401. **C-15:** `Origin` de outro site ou ausente dá 403, corpo que não é JSON dá 415. **C-21:** uma linha de log por requisição, só com o padrão da rota, sem id, conteúdo, sentinela nem token |

Os testes do plano estão todos presentes, com corpo:

- os 3 de `detectores.test.ts`;
- os 8 de `gerar.test.ts`;
- os 3 de `pedido.test.ts`.

### TDD: os testes foram escritos antes e vistos falhando

Comando: `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/dados-pessoais/detectores.test.ts src/modules/pedido-construcao/gerar.test.ts src/app/api/pacotes-decisao/pedido.test.ts`.
Rodou antes de qualquer código da tarefa. Trecho da saída:

```
 FAIL  src/modules/dados-pessoais/detectores.test.ts [ src/modules/dados-pessoais/detectores.test.ts ]
Error: Cannot find module './detectores' imported from .../src/modules/dados-pessoais/detectores.test.ts
 FAIL  src/modules/pedido-construcao/gerar.test.ts [ src/modules/pedido-construcao/gerar.test.ts ]
Error: Cannot find module './conteudo' imported from .../src/modules/pedido-construcao/gerar.test.ts
 FAIL  src/app/api/pacotes-decisao/pedido.test.ts [ src/app/api/pacotes-decisao/pedido.test.ts ]
Error: Cannot find module '../../../modules/pedido-construcao/gerar' imported from .../src/app/api/pacotes-decisao/pedido.test.ts
 Test Files  3 failed (3)
      Tests  no tests
```

### Resultado

- T22 isolada: 3 arquivos, 74 de 74.
- `pnpm test`: 104 arquivos, 1978 de 1978, nenhum falhou.
  - 74 desses testes são dos três arquivos novos.
  - O resto do aumento sobre a T21 vem de dois lugares:
    - o `decidir-bordas.test.ts` da `06-T21-testes`;
    - os testes que varrem os arquivos de rota, entre eles a matriz, que gera um caso por método do `route.ts` novo.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.

### Desvios do plano

1. **`gerarPedido(deps: DepsDemanda, ator: Ator, decId, t?)`**. O plano tem `Deps` e `AtorPessoa`, e sem `t`.
   - `DepsDemanda` é o mesmo desvio aceito da T18 à T21: o serviço só usa `db`, `pool` e `relogio`.
   - `Ator`, com `autorizar` na primeira linha, é o molde de `registrarDecisao` (T21). É o que permite ao teste provar
     o 403 de agente e de `sistema` chamando a função direto. `AtorPessoa` continua aceito.
   - `t?` segue G3.8: a função grava o evento.
2. **Exportações a mais**, usadas no teste e reservadas para a tela da T44:
   - `MENSAGENS_PEDIDO` em `gerar.ts`;
   - `MENSAGEM_PEDIDO_SEM_APROVACAO` em `montar.ts`;
   - o tipo `DadoPessoalEncontrado` em `detectores.ts`.
3. **`montarPedido` também recusa DEC sem decisão aprovada**, com 409. O plano põe essa conferência em `gerarPedido`,
   e ela continua lá, antes da montagem. Na função pura ela é uma segunda barreira, e o tipo dela fica sem nulo em
   `opcaoEscolhida` e `aprovadoEm`.

## Decisões tomadas

- **Texto da ESP:** são 13 campos, na ordem da T07:
  - Descrição objetiva, Situação atual, Situação desejada;
  - Escopo inclui, Escopo exclui;
  - ERP, E-commerce e marketplace, APIs de terceiros, Serviços internos da WS;
  - Entidades, Campos críticos;
  - Restrições técnicas;
  - Dúvidas em aberto.

  Os quatro campos de construção não entram no texto: já vão no topo do pedido, e repeti-los faria duas fontes do
  mesmo dado.
- **Texto do RSK:**
  - Resumo;
  - os três riscos, cada um com o rótulo do nível (Baixo, Médio, Alto) e, quando houver, "Comentário: …" na linha de
    baixo;
  - Recomendações de mitigação;
  - Pré-condições;
  - "Quando envolver o jurídico ou a administradora".

  Os três níveis sempre aparecem, então `risco.conteudo` nunca fica vazio.
- **Campo vazio fica de fora** dos dois textos (nulo, texto só com espaços, lista vazia). É a regra de
  `descricaoDaDemanda` da T20. O texto fica igual para a versão gravada com `''` ou com `null`.
- **Rótulos de nível em `conteudo.ts`, e não em `src/components/rotulos.ts`.** O pedido não é tela, e a T36 ainda não
  existe. Os valores são os da 03, seção 2.2.
- **`aprovadoPor` sai em ordem de papel** pela lista `PAPEIS_APROVACAO` do esquema (cto, administradora), com os nomes
  unidos por " e ", como o plano pede. A ordem da vista não é usada (pendência 4 da `06-T21-revisao`).
- **DEC aprovado que ficou desatualizado depois da aprovação continua gerando o mesmo pedido.** O RF-22 monta "só com
  dados imutáveis" a partir da ESP e do RSK citados, que foram o que se aprovou, e a CA-22.2 pede o mesmo pedido sempre.
  O desatualizado só impede aprovar (RF-12). Há teste para isso.
- **O tipo que conta para o estudo é `demandaTipo`, a cópia gravada no DEC**, como o plano manda. A demanda que mudou
  de tipo depois do DEC não muda o pedido (CA-22.2).
- **Os campos de construção nulos passam até o `validarPedido`.** Isso acontece com a ESP de estudo numa demanda que
  virou bug. Ele responde com a mensagem dele, e o teste confere a lista.
- **Mensagens:**
  - 409: "o Pedido de Construção só é gerado de pacote aprovado.", em minúscula, porque a tela acrescenta "Não foi
    possível concluir: ". A 03 não tem esse texto, e ele segue o molde dos outros 409.
  - 422 do estudo: o texto exato da CA-22.3 e do plano.
  - 422 de dado pessoal e 422 do `validarPedido`: os dois usam "O pedido não passou na validação do /construir. Nada
    foi entregue." (o texto da 03, T11), com a lista em `erros`. No de dado pessoal, cada item tem o formato
    `"especificacao.conteudo: e-mail"`.
- **Evento `pedido_gerado` sem `antes` nem `depois`.** O id do DEC já está em `entidade_id`, e o texto do pedido vem
  de ESP e RSK (C-30). O evento só é gravado quando o pedido é entregue.
- **Leitura e evento na mesma transação** (`comTransacao` sem `t`). Assim o padrão é o mesmo dos outros serviços que
  gravam.
- **A rota não tem `corpo`.** O `POST` com cookie continua exigindo `Origin` e `Content-Type: application/json` (C-15,
  em `rota()`), por isso o teste manda `{}`.

## Pendências

- **Para a T44:** o botão "Gerar Pedido de Construção" faz `POST` com `Content-Type: application/json` e corpo `{}`.
  Sem isso a rota responde 415 a quem tem cookie.
  - A resposta 200 é o arquivo, com o nome em `Content-Disposition`.
  - Os 409 e 422 trazem `mensagem`, e os 422 de validação trazem também `erros`.
  - Os textos estão em `MENSAGENS_PEDIDO`.
- **Para a `06-T22-revisao`:** o formato dos dois textos não está escrito em nenhuma etapa anterior. O plano só diz
  "campos em ordem fixa, rótulos pt-BR". O formato está nas Decisões e é conferido exatamente nos testes. Mudar depois
  muda o pedido de todo DEC já aprovado, porque o mesmo DEC passa a gerar outro arquivo. Convém fixar o formato na
  revisão.
- **Para a T24:** `DETECTORES` e `encontrarDadosPessoais` estão prontos para a minimização. Para trocar o valor, use
  `replace` com a expressão global. `search` não serve para isso.
- **Itens das revisões anteriores que seguem abertos:** os Minor 1 e 2 da `06-T21-revisao` (cópias de `textoOuNulo` e
  da mensagem "Corrija os campos…"). Esta tarefa acrescentou um terceiro `preenchido` local, em `conteudo.ts`, pela
  mesma regra. O ajudante único continua para a 08, fora da lista de arquivos da T22.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format=%h%x20%s -n 8` — último commit d683bd2 (06-T21-testes)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format= --diff-filter=A -- src test scripts` — lista dos arquivos já criados em `src/`, `test/` e `scripts/`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD -- docs/construcao/DEC-DEM-20261022-0001-v1/02-arquiteto-solucoes.md docs/construcao/DEC-DEM-20261022-0001-v1/03-ux-ui-design.md docs/superpowers/plans/2026-10-25-ws-orquestrador-demandas-plano.md docs/superpowers/specs/2026-10-25-ws-orquestrador-demandas-design.md` — tamanho dos documentos, para ler por partes
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/dados-pessoais/detectores.test.ts src/modules/pedido-construcao/gerar.test.ts src/app/api/pacotes-decisao/pedido.test.ts` — antes do código: os 3 arquivos falharam (módulos ausentes)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/dados-pessoais/detectores.test.ts src/modules/pedido-construcao/gerar.test.ts src/app/api/pacotes-decisao/pedido.test.ts` — 74 de 74
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 1978 de 1978, 104 arquivos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — 9 arquivos novos, os da lista do plano, nenhum modificado

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno
