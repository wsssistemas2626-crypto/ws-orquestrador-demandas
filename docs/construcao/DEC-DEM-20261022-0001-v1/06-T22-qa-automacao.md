---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T22-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 05-tech-lead.md, 06-T22-engenheiro-backend.md, 01-analista-requisitos.md (glossário e RF-17 a RF-25), 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G3 e T21 a T22), commit 7434f549 (git show --stat), src/modules/pedido-construcao/gerar.ts, src/modules/pedido-construcao/montar.ts, src/modules/pedido-construcao/conteudo.ts, src/modules/pedido-construcao/serializar.ts, src/modules/dados-pessoais/detectores.ts, src/app/api/pacotes-decisao/[decId]/pedido-construcao/route.ts, src/modules/pedido-construcao/gerar.test.ts, src/modules/dados-pessoais/detectores.test.ts, src/app/api/pacotes-decisao/pedido.test.ts, src/modules/pacotes-decisao/consultas.ts, src/vendor/construir/pedido.mjs, src/lib/rota.ts, test/banco.ts, test/deps.ts, test/requisicao.ts, test/sentinelas.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Verificação da T22 (Pedido de Construção) sobre o commit `7434f549`. Depois dele, só entraram documentos da revisão
(`06-T22-tech-lead.md` e `passagens.jsonl`). Nenhum código mudou: conferi com `git diff --stat 7434f549 HEAD`.

O código cumpre todos os critérios da tarefa. Os 74 testes do engenheiro estão certos e não são instáveis: o relógio é
fixo, cada teste fica num dia próprio, os ids são únicos e há um banco por arquivo. Acrescentei 14 testes de borda em
dois arquivos novos. Nenhum arquivo existente foi alterado.

### Critérios da tarefa → testes

`gerar.test.ts`, `gerar-bordas.test.ts` e `detectores.test.ts` ficam em `src/modules/pedido-construcao/` e
`src/modules/dados-pessoais/`. `pedido.test.ts` e `pedido-bordas.test.ts` ficam em `src/app/api/pacotes-decisao/`.

