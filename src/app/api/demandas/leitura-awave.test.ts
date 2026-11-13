// RF-07 e IN-08 (T05): o Awave lê só o que criou, em seis chaves, sem oráculo. Demanda de outro autor responde
// exatamente como a que não existe (ADR-23, D-16; item obrigatório da revisão da T05, parecer 3 da 06-T03-revisao).
// Banco, rota e token reais (Testcontainers); o token só nasce em tempo de teste e nunca vai a mensagem de expect.
// Cada caso usa a própria demanda do Awave: o arquivo não depende de ordem (padrão técnico, seção 7).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as rotaDemanda from './[id]/route';
import { definirDepsParaTeste, type Deps } from '../../../lib/deps';
import { MENSAGEM_NAO_ENCONTRADO } from '../../../lib/erros';
import { substituirDestinoDoLog } from '../../../lib/log';
import { obterDemanda } from '../../../modules/demandas/consultas';
import { criarDemandaSchema } from '../../../modules/demandas/schemas';
import { alterarDemanda, criarDemanda } from '../../../modules/demandas/servico';
import { criarEspecificacaoSchema } from '../../../modules/especificacoes/schemas';
import { criarEspecificacao } from '../../../modules/especificacoes/servico';
import { MENSAGENS_ACESSO } from '../../../modules/acesso/mensagens';
import { novoBanco, type BancoDeTeste } from '../../../../test/banco';
import { criarDepsDeTeste } from '../../../../test/deps';
import { inserirDemandaDeIntegracao, tokenDeIntegracao } from '../../../../test/integracoes';
import { chamarRota } from '../../../../test/requisicao';

let b: BancoDeTeste;
let deps: Deps;
let token: string;
let tokenConstruir: string;
const pessoa = { tipo: 'pessoa', usuarioId: 'p1', nome: 'Pessoa Ficticia', papel: 'cto' } as const;
// 0.4.0 (T09 do DEC-DEM-20261111-0017-v1, G5): sete chaves, com `andamento` (RF-10).
const SETE = ['andamento', 'atualizadaEm', 'criadaEm', 'id', 'status', 'tipo', 'titulo'];
const INEXISTENTE = 'DEM-20261022-9999';
let idPessoa: string;
let idAgente: string;

const ler = (id: string, bearer = token) =>
  chamarRota(rotaDemanda.GET, { caminho: `/api/demandas/${id}`, params: { id }, bearer, semOrigin: true });

// Tudo o que a resposta mostra a quem chama: status, todos os cabeçalhos e o corpo em bytes.
async function fotoDaResposta(r: Response) {
  return { status: r.status, cabecalhos: [...r.headers.entries()].sort(), corpo: await r.text() };
}

// A linha de log por requisição, sem os campos que variam a cada chamada (hora e duração).
async function lerComLog(id: string) {
  const linhas: string[] = [];
  substituirDestinoDoLog({ write: (l) => void linhas.push(l) });
  try {
    const foto = await fotoDaResposta(await ler(id));
    const log = linhas.map((l) => {
      const { time, ms, ...resto } = JSON.parse(l) as Record<string, unknown>;
      void time;
      void ms;
      return resto;
    });
    return { foto, log };
  } finally {
    substituirDestinoDoLog(null);
  }
}

beforeAll(async () => {
  b = await novoBanco();
  deps = await criarDepsDeTeste(b);
  definirDepsParaTeste(deps);
  token = await tokenDeIntegracao(deps, 'awave');
  tokenConstruir = await tokenDeIntegracao(deps, 'construir');
  const entrada = criarDemandaSchema.parse({ titulo: 'Demanda de pessoa (fictício)', tipo: 'melhoria', solicitanteNome: 'Pessoa Ficticia' });
  idPessoa = (await criarDemanda(deps, pessoa, entrada)).id;
  idAgente = (await criarDemanda(deps, { tipo: 'agente', agente: 'orquestrador', prefixoToken: null }, entrada)).id;
});
afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  await deps.fila.parar();
  await b.fechar();
});

