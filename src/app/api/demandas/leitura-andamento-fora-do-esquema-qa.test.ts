// src/app/api/demandas/leitura-andamento-fora-do-esquema-qa.test.ts — 06-T09-testes do DEC-DEM-20261111-0017-v1
// (qa-automacao; CA-04.6 na leitura, AN-12). A T09 provou a fase inventada e prontas > total; aqui vai cada campo do
// esquema lido (andamentoLidoSchema), um por vez: status da construção, DEC fora do formato, fase com outra caixa ou com
// espaço, prontas negativo e total acima de 999. Para cada um, a vista do Awave e a da pessoa respondem 200 com
// `andamento: null`, sem eco do valor, a listagem da pessoa responde 200, e um envio válido depois volta a aparecer.
// Banco próprio deste arquivo (novoBanco, `create database … template modelo`): os CHECK e a chave estrangeira do DEC
// saem no beforeAll, só aqui, para o migrator gravar o que o app nunca gravaria; nenhum outro arquivo os perde.
// Demandas do Awave gravadas pelo migrator (inserirDemandaDeIntegracao); token só gerado em tempo de teste e nunca em
// mensagem de expect. Relógio fixo, dados fictícios. Cada caso usa a própria demanda: o arquivo não depende de ordem.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as rotaDemanda from './[id]/route';
import * as rotaDemandas from './route';
import { definirDepsParaTeste, type Deps } from '../../../lib/deps';
import { substituirDestinoDoLog } from '../../../lib/log';
import { relogioFixo } from '../../../lib/relogio';
import { inserirAndamento } from '../../../../test/andamento';
import { novoBanco, type BancoDeTeste } from '../../../../test/banco';
import { criarDepsDeTeste } from '../../../../test/deps';
import { inserirDemandaDeIntegracao, tokenDeIntegracao } from '../../../../test/integracoes';
import { chamarRota } from '../../../../test/requisicao';
import { criarPessoa } from '../../../../test/sessao';

const SETE = ['andamento', 'atualizadaEm', 'criadaEm', 'id', 'status', 'tipo', 'titulo'];
// Os nomes de 0008_slippery_whirlwind.sql. Se mudarem, o `drop constraint` falha no beforeAll, de forma visível.
const RESTRICOES = [
  'andamento_construcao_fase_check',
  'andamento_construcao_status_construcao_check',
  'andamento_construcao_tarefas_check',
  'andamento_construcao_dec_id_check',
  'andamento_construcao_dec_id_pacote_decisao_id_fk',
] as const;
// DEC no formato, fictício: a chave estrangeira saiu, então ele não precisa existir.
const DEC_VALIDO = 'DEC-DEM-20261113-0901-v1';

type Linha = { decId: string; fase: string; prontas: number; total: number; status: string };
const VALIDA: Linha = { decId: DEC_VALIDO, fase: 'construindo', prontas: 3, total: 5, status: 'em_construcao' };

// Um campo fora do esquema por caso; `eco` é o texto que não pode sair em nenhuma resposta.
const CASOS: Array<{ rotulo: string; id: string; linha: Linha; eco: string }> = [
  { rotulo: 'status da construção fora da lista', id: 'DEM-20261113-0901', linha: { ...VALIDA, status: 'status_inventado' }, eco: 'status_inventado' },
  { rotulo: 'DEC fora do formato', id: 'DEM-20261113-0902', linha: { ...VALIDA, decId: 'DEC-INVENTADO-0902' }, eco: 'DEC-INVENTADO-0902' },
  { rotulo: 'fase com outra caixa (sem coerção)', id: 'DEM-20261113-0903', linha: { ...VALIDA, fase: 'Construindo' }, eco: 'Construindo' },
  { rotulo: 'fase com espaço no fim', id: 'DEM-20261113-0904', linha: { ...VALIDA, fase: 'testando ' }, eco: 'testando' },
  { rotulo: 'tarefasProntas negativo', id: 'DEM-20261113-0905', linha: { ...VALIDA, prontas: -7, total: 5 }, eco: '-7' },
  { rotulo: 'tarefasTotal acima de 999', id: 'DEM-20261113-0906', linha: { ...VALIDA, prontas: 3, total: 1000 }, eco: '1000' },
];

const relogio = relogioFixo('2026-11-13T12:00:00Z');

let b: BancoDeTeste;
let deps: Deps;
let tokenAwave: string;
let cookie: string;

type Credencial = { bearer: string } | { cookie: string };
type Obj = Record<string, unknown>;

