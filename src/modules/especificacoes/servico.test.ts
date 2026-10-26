// Serviço da ESP contra o Postgres real, pelo papel do app (RF-08, RF-11, RF-15, C-11, C-30, C-36). Dados só fictícios;
// o relógio é sempre o fixo.
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { SENTINELAS, contemSentinela } from '../../../test/sentinelas';
import { criarDb } from '../../db';
import { demanda, especificacaoTecnica, evento, user } from '../../db/schema';
import { comTransacao } from '../../db/transacao';
import { ErroDominio } from '../../lib/erros';
import { relogioFixo, type RelogioFixo } from '../../lib/relogio';
import type { AtorAgente, AtorPessoa, AtorSistema } from '../acesso/ator';
import { criarDemandaSchema, type Status, type Tipo } from '../demandas/schemas';
import { criarDemanda } from '../demandas/servico';
import { MENSAGEM_LIMITE } from '../limites';
import { idVersao } from '../versoes';
import { listarEspecificacoes, obterEspecificacao } from './consultas';
import { criarEspecificacaoSchema } from './schemas';
import { criarEspecificacao } from './servico';

const cto: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-esp-cto', nome: 'Pessoa Ficticia CTO', papel: 'cto' };
const administradora: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-esp-adm', nome: 'Pessoa Ficticia Adm', papel: 'administradora' };
const insumo: AtorAgente = { tipo: 'agente', agente: 'insumo_tecnico', prefixoToken: 'Ab3dE5gH' };
const risco: AtorAgente = { tipo: 'agente', agente: 'risco', prefixoToken: 'Zz9yX8wV' };
const sistema: AtorSistema = { tipo: 'sistema' };

const CONSTRUCAO = {
  sistemaAlvo: 'meu-sistema',
  repositorioDestino: 'wsssistemas2626-crypto/meu-sistema',
  criteriosAceitePreliminares: ['Critério fictício'],
  definicaoDePronto: ['pnpm test verde'],
};
const esp = (extra: Record<string, unknown> = {}) =>
  criarEspecificacaoSchema.parse({ descricaoObjetiva: 'Corrigir pedidos duplicados', escopoInclui: ['Importação de pedidos'], ...CONSTRUCAO, ...extra });

let b: BancoDeTeste;
let relogio: RelogioFixo;
let deps: { db: BancoDeTeste['db']; pool: BancoDeTeste['poolApp']; relogio: RelogioFixo };
let dia = 0;

beforeAll(async () => {
  b = await novoBanco();
  await b.db.insert(user).values([
    { id: cto.usuarioId, name: 'Pessoa Ficticia CTO', email: 'esp-cto@exemplo.test', papel: 'cto' },
    { id: administradora.usuarioId, name: 'Pessoa Ficticia Adm', email: 'esp-adm@exemplo.test', papel: 'administradora' },
  ]);
});
afterAll(async () => {
  await b.fechar();
});
beforeEach(() => {
  // Cada teste num dia próprio: o limite por hora (C-36) de um teste não entra no outro.
  relogio = relogioFixo('2026-10-22T12:00:00Z');
  relogio.avancar(++dia * 86_400_000);
  deps = { db: b.db, pool: b.poolApp, relogio };
});

const migrator = () => criarDb(b.poolMigrator);
const eventosDa = (demandaId: string) => b.db.select().from(evento).where(eq(evento.demandaId, demandaId)).orderBy(evento.id);
const linhasEsp = (demandaId: string) => migrator().select().from(especificacaoTecnica).where(eq(especificacaoTecnica.demandaId, demandaId)).orderBy(especificacaoTecnica.versao);
const statusDa = async (id: string) => (await migrator().select({ s: demanda.status }).from(demanda).where(eq(demanda.id, id)))[0]!.s;

async function novaDemanda(tipo: Tipo = 'bug', status?: Status): Promise<string> {
  const d = await criarDemanda(deps, cto, criarDemandaSchema.parse({ titulo: 'Pedidos duplicados', tipo, solicitanteNome: 'Pessoa Ficticia' }));
  if (status) await migrator().update(demanda).set({ status }).where(eq(demanda.id, d.id));
  return d.id;
}

