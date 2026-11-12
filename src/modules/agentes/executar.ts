// Execução de um agente de IA (RF-16 a RF-19; 02, seção 8; ADR-06, ADR-07, P1-e). Ordem:
// 1. reivindica a execução (UPDATE condicional): nada voltou → `ja_tratada`, sem chamar o provedor (CA-16.4);
// 2. agente desligado, sem modelo com preço vigente ou sem provedor (sem chave) → `ignorada` + `agente_ignorado` (CA-19.4);
// 3. gasto do mês ≥ teto → `ignorada` + `suspensao_por_teto` (CA-18.1, CA-18.3, C-26);
// 3a. M-5 da 0019: a demanda da entrada (a da chave, que montarEntrada lê). Chave que não acha → `falhou`
//     `entrada_nao_encontrada`; agente fora o orquestrador sem demanda, ou com demanda diferente da execução → o mesmo
//     `falhou` (falha fechada), sem chamar o provedor. 3b e 3c olham esta demanda;
// 3b. demanda em status final → `ignorada` + `agente_ignorado`, sem chamar o provedor (M-02);
// 3c. demanda do Awave ainda não confirmada por pessoa → volta a `pendente`, sem job, com `agente_ignorado`
//     `sem_confirmacao` (IN-06, D-07) e o resultado `aguardando_confirmacao`; a chave não é gasta, e a confirmação a
//     reenfileira (M-5 da 0019);
// 4. monta a entrada pela lista de permissão, minimizada (T24), com o prompt do agente (T26);
// 5. chama o provedor fora de qualquer transação;
// 6. JSON + schema da rota (ADR-09). Válido: numa transação, o serviço da API grava o artefato com o ator agente (passa
//    por `autorizar`) e a execução fica `concluida`. Inválido, recusado pela regra do serviço ou erro transitório: nova
//    tentativa em 30 s e depois em 2 min; na 3ª, `falhou` + `falha_agente` sem conteúdo (CA-16.3). Credencial recusada
//    ou erro que não é do provedor: `falhou` na hora, com Sentry.
// No orquestrador (T28), `falhou` e `ignorada` deixam a entrada pendente como `falhou`, para a pessoa preencher à mão.
// Toda chamada feita ao provedor deixa uma linha de uso, em transação própria, com o resultado já conhecido (CA-17.2).
// Nada da saída define status, autoria nem ator (C-25): o schema descarta chave desconhecida e o serviço usa o ator.
// O log leva só agente, ids, tentativa e resultado (C-21); o evento, só o agente, a tentativa e o motivo (C-30).
import { eq } from 'drizzle-orm';
import type { z } from 'zod';
import { PROMPTS } from '../../agents';
import { demanda, type ResultadoUso } from '../../db/schema';
import { comTransacao, type Transacao } from '../../db/transacao';
import type { Deps } from '../../lib/deps';
import { ErroDominio, MENSAGEM_NAO_ENCONTRADO } from '../../lib/erros';
import { log } from '../../lib/log';
import { capturarErro } from '../../lib/sentry';
import type { Agente, AtorAgente, AtorSistema } from '../acesso/ator';
import { aguardaConfirmacao } from '../demandas/confirmacao';
import { marcarPendenteComoFalha } from '../demandas/entradas-pendentes';
import { ehStatusFinal } from '../demandas/transicoes';
import { criarEspecificacaoSchema } from '../especificacoes/schemas';
import { criarEspecificacao } from '../especificacoes/servico';
import { registrarEvento, type AcaoEvento } from '../historico/registrar';
import { criarPacoteDecisao, NIVEL_DO_DEC_DE_AGENTE } from '../pacotes-decisao/criar';
import { criarParecerRiscoSchema } from '../pareceres-risco/schemas';
import { criarParecerRisco } from '../pareceres-risco/servico';
import { obterConfiguracaoAgente } from './configuracao';
import { demandaDaChave, montarEntrada, type CitadosNaEntrada, type EntradaDoAgente } from './entrada-agente';
import { TENTATIVAS_MAXIMAS } from './espera';
import { confirmarPosse, devolverAPendenteSemJob, encerrar, ExecucaoPerdida, reagendar, reivindicar, type ExecucaoAgente } from './execucoes';
import { calcularCusto, precoVigente, type PrecoPorMilhao } from './preco';
import { ErroProvedor, type ProvedorIA, type RespostaDoProvedor } from './provedor';
import { gravarSaidaOrquestrador } from './saida-orquestrador';
import { SCHEMA_DE_SAIDA, saidaConsolidacaoSchema, saidaOrquestradorSchema } from './schemas';
import { situacaoDoTeto } from './teto';
import { registrarUso } from './uso';

