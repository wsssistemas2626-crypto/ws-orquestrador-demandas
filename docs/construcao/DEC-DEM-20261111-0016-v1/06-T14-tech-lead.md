---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T14-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12 e 6, 7), docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (G1 a G7, T13, T14, T15), 05-tech-lead.md, 06-T14-engenheiro-backend.md, 01-analista-requisitos.md (RF-01, RF-02), 04-seguranca-aplicacao.md (seção 2 C01 a C15, seção 3 IN-01 a IN-18), diff do commit e7ab55b, scripts/criar-token-servico.ts, scripts/lib/argumentos.ts, src/lib/log.ts, a saída do pnpm test]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T14 (emissão, troca e revogação dos tokens de integração pelos scripts), commit
`e7ab55bc60f046196d788cf90e2ade685d64db04` sobre f8d0724. Mudaram só os quatro arquivos da tarefa:
`scripts/criar-token-servico.ts`, `scripts/revogar-token-servico.ts` (só comentário), `scripts/token-integracao.test.ts`
(novo) e `test/estatico/docs-sem-token.test.ts` (novo), mais a entrega do engenheiro e o `passagens.jsonl` do maestro.

**Resultado: aprovada. Nenhum problema Critical ou Important. Os três desvios do plano foram aceitos. Os três achados
Minor estão em Pendências.**

### Conferência refeita nesta revisão

| O que | Resultado |
|---|---|
| G4: superfícies congeladas e `src/lib/rota.ts`, de a9fd9b8 até e7ab55b | diff vazio |
| `src/lib/log.ts` e `scripts/lib/argumentos.ts`, no mesmo diff | vazio (a lista do log e o leitor de argumentos não mudaram) |
| IN-16: teste existente alterado | nenhum (o commit só cria testes), e `piso-de-assercoes.test.ts` passa |
| T14, `scripts.test.ts` e piso juntos | 4 de 4 arquivos, 490 de 490 testes |
| `pnpm test` (suíte inteira) | 279 de 279 arquivos, 6211 de 6211 testes. A diferença de 1 teste para os 6210 do engenheiro é a própria entrega 06-T14 do engenheiro, que entrou no commit e passou a ser varrida pela guarda da documentação (um `it` por arquivo `.md`) |
| `pnpm typecheck` e `pnpm lint` | limpos |
| `git status --short` | árvore limpa (HEAD = e7ab55b) |

### Cobertura dos critérios

| Critério | Onde | Situação |
|---|---|---|
| CA-02.1 e CA-02.2 | `token-integracao.test.ts`, `it.each(INTEGRACOES)`: saída, linha exata de `token_servico` (hash SHA-256, `agente` nulo), evento exato `{ integracao, prefixo }`, ator resolvido como integração | coberto |
| CA-02.3 | nove `argv` recusados, chamada direta com `jarvis`, nada gravado em `token_servico` e `evento`, nenhum sentinela no erro | coberto |
| CA-02.4 | revogar pelo prefixo: 0, texto exato, `null` em `validarTokenServico`, `token_revogado` exato; de novo, 1 sem evento; CA-01.4 junto | coberto |
| CA-02.5 | os dois valem até a revogação; depois só o novo; para as duas integrações | coberto |
| CA-02.6 / IN-04 | `conferirSemToken` em todo teste que emite: nem o texto depois do prefixo, nem `wsod_`, no log e em todos os eventos; conferência por booleano com rótulo (G3.3) | coberto |
| IN-12 | `depois` montado chave a chave, `{ integracao, prefixo }` por igualdade exata | coberto |
| IN-18 (parte verificável, D-20) | `docs-sem-token.test.ts`, com controle positivo (token plantado montado por código) e negativo (prefixo, `wsod_`, valor curto) | coberto |
| Regressão de `--agente` | teste próprio e `scripts.test.ts` sem mudança | coberto |

TDD: a entrega mostra 7 de 8 falhando antes do código. O que passou antes é a regressão de `--agente`, que é o
esperado. A guarda da documentação está declarada como teste de guarda (G3.1), e o token plantado prova que ela reprova.

### Decisão sobre os desvios do plano

**Desvio 1 — linha de log da emissão de integração sem o nome da integração: ACEITO.**

- O erro é do plano (05, meu), não do código. O passo 3 da T14 (linhas 2209 e 2210 do plano) diz "o log leva só
  `{ evento: 'token_criado', atorTipo: 'sistema' }` e o nome do dono". Escrevi isso sem conferir que
  `CAMPOS_PERMITIDOS` (`src/lib/log.ts:7-27`) tem `agente` mas não tem `integracao`.
