// T39 (06-T39-testes, qa-automacao): as três páginas do servidor da T39 (nova/page.tsx, [id]/editar/page.tsx e a
// [id]/page.tsx provisória), o generateMetadata comum (demanda-da-pagina.ts) e o 404 do painel, que o formularios.test.ts
// do engenheiro não chama (ele gera só o HTML dos dois formulários). A sessão, o banco e as leituras são dublês; a matriz
// de acesso é a real. Também o limite de 50 anexos no HTML, que nenhum teste conferia.
//   - acesso (C-04): a pessoa antes de autorizar, e nada lido sem as duas;
//   - C-17: id fora do formato não toca o banco e não volta no caminho de login;
//   - 404 só para "não encontrado"; outra falha sobe para a tela de erro, sem virar 404;
//   - "Preencher à mão": a leitura com a pessoa, a entrada repetida e a codificada no caminho de volta;
//   - o título da aba não diz se o id existe para quem não tem sessão;
//   - o alerta de chegada só com os valores fixos de `?aviso=`.
// Nada aqui usa relógio: as datas são fixas, dentro do dado de teste.
import { createElement as h, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { valoresDaDemanda, type AnexoNoFormulario } from '../../../components/dados-da-demanda';
import { ROTULO_STATUS, SELO_RASCUNHO } from '../../../components/rotulos';
import { ErroDominio, MENSAGEM_NAO_ENCONTRADO } from '../../../lib/erros';
import type { AtorPessoa } from '../../../modules/acesso/ator';
import { exigirPessoa, exigirPessoaNaPagina } from '../../../modules/acesso/exigir-pessoa';
import { autorizar } from '../../../modules/acesso/matriz';
import { estadoDoAgente } from '../../../modules/agentes/gatilhos';
import { obterDemanda, type DemandaVista } from '../../../modules/demandas/consultas';
import { obterEntradaPendente } from '../../../modules/demandas/entradas-pendentes';
import NaoEncontradaNoPainel, { metadata as metadados404 } from '../not-found';
import { FormularioEditarDemanda } from './[id]/editar/FormularioEditarDemanda';
import PaginaEditarDemanda, { generateMetadata as metadadosDaEdicao } from './[id]/editar/page';
import PaginaDemanda, { generateMetadata as metadadosDoDetalhe } from './[id]/page';
import PaginaNovaDemanda from './nova/page';

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  usePathname: () => '/demandas/nova',
  useRouter: () => ({ replace: () => undefined, refresh: () => undefined, push: () => undefined }),
}));
vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('../../../lib/deps', () => ({
  obterDeps: async () => ({ db: { dubleDoBanco: true }, relogio: { dubleDoRelogio: true }, config: { retencaoDias: 90 } }),
}));
vi.mock('../../../modules/acesso/exigir-pessoa', () => ({ exigirPessoaNaPagina: vi.fn(), exigirPessoa: vi.fn() }));
vi.mock('../../../modules/acesso/matriz', async (original) => {
  const real = await original<typeof import('../../../modules/acesso/matriz')>();
  return { ...real, autorizar: vi.fn(real.autorizar) };
});
vi.mock('../../../modules/agentes/gatilhos', async (original) => {
  const real = await original<typeof import('../../../modules/agentes/gatilhos')>();
  return { ...real, estadoDoAgente: vi.fn() };
});
vi.mock('../../../modules/demandas/entradas-pendentes', async (original) => {
  const real = await original<typeof import('../../../modules/demandas/entradas-pendentes')>();
  return { ...real, obterEntradaPendente: vi.fn() };
});
vi.mock('../../../modules/demandas/consultas', async (original) => {
  const real = await original<typeof import('../../../modules/demandas/consultas')>();
  return { ...real, obterDemanda: vi.fn() };
});
// T40: o detalhe completo também lê o histórico e o texto recebido (o resto dele está em [id]/detalhe.test.ts).
vi.mock('../../../modules/historico/consultas', async (original) => {
  const real = await original<typeof import('../../../modules/historico/consultas')>();
  return { ...real, listarHistorico: vi.fn(async () => []) };
});
vi.mock('../../../modules/demandas/texto-recebido', async (original) => {
  const real = await original<typeof import('../../../modules/demandas/texto-recebido')>();
  return { ...real, obterTextoRecebido: vi.fn(async () => ({ situacao: 'sem_texto' })) };
});
// As Server Actions não rodam aqui (estão no formularios-acoes-qa.test.ts, com o banco real).
vi.mock('./nova/acoes', () => ({ registrarEntradaNoPainel: async () => ({ ok: false, erro: 'erro_interno', mensagem: '' }) }));
vi.mock('./[id]/editar/acoes', () => ({ alterarDadosNoPainel: async () => ({ ok: false, erro: 'erro_interno', mensagem: '' }) }));
vi.mock('./[id]/acoes', () => ({ mudarStatusNoPainel: async () => ({ ok: false, erro: 'erro_interno', mensagem: '' }) }));

