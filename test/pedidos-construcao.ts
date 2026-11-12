// Preparo comum dos testes do /construir (Minor 1 da 06-T12-revisao, feito na T13): o DEC aprovado com o Pedido de
// Construção gerado por pessoa pelo caminho real (gerarPedido), as chamadas às três rotas como o buscar-pedidos.mjs
// (dfedf16) faz, o oráculo do SHA-256 e o evento gravado pelo migrator. Antes, cada arquivo de teste tinha a própria cópia.
// Dados só fictícios. O token só nasce em tempo de teste e chega aqui por função: nunca é escrito em arquivo.
import { createHash } from 'node:crypto';
import { expect } from 'vitest';
import * as rotaEntrega from '../src/app/api/pedidos-construcao/[decId]/entrega/route';
import * as rotaRecebimento from '../src/app/api/pedidos-construcao/[decId]/recebimento/route';
import * as rotaPendentes from '../src/app/api/pedidos-construcao/pendentes/route';
import type { Deps } from '../src/lib/deps';
import type { AtorPessoa } from '../src/modules/acesso/ator';
import { criarDemandaSchema } from '../src/modules/demandas/schemas';
import { criarDemanda } from '../src/modules/demandas/servico';
import { criarEspecificacaoSchema } from '../src/modules/especificacoes/schemas';
import { criarEspecificacao } from '../src/modules/especificacoes/servico';
import { criarPacoteDecisao } from '../src/modules/pacotes-decisao/criar';
import { registrarDecisao } from '../src/modules/pacotes-decisao/decidir';
import { criarPacoteDecisaoSchema, registrarDecisaoSchema } from '../src/modules/pacotes-decisao/schemas';
import { criarParecerRiscoSchema } from '../src/modules/pareceres-risco/schemas';
import { criarParecerRisco } from '../src/modules/pareceres-risco/servico';
import { gerarPedido } from '../src/modules/pedido-construcao/gerar';
import type { BancoDeTeste } from './banco';
import { chamarRota } from './requisicao';

// D3 do 0013: a geração leva a confirmação de que o texto não tem dado pessoal.
export const CONFIRMADO = { confirmaSemDadoPessoal: true } as const;

export const DEMANDA_DO_PEDIDO = {
  titulo: 'Pedidos duplicados (fictício)',
  tipo: 'bug',
  solicitanteNome: 'Carlos Exemplar',
  contexto: 'Importação diária do ERP',
  descricaoProblema: 'Pedidos aparecem duas vezes',
};

export const ESP_DO_PEDIDO = {
  descricaoObjetiva: 'Corrigir pedidos duplicados',
  escopoInclui: ['Importação de pedidos'],
  sistemaAlvo: 'sistema-ficticio',
  repositorioDestino: 'wsssistemas2626-crypto/sistema-ficticio',
  criteriosAceitePreliminares: ['Pedido importado uma vez só'],
  definicaoDePronto: ['pnpm test verde'],
};

