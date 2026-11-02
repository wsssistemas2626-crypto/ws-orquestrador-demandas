---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T21-construcao
agente: engenheiro-backend
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 05-tech-lead.md, 06-T20-engenheiro-backend.md, 06-T20-tech-lead.md, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6 e T19 a T22), 01-analista-requisitos.md (glossário e RF-01 a RF-17), 03-ux-ui-design.md (mapa de telas e T07 a T11), src/modules/pacotes-decisao/schemas.ts, src/modules/pacotes-decisao/criar.ts, src/modules/pacotes-decisao/consultas.ts, src/modules/pacotes-decisao/desatualizado.ts, src/modules/pacotes-decisao/criar.test.ts, src/db/schema/decisao.ts, src/db/transacao.ts, src/modules/versoes.ts, src/modules/limites.ts, src/modules/acesso/matriz.ts, src/modules/acesso/ator.ts, src/modules/acesso/mensagens.ts, src/modules/demandas/transicoes.ts, src/modules/demandas/servico.ts, src/modules/demandas/schemas.ts, src/modules/especificacoes/servico.ts, src/modules/historico/registrar.ts, src/lib/erros.ts, src/lib/rota.ts, src/lib/relogio.ts, src/app/api/pacotes-decisao/[decId]/route.ts, src/app/api/demandas/[id]/pacotes-decisao/route.ts, src/app/api/pacotes-decisao/pacotes.test.ts, test/banco.ts, test/deps.ts, test/auth.ts, test/sessao.ts, test/requisicao.ts, test/sentinelas.ts, test/matriz-rotas.test.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T21, decisão e dupla aprovação. A tarefa cobre:

- RF-13: CA-13.1 a CA-13.5;
- RF-14: CA-14.1 a CA-14.4;
- RF-12: CA-12.2 e CA-12.3;
- RF-11: CA-11.3;
- RF-02: CA-02.1;
- RF-07: as transições automáticas da decisão;
- os controles C-11, C-12, C-13, C-15, C-17, C-21 e C-30;
- os padrões P1-a, P1-b e P1-d;
- G3.8 (transação de quem chama).

### Arquivos (os 6 da lista do plano, nenhum outro)

- Modificado: `src/modules/pacotes-decisao/schemas.ts`.
  - `registrarDecisaoSchema` é a união discriminada por `statusDecisao`, campo a campo como no plano. A opção vem de
    `OPCOES_DECISAO`, a lista do esquema do banco.
  - Entraram também `LIMITE_REFERENCIA_DOCUMENTO` (200) e o tipo `RegistrarDecisao`.
- Criado: `src/modules/pacotes-decisao/decidir.ts`. Exporta:
  - `MODO_APROVACAO_ADMINISTRADORA = 'somente_propria'` (P1-a) e o tipo `ModoAprovacaoAdministradora`;
  - `MENSAGENS_DECISAO`, com os textos da 03 (T11);
  - `MENSAGEM_CORRIJA_OS_CAMPOS`;
  - `papelDaAprovacao(ator, entrada, modo?)`;
  - `registrarDecisao(deps, ator, decId, entrada, t?)`, que devolve `{ pacote, resultado }`. Numa transação, na ordem do
    plano:
    1. `autorizar`;
    2. o DEC e a trava da demanda;
    3. 409 se já há decisão;
    4. o desatualizado relido sob a trava: 409 só para aprovar;
    5. 400 em `revisouRascunhosDeAgente` quando há rascunho citado;
    6. devolvida ou arquivada: a decisão é gravada e a demanda muda pelo ator `sistema`;
    7. aprovada:
       - o papel vem da conta;
       - nível `cto` só por conta `cto`;
       - na dupla aprovação: o documento da administradora, o papel repetido, a opção diferente e a segunda aprovação
         que completa;
       - a aprovação não muda o status da demanda.
- Criado: `src/app/api/pacotes-decisao/[decId]/decisao/route.ts`. Exporta só `PATCH`:
  `rota({ acao: 'registrar_decisao', corpo: registrarDecisaoSchema, params: paramId.versao('decId', 'DEC') })` → 200
  `{ pacote, resultado }`.
