// Bordas da rota do Pedido de Construção (T22, 06-T22-testes): POST /api/pacotes-decisao/:decId/pedido-construcao.
// O mesmo DEC pela rota, de um dia para o outro em São Paulo, dá o mesmo arquivo; o corpo da requisição não muda o
// pedido; o 422 do validarPedido e o 409 de DEC devolvido pela rota, sem download nem evento. Banco, Better Auth e
// relógio fixo reais do teste (Testcontainers, RNF-15). Dados só fictícios.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../../test/banco';
import { criarDepsDeTeste } from '../../../../test/deps';
import { chamarRota, type OpRequisicao } from '../../../../test/requisicao';
import { criarPessoa } from '../../../../test/sessao';
import { definirDepsParaTeste, type Deps } from '../../../lib/deps';
import { substituirDestinoDoLog } from '../../../lib/log';
import { relogioFixo } from '../../../lib/relogio';
import { validarPedido } from '../../../vendor/construir/pedido.mjs';
import type { AtorPessoa } from '../../../modules/acesso/ator';
import { criarDemandaSchema } from '../../../modules/demandas/schemas';
import { criarDemanda } from '../../../modules/demandas/servico';
import { criarEspecificacaoSchema } from '../../../modules/especificacoes/schemas';
import { criarEspecificacao } from '../../../modules/especificacoes/servico';
import { criarPacoteDecisao } from '../../../modules/pacotes-decisao/criar';
import { registrarDecisao } from '../../../modules/pacotes-decisao/decidir';
import { criarPacoteDecisaoSchema, registrarDecisaoSchema } from '../../../modules/pacotes-decisao/schemas';
import { criarParecerRiscoSchema } from '../../../modules/pareceres-risco/schemas';
import { criarParecerRisco } from '../../../modules/pareceres-risco/servico';
import { MENSAGENS_PEDIDO } from '../../../modules/pedido-construcao/gerar';
import { POST } from './[decId]/pedido-construcao/route';

// 12:00 UTC = 09:00 em São Paulo; 16 horas depois já é o dia seguinte lá.
const relogio = relogioFixo('2026-10-22T12:00:00Z');
let b: BancoDeTeste;
let deps: Deps;
let cookieCto: string;
let autoras = 0;

const gerar = (decId: string, extra: OpRequisicao = {}) =>
  chamarRota(POST, {
    metodo: 'POST',
    caminho: `/api/pacotes-decisao/${encodeURIComponent(decId)}/pedido-construcao`,
    params: { decId },
    corpo: {},
    cookie: cookieCto,
    ...extra,
  });

const novaAutora = (): AtorPessoa => ({ tipo: 'pessoa', usuarioId: `u-autora-bordas-${++autoras}`, nome: 'Pessoa Ficticia Autora', papel: 'cto' });
const decisora: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-decisora-bordas', nome: 'Pessoa Ficticia Decisora', papel: 'cto' };

