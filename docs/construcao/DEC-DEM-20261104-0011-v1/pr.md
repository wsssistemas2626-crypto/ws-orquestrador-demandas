# Orquestrador 0.1.10: cada parte do nome do solicitante minimizada (M-1 do 0009), dica da tela e baixos do 0010 · DEC-DEM-20261104-0011-v1

## Resumo

Este é um pedido de correção (cadeia curta, risco médio) sobre a `main` (`fb675ee`, versão 0.1.9). Ele corrige o
médio M-1 que a revisão do pedido 0009 deixou como risco residual. Fabiano decidiu em 04/11 pela opção (b) refinada do
parecer da `gestao-riscos` (CA-P5-23 no backlog do `/construir`). Junto vão a dica da tela e três baixos da revisão do
0010. Fabiano autorizou a retomada autônoma de 04/11, das 7h às 15h30 de Brasília, com commit e merge.

O que mudou:

- **M-1 do 0009 (RF-20):** `minimizar` troca primeiro o nome completo de cada solicitante, sem diferença de caixa nem
  de acento. Depois troca cada parte do nome com 3 letras ou mais, desde que, no texto, a parte comece por maiúscula:
  - o nome é cortado em espaço, hífen e apóstrofo;
  - partículas e sufixos de parentesco ficam de fora (`PARTICULAS_DO_NOME`: da, dos, van, Filho, Neto, Júnior…);
  - a palavra comum em minúscula fica ("30 dias", "camisa rosa");
  - casa também com o texto em NFD e sem acento, sem alterar o original;
  - nada é trocado dentro de um marcador.

  A regra vale para a entrada do agente e para a API de quem não é pessoa. A pessoa e o Pedido de Construção continuam
  com o original.
- **Dica e aviso da tela:** `dicaNome` diz que o campo não vai ao agente e pede para não repetir o nome no texto.
  `avisoMinimizacao` diz o que é trocado e que o nome de outras pessoas não é.
- **B-3 do 0010:** nos 3 POST, os nomes do 201 vêm da linha da demanda travada (`FOR UPDATE`), dentro da transação do
  serviço. Uma falha nessa leitura desfaz tudo.
- **B-2 do 0010:** `reduzirErro` usa `e.name` só se for texto aceito por `classeAceita`.
- **B-4 do 0010:** `capturarErro` marca o objeto só depois do envio ao Sentry.
- **Versão e documentação:** 0.1.10 em `CHANGELOG.md`, `deploy.md` (volta para a `v0.1.9` pelo caminho A), README e
  manual técnico. A documentação diz o que a regra troca e o que sobra.

Sem migration, coluna, dependência ou variável de ambiente nova. Nada muda em `src/db/`, `drizzle/`, `scripts/`, `e2e/`
nem `.github/`.

## Etapas e tempos

| Etapa | Passagens | Minutos |
|---|---|---|
| 01 reprodução (qa-funcional) | 1 | 5 |
| 02 triagem (tech-lead) | 1 | 4 |
| 03 correção (engenheiro-backend) | 1 | 34 |
| 04 regressão (qa-automacao) | 1 | 33 |
| 04 revisão (maestro) | 1 | 0 |
| 05 entrega (devops-sre) | 1 | 2 |
| 06 documentação (documentacao-tecnica) | 1 | 6 |
| **Total** | **7** | **84** |

Nenhum bloqueio e nenhuma volta.

## Verificação (`verificar`)

| Verificação | Resultado | Detalhe |
|---|---|---|
| ramo | ok | `construcao/DEC-DEM-20261104-0011-v1` |
| árvore limpa | ok | limpa |
| versão | ok | 0.1.9 → 0.1.10 |
| changelog | ok | seção 0.1.10 |
| ci | ok | `.github/workflows/ci.yml` |
| remoto | ok | github.com/wsssistemas2626-crypto/ws-orquestrador-demandas |
| test | ok | 4.081 de 4.081 |
| lint | ok | limpo |
| typecheck | ok | limpo |

## Homologação (`homologar`)

| Verificação | Resultado | Detalhe |
|---|---|---|
| subir | ok | http://127.0.0.1:3200 |
| saúde | ok | `/api/saude` respondeu 200 |
| e2e | ok | 143 passaram, contra o build de produção |
| derrubar | ok | projeto e volumes removidos |