// O que a execução usa das dependências: o worker monta estas, sem Better Auth (os serviços usam db, pool e relógio).
export type DepsAgente = Pick<Deps, 'db' | 'pool' | 'relogio' | 'fila'> & { provedor: ProvedorIA | null };
export type ResultadoExecucao = 'concluida' | 'reagendada' | 'falhou' | 'ignorada' | 'ja_tratada' | 'aguardando_confirmacao';

export type DestinoDoAgente = {
  schema: z.ZodType;
  // Grava o artefato pelo serviço da API, na transação de quem chama, e devolve o id dele. `citados` é a ESP e o RSK que a
  // entrada leu (M-01): só a consolidação usa, para o DEC citar o que o modelo leu.
  gravar(t: Transacao, deps: DepsAgente, ator: AtorAgente, exec: ExecucaoAgente, saida: unknown, citados: CitadosNaEntrada): Promise<string>;
};

// Motivos que vão ao evento e ao log: enumeração fechada, sem texto da saída nem da entrada.
type MotivoFalha =
  | 'fora_do_schema'
  | 'erro_provedor'
  | 'limite_excedido'
  | 'autenticacao'
  | 'erro_inesperado'
  | 'recusada_pelo_servico'
  | 'entrada_nao_encontrada'
  | 'sem_destino'
  | 'tentativas_esgotadas';
type MotivoIgnorada = 'desligado' | 'sem_preco' | 'sem_provedor' | 'teto' | 'demanda_final' | 'sem_confirmacao';

const SISTEMA: AtorSistema = { tipo: 'sistema' };
const atorDo = (agente: Agente): AtorAgente => ({ tipo: 'agente', agente, prefixoToken: null });

// ESP, RSK e DEC são da demanda da execução (chave demanda:, esp: ou rsk:, sempre com demanda).
function demandaDa(exec: ExecucaoAgente): string {
  if (!exec.demandaId) throw new ErroDominio('nao_encontrado', MENSAGEM_NAO_ENCONTRADO);
  return exec.demandaId;
}

// A consolidação sempre lê uma ESP e um RSK (chave rsk:); o tipo obriga a tratar o nulo, que vira recusa sem nova
// tentativa.
function citadosDaConsolidacao(citados: CitadosNaEntrada): { especificacaoId: string; parecerRiscoId: string } {
  if (citados.especificacaoId === null || citados.parecerRiscoId === null) throw new ErroDominio('nao_encontrado', MENSAGEM_NAO_ENCONTRADO);
  return { especificacaoId: citados.especificacaoId, parecerRiscoId: citados.parecerRiscoId };
}

// M-02: lê só o status. Demanda que não existe → false, e a montagem da entrada segue dando `entrada_nao_encontrada`.
async function demandaEmStatusFinal(db: DepsAgente['db'], demandaId: string): Promise<boolean> {
  const [d] = await db.select({ status: demanda.status }).from(demanda).where(eq(demanda.id, demandaId));
  return d !== undefined && ehStatusFinal(d.status);
}

// O orquestrador cria a demanda a partir da entrada pendente (T28); os outros três gravam ESP, RSK e DEC da demanda.
export const DESTINOS: Readonly<Partial<Record<Agente, DestinoDoAgente>>> = Object.freeze({
  orquestrador: {
    schema: SCHEMA_DE_SAIDA.orquestrador,
    gravar: (t, deps, ator, exec, saida) => gravarSaidaOrquestrador(t, deps, ator, exec, saidaOrquestradorSchema.parse(saida)),
  },
  insumo_tecnico: {
    schema: SCHEMA_DE_SAIDA.insumo_tecnico,
    gravar: async (t, deps, ator, exec, saida) =>
      (await criarEspecificacao(deps, ator, demandaDa(exec), criarEspecificacaoSchema.parse(saida), t, { execucaoAgenteId: exec.id })).id,
  },
  risco: {
    schema: SCHEMA_DE_SAIDA.risco,
    gravar: async (t, deps, ator, exec, saida) =>
      (await criarParecerRisco(deps, ator, demandaDa(exec), criarParecerRiscoSchema.parse(saida), t, { execucaoAgenteId: exec.id })).id,
  },
  // A saída não tem o nível de aprovação (A-04): é o da regra do servidor, que o serviço também impõe a todo ator agente.
  // O DEC cita a ESP e o RSK que a entrada leu, e não os mais novos na hora de gravar (M-01).
  consolidacao: {
    schema: SCHEMA_DE_SAIDA.consolidacao,
    gravar: async (t, deps, ator, exec, saida, citados) =>
      (
        await criarPacoteDecisao(
          deps,
          ator,
          demandaDa(exec),
          { ...saidaConsolidacaoSchema.parse(saida), nivelAprovacaoRequerido: NIVEL_DO_DEC_DE_AGENTE },
          t,
          { execucaoAgenteId: exec.id, ...citadosDaConsolidacao(citados) },
        )
      ).id,
  },
});