const mExigirNaPagina = vi.mocked(exigirPessoaNaPagina);
const mExigir = vi.mocked(exigirPessoa);
const mAutorizar = vi.mocked(autorizar);
const mEstado = vi.mocked(estadoDoAgente);
const mPendente = vi.mocked(obterEntradaPendente);
const mObter = vi.mocked(obterDemanda);

const DB = { dubleDoBanco: true };
const RELOGIO = { dubleDoRelogio: true };
const CTO: AtorPessoa = { tipo: 'pessoa', usuarioId: 'usuario-ficticio-1', nome: 'Pessoa Ficticia', papel: 'cto' };
const ADMINISTRADORA: AtorPessoa = { tipo: 'pessoa', usuarioId: 'usuario-ficticio-2', nome: 'Pessoa Ficticia Dois', papel: 'administradora' };
const FORA_DA_MATRIZ = { ...CTO, papel: 'visitante' } as unknown as AtorPessoa;
const UUID = '0f1e2d3c-4b5a-4968-8776-655443322110';
const ID = 'DEM-20261022-0042';
const IDS_FORA_DO_FORMATO = ["DEM-1' or '1'='1", 'qualquer-coisa', 'DEM-20261022-00421', 'dem-20261022-0042', '..%2F..%2Fapi%2Fsaude'];

const naoEncontrado = () => new ErroDominio('nao_encontrado', MENSAGEM_NAO_ENCONTRADO);

const demanda = (extra: Partial<DemandaVista> = {}): DemandaVista =>
  ({
    id: ID,
    titulo: 'Pedidos duplicados no ERP (fictício)',
    tipo: 'melhoria',
    status: 'nova',
    solicitanteNome: 'Pessoa Ficticia',
    solicitantePapel: 'produto',
    linhaServicoProvavel: null,
    urgencia: 'media',
    justificativaUrgencia: null,
    contexto: 'Contexto fictício',
    descricaoProblema: null,
    impactoPercebido: null,
    anexos: [],
    duvidasEntrada: [],
    rascunhoAgente: false,
    responsavel: { tipo: 'pessoa', nome: 'Pessoa Ficticia' },
    criadaEm: new Date('2026-10-22T15:00:00Z'),
    atualizadaEm: new Date('2026-10-22T15:00:00Z'),
    especificacoes: [],
    pareceresRisco: [],
    pacotesDecisao: [],
    agentesEmAndamento: [],
    ...extra,
  }) as DemandaVista;

const html = (el: ReactElement) => renderToStaticMarkup(el);
const nova = async (p: Record<string, string | string[] | undefined> = {}) => html(await PaginaNovaDemanda({ searchParams: Promise.resolve(p) }));
const edicao = async (id: string) => html(await PaginaEditarDemanda({ params: Promise.resolve({ id }) }));
const detalhe = async (id: string, p: Record<string, string | string[] | undefined> = {}) =>
  html(await PaginaDemanda({ params: Promise.resolve({ id }), searchParams: Promise.resolve(p) }));

const antes = (a: { mock: { invocationCallOrder: number[] } }, b: { mock: { invocationCallOrder: number[] } }) =>
  (a.mock.invocationCallOrder[0] ?? Infinity) < (b.mock.invocationCallOrder[0] ?? -Infinity);

