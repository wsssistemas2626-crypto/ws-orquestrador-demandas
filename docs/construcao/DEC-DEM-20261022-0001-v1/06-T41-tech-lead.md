---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T41-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12), 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6, mapa das fases, T38 a T43), 05-tech-lead.md, 06-T41-engenheiro-frontend.md, 06-T39-tech-lead.md, git show 3666be2 (páginas, ação e T05), src/components/dados-da-especificacao.ts, src/components/dados-da-especificacao.test.ts (início), src/components/ListaTextos.tsx, src/components/lista-textos.ts, src/components/CampoTexto.tsx, src/components/dados-da-demanda.ts (início), "src/app/(painel)/demandas/[id]/especificacoes/nova/{FormularioEspecificacao.tsx,acoes.test.ts}", "src/app/(painel)/demandas/[id]/page.tsx (PaginaDemanda)", src/modules/especificacoes/{schemas,consultas}.ts, src/modules/versoes.ts, e2e/especificacao.spec.ts (início)]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T41 (Lista de textos, T07 Nova versão da ESP e T10 Ver ESP), commit `3666be2`.

**Parecer: aprovada, sem problema Critical nem Important.** Os achados abaixo são Minor e ficam em Pendências, como
manda a seção 12.

### Conferência própria

- `pnpm test` inteiro, numa rodada só: 170 de 170 arquivos e 3.376 de 3.376 testes, em 82,1 s. O resumo final foi lido
  no arquivo que a ferramenta guardou, fora de `/tmp`.
- `pnpm lint` e `pnpm typecheck`: limpos.
- `git status`: árvore limpa, no ramo `construcao/DEC-DEM-20261022-0001-v1`.
- O `pnpm test:e2e` não foi rodado aqui, porque não está na minha lista Pode. Vale o resultado do engenheiro (9 de 9
  nos testes novos e código 0 na suíte inteira) e a conferência da `06-T41-testes`.

### O que foi conferido no código

- **Server Action** (`acoes.ts`):
  - passa por `acaoDoPainel({ acao: 'criar_especificacao' })`;
  - o schema é o da API mais `demandaId` (regex) e `versaoEsperada`, sem `.passthrough()`. O teste manda `autorTipo`,
    `autorId` e `rascunhoAgente` e confere que a ESP sai com autoria de pessoa (C-11);
  - a resposta leva só ids e dois indicadores.
- **T07** (`nova/page.tsx`):
  - a ordem é `exigirPessoaNaPagina`, `autorizar`, a demanda pela regex e depois `ler_especificacao`;
  - o `?base=` passa pela regex e só vale se for uma ESP da própria demanda, conferida na lista que a página já tem,
    sem leitura extra (C-17).
- **T10** (`especificacoes/[espId]/page.tsx`):
  - a regex vem antes do banco, e o 404 só aparece para quem tem sessão (mesmo molde da T39, já aceito);
  - não há editar nem excluir (RF-11). Tudo sai como texto, sem `dangerouslySetInnerHTML` (C-18).
- **Chegada na T05** (`chegadaDaEspecificacao`):
  - só valores fixos de `?aviso=` escolhem o texto;
  - a versão e o DEC da URL são conferidos contra os da demanda, e nada da URL vai cru para a tela.
- **Validação da tela**: é só conveniência. O teste de integração prova que, sem ela, o servidor recusa e os erros
  voltam ao campo certo, e que a mudança de tipo fora da tela é pega pelo servidor.
- **Cópias de limite e de mensagem para o navegador**: há teste que trava a igualdade com o servidor
  (`MENSAGENS_CONSTRUCAO`, `LIMITE_TEXTO`, `DONOS_REPOSITORIO`, o `max(100)` do sistema alvo). É o mesmo critério do
  desvio 1 da T39.

### Pareceres por problema (todos Minor)