## Ensaio de rollback (`ensaiar-rollback`)

| Verificação | Resultado | Detalhe |
|---|---|---|
| migrations da `main` | ok | nenhuma alterada |
| migrations novas | ok | nenhuma |
| versão anterior | ok | a versão da `main` respondeu 200 em 264 s |
| backup | ok | 106 KB, impressão `2d54520aff856376` |
| versão nova | ok | a versão do ramo, sobre o banco da `main`, respondeu 200 em 51 s |
| restauração | ok | o banco ficou igual ao backup (impressão `2d54520aff856376`) |
| volta | ok | a versão da `main` voltou sobre o banco migrado e de novo sobre o backup, e respondeu 200 em 11 s |
| ida de novo | ok | a versão do ramo, depois da volta, respondeu 200 em 44 s |
| derrubar | ok | projeto e volumes removidos |

Voltar desta versão para a anterior **não** exige restaurar o backup (`volta_sem_restaurar: true`). Nenhuma migration
altera dado existente.

## Testes

- Unidade e integração: 4.081 de 4.081.
  - A 03 deixou 4.055, depois de ver falhar na base 58 testes dos 4 grupos.
  - A 04 acrescentou 26, entre eles a integração pelos quatro agentes, pelas sete leituras e pelo Pedido de Construção,
    com palavra comum em minúscula e o original para a pessoa.
- Ponta a ponta: 143 de 143 na homologação; na 04, 143 de 143 em três rodadas seguidas.
- `pnpm build` passou na 05; o `docker build` roda na homologação e no CI.

## Achados da revisão (04)

Revisões feitas:
- leitura do diff de `src/` pelo maestro;
- agente `feature-dev:code-reviewer`, sem achado de confiança alta;
- agente `seguranca-aplicacao`, sobre o commit da correção, `f5b363b`, com mais de 30 casos de borda rodados em memória
  e medição de tempo.

- **Crítico e Alto:** nenhum.
- **M-a (médio, já existia na `main`, fora do diff):** a regex de e-mail (`detectores.ts:9`) tem custo quadrático numa
  sequência longa de caracteres sem `@`. Com 30 mil caracteres leva 1,7 s, e com 100 mil, 20,6 s. Só pessoa
  autenticada dispara.
- **B-1:** o nome grudado em número, `_` ou CamelCase sai em claro.
- **B-2:** o usuário de e-mail com acento sai cortado. Já existia.
- **B-3:** um getter que lança faz `reduzirErro` lançar.
- **B-4:** o aviso e a dica não dizem o limite de 3 letras, as partículas nem o nome em minúscula.
- **Registro:** uma palavra com maiúscula igual a uma parte do nome ("Santos" cidade) vira marcador. É falso positivo
  aceito.

## Pendências

- **Pedido `DEC-DEM-20261104-0012-v1`, já preparado:** o M-a e os baixos B-1 a B-4.
- **Para Fabiano:** o pedido do Pedido de Construção sem nome de pessoa, com os pareceres de `gestao-riscos`,
  `juridico-contratos` e `seguranca-aplicacao` de 04/11. Até ele sair, nenhum Pedido gerado de demanda real.
- **Para Fabiano, a primeira publicação (CA-P5-16):**
  - o QR da 2FA;
  - os segredos e a credencial do GHCR;
  - os serviços no Easypanel;
  - a seção 4 do `deploy.md`, com snapshot no hPanel antes.

  Pelo parecer da `gestao-riscos`, nenhum agente é ligado e nenhum token é emitido antes do aceite do J-03.
- **Para a `ux-ui-design`:** revisar `dicaNome` e `avisoMinimizacao`.

## Publicação

Esta versão não tem migration nova. No push da `main`, o `deploy.yml` publica a imagem no GHCR com as tags sha, v0.1.10
e latest, e chama os webhooks do Easypanel. Os segredos dos webhooks ainda não existem, então esse passo fica vermelho e
nada vai para produção. Se for preciso voltar, o caminho A da seção 6 do `deploy.md` leva à `v0.1.9`.

Merge: pela política (`construir.mjs merge`, CA-P7-05) quando ela está ligada e permite; senão, de Fabiano. Serviço no
Easypanel é ação de Fabiano.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
