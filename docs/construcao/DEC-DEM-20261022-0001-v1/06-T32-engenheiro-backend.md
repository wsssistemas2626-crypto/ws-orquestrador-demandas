---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T32-construcao
agente: engenheiro-backend
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, 05-tech-lead.md, parada-PF-T32.md, 06-T31-engenheiro-backend.md, 2026-10-25-ws-orquestrador-demandas-plano.md (início, G1 a G6, mapa das fases, T30, T31, T32, T33, T34, rastreabilidade), 04-seguranca-aplicacao.md (início, C-06 a C-40, seção 4 D1 a D12, seções 5 e 6), src/modules/acesso/auth.ts, src/modules/acesso/exigir-pessoa.ts, src/modules/acesso/exigir-pessoa.test.ts (início), src/modules/acesso/ator.ts, src/modules/historico/registrar.ts, src/modules/retencao/expurgar.ts, src/modules/retencao/expurgar.test.ts (início), src/db/schema/acesso.ts, src/db/schema/historico.ts, src/db/privilegios.ts, src/db/index.ts, src/db/transacao.ts, src/lib/deps.ts, src/lib/env.ts, src/lib/erros.ts, src/lib/log.ts, src/lib/reduzir-erro.ts, src/lib/fila.ts, scripts/migrate.ts, scripts/migrate.test.ts, test/deps.ts, test/auth.ts, test/banco.ts, test/sessao.ts, test/sentinelas.ts, test/estatico/variaveis.test.ts, test/estatico/relogio.test.ts, test/estatico/projeto.test.ts, saída do pnpm test gravada pela ferramenta (tool-results/bzgpqhub3.txt, só o fim)]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T32: scripts de conta, para criar usuário e desativar conta. Cobre RF-01 (conta criada por script), C-08 (senha
gerada, nunca por argumento), C-37 e T-04 (LGPD D6). Esta é a primeira tentativa da etapa.

### Arquivos criados (os 6 do plano)

- `scripts/criar-usuario.ts`. Uso: `pnpm tsx scripts/criar-usuario.ts --email <e-mail> --nome <nome> --papel cto|administradora`.
  - `argumentosCriarUsuario` é o `z.strictObject` do plano (`email`, `nome` com trim de 1 a 200 caracteres, `papel` em
    `PAPEIS`). Não existe `--senha`. `ArgumentosCriarUsuario` é o tipo inferido. `TAMANHO_SENHA = 24`.
  - `criarUsuario(deps, a, saida)` devolve `{ usuarioId }`.
    - Valida `a` de novo pelo schema e, se falhar, lança `deZod` (`entrada_invalida`). Grava o e-mail em minúsculas.
    - Gera a senha com `randomBytes(18)` em base64url (24 caracteres, 144 bits) e calcula o hash com
      `auth.$context.password.hash`, o mesmo hasher que o login confere.
    - Numa transação só, grava `user` (sem 2FA), `account` (`credential`) e o evento `conta_criada`. O evento tem ator
      `sistema`, entidade `usuario` e `depois: { papel }`, sem e-mail, nome nem senha.
    - E-mail que já tem conta lança `ErroDominio('conflito')`, conferido antes e também pelo `23505` do UNIQUE. Nada é
      gravado e nada sai na saída.
    - A senha é escrita **uma vez** na `saida`, depois do commit. O log recebe só `{ evento: 'conta_criada', atorTipo }`.
  - `main` sob `ehExecucaoDireta` (o de `scripts/migrate.ts`), por `rodarScript`.
- `scripts/desativar-conta.ts`. Uso: `pnpm tsx scripts/desativar-conta.ts --email <e-mail>`.
  - `argumentosDesativarConta = z.strictObject({ email: z.email() })`.
  - `desativarConta(deps, email)` devolve `boolean`. Valida o e-mail antes do banco. Numa transação, com `SELECT … FOR
    UPDATE` do usuário:
    - grava `desativado_em = agora` (do `Relogio`) e `two_factor_enabled = false`;
    - apaga as sessões, o `two_factor` (segredo e códigos de recuperação) e a conta `credential`;
    - grava o evento `conta_desativada` (ator `sistema`, `antes: { ativa: true }`, `depois: { ativa: false }`).
  - Devolve `false`, sem mudar nada nem gravar evento, quando não há conta com o e-mail ou quando ela já estava
    desativada. Isso deixa a desativação idempotente.
  - A linha de `user` fica, porque histórico, aprovações e decisões apontam para ela.
  - O `main` sai com 0 quando desativou e com 1 quando não achou conta ativa.
- `scripts/lib/argumentos.ts`: `lerArgumentos(schema, argv)`.
  - Aceita só `--nome valor` e `--nome=valor`, cada nome uma vez.
  - Recusa, com `ErroDominio('entrada_invalida')`, o argumento solto, o repetido, o que vem sem valor e o que o
    `strictObject` não conhece (como `--senha`).
  - A mensagem cita o nome do argumento, filtrado por regex, e **nunca o valor**.
