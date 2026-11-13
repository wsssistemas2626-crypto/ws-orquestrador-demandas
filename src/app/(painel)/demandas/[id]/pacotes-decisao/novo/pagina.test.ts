// T43: T09 Novo pacote de decisão (03, T09), o HTML do servidor da página: a ordem de autorização e leitura (C-04, C-17),
// o "falta" sem formulário, a informação das versões citadas e o formulário em branco. Envio, foco e axe ficam no e2e
// (e2e/pacote-decisao.spec.ts). A sessão e a leitura são dublês; a matriz de acesso é a real. Datas fixas.
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { idDoCampo } from '../../../../../../components/formulario';
import type { AtorPessoa } from '../../../../../../modules/acesso/ator';
import { exigirPessoaNaPagina } from '../../../../../../modules/acesso/exigir-pessoa';
import { autorizar } from '../../../../../../modules/acesso/matriz';
import { obterDemanda, type DemandaVista, type VersaoResumo } from '../../../../../../modules/demandas/consultas';
import PaginaNovoPacote, { generateMetadata } from './page';

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  usePathname: () => '/demandas/DEM-20261022-0042/pacotes-decisao/novo',
  useRouter: () => ({ replace: () => undefined, refresh: () => undefined, push: () => undefined }),
}));
vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('../../../../../../lib/deps', () => ({ obterDeps: async () => ({ db: { dubleDoBanco: true } }) }));
vi.mock('../../../../../../modules/acesso/exigir-pessoa', () => ({ exigirPessoaNaPagina: vi.fn(), exigirPessoa: vi.fn() }));
vi.mock('../../../../../../modules/acesso/matriz', async (original) => {
  const real = await original<typeof import('../../../../../../modules/acesso/matriz')>();
  return { ...real, autorizar: vi.fn(real.autorizar) };
});
vi.mock('../../../../../../modules/demandas/consultas', async (original) => {
  const real = await original<typeof import('../../../../../../modules/demandas/consultas')>();
  return { ...real, obterDemanda: vi.fn() };
});
// A Server Action não roda aqui: o HTML do primeiro estado não envia nada.
vi.mock('./acoes', () => ({ gravarPacoteNoPainel: async () => ({ ok: false, erro: 'erro_interno', mensagem: '' }) }));

const mExigir = vi.mocked(exigirPessoaNaPagina);
const mAutorizar = vi.mocked(autorizar);
const mObter = vi.mocked(obterDemanda);

const CTO: AtorPessoa = { tipo: 'pessoa', usuarioId: 'usuario-ficticio-1', nome: 'Pessoa Ficticia', papel: 'cto' };
const ID = 'DEM-20261022-0042';
const DB = { dubleDoBanco: true };
const CRIADA = new Date('2026-10-22T17:05:00Z');

const resumo = (prefixo: 'ESP' | 'RSK', v: number): VersaoResumo => ({
  id: `${prefixo}-${ID}-v${v}`,
  versao: v,
  criadaEm: CRIADA,
  autor: { tipo: 'pessoa', nome: 'Pessoa Ficticia' },
  rascunhoAgente: false,
});

function demanda(extra: Partial<DemandaVista> = {}): DemandaVista {
  return {
    id: ID,
    titulo: 'Pedidos duplicados (fictício)',
    tipo: 'melhoria',
    status: 'em_analise',
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
    criadaEm: CRIADA,
    atualizadaEm: CRIADA,
    especificacoes: [resumo('ESP', 3), resumo('ESP', 2)],
    pareceresRisco: [resumo('RSK', 2), resumo('RSK', 1)],
    pacotesDecisao: [{ ...resumo('RSK', 1), id: `DEC-${ID}-v1`, statusDecisao: 'pendente', desatualizado: true, substituido: false, substituidoPor: null }],
    agentesEmAndamento: [],
    andamento: null,
    ...extra,
  };
}

async function pagina(id = ID): Promise<string> {
  return renderToStaticMarkup(await PaginaNovoPacote({ params: Promise.resolve({ id }) }));
}

beforeEach(() => {
  vi.clearAllMocks();
  mExigir.mockResolvedValue(CTO);
  mObter.mockResolvedValue(demanda());
});

