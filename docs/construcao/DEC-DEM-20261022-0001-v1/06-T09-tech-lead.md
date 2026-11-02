---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T09-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12 e seções 6 e 7), 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6 e T09), 05-tech-lead.md, 06-T09-engenheiro-backend.md, passagens.jsonl (diff do commit 526cff0), 03-ux-ui-design.md (seção 1), 04-seguranca-aplicacao.md (seções 1 e 2.1 a 2.8), commit 25f4fb4 (código e testes da T09), commit 526cff0 (regravação da entrega), src/modules/acesso/auth.ts, src/lib/erros.ts, test/auth.ts, src/modules/acesso/auth-comportamento.test.ts]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T09 (`exigirPessoa`, bloqueio da verificação, limite por IP e sessão sem 2FA). Revisei os dois commits
juntos: o 25f4fb4 tem o código e os testes, e o 526cff0 só regrava a entrega e o registro. O 526cff0 não mexe em
`src/` nem em `test/`. O que mudou nele foi a lista de comandos (saiu o `-t` com `|`) e o texto da contraprova da
`customRules`.

**Resultado: aprovada.** Nenhum problema Critical ou Important. Os cinco pareceres abaixo são Minor e foram para
Pendências.

### Checklist da seção 12 do padrão técnico

| Item | Situação | Base |
|---|---|---|
| Faz o que o plano pede, nem mais nem menos; arquivos fora da tarefa não mudaram | Cumprido | O 25f4fb4 toca só os 8 arquivos da T09: 7 novos e `auth.ts` modificado, além da entrega e do registro. Os 9 desvios da entrega são aceitos (ver Decisões) |
| Há teste para cada comportamento novo, e ele falharia sem o código | Cumprido | A segunda rodada vermelha mostra 8 falhas nos testes que dependem dos ganchos. A contraprova da `customRules` derrubou 2 testes na suíte inteira. Cada ramo de `exigirPessoa`, dos adaptadores e de `destinoSeguro` tem teste |
| Nenhum segredo, valor de `.env` ou dado pessoal real | Cumprido | Domínios `.test`, faixas de IP de documentação, "Pessoa Ficticia", `SENTINELAS`. O evento de 2FA leva só `{ twoFactorEnabled }`, e o teste confere que não aparecem o segredo, a coluna cifrada nem o e-mail. `login_falhou` sai sem o sentinela (C-21) |
| Entrada externa validada com Zod; erro sem vazar detalhe | Cumprido | A T09 não cria rota. O corpo das rotas do Better Auth passa pelo schema do próprio Better Auth. `callbackURL` passa por `destinoSeguro`, que só aceita uma lista e recusa o resto. Os `ErroDominio` levam as mensagens da 03, seção 2.8, sem dado da sessão (há teste). O 429 do bloqueio não escreve no console (há teste) |
| Banco: migration gerada, papel migrator, RLS e guarda | Não se aplica | Nenhuma migration nova; `bloqueio_verificacao` vem da T04. O teste roda com o papel da aplicação, e o `SELECT … FOR UPDATE` e o `UPDATE` passam |
| Nada duplica função que já existe | Cumprido, com 2 Minor | Pareceres 3 e 4. Os dois são temporários ou estão em arquivo fora da T09 |
| Textos de interface em pt-BR; axe nas telas tocadas | Cumprido | Nenhuma tela. Os textos de redirecionamento e de erro estão em pt-BR. O texto do bloqueio de 15 min não está na 03 (parecer 5) |
| Minor vai para Pendências; só Critical e Important bloqueiam | Cumprido | Os 5 pareceres são Minor e estão em Pendências |
| No PR: `/code-review`, correções, `/security-review` | Não se aplica nesta etapa | Fica com a `08-revisao` (G2 do plano) |

Rodei de novo `pnpm test` (38 arquivos, 725 de 725), `pnpm lint` e `pnpm typecheck` (limpos). O ramo está limpo, com o
código no 25f4fb4.

### Conferência contra o plano e os controles

- **Interfaces:** `exigirPessoa(deps: Pick<Deps, 'auth' | 'relogio'>, headers)`, `destinoSeguro`, `ROTAS_DO_PAINEL`,
  `criarPessoa` e `codigoTotp` seguem a assinatura do plano. `exigirPessoaNaPagina` e `exigirSessaoParaConfigurar2fa`
  ganharam um `deps` opcional no fim, sem mudar quem as chama.
