---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T32-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12 e o resto), 2026-10-25-ws-orquestrador-demandas-plano.md (início, G1 a G6, mapa das fases, T31 fim, T32, T33, T34, T35), 06-T32-engenheiro-backend.md, 06-T31-tech-lead.md (formato), commit 9e62fc2 (git show --stat e git show -- scripts), scripts/criar-usuario.ts, scripts/criar-usuario.test.ts, scripts/desativar-conta.ts, scripts/desativar-conta.test.ts, scripts/lib/argumentos.ts, scripts/lib/saida.ts, scripts/migrate.ts, src/modules/acesso/auth.ts, src/modules/acesso/exigir-pessoa.ts, src/modules/acesso/ator.ts, src/modules/historico/registrar.ts, src/db/schema/acesso.ts, src/lib/log.ts, test/auth.ts, saída do pnpm test gravada pela ferramenta nesta etapa (fim)]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T32 (scripts de conta: criar usuário e desativar conta), `engenheiro-backend`, 1ª tentativa, commit
`9e62fc2`. Não há problema Critical nem Important, e a tarefa entra. Os quatro pontos abaixo são Minor e ficam em
Pendências.

### O que foi conferido

- **Escopo.**
  - O commit cria exatamente os seis arquivos do plano: `scripts/criar-usuario.ts`, `scripts/criar-usuario.test.ts`,
    `scripts/desativar-conta.ts`, `scripts/desativar-conta.test.ts`, `scripts/lib/argumentos.ts` e
    `scripts/lib/saida.ts`. Além deles, só a entrega e o `passagens.jsonl`.
  - Nenhum arquivo existente mudou. A árvore está limpa no ramo `construcao/DEC-DEM-20261022-0001-v1`.
- **Desvios da entrega.** Aceitos os cinco, porque nenhum muda contrato de outra tarefa:
  - `DepsDoScript = Pick<Deps, ...>` aceita `Deps`, que é a interface do plano, e deixa o `main` sem subir o pg-boss.
    É o mesmo critério da T31.
  - Gravar `user`, `account` e o evento pelo Drizzle numa transação só, com o hash do próprio Better Auth
    (`$context.password.hash`). A razão é a atomicidade: com o `internalAdapter`, as três gravações ficariam separadas.
    O teste de login com a senha gerada (200, sem `twoFactorRedirect`, sessão com `twoFactorEnabled: false`) prova que
    o Better Auth aceita a linha. O schema `user` tem `createdAt` e `updatedAt` com padrão do banco, como o comentário
    de `acesso.ts` define (G3.4).
  - `two_factor_enabled = false` na desativação deixa o estado gravado coerente com o `two_factor` apagado.
  - Devolver `false` para conta já desativada torna a operação idempotente, sem evento repetido.
  - `entidade: 'usuario'` e o id do usuário seguem os eventos de 2FA da T09 (`auth.ts:47-50`).
- **RF-01 e C-08.**
  - A senha tem 24 caracteres de `randomBytes(18)` em base64url (144 bits), acima do mínimo de 20 de `auth.ts:93`.
  - A senha sai uma vez na `saida`, só depois do commit da transação. O teste confere uma ocorrência, a ausência no log,
    no hash e no evento.
  - O evento `conta_criada` tem ator `sistema` e `depois: { papel }`, sem e-mail, nome nem senha (C-30).
  - A conta nasce sem 2FA. O teste mostra que `exigirPessoa` devolve `sem_2fa` (C-08, C-04 c).
  - O e-mail é gravado e procurado em minúsculas, como o Better Auth compara no login. O teste usa um e-mail com
    maiúsculas e entra com o minúsculo.
  - E-mail repetido dá `conflito`, sem saída nem segunda conta. A corrida entre duas criações cai no `UNIQUE` e no
    tratamento do `23505` (ver parecer 2).
- **C-37.**
  - `argumentosCriarUsuario` é o `z.strictObject` do plano, sem `--senha`. A função valida de novo.
  - `lerArgumentos` recusa `--senha x` e `--senha=x` com a mensagem que cita o nome e nunca o valor. O teste procura a
    sentinela no erro serializado, na mensagem e em `mensagemDeErro`.
  - O nome exibido passa por `NOME_SEGURO`; fora dele, vira `--*`. Isso protege o caso de alguém colar a senha no lugar
    do nome do argumento.
  - Papel fora de `PAPEIS` é recusado (`admin`, `agente`, `CTO` e vazio).
  - O código não lê `SENHA` nem `PASSWORD` do ambiente. O teste com as duas definidas dá 401 no login com a sentinela.
