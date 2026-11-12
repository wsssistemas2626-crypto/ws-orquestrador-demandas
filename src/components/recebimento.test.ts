// T19 do DEC-DEM-20261111-0016-v1: a linha "Recebido pelo /construir em …" da T11 (RF-15; CA-15.1, CA-15.2; D-11) e o
// texto novo da seção "Pedido de Construção" (RF-16; CA-16.3), sem tela. A página e o e2e conferem o lugar da linha, o
// ícone e o <time> (pagina.test.ts e e2e/recebido-construir.spec.ts).
import { expect, it } from 'vitest';
import { linhaDoRecebimento, TEXTOS_DECISAO } from './dados-da-decisao';
import { TEXTOS_PEDIDO } from './dados-do-pedido';

it('CA-15.2: sem pedido_recebido, a linha não existe', () => expect(linhaDoRecebimento(null)).toBeNull());

it('CA-15.1: "Recebido pelo /construir em <data e hora>." com o ISO', () => {
  const em = new Date('2026-11-11T17:32:00Z');
  const l = linhaDoRecebimento(em)!;
  expect(l.iso).toBe(em.toISOString());
  expect(l.texto).toMatch(/^Recebido pelo \/construir em 11\/11\/2026 às 14:32\.$/);
  expect(TEXTOS_DECISAO.recebido('11/11/2026 às 14:32')).toBe('Recebido pelo /construir em 11/11/2026 às 14:32.');
});

it('CA-15.1: a data é a do fuso do sistema, também na virada do dia em UTC', () => {
  const l = linhaDoRecebimento(new Date('2026-11-12T01:05:00Z'))!;
  expect(l).toEqual({ texto: 'Recebido pelo /construir em 11/11/2026 às 22:05.', iso: '2026-11-12T01:05:00.000Z' });
});

it('CA-16.3: o texto da seção não diz mais que o envio é só manual', () => {
  expect(TEXTOS_PEDIDO.texto).toBe(
    'Gere o pedido. Com a busca automática do /construir ligada, ele pega o pedido gerado na busca seguinte (a cada 5 minutos), e o recebimento aparece no topo desta página. Com a busca desligada, baixe ou copie o JSON e grave-o na pasta pedidos/ da estruturaAutonoma.',
  );
  expect(TEXTOS_PEDIDO.texto).not.toContain('manual');
});
