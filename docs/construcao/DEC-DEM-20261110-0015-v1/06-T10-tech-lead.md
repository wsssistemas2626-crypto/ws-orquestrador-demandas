---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T10-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12), tarefas.json, docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md (G1 a G7, T10), docs/superpowers/specs/2026-11-10-ws-orquestrador-demandas-novo-visual-design.md (seções 1, 3 e 4.4), 01-analista-requisitos.md (RF-08, RF-09), 03-ux-ui-design.md (5.4, 5.5), 06-T10-engenheiro-backend.md, 06-T08-tech-lead.md (formato), commits 6548339 e 62419e5, src/components/dados-das-etapas.ts, src/components/dados-das-etapas.test.ts, test/estatico/dados-das-etapas.test.ts, src/components/rotulos.ts, test/estatico/leituras-da-fila.test.ts (importacoesDe), src/modules/pedido-construcao/gerar.ts, src/app/(painel)/demandas/[id]/page.tsx]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T10 (regras de exibição da demanda: barra de etapas e Próxima ação, `engenheiro-backend`). O código está no
commit `6548339`; o `62419e5` só ajusta a entrega e o registro do maestro. **Parecer: aprovada, sem Critical nem
Important.** Há um Minor (leitor de importações repetido em teste), que vai para Pendências como dívida.

### O que foi conferido

- **Escopo:** o commit cria os três arquivos da tarefa (`src/components/dados-das-etapas.ts`, o teste de unidade e
  `test/estatico/dados-das-etapas.test.ts`). Em `src/components/rotulos.ts` o diff tem 2 linhas, só `export` em
  `agenteNaFrase` e `ARTEFATO_DO_AGENTE` (`rotulos.ts:155` e `rotulos.ts:158`), sem mudança de valor. Nenhum outro
  arquivo do código mudou. A árvore está limpa.
- **Interfaces:** `DadosDasEtapas`, `EstadoDaEtapa`, `EtapaDaDemanda`, `DestinoDaAcao` e `ProximaAcao` são iguais às do
  plano (T10). As assinaturas de `etapasDaDemanda` e `proximaAcao` são as do G7. O destino segue o D-10, e
  `RE_ID_DEMANDA_NA_TELA` segue o D-11, com teste de `source` e `flags`.
- **RF-08, conferido linha a linha contra a tabela da spec 4.4 e o texto da 03, 5.4:**
  - estados e ordem de conferência de cada etapa iguais (`dados-das-etapas.ts:83-128`), inclusive "Pacote
    desatualizado" antes de "1 de 2 aprovações";
  - a etapa 5 só leva id quando está "Gerado", e o id é o do vigente;
  - o vigente é o primeiro aprovado não substituído (`:70`);
  - a etapa atual é a primeira, de 2 a 5, que não está feita, e não existe em `entregue` nem em `encerrada` (`:130`).
  - Conferi em `src/modules/pedido-construcao/gerar.ts:108` que o evento `pedido_gerado` grava `entidadeId` = id do
    DEC, então a busca no histórico pelo id do vigente está certa.
- **RF-09, conferido contra a tabela da spec 4.4 e o texto da 03, 5.5:**
  - as 13 linhas estão na ordem certa, e vale a primeira que casar (`:193-216`);
  - textos por inteiro iguais aos da 03, inclusive os dois detalhes da linha 8 e "Sem responsável definido" na 13;
  - linha 9 sem vigente cai na 13, porque a condição do RF-09 exige o vigente. Linha 10 sem vigente fica sem link;
  - os dois `switch` (sobre `statusDecisao` e sobre `Status`) terminam em `never`.
- **Testes:**
  - 48 testes de unidade, entre eles um `it.each` com as 13 linhas e a saída inteira (CA-09.3), as prioridades (CA-09.2,
    4 antes de 5 e de 6, 7 antes de 8), CA-08.1 a CA-08.4 e CA-09.1;
  - 7 testes estáticos com 17 importações plantadas (CV-09) e 11 usos plantados (CA-09.4);
  - cada teste depende do código, e a entrega mostra a falha antes dele (`Cannot find module './dados-das-etapas'`).
- **CV-09:**
  - De `src/modules/`, o módulo só importa tipos (`:7-9`). Valores vêm só de `./rotulos` e `./dados-do-pacote`.
  - O teste estático usa lista de permissão, que é mais estrita que o plano.
  - A saída não tem nome, documento, data do documento, comentário nem `decididaPor`, o que é provado por sentinelas em
    três cenários. Só tem as chaves da interface.
