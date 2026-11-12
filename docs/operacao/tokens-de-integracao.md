# Tokens das integrações `awave` e `construir`

| Campo | Valor |
|---|---|
| Versão | 0.3.0 |
| Atualizado em | 12/11/2026 (`documentacao-tecnica`, pedido 0016: primeira versão) |
| Dono | `documentacao-tecnica` (operação: `devops-sre`; sistema: Fabiano) |
| Quem executa | Fabiano. Emitir, trocar e revogar token de produção é ação dele, no console do serviço `app` do Easypanel |
| Situação | vigente, ainda não executado em produção. A primeira execução é a UAT da 0.3.0 (UAT-03, UAT-09, UAT-10 e UAT-12 de `docs/construcao/DEC-DEM-20261111-0016-v1/07-qa-funcional.md`, seção 7), que também testa este texto |
| Fontes no código | `scripts/criar-token-servico.ts`, `scripts/revogar-token-servico.ts`, `src/modules/acesso/tokens-servico.ts`, `src/db/schema/acesso.ts`; do lado do `/construir`, `ferramentas/construir/buscar-pedidos.mjs` da estruturaAutonoma |

Desde a 0.3.0, duas integrações internas entram na API com um token próprio, fora dos agentes de IA
([manual, cap. 02](../manual-tecnico/02-acesso-e-seguranca.md#atores-de-integração-030)):

| Integração | Quem usa | O que o token permite | Onde o token mora |
|---|---|---|---|
| `awave` | o Awave (serviço `empresa-ia`), quando o dono aprova a criação de uma demanda em `/aprovacoes` | criar demanda (no máximo 10 por hora) e ler só as demandas que ele criou | no Awave, pelo card "Token do Orquestrador" em `/config`, ou nas variáveis do serviço `empresa-ia` no Easypanel. Nunca no repositório do Awave nem neste |
| `construir` | a busca automática do `/construir` (crontab do usuário `deploy`) | listar os Pedidos de Construção pendentes, buscar um pedido e confirmar o recebimento | no arquivo `~/.config/ws-construir/token-orquestrador` do usuário `deploy`, com permissão 600. O `buscar-pedidos.mjs` recusa o arquivo com outra permissão. O caminho está em `pedidos/config/orquestrador.json` (`token_arquivo`) da estruturaAutonoma |

Regras que valem para os dois:

- O token aparece **uma vez só**, na saída do script de emissão. Leve-o direto ao lugar dele. Nunca o mande pelo chat,
  por e-mail, por issue, por arquivo do repositório nem por print. Anote só o **prefixo**.
- O banco guarda só o SHA-256 do token e o prefixo (8 caracteres). Ninguém recupera um token perdido: emita outro.
- O prefixo identifica o token no histórico e na revogação, sem revelá-lo.
- Revogar um token não afeta os outros, de agente ou de integração.
- **Limitação conhecida da 0.3.0:** a revisão do pedido 0016 recomenda publicar uma 0.3.1 curta antes de emitir os
  tokens de produção. Até essa versão, não emita os tokens `awave` e `construir` de produção. Sem token emitido, as
  rotas das integrações respondem 401, e nada fica exposto.

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
  um DEC que o `/construir` buscou, e leia a coluna de quem fez.
- **No banco** (só leitura; produção é de Fabiano): no contêiner do `db`,

  ```bash
  docker exec -it <contêiner do db> psql -U <usuário migrator> -d <banco> -c "select integracao, prefixo, criado_em from token_servico where integracao is not null and revogado_em is null order by criado_em"
  ```

  A consulta lê só a integração, o prefixo e a data. Não leia a coluna `hash`.

## 4. Trocar

Troque **já**, em suspeita de vazamento, e **a cada 12 meses** (decisão P-04 de Fabiano, 11/11/2026). A troca não
interrompe a integração, porque os dois tokens valem ao mesmo tempo até a revogação do antigo.

1. Emita o novo token (seção 1) e anote o prefixo novo.
2. Guarde o novo no lugar dele (seção 2), por cima do antigo.
3. Confira que o novo funciona:
   - `awave`: peça ao Awave uma demanda de teste com título terminado em "(fictício)" e confira no histórico dela o
     prefixo novo. Depois, encerre a demanda;
   - `construir`: espere a busca seguinte (até 5 minutos) e confira que a linha da busca no status report saiu `ok`.
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
dono; o `/construir` acusa erro na busca e no e-mail.

## 6. Se a integração der problema

- **Token vazado ou uso estranho:** revogue pelo prefixo (seção 5). Os outros tokens seguem valendo.
- **Busca do `/construir` com erro repetido:** troque `"ligado"` para `false` em `pedidos/config/orquestrador.json`.
  A cópia manual do pedido, pela T11, continua valendo.
- **Volta da 0.3.0 para a 0.2.0:** pelo `deploy.md`, seção 6 ("Volta da 0.3.0 para a 0.2.0"). Os tokens emitidos depois
  do backup somem com a restauração; o Awave e o `/construir` passam a receber 401 até a 0.3.0 voltar e os tokens serem
  emitidos de novo.
