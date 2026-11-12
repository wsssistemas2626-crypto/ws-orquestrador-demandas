// Caracterização da T09 (ADR-26, CA-22.2): guarda os bytes do Pedido de Construção enquanto a conferência e a montagem
// saem de gerar.ts para conferir.ts. Nasce verde (G3.1 do plano): o JSON de gerarPedido é igual, byte a byte, a
// serializarPedido(montarPedido(...)) com o DEC, a ESP e o RSK lidos pelas consultas de hoje, e o SHA-256 do pedido
// fictício abaixo ficou gravado antes do refatoramento. Postgres real pelo papel do app; relógio fixo; um DEC só, montado
// no beforeAll, que os testes só leem e geram (a ordem dos testes não importa). Dados só fictícios.
import { createHash } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { user } from '../../db/schema';
import { relogioFixo, type RelogioFixo } from '../../lib/relogio';
import { validarPedido } from '../../vendor/construir/pedido.mjs';
import type { AtorPessoa } from '../acesso/ator';
import { criarDemandaSchema } from '../demandas/schemas';
import { criarDemanda } from '../demandas/servico';
import { obterEspecificacao } from '../especificacoes/consultas';
import { criarEspecificacaoSchema } from '../especificacoes/schemas';
import { criarEspecificacao } from '../especificacoes/servico';
import { obterPacoteDecisao } from '../pacotes-decisao/consultas';
import { criarPacoteDecisao } from '../pacotes-decisao/criar';
import { registrarDecisao } from '../pacotes-decisao/decidir';
import { criarPacoteDecisaoSchema, registrarDecisaoSchema } from '../pacotes-decisao/schemas';
import { obterParecerRisco } from '../pareceres-risco/consultas';
import { criarParecerRiscoSchema } from '../pareceres-risco/schemas';
import { criarParecerRisco } from '../pareceres-risco/servico';
import { gerarPedido } from './gerar';
import { montarPedido } from './montar';
import { serializarPedido } from './serializar';

const CONFIRMADO = { confirmaSemDadoPessoal: true } as const;
const cto: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-bytes-cto', nome: 'Pessoa Ficticia CTO', papel: 'cto' };
const administradora: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-bytes-adm', nome: 'Pessoa Ficticia Adm', papel: 'administradora' };

const sha256 = (texto: string) => createHash('sha256').update(texto, 'utf8').digest('hex');

let b: BancoDeTeste;
let relogio: RelogioFixo;
let deps: { db: BancoDeTeste['db']; pool: BancoDeTeste['poolApp']; relogio: RelogioFixo };
let decId: string;

beforeAll(async () => {
  b = await novoBanco();
  await b.db.insert(user).values([
    { id: cto.usuarioId, name: cto.nome, email: 'bytes-cto@exemplo.test', papel: 'cto' },
    { id: administradora.usuarioId, name: administradora.nome, email: 'bytes-adm@exemplo.test', papel: 'administradora' },
  ]);
  relogio = relogioFixo('2026-11-12T12:00:00Z');
  deps = { db: b.db, pool: b.poolApp, relogio };
  // Todos os campos que saem no pedido preenchidos, com acento e lista de mais de um item, para a caracterização pegar
  // qualquer mudança de texto, ordem ou escape.
  const d = await criarDemanda(
    deps,
    cto,
    criarDemandaSchema.parse({
      titulo: 'Conciliação de pedidos (fictício)',
      tipo: 'melhoria',
      solicitanteNome: 'Pessoa Ficticia',
      contexto: 'A conciliação é feita à mão toda semana.',
      descricaoProblema: 'Pedidos ficam sem baixa no financeiro.',
    }),
  );
  await criarEspecificacao(
    deps,
    cto,
    d.id,
    criarEspecificacaoSchema.parse({
      descricaoObjetiva: 'Conciliar os pedidos automaticamente',
      situacaoAtual: 'Planilha semanal "à mão"',
      situacaoDesejada: 'Conciliação diária sem planilha',
      escopoInclui: ['Leitura dos pedidos', 'Baixa no financeiro'],
      escopoExclui: ['Emissão de nota'],
      restricoesTecnicas: 'Sem janela de manutenção',
      sistemaAlvo: 'sistema-ficticio',
      repositorioDestino: 'wsssistemas2626-crypto/sistema-ficticio',
      criteriosAceitePreliminares: ['Pedido conciliado uma vez só', 'Baixa no mesmo dia'],
      definicaoDePronto: ['pnpm test verde', 'pnpm lint limpo'],
    }),
  );
  await criarParecerRisco(
    deps,
    cto,
    d.id,
    criarParecerRiscoSchema.parse({
      resumo: 'Risco controlado',
      riscoTecnicoNivel: 'medio',
      riscoTecnicoComentario: 'Integração com o financeiro',
      riscoOperacionalNivel: 'baixo',
      riscoJuridicoNivel: 'baixo',
      recomendacoesMitigacao: ['Rodar em paralelo uma semana'],
    }),
  );
  decId = (
    await criarPacoteDecisao(
      deps,
      cto,
      d.id,
      criarPacoteDecisaoSchema.parse({
        resumoExecutivo: 'Automatizar a conciliação',
        opcaoA: { descricao: 'Conciliar no sistema' },
        opcaoB: { descricao: 'Manter a planilha' },
        nivelAprovacaoRequerido: 'cto',
      }),
    )
  ).id;
  await registrarDecisao(deps, cto, decId, registrarDecisaoSchema.parse({ statusDecisao: 'aprovada', opcaoEscolhida: 'A' }));
});
afterAll(async () => {
  await b.fechar();
});

describe('T09: caracterização dos bytes do pedido (CA-22.2)', () => {
  it('o JSON de gerarPedido é igual, byte a byte, a serializarPedido(montarPedido(...)) com as consultas de hoje', async () => {
    const { json } = await gerarPedido(deps, cto, decId, CONFIRMADO);
    const dec = await obterPacoteDecisao(b.db, decId);
    const esp = await obterEspecificacao(b.db, dec.especificacaoId);
    const rsk = await obterParecerRisco(b.db, dec.parecerRiscoId);
    expect(json).toBe(serializarPedido(montarPedido({ dec, esp, rsk })));
    expect(validarPedido(JSON.parse(json))).toEqual({ ok: true, erros: [] });
  });

  it('duas gerações do mesmo DEC, por pessoas e em dias diferentes, têm o mesmo SHA-256, o gravado antes do refatoramento', async () => {
    const a = (await gerarPedido(deps, cto, decId, CONFIRMADO)).json;
    relogio.avancar(86_400_000);
    const b2 = (await gerarPedido(deps, administradora, decId, CONFIRMADO)).json;
    expect(sha256(b2)).toBe(sha256(a));
    expect(b2).toBe(a);
    expect(sha256(a)).toMatchInlineSnapshot(`"fc020cf0ae2e7f9aaa40e51d81fdd8265c170d2168cbb9f525e4daf9afe69d8d"`);
  });
});
