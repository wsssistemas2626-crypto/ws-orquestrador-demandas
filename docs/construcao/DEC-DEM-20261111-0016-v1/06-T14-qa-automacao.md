---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T14-testes
agente: qa-automacao
leu: [contrato-passagem.md, pedido.json, tarefas.json, 01-analista-requisitos.md (glossário, RF-01 e RF-02), 06-T14-engenheiro-backend.md, 06-T14-tech-lead.md, diff do commit e7ab55b (scripts/criar-token-servico.ts e scripts/revogar-token-servico.ts), scripts/token-integracao.test.ts, scripts/lib/argumentos.ts, src/app/api/pedidos-construcao/saidas-das-integracoes-qa.test.ts, test/pedidos-construcao.ts, test/integracoes.ts, test/requisicao.ts, a saída do pnpm test]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Testes da T14 (emissão, troca e revogação dos tokens de integração pelos scripts, RF-02, IN-04), sobre o commit
`e7ab55bc60f046196d788cf90e2ade685d64db04`. Nenhum token real foi emitido. Todos nasceram em tempo de teste, num banco de
teste (Testcontainers), e nenhum aparece nesta entrega, em arquivo, em log ou em mensagem de `expect`.

### Critérios da tarefa e testes que os cobrem

| Critério | Arquivo | Teste |
|---|---|---|
| CA-02.1 (awave) e CA-02.2 (construir) | `scripts/token-integracao.test.ts` (engenheiro) | `CA-02.1 e CA-02.2: --integracao %s sai com 0, mostra o token uma vez e grava só o hash e o prefixo` |
| CA-02.1 e CA-02.2, invariante de emissão | `scripts/token-integracao-qa.test.ts` (novo) | `para cada argv, ou recusa com entrada_invalida sem gravar nada, ou sai 0 com exatamente um token, uma linha e um evento do dono pedido` |
| CA-02.3 | `scripts/token-integracao.test.ts` | `CA-02.3: integração fora da lista, agente e integração juntos, nenhum dos dois ou --token → erro de argumento e nada gravado` e `argumentos: --integracao awave ou construir; os dois juntos ou nenhum são recusados` |
| CA-02.3, bordas a mais | `scripts/token-integracao-qa.test.ts` | o mesmo teste da invariante (14 argv recusados) e `chamada direta sem dono, ou com o nome do outro tipo, é recusada antes do banco` |
| CA-02.4 | `scripts/token-integracao.test.ts` | `CA-02.4: revogar pelo prefixo sai com 0, o token deixa de valer e grava token_revogado; de novo, 1 sem evento` |
| CA-02.4, o 401 pela rota | `scripts/token-integracao-qa.test.ts` | `awave: o token do script cria demanda (201); …` e `construir: o token do script lista pendentes (200); …` |
| CA-02.5 | `scripts/token-integracao.test.ts` | `CA-02.5: troca do token %s: o novo vale junto com o antigo até a revogação, e depois só o novo` |
| CA-02.5, pela rota | `scripts/token-integracao-qa.test.ts` | os mesmos dois testes de rota: antes da revogação, os dois tokens são aceitos; depois, o antigo recebe 401 com o corpo fixo e nada é gravado, e o novo continua aceito |
| CA-02.6 | os dois arquivos | `conferirSemToken` em todo teste que emite: nem `wsod_` nem o texto depois do prefixo no log e em todos os eventos |
| Pendência (a) da 06-T14-revisao | `scripts/token-integracao-qa.test.ts` | `semNomeDeIntegracao` nos dois testes de rota: nenhuma linha `token_*` traz `awave` ou `construir` (asserção com rótulo), além da igualdade exata `{ evento, atorTipo }` |
| m1 da 06-T14-revisao | `scripts/token-integracao-qa.test.ts` | `o schema aceita só exatamente um dono, em todas as combinações de agente e integração, e o que aceita traz exatamente um dono` e o teste da invariante |
| IN-18 (D-20) | `test/estatico/docs-sem-token.test.ts` (engenheiro) | um `it` por arquivo, mais o controle positivo e o negativo |

### Testes acrescentados

Um arquivo novo, `scripts/token-integracao-qa.test.ts`, com 5 testes:

1. **m1, guarda do schema** (sem banco): percorre agente ∈ {ausente, 4 agentes} × integração ∈ {ausente, 2
   integrações}, com a chave presente valendo `undefined` e sem a chave. Aceita só quando há exatamente um dono, e o que
   aceita traz exatamente esse dono. O que recusa traz a regra `MENSAGEM_UM_DOS_DOIS` nos caminhos `agente` e
   `integracao`. Total de aceitos fixado em 12. Se alguém afrouxar o `superRefine`, este teste fica vermelho.
2. **m1, invariante do script** (banco real): 22 argv, entre eles os 8 válidos (4 `--agente`, 2 `--integracao x` e 2
   `--integracao=x`) e 14 de borda: sem argumentos, `--integracao` e `--agente` sem valor, `--integracao=` e `--agente=`,
   sem `--`, espaço antes e depois, maiúscula, nome de integração em `--agente` e o contrário, repetido e os dois donos.
   Para cada um, das duas uma: (a) o script recusa com `entrada_invalida`, saída vazia, nenhuma linha em
   `token_servico`, nenhum evento e nenhuma linha `token_*` no log; ou (b) sai com 0, o token aparece uma vez na saída,
   entram exatamente uma linha (do dono pedido, `{ agente, integracao }` exato) e um `token_criado` do prefixo, e o log
   tem uma linha `token_criado`. O teste fixa 8 emissões e 14 recusas, para nenhuma das conferências ficar vazia.
