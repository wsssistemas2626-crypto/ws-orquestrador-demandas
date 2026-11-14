// src/modules/pedido-construcao/situacao.test.ts — T02 do DEC-DEM-20261111-0018-v1: o serviço situacaoDoPedido (RF-01;
// CA-01.1 a CA-01.3, CA-01.5 e CA-01.6; SB-01 no serviço, SB-02, SB-03 e SB-04). Postgres real, papel do app, relógio
// fixo; o DEC vem pelo caminho real (aprovado e gerado por pessoa), com autora própria por DEC (C-36). O estado que
// nenhum caminho do app grava (evento forjado, status final) entra pelo migrator. Dados só fictícios.
import pg from 'pg';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { erroDe, porStatus } from '../../../test/andamento';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { criarDepsDeTeste } from '../../../test/deps';
import { atorDeIntegracao } from '../../../test/integracoes';
import { CONFIRMADO, DEC_DO_PEDIDO, inserirEventoDoPedido, preparadorDePedidos, type CenarioDoPedido } from '../../../test/pedidos-construcao';
import { comTransacao } from '../../db/transacao';
import type { Deps } from '../../lib/deps';
import { ErroDominio, MENSAGEM_NAO_ENCONTRADO } from '../../lib/erros';
import { relogioFixo } from '../../lib/relogio';
import { AGENTES, PAPEIS, type Ator, type AtorPessoa, type Papel } from '../acesso/ator';
import { MENSAGENS_ACESSO } from '../acesso/mensagens';
import { MENSAGEM_INDISPONIVEL } from '../integracoes/tempo-limite';
import { criarPacoteDecisao } from '../pacotes-decisao/criar';
import { registrarDecisao } from '../pacotes-decisao/decidir';
import { criarPacoteDecisaoSchema, registrarDecisaoSchema } from '../pacotes-decisao/schemas';
import { travarDemanda } from '../versoes';
import { travarPedido } from './pendentes';
import { SITUACOES_DO_PEDIDO, situacaoDoPedido } from './situacao';

const relogio = relogioFixo('2026-11-13T12:00:00Z');
const construir = atorDeIntegracao('construir');
const INEXISTENTE = 'DEC-DEM-20991231-9999-v1';
const NAO_ENCONTRADO = { codigo: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO, extras: {} };
const DOC = { referenciaDocumento: 'DOC-FICTICIO-018', dataDocumento: '2026-11-10' };
const administradora: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-adm-situacao', nome: 'Pessoa Ficticia Adm', papel: 'administradora' };

let b: BancoDeTeste;
let deps: Deps;
let comPedido: CenarioDoPedido;
const preparador = preparadorDePedidos({
  deps: () => deps,
  rotulo: 'situacao-servico',
  entregar: () => Promise.reject(new Error('este teste não entrega pedido')),
});

beforeAll(async () => {
  b = await novoBanco();
  deps = await criarDepsDeTeste(b, { relogio });
  comPedido = await preparador.prepararDec();
});
afterAll(async () => {
  await deps.fila.parar();
  await b.fechar();
});
afterEach(() => {
  vi.restoreAllMocks();
});

const situacao = (decId: string) => situacaoDoPedido(deps, construir, decId);

// O que a leitura não pode mudar (CA-01.5, SB-03 c): o total de linhas de evento, andamento_construcao, pacote_decisao
// e decisao, e o status e o atualizada_em das demandas do caso.
async function retrato(demandaIds: readonly string[]) {
  const contagens = (
    await b.poolMigrator.query(
      `select (select count(*) from evento)::int as eventos, (select count(*) from andamento_construcao)::int as andamentos,
              (select count(*) from pacote_decisao)::int as pacotes, (select count(*) from decisao)::int as decisoes`,
    )
  ).rows[0] as Record<string, number>;
  const demandas = (await b.poolMigrator.query(`select id, status, atualizada_em from demanda where id = any($1::text[]) order by id`, [demandaIds])).rows;
  return { contagens, demandas };
}

// O v2 da demanda do pedido, pela autora do v1, com o nível pedido.
const v2De = async (c: CenarioDoPedido, nivel: 'cto' | 'cto_e_administradora') =>
  (await criarPacoteDecisao(deps, c.autora, c.demandaId, criarPacoteDecisaoSchema.parse({ ...DEC_DO_PEDIDO, nivelAprovacaoRequerido: nivel }))).id;
const aprovarPelaAdministradora = (decId: string) =>
  registrarDecisao(deps, administradora, decId, registrarDecisaoSchema.parse({ statusDecisao: 'aprovada', opcaoEscolhida: 'A', ...DOC }));

