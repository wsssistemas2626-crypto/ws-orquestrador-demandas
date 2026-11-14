// src/components/dados-da-decisao-vigencia-qa.test.ts — 06-T12-testes do DEC-DEM-20261111-0018-v1 (qa-automacao; RF-03,
// RF-06; CA-03.6, CA-06.1 a CA-06.4; SB-12; 03, 4.2, 4.6 e 4.7). Prova adversarial dos filtros: em todo estado de uma
// demanda com até três DECs (nível, decisão e desatualizado de cada um, os nove status da demanda e cada DEC aberto), o
// aviso aparece só quando o que ele diz é verdade, com o texto da 03, seção 8. O oráculo é a tabela da 4.2 escrita aqui,
// sobre o modelo da demanda (vigente = aprovado mais novo; mais novo = maior versão), e não a função testada. A página
// recebe o pendente mais novo "a mais" (mesmo quando a D-12 não o leria): a própria função tem de filtrar. Cada filtro tem
// um mutante plantado que o oráculo reprova (a enumeração tem o contraexemplo). A dica e a chegada são conferidas em todo
// status contra a tabela da 4.6 e da 4.7, e a dica contra a regra do servidor (destinoDoArquivamento). Ids fictícios;
// sem banco, sem relógio, sem ordem entre os testes.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NIVEIS_APROVACAO, type NivelAprovacao } from '../db/schema/decisao';
import { STATUS_DEMANDA } from '../db/schema/demandas';
import { destinoDoArquivamento, ESTADOS_DO_VIGENTE, estadoDoVigente, type EstadoDoVigente } from '../modules/demandas/arquivamento';
import type { Status } from '../modules/demandas/schemas';
import type { PacoteDecisaoVista } from '../modules/pacotes-decisao/consultas';
import { AVISO_DECISAO, avisoDeVigencia, chegadaNaDecisao, dicaDoArquivar, TEXTOS_DECISAO, type AvisoDeVigencia, type ContextoDaVigencia } from './dados-da-decisao';

const DEM = 'DEM-20991231-0007';
const id = (v: number) => `DEC-${DEM}-v${v}`;
const V1 = id(1);
const DECIDIDA_EM = new Date('2099-12-31T12:00:00Z');

// Os textos da 03, seção 8, escritos por inteiro (não vêm de TEXTOS_DECISAO).
const TEXTO_A = (v: string) =>
  `Esta demanda já tem um pacote aprovado em vigor: ${v}. Quando a aprovação deste pacote ficar completa, ele passa a valer no lugar de ${v}, e um pedido já gerado de ${v} deixa de valer.`;
const TEXTO_B = (p: string) =>
  `Há um pacote mais novo pendente nesta demanda: ${p}. Quando a aprovação dele ficar completa, ele passa a valer no lugar deste, e um pedido já gerado deste pacote deixa de valer.`;
const TEXTO_C = (v: string) =>
  `A aprovação deste pacote será recusada: o pacote em vigor nesta demanda, ${v}, exigiu a aprovação do CTO e da administradora, e um pacote só do CTO não pode substituí-lo. Você pode devolver ou arquivar este pacote. Para substituir ${v}, crie um pacote novo com aprovação do CTO e da administradora.`;

// Os rótulos de "<Status>" da 03 (ROTULO_STATUS de hoje), escritos aqui.
const ROTULO: Readonly<Record<Status, string>> = {
  nova: 'Nova',
  em_analise: 'Em análise',
  aguardando_informacao: 'Aguardando informação',
  pronta_para_decisao: 'Pronta para decisão',
  aprovada: 'Aprovada',
  em_construcao: 'Em construção',
  entregue: 'Entregue',
  devolvida: 'Devolvida pela construção',
  encerrada: 'Encerrada',
};