- `scripts/lib/saida.ts`: `Saida`, `DepsDoScript` (`Pick<Deps, 'db' | 'pool' | 'relogio' | 'auth' | 'config'>`),
  `mensagemDeErro(e)` e `rodarScript(executar, op?)`.
  - O `rodarScript` monta as dependências de `DATABASE_URL` pelo `lerConfigApp`, a mesma conferência do boot: pool,
    Drizzle, Better Auth e `relogioDoSistema`. Depois roda, fecha o pool e devolve o código de saída.
  - O erro vai para a saída de erro de três formas: a mensagem pt-BR do `ErroDominio`; os nomes das variáveis, quando a
    configuração é inválida; ou só a classe e o código, em qualquer outro caso (C-21).
- `scripts/criar-usuario.test.ts` e `scripts/desativar-conta.test.ts`.

### Testes criados (18 novos)

| Arquivo | Testes | O que prova |
|---|---|---|
| `criar-usuario.test.ts` | 13 | **Os 4 do plano para o criar:** C-08 (24 caracteres, uma ocorrência na saída, ausente do log, do hash e do evento, que não leva e-mail nem nome); C-37 `--senha` recusado nas formas `--senha x` e `--senha=x`, sem a sentinela no erro, e `SENHA`/`PASSWORD` no ambiente ignoradas (o login com a sentinela dá 401); C-37 papel `admin`, `agente`, `CTO` e vazio recusados; a conta entra com a senha gerada (o e-mail com maiúsculas é gravado em minúsculas), o login não pede código, a sessão vem com `twoFactorEnabled: false` e `exigirPessoa` dá `sem_2fa`. **Mais:** os argumentos válidos nas duas formas; argumento solto, repetido, sem valor, faltando e e-mail inválido recusados; `mensagemDeErro` sem o `detail` do Postgres; senhas diferentes a cada conta; e-mail repetido dá `conflito`, sem saída e sem segunda conta; entrada fora do schema chamada direto não grava nada; o `rodarScript` cria a conta e sai com 0; com `--senha` sai com 1, sem o valor e sem conta; com configuração faltando cita só os nomes das variáveis, sem a URL |
| `desativar-conta.test.ts` | 5 | **O do plano (T-04):** com uma conta com 2FA e sessão, as sessões, o `two_factor` e a `account` somem; `desativado_em` fica com a hora do relógio e o 2FA desligado; o cookie antigo não abre mais sessão e a senha não entra; o evento do sistema não leva o e-mail; a outra conta fica intacta. **Mais:** a segunda execução devolve `false` sem outro evento; o e-mail sem conta devolve `false`; o e-mail inválido é recusado antes do banco; o argumento é só `--email` |

Os testes rodam com banco real (Testcontainers), papel do app e relógio fixo nos `Deps`. As contas são fictícias
(`@exemplo.test`, "Pessoa Ficticia") e usam as sentinelas de `test/sentinelas.ts`.

### TDD: os testes foram escritos antes do código e vistos falhando

Comando: `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/criar-usuario.test.ts scripts/desativar-conta.test.ts`.
Rodou antes de qualquer código da tarefa. Trecho da saída:

```
 FAIL  scripts/criar-usuario.test.ts [ scripts/criar-usuario.test.ts ]
Error: Cannot find module './criar-usuario' imported from .../scripts/criar-usuario.test.ts
 FAIL  scripts/desativar-conta.test.ts [ scripts/desativar-conta.test.ts ]
Error: Cannot find module './desativar-conta' imported from .../scripts/desativar-conta.test.ts
 Test Files  2 failed (2)
      Tests  no tests
```

### Resultado

- Os dois arquivos novos: 18 de 18. A primeira rodada tinha 16; depois entraram os 2 testes do `rodarScript`.
- `pnpm test`: 137 arquivos e **2710 de 2710**, nenhum falhou. Nenhum teste que já existia mudou. O aviso do undici
  "Using `patch`" continua igual.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.
- `git status`: só os 6 arquivos novos do plano. Nenhum arquivo existente mudou.

### Desvios do plano

1. **As funções recebem `Pick` de `Deps`, e não `Deps`.**
   - `criarUsuario` recebe `DepsDoScript`, sem a `fila`. O script não enfileira job, e assim o `main` não sobe o
     pg-boss.
   - `desativarConta` recebe `Pick<…, 'pool' | 'relogio'>`.
   - `Deps` continua aceito nas duas, e é o que os testes passam. É o mesmo caso do desvio 1 da T31.
2. **A conta é gravada pelo Drizzle numa transação, e não pelo `internalAdapter` do Better Auth.**
   - O comentário de `test/auth.ts` diz "o mesmo caminho do script de criação de usuário (T32)". Com o
     `internalAdapter`, `user`, `account` e evento ficariam em gravações separadas, e uma falha no meio deixaria conta
     sem senha ou sem evento.
   - O hash é o do próprio Better Auth (`$context.password.hash`). O teste de login com a senha gerada prova que o
     caminho funciona.
   - Não mexi em `test/auth.ts`, que está fora da tarefa. O comentário dele fica impreciso (ver Pendências).
