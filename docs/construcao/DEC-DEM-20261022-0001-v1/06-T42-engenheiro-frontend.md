---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T42-construcao
agente: engenheiro-frontend
leu: [contrato-passagem.md, pedido.json, tarefas.json, 05-tech-lead.md, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6, T38 a T43, rastreabilidade), 03-ux-ui-design.md (1, 2.1 a 2.8, 3, T07, T08, T09, T10), 06-T41-engenheiro-frontend.md, 06-T41-tech-lead.md, 06-T41-qa-automacao.md, src/components/{ListaTextos.tsx,lista-textos.ts,lista-textos.test.ts,dados-da-especificacao.ts,dados-da-especificacao.test.ts (até a linha 320),dados-da-demanda.ts,formulario.ts,rotulos.ts,rotulos-qa.test.ts (início),GrupoOpcoes.tsx,ResumoErros.tsx,CampoTexto.tsx,AreaTexto.tsx,Alerta.tsx}, "src/app/(painel)/demandas/[id]/{page.tsx,detalhe.ts (até a linha 140),demanda-da-pagina.ts}", "src/app/(painel)/demandas/[id]/especificacoes/nova/{page.tsx,acoes.ts,FormularioEspecificacao.tsx,acoes.test.ts,pagina.test.ts}", "src/app/(painel)/especificacoes/[espId]/{page.tsx,especificacao-da-pagina.ts,not-found.tsx,pagina.test.ts}", src/modules/pareceres-risco/{schemas,servico,consultas}.ts, src/modules/demandas/{schemas.ts,consultas.ts (até a linha 110)}, src/modules/{limites.ts,versoes.ts (início)}, src/modules/acesso/matriz.ts, src/lib/{erros.ts,acao-painel.ts,rota.ts (início)}, src/app/api/pareceres-risco/[rskId]/route.ts, src/app/api/demandas/[id]/pareceres-risco/route.ts, test/estatico/{painel-qa,exigir-pessoa,varreduras-qa}.test.ts, playwright.config.ts, e2e/{apoio,especificacao.spec,especificacao-qa.spec}.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

A T42 entrega três coisas:
- a T08 Novo parecer de risco (`/demandas/[id]/pareceres-risco/novo`);
- a T10 Ver RSK (`/pareceres-risco/[rskId]`);
- a correção do achado 1 da `06-T41-revisao` na Lista de textos (o erro de item ficava na linha errada depois de
  remover), que a revisão e a `06-T41-testes` mandaram para esta tarefa. A correção vale na T08 e na T07 da ESP.

Os textos, os estados e a acessibilidade são os da 03. O detalhe (T05) ganhou o alerta de chegada da T08.

Portões, todos verdes:
- `pnpm test`: 176 arquivos e 3.461 testes, sem falha. Os 54 testes novos estão em cinco arquivos (lista abaixo).
- `pnpm test:e2e`: 7 de 7 no `e2e/parecer-risco.spec.ts`. A suíte inteira (78 testes em 13 arquivos) terminou com
  código 0, inclusive os 9 da T07 que usam a Lista de textos corrigida.
- `pnpm lint` e `pnpm typecheck`: limpos.
- `pnpm build`: passa. `/demandas/[id]/pareceres-risco/novo` e `/pareceres-risco/[rskId]` saem dinâmicas.

### T08 Novo parecer de risco

- **Página** (Server Component). A ordem é esta:
  1. `exigirPessoaNaPagina`;
  2. `criar_parecer_risco`;
  3. a demanda, lida só depois de o id passar pela regex (C-17). Id fora do formato ou inexistente dá 404;
  4. com RSK na demanda, `ler_parecer_risco` e depois a versão de partida.
- **Versão de partida**: o RSK mais novo, ou o de `?base=<rskId>` vindo da T10. Uma `base` de outra demanda, que não
  existe, repetida ou fora do formato é ignorada sem leitura nenhuma, e a página parte do mais novo. Sem RSK, os campos
  abrem em branco, sem nível marcado e com um item vazio em cada lista (03, T08, Vazio).
- **Informação no topo**:
  - com ESP: "Este será o RSK-…-vN. A especificação mais nova desta demanda é a ESP-…-vK.";
  - sem ESP: "Esta demanda ainda não tem especificação técnica. Você pode gravar o parecer, mas o pacote de decisão vai
    exigir as duas.". O formulário continua e a gravação é permitida;
  - partindo de um rascunho de agente, também "Os campos vieram da vK, um rascunho do agente de risco. Revise antes de
    gravar." (texto composto, ver Pendências).
