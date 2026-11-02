import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { SENTINELAS, contemSentinela } from '../../test/sentinelas';
import { ErroDominio, STATUS_DO_CODIGO, deZod, mapearErro } from './erros';

describe('mapearErro (C-20)', () => {
  it('ErroDominio vira o status do código com mensagem pt-BR', () => {
    expect(mapearErro(new ErroDominio('conflito', 'Este pacote já tem decisão registrada.'))).toEqual({
      status: 409,
      corpo: { erro: 'conflito', mensagem: 'Este pacote já tem decisão registrada.' },
    });
    expect(
      mapearErro(new ErroDominio('entrada_invalida', 'Faltam itens.', { faltando: ['parecer_risco'] })).corpo.faltando,
    ).toEqual(['parecer_risco']);
  });

  it('erro do Postgres com sentinela vira 500 genérico sem o sentinela', () => {
    const pgErro = Object.assign(new Error(`new row violates check constraint (${SENTINELAS.texto})`), {
      code: '23514',
      detail: SENTINELAS.email,
      table: 'demanda',
    });
    const r = mapearErro(pgErro);
    expect(r.status).toBe(500);
    expect(r.corpo).toEqual({
      erro: 'erro_interno',
      mensagem: 'Não foi possível concluir agora. Nada foi alterado. Tente de novo em instantes.',
    });
    expect(JSON.stringify(r)).not.toContain('SENTINELA');
    expect(JSON.stringify(r)).not.toContain('demanda');
  });

  it('ZodError vira 400 com campos em pt-BR e sem o valor recebido', () => {
    const s = z.object({ titulo: z.string().min(1), tipo: z.enum(['bug', 'melhoria']) });
    const r = s.safeParse({ titulo: '', tipo: SENTINELAS.texto });
    const e = deZod(r.error!);
    const m = mapearErro(e);
    expect(m.status).toBe(400);
    expect(m.corpo.campos).toEqual([
      { campo: 'titulo', mensagem: 'Campo obrigatório.' },
      { campo: 'tipo', mensagem: 'Valor inválido.' },
    ]);
    expect(JSON.stringify(m)).not.toContain('SENTINELA');
  });

  it('cada código tem o status da interface', () => {
    expect(STATUS_DO_CODIGO).toEqual({
      entrada_invalida: 400,
      nao_autenticado: 401,
      sem_permissao: 403,
      sem_2fa: 403,
      nao_encontrado: 404,
      metodo_nao_permitido: 405,
      conflito: 409,
      corpo_grande: 413,
      tipo_nao_suportado: 415,
      nao_processavel: 422,
      limite_excedido: 429,
      capacidade_de_ids_esgotada: 409,
      indisponivel: 503,
    });
  });

  it('erro do Drizzle com a causa do Postgres e os parâmetros vira 500 genérico', () => {
    const causa = Object.assign(new Error(`violates check (${SENTINELAS.email})`), { code: '23514' });
    const e = Object.assign(new Error(`Failed query: insert into demanda params: ${SENTINELAS.texto}`), {
      name: 'DrizzleQueryError',
      cause: causa,
      params: [SENTINELAS.texto, SENTINELAS.nome],
    });
    const r = mapearErro(e);
    expect(r.status).toBe(500);
    expect(r.corpo.erro).toBe('erro_interno');
    expect(contemSentinela(JSON.stringify(r))).toBe(false);
  });

  it('ZodError cru, sem passar por deZod, também vira 500 genérico sem o valor', () => {
    const r = z.object({ email: z.email() }).safeParse({ email: SENTINELAS.texto });
    const m = mapearErro(r.error);
    expect(m.status).toBe(500);
    expect(contemSentinela(JSON.stringify(m))).toBe(false);
  });

  it('valor que não é Error (texto, nulo, objeto) vira 500 genérico', () => {
    for (const v of [SENTINELAS.texto, null, undefined, { mensagem: SENTINELAS.email }]) {
      const m = mapearErro(v);
      expect(m.status).toBe(500);
      expect(contemSentinela(JSON.stringify(m))).toBe(false);
    }
  });

  it('o corpo leva só erro, mensagem e os extras preenchidos', () => {
    const e = new ErroDominio('entrada_invalida', 'Corrija.', { erros: ['Falta a ESP.'] });
    expect(mapearErro(e).corpo).toEqual({ erro: 'entrada_invalida', mensagem: 'Corrija.', erros: ['Falta a ESP.'] });
    const extrasEstranhos = { faltando: ['x'], detalhe: SENTINELAS.texto } as never;
    expect(contemSentinela(JSON.stringify(mapearErro(new ErroDominio('conflito', 'Já existe.', extrasEstranhos))))).toBe(
      false,
    );
  });

  it('ErroDominio não carrega a mensagem pt-BR no message do Error (o log só vê o código)', () => {
    const e = new ErroDominio('conflito', `Conflito com ${SENTINELAS.nome}`);
    expect(e.message).toBe('conflito');
    expect(e.name).toBe('ErroDominio');
    expect(e).toBeInstanceOf(Error);
  });
});

