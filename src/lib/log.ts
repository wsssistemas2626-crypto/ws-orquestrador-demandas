// Log estruturado por lista de permissão (C-21, RNF-10). Só os campos de CAMPOS_PERMITIDOS chegam à saída; o resto é
// descartado antes do pino. O `redact` do pino fica como segunda barreira para campo permitido que traga objeto.
// Único ponto de log de `src/` (G3.7): `console.*` é proibido pelo ESLint.
import pino from 'pino';
import { reduzirErro } from './reduzir-erro';

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
] as const;

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

// `erro` sempre sai como { classe, code }: Error vira reduzirErro; texto ou número solto vira 'desconhecido'.
// Objeto simples passa, sob o `redact`.
function normalizarErro(valor: unknown): unknown {
  if (valor instanceof Error) return reduzirErro(valor);
  if (valor !== null && typeof valor === 'object') return valor;
  return reduzirErro(valor);
}

function filtrar(c: Record<string, unknown>): Record<string, unknown> {
  const saida: Record<string, unknown> = {};
  for (const k of CAMPOS_PERMITIDOS) {
    if (!Object.prototype.hasOwnProperty.call(c, k)) continue;
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
