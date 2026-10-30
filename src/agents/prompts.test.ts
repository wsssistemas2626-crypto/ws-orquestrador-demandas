// Prompts dos quatro agentes (T26; RF-16, ADR-09, ADR-10, C-24). Sem banco nem provedor: só o texto, o exemplo de saída
// e o schema que a execução de agente (T27) usa para validar a resposta.
import { describe, expect, it } from 'vitest';
import { NIVEIS_APROVACAO } from '../db/schema/decisao';
import { LINHAS_SERVICO, TIPOS_DEMANDA, URGENCIAS } from '../db/schema/demandas';
import { NIVEIS_RISCO } from '../db/schema/versoes';
import { AGENTES, type Agente } from '../modules/acesso/ator';
import { SCHEMA_DE_SAIDA, saidaOrquestradorSchema } from '../modules/agentes/schemas';
import { encontrarDadosPessoais } from '../modules/dados-pessoais/detectores';
import { criarDemandaSchema } from '../modules/demandas/schemas';
import { criarEspecificacaoSchema, validarCamposDeConstrucao } from '../modules/especificacoes/schemas';
import { criarPacoteDecisaoSchema } from '../modules/pacotes-decisao/schemas';
import { criarParecerRiscoSchema } from '../modules/pareceres-risco/schemas';
import { DONOS_REPOSITORIO } from '../vendor/construir/pedido.mjs';
import { PROMPTS } from './index';