describe('criarEspecificacao', () => {
  it('CA-08.1: primeira é ESP-<dem>-v1, a seguinte -v2, com a autoria da pessoa', async () => {
    const id = await novaDemanda();
    const v1 = await criarEspecificacao(deps, cto, id, esp());
    const v2 = await criarEspecificacao(deps, administradora, id, esp({ descricaoObjetiva: 'Segunda versão' }));
    expect(v1).toMatchObject({ id: idVersao('ESP', id, 1), demandaId: id, versao: 1, rascunhoAgente: false, autor: { tipo: 'pessoa', nome: 'Pessoa Ficticia CTO' } });
    expect(v2).toMatchObject({ id: idVersao('ESP', id, 2), versao: 2, descricaoObjetiva: 'Segunda versão', autor: { tipo: 'pessoa', nome: 'Pessoa Ficticia Adm' } });
    expect(v1.criadaEm).toEqual(relogio.agora());
    expect(Object.keys(v1)).not.toContain('autorId');
    const linhas = await linhasEsp(id);
    expect(linhas.map((l) => [l.id, l.autorTipo, l.autorId, l.rascunhoAgente])).toEqual([
      [idVersao('ESP', id, 1), 'pessoa', cto.usuarioId, false],
      [idVersao('ESP', id, 2), 'pessoa', administradora.usuarioId, false],
    ]);
  });

  it('grava os campos, inclusive as listas e os quatro de construção, e devolve a vista', async () => {
    const id = await novaDemanda('novo_projeto');
    const v = await criarEspecificacao(
      deps,
      cto,
      id,
      esp({ situacaoAtual: 'Duplica', situacaoDesejada: 'Não duplica', escopoExclui: ['Fiscal'], sistemasErp: 'ERP fictício', restricoesTecnicas: 'Sem janela' }),
    );
    expect(v).toMatchObject({
      escopoInclui: ['Importação de pedidos'],
      escopoExclui: ['Fiscal'],
      duvidasEmAberto: [],
      situacaoAtual: 'Duplica',
      situacaoDesejada: 'Não duplica',
      sistemasErp: 'ERP fictício',
      sistemasEcommerceMarketplace: null,
      restricoesTecnicas: 'Sem janela',
      ...CONSTRUCAO,
    });
  });

  it('CA-08.2 no serviço: novo_projeto sem repositório → entrada_invalida com o campo, e nada gravado', async () => {
    const id = await novaDemanda('novo_projeto');
    const erro = await criarEspecificacao(deps, cto, id, esp({ repositorioDestino: undefined })).catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ErroDominio);
    expect(erro).toMatchObject({ codigo: 'entrada_invalida', extras: { campos: [{ campo: 'repositorioDestino', mensagem: 'Informe o repositório destino.' }] } });
    expect(await linhasEsp(id)).toEqual([]);
    expect((await eventosDa(id)).map((e) => e.acao)).toEqual(['demanda_criada']);
  });

  it('CA-08.4 no serviço: estudo sem os quatro campos → gravada', async () => {
    const id = await novaDemanda('estudo');
    const v = await criarEspecificacao(deps, cto, id, criarEspecificacaoSchema.parse({ descricaoObjetiva: 'x', escopoInclui: ['a'] }));
    expect(v).toMatchObject({ versao: 1, sistemaAlvo: null, repositorioDestino: null, criteriosAceitePreliminares: null, definicaoDePronto: null });
  });

  it('a regra de construção usa o tipo atual da demanda, lido com a trava', async () => {
    const id = await novaDemanda('estudo');
    await migrator().update(demanda).set({ tipo: 'melhoria' }).where(eq(demanda.id, id));
    await expect(criarEspecificacao(deps, cto, id, criarEspecificacaoSchema.parse({ descricaoObjetiva: 'x', escopoInclui: ['a'] }))).rejects.toMatchObject({
      codigo: 'entrada_invalida',
    });
  });

  it('C-11: agente insumo_tecnico grava rascunho de agente, com o nome do agente como autor', async () => {
    const id = await novaDemanda();
    const v = await criarEspecificacao(deps, insumo, id, esp());
    expect(v).toMatchObject({ rascunhoAgente: true, autor: { tipo: 'agente', agente: 'insumo_tecnico' } });
    const [linha] = await linhasEsp(id);
    expect(linha).toMatchObject({ autorTipo: 'agente', autorId: 'insumo_tecnico', rascunhoAgente: true, execucaoAgenteId: null });
  });

  it('extras.execucaoAgenteId fica gravado na versão', async () => {
    const id = await novaDemanda();
    const execucao = '00000000-0000-4000-8000-000000000018';
    await criarEspecificacao(deps, insumo, id, esp(), undefined, { execucaoAgenteId: execucao });
    expect((await linhasEsp(id))[0]!.execucaoAgenteId).toBe(execucao);
  });

  it('C-10: agente risco e ator sistema → sem_permissao, e nada gravado', async () => {
    const id = await novaDemanda();
    for (const ator of [risco, sistema]) {
      await expect(criarEspecificacao(deps, ator, id, esp())).rejects.toMatchObject({ codigo: 'sem_permissao' });
    }
    expect(await linhasEsp(id)).toEqual([]);
  });

  it('demanda que não existe → nao_encontrado', async () => {
    await expect(criarEspecificacao(deps, cto, 'DEM-20261022-9999', esp())).rejects.toMatchObject({ codigo: 'nao_encontrado' });
  });

  it('RF-21 e C-30: evento especificacao_criada com a pessoa e só versão e rascunho, sem texto livre', async () => {
    const id = await novaDemanda();
    await criarEspecificacao(
      deps,
      cto,
      id,
      esp({ descricaoObjetiva: SENTINELAS.texto, escopoInclui: [SENTINELAS.email], situacaoAtual: SENTINELAS.nome, restricoesTecnicas: SENTINELAS.telefone }),
    );
    const eventos = await eventosDa(id);
    const ev = eventos.find((e) => e.acao === 'especificacao_criada')!;
    expect(ev).toMatchObject({ atorTipo: 'pessoa', atorId: cto.usuarioId, entidade: 'especificacao', entidadeId: idVersao('ESP', id, 1), antes: null, depois: { versao: 1, rascunhoAgente: false } });
    expect(contemSentinela(JSON.stringify(eventos))).toBe(false);
  });

  it('o evento do agente leva o prefixo do token, para auditoria', async () => {
    const id = await novaDemanda();
    await criarEspecificacao(deps, insumo, id, esp());
    const ev = (await eventosDa(id)).find((e) => e.acao === 'especificacao_criada')!;
    expect(ev).toMatchObject({ atorTipo: 'agente', atorId: 'insumo_tecnico', atorTokenPrefixo: 'Ab3dE5gH', depois: { versao: 1, rascunhoAgente: true } });
  });
});

