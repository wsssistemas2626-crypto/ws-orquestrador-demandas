// Bordas dos schemas de demanda (06-T15-testes, qa-automacao): os limites exatos da RNF-04 e da C-18, a lista inteira
// de campos de autoria da G3.9 (C-11) e as mensagens que a CA-03.3 devolve. Sem banco. Dados só fictícios.
import { describe, expect, it } from 'vitest';
import { deZod } from '../../lib/erros';
import { alterarDemandaSchema, criarDemandaSchema, filtroDemandasSchema } from './schemas';

const base = { titulo: 'Pedidos duplicados', tipo: 'bug', solicitanteNome: 'Pessoa Ficticia' };
// Link com exatamente `n` caracteres.
const linkCom = (n: number) => {
  const prefixo = 'https://exemplo.test/';
  return prefixo + 'a'.repeat(n - prefixo.length);
};

// G3.9: nenhum schema de entrada aceita estes campos; o servidor tira a autoria do ator.
const CAMPOS_DE_AUTORIA = [
  'autorTipo',
  'autorId',
  'rascunhoAgente',
  'responsavel',
  'papelAprovacao',
  'registradaPor',
  'nomeAprovador',
  'aprovadorNome',
  'aprovadorPapel',
  'decididaPor',
] as const;

describe('C-18 e RNF-04 na borda exata', () => {
  it('anexo url com 2.048 caracteres passa; com 2.049, não', () => {
    expect(linkCom(2048)).toHaveLength(2048);
    expect(criarDemandaSchema.safeParse({ ...base, anexos: [{ tipo: 'url', referencia: linkCom(2048) }] }).success).toBe(true);
    const r = criarDemandaSchema.safeParse({ ...base, anexos: [{ tipo: 'url', referencia: linkCom(2049) }] });
    expect(r.success).toBe(false);
    expect(deZod(r.error!).extras.campos).toContainEqual({ campo: 'anexos.0.referencia', mensagem: 'Este campo aceita até 2.048 caracteres.' });
  });

  it('o limite de 2.048 vale também para o anexo do tipo arquivo', () => {
    expect(criarDemandaSchema.safeParse({ ...base, anexos: [{ tipo: 'arquivo', referencia: 'a'.repeat(2048) }] }).success).toBe(true);
    expect(criarDemandaSchema.safeParse({ ...base, anexos: [{ tipo: 'arquivo', referencia: 'a'.repeat(2049) }] }).success).toBe(false);
  });

  it('link com espaço nas pontas é aparado e aceito; o valor gravado vem sem o espaço', () => {
    const r = criarDemandaSchema.parse({ ...base, anexos: [{ tipo: 'url', referencia: '  https://exemplo.test/a  ' }] });
    expect(r.anexos).toEqual([{ tipo: 'url', referencia: 'https://exemplo.test/a' }]);
  });

  it('RNF-04: título e cada texto livre com 10.000 passam; com 10.001, não, com a mensagem do limite', () => {
    for (const campo of ['titulo', 'justificativaUrgencia', 'contexto', 'descricaoProblema', 'impactoPercebido']) {
      expect(criarDemandaSchema.safeParse({ ...base, [campo]: 'a'.repeat(10_000) }).success, campo).toBe(true);
      const r = criarDemandaSchema.safeParse({ ...base, [campo]: 'a'.repeat(10_001) });
      expect(r.success, campo).toBe(false);
      expect(deZod(r.error!).extras.campos, campo).toEqual([{ campo, mensagem: 'Este campo aceita até 10.000 caracteres.' }]);
    }
  });

  it('RNF-04: descrição do anexo até 10.000; lista de 51 anexos responde com a mensagem do limite', () => {
    expect(criarDemandaSchema.safeParse({ ...base, anexos: [{ tipo: 'arquivo', referencia: 'a.pdf', descricao: 'a'.repeat(10_000) }] }).success).toBe(true);
    expect(criarDemandaSchema.safeParse({ ...base, anexos: [{ tipo: 'arquivo', referencia: 'a.pdf', descricao: 'a'.repeat(10_001) }] }).success).toBe(false);
    const r = criarDemandaSchema.safeParse({ ...base, anexos: Array.from({ length: 51 }, () => ({ tipo: 'arquivo', referencia: 'a.pdf' })) });
    expect(deZod(r.error!).extras.campos).toEqual([{ campo: 'anexos', mensagem: 'Limite de 50 itens atingido.' }]);
  });

  it('RNF-04 na alteração: 50 anexos passam, 51 não; texto de 10.001 não', () => {
    expect(alterarDemandaSchema.safeParse({ anexos: Array.from({ length: 50 }, () => ({ tipo: 'arquivo', referencia: 'a.pdf' })) }).success).toBe(true);
    expect(alterarDemandaSchema.safeParse({ anexos: Array.from({ length: 51 }, () => ({ tipo: 'arquivo', referencia: 'a.pdf' })) }).success).toBe(false);
    for (const campo of ['titulo', 'justificativaUrgencia', 'contexto', 'descricaoProblema', 'impactoPercebido'])
      expect(alterarDemandaSchema.safeParse({ [campo]: 'a'.repeat(10_001) }).success, campo).toBe(false);
    expect(alterarDemandaSchema.safeParse({ solicitanteNome: 'a'.repeat(201) }).success).toBe(false);
  });

  it('RNF-04 e CA-06.2: limit 100 passa; 101 não', () => {
    expect(filtroDemandasSchema.parse({ limit: '100' }).limit).toBe(100);
    expect(filtroDemandasSchema.parse({ limit: '1' }).limit).toBe(1);
    expect(filtroDemandasSchema.safeParse({ limit: '101' }).success).toBe(false);
  });
});

