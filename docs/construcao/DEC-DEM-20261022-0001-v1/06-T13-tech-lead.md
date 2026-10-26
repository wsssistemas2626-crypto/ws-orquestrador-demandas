---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T13-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12), 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6 e T13), 05-tech-lead.md, 06-T13-engenheiro-backend.md, 04-seguranca-aplicacao.md (seções 1 e 2.1 a 2.4), commit 53c6491, test/requisicao.ts, test/matriz-rotas.test.ts, test/sessao.ts, test/estatico/eslint.test.ts, src/lib/rota.ts, src/modules/acesso/matriz.ts]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T13 (testes estáticos e teste da matriz de acesso em todas as rotas), commit `53c6491`. Nenhum problema
Critical nem Important. A tarefa segue para a `06-T13-testes`.

### O que foi conferido

- **Escopo.** Os cinco arquivos novos são os do plano: `exigir-pessoa`, `sql-raw`, `variaveis`, `relogio` e
  `matriz-rotas`. `test/requisicao.ts` ganhou as funções de chamada. Os dois arquivos de `src/` mudaram só no comentário.
  É o passo 3 do plano, "corrigir o que os estáticos acusarem": o esquema e o código ficaram iguais, e não há migration.
- **`eslint.test.ts` não foi recriado.** O arquivo existe desde a `06-T01-testes`. Ele roda o ESLint de verdade e
  confere `react/no-danger` e `no-console` como erro, o que é mais forte que o `calculateConfigForFile` do plano.
  Recriar o arquivo duplicaria esse teste. C-18 e G3.7 continuam cobertos.
- **O teste falharia sem o código.** A entrega mostra o vermelho: `prepararCredenciais is not a function` e os dois
  comentários acusados. O bloco "verificador" roda a mesma `conferirHandler` sobre handlers sintéticos das 19 ações.
  Nesses handlers, os atores permitidos recebem 200 ou 201. Isso prova três coisas:
  - tokens e cookies autenticam;
  - a origem e o JSON passam no CSRF;
  - o 403 dos proibidos vem da matriz.

  Quatro handlers errados são recusados: o método solto, o `meta.rota` errado, a rota dinâmica sem `params` e a
  autorização disfarçada. Sem rota de negócio nesta tarefa, é o que mostra que a conferência funciona.
- **Ordem em `rota()`.** Os parâmetros são conferidos antes de `obterDeps` e da autenticação, e `autorizar` vem antes
  do Zod (`src/lib/rota.ts:142-153`). O 404 sem credencial e o 403 com corpo `{}` dependem dessa ordem, e o
  verificador a prova.
- **Desvios 2 a 5.** Ficam aceitos:
  - as credenciais no argumento evitam estado global de módulo;
  - as três conferências a mais fecham o parecer 7 da `06-T11-revisao` e o 2FA nos dois papéis;
  - o verificador já foi tratado acima;
  - juntar as violações numa lista só não muda o que o teste aceita.
- **Âncora `$` nas regex de C-27** (`test/estatico/variaveis.test.ts:11-12`). Ficou mais estrita que a do plano: o
  caso `provedor.ts.bak` é recusado, e há teste para isso.
- **Segredo e dado pessoal.** Os tokens e as contas são criados no Testcontainers durante o teste. Os IPs são das
  faixas de documentação. Não há valor de `.env`.
- **Itens do checklist que não se aplicam.** Zod, banco, RLS, textos e axe: a tarefa não tem entrada externa nova,
  migration nem tela.
- **Comandos rodados de novo nesta revisão.** `pnpm test` deu 70 arquivos e 1086 de 1086. `pnpm lint` e
  `pnpm typecheck` passaram limpos. A árvore está limpa.

### Pareceres (todos Minor, nenhum bloqueia)