describe('deZod: mensagens pt-BR sem o valor recebido (C-20, RNF-16)', () => {
  const campos = (s: z.ZodType, entrada: unknown) => {
    const r = s.safeParse(entrada);
    expect(r.success).toBe(false);
    return deZod(r.error!).extras.campos;
  };

  it('campo ausente é obrigatório; tipo errado é valor inválido', () => {
    const s = z.object({ titulo: z.string(), quantidade: z.number() });
    expect(campos(s, { quantidade: SENTINELAS.texto })).toEqual([
      { campo: 'titulo', mensagem: 'Campo obrigatório.' },
      { campo: 'quantidade', mensagem: 'Valor inválido.' },
    ]);
  });

  it('texto e lista acima do limite dizem o limite em pt-BR', () => {
    const s = z.object({ titulo: z.string().max(10000), itens: z.array(z.string()).max(3) });
    expect(campos(s, { titulo: 'a'.repeat(10001), itens: ['a', 'b', 'c', 'd'] })).toEqual([
      { campo: 'titulo', mensagem: 'Este campo aceita até 10.000 caracteres.' },
      { campo: 'itens', mensagem: 'Limite de 3 itens atingido.' },
    ]);
  });

  it('lista vazia pede ao menos um item; número fora do limite diz fora do limite', () => {
    const s = z.object({ itens: z.array(z.string()).min(1), dias: z.number().min(1).max(365) });
    expect(campos(s, { itens: [], dias: 400 })).toEqual([
      { campo: 'itens', mensagem: 'Informe ao menos um item.' },
      { campo: 'dias', mensagem: 'Valor fora do limite.' },
    ]);
  });

  it('caminho aninhado vira campo com ponto', () => {
    const s = z.object({ opcaoA: z.object({ vantagens: z.array(z.string().min(1)) }) });
    expect(campos(s, { opcaoA: { vantagens: ['ok', ''] } })).toEqual([
      { campo: 'opcaoA.vantagens.1', mensagem: 'Campo obrigatório.' },
    ]);
  });

  it('mensagem custom escrita por nós passa; a padrão em inglês vira Valor inválido', () => {
    const s = z.object({
      a: z.string().refine((v) => v === 'ok', { message: 'Use só A ou B.' }),
      b: z.string().refine((v) => v === 'ok'),
    });
    expect(campos(s, { a: 'x', b: 'x' })).toEqual([
      { campo: 'a', mensagem: 'Use só A ou B.' },
      { campo: 'b', mensagem: 'Valor inválido.' },
    ]);
  });

  it('formato inválido (e-mail, regex) não ecoa o valor', () => {
    const s = z.object({ email: z.email(), id: z.string().regex(/^DEM-\d{8}-\d{4}$/) });
    const c = campos(s, { email: SENTINELAS.texto, id: SENTINELAS.email });
    expect(c).toEqual([
      { campo: 'email', mensagem: 'Valor inválido.' },
      { campo: 'id', mensagem: 'Valor inválido.' },
    ]);
    expect(contemSentinela(JSON.stringify(c))).toBe(false);
  });

  it('chave vinda do cliente no caminho (registro) não vai para o campo', () => {
    const s = z.object({ mapa: z.record(z.string(), z.number()) });
    const c = campos(s, { mapa: { [SENTINELAS.email]: SENTINELAS.texto } });
    expect(c).toEqual([{ campo: 'mapa.*', mensagem: 'Valor inválido.' }]);
    expect(contemSentinela(JSON.stringify(c))).toBe(false);
  });

  it('chave desconhecida em objeto estrito não ecoa o nome da chave', () => {
    const s = z.strictObject({ titulo: z.string() });
    const c = campos(s, { titulo: 'ok', [SENTINELAS.texto]: 1 });
    expect(c).toEqual([{ campo: '', mensagem: 'Valor inválido.' }]);
    expect(contemSentinela(JSON.stringify(c))).toBe(false);
  });

  it('deZod devolve entrada_invalida com mensagem geral pt-BR', () => {
    const r = z.object({ titulo: z.string() }).safeParse({});
    const e = deZod(r.error!);
    expect(e).toBeInstanceOf(ErroDominio);
    expect(e.codigo).toBe('entrada_invalida');
    expect(e.mensagem).toBe('Corrija os campos abaixo para continuar.');
  });
});

