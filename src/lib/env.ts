// Configuração do app lida das variáveis de ambiente e conferida no boot (C-31, C-33). Variável fora da regra
// impede a subida; o erro cita só o nome da variável, nunca o valor recebido (segredo, URL com senha).
import { z } from 'zod';

export type ConfigApp = {
  urlBase: string;
  segredoAuth: string;
  cabecalhoIp: string;
  retencaoDias: number;
  producao: boolean;
  databaseUrl: string;
};

const URL_HTTP = z
  .string()
  .refine((v) => {
    try {
      return ['http:', 'https:'].includes(new URL(v).protocol);
    } catch {
      return false;
    }
  })
  .transform((v) => new URL(v).origin);

const ESQUEMA = z.object({
  // C-33: 32 bytes ou mais (bytes, não caracteres).
  BETTER_AUTH_SECRET: z.string().refine((v) => Buffer.byteLength(v, 'utf8') >= 32),
  BETTER_AUTH_URL: URL_HTTP,
  DATABASE_URL: z.string().min(1),
  // C-06: o cabeçalho que o proxy sobrescreve (Traefik do Easypanel: x-real-ip).
  CABECALHO_IP_CLIENTE: z
    .string()
    .regex(/^[A-Za-z0-9-]{1,64}$/)
    .transform((v) => v.toLowerCase())
    .default('x-real-ip'),
  // C-31: de 1 a 365 dias, inteiro; padrão 90.
  RETENCAO_TEXTO_BRUTO_DIAS: z
    .string()
    .regex(/^\d{1,3}$/)
    .transform(Number)
    .pipe(z.number().int().min(1).max(365))
    .default(90),
  NODE_ENV: z.string().optional(),
});

// 08-correcao: o cookie Secure segue o protocolo do BETTER_AUTH_URL (auth.ts). Em produção, http só no loopback, que
// não passa pela rede (o e2e com `next start` em http://127.0.0.1:3101); fora dele, a produção exige https.
const LOOPBACK = new Set(['127.0.0.1', 'localhost', '[::1]']);
const httpForaDoLoopback = (url: string): boolean => {
  const u = new URL(url);
  return u.protocol === 'http:' && !LOOPBACK.has(u.hostname);
};

export class ErroConfiguracao extends Error {
  constructor(readonly variaveis: string[]) {
    super(`Configuração inválida nas variáveis de ambiente: ${variaveis.join(', ')}`);
    this.name = 'ErroConfiguracao';
  }
}

// `Record` em vez de `NodeJS.ProcessEnv`: os tipos do Next tornam `NODE_ENV` obrigatório no ProcessEnv, e o teste
// passa só as variáveis do caso. `process.env` continua aceito.
export function lerConfigApp(env: Record<string, string | undefined> = process.env): ConfigApp {
  // Variável vazia conta como ausente: o padrão vale, e a obrigatória falha.
  const entrada = Object.fromEntries(Object.entries(env).filter(([, v]) => v !== undefined && v !== ''));
  const r = ESQUEMA.safeParse(entrada);
  if (!r.success) {
    // Só o nome da variável (primeiro segmento do caminho); o ZodError não é anexado, porque a issue pode guardar o valor.
    const nomes = [...new Set(r.error.issues.map((i) => String(i.path[0])))].sort();
    throw new ErroConfiguracao(nomes);
  }
  const v = r.data;
  if (v.NODE_ENV === 'production' && httpForaDoLoopback(v.BETTER_AUTH_URL)) throw new ErroConfiguracao(['BETTER_AUTH_URL']);
  return {
    urlBase: v.BETTER_AUTH_URL,
    segredoAuth: v.BETTER_AUTH_SECRET,
    cabecalhoIp: v.CABECALHO_IP_CLIENTE,
    retencaoDias: v.RETENCAO_TEXTO_BRUTO_DIAS,
    producao: v.NODE_ENV === 'production',
    databaseUrl: v.DATABASE_URL,
  };
}
