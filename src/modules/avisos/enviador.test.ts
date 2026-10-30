// Enviador de e-mail (ADR-08; 02, seção 5; C-21, C-27, RNF-14). Nenhum teste chama a rede: o EnviadorResend recebe um
// `fetch` falso, e a suíte roda sem a chave do Resend no ambiente. A chave e os endereços daqui são fictícios.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CONFIG_TESTE } from '../../../test/auth';
import { SENTINELAS, contemSentinela } from '../../../test/sentinelas';
import { criarLogger } from '../../lib/log';
import {
  ENDERECO_RESEND,
  EnviadorResend,
  EnviadorSemProvedor,
  ErroEnvioEmail,
  TEMPO_LIMITE_EMAIL_MS,
  criarEnviador,
  type Email,
  type EnviadorEmail,
} from './enviador';

const CHAVE = 'chave-resend-ficticia';
const DEC_ID = 'DEC-DEM-20261022-0042-v1';

type Enviado = { url: string; init: RequestInit; corpo: Record<string, unknown>; cabecalhos: Headers };

const email = (extra: Partial<Email> = {}): Email => ({
  para: 'decisao@exemplo.test',
  de: 'avisos@exemplo.test',
  assunto: `Pacote ${DEC_ID} pronto para decisão`,
  texto: `Pacote: ${DEC_ID}`,
  html: `<p>Pacote: ${DEC_ID}</p>`,
  chaveIdempotencia: `dec-${DEC_ID}`,
  ...extra,
});

function fetchQueResponde(resposta: () => Response | Promise<Response>) {
  const enviados: Enviado[] = [];
  const fetchFalso: typeof fetch = async (url, init) => {
    enviados.push({ url: String(url), init: init!, corpo: JSON.parse(String(init!.body)) as Record<string, unknown>, cabecalhos: new Headers(init!.headers) });
    return resposta();
  };
  return { enviados, fetchFalso };
}

const respostaJson = (status: number, corpo: unknown) => new Response(JSON.stringify(corpo), { status, headers: { 'content-type': 'application/json' } });

async function erroDe(promessa: Promise<unknown>): Promise<unknown> {
  try {
    await promessa;
  } catch (e) {
    return e;
  }
  throw new Error('a promessa deveria ter falhado');
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('EnviadorResend', () => {
  it('EnviadorResend manda o cabeçalho Idempotency-Key dec-<DEC-id>, com fetch injetado e sem rede', async () => {
    const { enviados, fetchFalso } = fetchQueResponde(() => respostaJson(200, { id: 'id-resend-ficticio' }));
    const r = await new EnviadorResend({ chave: CHAVE, fetch: fetchFalso }).enviar(email());
    expect(r).toEqual({ id: 'id-resend-ficticio' });
    expect(enviados).toHaveLength(1);
    const [e] = enviados;
    expect(e!.url).toBe('https://api.resend.com/emails');
    expect(e!.init.method).toBe('POST');
    expect(e!.init.redirect).toBe('error');
    expect(e!.cabecalhos.get('idempotency-key')).toBe(`dec-${DEC_ID}`);
    expect(e!.cabecalhos.get('authorization')).toBe(`Bearer ${CHAVE}`);
    expect(e!.cabecalhos.get('content-type')).toBe('application/json');
    // Só os campos do e-mail; o destinatário vai numa lista de um só.
    expect(e!.corpo).toEqual({
      from: 'avisos@exemplo.test',
      to: ['decisao@exemplo.test'],
      subject: `Pacote ${DEC_ID} pronto para decisão`,
      text: `Pacote: ${DEC_ID}`,
      html: `<p>Pacote: ${DEC_ID}</p>`,
    });
  });

  it('o endereço é fixo: uma variável de ambiente de URL base não desvia a chave para outro host', async () => {
    vi.stubEnv('RESEND_BASE_URL', 'https://atacante.test');
    const { enviados, fetchFalso } = fetchQueResponde(() => respostaJson(200, { id: 'x' }));
    await new EnviadorResend({ chave: CHAVE, fetch: fetchFalso }).enviar(email());
    expect(enviados[0]!.url).toBe(ENDERECO_RESEND);
  });

  it('sem fetch injetado, usa o fetch global (aqui substituído, sem rede)', async () => {
    const espiao = vi.spyOn(globalThis, 'fetch').mockResolvedValue(respostaJson(200, { id: 'id-global' }));
    expect(await new EnviadorResend({ chave: CHAVE }).enviar(email())).toEqual({ id: 'id-global' });
    expect(espiao).toHaveBeenCalledTimes(1);
  });

  it('chave vazia não constrói o enviador', () => {
    expect(() => new EnviadorResend({ chave: '   ' })).toThrow(RangeError);
  });

  it(`tempo limite de ${TEMPO_LIMITE_EMAIL_MS} ms: o sinal aborta e o erro é transitório`, async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    let sinal: AbortSignal | undefined;
    const fetchFalso: typeof fetch = (_url, init) =>
      new Promise<Response>((_resolver, rejeitar) => {
        sinal = init!.signal ?? undefined;
        sinal?.addEventListener('abort', () => rejeitar(new DOMException('Abortada', 'AbortError')), { once: true });
      });
    const promessa = erroDe(new EnviadorResend({ chave: CHAVE, fetch: fetchFalso }).enviar(email()));
    await vi.advanceTimersByTimeAsync(TEMPO_LIMITE_EMAIL_MS - 1);
    expect(sinal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    const erro = await promessa;
    expect(sinal?.aborted).toBe(true);
    expect(erro).toBeInstanceOf(ErroEnvioEmail);
    expect(erro).toMatchObject({ tipo: 'transitorio', code: 'transitorio' });
    expect(TEMPO_LIMITE_EMAIL_MS).toBe(10_000);
  });

  it.each([
    [429, 'transitorio'],
    [500, 'transitorio'],
    [503, 'transitorio'],
    [400, 'recusado'],
    [401, 'recusado'],
    [403, 'recusado'],
    [409, 'recusado'],
    [422, 'recusado'],
  ] as const)('resposta %i → ErroEnvioEmail %s, com mensagem fixa e sem o corpo da resposta', async (status, tipo) => {
    const { fetchFalso } = fetchQueResponde(() => respostaJson(status, { message: SENTINELAS.texto, to: SENTINELAS.email }));
    const erro = await erroDe(new EnviadorResend({ chave: CHAVE, fetch: fetchFalso }).enviar(email()));
    expect(erro).toBeInstanceOf(ErroEnvioEmail);
    expect(erro).toMatchObject({ tipo, code: tipo });
    const e = erro as Error;
    expect(contemSentinela(`${e.message}\n${e.stack}\n${JSON.stringify(e)}`)).toBe(false);
    expect(e.cause).toBeUndefined();
  });

  it('erro de rede → transitório, sem a mensagem nem a causa do erro original', async () => {
    const fetchFalso: typeof fetch = async () => {
      throw new TypeError(`fetch failed ${SENTINELAS.email}`);
    };
    const erro = (await erroDe(new EnviadorResend({ chave: CHAVE, fetch: fetchFalso }).enviar(email()))) as ErroEnvioEmail;
    expect(erro).toMatchObject({ tipo: 'transitorio' });
    expect(erro.cause).toBeUndefined();
    expect(contemSentinela(`${erro.message}\n${erro.stack}`)).toBe(false);
  });

  it.each([
    ['corpo sem id', () => respostaJson(200, { ok: true })],
    ['id vazio', () => respostaJson(200, { id: '' })],
    ['corpo que não é JSON', () => new Response('<html>ok</html>', { status: 200 })],
  ])('resposta 2xx com %s → transitório', async (_caso, resposta) => {
    const { fetchFalso } = fetchQueResponde(resposta);
    expect(await erroDe(new EnviadorResend({ chave: CHAVE, fetch: fetchFalso }).enviar(email()))).toMatchObject({ tipo: 'transitorio' });
  });

  it('falha do Resend: o log não leva o corpo do e-mail nem o destinatário', async () => {
    const { fetchFalso } = fetchQueResponde(() => respostaJson(500, { message: `falhou para ${SENTINELAS.email}` }));
    const comSentinelas = email({ para: SENTINELAS.email, assunto: SENTINELAS.texto, texto: SENTINELAS.nome, html: SENTINELAS.telefone });
    const erro = await erroDe(new EnviadorResend({ chave: CHAVE, fetch: fetchFalso }).enviar(comSentinelas));
    const linhas: string[] = [];
    const logger = criarLogger({ write: (l) => void linhas.push(l) });
    // Como enviarAviso registra a falha: o erro inteiro no campo `erro`, e mais nada do e-mail.
    logger.warn({ evento: 'aviso_email_falha', erro, ...({ email: comSentinelas, para: comSentinelas.para } as object) });
    expect(linhas).toHaveLength(1);
    expect(JSON.parse(linhas[0]!)).toMatchObject({ evento: 'aviso_email_falha', erro: { classe: 'ErroEnvioEmail', code: 'transitorio' } });
    expect(contemSentinela(linhas.join('\n'))).toBe(false);
    expect(linhas[0]).not.toContain(CHAVE);
  });
});

describe('EnviadorSemProvedor e criarEnviador', () => {
  it('EnviadorSemProvedor não envia: recusa com sem_provedor e não toca a rede', async () => {
    const espiao = vi.spyOn(globalThis, 'fetch');
    const semProvedor: EnviadorEmail = new EnviadorSemProvedor();
    expect(await erroDe(semProvedor.enviar(email()))).toMatchObject({ tipo: 'sem_provedor' });
    expect(espiao).not.toHaveBeenCalled();
  });

  const base = { ...CONFIG_TESTE, emailRemetente: 'avisos@exemplo.test', emailAvisoDecisao: 'decisao@exemplo.test' };

  it('sem a chave do Resend → EnviadorSemProvedor', () => {
    expect(criarEnviador(base)).toBeInstanceOf(EnviadorSemProvedor);
  });

  it('com a chave, mas sem remetente ou sem destinatário → EnviadorSemProvedor', () => {
    expect(criarEnviador({ ...base, chaveResend: CHAVE, emailRemetente: undefined })).toBeInstanceOf(EnviadorSemProvedor);
    expect(criarEnviador({ ...base, chaveResend: CHAVE, emailAvisoDecisao: undefined })).toBeInstanceOf(EnviadorSemProvedor);
  });

  it('com a chave e os dois endereços → EnviadorResend', () => {
    expect(criarEnviador({ ...base, chaveResend: CHAVE })).toBeInstanceOf(EnviadorResend);
  });

  it('a fábrica não lê o ambiente: a chave no process.env sem estar na configuração não liga o envio', () => {
    vi.stubEnv('RESEND_API_KEY', CHAVE);
    expect(criarEnviador(base)).toBeInstanceOf(EnviadorSemProvedor);
  });
});
