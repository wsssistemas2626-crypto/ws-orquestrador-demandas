// src/components/dados-da-decisao-vigencia.test.ts — T12 do DEC-DEM-20261111-0018-v1 (RF-03, RF-05, RF-06; CA-03.6,
// CA-05.1, CA-06.1 a CA-06.5; SB-12; ADR-40; D-10 a D-13): os três avisos da vigência na T11, a dica do Arquivar pelo
// destino e a chegada depois de arquivar, como funções puras. Os textos são os da 03, seção 8 (e 4.2, 4.6, 4.7), por
// inteiro. Só id que casa RE_ID_DEC vira texto ou link; status só por ROTULO_STATUS com Object.hasOwn; nada da URL vira
// texto. Ids fictícios. Teste unitário, sem banco.
import { describe, expect, it } from 'vitest';
import { contemSentinela, SENTINELAS } from '../../test/sentinelas';
import type { NivelAprovacao } from '../db/schema/decisao';
import type { Status } from '../modules/demandas/schemas';
import type { PacoteDecisaoVista } from '../modules/pacotes-decisao/consultas';
import { AVISO_DECISAO, avisoDeVigencia, chegadaNaDecisao, dicaDoArquivar, TEXTOS_DECISAO, type ContextoDaVigencia } from './dados-da-decisao';

const DEM = 'DEM-20991231-0001';
const V1 = `DEC-${DEM}-v1`;
const V2 = `DEC-${DEM}-v2`;
const V3 = `DEC-${DEM}-v3`;
const DECIDIDA_EM = new Date('2099-12-31T12:00:00Z');

const AVISO_A = `Esta demanda já tem um pacote aprovado em vigor: ${V1}. Quando a aprovação deste pacote ficar completa, ele passa a valer no lugar de ${V1}, e um pedido já gerado de ${V1} deixa de valer.`;
const AVISO_B = `Há um pacote mais novo pendente nesta demanda: ${V2}. Quando a aprovação dele ficar completa, ele passa a valer no lugar deste, e um pedido já gerado deste pacote deixa de valer.`;
const AVISO_C = `A aprovação deste pacote será recusada: o pacote em vigor nesta demanda, ${V1}, exigiu a aprovação do CTO e da administradora, e um pacote só do CTO não pode substituí-lo. Você pode devolver ou arquivar este pacote. Para substituir ${V1}, crie um pacote novo com aprovação do CTO e da administradora.`;

type Aberto = Parameters<typeof avisoDeVigencia>[0];

// O v2 aberto: pendente, mais novo, atualizado.
const v2Pendente = (nivel: NivelAprovacao, extra: Partial<Aberto> = {}): Aberto => ({
  id: V2,
  demandaId: DEM,
  statusDecisao: 'pendente',
  desatualizado: false,
  nivelAprovacaoRequerido: nivel,
  ...extra,
});
// O v1 aberto: aprovado e vigente.
const v1Vigente = (nivel: NivelAprovacao, extra: Partial<Aberto> = {}): Aberto => ({
  id: V1,
  demandaId: DEM,
  statusDecisao: 'aprovada',
  desatualizado: false,
  nivelAprovacaoRequerido: nivel,
  ...extra,
});
const contexto = (extra: Partial<ContextoDaVigencia> = {}): ContextoDaVigencia => ({
  statusDaDemanda: 'pronta_para_decisao',
  maisNovoId: V2,
  vigente: { id: V1, nivel: 'cto' },
  pendenteMaisNovo: null,
  ...extra,
});

