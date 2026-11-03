---
pedido: DEC-DEM-20261103-0006-v1
etapa: 02-triagem
agente: tech-lead
leu: [contrato-passagem.md, pedido.json, 01-qa-funcional.md, DEC-DEM-20261102-0005-v1/02-tech-lead.md, .claude/agents/engenheiro-backend.md, src/modules/agentes/entrada-agente.ts, src/modules/agentes/executar.ts, src/modules/pacotes-decisao/criar.ts, src/modules/pacotes-decisao/decidir.ts, src/modules/pacotes-decisao/consultas.ts, src/modules/especificacoes/servico.ts, src/modules/pareceres-risco/servico.ts, src/modules/demandas/transicoes.ts, src/modules/versoes.ts, src/modules/limites.ts, src/modules/historico/registrar.ts, src/lib/erros.ts, src/modules/avisos/aviso-dec.ts, src/modules/avisos/enviador.ts, src/jobs/aviso-dec-pronto.ts, src/jobs/aviso-dec-pronto.test.ts, src/modules/pacotes-decisao/criar.test.ts, src/modules/especificacoes/servico.test.ts, src/modules/agentes/executar.test.ts, test/estatico/projeto.test.ts]
status: pronto
proximo: engenheiro-backend
devolvido_para: null
---
## Entrega

### Causa provável

Concordo com a reprodução da 01 nos três defeitos. Conferi cada caminho no código da base (`af979fa`, igual à main
`cf36ec5`, 0.1.4).

1. **D-01 (M-01).** A entrada da consolidação e a gravação do DEC escolhem a ESP e o RSK em momentos diferentes e por
   regras diferentes:
   - a entrada lê o RSK **da chave** (`entrada-agente.ts:198`) e a ESP mais nova **na hora da leitura** (`:199`);
   - a gravação lê de novo a ESP e o RSK mais novos, já sob a trava (`criar.ts:83-84`).

   Entre as duas leituras ficam a fila e a chamada ao provedor, que roda fora de transação e pode levar até 120 s
   (`executar.ts:227`). O destino `consolidacao` (`executar.ts:91-104`) não passa ao serviço o que foi lido. Um RSK ou
   uma ESP gravados nessa janela fazem o DEC citar uma versão que o modelo não leu. O DEC não sai `desatualizado`,
   porque cita justamente a mais nova.
2. **D-02 (M-02).** Os três serviços travam a demanda e não leem o status:
   - `especificacoes/servico.ts:35`;
   - `pareceres-risco/servico.ts:44`, onde o retorno nem é guardado;
   - `pacotes-decisao/criar.ts:80`.

   O executor também não confere o status antes de chamar o provedor (`executar.ts:201-232`). Os estados finais existem
   num lugar só, `FINAIS` em `transicoes.ts:27`, mas são privados.
3. **D-03 (M-03).** São duas causas em `enviarAviso` (`aviso-dec.ts:116-154`):
   - só o erro lançado pelo enviador conta tentativa (o `catch` da linha 143). Qualquer erro fora dele desfaz a
     transação inteira e sobe sem contar. Exemplos: `montarEmailDoAviso` na linha 139, ou o `select ... for update` e
     os `update` no banco. O handler (`aviso-dec-pronto.ts:27-29`) só registra e relança, e na 3.ª vez o job termina
     `failed`, com a linha ainda `pendente`;
   - o mesmo `catch` não separa `recusado` de `transitorio`, embora `classificar` (`enviador.ts:45`) já faça a
     distinção certa.

### Decisões sobre os pontos que a 01 deixou para a triagem

1. **M-01: o DEC cita o RSK da execução e a ESP que a entrada leu.** A outra opção, "a consolidação usa o mais novo",
   exige conferir de novo sob a trava e jogar fora uma chamada já paga. Esta opção fecha as duas janelas, a da fila e
   a da chamada ao provedor, sem conferência extra.
   - O DEC que nasce depois de um RSK ou de uma ESP mais nova sai `desatualizado` (`expressaoDesatualizado`,
     `consultas.ts`).
   - A aprovação dele já é barrada por `MENSAGENS_DECISAO.desatualizado` (`decidir.ts:214`).
   - A execução do RSK novo gera o DEC coerente.
   - O Pedido de Construção usa `dec.parecerRiscoId` (`gerar.ts:51`), então resumo, tela e Pedido passam a falar do
     mesmo RSK.