describe('dúvida em aberto (RF-15)', () => {
  it('CA-15.1: ESP com dúvida leva a demanda em_analise a aguardando_informacao, com evento de ator sistema', async () => {
    const id = await novaDemanda('bug', 'em_analise');
    await criarEspecificacao(deps, cto, id, esp({ duvidasEmAberto: ['Qual ERP o cliente usa?'] }));
    expect(await statusDa(id)).toBe('aguardando_informacao');
    const eventos = await eventosDa(id);
    expect(eventos.map((e) => e.acao)).toEqual(['demanda_criada', 'especificacao_criada', 'status_alterado']);
    expect(eventos[2]).toMatchObject({ atorTipo: 'sistema', antes: { status: 'em_analise' }, depois: { status: 'aguardando_informacao' } });
  });

  it.each(['nova', 'pronta_para_decisao'] as const)('de %s também vai a aguardando_informacao', async (status) => {
    const id = await novaDemanda('bug', status);
    await criarEspecificacao(deps, cto, id, esp({ duvidasEmAberto: ['Dúvida fictícia'] }));
    expect(await statusDa(id)).toBe('aguardando_informacao');
  });

  it('sem dúvida, o status não muda', async () => {
    const id = await novaDemanda('bug', 'em_analise');
    await criarEspecificacao(deps, cto, id, esp());
    expect(await statusDa(id)).toBe('em_analise');
    expect((await eventosDa(id)).map((e) => e.acao)).toEqual(['demanda_criada', 'especificacao_criada']);
  });

  it.each(['aprovada', 'em_construcao', 'encerrada'] as const)('com dúvida, mas em %s (fora da origem permitida), o status não muda', async (status) => {
    const id = await novaDemanda('bug', status);
    await criarEspecificacao(deps, cto, id, esp({ duvidasEmAberto: ['Dúvida fictícia'] }));
    expect(await statusDa(id)).toBe(status);
    expect((await eventosDa(id)).map((e) => e.acao)).not.toContain('status_alterado');
  });
});

