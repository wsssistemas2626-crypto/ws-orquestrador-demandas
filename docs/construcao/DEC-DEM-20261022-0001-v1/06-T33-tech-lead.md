---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T33-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12 e o resto), 2026-10-25-ws-orquestrador-demandas-plano.md (início, G1 a G6, mapa das fases, T31 fim, T32, T33, T34, T35, T36 início), 04-seguranca-aplicacao.md (início, 2.16 e 2.17, seção 3 C-01 a C-40, seções 4 a 6), 06-T33-engenheiro-backend.md, 06-T32-tech-lead.md, commit 5f939ac (git show --stat e git show dos scripts e do package.json), scripts/scripts.test.ts, scripts/definir-preco-modelo.ts (linhas 33 a 36), scripts/seed-ficticio.ts (linhas 186 a 197), scripts/start-hml.ts (linhas 28 a 47), scripts/lib/saida.ts, src/modules/acesso/tokens-servico.ts, src/modules/historico/registrar.ts, src/modules/pacotes-decisao/criar.ts, src/modules/avisos/aviso-dec.ts (início), src/modules/agentes/preco.ts, test/sessao.ts, saída do pnpm test gravada pela ferramenta nesta etapa (fim)]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T33 (scripts de token, preço, seed fictício e subida da homologação), `engenheiro-backend`, 1ª tentativa,
commit `5f939ac`. Não há problema Critical nem Important, e a tarefa entra. Os cinco pontos abaixo são Minor e ficam em
Pendências.

### O que foi conferido

- **Escopo.**
  - O commit cria os sete arquivos do plano e acrescenta ao `package.json` a linha `"start:hml": "tsx scripts/start-hml.ts"`.
    Além deles, só a entrega e o `passagens.jsonl`.
  - A única mudança fora da lista do plano é `scripts/criar-usuario.ts`, com a extração de `gravarConta`. Ela foi pedida
    pelo parecer 3 da `06-T32-revisao` como "Modificar" na T33. O comportamento ficou igual: os testes da T32 passam sem
    edição (43 de 43 nos dois arquivos de scripts).
  - A árvore está limpa no ramo `construcao/DEC-DEM-20261022-0001-v1`.
- **Desvios da entrega.** Aceitos os onze, porque nenhum muda o contrato de outra tarefa:
  - `Pick<Deps, ...>` e `Saida` aceitam o `Deps` e o `Writable` do plano. É o mesmo critério da T31 e da T32.
  - `t?` em `definirPrecoModelo` segue a G3.8, e o seed grava o preço na transação dele.
  - O `env` como `Record<string, string | undefined>` tem o mesmo motivo do `lerConfigApp`.
  - Recusar banco que já tem conta é mais restrito que o 02 e fecha o caso de contas de senha pública nascerem ao lado
    de conta real. A homologação não perde nada, porque a primeira subida acha o banco vazio.
  - `entidade: 'token_servico'` e `entidadeId` = prefixo: `criarTokenServico` não devolve o id da linha, e o prefixo é o
    que identifica o token na revogação e no histórico (C-09).
  - Tirar `DATABASE_URL_MIGRATOR` do ambiente do app filho cumpre a ADR-12 e o item 6 da seção 5 do 04.
  - Os argumentos `--entradaPorMilhao` e `--saidaPorMilhao` em camelCase têm a razão escrita (o `deZod` mascara o
    segmento com hífen).
  - Os demais (`nome` e `papel` em `CONTAS_FICTICIAS`, evento `2fa_ativado` do sistema, `NOREPLICATION NOBYPASSRLS`)
    só acrescentam informação.
- **RF-02, C-09 e C-37 (token).**
  - O token vem de `criarTokenServico` (T10), com 32 bytes de `randomBytes` e prefixo `wsod_`. O banco guarda só o
    SHA-256.
  - O token sai uma vez na `saida`, só depois do commit. O log leva `evento`, `atorTipo` e `agente`, sem o token.
  - `token_criado` e `token_revogado` são do ator `sistema` e levam o prefixo, nunca o token.
  - A revogação é idempotente (`false` sem evento quando não há token ativo). O prefixo é validado pela mesma regex do
    gravado antes de tocar o banco.
  - `--token` e `--senha` são recusados pelo `z.strictObject`, sem o valor no erro. Nenhum script lê token nem senha do
    ambiente.
  - Os testes cobrem tudo isso, inclusive o token continuar valendo no `validarTokenServico` e o outro token do mesmo
    agente seguir válido depois da revogação.
