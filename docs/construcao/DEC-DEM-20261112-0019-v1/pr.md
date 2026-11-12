# Orquestrador 0.3.1: correções da revisão da 0.3.0 antes de emitir os tokens de integração (M-1 a M-5 e três baixos) · DEC-DEM-20261112-0019-v1

## Resumo

Corrige os cinco médios e três baixos que a revisão da 0.3.0 deixou (`DEC-DEM-20261111-0016-v1/08-maestro.md`). É a
versão a publicar **antes de emitir os tokens de produção** das integrações `awave` e `construir`. Não tem rota nova,
tela nova nem migration.

- **M-1:** agente e `sistema` não leem nem gravam demanda do Awave antes da confirmação de pessoa.
  - Nas leituras por id e na criação de ESP, RSK e DEC, a resposta é o mesmo 404 da demanda inexistente, sem revelar
    que ela existe. A triagem preferiu 404 ao 409 do texto do pedido (decisão P3).
  - A demanda fica fora de `GET /api/demandas` e de `GET /api/pacotes-decisao`, nos itens e no total.
  - Isso substitui o CA-10.6 do 0016 (decisão de Fabiano em 12/11). Pessoa com 2FA continua igual.
- **M-2:** o 201 do POST do Awave sai de dentro da transação orçada. Se o prazo estourar, a resposta é 503 e nada é
  gravado.
- **M-3:** as transações das integrações têm prazo total (8 s, ou 12 s na entrega), contando a espera por conexão. O
  `set_config` usa parâmetro, os `SET LOCAL` viraram o piso, e o piso não passa por cima do prazo restante.
- **M-4:** entrega e recebimento do mesmo DEC usam a mesma trava (`pedido:<decId>`). O recebimento só aceita o hash da
  última entrega.
- **M-5:** a guarda do worker:
  - usa a demanda da entrada e falha fechada quando não há demanda;
  - quando bloqueia, devolve a execução para pendente sem gastar a chave;
  - a confirmação reenfileira a execução, e com o agente desligado ela espera até ser religado;
  - o batimento pula a demanda que aguarda confirmação.
- **Baixos:**
  - B-1: `trace: 'off'` nos e2e que usam token;
  - B-2: o script de token não sai com sucesso sem emitir;
  - B-3: a confirmação só vale com evento de pessoa, no servidor, na listagem, no batimento e na tela.

Versão 0.3.1. Não entrou dependência nova.

## Etapas e tempos (cadeia curta)

| Etapa | Passagens | Minutos |
|---|---|---|
| 01 reprodução (qa-funcional) | 1 | 5 |
| 02 triagem (tech-lead) | 1 | 6 |
| 03 correção (engenheiro-backend) | 1 | 35 |
| 04 regressão (qa-automacao) | 3 | 29 |
| 04 revisão (maestro) | 1 | 7 |
| 04 correção (engenheiro-backend) | 3 | 40 |
| 04 reteste (seguranca-aplicacao) | 1 | 4 |
| 05 entrega (devops-sre) | 1 | 25 |
| 06 documentação (documentacao-tecnica) | 1 | 10 |
| **Total** | **13** | **161** |

**Volta:** a 04-revisao devolveu com três altos. Eles não eram falha nova: eram critérios de aceite deste pedido ainda
não cumpridos.
- A-1: a listagem `GET /api/pacotes-decisao` ainda vazava DEC de demanda não confirmada.
- A-2: o piso do `limitarTempo` passava por cima do prazo.
- A-3: confirmar com o insumo desligado gastava a chave.

Com eles voltaram quatro médios (M-a a M-d). O reteste confirmou tudo fechado, sem afrouxar nenhum controle.

**Bloqueios:** dois, só de leitura ou de rodar teste local, liberados pela regra de 25/10.

**Homologação:** a primeira rodada da homologação parou por tempo-limite da ferramenta (15 min) com a suíte e2e no
teste 257, sem nenhuma falha. A ferramenta ganhou limite próprio para o e2e (35 min, commit `afe1554` na
estruturaAutonoma), e a segunda rodada passou.

## Verificação (`verificar`)

| Verificação | Resultado | Detalhe |
|---|---|---|
| ramo | ok | `construcao/DEC-DEM-20261112-0019-v1` |
| árvore limpa | ok | limpa |
| versão | ok | 0.3.0 → 0.3.1 |
| changelog | ok | seção 0.3.1 |
| ci | ok | `.github/workflows/ci.yml` |
| remoto | ok | github.com/wsssistemas2626-crypto/ws-orquestrador-demandas |
| test | ok | 6.489 de 6.489 |
| lint | ok | limpo |
| typecheck | ok | limpo |