beforeEach(() => {
  mExigirNaPagina.mockReset().mockResolvedValue(CTO);
  mExigir.mockReset().mockResolvedValue(CTO);
  mAutorizar.mockClear();
  mEstado.mockReset().mockResolvedValue('desligado');
  mPendente.mockReset().mockRejectedValue(naoEncontrado());
  mObter.mockReset().mockResolvedValue(demanda());
});

describe('T04 Nova demanda (nova/page.tsx): acesso e modo', () => {
  it('pede a pessoa com /demandas/nova e só depois autoriza "registrar_entrada"; o modo vem de estadoDoAgente(db, "orquestrador", relogio)', async () => {
    const p = await nova();
    expect(mExigirNaPagina).toHaveBeenCalledExactlyOnceWith('/demandas/nova');
    expect(mAutorizar).toHaveBeenCalledExactlyOnceWith(CTO, 'registrar_entrada');
    expect(antes(mExigirNaPagina, mAutorizar)).toBe(true);
    expect(mEstado).toHaveBeenCalledExactlyOnceWith(DB, 'orquestrador', RELOGIO);
    expect(mPendente).not.toHaveBeenCalled();
    expect(p).toContain('<h1>Nova demanda</h1>');
    expect(p).toContain('Agente orquestrador desligado. Preencha os campos abaixo.');
  });

  it.each([
    ['suspenso', 'Agentes suspensos pelo teto de gasto. Preencha os campos abaixo.', 'Como criar a demanda?'],
    ['disponivel', 'Como criar a demanda?', 'Agente orquestrador desligado'],
  ] as const)('estado %s do agente chega à tela', async (estado, aparece, naoAparece) => {
    mEstado.mockResolvedValue(estado);
    const p = await nova();
    expect(p).toContain(aparece);
    expect(p).not.toContain(naoAparece);
  });

  it('a administradora também abre a tela (a matriz real libera qualquer pessoa)', async () => {
    mExigirNaPagina.mockResolvedValue(ADMINISTRADORA);
    expect(await nova()).toContain('<h1>Nova demanda</h1>');
  });

  it('papel fora da matriz: recusa antes de ler o estado do agente ou a entrada pendente', async () => {
    mExigirNaPagina.mockResolvedValue(FORA_DA_MATRIZ);
    await expect(nova({ entrada: UUID })).rejects.toMatchObject({ name: 'ErroDominio', codigo: 'sem_permissao' });
    expect(mEstado).not.toHaveBeenCalled();
    expect(mPendente).not.toHaveBeenCalled();
  });

  it('sem sessão: o redirect de exigirPessoaNaPagina sobe antes de autorizar e de ler', async () => {
    mExigirNaPagina.mockRejectedValue(new Error('NEXT_REDIRECT'));
    await expect(nova({ entrada: UUID })).rejects.toThrow('NEXT_REDIRECT');
    expect(mAutorizar).not.toHaveBeenCalled();
    expect(mEstado).not.toHaveBeenCalled();
    expect(mPendente).not.toHaveBeenCalled();
  });
});