- **RF-17 e C-26 (preço).**
  - O preço só entra pelo script, e preço novo é linha nova. O teste mostra as duas vigências pelo `precoVigente`.
  - O schema respeita o `numeric(12, 6)` sem arredondar em silêncio. Valor da linha de comando só com ponto decimal.
    `23505` vira `conflito`.
- **Seed (padrão técnico, seção 9; C-33; C-37).**
  - As guardas são `SEED_FICTICIO` exatamente `1`, banco sem demanda e sem conta. Testadas com vazio, `0`, `true`,
    ` 1`, com demanda e com conta.
  - Tudo numa transação, sob `pg_advisory_xact_lock`. A conta passa por `gravarConta`, o mesmo caminho do
    `criar-usuario`, e não há terceira forma de criar conta.
  - O 2FA é cifrado pelo `symmetricEncrypt` do Better Auth com o segredo do `$context`. O teste de login com
    `codigoTotp(segredoTotp)` contra o Better Auth instalado prova o formato e a chave.
  - ESP, RSK e DEC passam pelos serviços da API com o ator agente, como o worker grava. A demanda termina em
    `pronta_para_decisao` e o aviso é agendado na mesma transação.
  - Os dados são só fictícios: `@ficticio.test`, "Pessoa Ficticia" e textos inventados. Senhas e segredos são públicos de
    propósito, como o plano define, e sem o formato `wsod_`.
  - O log do seed não tem senha nem e-mail, e o teste confere isso.
- **ADR-12 (`start:hml`).**
  - A ordem é migrar com o migrator → seed → app. Uma falha em qualquer passo não sobe o app e sai com 1.
  - A mensagem de erro leva só a classe e o código, ou o nome da variável. O teste com a senha sentinela na URL do
    migrator confirma.
  - Na segunda subida, o seed recusa e o app sobe. A migração de verdade é idempotente, e o código do app volta como o
    do script.
- **`criar-papeis.sql` (C-34).** Tem um comando só, testado no Postgres real, com o papel renomeado e numa transação
  desfeita: login sim, sem `rolsuper`, `rolcreatedb`, `rolcreaterole`, `rolreplication` nem `rolbypassrls`.
- **Reuso.** Os scripts usam `lerArgumentos`, `rodarScript`, `mensagemDeErro`, `ehExecucaoDireta`, `comTransacao`,
  `registrarEvento`, `deZod`, `reduzirErro`, `criarTokenServico`, `revogarTokenServico`, `LIMITE_MODELO` e
  `formatarDataHora`. O `base32` do seed codifica e o `base32ParaBytes` de `test/sessao.ts` decodifica. São sentidos
  opostos, e não há duplicação.
- **G3.** Datas pelo `Relogio`. Não há `new Date()` sem argumento nem `Date.now()` nos arquivos novos. Só query builder e
  `sql` com parâmetro, sem `sql.raw`, e sem `console`.
- **TDD.** O arquivo de teste nasceu vermelho, sem módulo, como mostra a entrega. Cada comportamento do plano tem caso
  próprio. As exceções estão nos pareceres 2 a 4.
- **Verificação nesta etapa.**
  - `scripts/scripts.test.ts` e `scripts/criar-usuario.test.ts`: 43 de 43.
  - `pnpm test`: 138 arquivos, 2744 de 2744.
  - `pnpm lint` e `pnpm typecheck`: limpos.

### Pareceres (todos Minor)

1. **`scripts/definir-preco-modelo.ts:34`. A tolerância de `ate6Casas` é absoluta (`< 1e-6`) e recusa preço grande
   válido.**
   - Problema: para valores a partir de dezenas de milhares com 6 casas (por exemplo, `123456.123456`), o erro de ponto
     flutuante de `n * 1_000_000` passa de `1e-6`. O schema devolve "Use no máximo 6 casas decimais." para um valor que
     cabe no `numeric(12, 6)` e que o comentário da linha 7 diz aceitar.
   - Razão: o efeito real é nulo, porque os preços de modelo ficam entre centavos e algumas dezenas de dólares por
     milhão. Mas a regra escrita e a regra executada divergem, e o teste não cobre o limite alto (só `1_000_000`
     recusado).
   - Caminho: trocar por `(n) => Number(n.toFixed(6)) === n` e acrescentar ao teste `999999.999999` e
     `123456.123456` aceitos.
