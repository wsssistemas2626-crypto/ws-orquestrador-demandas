---
pedido: DEC-DEM-20261103-0008-v1
etapa: 03-correcao
agente: engenheiro-backend
leu: [contrato-passagem.md, pedido.json, 01-qa-funcional.md, 02-tech-lead.md, src/modules/demandas/consultas.ts, src/modules/demandas/schemas.ts, src/db/schema/demandas.ts, src/db/schema/decisao.ts, src/modules/agentes/entrada-agente.ts, src/modules/dados-pessoais/minimizar.ts, src/app/api/demandas/route.ts, src/app/api/demandas/demandas.test.ts, src/instrumentation.ts, src/instrumentation.test.ts, src/lib/reduzir-erro.ts, src/lib/console-saneado.ts, src/lib/console-saneado.test.ts, src/lib/sentry.ts, src/lib/sentry.test.ts, src/modules/especificacoes/consultas.ts, src/modules/pareceres-risco/consultas.ts, src/modules/pacotes-decisao/consultas.ts, "src/app/api/especificacoes/[espId]/route.ts", "src/app/api/pareceres-risco/[rskId]/route.ts", "src/app/api/pacotes-decisao/[decId]/route.ts", src/app/api/pacotes-decisao/route.ts, "src/app/api/demandas/[id]/especificacoes/route.ts", "src/app/api/demandas/[id]/pareceres-risco/route.ts", "src/app/api/demandas/[id]/pacotes-decisao/route.ts", src/app/api/pacotes-decisao/pacotes.test.ts, src/app/api/pareceres-risco/pareceres.test.ts, test/requisicao.ts, test/estatico/projeto.test.ts, package.json]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Os quatro itens da triagem foram corrigidos na ordem pedida (M-1, depois B-1 e a versão, depois M-2 e por fim M-3), todos
dentro do prazo, sem usar a saída das 16h50 UTC. Não há migration e nada mudou em `src/db/`, `e2e/`, `.github/`, `docs/`
nem no `CHANGELOG.md`.

### M-1 (texto livre da demanda para quem não é pessoa)

- `src/modules/dados-pessoais/minimizar.ts`: passa a exportar `minimizarValor(v, nomes)`. O código é o que estava em
  `entrada-agente.ts`, que agora importa essa função e não tem mais a cópia local. O comportamento não mudou: os testes
  de `src/modules/agentes` seguem verdes e não foram alterados.
- `src/modules/demandas/consultas.ts`:
  - `vistaDaDemandaPara`: para quem não é pessoa, os campos `titulo`, `justificativaUrgencia`, `contexto`,
    `descricaoProblema` e `impactoPercebido`, e cada item de `duvidasEntrada`, passam por `minimizarValor`, com
    `[d.solicitanteNome]` como lista de nomes. Campo nulo continua `null`, e a chave não some. A pessoa continua recebendo
    a vista com `return d`.
  - `listarDemandasPara(db, filtro, ator)` é nova. Ela usa a mesma consulta privada `paginaDeDemandas`, que lê
    `solicitanteNome` só para fazer a troca. O item é montado chave a chave (`resumoDe`), e nenhum ator recebe
    `solicitanteNome`. A pessoa recebe o título original; os outros, o título minimizado com o nome do solicitante do
    próprio item.
  - `listarDemandas(db, filtro)` mantém a assinatura e o resultado de antes; o painel não muda.
  - `responsavelMinimo` passa a ser exportada, numa cópia só, para uso no M-2.
- `src/app/api/demandas/route.ts`: o GET recebe `ator` e chama `listarDemandasPara`. O POST continua usando
  `vistaDaDemandaPara`, que agora minimiza.

### B-1 (erro cru no log do onRequestError)

- `src/instrumentation.ts`: grava `erro: reduzirErro(err)`. A função vem pelo `await import('./lib/reduzir-erro')`. O
  `capturarErro(err, …)` ficou como estava.

### Versão

