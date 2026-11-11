---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T02-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12), tarefas.json, passagens.jsonl, 05-tech-lead.md, docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (G1 a G8 e T02), 06-T02-engenheiro-backend.md, diff 0d83444..51e2dda (commits 77f904d, 020fd9f e 51e2dda da T02), src/components/rotulos-qa.test.ts, src/components/rotulos.ts (trechos), src/modules/acesso/matriz.ts (autorizar), src/modules/historico/consultas.ts, src/modules/demandas/consultas.ts (vistas), src/modules/demandas/servico.ts (autoriaDo), src/app/api/demandas/[id]/route.ts, 06-T01-tech-lead.md (formato)]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T02 (tipo de ator `integracao` e ramos exaustivos, IN-02). O commit informado, 51e2dda, só regrava a entrega
do engenheiro e o `passagens.jsonl`; o código da T02 está em 77f904d. A revisão leu o diff inteiro da tarefa,
`0d83444..51e2dda` (16 arquivos de `src/`, 649 linhas a mais e 61 a menos).

**Parecer: aprovada, sem Critical nem Important.** Os quatro Minor estão em Pendências e não bloqueiam a passagem.

### Conferência contra o plano

| Item | Resultado |
|---|---|
| G8 linhas 1, 4, 5, 8 a 11, 14 a 16 e 20 a 22 | As 13 estão como o plano pede: `switch` com `never` (`atorDesconhecido` ou `const nunca: never` onde a falha não pode lançar: `permitido`, `rotuloAtor`, `rotuloResponsavel`); integração lança `sem_permissao` nas vistas de demanda, ESP, RSK e DEC, na listagem e em `autoriaDo`; `sistema` continua com a vista mínima (D-05) |
| Matriz | Só `Linha.integracoes` (padrão vazio, congelado) e `permitido`; nenhuma linha abre integração. Isso fecha a D-01: nenhum caminho autoriza integração antes da T03 |
| Outros ramos por tipo de ator | Busca no histórico (`log -G`) por `tipo === 'pessoa'`, `tipo !== 'pessoa'`, `tipo === 'agente'`, `tipo === 'sistema'` e `switch (ator.tipo)`: além dos arquivos do G8 da T02, só aparecem `limites.ts` (T04), `decidir.ts` (#28), `ator-pessoa.ts` (#29, sem mudança) e a rota GET de `/api/demandas/[id]`, que hoje só chama `vistaDaDemandaPara` e passa a lançar para integração |
| G4 (superfícies congeladas e `src/lib/rota.ts`) | `git diff a9fd9b8 --stat` vazio |
| IN-16 / D-17 (16 testes de segurança) | `git diff a9fd9b8 --stat` vazio: nenhuma asserção mexida |
| G7 (interfaces produzidas) | `AtorIntegracao`, `Ator`, `ehIntegracao`, `NOME_DA_INTEGRACAO`, `atorDesconhecido`, `Responsavel`, `ResponsavelMinimo`, `AtorVisivel`, `NOME_INTEGRACAO` e os três `AcaoEvento` novos existem com a forma do G7 |
| TDD | Os testes da tarefa foram vistos falhando antes do código (19 de 92, com o trecho na entrega); os que já passavam são guardas do que não muda, nomeados com a razão |
| `pnpm typecheck`, `pnpm lint`, `pnpm test` | Rodados nesta revisão (resultado em Comandos executados) |
| Dados fictícios | Prefixos `ficticio`, `a1b2c3d4`, `Ab3dE5gH`, `Zz9-_aB1` e o valor `wsod_aaaa…` no formato de token são escritos à mão e não são token emitido; nenhum segredo nem dado pessoal real |
| Log | Nenhuma linha de log nova |

### Checklist da seção 12 do padrão técnico

- [x] A tarefa faz o que o plano pede, nem mais nem menos: os arquivos são os da lista da T02, mais
      `rotulos-qa.test.ts`, que o `typecheck` apontou (desvio aceito abaixo).
- [x] Há teste para cada comportamento novo, e ele falharia sem o código (19 falhas vistas antes do código).
- [x] Nenhum segredo, valor de `.env` ou dado pessoal real em código, teste, log ou fixture.
- [x] Entrada externa validada com Zod; erro sem vazar detalhe: a T02 não cria entrada; as recusas novas usam
      `sem_permissao` com a mensagem fixa de `MENSAGENS_ACESSO`.
- [x] Banco: a T02 não tem migration; o teste que retira CHECK o faz só no banco descartável do próprio arquivo.
- [x] Nada duplica função que já existe, com as ressalvas de cópia consciente (tela) e das três construções da mesma
      recusa, nos Minor 3 e 4.
- [x] Textos de interface em pt-BR, os da 03, 5.6; a T02 não toca tela renderizada (axe fica com as tarefas da fase 6).
- [x] Minor em Pendências; nenhum Critical nem Important.
- [x] `/code-review` e `/security-review` ficam para o PR e a `08-revisao` (G2).

### Decisão sobre o desvio do G5: `src/components/rotulos-qa.test.ts`

**Aceito.** Razões:

1. O arquivo existe para quebrar o `typecheck` quando entra um `AcaoEvento` sem texto (`satisfies Record<AcaoEvento,
   true>`). O plano manda acrescentar três eventos na T02; o teste tinha de mudar junto, ou a tarefa não fechava o
   `typecheck`. A falta dele no G5 é omissão do plano (minha, na 05), não escolha do engenheiro.
2. A mudança só acrescenta: três chaves em `ACOES` e a contagem de 24 para 27. Nenhuma asserção saiu, nenhuma
   ficou mais fraca. As três ações novas passam a ser cobertas pelos `it.each` de texto legível com cada ator e do C-30.
3. O arquivo não está na lista do D-17, e o piso de asserções do IN-16 não é afetado.

Os outros dois desvios também ficam aceitos: `semPermissao()` exportado de `demandas/consultas.ts` evita três cópias
da mesma recusa nas vistas de ESP, RSK e DEC; os casos de teste além do texto do plano só reforçam o comportamento da
T02.

### Mudança de comportamento visível (conferida)

O evento `token_revogado` com só `{ prefixo }` em `depois`, que é o que o script de revogação grava para agente, passa
a ler "Revogou o token de serviço de prefixo <p>". É o texto da 03, 5.6, e está no teste do próprio plano; o prefixo só
aparece se casar `^[A-Za-z0-9_-]{8}$`, e esse evento não tem demanda, então não entra no histórico da demanda. O C-09
(o ator agente sem prefixo) continua valendo e tem teste próprio em `consultas-integracao.test.ts`.

## Decisões tomadas

- T02 aprovada: nenhum problema Critical ou Important; o checklist da seção 12 está cumprido.
- Desvio de `rotulos-qa.test.ts` aceito: é a guarda de compilação que o próprio tipo novo obriga a mudar, a mudança só
  acrescenta e o arquivo está fora do D-17.
- `atorVisivel` devolver `prefixo: null` para integração fora da lista aceito: segue o teste descrito no plano e a 03
  (fora da lista, só "Integração"); não mostrar o que vem de linha corrompida é o lado seguro.
- Cópias de `RE_PREFIXO` e da checagem da lista em `rotulos.ts` aceitas: o arquivo vai ao navegador e só importa tipos
  dos módulos (mesmo motivo do D-14); a falta de teste que amarre as cópias vai como Minor.
- Revisão feita sobre o diff da tarefa inteira (`0d83444..51e2dda`), porque o commit informado só tem a entrega
  regravada; o código está em 77f904d.
- Uma listagem da pasta do pedido rodou fora da regra de comando deste pedido; o conferir a barrou e o maestro a
  liberou, porque só leu (regra de 25/10).

## Pendências

- Nenhuma bloqueia a T02.
- Minor 1 (para a `06-T02-testes`, `qa-automacao`): `src/components/rotulos-qa.test.ts:47` — a lista `ATORES` não
  tem ator de integração. Razão: o `it.each` "texto legível com qualquer ator" não exercita o tipo novo. Acrescentar
  `{ tipo: 'integracao', integracao: 'awave', prefixo: 'ficticio' }` e `{ tipo: 'integracao', integracao: null,
  prefixo: null }`.
- Minor 2 (para a `06-T02-testes`, `qa-automacao`): `src/components/rotulos-qa.test.ts:83` — o objeto `livre` do
  teste do C-30 não tem as chaves que os textos novos leem (`integracao`, `prefixo`) nem `hash`/`sha256`. Razão:
  `token_criado` e `token_revogado` agora leem `depois.integracao` e `depois.prefixo`; um sentinela nessas chaves
  prova que valor fora da lista ou fora do formato nunca chega ao texto.
- Minor 3 (para a T03, que mexe em `tokens-servico.ts`): `src/components/rotulos.ts:146` e
  `src/modules/historico/consultas.ts:33` — `RE_PREFIXO` copiada nos dois arquivos, sem teste que amarre as cópias
  (nem ao formato de prefixo de `tokens-servico.ts`). Razão: se o formato do prefixo mudar num só lugar, a tela e a
  leitura divergem sem teste vermelho. Exportar das duas e conferir `source` igual num teste, no padrão do D-14.
- Minor 4: `src/modules/demandas/servico.ts:60` monta `new ErroDominio('sem_permissao', …)` em vez de usar o
  `semPermissao()` que a própria T02 exportou (e `matriz.ts:98` usa outra constante de mensagem). Razão: três
  construções da mesma recusa; trocar quando a T06 mexer em `servico.ts`.
- Para a 05 do próximo pedido (lição): todo teste de guarda por `satisfies Record<…>` de um tipo que o plano estende
  entra no G5.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 51e2ddae5c54e78d61544915ad645ba83a28d54a~1 51e2ddae5c54e78d61544915ad645ba83a28d54a` — só a entrega do engenheiro e `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -8` — T02 em 77f904d, 020fd9f e 51e2dda sobre 0d83444
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 0d83444 51e2dda` — 18 arquivos (16 de `src/` e 2 da pasta do pedido)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 0d83444 51e2dda -- src` — diff da tarefa, lido inteiro com Read
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff a9fd9b8 --stat -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/proxy.ts src/db/privilegios.ts next.config.ts 'drizzle/000[0-6]_*.sql' 'drizzle/meta/000[0-6]_snapshot.json' src/lib/rota.ts` — vazio (G4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff a9fd9b8 --stat -- src/modules/acesso/matriz.test.ts src/modules/acesso/matriz-qa.test.ts src/modules/acesso/resolver-ator.test.ts src/modules/acesso/resolver-ator-qa.test.ts src/modules/acesso/tokens-servico.test.ts src/modules/acesso/tokens-servico-qa.test.ts src/modules/demandas/servico.test.ts src/modules/historico/registrar.test.ts src/modules/limites.test.ts src/db/privilegios.test.ts src/app/api/vistas-para-agente.test.ts test/matriz-rotas.test.ts test/transversal/sentinelas.test.ts test/estatico/sem-controle-bidi.test.ts test/estatico/sem-recurso-externo.test.ts test/estatico/leituras-da-fila.test.ts` — vazio (IN-16, D-17)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 241 arquivos, 5330 de 5330 passaram
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G "tipo !== 'pessoa'" --name-only --oneline -- src` — `decidir.ts`, `route.ts` de `/api/demandas/[id]`, `ator-pessoa.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G "tipo === 'agente'" --name-only --oneline -- src` — arquivos do G8 da T02 e `limites.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G "tipo === 'pessoa'" --name-only --oneline -- src` — arquivos do G8 da T02, `limites.ts` e testes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G "tipo === 'sistema'" --name-only --oneline -- src` — só `rotulos.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G "switch (ator.tipo)" --name-only --oneline -- src` — nada (o parêntese não casou)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G "switch .ator\.tipo" --name-only --oneline -- src` — os arquivos do G8 da T02 e `registrar.ts`

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
