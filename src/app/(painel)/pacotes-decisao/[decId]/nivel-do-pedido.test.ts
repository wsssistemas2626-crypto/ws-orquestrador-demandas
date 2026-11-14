// 06-T11-testes (qa-automacao), DEC-DEM-20261111-0018-v1, D-09: a T11 passa à SecaoPedido o nível do próprio pacote,
// que escolhe a linha 6 da orientação do 422 (dados-do-pedido.ts, erroDoPedido). O typecheck só garante que a prop
// existe; aqui a SecaoPedido é um dublê que guarda as props, e o pacote lido muda de nível entre os casos: o valor
// passado tem de acompanhar o do pacote, e não um fixo. Que a SecaoPedido repassa a prop ao erroDoPedido fica em
// test/estatico/nivel-do-pedido.test.ts; o texto de cada nível, em src/components/textos-0018.test.ts. A sessão e as
// leituras são dublês; a matriz de acesso é a real. Datas fixas, ids e nomes fictícios.
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AtorPessoa } from '../../../../modules/acesso/ator';
import { exigirPessoaNaPagina } from '../../../../modules/acesso/exigir-pessoa';
import { obterDemanda, type DemandaVista } from '../../../../modules/demandas/consultas';
import { obterPacoteDecisao, type PacoteDecisaoVista } from '../../../../modules/pacotes-decisao/consultas';
import { recebimentoDoPedido } from '../../../../modules/pedido-construcao/pendentes';
import PaginaDecisao from './page';
import { SecaoPedido } from './SecaoPedido';

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  usePathname: () => '/pacotes-decisao/DEC-DEM-20991231-0007-v1',
  useRouter: () => ({ replace: () => undefined, refresh: () => undefined, push: () => undefined }),
}));
vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('../../../../lib/deps', () => ({ obterDeps: async () => ({ db: { dubleDoBanco: true } }) }));
vi.mock('../../../../modules/acesso/exigir-pessoa', () => ({ exigirPessoaNaPagina: vi.fn(), exigirPessoa: vi.fn() }));
vi.mock('../../../../modules/demandas/consultas', async (original) => {
  const real = await original<typeof import('../../../../modules/demandas/consultas')>();
  return { ...real, obterDemanda: vi.fn() };
});
vi.mock('../../../../modules/pacotes-decisao/consultas', async (original) => {
  const real = await original<typeof import('../../../../modules/pacotes-decisao/consultas')>();
  return { ...real, obterPacoteDecisao: vi.fn() };
});
vi.mock('./acoes', () => ({ registrarDecisaoNoPainel: async () => ({ ok: false, erro: 'erro_interno', mensagem: '' }) }));
vi.mock('./acoes-pedido', () => ({ gerarPedidoNoPainel: async () => ({ ok: false, erro: 'erro_interno', mensagem: '' }) }));
vi.mock('../../../../modules/pedido-construcao/pendentes', () => ({ recebimentoDoPedido: vi.fn() }));
// T12 do DEC-DEM-20261111-0018-v1 (ADR-40): a leitura do vigente é dublê, sem vigente (como em pagina.test.ts).
vi.mock('../../../../modules/pacotes-decisao/substituido', async (original) => {
  const real = await original<typeof import('../../../../modules/pacotes-decisao/substituido')>();
  return { ...real, vigenteDaDemanda: vi.fn(async () => null) };
});
// O dublê da SecaoPedido: guarda as props e mostra o nível num atributo, para conferir também o HTML.
vi.mock('./SecaoPedido', async () => {
  const { createElement } = await import('react');
  return {
    SecaoPedido: vi.fn((props: { decId: string; nivelAprovacaoRequerido: string }) =>
      createElement('div', { 'data-duble': 'secao-pedido', 'data-dec': props.decId, 'data-nivel': props.nivelAprovacaoRequerido }),
    ),
  };
});

const mExigir = vi.mocked(exigirPessoaNaPagina);
const mDemanda = vi.mocked(obterDemanda);
const mPacote = vi.mocked(obterPacoteDecisao);
const mRecebimento = vi.mocked(recebimentoDoPedido);
const mSecao = vi.mocked(SecaoPedido);

const CTO: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-cto', nome: 'Pessoa Ficticia CTO', papel: 'cto' };
const ID = 'DEM-20991231-0007';
const DEC = `DEC-${ID}-v1`;
const ESP = `ESP-${ID}-v1`;
const RSK = `RSK-${ID}-v1`;
const CRIADO = new Date('2099-12-31T12:00:00Z');
const APROVADO = new Date('2099-12-31T13:00:00Z');

function demanda(): DemandaVista {
  const resumo = (id: string) => ({ id, versao: 1, criadaEm: CRIADO, autor: { tipo: 'pessoa' as const, nome: 'Pessoa Ficticia' }, rascunhoAgente: false });
  return {
    id: ID,
    titulo: 'Demanda do nível do pedido (fictício)',
    tipo: 'melhoria',
    status: 'aprovada',
    solicitanteNome: 'Pessoa Ficticia',
    solicitantePapel: null,
    linhaServicoProvavel: null,
    urgencia: null,
    justificativaUrgencia: null,
    contexto: null,
    descricaoProblema: null,
    impactoPercebido: null,
    anexos: [],
    duvidasEntrada: [],
    rascunhoAgente: false,
    responsavel: { tipo: 'pessoa', nome: 'Pessoa Ficticia' },
    criadaEm: CRIADO,
    atualizadaEm: CRIADO,
    especificacoes: [resumo(ESP)],
    pareceresRisco: [resumo(RSK)],
    pacotesDecisao: [],
    agentesEmAndamento: [],
    andamento: null,
  };
}