- **CV-19:**
  - os `href` saem só das três constantes de rota da demanda e da de `/pacotes-decisao/`;
  - o id passa antes por `RE_ID_DEMANDA_NA_TELA` ou `RE_ID_DEC`, as duas ancoradas e sem a flag `m`;
  - o teste cobre `/../`, `?`, `javascript:`, `//`, espaço no início e quebra de linha no fim.
- **CA-09.4:** hoje nenhuma página chama as funções. O teste estático reprova quem não for `src/app/**/page.tsx`, também
  por namespace, `export *` e `import()`.
- **CV-01 (G4):**
  - o `git diff 198e97d -- …` das superfícies congeladas saiu vazio;
  - `git diff 198e97d --stat -- src/modules package.json` lista só `resumo-da-fila.ts` e o teste dele (T07), mais as 2
    linhas de `package.json` (T02);
  - nenhum `'use server'` novo.
- **Verde nesta revisão:**
  - os dois arquivos da tarefa: 55 de 55;
  - `pnpm test`: 227 arquivos, 5009 de 5009;
  - `pnpm lint` e `pnpm typecheck` limpos.

### Decisão sobre os desvios declarados pelo engenheiro

1. **`TEXTOS_ETAPAS` exportado (fora do G7): aceito.** O G7 lista os nomes que várias tarefas dividem, e não proíbe
   outros. A constante dá à T11 uma fonte só para os quatro textos da 03, seção 9 (G3.9). Importar a constante não conta
   como uso das funções no CA-09.4, e um caso plantado mostra isso (`Textos.tsx`).
2. **Erro quando a ESP ou o DEC mais novo não são os da demanda (`conferir`, `:62-65`): aceito.**
   - Segue a regra da 02, seção 5 ("número errado não"), a mesma do erro de "aprovado sem opção" que o plano já pede.
   - Na página de hoje, a ESP é lida pelo id de `d.especificacoes[0]` (`page.tsx:290-297`), e a T11 vai ler o DEC pelo
     id de `d.pacotesDecisao[0]`. Por isso o erro só dispara se a ligação estiver errada, e então a T05 mostra a tela de
     erro de hoje em vez de um estado falso.
   - A mensagem não leva dado da demanda. O teste cobre os cinco casos de incoerência nas duas funções.
3. **Tipos sem `db` nem `acesso` (`OpcaoDecisao` de `Aprovador['opcao']`, `Status` de `DemandaVista['status']`):
   aceito.** O tipo é o mesmo e a regra fica mais estrita que a do G3.7.
