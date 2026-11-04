---
pedido: DEC-DEM-20261104-0010-v1
etapa: 03-correcao
agente: engenheiro-backend
leu: [contrato-passagem.md, padrao-tecnico.md, pedido.json, 01-qa-funcional.md, 02-tech-lead.md, DEC-DEM-20261103-0009-v1/03-engenheiro-backend.md, src/lib/reduzir-erro.ts, src/lib/reduzir-erro.test.ts, src/lib/log.ts, src/lib/log.test.ts, src/lib/sentry.ts, src/lib/sentry.test.ts, src/lib/sentry-desligado.test.ts, src/lib/console-saneado.ts, src/lib/console-saneado.test.ts, src/lib/rota.ts, src/instrumentation.ts, src/instrumentation.test.ts, src/components/rotulos.ts, src/components/rotulos.test.ts, src/components/rotulos-qa.test.ts, "src/app/api/demandas/[id]/especificacoes/route.ts", "src/app/api/demandas/[id]/pareceres-risco/route.ts", "src/app/api/demandas/[id]/pacotes-decisao/route.ts", src/app/api/vistas-para-agente.test.ts, src/app/api/pacotes-decisao/pacotes.test.ts, src/app/api/saude/route.ts, src/modules/demandas/consultas.ts, src/modules/especificacoes/servico.ts, src/modules/pareceres-risco/servico.ts, src/modules/pacotes-decisao/criar.ts, src/modules/limites.ts, src/modules/avisos/enviador.ts, src/modules/avisos/aviso-dec.ts, src/modules/agentes/provedor.ts, src/modules/agentes/execucoes.ts, src/modules/acesso/exigir-pessoa.ts, src/lib/env.ts, src/lib/erros.ts, src/db/schema/historico.ts, test/estatico/sql-raw.test.ts, test/estatico/exigir-pessoa.test.ts, test/estatico/projeto.test.ts, vitest.config.ts, tsconfig.json, package.json, node_modules/next/package.json, node_modules/next/dist/server/app-render/create-error-handler.js, node_modules/next/dist/build/templates/app-route.js, node_modules/next/dist/server/route-modules/route-module.js]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

As cinco correções da 02 (D1 a D5), mais a versão 0.1.9. Sem migration. Todos os dados de teste são fictícios.

### Arquivos alterados

| Arquivo | O que mudou |
|---|---|
| `src/lib/reduzir-erro.ts` | D1. `lerCode` recusa o `code` que tenha 10 ou mais dígitos seguidos (`/\d{10}/`), em qualquer posição, inclusive na `cause`. Entram `classeAceita(nome)` e `CLASSES_DO_PROJETO` (exportadas). Uma classe é aceita quando é `desconhecido`, quando é um identificador de até 64 caracteres terminado em `Error` ou `Exception`, ou quando está na lista (`ErroEnvioEmail`, `ErroDominio`, `ErroProvedor`, `ErroConfiguracao`, `ErroLeituraSessao`, `AvisoNaoEnviado`, `ExecucaoPerdida`, `TempoEsgotado`, todas conferidas no fonte). `erroJaReduzido` e `reduzirErro` usam `classeAceita`; fora dela, o resultado é `null` ou `'Error'`. Comentário atualizado. |
| `src/components/rotulos.ts` | D5. `MOTIVO_IGNORADO.demanda_final = 'demanda já entregue ou encerrada'`. |
| `src/app/api/demandas/[id]/especificacoes/route.ts`, `.../pareceres-risco/route.ts`, `.../pacotes-decisao/route.ts` | D2. No POST, `nomesDaDemanda` é chamado antes do serviço de criação, e o 201 usa os nomes lidos antes. Os GET e os serviços não mudaram. |
| `src/lib/sentry.ts` | D3. Um `WeakSet<object>` privado em `capturarErro`: o objeto que já foi enviado não vai de novo; o que não é objeto vai toda vez. A interface do módulo é a mesma, então o mock do `instrumentation.test.ts` continua valendo. |
| `src/lib/console-saneado.ts` | D3. Só o comentário, com o que conferi no fonte do Next (arquivo e linha, ver Decisões). A guarda de `digest` não mudou. |
| `package.json` | Versão 0.1.9. |