const aprovacao = (papel: 'cto' | 'administradora') => ({
  papel,
  nome: papel === 'cto' ? 'Pessoa Ficticia CTO' : 'Pessoa Ficticia Administradora',
  opcao: 'A' as const,
  registradaEm: APROVADO,
  referenciaDocumento: papel === 'cto' ? null : 'DOC-FICTICIO-001',
  dataDocumento: papel === 'cto' ? null : '2099-12-31',
});

// O DEC aprovado e completo (secaoDoPedido = 'gerar'), no nível pedido, com as aprovações que o nível exige.
function aprovado(nivelAprovacaoRequerido: PacoteDecisaoVista['nivelAprovacaoRequerido'], extra: Partial<PacoteDecisaoVista> = {}): PacoteDecisaoVista {
  return {
    id: DEC,
    demandaId: ID,
    versao: 1,
    especificacaoId: ESP,
    parecerRiscoId: RSK,
    demandaTipo: 'melhoria',
    demandaTitulo: 'Demanda do nível do pedido (fictício)',
    demandaDescricao: 'Problema: fictício',
    resumoExecutivo: 'Resumo executivo fictício.',
    opcaoA: { descricao: 'Construir tudo (fictício)' },
    opcaoB: { descricao: 'Construir em duas entregas (fictício)' },
    recomendacao: null,
    nivelAprovacaoRequerido,
    autor: { tipo: 'pessoa', nome: 'Pessoa Ficticia CTO' },
    rascunhoAgente: false,
    criadaEm: CRIADO,
    statusDecisao: 'aprovada',
    aprovadores: nivelAprovacaoRequerido === 'cto' ? [aprovacao('cto')] : [aprovacao('cto'), aprovacao('administradora')],
    desatualizado: false,
    substituido: false,
    substituidoPor: null,
    decisao: { opcaoEscolhida: 'A', comentarios: null, decididaPor: 'Pessoa Ficticia CTO', decididaEm: APROVADO },
    rascunhosCitados: [],
    especificacaoCitada: {
      sistemaAlvo: 'sistema-ficticio',
      repositorioDestino: 'wsssistemas2626-crypto/sistema-ficticio',
      criteriosAceitePreliminares: ['Critério (fictício)'],
      definicaoDePronto: ['Pronto (fictício)'],
    },
    niveisRisco: { tecnico: 'baixo', operacional: 'baixo', juridico: 'baixo' },
    ...extra,
  };
}

async function pagina(): Promise<string> {
  return renderToStaticMarkup(await PaginaDecisao({ params: Promise.resolve({ decId: DEC }), searchParams: Promise.resolve({}) }));
}

beforeEach(() => {
  vi.clearAllMocks();
  mExigir.mockResolvedValue(CTO);
  mDemanda.mockResolvedValue(demanda());
  mRecebimento.mockResolvedValue(null);
});

describe('T11 (0.4.1, D-09): a página passa à SecaoPedido o nível do próprio pacote', () => {
  it('DEC de dupla aprovação: a SecaoPedido recebe cto_e_administradora, com o id do DEC e nada mais', async () => {
    mPacote.mockResolvedValue(aprovado('cto_e_administradora'));
    const s = await pagina();
    expect(mSecao).toHaveBeenCalledTimes(1);
    expect(mSecao.mock.calls[0]![0]).toEqual({ decId: DEC, nivelAprovacaoRequerido: 'cto_e_administradora' });
    expect(s).toContain(`data-dec="${DEC}" data-nivel="cto_e_administradora"`);
  });

  it('DEC só do CTO: a SecaoPedido recebe cto (o valor acompanha o pacote, não é fixo)', async () => {
    mPacote.mockResolvedValue(aprovado('cto'));
    const s = await pagina();
    expect(mSecao).toHaveBeenCalledTimes(1);
    expect(mSecao.mock.calls[0]![0]).toEqual({ decId: DEC, nivelAprovacaoRequerido: 'cto' });
    expect(s).toContain(`data-dec="${DEC}" data-nivel="cto"`);
  });

  it('na mesma execução, um pacote depois do outro: cada render leva o nível do pacote lido nele', async () => {
    mPacote.mockResolvedValueOnce(aprovado('cto')).mockResolvedValueOnce(aprovado('cto_e_administradora')).mockResolvedValueOnce(aprovado('cto'));
    await pagina();
    await pagina();
    await pagina();
    expect(mSecao.mock.calls.map((c) => c[0].nivelAprovacaoRequerido)).toEqual(['cto', 'cto_e_administradora', 'cto']);
  });

  it('controle: sem a seção do pedido (dupla só com o CTO, Estudo, substituído), a SecaoPedido não é chamada', async () => {
    const casos: PacoteDecisaoVista[] = [
      aprovado('cto_e_administradora', { statusDecisao: 'pendente', aprovadores: [aprovacao('cto')], decisao: null }),
      aprovado('cto_e_administradora', { demandaTipo: 'estudo' }),
      aprovado('cto_e_administradora', { substituido: true, substituidoPor: `DEC-${ID}-v2` }),
    ];
    for (const p of casos) {
      mPacote.mockResolvedValue(p);
      const s = await pagina();
      expect(s, `${p.statusDecisao} ${p.demandaTipo} ${String(p.substituidoPor)}`).not.toContain('data-nivel=');
    }
    expect(mSecao).not.toHaveBeenCalled();
  });
});
