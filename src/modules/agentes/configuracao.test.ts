// Interruptor e modelo de cada agente (RF-19, CA-19.1, CA-19.3, C-12, C-26). Ligar exige um modelo com preço vigente,
// porque o custo de cada chamada sai do preço dele (RF-17); cada mudança vai ao histórico com a pessoa da sessão e sem
// demanda. Postgres real (Testcontainers), com o papel do app; o relógio é fixo (RNF-15). Dados só fictícios.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { comTransacao } from '../../db/transacao';
import { ErroDominio } from '../../lib/erros';
import { relogioFixo, type RelogioFixo } from '../../lib/relogio';
import { AGENTES, type Agente, type AtorPessoa } from '../acesso/ator';
import { MENSAGENS_ACESSO } from '../acesso/mensagens';
import { alterarAgente, alterarAgenteSchema, listarConfiguracaoAgentes, mensagemNaoLigou, obterConfiguracaoAgente } from './configuracao';

let b: BancoDeTeste;
let relogio: RelogioFixo;

const CTO: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-cto-config', nome: 'Pessoa Ficticia', papel: 'cto' };
const ADM: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-adm-config', nome: 'Pessoa Ficticia Adm', papel: 'administradora' };
const AGORA = '2026-10-22T12:00:00Z';

const deps = () => ({ db: b.db, pool: b.poolApp, relogio });
const ligar = (modelo?: string) => alterarAgenteSchema.parse(modelo === undefined ? { ligado: true } : { ligado: true, modelo });
const desligar = (modelo?: string) => alterarAgenteSchema.parse(modelo === undefined ? { ligado: false } : { ligado: false, modelo });

const linhaDo = async (agente: Agente) =>
  (
    await b.poolMigrator.query<{ ligado: boolean; modelo: string | null; atualizado_em: Date | null; atualizado_por: string | null }>(
      'select ligado, modelo, atualizado_em, atualizado_por from configuracao_agente where agente = $1',
      [agente],
    )
  ).rows[0]!;
const eventosDo = async (agente: Agente) =>
  (
    await b.poolMigrator.query<{ acao: string; ator_tipo: string; ator_id: string; demanda_id: string | null; entidade: string; antes: unknown; depois: unknown; ocorrido_em: Date }>(
      `select acao, ator_tipo, ator_id, demanda_id, entidade, antes, depois, ocorrido_em from evento where entidade = 'configuracao_agente' and entidade_id = $1 order by id`,
      [agente],
    )
  ).rows;
// Cada cenário começa do sistema novo: os quatro desligados e sem evento de configuração (o migrator é o dono das
// tabelas; o papel do app não apaga evento, C-34).
async function reiniciar(): Promise<void> {
  await b.poolMigrator.query('update configuracao_agente set ligado = false, modelo = null, atualizado_em = null, atualizado_por = null');
  await b.poolMigrator.query(`delete from evento where entidade = 'configuracao_agente'`);
}

async function falhaDe(p: Promise<unknown>): Promise<ErroDominio> {
  const e = await p.catch((x: unknown) => x);
  expect(e).toBeInstanceOf(ErroDominio);
  return e as ErroDominio;
}

beforeAll(async () => {
  b = await novoBanco();
  await b.poolMigrator.query(`insert into "user" (id, name, email, papel) values ($1, 'Pessoa Ficticia', 'cto.config@exemplo.test', 'cto')`, [CTO.usuarioId]);
  await b.poolMigrator.query(
    'insert into preco_modelo (modelo, preco_entrada_por_milhao, preco_saida_por_milhao, vigente_desde) values ($1, 3, 15, $2), ($3, 1, 5, $4)',
    ['modelo-ficticio', '2026-10-01T03:00:00Z', 'modelo-ficticio-futuro', '2026-11-01T03:00:00Z'],
  );
});
afterAll(async () => {
  await b.fechar();
});
beforeEach(async () => {
  relogio = relogioFixo(AGORA);
  await reiniciar();
});

describe('listarConfiguracaoAgentes (RF-19)', () => {
  it('CA-19.1: no sistema novo, os quatro agentes, na ordem da lista, desligados, sem modelo e nunca alterados', async () => {
    expect(await listarConfiguracaoAgentes(b.db)).toEqual(
      AGENTES.map((agente) => ({ agente, ligado: false, modelo: null, atualizadoEm: null, atualizadoPor: null })),
    );
  });

  it('mostra quem alterou pelo nome da conta, nunca pelo id', async () => {
    await alterarAgente(deps(), CTO, 'risco', ligar('modelo-ficticio'));
    const lista = await listarConfiguracaoAgentes(b.db);
    expect(lista.find((c) => c.agente === 'risco')).toEqual({
      agente: 'risco',
      ligado: true,
      modelo: 'modelo-ficticio',
      atualizadoEm: new Date(AGORA),
      atualizadoPor: { nome: 'Pessoa Ficticia' },
    });
    expect(JSON.stringify(lista)).not.toContain(CTO.usuarioId);
  });

  it('conta que não existe mais: a data fica, o nome não', async () => {
    await b.poolMigrator.query(`update configuracao_agente set atualizado_por = 'u-removida', atualizado_em = $1 where agente = 'consolidacao'`, [AGORA]);
    expect(await obterConfiguracaoAgente(b.db, 'consolidacao')).toMatchObject({ atualizadoEm: new Date(AGORA), atualizadoPor: null });
  });
});

