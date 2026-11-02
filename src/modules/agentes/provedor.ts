// Provedor de IA (ADR-08, C-24, RNF-06, RNF-14). A interface não tem parâmetro de ferramentas: o corpo enviado à
// Anthropic é montado só com model, max_tokens, system e messages, e o modelo não tem como pedir ação nenhuma. A
// chave vem só de quem chama (o worker passa o próprio ambiente a `criarProvedor`); sem chave, não há provedor, e o
// executor de agente trata isso como "ignorada" (T27).
//
// Falha: o cliente não tenta de novo sozinho (maxRetries 0), porque a nova tentativa é da execução de agente, com
// espera e limite próprios (P1-e). O tempo limite de cada chamada é 120 s (RNF-06). Todo erro vira ErroProvedor com
// mensagem fixa, sem o corpo nem a mensagem do provedor e sem a causa, para nada da resposta ir a log ou ao Sentry.
import Anthropic from '@anthropic-ai/sdk';

export type PedidoAoProvedor = { modelo: string; sistema: string; conteudo: string; maxTokens: number; sinal?: AbortSignal };
export type RespostaDoProvedor = { texto: string; modelo: string; tokensEntrada: number; tokensSaida: number };

export type TipoErroProvedor = 'autenticacao' | 'transitorio';

const MENSAGEM_ERRO: Record<TipoErroProvedor, string> = {
  autenticacao: 'O provedor de IA recusou a credencial ou a permissão.',
  transitorio: 'O provedor de IA não respondeu como esperado.',
};

export class ErroProvedor extends Error {
  constructor(
    readonly tipo: TipoErroProvedor,
    readonly tokens?: { entrada: number; saida: number },
  ) {
    super(MENSAGEM_ERRO[tipo]);
    this.name = 'ErroProvedor';
  }
}

export interface ProvedorIA {
  gerar(p: PedidoAoProvedor): Promise<RespostaDoProvedor>;
}

export const MAX_TOKENS_TETO = 8000;
export const TEMPO_LIMITE_MS = 120_000;
// Endereço fixo: sem ele, o SDK leria ANTHROPIC_BASE_URL do ambiente e mandaria a chave e o texto para outro host.
const ENDERECO_ANTHROPIC = 'https://api.anthropic.com';

// 401 e 403: credencial ou permissão; tentar de novo não resolve. O resto (429, 5xx, rede, tempo limite, 400 e 404 de
// configuração) é transitório, e a execução de agente encerra depois da 3ª tentativa.
function classificar(e: unknown): ErroProvedor {
  if (e instanceof Anthropic.APIError && (e.status === 401 || e.status === 403)) return new ErroProvedor('autenticacao');
  return new ErroProvedor('transitorio');
}

export class ProvedorAnthropic implements ProvedorIA {
  readonly #cliente: Anthropic;

  constructor(op: { chave: string; fetch?: typeof fetch }) {
    this.#cliente = new Anthropic({
      apiKey: op.chave,
      // Sem ANTHROPIC_AUTH_TOKEN do ambiente: a única credencial é a chave recebida.
      authToken: null,
      baseURL: ENDERECO_ANTHROPIC,
      timeout: TEMPO_LIMITE_MS,
      maxRetries: 0,
      // Sem log do SDK, mesmo com ANTHROPIC_LOG=debug: o log de depuração traz o corpo, com o texto da demanda (C-21).
      logLevel: 'off',
      ...(op.fetch ? { fetch: op.fetch } : {}),
    });
  }

  async gerar(p: PedidoAoProvedor): Promise<RespostaDoProvedor> {
    if (!Number.isSafeInteger(p.maxTokens) || p.maxTokens < 1 || p.maxTokens > MAX_TOKENS_TETO) {
      throw new RangeError(`maxTokens precisa ser inteiro entre 1 e ${MAX_TOKENS_TETO}`);
    }
    // Só as quatro chaves: qualquer outra que chegue no pedido por engano não é copiada.
    const corpo = {
      model: p.modelo,
      max_tokens: p.maxTokens,
      system: p.sistema,
      messages: [{ role: 'user' as const, content: p.conteudo }],
    };
    let resposta: Anthropic.Messages.Message;
    try {
      resposta = await this.#cliente.messages.create(corpo, { signal: p.sinal });
    } catch (e) {
      throw classificar(e);
    }
    const texto = resposta.content
      .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');
    return {
      texto,
      modelo: resposta.model,
      tokensEntrada: resposta.usage.input_tokens,
      tokensSaida: resposta.usage.output_tokens,
    };
  }
}

// Fábrica: o provedor só existe com a chave (CA-16.5). Recebe o ambiente de quem chama, sem ler process.env aqui.
export function criarProvedor(env: { ANTHROPIC_API_KEY?: string }): ProvedorIA | null {
  const chave = env.ANTHROPIC_API_KEY?.trim();
  if (!chave) return null;
  return new ProvedorAnthropic({ chave });
}
