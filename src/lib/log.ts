// Log estruturado por lista de permissão (C-21, RNF-10). Só os campos de CAMPOS_PERMITIDOS chegam à saída; o resto é
// descartado antes do pino. O `redact` do pino fica como segunda barreira para campo permitido que traga objeto.
// Único ponto de log de `src/` (G3.7): `console.*` é proibido pelo ESLint.
import pino from 'pino';
import { ehErro, erroJaReduzido, lerCode, reduzirErro, type ErroReduzido } from './reduzir-erro';

export const CAMPOS_PERMITIDOS = [
  'evento',
  'metodo',
  'rota',
  'status',
  'ms',
  'atorTipo',
  'codigoErro',
  'fila',
  'jobId',
  'agente',
  'execucaoId',
  'demandaId',
  'tentativa',
  'quantidade',
  'instancia',
  'erro',
  // M-05: o identificador do erro (o `digest` do Next), que casa a linha do log com o evento no Sentry e com a tela 2.8.
  // Sem conteúdo: só sai no formato FORMATO_ERRO_ID.
  'erroId',
] as const;

export const FORMATO_ERRO_ID = /^[A-Za-z0-9_-]{1,64}$/;

type CampoPermitido = (typeof CAMPOS_PERMITIDOS)[number];
export type CamposLog = { evento: string } & Partial<Record<CampoPermitido, unknown>>;
export type Logger = { info(c: CamposLog): void; warn(c: CamposLog): void; error(c: CamposLog): void };
type Destino = { write(linha: string): void };

const REDACT = [
  '*.senha',
  '*.password',
  '*.token',
  '*.texto',
  '*.origem',
  '*.solicitanteNome',
  '*.conteudo',
  '*.email',
  '*.nome',
  '*.anexos',
  '*.referencia',
  '*.authorization',
  '*.cookie',
  '*.message',
  '*.detail',
  '*.stack',
];

// `erro` sempre sai como { classe, code }: Error vira reduzirErro; texto ou número solto vira 'desconhecido'. B-b do
// 0009: objeto que não é Error também vira 'desconhecido', com o `code` só quando passa no formato de reduzirErro;
// nenhuma outra chave dele sai (o `redact` de um nível não cobre todo nome de chave). A exceção é o erro que já chega
// reduzido, na forma exata { classe, code? } (erroJaReduzido), que mantém a classe. B-3 da revisão do 0011: nada aqui
// lança, nem com getter que lança nem com Proxy (ehErro, erroJaReduzido e lerCode são totais).
function normalizarErro(valor: unknown): ErroReduzido {
  if (ehErro(valor)) return reduzirErro(valor);
  if (valor !== null && typeof valor === 'object') {
    const reduzido = erroJaReduzido(valor);
    if (reduzido) return reduzido;
    const code = lerCode(valor);
    return code ? { classe: 'desconhecido', code } : { classe: 'desconhecido' };
  }
  return reduzirErro(valor);
}

function filtrar(c: Record<string, unknown>): Record<string, unknown> {
  const saida: Record<string, unknown> = {};
  for (const k of CAMPOS_PERMITIDOS) {
    if (!Object.prototype.hasOwnProperty.call(c, k)) continue;
    if (k === 'erroId') {
      const v = c[k];
      if (typeof v === 'string' && FORMATO_ERRO_ID.test(v)) saida[k] = v;
      continue;
    }
    saida[k] = k === 'erro' ? normalizarErro(c[k]) : c[k];
  }
  return saida;
}

export function criarLogger(destino?: Destino): Logger {
  const p = pino(
    {
      level: process.env.LOG_LEVEL ?? 'info',
      redact: { paths: REDACT, censor: '[removido]' },
      base: undefined,
    },
    destino ?? pino.destination(1),
  );
  const emitir = (nivel: 'info' | 'warn' | 'error') => (c: CamposLog) => {
    p[nivel](filtrar(c as Record<string, unknown>));
  };
  return { info: emitir('info'), warn: emitir('warn'), error: emitir('error') };
}

let destinoAtual: Destino | null = null;
let cache: Logger | null = null;
const atual = (): Logger => (cache ??= criarLogger(destinoAtual ?? undefined));

export const log: Logger = {
  info: (c) => atual().info(c),
  warn: (c) => atual().warn(c),
  error: (c) => atual().error(c),
};

// Só para teste: troca a saída do `log` padrão (null volta para a saída padrão do processo).
export function substituirDestinoDoLog(d: Destino | null): void {
  destinoAtual = d;
  cache = null;
}