describe('RF-07 e IN-08: o Awave lê a própria demanda', () => {
  it('CA-07.1: 200 com exatamente as seis chaves e os valores da demanda', async () => {
    const id = 'DEM-20261022-0901';
    await inserirDemandaDeIntegracao(b, {
      id,
      titulo: 'Relatório semanal fictício',
      criadaEm: deps.relogio.agora(),
      contexto: 'SENTINELA-CONTEXTO-9d1e',
      descricaoProblema: 'SENTINELA-DESCRICAO-9d1e',
    });
    const r = await ler(id);
    expect(r.status).toBe(200);
    const texto = await r.text();
    const corpo = JSON.parse(texto) as Record<string, unknown>;
    expect(Object.keys(corpo).sort()).toEqual(SETE);
    expect(corpo).toEqual({
      id,
      titulo: 'Relatório semanal fictício',
      tipo: 'melhoria',
      status: 'nova',
      criadaEm: deps.relogio.agora().toISOString(),
      atualizadaEm: deps.relogio.agora().toISOString(),
      andamento: null,
    });
    // Nada do texto livre, do solicitante, da autoria nem do rascunho.
    expect(texto).not.toMatch(/SENTINELA|Awave|integracao|rascunho|outro/);
  });

  it('CA-07.3: vê título e status atuais, e nenhum texto livre, nome ou versão', async () => {
    const id = 'DEM-20261022-0902';
    await inserirDemandaDeIntegracao(b, {
      id,
      titulo: 'Relatório semanal fictício',
      criadaEm: deps.relogio.agora(),
      contexto: 'SENTINELA-CONTEXTO-9d1e',
      descricaoProblema: 'SENTINELA-DESCRICAO-9d1e',
    });
    await alterarDemanda(deps, pessoa, id, { titulo: 'Relatório semanal revisado (fictício)', status: 'em_analise', solicitanteNome: 'SENTINELA-NOME-9d1e' });
    const r = await ler(id);
    expect(r.status).toBe(200);
    const texto = await r.text();
    expect(JSON.parse(texto)).toMatchObject({ titulo: 'Relatório semanal revisado (fictício)', status: 'em_analise' });
    expect(texto).not.toMatch(/SENTINELA/);
  });

  it('M-1: o título sai minimizado pelo solicitante atual', async () => {
    const id = 'DEM-20261022-0903';
    await inserirDemandaDeIntegracao(b, { id, criadaEm: deps.relogio.agora() });
    await alterarDemanda(deps, pessoa, id, { solicitanteNome: 'Maria Ficticia', titulo: 'Relatório para Maria Ficticia (fictício)' });
    const r = await ler(id);
    expect(r.status).toBe(200);
    const corpo = (await r.json()) as { titulo: string };
    expect(corpo.titulo).not.toContain('Maria Ficticia');
    expect(corpo.titulo).toContain('(fictício)');
  });

  it('a ESP gravada por pessoa na demanda do Awave não aparece para ele', async () => {
    const id = 'DEM-20261022-0904';
    await inserirDemandaDeIntegracao(b, { id, criadaEm: deps.relogio.agora() });
    const esp = criarEspecificacaoSchema.parse({
      descricaoObjetiva: 'SENTINELA-ESP-9d1e',
      escopoInclui: ['Escopo fictício'],
      sistemaAlvo: 'meu-sistema',
      repositorioDestino: 'wsssistemas2626-crypto/meu-sistema',
      criteriosAceitePreliminares: ['Critério fictício'],
      definicaoDePronto: ['pnpm test verde'],
    });
    const criada = await criarEspecificacao(deps, pessoa, id, esp);
    const r = await ler(id);
    expect(r.status).toBe(200);
    const texto = await r.text();
    expect(Object.keys(JSON.parse(texto) as object).sort()).toEqual(SETE);
    expect(texto).not.toMatch(/SENTINELA/);
    expect(texto.includes(criada.id)).toBe(false);
  });
});

describe('IN-08, ADR-23 e D-16: sem oráculo de existência', () => {
  it('as demandas de pessoa e de agente existem (controle: o 404 abaixo não é de id errado)', async () => {
    await expect(obterDemanda(deps.db, idPessoa)).resolves.toMatchObject({ id: idPessoa });
    await expect(obterDemanda(deps.db, idAgente)).resolves.toMatchObject({ id: idAgente });
    await expect(obterDemanda(deps.db, INEXISTENTE)).rejects.toMatchObject({ codigo: 'nao_encontrado' });
  });

  it('CA-07.2: demanda de pessoa e de agente dão 404 igual, byte a byte, ao de um id que não existe', async () => {
    const esperado = await fotoDaResposta(await ler(INEXISTENTE));
    expect(esperado.status).toBe(404);
    expect(JSON.parse(esperado.corpo)).toEqual({ erro: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO });
    for (const id of [idPessoa, idAgente]) expect(await fotoDaResposta(await ler(id)), id).toEqual(esperado);
  });

  it('a linha de log da recusa é a mesma para demanda de outro autor e para id inexistente', async () => {
    const inexistente = await lerComLog(INEXISTENTE);
    expect(inexistente.log).toEqual([
      { level: 30, evento: 'requisicao', metodo: 'GET', rota: '/api/demandas/[id]', status: 404, atorTipo: 'integracao', codigoErro: 'nao_encontrado' },
    ]);
    for (const id of [idPessoa, idAgente]) {
      const deOutro = await lerComLog(id);
      expect(deOutro.foto, id).toEqual(inexistente.foto);
      expect(deOutro.log, id).toEqual(inexistente.log);
    }
  });

  it('demanda do Awave em status final continua legível só por ele, e a de outro autor em status final continua 404', async () => {
    const id = 'DEM-20261022-0905';
    await inserirDemandaDeIntegracao(b, { id, criadaEm: deps.relogio.agora(), status: 'encerrada' });
    const r = await ler(id);
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ id, status: 'encerrada' });
    const entrada = criarDemandaSchema.parse({ titulo: 'Outra demanda de pessoa (fictício)', tipo: 'melhoria', solicitanteNome: 'Pessoa Ficticia' });
    const outra = (await criarDemanda(deps, pessoa, entrada)).id;
    await alterarDemanda(deps, pessoa, outra, { status: 'encerrada' });
    const esperado = await fotoDaResposta(await ler(INEXISTENTE));
    expect(await fotoDaResposta(await ler(outra))).toEqual(esperado);
  });

  it('o token do /construir continua 403 na leitura de demanda, inclusive na do Awave', async () => {
    const id = 'DEM-20261022-0906';
    await inserirDemandaDeIntegracao(b, { id, criadaEm: deps.relogio.agora() });
    for (const alvo of [id, idPessoa, INEXISTENTE]) {
      const r = await ler(alvo, tokenConstruir);
      expect(r.status, alvo).toBe(403);
      expect(await r.json(), alvo).toEqual({ erro: 'sem_permissao', mensagem: MENSAGENS_ACESSO.sem_permissao });
    }
  });
});
