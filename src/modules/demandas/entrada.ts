// Entrada de demanda colando o texto recebido (RF-05). Modo manual: a pessoa cola o texto (e-mail, mensagem) e
// preenche os campos; a demanda e o texto bruto nascem na mesma transação. Com `entradaPendenteId`, a pessoa preenche
// à mão a partir de uma entrada que foi ao agente: o texto, a origem e a data são os da pendente, que é apagada (T28).
// Modo agente (T28, T-01): o texto fica em `entrada_pendente` e vai ao agente orquestrador, que propõe os campos; a
// demanda nasce quando ele termina. Com o orquestrador desligado ou suspenso pelo teto, 409 com a mensagem da tela.
//
// O texto bruto é dado pessoal de terceiro (D1, D2): fica só em `entrada_bruta` (e, antes da demanda, em
// `entrada_pendente`), nunca na vista da demanda, no histórico nem no log, e é expurgado no prazo de retenção (T31).
import { z } from 'zod';
import { entradaBruta, entradaPendente, type Origem } from '../../db/schema/demandas';
import { comTransacao, type Transacao } from '../../db/transacao';
import { ErroDominio } from '../../lib/erros';
import type { AtorPessoa } from '../acesso/ator';
import { autorizar } from '../acesso/matriz';
import { dispararSeLigado, estadoDoAgente } from '../agentes/gatilhos';
import type { DemandaVista } from './consultas';
import { chaveDaPendente, converterEntradaPendente, travarEntradaPendente } from './entradas-pendentes';
import { LIMITE_NOME, PAPEIS_SOLICITANTE, criarDemandaSchema } from './schemas';
import { criarDemanda, type DepsComFila } from './servico';

// RNF-04: o texto colado vai até 100.000 caracteres (os campos da demanda seguem com 10.000).
export const LIMITE_TEXTO_BRUTO = 100_000;
export const LIMITE_REFERENCIA_ORIGEM = 500;

// O que a pessoa lê quando pede o agente e ele está desligado (texto fixado na T17 do plano).
export const MENSAGEM_ORQUESTRADOR_DESLIGADO = 'O agente orquestrador está desligado. Preencha os campos abaixo.';
// E quando o teto de gasto suspendeu os agentes (03, T04, alerta de modo).
export const MENSAGEM_ORQUESTRADOR_SUSPENSO = 'Agentes suspensos pelo teto de gasto. Preencha os campos abaixo.';

export const CANAIS_ORIGEM = ['email', 'mensagem', 'formulario', 'outro'] as const;

export const origemSchema = z.object({
  canal: z.enum(CANAIS_ORIGEM).optional(),
  referencia: z.string().trim().max(LIMITE_REFERENCIA_ORIGEM).optional(),
});

// O texto não passa por trim: é guardado como chegou. Os campos da demanda são os de criarDemandaSchema, sem autoria
// (C-11: `z.object` descarta chave desconhecida).
export const entradaManualSchema = criarDemandaSchema.extend({
  modo: z.literal('manual'),
  texto: z.string().max(LIMITE_TEXTO_BRUTO).optional(),
  origem: origemSchema.optional(),
  entradaPendenteId: z.uuid().optional(),
});

export const entradaAgenteSchema = z.object({
  modo: z.literal('agente'),
  texto: z.string().trim().min(1).max(LIMITE_TEXTO_BRUTO),
  solicitanteNome: z.string().trim().min(1).max(LIMITE_NOME),
  solicitantePapel: z.enum(PAPEIS_SOLICITANTE).optional(),
  origem: origemSchema.optional(),
});

export const entradaSchema = z.discriminatedUnion('modo', [entradaManualSchema, entradaAgenteSchema]);

export type Entrada = z.output<typeof entradaSchema>;
export type EntradaManual = z.output<typeof entradaManualSchema>;
export type EntradaAgente = z.output<typeof entradaAgenteSchema>;
export type ResultadoEntrada = { tipo: 'demanda'; demanda: DemandaVista } | { tipo: 'pendente'; entradaId: string };

