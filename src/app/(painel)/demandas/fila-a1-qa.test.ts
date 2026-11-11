// 06-T09-testes do DEC-DEM-20261110-0015-v1 (qa-automacao): bordas da T03 no arranjo A1 que o fila-a1.test.ts não
// cobre, no HTML do servidor. Número de contador com milhar, os dois filtros ocultos juntos, o "Mais filtros" apontando
// para o bloco que existe, a idade na virada do dia em São Paulo nas duas formas (tabela e cartão) e o título com
// caractere de direção isolado por <bdi> nas duas formas. Dados fictícios; o "agora" é fixo (sem relógio real).
import { createElement as h, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { contadoresDaFila } from '../../../components/dados-da-fila';
import type { DemandaResumo } from '../../../modules/demandas/consultas';
import type { ContagemPorStatus, EtapasNaFila } from '../../../modules/demandas/resumo-da-fila';
import { filtroDemandasSchema } from '../../../modules/demandas/schemas';
import { ContadoresDaFila } from './ContadoresDaFila';
import { hrefDaFila, ID_RESULTADO, ResultadoDaFila } from './fila';
import { FiltrosFila } from './FiltrosFila';

vi.mock('next/navigation', () => ({
  usePathname: () => '/demandas',
  useRouter: () => ({ replace: () => undefined, refresh: () => undefined, push: () => undefined }),
}));

const html = (el: ReactElement) => renderToStaticMarkup(el);
const filtro = (f: Record<string, unknown> = {}) => filtroDemandasSchema.parse(f);
// "Agora" da página: 10/11/2026 às 12:00 em São Paulo.
const AGORA = new Date('2026-11-10T15:00:00Z');
const NADA: EtapasNaFila = { esp: false, rsk: false, dec: false };

const demanda = (n: number, extra: Partial<DemandaResumo> = {}): DemandaResumo => ({
  id: `DEM-20261110-${String(n).padStart(4, '0')}`,
  titulo: `Painel de estoque (fictício ${n})`,
  tipo: 'melhoria',
  status: 'nova',
  urgencia: 'baixa',
  linhaServicoProvavel: 'sob_medida',
  rascunhoAgente: false,
  criadaEm: new Date('2026-11-10T13:00:00Z'),
  ...extra,
});

const tabelaDe = (s: string): string => /<table[\s\S]*?<\/table>/.exec(s)?.[0] ?? '';
const listaDe = (s: string): string => /<ul aria-labelledby="resultado-da-fila"[\s\S]*?<\/ul>/.exec(s)?.[0] ?? '';

describe('ContadoresDaFila: bordas', () => {
  it('total com milhar sai no formato pt-BR, com o texto oculto no plural; zero também tem número', () => {
    const contagem: ContagemPorStatus = {
      porStatus: { nova: 1234, em_analise: 0, aguardando_informacao: 0, pronta_para_decisao: 0, aprovada: 0, em_construcao: 0, entregue: 0, devolvida: 0, encerrada: 0 },
      todas: 1234,
    };
    const s = html(h(ContadoresDaFila, { contadores: contadoresDaFila(contagem, filtro(), hrefDaFila), filtro: {}, idFoco: ID_RESULTADO }));
    expect(s).toMatch(/Nova<\/span><\/span> <span class="[^"]*font-mono[^"]*">1\.234<\/span><span class="sr-only"> demandas<\/span>/);
    expect(s).not.toContain('>1234<');
    expect(s.match(/<span class="[^"]*font-mono[^"]*">0<\/span><span class="sr-only"> demandas<\/span>/g)).toHaveLength(8);
  });

  it('CV-07: com tipo e linha de serviço, os dois vão ocultos, nessa ordem, depois do grupo, e nada mais', () => {
    const f = filtro({ status: 'aprovada', tipo: 'estudo', linhaServicoProvavel: 'ia_controle_humano', offset: '20', limit: '50' });
    const s = html(
      h(ContadoresDaFila, {
        contadores: contadoresDaFila(null, f, hrefDaFila),
        filtro: { tipo: f.tipo, linhaServicoProvavel: f.linhaServicoProvavel },
        idFoco: ID_RESULTADO,
      }),
    );
    const ocultos = [...s.matchAll(/<input type="hidden" name="([^"]+)" value="([^"]*)"\/>/g)].map((m) => [m[1], m[2]]);
    expect(ocultos).toEqual([
      ['tipo', 'estudo'],
      ['linhaServicoProvavel', 'ia_controle_humano'],
    ]);
    expect(s.indexOf('<input type="hidden"')).toBeGreaterThan(s.lastIndexOf('</button>'));
    // offset e limit da URL não viram campo: ativar um contador volta à página 1.
    expect(s).not.toContain('name="offset"');
    expect(s).not.toContain('name="limit"');
    expect(s).not.toContain('value="20"');
  });
});

describe('FiltrosFila: "Mais filtros" aponta para o bloco que existe (D-02)', () => {
  it('aria-controls do botão é o id do bloco, que existe uma vez e guarda os campos', () => {
    const s = html(h(FiltrosFila, { filtro: { tipo: 'bug', linhaServicoProvavel: 'sob_medida' }, idFoco: ID_RESULTADO }));
    const controla = /<button type="button" aria-expanded="false" aria-controls="([^"]+)"/.exec(s)?.[1];
    expect(controla).toBe('mais-filtros');
    expect(s.match(new RegExp(`id="${controla}"`, 'g'))).toHaveLength(1);
    expect(s).toMatch(/>Mais filtros \(2 ativos\)<svg/);
  });
});