1. **`test/requisicao.ts:45` e `test/matriz-rotas.test.ts:94`: `HEAD` e `OPTIONS` ficam fora da varredura.**
   - Problema: o laço confere só `GET`, `POST`, `PATCH`, `PUT` e `DELETE`. O App Router também aceita `HEAD` e
     `OPTIONS` exportados. Um `export const HEAD = async () => ...` solto passaria pelo teste da matriz.
   - Por que passaria também pelo estático: `test/estatico/exigir-pessoa.test.ts:31` só exige que `rota(` apareça em
     algum lugar do arquivo, e não em cada export.
   - Razão para não bloquear: o plano lista esses cinco métodos, e ainda não há rota de negócio.
   - Correção: incluir `HEAD` e `OPTIONS` em `METODOS`, ou falhar quando o módulo exportar um método HTTP fora da lista
     conferida. Deve ser feita antes da T16.
2. **`test/estatico/exigir-pessoa.test.ts:13` e `test/matriz-rotas.test.ts:33`: a regex `PUBLICAS` está repetida e é
   larga.**
   - Problema: as duas cópias precisam mudar juntas. Além disso, qualquer `route.ts` nova debaixo de `src/app/api/auth/`
     ou de `src/app/api/saude/` sai das duas varreduras.
   - Razão: a exceção deve ser só o catch-all do Better Auth e a saúde, e uma rota própria posta ali escaparia da
     matriz sem aviso.
   - Correção: exportar uma lista só, de `test/requisicao.ts`, com os dois arquivos exatos.
3. **`test/estatico/relogio.test.ts:7` e `:10`: dois casos de borda que a regra deixa passar.**
   - Problema 1: a regex não pega `new Date` sem parênteses, que também lê a hora do processo.
   - Problema 2: o filtro tira só `.test.ts`. Um `.test.tsx` futuro em `src/` cairia na regra.
   - Razão: é borda, e nenhum dos dois existe hoje.
   - Correção: `\bnew\s+Date\b(?!\s*\(\s*[^)\s])` ou equivalente, e excluir `.test.tsx`.
4. **`test/estatico/*.test.ts`: o mesmo bloco de ajuda repetido em quatro arquivos.**
   - Problema: `raiz`, `globSync(..., { cwd: raiz })` e `readFileSync` se repetem nos quatro.
   - Razão: é pouco código, e o custo de deixar está só na manutenção.
   - Correção: um `test/estatico/varredura.ts`, quando houver um quinto estático.

## Decisões tomadas

- **`pronto`, e não `devolvido`.** Os quatro pareceres são Minor pela seção 12 do padrão técnico. O que a T13 garante
  hoje está provado pelo verificador.
- **O parecer 1 vai para antes da T16, e não para esta volta.** A lista de métodos é a do plano. A primeira rota de
  negócio chega na T16, e corrigir antes dela fecha a brecha sem gastar uma volta da T13.
- **As mudanças de comentário em `src/` ficam aceitas.** O passo 3 do plano as pede, e manter a regra também para
  comentário deixa o teste sem exceção.

## Pendências

- **Para a `06-T13-testes` (qa-automacao):** os pareceres 1 a 3 podem entrar como reforço de teste nesta etapa:
  - `HEAD` e `OPTIONS` na varredura;
  - a lista exata de rotas públicas;
  - `new Date` sem parênteses e `.test.tsx`.

  Se não entrarem aqui, ficam para o engenheiro da T16, antes da primeira rota de negócio.
- **Para a T16 em diante:** valem as três condições da entrega do engenheiro:
  - a rota é exportada por `rota()`;
  - `meta.rota` é igual ao caminho do arquivo;
  - `params` é declarado na rota dinâmica.

  Parâmetro com nome fora de `id`, `espId`, `rskId`, `decId` e `agente` precisa de `exemplo` explícito.
- **Para T23, T25, T29, T30 e T33:** os arquivos que podem citar as chaves são os da regex de
  `test/estatico/variaveis.test.ts:10-14`. Mudar essa lista pede o tech-lead.
- **Fora da T13:** o aviso `[UNDICI-FETCH-patch]` na saída da suíte vem de um teste anterior. Não muda nenhum
  resultado. Fica para a revisão da tarefa dona, ou para a `08-revisao`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 53c649121dafbbdaa855ea4f82b8cc65717682c9` — 10 arquivos: 5 testes novos, `test/requisicao.ts`, 2 comentários em `src/`, a entrega e o registro
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 53c649121dafbbdaa855ea4f82b8cc65717682c9 -- src test` — diff do código revisado
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 70 arquivos, 1086 de 1086
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
