// T41: Lista de textos (03, 2.4), o componente dos campos JSONB em lista (ESP, e depois RSK na T42). A regra sem tela
// (itens, ids, o que vai ao servidor) e o HTML do servidor do componente. Foco ao adicionar e remover fica no e2e
// (e2e/especificacao.spec.ts).
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LIMITE_ITENS } from '../modules/demandas/schemas';
import { idDoCampo } from './formulario';
import {
  idDoAdicionar,
  idDoAlvoDaLista,
  idDoItem,
  itensDe,
  LIMITE_ITENS_LISTA,
  TEXTOS_LISTA,
  valoresDaLista,
  type ItemDaLista,
} from './lista-textos';
import { ListaTextos } from './ListaTextos';

const itens = (...valores: string[]): ItemDaLista[] => valores.map((valor, i) => ({ chave: `k-${i}`, valor }));

function html(props: Partial<Parameters<typeof ListaTextos>[0]> = {}): string {
  return renderToStaticMarkup(
    h(ListaTextos, {
      campo: 'escopoInclui',
      legenda: 'Escopo inclui',
      nome: 'Escopo inclui',
      itens: itens('Primeiro item fictício', ''),
      mudar: () => undefined,
      erros: {},
      ...props,
    }),
  );
}

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// A etiqueta de abertura do elemento que tem o atributo, em qualquer ordem de atributos.
function etiqueta(s: string, elemento: string, atributo: string): string {
  const m = new RegExp(`<${elemento}\\b[^>]*\\s${escapar(atributo)}[^>]*>`).exec(s);
  if (!m) throw new Error(`sem <${elemento}> com ${atributo}`);
  return m[0];
}

describe('lista-textos: regra sem tela', () => {
  it('o limite é o do servidor (RNF-04: 50 itens)', () => {
    expect(LIMITE_ITENS_LISTA).toBe(LIMITE_ITENS);
    expect(TEXTOS_LISTA.limite).toBe('Limite de 50 itens atingido.');
  });

  it('itensDe: um item vazio quando não há valor (03, T07: "com um item vazio em cada lista"); senão um por valor', () => {
    expect(itensDe('escopoInclui', null)).toEqual([{ chave: 'escopoInclui-0', valor: '' }]);
    expect(itensDe('escopoInclui', [])).toEqual([{ chave: 'escopoInclui-0', valor: '' }]);
    expect(itensDe('escopoExclui', ['a', 'b'])).toEqual([
      { chave: 'escopoExclui-0', valor: 'a' },
      { chave: 'escopoExclui-1', valor: 'b' },
    ]);
  });

  it('valoresDaLista: descarta item vazio (03, 2.4), apara e guarda o índice de cada item enviado na tela', () => {
    expect(valoresDaLista(itens('', '  um  ', '   ', 'dois'))).toEqual({ valores: ['um', 'dois'], indices: [1, 3] });
    expect(valoresDaLista(itens(''))).toEqual({ valores: [], indices: [] });
  });

  it('ids: item, "Adicionar item" e o alvo do Resumo de erros (o primeiro item; sem item, o botão)', () => {
    expect(idDoItem('escopoInclui', 2)).toBe(idDoCampo('escopoInclui.2'));
    expect(idDoAdicionar('escopoInclui')).toBe(`${idDoCampo('escopoInclui')}-adicionar`);
    expect(idDoAlvoDaLista('definicaoDePronto', 3)).toBe(idDoItem('definicaoDePronto', 0));
    expect(idDoAlvoDaLista('definicaoDePronto', 0)).toBe(idDoAdicionar('definicaoDePronto'));
  });

  it('textos da 03, 2.4', () => {
    expect(TEXTOS_LISTA.item(1)).toBe('Item 1');
    expect(TEXTOS_LISTA.removerNome(2, 'Escopo inclui')).toBe('Remover item 2 de Escopo inclui');
    expect(TEXTOS_LISTA.remover).toBe('Remover');
    expect(TEXTOS_LISTA.adicionar).toBe('Adicionar item');
  });
});