- **Formulário** (`FormularioParecer.tsx`):
  - "Resumo";
  - "Risco técnico", "Risco operacional" e "Risco jurídico", cada um num `fieldset`/`legend`. Dentro, o Grupo de opções
    com a `legend` "Nível do risco técnico (obrigatório)" (idem operacional e jurídico), com Baixo, Médio e Alto de
    `ROTULO_NIVEL`, e o "Comentário";
  - as listas "Recomendações de mitigação" e "Pré-condições" (com a dica), pela Lista de textos;
  - "Quando envolver o jurídico ou a administradora", com a dica;
  - "Gravar RSK-…-vN" e o link "Cancelar".
- **Envio**:
  - a validação acontece no envio, na ordem da tela, com "Escolha o nível do risco técnico." (idem os outros dois) e os
    limites da RNF-04. O link do Resumo de erros leva à primeira opção do grupo;
  - o botão mostra "Gravando…" e o formulário fica com `aria-busy`;
  - os erros da API (400) entram no mesmo resumo, campo a campo. Nível ausente ("Campo obrigatório.") ou fora da lista
    ("Valor inválido.") vira a mensagem da 03. O resto vira alerta com o texto da 2.8;
  - o que foi digitado nunca se perde. Sair com conteúdo não salvo pede confirmação (`useConfirmarSaida` da T39).
- **Server Action** (`acoes.ts`):
  - `acaoDoPainel({ acao: 'criar_parecer_risco' })` sobre `criarParecerRisco`, com o schema da API mais `demandaId`
    (pela regex) e `versaoEsperada`;
  - a autoria vem só da sessão (C-11);
  - a resposta leva só `{ id, demandaId, conflito, decDesatualizado }`.
- **Chegada na T05** (`chegadaDoParecer`):
  - "RSK-…-vN gravado.";
  - mais "O pacote DEC-…-vN ficou desatualizado. Crie um pacote novo para decidir.", quando houver;
  - no conflito, "Outra versão foi gravada enquanto você editava. Sua versão foi gravada como vN; confira as duas no
    detalhe.", num alerta de erro, como na T07;
  - a versão e o DEC da URL só valem se forem desta demanda, e o DEC só se estiver pendente e desatualizado. Só valores
    fixos de `?aviso=` escolhem o texto.

### T10 Ver RSK

- **Ordem**: `exigirPessoaNaPagina`, `ler_parecer_risco`, o RSK (regex de RSK antes do banco), `ler_demanda` e a
  demanda (para o título). Id fora do formato, de ESP ou de DEC, ou que não existe, dá 404 "Versão não encontrada", com
  status HTTP 404.
- **Cabeçalho**: o id e o selo "Rascunho de agente", quando for o caso; o `h1` "Parecer de risco vN — <título>";
  "Criada em <data> por <ator>".
- **Avisos**: "Esta versão não muda…"; o de rascunho ("Rascunho do agente de risco. Leia com atenção…", ver
  Pendências); "Existe uma versão mais nova: RSK-…-vN.", com link.
- **Conteúdo**: um `h2` e uma `dl` por grupo: Resumo, os três riscos, Recomendações de mitigação, Pré-condições e Quando
  envolver. O nível aparece sempre em texto ("Risco técnico: Alto"). Campo vazio mostra "Não informado." e lista vazia
  mostra "Nenhum item.".
- **Ações**: "Criar nova versão a partir desta" leva a `/novo?base=<rskId>`; "Voltar para a demanda". Não há botão nem
  formulário de editar ou de excluir (RF-11).

### Achado 1 da 06-T41-revisao (Lista de textos)

- `errosDepoisDeRemover` (`lista-textos.ts`): ao remover a linha N, o erro dela sai e os erros das linhas de baixo sobem
  uma linha, com o caminho, o id do alvo e o rótulo "Item N de …" refeitos. Sem item na tela, o erro da lista passa a
  levar ao "Adicionar item".
- Quando não há nada a mudar, a função devolve o mesmo objeto. Assim, o Resumo de erros só pega o foco de novo quando os
  erros mudam de fato.