- Pôr o nome exigiria acrescentar `integracao` a `CAMPOS_PERMITIDOS`. Essa lista é a barreira estrutural do C-21: um
  campo que entra nela passa a ser aceito em **toda** linha de log do sistema, inclusive na linha por requisição de
  `rota()`. O IN-14 exige que essa linha saia "sem nome da integração", e o teste da T13 (`log-das-integracoes.test.ts`)
  não confere a ausência do nome. Abrir a lista trocaria uma garantia por construção por uma garantia por disciplina.
  Pelo G3.10 e pelo C-21, isso não se faz numa tarefa de scripts.
- Nenhum requisito pede o nome no log. O RF-02, o IN-04 e o CA-02.1 pedem o nome e o prefixo no **evento**
  `token_criado`, e o evento os tem (`depois = { integracao, prefixo }`, conferido por igualdade exata). O histórico é
  o registro de auditoria da emissão (C-37). A linha de log é só operacional.
- Custo aceito: no log, a emissão de um token `awave` não se distingue da de um `construir`. A emissão é manual, feita
  por Fabiano no terminal, que vê a saída do script com o nome. Quem precisar saber a integração de um prefixo lê o
  evento ou a tabela `token_servico`.
- A linha da integração (`scripts/criar-token-servico.ts:61`) fica `{ evento, atorTipo }`, e a do agente
  (`:54`) segue com `agente`, como hoje. O teste confere as duas por igualdade exata, então qualquer campo novo na
  linha quebra o teste.

**Desvio 2 — regra "exatamente um" com `superRefine` e caminho nos dois campos: ACEITO.** Conferi em
`scripts/lib/argumentos.ts:43-45`. Um `refine` sem caminho, como o trecho do plano, gera um campo vazio, e
`lerArgumentos` montaria "Corrija os argumentos: --.". Com o caminho, a mensagem cita `--agente, --integracao` e a regra
vai em `campos`. O leitor de argumentos não mudou, e `--agente` com valor fora da lista continua com a mensagem de hoje
(`scripts.test.ts` verde sem mudança). O passo 3 da T14 pedia exatamente isto: "confira como `lerArgumentos` trata opção
ausente e ajuste sem mudar o comportamento de `--agente`".

**Desvio 3 — dois casos a mais no teste da documentação e achado como `arquivo:linha`: ACEITO.** O teste fica mais forte
que o do plano. O controle positivo prova a guarda sem nenhum token no repositório, e a falha não reimprime o valor
(G3.3). Mais casos de teste não é escopo a mais: é a prova de que a guarda funciona.

### Pareceres

Nenhum Critical. Nenhum Important. Três Minor, que não bloqueiam a passagem (seção 12) e vão para Pendências:

| # | Gravidade | Arquivo:linha | Problema | Razão |
|---|---|---|---|---|
| m1 | Minor | `scripts/criar-token-servico.ts:113-115` | `executarCriarToken` decide por `if (agente) … else if (integracao) …` e devolve 0 se nenhum dos dois vier | O schema garante que esse caminho não acontece hoje. Mas, se alguém afrouxar o `superRefine`, o script sai com 0 sem emitir nada: sucesso silencioso numa emissão de credencial. A forma robusta é montar o `Dono` uma vez e terminar com `else` que lança, ou com o mesmo `switch` com `never` do `porDono` |
| m2 | Minor | `scripts/criar-token-servico.ts:94-97` e `:105-107` | as duas funções de entrada repetem o `safeParse` com `deZod` e só mudam o dono | É duplicação pequena e intencional: a chamada direta passa pelo schema, e o caso `jarvis` está testado. Se entrar um terceiro tipo de dono, junte as duas num `validarDono` antes de copiar de novo |
| m3 | Minor (plano) | plano, T14, passo 3 (linhas 2209 e 2210) | o texto diz que o log leva "o nome do dono"; o código certo, aceito no desvio 1, não leva o nome da integração | É erro do plano, não do código. Fica registrado aqui para a 08 e para a 10 não cobrarem o nome no log |

## Decisões tomadas

- Desvio 1 aceito: abrir `CAMPOS_PERMITIDOS` para `integracao` afrouxaria a barreira do C-21 em todas as linhas de log,
  contra o IN-14. O nome já está no evento `token_criado`, que é o registro de auditoria pedido pelo RF-02.
- Desvio 2 aceito: sem o caminho, a mensagem de `lerArgumentos` sairia "--." (conferido no código), e `--agente` não
  mudou.
- Desvio 3 aceito: o controle positivo e negativo prova a guarda sem token no repositório.
- m1 a m3 ficam como Minor: nenhum é alcançável com o schema de hoje, nem enfraquece controle. Pela seção 12, só Critical
  e Important bloqueiam.