// --- leitura da resposta ---

const inteiroNaoNegativo = (n: unknown): number | null => (typeof n === 'number' && Number.isSafeInteger(n) && n >= 0 ? n : null);

// O prompt pede JSON puro; um bloco de código em volta (```json … ```) é tirado antes do parse. O schema decide o resto.
const CERCA = /^```[a-zA-Z]*\s*\n([\s\S]*?)\n?\s*```$/;

function lerSaida(agente: Agente, texto: string): { ok: true; dados: unknown } | { ok: false } {
  const limpo = texto.trim();
  let bruto: unknown;
  try {
    bruto = JSON.parse(CERCA.exec(limpo)?.[1] ?? limpo);
  } catch {
    return { ok: false };
  }
  const r = SCHEMA_DE_SAIDA[agente].safeParse(bruto);
  return r.success ? { ok: true, dados: r.data } : { ok: false };
}

// --- estados finais ---

type Contexto = { deps: DepsAgente; exec: ExecucaoAgente };

const camposDeLog = ({ exec }: Contexto) => ({ agente: exec.agente, execucaoId: exec.id, demandaId: exec.demandaId, tentativa: exec.tentativas });

// O orquestrador não vai mais tratar a entrada: a pendente fica `falhou`, para a pessoa preencher à mão (T28, 03 T04).
async function liberarPendente(tx: Transacao['tx'], exec: ExecucaoAgente): Promise<void> {
  if (exec.agente === 'orquestrador') await marcarPendenteComoFalha(tx, exec.chaveEntrada);
}

async function falhar(c: Contexto, motivo: MotivoFalha): Promise<ResultadoExecucao> {
  const { deps, exec } = c;
  await comTransacao(deps.pool, async ({ tx }) => {
    await encerrar(tx, exec, 'falhou', deps.relogio);
    await liberarPendente(tx, exec);
    await registrarEvento(
      tx,
      {
        ator: atorDo(exec.agente),
        demandaId: exec.demandaId,
        entidade: 'execucao_agente',
        entidadeId: exec.id,
        acao: 'falha_agente',
        depois: { agente: exec.agente, tentativas: exec.tentativas, motivo },
      },
      deps.relogio,
    );
  });
  log.warn({ evento: 'falha_agente', codigoErro: motivo, status: 'falhou', ...camposDeLog(c) });
  return 'falhou';
}

async function ignorar(c: Contexto, acao: Extract<AcaoEvento, 'agente_ignorado' | 'suspensao_por_teto'>, motivo: MotivoIgnorada): Promise<ResultadoExecucao> {
  const { deps, exec } = c;
  await comTransacao(deps.pool, async ({ tx }) => {
    await encerrar(tx, exec, 'ignorada', deps.relogio);
    // Ignorada não roda de novo (a execução é única por entrada): a pendente não fica esperando à toa.
    await liberarPendente(tx, exec);
    await registrarEvento(
      tx,
      { ator: SISTEMA, demandaId: exec.demandaId, entidade: 'execucao_agente', entidadeId: exec.id, acao, depois: { agente: exec.agente, motivo } },
      deps.relogio,
    );
  });
  log.info({ evento: acao, codigoErro: motivo, status: 'ignorada', ...camposDeLog(c) });
  return 'ignorada';
}

// M-5 da 0019 (P2): a demanda aguarda a confirmação de uma pessoa. A execução volta a pendente, sem job, com a
// tentativa devolvida, e a confirmação a reenfileira (dispararOuReenfileirar). O evento é o mesmo de antes
// (`agente_ignorado` com `sem_confirmacao`): o texto fixo do histórico (D-18) não muda.
async function adiarAteConfirmacao(c: Contexto): Promise<ResultadoExecucao> {
  const { deps, exec } = c;
  const motivo: MotivoIgnorada = 'sem_confirmacao';
  await comTransacao(deps.pool, async ({ tx }) => {
    await devolverAPendenteSemJob(tx, exec, deps.relogio);
    await registrarEvento(
      tx,
      { ator: SISTEMA, demandaId: exec.demandaId, entidade: 'execucao_agente', entidadeId: exec.id, acao: 'agente_ignorado', depois: { agente: exec.agente, motivo } },
      deps.relogio,
    );
  });
  log.info({ evento: 'agente_ignorado', codigoErro: motivo, status: 'aguardando_confirmacao', ...camposDeLog(c) });
  return 'aguardando_confirmacao';
}

// Ainda há tentativa: volta a pendente com o job da próxima; senão, falha com o motivo.
async function tentarDeNovoOuFalhar(c: Contexto, motivo: MotivoFalha): Promise<ResultadoExecucao> {
  if (c.exec.tentativas >= TENTATIVAS_MAXIMAS) return falhar(c, motivo);
  await comTransacao(c.deps.pool, (t) => reagendar(t, c.deps, c.exec));
  log.info({ evento: 'agente_reagendado', codigoErro: motivo, status: 'reagendada', ...camposDeLog(c) });
  return 'reagendada';
}

// --- execução ---

export async function executarAgente(deps: DepsAgente, execucaoId: string): Promise<ResultadoExecucao> {
  const exec = await reivindicar(deps.db, execucaoId, deps.relogio);
  if (!exec) return 'ja_tratada';
  const c: Contexto = { deps, exec };
  try {
    return await executarReivindicada(c);
  } catch (e) {
    // Outro worker reivindicou depois de a trava vencer, ou a execução já terminou: quem ficou para trás não grava nada.
    if (e instanceof ExecucaoPerdida) {
      log.warn({ evento: 'agente_execucao_perdida', status: 'ja_tratada', ...camposDeLog(c) });
      return 'ja_tratada';
    }
    throw e;
  }
}

async function executarReivindicada(c: Contexto): Promise<ResultadoExecucao> {
  const { deps, exec } = c;
  // O worker caiu no meio da 3ª tentativa e a trava venceu: não há 4ª chamada.
  if (exec.tentativas > TENTATIVAS_MAXIMAS) return falhar(c, 'tentativas_esgotadas');
  const destino = DESTINOS[exec.agente];
  if (!destino) return falhar(c, 'sem_destino');

  const config = await obterConfiguracaoAgente(deps.db, exec.agente);
  if (!config.ligado) return ignorar(c, 'agente_ignorado', 'desligado');
  const preco = config.modelo === null ? null : await precoVigente(deps.db, config.modelo, deps.relogio.agora());
  if (config.modelo === null || preco === null) return ignorar(c, 'agente_ignorado', 'sem_preco');
  if (!deps.provedor) return ignorar(c, 'agente_ignorado', 'sem_provedor');
  if ((await situacaoDoTeto(deps.db, deps.relogio)).suspenso) return ignorar(c, 'suspensao_por_teto', 'teto');
  // 3a (M-5 da 0019): as guardas olham a demanda que a entrada vai ler, achada pela chave. Sem ela (fora o orquestrador)
  // ou diferente da execução, falha fechada: não há uso legítimo, e os DESTINOS gravam na demanda da execução.
  let demandaDaEntrada: string | null;
  try {
    demandaDaEntrada = await demandaDaChave(deps.db, exec.agente, exec.chaveEntrada);
  } catch (e) {
    if (e instanceof ErroDominio && e.codigo === 'nao_encontrado') return falhar(c, 'entrada_nao_encontrada');
    throw e;
  }
  if (exec.agente !== 'orquestrador' && (demandaDaEntrada === null || demandaDaEntrada !== exec.demandaId)) return falhar(c, 'entrada_nao_encontrada');
  // M-02: a execução que estava na fila quando a demanda chegou a status final não chama o provedor. A demanda fechada
  // durante a chamada é recusada pelo serviço, sob a trava (409 → recusada_pelo_servico, sem nova tentativa).
  if (demandaDaEntrada !== null && (await demandaEmStatusFinal(deps.db, demandaDaEntrada))) return ignorar(c, 'agente_ignorado', 'demanda_final');
  // 3c (0.3.0, IN-06, D-07): defesa em profundidade do gatilho. A execução de uma demanda do Awave que nenhuma pessoa
  // confirmou não chama o provedor nem grava uso, venha de onde vier. M-5 da 0019: sem gastar a chave.
  if (demandaDaEntrada !== null && (await aguardaConfirmacao(deps.db, demandaDaEntrada))) return adiarAteConfirmacao(c);

  let entrada: EntradaDoAgente;
  try {
    entrada = await montarEntrada(deps.db, exec.agente, exec.chaveEntrada);
  } catch (e) {
    if (e instanceof ErroDominio && e.codigo === 'nao_encontrado') return falhar(c, 'entrada_nao_encontrada');
    throw e;
  }

  const prompt = PROMPTS[exec.agente];
  const chamada = { modelo: config.modelo, preco };
  let resposta: RespostaDoProvedor;
  try {
    resposta = await deps.provedor.gerar({ modelo: config.modelo, sistema: prompt.sistema, conteudo: entrada.conteudo, maxTokens: prompt.maxTokens });
  } catch (e) {
    return tratarErroDaChamada(c, chamada, e);
  }
  return tratarResposta(c, chamada, destino, resposta, entrada.citados);
}