### Testes criados ou alterados

- `src/lib/reduzir-erro.test.ts`: 2 blocos novos. Um para o `code` (6 recusados, entre eles 10 e 11 dígitos, `1234567890A` e `E1234567890`, no erro e na `cause`; 10 aceitos, entre eles `23505`, `57P01`, `2200H`, `ECONNREFUSED`, `recusado`, `transitorio` e `123456789`; erro já reduzido com 11 dígitos). Outro para a classe (9 aceitas, as 8 da lista, `desconhecido`; 10 recusadas, entre elas `Joana`, `ErrorJoana`, `Errorzinho`, `ErroJoana`, `ErroJoanaSilva`, `Exceptional` e `TypeError2`; identificador acima de 64 caracteres).
- `src/lib/log.test.ts`: 1 teste novo. `{ classe: 'Joana', code: '00000000191' }` sai `{ classe: 'desconhecido' }`, e a linha não traz `Joana` nem os 11 dígitos.
- `test/estatico/classes-de-erro.test.ts` (novo): pela AST do TypeScript, junta toda string literal posta em `name` nos arquivos de `src/` que não são teste (`this.name = '...'`, campo `name` da classe e `Object.defineProperty(X.prototype, 'name', { value })`, que é o caso do `ErroLeituraSessao`) e confere que cada uma passa em `classeAceita`. Tem prova da leitura com fonte de exemplo e confere que as classes conhecidas foram achadas.
- `src/components/rotulos.test.ts`: 1 teste novo. `demanda_final` gera "Agente de consolidação não rodou: demanda já entregue ou encerrada" (e o mesmo para risco); motivo desconhecido continua só "não rodou". O teste "três motivos" de `rotulos-qa.test.ts` não mudou.
- `test/estatico/pacote-sem-extras.test.ts` (novo): D4, pela AST. `chamadasComExtras(fonte, arquivo)` acusa chamada de `criarPacoteDecisao` com mais de 4 argumentos, com argumento espalhado ou por referência que não é a chamada direta (`const f = criarPacoteDecisao`, `.call`). Segue import renomeado e import por namespace (`m.criarPacoteDecisao`, `m['...']`). Os exemplos em texto mostram que ele acusa e que não acusa 4 argumentos com objeto, chamada aninhada e quebra de linha. A varredura de `src/app/` sem os testes acha os dois chamadores de hoje e nenhuma chamada acusada.
- `src/lib/sentry.test.ts`: 3 testes novos do D3 (o mesmo objeto duas vezes dá 1 envio e continua marcado; dois objetos com a mesma mensagem dão 2; string e número vão toda vez) e 1 do D1 (subclasse com `name` fora da regra sai `Error`, com os quadros). 1 teste existente ajustado (desvio 1).
- `src/lib/console-saneado.test.ts`: 1 teste novo do D3, com o console saneado e o Sentry real em transporte de teste. `capturarErro(e)` e depois `console.error(e)` dá 1 envelope, a ordem inversa também dá 1, e cada `console.error` deixa a sua linha de log. Dois erros distintos com a mesma mensagem dão 2 envelopes.
- `src/app/api/demandas/nomes-antes-de-gravar.test.ts` (novo): D2, integração com Testcontainers. `vi.mock` de `modules/demandas/consultas` com o original e uma chave que faz `nomesDaDemanda` rejeitar uma vez. O teste cobre os 3 POST, pela pessoa e pelo token do agente. Com a falha: 500 `erro_interno`, e linhas do artefato, eventos `*_criado`, status e `aviso_email` iguais aos de antes. A nova tentativa cria a próxima versão (v1 no DEC, v2 na ESP e no RSK, porque a demanda pronta já tem a v1 do agente), com evento, e no DEC com o aviso e o status `pronta_para_decisao`. Sem a falha, os códigos continuam: 404 nos 3 (demanda inexistente), 409 nos 3 (encerrada, sem gravar e sem aviso), 429 nos 3 (60 artefatos do ator na hora, sem gravar), 400 com `faltando` no DEC. Por fim, uma leitura de nomes por POST, com o id da demanda do caminho.
- `test/estatico/projeto.test.ts`: a asserção de versão passa a esperar 0.1.9.