describe('textos exatos da 03, seção 8 (CA-05.1, CA-06.5)', () => {
  it('os três avisos', () => {
    expect(TEXTOS_DECISAO.avisoVigente(V1)).toBe(AVISO_A);
    expect(TEXTOS_DECISAO.avisoMaisNovoPendente(V2)).toBe(AVISO_B);
    expect(TEXTOS_DECISAO.avisoNivelMenor(V1)).toBe(AVISO_C);
  });
  it('a dica do Arquivar (4.6) e o sucesso depois de arquivar (4.7)', () => {
    expect(TEXTOS_DECISAO.dicaArquivarSemMudanca('Aprovada')).toBe('Arquivar: a demanda continua em Aprovada.');
    expect(TEXTOS_DECISAO.dicaArquivarAprovada(V1)).toBe(`Arquivar: a demanda vai para Aprovada, e ${V1} continua em vigor.`);
    expect(TEXTOS_DECISAO.dicaArquivarEmAnalise(V1)).toBe(`Arquivar: a demanda vai para Em análise, porque ${V1}, o pacote em vigor, está desatualizado.`);
    expect(TEXTOS_DECISAO.sucesso.arquivadaAprovada(V1)).toBe(`Pacote arquivado. A demanda está em Aprovada, e ${V1} continua em vigor.`);
    expect(TEXTOS_DECISAO.sucesso.arquivadaEm('Em análise')).toBe('Pacote arquivado. A demanda está em Em análise.');
  });
  it('sem mudança: a dica sem vigente, o sucesso com a demanda em Encerrada e o link "Criar pacote novo"', () => {
    expect(TEXTOS_DECISAO.dicaArquivar).toBe('Arquivar: a demanda vai para Encerrada.');
    expect(TEXTOS_DECISAO.sucesso.arquivada).toBe('Pacote arquivado. A demanda foi para Encerrada.');
    expect(TEXTOS_DECISAO.criarPacoteNovo).toBe('Criar pacote novo');
  });
});

describe('aviso (a): o DEC pendente mais novo com um aprovado em vigor (CA-06.1)', () => {
  it('v2 cto_e_administradora pendente, vigente v1 cto: o texto com o id do v1 e o link para ele', () => {
    expect(avisoDeVigencia(v2Pendente('cto_e_administradora'), contexto())).toEqual({
      texto: AVISO_A,
      link: { rotulo: `Abrir o pacote ${V1}`, href: `/pacotes-decisao/${V1}` },
    });
  });
  it('com uma das duas aprovações registrada (o pacote continua pendente), o mesmo aviso', () => {
    // A função não olha as aprovações: a vista continua com statusDecisao pendente até a segunda.
    expect(avisoDeVigencia(v2Pendente('cto_e_administradora'), contexto())?.texto).toBe(AVISO_A);
    expect(avisoDeVigencia(v2Pendente('cto'), contexto())?.texto).toBe(AVISO_A);
  });
  it('vigente de dupla aprovação e o pendente também de dupla: (a), não (c)', () => {
    expect(avisoDeVigencia(v2Pendente('cto_e_administradora'), contexto({ vigente: { id: V1, nivel: 'cto_e_administradora' } }))?.texto).toBe(AVISO_A);
  });
});

describe('aviso (b): o aprovado vigente com um DEC mais novo pendente (CA-06.2)', () => {
  it('o v1 aberto, vigente, com o v2 cto_e_administradora pendente e atualizado: o texto com o id do v2 e o link para ele', () => {
    const c = contexto({ pendenteMaisNovo: { id: V2, nivel: 'cto_e_administradora', desatualizado: false } });
    expect(avisoDeVigencia(v1Vigente('cto'), c)).toEqual({
      texto: AVISO_B,
      link: { rotulo: `Abrir o pacote ${V2}`, href: `/pacotes-decisao/${V2}` },
    });
  });
  it('o vigente desatualizado também mostra o (b): quem é desatualizado é ele, não o mais novo', () => {
    const c = contexto({ pendenteMaisNovo: { id: V2, nivel: 'cto', desatualizado: false } });
    expect(avisoDeVigencia(v1Vigente('cto', { desatualizado: true }), c)?.texto).toBe(AVISO_B);
  });
});

describe('aviso (c): DEC só do CTO com vigente de dupla aprovação (CA-06.3)', () => {
  const vigenteDupla = { id: V1, nivel: 'cto_e_administradora' as const };
  it('v2 cto pendente e mais novo, vigente v1 cto_e_administradora: o texto do (c) e o link "Criar pacote novo"; o (a) não', () => {
    const r = avisoDeVigencia(v2Pendente('cto'), contexto({ vigente: vigenteDupla }));
    expect(r).toEqual({ texto: AVISO_C, link: { rotulo: 'Criar pacote novo', href: `/demandas/${DEM}/pacotes-decisao/novo` } });
    expect(r?.texto).not.toBe(AVISO_A);
  });
  it('no v1 de dupla aprovação, com o v2 cto pendente: nenhum aviso (o v2 não pode substituí-lo)', () => {
    const c = contexto({ vigente: vigenteDupla, pendenteMaisNovo: { id: V2, nivel: 'cto', desatualizado: false } });
    expect(avisoDeVigencia(v1Vigente('cto_e_administradora'), c)).toBeNull();
  });
});