describe('os textos novos são os da própria entrega da ux-ui-design (03, seção 8; CA-05.1, CA-06.5)', () => {
  // A tabela da seção 8, lida do arquivo da entrega: cada linha tem a constante entre crases e o texto entre aspas, com
  // `<v>`, `<p>`, `<id>` e `<Status>` no lugar do valor.
  const entrega = readFileSync(new URL('../../docs/construcao/DEC-DEM-20261111-0018-v1/03-ux-ui-design.md', import.meta.url), 'utf8');
  const secao8 = entrega.slice(entrega.indexOf('### 8.'), entrega.indexOf('### 9.'));
  function textoDa(constante: string, valor: string): string | undefined {
    const linha = secao8.split('\n').find((l) => l.startsWith('|') && l.includes(`\`TEXTOS_DECISAO.${constante}\``));
    const celula = linha?.split('|').at(-2);
    if (!celula) return undefined;
    return celula
      .slice(celula.indexOf('"') + 1, celula.lastIndexOf('"'))
      .replaceAll('`', '')
      .replace(/<(v|p|id|Status)>/g, valor);
  }
  const V2 = id(2);

  it('a seção 8 foi achada e tem a tabela', () => {
    expect(secao8.length).toBeGreaterThan(500);
    expect(secao8).toContain('| Aviso (a) |');
  });

  it.each<[string, string, string]>([
    ['avisoVigente(v)', V1, TEXTOS_DECISAO.avisoVigente(V1)],
    ['avisoMaisNovoPendente(p)', V2, TEXTOS_DECISAO.avisoMaisNovoPendente(V2)],
    ['avisoNivelMenor(v)', V1, TEXTOS_DECISAO.avisoNivelMenor(V1)],
    ['abrirSubstituto(id)', V1, TEXTOS_DECISAO.abrirSubstituto(V1)],
    ['criarPacoteNovo', '', TEXTOS_DECISAO.criarPacoteNovo],
    ['dicaArquivarSemMudanca(status)', 'Aprovada', TEXTOS_DECISAO.dicaArquivarSemMudanca('Aprovada')],
    ['dicaArquivarAprovada(v)', V1, TEXTOS_DECISAO.dicaArquivarAprovada(V1)],
    ['dicaArquivarEmAnalise(v)', V1, TEXTOS_DECISAO.dicaArquivarEmAnalise(V1)],
    ['dicaArquivar', '', TEXTOS_DECISAO.dicaArquivar],
    ['sucesso.arquivadaAprovada(v)', V1, TEXTOS_DECISAO.sucesso.arquivadaAprovada(V1)],
    ['sucesso.arquivadaEm(status)', 'Em análise', TEXTOS_DECISAO.sucesso.arquivadaEm('Em análise')],
    ['sucesso.arquivada', '', TEXTOS_DECISAO.sucesso.arquivada],
  ])('TEXTOS_DECISAO.%s é o texto da entrega', (constante, valor, doCodigo) => {
    const daEntrega = textoDa(constante, valor);
    expect(daEntrega, constante).toBeDefined();
    expect(daEntrega!.length).toBeGreaterThan(10);
    expect(doCodigo).toBe(daEntrega);
  });

  it('os textos que este teste escreve por inteiro (TEXTO_A, TEXTO_B, TEXTO_C) são os da entrega', () => {
    expect(TEXTO_A(V1)).toBe(textoDa('avisoVigente(v)', V1));
    expect(TEXTO_B(V2)).toBe(textoDa('avisoMaisNovoPendente(p)', V2));
    expect(TEXTO_C(V1)).toBe(textoDa('avisoNivelMenor(v)', V1));
  });
});

// --- o modelo da demanda ---

type Estado = PacoteDecisaoVista['statusDecisao'];
const ESTADOS: readonly Estado[] = ['pendente', 'aprovada', 'devolvida', 'arquivada'];
type Dec = { id: string; nivel: NivelAprovacao; estado: Estado; desatualizado: boolean };

// Todas as listas de n DECs (v1 … vn), cada um com nível, decisão e desatualizado.
function listas(n: number): Dec[][] {
  const um: Array<Omit<Dec, 'id'>> = [];
  for (const nivel of NIVEIS_APROVACAO) for (const estado of ESTADOS) for (const desatualizado of [false, true]) um.push({ nivel, estado, desatualizado });
  let acc: Dec[][] = [[]];
  for (let v = 1; v <= n; v++) acc = acc.flatMap((l) => um.map((d) => [...l, { id: id(v), ...d }]));
  return acc;
}
const TODAS = [...listas(1), ...listas(2), ...listas(3)];