describe('ResultadoDaFila: idade na virada do dia, nas duas formas (CA-06.2)', () => {
  // 10/11 às 10:00 em São Paulo (hoje) e 09/11 às 23:30 em São Paulo (02:30 de 10/11 em UTC: ontem, e não hoje).
  const hoje = demanda(2, { criadaEm: new Date('2026-11-10T13:00:00Z') });
  const ontemTarde = demanda(1, { criadaEm: new Date('2026-11-10T02:30:00Z') });
  const itens = [hoje, ontemTarde];
  const s = html(h(ResultadoDaFila, { filtro: filtro(), itens, total: 2, etapas: new Map(itens.map((d) => [d.id, NADA] as const)), agora: AGORA }));

  it('a tabela e a lista mostram "Hoje" e "1 dia", com o <time> da criação e a data de São Paulo', () => {
    for (const forma of [tabelaDe(s), listaDe(s)]) {
      expect(forma).toContain('<time dateTime="2026-11-10T13:00:00.000Z">Hoje</time>');
      expect(forma).toContain('<time dateTime="2026-11-10T02:30:00.000Z">1 dia</time>');
      expect(forma).toContain('<span class="sr-only">criada em </span>10/11/2026');
      expect(forma).toContain('<span class="sr-only">criada em </span>09/11/2026');
    }
  });

  it('um só id de foco, mesmo com tabela e lista no HTML', () => {
    expect(tabelaDe(s)).not.toBe('');
    expect(listaDe(s)).not.toBe('');
    expect(s.match(/id="resultado-da-fila"/g)).toHaveLength(1);
  });
});

describe('CV-18: título com caractere de direção', () => {
  it('o título com U+202E fica dentro de <bdi> na tabela e no cartão, e não vaza para fora dele', () => {
    const rlo = String.fromCodePoint(0x202e);
    const titulo = `Relatório ${rlo}fdp.exe (fictício)`;
    const d = demanda(7, { titulo });
    const s = html(h(ResultadoDaFila, { filtro: filtro(), itens: [d], total: 1, etapas: new Map([[d.id, NADA]]), agora: AGORA }));
    expect(tabelaDe(s)).toContain(`<bdi>${titulo}</bdi>`);
    expect(listaDe(s)).toContain(`<bdi>${titulo}</bdi>`);
    expect(s.split(rlo)).toHaveLength(3);
  });
});