describe('CA-06.4 e os filtros da 4.2: nenhum aviso', () => {
  it('sem vigente', () => {
    expect(avisoDeVigencia(v2Pendente('cto'), contexto({ vigente: null }))).toBeNull();
    expect(avisoDeVigencia(v2Pendente('cto'), contexto({ vigente: null, pendenteMaisNovo: { id: V2, nivel: 'cto', desatualizado: false } }))).toBeNull();
  });
  it('DEC já decidido que não é o vigente (devolvido, arquivado, aprovado substituído)', () => {
    for (const statusDecisao of ['devolvida', 'arquivada', 'aprovada'] as const) {
      const aberto = v2Pendente('cto', { statusDecisao });
      expect(avisoDeVigencia(aberto, contexto({ vigente: { id: V3, nivel: 'cto' }, maisNovoId: V3 })), statusDecisao).toBeNull();
    }
  });
  it('DEC pendente desatualizado', () => {
    expect(avisoDeVigencia(v2Pendente('cto', { desatualizado: true }), contexto())).toBeNull();
    expect(avisoDeVigencia(v2Pendente('cto', { desatualizado: true }), contexto({ vigente: { id: V1, nivel: 'cto_e_administradora' } }))).toBeNull();
  });
  it('pendente que não é o mais novo', () => {
    expect(avisoDeVigencia(v2Pendente('cto'), contexto({ maisNovoId: V3 }))).toBeNull();
    expect(avisoDeVigencia(v2Pendente('cto'), contexto({ maisNovoId: null }))).toBeNull();
    expect(avisoDeVigencia(v2Pendente('cto'), contexto({ maisNovoId: V3, vigente: { id: V1, nivel: 'cto_e_administradora' } }))).toBeNull();
  });
  it('demanda em entregue e em encerrada, nos três avisos', () => {
    for (const statusDaDemanda of ['entregue', 'encerrada'] as const) {
      expect(avisoDeVigencia(v2Pendente('cto_e_administradora'), contexto({ statusDaDemanda })), `(a) ${statusDaDemanda}`).toBeNull();
      expect(
        avisoDeVigencia(v1Vigente('cto'), contexto({ statusDaDemanda, pendenteMaisNovo: { id: V2, nivel: 'cto', desatualizado: false } })),
        `(b) ${statusDaDemanda}`,
      ).toBeNull();
      expect(avisoDeVigencia(v2Pendente('cto'), contexto({ statusDaDemanda, vigente: { id: V1, nivel: 'cto_e_administradora' } })), `(c) ${statusDaDemanda}`).toBeNull();
    }
  });
  it('pendenteMaisNovo desatualizado, ou o próprio aberto, ou o aberto não é o vigente', () => {
    expect(avisoDeVigencia(v1Vigente('cto'), contexto({ pendenteMaisNovo: { id: V2, nivel: 'cto', desatualizado: true } }))).toBeNull();
    expect(avisoDeVigencia(v1Vigente('cto'), contexto({ pendenteMaisNovo: { id: V1, nivel: 'cto', desatualizado: false } }))).toBeNull();
    expect(avisoDeVigencia(v1Vigente('cto'), contexto({ vigente: { id: V3, nivel: 'cto' }, pendenteMaisNovo: { id: V2, nivel: 'cto', desatualizado: false } }))).toBeNull();
  });
  it('o vigente é o próprio aberto pendente (vista incoerente): nenhum (a) nem (c)', () => {
    expect(avisoDeVigencia(v2Pendente('cto'), contexto({ vigente: { id: V2, nivel: 'cto_e_administradora' } }))).toBeNull();
  });
});