// O vigente é o aprovado de maior versão (os anteriores aprovados são substituídos); o mais novo é o de maior versão.
const vigenteDe = (l: readonly Dec[]): Dec | null => [...l].reverse().find((d) => d.estado === 'aprovada') ?? null;
const FINAL: ReadonlySet<Status> = new Set<Status>(['entregue', 'encerrada']);
const soCtoSobreDupla = (novo: NivelAprovacao, emVigor: NivelAprovacao) => novo === 'cto' && emVigor === 'cto_e_administradora';

// O oráculo: a tabela da 4.2 (e o RF-06), sobre o modelo. O aviso só é verdade quando:
// (a) o aberto pode ser aprovado agora (pendente, o mais novo, atualizado), há outro em vigor, e o S-01 não o recusa;
// (c) o mesmo, quando o S-01 recusa (o aberto é só do CTO e o vigente exigiu os dois);
// (b) o aberto é o vigente e o mais novo é outro, pendente, atualizado, e capaz de substituí-lo.
// Em status final, nenhum.
function esperado(l: readonly Dec[], aberto: Dec, status: Status): AvisoDeVigencia | null {
  if (FINAL.has(status)) return null;
  const maisNovo = l[l.length - 1]!;
  const v = vigenteDe(l);
  const aprovavelAgora = aberto.estado === 'pendente' && aberto === maisNovo && !aberto.desatualizado;
  if (aprovavelAgora && v && v !== aberto) {
    if (soCtoSobreDupla(aberto.nivel, v.nivel)) return { texto: TEXTO_C(v.id), link: { rotulo: 'Criar pacote novo', href: `/demandas/${DEM}/pacotes-decisao/novo` } };
    return { texto: TEXTO_A(v.id), link: { rotulo: `Abrir o pacote ${v.id}`, href: `/pacotes-decisao/${v.id}` } };
  }
  if (v === aberto && maisNovo !== aberto && maisNovo.estado === 'pendente' && !maisNovo.desatualizado && !soCtoSobreDupla(maisNovo.nivel, aberto.nivel)) {
    return { texto: TEXTO_B(maisNovo.id), link: { rotulo: `Abrir o pacote ${maisNovo.id}`, href: `/pacotes-decisao/${maisNovo.id}` } };
  }
  return null;
}

const abertoDe = (d: Dec): Parameters<typeof avisoDeVigencia>[0] => ({
  id: d.id,
  demandaId: DEM,
  statusDecisao: d.estado,
  desatualizado: d.desatualizado,
  nivelAprovacaoRequerido: d.nivel,
});

// O contexto que a página monta. `generoso`: o pendente mais novo vai sempre que o mais novo é outro e pendente, mesmo
// quando a D-12 não o leria (aberto que não é o vigente, mais novo desatualizado): o filtro tem de estar na função.
function contextoDe(l: readonly Dec[], aberto: Dec, status: Status, generoso: boolean): ContextoDaVigencia {
  const maisNovo = l[l.length - 1]!;
  const v = vigenteDe(l);
  const d12 = v === aberto && maisNovo !== aberto && maisNovo.estado === 'pendente' && !maisNovo.desatualizado;
  const leva = generoso ? maisNovo !== aberto && maisNovo.estado === 'pendente' : d12;
  return {
    statusDaDemanda: status,
    maisNovoId: maisNovo.id,
    vigente: v ? { id: v.id, nivel: v.nivel } : null,
    pendenteMaisNovo: leva ? { id: maisNovo.id, nivel: maisNovo.nivel, desatualizado: maisNovo.desatualizado } : null,
  };
}

type Funcao = (p: Parameters<typeof avisoDeVigencia>[0], c: ContextoDaVigencia) => AvisoDeVigencia | null;