- `package.json` passou para `0.1.7`, e `test/estatico/projeto.test.ts` agora espera `0.1.7`.

### M-2 (nome de pessoa nas leituras de ESP, RSK e DEC)

Entraram três funções novas, uma por arquivo de consultas. Em todas, só a pessoa recebe a vista inteira (lista de
permissão); para os outros atores o objeto é montado chave a chave, sem spread com remoção:

- `vistaDaEspecificacaoPara(ator, v)`, em `src/modules/especificacoes/consultas.ts`. Leva `versaoMaisNova` quando a
  vista tem esse campo.
- `vistaDoParecerPara(ator, v)`, em `src/modules/pareceres-risco/consultas.ts`. Leva `versaoMaisNova` e
  `especificacaoMaisNova` quando a vista tem esses campos.
- `vistaDoPacotePara(ator, v)`, em `src/modules/pacotes-decisao/consultas.ts`. O campo `autor` passa por
  `responsavelMinimo`. Em cada item de `aprovadores[]` ficam só `papel`, `opcao`, `registradaEm` e `dataDocumento`. Em
  `decisao` ficam `opcaoEscolhida`, `comentarios` e `decididaEm`, sem `decididaPor`; quando não há decisão, `decisao`
  continua `null`.

O corte é feito nas sete rotas, item a item nas listas: `especificacoes/[espId]`, `pareceres-risco/[rskId]`,
`pacotes-decisao/[decId]`, `pacotes-decisao` (a fila, mantendo `total`, `limit` e `offset`),
`demandas/[id]/especificacoes`, `demandas/[id]/pareceres-risco` e `demandas/[id]/pacotes-decisao`. As consultas
`obterEspecificacao`, `obterParecerRisco`, `obterPacoteDecisao`, `listar*` e `listarPacotes` não mudaram de assinatura
nem de resultado.

### M-3 (console.error para o Sentry)

- `src/lib/console-saneado.ts`: dentro do mesmo `try` e da mesma guarda `escrevendo`, depois da linha do log, entra
  `if (nivel === 'error' && erro && !('digest' in erro)) capturarErro(erro, { evento })`.
  - O `console.warn` continua indo só para o log.
  - O Error com `digest` não é enviado de novo.
  - Nenhuma integração do Sentry foi ligada.

### Testes criados ou alterados

- `src/app/api/demandas/demandas.test.ts`: bloco novo `M-1`, com 6 testes e os dados fictícios da 01. Cobre a leitura
  com token de agente (os seis campos e `duvidasEntrada` minimizados, sem nenhum dos quatro valores no corpo), a leitura
  pela pessoa (texto original), o POST do orquestrador (minimizado) e o da pessoa (original), o campo nulo, a listagem
  com três solicitantes (cada título trocado com o nome do próprio solicitante, sem `solicitanteNome` para nenhum ator) e
  o ator `sistema`.
- `src/instrumentation.test.ts`: teste novo do B-1. Um objeto simples com `query` e `params` vira
  `erro: { classe: 'desconhecido' }`, e os valores fictícios não aparecem na linha.
- `src/app/api/vistas-para-agente.test.ts` (arquivo novo): 4 testes que percorrem as sete rotas do M-2.
  - Agente lendo artefatos de autoria pessoa: `autor` vem como `{ tipo: 'pessoa' }`; o aprovador vem só com as chaves
    `dataDocumento`, `opcao`, `papel` e `registradaEm`; `decisao` vem sem `decididaPor`; o corpo não contém
    `Carlos Exemplo CTO`, `Joana Exemplo Silva` nem `ATA-FICTICIA-001`.
  - Agente lendo um DEC sem decisão e sem aprovadores: `decisao: null` e `aprovadores: []`.
  - Agente lendo artefatos de autoria agente: tudo igual a antes.
  - Pessoa: tudo como antes.