2. **A ESP entra junto.** O padrão é o mesmo e a correção é a mesma. Corrigir só o RSK deixaria o critério "resumo e
   citação batem" falso para a ESP.
3. **Código da recusa por estado final: `conflito` (409), com mensagem fixa.**
   - Com `entrada_invalida` ou `limite_excedido`, o executor tentaria de novo (`executar.ts:291-296`), com mais
     chamadas pagas.
   - Com `conflito`, a execução cai em `falhar(c, 'recusada_pelo_servico')` na primeira vez.
   - 409 é também o status certo: o pedido é válido, e o estado da demanda é que não permite.
4. **Conferência antes da chamada paga: entra.** A meta do M-02 é não gastar agente pago em demanda fechada. A recusa
   no serviço fecha o gatilho, mas não a execução que já estava na fila.
   - O executor confere o status antes de montar a entrada e encerra `ignorada`, com o motivo `demanda_final`.
   - A recusa no serviço, sob a trava, continua sendo a barreira para a demanda fechada durante a chamada.
5. **Fonte única dos estados finais: `transicoes.ts`.** A lista sai de `FINAIS`, exportada. Nenhuma segunda lista nos
   serviços.
6. **Fica fora deste pedido:** aprovar um DEC já existente numa demanda `encerrada` (`registrarDecisao`) e gerar o
   Pedido dele (`gerarPedido`). A ESP do pedido trata de **criar** ESP, RSK e DEC. Decisão e Pedido são outro fluxo,
   com 2FA e dupla aprovação. Mexer neles aqui aumenta o risco do pedido sem estar no critério. Vai para registro à
   parte (Pendências).
7. **M-03: o erro inesperado conta numa transação própria, com a trava da linha.**
   - O erro desfaz a transação do envio, então o incremento só pode gravar depois.
   - A trava (`for update`) impede somar duas vezes com um job concorrente do mesmo DEC.
   - Se a própria contagem falhar (banco fora), o erro original sobe e o handler segue como hoje
     (`aviso_erro_inesperado`, Sentry, relança). Sem banco não há como contar, e isso fica escrito no comentário.

### Quem corrige

**`engenheiro-backend`, numa `03-correcao` só.** Tudo o que muda está em `src/`, em `test/estatico/projeto.test.ts` e
no `version` do `package.json`, e tudo isso está na lista **Pode** dele. Nenhuma migration: não há coluna nova, e o
motivo `demanda_final` vai no `jsonb` do evento, que não tem restrição de valor.

**Arquivos que mudam:**
- `src/modules/demandas/transicoes.ts` (e o teste dele);
- `src/modules/especificacoes/servico.ts` (e `servico.test.ts`);
- `src/modules/pareceres-risco/servico.ts` (e o teste dele);
- `src/modules/pacotes-decisao/criar.ts` (e `criar.test.ts`);
- `src/modules/agentes/entrada-agente.ts` (e o teste dele);
- `src/modules/agentes/executar.ts` (e `executar.test.ts`);
- `src/modules/avisos/aviso-dec.ts` (e `aviso-dec.test.ts`);
- `src/jobs/aviso-dec-pronto.ts` (só o comentário de cabeçalho) e `aviso-dec-pronto.test.ts`;
- `test/estatico/projeto.test.ts` (só o `it` da versão);
- `package.json` (só `version`).

Outros testes de `src/` só mudam se montarem a cena criando ESP, RSK ou DEC numa demanda já `entregue` ou
`encerrada`. Nesse caso, mude a ordem da cena (crie o artefato antes de levar a demanda ao estado final) e registre
cada um na entrega. Não afrouxe nenhuma asserção.

**Arquivos que não mudam:**
- `src/db/` (schema e migrations);
- `src/modules/pacotes-decisao/decidir.ts`, `src/modules/pedido-construcao/`, `src/modules/acesso/` e `src/lib/fila.ts`
  (`retryLimit` e `singletonKey` ficam como estão);
- `src/modules/avisos/enviador.ts`, onde a classificação está certa;
- `e2e/`, `scripts/`, `.github/`, `Dockerfile` e `CHANGELOG.md`. O `CHANGELOG.md` fica com a `06-documentacao`.

### O que a 03-correcao faz, em ordem, com o teste antes do código

Em cada passo: escreva o teste, rode `pnpm test` e registre a falha na entrega, com o trecho da saída. Depois escreva
o código e rode de novo, até ficar verde.