describe('SB-12 (d): só id no formato vira texto ou link', () => {
  const FORA = ['x', 'DEC-DEM-1-v1<script>', `${V1} `, `/${V1}`, `${V1}\n`];
  it('id do vigente fora de RE_ID_DEC: nem (a) nem (c)', () => {
    for (const id of FORA) {
      expect(avisoDeVigencia(v2Pendente('cto_e_administradora'), contexto({ vigente: { id, nivel: 'cto' } })), JSON.stringify(id)).toBeNull();
      expect(avisoDeVigencia(v2Pendente('cto'), contexto({ vigente: { id, nivel: 'cto_e_administradora' } })), JSON.stringify(id)).toBeNull();
    }
  });
  it('id do pendente mais novo fora de RE_ID_DEC: nenhum (b)', () => {
    for (const id of FORA) {
      expect(avisoDeVigencia(v1Vigente('cto'), contexto({ pendenteMaisNovo: { id, nivel: 'cto', desatualizado: false } })), JSON.stringify(id)).toBeNull();
    }
  });
  it('id da demanda fora de RE_ID_DEMANDA no caso (c): nenhum aviso, nem o (a) no lugar', () => {
    for (const demandaId of ['x', 'DEM-1', `${DEM}/../admin`, `${DEM}?a=1`]) {
      expect(avisoDeVigencia(v2Pendente('cto', { demandaId }), contexto({ vigente: { id: V1, nivel: 'cto_e_administradora' } })), demandaId).toBeNull();
    }
  });
});

describe('dica do Arquivar pelo destino (CA-03.6; 03, 4.6; D-13)', () => {
  it('destino Aprovada: linha 2, com o id do vigente', () => {
    expect(dicaDoArquivar('aprovada', 'pronta_para_decisao', V1)).toBe(`Arquivar: a demanda vai para Aprovada, e ${V1} continua em vigor.`);
  });
  it('destino Em análise: linha 3, com o id do vigente', () => {
    expect(dicaDoArquivar('em_analise', 'pronta_para_decisao', V1)).toBe(`Arquivar: a demanda vai para Em análise, porque ${V1}, o pacote em vigor, está desatualizado.`);
  });
  it('destino Encerrada: a dica de hoje, sem mudança', () => {
    expect(dicaDoArquivar('encerrada', 'pronta_para_decisao', null)).toBe(TEXTOS_DECISAO.dicaArquivar);
    expect(dicaDoArquivar('encerrada', 'em_analise', null)).toBe('Arquivar: a demanda vai para Encerrada.');
  });
  it('sem destino: o status não muda, "continua em <Status>"', () => {
    expect(dicaDoArquivar(null, 'aprovada', V1)).toBe('Arquivar: a demanda continua em Aprovada.');
    expect(dicaDoArquivar(null, 'em_analise', V1)).toBe('Arquivar: a demanda continua em Em análise.');
    expect(dicaDoArquivar(null, 'devolvida', null)).toBe('Arquivar: a demanda continua em Devolvida pela construção.');
    expect(dicaDoArquivar(null, 'em_construcao', V1)).toBe('Arquivar: a demanda continua em Em construção.');
  });
  it('status fora de ROTULO_STATUS lança, e o id não vira texto', () => {
    for (const s of ['__proto__', 'constructor', 'toString', 'x']) {
      expect(() => dicaDoArquivar(null, s as Status, V1), s).toThrow();
    }
  });
  it('Aprovada ou Em análise com o id do vigente fora do formato, ou sem vigente, lança sem o valor na mensagem', () => {
    for (const destino of ['aprovada', 'em_analise'] as const) {
      for (const id of ['x', 'DEC-DEM-1-v1<script>', null]) {
        let mensagem = '';
        try {
          dicaDoArquivar(destino, 'pronta_para_decisao', id);
        } catch (e) {
          mensagem = (e as Error).message;
        }
        expect(mensagem, `${destino} ${String(id)}`).not.toBe('');
        if (id) expect(mensagem).not.toContain(id);
      }
    }
  });
  it('destino que a tabela do arquivamento nunca devolve lança', () => {
    for (const destino of ['nova', 'aguardando_informacao', 'pronta_para_decisao', 'em_construcao', 'devolvida', 'entregue', '__proto__'] as const) {
      expect(() => dicaDoArquivar(destino as Status, 'pronta_para_decisao', V1), destino).toThrow();
    }
  });
});