describe('C-11: nenhum campo de autoria da G3.9 passa pelos schemas', () => {
  const comAutoria = Object.fromEntries(CAMPOS_DE_AUTORIA.map((c) => [c, 'SENTINELA-AUTORIA']));

  it('criarDemandaSchema descarta todos, e também id, status, datas e dúvidas', () => {
    const r = criarDemandaSchema.parse({
      ...base,
      ...comAutoria,
      id: 'DEM-20991231-9999',
      status: 'aprovada',
      criadaEm: '2020-01-01T00:00:00Z',
      atualizadaEm: '2020-01-01T00:00:00Z',
      duvidasEntrada: ['SENTINELA-DUVIDA'],
    });
    expect(Object.keys(r).sort()).toEqual(['anexos', 'solicitanteNome', 'tipo', 'titulo']);
    expect(JSON.stringify(r)).not.toContain('SENTINELA');
  });

  it('alterarDemandaSchema descarta todos; só o que é campo editável ou status fica', () => {
    const r = alterarDemandaSchema.parse({ ...comAutoria, status: 'em_analise', urgencia: 'alta', criadaEm: '2020-01-01T00:00:00Z', duvidasEntrada: ['x'] });
    expect(r).toEqual({ status: 'em_analise', urgencia: 'alta' });
  });
});

describe('CA-03.3: a resposta lista todos os campos inválidos de uma vez', () => {
  it('corpo vazio lista os três obrigatórios; os de texto com "Campo obrigatório."', () => {
    const r = criarDemandaSchema.safeParse({});
    expect(r.success).toBe(false);
    const campos = deZod(r.error!).extras.campos!;
    expect(campos.map((c) => c.campo).sort()).toEqual(['solicitanteNome', 'tipo', 'titulo']);
    for (const campo of ['titulo', 'solicitanteNome']) expect(campos.find((c) => c.campo === campo)!.mensagem, campo).toBe('Campo obrigatório.');
    // A enumeração ausente sai hoje como "Valor inválido." pelo mapeador da T03 (o Zod 4 não a marca como ausente);
    // aqui vale só que a mensagem é nossa, em pt-BR.
    expect(campos.find((c) => c.campo === 'tipo')!.mensagem).toMatch(/^(Campo obrigatório|Valor inválido)\.$/);
  });

  it('corpo que não é objeto é recusado sem citar o valor recebido', () => {
    for (const corpo of [null, 'SENTINELA-CORPO', 42, ['SENTINELA-LISTA']]) {
      const r = criarDemandaSchema.safeParse(corpo);
      expect(r.success, JSON.stringify(corpo)).toBe(false);
      expect(JSON.stringify(deZod(r.error!).extras)).not.toContain('SENTINELA');
    }
  });
});
