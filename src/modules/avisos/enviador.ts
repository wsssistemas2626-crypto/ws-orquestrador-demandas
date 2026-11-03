// Enviador de e-mail do aviso de DEC pronto (ADR-08; 02, seção 5; C-21, C-27, RNF-14). Fala com a API REST do Resend
// por `fetch`, num endereço fixo: sem ler URL base do ambiente, a chave só vai para api.resend.com. O `fetch` pode ser
// injetado (teste sem rede). Tempo limite de 10 s por envio, sem seguir redirecionamento (a chave iria junto) e sem nova
// tentativa aqui: quem tenta de novo é a fila (aviso.dec-pronto, 3 tentativas). O cabeçalho Idempotency-Key
// (`dec-<DEC-id>`) faz o Resend devolver o mesmo envio se o mesmo aviso chegar de novo.
//
// Todo erro vira ErroEnvioEmail, de mensagem fixa, sem o corpo da resposta, sem a mensagem do erro de rede e sem causa:
// nada do e-mail nem da resposta vai a log ou ao Sentry. O `code` é o tipo, para o log reduzido (`reduzirErro`).
//
// A fábrica recebe a configuração do worker, sem ler o ambiente: sem RESEND_API_KEY, sem remetente ou sem destinatário,
// devolve o enviador que não envia, e o aviso fica `sem_provedor`.
import { z } from 'zod';
import type { ConfigWorker } from '../../lib/env-worker';

export type Email = { para: string; de: string; assunto: string; texto: string; html: string; chaveIdempotencia: string };

export interface EnviadorEmail {
  enviar(e: Email): Promise<{ id: string }>;
}

// sem_provedor: não há chave nem endereços, nada foi tentado. recusado: o Resend respondeu 4xx (menos 408, 409 e 429).
// transitorio: rede, tempo limite, 408, 409, 429, 5xx ou resposta fora do formato.
export type TipoErroEnvio = 'sem_provedor' | 'recusado' | 'transitorio';

const MENSAGEM_ERRO: Record<TipoErroEnvio, string> = {
  sem_provedor: 'O envio de e-mail não está configurado.',
  recusado: 'O provedor de e-mail recusou o envio.',
  transitorio: 'O provedor de e-mail não respondeu como esperado.',
};

export class ErroEnvioEmail extends Error {
  readonly code: TipoErroEnvio;
  constructor(readonly tipo: TipoErroEnvio) {
    super(MENSAGEM_ERRO[tipo]);
    this.name = 'ErroEnvioEmail';
    this.code = tipo;
  }
}

export const ENDERECO_RESEND = 'https://api.resend.com/emails';
export const TEMPO_LIMITE_EMAIL_MS = 10_000;

const respostaDoResend = z.object({ id: z.string().min(1).max(200) });

// 408 (tempo limite do Resend), 409 (requisição concorrente com a mesma Idempotency-Key), 429 e 5xx são passageiros. O
// Resend também responde 409 à mesma Idempotency-Key com corpo diferente, que não é passageiro: esse caso gasta as 3
// tentativas da fila e termina `falhou`. É limitado, e aceito (DEC-DEM-20261103-0007-v1, 02-tech-lead.md).
const TRANSITORIOS_4XX: ReadonlySet<number> = new Set([408, 409, 429]);
const classificar = (status: number): TipoErroEnvio => (TRANSITORIOS_4XX.has(status) || status >= 500 ? 'transitorio' : 'recusado');

export class EnviadorResend implements EnviadorEmail {
  readonly #chave: string;
  readonly #fetch: typeof fetch;

  constructor(op: { chave: string; fetch?: typeof fetch }) {
    const chave = op.chave.trim();
    if (!chave) throw new RangeError('EnviadorResend: chave vazia');
    this.#chave = chave;
    // Lido na hora da chamada, não na construção: o teste pode trocar o fetch global depois.
    this.#fetch = op.fetch ?? ((url, init) => fetch(url, init));
  }

  async enviar(e: Email): Promise<{ id: string }> {
    // Só os campos do e-mail; o destinatário vai numa lista de um só.
    const corpo = { from: e.de, to: [e.para], subject: e.assunto, text: e.texto, html: e.html };
    const controle = new AbortController();
    const temporizador = setTimeout(() => controle.abort(), TEMPO_LIMITE_EMAIL_MS);
    try {
      let resposta: Response;
      try {
        resposta = await this.#fetch(ENDERECO_RESEND, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${this.#chave}`,
            'content-type': 'application/json',
            'idempotency-key': e.chaveIdempotencia,
          },
          body: JSON.stringify(corpo),
          redirect: 'error',
          signal: controle.signal,
        });
      } catch {
        throw new ErroEnvioEmail('transitorio');
      }
      if (!resposta.ok) {
        // O corpo do erro não é lido: pode repetir o destinatário ou o conteúdo.
        await resposta.body?.cancel().catch(() => undefined);
        throw new ErroEnvioEmail(classificar(resposta.status));
      }
      let dados: unknown;
      try {
        dados = await resposta.json();
      } catch {
        throw new ErroEnvioEmail('transitorio');
      }
      const r = respostaDoResend.safeParse(dados);
      if (!r.success) throw new ErroEnvioEmail('transitorio');
      return { id: r.data.id };
    } finally {
      clearTimeout(temporizador);
    }
  }
}

// Sem provedor configurado: não envia nada. O aviso fica `sem_provedor` (enviarAviso), e o DEC continua na fila do painel.
export class EnviadorSemProvedor implements EnviadorEmail {
  async enviar(): Promise<{ id: string }> {
    throw new ErroEnvioEmail('sem_provedor');
  }
}

export function criarEnviador(cfg: Pick<ConfigWorker, 'chaveResend' | 'emailRemetente' | 'emailAvisoDecisao'>): EnviadorEmail {
  const chave = cfg.chaveResend?.trim();
  if (!chave || !cfg.emailRemetente || !cfg.emailAvisoDecisao) return new EnviadorSemProvedor();
  return new EnviadorResend({ chave });
}