describe('ListaTextos: HTML', () => {
  it('fieldset com a legend do campo; cada item é um Campo de texto "Item N" com "Remover" de nome acessível completo', () => {
    const s = html();
    expect(s).toMatch(/^<fieldset\b[^>]*>\s*<legend\b[^>]*>Escopo inclui<\/legend>/);
    expect(s).toContain(`<label for="${idDoItem('escopoInclui', 0)}" class="font-medium">Item 1</label>`);
    expect(s).toContain(`<label for="${idDoItem('escopoInclui', 1)}" class="font-medium">Item 2</label>`);
    expect(etiqueta(s, 'input', `id="${idDoItem('escopoInclui', 0)}"`)).toContain('value="Primeiro item fictício"');
    for (const n of [1, 2]) {
      const b = etiqueta(s, 'button', `aria-label="Remover item ${n} de Escopo inclui"`);
      expect(b).toContain('type="button"');
      expect(s).toContain(`${b}Remover</button>`);
    }
    const adicionar = etiqueta(s, 'button', `id="${idDoAdicionar('escopoInclui')}"`);
    expect(s).toContain(`${adicionar}Adicionar item</button>`);
    expect(adicionar).not.toContain('disabled=""');
    expect(s).not.toContain('Limite de 50 itens atingido.');
    expect(s).not.toMatch(/draggable/);
  });

  it('dica: abaixo da legend e ligada ao fieldset por aria-describedby', () => {
    const s = html({ campo: 'definicaoDePronto', legenda: 'Definição de pronto (obrigatório)', nome: 'Definição de pronto', dica: 'Ao menos um item.' });
    const id = idDoCampo('definicaoDePronto');
    expect(etiqueta(s, 'fieldset', `aria-describedby="${id}-dica"`)).toBeTruthy();
    expect(s).toContain(`<p id="${id}-dica" class="text-sm text-texto-suave">Ao menos um item.</p>`);
    expect(s).toContain('aria-label="Remover item 1 de Definição de pronto"');
    expect(s).toContain('>Definição de pronto (obrigatório)</legend>');
  });

  it('com 50 itens: "Adicionar item" desabilitado e a dica "Limite de 50 itens atingido." ligada ao botão', () => {
    const s = html({ itens: Array.from({ length: 50 }, (_, i) => ({ chave: `k-${i}`, valor: `item ${i}` })) });
    const id = idDoAdicionar('escopoInclui');
    const b = etiqueta(s, 'button', `id="${id}"`);
    expect(b).toContain('disabled=""');
    expect(b).toContain(`aria-describedby="${id}-dica"`);
    expect(s).toContain(`<p id="${id}-dica" class="text-sm text-texto-suave">Limite de 50 itens atingido.</p>`);
    expect(s).toContain('>Item 50</label>');
  });

  it('erro de item: abaixo do item, com aria-invalid; erro da lista: abaixo da legend, ligado ao fieldset e ao primeiro item', () => {
    const s = html({ erros: { 'escopoInclui.1': 'Este campo aceita até 10.000 caracteres.' } });
    const item = idDoItem('escopoInclui', 1);
    const input = etiqueta(s, 'input', `id="${item}"`);
    expect(input).toContain('aria-invalid="true"');
    expect(input).toContain(`aria-describedby="${item}-erro"`);
    expect(s).toContain(`<p id="${item}-erro" class="text-sm font-medium text-perigo">Este campo aceita até 10.000 caracteres.</p>`);
    expect(etiqueta(s, 'input', `id="${idDoItem('escopoInclui', 0)}"`)).not.toContain('aria-invalid');

    const l = html({ campo: 'criteriosAceitePreliminares', legenda: 'Critérios', nome: 'Critérios', erros: { criteriosAceitePreliminares: 'Informe ao menos um critério de aceite preliminar.' } });
    const id = idDoCampo('criteriosAceitePreliminares');
    expect(etiqueta(l, 'fieldset', `aria-describedby="${id}-erro"`)).toBeTruthy();
    expect(l).toContain(`<p id="${id}-erro" class="text-sm font-medium text-perigo">Informe ao menos um critério de aceite preliminar.</p>`);
    const primeiro = etiqueta(l, 'input', `id="${idDoItem('criteriosAceitePreliminares', 0)}"`);
    expect(primeiro).toContain('aria-invalid="true"');
    expect(primeiro).toContain(`aria-describedby="${id}-erro"`);
    expect(etiqueta(l, 'input', `id="${idDoItem('criteriosAceitePreliminares', 1)}"`)).not.toContain('aria-invalid');
  });

  it('o valor do item é texto: o React escapa (C-18)', () => {
    const s = html({ itens: itens('<img src=x onerror="alert(1)">') });
    expect(s).not.toContain('<img');
    expect(s).toContain('value="&lt;img src=x onerror=&quot;alert(1)&quot;&gt;"');
  });
});