// Roda a função em todo estado do modelo e devolve as divergências do oráculo, e quantas vezes cada aviso era esperado.
function varrer(f: Funcao, generoso: boolean): { divergencias: string[]; casos: number; contagem: Record<'a' | 'b' | 'c' | 'nenhum', number> } {
  const divergencias: string[] = [];
  const contagem = { a: 0, b: 0, c: 0, nenhum: 0 };
  let casos = 0;
  for (const l of TODAS) {
    for (const aberto of l) {
      for (const status of STATUS_DEMANDA) {
        casos++;
        const e = esperado(l, aberto, status);
        const r = f(abertoDe(aberto), contextoDe(l, aberto, status, generoso));
        if (!e) contagem.nenhum++;
        else if (e.texto.startsWith('Esta demanda')) contagem.a++;
        else if (e.texto.startsWith('Há um pacote')) contagem.b++;
        else contagem.c++;
        if (JSON.stringify(r) !== JSON.stringify(e)) {
          const desc = l.map((d) => `${d.id.slice(-2)}:${d.nivel === 'cto' ? 'cto' : 'dupla'}/${d.estado}${d.desatualizado ? '/desat' : ''}`).join(' ');
          divergencias.push(`[${desc}] aberto ${aberto.id.slice(-2)}, demanda ${status}: veio ${JSON.stringify(r?.texto.slice(0, 30) ?? null)}, esperado ${JSON.stringify(e?.texto.slice(0, 30) ?? null)}`);
        }
      }
    }
  }
  return { divergencias, casos, contagem };
}

describe('filtros dos avisos (a), (b) e (c), em todo estado de uma demanda com até três DECs (03, 4.2; CA-06.1 a CA-06.4)', () => {
  // 16 + 2 × 256 + 3 × 4096 abertos, nos 9 status.
  const CASOS = (16 + 2 * 256 + 3 * 4096) * 9;

  it('com o contexto da D-12: o aviso só aparece quando é verdade, com o texto e o link da 03', () => {
    const { divergencias, casos, contagem } = varrer(avisoDeVigencia, false);
    expect(casos).toBe(CASOS);
    expect(divergencias.length, divergencias.slice(0, 8).join('\n')).toBe(0);
    // A enumeração não é vazia em nenhum ramo.
    expect(contagem.a).toBeGreaterThan(100);
    expect(contagem.b).toBeGreaterThan(100);
    expect(contagem.c).toBeGreaterThan(100);
    expect(contagem.nenhum).toBeGreaterThan(contagem.a + contagem.b + contagem.c);
  });

  it('com o pendente mais novo passado a mais (aberto que não é o vigente, mais novo desatualizado): a função filtra sozinha', () => {
    const { divergencias, casos } = varrer(avisoDeVigencia, true);
    expect(casos).toBe(CASOS);
    expect(divergencias.length, divergencias.slice(0, 8).join('\n')).toBe(0);
  });

  it('em status final nenhum aviso, e fora dele os três aparecem (o filtro de status não é mais largo que a 4.2)', () => {
    const porStatus = new Map<Status, number>();
    for (const l of TODAS) for (const aberto of l) for (const status of STATUS_DEMANDA) {
      if (avisoDeVigencia(abertoDe(aberto), contextoDe(l, aberto, status, false))) porStatus.set(status, (porStatus.get(status) ?? 0) + 1);
    }
    expect(porStatus.get('entregue')).toBeUndefined();
    expect(porStatus.get('encerrada')).toBeUndefined();
    const fora = STATUS_DEMANDA.filter((s) => !FINAL.has(s));
    expect(fora).toHaveLength(7);
    // O mesmo número de avisos em cada status fora do final: o status só entra pelo filtro de final.
    const n = porStatus.get('pronta_para_decisao')!;
    expect(n).toBeGreaterThan(0);
    for (const s of fora) expect(porStatus.get(s), s).toBe(n);
  });
});

