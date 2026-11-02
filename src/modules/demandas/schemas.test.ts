// Schemas de entrada da demanda (RF-03, CA-03.3, CA-06.2, C-11, C-18, RNF-04). Sem banco. Dados só fictícios.
import { describe, expect, it } from 'vitest';
import { deZod } from '../../lib/erros';
import { alterarDemandaSchema, criarDemandaSchema, filtroDemandasSchema, listaDeTextos, textoLivre } from './schemas';

const base = { titulo: 'T', tipo: 'bug', solicitanteNome: 'Pessoa Ficticia' };

describe('criarDemandaSchema', () => {
  it('CA-03.3: tipo "outro" e falta de titulo são recusados', () => {
    const r = criarDemandaSchema.safeParse({ tipo: 'outro', solicitanteNome: 'Pessoa Ficticia' });
    expect(r.success).toBe(false);
    expect(r.error!.issues.map((i) => i.path.join('.')).sort()).toEqual(['tipo', 'titulo']);
  });

  it('CA-03.3: o erro mapeado lista os campos com mensagem pt-BR, sem o valor recebido', () => {
    const r = criarDemandaSchema.safeParse({ tipo: 'SENTINELA-TIPO', solicitanteNome: '   ', titulo: '' });
    expect(r.success).toBe(false);
    const e = deZod(r.error!);
    expect(e.extras.campos!.map((c) => c.campo).sort()).toEqual(['solicitanteNome', 'tipo', 'titulo']);
    expect(JSON.stringify(e.extras)).not.toContain('SENTINELA');
    expect(e.extras.campos!.find((c) => c.campo === 'titulo')!.mensagem).toBe('Campo obrigatório.');
  });

  it('os três obrigatórios bastam; anexos vira lista vazia', () => {
    expect(criarDemandaSchema.parse(base)).toEqual({ ...base, anexos: [] });
  });

  it('apara espaços nas pontas', () => {
    expect(criarDemandaSchema.parse({ ...base, titulo: '  Pedidos duplicados  ', solicitanteNome: ' Pessoa Ficticia ' })).toMatchObject({
      titulo: 'Pedidos duplicados',
      solicitanteNome: 'Pessoa Ficticia',
    });
  });

  it('enumerações fora da lista são recusadas', () => {
    for (const campo of ['solicitantePapel', 'linhaServicoProvavel', 'urgencia'])
      expect(criarDemandaSchema.safeParse({ ...base, [campo]: 'qualquer' }).success, campo).toBe(false);
    expect(criarDemandaSchema.parse({ ...base, solicitantePapel: 'financeiro', linhaServicoProvavel: 'indefinida', urgencia: 'alta' })).toMatchObject({
      solicitantePapel: 'financeiro',
      linhaServicoProvavel: 'indefinida',
      urgencia: 'alta',
    });
  });

  it('C-11: campos de autoria do body são descartados', () => {
    const r = criarDemandaSchema.parse({ ...base, autorTipo: 'pessoa', autorId: 'x', rascunhoAgente: false, responsavel: 'x', status: 'aprovada', id: 'DEM-20261022-0001' });
    expect(r).not.toHaveProperty('autorTipo');
    expect(r).not.toHaveProperty('autorId');
    expect(r).not.toHaveProperty('rascunhoAgente');
    expect(r).not.toHaveProperty('responsavel');
    expect(r).not.toHaveProperty('status');
    expect(r).not.toHaveProperty('id');
  });

  it('C-18: anexo javascript: é recusado; http e https aceitos; até 2.048 caracteres', () => {
    expect(criarDemandaSchema.safeParse({ ...base, anexos: [{ tipo: 'url', referencia: 'javascript:alert(1)' }] }).success).toBe(false);
    expect(criarDemandaSchema.safeParse({ ...base, anexos: [{ tipo: 'url', referencia: 'https://exemplo.test/a' }] }).success).toBe(true);
    expect(criarDemandaSchema.safeParse({ ...base, anexos: [{ tipo: 'url', referencia: 'http://exemplo.test/a' }] }).success).toBe(true);
    expect(criarDemandaSchema.safeParse({ ...base, anexos: [{ tipo: 'url', referencia: `https://exemplo.test/${'a'.repeat(2048)}` }] }).success).toBe(false);
  });

  it('C-18: outros esquemas e texto que não é link são recusados no anexo url, com o campo e a mensagem', () => {
    for (const referencia of ['data:text/html,<b>x</b>', 'ftp://exemplo.test/a', 'file:///etc/passwd', 'vbscript:msgbox', 'exemplo.test/a', ' JavaScript:alert(1)']) {
      const r = criarDemandaSchema.safeParse({ ...base, anexos: [{ tipo: 'url', referencia }] });
      expect(r.success, referencia).toBe(false);
      expect(deZod(r.error!).extras.campos).toEqual([{ campo: 'anexos.0.referencia', mensagem: 'Use um link que comece com http:// ou https://.' }]);
    }
  });

  it('anexo arquivo aceita a referência como texto; tipo de anexo fora da lista é recusado', () => {
    expect(criarDemandaSchema.safeParse({ ...base, anexos: [{ tipo: 'arquivo', referencia: 'proposta-ficticia.pdf', descricao: 'Proposta' }] }).success).toBe(true);
    expect(criarDemandaSchema.safeParse({ ...base, anexos: [{ tipo: 'upload', referencia: 'a.pdf' }] }).success).toBe(false);
    expect(criarDemandaSchema.safeParse({ ...base, anexos: [{ tipo: 'arquivo', referencia: '  ' }] }).success).toBe(false);
  });

  it('CA-06.2 vale também para o nome: solicitanteNome até 200 caracteres', () => {
    expect(criarDemandaSchema.safeParse({ ...base, solicitanteNome: 'a'.repeat(200) }).success).toBe(true);
    expect(criarDemandaSchema.safeParse({ ...base, solicitanteNome: 'a'.repeat(201) }).success).toBe(false);
  });

  it('RNF-04: campo de texto até 10.000 e lista até 50 itens', () => {
    expect(criarDemandaSchema.safeParse({ ...base, contexto: 'a'.repeat(10_000) }).success).toBe(true);
    expect(criarDemandaSchema.safeParse({ ...base, contexto: 'a'.repeat(10_001) }).success).toBe(false);
    expect(criarDemandaSchema.safeParse({ ...base, titulo: 'a'.repeat(10_001) }).success).toBe(false);
    expect(criarDemandaSchema.safeParse({ ...base, anexos: Array.from({ length: 50 }, () => ({ tipo: 'arquivo', referencia: 'a.pdf' })) }).success).toBe(true);
    expect(criarDemandaSchema.safeParse({ ...base, anexos: Array.from({ length: 51 }, () => ({ tipo: 'arquivo', referencia: 'a.pdf' })) }).success).toBe(false);
  });
});