- Testes: `src/modules/pacotes-decisao/decidir.test.ts`, `src/modules/pacotes-decisao/concorrencia.test.ts` e
  `src/app/api/pacotes-decisao/decisao.test.ts`.

O `test/matriz-rotas.test.ts` passou a cobrir a rota nova sem mudança nele. A rota dá 403 a cada agente e a pessoa sem
2FA, 401 sem credencial e 404 a parâmetro fora do formato.

### Testes criados

| Arquivo | Testes | O que prova |
|---|---|---|
| `decidir.test.ts` | 44 | **Schema:** CA-13.2 e CA-13.3; `statusDecisao` ausente ou fora da lista; opção descartada em devolvida; referência aparada, de 1 a 200 caracteres; data AAAA-MM-DD; `registrarComo` só `administradora`; C-11 com os dez nomes de autoria de G3.9 descartados; `revisouRascunhosDeAgente` booleano. **P1-a:** o modo é `somente_propria`; `papelDaAprovacao` nos dois modos. **Nível cto:** CA-13.1 (data, aprovadores e a linha gravada); CA-13.5; opção B e comentário; comentário vazio vira nulo; referência do CTO descartada; P1-b (403, nada gravado); administradora devolve e arquiva; C-12 com `registrarComo` nos dois níveis. **Dupla aprovação:** CA-14.1; CA-14.2 com a data e o documento; a administradora primeiro; CA-14.3 nos três casos de campo faltando; CA-14.4 nos dois sentidos, com o papel citado; papel repetido (409); devolução com aprovação parcial. **CA-13.4:** DEC do `consolidacao`, ESP do `insumo_tecnico` e RSK do `risco`; devolver e arquivar também; `revisou_rascunhos` gravado; sem rascunho, a confirmação não é exigida. **Decisão única:** CA-11.3 (as três decisões depois de aprovada e aprovar depois de devolvida). **Desatualizado:** CA-12.2 e CA-12.3 com ESP e com RSK novos; desatualizado no meio da dupla aprovação; 404. **Status:** devolvida vai a `em_analise`, arquivada a `encerrada` e aprovada não muda (P1-d), com evento do `sistema`. **Acesso:** C-12 com `sistema` e os quatro agentes chamando a função direto. **Histórico:** RF-21 e C-30, com `aprovacao_registrada` (com o documento só na da administradora) e `decisao_registrada`, sem a sentinela do comentário. **Transação:** G3.8 com rollback e com a vista lida na transação |
| `concorrencia.test.ts` | 4 | C-13 do plano, com 20 rodadas de aprovação e ESP v2 ao mesmo tempo; o mesmo com RSK v2 em 10 rodadas; aprovar e arquivar ao mesmo tempo: uma passa, a outra 409, uma decisão só; CTO e administradora ao mesmo tempo: as duas aprovações e uma decisão `aprovada`, em 5 rodadas |
| `decisao.test.ts` | 18 | **Pela rota:** CA-13.1 (200, `no-store`, sem id de conta na resposta, P1-d); CA-13.5 e C-11 com a linha gravada; CA-13.2 e CA-13.3 sem o valor recebido; `statusDecisao` inválido; CA-13.4 com o corpo exato do 400; CA-11.3 e CA-12.2 com o corpo exato do 409; CA-14.1 a CA-14.3 em sequência, com as duas contas reais em `registrada_por`; CA-14.4; P1-b e C-12 (403); devolver e arquivar com o status da demanda; CA-02.1 com o token de cada agente (nada gravado, nenhum evento); sem 2FA (403); 401; C-15 (403 e 415); 404; id fora do formato com 404 sem consulta nem conexão; só `PATCH` exportado. **Log (C-21):** só o padrão da rota, sem id, corpo, sentinela nem token |