// Testes da etapa 06-T03-testes (qa-automacao): casos de borda de C-20 e da RNF-16 que a construção não cobria.
describe('mapearErro: casos de borda (C-20)', () => {
  const MENSAGEM_500 = 'Não foi possível concluir agora. Nada foi alterado. Tente de novo em instantes.';
  const CODIGOS = Object.keys(STATUS_DO_CODIGO) as (keyof typeof STATUS_DO_CODIGO)[];

  it.each(CODIGOS)('ErroDominio %s sai com o status da tabela e o próprio código no corpo', (codigo) => {
    expect(mapearErro(new ErroDominio(codigo, 'Mensagem fictícia.'))).toEqual({
      status: STATUS_DO_CODIGO[codigo],
      corpo: { erro: codigo, mensagem: 'Mensagem fictícia.' },
    });
  });

  it('sem extras, o corpo tem só erro e mensagem; com os três, nessa ordem e sem chave a mais', () => {
    expect(Object.keys(mapearErro(new ErroDominio('nao_encontrado', 'Demanda não encontrada.')).corpo)).toEqual([
      'erro',
      'mensagem',
    ]);
    const completo = new ErroDominio('entrada_invalida', 'Corrija.', {
      campos: [{ campo: 'titulo', mensagem: 'Campo obrigatório.' }],
      faltando: ['parecer_risco'],
      erros: ['Falta a ESP.'],
    });
    expect(Object.keys(mapearErro(completo).corpo)).toEqual(['erro', 'mensagem', 'campos', 'faltando', 'erros']);
  });

  it('objeto que imita ErroDominio (codigo, mensagem, extras) sem ser instância vira 500 genérico', () => {
    const imitacoes = [
      Object.assign(new Error(SENTINELAS.texto), {
        codigo: 'conflito',
        mensagem: SENTINELAS.email,
        extras: { campos: [{ campo: 'x', mensagem: SENTINELAS.nome }] },
      }),
      { codigo: 'conflito', mensagem: SENTINELAS.email, name: 'ErroDominio' },
    ];
    for (const v of imitacoes) {
      const m = mapearErro(v);
      expect(m).toEqual({ status: 500, corpo: { erro: 'erro_interno', mensagem: MENSAGEM_500 } });
      expect(contemSentinela(JSON.stringify(m))).toBe(false);
    }
  });

  it('ErroDominio só na causa de outro erro não é desembrulhado: vira 500 genérico', () => {
    const e = new Error(`falhou com ${SENTINELAS.texto}`, { cause: new ErroDominio('conflito', 'Já existe.') });
    const m = mapearErro(e);
    expect(m).toEqual({ status: 500, corpo: { erro: 'erro_interno', mensagem: MENSAGEM_500 } });
  });
});

