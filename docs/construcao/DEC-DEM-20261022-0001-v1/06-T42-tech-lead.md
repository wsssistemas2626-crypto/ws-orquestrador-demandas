---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T42-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12), 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6, mapa das fases, T41 a T46), 06-T42-engenheiro-frontend.md, 06-T41-tech-lead.md, git show f0e384b (stat e diff de lista-textos.ts, ListaTextos.tsx e demandas/[id]/page.tsx), "src/app/(painel)/demandas/[id]/pareceres-risco/novo/{page.tsx,FormularioParecer.tsx,acoes.ts,acoes.test.ts}", "src/app/(painel)/pareceres-risco/[rskId]/{page.tsx,parecer-da-pagina.ts,not-found.tsx}", "src/app/(painel)/especificacoes/[espId]/{not-found.tsx,especificacao-da-pagina.ts}", "src/app/(painel)/demandas/[id]/especificacoes/nova/FormularioEspecificacao.tsx (até a linha 109)", src/components/{dados-do-parecer.ts,dados-do-parecer.test.ts (até a linha 90),lista-textos.ts,ListaTextos.tsx,GrupoOpcoes.tsx,ResumoErros.tsx}, src/modules/pareceres-risco/schemas.ts, e2e/parecer-risco.spec.ts]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T42 (T08 Novo parecer de risco, T10 Ver RSK e correção do achado 1 da `06-T41-revisao` na Lista de
textos), commit `f0e384b`.

**Parecer: aprovada, sem problema Critical nem Important.** Os achados abaixo são Minor e vão para Pendências, como
manda a seção 12.

### Conferência própria

- `pnpm test` inteiro, numa rodada só: 176 de 176 arquivos e 3.461 de 3.461 testes, em 76,5 s. O resumo final foi lido
  no arquivo que a ferramenta guardou, fora de `/tmp`.
- `pnpm lint` e `pnpm typecheck`: limpos.
- `git status`: árvore limpa, no ramo `construcao/DEC-DEM-20261022-0001-v1`.
- O `pnpm test:e2e` não foi rodado aqui, porque não está na minha lista Pode. Vale o resultado do engenheiro (7 de 7
  nos testes novos e código 0 na suíte inteira) e a conferência da `06-T42-testes`.

### O que foi conferido no código

- **Server Action** (`novo/acoes.ts`):
  - passa por `acaoDoPainel({ acao: 'criar_parecer_risco' })`, com `criarParecerRiscoSchema.extend` só com `demandaId`
    (regex) e `versaoEsperada`, sem `.passthrough()` nem `.loose()`;
  - o teste de integração manda `autorTipo`, `autorId` e `rascunhoAgente` e confere que o RSK sai com autoria de pessoa
    e `rascunhoAgente: false` (C-11);
  - a resposta leva só `{ id, demandaId, conflito, decDesatualizado }`. O log da ação, visto na saída do `pnpm test`, só
    tem rota, tempo, tipo de ator e código de erro (C-21).
- **T08** (`novo/page.tsx`):
  - a ordem é `exigirPessoaNaPagina`, `autorizar('criar_parecer_risco')`, a demanda pela regex e, só com RSK,
    `autorizar('ler_parecer_risco')` e a leitura da versão de partida;
  - o `?base=` passa por `RE_ID_RSK` e só vale se estiver na lista de RSK da própria demanda, sem leitura extra (C-17).
    O caminho de volta do login só leva o `id` e a `base` depois das regex;
  - sem ESP, o aviso da 03 aparece e o formulário continua, como pede o primeiro teste do plano.
- **Formulário** (`FormularioParecer.tsx`): os três níveis em `GrupoOpcoes` com a `legend` "Nível do risco …
  (obrigatório)"; rótulos de nível só de `ROTULO_NIVEL` (G3.11); o alvo do link do resumo
  (`idDoCampo(nivel)-baixo`) bate com o id que o `GrupoOpcoes` gera.
- **T10** (`pareceres-risco/[rskId]/page.tsx`): regex antes do banco, 404 "Versão não encontrada" com status HTTP 404
  (conferido no e2e por `response.status()`), nível sempre em texto ("Risco técnico: Alto"), nenhum botão, formulário
  nem link de editar ou excluir (RF-11). Tudo sai como texto, sem `dangerouslySetInnerHTML` (C-18).
- **Chegada na T05** (`chegadaDoParecer`): só os dois valores fixos de `?aviso=` escolhem o texto; a versão tem de ser
  um RSK da demanda, e o DEC, um pacote dela pendente e desatualizado. Nada da URL vai cru para a tela.