describe('cada filtro da 4.2 tem contraexemplo na enumeração (mutantes plantados)', () => {
  // A regra da 4.2 reescrita com um filtro a menos; o oráculo tem de achar ao menos uma divergência em cada.
  type Filtro = 'final' | 'pendente' | 'maisNovo' | 'abertoAtualizado' | 's01NoA' | 'vigenteOutro' | 'abertoVigente' | 'pendenteAtualizado' | 's01NoB' | 'bOutro';
  const mutante =
    (sem: Filtro): Funcao =>
    (p, c) => {
      if (sem !== 'final' && FINAL.has(c.statusDaDemanda)) return null;
      const v = c.vigente;
      const okA =
        (sem === 'pendente' || p.statusDecisao === 'pendente') &&
        (sem === 'maisNovo' || p.id === c.maisNovoId) &&
        (sem === 'abertoAtualizado' || !p.desatualizado) &&
        (sem === 'vigenteOutro' || v?.id !== p.id);
      if (okA && v) {
        if (sem !== 's01NoA' && soCtoSobreDupla(p.nivelAprovacaoRequerido, v.nivel))
          return { texto: TEXTO_C(v.id), link: { rotulo: 'Criar pacote novo', href: `/demandas/${p.demandaId}/pacotes-decisao/novo` } };
        return { texto: TEXTO_A(v.id), link: { rotulo: `Abrir o pacote ${v.id}`, href: `/pacotes-decisao/${v.id}` } };
      }
      const n = c.pendenteMaisNovo;
      if (
        (sem === 'abertoVigente' || v?.id === p.id) &&
        n &&
        (sem === 'bOutro' || n.id !== p.id) &&
        (sem === 'pendenteAtualizado' || !n.desatualizado) &&
        (sem === 's01NoB' || !soCtoSobreDupla(n.nivel, p.nivelAprovacaoRequerido))
      )
        return { texto: TEXTO_B(n.id), link: { rotulo: `Abrir o pacote ${n.id}`, href: `/pacotes-decisao/${n.id}` } };
      return null;
    };

  it('o mutante sem nenhum filtro retirado concorda com o oráculo (controle)', () => {
    expect(varrer(mutante('nenhum' as Filtro), true).divergencias).toEqual([]);
  });

  it.each<Filtro>(['final', 'pendente', 'maisNovo', 'abertoAtualizado', 's01NoA', 'abertoVigente', 'pendenteAtualizado', 's01NoB'])(
    'sem o filtro "%s", o aviso falso aparece e o oráculo o reprova',
    (filtro) => {
      expect(varrer(mutante(filtro), true).divergencias.length).toBeGreaterThan(0);
    },
  );

  // No modelo, o vigente é sempre aprovado e o mais novo pendente nunca é o vigente: as duas guardas valem para a vista
  // incoerente (corrida entre as leituras), e o caso é plantado.
  it('"vigenteOutro" (o vigente é o próprio aberto pendente): o mutante mostra o (a) citando o próprio pacote; a função, nada', () => {
    const v2 = abertoDe({ id: id(2), nivel: 'cto', estado: 'pendente', desatualizado: false });
    const c: ContextoDaVigencia = { statusDaDemanda: 'pronta_para_decisao', maisNovoId: id(2), vigente: { id: id(2), nivel: 'cto' }, pendenteMaisNovo: null };
    expect(mutante('vigenteOutro')(v2, c)?.texto).toBe(TEXTO_A(id(2)));
    expect(avisoDeVigencia(v2, c)).toBeNull();
  });

  it('"bOutro" (o pendente mais novo é o próprio aberto): o mutante mostra o (b) citando o próprio pacote; a função, nada', () => {
    const v1 = abertoDe({ id: V1, nivel: 'cto', estado: 'aprovada', desatualizado: false });
    const c: ContextoDaVigencia = { statusDaDemanda: 'pronta_para_decisao', maisNovoId: V1, vigente: { id: V1, nivel: 'cto' }, pendenteMaisNovo: { id: V1, nivel: 'cto', desatualizado: false } };
    expect(mutante('bOutro')(v1, c)?.texto).toBe(TEXTO_B(V1));
    expect(avisoDeVigencia(v1, c)).toBeNull();
  });
});

