// test/sessoes-do-banco.ts — C-27 (0.4.1, SB-14): as sessões do banco do teste, para o diagnóstico e para a verificação
// de que o app só conecta como orquestrador_app. O diagnóstico mostra só backend_type, usename e state: nada de query,
// client_addr, application_name nem URL.
import pg from 'pg';
import { inject } from 'vitest';

export type SessaoDoBanco = { backendType: string | null; usename: string | null; state: string | null };

export async function sessoesDoBanco(pool: pg.Pool): Promise<SessaoDoBanco[]> {
  const { rows } = await pool.query<SessaoDoBanco>(
    'select backend_type as "backendType", usename, state from pg_stat_activity where datname = current_database() order by 1, 2, 3',
  );
  return rows;
}

export const diagnosticoDasSessoes = (s: readonly SessaoDoBanco[]): string =>
  `sessões: ${s.map((x) => `${x.backendType ?? '-'}/${x.usename ?? '-'}/${x.state ?? '-'}`).join(', ')}`;

// Os papéis das sessões de cliente do banco em que `pool` está conectado. `select distinct usename`, sem filtro por
// usename, comparado inteiro pelo chamador (toEqual).
//
// Causa (a), a do C-27: o autovacuum worker entra no banco recém-copiado do `modelo` e aparece com `usename` nulo (a
// falha do CI na 0.1.13 foi [orquestrador_app, null]). Processo de fundo não é conexão do app: só `client backend` conta.
// Causa (b): a sessão de cliente que ainda autentica não tem papel: espera por tentativas contadas, sem relógio do teste.
// Esgotadas, o null fica na lista e o toEqual falha (falha fechada).
//
// Quem observa é o superusuário do contêiner de teste, conectado ao banco `postgres` (fora do banco observado, para não
// se contar). Observar pelo papel do app esconderia o migrator: sem pg_read_all_stats, o pg_stat_activity devolve
// backend_type nulo para a sessão de outro papel, e o filtro de `client backend` a tiraria da lista (o CA-04.3 pegou isso).
export async function papeisDasSessoesDeCliente(pool: pg.Pool, tentativas = 50): Promise<Array<string | null>> {
  const { rows } = await pool.query<{ banco: string }>('select current_database() as banco');
  const banco = rows[0]?.banco;
  if (!banco) throw new Error('banco observado sem nome');
  const observador = new pg.Pool({ connectionString: inject('pgAdmin'), max: 1 });
  try {
    const ler = async () =>
      (
        await observador.query<{ usename: string | null }>(
          "select distinct usename from pg_stat_activity where datname = $1 and backend_type = 'client backend' order by 1",
          [banco],
        )
      ).rows.map((r) => r.usename);
    let papeis = await ler();
    for (let i = 1; i < tentativas && papeis.includes(null); i++) {
      await observador.query('select pg_sleep(0.05)');
      papeis = await ler();
    }
    return papeis;
  } finally {
    await observador.end();
  }
}
