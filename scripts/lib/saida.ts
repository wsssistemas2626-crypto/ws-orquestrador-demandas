// Saída e encerramento dos scripts de operação. O que o script mostra à pessoa (a senha gerada, uma vez) vai para a
// saída padrão; o erro vai para a saída de erro só com a mensagem pt-BR do ErroDominio, o nome das variáveis de uma
// configuração inválida ou, em qualquer outro caso, a classe e o código (C-21: a mensagem do Postgres e do Drizzle traz
// valor de linha). Nada daqui passa pelo pino.
import { criarDb, criarPool } from '../../src/db';
import type { Deps } from '../../src/lib/deps';
import { ErroConfiguracao, lerConfigApp } from '../../src/lib/env';
import { ErroDominio } from '../../src/lib/erros';
import { reduzirErro } from '../../src/lib/reduzir-erro';
import { relogioDoSistema } from '../../src/lib/relogio';
import { criarAuth } from '../../src/modules/acesso/auth';

export type Saida = { write(s: string): void };

// O que os scripts de conta usam. Sem a fila: nenhum deles enfileira job.
export type DepsDoScript = Pick<Deps, 'db' | 'pool' | 'relogio' | 'auth' | 'config'>;

export function mensagemDeErro(e: unknown): string {
  if (e instanceof ErroDominio) return e.mensagem;
  if (e instanceof ErroConfiguracao) return `Configuração inválida nas variáveis de ambiente: ${e.variaveis.join(', ')}.`;
  const { classe, code } = reduzirErro(e);
  return `Não foi possível concluir (${classe} ${code ?? 'sem código'}). Nada foi alterado.`;
}

// `main` de cada script: monta as dependências de DATABASE_URL e da configuração do app (lerConfigApp, conferida como no
// boot), roda, fecha o pool e devolve o código de saída do processo.
export async function rodarScript(
  executar: (deps: DepsDoScript, argv: readonly string[], saida: Saida) => Promise<number>,
  op: { argv?: readonly string[]; saida?: Saida; erro?: Saida; env?: Record<string, string | undefined> } = {},
): Promise<number> {
  const saida = op.saida ?? process.stdout;
  const erro = op.erro ?? process.stderr;
  let pool: Deps['pool'] | null = null;
  try {
    const config = lerConfigApp(op.env ?? process.env);
    pool = criarPool(config.databaseUrl, { max: 2 });
    const db = criarDb(pool);
    const deps: DepsDoScript = { db, pool, relogio: relogioDoSistema, auth: criarAuth({ db, config, relogio: relogioDoSistema }), config };
    return await executar(deps, op.argv ?? process.argv.slice(2), saida);
  } catch (e) {
    erro.write(`${mensagemDeErro(e)}\n`);
    return 1;
  } finally {
    await pool?.end().catch(() => undefined);
  }
}
