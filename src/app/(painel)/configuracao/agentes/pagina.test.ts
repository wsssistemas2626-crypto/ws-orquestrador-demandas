// T45: T12 Agentes e teto de gasto (03, T12; RF-17 a RF-19; 04, C-12, C-26 e C-31; RNF-05; P1-f), o HTML do servidor da
// página: a ordem de autorização e leitura (C-04), o título, os alertas (teto e worker), o gasto do mês, o campo do
// teto, a tabela com os quatro interruptores, a última mudança, o último expurgo e os controles desabilitados para a
// administradora (os valores continuam legíveis). Envio, diálogo, foco e axe ficam no e2e (e2e/agentes-teto.spec.ts). A
// sessão e as leituras são dublês; a matriz de acesso é a real. Datas fixas.
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AtorPessoa } from '../../../../modules/acesso/ator';
import { exigirPessoaNaPagina } from '../../../../modules/acesso/exigir-pessoa';
import { autorizar } from '../../../../modules/acesso/matriz';
import { listarConfiguracaoAgentes, type ConfiguracaoAgente } from '../../../../modules/agentes/configuracao';
import { situacaoDoWorker, type SituacaoWorker } from '../../../../modules/agentes/situacao-worker';
import { situacaoDoTeto, type SituacaoTeto } from '../../../../modules/agentes/teto';
import { ultimoExpurgo } from '../../../../modules/retencao/expurgar';
import PaginaAgentes, { metadata } from './page';

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  usePathname: () => '/configuracao/agentes',
  useRouter: () => ({ replace: () => undefined, refresh: () => undefined, push: () => undefined }),
}));
vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('../../../../lib/deps', () => ({ obterDeps: async () => ({ db: { dubleDoBanco: true }, relogio: { dubleDoRelogio: true } }) }));
vi.mock('../../../../modules/acesso/exigir-pessoa', () => ({ exigirPessoaNaPagina: vi.fn(), exigirPessoa: vi.fn() }));
vi.mock('../../../../modules/acesso/matriz', async (original) => {
  const real = await original<typeof import('../../../../modules/acesso/matriz')>();
  return { ...real, autorizar: vi.fn(real.autorizar) };
});
vi.mock('../../../../modules/agentes/teto', async (original) => {
  const real = await original<typeof import('../../../../modules/agentes/teto')>();
  return { ...real, situacaoDoTeto: vi.fn() };
});
vi.mock('../../../../modules/agentes/configuracao', async (original) => {
  const real = await original<typeof import('../../../../modules/agentes/configuracao')>();
  return { ...real, listarConfiguracaoAgentes: vi.fn() };
});
vi.mock('../../../../modules/agentes/situacao-worker', async (original) => {
  const real = await original<typeof import('../../../../modules/agentes/situacao-worker')>();
  return { ...real, situacaoDoWorker: vi.fn() };
});
vi.mock('../../../../modules/retencao/expurgar', async (original) => {
  const real = await original<typeof import('../../../../modules/retencao/expurgar')>();
  return { ...real, ultimoExpurgo: vi.fn() };
});
vi.mock('./acoes', () => ({
  salvarTetoNoPainel: async () => ({ ok: false, erro: 'erro_interno', mensagem: '' }),
  alternarAgenteNoPainel: async () => ({ ok: false, erro: 'erro_interno', mensagem: '' }),
}));

const mExigir = vi.mocked(exigirPessoaNaPagina);
const mAutorizar = vi.mocked(autorizar);
const mTeto = vi.mocked(situacaoDoTeto);
const mAgentes = vi.mocked(listarConfiguracaoAgentes);
const mWorker = vi.mocked(situacaoDoWorker);
const mExpurgo = vi.mocked(ultimoExpurgo);

const CTO: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-cto', nome: 'Pessoa Ficticia CTO', papel: 'cto' };
const ADM: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-adm', nome: 'Pessoa Ficticia Administradora', papel: 'administradora' };
const DB = { dubleDoBanco: true };
const RELOGIO = { dubleDoRelogio: true };
const MUDOU = new Date('2026-10-22T13:00:00Z');