- **Ordem das regras de `exigirPessoa`:** sem sessão, conta desativada ou sessão sem 2FA de mais de 15 min dão
  `nao_autenticado`; sem 2FA, `sem_2fa`; papel inválido, `sem_permissao`. Os 6 casos do plano estão lá, mais o limite
  exato de 15 min.
- **C-05:** `trustDevice` vira `false` no `before`, em todas as rotas de verificação. O teste confere que não sai
  cookie `trust_device` e que o login seguinte, no mesmo pote de cookies, pede o código de novo.
- **C-06:** o bloqueio é por conta, com 5 erros em 15 min, de qualquer IP, e dura 15 min. O teste mostra o 429 com o
  código certo, que um login novo de outro IP também é barrado, e os limites de 14 e 15 min. O login tem limite de 10
  por 60 s, e o teste cobre a rajada, os pares a cada 11 s e a troca de `X-Forwarded-For`.
  - As duas pendências que o `05-tech-lead.md` deixou para a T09 foram fechadas por teste. O bloqueio do plugin é uma
    camada a mais e não contradiz C-06, e a regra própria do `/sign-in` não garantia RNF-12. Não há volta ao plano.
- **C-07, C-08, C-21 e C-33:** cobertos pelo Better Auth real, com Testcontainers e só o `Date` falso (G3.4 e RNF-15).
- **C-40:** os 8 casos do plano, mais 25. `ROTAS_DO_PAINEL` bate com a 03, seção 1, sem `/entrar` e `/configurar-2fa`.

### Pareceres (todos Minor)

1. **`src/modules/acesso/auth.ts:128` e `:159` — conferir e somar não são atômicos.**
   - Problema: o `before` confere `bloqueado_ate` e o `after` soma a falha. Pedidos paralelos que passam juntos pelo
     `before` chegam todos ao plugin antes de o 5º erro gravar o bloqueio.
   - Razão para ser Minor: o ataque exige a senha. Também é contido pelo limite de 3 em 10 s por IP nas rotas
     `/two-factor/*`, pelas 5 tentativas por cookie e pelo bloqueio de 10 erros do plugin. O ganho do atacante é de
     poucas tentativas num espaço de 10^6 códigos. A `registrarFalhaDeVerificacao` já serializa a contagem com
     `FOR UPDATE`, então não se perde contagem, só o corte exato no 5º erro sob concorrência.
   - Vai para a `08-revisao` e a `08-reteste` (seguranca-aplicacao) avaliarem se pedem reserva atômica antes do plugin.
2. **`src/modules/acesso/exigir-pessoa.ts:60-71` — segunda instância do Better Auth e do pool.**
   - Problema: `depsDaPagina` monta outro `criarAuth` e outro `criarPool`, além dos da rota `[...all]`.
   - Razão: os limites em memória ficam separados por instância, e há duas conexões de pool por processo. Hoje a página
     só chama `getSession`, então o limite não é afetado.
   - Já está nas pendências da entrega: a T11 troca pelo `obterDeps`.
3. **`src/modules/acesso/exigir-pessoa.ts:16-18` e `test/sessao.ts:14` — `PAPEIS`, `Papel` e `AtorPessoa` copiados.**
   - Problema: são cópias locais de G5. Com `test/auth.ts:9`, já são três definições de `Papel`.
   - Razão: a lista de papéis pode divergir entre arquivos. A cópia é aceita porque `ator.ts` é da T10, mas a T10 deve
     trocar as três pelo import de `ator.ts`, inclusive a de `test/sessao.ts`, que a entrega não citou.
4. **`test/sessao.ts:61` e `src/modules/acesso/auth-comportamento.test.ts:63` — base32 duplicado.**
   - Problema: `base32ParaBytes` (T09) e `base32` (T08, qa-automacao) decodificam o mesmo segredo. Os ajudantes `post`,
     `get` e `novoIp` de `auth-comportamento.test.ts:37-48` também repetem `postAuth`, `getAuth` e `novoIp` de
     `test/sessao.ts`.
   - Razão: duas implementações do mesmo cálculo em teste podem divergir. Agora o ajudante comum existe em `test/`, e
     a versão local está num arquivo fora da lista da T09, por isso não bloqueia.
   - Quem tocar `auth-comportamento.test.ts` de novo passa a importar de `test/sessao.ts` (exportando
     `base32ParaBytes`).