describe('casos nomeados em que o aviso seria falso (CA-06.4 e 4.2), isolando um filtro de cada vez', () => {
  const ctx = (extra: Partial<ContextoDaVigencia>): ContextoDaVigencia => ({
    statusDaDemanda: 'pronta_para_decisao',
    maisNovoId: id(2),
    vigente: { id: V1, nivel: 'cto' },
    pendenteMaisNovo: null,
    ...extra,
  });
  const v2 = (estado: Estado, nivel: NivelAprovacao = 'cto') => abertoDe({ id: id(2), nivel, estado, desatualizado: false });

  it('o DEC aberto é o mais novo, mas já foi devolvido ou arquivado: nem (a) nem (c) ("quando a aprovação ficar completa" seria falso)', () => {
    for (const estado of ['devolvida', 'arquivada'] as const) {
      for (const nivel of NIVEIS_APROVACAO) {
        for (const vigNivel of NIVEIS_APROVACAO) {
          expect(avisoDeVigencia(v2(estado, nivel), ctx({ vigente: { id: V1, nivel: vigNivel } })), `${estado} ${nivel} sobre ${vigNivel}`).toBeNull();
        }
      }
    }
  });

  it('o v1 aprovado sem ser o vigente (substituído pelo v2), com o v3 pendente: nenhum (b) no v1 (o v3 substituiria o v2, não ele)', () => {
    const v1 = abertoDe({ id: V1, nivel: 'cto', estado: 'aprovada', desatualizado: false });
    const c = ctx({ maisNovoId: id(3), vigente: { id: id(2), nivel: 'cto' }, pendenteMaisNovo: { id: id(3), nivel: 'cto', desatualizado: false } });
    expect(avisoDeVigencia(v1, c)).toBeNull();
  });

  it('o aberto aprovado sem vigente nenhum (vista incoerente), com pendente mais novo: nenhum (b)', () => {
    const v1 = abertoDe({ id: V1, nivel: 'cto', estado: 'aprovada', desatualizado: false });
    expect(avisoDeVigencia(v1, ctx({ vigente: null, pendenteMaisNovo: { id: id(2), nivel: 'cto', desatualizado: false } }))).toBeNull();
  });

  it('(b) com o vigente de dupla aprovação e o pendente também de dupla aparece; só o pendente só do CTO o tira', () => {
    const v1 = abertoDe({ id: V1, nivel: 'cto_e_administradora', estado: 'aprovada', desatualizado: false });
    const vig = { id: V1, nivel: 'cto_e_administradora' as const };
    expect(avisoDeVigencia(v1, ctx({ vigente: vig, pendenteMaisNovo: { id: id(2), nivel: 'cto_e_administradora', desatualizado: false } }))?.texto).toBe(TEXTO_B(id(2)));
    expect(avisoDeVigencia(v1, ctx({ vigente: vig, pendenteMaisNovo: { id: id(2), nivel: 'cto', desatualizado: false } }))).toBeNull();
  });

  it('(a) e (c) com a demanda em Aprovada, Em construção e Devolvida também aparecem (só o status final os tira)', () => {
    for (const statusDaDemanda of ['aprovada', 'em_construcao', 'devolvida'] as const) {
      expect(avisoDeVigencia(v2('pendente', 'cto_e_administradora'), ctx({ statusDaDemanda }))?.texto, statusDaDemanda).toBe(TEXTO_A(V1));
      expect(avisoDeVigencia(v2('pendente', 'cto'), ctx({ statusDaDemanda, vigente: { id: V1, nivel: 'cto_e_administradora' } }))?.texto, statusDaDemanda).toBe(TEXTO_C(V1));
    }
  });
});