describe('chegada depois de arquivar, pelo status gravado (03, 4.7; SB-12)', () => {
  const aviso = { aviso: AVISO_DECISAO.decisaoRegistrada };
  const arquivado = {
    id: V2,
    statusDecisao: 'arquivada' as const,
    decisao: { opcaoEscolhida: null, comentarios: null, decididaPor: 'Pessoa Ficticia CTO', decididaEm: DECIDIDA_EM },
    aprovadores: [],
    nivelAprovacaoRequerido: 'cto' as const,
  } satisfies Pick<PacoteDecisaoVista, 'id' | 'statusDecisao' | 'decisao' | 'aprovadores' | 'nivelAprovacaoRequerido'>;

  it('encerrada: o texto de hoje', () => {
    expect(chegadaNaDecisao(aviso, arquivado, { statusDaDemanda: 'encerrada', vigente: null })).toBe('Pacote arquivado. A demanda foi para Encerrada.');
  });
  it('aprovada com o vigente atualizado: "está em Aprovada, e <v> continua em vigor"', () => {
    expect(chegadaNaDecisao(aviso, arquivado, { statusDaDemanda: 'aprovada', vigente: { id: V1, desatualizado: false } })).toBe(
      `Pacote arquivado. A demanda está em Aprovada, e ${V1} continua em vigor.`,
    );
  });
  it('aprovada com o vigente desatualizado ou sem vigente, e qualquer outro status: "está em <Status>"', () => {
    expect(chegadaNaDecisao(aviso, arquivado, { statusDaDemanda: 'aprovada', vigente: { id: V1, desatualizado: true } })).toBe('Pacote arquivado. A demanda está em Aprovada.');
    expect(chegadaNaDecisao(aviso, arquivado, { statusDaDemanda: 'aprovada', vigente: null })).toBe('Pacote arquivado. A demanda está em Aprovada.');
    expect(chegadaNaDecisao(aviso, arquivado, { statusDaDemanda: 'em_analise', vigente: { id: V1, desatualizado: true } })).toBe('Pacote arquivado. A demanda está em Em análise.');
    expect(chegadaNaDecisao(aviso, arquivado, { statusDaDemanda: 'em_construcao', vigente: { id: V1, desatualizado: false } })).toBe(
      'Pacote arquivado. A demanda está em Em construção.',
    );
  });
  it('o texto nunca vem da URL: ?aviso= com texto livre, lista ou ausente → nada', () => {
    for (const valor of [undefined, 'Pacote arquivado. A demanda está em Aprovada.', '<script>x</script>', ['decisao-registrada'], V1]) {
      expect(chegadaNaDecisao({ aviso: valor }, arquivado, { statusDaDemanda: 'aprovada', vigente: { id: V1, desatualizado: false } }), String(valor)).toBeNull();
    }
  });
  it('id do vigente fora do formato, ou status fora de ROTULO_STATUS, lança (D-13)', () => {
    expect(() => chegadaNaDecisao(aviso, arquivado, { statusDaDemanda: 'aprovada', vigente: { id: 'DEC-DEM-1-v1<script>', desatualizado: false } })).toThrow();
    expect(() => chegadaNaDecisao(aviso, arquivado, { statusDaDemanda: '__proto__' as Status, vigente: null })).toThrow();
  });
  it('as outras decisões não mudam com o contexto novo', () => {
    const devolvido = { ...arquivado, statusDecisao: 'devolvida' as const };
    expect(chegadaNaDecisao(aviso, devolvido, { statusDaDemanda: 'aprovada', vigente: { id: V1, desatualizado: false } })).toBe(TEXTOS_DECISAO.sucesso.devolvida);
  });
});

describe('SB-12 (a, b): nenhum texto novo tem nome de pessoa (C-30)', () => {
  it('os textos novos não contêm "Pessoa", "Ficticia" nem o nome sentinela', () => {
    const t = TEXTOS_DECISAO;
    const textos = [
      t.avisoVigente(V1),
      t.avisoMaisNovoPendente(V2),
      t.avisoNivelMenor(V1),
      t.dicaArquivarSemMudanca('Aprovada'),
      t.dicaArquivarAprovada(V1),
      t.dicaArquivarEmAnalise(V1),
      t.sucesso.arquivadaAprovada(V1),
      t.sucesso.arquivadaEm('Em análise'),
    ];
    for (const texto of textos) {
      expect(texto).not.toMatch(/Pessoa|Ficticia/i);
      expect(contemSentinela(texto)).toBe(false);
      for (const parte of SENTINELAS.nome.split(' ')) expect(texto).not.toContain(parte);
    }
  });
});