Os 14 testes do plano estão presentes, com corpo: os 13 de `decidir.test.ts` e o de concorrência. O teste de C-12 com
`registrarComo` e P1-b virou dois: um para a administradora em DEC de nível `cto` e outro para o CTO com `registrarComo`.

### TDD: os testes foram escritos antes e vistos falhando

Comando: `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/pacotes-decisao/decidir.test.ts src/modules/pacotes-decisao/concorrencia.test.ts src/app/api/pacotes-decisao/decisao.test.ts`.
Rodou antes de qualquer código da tarefa. Trecho da saída:

```
 FAIL  src/modules/pacotes-decisao/concorrencia.test.ts [ src/modules/pacotes-decisao/concorrencia.test.ts ]
Error: Cannot find module './decidir' imported from .../src/modules/pacotes-decisao/concorrencia.test.ts
 FAIL  src/modules/pacotes-decisao/decidir.test.ts [ src/modules/pacotes-decisao/decidir.test.ts ]
Error: Cannot find module './decidir' imported from .../src/modules/pacotes-decisao/decidir.test.ts
 FAIL  src/app/api/pacotes-decisao/decisao.test.ts [ src/app/api/pacotes-decisao/decisao.test.ts ]
Error: Cannot find module './[decId]/decisao/route' imported from .../src/app/api/pacotes-decisao/decisao.test.ts
 Test Files  3 failed (3)
      Tests  no tests
```

### Resultado

- T21 isolada: 3 arquivos, 66 de 66.
- `pnpm test`: 100 arquivos, 1892 de 1892, nenhum falhou.
  - 66 desses testes são dos três arquivos novos.
  - Os outros casos novos vêm dos testes que varrem os arquivos de rota, entre eles a matriz de rotas, que gera um caso
    por método do `route.ts` novo.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.

### Desvios do plano

1. **`registrarDecisao` recebe `deps: DepsDemanda`**, e não `Deps`. É o mesmo desvio aceito na T18, na T19 e na T20.
   O serviço só usa `db`, `pool` e `relogio`.
2. **Exportações a mais em `decidir.ts`:** `papelDaAprovacao`, `MENSAGENS_DECISAO`, `MENSAGEM_CORRIJA_OS_CAMPOS` e os
   tipos `ModoAprovacaoAdministradora` e `ResultadoDecisao`.
   - `papelDaAprovacao` recebe o modo como parâmetro, com padrão na constante. Assim o teste prova que o outro modo de
     P1-a fica mesmo "a uma linha de distância" sem mudar a constante.
   - As mensagens ficam exportadas para a T43 usar os mesmos textos.
3. **Em `schemas.ts`, `LIMITE_REFERENCIA_DOCUMENTO` e o tipo `RegistrarDecisao`.** O 200 do plano ganhou nome, e o tipo
   segue o molde de `CriarPacoteDecisao`.

## Decisões tomadas

- **Resposta do `PATCH`: 200 com `{ pacote, resultado }`**, o mesmo retorno do serviço. A T43 precisa do resultado para
  escolher a mensagem de sucesso da 03 entre aprovada, aprovação parcial, devolvida e arquivada.
- **O estado do DEC é lido com `obterPacoteDecisao(tx, …)` depois da trava.** A leitura traz `desatualizado`,
  `rascunhosCitados`, `aprovadores`, `decisao` e o nível numa consulta só, com a mesma regra da vista. Em READ COMMITTED,
  cada comando depois da trava enxerga o que a outra transação gravou antes de soltá-la. É o que fecha C-13 e a corrida
  entre duas decisões.
- **400 de campo com a mensagem geral "Corrija os campos abaixo para continuar."** e o texto da 03 no item do campo:
  - "Marque que revisou os rascunhos de agente para registrar a decisão.";
  - "Informe o identificador do documento assinado.";
  - "Informe a data da assinatura.".

  É o formato de `deZod` e da ESP.
- **CA-14.3 lista só os campos que faltam**, na ordem referência e depois data.
- **Mensagens de 409 em minúscula**, como `MOTIVOS_TRANSICAO`: a tela acrescenta "Não foi possível concluir: ". A
  mensagem de opção diferente cita o papel que aprovou primeiro: "…aprovada pelo CTO." ou "…aprovada pela
  administradora.".