1. **`src/components/ListaTextos.tsx:50-54` e `:66`: o erro de item fica na linha errada depois de remover.** Os erros
   são guardados pela posição na tela (`campo.N`). Ao remover o item 1 de uma lista com erro no item 2, a mensagem passa
   para o novo item 1, e o link do Resumo de erros aponta para um id que agora é de outro item, ou que não existe mais.
   - Razão: a mensagem fica no campo errado até o próximo envio. O envio valida de novo, então nada errado é gravado.
   - Correção: ao remover, limpar os erros da lista no formulário dono, ou guardar o erro pela `chave` do item em vez da
     posição. Pode entrar na T42, que reusa o componente.
2. **`src/app/(painel)/demandas/[id]/especificacoes/nova/acoes.ts:27-33`: duas leituras fora da transação da
   gravação.** Se outra ESP ou outro RSK da mesma demanda for gravado entre a leitura de `antes` e a de `depois`, o
   aviso pode atribuir a esta versão um DEC que a outra gravação desatualizou.
   - Razão: o efeito é só o texto do aviso de chegada. O DEC fica desatualizado de qualquer jeito, e o status é sempre o
     do servidor. O engenheiro registrou isso no desvio 6.
   - Correção, se um dia valer o custo: `criarEspecificacao` devolver os DEC que desatualizou, dentro da própria
     transação. Isso é mudança de serviço do backend e fica fora desta tarefa.
3. **`src/components/dados-da-especificacao.ts:19`: `RE_ID_ESP` repete `RE_ID_VERSAO` (`src/modules/versoes.ts:14`).**
   - Razão: `versoes.ts` importa o esquema do banco e não vai ao navegador, então a cópia se justifica. Mas não achei
     teste que trave a igualdade das duas, como existe para os limites.
   - Correção: um teste que confira que `RE_ID_ESP` aceita e recusa as mesmas formas que `RE_ID_VERSAO` com prefixo
     `ESP`. Fica para a `06-T41-testes`.
4. **`src/components/dados-da-especificacao.ts:162-165`: conta fora da lista vira a da empresa sem aviso.** Uma ESP
   antiga com repositório de uma conta fora de `DONOS_REPOSITORIO` abre a nova versão com `wsssistemas2626-crypto`.
   - Razão: o texto "Repositório destino: …" mostra a troca, e o servidor recusaria a conta antiga de qualquer jeito.
     Ainda assim, a 03 não descreve esse caso.
   - Correção: nenhuma no código agora. Vai ao `ux-ui-design`, junto com as pendências de texto do engenheiro.

### Desvios 1 a 6 do engenheiro

| Desvio | Parecer | Razão |
|---|---|---|
| 1. `lista-textos.ts` e `dados-da-especificacao.ts` | Aceito | Uma função exportada de arquivo `'use client'` chega ao servidor como referência de cliente. A regra é usada pelo Server Component, pelo formulário e pela T05. É o mesmo molde de `dados-da-demanda.ts` (T39) e de `detalhe.ts` (T40). |
| 2. `especificacao-da-pagina.ts` | Aceito | É a leitura com `cache` usada pela página e pelo `generateMetadata`, no molde de `demanda-da-pagina.ts`, já aceito na T39. |
| 3. `not-found.tsx` da T10 | Aceito | A 03, T10, pede "Versão não encontrada." e o 404 do painel diz outra coisa. O arquivo só tem texto fixo. |
| 4. `[id]/page.tsx` (T40) alterado | Aceito | A T40 deixou a chegada da T07 para esta tarefa. A mudança é só em `alertaDeChegada`, e os testes da T40 e da `06-T40-testes` passam sem edição. |
| 5. Sem esqueleto "Carregando" | Aceito | É o mesmo motivo da T39 e da T40: com `loading.tsx`, o `notFound()` perde o status 404. |
| 6. Duas leituras de `obterDemanda` na ação | Aceito, com o achado 2 | Sem mudar o serviço da T18, é o único jeito de saber qual DEC pendente esta versão desatualizou. O efeito da corrida é só o texto do aviso. |

### Checklist da seção 12 do padrão técnico

- [x] A tarefa faz o que o plano pede: Lista de textos, T07 e T10, com os sete testes do plano cobertos em
  `e2e/especificacao.spec.ts`. Os arquivos fora da lista são os desvios 1 a 4, todos aceitos acima.