describe('T04 "Preencher à mão" (nova/page.tsx com ?entrada=)', () => {
  const pendente = {
    texto: 'SENTINELA-TEXTO-DA-PENDENTE <img src=x onerror=alert(1)>',
    origem: { canal: 'email' as const, referencia: 'SENTINELA-REF-"><b>' },
    solicitanteNome: 'Pessoa Ficticia',
    solicitantePapel: null,
  };

  it('o caminho de volta leva a entrada; a pendente é lida com a pessoa da sessão; o texto e a origem saem escapados e só para leitura; sem o grupo de modo, mesmo com o agente ligado', async () => {
    mEstado.mockResolvedValue('disponivel');
    mPendente.mockResolvedValue(pendente);
    const p = await nova({ entrada: UUID });
    expect(mExigirNaPagina).toHaveBeenCalledExactlyOnceWith(`/demandas/nova?entrada=${UUID}`);
    expect(mPendente).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ db: DB }), CTO, UUID);
    expect(antes(mAutorizar, mPendente)).toBe(true);
    expect(p).not.toContain('<img src=x');
    expect(p).toMatch(/<textarea[^>]*id="campo-texto"[^>]*readonly=""[^>]*>SENTINELA-TEXTO-DA-PENDENTE &lt;img src=x onerror=alert\(1\)&gt;<\/textarea>/i);
    expect(p).toMatch(/<input[^>]*id="campo-origem-referencia"[^>]*readonly=""[^>]*value="SENTINELA-REF-&quot;&gt;&lt;b&gt;"/i);
    expect(p).not.toContain('Como criar a demanda?');
    expect(p).toMatch(/<option value="" selected="">Não informado<\/option>/);
  });

  it('entrada que não existe mais (convertida ou expurgada): 404', async () => {
    await expect(nova({ entrada: UUID })).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('?entrada repetida (chega como lista): 404 sem ler a pendente, e o caminho de volta não leva a entrada', async () => {
    await expect(nova({ entrada: [UUID, UUID] })).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mExigirNaPagina).toHaveBeenCalledExactlyOnceWith('/demandas/nova');
    expect(mPendente).not.toHaveBeenCalled();
  });

  it('a entrada com caracteres de URL vai codificada no caminho de volta (nada de parâmetro a mais no /entrar)', async () => {
    await expect(nova({ entrada: 'x&callbackURL=https://mal.test/#a' })).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mExigirNaPagina).toHaveBeenCalledExactlyOnceWith('/demandas/nova?entrada=x%26callbackURL%3Dhttps%3A%2F%2Fmal.test%2F%23a');
  });

  it('falha de leitura que não é "não encontrado" sobe como erro (tela de erro), sem virar 404 e sem a mensagem na tela', async () => {
    mPendente.mockRejectedValue(new Error('SENTINELA-ERRO conexão recusada'));
    await expect(nova({ entrada: UUID })).rejects.toThrow('SENTINELA-ERRO conexão recusada');
    mPendente.mockRejectedValue(new ErroDominio('sem_permissao', 'Sua conta não pode fazer esta ação. Se precisar, fale com o CTO.'));
    await expect(nova({ entrada: UUID })).rejects.toMatchObject({ codigo: 'sem_permissao' });
  });
});