4. **Linha 8 na dupla pendente com duas aprovações: aceito.** O estado não deveria existir. O resultado ("CTO e
   administradora", sem detalhe) é o da 03, 5.5 para "nos demais casos". Não mostra estado falso nem esconde ação.
5. **`importacoesDe` copiado de `test/estatico/leituras-da-fila.test.ts`: aceito como Minor, com dívida registrada.**
   - O checklist veta duplicar função que já existe no repositório. A cópia está em código de teste, e as duas versões
     são iguais na lógica (só muda `setParentNodes`).
   - Extrair um ajudante agora mexeria num teste existente que está fora da lista de arquivos da T10, e importar de outro
     `.test.ts` rodaria aquela suíte de novo.
   - Não afeta comportamento nem segurança, então não justifica devolver a tarefa. O pagamento da dívida está em
     Pendências.

## Decisões tomadas

- A T10 está aprovada. Não há Critical nem Important. O único Minor é a cópia de `importacoesDe`, que vai para
  Pendências (seção 12: só Critical e Important bloqueiam).
- Os cinco desvios declarados foram aceitos, cada um pela razão escrita acima. Nenhum muda condição, ordem ou texto das
  tabelas do RF-08 e do RF-09, e nenhum afrouxa o CV-09 nem o CV-19.
- A linha 9 sem vigente vai para a 13, e não para a 9 sem link. A condição da 9 no RF-09 exige o vigente, e a ordem do
  01 não muda.

## Pendências

- **Minor, dívida de teste (D-T10-01):**
  - extrair `importacoesDe` (e o tipo `Importacao`) para um ajudante sem `.test` em `test/estatico/`, por exemplo
    `test/estatico/importacoes.ts`;
  - fazer `leituras-da-fila.test.ts` e `dados-das-etapas.test.ts` usarem esse ajudante;
  - onde: na T16, que já mexe em `test/estatico/`, ou numa correção da 08;
  - impacto: hoje, nenhum. Uma correção feita em uma cópia e esquecida na outra deixaria um dos dois testes estáticos
    mais fraco;
  - custo: cerca de 30 minutos. A mudança no teste existente só troca a definição pela importação, sem mexer em
    asserção (G3.2).
- **Para o `engenheiro-frontend` (T11)**, além do que a entrega da T10 já lista:
  - a T10 não autoriza nada, porque recebe o dado já lido. A `autorizar(pessoa, 'ler_pacote_decisao')` antes de
    `obterPacoteDecisao` fica com a T11, como o plano já diz em "Leitura nova na página";
  - passe para as funções a mesma `esp` que a página já lê (`page.tsx:297`). Não leia de novo. Assim o `conferir` da
    T10 não dispara.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -15`: topo `62419e5`
  (06-T10-construcao), código da T10 em `6548339`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 6548339`: 3 arquivos novos, `rotulos.ts`
  com 4 linhas (2+, 2-), a entrega e o registro
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 62419e5`: só a entrega e
  `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 8cc9743`: só `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 6548339 -- src/components/rotulos.ts`: só
  `export` em 2 linhas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "RF-09" -e "5.5" -- docs/construcao/DEC-DEM-20261110-0015-v1/01-analista-requisitos.md docs/construcao/DEC-DEM-20261110-0015-v1/03-ux-ui-design.md`:
  localizou o RF-09 (linha 208 da 01) e a 5.5 (linha 586 da 03). **Este comando está fora da lista Pode** (`git grep`)
  e foi rodado por engano. Só leu dois documentos do pedido rastreados pelo git, sem alterar nada. O registro fica aqui
  para o maestro, que decide se aceita a entrega
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline --name-only -S pedido_gerado -- src/modules`:
  o evento é gravado em `src/modules/pedido-construcao/gerar.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 198e97d -- src/proxy.ts src/proxy.test.ts next.config.ts src/app/api src/db drizzle src/modules/acesso src/worker src/jobs src/agents src/lib/auth.ts src/lib/auth-cliente.ts src/lib/qr.ts src/lib/log.ts src/lib/erros.ts src/instrumentation.ts pnpm-workspace.yaml "src/app/(painel)/configuracao/agentes/acoes.ts" "src/app/(painel)/demandas/[id]/acoes.ts" "src/app/(painel)/demandas/[id]/editar/acoes.ts" "src/app/(painel)/demandas/[id]/especificacoes/nova/acoes.ts" "src/app/(painel)/demandas/[id]/pacotes-decisao/novo/acoes.ts" "src/app/(painel)/demandas/[id]/pareceres-risco/novo/acoes.ts" "src/app/(painel)/demandas/nova/acoes.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes.ts"`:
  vazio (CV-01)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 198e97d --stat -- src/modules package.json`:
  `package.json` (2+), `resumo-da-fila.ts` e o teste dele
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short`: vazio
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-das-etapas.test.ts test/estatico/dados-das-etapas.test.ts`:
  2 arquivos, 55 de 55
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint`: limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck`: limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test`: 227 arquivos, 5009 de 5009

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`

Checklist da seção 12:

- [x] A tarefa faz o que o plano pede, nem mais nem menos; arquivos fora da tarefa não mudaram. Os acréscimos são os
  desvios 1, 2 e 4, aceitos acima.
- [x] Há teste para cada comportamento novo, e ele falharia sem o código.
- [x] Nenhum segredo, valor de `.env` ou dado pessoal real em código, teste, log ou fixture. Só "Pessoa Ficticia …",
  `DOC-FICTICIO-1` e sentinelas.
- [x] Entrada externa validada com Zod; erro sem vazar detalhe. Não se aplica: a T10 não cria rota, Server Action nem
  job, e as mensagens de erro não levam dado.
- [x] Banco: migration gerada, papel migrator, RLS e guarda quando houver `tenant_id`. Não se aplica: a T10 não toca no
  banco.
- [x] Nada duplica função que já existe no repositório. O código que roda não duplica nada: usa `agenteNaFrase`,
  `ARTEFATO_DO_AGENTE`, `NOME_AGENTE`, `ROTULO_PAPEL`, `ROTULO_STATUS` e `RE_ID_DEC` existentes. A cópia de
  `importacoesDe` em teste é Minor e está em Pendências (D-T10-01).
- [x] Textos de interface em pt-BR; axe sem violação nas telas tocadas. Os textos são os da 03, 5.4, 5.5 e 9. A T10 não
  tem tela, e o axe da T05 fica com a T11.
- [x] O que é Minor vai para Pendências; só Critical e Important bloqueiam a passagem.
- [x] No PR: `/code-review` uma vez, correção do Critical/Important, re-revisão só do diff das correções e
  `/security-review` no fim. Não se aplica a esta etapa: é da `08-revisao`.