3. **Chamada direta** com dono `undefined` e com o nome do outro tipo (`awave` como agente, `risco` como integração):
   `entrada_invalida`, saída vazia, nada gravado nem logado.
4. **awave pela rota:** o token emitido pelo script cria demanda (`POST /api/demandas`, sem `Origin`) com 201. Na troca,
   o antigo e o novo dão 201. Depois da revogação pelo script, o antigo recebe 401 com
   `{ erro: 'nao_autenticado', mensagem: MENSAGENS_ACESSO.token_invalido }`, sem gravar token, evento nem demanda, e o
   novo continua com 201. O log `token_*` tem as três linhas exatas e nenhum nome de integração.
5. **construir pela rota:** o mesmo com `GET /api/pedidos-construcao/pendentes` (200, depois 401 no antigo e 200 no novo).

### Resultado

- `pnpm test scripts/token-integracao-qa.test.ts`: 1 de 1 arquivo, 5 de 5 testes.
- `pnpm test` (suíte inteira): **280 de 280 arquivos, 6217 de 6217 testes**, 0 falharam. Na 06-T14-revisao eram 279 e
  6211. Entraram 1 arquivo e 6 testes: os 5 deste arquivo e mais 1 `it` da guarda da documentação, que passou a varrer
  a entrega `06-T14-tech-lead.md`.
- `pnpm lint`: limpo. `pnpm typecheck`: limpo.
- `git diff --stat`: vazio, porque nenhum arquivo rastreado mudou. `git status --short`: só o arquivo de teste novo.

## Decisões tomadas

- **m1 coberto pela guarda, não pelo caminho com defeito.** Dava para chegar ao caminho do m1 sem mexer em código de
  produção, trocando `lerArgumentos` com `vi.mock` para devolver `{}`. Só que esse teste falharia com o código de hoje,
  que sai com 0. Isso deixaria a suíte vermelha por um Minor que a revisão aceitou como correção futura, e marcá-lo com
  `.fails` ou `.skip` é proibido. A forma que cobre sem mexer no código é tornar o afrouxamento visível: o schema é
  conferido em todas as combinações, e a invariante "sai 0 só com a emissão inteira" é conferida sobre todo argv de
  borda. Se alguém afrouxar a validação, o teste fica vermelho antes de o script poder sair com 0 em silêncio.
- **CA-02.4 e CA-02.5 também pela rota.** Os critérios dizem que o token "responde 401". O teste do engenheiro conferia
  `validarTokenServico === null`, e o teste da T13 revoga pelo módulo, não pelo script. Agora o fluxo inteiro do operador
  (criar pelo script, usar, trocar, revogar pelo script e usar de novo) passa pela API, nas duas integrações.
- **Testes sem dependência de ordem nem de relógio real.** O `relogioFixo` é redefinido e avançado 2 h em cada teste,
  para o limite de 10 por hora do Awave não ligar um teste ao outro. As contagens são sempre o antes e o depois do
  próprio caso, e cada teste emite os próprios tokens.
- **O token nunca vai a valor de `expect`.** Os rótulos são os argv, que não têm token, e as conferências envolvendo o
  token são booleanas (G3.3).
- **A pendência (b) da revisão não procede como escrita.** Ela dizia que o m1 não tinha teste possível. O teste da
  invariante e o do schema cobrem a precondição. A correção do código (um `else` que lança, ou o `switch` com `never`)
  continua sendo Minor e opcional, e não bloqueia esta etapa.

## Pendências

- Nenhuma bloqueia a T14.
- Para uma tarefa futura que toque `scripts/criar-token-servico.ts` (m1 da revisão): ao trocar o `if/else if` de
  `executarCriarToken` por um `else` que lança, vale acrescentar um teste com `vi.mock('./lib/argumentos')` devolvendo
  `{}`, esperando a rejeição. Hoje esse teste falharia, e por isso não entrou.
- Glob e Grep não estavam disponíveis nesta sessão. Li tudo com Read e achei os arquivos do commit da T13 pelo
  `git log --name-only`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261111-0016-v1`, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --stat -3` — HEAD em 33753af (06-T14-revisao), e7ab55b com os 4 arquivos da tarefa
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff e7ab55bc60f046196d788cf90e2ade685d64db04~1 e7ab55bc60f046196d788cf90e2ade685d64db04 -- scripts/criar-token-servico.ts scripts/revogar-token-servico.ts` — o código da T14
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format=%h -1 f8d07244533e92089899e2e342a58be18fffb6c4` — arquivos da 06-T13-testes (modelo de teste pela rota)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/token-integracao-qa.test.ts` — 1 de 1 arquivo, 5 de 5 testes
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 280 de 280 arquivos, 6217 de 6217 testes, 0 falharam
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — só `scripts/token-integracao-qa.test.ts` (novo)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — vazio (nenhum arquivo rastreado mudou)

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste (CA-02.1 a CA-02.6, tabela acima)
- [x] a suíte inteira passa (280 de 280 arquivos, 6217 de 6217 testes)
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real (relógio fixo redefinido em cada teste; contagens por diferença dentro do próprio caso)
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (`git diff --stat` vazio; só um arquivo novo)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real (tokens só em tempo de teste; corpo do Awave fictício; nenhum token em `expect` de valor)