### Fase vermelha (antes do código)

`pnpm test` com os 8 arquivos novos ou alterados, pelo reporter de apoio: **111 passaram, 40 falharam**. Trecho do resumo:

```
src/lib/reduzir-erro.test.ts > ... > code 00000000191 não sai, nem no erro nem na cause :: expected { Object (classe, code) } to deeply equal { classe: 'Error' }
src/lib/reduzir-erro.test.ts > ... > Joana vira Error em reduzirErro e não é reconhecida no erro já reduzido :: classeAceita is not a function
src/lib/log.test.ts > ... > B-1 do 0009: classe Joana e code de 11 dígitos não saem no log :: expected [ { classe: 'Joana', …(1) }, …(2) ] to deeply equal [ { classe: 'desconhecido' }, …(2) ]
test/estatico/classes-de-erro.test.ts > ... > nenhum nome atribuído fica fora da regra :: classeAceita is not a function
src/components/rotulos.test.ts > ... > agente que não rodou porque a demanda já é final :: expected 'Agente de consolidação não rodou' to be 'Agente de consolidação não rodou: dem…'
src/lib/sentry.test.ts > B-a do 0008: um envio por objeto de erro > o mesmo objeto passado duas vezes gera um envio :: expected 2 to be 1
src/lib/console-saneado.test.ts > ... > B-a: capturarErro(e) e console.error(e) ... :: expected [ …(2) ] to have a length of 1 but got 2
src/app/api/demandas/nomes-antes-de-gravar.test.ts > ... > POST de ESP pelo ator pessoa: 500, nada gravado; a nova tentativa cria a v1 :: expected { linhas: 2, eventos: 2, …(2) } to deeply equal { linhas: 1, eventos: 1, …(2) }
src/app/api/demandas/nomes-antes-de-gravar.test.ts > ... > POST de DEC pelo ator pessoa: 500, nada gravado; a nova tentativa cria a v1 :: expected { linhas: 1, eventos: 1, …(2) } to deeply equal { linhas: +0, eventos: +0, …(2) }
```

Os 6 casos de falha do D2 (3 POST × 2 atores) ficaram vermelhos antes da mudança, com a versão gravada e o 500. Os de 404, 409, 429 e 400 já passavam, como esperado, porque conferem que nada mudou. O D4 é só teste e não tem código de produção a mudar: quem prova que o teste acusa são os exemplos em texto, que é o que a 02 prevê.

### Resultado

- `pnpm test` (suíte inteira): **3991 de 3991, 0 falhas**.
- `pnpm lint` e `pnpm typecheck`: limpos.

### Desvios do plano

1. **Teste existente ajustado em `src/lib/sentry.test.ts`.** O teste "subclasse que troca o name no construtor mantém os quadros e não vaza a mensagem" usava a classe local `ErroDeConsulta` e esperava esse nome no envelope. Pela regra da spec (só `desconhecido`, o sufixo `Error`/`Exception` ou a lista do projeto), esse nome vira `Error`, e o teste ficou vermelho. A 02 não o listou. Troquei só o nome da classe de exemplo para `ConsultaError`, o que mantém o que o teste confere (quadros presentes, mensagem fora, classe no título). Acrescentei um teste com `ErroDeConsulta` que confere a regra nova (sai `Error`, sem o nome). Não pus `ErroDeConsulta` em `CLASSES_DO_PROJETO`, porque não é classe do projeto. Nenhum controle ficou mais fraco.
2. **D4 mais amplo que a 02.** Além do 5º/6º argumento e do espalhamento, o teste também acusa o uso de `criarPacoteDecisao` fora da chamada direta (variável, `.call`, `.apply`, `bind`) e por namespace, porque esses usos escapariam da contagem de argumentos. Hoje nenhum arquivo de `src/app/` faz isso.
3. **Teste da versão.** A asserção de 0.1.9 em `projeto.test.ts` e o `package.json` mudaram juntos. Esse teste não foi visto falhando à parte. É um ajuste administrativo, sem comportamento novo.