const tetoZero: SituacaoTeto = {
  tetoMensal: 0,
  moeda: 'USD',
  gastoDoMes: 0,
  percentual: 0,
  suspenso: true,
  mesReferencia: '2026-10',
  viraEm: new Date('2026-11-01T03:00:00Z'),
};

const nuncaAlterados = (): ConfiguracaoAgente[] =>
  (['orquestrador', 'insumo_tecnico', 'risco', 'consolidacao'] as const).map((agente) => ({ agente, ligado: false, modelo: null, atualizadoEm: null, atualizadoPor: null }));

const workerOk: SituacaoWorker = { ultimoBatimento: new Date('2026-10-22T13:00:00Z'), atrasado: false, instanciasRecentes: 1, duasInstancias: false };

const pagina = async (): Promise<string> => renderToStaticMarkup(await PaginaAgentes());
const contar = (html: string, trecho: string): number => html.split(trecho).length - 1;
// O HTML escapa o apóstrofo e as aspas; os textos da 03 não têm nenhum dos dois.
const posicao = (html: string, trecho: string): number => {
  const i = html.indexOf(trecho);
  expect(i, trecho).toBeGreaterThanOrEqual(0);
  return i;
};

beforeEach(() => {
  vi.clearAllMocks();
  mExigir.mockResolvedValue(CTO);
  mTeto.mockResolvedValue(tetoZero);
  mAgentes.mockResolvedValue(nuncaAlterados());
  mWorker.mockResolvedValue(workerOk);
  mExpurgo.mockResolvedValue(null);
});

describe('T12: acesso e leitura', () => {
  it('pessoa (C-04) → ler_configuracao_agentes e ler_teto → as quatro leituras, com o banco e o relógio do app', async () => {
    await pagina();
    expect(mExigir).toHaveBeenCalledWith('/configuracao/agentes');
    expect(mAutorizar.mock.calls.slice(0, 2).map((c) => c[1])).toEqual(['ler_configuracao_agentes', 'ler_teto']);
    const primeiraLeitura = Math.min(
      mTeto.mock.invocationCallOrder[0]!,
      mAgentes.mock.invocationCallOrder[0]!,
      mWorker.mock.invocationCallOrder[0]!,
      mExpurgo.mock.invocationCallOrder[0]!,
    );
    expect(mAutorizar.mock.invocationCallOrder[1]!).toBeLessThan(primeiraLeitura);
    expect(mExigir.mock.invocationCallOrder[0]!).toBeLessThan(mAutorizar.mock.invocationCallOrder[0]!);
    expect(mTeto).toHaveBeenCalledWith(DB, RELOGIO);
    expect(mAgentes).toHaveBeenCalledWith(DB);
    expect(mWorker).toHaveBeenCalledWith(DB, RELOGIO);
    expect(mExpurgo).toHaveBeenCalledWith(DB);
  });

  it('título da aba: "Agentes e teto de gasto" (a moldura completa com o nome do sistema)', () => {
    expect(metadata.title).toBe('Agentes e teto de gasto');
  });
});