- **T-04 e LGPD D6.**
  - Numa transação, com `SELECT ... FOR UPDATE`: `desativado_em` e `updated_at` pelo `Relogio`, 2FA desligado, e
    `session`, `two_factor` e a `account` `credential` apagados. Evento `conta_desativada` sem o e-mail.
  - O teste confere o cookie antigo (`get-session` nulo), o login recusado e a outra conta intacta.
  - A corrida entre o login e a desativação está fechada: uma sessão criada depois do commit não passa, porque
    `exigirPessoa` recusa a conta com `desativadoEm` (`exigir-pessoa.ts:23`). E a conta com 2FA perde o `two_factor`,
    então não termina a verificação do código.
  - A linha de `user` fica, como o plano define (só `desativado_em`), porque histórico e decisões apontam para ela.
- **C-21, C-33 e erros.**
  - O log leva só `evento`, `atorTipo` e `quantidade`, todos na lista de permissão de `log.ts`.
  - `mensagemDeErro` devolve a mensagem pt-BR do `ErroDominio`, os nomes das variáveis da configuração inválida, ou só
    a classe e o código. O teste do `23505` com `detail` sentinela confirma que a mensagem do Postgres não sai.
  - O `rodarScript` usa o `lerConfigApp`, a mesma conferência do boot, e não lê `DATABASE_URL_MIGRATOR` (C-27). O teste
    com configuração faltando cita `BETTER_AUTH_SECRET` sem a URL do banco.
  - O pool é fechado no `finally`, e qualquer falha sai com código 1.
- **Reuso.** O `main` usa `ehExecucaoDireta` de `scripts/migrate.ts`, que não roda nada ao ser importado. A transação
  usa `comTransacao`, o evento usa `registrarEvento`, e o erro usa `deZod`, `ErroDominio` e `reduzirErro`.