## Decisões tomadas

- D1, `code`: recusa toda sequência de 10 ou mais dígitos seguidos, como a 02 decidiu. Isso barra também `1234567890A` e `E1234567890`; nenhum código conhecido tem tantos dígitos.
- D1, classe: confiro primeiro `FORMATO_CLASSE` (até 64 caracteres) e depois o sufixo, para que o limite de tamanho valha também para a classe com sufixo. `desconhecido` é aceito nos dois pontos: não é dado pessoal e é o valor que o próprio módulo produz.
- D1, teste estático: além de `this.name =` e do campo `name`, ele lê `Object.defineProperty(X.prototype, 'name', { value })`, porque `ErroLeituraSessao` (`exigir-pessoa.ts:29`) define o nome assim.
- D3, conferência no fonte do Next 16.4.1 (`node_modules/next/package.json:3`), lido só com a ferramenta Read, como o maestro liberou:
  - página, layout e Server Component: o erro ganha `digest` antes de ir ao gancho, em `dist/server/app-render/create-error-handler.js:100-103` (RSC, `err.digest = stringHash(...)`) antes de `onReactServerRenderError` em `:125`, e em `:165-167` (SSR) antes de `onHTMLRenderSSRError` em `:186`. Nesses caminhos, a guarda de `digest` do console saneado já evita o segundo envio;
  - route handler: o erro que escapa do handler vai a `routeModule.onRequestError(req, err, {..., routeType: 'route'}, silenceLog = false, ...)` sem `digest` (`dist/build/templates/app-route.js:335-346`; a revalidação em segundo plano repete isso em `:266-281`). `RouteModule.onRequestError` escreve `console.error(err)` (ou `logErrorWithOriginalStack`, quando existe) e chama `instrumentationOnRequestError` com o mesmo objeto (`dist/server/route-modules/route-module.js:320-328`);
  - conclusão: **a duplicação existe** no caminho do route handler. Nas rotas deste sistema, `rota()` e `/api/saude` tratam o erro e não o deixam escapar. Uma rota que deixe escapar (por exemplo a do Better Auth) mandaria dois eventos. A marca por objeto em `capturarErro` evita isso nas duas ordens, e o comentário de `console-saneado.ts` registra a evidência;
  - não li o caminho do middleware/proxy nem o da Server Action em arquivo próprio. A marca em `capturarErro` vale para qualquer caminho, então a conferência dos dois não muda a correção.
- D3: a marca fica em `capturarErro` e é por objeto (`WeakSet`), como a 02 pediu. Erro distinto com a mesma mensagem continua indo, o que atende ao risco do RSK. O log não é deduplicado: cada `console.error` continua deixando a sua linha.
- D2: os nomes são lidos fora da transação do serviço, antes dela. A demanda inexistente continua 404, porque `nomesDaDemanda` devolve `[]` e o 404 vem de `travarDemanda`; o teste confere isso nos 3 POST.
- D2: o teste do D2 fica num arquivo próprio, porque o `vi.mock` vale para o arquivo inteiro. O mock embrulha o `nomesDaDemanda` real e só falha quando a chave está armada, então o banco é real (padrão técnico, seção 7).
- D5: o texto é o da 02, "demanda já entregue ou encerrada".
- O `CHANGELOG.md` não foi editado. A nota do maestro pede a seção 0.1.9 no CHANGELOG, mas `CHANGELOG.md` está fora da minha lista Pode (raiz do repositório, fora dos arquivos de configuração listados), e a tabela da 02 dá esse item à `06-documentacao`, como nos pedidos 0002 a 0009 (`git log -- CHANGELOG.md`).
- Listei os arquivos rastreados do repositório quatro vezes, só para leitura, para achar os caminhos dos testes e dos
  ajudantes. As pastas foram `src/lib`, `src/components`, `test`, as rotas da API e os módulos de demandas, pacotes de
  decisão, especificações, pareceres de risco, avisos, histórico, esquema do banco e limites. Fiz isso porque Glob e
  Grep não estavam disponíveis nesta sessão. Nada foi alterado. O maestro liberou essas leituras pela regra de 25/10 e
  as registrou no `passagens.jsonl`.