describe('T09: acesso e leitura', () => {
  it('pessoa (C-04) → criar_pacote_decisao → a demanda', async () => {
    await pagina();
    expect(mExigir).toHaveBeenCalledWith(`/demandas/${ID}/pacotes-decisao/novo`);
    expect(mAutorizar.mock.calls.map((c) => c[1])).toEqual(['criar_pacote_decisao']);
    expect(mObter).toHaveBeenCalledWith(DB, ID);
    expect(mAutorizar.mock.invocationCallOrder[0]!).toBeLessThan(mObter.mock.invocationCallOrder[0]!);
  });

  it('C-17: id fora do formato dá 404 sem tocar o banco, e o retorno do login é a fila', async () => {
    await expect(pagina('qualquer-coisa')).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mExigir).toHaveBeenCalledWith('/demandas');
    expect(mObter).not.toHaveBeenCalled();
  });

  it('demanda que não existe: 404; sem permissão: a matriz nega antes de ler', async () => {
    const { ErroDominio } = await import('../../../../../../lib/erros');
    mObter.mockRejectedValue(new ErroDominio('nao_encontrado', 'x'));
    await expect(pagina()).rejects.toThrow('NEXT_NOT_FOUND');
    mObter.mockClear();
    mExigir.mockResolvedValue({ ...CTO, papel: 'outro' as AtorPessoa['papel'] });
    await expect(pagina()).rejects.toThrow();
    expect(mObter).not.toHaveBeenCalled();
  });

  it('título da aba: o da tela', async () => {
    const { exigirPessoa } = await import('../../../../../../modules/acesso/exigir-pessoa');
    vi.mocked(exigirPessoa).mockResolvedValue(CTO);
    await expect(generateMetadata({ params: Promise.resolve({ id: ID }) })).resolves.toEqual({ title: 'Novo pacote de decisão' });
  });
});

describe('T09: HTML', () => {
  it('com ESP e RSK: a informação das versões citadas e o formulário em branco, com os rótulos que repetem a opção', async () => {
    const s = await pagina();
    expect(s).toContain(`<span class="font-mono">${ID}</span> — Pedidos duplicados (fictício)`);
    expect(s).toContain('<h1>Novo pacote de decisão</h1>');
    expect(s).toContain(
      `Este será o DEC-${ID}-v2. Ele vai citar a ESP-${ID}-v3 e o RSK-${ID}-v2, as versões mais novas desta demanda. Os dados da demanda são copiados para o pacote e não mudam depois.`,
    );
    for (const rotulo of [
      'Resumo executivo (obrigatório)',
      'Descrição da opção A (obrigatório)',
      'Vantagens da opção A',
      'Desvantagens da opção A',
      'Quando escolher a opção A',
      'Descrição da opção B (obrigatório)',
      'Vantagens da opção B',
      'Desvantagens da opção B',
      'Quando escolher a opção B',
      'Recomendação',
    ])
      expect(s).toContain(`class="font-medium">${rotulo}</label>`);
    for (const legenda of ['Opção A', 'Opção B', 'Nível de aprovação requerido (obrigatório)']) expect(s).toContain(`>${legenda}</legend>`);
    expect(s).toContain('Qual opção você recomenda e por quê.');
    expect(s).toContain('Use CTO e administradora quando a decisão gerar compromisso que exija a assinatura da administradora.');
    const nome = idDoCampo('nivelAprovacaoRequerido');
    for (const [v, rotulo] of [
      ['cto', 'Só o CTO'],
      ['cto_e_administradora', 'CTO e administradora'],
    ]) {
      expect(s).toContain(`id="${nome}-${v}"`);
      expect(s).toContain(`for="${nome}-${v}">${rotulo}</label>`);
    }
    expect(s).not.toMatch(/checked=""/);
    expect(s).not.toMatch(/<textarea[^>]*>[^<]+<\/textarea>/);
    expect(s).toMatch(new RegExp(`<button type="submit"[^>]*>Gravar DEC-${ID}-v2</button>`));
    expect(s).toContain(`href="/demandas/${ID}">Cancelar</a>`);
    expect(s).toMatch(/<form\b[^>]*\snovalidate=""/i);
  });

  it('sem RSK: "Ainda não dá para criar o pacote. Falta: parecer de risco." com o botão, e nenhum formulário', async () => {
    mObter.mockResolvedValue(demanda({ pareceresRisco: [], pacotesDecisao: [] }));
    const s = await pagina();
    expect(s).toContain('Ainda não dá para criar o pacote. Falta: parecer de risco.');
    expect(s).toContain(`href="/demandas/${ID}/pareceres-risco/novo"`);
    expect(s).not.toContain(`href="/demandas/${ID}/especificacoes/nova"`);
    expect(s).not.toContain('<form');
    expect(s).not.toContain('Este será o DEC');
  });

  it('sem nenhuma das duas: as duas no texto e os dois botões', async () => {
    mObter.mockResolvedValue(demanda({ especificacoes: [], pareceresRisco: [], pacotesDecisao: [] }));
    const s = await pagina();
    expect(s).toContain('Ainda não dá para criar o pacote. Falta: especificação técnica e parecer de risco.');
    expect(s).toContain('>Nova versão da ESP</a>');
    expect(s).toContain('>Novo parecer de risco</a>');
    expect(s).not.toContain('<form');
  });

  it('C-18: título da demanda como texto', async () => {
    mObter.mockResolvedValue(demanda({ titulo: '<script>window.__x=1</script>' }));
    const s = await pagina();
    expect(s).not.toContain('<script>');
    expect(s).toContain('&lt;script&gt;window.__x=1&lt;/script&gt;');
  });
});