export const RSK_DO_PEDIDO = { riscoTecnicoNivel: 'medio', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo' };

export const DEC_DO_PEDIDO = {
  resumoExecutivo: 'Corrigir a importação de pedidos',
  opcaoA: { descricao: 'Corrigir no importador' },
  opcaoB: { descricao: 'Refazer a integração' },
  nivelAprovacaoRequerido: 'cto',
};

// Oráculo independente do servidor: o SHA-256 dos bytes UTF-8 que o /construir recebeu, como o buscar-pedidos.mjs calcula.
export const sha256DoTexto = (texto: string) => createHash('sha256').update(texto, 'utf8').digest('hex');

// `bearer: null` manda a requisição sem credencial; ausente, vai o token do /construir. Com corpo, `chamarRota` põe
// `content-type: application/json`.
export type OpChamada = { bearer?: string | null; corpo?: unknown; cabecalhos?: Record<string, string>; semOrigin?: boolean };

// As três rotas como o buscar-pedidos.mjs chama: Bearer, `accept: application/json` e sem `Origin`; a entrega é POST sem
// corpo e sem `content-type`.
export function chamadasDoConstruir(token: () => string) {
  const credencial = (op: OpChamada) => (op.bearer === null ? undefined : (op.bearer ?? token()));
  return {
    listar: (op: OpChamada = {}) =>
      chamarRota(rotaPendentes.GET, {
        caminho: '/api/pedidos-construcao/pendentes',
        bearer: credencial(op),
        semOrigin: op.semOrigin ?? true,
        cabecalhos: { accept: 'application/json', ...op.cabecalhos },
      }),
    entregar: (decId: string, op: OpChamada = {}) =>
      chamarRota(rotaEntrega.POST, {
        metodo: 'POST',
        caminho: `/api/pedidos-construcao/${encodeURIComponent(decId)}/entrega`,
        params: { decId },
        bearer: credencial(op),
        semOrigin: op.semOrigin ?? true,
        corpo: op.corpo,
        cabecalhos: { accept: 'application/json', ...op.cabecalhos },
      }),
    receber: (decId: string, corpo: unknown, op: Omit<OpChamada, 'corpo'> = {}) =>
      chamarRota(rotaRecebimento.POST, {
        metodo: 'POST',
        caminho: `/api/pedidos-construcao/${encodeURIComponent(decId)}/recebimento`,
        params: { decId },
        bearer: credencial(op),
        semOrigin: op.semOrigin ?? true,
        corpo,
        cabecalhos: { accept: 'application/json', ...op.cabecalhos },
      }),
  };
}

export type PreparoDoPedido = {
  // Campos da demanda por cima de DEMANDA_DO_PEDIDO.
  demanda?: Record<string, unknown>;
  // `false`: o DEC fica aprovado, sem pedido_gerado.
  gerar?: boolean;
  // `true`: depois de gerar, entrega pela rota (200) e guarda o texto recebido.
  entregar?: boolean;
};
export type CenarioDoPedido = { autora: AtorPessoa; demandaId: string; decId: string; json: string | null; recebido: string | null };

// Uma autora por DEC (C-36: o limite de versões por hora é por autora), e a mesma geradora "cto" para aprovar e gerar.
// `deps` é lido na hora da chamada, porque o arquivo de teste só o cria no beforeAll.
export function preparadorDePedidos(ctx: { deps: () => Deps; rotulo: string; entregar: (decId: string) => Promise<Response> }) {
  let autoras = 0;
  const geradora: AtorPessoa = { tipo: 'pessoa', usuarioId: `u-geradora-${ctx.rotulo}`, nome: 'Pessoa Ficticia Geradora', papel: 'cto' };
  const novaAutora = (): AtorPessoa => ({ tipo: 'pessoa', usuarioId: `u-autora-${ctx.rotulo}-${++autoras}`, nome: 'Pessoa Ficticia Autora', papel: 'cto' });

  const novoDec = async (autora: AtorPessoa, demandaId: string): Promise<string> =>
    (await criarPacoteDecisao(ctx.deps(), autora, demandaId, criarPacoteDecisaoSchema.parse(DEC_DO_PEDIDO))).id;
  const aprovar = (decId: string) =>
    registrarDecisao(ctx.deps(), geradora, decId, registrarDecisaoSchema.parse({ statusDecisao: 'aprovada', opcaoEscolhida: 'A' }));

  async function prepararDec(op: PreparoDoPedido = {}): Promise<CenarioDoPedido> {
    const deps = ctx.deps();
    const autora = novaAutora();
    const d = await criarDemanda(deps, autora, criarDemandaSchema.parse({ ...DEMANDA_DO_PEDIDO, ...op.demanda }));
    await criarEspecificacao(deps, autora, d.id, criarEspecificacaoSchema.parse(ESP_DO_PEDIDO));
    await criarParecerRisco(deps, autora, d.id, criarParecerRiscoSchema.parse(RSK_DO_PEDIDO));
    const decId = await novoDec(autora, d.id);
    await aprovar(decId);
    const json = op.gerar === false ? null : (await gerarPedido(deps, geradora, decId, CONFIRMADO)).json;
    let recebido: string | null = null;
    if (json !== null && op.entregar === true) {
      const r = await ctx.entregar(decId);
      expect(r.status).toBe(200);
      recebido = await r.text();
    }
    return { autora, demandaId: d.id, decId, json, recebido };
  }

  return { geradora, novaAutora, novoDec, aprovar, prepararDec };
}

export type LinhaEvento = {
  ator_tipo: string;
  ator_id: string;
  ator_token_prefixo: string | null;
  demanda_id: string | null;
  entidade: string;
  antes: unknown;
  depois: unknown;
};

export const totalDeEventos = async (b: BancoDeTeste) =>
  Number((await b.poolMigrator.query<{ n: string }>(`select count(*)::text as n from evento`)).rows[0]!.n);

// Pelo migrator: o evento fica com o ator e a entidade que o caso quer, inclusive os que nenhum caminho do app grava.
// O prefixo padrão é o fictício `ficticio` (G3.3); `null` só para ator pessoa.
export async function inserirEventoDoPedido(
  b: BancoDeTeste,
  deps: Deps,
  e: {
    acao: string;
    decId: string;
    demandaId: string;
    atorTipo: string;
    atorId: string;
    entidade?: 'pacote_decisao' | 'demanda';
    prefixo?: string | null;
    depois?: unknown;
  },
): Promise<void> {
  await b.poolMigrator.query(
    `insert into evento (ocorrido_em, ator_tipo, ator_id, ator_token_prefixo, demanda_id, entidade, entidade_id, acao, depois)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
    [
      deps.relogio.agora().toISOString(),
      e.atorTipo,
      e.atorId,
      e.prefixo === undefined ? 'ficticio' : e.prefixo,
      e.demandaId,
      e.entidade ?? 'pacote_decisao',
      e.decId,
      e.acao,
      e.depois === undefined ? null : JSON.stringify(e.depois),
    ],
  );
}