**Passo 0. Versão 0.1.5**

1. Em `test/estatico/projeto.test.ts`, no `it` da versão (linhas 27-30), troque `0.1.4` por `0.1.5` no título e no
   `expect`. Troque o comentário da linha 27 por:
   `// 0.1.5: DEC-DEM-20261103-0006-v1 (M-01, M-02 e M-03 do DEC-DEM-20261022-0001-v1: citação da consolidação, demanda em status final e aviso).`
2. Rode `pnpm test` e registre a falha (`expected '0.1.4' to be '0.1.5'`).
3. Mude `"version": "0.1.4"` para `"0.1.5"` no `package.json`.

**Passo 1. M-02, a fonte dos estados finais (`transicoes.ts`)**

Interface nova, exportada de `src/modules/demandas/transicoes.ts`. A lista e a pergunta saem de `FINAIS`, sem lista
nova:

```ts
export const STATUS_FINAIS: readonly Status[];           // de Object.keys(FINAIS), congelada
export function ehStatusFinal(status: Status): boolean;
export const MENSAGEM_DEMANDA_FINAL =
  'Esta demanda está em status final. Não aceita nova especificação, parecer de risco nem pacote de decisão.';
// Lança ErroDominio('conflito', MENSAGEM_DEMANDA_FINAL) quando o status é final.
export function recusarSeDemandaFinal(status: Status): void;
```

Teste antes, no teste de `transicoes`:
- `STATUS_FINAIS`, ordenada, é `['encerrada', 'entregue']`;
- é exatamente o conjunto dos status com `transicoesManuaisDe(s)` vazio. Isso amarra a lista à máquina de estados;
- `recusarSeDemandaFinal` lança `conflito` com a mensagem fixa nos dois finais e não lança nos sete outros (`nova`,
  `em_analise`, `aguardando_informacao`, `pronta_para_decisao`, `aprovada`, `em_construcao`, `devolvida`).

**Passo 2. M-02, a recusa nos três serviços**

Nos três serviços, a chamada fica **logo depois de `travarDemanda`** e antes de `conferirLimite`, e portanto antes de
qualquer insert, evento, gatilho, aviso ou job. Fica dentro da mesma transação e da mesma trava:
- `especificacoes/servico.ts`: `recusarSeDemandaFinal(atual.status)`;
- `pareceres-risco/servico.ts`: guarde o retorno (`const atual = await travarDemanda(...)`) e chame
  `recusarSeDemandaFinal(atual.status)`;
- `pacotes-decisao/criar.ts`: `recusarSeDemandaFinal(d.status)`.