describe('T12: CTO, sistema novo', () => {
  it('h1, introdução, alerta de teto não definido, gasto do mês, campo do teto e a tabela com os quatro desligados e "Nunca alterado"', async () => {
    const html = await pagina();
    expect(contar(html, '<h1')).toBe(1);
    expect(html).toContain('>Agentes e teto de gasto</h1>');
    expect(html).toContain(
      'Agente ligado prepara rascunhos por IA, dentro do teto mensal. Desligado, você preenche os mesmos campos à mão. Nenhum agente decide nem envia nada para fora.',
    );
    expect(html).toContain('Teto não definido: com US$ 0,00, nenhum agente chama o provedor, mesmo ligado. Defina o teto para usar os agentes.');
    expect(html).not.toContain('Agentes suspensos:');
    expect(html).toContain('>Gasto do mês</h2>');
    expect(html).toContain('Outubro de 2026: US$ 0,00 de US$ 0,00. Nenhuma chamada este mês.');
    expect(html).toMatch(/<label for="campo-tetoMensal"[^>]*>Teto mensal de gasto \(US\$\)<\/label>/);
    expect(html).toContain('Valor na moeda da cobrança do provedor de IA. O gasto conta do dia 1 ao último dia do mês.');
    expect(html).toMatch(/<input[^>]*id="campo-tetoMensal"[^>]*>/);
    const campo = /<input[^>]*id="campo-tetoMensal"[^>]*>/.exec(html)![0];
    expect(campo).toContain('inputMode="decimal"');
    expect(campo).toContain('value="0,00"');
    expect(campo).toContain('aria-describedby="campo-tetoMensal-dica"');
    expect(campo).not.toContain('disabled');
    expect(html).toMatch(/<button type="submit"[^>]*>Salvar teto<\/button>/);
    expect(html).toContain('>Agentes</h2>');
    expect(html).toMatch(/<caption[^>]*>Agentes de IA<\/caption>/);
    for (const c of ['Agente', 'Situação', 'Última mudança']) expect(html).toContain(`<th scope="col" class="px-3 py-2 font-semibold">${c}</th>`);
    for (const rotulo of ['Agente orquestrador (entrada)', 'Agente de insumo técnico (ESP)', 'Agente de risco (RSK)', 'Agente de consolidação (DEC)']) {
      expect(html).toMatch(new RegExp(`<button type="button" id="[^"]+" role="switch" aria-checked="false" aria-label="${rotulo.replace(/[()]/g, '\\$&')}"`));
    }
    expect(contar(html, 'role="switch"')).toBe(4);
    expect(contar(html, '>Desligado</span>')).toBe(4);
    expect(contar(html, 'Nunca alterado')).toBe(4);
    expect(html).not.toContain('Só o CTO altera esta configuração.');
    expect(html).toContain('O expurgo ainda não rodou.');
    // Uma região de aviso na página, vazia até uma ação (03, 2.3).
    expect(contar(html, 'role="status"')).toBe(1);
    expect(html).toMatch(/<div role="status" class="sr-only"><\/div>/);
    // Nada do diálogo aberto ao carregar.
    expect(html).not.toMatch(/<dialog[^>]*open/);
  });

  it('a ordem da 03: título, alertas, "Gasto do mês", "Agentes" e, no fim, o último expurgo', async () => {
    const html = await pagina();
    const ordem = ['<h1', 'Teto não definido:', '>Gasto do mês</h2>', 'Salvar teto', '>Agentes</h2>', 'Agentes de IA</caption>', 'O expurgo ainda não rodou.'].map((t) =>
      posicao(html, t),
    );
    expect([...ordem].sort((a, b) => a - b)).toEqual(ordem);
  });
});

