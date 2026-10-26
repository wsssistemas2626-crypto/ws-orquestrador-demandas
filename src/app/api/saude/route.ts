// GET /api/saude (RNF-17, ADR-12): pública e fora da matriz, como a de auth. 200 { status: 'ok' } só quando o banco
// responde e a última migration aplicada é a última do journal do build; senão 503 { status: 'indisponivel' }. Sem
// versão, configuração nem motivo na resposta. Tempo limite de 150 ms: banco preso não prende o healthcheck.
import { sql } from 'drizzle-orm';
import journal from '../../../../drizzle/meta/_journal.json';
import { obterDeps } from '../../../lib/deps';
import { log } from '../../../lib/log';

const TEMPO_LIMITE_MS = 150;
const ULTIMA_MIGRATION = String(journal.entries.at(-1)?.when ?? '');
const CABECALHOS = { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer' };

class TempoEsgotado extends Error {
  constructor() {
    super('tempo esgotado');
    this.name = 'TempoEsgotado';
  }
}

async function conferir(): Promise<boolean> {
  const deps = await obterDeps();
  const r = await deps.db.execute<{ ultima: string | null }>(
    sql`select max(created_at)::text as ultima from drizzle.__drizzle_migrations`,
  );
  return ULTIMA_MIGRATION !== '' && r.rows[0]?.ultima === ULTIMA_MIGRATION;
}

function comTempoLimite<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<never>((_, rejeitar) => {
    timer = setTimeout(() => rejeitar(new TempoEsgotado()), ms);
  });
  return Promise.race([p, limite]).finally(() => clearTimeout(timer));
}

// A requisição não é lida: nada dela (cabeçalho, cookie, query) muda a resposta.
export async function GET(): Promise<Response> {
  let ok = false;
  try {
    ok = await comTempoLimite(conferir(), TEMPO_LIMITE_MS);
    if (!ok) log.warn({ evento: 'saude_indisponivel', codigoErro: 'migration_pendente' });
  } catch (erro) {
    // Só classe e código (C-21): a mensagem do Postgres cita tabela e esquema.
    log.warn({ evento: 'saude_indisponivel', erro });
  }
  return Response.json(ok ? { status: 'ok' } : { status: 'indisponivel' }, { status: ok ? 200 : 503, headers: CABECALHOS });
}