describe('T06 Editar dados ([id]/editar/page.tsx)', () => {
  it('pede a pessoa com /demandas/<id>/editar, autoriza "alterar_demanda" e lê a demanda; id, h1, aviso e valores escapados', async () => {
    mObter.mockResolvedValue(demanda({ titulo: 'Pedidos <script>alert(1)</script> duplicados' }));
    const p = await edicao(ID);
    expect(mExigirNaPagina).toHaveBeenCalledExactlyOnceWith(`/demandas/${ID}/editar`);
    expect(mAutorizar).toHaveBeenCalledExactlyOnceWith(CTO, 'alterar_demanda');
    expect(antes(mAutorizar, mObter)).toBe(true);
    expect(mObter).toHaveBeenCalledWith(DB, ID);
    expect(p).toMatch(new RegExp(`<p class="font-mono[^"]*">${ID}</p><h1>Editar dados da demanda</h1>`));
    expect(p).toContain('As alterações ficam no histórico, com o valor de antes e o de depois.');
    expect(p).not.toContain('<script>alert(1)</script>');
    expect(p).toMatch(/<input[^>]*id="campo-titulo"[^>]*value="Pedidos &lt;script&gt;alert\(1\)&lt;\/script&gt; duplicados"/);
    expect(p).toMatch(/<option value="produto" selected="">Produto<\/option>/);
  });

  it.each(IDS_FORA_DO_FORMATO)('C-17: id fora do formato (%s) → 404 sem tocar o banco, e o caminho de volta é /demandas', async (id) => {
    await expect(edicao(id)).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mExigirNaPagina).toHaveBeenCalledExactlyOnceWith('/demandas');
    expect(mObter).not.toHaveBeenCalled();
  });

  it('id no formato que não existe: 404', async () => {
    mObter.mockRejectedValue(naoEncontrado());
    await expect(edicao('DEM-20261022-9999')).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('falha de leitura que não é "não encontrado" sobe como erro, sem virar 404', async () => {
    mObter.mockRejectedValue(new Error('SENTINELA-ERRO do banco'));
    await expect(edicao(ID)).rejects.toThrow('SENTINELA-ERRO do banco');
  });

  it('papel fora da matriz: recusa sem ler a demanda; a administradora edita', async () => {
    mExigirNaPagina.mockResolvedValue(FORA_DA_MATRIZ);
    await expect(edicao(ID)).rejects.toMatchObject({ codigo: 'sem_permissao' });
    expect(mObter).not.toHaveBeenCalled();
    mExigirNaPagina.mockResolvedValue(ADMINISTRADORA);
    expect(await edicao(ID)).toContain('<h1>Editar dados da demanda</h1>');
  });
});

describe('título da aba (generateMetadata de [id] e de [id]/editar)', () => {
  const casos = [
    ['edição', (id: string) => metadadosDaEdicao({ params: Promise.resolve({ id }) }), 'Editar dados da demanda'],
    ['detalhe', (id: string) => metadadosDoDetalhe({ params: Promise.resolve({ id }), searchParams: Promise.resolve({}) }), 'Detalhe da demanda'],
  ] as const;

  it.each(casos)('%s com sessão: o título da tela; o id que não existe ou fora do formato dá 404 (título da 2.8)', async (_n, meta, titulo) => {
    expect(await meta(ID)).toEqual({ title: titulo });
    mObter.mockRejectedValue(naoEncontrado());
    await expect(meta('DEM-20261022-9999')).rejects.toThrow('NEXT_NOT_FOUND');
    mObter.mockClear();
    await expect(meta("DEM-1' or '1'='1")).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mObter).not.toHaveBeenCalled();
  });

  it.each(casos)('%s sem sessão (ou sem 2FA): o título da tela, sem ler a demanda — o título não diz se o id existe', async (_n, meta, titulo) => {
    for (const codigo of ['nao_autenticado', 'sem_2fa', 'sem_permissao']) {
      mExigir.mockRejectedValue(new ErroDominio(codigo as 'nao_autenticado', 'x'));
      expect(await meta('DEM-20261022-9999')).toEqual({ title: titulo });
      expect(await meta(ID)).toEqual({ title: titulo });
    }
    expect(mObter).not.toHaveBeenCalled();
  });

  it.each(casos)('%s: falha da sessão que não é de acesso sobe como erro', async (_n, meta) => {
    mExigir.mockRejectedValue(new Error('SENTINELA-ERRO do Better Auth'));
    await expect(meta(ID)).rejects.toThrow('SENTINELA-ERRO do Better Auth');
  });
});