describe('SB-12 (d): mais formas de id fora do formato (nenhum aviso, nenhum valor no texto)', () => {
  const ID_FORA = [
    'DEC-DEM-20991231-0007-v12345',
    'DEC-DEM-2099123-0007-v1',
    'dec-dem-20991231-0007-v1',
    `${V1}/../../demandas`,
    `${V1}?x=1`,
    `${V1}#x`,
    ` ${V1}`,
    'DEC-DEM-20991231-0007-v',
    'DEC‐DEM-20991231-0007-v1',
    'DEC-DEM-２０９９1231-0007-v1',
    'javascript:alert(1)',
    '',
  ];
  const DEM_FORA = ['DEM-20991231-00071', 'DEM-2099123-0007', 'dem-20991231-0007', `${DEM}\n`, ` ${DEM}`, `${DEM}#x`, 'DEM-２０９９1231-0007', ''];
  const pend = (nivel: NivelAprovacao, demandaId = DEM) => ({ ...abertoDe({ id: id(2), nivel, estado: 'pendente', desatualizado: false }), demandaId });
  const vig1 = abertoDe({ id: V1, nivel: 'cto', estado: 'aprovada', desatualizado: false });
  const base: ContextoDaVigencia = { statusDaDemanda: 'pronta_para_decisao', maisNovoId: id(2), vigente: null, pendenteMaisNovo: null };

  it('id do vigente fora de RE_ID_DEC: nem (a) nem (c)', () => {
    for (const v of ID_FORA) {
      for (const nivel of NIVEIS_APROVACAO) {
        expect(avisoDeVigencia(pend(nivel), { ...base, vigente: { id: v, nivel: 'cto_e_administradora' } }), JSON.stringify(v)).toBeNull();
        expect(avisoDeVigencia(pend(nivel), { ...base, vigente: { id: v, nivel: 'cto' } }), JSON.stringify(v)).toBeNull();
      }
    }
  });

  it('id do pendente mais novo fora de RE_ID_DEC: nenhum (b)', () => {
    for (const p of ID_FORA) {
      expect(avisoDeVigencia(vig1, { ...base, maisNovoId: p, vigente: { id: V1, nivel: 'cto' }, pendenteMaisNovo: { id: p, nivel: 'cto', desatualizado: false } }), JSON.stringify(p)).toBeNull();
    }
  });

  it('id da demanda fora do formato no (c): nenhum aviso (nem o (a) no lugar); no (a), o id da demanda não entra no texto nem no link', () => {
    for (const demandaId of DEM_FORA) {
      expect(avisoDeVigencia(pend('cto', demandaId), { ...base, vigente: { id: V1, nivel: 'cto_e_administradora' } }), JSON.stringify(demandaId)).toBeNull();
      const a = avisoDeVigencia(pend('cto_e_administradora', demandaId), { ...base, vigente: { id: V1, nivel: 'cto' } });
      expect(a, JSON.stringify(demandaId)).toEqual({ texto: TEXTO_A(V1), link: { rotulo: `Abrir o pacote ${V1}`, href: `/pacotes-decisao/${V1}` } });
    }
  });
});