- [x] Há teste para cada comportamento novo, visto falhando antes do código: módulos ausentes nos cinco unitários e 3
  falhas no e2e.
- [x] Nenhum segredo, valor de variável de ambiente ou dado pessoal real. Os testes usam só "Pessoa Ficticia" e textos
  marcados como fictícios.
- [x] A entrada da Server Action é validada com Zod pelo adaptador do painel. O erro interno sai com o texto da 2.8.
- [x] Banco: não se aplica, porque a tarefa não tem migration.
- [x] Nada duplica função que já existe. A tarefa reusa `acaoDoPainel`, `criarEspecificacao`, `errosDoResultado`,
  `idDoCampo`, `useConfirmarSaida`, `DialogoConfirmacao`, `ResumoErros`, `rotuloResponsavel` e `caminhos`. As cópias de
  dado para o navegador têm teste de igualdade, menos a regex do achado 3 (Minor).
- [x] Os textos são da 03, em pt-BR. O axe, no e2e do engenheiro, não acusou violação na T07 (vazia, preenchida, com
  50 itens, com erro, com erro da API, com o diálogo, em 320 px e depois de gravar), na T10 e no 404.
- [x] Os achados Minor estão em Pendências. Não há Critical nem Important.
- [x] Revisão de código e de segurança do PR: não se aplica a esta etapa.

## Decisões tomadas

- Aprovei sem devolver, porque só há achados Minor. Pela seção 12, Minor vai para Pendências e não bloqueia.
- Aceitei o alerta de conflito na T05 como erro, em vez de deixá-lo na T07: a versão já foi gravada, e ficar no
  formulário convidaria a gravar de novo. O texto continua sendo o da 03, e a posição vai ao `ux-ui-design`.
- Não pedi `pnpm test:e2e` nesta etapa, porque ele não está na minha lista Pode. Ele fica com a `06-T41-testes`.
- `proximo` é `qa-automacao`, como na revisão da T39.

## Pendências

- **T42 (`engenheiro-frontend`):** o achado 1. A T42 reusa a Lista de textos, e é nela que a correção cabe.
- **`06-T41-testes` (`qa-automacao`):**
  - o achado 3 (teste de igualdade entre `RE_ID_ESP` e `RE_ID_VERSAO`);
  - o status 404 conferido por `response.status()` na T07 e na T10, como no achado 3 da T39;
  - o 429 do `verify-totp` em logins seguidos, registrado pelo engenheiro, que se junta à pendência de C-06 da T09.
- **`ux-ui-design`:**
  - as pendências de texto (a) a (h) do engenheiro;
  - o achado 4 (conta fora da lista trocada pela da empresa).
- **`07-qa-funcional` (G2):** o foco depois do diálogo com e sem falha da API, os grupos aninhados no leitor de tela
  e os cinco "Adicionar item" com o mesmo nome visível, como listou o engenheiro.
- **Backend, sem tarefa agora:** o achado 2 (`criarEspecificacao` devolver os DEC desatualizados na transação).
- **Minor do engenheiro mantido:** o selo e o aviso de rascunho de agente só foram vistos em teste unitário. A T45 e a
  T33 (seed com rascunho) devem cobrir isso no e2e.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 3666be297a7e143ef83fbc0e860b3c91320eec45` — 18 arquivos, 2.858 inserções e 8 remoções
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 3666be297a7e143ef83fbc0e860b3c91320eec45 -- "src/app/(painel)/demandas/[id]/especificacoes/nova/acoes.ts" "src/app/(painel)/demandas/[id]/especificacoes/nova/page.tsx" "src/app/(painel)/demandas/[id]/page.tsx" "src/app/(painel)/especificacoes/[espId]/especificacao-da-pagina.ts" "src/app/(painel)/especificacoes/[espId]/not-found.tsx" "src/app/(painel)/especificacoes/[espId]/page.tsx"` — diff das páginas, da ação e da T05
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 170 de 170 arquivos, 3.376 de 3.376 testes, 82,1 s
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