| Critério | Teste que cobre (arquivo › nome) |
|---|---|
| CA-22.1 passa no validarPedido, `pedido` = `decisao.id` | `gerar.test.ts` › "CA-22.1: DEC aprovado com ESP e RSK completos → passa no validarPedido e pedido = decisao.id"; "cada campo vem da origem da tabela do RF-22, com a ordem de chaves fixa"; `pedido.test.ts` › "C-29: cabeçalhos do download e corpo igual, byte a byte, ao JSON gerado"; `pedido-bordas.test.ts` › "o arquivo baixado passa no validarPedido e termina com uma quebra de linha" |
| CA-22.2 mesmo DEC, mesmo arquivo byte a byte | `gerar.test.ts` › "CA-22.2: o mesmo DEC, duas vezes, inclusive depois de editar o título da demanda → byte a byte igual"; "ESP e RSK novos depois da aprovação não mudam o pedido do DEC aprovado: vale o que foi citado"; `gerar-bordas.test.ts` › "cinco gerações ao mesmo tempo dão o mesmo JSON, byte a byte, e cinco eventos pedido_gerado"; "a conta de quem aprovou muda de nome depois da aprovação: aprovadoPor continua o nome gravado na aprovação"; "um ano depois, as listas da ESP saem na ordem gravada e o arquivo é o mesmo"; `pedido-bordas.test.ts` › "CA-22.2 pela rota: o mesmo DEC, hoje e no dia seguinte em São Paulo, baixa o mesmo arquivo, byte a byte"; "o corpo da requisição não muda o pedido: campos do pedido enviados no POST são ignorados" |
| CA-22.3 estudo → 422 com a mensagem | `gerar.test.ts` › "CA-22.3: estudo → 422 com a mensagem"; "CA-22.3: o tipo que conta é o copiado no DEC: demanda que virou estudo depois do DEC ainda gera"; `pedido.test.ts` › "CA-22.3: estudo aprovado → 422 com a mensagem" |
| CA-22.4 pendente, devolvida ou só uma das duas aprovações → 409 | `gerar.test.ts` › "CA-22.4: pendente, devolvida, arquivada e só uma das duas aprovações → 409, sem evento"; "CA-22.4 vem antes do estudo: estudo pendente → 409"; `pedido.test.ts` › "CA-22.4: DEC pendente → 409 com o motivo, sem evento"; `pedido-bordas.test.ts` › "CA-22.4 pela rota: DEC devolvido → 409 com o motivo, sem download e sem evento" |
| CA-22.5 baixo, alto e medio → `alto` | `gerar.test.ts` › "CA-22.5: RSK baixo, alto e medio → risco.nivel alto" e o `it.each` "CA-22.5: %j → %s" (6 combinações) |
| CA-22.6 sem solicitante nem texto bruto | `gerar.test.ts` › "CA-22.6: solicitante, texto bruto, origem e anexo fictícios não aparecem no JSON"; `pedido.test.ts` › "C-29: …" (sentinela do solicitante) |
| RF-22 validarPedido falhou → 422 com a lista, nada entregue | `gerar.test.ts` › "validarPedido falhou → 422 com a lista de erros dele, e nada entregue"; "validarPedido: ESP sem os campos de construção …"; `pedido-bordas.test.ts` › "validarPedido falhou pela rota → 422 com a mensagem e a lista dele, sem download e sem evento" |
| RF-22 cada geração no histórico | `gerar.test.ts` › "cada geração grava evento pedido_gerado com a pessoa, sem conteúdo"; `pedido.test.ts` › "a administradora também gera; cada geração grava um evento" |
| RF-22 rota só de pessoa (agente 403) | `gerar.test.ts` › "cada agente e o ator sistema → 403, também chamando a função direto, sem evento"; `pedido.test.ts` › "token de agente → 403 (matriz), para cada um dos quatro, sem evento"; "pessoa sem 2FA → 403; sem sessão nem token → 401; sem evento"; `test/matriz-rotas.test.ts` (rota nova entra sozinha) |
| C-16 só POST | `pedido.test.ts` › "C-16: o arquivo da rota não exporta GET (o Next responde 405); só POST" |
| C-28 dado pessoal → 422 com caminho e tipo, sem o valor | `gerar.test.ts` › os dois "C-28: …" e "C-28: CNPJ não é procurado no pedido (decisão da 04)"; `pedido.test.ts` › "C-28: dado pessoal na ESP → 422 …"; `gerar-bordas.test.ts` › "e-mail na descrição da opção escolhida → …"; "e-mail só na opção que não foi escolhida não bloqueia nem aparece no pedido"; "telefone no contexto da demanda e CPF na definição de pronto → …"; "dado pessoal é conferido antes do validarPedido …"; "texto técnico comum não é dado pessoal …"; `detectores.test.ts` (21 testes) |
| C-29 cabeçalhos do download e filename seguro | `pedido.test.ts` › "C-29: …"; "id fora do formato → 404 sem nenhuma consulta ao banco … (C-17 …)" |
| ADR-05 validarPedido da cópia | todos os testes acima que chamam `validarPedido` de `src/vendor/construir/pedido.mjs` |
| RNF-15 relógio fixo, sem ordem | os cinco arquivos usam `relogioFixo`; `aprovadoEm` em São Paulo: `gerar.test.ts` › "aprovadoEm é a data da aprovação em America/Sao_Paulo …" e `gerar-bordas.test.ts` › "as duas com B, a que completa às 23:59 de São Paulo …" |
| G3.8 transação de quem chama | `gerar.test.ts` › "G3.8: com a transação de quem chama, o evento sai junto no rollback" |

### Testes acrescentados (14, dois arquivos novos)

**`src/modules/pedido-construcao/gerar-bordas.test.ts` (9).** Postgres real, papel do app.

- **Concorrência (CA-22.2):** cinco `gerarPedido` ao mesmo tempo dão um JSON só e gravam 5 eventos.
- **Nome da conta muda depois da aprovação:** o arquivo sai igual. O `aprovadoPor` vem de `aprovacao.nome_aprovador`,
  e não do `user.name` atual.