describe('transação e limite', () => {
  it('G3.8: com a transação de quem chama, o rollback desfaz a versão, o evento e o status', async () => {
    const id = await novaDemanda('bug', 'em_analise');
    await expect(
      comTransacao(b.poolApp, async (t) => {
        await criarEspecificacao(deps, cto, id, esp({ duvidasEmAberto: ['Dúvida fictícia'] }), t);
        throw new Error('desfaz');
      }),
    ).rejects.toThrow('desfaz');
    expect(await linhasEsp(id)).toEqual([]);
    expect(await statusDa(id)).toBe('em_analise');
    expect((await eventosDa(id)).map((e) => e.acao)).toEqual(['demanda_criada']);
  });

  it('com a transação de quem chama, a vista devolvida já enxerga a versão gravada', async () => {
    const id = await novaDemanda();
    const v = await comTransacao(b.poolApp, (t) => criarEspecificacao(deps, cto, id, esp(), t));
    expect(v.id).toBe(idVersao('ESP', id, 1));
  });

  it('C-36: com 60 artefatos do ator na última hora, o 61º → limite_excedido, e nada gravado', async () => {
    const id = await novaDemanda();
    const agora = relogio.agora();
    await migrator()
      .insert(especificacaoTecnica)
      .values(
        Array.from({ length: 60 }, (_, i) => ({
          id: idVersao('ESP', id, i + 1),
          demandaId: id,
          versao: i + 1,
          descricaoObjetiva: 'x',
          escopoInclui: ['x'],
          autorTipo: 'pessoa' as const,
          autorId: administradora.usuarioId,
          rascunhoAgente: false,
          criadaEm: agora,
        })),
      );
    await expect(criarEspecificacao(deps, administradora, id, esp())).rejects.toMatchObject({ codigo: 'limite_excedido', mensagem: MENSAGEM_LIMITE.artefato });
    expect(await linhasEsp(id)).toHaveLength(60);
    // Outro ator não é afetado; a versão seguinte é a 61.
    expect((await criarEspecificacao(deps, cto, id, esp())).versao).toBe(61);
  });
});

describe('consultas', () => {
  it('listarEspecificacoes: da mais nova para a mais antiga; demanda sem ESP → lista vazia', async () => {
    const id = await novaDemanda();
    expect(await listarEspecificacoes(b.db, id)).toEqual([]);
    await criarEspecificacao(deps, cto, id, esp());
    await criarEspecificacao(deps, insumo, id, esp());
    const lista = await listarEspecificacoes(b.db, id);
    expect(lista.map((e) => [e.versao, e.autor])).toEqual([
      [2, { tipo: 'agente', agente: 'insumo_tecnico' }],
      [1, { tipo: 'pessoa', nome: 'Pessoa Ficticia CTO' }],
    ]);
  });

  it('listarEspecificacoes de demanda que não existe → nao_encontrado', async () => {
    await expect(listarEspecificacoes(b.db, 'DEM-20261022-9999')).rejects.toMatchObject({ codigo: 'nao_encontrado' });
  });

  it('obterEspecificacao: a versão pedida, com o id da mais nova da demanda', async () => {
    const id = await novaDemanda();
    await criarEspecificacao(deps, cto, id, esp({ descricaoObjetiva: 'Primeira' }));
    await criarEspecificacao(deps, cto, id, esp({ descricaoObjetiva: 'Segunda' }));
    const v1 = await obterEspecificacao(b.db, idVersao('ESP', id, 1));
    expect(v1).toMatchObject({ id: idVersao('ESP', id, 1), descricaoObjetiva: 'Primeira', versaoMaisNova: idVersao('ESP', id, 2) });
    expect((await obterEspecificacao(b.db, idVersao('ESP', id, 2))).versaoMaisNova).toBe(idVersao('ESP', id, 2));
  });

  it('obterEspecificacao de versão que não existe → nao_encontrado', async () => {
    const id = await novaDemanda();
    await expect(obterEspecificacao(b.db, idVersao('ESP', id, 1))).rejects.toMatchObject({ codigo: 'nao_encontrado' });
  });
});