describe('deZod: casos de borda (C-20, C-17 Zod sem input, RNF-16)', () => {
  const camposDe = (s: z.ZodType, entrada: unknown, reportInput = false) => {
    const r = s.safeParse(entrada, { reportInput });
    expect(r.success).toBe(false);
    return { erro: r.error!, m: mapearErro(deZod(r.error!)) };
  };

  it('com reportInput ligado, a issue carrega o valor, mas ele não chega ao corpo (deZod nem ZodError cru)', () => {
    const s = z.object({ titulo: z.string(), quantidade: z.number(), email: z.email() });
    const { erro, m } = camposDe(s, { quantidade: SENTINELAS.texto, email: SENTINELAS.senha }, true);
    // Sem isso o teste não provaria nada: a issue de fato leva o valor recebido.
    expect(contemSentinela(JSON.stringify(erro.issues))).toBe(true);
    expect(m.status).toBe(400);
    expect(m.corpo.campos).toEqual([
      { campo: 'titulo', mensagem: 'Campo obrigatório.' },
      { campo: 'quantidade', mensagem: 'Valor inválido.' },
      { campo: 'email', mensagem: 'Valor inválido.' },
    ]);
    expect(contemSentinela(JSON.stringify(m))).toBe(false);
    const cru = mapearErro(erro);
    expect(cru.status).toBe(500);
    expect(contemSentinela(JSON.stringify(cru))).toBe(false);
  });

  it('união sem alternativa válida não ecoa o valor nem as issues internas', () => {
    const s = z.object({ origem: z.union([z.literal('painel'), z.email()]) });
    const { erro, m } = camposDe(s, { origem: SENTINELAS.texto }, true);
    expect(contemSentinela(JSON.stringify(erro.issues))).toBe(true);
    expect(m.corpo.campos).toEqual([{ campo: 'origem', mensagem: 'Valor inválido.' }]);
    expect(contemSentinela(JSON.stringify(m))).toBe(false);
  });

  it('texto abaixo de mínimo maior que 1 e número acima do máximo dizem Valor fora do limite', () => {
    const s = z.object({ codigo: z.string().min(3), dias: z.number().int().max(365) });
    expect(camposDe(s, { codigo: 'ab', dias: 366 }).m.corpo.campos).toEqual([
      { campo: 'codigo', mensagem: 'Valor fora do limite.' },
      { campo: 'dias', mensagem: 'Valor fora do limite.' },
    ]);
  });

  it('mensagem de superRefine escrita por nós passa, com o caminho dado na issue', () => {
    const s = z.object({ opcao: z.string() }).superRefine((v, ctx) => {
      if (v.opcao !== 'A' && v.opcao !== 'B') {
        ctx.addIssue({ code: 'custom', path: ['opcao'], message: 'Use só A ou B.' });
      }
    });
    const { m } = camposDe(s, { opcao: SENTINELAS.texto });
    expect(m.corpo.campos).toEqual([{ campo: 'opcao', mensagem: 'Use só A ou B.' }]);
    expect(contemSentinela(JSON.stringify(m))).toBe(false);
  });

  it('nenhuma mensagem devolvida é a mensagem padrão do Zod em inglês', () => {
    const s = z.object({
      a: z.string(),
      b: z.number(),
      c: z.enum(['x', 'y']),
      d: z.uuid(),
      e: z.boolean(),
      f: z.array(z.string()).min(1),
    });
    const { erro, m } = camposDe(s, { b: 'x', c: 'z', d: 'nao-e-uuid', e: 'sim', f: [] });
    const doZod = erro.issues.map((i) => i.message);
    for (const c of m.corpo.campos ?? []) expect(doZod).not.toContain(c.mensagem);
    expect(m.corpo.campos?.map((c) => c.mensagem)).toEqual([
      'Campo obrigatório.',
      'Valor inválido.',
      'Valor inválido.',
      'Valor inválido.',
      'Valor inválido.',
      'Informe ao menos um item.',
    ]);
  });
});