- O resumo da suíte não aparece na saída do terminal, porque o log do pino vai direto ao fd 1. Para contar os testes, usei um reporter de apoio escrito no scratchpad da sessão (`/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/f803aa58-06d4-40d8-998e-0da08e5f62a0/scratchpad/resumo.mjs`), que grava o total e as falhas em `resumo.txt` na mesma pasta. Nenhum dos dois fica no repositório.

## Pendências

- Para a `06-documentacao`: a seção 0.1.9 do `CHANGELOG.md`, que está fora da minha Pode (ver Decisões). O que entra: a regra de classe e de `code` no log e no Sentry (com a lista `CLASSES_DO_PROJETO` e o teste estático que a mantém em dia), os nomes lidos antes de gravar nos 3 POST, o envio único ao Sentry por objeto de erro, o rótulo de `demanda_final` e o teste estático de `criarPacoteDecisao`.
- Convenção, para pedido próprio (a 02 já sugeriu): classe de erro nova do projeto que não termine em `Error` ou `Exception` tem de entrar em `CLASSES_DO_PROJETO`, e o teste `test/estatico/classes-de-erro.test.ts` acusa quando faltar. Vale registrar isso no padrão técnico.
- Para a `04-regressao`: o e2e três vezes seguidas fica com a `qa-automacao`, como na tabela da 02.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261104-0010-v1`, limpo (rodado na mesma chamada do item seguinte, separado por `;`)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -5` — f88f488 no topo (02-triagem)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -8 -- CHANGELOG.md` — só commits da 06-documentacao
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -3 --stat -- docs/construcao/DEC-DEM-20261103-0009-v1/03-engenheiro-backend.md` — a4af941, a entrega anterior do backend (lida como modelo de registro)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib/reduzir-erro.test.ts src/lib/log.test.ts test/estatico/classes-de-erro.test.ts src/components/rotulos.test.ts test/estatico/pacote-sem-extras.test.ts src/lib/sentry.test.ts src/lib/console-saneado.test.ts src/app/api/demandas/nomes-antes-de-gravar.test.ts --reporter=junit --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/f803aa58-06d4-40d8-998e-0da08e5f62a0/scratchpad/vermelho.xml` — fase vermelha: 151 testes, 40 falhas
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib/reduzir-erro.test.ts src/lib/log.test.ts test/estatico/classes-de-erro.test.ts src/components/rotulos.test.ts test/estatico/pacote-sem-extras.test.ts src/lib/sentry.test.ts src/lib/console-saneado.test.ts src/app/api/demandas/nomes-antes-de-gravar.test.ts --reporter=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/f803aa58-06d4-40d8-998e-0da08e5f62a0/scratchpad/resumo.mjs` — fase vermelha: 111 de 151, 40 falhas (trecho na Entrega)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib/reduzir-erro.test.ts src/lib/log.test.ts test/estatico/classes-de-erro.test.ts src/components/rotulos.test.ts src/components/rotulos-qa.test.ts test/estatico/pacote-sem-extras.test.ts src/lib/sentry.test.ts src/lib/sentry-desligado.test.ts src/lib/console-saneado.test.ts src/instrumentation.test.ts src/app/api/demandas/nomes-antes-de-gravar.test.ts test/estatico/projeto.test.ts --reporter=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/f803aa58-06d4-40d8-998e-0da08e5f62a0/scratchpad/resumo.mjs` — depois do código: 231 de 232, 1 falha (`ErroDeConsulta` em `sentry.test.ts`, desvio 1); o pnpm conferiu as dependências por causa do `package.json` alterado ("Already up to date", sem mudança no lockfile)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/f803aa58-06d4-40d8-998e-0da08e5f62a0/scratchpad/resumo.mjs` — suíte inteira, 3991 de 3991, 0 falhas
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — só os 17 arquivos da correção (14 alterados, 3 novos)

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno
