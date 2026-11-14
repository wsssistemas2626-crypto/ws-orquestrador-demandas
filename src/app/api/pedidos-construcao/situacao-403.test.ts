// T02 do DEC-DEM-20261111-0018-v1, SB-01 (c) pela rota (D-07): o 403 sai em rota(), depois de resolverAtor e antes de
// qualquer consulta ao DEC. O serviço é trocado por um que falha se chamado; a resposta 403 é idêntica (status,
// cabeçalhos e bytes do corpo) para um DEC com pedido gerado e para um que não existe. Tokens e sessões reais; o DEC com
// pedido vem pelo caminho real (gerarPedido), que não passa pelo serviço trocado. Dados fictícios; o token só nasce em
// tempo de teste.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../../test/banco';
import { criarDepsDeTeste } from '../../../../test/deps';
import { tokenDeIntegracao } from '../../../../test/integracoes';
import { chamadasDoConstruir, preparadorDePedidos, totalDeEventos, type OpChamada } from '../../../../test/pedidos-construcao';
import { criarPessoa } from '../../../../test/sessao';
import { comTransacao } from '../../../db/transacao';
import { definirDepsParaTeste, type Deps } from '../../../lib/deps';
import { substituirDestinoDoLog } from '../../../lib/log';
import { relogioFixo } from '../../../lib/relogio';
import { AGENTES, PAPEIS } from '../../../modules/acesso/ator';
import { MENSAGENS_ACESSO } from '../../../modules/acesso/mensagens';
import { criarTokenServico } from '../../../modules/acesso/tokens-servico';
import { situacaoDoPedido } from '../../../modules/pedido-construcao/situacao';

vi.mock('../../../modules/pedido-construcao/situacao', () => ({
  situacaoDoPedido: vi.fn(async () => {
    throw new Error('o serviço não pode ser chamado por ator sem permissão');
  }),
}));

const INEXISTENTE = 'DEC-DEM-20991231-9999-v1';
const SEM_PERMISSAO = { erro: 'sem_permissao', mensagem: MENSAGENS_ACESSO.sem_permissao };
// Os nomes saem na coleta; as credenciais nascem no beforeAll.
const ATORES_PROIBIDOS: readonly string[] = ['awave', ...AGENTES.map((a) => `agente ${a}`), ...PAPEIS.map((p) => `pessoa ${p}`)];

let b: BancoDeTeste;
let deps: Deps;
let tokenConstruir: string;
let decComPedido: string;
const credenciais = new Map<string, Omit<OpChamada, 'corpo'>>();
const construir = chamadasDoConstruir(() => tokenConstruir);
const preparador = preparadorDePedidos({ deps: () => deps, rotulo: 'situacao-403', entregar: (decId) => construir.entregar(decId) });

async function foto(r: Response) {
  const cabecalhos = [...r.headers].filter(([k]) => k !== 'date');
  return { status: r.status, cabecalhos, corpo: await r.text() };
}

beforeAll(async () => {
  substituirDestinoDoLog({ write: () => undefined });
  b = await novoBanco();
  deps = await criarDepsDeTeste(b, { relogio: relogioFixo('2026-11-13T12:00:00Z') });
  definirDepsParaTeste(deps);
  tokenConstruir = await tokenDeIntegracao(deps, 'construir');
  credenciais.set('awave', { bearer: await tokenDeIntegracao(deps, 'awave') });
  for (const agente of AGENTES) {
    const token = (await comTransacao(deps.pool, (t) => criarTokenServico(t, agente, deps.relogio))).token;
    credenciais.set(`agente ${agente}`, { bearer: token });
  }
  for (const papel of PAPEIS) {
    const { cookie } = await criarPessoa(deps, { papel });
    credenciais.set(`pessoa ${papel}`, { bearer: null, semOrigin: false, cabecalhos: { cookie } });
  }
  decComPedido = (await preparador.prepararDec()).decId;
});

afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  await deps.fila.parar();
  await b.fechar();
});

beforeEach(() => {
  vi.mocked(situacaoDoPedido).mockClear();
});

describe('SB-01 (c): 403 antes de olhar o DEC', () => {
  it('a lista tem o awave, os quatro agentes e os dois papéis, cada um com credencial', () => {
    expect(ATORES_PROIBIDOS).toHaveLength(1 + AGENTES.length + PAPEIS.length);
    expect([...credenciais.keys()].sort()).toEqual([...ATORES_PROIBIDOS].sort());
  });

  it.each(ATORES_PROIBIDOS)('%s: 403 igual para DEC existente e inexistente, sem chamar o serviço e sem gravar', async (nome) => {
    const op = credenciais.get(nome)!;
    const eventos = await totalDeEventos(b);
    const existe = await foto(await construir.situacao(decComPedido, op));
    const naoExiste = await foto(await construir.situacao(INEXISTENTE, op));
    expect(existe.status).toBe(403);
    expect(JSON.parse(existe.corpo)).toEqual(SEM_PERMISSAO);
    expect(naoExiste).toEqual(existe);
    expect(situacaoDoPedido).not.toHaveBeenCalled();
    expect(await totalDeEventos(b)).toBe(eventos);
  });

  it('controle: o token construir chega ao serviço trocado (que falha: 500 genérico), então os 403 acima não vêm de mock solto', async () => {
    const r = await construir.situacao(decComPedido);
    expect(r.status).toBe(500);
    expect(((await r.json()) as { erro: string }).erro).toBe('erro_interno');
    expect(situacaoDoPedido).toHaveBeenCalledTimes(1);
    expect(vi.mocked(situacaoDoPedido).mock.calls[0]![2]).toBe(decComPedido);
  });
});