- `ListaTextos` ganhou a prop opcional `aoRemover(indice, restantes)`. A T07 (ESP) e a T08 (RSK) a usam.
- Quando o resumo muda, ele pega o foco primeiro, e o foco da lista vem depois, na mesma renderização. O e2e confere que o
  foco termina onde a 2.4 manda (item anterior ou "Adicionar item").

### Arquivos

- Alterados:
  - `src/components/ListaTextos.tsx`: prop `aoRemover` (desvio 1);
  - `src/components/lista-textos.ts`: `errosDepoisDeRemover` (desvio 1);
  - `src/components/lista-textos.test.ts`: 4 testes novos, nenhum teste existente mudou;
  - `src/app/(painel)/demandas/[id]/especificacoes/nova/FormularioEspecificacao.tsx`: passa `aoRemover` (desvio 1);
  - `src/app/(painel)/demandas/[id]/page.tsx`: `alertaDeChegada` chama também `chegadaDoParecer` (desvio 4).
- Criados:
  - `src/components/dados-do-parecer.ts` (desvio 2)
  - `src/app/(painel)/demandas/[id]/pareceres-risco/novo/page.tsx`
  - `src/app/(painel)/demandas/[id]/pareceres-risco/novo/FormularioParecer.tsx`
  - `src/app/(painel)/demandas/[id]/pareceres-risco/novo/acoes.ts`
  - `src/app/(painel)/pareceres-risco/[rskId]/page.tsx`
  - `src/app/(painel)/pareceres-risco/[rskId]/parecer-da-pagina.ts` (desvio 3)
  - `src/app/(painel)/pareceres-risco/[rskId]/not-found.tsx` (desvio 3)
  - `e2e/parecer-risco.spec.ts`
  - os testes unitários abaixo

### Testes criados

- `src/components/dados-do-parecer.test.ts` (21):
  - níveis, limite e regex iguais aos do servidor (`NIVEIS_RISCO`, `LIMITE_TEXTO`, `RE_ID_VERSAO` e
    `reIdVersao('RSK')`);
  - textos da 03, e os comuns com a T07/T10 da ESP iguais aos de `TEXTOS_ESP`;
  - valores iniciais;
  - validação na ordem da tela;
  - entrada que passa em `criarParecerRiscoSchema` e não leva autoria;
  - erros da API com o índice e a mensagem da 03;
  - chegada na T05, sem confiar na URL;
  - seções da T10.
- `src/components/lista-textos.test.ts` (+4): `errosDepoisDeRemover`.
- `src/app/(painel)/demandas/[id]/pareceres-risco/novo/acoes.test.ts` (7, Testcontainers, banco e Better Auth reais):
  - v1 sem ESP com a autoria da sessão, e o status da demanda sem mudar;
  - conflito;
  - DEC desatualizado na resposta;
  - recusa do servidor sem a validação da tela;
  - item longo que volta à linha da tela;
  - C-17 e 404;
  - sem sessão.
- `src/app/(painel)/demandas/[id]/pareceres-risco/novo/pagina.test.ts` (12): ordem de autorização e leitura, C-17,
  404, sem permissão, `?base=` só da mesma demanda, título da aba, HTML da v1 com ESP e sem ESP, v3 com os níveis
  marcados, base de rascunho, C-18.
- `src/app/(painel)/pareceres-risco/[rskId]/pagina.test.ts` (10): ordem, C-17 com ESP e DEC, 404 e falha que sobe,
  título da aba, a página 404, cabeçalho e ações sem editar nem excluir, `dl` por seção com os níveis em texto, rascunho,
  versão mais nova, C-18.
- `e2e/parecer-risco.spec.ts` (7):
  - sem ESP (aviso e gravação);
  - erros dos três níveis, e o erro de item na linha certa depois de remover;
  - v2 a partir da v1 com o DEC desatualizado;
  - conflito;
  - T10 com "Criar nova versão a partir desta", saída sem salvar e 404 com status HTTP;
  - sem sessão;
  - 320 px.
  O axe roda na T08 vazia, preenchida, com erro, depois de remover o item com erro, a partir da v1 e em 320 px; na T05
  depois de gravar; na T10; e no 404 da T10.

### Teste escrito antes e visto falhando

`pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-do-parecer.test.ts src/components/lista-textos.test.ts "src/app/(painel)/demandas/[id]/pareceres-risco/novo" "src/app/(painel)/pareceres-risco"`, antes do código:
```
 FAIL  src/components/dados-do-parecer.test.ts
Error: Cannot find module './dados-do-parecer' imported from .../dados-do-parecer.test.ts
 FAIL  src/app/(painel)/pareceres-risco/[rskId]/pagina.test.ts
Error: Cannot find module '/src/app/(painel)/pareceres-risco/[rskId]/not-found' ...
 FAIL  src/components/lista-textos.test.ts > errosDepoisDeRemover ... > remover a linha 1 com erro na linha 2 ...
TypeError: errosDepoisDeRemover is not a function
 Test Files  5 failed (5)
      Tests  4 failed | 10 passed (14)
```

`pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/parecer-risco.spec.ts --max-failures=3`, antes do código:
```
  ✘  1 › sem ESP: aviso … getByRole('heading', { name: 'Novo parecer de risco', level: 1 }) … element(s) not found
  ✘  2 › erros "Escolha o nível do risco técnico." … element(s) not found
  ✘  3 › gravado: "RSK-…-v2 gravado." … getByText('Este será o RSK-DEM-20261031-0008-v2. …') … element(s) not found
  3 failed, 4 did not run
```

Depois do código:
- **unitários**: 64 de 64 na primeira rodada (os 54 novos e os 10 que já existiam em `lista-textos.test.ts`);
- **e2e novos**: 6 de 7 na primeira rodada. A falha foi `target-size` num rádio de 20 px. O link do Resumo de erros
  rolou a página, e o rádio ficou meio sob o cabeçalho fixo. O axe passou a rodar no estado de erro antes do link, com o
  resumo no topo (ver Pendências). Na segunda rodada, 7 de 7.

### Desvios do plano

1. **`ListaTextos.tsx`, `lista-textos.ts` e `FormularioEspecificacao.tsx` alterados, fora da lista.** É a correção do
   achado 1, que a `06-T41-revisao` e a `06-T41-testes` mandaram para a T42. A prop `aoRemover` é opcional, e os testes da
   T41 e da `06-T41-testes` passam sem edição.
2. **`dados-do-parecer.ts`, fora da lista.** A regra (textos, validação, entrada, erros da API, chegada na T05 e seções
   da T10) é usada pelo Server Component, pelo formulário de cliente e pela T05. É o mesmo molde de
   `dados-da-especificacao.ts` (desvio 1 da T41, aceito).
3. **`parecer-da-pagina.ts` e `not-found.tsx` da T10, fora da lista.** São a leitura com `cache` para a página e o
   `generateMetadata`, e o 404 "Versão não encontrada", no molde da T10 da ESP (desvios 2 e 3 da T41, aceitos).
4. **`src/app/(painel)/demandas/[id]/page.tsx` (T40) alterado.** É só a chegada da T08 em `alertaDeChegada`. A T05 é o
   destino da T08 pela 03. Os testes da T40 e da `06-T40-testes` passam sem edição.
5. **Estado "Carregando" (esqueleto) não implementado.** É o mesmo motivo da T39 a T41: com `loading.tsx`, o
   `notFound()` não troca mais o status para 404. "Gravando…" no envio está feito.
6. **Duas leituras de `obterDemanda` na Server Action**, antes e depois da gravação. É o mesmo do desvio 6 da T41 (e do
   achado 2 da revisão dela): sem mudar o serviço da T19, só assim se sabe qual DEC pendente esta versão desatualizou.

## Decisões tomadas

- **Sem ESP, o aviso da 03 fica no lugar da informação "Este será o RSK-…".** A 03 dá os dois textos como alternativa.
  O id novo continua no botão "Gravar RSK-…-vN".
- **O comentário de cada risco tem o rótulo visível "Comentário" (texto da 03).** Ele fica dentro do grupo "Risco
  técnico", que dá o contexto. No Resumo de erros, o rótulo é "Comentário do risco técnico" (idem os outros), para os
  três não se confundirem.
- **O nível na T10 vai só em texto ("Risco técnico: Alto"), sem selo colorido.** A 03 exige o texto e proíbe depender da
  cor. Sem selo, não há par de cor novo para conferir.