- **Achado 1 da T41** (`errosDepoisDeRemover`): a linha removida perde o erro, as de baixo sobem com o caminho, o id do
  alvo e o rótulo "Item N de …" refeitos, e o erro da lista passa a levar ao "Adicionar item" quando não sobra item.
  Devolver o mesmo objeto quando nada muda evita que o Resumo de erros tome o foco à toa. O e2e prova o caso do achado
  (erro no item 2, remove o 1, o erro e o link vão para o novo item 1). Os testes da T41 passam sem edição.
- **Cópias para o navegador**: `NIVEIS_DO_PARECER`, `LIMITE_CAMPO_RSK` e `RE_ID_RSK` têm teste de igualdade com o
  servidor; o da regex compara com `RE_ID_VERSAO` e com `reIdVersao('RSK')`, o que fecha para o RSK o que foi o achado
  3 da T41.
- **Testes do plano**: os cinco do Passo 1 estão em `e2e/parecer-risco.spec.ts` (sem ESP, erros dos três níveis,
  gravado com DEC desatualizado, T10 com níveis em texto e sem editar, axe em vazio, com erro, preenchido e T10), mais
  conflito, sem sessão e 320 px.

### Pareceres por problema (todos Minor)

1. **`e2e/parecer-risco.spec.ts:123-126` e `src/components/GrupoOpcoes.tsx:59`: o axe do estado com erro roda antes do
   clique no link do resumo, para não pegar o `target-size`.** Depois do link, o rádio de 20 × 20 px fica meio sob o
   cabeçalho fixo e o axe acusa a regra.
   - Razão: a violação é de um componente da T36 e de um estado de rolagem passageiro; o rádio fica só em parte coberto,
     então o 2.4.11 (foco não totalmente escondido) se cumpre. Mas o teste foi arrumado em volta de um achado real, e o
     mesmo acontece na T04, na T05, na T06 e na T11 da T43, que usam o mesmo grupo.
   - Correção: na T46, que percorre o axe em todas as telas e pode corrigir arquivos do painel, pôr `scroll-padding-top`
     no `html` com a altura do cabeçalho fixo (o que também afasta o foco de baixo do cabeçalho em todo link do resumo),
     ou subir o rádio para 24 px (`h-6 w-6`). Depois, voltar a rodar o axe depois do clique no link nesta spec.
2. **`src/app/(painel)/pareceres-risco/[rskId]/not-found.tsx:1-21` e `parecer-da-pagina.ts:15-36`: cópia quase literal
   dos arquivos da T10 da ESP** (`especificacoes/[espId]/not-found.tsx` e `especificacao-da-pagina.ts`); muda só a
   constante de texto, a regex e a função de leitura. `FormularioParecer.tsx:43-50` repete também o `Secao` de
   `FormularioEspecificacao.tsx:55-63`, numa versão menor.
   - Razão: o Next exige um `not-found.tsx` por segmento, e o molde foi aceito na T41. Com dois casos ainda não pesa,
     mas a T43 traz o terceiro (DEC), e três cópias passam a divergir.
   - Correção: na T43, extrair para `src/components/` um `VersaoNaoEncontrada` (o `not-found.tsx` de cada segmento só o
     reexporta, com o `metadata`) e uma fábrica `leituraDaVersao(re, obter)` que devolva a leitura com `cache` e os
     metadados. O `Secao` pode ir junto, com a dica opcional.
3. **`src/app/(painel)/demandas/[id]/pareceres-risco/novo/acoes.ts:25-34`: duas leituras de `obterDemanda` fora da
   transação da gravação** (desvio 6 do engenheiro).
   - Razão: é o mesmo caso do achado 2 da T41. Uma gravação concorrente na mesma demanda pode fazer o aviso atribuir a
     esta versão um DEC que outra desatualizou. O efeito é só o texto do aviso; o DEC fica desatualizado de qualquer
     jeito.
   - Correção, se valer o custo: `criarParecerRisco` devolver os DEC que desatualizou, dentro da transação. É mudança
     de serviço do backend e fica fora desta tarefa.

### Desvios 1 a 6 do engenheiro

| Desvio | Parecer | Razão |
|---|---|---|
| 1. `ListaTextos.tsx`, `lista-textos.ts` e `FormularioEspecificacao.tsx` | Aceito | É a correção que a `06-T41-revisao` mandou para a T42. A prop `aoRemover` é opcional e os testes da T41 passam sem edição. |
| 2. `dados-do-parecer.ts` | Aceito | A regra é usada pelo Server Component, pelo formulário e pela T05; mesmo molde de `dados-da-especificacao.ts`, aceito na T41. |
| 3. `parecer-da-pagina.ts` e `not-found.tsx` | Aceito, com o achado 2 | Leitura com `cache` para a página e o `generateMetadata`, e o 404 da 03; a repetição fica para a T43 resolver. |
| 4. `[id]/page.tsx` (T40) alterado | Aceito | Só a chegada da T08 em `alertaDeChegada`, encadeada depois da da ESP; os testes da T40 passam sem edição. |
| 5. Sem esqueleto "Carregando" | Aceito | Mesmo motivo da T39 a T41: com `loading.tsx`, o `notFound()` perde o status 404. |
| 6. Duas leituras de `obterDemanda` na ação | Aceito, com o achado 3 | Sem mudar o serviço da T19, é o único jeito de saber qual DEC esta versão desatualizou. |