const doAwave = (): Credencial => ({ bearer: tokenAwave });
const daPessoa = (): Credencial => ({ cookie });

const ler = (id: string, c: Credencial) => chamarRota(rotaDemanda.GET, { caminho: `/api/demandas/${id}`, params: { id }, ...c, semOrigin: 'bearer' in c });

async function lerJson(id: string, c: Credencial, rotulo: string): Promise<{ texto: string; corpo: Obj }> {
  const r = await ler(id, c);
  expect(r.status, rotulo).toBe(200);
  const texto = await r.text();
  return { texto, corpo: JSON.parse(texto) as Obj };
}

const gravar = (demandaId: string, l: Linha) =>
  inserirAndamento(b, { demandaId, decId: l.decId, fase: l.fase, prontas: l.prontas, total: l.total, status: l.status, gravadoEm: relogio.agora() });

beforeAll(async () => {
  substituirDestinoDoLog({ write: () => undefined });
  b = await novoBanco();
  deps = await criarDepsDeTeste(b, { relogio });
  definirDepsParaTeste(deps);
  tokenAwave = await tokenDeIntegracao(deps, 'awave');
  cookie = (await criarPessoa(deps, { papel: 'cto' })).cookie;
  for (const r of RESTRICOES) await b.poolMigrator.query(`alter table andamento_construcao drop constraint ${r}`);
});
afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  await deps.fila.parar();
  await b.fechar();
});

describe('CA-04.6 na leitura, campo a campo: o último andamento fora do esquema vira "sem andamento", sem 500 e sem eco', () => {
  it('as restrições saíram mesmo neste banco (o caso não passa por um CHECK que recusaria a linha)', async () => {
    const r = await b.poolMigrator.query<{ conname: string }>(
      `select conname from pg_constraint where conrelid = 'andamento_construcao'::regclass and conname = any($1::text[])`,
      [[...RESTRICOES]],
    );
    expect(r.rows).toEqual([]);
  });

  it.each(CASOS)('$rotulo: Awave e pessoa leem `andamento: null` (200), a listagem responde 200, e o válido seguinte volta a aparecer', async ({ rotulo, id, linha, eco }) => {
    await inserirDemandaDeIntegracao(b, { id, criadaEm: relogio.agora(), status: 'em_construcao' });

    // Controle: com a linha válida, as duas vistas mostram o andamento.
    await gravar(id, VALIDA);
    expect((await lerJson(id, doAwave(), rotulo)).corpo.andamento).toMatchObject({ fase: 'construindo', tarefasProntas: 3, tarefasTotal: 5 });
    expect((await lerJson(id, daPessoa(), rotulo)).corpo.andamento).toMatchObject({ decId: DEC_VALIDO, statusConstrucao: 'em_construcao' });

    // A linha fora do esquema é a última: a leitura não volta para a válida anterior, nem mostra a inválida.
    await gravar(id, linha);
    const lidaPeloAwave = await lerJson(id, doAwave(), rotulo);
    expect(Object.keys(lidaPeloAwave.corpo).sort(), rotulo).toEqual(SETE);
    expect(lidaPeloAwave.corpo.andamento, rotulo).toBeNull();
    expect(lidaPeloAwave.texto, rotulo).not.toContain(eco);
    const lidaPelaPessoa = await lerJson(id, daPessoa(), rotulo);
    expect(lidaPelaPessoa.corpo.andamento, rotulo).toBeNull();
    expect(lidaPelaPessoa.texto, rotulo).not.toContain(eco);

    const lista = await chamarRota(rotaDemandas.GET, { caminho: '/api/demandas?limit=100', cookie });
    expect(lista.status, rotulo).toBe(200);
    const textoDaLista = await lista.text();
    expect((JSON.parse(textoDaLista) as { itens: Obj[] }).itens.map((i) => i.id), rotulo).toContain(id);
    expect(textoDaLista, rotulo).not.toContain(eco);

    // Um envio válido depois: a leitura volta a mostrá-lo (a linha ruim não trava a demanda).
    await gravar(id, { ...VALIDA, fase: 'testando', prontas: 4 });
    expect((await lerJson(id, doAwave(), rotulo)).corpo.andamento).toMatchObject({ fase: 'testando', tarefasProntas: 4, tarefasTotal: 5 });
    expect((await lerJson(id, daPessoa(), rotulo)).corpo.andamento).toMatchObject({ fase: 'testando', tarefasProntas: 4, decId: DEC_VALIDO });
  });
});