- **A T10 do RSK usa "Criada em", o texto único da 03 para ESP e RSK.**
- **O conflito de versão volta à T05 como alerta de erro**, como na T07: a versão já foi gravada.
- **A correção do achado 1 move os erros com o item, sem apagá-los.** Assim, os outros erros da lista continuam na linha
  certa até o próximo envio, que valida de novo.
- **e2e com a conta "administradora"**, como a T41. Os 7 testes criam 6 demandas e cerca de 10 versões, dentro do
  limite por ator (C-36) somado ao dos testes da T41.

## Pendências

- **ux-ui-design (textos compostos ou ausentes na 03):**
  - (a) "Os campos vieram da vK, um rascunho do agente de risco. Revise antes de gravar." (adaptado da T07);
  - (b) "Rascunho do agente de risco. Leia com atenção: o conteúdo foi gerado por IA a partir do texto do pedido." (a 03,
    T10, só traz o texto do agente de insumo técnico);
  - (c) os rótulos do Resumo de erros: "Nível do risco técnico" e "Comentário do risco técnico" (idem os outros);
  - (d) o termo "Nível" na `dl` da T10, e as seções da T10 do RSK (Resumo, os três riscos, Recomendações de mitigação,
    Pré-condições, Quando envolver), que a 03 não lista;
  - (e) o título da aba da T10, "Parecer de risco";
  - (f) "Criada em" para o parecer (masculino), que segue o texto único da 03.
- **T46 e ux-ui-design: tamanho do rádio.** O rádio do Grupo de opções (T36) tem 20 × 20 px e passa no `target-size`
  só pela exceção de espaçamento. Quando a rolagem o deixa meio sob o cabeçalho fixo, o axe conta só a parte visível e
  acusa a regra. Isso aconteceu na T08 depois do link do Resumo de erros. Não mudei o componente, que é da T36 e é usado
  na T04, na T05 e na T06. Um rádio de 24 px tiraria o caso.
- **07-qa-funcional (G2):**
  - o Resumo de erros reanunciado (`role="alert"`) quando um item com erro é removido, e o foco que passa por ele antes
    de chegar ao item anterior ou ao "Adicionar item";
  - os três grupos de nível aninhados nos grupos de risco, lidos pelo leitor de tela;
  - os três "Comentário" com o mesmo nome visível, distinguidos só pelo grupo.
- **Minor:** o selo e os avisos de rascunho de agente na T08 e na T10 do RSK só foram vistos em teste unitário. Com os
  agentes desligados e sem token de serviço no e2e, não dá para gravar um rascunho pela API.
- **e2e inteiro, a contagem.** A suíte terminou com código 0. Ela passou de 180 s, e a ferramenta a levou para segundo
  plano. Não li o arquivo em `/tmp`. A parte vista chegou ao teste 54 sem falha, inclusive os 9 da T07. O
  `pnpm test:e2e --list` dá 78 testes em 13 arquivos. A saída do `pnpm test`, longa demais para a tela, foi gravada pela
  ferramenta fora de `/tmp`, e dela li só o resumo final.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format=%h -- e2e test/estatico` — arquivos de e2e e estáticos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-do-parecer.test.ts src/components/lista-textos.test.ts "src/app/(painel)/demandas/[id]/pareceres-risco/novo" "src/app/(painel)/pareceres-risco"` — FAIL: 5 arquivos, 4 testes falharam e 10 passaram (teste antes do código)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/parecer-risco.spec.ts --max-failures=3` — FAIL: 3 falharam e 4 não rodaram (teste antes do código)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-do-parecer.test.ts src/components/lista-textos.test.ts "src/app/(painel)/demandas/[id]/pareceres-risco/novo" "src/app/(painel)/pareceres-risco"` — 64 de 64
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/parecer-risco.spec.ts` — 6 de 7 (`target-size` com o rádio sob o cabeçalho), axe passou a rodar antes do link
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/parecer-risco.spec.ts` — 7 de 7
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 176 de 176 arquivos, 3.461 de 3.461 testes, 76,0 s
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — código 0 (passou de 180 s e foi para segundo plano; numeração vista até 54, sem falha)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — 5 alterados e 12 novos, todos da tarefa (com os desvios 1 a 4)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas build` — passou; as duas rotas novas dinâmicas
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --list` — 78 testes em 13 arquivos

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] os textos são os de `03-ux-ui-design.md`, em pt-BR, e o axe não acusa violação nas telas tocadas