3. **A desativação também grava `two_factor_enabled = false`.**
   - O plano pede apagar `two_factor`. Sem desligar a flag, a conta ficaria marcada com 2FA ativo e sem segredo.
   - Sem a conta `credential` a pessoa não entra de qualquer jeito, mas o estado gravado fica coerente.
4. **`desativarConta` devolve `false` também para conta já desativada**, sem gravar outro evento. O plano não define o
   caso. Assim a operação pode ser repetida sem efeito.
5. **O plano não define `entidade` e `entidadeId` dos eventos.** Usei `entidade: 'usuario'` e o id do usuário, como
   nos eventos de 2FA da T09.

## Decisões tomadas

- **Senha com `randomBytes(18)` em base64url.** Razão: dá exatamente 24 caracteres, com 144 bits e sem viés de
  alfabeto, acima do mínimo de 20 do `auth.ts`.
- **A senha só vai à saída depois do commit.** Razão: se a transação falhar, nenhuma senha aparece para uma conta que
  não existe.
- **E-mail em minúsculas ao gravar e ao procurar.** Razão: o Better Auth compara assim no login. Sem isso, o mesmo
  e-mail com maiúsculas criaria uma segunda conta que nunca entra.
- **`lerArgumentos` cita o nome e nunca o valor.** Razão: num `--senha valor` por engano, o valor não pode ir para a
  saída de erro, que fica no histórico do terminal e no log do contêiner (C-37).
- **`rodarScript` usa o `lerConfigApp`.** Razão: o script exige as mesmas variáveis do app, com a mesma conferência
  (C-33). Ele não lê a URL do migrator, e a guarda de C-27 continua valendo.
- **A linha de `user` não é apagada na desativação.** Razão: histórico, aprovações e decisões apontam para ela. O que
  autentica (sessão, senha, TOTP e códigos) sai.
- **Os dois scripts saem com código diferente de 0 em qualquer falha.** Razão: quem roda pelo terminal ou por automação
  vê a falha sem precisar ler o texto.

## Pendências

- **Para a `06-T32-revisao`, sobre `test/auth.ts`:** o comentário diz que a conta é criada "pelo `internalAdapter` do
  próprio Better Auth, o mesmo caminho do script de criação de usuário (T32)". Depois desta tarefa o script grava pelo
  Drizzle numa transação (desvio 2). O ajudante de teste continua válido, porque os dois caminhos geram conta que entra,
  mas a frase ficou imprecisa. Corrigir é mudança de uma linha num arquivo fora desta tarefa.
- **Para a T33:** `scripts/lib/argumentos.ts` (`lerArgumentos`) e `scripts/lib/saida.ts` (`rodarScript`,
  `mensagemDeErro`, `Saida`) servem aos scripts de token, preço e seed. O token sai pela `saida`, uma vez, como a senha
  aqui.
- **Para a `10-documentacao` (manual técnico e `deploy.md`):**
  - os dois comandos de uso, que exigem `DATABASE_URL`, `BETTER_AUTH_SECRET` e `BETTER_AUTH_URL` no ambiente do
    serviço `app`;
  - a senha aparece uma vez no terminal e não é recuperável. Se for perdida, a conta é desativada e criada de novo;
  - a desativação não reativa a conta. Reativação não existe na 0.1.0;
  - um e-mail desativado não pode ser usado em conta nova, porque a linha de `user` fica.
- Seguem abertos, sem mudança: os Minor da `06-T30-revisao` e da `06-T31-revisao`, os Minor 1 e 3 da
  `06-T29-revisao`, os das revisões anteriores e o aviso do undici "Using `patch`".

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -15` — topo ebf8524 (PF-T32 fabiano)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --stat -3` — `parada-PF-T32.md` e `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format= --diff-filter=A -- src scripts test package.json` — lista dos arquivos de código e teste já criados
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/criar-usuario.test.ts scripts/desativar-conta.test.ts` — antes do código: 2 arquivos sem módulo, nenhum teste rodou
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/criar-usuario.test.ts scripts/desativar-conta.test.ts` — depois do código: 16 de 16
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/criar-usuario.test.ts scripts/desativar-conta.test.ts` — com os testes do `rodarScript`: 18 de 18
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent=true --reporter=dot` — 137 arquivos, **2710 de 2710**
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — 6 arquivos novos, nenhum alterado

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real. Os dados são sentinelas, domínio `.test` e "Pessoa Ficticia". O segredo do Better Auth é o `CONFIG_TESTE` fictício. Os testes conferem que a senha não vai para o log nem para o evento, e que o valor de `--senha` não vai para o erro
- [x] só mudaram os arquivos da tarefa (os 6 do plano)
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno. Os argumentos dos dois scripts passam por `z.strictObject`, e as funções validam de novo. O erro sai como mensagem pt-BR, como nomes de variável ou como classe e código, sem a mensagem do Postgres