describe('textoLivre e listaDeTextos', () => {
  it('textoLivre apara e aceita até 10.000', () => {
    expect(textoLivre.parse('  a  ')).toBe('a');
    expect(textoLivre.safeParse('a'.repeat(10_001)).success).toBe(false);
  });

  it('listaDeTextos: itens não vazios, até 10.000 cada, até 50 itens; texto corrido não é lista', () => {
    expect(listaDeTextos.parse([' a ', 'b'])).toEqual(['a', 'b']);
    expect(listaDeTextos.safeParse(['a', '  ']).success).toBe(false);
    expect(listaDeTextos.safeParse(['a'.repeat(10_001)]).success).toBe(false);
    expect(listaDeTextos.safeParse(Array.from({ length: 50 }, () => 'a')).success).toBe(true);
    expect(listaDeTextos.safeParse(Array.from({ length: 51 }, () => 'a')).success).toBe(false);
    expect(listaDeTextos.safeParse('tudo').success).toBe(false);
  });
});

describe('alterarDemandaSchema', () => {
  it('todos os campos são opcionais; status entra', () => {
    expect(alterarDemandaSchema.parse({})).toEqual({});
    expect(alterarDemandaSchema.parse({ status: 'em_analise' })).toEqual({ status: 'em_analise' });
    expect(alterarDemandaSchema.safeParse({ status: 'arquivada' }).success).toBe(false);
  });

  it('campo opcional da demanda pode ser limpo com null; obrigatório, não', () => {
    expect(alterarDemandaSchema.parse({ contexto: null, urgencia: null, solicitantePapel: null })).toEqual({ contexto: null, urgencia: null, solicitantePapel: null });
    for (const campo of ['titulo', 'tipo', 'solicitanteNome', 'anexos', 'status'])
      expect(alterarDemandaSchema.safeParse({ [campo]: null }).success, campo).toBe(false);
    expect(alterarDemandaSchema.safeParse({ titulo: '  ' }).success).toBe(false);
  });

  it('as mesmas regras de criar: C-18, RNF-04 e C-11', () => {
    expect(alterarDemandaSchema.safeParse({ anexos: [{ tipo: 'url', referencia: 'javascript:alert(1)' }] }).success).toBe(false);
    expect(alterarDemandaSchema.safeParse({ impactoPercebido: 'a'.repeat(10_001) }).success).toBe(false);
    const r = alterarDemandaSchema.parse({ titulo: 'x', autorTipo: 'agente', rascunhoAgente: true, atualizadaEm: '2020-01-01' });
    expect(Object.keys(r)).toEqual(['titulo']);
  });
});

describe('filtroDemandasSchema', () => {
  it('padrões: limit 20, offset 0; números chegam como texto da query', () => {
    expect(filtroDemandasSchema.parse({})).toEqual({ limit: 20, offset: 0 });
    expect(filtroDemandasSchema.parse({ limit: '100', offset: '40', tipo: 'bug', status: 'nova', linhaServicoProvavel: 'sob_medida' })).toEqual({
      limit: 100,
      offset: 40,
      tipo: 'bug',
      status: 'nova',
      linhaServicoProvavel: 'sob_medida',
    });
  });

  it('CA-06.2: limit acima de 100 é recusado', () => {
    expect(filtroDemandasSchema.safeParse({ limit: '500' }).success).toBe(false);
  });

  it('limit 0, negativo, fracionário ou texto; offset negativo; filtro fora da lista ou repetido: recusados', () => {
    for (const q of [{ limit: '0' }, { limit: '-1' }, { limit: '1.5' }, { limit: 'abc' }, { offset: '-1' }, { tipo: 'outro' }, { status: 'talvez' }, { linhaServicoProvavel: 'x' }, { tipo: ['bug', 'melhoria'] }])
      expect(filtroDemandasSchema.safeParse(q).success, JSON.stringify(q)).toBe(false);
  });
});