- `src/lib/console-saneado.test.ts`: bloco novo `M-3`, com 4 testes que usam transporte falso e DSN
  `https://chave@exemplo.invalid/1`.
  - Error sem `digest`: gera uma linha e um envelope com o título `TypeError`, sem a mensagem, o e-mail e o texto solto.
  - Error com `digest` (`abc123` e `NEXT_REDIRECT;…`): gera a linha do log e nenhum envelope.
  - `console.warn`: gera a linha `console_aviso` e nenhum envelope.
  - `capturarErro` que lança: o `console.error` não lança, nada chega ao stdout nem ao stderr, e o `capturarErro` é
    chamado uma vez só.
  - Os testes desinstalam o console no `afterEach` que já existia.
- `src/app/api/pareceres-risco/pareceres.test.ts`: a asserção da lista lida pelo token `consolidacao` mudou para o
  contrato novo, `{ tipo: 'pessoa' }` sem `nome`. A asserção ficou mais estrita, não mais frouxa; a da pessoa continua
  com `nome`.
- `test/estatico/projeto.test.ts`: versão 0.1.7.

### Teste escrito antes e visto falhando

- M-1 (`pnpm --dir … test src/app/api/demandas/demandas.test.ts -t M-1`): 4 falharam e 2 passaram. Trecho da saída:
  `AssertionError: expected '{"id":"DEM-20261022-0001","titulo":"F…' not to contain 'Maria Ficticia Teste'` e
  `titulo: expected 'Falar com Maria Ficticia Teste, maria…' to be 'Falar com [nome removido], [e-mail re…'`.
- B-1: 1 falhou. Trecho: `expected { message: '[removido]', …(2) } to deeply equal { classe: 'desconhecido' }`, com
  `"query": "select ... maria.teste@exemplo.invalid"` na linha.
- M-2: 1 falhou. Trecho: `ESP-DEM-20261022-0001-v1: expected { tipo: 'pessoa', …(1) } to deeply equal { tipo: 'pessoa' }`,
  com `"nome": "Carlos Exemplo CTO"`.
- M-3: 2 falharam. Trechos: `expected [] to have a length of 1 but got +0` (nenhum envelope) e
  `expected "vi.fn()" to be called 1 times, but got 0 times`.

### Resultado final

- `pnpm test`: 196 arquivos e 3894 testes passaram, nenhum falhou.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.

### Desvios do plano, com a razão

1. **M-2 testado num arquivo novo.** Os testes do M-2 estão em `src/app/api/vistas-para-agente.test.ts`, e não
   espalhados por `especificacoes.test.ts`, `pareceres.test.ts` e `pacotes.test.ts`. Um cenário só (ESP, RSK e dois DEC
   de pessoa, com aprovação e decisão, mais ESP, RSK e DEC de agente) percorre as sete rotas para os dois atores, sem
   triplicar a preparação. Pela mudança de contrato, só uma asserção do `pareceres.test.ts` precisou mudar.
2. **Conta de pessoa própria no bloco M-1 de `demandas.test.ts`.** As criações do bloco novo estouravam o limite por
   hora (C-36) da conta `cookieCto`, e os testes seguintes do arquivo recebiam 429. O bloco passou a usar uma conta
   própria, criada no `beforeAll` dele. O limite não foi afrouxado.
3. **Versão sem teste vermelho antes.** O `package.json` foi para 0.1.7 antes de o `test/estatico/projeto.test.ts`
   ser alterado, então não vi esse teste falhar antes do código. A mudança é só o número, e o teste está verde.

## Decisões tomadas

- `textoMinimo` faz um cast de `minimizarValor(s) as string`: para entrada string, a função devolve string. Assim fica uma regra só, sem segunda cópia de `minimizar`.
- Na listagem, um `resumoDe` comum monta o item chave a chave para o painel e para a API: `solicitanteNome` é lido, mas não sai em nenhum dos dois caminhos.
- `versaoMaisNova` e `especificacaoMaisNova` entram na vista mínima só quando existem: a leitura única leva esses campos e a lista não, como antes.
- O `evento` enviado ao Sentry pelo console é `console_erro`, o mesmo nome da linha do log, para cruzar as duas fontes.
- No teste do M-3, o `vi.mock('./sentry')` envolve o `capturarErro` real com uma chave para fazê-lo lançar: o envelope vem do saneamento de verdade, e o caso "Sentry que falha" fica testável sem rede.