- **Papel repetido na dupla aprovação: 409 "a aprovação do CTO já está registrada."** (ou "da administradora"). A 03 não
  tem esse texto; ele segue o molde dos outros 409.
- **A confirmação de revisão vale também para devolver e arquivar.** O passo 5 do plano vem antes do 6, e a RN do RF-13
  diz "sem isso a decisão é recusada", sem distinguir o tipo.
- **A administradora pode devolver ou arquivar um DEC de nível `cto`.** P1-b só restringe a aprovação, e devolver ou
  arquivar é `QUALQUER_PESSOA_SEM_AGENTE` na matriz.
- **A referência ao documento só é gravada na aprovação de papel `administradora`.** Na do CTO, ela é descartada, e o
  evento `aprovacao_registrada` do CTO não leva documento.
- **`decisao.comentarios` na dupla aprovação recebe o comentário de quem completou.** Cada aprovação guarda o seu
  comentário em `aprovacao.comentario`. `decidida_por` é a conta que completou.
- **Comentário vazio vira `null`**, pela regra do RSK e do DEC (`textoOuNulo` local, ver Pendências).
- **`revisou_rascunhos` da aprovação recebe `revisouRascunhosDeAgente === true`.** A coluna já existia na T05.
- **Na concorrência, o relógio avança um dia por rodada.** Cada rodada grava quatro versões pelo mesmo ator, e 20
  rodadas passariam do limite de C-36.
- **No teste de rota, cada cenário tem uma autora fictícia própria** (`u-autora-N`) para a demanda, a ESP, o RSK e o
  DEC. Assim o limite por autor não pesa e não aparece rascunho de agente sem querer. A decisão vem sempre pela sessão
  real do CTO ou da administradora.

## Pendências

- **Para a T22 (`aprovadoPor` na ordem cto, administradora):** `aprovadores` na vista vem por `registrada_em` e, no
  mesmo instante, pela ordem alfabética do papel (T20). Por isso a administradora aparece antes do CTO quando aprova
  primeiro ou no mesmo instante. A T22 deve ordenar pelo papel ao montar `aprovadoPor`, e não usar a ordem da vista.
- **Para a `06-T21-revisao`, sobre P1-a no modo `cto_com_referencia`:** nesse modo, a aprovação de papel
  `administradora` registrada pelo CTO grava `nome_aprovador` com o nome da conta do CTO. O modo está desligado, e o
  plano não diz de onde viria o nome da administradora. Se um dia o modo for ligado, a regra do nome entra junto.
- **Para a 08 (Minor 1 da `06-T20-revisao`):** `textoOuNulo` em `decidir.ts` é mais uma cópia local da regra de texto
  opcional vazio. As outras estão no RSK e no DEC. O lugar comum fica fora da lista de arquivos da T21.
- **Para a T43:** a resposta traz `resultado`, para a mensagem de sucesso. O 400 de campo usa os nomes
  `revisouRascunhosDeAgente`, `referenciaDocumento` e `dataDocumento`, que a tela liga aos campos dela.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format=%h%x20%s -n 12` — último commit 3c8e2b9 (06-T20-testes)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -1 -- docs/construcao/DEC-DEM-20261022-0001-v1/01-analista-requisitos.md` — 93b8293, arquivo rastreado
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/pacotes-decisao/decidir.test.ts src/modules/pacotes-decisao/concorrencia.test.ts src/app/api/pacotes-decisao/decisao.test.ts` — antes do código: os 3 arquivos falharam (módulos ausentes)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/pacotes-decisao/decidir.test.ts src/modules/pacotes-decisao/concorrencia.test.ts src/app/api/pacotes-decisao/decisao.test.ts` — 66 de 66
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 1892 de 1892, 100 arquivos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — `schemas.ts` modificado e 5 arquivos novos, os da lista do plano

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno
