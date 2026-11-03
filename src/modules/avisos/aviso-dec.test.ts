// Aviso por e-mail de pacote pronto para decisão (T30): RF-25 (CA-25.1 a CA-25.3), C-21, C-22, C-38, RNF-14, ADR-06 e
// ADR-08. Banco real (Testcontainers), fila do pg-boss sobre o mesmo banco, relógio fixo (RNF-15) e enviador falso:
// nenhum e-mail sai da máquina. Dados só fictícios. Cada teste anda um dia no relógio, para o limite por hora (C-36) de
// um não pesar no outro.
import * as Sentry from '@sentry/node';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { CONFIG_TESTE } from '../../../test/auth';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { criarDepsDeTeste } from '../../../test/deps';
import { EnviadorFalso } from '../../../test/enviador-falso';
import { URL_BASE } from '../../../test/requisicao';
import { SENTINELAS, contemSentinela } from '../../../test/sentinelas';
import { criarPessoa } from '../../../test/sessao';
import { POST as POST_DEC } from '../../app/api/demandas/[id]/pacotes-decisao/route';
import { user } from '../../db/schema';
import { comTransacao } from '../../db/transacao';
import { definirDepsParaTeste, type Deps } from '../../lib/deps';
import { FILAS } from '../../lib/fila';
import { substituirDestinoDoLog } from '../../lib/log';
import { relogioFixo, type RelogioFixo } from '../../lib/relogio';
import { iniciarSentry } from '../../lib/sentry';
import type { AtorPessoa } from '../acesso/ator';
import { criarDemandaSchema } from '../demandas/schemas';
import { entradaSchema, registrarEntrada } from '../demandas/entrada';
import { criarDemanda } from '../demandas/servico';
import { criarEspecificacaoSchema } from '../especificacoes/schemas';
import { criarEspecificacao } from '../especificacoes/servico';
import { criarPacoteDecisao } from '../pacotes-decisao/criar';
import { criarPacoteDecisaoSchema } from '../pacotes-decisao/schemas';
import { criarParecerRiscoSchema } from '../pareceres-risco/schemas';
import { criarParecerRisco } from '../pareceres-risco/servico';
import {
  AvisoNaoEnviado,
  TENTATIVAS_AVISO,
  agendarAviso,
  enviarAviso,
  montarEmailDoAviso,
  type DepsAviso,
} from './aviso-dec';
import { EnviadorResend, EnviadorSemProvedor, ErroEnvioEmail, criarEnviador } from './enviador';

const cto: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-aviso-cto', nome: 'Pessoa Ficticia CTO', papel: 'cto' };
const REMETENTE = 'avisos@exemplo.test';
const DESTINATARIO = 'decisao@exemplo.test';

const decValido = criarPacoteDecisaoSchema.parse({
  resumoExecutivo: 'Corrigir a importação de pedidos duplicados',
  opcaoA: { descricao: 'Corrigir no importador' },
  opcaoB: { descricao: 'Refazer a integração' },
  nivelAprovacaoRequerido: 'cto',
});

// Transporte falso do Sentry para o arquivo todo: o Sentry é iniciado uma vez só.
const eventosSentry: string[] = [];
const transporte = () => ({
  send: async (env: unknown) => {
    eventosSentry.push(JSON.stringify(env));
    return {};
  },
  flush: async () => true,
});

let b: BancoDeTeste;
let deps: Deps;
let relogio: RelogioFixo;
let enviador: EnviadorFalso;
let dia = 0;

beforeAll(async () => {
  b = await novoBanco();
  relogio = relogioFixo('2026-10-22T12:00:00Z');
  deps = await criarDepsDeTeste(b, { relogio });
  await b.db.insert(user).values({ id: cto.usuarioId, name: cto.nome, email: 'aviso-cto@exemplo.test', papel: 'cto' });
  iniciarSentry({ dsn: 'https://chave@sentry.exemplo.test/1', transporte });
});
afterAll(async () => {
  definirDepsParaTeste(null);
  await deps.fila.parar();
  await b.fechar();
});
beforeEach(() => {
  relogio.definir('2026-10-22T12:00:00Z');
  relogio.avancar(++dia * 86_400_000);
  enviador = new EnviadorFalso();
  eventosSentry.length = 0;
});

const depsAviso = (extra: Partial<DepsAviso> = {}): DepsAviso => ({
  pool: b.poolApp,
  relogio,
  config: { ...CONFIG_TESTE, emailRemetente: REMETENTE, emailAvisoDecisao: DESTINATARIO },
  enviador,
  ...extra,
});

const linhaAviso = async (decId: string) =>
  (await b.poolMigrator.query('select status, tentativas, id_provedor, enviado_em, atualizado_em from aviso_email where pacote_decisao_id = $1', [decId])).rows[0];
const jobsDoAviso = async (decId: string) =>
  (await b.poolMigrator.query(`select data, singleton_key from pgboss.job where name = $1 and data->>'decId' = $2`, [FILAS.avisoDecPronto, decId])).rows;

async function demandaPronta(extra: Record<string, unknown> = {}): Promise<string> {
  const d = await criarDemanda(deps, cto, criarDemandaSchema.parse({ titulo: 'Pedidos duplicados', tipo: 'bug', solicitanteNome: 'Pessoa Ficticia', ...extra }));
  await criarEspecificacao(
    deps,
    cto,
    d.id,
    criarEspecificacaoSchema.parse({
      descricaoObjetiva: 'Corrigir pedidos duplicados',
      escopoInclui: ['Importação'],
      sistemaAlvo: 'meu-sistema',
      repositorioDestino: 'wsssistemas2626-crypto/meu-sistema',
      criteriosAceitePreliminares: ['Critério fictício'],
      definicaoDePronto: ['pnpm test verde'],
    }),
  );
  await criarParecerRisco(deps, cto, d.id, criarParecerRiscoSchema.parse({ riscoTecnicoNivel: 'baixo', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo' }));
  return d.id;
}

async function decPronto(): Promise<{ decId: string; demandaId: string }> {
  const demandaId = await demandaPronta();
  const dec = await criarPacoteDecisao(deps, cto, demandaId, decValido);
  return { decId: dec.id, demandaId };
}

describe('agendarAviso: o DEC criado deixa o aviso pendente e o job na mesma transação', () => {
  it('criar o DEC grava aviso_email pendente e o job aviso.dec-pronto só com { decId } (C-22)', async () => {
    const { decId } = await decPronto();
    expect(await linhaAviso(decId)).toEqual({ status: 'pendente', tentativas: 0, id_provedor: null, enviado_em: null, atualizado_em: relogio.agora() });
    expect(await jobsDoAviso(decId)).toEqual([{ data: { decId }, singleton_key: decId }]);
  });

  it('ADR-06: o rollback da criação do DEC desfaz o aviso e o job', async () => {
    const demandaId = await demandaPronta();
    let decId = '';
    await expect(
      comTransacao(b.poolApp, async (t) => {
        decId = (await criarPacoteDecisao(deps, cto, demandaId, decValido, t)).id;
        throw new Error('desfaz');
      }),
    ).rejects.toThrow('desfaz');
    expect(decId).toMatch(/^DEC-/);
    expect(await linhaAviso(decId)).toBeUndefined();
    expect(await jobsDoAviso(decId)).toEqual([]);
  });

  it('cada versão do DEC tem o próprio aviso', async () => {
    const demandaId = await demandaPronta();
    const v1 = await criarPacoteDecisao(deps, cto, demandaId, decValido);
    const v2 = await criarPacoteDecisao(deps, cto, demandaId, decValido);
    expect((await linhaAviso(v1.id))?.status).toBe('pendente');
    expect((await linhaAviso(v2.id))?.status).toBe('pendente');
    expect(await jobsDoAviso(v2.id)).toHaveLength(1);
  });

  it('agendar de novo o mesmo DEC não cria segundo aviso nem muda o que já foi enviado', async () => {
    const { decId } = await decPronto();
    expect(await enviarAviso(depsAviso(), decId)).toBe('enviado');
    await comTransacao(b.poolApp, (t) => agendarAviso(t, deps, decId));
    expect((await linhaAviso(decId))?.status).toBe('enviado');
    expect((await b.poolMigrator.query('select count(*)::int as n from aviso_email where pacote_decisao_id = $1', [decId])).rows[0].n).toBe(1);
  });

  it('id fora do formato não chega ao banco nem à fila', async () => {
    await expect(comTransacao(b.poolApp, (t) => agendarAviso(t, deps, 'DEC-DEM-20261022-0001-v1\n'))).rejects.toThrow(RangeError);
    await expect(comTransacao(b.poolApp, (t) => agendarAviso(t, deps, 'ESP-DEM-20261022-0001-v1'))).rejects.toThrow(RangeError);
  });

  it('sem a fila nas dependências (serviço chamado sem ela), o aviso fica pendente e nenhum job é criado', async () => {
    const demandaId = await demandaPronta();
    const dec = await criarPacoteDecisao({ db: b.db, pool: b.poolApp, relogio }, cto, demandaId, decValido);
    expect((await linhaAviso(dec.id))?.status).toBe('pendente');
    expect(await jobsDoAviso(dec.id)).toEqual([]);
  });
});

describe('enviarAviso', () => {
  it('CA-25.1: DEC criado → o worker manda um e-mail com o id do DEC e o link', async () => {
    const { decId, demandaId } = await decPronto();
    expect(await enviarAviso(depsAviso(), decId)).toBe('enviado');
    expect(enviador.enviados).toHaveLength(1);
    const e = enviador.enviados[0]!;
    expect(e.texto).toContain(decId);
    expect(e.texto).toContain(`${CONFIG_TESTE.urlBase}/pacotes-decisao/${decId}`);
    expect(e).toMatchObject({ para: DESTINATARIO, de: REMETENTE, assunto: `Pacote ${decId} pronto para decisão`, chaveIdempotencia: `dec-${decId}` });
    expect(e.texto).toContain(`Demanda: ${demandaId}`);
    expect(await linhaAviso(decId)).toEqual({ status: 'enviado', tentativas: 1, id_provedor: 'email-falso-1', enviado_em: relogio.agora(), atualizado_em: relogio.agora() });
  });

  it('CA-25.2: o mesmo aviso duas vezes → um e-mail só', async () => {
    const { decId } = await decPronto();
    // O mesmo job enfileirado de novo (por exemplo, por um reenvio manual da fila).
    await comTransacao(b.poolApp, ({ executor }) => deps.fila.enviar(executor, FILAS.avisoDecPronto, { decId }));
    expect(await enviarAviso(depsAviso(), decId)).toBe('enviado');
    expect(await enviarAviso(depsAviso(), decId)).toBe('ja_enviado');
    expect(enviador.enviados).toHaveLength(1);
    expect(enviador.chamadas).toBe(1);
  });

  it('CA-25.2, ao mesmo tempo: dois envios simultâneos do mesmo aviso → um e-mail só', async () => {
    const { decId } = await decPronto();
    // O envio demora: os dois chegam juntos à leitura do aviso, e só a trava da linha segura o segundo.
    const lento: DepsAviso['enviador'] = {
      enviar: async (e) => {
        await new Promise((r) => setTimeout(r, 300));
        return enviador.enviar(e);
      },
    };
    const r = await Promise.all([enviarAviso(depsAviso({ enviador: lento }), decId), enviarAviso(depsAviso({ enviador: lento }), decId)]);
    expect(r.sort()).toEqual(['enviado', 'ja_enviado']);
    expect(enviador.enviados).toHaveLength(1);
    expect(enviador.chamadas).toBe(1);
  });

  it('CA-25.3: o corpo não tem título, texto bruto nem nome do solicitante', async () => {
    const r = await registrarEntrada(
      deps,
      cto,
      entradaSchema.parse({
        modo: 'manual',
        titulo: SENTINELAS.texto,
        tipo: 'bug',
        solicitanteNome: SENTINELAS.nome,
        contexto: `Contato: ${SENTINELAS.email}, ${SENTINELAS.telefone}`,
        texto: `De: ${SENTINELAS.nome} <${SENTINELAS.email}>\n${SENTINELAS.texto}`,
        origem: { canal: 'email', referencia: SENTINELAS.email },
      }),
    );
    if (r.tipo !== 'demanda') throw new Error('esperava a demanda');
    const demandaId = r.demanda.id;
    await criarEspecificacao(
      deps,
      cto,
      demandaId,
      criarEspecificacaoSchema.parse({
        descricaoObjetiva: SENTINELAS.texto,
        escopoInclui: ['x'],
        sistemaAlvo: 'meu-sistema',
        repositorioDestino: 'wsssistemas2626-crypto/meu-sistema',
        criteriosAceitePreliminares: ['c'],
        definicaoDePronto: ['p'],
      }),
    );
    await criarParecerRisco(deps, cto, demandaId, criarParecerRiscoSchema.parse({ riscoTecnicoNivel: 'baixo', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo' }));
    const dec = await criarPacoteDecisao(deps, cto, demandaId, criarPacoteDecisaoSchema.parse({ ...decValido, resumoExecutivo: SENTINELAS.texto }));
    expect(await enviarAviso(depsAviso(), dec.id)).toBe('enviado');
    const e = enviador.enviados[0]!;
    expect(contemSentinela(JSON.stringify(e))).toBe(false);
    expect(e.texto).not.toContain('Pedidos duplicados');
    // O que vai: o id do DEC, o id da demanda, o link e os textos fixos da E01.
    expect(e.texto).toContain(dec.id);
    expect(e.texto).toContain(demandaId);
  });

  it('C-38: o link começa pela origem configurada, mesmo com Host diferente na requisição', async () => {
    const demandaId = await demandaPronta();
    const { cookie } = await criarPessoa(deps, { papel: 'cto' });
    definirDepsParaTeste(deps);
    try {
      const req = new Request(`http://atacante.test/api/demandas/${demandaId}/pacotes-decisao`, {
        method: 'POST',
        headers: {
          origin: URL_BASE,
          cookie,
          'content-type': 'application/json',
          'x-real-ip': '192.0.2.250',
          'x-forwarded-host': 'atacante.test',
          'x-forwarded-proto': 'https',
          forwarded: 'host=atacante.test;proto=https',
        },
        body: JSON.stringify(decValido),
      });
      const resposta = await POST_DEC(req, { params: Promise.resolve({ id: demandaId }) });
      expect(resposta.status).toBe(201);
      const { id: decId } = (await resposta.json()) as { id: string };
      expect(await enviarAviso(depsAviso(), decId)).toBe('enviado');
      const e = enviador.enviados[0]!;
      const link = `${CONFIG_TESTE.urlBase}/pacotes-decisao/${decId}`;
      expect(e.texto).toContain(`Abrir a tela de decisão: ${link}`);
      expect(e.html).toContain(`href="${link}"`);
      expect(`${e.texto}${e.html}`).not.toContain('atacante.test');
      // Destinatário só da configuração (C-38): nem o e-mail da conta que criou o DEC, nem outro.
      expect(e.para).toBe(DESTINATARIO);
    } finally {
      definirDepsParaTeste(null);
    }
  });

  it('sem RESEND_API_KEY → sem_provedor, nada enviado', async () => {
    const { decId } = await decPronto();
    const semChave = criarEnviador({ ...CONFIG_TESTE, emailRemetente: REMETENTE, emailAvisoDecisao: DESTINATARIO });
    expect(semChave).toBeInstanceOf(EnviadorSemProvedor);
    expect(await enviarAviso(depsAviso({ enviador: semChave }), decId)).toBe('sem_provedor');
    expect(await linhaAviso(decId)).toMatchObject({ status: 'sem_provedor', tentativas: 0, enviado_em: null });
    // De novo: continua sem_provedor, e nada é enviado.
    expect(await enviarAviso(depsAviso({ enviador: semChave }), decId)).toBe('sem_provedor');
    expect(await enviarAviso(depsAviso(), decId)).toBe('sem_provedor');
    expect(enviador.chamadas).toBe(0);
  });

  it('sem destinatário ou sem remetente na configuração → sem_provedor, sem chamar o enviador', async () => {
    const a = await decPronto();
    expect(await enviarAviso(depsAviso({ config: { ...CONFIG_TESTE, emailRemetente: REMETENTE } }), a.decId)).toBe('sem_provedor');
    const c = await decPronto();
    expect(await enviarAviso(depsAviso({ config: { ...CONFIG_TESTE, emailAvisoDecisao: DESTINATARIO } }), c.decId)).toBe('sem_provedor');
    expect(enviador.chamadas).toBe(0);
  });

  it(`falha passageira: tenta de novo até ${TENTATIVAS_AVISO} vezes e envia na que der certo`, async () => {
    const { decId } = await decPronto();
    enviador.falhasAntes = 2;
    await expect(enviarAviso(depsAviso(), decId)).rejects.toBeInstanceOf(AvisoNaoEnviado);
    expect(await linhaAviso(decId)).toMatchObject({ status: 'pendente', tentativas: 1 });
    await expect(enviarAviso(depsAviso(), decId)).rejects.toMatchObject({ tentativa: 2 });
    expect(await enviarAviso(depsAviso(), decId)).toBe('enviado');
    expect(await linhaAviso(decId)).toMatchObject({ status: 'enviado', tentativas: 3 });
    expect(enviador.enviados).toHaveLength(1);
  });

  it('esgotou as tentativas → aviso falhou, Sentry sem dado pessoal, e nada é enviado depois', async () => {
    const { decId } = await decPronto();
    enviador.falhasAntes = 10;
    const linhas: string[] = [];
    substituirDestinoDoLog({ write: (l) => void linhas.push(l) });
    try {
      for (let i = 1; i < TENTATIVAS_AVISO; i++) await expect(enviarAviso(depsAviso(), decId)).rejects.toMatchObject({ tentativa: i });
      expect(await enviarAviso(depsAviso(), decId)).toBe('falhou');
    } finally {
      substituirDestinoDoLog(null);
    }
    expect(await linhaAviso(decId)).toMatchObject({ status: 'falhou', tentativas: TENTATIVAS_AVISO, enviado_em: null });
    await Sentry.flush(2000);
    expect(eventosSentry.join('')).toContain('ErroEnvioEmail transitorio');
    expect(eventosSentry.join('')).not.toContain(DESTINATARIO);
    // O log de cada falha leva só ids, tentativa e o erro reduzido.
    const registros = linhas.map((l) => JSON.parse(l) as Record<string, unknown>);
    expect(registros.map((r) => r.evento)).toEqual(['aviso_email_falha', 'aviso_email_falha', 'aviso_email_falhou']);
    expect(registros[2]).toMatchObject({ level: 50, tentativa: TENTATIVAS_AVISO, status: 'falhou', erro: { classe: 'ErroEnvioEmail', code: 'transitorio' } });
    expect(linhas.join('\n')).not.toContain(DESTINATARIO);
    expect(linhas.join('\n')).not.toContain(REMETENTE);
    // Já falhou: um job atrasado não tenta de novo.
    const chamadas = enviador.chamadas;
    expect(await enviarAviso(depsAviso(), decId)).toBe('falhou');
    expect(enviador.chamadas).toBe(chamadas);
  });

  it('DEC sem aviso (ou que não existe) → sem_aviso, sem chamar o enviador', async () => {
    expect(await enviarAviso(depsAviso(), 'DEC-DEM-20261022-9999-v1')).toBe('sem_aviso');
    expect(await enviarAviso(depsAviso(), 'não é um id')).toBe('sem_aviso');
    expect(enviador.chamadas).toBe(0);
  });

  it('erro inesperado do enviador (que não é de envio) também conta como tentativa, sem a mensagem no log', async () => {
    const { decId } = await decPronto();
    const quebrado = { enviar: async () => Promise.reject(new Error(`quebrou ${SENTINELAS.email}`)) };
    const linhas: string[] = [];
    substituirDestinoDoLog({ write: (l) => void linhas.push(l) });
    try {
      await expect(enviarAviso(depsAviso({ enviador: quebrado }), decId)).rejects.toBeInstanceOf(AvisoNaoEnviado);
    } finally {
      substituirDestinoDoLog(null);
    }
    expect(await linhaAviso(decId)).toMatchObject({ status: 'pendente', tentativas: 1 });
    expect(contemSentinela(linhas.join('\n'))).toBe(false);
  });
});

// M-03 (DEC-DEM-20261103-0006-v1): a recusa definitiva do provedor (4xx que não é 429) falha na hora; o 429 e o 5xx
// continuam tentados de novo; o erro inesperado fora do enviador conta a tentativa, numa transação própria.
describe('enviarAviso: recusa definitiva, falha passageira e erro inesperado (M-03)', () => {
  const capturar = () => {
    const linhas: string[] = [];
    substituirDestinoDoLog({ write: (l) => void linhas.push(l) });
    return linhas;
  };
  const resendCom = (status: number) => new EnviadorResend({ chave: 'chave-ficticia-de-teste', fetch: async () => new Response('{}', { status }) });

  it('enviador que recusa (ErroEnvioEmail recusado) → falhou na 1ª, sem relançar, com log e Sentry; a 2ª não chama o enviador', async () => {
    const { decId } = await decPronto();
    let chamadas = 0;
    const recusa: DepsAviso['enviador'] = {
      enviar: async () => {
        chamadas += 1;
        throw new ErroEnvioEmail('recusado');
      },
    };
    const linhas = capturar();
    try {
      expect(await enviarAviso(depsAviso({ enviador: recusa }), decId)).toBe('falhou');
    } finally {
      substituirDestinoDoLog(null);
    }
    expect(await linhaAviso(decId)).toMatchObject({ status: 'falhou', tentativas: 1, enviado_em: null });
    const registros = linhas.map((l) => JSON.parse(l) as Record<string, unknown>);
    expect(registros.map((r) => r.evento)).toEqual(['aviso_email_falhou']);
    expect(registros[0]).toMatchObject({ level: 50, tentativa: 1, status: 'falhou', erro: { classe: 'ErroEnvioEmail', code: 'recusado' } });
    await Sentry.flush(2000);
    expect(eventosSentry).toHaveLength(1);
    expect(eventosSentry[0]).toContain('ErroEnvioEmail recusado');
    expect(eventosSentry[0]).toContain('aviso_email_falhou');
    expect(await enviarAviso(depsAviso({ enviador: recusa }), decId)).toBe('falhou');
    expect(chamadas).toBe(1);
  });

  it.each([400, 403, 422])('EnviadorResend com resposta %i → falhou na 1ª, sem nova tentativa', async (status) => {
    const { decId } = await decPronto();
    expect(await enviarAviso(depsAviso({ enviador: resendCom(status) }), decId)).toBe('falhou');
    expect(await linhaAviso(decId)).toMatchObject({ status: 'falhou', tentativas: 1 });
  });

  it.each([408, 409, 429, 500, 503])('EnviadorResend com resposta %i → continua pendente, conta a tentativa e pede nova tentativa', async (status) => {
    const { decId } = await decPronto();
    await expect(enviarAviso(depsAviso({ enviador: resendCom(status) }), decId)).rejects.toBeInstanceOf(AvisoNaoEnviado);
    expect(await linhaAviso(decId)).toMatchObject({ status: 'pendente', tentativas: 1 });
  });

  // 0.1.6: o 409 do Resend é passageiro (mesma Idempotency-Key ao mesmo tempo); se persistir, gasta as 3 tentativas.
  it('EnviadorResend com 409 nas três tentativas → pendente na 1ª e na 2ª, falhou na 3ª', async () => {
    const { decId } = await decPronto();
    const linhas = capturar();
    try {
      await expect(enviarAviso(depsAviso({ enviador: resendCom(409) }), decId)).rejects.toMatchObject({ tentativa: 1 });
      expect(await linhaAviso(decId)).toMatchObject({ status: 'pendente', tentativas: 1 });
      await expect(enviarAviso(depsAviso({ enviador: resendCom(409) }), decId)).rejects.toMatchObject({ tentativa: 2 });
      expect(await enviarAviso(depsAviso({ enviador: resendCom(409) }), decId)).toBe('falhou');
    } finally {
      substituirDestinoDoLog(null);
    }
    expect(await linhaAviso(decId)).toMatchObject({ status: 'falhou', tentativas: TENTATIVAS_AVISO });
    const registros = linhas.map((l) => JSON.parse(l) as Record<string, unknown>);
    expect(registros.map((r) => r.evento)).toEqual(['aviso_email_falha', 'aviso_email_falha', 'aviso_email_falhou']);
    expect(registros[2]).toMatchObject({ erro: { classe: 'ErroEnvioEmail', code: 'transitorio' } });
  });

  it.each([401, 410, 413])('EnviadorResend com resposta %i → falhou na 1ª (segue recusa definitiva)', async (status) => {
    const { decId } = await decPronto();
    expect(await enviarAviso(depsAviso({ enviador: resendCom(status) }), decId)).toBe('falhou');
    expect(await linhaAviso(decId)).toMatchObject({ status: 'falhou', tentativas: 1 });
  });

  it('erro inesperado fora do enviador (URL base inválida) → conta 1, 2 e 3, termina falhou com Sentry uma vez, sem chamar o enviador', async () => {
    const { decId } = await decPronto();
    const quebrada = depsAviso({ config: { ...CONFIG_TESTE, urlBase: 'ftp://orquestrador.exemplo.test', emailRemetente: REMETENTE, emailAvisoDecisao: DESTINATARIO } });
    const linhas = capturar();
    try {
      await expect(enviarAviso(quebrada, decId)).rejects.toMatchObject({ tentativa: 1 });
      expect(await linhaAviso(decId)).toMatchObject({ status: 'pendente', tentativas: 1 });
      await expect(enviarAviso(quebrada, decId)).rejects.toBeInstanceOf(AvisoNaoEnviado);
      expect(await linhaAviso(decId)).toMatchObject({ status: 'pendente', tentativas: 2 });
      await Sentry.flush(2000);
      expect(eventosSentry).toHaveLength(0);
      expect(await enviarAviso(quebrada, decId)).toBe('falhou');
    } finally {
      substituirDestinoDoLog(null);
    }
    expect(await linhaAviso(decId)).toMatchObject({ status: 'falhou', tentativas: 3, enviado_em: null });
    expect(enviador.chamadas).toBe(0);
    await Sentry.flush(2000);
    expect(eventosSentry).toHaveLength(1);
    expect(eventosSentry[0]).toContain('aviso_email_falhou');
    const registros = linhas.map((l) => JSON.parse(l) as Record<string, unknown>);
    expect(registros.map((r) => r.evento)).toEqual(['aviso_email_falha', 'aviso_email_falha', 'aviso_email_falhou']);
    expect(registros[2]).toMatchObject({ level: 50, tentativa: 3, status: 'falhou', erro: { classe: 'RangeError' } });
    const saida = `${linhas.join('\n')}${eventosSentry.join('')}`;
    for (const v of ['ftp://', 'orquestrador.exemplo.test', REMETENTE, DESTINATARIO, 'URL base']) expect(saida).not.toContain(v);
    // Já falhou: um job atrasado não conta de novo.
    expect(await enviarAviso(quebrada, decId)).toBe('falhou');
    expect(await linhaAviso(decId)).toMatchObject({ status: 'falhou', tentativas: 3 });
  });

  // 04-regressao (qa-automacao): a contagem do erro inesperado sob concorrência. Quatro jobs do mesmo DEC ao mesmo tempo
  // (reenvio manual sem singletonKey, ou um job atrasado): a trava da linha faz cada um contar uma vez, sem perder nem
  // repetir contagem, e o 4º encontra o aviso já falhou. O resultado não depende da ordem em que as quatro rodam.
  it('quatro execuções simultâneas com erro inesperado → exatamente 3 tentativas, falhou, Sentry uma vez e duas novas tentativas pedidas', async () => {
    const { decId } = await decPronto();
    const quebrada = depsAviso({ config: { ...CONFIG_TESTE, urlBase: 'ftp://orquestrador.exemplo.test', emailRemetente: REMETENTE, emailAvisoDecisao: DESTINATARIO } });
    const linhas = capturar();
    let resultados: PromiseSettledResult<string>[];
    try {
      resultados = await Promise.allSettled([1, 2, 3, 4].map(() => enviarAviso(quebrada, decId)));
    } finally {
      substituirDestinoDoLog(null);
    }
    expect(await linhaAviso(decId)).toMatchObject({ status: 'falhou', tentativas: 3, enviado_em: null });
    const rejeitados = resultados.filter((r): r is PromiseRejectedResult => r.status === 'rejected').map((r) => r.reason as unknown);
    for (const e of rejeitados) expect(e).toBeInstanceOf(AvisoNaoEnviado);
    expect(rejeitados.map((e) => (e as AvisoNaoEnviado).tentativa).sort()).toEqual([1, 2]);
    expect(resultados.filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled').map((r) => r.value)).toEqual(['falhou', 'falhou']);
    expect(enviador.chamadas).toBe(0);
    await Sentry.flush(2000);
    expect(eventosSentry).toHaveLength(1);
    expect(eventosSentry[0]).toContain('aviso_email_falhou');
    const eventos = linhas.map((l) => (JSON.parse(l) as Record<string, unknown>).evento).sort();
    expect(eventos).toEqual(['aviso_email_falha', 'aviso_email_falha', 'aviso_email_falhou']);
  });

  it('erro inesperado com o aviso já enviado → ja_enviado, sem contar', async () => {
    const { decId } = await decPronto();
    expect(await enviarAviso(depsAviso(), decId)).toBe('enviado');
    const quebrada = depsAviso({ config: { ...CONFIG_TESTE, urlBase: 'ftp://orquestrador.exemplo.test', emailRemetente: REMETENTE, emailAvisoDecisao: DESTINATARIO } });
    expect(await enviarAviso(quebrada, decId)).toBe('ja_enviado');
    expect(await linhaAviso(decId)).toMatchObject({ status: 'enviado', tentativas: 1 });
  });
});

describe('montarEmailDoAviso (texto da E01)', () => {
  const DEC = 'DEC-DEM-20261022-0042-v1';
  const DEM = 'DEM-20261022-0042';

  it('assunto, texto e HTML da E01, com o link para a tela de decisão', () => {
    const e = montarEmailDoAviso(DEC, DEM, 'https://orquestrador.exemplo.test', DESTINATARIO, REMETENTE);
    expect(e.assunto).toBe('Pacote DEC-DEM-20261022-0042-v1 pronto para decisão');
    expect(e.texto).toBe(
      [
        'Há um pacote de decisão pronto no WS Orquestrador de Demandas.',
        '',
        'Pacote: DEC-DEM-20261022-0042-v1',
        'Demanda: DEM-20261022-0042',
        '',
        'Abrir a tela de decisão: https://orquestrador.exemplo.test/pacotes-decisao/DEC-DEM-20261022-0042-v1',
        '',
        'Este aviso não traz o conteúdo da demanda. Para ler e decidir, entre no painel com sua senha e o código de verificação.',
        '',
      ].join('\n'),
    );
    expect(e.html).toContain('<html lang="pt-BR">');
    expect(e.html).toContain('<a href="https://orquestrador.exemplo.test/pacotes-decisao/DEC-DEM-20261022-0042-v1">Abrir a tela de decisão</a>');
    expect(e.html).not.toMatch(/<img/i);
    expect(e.html).not.toMatch(/clique aqui/i);
    expect(e).toMatchObject({ para: DESTINATARIO, de: REMETENTE, chaveIdempotencia: `dec-${DEC}` });
  });

  it('a URL base vale só pela origem: caminho, query e fragmento ficam de fora', () => {
    const e = montarEmailDoAviso(DEC, DEM, 'https://orquestrador.exemplo.test/outro/caminho?x=1#y', DESTINATARIO, REMETENTE);
    expect(e.texto).toContain('Abrir a tela de decisão: https://orquestrador.exemplo.test/pacotes-decisao/DEC-DEM-20261022-0042-v1');
  });

  it.each([
    ['id do DEC com quebra de linha', `${DEC}\nBcc: x@exemplo.test`, DEM],
    ['id do DEC com HTML', `${DEC}"><script>`, DEM],
    ['id de ESP no lugar do DEC', 'ESP-DEM-20261022-0042-v1', DEM],
    ['demanda que não é a do DEC', DEC, 'DEM-20261022-0043'],
    ['demanda fora do formato', DEC, 'DEM-x'],
  ])('C-38: %s → recusado antes de montar o corpo', (_caso, dec, dem) => {
    expect(() => montarEmailDoAviso(dec, dem, CONFIG_TESTE.urlBase, DESTINATARIO, REMETENTE)).toThrow(RangeError);
  });

  it('URL base que não é http(s) é recusada', () => {
    expect(() => montarEmailDoAviso(DEC, DEM, 'javascript:alert(1)', DESTINATARIO, REMETENTE)).toThrow(RangeError);
  });
});