async function prepararDec(op: { contexto?: string; decisao?: 'aprovada' | 'devolvida' } = {}): Promise<string> {
  const autora = novaAutora();
  const d = await criarDemanda(
    deps,
    autora,
    criarDemandaSchema.parse({ titulo: 'Pedidos duplicados', tipo: 'bug', solicitanteNome: 'Pessoa Ficticia', contexto: 'contexto' in op ? op.contexto : 'Importação diária' }),
  );
  await criarEspecificacao(
    deps,
    autora,
    d.id,
    criarEspecificacaoSchema.parse({
      descricaoObjetiva: 'Corrigir pedidos duplicados',
      escopoInclui: ['a'],
      sistemaAlvo: 'meu-sistema',
      repositorioDestino: 'wsssistemas2626-crypto/meu-sistema',
      criteriosAceitePreliminares: ['c'],
      definicaoDePronto: ['p'],
    }),
  );
  await criarParecerRisco(deps, autora, d.id, criarParecerRiscoSchema.parse({ riscoTecnicoNivel: 'baixo', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo' }));
  const dec = await criarPacoteDecisao(
    deps,
    autora,
    d.id,
    criarPacoteDecisaoSchema.parse({ resumoExecutivo: 'Resumo', opcaoA: { descricao: 'Opção A' }, opcaoB: { descricao: 'Opção B' }, nivelAprovacaoRequerido: 'cto' }),
  );
  const status = op.decisao ?? 'aprovada';
  await registrarDecisao(
    deps,
    decisora,
    dec.id,
    registrarDecisaoSchema.parse(status === 'aprovada' ? { statusDecisao: 'aprovada', opcaoEscolhida: 'A' } : { statusDecisao: 'devolvida' }),
  );
  return dec.id;
}

const eventosDoPedido = async (decId: string) =>
  Number(
    (await b.poolMigrator.query<{ n: string }>(`select count(*)::text as n from evento where entidade_id = $1 and acao = 'pedido_gerado'`, [decId])).rows[0]!
      .n,
  );

beforeAll(async () => {
  // O log da rota já é conferido em pedido.test.ts (C-21); aqui só sai da saída do teste.
  substituirDestinoDoLog({ write: () => {} });
  b = await novoBanco();
  deps = await criarDepsDeTeste(b, { relogio });
  definirDepsParaTeste(deps);
  cookieCto = (await criarPessoa(deps, { papel: 'cto' })).cookie;
});

afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  await deps.fila.parar();
  await b.fechar();
});

describe('POST /api/pacotes-decisao/:decId/pedido-construcao: bordas', () => {
  it('CA-22.2 pela rota: o mesmo DEC, hoje e no dia seguinte em São Paulo, baixa o mesmo arquivo, byte a byte', async () => {
    const decId = await prepararDec();
    const r1 = await gerar(decId);
    expect(r1.status).toBe(200);
    const a = await r1.text();
    relogio.avancar(16 * 3_600_000);
    const r2 = await gerar(decId);
    expect(r2.status).toBe(200);
    expect(await r2.text()).toBe(a);
    expect(r2.headers.get('content-disposition')).toBe(r1.headers.get('content-disposition'));
    expect(await eventosDoPedido(decId)).toBe(2);
  });

  it('o corpo da requisição não muda o pedido: campos do pedido enviados no POST são ignorados', async () => {
    const decId = await prepararDec();
    const limpo = await (await gerar(decId)).text();
    const r = await gerar(decId, {
      corpo: { pedido: 'DEC-DEM-20261022-9999-v1', ensaio: true, sistema_alvo: 'outro-sistema', decisao: { aprovadoPor: 'Outra Pessoa' } },
    });
    expect(r.status).toBe(200);
    const texto = await r.text();
    expect(texto).toBe(limpo);
    expect(JSON.parse(texto)).not.toHaveProperty('ensaio');
  });

  it('validarPedido falhou pela rota → 422 com a mensagem e a lista dele, sem download e sem evento', async () => {
    const decId = await prepararDec({ contexto: undefined });
    const r = await gerar(decId);
    expect(r.status).toBe(422);
    expect(r.headers.get('content-disposition')).toBeNull();
    expect(r.headers.get('content-type')).toBe('application/json; charset=utf-8');
    expect(await r.json()).toEqual({ erro: 'nao_processavel', mensagem: MENSAGENS_PEDIDO.naoPassou, erros: ['demanda.descricao vazio'] });
    expect(await eventosDoPedido(decId)).toBe(0);
  });

  it('CA-22.4 pela rota: DEC devolvido → 409 com o motivo, sem download e sem evento', async () => {
    const decId = await prepararDec({ decisao: 'devolvida' });
    const r = await gerar(decId);
    expect(r.status).toBe(409);
    expect(r.headers.get('content-disposition')).toBeNull();
    expect(await r.json()).toEqual({ erro: 'conflito', mensagem: MENSAGENS_PEDIDO.naoAprovado });
    expect(await eventosDoPedido(decId)).toBe(0);
  });

  it('o arquivo baixado passa no validarPedido e termina com uma quebra de linha', async () => {
    const decId = await prepararDec();
    const texto = await (await gerar(decId)).text();
    expect(texto.endsWith('}\n')).toBe(true);
    expect(validarPedido(JSON.parse(texto))).toEqual({ ok: true, erros: [] });
  });
});