- **G3.** Datas pelo `Relogio`, só query builder do Drizzle, sem `sql.raw`, dados fictícios (`@exemplo.test`, "Pessoa
  Ficticia", sentinelas, `CONFIG_TESTE`).
- **TDD.** Os dois arquivos de teste nasceram vermelhos, sem módulo, e cada comportamento tem caso próprio.
- **Verificação nesta etapa.**
  - Os dois arquivos novos: 18 de 18.
  - `pnpm test`: 137 arquivos, 2710 de 2710.
  - `pnpm lint` e `pnpm typecheck`: limpos.

### Pareceres (todos Minor)

1. **`test/auth.ts:1-2` e `:24`. O comentário diz que o script da T32 cria a conta pelo `internalAdapter`.**
   - Problema: depois desta tarefa, o script grava pelo Drizzle numa transação (desvio 2). As duas frases ficaram
     falsas, e a da linha 2 ("nada de inserir linha à mão") contradiz o script.
   - Razão: quem ler o ajudante vai supor que o teste e o script passam pelo mesmo caminho. O ajudante continua válido,
     porque os dois caminhos geram conta que entra. O arquivo é de outra tarefa, por isso não entra aqui.
   - Caminho: na próxima tarefa que tocar `test/` (T33 ou T34), trocar por "O teste cria a conta pelo `internalAdapter`
     do Better Auth; o script da T32 grava `user` e `account` numa transação com o mesmo hasher. Os dois entram no
     login."
2. **`scripts/criar-usuario.ts:60-63`. O tratamento do `23505` não tem teste.**
   - Problema: o caminho da corrida (duas criações do mesmo e-mail ao mesmo tempo) não é exercitado. Só a conferência
     prévia, na linha 49, é testada.
   - Razão: sem esse tratamento, a segunda criação sairia com "Não foi possível concluir (... 23505)", sem gravar nada
     nem mostrar senha. O efeito é só a mensagem menos clara num script rodado à mão, por isso é Minor.
   - Caminho: um teste com `Promise.all` de duas chamadas de `criarUsuario` com o mesmo e-mail. Uma resolve, a outra
     rejeita com `codigo: 'conflito'`, há uma conta só e uma senha só nas duas saídas.
3. **`scripts/criar-usuario.ts:51-52`. A gravação de `user` e `account` fica dentro de `criarUsuario`, e a T33 vai
   precisar dela.**
   - Problema: o seed da T33 cria contas com senha e segredo TOTP conhecidos, e não pode usar `criarUsuario`, que gera a
     senha. Se a T33 escrever outro insert, o repositório fica com três formas de criar conta (`internalAdapter` no
     teste, Drizzle no script e Drizzle no seed).
   - Razão: a seção 12 pede que nada duplique função existente. Hoje não há duplicação, mas a próxima tarefa vai
     criá-la se não houver ponto comum.
   - Caminho, para a T33: extrair de `criarUsuario` uma função `gravarConta(tx, { usuarioId, nome, email, papel, hash },
     relogio)`, que grava `user`, `account` e o evento, e usá-la no seed. A extração entra como "Modificar" na T33.
4. **`scripts/lib/saida.ts:31` e `src/lib/log.ts:74`. A linha JSON do log sai na mesma saída padrão da senha.**
   - Problema: o `log` escreve em `pino.destination(1)`, a saída padrão. A pessoa que roda o script vê a linha
     `{"evento":"conta_criada",...}` misturada com a mensagem da senha.
   - Razão: não vaza nada, porque a linha não tem a senha nem o e-mail. Só deixa a saída menos clara.
   - Caminho: para a `10-documentacao`, explicar no manual que a linha JSON é o log e que a senha está na linha
     "Senha inicial, mostrada só esta vez". Mudar o destino do log nos scripts não é necessário na 0.1.0.

### Checklist da seção 12 do padrão técnico

- [x] A tarefa faz o que o plano pede, nem mais nem menos. Só os seis arquivos do plano foram criados, e os cinco
      desvios estão justificados.
- [x] Há teste para cada comportamento novo, e ele falharia sem o código. Os dois arquivos nasceram vermelhos, e cada
      regra do plano tem caso próprio. O caminho do `23505` fica no parecer 2.
- [x] Nenhum segredo, valor de `.env` ou dado pessoal real em código, teste, log ou fixture. Os dados são sentinelas,
      domínio `.test`, "Pessoa Ficticia" e o `CONFIG_TESTE` fictício.
- [x] Entrada externa validada com Zod, e o erro não vaza detalhe. Os argumentos passam por `z.strictObject`, as funções
      validam de novo, e o erro não traz valor de argumento nem mensagem do Postgres.
- [x] Banco: não há migration nesta tarefa. As tabelas são da T04, o acesso é pelo papel do app com o query builder, e
      não há `tenant_id`.
- [x] Nada duplica função que já existe no repositório. O risco de duplicação na T33 fica no parecer 3.
- [x] Textos de interface em pt-BR. As mensagens dos scripts estão em pt-BR, e não há tela tocada nem axe a rodar.
- [x] O que é Minor foi para Pendências. Não há Critical nem Important.
- [x] Revisão do PR: não se aplica a esta etapa. Fica com a `08-revisao`.

## Decisões tomadas

- **A tarefa passa sem devolução.** Razão: não há Critical nem Important. Os quatro pontos são de comentário, cobertura
  de um caminho defensivo, reuso na próxima tarefa e clareza da saída.
- **Aceito gravar a conta pelo Drizzle, e não pelo `internalAdapter`.** Razão: conta, senha e evento entram ou saem
  juntos, e o teste de login prova que o Better Auth aceita a conta.
- **Aceito manter a linha de `user` na desativação.** Razão: é o que a interface do plano define, e
  `exigirPessoa` já recusa a conta com `desativadoEm`.
- **Aceito a desativação idempotente e o código de saída 1 quando não há conta ativa.** Razão: repetir não grava outro
  evento, e quem roda o script por automação vê que nada mudou.

## Pendências

- Para a T33 (`engenheiro-backend`):
  - parecer 3: extrair `gravarConta` de `criarUsuario` e usá-la no seed, em vez de outro insert;
  - parecer 1: corrigir o comentário de `test/auth.ts:1-2` e `:24`, se a tarefa tocar `test/` (senão, a T34);
  - `lerArgumentos`, `rodarScript`, `mensagemDeErro` e `Saida`, de `scripts/lib/`, servem aos scripts de token, preço e
    seed. O token sai pela `saida`, uma vez, como a senha aqui.
- Para a `06-T32-testes` (`qa-automacao`): o parecer 2 (corrida de duas criações do mesmo e-mail) não está coberto.
- Para a `10-documentacao`, além do que o engenheiro listou (comandos, variáveis `DATABASE_URL`, `BETTER_AUTH_SECRET`
  e `BETTER_AUTH_URL` no serviço `app`, senha não recuperável, sem reativação na 0.1.0, e-mail desativado não volta a
  ser usado): o parecer 4, a linha JSON do log na saída do script.
- Seguem abertos, sem mudança:
  - os Minor 1 a 3 da `06-T31-revisao`;
  - os Minor da `06-T30-revisao` e os Minor 1 e 3 da `06-T29-revisao`;
  - os Minor das revisões anteriores;
  - o aviso do undici "Using `patch`".

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 9e62fc2793158389e3d528a4b17a094d4ee04241` — 8 arquivos, +704: os 6 do plano, a entrega e o `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 9e62fc2793158389e3d528a4b17a094d4ee04241 -- scripts` — diff do código (saída gravada pela ferramenta; os seis arquivos novos lidos inteiros pelo Read)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/criar-usuario.test.ts scripts/desativar-conta.test.ts` — 2 arquivos, 18 de 18
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent=true --reporter=dot` — 137 arquivos, 2710 de 2710

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
