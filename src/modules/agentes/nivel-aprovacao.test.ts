// O nível de aprovação do DEC nunca vem do modelo (08-correcao, A-04). Uma injeção no texto da demanda podia fazer o
// agente de consolidação devolver `nivelAprovacaoRequerido: 'cto'` e dispensar a dupla aprovação e o documento
// assinado (RF-14). Agora: o schema de saída do agente não tem o campo (o `z.object` descarta a chave), o prompt não o
// pede, e o serviço grava o DEC de agente sempre com o nível da regra do servidor, também quando o token de agente manda
// o campo pela rota. Postgres real, papel do app; dados só fictícios; relógio fixo.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { PROMPTS } from '../../agents';
import { user } from '../../db/schema';
import { relogioFixo, type RelogioFixo } from '../../lib/relogio';
import type { AtorAgente, AtorPessoa } from '../acesso/ator';
import { criarDemandaSchema } from '../demandas/schemas';
import { criarDemanda } from '../demandas/servico';
import { criarEspecificacaoSchema } from '../especificacoes/schemas';
import { criarEspecificacao } from '../especificacoes/servico';
import { criarPacoteDecisao, NIVEL_DO_DEC_DE_AGENTE } from '../pacotes-decisao/criar';
import { criarPacoteDecisaoSchema } from '../pacotes-decisao/schemas';
import { criarParecerRiscoSchema } from '../pareceres-risco/schemas';
import { criarParecerRisco } from '../pareceres-risco/servico';
import { SCHEMA_DE_SAIDA } from './schemas';

const cto: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-nivel-cto', nome: 'Pessoa Ficticia CTO', papel: 'cto' };
const consolidacao: AtorAgente = { tipo: 'agente', agente: 'consolidacao', prefixoToken: null };

const SAIDA_QUE_REBAIXA = { ...(PROMPTS.consolidacao.exemploSaida as object), nivelAprovacaoRequerido: 'cto' };

describe('A-04: schema de saída e prompt do agente de consolidação', () => {
  it('o nível da regra do servidor é o mais exigente', () => {
    expect(NIVEL_DO_DEC_DE_AGENTE).toBe('cto_e_administradora');
  });

  it('a saída que tenta rebaixar o nível passa no schema sem o campo: o modelo não escolhe o nível', () => {
    const r = SCHEMA_DE_SAIDA.consolidacao.safeParse(SAIDA_QUE_REBAIXA);
    expect(r.success).toBe(true);
    expect(r.data).not.toHaveProperty('nivelAprovacaoRequerido');
  });

  it('a saída sem o campo é válida (o campo não é pedido ao modelo)', () => {
    expect(SCHEMA_DE_SAIDA.consolidacao.safeParse(PROMPTS.consolidacao.exemploSaida).success).toBe(true);
  });

  it('o prompt não pede o nível, nem no exemplo de saída', () => {
    expect(PROMPTS.consolidacao.exemploSaida).not.toHaveProperty('nivelAprovacaoRequerido');
    expect(PROMPTS.consolidacao.sistema).not.toContain('nivelAprovacaoRequerido');
  });

  it('a rota de pessoa continua exigindo o nível (a pessoa escolhe)', () => {
    const semNivel = { ...(PROMPTS.consolidacao.exemploSaida as object) };
    expect(criarPacoteDecisaoSchema.safeParse(semNivel).success).toBe(false);
  });
});

describe('A-04: o serviço grava o DEC de agente com o nível da regra do servidor', () => {
  let b: BancoDeTeste;
  let relogio: RelogioFixo;
  let deps: { db: BancoDeTeste['db']; pool: BancoDeTeste['poolApp']; relogio: RelogioFixo };
  let dia = 0;

  beforeAll(async () => {
    b = await novoBanco();
    await b.db.insert(user).values([{ id: cto.usuarioId, name: cto.nome, email: 'nivel-cto@exemplo.test', papel: 'cto' }]);
  });
  afterAll(async () => {
    await b.fechar();
  });
  beforeEach(() => {
    relogio = relogioFixo('2026-10-22T12:00:00Z');
    relogio.avancar(++dia * 86_400_000);
    deps = { db: b.db, pool: b.poolApp, relogio };
  });

  async function prepararDemanda(): Promise<string> {
    const d = await criarDemanda(deps, cto, criarDemandaSchema.parse({ titulo: 'Pedidos duplicados', tipo: 'bug', solicitanteNome: 'Pessoa Ficticia' }));
    await criarEspecificacao(
      deps,
      cto,
      d.id,
      criarEspecificacaoSchema.parse({
        descricaoObjetiva: 'Corrigir pedidos duplicados',
        escopoInclui: ['Importação de pedidos'],
        sistemaAlvo: 'meu-sistema',
        repositorioDestino: 'wsssistemas2626-crypto/meu-sistema',
        criteriosAceitePreliminares: ['Critério fictício'],
        definicaoDePronto: ['pnpm test verde'],
      }),
    );
    await criarParecerRisco(deps, cto, d.id, criarParecerRiscoSchema.parse({ riscoTecnicoNivel: 'baixo', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo' }));
    return d.id;
  }

  it('token de agente mandando nível cto (como pela rota): o DEC nasce cto_e_administradora', async () => {
    const demandaId = await prepararDemanda();
    const dec = await criarPacoteDecisao(deps, consolidacao, demandaId, criarPacoteDecisaoSchema.parse(SAIDA_QUE_REBAIXA));
    expect(dec.rascunhoAgente).toBe(true);
    expect(dec.nivelAprovacaoRequerido).toBe('cto_e_administradora');
    const linha = await b.poolMigrator.query('select nivel_aprovacao_requerido from pacote_decisao where id = $1', [dec.id]);
    expect(linha.rows[0].nivel_aprovacao_requerido).toBe('cto_e_administradora');
    const ev = await b.poolMigrator.query(`select depois from evento where entidade_id = $1 and acao = 'pacote_decisao_criado'`, [dec.id]);
    expect(ev.rows[0].depois).toMatchObject({ nivelAprovacaoRequerido: 'cto_e_administradora' });
  });

  it('pessoa escolhe o nível: o DEC da pessoa com cto continua cto', async () => {
    const demandaId = await prepararDemanda();
    const dec = await criarPacoteDecisao(deps, cto, demandaId, criarPacoteDecisaoSchema.parse(SAIDA_QUE_REBAIXA));
    expect(dec.nivelAprovacaoRequerido).toBe('cto');
  });
});