type Chamada = { modelo: string; preco: PrecoPorMilhao };

// Uma linha por chamada, em transação própria. O modelo é o ligado no agente, o mesmo do preço usado no custo.
async function usar(c: Contexto, ch: Chamada, resultado: ResultadoUso, tokensEntrada: number, tokensSaida: number): Promise<void> {
  await registrarUso(
    c.deps.db,
    {
      execucaoId: c.exec.id,
      agente: c.exec.agente,
      demandaId: c.exec.demandaId,
      modelo: ch.modelo,
      tokensEntrada,
      tokensSaida,
      custo: calcularCusto(ch.preco, tokensEntrada, tokensSaida),
      resultado,
    },
    c.deps.relogio,
  );
}

async function tratarErroDaChamada(c: Contexto, ch: Chamada, e: unknown): Promise<ResultadoExecucao> {
  // RangeError: o provedor recusou o pedido antes de chamar (maxTokens); não houve chamada a registrar.
  if (!(e instanceof RangeError)) {
    const tokens = e instanceof ErroProvedor ? e.tokens : undefined;
    await usar(c, ch, 'erro', inteiroNaoNegativo(tokens?.entrada) ?? 0, inteiroNaoNegativo(tokens?.saida) ?? 0);
  }
  if (e instanceof ErroProvedor && e.tipo === 'transitorio') return tentarDeNovoOuFalhar(c, 'erro_provedor');
  capturarErro(e, { evento: 'falha_agente' });
  return falhar(c, e instanceof ErroProvedor ? 'autenticacao' : 'erro_inesperado');
}

async function tratarResposta(
  c: Contexto,
  ch: Chamada,
  destino: DestinoDoAgente,
  resposta: RespostaDoProvedor,
  citados: CitadosNaEntrada,
): Promise<ResultadoExecucao> {
  const { deps, exec } = c;
  const tokensEntrada = inteiroNaoNegativo(resposta.tokensEntrada);
  const tokensSaida = inteiroNaoNegativo(resposta.tokensSaida);
  // Resposta fora do envelope (tokens que não são inteiros, texto que não é texto): conta como erro transitório.
  if (tokensEntrada === null || tokensSaida === null || typeof resposta.texto !== 'string') {
    await usar(c, ch, 'erro', tokensEntrada ?? 0, tokensSaida ?? 0);
    return tentarDeNovoOuFalhar(c, 'erro_provedor');
  }
  const registrar = (resultado: ResultadoUso) => usar(c, ch, resultado, tokensEntrada, tokensSaida);

  const saida = lerSaida(exec.agente, resposta.texto);
  if (!saida.ok) {
    await registrar('fora_do_schema');
    return tentarDeNovoOuFalhar(c, 'fora_do_schema');
  }

  try {
    await comTransacao(deps.pool, async (t) => {
      await confirmarPosse(t.tx, exec);
      const artefatoId = await destino.gravar(t, deps, atorDo(exec.agente), exec, saida.dados, citados);
      await encerrar(t.tx, exec, 'concluida', deps.relogio, artefatoId);
    });
  } catch (e) {
    // ExecucaoPerdida (outro worker ficou com a execução) cai no `throw` do fim, depois da linha de uso.
    // A recusa pela regra do serviço (400, como os campos de construção da ESP) é saída inválida, com nova tentativa.
    if (e instanceof ErroDominio && e.codigo === 'entrada_invalida') {
      await registrar('fora_do_schema');
      return tentarDeNovoOuFalhar(c, 'fora_do_schema');
    }
    await registrar('erro');
    if (e instanceof ErroDominio && e.codigo === 'limite_excedido') return tentarDeNovoOuFalhar(c, 'limite_excedido');
    if (e instanceof ErroDominio) return falhar(c, 'recusada_pelo_servico');
    throw e;
  }
  await registrar('sucesso');
  log.info({ evento: 'agente_concluido', status: 'concluida', ...camposDeLog(c) });
  return 'concluida';
}
