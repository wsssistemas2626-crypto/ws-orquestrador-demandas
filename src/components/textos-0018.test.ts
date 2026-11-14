// src/components/textos-0018.test.ts — CA-05.1 (0.4.1, DEC-DEM-20261111-0018-v1, T11): cada texto alterado é igual ao
// da 03, seção 8, por inteiro. Sem id de pessoa: os ids são de DEC fictício. Teste unitário.
import { describe, expect, it } from 'vitest';
import type { EventoVisivel } from '../modules/historico/consultas';
import { MENSAGENS_DECISAO } from '../modules/pacotes-decisao/decidir';
import { MENSAGENS_PEDIDO } from '../modules/pedido-construcao/conferir';
import { TEXTOS_DECISAO } from './dados-da-decisao';
import { erroDoPedido, MENSAGENS_PEDIDO_DO_SERVIDOR, orientacaoDoPedido } from './dados-do-pedido';
import { SELO_SUBSTITUIDO, textoDoEvento } from './rotulos';

const V1 = 'DEC-DEM-20991231-0001-v1';
const V2 = 'DEC-DEM-20991231-0001-v2';

const LINHA_6_CTO =
  'Depois de corrigir, crie um pacote novo e aprove-o. Aprovado, ele substitui este e passa a ser o único que gera o Pedido de Construção.';
const LINHA_6_DUPLA =
  'Depois de corrigir, crie um pacote novo com aprovação do CTO e da administradora e registre as duas aprovações. Com as duas, ele substitui este e passa a ser o único que gera o Pedido de Construção.';

describe('textos alterados da 03, seção 8', () => {
  it('substituído: aviso, link e selo', () => {
    expect(TEXTOS_DECISAO.substituido(V2)).toBe(
      `Este pacote foi substituído por ${V2}, aprovado depois dele, e não gera mais o Pedido de Construção. Se um pedido deste pacote já foi gerado, não o use. O pedido que vale é o de ${V2}.`,
    );
    expect(TEXTOS_DECISAO.abrirSubstituto(V2)).toBe(`Abrir o pacote ${V2}`);
    expect(SELO_SUBSTITUIDO.texto).toBe('Substituído');
  });

  it('409 do substituído e 409 do S-01 (este sem id nem nome)', () => {
    expect(MENSAGENS_PEDIDO.substituido(V2)).toBe(
      `o pacote foi substituído por ${V2}, aprovado depois dele. Só o pacote aprovado mais novo gera o Pedido de Construção.`,
    );
    expect(MENSAGENS_DECISAO.nivelMenorQueOVigente).toBe(
      'o pacote aprovado em vigor nesta demanda exigiu a aprovação do CTO e da administradora, e um pacote só do CTO não pode substituí-lo. Devolva ou arquive este pacote, ou crie um pacote novo com aprovação do CTO e da administradora.',
    );
    expect(MENSAGENS_DECISAO.nivelMenorQueOVigente).not.toMatch(/DEC-DEM-/);
  });

  it('linha 6 da orientação, pelo nível do pacote', () => {
    expect(orientacaoDoPedido(['especificacao.conteudo: e-mail']).at(-1)).toBe(LINHA_6_CTO);
    expect(orientacaoDoPedido(['especificacao.conteudo: e-mail'], 'cto').at(-1)).toBe(LINHA_6_CTO);
    expect(orientacaoDoPedido(['especificacao.conteudo: e-mail'], 'cto_e_administradora').at(-1)).toBe(LINHA_6_DUPLA);
  });

  it('erroDoPedido repassa o nível à orientação do 422', () => {
    const r = { ok: false as const, erro: 'nao_processavel', mensagem: MENSAGENS_PEDIDO_DO_SERVIDOR.naoPassou, erros: ['especificacao.conteudo: e-mail'] };
    expect(erroDoPedido(r).orientacao.at(-1)).toBe(LINHA_6_CTO);
    expect(erroDoPedido(r, 'cto_e_administradora').orientacao.at(-1)).toBe(LINHA_6_DUPLA);
  });

  it('frase do histórico, com e sem o substituto no formato de DEC', () => {
    const ev = (depois: unknown): EventoVisivel => ({
      id: 1,
      ocorridoEm: new Date('2099-12-31T12:00:00Z'),
      ator: { tipo: 'pessoa', nome: 'Pessoa Ficticia', papel: 'cto' },
      acao: 'pacote_decisao_substituido',
      entidade: 'pacote_decisao',
      entidadeId: V1,
      antes: null,
      depois,
    } as EventoVisivel);
    expect(textoDoEvento(ev({ substituido: V1, substituidoPor: V2 }))).toBe(`${V1} foi substituído por ${V2}, aprovado depois dele`);
    expect(textoDoEvento(ev({ substituido: V1, substituidoPor: 'x' }))).toBe(`${V1} foi substituído por um pacote aprovado depois dele`);
  });
});