## Homologação (`homologar`)

| Verificação | Resultado | Detalhe |
|---|---|---|
| subir | ok | http://127.0.0.1:3200 |
| saúde | ok | `/api/saude` respondeu 200 |
| e2e | ok | 271 passaram, contra o build de produção |
| derrubar | ok | projeto e volumes removidos |

## Ensaio de rollback (`ensaiar-rollback`)

| Verificação | Resultado | Detalhe |
|---|---|---|
| migrations da `main` | ok | nenhuma alterada |
| migrations novas | ok | nenhuma |
| versão anterior | ok | a versão da `main` (0.3.0) respondeu 200 em 57 s |
| backup | ok | 127 KB, impressão `6140bb770becb61f` |
| versão nova | ok | a versão do ramo, sobre o banco da `main`, respondeu 200 em 38 s |
| restauração | ok | o banco ficou igual ao backup |
| volta | ok | a versão da `main` voltou e respondeu 200 em 17 s |
| ida de novo | ok | a versão do ramo respondeu 200 em 37 s |
| derrubar | ok | projeto e volumes removidos |

Voltar da 0.3.1 para a 0.3.0 **não** exige restaurar o backup (`volta_sem_restaurar: true`).

**Atenção:** a produção está na **0.2.0**. Publicar a 0.3.1 leva junto a migration 0007 da 0.3.0. Por isso, a volta
para a 0.2.0 **exige restaurar o backup do banco**; o `deploy.md` traz o roteiro da publicação conjunta (seção 5).

## Testes

- **Unidade e integração:** 6.489 de 6.489.
  - Cada correção veio com um teste que falha antes e passa depois. Foram 90 testes novos na 03, mais os da 04.
  - Os testes mudados por decisão aprovada trocaram a regra antiga pela nova, sem afrouxar (IN-16):
    `criacao-awave` (CA-10.6), `executar-awave`, `gatilhos-awave-qa`, `recebimento-qa`, `executar.bordas` e
    `origem`/`origem-qa`; `reduzir-erro` e `projeto` mudaram só no inventário.
- **Ponta a ponta:** 276 passaram e 9 foram pulados (capturas), sem falha, na 04-regressao e na 04-correcao. Na
  homologação, 271 de 271. Nenhum teste passou de 24 s.

## Achados da revisão (04)

- **Código:** skill `code-review`, nível alto. **Segurança:** o agente `seguranca-aplicacao`, porque a skill revisa o
  ramo da sessão. Ele fez a revisão e o reteste.
- **Altos A-1 a A-3 e médios M-a a M-d:** corrigidos e retestados.
- **Dívida registrada:**
  - instruções em paralelo dentro de transação com prazo;
  - `set_config` a mais quando o restante cai abaixo do piso;
  - código duplicado (`ultimoShaEntregue` com `shasEntregues`, `TEMPO_ESGOTADO`);
  - a visibilidade do M-1 chamada à mão em vários lugares: centralizar na camada de dados numa versão futura;
  - O-1, o `abertura` fora do Proxy.

## Pendências

- **Fabiano, antes da publicação:**
  - Manter fora os segredos `EASYPANEL_WEBHOOK_*` e o Auto Deploy (deploy.md, seção 5, passo 1). Hoje não há
    webhook nem segredo, e a produção ficou na 0.2.0 depois do merge da 0.3.0.
  - Publicação conjunta 0.2.0 → 0.3.1: backup antes, migration 0007 num passo separado, worker e depois app.
- **Depois da publicação, com Fabiano:**
  - emitir os tokens de produção;
  - ligar o `pedidos/config/orquestrador.json`;
  - V-01/V-02 pela rede interna;
  - roteiro de aceite.
- **Risco residual, a aceitar com `gestao-riscos`:**
  - BR-3: os ids são sequenciais, então o agente pode deduzir pela lacuna que uma demanda existe, sem ver o conteúdo;
  - B-7 do 0016: ESP, RSK e DEC montados à mão por pessoa numa demanda não confirmada.
- QF-0016-01, o "[nome removido]" no título visto pelo Awave, continua para decisão de Fabiano.

## Publicação

Merge: pela política (`construir.mjs merge`, CA-P7-05) quando ela está ligada e permite; senão, de Fabiano. Serviço no
Easypanel é ação de Fabiano.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