describe.each(AGENTES)('prompt do agente %s', (agente) => {
  const p = PROMPTS[agente];
  it('ADR-09: o exemplo de saída passa no schema da rota', () => {
    expect(SCHEMA_DE_SAIDA[agente].safeParse(p.exemploSaida).success).toBe(true);
  });
  it('C-24: maxTokens ≤ 8.000 e instrução sobre o bloco <dados>', () => {
    expect(p.maxTokens).toBeLessThanOrEqual(8000);
    expect(p.sistema).toContain('<dados>');
    expect(p.sistema).toMatch(/não (são|é) instruç/i);
  });
  it('sem dado pessoal nem nome de pessoa', () => {
    expect(encontrarDadosPessoais({ s: p.sistema, e: p.exemploSaida }, ['e-mail', 'telefone', 'CPF', 'CNPJ'])).toEqual([]);
    expect(p.sistema).not.toMatch(/Débora|Fabiano|Marcus/);
  });

  // Além do plano: o que a T25 recusa antes de chamar e o que o prompt promete ao modelo.
  it('maxTokens é inteiro de 1 a 8.000 (a T25 recusa o resto antes de chamar)', () => {
    expect(Number.isSafeInteger(p.maxTokens)).toBe(true);
    expect(p.maxTokens).toBeGreaterThanOrEqual(1);
  });
  it('pede só o JSON e traz o exemplo inteiro no texto', () => {
    expect(p.sistema).toMatch(/apenas um objeto JSON/i);
    expect(p.sistema).toContain(JSON.stringify(p.exemploSaida, null, 2));
  });
  it('diz que o resultado é rascunho que uma pessoa revisa e que o agente não aprova nem envia nada', () => {
    expect(p.sistema).toMatch(/rascunho/i);
    expect(p.sistema).toMatch(/uma pessoa revisa/i);
    expect(p.sistema).toMatch(/não aprova/i);
    expect(p.sistema).toMatch(/não envia/i);
  });
  it('o exemplo de saída não traz campo de autoria, status nem id (C-11, C-25)', () => {
    const chaves = Object.keys(p.exemploSaida as Record<string, unknown>);
    for (const proibida of ['autorTipo', 'autorId', 'rascunhoAgente', 'responsavel', 'status', 'statusDecisao', 'id', 'demandaId', 'versao']) {
      expect(chaves).not.toContain(proibida);
    }
  });
  it('o exemplo de saída é dado fictício e não cita marcador de sentinela nem domínio real', () => {
    const texto = JSON.stringify(p.exemploSaida);
    expect(texto).not.toMatch(/SENTINELA|https?:\/\//);
  });
  it('o texto do prompt é estável e congelado (o mesmo objeto em toda chamada)', () => {
    expect(Object.isFrozen(p)).toBe(true);
    expect(PROMPTS[agente]).toBe(p);
  });
});

it('PROMPTS e SCHEMA_DE_SAIDA têm exatamente os quatro agentes', () => {
  expect(Object.keys(PROMPTS).sort()).toEqual([...AGENTES].sort());
  expect(Object.keys(SCHEMA_DE_SAIDA).sort()).toEqual([...AGENTES].sort());
});

it('SCHEMA_DE_SAIDA usa os mesmos schemas da API (ADR-09)', () => {
  const esperado: Record<Exclude<Agente, 'orquestrador'>, unknown> = {
    insumo_tecnico: criarEspecificacaoSchema,
    risco: criarParecerRiscoSchema,
    consolidacao: criarPacoteDecisaoSchema,
  };
  for (const [agente, schema] of Object.entries(esperado)) expect(SCHEMA_DE_SAIDA[agente as Agente]).toBe(schema);
  expect(SCHEMA_DE_SAIDA.orquestrador).toBe(saidaOrquestradorSchema);
});

it('a saída do orquestrador não tem os campos do solicitante', () => {
  const r = SCHEMA_DE_SAIDA.orquestrador.parse({
    titulo: 'T',
    tipo: 'bug',
    solicitanteNome: 'X',
    anexos: [{ tipo: 'url', referencia: 'https://exemplo.test' }],
  });
  expect(r).not.toHaveProperty('solicitanteNome');
  expect(r).not.toHaveProperty('anexos');
});

describe('saidaOrquestradorSchema', () => {
  it('descarta também o papel do solicitante e campo de autoria (C-11, C-25)', () => {
    const r = saidaOrquestradorSchema.parse({ titulo: 'T', tipo: 'bug', solicitantePapel: 'outro', autorTipo: 'pessoa', status: 'aprovada' });
    for (const k of ['solicitantePapel', 'autorTipo', 'status']) expect(r).not.toHaveProperty(k);
  });
  it('perguntasParaSolicitante e flags nascem vazias', () => {
    expect(saidaOrquestradorSchema.parse({ titulo: 'T', tipo: 'bug' })).toMatchObject({ perguntasParaSolicitante: [], flags: [] });
  });
  it('mantém os campos de classificação da demanda', () => {
    const entrada = {
      titulo: 'T',
      tipo: 'melhoria',
      linhaServicoProvavel: 'automacao_integracao',
      urgencia: 'media',
      justificativaUrgencia: 'J',
      contexto: 'C',
      descricaoProblema: 'D',
      impactoPercebido: 'I',
    };
    expect(saidaOrquestradorSchema.parse(entrada)).toMatchObject(entrada);
  });
  it('recusa título vazio e tipo fora da lista, como a rota da demanda', () => {
    expect(saidaOrquestradorSchema.safeParse({ titulo: ' ', tipo: 'bug' }).success).toBe(false);
    expect(saidaOrquestradorSchema.safeParse({ titulo: 'T', tipo: 'outro' }).success).toBe(false);
    expect(criarDemandaSchema.safeParse({ titulo: 'T', tipo: 'outro', solicitanteNome: 'X' }).success).toBe(false);
  });
  it('flags: no máximo 20, cada uma com até 200 caracteres e sem vazio', () => {
    expect(saidaOrquestradorSchema.safeParse({ titulo: 'T', tipo: 'bug', flags: Array.from({ length: 21 }, () => 'f') }).success).toBe(false);
    expect(saidaOrquestradorSchema.safeParse({ titulo: 'T', tipo: 'bug', flags: ['x'.repeat(201)] }).success).toBe(false);
    expect(saidaOrquestradorSchema.safeParse({ titulo: 'T', tipo: 'bug', flags: ['  '] }).success).toBe(false);
    expect(saidaOrquestradorSchema.safeParse({ titulo: 'T', tipo: 'bug', flags: Array.from({ length: 20 }, () => 'x'.repeat(200)) }).success).toBe(true);
  });
  it('perguntasParaSolicitante segue o limite das listas da API (50 itens)', () => {
    expect(saidaOrquestradorSchema.safeParse({ titulo: 'T', tipo: 'bug', perguntasParaSolicitante: Array.from({ length: 51 }, () => 'p') }).success).toBe(false);
  });
});

describe('o prompt diz ao modelo os valores que o schema aceita', () => {
  it('orquestrador: tipo, linha de serviço e urgência', () => {
    for (const v of [...TIPOS_DEMANDA, ...LINHAS_SERVICO, ...URGENCIAS]) expect(PROMPTS.orquestrador.sistema).toContain(v);
  });
  it('risco: os três níveis', () => {
    for (const v of NIVEIS_RISCO) expect(PROMPTS.risco.sistema).toContain(v);
  });
  it('consolidação: os dois níveis de aprovação', () => {
    for (const v of NIVEIS_APROVACAO) expect(PROMPTS.consolidacao.sistema).toContain(v);
  });
  it('insumo técnico: as contas aceitas para o repositório destino', () => {
    for (const v of DONOS_REPOSITORIO) expect(PROMPTS.insumo_tecnico.sistema).toContain(v);
  });
});

describe('regras de cada agente', () => {
  it('insumo técnico: o exemplo passa também na regra dos campos de construção, para tipo construído e para estudo', () => {
    const e = criarEspecificacaoSchema.parse(PROMPTS.insumo_tecnico.exemploSaida);
    expect(validarCamposDeConstrucao('melhoria', e)).toEqual([]);
    expect(validarCamposDeConstrucao('estudo', e)).toEqual([]);
  });
  it('insumo técnico: dúvida em aberto vai para duvidasEmAberto, sem inventar o que falta', () => {
    expect(PROMPTS.insumo_tecnico.sistema).toContain('duvidasEmAberto');
    expect(PROMPTS.insumo_tecnico.sistema).toMatch(/não invente/i);
  });
  it('orquestrador: não devolve nome, papel nem anexo do solicitante, e a pergunta não sai sem aprovação humana', () => {
    expect(PROMPTS.orquestrador.sistema).toContain('perguntasParaSolicitante');
    expect(PROMPTS.orquestrador.sistema).toMatch(/não inclua nome/i);
    expect(PROMPTS.orquestrador.sistema).toMatch(/nenhuma pergunta é enviada/i);
  });
  it('risco: cita a administradora e o jurídico, sem nome de pessoa', () => {
    expect(PROMPTS.risco.sistema).toContain('envolverJuridicoOuAdministradoraQuando');
    expect(PROMPTS.risco.sistema).toContain('a administradora');
    expect(PROMPTS.risco.sistema).toMatch(/jurídic/i);
  });
  it('consolidação: duas opções, A e B, e a recomendação não é decisão', () => {
    expect(PROMPTS.consolidacao.sistema).toContain('opcaoA');
    expect(PROMPTS.consolidacao.sistema).toContain('opcaoB');
    expect(PROMPTS.consolidacao.sistema).toMatch(/recomendação não é decisão/i);
  });
  it('nenhum prompt manda usar ferramenta nem acessar link (C-24)', () => {
    for (const a of AGENTES) expect(PROMPTS[a].sistema).toMatch(/não acesse link/i);
  });
});