### Checklist da seção 12 do padrão técnico

- [x] A tarefa faz o que o plano pede: T08 e T10 do RSK, com os cinco testes do plano cobertos, mais a correção que a
  revisão da T41 mandou para cá. Os arquivos fora da lista são os desvios 1 a 4, todos aceitos acima.
- [x] Há teste para cada comportamento novo, visto falhando antes do código: módulos ausentes nos unitários,
  `errosDepoisDeRemover is not a function` e 3 falhas no e2e.
- [x] Nenhum segredo, valor de variável de ambiente ou dado pessoal real. Os testes usam "Pessoa Ficticia" e textos
  marcados como fictícios.
- [x] A entrada da Server Action é validada com Zod pelo adaptador do painel, com o schema da API. O erro interno sai
  com o texto da 2.8, e o 404 com `MENSAGEM_NAO_ENCONTRADO`.
- [x] Banco: não se aplica, porque a tarefa não tem migration.
- [x] Nada duplica função que já existe sem teste que trave a cópia: a tarefa reusa `acaoDoPainel`,
  `criarParecerRisco`, `errosDoResultado`, `idDoCampo`, `valoresDaLista`, `useConfirmarSaida`, `GrupoOpcoes`,
  `ListaTextos`, `ResumoErros`, `rotuloResponsavel` e `caminhos`. A repetição de molde entre as T10 é o achado 2
  (Minor).
- [x] Os textos são da 03, em pt-BR; os que a 03 não tem estão nas Pendências do engenheiro para o `ux-ui-design`. O
  axe, no e2e do engenheiro, não acusou violação na T08 (vazia, preenchida, com erro, depois de remover, a partir da
  v1 e em 320 px), na T05 depois de gravar, na T10 e no 404; a ressalva do momento em que o axe roda é o achado 1.
- [x] Os achados Minor estão em Pendências. Não há Critical nem Important.
- [x] Revisão de código e de segurança do PR: não se aplica a esta etapa.

## Decisões tomadas

- Aprovei sem devolver, porque só há achados Minor; pela seção 12, Minor vai para Pendências e não bloqueia.
- Tratei o `target-size` como Minor e o mandei à T46, e não a esta tarefa: o componente é da T36, é usado em quatro
  telas e a T46 é a dona do axe em todas elas.
- Mandei a extração do molde da T10 para a T43, que traz a terceira cópia; extrair agora mexeria nos arquivos da T41
  sem ganho para esta tarefa.
- Não pedi `pnpm test:e2e` nesta etapa, porque ele não está na minha lista Pode; ele fica com a `06-T42-testes`.
- `proximo` é `qa-automacao`, como nas revisões da T39 a T41.

## Pendências

- **T46 (`engenheiro-frontend`):** o achado 1 (`scroll-padding-top` no `html` ou rádio de 24 px, e o axe de volta
  depois do clique no link em `e2e/parecer-risco.spec.ts`).
- **T43 (`engenheiro-frontend`):** o achado 2 (componente `VersaoNaoEncontrada`, fábrica de leitura da versão e
  `Secao` compartilhados, antes de criar a T10 do DEC).
- **`06-T42-testes` (`qa-automacao`):** conferir que o e2e cobre o rascunho de agente quando o seed da T33 tiver RSK de
  agente (hoje só em unitário, Minor do engenheiro).
- **`ux-ui-design`:** as pendências de texto (a) a (f) do engenheiro e o tamanho do rádio do achado 1.
- **`07-qa-funcional` (G2):** o Resumo de erros reanunciado e o foco que passa por ele ao remover um item com erro; os
  grupos de nível aninhados nos grupos de risco no leitor de tela; os três "Comentário" com o mesmo nome visível.
- **Backend, sem tarefa agora:** o achado 3, junto com o achado 2 da T41 (os serviços de ESP e RSK devolverem os DEC
  desatualizados na transação).

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat f0e384b4f7b140b8cd1773c168ce5099de25e95e` — 19 arquivos, 2.319 inserções e 5 remoções
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show f0e384b4f7b140b8cd1773c168ce5099de25e95e -- src` — diff do código (saída longa, guardada pela ferramenta; os arquivos foram lidos pelo Read)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show f0e384b4f7b140b8cd1773c168ce5099de25e95e -- src/components/lista-textos.ts src/components/ListaTextos.tsx "src/app/(painel)/demandas/[id]/page.tsx"` — diff da Lista de textos e da T05
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 176 de 176 arquivos, 3.461 de 3.461 testes, 76,5 s
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