2. **`scripts/scripts.test.ts:362-370`. O teste de C-33 procura o base32, mas o seed grava o segredo cru.**
   - Problema: o seed cifra `SEGREDO_CRU` (`seed-ficticio.ts`), e o teste confere que a coluna não contém o
     `segredoTotp` base32. Se a cifragem fosse tirada e o segredo cru gravado em claro, este teste continuaria verde.
     O mesmo vale para os códigos de recuperação, que o teste não confere.
   - Razão: o controle está provado por outro caminho. O login com 2FA (`scripts.test.ts:335-350`) falharia sem a
     cifragem, porque o plugin decifra o segredo antes de conferir o código. Por isso é Minor. O caso que leva o nome de
     C-33, porém, não prova o que diz.
   - Caminho: conferir também a ausência do segredo cru, decodificando o `segredoTotp` (o mesmo cálculo de
     `base32ParaBytes`, em `test/sessao.ts`) ou exportando `SEGREDO_CRU`. Conferir ainda que `backup_codes` não é um
     JSON legível (`JSON.parse` falha ou não dá lista de dez códigos).
3. **`scripts/seed-ficticio.ts:195`. A trava consultiva não tem teste.**
   - Problema: a entrega afirma que duas subidas ao mesmo tempo semeiam uma vez só, mas nenhum teste roda duas chamadas
     concorrentes.
   - Razão: sem a trava, a segunda transação bateria no `UNIQUE` do e-mail e o `start:hml` sairia com 1 em vez de subir
     o app. Na homologação há uma réplica só, então o efeito é pequeno.
   - Caminho: num banco novo, `Promise.all` de duas chamadas de `seedFicticio(deps, { SEED_FICTICIO: '1' })`. O esperado
     é um `semeado` e um `recusado`, com quatro contas e cinco demandas.
4. **`scripts/start-hml.ts:30-46`. O caminho de verdade (`spawn` de `pnpm start` e repasse de `SIGTERM` e `SIGINT`) não
   tem teste.**
   - Problema: todos os testes trocam `iniciarApp`. O repasse de sinal e a tradução do código de saída do filho não são
     exercitados.
   - Razão: o caminho é curto e vai rodar de verdade no `construir.mjs homologar` e no `ensaiar-rollback` da 09. Lá
     aparece se o `pnpm` repassa o sinal ao `next start` e se o contêiner para dentro do prazo do `docker stop`.
   - Caminho: na `09-entrega`, conferir que o app da homologação para com `SIGTERM` sem esperar o `SIGKILL`. Se não
     parar, trocar o filho para `next start` direto (`pnpm exec next start -p ...`) ou ligar `init: true` no serviço.
5. **`scripts/definir-preco-modelo.ts:35`. Preço 0 é aceito.**
   - Problema: com preço 0, o custo da chamada é 0 e o teto mensal deixa de limitar aquele modelo.
   - Razão: está coerente com `calcularCusto` (`src/modules/agentes/preco.ts:23`, preço não negativo), e quem roda o
     script é Fabiano no servidor. Não é falha de código. É uma regra de operação que precisa estar escrita.
   - Caminho: para a `10-documentacao`, registrar no manual que preço 0 desliga o efeito do teto para o modelo e só deve
     ser usado de propósito.

### Checklist da seção 12 do padrão técnico

- [x] A tarefa faz o que o plano pede, nem mais nem menos. Só os sete arquivos do plano e o `package.json` foram
      tocados, mais a extração de `gravarConta` que a `06-T32-revisao` pediu para esta tarefa.
- [x] Há teste para cada comportamento novo, e ele falharia sem o código. Os 24 testes nasceram vermelhos. Ficam como
      Minor a trava consultiva (parecer 3), o `spawn` de verdade (parecer 4) e a forma do teste de C-33 (parecer 2), que
      o teste de login já cobre.
- [x] Nenhum segredo, valor de `.env` ou dado pessoal real em código, teste, log ou fixture. As credenciais de
      `CONTAS_FICTICIAS` e a senha de `criar-papeis.sql` são fictícias e públicas de propósito, como o plano define.
      Tudo usa `@ficticio.test`, "Pessoa Ficticia" e sentinelas.
- [x] Entrada externa validada com Zod, e o erro não vaza detalhe. Os argumentos dos quatro scripts passam por
      `z.strictObject`, e as funções validam de novo. O erro sai em pt-BR, como nome de variável ou como classe e
      código.