describe('alterarAgente (RF-19, C-12, C-26)', () => {
  it('CA-19.3: o CTO liga o risco com modelo de preço vigente e depois desliga; o histórico registra quem e quando', async () => {
    const ligado = await alterarAgente(deps(), CTO, 'risco', ligar('modelo-ficticio'));
    expect(ligado).toEqual({ agente: 'risco', ligado: true, modelo: 'modelo-ficticio', atualizadoEm: new Date(AGORA), atualizadoPor: { nome: 'Pessoa Ficticia' } });
    relogio.avancar(60_000);
    const desligado = await alterarAgente(deps(), CTO, 'risco', desligar());
    expect(desligado).toMatchObject({ ligado: false, modelo: 'modelo-ficticio', atualizadoEm: new Date('2026-10-22T12:01:00Z') });
    expect(await linhaDo('risco')).toEqual({ ligado: false, modelo: 'modelo-ficticio', atualizado_em: new Date('2026-10-22T12:01:00Z'), atualizado_por: CTO.usuarioId });
    expect(await eventosDo('risco')).toEqual([
      {
        acao: 'agente_ligado',
        ator_tipo: 'pessoa',
        ator_id: CTO.usuarioId,
        demanda_id: null,
        entidade: 'configuracao_agente',
        antes: { ligado: false, modelo: null },
        depois: { ligado: true, modelo: 'modelo-ficticio' },
        ocorrido_em: new Date(AGORA),
      },
      {
        acao: 'agente_desligado',
        ator_tipo: 'pessoa',
        ator_id: CTO.usuarioId,
        demanda_id: null,
        entidade: 'configuracao_agente',
        antes: { ligado: true, modelo: 'modelo-ficticio' },
        depois: { ligado: false, modelo: 'modelo-ficticio' },
        ocorrido_em: new Date('2026-10-22T12:01:00Z'),
      },
    ]);
  });

  it('ligar sem modelo informado usa o modelo já gravado, se ele tiver preço vigente', async () => {
    await alterarAgente(deps(), CTO, 'insumo_tecnico', desligar('modelo-ficticio'));
    const c = await alterarAgente(deps(), CTO, 'insumo_tecnico', ligar());
    expect(c).toMatchObject({ ligado: true, modelo: 'modelo-ficticio' });
  });

  it.each([
    ['sem modelo nenhum', undefined],
    ['com modelo sem preço', 'modelo-sem-preco'],
    ['com modelo cujo preço só vale a partir do mês que vem', 'modelo-ficticio-futuro'],
  ])('ligar %s → 409 com o texto da 03, e o agente continua desligado, sem evento', async (_caso, modelo) => {
    const e = await falhaDe(alterarAgente(deps(), CTO, 'risco', ligar(modelo)));
    expect(e.codigo).toBe('conflito');
    expect(e.mensagem).toBe('Não foi possível ligar o agente de risco. Ele continua desligado.');
    expect(await linhaDo('risco')).toEqual({ ligado: false, modelo: null, atualizado_em: null, atualizado_por: null });
    expect(await eventosDo('risco')).toEqual([]);
  });

  it('o modelo com preço futuro passa a ligar quando a vigência começa', async () => {
    relogio.definir('2026-11-01T03:00:00Z');
    expect(await alterarAgente(deps(), CTO, 'risco', ligar('modelo-ficticio-futuro'))).toMatchObject({ ligado: true, modelo: 'modelo-ficticio-futuro' });
  });

  it('o 409 nomeia cada agente como a 03 (seção 2.6)', () => {
    expect(AGENTES.map(mensagemNaoLigou)).toEqual([
      'Não foi possível ligar o agente orquestrador. Ele continua desligado.',
      'Não foi possível ligar o agente de insumo técnico. Ele continua desligado.',
      'Não foi possível ligar o agente de risco. Ele continua desligado.',
      'Não foi possível ligar o agente de consolidação. Ele continua desligado.',
    ]);
  });

  it('desligado, o modelo pode ser trocado por um ainda sem preço (o preço só é exigido para ligar)', async () => {
    const c = await alterarAgente(deps(), CTO, 'consolidacao', desligar('modelo-sem-preco'));
    expect(c).toMatchObject({ ligado: false, modelo: 'modelo-sem-preco' });
    expect((await eventosDo('consolidacao')).map((e) => e.acao)).toEqual(['agente_desligado']);
  });

  it('ligado, trocar o modelo por um sem preço → 409, e o modelo anterior continua', async () => {
    await alterarAgente(deps(), CTO, 'risco', ligar('modelo-ficticio'));
    const e = await falhaDe(alterarAgente(deps(), CTO, 'risco', ligar('modelo-sem-preco')));
    expect(e.codigo).toBe('conflito');
    expect(await linhaDo('risco')).toMatchObject({ ligado: true, modelo: 'modelo-ficticio' });
  });

  it('o mesmo estado de novo não grava nem gera evento (idempotente)', async () => {
    await alterarAgente(deps(), CTO, 'risco', ligar('modelo-ficticio'));
    relogio.avancar(60_000);
    const c = await alterarAgente(deps(), CTO, 'risco', ligar('modelo-ficticio'));
    expect(c.atualizadoEm).toEqual(new Date(AGORA));
    const d = await alterarAgente(deps(), CTO, 'orquestrador', desligar());
    expect(d).toMatchObject({ ligado: false, atualizadoEm: null });
    expect((await eventosDo('risco')).length).toBe(1);
    expect(await eventosDo('orquestrador')).toEqual([]);
  });

  it('cada agente tem o seu interruptor: ligar o risco não liga os outros', async () => {
    await alterarAgente(deps(), CTO, 'risco', ligar('modelo-ficticio'));
    const lista = await listarConfiguracaoAgentes(b.db);
    expect(lista.filter((c) => c.ligado).map((c) => c.agente)).toEqual(['risco']);
  });

  it('C-12: a administradora recebe 403 ao ligar ou desligar, e nada muda', async () => {
    await alterarAgente(deps(), CTO, 'risco', ligar('modelo-ficticio'));
    for (const e of [ligar('modelo-ficticio'), desligar()]) {
      const erro = await falhaDe(alterarAgente(deps(), ADM, 'risco', e));
      expect(erro).toMatchObject({ codigo: 'sem_permissao', mensagem: MENSAGENS_ACESSO.sem_permissao });
    }
    expect(await linhaDo('risco')).toMatchObject({ ligado: true, atualizado_por: CTO.usuarioId });
    expect((await eventosDo('risco')).length).toBe(1);
  });

  it('G3.8: na transação de quem chama, o rollback desfaz o interruptor e o evento', async () => {
    await expect(
      comTransacao(b.poolApp, async (t) => {
        await alterarAgente(deps(), CTO, 'risco', ligar('modelo-ficticio'), t);
        throw new Error('desfazer');
      }),
    ).rejects.toThrow('desfazer');
    expect(await linhaDo('risco')).toMatchObject({ ligado: false, modelo: null });
    expect(await eventosDo('risco')).toEqual([]);
  });

  it('duas mudanças ao mesmo tempo no mesmo agente: as duas entram, uma depois da outra, com dois eventos', async () => {
    await Promise.all([alterarAgente(deps(), CTO, 'risco', ligar('modelo-ficticio')), alterarAgente(deps(), CTO, 'risco', desligar('modelo-ficticio'))]);
    const eventos = await eventosDo('risco');
    expect(eventos).toHaveLength(2);
    // Qualquer que seja a ordem, o "antes" de cada evento é o "depois" do anterior: nenhuma leu um estado velho.
    const primeiro = eventos[0]!;
    expect(primeiro.antes).toEqual({ ligado: false, modelo: null });
    for (let i = 1; i < eventos.length; i++) expect(eventos[i]!.antes).toEqual(eventos[i - 1]!.depois);
    expect(await linhaDo('risco')).toMatchObject({ ligado: (eventos.at(-1)!.depois as { ligado: boolean }).ligado });
  });
});

