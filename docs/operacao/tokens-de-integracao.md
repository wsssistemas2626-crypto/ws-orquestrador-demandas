# Tokens das integrações `awave` e `construir`

| Campo | Valor |
|---|---|
| Versão | 0.4.1 |
| Atualizado em | 14/11/2026 (`documentacao-tecnica`, pedido 0018: o token `construir` passou a ler a situação do pedido, com a ação `ler_situacao_pedido`, sem mudar a emissão; o que essa leitura acrescenta a um vazamento); 13/11/2026 (`documentacao-tecnica`, pedido 0017: o token `construir` passou a escrever o andamento, com a ação `registrar_andamento`, sem mudar a emissão; onde o envio do andamento lê o token; suspeita de vazamento pede revogação imediata; como achar o que um prefixo gravou); 12/11/2026 (`documentacao-tecnica`, pedido 0019: a limitação da 0.3.0 saiu; os tokens de produção se emitem com a 0.3.1 no ar); 12/11/2026 (`documentacao-tecnica`, pedido 0016: primeira versão) |
| Dono | `documentacao-tecnica` (operação: `devops-sre`; sistema: Fabiano) |
| Quem executa | Fabiano. Emitir, trocar e revogar token de produção é ação dele, no console do serviço `app` do Easypanel |
| Situação | vigente, ainda não executado em produção. A primeira execução é a UAT da 0.3.0 (UAT-03, UAT-09, UAT-10 e UAT-12 de `docs/construcao/DEC-DEM-20261111-0016-v1/07-qa-funcional.md`, seção 7), que também testa este texto |
| Fontes no código | `scripts/criar-token-servico.ts`, `scripts/revogar-token-servico.ts`, `src/modules/acesso/tokens-servico.ts`, `src/modules/acesso/matriz.ts`, `src/db/schema/acesso.ts`, `src/db/schema/andamento.ts`; do lado do `/construir`, `ferramentas/construir/buscar-pedidos.mjs` e, desde a 0.4.0, `ferramentas/construir/enviar-andamento.mjs` da estruturaAutonoma |