- O plano não é editado nesta etapa. A correção do texto da T14 fica registrada no parecer m3, para não reabrir a 05 por
  causa de uma frase que o código já resolveu do jeito certo.

## Pendências

- Nenhuma bloqueia a T14.
- Para a `06-T14-testes` (qa-automacao): (a) conferir a linha de log da integração por igualdade exata
  `{ evento: 'token_criado', atorTipo: 'sistema' }` e a ausência do nome `awave`/`construir` nas linhas `token_*` (hoje a
  igualdade exata já garante isso; uma asserção com rótulo deixa a intenção explícita); (b) o m1 não tem teste possível sem mudar o
  código (o schema barra o caminho antes), então fica para correção futura.
- Para a `08-revisao`: o desvio 1 é decisão de revisão, não falta de cobertura. O `/security-review` não deve pedir o nome
  da integração na linha de log do script. Se pedir, a resposta está acima (C-21 e IN-14).
- Para a `10-documentacao` (`docs/operacao/`, IN-18): (a) a linha de log da emissão de token de integração não diz qual
  integração. Para saber a integração de um prefixo, o texto aponta o evento `token_criado` no histórico ou a tabela
  `token_servico` (colunas `prefixo`, `integracao`, `revogado_em`, sem exibir o hash); (b) o texto não pode ter valor no
  formato de token: `docs-sem-token.test.ts` varre `docs/**/*.md`, `CHANGELOG.md` e `README.md`. O uso dos scripts está no
  cabeçalho de `scripts/criar-token-servico.ts`.
- Minor m1 e m2: correção opcional numa tarefa futura que toque `scripts/criar-token-servico.ts`. Nenhuma tarefa deste
  plano toca esse arquivo de novo.
- As caixas `- [ ]` da T14 no plano ficam com o maestro.
- Glob e Grep não estavam disponíveis nesta sessão. Li com Read e conferi o código pelo `git diff` do commit.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat e7ab55bc60f046196d788cf90e2ade685d64db04~1 e7ab55bc60f046196d788cf90e2ade685d64db04` — 6 arquivos: os 4 da tarefa, a entrega do engenheiro e `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff e7ab55bc60f046196d788cf90e2ade685d64db04~1 e7ab55bc60f046196d788cf90e2ade685d64db04 -- scripts test` — o código e os testes da T14; nenhum teste existente alterado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff a9fd9b8 e7ab55bc60f046196d788cf90e2ade685d64db04 --stat -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/proxy.ts src/db/privilegios.ts next.config.ts 'drizzle/000[0-6]_*.sql' 'drizzle/meta/000[0-6]_snapshot.json' src/lib/rota.ts src/lib/log.ts scripts/lib/argumentos.ts` — vazio (G4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -3` — HEAD em e7ab55b (06-T14-construcao)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — árvore limpa
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/token-integracao.test.ts test/estatico/docs-sem-token.test.ts scripts/scripts.test.ts test/estatico/piso-de-assercoes.test.ts` — 4 de 4 arquivos, 490 de 490 testes
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 279 de 279 arquivos, 6211 de 6211 testes, 0 falharam (saída lida com Read)

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
  - [x] A tarefa faz o que o plano pede, nem mais nem menos; arquivos fora da tarefa não mudaram (três desvios aceitos acima; G4 vazio)
  - [x] Há teste para cada comportamento novo, e ele falharia sem o código (7 de 8 vistos falhando; a regressão e a guarda estão justificadas)
  - [x] Nenhum segredo, valor de `.env` ou dado pessoal real em código, teste, log ou fixture (tokens só em tempo de teste; token plantado montado por código; sentinelas fictícios)
  - [x] Entrada externa validada com Zod; erro sem vazar detalhe (`strictObject` com `superRefine`; o erro cita só o nome do argumento, conferido com sentinelas)
  - [x] Banco: migration gerada, papel migrator, RLS e guarda quando houver `tenant_id` (não se aplica: a T14 não tem migration; o teste lê pelo migrator)
  - [x] Nada duplica função que já existe no repositório (reusa `criarTokenServico`, `criarTokenDeIntegracao`, `registrarEvento`, `lerArgumentos`, `rodarScript`; a repetição interna está no m2)
  - [x] Textos de interface em pt-BR; axe sem violação nas telas tocadas (sem tela; textos da saída em pt-BR)
  - [x] O que é Minor vai para Pendências; só Critical e Important bloqueiam a passagem (m1 a m3 em Pendências)
  - [x] No PR: `/code-review` e `/security-review` (não se aplica nesta etapa: ficam com a `08-revisao`, G2 do plano)
