// T08 do DEC-DEM-20261111-0017-v1, AN-02 (b) pela rota (CA-02.2 e CA-02.3, D-15): o corpo é conferido antes de qualquer
// consulta ao DEC. O serviço é trocado por um que falha se chamado, e a resposta 422 é idêntica (status, cabeçalhos e
// bytes do corpo) para um DEC com pedido gerado e para um que não existe, sem eco do que veio. Token `construir` real
// (resolverAtor lê o token: a única consulta antes do corpo). Todo corpo vai como texto JSON, como o /construir manda.
// Dados fictícios; o token só nasce em tempo de teste.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../../test/banco';
import { criarDepsDeTeste } from '../../../../test/deps';
import { tokenDeIntegracao } from '../../../../test/integracoes';
import { chamadasDoConstruir, preparadorDePedidos, totalDeEventos } from '../../../../test/pedidos-construcao';
import { definirDepsParaTeste, type Deps } from '../../../lib/deps';
import { substituirDestinoDoLog } from '../../../lib/log';
import { relogioFixo } from '../../../lib/relogio';
import { registrarAndamento } from '../../../modules/andamento/registrar';
import { MENSAGENS_ANDAMENTO } from '../../../modules/andamento/schemas';

vi.mock('../../../modules/andamento/registrar', () => ({
  registrarAndamento: vi.fn(async () => {
    throw new Error('o serviço não pode ser chamado com corpo inválido');
  }),
}));

const INEXISTENTE = 'DEC-DEM-20991231-9999-v1';
const NAO_PROCESSAVEL = { erro: 'nao_processavel', mensagem: MENSAGENS_ANDAMENTO.corpoInvalido };
const VALIDO = { fase: 'construindo', tarefasProntas: 9, tarefasTotal: 17, status: 'em_construcao' } as const;
const sem = (chave: keyof typeof VALIDO) => Object.fromEntries(Object.entries(VALIDO).filter(([k]) => k !== chave));

// CA-02.2 inteiro, mais as bordas do JSON (protótipo e número que estoura). Cada um é o texto que vai no corpo.
const INVALIDOS: Array<[string, string]> = [
  ['chave a mais', JSON.stringify({ ...VALIDO, nota: 'x' })],
  ['sem fase', JSON.stringify(sem('fase'))],
  ['sem tarefasProntas', JSON.stringify(sem('tarefasProntas'))],
  ['sem tarefasTotal', JSON.stringify(sem('tarefasTotal'))],
  ['sem status', JSON.stringify(sem('status'))],
  ['fase Construindo', JSON.stringify({ ...VALIDO, fase: 'Construindo' })],
  ['fase construido', JSON.stringify({ ...VALIDO, fase: 'construido' })],
  ['fase vazia', JSON.stringify({ ...VALIDO, fase: '' })],
  ['status entregue', JSON.stringify({ ...VALIDO, status: 'entregue' })],
  ['status encerrada', JSON.stringify({ ...VALIDO, status: 'encerrada' })],
  ['prontas maior que total', JSON.stringify({ ...VALIDO, tarefasProntas: 10, tarefasTotal: 9 })],
  ['inteiro negativo', JSON.stringify({ ...VALIDO, tarefasProntas: -1 })],
  ['fração', JSON.stringify({ ...VALIDO, tarefasProntas: 1.5 })],
  ['número em texto', JSON.stringify({ ...VALIDO, tarefasProntas: '9' })],
  ['null num campo', JSON.stringify({ ...VALIDO, tarefasTotal: null })],
  ['true num campo', JSON.stringify({ ...VALIDO, tarefasProntas: true })],
  ['total 1000', JSON.stringify({ ...VALIDO, tarefasProntas: 0, tarefasTotal: 1000 })],
  ['corpo lista', '[]'],
  ['corpo null', 'null'],
  ['corpo texto', JSON.stringify('texto')],
  ['__proto__ no corpo', '{"fase":"construindo","tarefasProntas":9,"tarefasTotal":17,"status":"em_construcao","__proto__":{"x":1}}'],
  ['número que estoura', '{"fase":"construindo","tarefasProntas":1,"tarefasTotal":1e400,"status":"em_construcao"}'],
];

let b: BancoDeTeste;
let deps: Deps;
let token: string;
let existente: { demandaId: string; decId: string };
const construir = chamadasDoConstruir(() => token);
const preparador = preparadorDePedidos({ deps: () => deps, rotulo: 'andamento-422', entregar: (decId) => construir.entregar(decId) });

async function foto(r: Response) {
  const cabecalhos = [...r.headers].filter(([k]) => k !== 'date');
  return { status: r.status, cabecalhos, corpo: await r.text() };
}

beforeAll(async () => {
  substituirDestinoDoLog({ write: () => undefined });
  b = await novoBanco();
  deps = await criarDepsDeTeste(b, { relogio: relogioFixo('2026-11-12T12:00:00Z') });
  definirDepsParaTeste(deps);
  token = await tokenDeIntegracao(deps, 'construir');
  existente = await preparador.prepararDec();
});

afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  await deps.fila.parar();
  await b.fechar();
});

beforeEach(() => {
  vi.mocked(registrarAndamento).mockClear();
});

describe('AN-02 (b) pela rota: 422 antes de olhar o DEC', () => {
  it('a lista cobre o CA-02.2 inteiro (22 corpos)', () => {
    expect(INVALIDOS).toHaveLength(22);
  });

  it.each(INVALIDOS)('%s: 422 igual para DEC com pedido gerado e inexistente, sem eco e sem chamar o serviço', async (_nome, texto) => {
    const eventos = await totalDeEventos(b);
    const a = await foto(await construir.andamento(existente.decId, texto));
    const z = await foto(await construir.andamento(INEXISTENTE, texto));
    expect(a.status).toBe(422);
    expect(JSON.parse(a.corpo)).toEqual(NAO_PROCESSAVEL);
    expect(z).toEqual(a);
    expect(registrarAndamento).not.toHaveBeenCalled();
    expect(await totalDeEventos(b)).toBe(eventos);
  });

  it('controle: o corpo válido chega ao serviço trocado (que falha: 500 genérico), então os 422 acima não vêm de mock solto', async () => {
    const r = await construir.andamento(existente.decId, JSON.stringify(VALIDO));
    expect(r.status).toBe(500);
    expect(((await r.json()) as { erro: string }).erro).toBe('erro_interno');
    expect(registrarAndamento).toHaveBeenCalledTimes(1);
    expect(vi.mocked(registrarAndamento).mock.calls[0]![2]).toBe(existente.decId);
    expect(vi.mocked(registrarAndamento).mock.calls[0]![3]).toEqual(VALIDO);
  });
});