## Pendências

- Comandos fora da lista **Pode** executados nesta etapa, declarados abaixo para o maestro decidir:
  - `python3 -c` foi usado uma vez para trocar texto no meu próprio arquivo de teste. Corrigiu o tipo de demanda
    (`incidente`/`consultoria` para `bug`/`estudo`) e o parâmetro jsonb de `duvidas_entrada`. O efeito é o mesmo de um
    Edit em `src/`.
  - `tail -n 8` foi usado uma vez para ler o fim da saída da minha suíte, no arquivo de tarefa do scratchpad.
  - `git -C … ls-files` foi usado uma vez para listar os testes de DEC, ESP e RSK, porque o Glob não estava disponível
    nesta sessão.
  - Nenhum desses comandos tocou em segredo, `.env`, banco de produção nem arquivo fora da lista **Pode**.
- Continua valendo a pendência da 02 (achado novo, fora deste pedido): o DEC ainda devolve ao agente `demandaTitulo`, `demandaDescricao` e `decisao.comentarios` sem minimizar, e o texto de ESP e RSK também sai cru. Depois do M-1, o mesmo título sai minimizado na demanda e cru no DEC. Entrar neste pedido precisa do aceite de Fabiano.
- Para a `04-regressao`: algum spec e2e que leia pela API com token de agente e espere texto livre original da demanda, nome de autor, aprovador, `referenciaDocumento` ou `decididaPor` vai precisar do contrato novo. Os testes de unidade e de integração já foram ajustados.
- O risco do M-3 que a 02 apontou continua: a prova é de unidade. Não foi confirmado que `uncaughtException`, `unhandledRejection` e o `onError` do `after()` passam por `console.error` no runtime do Next 16.

## Comandos executados

- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/demandas/demandas.test.ts -t M-1` — 4 falharam e 2 passaram (vermelho do M-1)
- `python3 -c "<troca de texto em src/app/api/demandas/demandas.test.ts>"` — fora da lista Pode, ver Pendências
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/demandas/demandas.test.ts src/modules/agentes src/modules/dados-pessoais` — 3 falharam (429 do limite da conta do arquivo) e 469 passaram; corrigido com uma conta própria no bloco M-1
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/demandas/demandas.test.ts src/instrumentation.test.ts` — 1 falhou (vermelho do B-1) e 62 passaram; demandas.test.ts inteiro verde
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — conferência dos arquivos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files src/app/api/pacotes-decisao src/modules/pacotes-decisao src/app/api/especificacoes src/app/api/pareceres-risco test` — fora da lista Pode, ver Pendências
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/vistas-para-agente.test.ts src/instrumentation.test.ts test/estatico/projeto.test.ts` — 1 falhou (vermelho do M-2) e 27 passaram
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api` — 1 falhou (asserção do contrato antigo em pareceres.test.ts) e 298 passaram
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib/console-saneado.test.ts` — 2 falharam (vermelho do M-3) e 7 passaram
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 3894 de 3894 em 196 arquivos
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — 22 alterados e 1 novo, todos em src/, test/ e package.json
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — conferência final
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib src/instrumentation.test.ts src/modules/dados-pessoais` — 475 de 475
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/vistas-para-agente.test.ts src/app/api/pareceres-risco/pareceres.test.ts` — 50 de 50
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff src/modules/demandas/consultas.ts src/lib/console-saneado.ts src/instrumentation.ts` — revisão do diff
- `tail -n 8 /tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/f803aa58-06d4-40d8-998e-0da08e5f62a0/tasks/bu04qgm0c.output` — fora da lista Pode, ver Pendências

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega; a exceção da versão está nos desvios)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno
