---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T46-testes
agente: qa-automacao
leu: [contrato-passagem.md, padrao-tecnico.md (seções 1 a 5), pedido.json, tarefas.json, 2026-10-25-ws-orquestrador-demandas-plano.md (T43 a T46 e rastreabilidade), 01-analista-requisitos.md (RF-19 a RF-26, RNF e matriz), 06-T43-tech-lead.md, 06-T45-qa-automacao.md, 06-T46-engenheiro-frontend.md, 06-T46-tech-lead.md, e2e/{seguranca.spec.ts,axe-todas.spec.ts,parecer-risco-qa.spec.ts,apoio.ts}, playwright.config.ts, next.config.ts, src/proxy.ts, src/lib/rota.ts, src/app/api/demandas/[id]/route.ts, src/app/api/auth/[...all]/route.ts, "src/app/(painel)/demandas/[id]/page.tsx", "src/app/(painel)/pareceres-risco/[rskId]/page.tsx", src/components/Alerta.tsx, resumo final da saída do pnpm test gravada pela ferramenta em ~/.claude/projects/.../tool-results/bpkvicbcf.txt]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Testei a T46 no intervalo `4959704..1b8fbc0`: o código e os testes estão no `34dd3b1`. As duas specs da T46 cumprem os
critérios da tarefa e passaram na suíte inteira. Nada volta para o engenheiro.

Nesta etapa também:
- tratei o teste instável `e2e/parecer-risco-qa.spec.ts:42`;
- escrevi 5 testes de borda de C-15, C-18 e C-19.

### Portões

- `pnpm test`: 189 de 189 arquivos e 3.674 de 3.674 testes. Os números são os mesmos da `06-T45-testes`: esta etapa
  não mexeu em teste unitário.
- `pnpm test:e2e`, a suíte inteira: código 0, com `retries: 0`.
  - São 126 testes em 21 arquivos (`--list`). Antes eram 117 em 20.
  - O teste instável virou 5 testes, o que dá +4.
  - A spec nova `seguranca-qa.spec.ts` tem 5 testes.
  - Com `retries: 0`, o código 0 quer dizer que nenhum teste falhou e que não houve 429.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.

### Critérios da T46 e os testes que os cobrem

(qa) marca o que foi escrito nesta etapa.

- **C-18 (e2e): texto com `<script>` e `<img onerror>` aparece literal e nada executa**
  - `e2e/seguranca.spec.ts` › "C-18: ESP com <script> e <img onerror> aparece como texto e nada executa".
  - (qa) `e2e/seguranca-qa.spec.ts` › "C-18: RSK com <script> e <img onerror> no resumo aparece como texto na T10 e no
    formulário da T08 que parte dele". O teste confere:
    - o texto literal na T10 do RSK;
    - o mesmo texto como valor do campo "Resumo" na T08 com `?base=`;
    - nenhum `img` nem `script` em `main`;
    - nenhum diálogo;
    - a API devolve o texto como foi gravado.
- **C-19 (página e API): CSP com nonce, nosniff, no-referrer, no-store e sem X-Powered-By**
  - `e2e/seguranca.spec.ts` › "C-19: /demandas/[id] e GET /api/demandas/:id com CSP de nonce, …".
  - `e2e/seguranca.spec.ts` › "C-19: o nonce é novo a cada resposta e é o mesmo de todo <script> da página".
  - (qa) `e2e/seguranca-qa.spec.ts` › "C-19: a resposta de erro da API também traz no-store, nosniff, no-referrer e DENY,
    sem X-Powered-By nem detalhe". Cobre o 401 sem sessão e o 404 de id fora do formato. O corpo não traz pilha,
    `node_modules` nem SQL.
  - (qa) `e2e/seguranca-qa.spec.ts` › "C-19: a página pública /entrar e a página 404 do painel têm CSP de nonce, nosniff,
    no-referrer, DENY e nenhum X-Powered-By".
- **C-15: sem CORS no `OPTIONS`**
  - `e2e/seguranca.spec.ts` › "C-15: OPTIONS não devolve Access-Control-Allow-Origin; POST com sessão e de outra origem
    recebe 403".
  - (qa) `e2e/seguranca-qa.spec.ts` › "C-15: GET de outra origem responde sem CORS; OPTIONS na rota com id e na do login
    também". Confere `/api/demandas/:id` e `/api/auth/sign-in/email`, sem `Allow-Origin`, `Allow-Credentials` nem
    `Allow-Methods`.
  - (qa) `e2e/seguranca-qa.spec.ts` › "C-15: com sessão, POST sem Origin dá 403, Origin certa com text/plain dá 415 e PATCH
    de outra origem dá 403; nada muda". Confere pela API que a demanda e o total de demandas continuam iguais.
