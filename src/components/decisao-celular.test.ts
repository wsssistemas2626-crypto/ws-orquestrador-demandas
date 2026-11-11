// 0.2.0 (T13 do DEC-DEM-20261110-0015-v1; 03, 2.6, 6.3 e 6.5): os componentes que a T11 usa no celular, conferidos no
// HTML do servidor. O diálogo de confirmação empilha os botões na largura toda abaixo de 768 px; o cartão de opção
// contém a própria camada do rádio (D-T12-02: o rodapé fixo passa por cima das opções ao rolar) e, indisponível, não
// anuncia clique e fica com a aparência de indisponível (parecer 1 de 06-T03-tech-lead). Foco, Esc e clique ficam no e2e.
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DialogoConfirmacao } from './DialogoConfirmacao';
import { GrupoOpcoes } from './GrupoOpcoes';

const nada = () => undefined;
const classes = (tag: string): string[] => (/\sclass="([^"]*)"/.exec(tag)?.[1] ?? '').split(' ');

describe('DialogoConfirmacao no celular (03, 6.5)', () => {
  const s = renderToStaticMarkup(
    h(DialogoConfirmacao, {
      aberto: false,
      titulo: 'Confirmar a decisão?',
      rotuloConfirmar: 'Confirmar e registrar',
      rotuloCancelar: 'Voltar',
      onConfirmar: nada,
      onCancelar: nada,
      children: 'Você vai registrar: Aprovar a opção A. (fictício)',
    }),
  );

  it('abaixo de 768 px, a largura toda menos 16 px de cada lado', () => {
    expect(classes(/^<dialog[^>]*>/.exec(s)![0])).toEqual(expect.arrayContaining(['max-md:w-[calc(100%_-_2rem)]', 'max-md:max-w-none', 'max-w-lg']));
  });

  it('abaixo de 768 px, "Confirmar e registrar" e "Voltar" empilhados na largura toda, nessa ordem; a partir de 768 px, lado a lado', () => {
    const grupo = /<div class="([^"]*)"><button[^>]*>Confirmar e registrar<\/button>/.exec(s);
    expect(grupo?.[1]?.split(' ')).toEqual(expect.arrayContaining(['flex', 'max-md:flex-col', 'md:flex-wrap']));
    const botoes = [...s.matchAll(/<button[^>]*>([^<]*)<\/button>/g)];
    expect(botoes.map((b) => b[1])).toEqual(['Confirmar e registrar', 'Voltar']);
    for (const b of botoes) expect(classes(b[0]), b[1]).toContain('max-md:w-full');
  });

  it('os textos e o título ligado continuam os de hoje', () => {
    expect(s).toContain('>Confirmar a decisão?</h2>');
    expect(s).toContain('Você vai registrar: Aprovar a opção A. (fictício)');
  });
});

describe('GrupoOpcoes, variante cartão, na T11 (03, 2.6)', () => {
  const opcoes = [
    { valor: 'A', rotulo: 'Opção A — Construir tudo (fictício)' },
    { valor: 'B', rotulo: 'Opção B — Indisponível (fictício)', desabilitada: true, dica: 'Indisponível (fictício).' },
  ];
  const cartao = renderToStaticMarkup(h(GrupoOpcoes, { nome: 'opcao', legenda: 'Opção escolhida (obrigatório)', opcoes, variante: 'cartao' as const }));
  const lista = renderToStaticMarkup(h(GrupoOpcoes, { nome: 'opcao', legenda: 'Opção escolhida (obrigatório)', opcoes }));
  // O <div> de cada opção (o cartão) e o <label> dela, na ordem.
  const cartoes = (s: string) => [...s.matchAll(/<div class="([^"]*)"><div class="flex min-h-11/g)].map((m) => m[1]!.split(' '));
  const rotulos = (s: string) => [...s.matchAll(/<label for="[^"]*"(?: class="([^"]*)")?>/g)].map((m) => (m[1] ?? '').split(' '));

  it('D-T12-02: o cartão isola a camada do rádio (z-10), para o rodapé fixo da T11 passar por cima das opções', () => {
    for (const c of cartoes(cartao)) expect(c).toEqual(expect.arrayContaining(['relative', 'isolate']));
    expect(cartoes(cartao)).toHaveLength(2);
    expect(lista).not.toContain('isolate');
  });

  it('opção indisponível no cartão: sem cursor de clique, com borda tracejada e fundo de indisponível; a disponível não muda', () => {
    const [disponivel, indisponivel] = cartoes(cartao);
    const [rotuloDisponivel, rotuloIndisponivel] = rotulos(cartao);
    expect(rotuloDisponivel).toContain('cursor-pointer');
    expect(rotuloIndisponivel).not.toContain('cursor-pointer');
    expect(rotuloIndisponivel).toEqual(expect.arrayContaining(['cursor-not-allowed', 'text-tinta-media']));
    expect(indisponivel).toEqual(expect.arrayContaining(['border-dashed', 'bg-selo-cinza-fundo']));
    expect(indisponivel).not.toContain('bg-branco');
    expect(disponivel).toEqual(expect.arrayContaining(['bg-branco', 'border-tinta-suave']));
    expect(disponivel).not.toContain('border-dashed');
    // Continua no grupo, encontrável e explicada: aria-disabled e o motivo ligado (03, 2.6).
    expect(cartao).toMatch(/<input [^>]*id="opcao-B"[^>]*aria-disabled="true"[^>]*aria-describedby="opcao-B-dica"/);
  });
});