// T40: a página deixou de ser provisória; o cabeçalho e o alerta de chegada continuam o destino da T04 e da T06.
describe('T05 ([id]/page.tsx): o destino da T04 e da T06', () => {
  it('pede a pessoa com /demandas/<id>, autoriza "ler_demanda"; título escapado em h1, selo de status e "Editar dados"', async () => {
    mObter.mockResolvedValue(demanda({ titulo: 'Título <b>fictício</b>', status: 'em_analise', rascunhoAgente: true }));
    const p = await detalhe(ID);
    expect(mExigirNaPagina).toHaveBeenCalledExactlyOnceWith(`/demandas/${ID}`);
    // ler_demanda é a primeira; a T40 autoriza depois o histórico (ler_historico) para as outras leituras. A lista é a
    // exata (06-T40-testes): sem ESP, nenhuma outra autorização, como a "única" que a T39 conferia.
    expect(mAutorizar).toHaveBeenNthCalledWith(1, CTO, 'ler_demanda');
    expect(mAutorizar.mock.calls).toEqual([
      [CTO, 'ler_demanda'],
      [CTO, 'ler_historico'],
    ]);
    // T11 do DEC-DEM-20261110-0015-v1: o título isolado por <bdi> no h1 (CV-18).
    expect(p).toMatch(/<h1[^>]*><bdi>Título &lt;b&gt;fictício&lt;\/b&gt;<\/bdi><\/h1>/);
    expect(p).toContain(ROTULO_STATUS.em_analise);
    expect(p).toContain(SELO_RASCUNHO.texto);
    expect(p).toMatch(new RegExp(`<a [^>]*href="/demandas/${ID}/editar"[^>]*>Editar dados</a>`));
    expect(p).not.toContain('role="alert"');
  });

  it('?aviso=demanda-criada: "Demanda <id> criada com status <status>." com o status atual; ?aviso=alteracoes-salvas: o texto da 03', async () => {
    expect(await detalhe(ID, { aviso: 'demanda-criada' })).toMatch(new RegExp(`<div role="alert"[^>]*>Demanda ${ID} criada com status Nova\\.</div>`));
    expect(await detalhe(ID, { aviso: 'alteracoes-salvas' })).toMatch(/<div role="alert"[^>]*>Alterações salvas\. O histórico registra o antes e o depois\.<\/div>/);
  });

  it.each([['entrada-enviada'], ['2fa-ativado'], ['DEMANDA-CRIADA'], ['demanda-criada '], ['<script>alert(1)</script>'], [['demanda-criada', 'demanda-criada']]])(
    '?aviso=%j fora da lista: nenhum alerta, e nada do endereço na tela',
    async (aviso) => {
      const p = await detalhe(ID, { aviso });
      expect(p).not.toContain('role="alert"');
      expect(p).not.toContain('script');
    },
  );

  it.each(IDS_FORA_DO_FORMATO)('C-17: id fora do formato (%s) → 404 sem tocar o banco', async (id) => {
    await expect(detalhe(id, { aviso: 'demanda-criada' })).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mExigirNaPagina).toHaveBeenCalledExactlyOnceWith('/demandas');
    expect(mObter).not.toHaveBeenCalled();
  });
});

describe('anexos no limite (03, 2.4: "Limite de 50 anexos atingido.")', () => {
  const comAnexos = (n: number) =>
    html(
      h(FormularioEditarDemanda, {
        id: ID,
        inicial: {
          ...valoresDaDemanda(demanda()),
          anexos: Array.from({ length: n }, (_, i): AnexoNoFormulario => ({ chave: `a${i}`, tipo: 'arquivo', referencia: `ref-ficticia-${i}.pdf`, descricao: '' })),
        },
      }),
    );
  const botao = (p: string) => /<button[^>]*id="adicionar-anexo"[^>]*>/.exec(p)?.[0] ?? '';

  it('com 50 anexos: "Adicionar anexo" indisponível e ligado à mensagem do limite', () => {
    const p = comAnexos(50);
    expect(botao(p)).toMatch(/\sdisabled=""/);
    expect(botao(p)).toContain('aria-describedby="adicionar-anexo-dica"');
    expect(p).toMatch(/<p id="adicionar-anexo-dica"[^>]*>Limite de 50 anexos atingido\.<\/p>/);
    expect(p).toContain('Remover anexo 50');
    expect(p).not.toContain('Remover anexo 51');
  });

  it('com 49 anexos: o botão funciona e a mensagem não aparece', () => {
    const p = comAnexos(49);
    expect(botao(p)).not.toBe('');
    // A classe tem `disabled:opacity-70`; o que conta é o atributo.
    expect(botao(p)).not.toMatch(/\sdisabled=/);
    expect(botao(p)).not.toContain('aria-describedby');
    expect(p).not.toContain('Limite de 50 anexos atingido.');
  });
});

describe('404 dentro do painel ((painel)/not-found.tsx)', () => {
  it('os textos da 2.8, o link de volta para a fila, sem outro <main> (a moldura já tem um) e sem dado nenhum', () => {
    const p = html(h(NaoEncontradaNoPainel));
    expect(p).toContain('<h1>Página não encontrada</h1>');
    expect(p).toContain(`<p>${MENSAGEM_NAO_ENCONTRADO}</p>`);
    expect(p).toMatch(/<a [^>]*href="\/demandas"[^>]*>Voltar para a fila<\/a>/);
    expect(p).not.toContain('<main');
    expect(metadados404).toEqual({ title: 'Página não encontrada' });
  });
});