- **CA-26.4, RNF-11 e critério preliminar 14: axe sem violação em cada tela da RF-26**
  - `e2e/axe-todas.spec.ts`: um teste por tela, de "T01 Entrar: …" a "T12 Agentes e teto: …". São 12 testes e 40
    verificações, com as regras de `TAGS_AXE`.
  - Os estados que só existem depois de gravar continuam nas specs de cada tela, da T37 à T45.

### Teste instável tratado: `e2e/parecer-risco-qa.spec.ts:42`

**O problema.**
- O teste fazia 16 navegações do `next dev` e criava 2 demandas e 7 versões, tudo num teste só.
- Sozinho, num servidor recém-aberto, levou 26,0 s dos 30 s.
- Na execução inteira de 31/10, levou 36,3 s e parou no `page.goto` do laço da T05.
- A margem era pequena demais para a variação de tempo do servidor de desenvolvimento.

**A correção: dividir em testes menores, sem `test.setTimeout`.**
- O teste virou o describe "?base= forjado na T08 e chegada da T08 na T05 com a URL forjada", com 5 testes de 2 a 4
  navegações cada:
  1. "?base= de outra demanda, de versão que não existe ou de ESP: …" (3 bases);
  2. "?base= de DEC, fora do formato ou repetido: …" (3 bases e as duas bases na mesma URL);
  3. "a chegada na T05 não confia na URL: versão de outra demanda ou que não existe" (3 buscas);
  4. "a chegada na T05 não confia na URL: aviso fora da lista, versão de ESP com o aviso do RSK (e o contrário),
     marcação" (4 buscas);
  5. "a chegada na T05 com o DEC de outra demanda ou com o DEC desta em dia: só a frase da versão; axe".
- **Nada ficou mais fraco.** Cada valor dos laços antigos está num dos cinco testes, com as mesmas conferências.
  - As da T08 foram para a função `t08ParteDoRskMaisNovo` do describe, com o mesmo texto.
  - As da T05 foram para a função `semChegada`.
  - O `git diff -U0` mostra que as linhas tiradas são só a troca de `x.id` por `x` e de `chegada()` por
    `chegada(page)`.
- **Os dados são criados uma vez só, no `beforeAll`**, numa página própria com a sessão da "cto": as mesmas 2 demandas
  e 7 versões de antes.
  - Não dava para criar por teste, porque a "cto" está em 30 de 30 demandas na suíte inteira (C-36).
- **O describe roda em modo `serial`.** Se um teste falhar, o Playwright pula os seguintes, em vez de reiniciar o
  processo e rodar o `beforeAll` de novo. Rodar de novo criaria mais 2 demandas e daria 429 nas specs seguintes.
- **Os cinco só leem** (`GET` e telas): nenhum muda o que outro confere. Cada um passa sozinho com o `beforeAll`. Conferi
  dois com `--grep`:
  - 7,7 s, num servidor recém-aberto;
  - 6,1 s, num servidor recém-aberto.

**Medições.**
- Rodando o arquivo junto com a spec nova, logo depois de o servidor abrir, os cinco levaram de 3,8 s a 24,1 s. O de
  24,1 s era o primeiro da execução, com o `beforeAll` e a primeira compilação das rotas.
- Na suíte inteira, o código 0 com `retries: 0` mostra que os cinco passaram dentro dos 30 s.

### C-36: uso da suíte e2e por conta

- A divisão não muda o uso da `parecer-risco-qa.spec.ts`: "cto" com 4 demandas e 9 versões, "administradora" com 0 e 0.
  O comentário do topo do arquivo traz essa conta.
- `seguranca-qa.spec.ts` não cria demanda. Usa a demanda de Estudo do seed, achada por `GET /api/demandas`.
  - Grava só 1 RSK na conta "cto", no caso C-18.
  - Os envios de C-15 levam corpo vazio ou com chave desconhecida. Se o controle falhasse, a validação recusaria com 400,
    e o teste falharia pelo status esperado (403 ou 415).

| Conta | Demandas | Versões |
|---|---|---|
| "cto" | 30 de 30 | 37 de 60 (36 até a T46 e mais 1 desta etapa) |
| "administradora" | 30 de 30 | 35 de 60 |

- Nenhum controle foi tocado. Nada mudou em `limites.ts`, no seed, no `playwright.config.ts`, em variável de ambiente
  nem no relógio. Nenhuma demanda foi apagada, e a suíte não espera a janela de uma hora.
- O DEC de rascunho do seed chega pendente à `decisao.spec.ts`, como pede a `06-T46-revisao`.
  - O teste T11 da `axe-todas.spec.ts` confere `statusDecisao` `pendente` pela API depois de fechar o diálogo.
  - Os testes da `decisao.spec.ts` que usam esse DEC passaram na mesma execução.

### Arquivos

- Alterado: `e2e/parecer-risco-qa.spec.ts`, com +90 e -36 linhas: a divisão do teste e o comentário do topo.
- Criado: `e2e/seguranca-qa.spec.ts`.
- Nenhum teste foi apagado, nem marcado com `.skip`, `.only` ou `.todo`, e nenhuma asserção ficou mais fraca. O teste
  instável foi trocado por cinco testes que fazem as mesmas conferências.

## Decisões tomadas

- **Dividir, e não aumentar o tempo limite.** Testes menores ficam bem abaixo dos 30 s e mostram qual caso falhou. Um
  `test.setTimeout` só aumentaria a margem do mesmo teste longo.
- **Dados no `beforeAll` e describe em modo `serial`.** É o único jeito de dividir o teste sem criar demanda, porque a
  "cto" está em 30 de 30. O modo serial evita que uma falha rode o `beforeAll` de novo e estoure o C-36.
- **Bordas de segurança numa spec própria, `seguranca-qa.spec.ts`, como as outras `-qa`.** Assim a spec da T46 fica
  como o engenheiro a entregou.
- **Na spec nova, o modo vem de `BASE_URL`, e não da CSP.** Na homologação, ela exige `no-store` na página e CSP sem
  `'unsafe-eval'`, como o Minor 1 da `06-T46-revisao` propõe para tarefas futuras. A `seguranca.spec.ts` não foi
  alterada.
- **Sem teste de Server Action de outra origem.** Daria para refazer o envio de uma Server Action real com outra
  `Origin`. Só que, sem um controle positivo que grava, uma recusa não provaria nada. Fica como sugestão nas
  Pendências.

## Pendências

- **Para o maestro: saídas que a ferramenta gravou.**
  - O `pnpm test:e2e` inteiro foi para segundo plano depois de 180 s, e a saída ficou num arquivo em `/tmp`, que não li.
    O resultado (código 0) veio do aviso de fim da tarefa, e a contagem veio do `--list`. Por isso não tenho o tempo de
    cada teste dividido nessa execução.
  - O `pnpm test` passou do limite de exibição, e a ferramenta gravou a saída em
    `~/.claude/projects/.../tool-results/bpkvicbcf.txt`. Li só o resumo final desse arquivo, que a minha própria
    execução gerou nesta etapa.
- **Para o tech-lead (sugestão, não bloqueia):** C-15 nas Server Actions. O `allowedOrigins` do `next.config.ts` ainda
  não tem e2e que refaça uma Server Action com `Origin` de fora. Se valer a pena, o teste precisa de uma ação idempotente
  que sirva de controle positivo, por exemplo salvar o teto com o mesmo valor.
- **Maestro e `devops-sre` (`construir.mjs homologar`):** continua a condição da `06-T46-revisao` sobre o `no-store` da
  página no build de produção. A `seguranca-qa.spec.ts` também a exige, com `BASE_URL`, na `/entrar` e na página 404.
- **Os Minor 1 a 4 da `06-T46-revisao`** continuam como estão. Esta etapa não altera a `seguranca.spec.ts`, a
  `axe-todas.spec.ts` nem o `e2e/apoio.ts`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/parecer-risco-qa.spec.ts` — 3 de 3, antes da correção; o teste da linha 42 levou 26,0 s
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/parecer-risco-qa.spec.ts e2e/seguranca-qa.spec.ts` — 10 de 10
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/parecer-risco-qa.spec.ts --grep "a chegada na T05 com o DEC"` — 1 de 1, sozinho, 6,1 s
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/parecer-risco-qa.spec.ts --grep "a T08 parte do RSK mais novo"` — 1 de 1, sozinho, 7,7 s (antes de dividir este teste em dois)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 189 de 189 arquivos, 3.674 de 3.674 testes
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — código 0, a suíte inteira, com `retries: 0` (foi para segundo plano depois de 180 s)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — `e2e/parecer-risco-qa.spec.ts` alterado e `e2e/seguranca-qa.spec.ts` novo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 1 arquivo, 90 inserções e 36 remoções
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -U0 e2e/parecer-risco-qa.spec.ts` — as linhas tiradas voltam nos cinco testes, com as mesmas conferências
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --list` — 126 testes em 21 arquivos

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