describe('alterarAgenteSchema (RF-19, C-11)', () => {
  it('exige ligado booleano; modelo é opcional, aparado, de 1 a 100 caracteres', () => {
    expect(alterarAgenteSchema.parse({ ligado: true, modelo: '  modelo-ficticio  ' })).toEqual({ ligado: true, modelo: 'modelo-ficticio' });
    expect(alterarAgenteSchema.parse({ ligado: false })).toEqual({ ligado: false });
    for (const corpo of [{}, { ligado: 'true' }, { ligado: 1 }, { ligado: true, modelo: '' }, { ligado: true, modelo: '   ' }, { ligado: true, modelo: 'x'.repeat(101) }, { ligado: true, modelo: 3 }]) {
      expect(alterarAgenteSchema.safeParse(corpo).success, JSON.stringify(corpo)).toBe(false);
    }
    expect(alterarAgenteSchema.safeParse({ ligado: true, modelo: 'x'.repeat(100) }).success).toBe(true);
  });

  it('descarta chave desconhecida: atualizadoPor, agente e atualizadoEm não chegam ao serviço', () => {
    expect(alterarAgenteSchema.parse({ ligado: true, atualizadoPor: 'u-outra', agente: 'orquestrador', atualizadoEm: '2020-01-01' })).toEqual({ ligado: true });
  });
});