Atualize o comentário de cabeçalho dos três para incluir o passo ("trava da demanda → recusa em status final (409) →
limite por ator ...").

Testes antes. Todos com dados fictícios, pela pessoa CTO e pelo ator agente do serviço:
- **ESP** (`especificacoes/servico.test.ts`):
  - `it.each(['entregue', 'encerrada'])`, sem dúvida e com o agente `risco` ligado: rejeita com
    `{ codigo: 'conflito', mensagem: MENSAGEM_DEMANDA_FINAL }`. Depois disso há 0 ESP, nenhum evento novo, nenhuma
    `execucao_agente` e nenhum job;
  - o mesmo com o ator agente `insumo_tecnico`;
  - `it.each` dos sete não finais: a ESP é gravada.
  - O `it.each` da linha 201 perde `encerrada` e fica `['aprovada', 'em_construcao']`. O caso `encerrada` com dúvida
    passa para o teste de recusa.
- **RSK** (`pareceres-risco/servico.test.ts`):
  - com uma ESP gravada **antes** de levar a demanda ao status final e o agente `consolidacao` ligado,
    `it.each(['entregue', 'encerrada'])` rejeita com `conflito`. Depois disso há 0 RSK, nenhuma `execucao_agente` de
    consolidação e nenhum job;
  - o mesmo com o ator agente `risco`;
  - `it.each` dos sete não finais: o RSK é gravado.
- **DEC** (`pacotes-decisao/criar.test.ts`):
  - `it.each(['entregue', 'encerrada'])`, com ESP e RSK gravados antes do status final: rejeita com `conflito`.
    Depois disso há 0 DEC, 0 `aviso_email`, nenhum job `aviso.dec-pronto` e nenhum evento `pacote_decisao_criado`;
  - o mesmo com o ator agente `consolidacao`;
  - o `it.each` da linha 242 perde `encerrada` e ganha `devolvida`: `['pronta_para_decisao', 'aprovada',
    'em_construcao', 'devolvida']` continua gravando e o status não muda. Os outros não finais já estão cobertos nas
    linhas 227-240.

**Passo 3. M-02, o caminho do agente (`executar.ts`)**

Em `executarReivindicada`, depois da conferência do teto e antes de `montarEntrada`:

```ts
if (exec.demandaId !== null && (await demandaEmStatusFinal(deps.db, exec.demandaId))) return ignorar(c, 'agente_ignorado', 'demanda_final');
```

- `demandaEmStatusFinal(db, demandaId)` é uma função local: lê só `demanda.status` e responde com `ehStatusFinal`. Se
  a demanda não existir, devolve `false`, e o `montarEntrada` segue dando `entrada_nao_encontrada`, como hoje.
- `MotivoIgnorada` ganha `'demanda_final'`.
- No comentário de cabeçalho, entra o passo "3b. demanda em status final → `ignorada` + `agente_ignorado`, sem chamar
  o provedor (M-02)".
- O orquestrador tem `demandaId` nulo e não passa por isto.

Testes antes, em `executar.test.ts`:
- **Na fila.** Para `insumo_tecnico`, `risco` e `consolidacao` (um `it.each`), crie a execução e só depois leve a
  demanda a `encerrada` (e, num segundo caso, a `entregue`). Então:
  - `executarAgente` devolve `'ignorada'`;
  - `provedor.chamadas` tem tamanho 0 e não há linha de uso;
  - há um evento `agente_ignorado` com `depois.motivo = 'demanda_final'`;
  - nenhum artefato foi gravado.
- **Durante a chamada.** Use um provedor falso que, dentro de `gerar`, leva a demanda a `entregue` pelo pool de
  administração do teste e depois devolve a saída válida. Então:
  - `executarAgente` devolve `'falhou'`;
  - o evento `falha_agente` tem `motivo: 'recusada_pelo_servico'`;
  - `provedor.chamadas` tem tamanho **1**: não houve nova tentativa;
  - há uma linha de uso `erro`;
  - não há artefato nem `aviso_email`.

**Passo 4. M-01, a citação da consolidação**

Interfaces:

```ts
// entrada-agente.ts
export type CitadosNaEntrada = { especificacaoId: string | null; parecerRiscoId: string | null };
export async function montarEntrada(db: Db, agente: Agente, chaveEntrada: string):
  Promise<{ conteudo: string; demandaId: string | null; citados: CitadosNaEntrada }>;

// executar.ts
export type DestinoDoAgente = {
  schema: z.ZodType;
  gravar(t: Transacao, deps: DepsAgente, ator: AtorAgente, exec: ExecucaoAgente, saida: unknown, citados: CitadosNaEntrada): Promise<string>;
};

// criar.ts
extras: { execucaoAgenteId?: string; especificacaoId?: string; parecerRiscoId?: string } = {}
```

- **`entrada-agente.ts`.**
  - `lerEspecificacao`, `lerEspecificacaoMaisNova` e `lerParecer` passam a ler também o `id`, fora da lista de
    permissão, como já fazem com `demandaId`. O `id` vai só para `citados`, nunca para o `conteudo`: `escolher` só
    copia os campos de `CAMPOS_DA_ESPECIFICACAO` e `CAMPOS_DO_PARECER`, e C-23 continua valendo.
  - `citados.especificacaoId` é a ESP que entrou no bloco; `citados.parecerRiscoId`, o RSK que entrou. Quando não
    houve leitura, o campo é `null` (orquestrador e insumo técnico têm os dois nulos; o risco, só o parecer).
  - Ajuste o comentário da linha 160 ("é a que o DEC vai citar").
- **`executar.ts`.**
  - Guarde o retorno inteiro de `montarEntrada`.
  - Passe `citados` para `tratarResposta` e dela para `destino.gravar`. O orquestrador, o `insumo_tecnico` e o
    `risco` ignoram o parâmetro.
  - O `consolidacao` passa `{ execucaoAgenteId: exec.id, especificacaoId, parecerRiscoId }` ao `criarPacoteDecisao`.
    Se algum dos dois for `null`, lança `ErroDominio('nao_encontrado', MENSAGEM_NAO_ENCONTRADO)`, que vira
    `recusada_pelo_servico` sem nova tentativa. Pela construção da chave isso não acontece, mas o tipo obriga a
    tratar.
- **`criar.ts`.**
  - Sob a trava, depois da recusa por status final e do limite: com `extras.especificacaoId`, lê **essa** ESP por `id`
    **e** `demandaId`, e não a mais nova. O mesmo vale para `extras.parecerRiscoId` e o RSK.
  - Sem os extras (pessoa, rota e Server Action), segue `maisNova`, como hoje.
  - Se o id citado não existir ou for de outra demanda, lança `ErroDominio('nao_encontrado', MENSAGEM_NAO_ENCONTRADO)`.
  - O comentário da linha 82 passa a dizer as duas regras: "o worker cita a ESP e o RSK que a entrada leu (M-01);
    pessoa e rota citam os mais novos, sob a trava".
  - **Rota e Server Action nunca passam `especificacaoId` nem `parecerRiscoId`.** Esses extras não vêm do corpo da
    requisição, que segue no schema Zod de hoje (C-11).

Testes antes, em `executar.test.ts`. São os passos 1-7 da 01, com a demanda fictícia `DEM-20261103-0901`:
- **A fila.** O RSK v2 é criado depois de agendar a consolidação do v1, e só a execução do v1 roda. Então:
  - o `conteudo` enviado ao provedor contém `"Resumo fictício do RSK v1"` e não contém `"Resumo fictício do RSK v2"`;
  - o DEC v1 tem `parecerRiscoId = RSK-...-v1` e `parecerRiscoVersao = 1`;
  - o DEC v1 tem `desatualizado = true`;
  - `registrarDecisao` com `aprovada` nesse DEC rejeita com `conflito` e `MENSAGENS_DECISAO.desatualizado`.
- **A chamada.** Use um provedor falso que, dentro de `gerar`, cria o RSK v2 pelo serviço, como CTO. O DEC cita o
  RSK v1.
- **A ESP durante a chamada.** Use um provedor falso que, dentro de `gerar`, cria a ESP v2 sem dúvida. O DEC cita a
  ESP v1 (`especificacaoId` e `especificacaoVersao`), e o `conteudo` enviado é o da ESP v1.
- **Sem corrida.** Um RSK e uma ESP, sem versão nova no meio: o DEC cita os dois e `desatualizado = false`. É o caso
  das linhas 256-275, que continua verde.
- Em `criar.test.ts`:
  - com `extras.parecerRiscoId` de **outra** demanda, rejeita com `nao_encontrado` e grava 0 DEC;
  - pela pessoa, sem extras, continua citando os mais novos. O teste atual já cobre esse caso.
- No teste de `entrada-agente`: `citados` traz os ids lidos, e o `conteudo` não contém nenhum dos dois ids.

**Passo 5. M-03, o aviso (`aviso-dec.ts`)**

- **No `catch` do enviador (linhas 143-151):**

  ```ts
  const definitivo = e instanceof ErroEnvioEmail && e.tipo === 'recusado';
  const esgotou = definitivo || tentativa >= TENTATIVAS_AVISO;
  ```

  O resto fica igual: `sem_provedor` segue separado, e `transitorio` (429, 5xx, rede, tempo limite, formato) segue
  tentado de novo.
- **Em volta da transação do envio:**

  ```ts
  let desfecho: Desfecho;
  try {
    desfecho = await comTransacao(deps.pool, envio);
  } catch (e) {
    desfecho = await contarErroInesperado(deps, decId, e);
  }
  ```

  Faça `contarErroInesperado(deps, decId, erro): Promise<Desfecho>` numa transação nova:
  - `select status, tentativas ... for update` na linha do aviso;
  - sem linha, devolve `sem_aviso`;
  - com status diferente de `pendente`, devolve o mesmo resultado que o envio daria (`ja_enviado`, `sem_provedor` ou
    `falhou`) e não soma nada;
  - com `pendente`, soma 1 em `tentativas` e marca `falhou` quando chegar a `TENTATIVAS_AVISO`, senão mantém
    `pendente`. Devolve `{ resultado: 'falhou' | 'tentar_de_novo', erro, tentativa }`.

  Se a própria contagem lançar, relance o **erro original**, sem contar. O pós-processamento que já existe (linhas
  156-164) faz o resto, igual à falha comum:
  - `aviso_email_falha` e `AvisoNaoEnviado` antes da 3.ª;
  - `aviso_email_falhou`, log de erro e Sentry na 3.ª, sem relançar.
- Atualize o comentário de cabeçalho (linhas 13-14): "recusa definitiva do provedor (4xx que não é 429): `falhou` na
  hora; erro inesperado fora do enviador: conta a tentativa numa transação própria, com a trava da linha; sem banco,
  sobe sem contar".
- **`aviso-dec-pronto.ts`:** muda só o comentário de cabeçalho. O ramo `aviso_erro_inesperado` passa a valer só quando
  nem a contagem foi possível.

Testes antes:
- **`aviso-dec.test.ts`, o 4xx definitivo.**
  - Com o enviador falso lançando `new ErroEnvioEmail('recusado')`, a 1.ª chamada de `enviarAviso` devolve `'falhou'`
    sem lançar, e a linha fica `{ status: 'falhou', tentativas: 1 }`.
  - Há um log `aviso_email_falhou` com `tentativa: 1` e um `capturarErro` com `evento: 'aviso_email_falhou'`.
  - Uma 2.ª chamada devolve `'falhou'` sem chamar o enviador.
- **`aviso-dec.test.ts`, o 4xx pelo `EnviadorResend`.** Com `fetch` injetado, `it.each([400, 403, 422])` dá o mesmo
  resultado: `falhou` na 1.ª.
- **`aviso-dec.test.ts`, o que continua tentado de novo.** Com `it.each([429, 500, 503])`, a linha fica `pendente`
  com `tentativas: 1` e `enviarAviso` lança `AvisoNaoEnviado`. Se os testes atuais (`:309` e `:320`) já cobrem algum
  desses status, acrescente só os que faltam.
- **`aviso-dec.test.ts`, o erro inesperado.** Use `config.urlBase = 'ftp://orquestrador.exemplo.test'` e um enviador
  que daria certo:
  - a 1.ª e a 2.ª chamadas lançam `AvisoNaoEnviado`, com a linha em `pendente` e `tentativas` 1 e depois 2;
  - a 3.ª devolve `'falhou'`, com `tentativas: 3`;
  - `capturarErro` é chamado uma vez só, na 3.ª, com `aviso_email_falhou`;
  - o enviador não é chamado nenhuma vez;
  - nenhum log leva a URL, o remetente ou o destinatário.
- **`aviso-dec-pronto.test.ts`, o handler com o mesmo `urlBase`, três chamadas do mesmo job.**
  - A 1.ª e a 2.ª rejeitam com `aviso_nao_enviado`.
  - A 3.ª resolve, com `aviso_job_tratado` e `status: 'falhou'`.
  - A linha termina `{ status: 'falhou', tentativas: 3 }`.
- **`aviso-dec-pronto.test.ts:129` (pool que falha no `connect`) fica como está.** É o caso "sem banco, sobe sem
  contar", e continua esperando `aviso_erro_inesperado`.

**Comandos da 03-correcao** (todos na lista **Pode** do backend):
- `docker compose -f docker-compose.dev.yml up -d`, se o banco de teste não estiver de pé;
- `pnpm test`, a cada passo e no fim, com a contagem de aprovados e falhas;
- `pnpm lint` e `pnpm typecheck`, no fim.

### Proibido, e recusado na revisão como alto

- Recusar por estado final depois de `conferirLimite`, depois de qualquer insert ou fora da transação da trava. A ordem
  é trava → recusa → limite.
- Uma segunda lista de estados finais em qualquer arquivo, fora de `transicoes.ts`.
- Usar `entrada_invalida` ou `limite_excedido` na recusa por estado final, porque fazem o executor tentar de novo.
- Levar ao `conteudo` do provedor o id da ESP ou do RSK, ou qualquer campo fora da lista de permissão (C-23, C-24).
- Aceitar `especificacaoId` ou `parecerRiscoId` vindos do corpo da rota, da Server Action ou da saída do modelo
  (C-11, C-25).
- Mudar o nível do DEC de agente (A-04), a regra de um DEC aprovado por demanda (A-02), o limite por ator (C-36), o
  payload `{ decId }` do job (C-22), o `retryLimit` ou o `singletonKey` da fila.
- Tentar de novo o 4xx definitivo, ou deixar de tentar de novo o 429 e o 5xx.
- Mandar ao log ou ao Sentry destinatário, remetente, corpo do e-mail, URL ou mensagem crua de erro (C-21).
- Apagar os testes das linhas 242 de `criar.test.ts` e 201 de `servico.test.ts`. Eles mudam de lista, não somem.
- Afrouxar asserção, ou usar `.skip`, `.only` ou `.todo`.
- Criar migration, mexer em `src/db/` ou em `e2e/`.
- Ler `.env` ou usar dado pessoal real.

### Teste de regressão esperado

- **M-01:** o teste do RSK v2 criado entre o agendamento e a execução da consolidação do v1. O resumo enviado é o do
  v1, o DEC cita o v1 e sai `desatualizado`, e a aprovação é barrada. Mais as duas variantes da chamada ao provedor
  (RSK v2 e ESP v2).
- **M-02:** a recusa `conflito` com a mensagem fixa para ESP, RSK e DEC em `entregue` e `encerrada`, pela pessoa e
  pelo agente, sem artefato, evento, execução, aviso nem job. Mais a criação permitida nos sete não finais, a execução
  na fila encerrada como `ignorada` sem chamar o provedor, e a demanda fechada durante a chamada com `falhou` e uma
  chamada só.
- **M-03:** o 4xx definitivo com `falhou` na 1.ª, e o 429 e o 5xx com `pendente` e nova tentativa. O erro inesperado
  soma 1, 2 e 3 e termina `falhou` com Sentry uma vez, e pelo handler o job termina sem erro na 3.ª. O banco fora
  continua com `aviso_erro_inesperado`.
- **`test/estatico/projeto.test.ts`:** versão 0.1.5.

### Definição de pronto do pedido, por etapa da cadeia curta

| Item | Etapa dona |
|---|---|
| `pnpm test`, `pnpm lint` e `pnpm typecheck` verdes | `03-correcao` (engenheiro-backend). O maestro confere de novo no `verificar` |
| `pnpm test:e2e` verde três vezes seguidas | `04-regressao` (qa-automacao) |
| `CHANGELOG.md` com a versão 0.1.5 | `06-documentacao` (documentacao-tecnica). O `version` do `package.json` e o `test/estatico/projeto.test.ts` ficam com a `03-correcao` (passo 0) |
| PR com CI verde | Parada 3 (maestro), depois da `05-entrega` |

**Para a `04-regressao`:**
- Rode `pnpm test:e2e` três vezes seguidas, cada uma num banco novo, terminando com 0 pulado.
- **Atenção ao `e2e/decisao.spec.ts`.** Os testes dele criam DEC pela API numa demanda só da spec, e o "Arquivar" a
  deixa `encerrada`. Num banco novo, na ordem do arquivo, o "Arquivar" vem depois dos testes que criam DEC, e nada
  muda. Já numa segunda passada no **mesmo** banco (o `--repeat-each=3` do pedido 0005, ou um teste rodado sozinho
  depois do "Arquivar"), o `novoPacote` passa a receber 409 com `MENSAGEM_DEMANDA_FINAL`. Esse é o comportamento novo
  e certo, não defeito.
  - Se algum spec do e2e montar a cena criando ESP, RSK ou DEC numa demanda `entregue` ou `encerrada`, o ajuste é da
    cena do teste, com a pré-condição explícita (`exigeBancoRecemSemeado` ou demanda própria). Não é ajuste da regra.
  - Registre na entrega cada spec ajustado.
- Confira pelo `git diff` que não há asserção afrouxada nem `.skip`, `.only` ou `.todo` novo.

**Para a `05-entrega`:** nada muda em `Dockerfile`, nos workflows nem em `docs/operacao/`. O `docker build` confere que
a imagem sai com a 0.1.5.

**Para a `06-documentacao`:** a entrada 0.1.5 do `CHANGELOG.md` traz três mudanças de comportamento:
- o DEC da consolidação cita a ESP e o RSK que o agente leu, e pode nascer desatualizado;
- ESP, RSK e DEC são recusados com 409 em demanda entregue ou encerrada, e a execução de agente na fila fica
  `ignorada` (`demanda_final`);
- o aviso marca `falhou` na hora no 4xx definitivo, e o erro inesperado passa a contar tentativa.

Se o manual técnico tiver a tabela de motivos de `agente_ignorado` ou a regra de nova tentativa do aviso, ela muda
junto.

## Decisões tomadas

- M-01: o DEC cita o RSK e a ESP que a entrada leu, e não os mais novos. Fecha as duas janelas (fila e chamada ao provedor) sem conferência extra, e a defesa contra aprovar o DEC velho já existe (`desatualizado`, `decidir.ts:214`).
- A ESP entra no M-01: é o mesmo defeito e a mesma correção, e sem ela o critério "resumo e citação batem" continua falso para a ESP.
- O DEC que nasce desatualizado ainda leva a demanda a `pronta_para_decisao` e agenda o aviso, como já acontece hoje quando um RSK novo chega depois do DEC. Barrar isso muda o fluxo de status, está fora do M-01, e a execução do RSK novo gera o DEC certo logo depois.
- Recusa por estado final com `conflito` (409): `entrada_invalida` e `limite_excedido` fazem o executor tentar de novo, com mais chamadas pagas.
- A recusa vem logo depois da trava e antes do limite: é o primeiro ponto em que o status lido é confiável, e fica antes de todo insert, evento, gatilho e aviso, como a ESP pede.
- A conferência antes da chamada paga entra, como `ignorada` com `demanda_final`. A meta do M-02 é custo, e a recusa no serviço sozinha deixa passar a chamada da execução que já estava na fila.
- Os estados finais saem de `FINAIS` em `transicoes.ts`, e o teste amarra a lista aos status sem transição manual de saída: é a máquina de estados que a ESP manda usar.
- A aprovação e o Pedido de um DEC já existente em demanda `encerrada` ficam fora: a ESP trata de criação, e mexer no fluxo de decisão com 2FA aumenta o risco do pedido.
- No M-03, a contagem do erro inesperado fica numa transação própria, com `for update`: o erro desfez a do envio, e a trava impede somar duas vezes com um job concorrente.
- O 4xx definitivo marca `falhou` na 1.ª pelo `tipo` que o `EnviadorResend` já classifica, sem mexer em `enviador.ts`.
- `engenheiro-backend` numa correção só: tudo está em `src/`, `test/` e `package.json`, todos na lista **Pode** dele, e os três defeitos mexem nos mesmos módulos de domínio.
- Sem migration: não há coluna nova, e o motivo novo vai no `jsonb` do evento.
- Na primeira versão desta entrega, listei a pasta do pedido pelo Bash. É um comando que só lê e não está na minha lista **Pode**. O maestro liberou essa listagem pela regra de Fabiano para bloqueio só de leitura, por isso ela não aparece em "Comandos executados". Todo o resto foi lido pela ferramenta Read e pelo `git show`.

## Pendências

- Para registro à parte (novo médio, fora deste pedido): `registrarDecisao` (`decidir.ts:201-219`) e `gerarPedido` (`gerar.ts:42-61`) não conferem o status da demanda. Um DEC pendente de uma demanda levada a `encerrada` à mão ainda pode ser aprovado e gerar Pedido (achado da 01, D-02).
- Para o `ux-ui-design`, à parte: a tela de detalhe da demanda em status final pode continuar mostrando as ações de nova ESP, RSK ou DEC. Com esta correção, a pessoa recebe a mensagem fixa do 409. Esconder a ação é decisão de interface, fora deste pedido.
- Para a `03-correcao`: se a interface do painel tiver uma tabela de rótulos para os motivos de `agente_ignorado`, o `demanda_final` precisa entrar nela. Se isso exigir mudar tela, registre na entrega e devolva para a triagem; não invente texto de interface.
- Para a `04-regressao`: o `decisao.spec.ts` rodado de novo no mesmo banco passa a receber 409 depois do "Arquivar" (ver acima). Isso é esperado, e a prova vale com banco novo a cada execução.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/db/schema/` — lista dos arquivos de schema
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/modules/limites.ts` — conferirLimite só conta e trava, não grava
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/modules/historico/registrar.ts` — motivo do evento vai em jsonb, sem enumeração no banco
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:docs/construcao/` — pedidos anteriores
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -4` — af979fa (01-reproducao) sobre 3f97f54 (00-inicio) e cf36ec5 (main 0.1.4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo construcao/DEC-DEM-20261103-0006-v1, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/modules/pacotes-decisao/consultas.ts` — desatualizado compara a ESP e o RSK citados com os mais novos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:e2e/` — lista dos specs do e2e

## Critério de pronto atendido

- [x] (02 triagem) `proximo` é um dos três engenheiros
- [x] (02 triagem) cada item da definição de pronto do pedido está atribuído a uma etapa da cadeia curta, pela lista da Entrega
