// Entrada de demanda colando o texto recebido (RF-05). Modo manual: a pessoa cola o texto (e-mail, mensagem) e
// preenche os campos; a demanda e o texto bruto nascem na mesma transação. Modo agente: o texto vai ao agente
// orquestrador, que preenche os campos (a T28 liga esse caminho; até lá, 409 com a mensagem da tela).
//
// O texto bruto é dado pessoal de terceiro (D1, D2): fica só em `entrada_bruta`, nunca na vista da demanda, no
// histórico nem no log, e é expurgado no prazo de retenção (T31).
import { z } from 'zod';
import { entradaBruta, type Origem } from '../../db/schema/demandas';
import { comTransacao, type Transacao } from '../../db/transacao';
import { ErroDominio, MENSAGEM_NAO_ENCONTRADO } from '../../lib/erros';
import type { AtorPessoa } from '../acesso/ator';
import { autorizar } from '../acesso/matriz';
import type { DemandaVista } from './consultas';
import { LIMITE_NOME, PAPEIS_SOLICITANTE, criarDemandaSchema } from './schemas';
import { criarDemanda, type DepsDemanda } from './servico';

// RNF-04: o texto colado vai até 100.000 caracteres (os campos da demanda seguem com 10.000).
export const LIMITE_TEXTO_BRUTO = 100_000;
export const LIMITE_REFERENCIA_ORIGEM = 500;

// O que a pessoa lê quando pede o agente e ele está desligado (texto fixado na T17 do plano).
export const MENSAGEM_ORQUESTRADOR_DESLIGADO = 'O agente orquestrador está desligado. Preencha os campos abaixo.';

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
export type ResultadoEntrada = { tipo: 'demanda'; demanda: DemandaVista } | { tipo: 'pendente'; entradaId: string };

// Só o que foi informado; nada informado vira nulo (a coluna aceita nulo, e o CHECK pede objeto quando houver).
function origemParaGravar(origem: z.output<typeof origemSchema> | undefined): Origem | null {
  const saida: Origem = {};
  if (origem?.canal) saida.canal = origem.canal;
  if (origem?.referencia) saida.referencia = origem.referencia;
  return Object.keys(saida).length > 0 ? saida : null;
}

const temTexto = (texto: string | undefined): texto is string => texto !== undefined && texto.trim() !== '';

async function registrarManual(deps: DepsDemanda, ator: AtorPessoa, entrada: EntradaManual, t?: Transacao): Promise<DemandaVista> {
  // A entrada pendente nasce só pelo caminho do agente (T28); até lá, nenhum id existe.
  if (entrada.entradaPendenteId !== undefined) throw new ErroDominio('nao_encontrado', MENSAGEM_NAO_ENCONTRADO);
  const { texto, origem } = entrada;
  const corpo = async (tr: Transacao) => {
    // criarDemanda grava campo a campo: modo, texto, origem e o id da pendente não chegam à demanda (C-11).
    const vista = await criarDemanda(deps, ator, entrada, tr);
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

export async function registrarEntrada(deps: DepsDemanda, ator: AtorPessoa, entrada: Entrada, t?: Transacao): Promise<ResultadoEntrada> {
  autorizar(ator, 'registrar_entrada');
  // Nesta versão o agente orquestrador está sempre desligado (a T28 liga o caminho, com o interruptor da T23).
  if (entrada.modo === 'agente') throw new ErroDominio('conflito', MENSAGEM_ORQUESTRADOR_DESLIGADO);
  return { tipo: 'demanda', demanda: await registrarManual(deps, ator, entrada, t) };
}