- [x] Banco: não há migration nesta tarefa. Tudo passa pelo papel do app com o query builder. O migrator só aparece
      no `start:hml` (C-27), e não há `tenant_id`.
- [x] Nada duplica função que já existe no repositório. `gravarConta` acabou com a duplicação que a T32 previa.
- [x] Textos de interface em pt-BR. As mensagens dos scripts estão em pt-BR, e não há tela tocada nem axe a rodar.
- [x] O que é Minor foi para Pendências. Não há Critical nem Important.
- [x] Revisão do PR: não se aplica a esta etapa. Fica com a `08-revisao`.

## Decisões tomadas

- **A tarefa passa sem devolução.** Razão: não há Critical nem Important. Os cinco pontos são de precisão numérica fora
  da faixa de uso, de forma de teste, de cobertura de caminho defensivo e de operação.
- **Aceito o seed recusar banco com conta.** Razão: é mais seguro que a guarda do 02 e não custa nada à homologação.
- **Aceito o evento de token com `entidade: 'token_servico'` e o prefixo como `entidadeId`.** Razão: o plano não fixa a
  entidade, e o prefixo é o identificador público do token, o mesmo que a revogação usa.
- **Aceito tirar `DATABASE_URL_MIGRATOR` do app filho.** Razão: cumpre a ADR-12 e o O-01 da spec também na
  homologação.

## Pendências

- Para a `06-T33-testes` (`qa-automacao`):
  - parecer 2: o teste de C-33 deve conferir a ausência do segredo cru e dos códigos de recuperação em claro;
  - parecer 3: a concorrência de duas chamadas do seed;
  - parecer 1: os limites altos do preço (`999999.999999` e `123456.123456`). Se o teste ficar vermelho, a correção de
    `ate6Casas` fica com o `engenheiro-backend` numa tarefa que toque `scripts/`.
- Para a `09-entrega` (`devops-sre`):
  - parecer 4: conferir que o app da homologação para com `SIGTERM` dentro do prazo do `docker stop`;
  - a varredura de segredo de C-39 pode acusar as senhas fictícias de `scripts/seed-ficticio.ts` e
    `scripts/hml/criar-papeis.sql`. Elas são públicas de propósito, então a regra de exceção deve citar só esses dois
    arquivos;
  - o que o engenheiro listou: `tsx` e `pnpm` na imagem da homologação, `criar-papeis.sql` em
    `/docker-entrypoint-initdb.d/`, as variáveis do app da homologação e o worker sem `DATABASE_URL_MIGRATOR`.
- Para a `10-documentacao`: o parecer 5 (preço 0) e os itens que o engenheiro listou. São eles: os três comandos, o
  token não recuperável, o preço em dólar com ponto decimal, as guardas do seed, `start:hml` só na homologação, as
  contas `@ficticio.test` nunca em produção e a linha JSON do log na saída.
- Para a T34: o parecer 1 da `06-T32-revisao` (o comentário de `test/auth.ts:1-2` e `:24`) segue aberto. Agora o
  comentário deve citar também o seed, que grava pelo `gravarConta`.
- Para o maestro: a entrega do engenheiro declara a leitura do início de `node_modules/better-auth/package.json`, que o
  git não rastreia. Nada no código depende dela, e o formato foi provado pelo teste de login.
- Seguem abertos, sem mudança:
  - os Minor 2 e 4 da `06-T32-revisao`;
  - a observação do `qa-automacao` na T32 sobre exportar o `main` de `desativar-conta.ts`;
  - o `--__proto__` de `scripts/lib/argumentos.ts`;
  - os Minor das revisões anteriores;
  - o aviso do undici "Using `patch`".

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 5f939ac19b169704d8647c479316ebfcba433b90` — 11 arquivos, +1332 −15: os 7 do plano, `package.json`, `scripts/criar-usuario.ts`, a entrega e o `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 5f939ac19b169704d8647c479316ebfcba433b90 -- package.json scripts/criar-usuario.ts scripts/criar-token-servico.ts scripts/revogar-token-servico.ts scripts/definir-preco-modelo.ts scripts/hml/criar-papeis.sql` — diff dos scripts de token, preço, papéis e da extração
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 5f939ac19b169704d8647c479316ebfcba433b90 -- scripts/seed-ficticio.ts scripts/start-hml.ts` — diff do seed e do `start:hml`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/scripts.test.ts scripts/criar-usuario.test.ts` — 2 arquivos, 43 de 43
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent=true --reporter=dot` — 138 arquivos, 2744 de 2744

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