describe('T12: com dados', () => {
  it('teto definido e gasto: a linha com a porcentagem, sem alerta de teto; agente ligado com "<nome>, <data>"; o último expurgo com a data', async () => {
    mTeto.mockResolvedValue({ ...tetoZero, tetoMensal: 10, gastoDoMes: 3.2, percentual: 32, suspenso: false });
    mAgentes.mockResolvedValue(
      nuncaAlterados().map((c) => (c.agente === 'risco' ? { ...c, ligado: true, modelo: 'modelo-ficticio', atualizadoEm: MUDOU, atualizadoPor: { nome: 'Pessoa Ficticia CTO' } } : c)),
    );
    mExpurgo.mockResolvedValue({ em: new Date('2026-10-22T06:00:00Z'), quantidade: 2 });
    const html = await pagina();
    expect(html).toContain('Outubro de 2026: US$ 3,20 de US$ 10,00 (32 %)');
    expect(html).not.toContain('Teto não definido:');
    expect(html).not.toContain('Agentes suspensos:');
    expect(html).toContain('value="10,00"');
    expect(html).toMatch(/role="switch" aria-checked="true" aria-label="Agente de risco \(RSK\)"/);
    expect(contar(html, '>Ligado</span>')).toBe(1);
    expect(contar(html, '>Desligado</span>')).toBe(3);
    expect(html).toContain('Pessoa Ficticia CTO, <time dateTime="2026-10-22T13:00:00.000Z">22/10/2026 às 10:00</time>');
    expect(contar(html, 'Nunca alterado')).toBe(3);
    // O modelo é configuração da API: a 03 não o mostra.
    expect(html).not.toContain('modelo-ficticio');
    expect(html).toContain('Último expurgo do texto recebido: <time dateTime="2026-10-22T06:00:00.000Z">22/10/2026 às 03:00</time>.');
    expect(html).not.toContain('O expurgo ainda não rodou.');
  });

  it('teto atingido: só o alerta de suspensão, com o dia em que o mês vira', async () => {
    mTeto.mockResolvedValue({ ...tetoZero, tetoMensal: 10, gastoDoMes: 10, percentual: 100, suspenso: true });
    const html = await pagina();
    expect(html).toContain(
      'Agentes suspensos: o gasto do mês (US$ 10,00) atingiu o teto (US$ 10,00). Nada é chamado até o teto subir ou o mês virar em 01/11/2026.',
    );
    expect(html).not.toContain('Teto não definido:');
    expect(html).toContain('Outubro de 2026: US$ 10,00 de US$ 10,00 (100 %)');
  });

  it('RNF-05: worker sem sinal e duas instâncias, cada um no seu alerta', async () => {
    mWorker.mockResolvedValue({ ultimoBatimento: null, atrasado: true, instanciasRecentes: 0, duasInstancias: false });
    expect(await pagina()).toContain('O worker não dá sinal há mais de 5 minutos.');
    mWorker.mockResolvedValue({ ...workerOk, instanciasRecentes: 2, duasInstancias: true });
    const html = await pagina();
    expect(html).toContain('Há duas instâncias do worker rodando. Deixe só uma: com duas, o teto pode ser ultrapassado.');
    expect(html).not.toContain('O worker não dá sinal');
    mWorker.mockResolvedValue(workerOk);
    const ok = await pagina();
    expect(ok).not.toContain('O worker não dá sinal');
    expect(ok).not.toContain('Há duas instâncias');
  });
});

describe('T12: administradora (C-12, C-26)', () => {
  it('lê a página: a nota "Só o CTO altera esta configuração.", o campo, o botão e os quatro interruptores desabilitados, e os valores legíveis', async () => {
    mExigir.mockResolvedValue(ADM);
    mTeto.mockResolvedValue({ ...tetoZero, tetoMensal: 10, suspenso: false });
    const html = await pagina();
    expect(mAutorizar.mock.calls.slice(0, 2).map((c) => c[1])).toEqual(['ler_configuracao_agentes', 'ler_teto']);
    expect(html).toContain('Só o CTO altera esta configuração.');
    const campo = /<input[^>]*id="campo-tetoMensal"[^>]*>/.exec(html)![0];
    expect(campo).toContain('disabled=""');
    expect(campo).toContain('value="10,00"');
    expect(html).toMatch(/<button type="submit" disabled=""[^>]*>Salvar teto<\/button>/);
    expect(contar(html, 'role="switch"')).toBe(4);
    expect(html.match(/<button[^>]*role="switch"[^>]*>/g)!.every((b) => b.includes('disabled=""'))).toBe(true);
    expect(contar(html, '>Desligado</span>')).toBe(4);
    expect(html).toContain('Outubro de 2026: US$ 0,00 de US$ 10,00. Nenhuma chamada este mês.');
  });

  it('a nota vem antes dos controles', async () => {
    mExigir.mockResolvedValue(ADM);
    const html = await pagina();
    expect(posicao(html, 'Só o CTO altera esta configuração.')).toBeLessThan(posicao(html, 'Salvar teto'));
  });
});