// Só o que foi informado; nada informado vira nulo (a coluna aceita nulo, e o CHECK pede objeto quando houver).
function origemParaGravar(origem: z.output<typeof origemSchema> | undefined): Origem | null {
  const saida: Origem = {};
  if (origem?.canal) saida.canal = origem.canal;
  if (origem?.referencia) saida.referencia = origem.referencia;
  return Object.keys(saida).length > 0 ? saida : null;
}

const temTexto = (texto: string | undefined): texto is string => texto !== undefined && texto.trim() !== '';

async function registrarManual(deps: DepsComFila, ator: AtorPessoa, entrada: EntradaManual, t?: Transacao): Promise<DemandaVista> {
  const { texto, origem, entradaPendenteId } = entrada;
  const corpo = async (tr: Transacao) => {
    // A partir de uma pendente: travada antes de criar a demanda, para o agente e a pessoa não a converterem duas vezes;
    // a que não existe mais (convertida, expurgada) é 404 antes do id da demanda ser gerado.
    const pendente = entradaPendenteId === undefined ? null : await travarEntradaPendente(tr.tx, entradaPendenteId);
    // criarDemanda grava campo a campo: modo, texto, origem e o id da pendente não chegam à demanda (C-11).
    const vista = await criarDemanda(deps, ator, entrada, tr);
    // O texto da pendente é o que chegou: o texto do corpo, se vier, não o substitui.
    if (pendente) {
      await converterEntradaPendente(tr.tx, pendente, vista.id);
      return vista;
    }
    // Origem sem texto não é gravada: sem o texto, não há o que ela descreva, e o expurgo só olha linha com texto.
    if (temTexto(texto)) {
      await tr.tx.insert(entradaBruta).values({
        demandaId: vista.id,
        texto,
        origem: origemParaGravar(origem),
        recebidaEm: deps.relogio.agora(),
      });
    }
    return vista;
  };
  return t ? corpo(t) : comTransacao(deps.pool, corpo);
}

// Modo agente: a pendente, a execução do orquestrador e o job nascem na mesma transação (ADR-06). Desligado ou suspenso:
// 409 antes de gravar qualquer coisa.
async function registrarParaOAgente(deps: DepsComFila, ator: AtorPessoa, entrada: EntradaAgente, t?: Transacao): Promise<string> {
  const corpo = async (tr: Transacao): Promise<string> => {
    const estado = await estadoDoAgente(tr.tx, 'orquestrador', deps.relogio);
    if (estado !== 'disponivel') throw new ErroDominio('conflito', estado === 'suspenso' ? MENSAGEM_ORQUESTRADOR_SUSPENSO : MENSAGEM_ORQUESTRADOR_DESLIGADO);
    const [linha] = await tr.tx
      .insert(entradaPendente)
      .values({
        texto: entrada.texto,
        origem: origemParaGravar(entrada.origem),
        solicitanteNome: entrada.solicitanteNome,
        solicitantePapel: entrada.solicitantePapel ?? null,
        status: 'aguardando',
        registradaPor: ator.usuarioId,
        recebidaEm: deps.relogio.agora(),
      })
      .returning({ id: entradaPendente.id });
    if (!linha) throw new Error('entrada pendente sem id');
    // A chave é nova (uuid da pendente): só não cria se o agente mudou de estado entre as duas leituras.
    if (!(await dispararSeLigado(tr, deps, 'orquestrador', chaveDaPendente(linha.id), null)))
      throw new ErroDominio('conflito', MENSAGEM_ORQUESTRADOR_DESLIGADO);
    return linha.id;
  };
  return t ? corpo(t) : comTransacao(deps.pool, corpo);
}

export async function registrarEntrada(deps: DepsComFila, ator: AtorPessoa, entrada: Entrada, t?: Transacao): Promise<ResultadoEntrada> {
  autorizar(ator, 'registrar_entrada');
  if (entrada.modo === 'agente') return { tipo: 'pendente', entradaId: await registrarParaOAgente(deps, ator, entrada, t) };
  return { tipo: 'demanda', demanda: await registrarManual(deps, ator, entrada, t) };
}