Desde a 0.3.0, duas integrações internas entram na API com um token próprio, fora dos agentes de IA
([manual, cap. 02](../manual-tecnico/02-acesso-e-seguranca.md#atores-de-integração-030)):

| Integração | Quem usa | O que o token permite | Onde o token mora |
|---|---|---|---|
| `awave` | o Awave (serviço `empresa-ia`), quando o dono aprova a criação de uma demanda em `/aprovacoes` | criar demanda (no máximo 10 por hora) e ler só as demandas que ele criou | no Awave, pelo card "Token do Orquestrador" em `/config`, ou nas variáveis do serviço `empresa-ia` no Easypanel. Nunca no repositório do Awave nem neste |
| `construir` | a busca automática do `/construir` (crontab do usuário `deploy`) e, desde a 0.4.0, o envio do andamento (crontab) | listar os Pedidos de Construção pendentes, buscar um pedido e confirmar o recebimento; desde a 0.4.0, **registrar o andamento** da construção, o que muda o status da demanda em dois casos; desde a 0.4.1, ler a **situação do pedido** (`vigente` ou `substituido`) | no arquivo `~/.config/ws-construir/token-orquestrador` do usuário `deploy`, com permissão 600. O `buscar-pedidos.mjs` recusa o arquivo com outra permissão. O caminho está em `pedidos/config/orquestrador.json` (`token_arquivo`) da estruturaAutonoma |

Regras que valem para os dois:

- O token aparece **uma vez só**, na saída do script de emissão. Leve-o direto ao lugar dele. Nunca o mande pelo chat,
  por e-mail, por issue, por arquivo do repositório nem por print. Anote só o **prefixo**.
- O banco guarda só o SHA-256 do token e o prefixo (8 caracteres). Ninguém recupera um token perdido: emita outro.
- O prefixo identifica o token no histórico e na revogação, sem revelá-lo.
- Revogar um token não afeta os outros, de agente ou de integração.
- **Emita os tokens de produção só com a 0.3.1 ou posterior no ar.** A 0.3.1 corrigiu os cinco médios da revisão da
  0.3.0. A 0.3.0 não vai ao ar sozinha: entra junto com a 0.3.1, pela "Publicação conjunta 0.2.0 → 0.3.1"
  ([deploy.md, seção 5](deploy.md)). Se a produção voltar para a 0.3.0 com os tokens emitidos, desligue antes a busca
  em `pedidos/config/orquestrador.json` e revogue o token `awave` (deploy.md, seção 6, "Volta da 0.3.1").

## O token `construir` escreve desde a 0.4.0

Até a 0.3.1, o token `construir` só lia o pedido e confirmava o recebimento. Desde a 0.4.0, ele tem também a ação
`registrar_andamento` ([manual, cap. 05](../manual-tecnico/05-pedido-de-construcao.md#andamento-da-construção-040)):

- ele grava a fase e as tarefas prontas de cada Pedido de Construção gerado no painel;
- ele muda o status da demanda em dois casos: de `aprovada` para `em_construcao` e de `em_construcao` para
  `devolvida`. Nunca põe `entregue` nem `encerrada`, e só age em DEC com pedido gerado por uma pessoa.

**A emissão não mudou.** É o mesmo token, com o mesmo script e o mesmo arquivo. A ação veio pela matriz do código, e
não pede token novo. Se o token `construir` de produção já existe e não foi revogado, o envio do andamento usa esse
mesmo. O envio (`ferramentas/construir/enviar-andamento.mjs`) lê o token do arquivo apontado em `token_arquivo`, no
mesmo `pedidos/config/orquestrador.json` da busca. Ele nasce desligado: só liga com `"andamento_ligado": true`, no fim
da publicação da 0.4.0 ([deploy.md, seção 5](deploy.md)).

Como o token agora escreve, um vazamento pesa mais:

- quem tem o token pode alterar a fase e os números e pôr em `em_construcao` ou `devolvida` uma demanda com pedido
  gerado. Também pode gastar as 600 gravações por hora e parar o andamento de todos os pedidos por até 1 hora;
- **na suspeita de vazamento, revogue na hora** pelo prefixo (seção 5), antes de emitir o novo. O andamento e a busca
  ficam parados até o token novo ser guardado. Cada envio leva o estado inteiro do pedido, e não um acréscimo, então o
  primeiro envio aceito depois do token novo põe o painel em dia;
- o status que mudou sem motivo se corrige pela mudança manual de status, no painel.

O arquivo do token é legível pelo usuário `deploy`, que também roda os agentes com Bash. Com a escrita, esse risco subiu
(P-04 do pedido 0017). A recomendação é o envio do andamento rodar com um usuário do sistema que os agentes não usem,
dono do arquivo do token. Isso se decide com Fabiano e a `gestao-riscos` **antes** de ligar o envio (deploy.md, seção
5, passo 8).

## O token `construir` lê a situação do pedido desde a 0.4.1

Desde a 0.4.1, o token `construir` tem também a ação `ler_situacao_pedido`
([manual, cap. 05](../manual-tecnico/05-pedido-de-construcao.md#situação-do-pedido-041)):
`GET /api/pedidos-construcao/<DEC-id>/situacao` responde `vigente` ou `substituido`.

- **A emissão não mudou.** É o mesmo token, com o mesmo script e o mesmo arquivo. A ação veio pela matriz do código. O
  lado do `/construir` que usa a rota é de outra frente, e ainda não está no ar.
- **O que ele lê:** a situação de **todo** DEC com Pedido de Construção gerado por uma pessoa, inclusive o substituído
  e o de demanda em status final. Só um de dois valores, sem texto, sem o status da demanda e sem o id do substituto.
  DEC sem pedido gerado recebe o mesmo 404 do inexistente.
- **A rota é consultiva:** ela não autoriza nada. A entrega, o recebimento e o andamento continuam com as recusas deles.
- **O cliente deve falhar fechado:** com 503, erro de rede ou tempo esgotado, o `/construir` não inicia a construção e
  tenta de novo; com 401 ou 403, para a volta.
- **A rota não tem limite de taxa** nem grava evento por consulta. A resposta a vazamento continua a mesma: revogar
  pelo prefixo (seção 5).

## 1. Emitir

1. Abra o console do serviço `app` do projeto `orquestrador` no Easypanel. As variáveis do app já estão no ambiente.
2. Rode o script com a integração:

   ```bash
   pnpm tsx scripts/criar-token-servico.ts --integracao awave
   ```

   ou

   ```bash
   pnpm tsx scripts/criar-token-servico.ts --integracao construir
   ```

   O script aceita exatamente um entre `--agente` e `--integracao`. Os dois juntos, nenhum dos dois, valor fora da
   lista ou um argumento como `--token` são recusados, sem gravar nada.
3. Leia a saída. Ela tem esta forma (o token aparece no lugar de `<token>`):

   ```text
   Token criado para a integração awave (prefixo <prefixo>).
   Token, mostrado só esta vez: <token>
   Guarde o token agora, só no cofre de segredos de quem o usa. Para revogar, use o prefixo.
   ```

4. Anote o prefixo.
5. Leve o token ao lugar dele (seção 2) e feche o console.

O script grava o evento `token_criado` só com a integração e o prefixo. O log ganha a linha `token_criado` com o ator
`sistema`, sem o nome da integração e sem o prefixo.

## 2. Guardar

### Token `awave`

1. No Awave, abra `/config` e o card "Token do Orquestrador".
2. Cole o token e o endereço do Orquestrador.
3. Salve.

O endereço decidido no DEC é o interno da rede do Easypanel, `http://orquestrador_app`, sem passar pelo Traefik. A
porta tem de ser a que o serviço `app` escuta (a `PORT` do serviço; a imagem usa 3101 quando ela não é definida).
Confirme o endereço completo no primeiro teste pela rede interna (UAT-03 e UAT-04 do roteiro de aceite,
`docs/construcao/DEC-DEM-20261111-0016-v1/07-qa-funcional.md`, seção 7).

Pela rede interna, o token trafega sem TLS. Esse risco foi aceito no DEC e está nas pendências da spec (P-04, b).

### Token `construir`

1. No servidor, como o usuário `deploy`, crie a pasta e o arquivo vazio com a permissão certa **antes** de pôr o
   token nele:

   ```bash
   mkdir -p ~/.config/ws-construir
   chmod 700 ~/.config/ws-construir
   install -m 600 /dev/null ~/.config/ws-construir/token-orquestrador
   ```

2. Abra o arquivo num editor e cole o token, sem mostrar o conteúdo no terminal. Não use `echo <token> >` na linha de
   comando: o token ficaria no histórico do shell.
3. Confira só a permissão, sem ler o conteúdo:

   ```bash
   stat -c '%a %U' ~/.config/ws-construir/token-orquestrador
   ```

   Saída esperada: `600 deploy`.
4. Ligue a busca: em `pedidos/config/orquestrador.json` da estruturaAutonoma, troque `"ligado"` para `true`. O
   `token_arquivo` já aponta para `~/.config/ws-construir/token-orquestrador`.
5. Antes de ligar pela primeira vez, confira em `pedidos/` quais pedidos gerados no painel ainda não foram copiados:
   os gerados antes da 0.3.0 também entram na primeira busca (decisão P-03), e um arquivo antigo com outro conteúdo
   vira `conflito`, a resolver um a um.

O usuário `deploy` também roda os agentes com Bash, e por isso consegue ler esse arquivo. Esse risco foi aceito no DEC
e depende do D-F3 da infraestrutura (P-04, c).

## 3. Achar o prefixo de um token ativo, sem exibir o token

Use uma destas três formas. Nenhuma mostra o token nem o hash.

- **Na emissão:** a primeira linha da saída do script traz o prefixo (seção 1, passo 3).
- **No histórico do painel:** todo ato de integração aparece com o nome e o prefixo do token, como
  "Awave (prefixo <prefixo>)" ou "/construir (prefixo <prefixo>)". Abra uma demanda criada pelo Awave, ou a demanda de
  um DEC que o `/construir` buscou ou cujo andamento ele registrou, e leia a coluna de quem fez.
- **No banco** (só leitura; produção é de Fabiano): no contêiner do `db`,

  ```bash
  docker exec -it <contêiner do db> psql -U <usuário migrator> -d <banco> -c "select integracao, prefixo, criado_em from token_servico where integracao is not null and revogado_em is null order by criado_em"
  ```

  A consulta lê só a integração, o prefixo e a data. Não leia a coluna `hash`.

### O que um prefixo gravou no andamento (desde a 0.4.0)

O evento `andamento_registrado` só existe quando muda a fase ou a situação (A2). Para ver também as gravações sem evento,
como uma tarefa pronta a mais, use a coluna `ator_token_prefixo` da tabela `andamento_construcao`, que guarda o prefixo
em cada linha. Só leitura, no contêiner do `db`, como acima:

```bash
docker exec -it <contêiner do db> psql -U <usuário migrator> -d <banco> -c "select demanda_id, dec_id, fase, tarefas_prontas, tarefas_total, status_construcao, gravado_em from andamento_construcao where ator_token_prefixo = '<prefixo>' order by id"
```

A consulta não lê token nem hash: só o que foi gravado e quando. As mudanças de status feitas por esse token estão no
histórico de cada demanda, como "Mudou o status" por "/construir (prefixo <prefixo>)".

## 4. Trocar

Troque **já**, em suspeita de vazamento, e **a cada 12 meses** (decisão P-04 de Fabiano, 11/11/2026). A troca não
interrompe a integração, porque os dois tokens valem ao mesmo tempo até a revogação do antigo.

1. Emita o novo token (seção 1) e anote o prefixo novo.
2. Guarde o novo no lugar dele (seção 2), por cima do antigo.
3. Confira que o novo funciona:
   - `awave`: peça ao Awave uma demanda de teste com título terminado em "(fictício)" e confira no histórico dela o
     prefixo novo. Depois, encerre a demanda;
   - `construir`: espere a busca seguinte (até 5 minutos) e confira que a linha da busca no status report saiu `ok`.
     Com o envio do andamento ligado (desde a 0.4.0), confira também que o `andamento.log` do usuário do crontab não
     ganhou linha `atencao` nem `erro` (deploy.md, seção 8, item 5).
4. Revogue o antigo pelo prefixo (seção 5).

Na suspeita de vazamento, revogue o antigo antes de tudo (seção 5) e depois emita e guarde o novo: a integração fica
parada nesse intervalo, mas o token vazado deixa de valer na hora.

## 5. Revogar

1. No console do serviço `app`:

   ```bash
   pnpm tsx scripts/revogar-token-servico.ts --prefixo <prefixo>
   ```

2. Leia a saída:
   - código 0 e "Token de prefixo <prefixo> revogado. Ele deixa de valer agora.": revogado;
   - código 1 e "Nenhum token ativo com este prefixo. Nada foi alterado.": não havia token ativo com esse prefixo.

O token revogado recebe 401 "Token de serviço inválido ou revogado." em toda rota, na próxima chamada. A linha do token
continua no banco, com a data da revogação, e o evento `token_revogado` guarda o prefixo. O Awave mostra a mensagem ao
dono; o `/construir` acusa erro na busca e no e-mail e, desde a 0.4.0, para a volta inteira do envio do andamento, com
a linha de erro no `andamento.log`. O andamento já gravado continua no painel.

## 6. Se a integração der problema

- **Token vazado ou uso estranho:** revogue pelo prefixo (seção 5). Os outros tokens seguem valendo.
- **Busca do `/construir` com erro repetido:** troque `"ligado"` para `false` em `pedidos/config/orquestrador.json`.
  A cópia manual do pedido, pela T11, continua valendo.
- **Envio do andamento com erro repetido ou em excesso** (desde a 0.4.0): troque `"andamento_ligado"` para `false` no
  mesmo arquivo. O Orquestrador não muda, e o status se corrige à mão no painel.
- **Volta da 0.4.1 para a 0.4.0:** pelo `deploy.md`, seção 6 ("Volta da 0.4.1"). O token `construir` continua valendo
  na 0.4.0, que não tem a rota de situação: a rota deixa de existir, e o `/construir` deve tratar a resposta como
  falha (não iniciar).
- **Volta da 0.4.0 para a 0.3.1:** pelo `deploy.md`, seção 6 ("Volta da 0.4.0"), com `"andamento_ligado": false` antes.
  O token `construir` continua valendo na 0.3.1, que não tem a rota do andamento.
- **Volta da 0.3.0 para a 0.2.0:** pelo `deploy.md`, seção 6 ("Volta da 0.3.0 para a 0.2.0"). Os tokens emitidos depois
  do backup somem com a restauração; o Awave e o `/construir` passam a receber 401 até a 0.3.0 voltar e os tokens serem
  emitidos de novo.