5. **`src/modules/acesso/auth.ts:29` — texto do bloqueio fora da 03.**
   - Problema: a mensagem "Muitas tentativas de código. A verificação desta conta está bloqueada por 15 minutos." não
     está na 03. A 03 só tem o texto de um minuto.
   - Razão: G3.11 manda usar os textos da 03 por inteiro. Como é corpo de API, e a T37 traduz pelo `code`, não pela
     `message`, não bloqueia.
   - Já está nas pendências da entrega, para a `ux-ui-design` definir o texto antes da T37.

## Decisões tomadas

- **Aprovada sem devolução:** nenhum parecer é Critical ou Important. Os testes provam cada controle da T09 contra o
  Better Auth real.
- **Os desvios 1 a 9 da entrega são aceitos:**
  - (1) o `deps` opcional não muda a assinatura de uso e permite testar os redirecionamentos;
  - (2) as cópias locais vão para a T10;
  - (3) a `customRules` cobre o RNF-12, e há teste que falha sem ela;
  - (4) `Response.json` no lugar de `throw` evita o console (C-21), e há teste;
  - (5) os redirecionamentos a mais de `exigirSessaoParaConfigurar2fa` são mais restritivos e têm teste;
  - (6) a consulta da volta fica num conjunto fechado de caracteres, e o caminho continua só na lista de rotas;
  - (7) os ajudantes extras de `test/sessao.ts` evitam repetir código nas próximas tarefas;
  - (8) os testes a mais não mudam o comportamento;
  - (9) o insert direto em `evento` é o que o plano manda até a T12.
- **Os dois bloqueios ficam ligados:** o do plugin não afrouxa C-06, e o teste da sobreposição quebra se uma versão nova
  do Better Auth mudar o padrão. Nada volta ao plano.
- **O 400 `TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE` somar falha em `auth.ts:159` não é problema:** com 5 erros, o bloqueio de
  C-06 já vale antes da 6ª tentativa no mesmo cookie.
- **A regravação do 526cff0 não pede nova revisão de código:** ela não toca `src/` nem `test/`, e a suíte rodada agora
  bate com a declarada.

## Pendências

- **Para a `08-revisao` e a `08-reteste` (seguranca-aplicacao):** parecer 1. Avaliar se o corte do 5º erro precisa ser
  atômico sob concorrência, com uma reserva da tentativa no `before` dentro da mesma transação do `FOR UPDATE`.
- **T10:** trocar `PAPEIS`, `Papel` e `AtorPessoa` de `exigir-pessoa.ts`, de `test/sessao.ts` e de `test/auth.ts` pelo
  import de `ator.ts` (parecer 3).
- **T11:** trocar `depsDaPagina` e o `obterAuth` da rota `[...all]` pelo `obterDeps`, com uma instância só por processo
  (parecer 2).
- **T12:** trocar `registrarEventoDe2fa` por `registrarEvento`.
- **Próximo que tocar `auth-comportamento.test.ts`:** importar `base32ParaBytes`, `postAuth`, `getAuth` e `novoIp` de
  `test/sessao.ts` (parecer 4).
- **`ux-ui-design`, antes da T37:** texto dos bloqueios de 15 min (C-06 e o do plugin) e do
  `TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE` (parecer 5).
- **10-documentacao:** as duas camadas de bloqueio da verificação e a regra de 10 por 60 s do login no manual técnico.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 526cff0fd91eb7c60d968eb0e479390ca374b369` — só a entrega e o `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 25f4fb4` — 10 arquivos: os 8 da T09, a entrega e o registro
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 526cff0fd91eb7c60d968eb0e479390ca374b369` — diff da regravação, sem código
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 25f4fb4 -- src/modules/acesso/auth.ts src/modules/acesso/bloqueio-verificacao.ts src/modules/acesso/destino-seguro.ts src/modules/acesso/exigir-pessoa.ts` — código de produção da T09
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 25f4fb4 -- test/sessao.ts src/modules/acesso/exigir-pessoa.test.ts src/modules/acesso/destino-seguro.test.ts` — ajudantes e testes unitários
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 25f4fb4 -- src/modules/acesso/verificacao.test.ts` — teste de integração
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 38 arquivos, 725 de 725

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