// Os DEC que não têm pedido gerado por pessoa na própria demanda (CA-01.3, SB-02 a e c).
async function semPedidoDePessoa() {
  const semPedido = await preparador.prepararDec({ gerar: false });
  const porAgente = await preparador.prepararDec({ gerar: false });
  await inserirEventoDoPedido(b, deps, { acao: 'pedido_gerado', decId: porAgente.decId, demandaId: porAgente.demandaId, atorTipo: 'agente', atorId: 'orquestrador' });
  const porSistema = await preparador.prepararDec({ gerar: false });
  await inserirEventoDoPedido(b, deps, { acao: 'pedido_gerado', decId: porSistema.decId, demandaId: porSistema.demandaId, atorTipo: 'sistema', atorId: 'sistema', prefixo: null });
  // pedido_gerado de pessoa, forjado pelo migrator, com a demanda de outro DEC (AN-03 da 0.4.0).
  const deOutra = await preparador.prepararDec({ gerar: false });
  await inserirEventoDoPedido(b, deps, {
    acao: 'pedido_gerado',
    decId: deOutra.decId,
    demandaId: comPedido.demandaId,
    atorTipo: 'pessoa',
    atorId: preparador.geradora.usuarioId,
    prefixo: null,
    depois: CONFIRMADO,
  });
  return { semPedido, porAgente, porSistema, deOutra };
}

describe('CA-01.1 e CA-01.2: vigente e substituido', () => {
  it('os dois valores, nesta ordem, e nada mais', () => {
    expect(SITUACOES_DO_PEDIDO).toEqual(['vigente', 'substituido']);
  });

  it('CA-01.1: DEC aprovado com pedido gerado por pessoa e nenhum aprovado mais novo → vigente; nada gravado', async () => {
    const c = await preparador.prepararDec();
    const antes = await retrato([c.demandaId]);
    expect(await situacao(c.decId)).toBe('vigente');
    expect(await retrato([c.demandaId])).toEqual(antes);
  });

  it('CA-01.2: v2 de dupla aprovação com só a primeira aprovação → o v1 segue vigente; com a segunda → substituido', async () => {
    const c = await preparador.prepararDec();
    const v2 = await v2De(c, 'cto_e_administradora');
    expect((await aprovarPelaAdministradora(v2)).resultado).toBe('aprovacao_parcial');
    const parcial = await retrato([c.demandaId]);
    expect(await situacao(c.decId)).toBe('vigente');
    expect(await retrato([c.demandaId])).toEqual(parcial);

    await preparador.aprovar(v2);
    const completa = await retrato([c.demandaId]);
    expect(await situacao(c.decId)).toBe('substituido');
    expect(await retrato([c.demandaId])).toEqual(completa);
  });

  it('CA-01.2: v2 só do cto aprovado (uma aprovação) → substituido', async () => {
    const c = await preparador.prepararDec();
    const v2 = await v2De(c, 'cto');
    await preparador.aprovar(v2);
    const antes = await retrato([c.demandaId]);
    expect(await situacao(c.decId)).toBe('substituido');
    expect(await retrato([c.demandaId])).toEqual(antes);
  });

  it('SB-02 (d) e Pendência 4 de 01: substituído não vira 404; o vigente de demanda encerrada ou entregue continua vigente', async () => {
    const s = await preparador.prepararDec();
    await preparador.aprovar(await v2De(s, 'cto'));
    expect(await situacao(s.decId)).toBe('substituido');
    for (const status of ['encerrada', 'entregue'] as const) {
      const c = await preparador.prepararDec();
      await porStatus(b, c.demandaId, status);
      const antes = await retrato([c.demandaId]);
      expect(await situacao(c.decId), status).toBe('vigente');
      expect(await retrato([c.demandaId]), status).toEqual(antes);
    }
  });
});

