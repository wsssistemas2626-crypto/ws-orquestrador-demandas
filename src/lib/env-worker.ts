// Configuração do worker (C-27, C-31). É a do app (lerConfigApp, com a mesma regra de retenção: fora de 1..365 o
// worker não sobe) mais as chaves do provedor de IA e do e-mail e os dois endereços do aviso. Único lugar, com as
// fábricas do provedor e do enviador, que lê ANTHROPIC_API_KEY e RESEND_API_KEY: o app nunca as recebe.
// O erro cita só o nome da variável, nunca o valor (chave, URL com senha, endereço).
import { z } from 'zod';
import { ErroConfiguracao, lerConfigApp, type ConfigApp } from './env';

export type ConfigWorker = ConfigApp & { chaveAnthropic?: string; chaveResend?: string; emailRemetente?: string; emailAvisoDecisao?: string };

// Vazia ou só com espaço conta como ausente: a chave fica sem valor, e o worker sobe sem o provedor correspondente.
const opcional = <T extends z.ZodType<string | undefined>>(s: T) =>
  z.preprocess((v) => (typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined), s);

const ESQUEMA = z.object({
  ANTHROPIC_API_KEY: opcional(z.string().optional()),
  RESEND_API_KEY: opcional(z.string().optional()),
  EMAIL_REMETENTE: opcional(z.email().optional()),
  EMAIL_AVISO_DECISAO: opcional(z.email().optional()),
});

// `Record` pelo mesmo motivo de lerConfigApp; `process.env` continua aceito.
export function lerConfigWorker(env: Record<string, string | undefined> = process.env): ConfigWorker {
  const nomes: string[] = [];
  let app: ConfigApp | null = null;
  try {
    app = lerConfigApp(env);
  } catch (e) {
    if (!(e instanceof ErroConfiguracao)) throw e;
    nomes.push(...e.variaveis);
  }
  const r = ESQUEMA.safeParse(env);
  // Só o nome da variável; o ZodError não é anexado, porque a issue pode guardar o valor.
  if (!r.success) nomes.push(...r.error.issues.map((i) => String(i.path[0])));
  if (nomes.length > 0 || !app || !r.success) throw new ErroConfiguracao([...new Set(nomes)].sort());
  const v = r.data;
  return {
    ...app,
    ...(v.ANTHROPIC_API_KEY ? { chaveAnthropic: v.ANTHROPIC_API_KEY } : {}),
    ...(v.RESEND_API_KEY ? { chaveResend: v.RESEND_API_KEY } : {}),
    ...(v.EMAIL_REMETENTE ? { emailRemetente: v.EMAIL_REMETENTE } : {}),
    ...(v.EMAIL_AVISO_DECISAO ? { emailAvisoDecisao: v.EMAIL_AVISO_DECISAO } : {}),
  };
}
