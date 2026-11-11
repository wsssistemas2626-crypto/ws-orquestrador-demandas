// 06-T11-testes (qa-automacao), T11 do DEC-DEM-20261110-0015-v1: a LinhaDoTempo (03, 5.6) por conta própria, fora do
// Historico.tsx. A regra "Antes: … Depois: …" com cada parte vazia omitida (as quatro combinações), a lista vazia, a ordem
// recebida mantida, o marcador e o separador só visuais e o texto de terceiro escapado (C-18). Datas fixas, sem relógio.
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { antesEDepois, LinhaDoTempo, TEXTOS_LINHA_DO_TEMPO, type ItemDaLinhaDoTempo } from './LinhaDoTempo';

const QUANDO = new Date('2026-11-10T12:00:00Z');
const item = (chave: string, extra: Partial<ItemDaLinhaDoTempo> = {}): ItemDaLinhaDoTempo => ({
  chave,
  texto: 'Mudou o status',
  antes: '',
  depois: '',
  ator: 'Pessoa Ficticia CTO (CTO)',
  ocorridoEm: QUANDO,
  ...extra,
});
const html = (itens: readonly ItemDaLinhaDoTempo[]) => renderToStaticMarkup(h(LinhaDoTempo, { itens }));
const itensDaLista = (p: string) => [...p.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)].map((m) => m[1]!);

describe('antesEDepois (03, 5.6): só as partes com valor', () => {
  it.each([
    ['Nova', 'Em análise', 'Antes: Nova. Depois: Em análise.'],
    ['', 'Alta', 'Depois: Alta.'],
    ['Baixa', '', 'Antes: Baixa.'],
    ['', '', ''],
  ])('antes "%s" e depois "%s" → "%s"', (antes, depois, esperado) => {
    expect(antesEDepois(antes, depois)).toBe(esperado);
  });

  it('os textos são os da 03, seção 9', () => {
    expect(TEXTOS_LINHA_DO_TEMPO.ordem).toBe('Do mais novo para o mais antigo.');
    expect(TEXTOS_LINHA_DO_TEMPO.antes('X')).toBe('Antes: X.');
    expect(TEXTOS_LINHA_DO_TEMPO.depois('Y')).toBe('Depois: Y.');
  });
});

describe('LinhaDoTempo (03, 5.6)', () => {
  it('lista vazia: o texto da ordem e um <ol> sem item', () => {
    const p = html([]);
    expect(p).toMatch(/<p[^>]*>Do mais novo para o mais antigo\.<\/p><ol\b[^>]*><\/ol>/);
    expect(itensDaLista(p)).toEqual([]);
  });

  it('a ordem é a recebida (quem chama já manda do mais novo para o mais antigo); nenhuma reordenação por data', () => {
    const datas = ['2026-11-10T12:00:00.000Z', '2026-11-12T12:00:00.000Z', '2026-11-08T12:00:00.000Z'];
    const p = html(datas.map((d, i) => item(`e${i}`, { ocorridoEm: new Date(d), texto: `Evento ${i}` })));
    expect([...p.matchAll(/<time dateTime="([^"]+)">/g)].map((m) => m[1])).toEqual(datas);
    expect(itensDaLista(p).map((i) => /<p[^>]*>(Evento \d)<\/p>/.exec(i)?.[1])).toEqual(['Evento 0', 'Evento 1', 'Evento 2']);
  });

  it('cada item: marcador e separador escondidos do leitor de tela; o que aconteceu, o antes e depois e, por último, quem e quando', () => {
    const [li] = itensDaLista(html([item('e1', { antes: 'Nova', depois: 'Em análise' })]));
    expect(li).toMatch(/^<span aria-hidden="true" class="[^"]*\brounded-full\b[^"]*"><\/span>/);
    const paragrafos = [...li!.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)].map((m) => m[1]!);
    expect(paragrafos).toHaveLength(3);
    expect(paragrafos[0]).toBe('Mudou o status');
    expect(paragrafos[1]).toBe('Antes: Nova. Depois: Em análise.');
    expect(paragrafos[2]).toBe(
      '<span>Pessoa Ficticia CTO (CTO)</span><span aria-hidden="true"> · </span><time dateTime="2026-11-10T12:00:00.000Z">10/11/2026 às 09:00</time>',
    );
  });

  it('sem antes nem depois, o item não tem a linha do meio', () => {
    const [li] = itensDaLista(html([item('e1')]));
    expect(li!.match(/<p\b/g)).toHaveLength(2);
    expect(li).not.toContain('Antes:');
    expect(li).not.toContain('Depois:');
  });

  it('C-18: texto, valores e ator de terceiro saem como texto, nunca como marcação', () => {
    const p = html([
      item('e1', {
        texto: '<img src=x onerror="window.__xss=1"> (fictício)',
        antes: '<b>antes</b>',
        depois: '<script>window.__xss=2</script>',
        ator: '<a href="/demandas">Pessoa Ficticia</a>',
      }),
    ]);
    expect(p).not.toContain('<img');
    expect(p).not.toContain('<b>');
    expect(p).not.toContain('<script');
    expect(p).not.toContain('<a ');
    expect(p).toContain('&lt;img src=x onerror=&quot;window.__xss=1&quot;&gt; (fictício)');
    expect(p).toContain('Antes: &lt;b&gt;antes&lt;/b&gt;. Depois: &lt;script&gt;window.__xss=2&lt;/script&gt;.');
  });
});