- **Um ano depois:** o arquivo é o mesmo, e as listas da ESP mantêm a ordem gravada.
- **C-28 na opção escolhida:** e-mail na descrição da opção dá `decisao.opcaoEscolhida: e-mail`.
- **C-28 na opção não escolhida:** e-mail ali não bloqueia e não aparece no pedido.
- **C-28 na demanda e na definição de pronto:** telefone no contexto dá `demanda.descricao: telefone`; CPF no item 1
  dá `definicao_de_pronto[1]: CPF`.
- **Ordem das recusas:** o dado pessoal é conferido antes do `validarPedido`. Com os dois problemas, só volta o erro de
  dado pessoal.
- **Falso positivo:** texto técnico comum não bloqueia o pedido: versão, porta, CEP, valor em reais, data, hora, CNPJ
  sem pontuação, número de 10 e de 12 dígitos e `pnpm@12.6.0`.
- **Dupla aprovação com B:** a aprovação que completa sai às 23:59 de São Paulo (02:59 UTC do dia seguinte). Resultado:
  `opcaoEscolhida` "B: …", `aprovadoEm` com o dia de São Paulo, e a referência do documento da administradora fica fora
  do pedido.

**`src/app/api/pacotes-decisao/pedido-bordas.test.ts` (5).** Banco, Better Auth e relógio fixo reais.

- **CA-22.2 pela rota:** o mesmo arquivo hoje e 16 horas depois, quando já é o dia seguinte em São Paulo. O
  `Content-Disposition` também é o mesmo.
- **Corpo da requisição ignorado:** `pedido`, `ensaio`, `sistema_alvo` e `decisao` enviados no corpo do POST não mudam
  o arquivo.
- **422 do `validarPedido` pela rota:** corpo exato, sem `Content-Disposition` e sem evento.
- **409 de DEC devolvido pela rota:** sem download e sem evento.
- **Arquivo baixado:** passa no `validarPedido` e termina em `}\n`.

Os 14 passaram na primeira execução. Não encontrei defeito no código da T22.

### Resultado

- Arquivos novos isolados: 2 arquivos, 14 de 14.
- `pnpm test`: 106 arquivos, 1992 de 1992. Antes eram 1978 de 1978, em 104 arquivos; os 14 a mais são os desta etapa.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.

## Decisões tomadas

- **Testes em arquivos novos (`*-bordas.test.ts`), sem editar os do engenheiro.** Assim o `git diff` mostra que nenhum
  teste existente foi tocado.
- **Concorrência com 5 gerações, e não mais.** Prova o determinismo e um evento por geração sem pesar no pool do teste.
- **O falso positivo é testado pelo pedido inteiro, e não só pelo detector.** O risco real é bloquear um pedido
  legítimo: um 422 que ninguém consegue resolver.
- **A ordem dado pessoal → `validarPedido` fica fixada em teste.** É a ordem do plano. Na tela (T44), o erro de dado
  pessoal aparece primeiro.
- **No teste de rota, o log vai para um destino descartado.** O log da rota já é conferido em `pedido.test.ts` (C-21).

## Pendências

- **Para a `06-T22-decisao` (Minor, não bloqueia):** os detectores do plano não pegam alguns formatos. Telefone sem DDD
  (`90000-0000`), CPF com espaço no lugar de ponto e e-mail escrito por extenso ("contato arroba exemplo.test") passam
  pelo C-28. Não há teste que afirme esse comportamento, para não travá-lo. Se a 04 quiser ampliar, o ajuste fica com a
  T24, que usa os mesmos `DETECTORES`.
- **Para a T44:** o 422 do `validarPedido` e o 409 de DEC devolvido chegam pela rota no formato que a tela espera, já
  testado em `pedido-bordas.test.ts`: `erro`, `mensagem` e, no 422, `erros`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 7434f549ba9891dc6f66cc17e1b628af14ed19e7` — 11 arquivos da T22
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -6` — HEAD 4eece12 (06-T22-revisao)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 7434f549ba9891dc6f66cc17e1b628af14ed19e7 HEAD` — só `06-T22-tech-lead.md` e `passagens.jsonl`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/pedido-construcao/gerar-bordas.test.ts src/app/api/pacotes-decisao/pedido-bordas.test.ts` — 14 de 14
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 1992 de 1992, 106 arquivos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — só os 2 arquivos de teste novos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — vazio: nenhum arquivo rastreado foi alterado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -1` — HEAD 4eece12

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
