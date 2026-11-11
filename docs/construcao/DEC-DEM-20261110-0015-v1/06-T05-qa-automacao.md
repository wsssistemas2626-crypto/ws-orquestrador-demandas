---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T05-testes
agente: qa-automacao
leu: [pedido.json, contrato-passagem.md, 06-T05-qa-automacao.md (volta anterior), 06-T05-engenheiro-frontend.md (volta 1), 06-T05-tech-lead.md (volta 1), diff do commit e49ca6a (e2e, src e test), e2e/casca.spec.ts (linhas 1 a 60 e 195 a 229), e2e/apoio.ts (linhas 55 a 84), e2e/servidor.ts, playwright.config.ts, src/modules/acesso/auth.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Volta 1 da T05. O código continua em 85ace62. Nesta volta, o engenheiro corrigiu só o e2e instável (e49ca6a), e o
tech-lead aprovou a correção. A cobertura dos critérios e os testes novos da volta anterior (5a12fe3) continuam valendo
inteiros. O que segue é a medida de estabilidade pedida e o fechamento da T05.

### A correção conferida

- **O que mudou.** O `git diff e49ca6a~1 e49ca6a -- e2e test src` mostra só `e2e/casca.spec.ts`, com 6 linhas
  acrescentadas e nenhuma removida. São três mudanças no teste "clique no véu e item da tela atual fecham e devolvem o
  foco a Menu":
  - a espera pelo fim das animações do `<dialog>`, na linha 212;
  - a asserção `x = 0`;
  - a asserção de largura maior que 160 px.
- **As asserções antigas.** Nenhuma saiu nem mudou.
- **A causa.** A espera tira a janela de 200 ms que eu tinha medido (`x = -236,6`, com o alvo no `::backdrop`).
- **Relógio.** A espera não usa `waitForTimeout` nem lê o relógio. Com movimento reduzido, `getAnimations()` volta
  vazio e a espera resolve na hora.
- **Retentativa.** O `playwright.config.ts` está com `retries: 0`. Então nenhuma passada abaixo foi salva por
  retentativa.
- **Desde o código revisado.** O `git diff --stat 85ace62 HEAD -- src e2e test` mostra só os 3 arquivos `-qa` da volta
  anterior e as 6 linhas acima. Nenhum arquivo de produção mudou.

### Estabilidade medida

| Execução | Antes da correção (volta anterior) | Agora |
|---|---|---|
| O teste sozinho, em blocos de `--repeat-each=3` (4 blocos) | 0 de 5 | **12 de 12** |
| O teste sozinho, `--repeat-each=6` | — | 4 passaram; as 2 falhas foram 429 no login (`e2e/apoio.ts:79`), antes do corpo do teste (ver abaixo) |
| `casca.spec`, `casca-qa.spec` e `moldura.spec` juntos, `--repeat-each=3` (2 rodadas) | 72 de 75 (as 3 falhas eram este teste) | **78 de 78** e **78 de 78** |

O corpo do teste corrigido rodou 22 vezes nesta etapa e não falhou nenhuma vez:

- 16 vezes sozinho (12 nos blocos e 4 na rodada de 6);
- 6 vezes junto com os outros dois specs.

Somadas as 22 da entrega do engenheiro, são 44 execuções seguidas sem falha no corpo. Antes da correção eram 8 falhas
em 8 execuções fora da suíte inteira. Dou o teste por **estável**.

### O 429 no login (falso positivo de medida, não é da T05)

Na rodada de 6, as execuções 4 e 5 falharam com `Expected: 200, Received: 429` em `e2e/apoio.ts:79`. Essa linha é a
verificação do TOTP no `entrarComo`, chamado na linha 201, antes da primeira linha do corpo. A execução 6 passou. É o
mesmo padrão que o engenheiro achou:

- quatro verificações de TOTP da mesma conta em menos de cerca de 10 s recebem 429;
- passada a janela, o login volta a passar.

Não achei a causa, e ela fica fora da T05. O que li não fecha a conta:

- O `rateLimit` do `src/modules/acesso/auth.ts` é de 60 s e 10 pedidos. Ele não explica uma recuperação em segundos.
- O `entrarComo` manda um `x-real-ip` fictício diferente a cada login (`e2e/apoio.ts:60-68`), justamente para um limite
  por IP não ligar um teste ao outro.
- O `e2e/servidor.ts` passa `cabecalhoIp: 'x-real-ip'` só à configuração do seed. O ambiente do app recebe só
  `DATABASE_URL`, `BETTER_AUTH_URL` e `BETTER_AUTH_SECRET`.

As duas hipóteses que sobram, sem conferir:

- a regra que o plugin `twoFactor` traz para `/two-factor/*`;
- o app do e2e não ler o `x-real-ip`.

Para separar uma da outra, basta ler o corpo e os cabeçalhos do 429.

Em uso normal, um 429 desses é controle de segurança. No e2e, só apareceu quando um teste curto se repetiu sozinho. Não
aconteceu na suíte inteira nem com specs intercalados. Detalhe em Pendências.

### Critério da tarefa e teste que cobre

Sem mudança desde a volta anterior (`06-T05-qa-automacao.md` em 5a12fe3). Todos os critérios têm teste:

- CA-03.1 a CA-03.5;
- CA-04.1 a CA-04.5;
- CV-16, CV-19, RNF-11 e CV-01.

Esta volta só reforça CA-04.3 e o fechamento pelo véu. O teste "clique no véu e item da tela atual fecham e devolvem o
foco a Menu" (`e2e/casca.spec.ts:200`) agora confere a gaveta parada antes do clique dentro dela.

### Resultado

| Suíte | Volta anterior | Agora |
|---|---|---|
| `pnpm test` | 218 arquivos, 4820 de 4820 | **218 arquivos, 4820 de 4820** |
| `pnpm test:e2e` (suíte inteira) | 182 de 182 | **182 de 182** (6,6 min) |
| `pnpm lint` e `pnpm typecheck` | limpos | **limpos** |

Testes acrescentados nesta volta: nenhum. A cobertura nova da T05 entrou na volta anterior:

- 25 testes de unidade em `src/components/casca/gaveta-qa.test.ts` e `test/estatico/casca-qa.test.ts`;
- 8 e2e em `e2e/casca-qa.spec.ts`.

### Conferências do `git diff`

- Árvore de trabalho limpa no começo (`git status --short` vazio). No fim, só esta entrega aparece modificada. Nenhum
  arquivo de teste mudou nesta etapa, e nenhum arquivo temporário ficou no repositório.
- e49ca6a: nenhum `.skip(`, `.only(` nem `.todo(`, nenhuma linha removida e nenhuma asserção afrouxada.
- Nenhum segredo, token ou dado pessoal nas 6 linhas novas.

## Decisões tomadas

- Status `pronto`: o teste devolvido passou 22 de 22 vezes no corpo nesta etapa, sozinho e com os outros specs, e a
  suíte inteira, o lint e o typecheck estão verdes.
- As 2 falhas por 429 na rodada de 6 não contam contra a T05: caem no login comum, antes do corpo, e o engenheiro viu o
  mesmo num teste que não foi tocado ("Fechar menu"). Por isso a medida principal ficou em blocos de 3, como o
  tech-lead orientou.
- Não mexi no `e2e/apoio.ts` nesta etapa, embora `e2e/` esteja na minha lista Pode. O apoio é comum a todos os specs e
  fica fora da T05. Mudar o tratamento do 429 sem uma tarefa própria poderia esconder um 429 de verdade.
- Não extraí a espera para um `gavetaParada(page)` (Minor 1 do tech-lead). Hoje só há um clique por coordenada dentro
  da gaveta, e o tech-lead destinou a extração à T16 ou à T17.

## Pendências

- Para o tech-lead (recomendação, não bloqueia):
  - **Proposta.** Abrir uma tarefa pequena de apoio do e2e para o 429 da verificação do TOTP em `entrarComo`
    (`e2e/apoio.ts:79`), em dois passos:
    - primeiro, a mensagem da asserção passa a trazer o `code` do corpo e o `X-Retry-After` do 429. Isso diz se é o
      limite do plugin, o bloqueio por conta (`VERIFICACAO_BLOQUEADA`) ou o IP fictício que o app do e2e não lê;
    - depois, conforme a causa, corrigir o apoio ou o `e2e/servidor.ts`, sem retentativa cega.
  - **Por que vale.** A definição de pronto do pedido pede `pnpm test:e2e` verde três vezes seguidas. Hoje a suíte
    passa porque os logins ficam espaçados, mas testes curtos seguidos da mesma conta podem esbarrar na janela.
  - **O que não mudar.** O limite do produto fica como está: é controle de segurança.
- Minor 1 da revisão desta volta: extrair a espera para um auxiliar ao lado do `abrirGaveta`, quando entrar outro
  clique por coordenada dentro da gaveta (T16 ou T17, `engenheiro-frontend`).
- Seguem as pendências anteriores para a `07-qa-funcional` e o UAT:
  - leitor de tela na gaveta;
  - foco branco sobre marinho;
  - zoom de 200 % e 400 %;
  - o `<dialog>` no Safari do iOS.
- Segue também a observação para a `ux-ui-design` (baixa): um toque durante os 200 ms de entrada, no lugar onde a gaveta
  vai parar, cai no véu e fecha a gaveta.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — só esta entrega (rodado com o e2e completo em curso)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -6` — topo e776a4b (06-T05-revisao), e49ca6a logo abaixo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff e49ca6a~1 e49ca6a -- e2e test src` — só `e2e/casca.spec.ts`, +6 e nenhuma linha removida
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 85ace62 HEAD -- src e2e test` — 4 arquivos de teste (3 `-qa` e `casca.spec.ts`); nenhum de produção
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/casca.spec.ts -g "clique no véu" --repeat-each=3 --reporter=line` — 3 de 3
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/casca.spec.ts -g "clique no véu" --repeat-each=3 --reporter=line` — 3 de 3
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/casca.spec.ts -g "clique no véu" --repeat-each=3 --reporter=line` — 3 de 3
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/casca.spec.ts -g "clique no véu" --repeat-each=3 --reporter=line` — 3 de 3
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/casca.spec.ts -g "clique no véu" --repeat-each=6 --reporter=line` — 4 passaram; 2 falharam por 429 em `e2e/apoio.ts:79`, antes do corpo do teste
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/casca.spec.ts e2e/casca-qa.spec.ts e2e/moldura.spec.ts --repeat-each=3 --reporter=dot` — 78 de 78
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/casca.spec.ts e2e/casca-qa.spec.ts e2e/moldura.spec.ts --repeat-each=3 --reporter=dot` — 78 de 78
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — 218 arquivos, 4820 de 4820
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --reporter=line` — 182 de 182 (6,6 min)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — só esta entrega (`M docs/construcao/DEC-DEM-20261110-0015-v1/06-T05-qa-automacao.md`); nenhum arquivo de teste nem temporário

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