describe('CA-01.3 e SB-02: o mesmo 404 do DEC inexistente', () => {
  it('inexistente, sem pedido gerado, pedido_gerado de agente, de sistema e de pessoa noutra demanda: o mesmo erro; nada muda', async () => {
    const x = await semPedidoDePessoa();
    const demandas = [comPedido, x.semPedido, x.porAgente, x.porSistema, x.deOutra].map((c) => c.demandaId);
    const antes = await retrato(demandas);
    const erros: unknown[] = [];
    for (const decId of [INEXISTENTE, x.semPedido.decId, x.porAgente.decId, x.porSistema.decId, x.deOutra.decId]) erros.push(await erroDe(situacao(decId)));
    for (const e of erros) {
      expect(e).toBeInstanceOf(ErroDominio);
      expect(e).toMatchObject(NAO_ENCONTRADO);
    }
    // Nem o texto nem o código distinguem os casos.
    const formas = erros.map((e) => {
      const d = e as ErroDominio;
      return JSON.stringify([d.name, d.message, d.codigo, d.mensagem, d.extras]);
    });
    expect(new Set(formas).size).toBe(1);
    expect(await retrato(demandas)).toEqual(antes);
  });

  it('SB-02 (b), D-07: inexistente, sem pedido gerado, de agente e de sistema fazem o mesmo número de consultas', async () => {
    const x = await semPedidoDePessoa();
    const consultas = async (decId: string): Promise<number> => {
      const espiao = vi.spyOn(pg.Client.prototype, 'query');
      try {
        expect(await erroDe(situacao(decId))).toMatchObject(NAO_ENCONTRADO);
        return espiao.mock.calls.length;
      } finally {
        espiao.mockRestore();
      }
    };
    const numeros = [await consultas(INEXISTENTE), await consultas(x.semPedido.decId), await consultas(x.porAgente.decId), await consultas(x.porSistema.decId)];
    expect(numeros[0]).toBeGreaterThan(0);
    expect(new Set(numeros).size, numeros.join(',')).toBe(1);
  });
});

describe('SB-03 (d): sem trava', () => {
  it('com a trava do pedido e a da demanda seguradas por outra transação, a leitura responde vigente antes de o teste soltar', async () => {
    const c = await preparador.prepararDec();
    let soltar!: () => void;
    const solta = new Promise<void>((r) => (soltar = r));
    let avisar!: () => void;
    const travadas = new Promise<void>((r) => (avisar = r));
    const segurando = comTransacao(b.poolApp, async ({ tx }) => {
      await travarPedido(tx, c.decId);
      await travarDemanda(tx, c.demandaId);
      avisar();
      await solta;
    });
    let respondeu = false;
    try {
      await travadas;
      expect(await situacao(c.decId)).toBe('vigente');
      respondeu = true;
    } finally {
      soltar();
      await segurando;
    }
    expect(respondeu).toBe(true);
  });
});

describe('SB-04 (CA-01.6): prazo total', () => {
  it('o relógio monotônico passa do prazo no meio da leitura → indisponivel; nada gravado', async () => {
    const c = await preparador.prepararDec();
    const antes = await retrato([c.demandaId]);
    // 3 s a cada leitura do relógio: o prazo de 8 s vence antes da primeira consulta da leitura.
    let agora = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => (agora += 3_000));
    const e = await erroDe(situacao(c.decId));
    vi.restoreAllMocks();
    expect(e).toBeInstanceOf(ErroDominio);
    expect(e).toMatchObject({ codigo: 'indisponivel', mensagem: MENSAGEM_INDISPONIVEL });
    expect(await retrato([c.demandaId])).toEqual(antes);
  });
});

describe('SB-01 no serviço: só o construir, antes de abrir conexão', () => {
  const pessoa = (papel: Papel): Ator => ({ tipo: 'pessoa', usuarioId: `u-${papel}-situacao`, nome: 'Pessoa Ficticia', papel });
  const proibidos: Array<[string, Ator]> = [
    ['awave', atorDeIntegracao('awave')],
    ...AGENTES.map((agente): [string, Ator] => [`agente ${agente}`, { tipo: 'agente', agente, prefixoToken: 'ficticio' }]),
    ...PAPEIS.map((papel): [string, Ator] => [`pessoa ${papel}`, pessoa(papel)]),
    ['sistema', { tipo: 'sistema' }],
  ];
  it('a lista tem o awave, os quatro agentes, os dois papéis e o sistema', () => {
    expect(proibidos).toHaveLength(1 + AGENTES.length + PAPEIS.length + 1);
  });
  it.each(proibidos)('%s: sem_permissao, sem conectar ao banco, para DEC com pedido e inexistente', async (_n, ator) => {
    const connect = vi.spyOn(b.poolApp, 'connect');
    for (const decId of [comPedido.decId, INEXISTENTE]) {
      const e = await erroDe(situacaoDoPedido(deps, ator, decId));
      expect(e).toBeInstanceOf(ErroDominio);
      expect(e).toMatchObject({ codigo: 'sem_permissao', mensagem: MENSAGENS_ACESSO.sem_permissao });
    }
    expect(connect).not.toHaveBeenCalled();
  });
});