describe('dica do Arquivar em todo status e estado do vigente: a da 4.6, e o destino é o do servidor (CA-03.6)', () => {
  // A tabela da 4.6 (com a Pendência 1 em Em análise, como a T06), escrita aqui: origens plenas, Em análise e o resto.
  function dicaEsperada(s: Status, e: EstadoDoVigente): string {
    const plenas: readonly Status[] = ['nova', 'aguardando_informacao', 'pronta_para_decisao'];
    if (plenas.includes(s) || s === 'em_analise') {
      if (e === 'nenhum') return 'Arquivar: a demanda vai para Encerrada.';
      if (e === 'atualizado') return `Arquivar: a demanda vai para Aprovada, e ${V1} continua em vigor.`;
      if (s !== 'em_analise') return `Arquivar: a demanda vai para Em análise, porque ${V1}, o pacote em vigor, está desatualizado.`;
    }
    return `Arquivar: a demanda continua em ${ROTULO[s]}.`;
  }
  // O status para onde a dica diz que a demanda vai ("continua" = o de agora).
  const destinoDito = (texto: string, s: Status): Status => {
    if (texto.includes('vai para Encerrada')) return 'encerrada';
    if (texto.includes('vai para Aprovada')) return 'aprovada';
    if (texto.includes('vai para Em análise')) return 'em_analise';
    return s;
  };

  it.each([...STATUS_DEMANDA])('status %s: a dica é a da tabela e diz o destino que o servidor grava', (s) => {
    for (const e of ESTADOS_DO_VIGENTE) {
      const vigente = e === 'nenhum' ? null : { desatualizado: e === 'desatualizado' };
      expect(estadoDoVigente(vigente)).toBe(e);
      const destino = destinoDoArquivamento(s, e);
      const dica = dicaDoArquivar(destino, s, e === 'nenhum' ? null : V1);
      expect(dica, `${s} ${e}`).toBe(dicaEsperada(s, e));
      // O que a dica diz é o que o servidor faz: o destino (ou o status de agora, quando nada muda).
      expect(destinoDito(dica, s), `${s} ${e}`).toBe(destino ?? s);
      // Só cita o vigente quando o destino depende dele; "continua em vigor" só com ele atualizado.
      if (dica.includes(V1)) expect(destino === 'aprovada' || destino === 'em_analise', `${s} ${e}`).toBe(true);
      if (dica.includes('continua em vigor')) expect(e).toBe('atualizado');
    }
  });

  it('sem vigente, a dica nunca diz Aprovada nem cita id; com o vigente atualizado nas origens, nunca diz Encerrada', () => {
    for (const s of STATUS_DEMANDA) {
      const sem = dicaDoArquivar(destinoDoArquivamento(s, 'nenhum'), s, null);
      expect(sem, s).not.toContain('Aprovada, e');
      expect(sem, s).not.toMatch(/DEC-DEM-/);
      const com = dicaDoArquivar(destinoDoArquivamento(s, 'atualizado'), s, V1);
      if (['nova', 'aguardando_informacao', 'pronta_para_decisao', 'em_analise'].includes(s)) expect(com, s).not.toContain('Encerrada');
    }
  });
});

describe('chegada depois de arquivar em todo status e estado do vigente (03, 4.7)', () => {
  const arquivado = {
    id: id(2),
    statusDecisao: 'arquivada' as const,
    decisao: { opcaoEscolhida: null, comentarios: null, decididaPor: 'Pessoa Ficticia CTO', decididaEm: DECIDIDA_EM },
    aprovadores: [],
    nivelAprovacaoRequerido: 'cto' as const,
  } satisfies Pick<PacoteDecisaoVista, 'id' | 'statusDecisao' | 'decisao' | 'aprovadores' | 'nivelAprovacaoRequerido'>;
  const aviso = { aviso: AVISO_DECISAO.decisaoRegistrada };

  function chegadaEsperada(s: Status, e: EstadoDoVigente): string {
    if (s === 'encerrada') return 'Pacote arquivado. A demanda foi para Encerrada.';
    if (s === 'aprovada' && e === 'atualizado') return `Pacote arquivado. A demanda está em Aprovada, e ${V1} continua em vigor.`;
    return `Pacote arquivado. A demanda está em ${ROTULO[s]}.`;
  }

  it.each([...STATUS_DEMANDA])('status %s: o texto diz o status gravado; "continua em vigor" só com Aprovada e o vigente atualizado', (s) => {
    for (const e of ESTADOS_DO_VIGENTE) {
      const vigente = e === 'nenhum' ? null : { id: V1, desatualizado: e === 'desatualizado' };
      const texto = chegadaNaDecisao(aviso, arquivado, { statusDaDemanda: s, vigente });
      expect(texto, `${s} ${e}`).toBe(chegadaEsperada(s, e));
      expect(texto!.includes('Encerrada'), `${s} ${e}`).toBe(s === 'encerrada');
      expect(texto!.includes(V1), `${s} ${e}`).toBe(s === 'aprovada' && e === 'atualizado');
    }
  });

  it('sem o ?aviso= fixo, nenhuma chegada em nenhum status', () => {
    for (const s of STATUS_DEMANDA) {
      for (const params of [{}, { aviso: 'decisao_registrada' }, { aviso: ' decisao-registrada' }, { aviso: 'DECISAO-REGISTRADA' }]) {
        expect(chegadaNaDecisao(params, arquivado, { statusDaDemanda: s, vigente: { id: V1, desatualizado: false } }), `${s} ${JSON.stringify(params)}`).toBeNull();
      }
    }
  });
});
