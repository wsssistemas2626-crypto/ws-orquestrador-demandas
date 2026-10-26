// Adaptador único das Server Actions do painel (G3.6, C-04). Cada Server Action é `acaoDoPainel(...)`: pessoa com
// sessão, 2FA e papel válido (exigirPessoa), depois autorizar (C-12), depois a entrada pelo Zod, sem chave desconhecida
// (C-11). Nada lança para a tela: o resultado é `{ ok: true, dados }` ou `{ ok: false, erro, mensagem, ... }`, com o
// mesmo mapeador das rotas (C-20). A origem da Server Action é conferida pelo próprio Next, com `allowedOrigins` só da
// origem de BETTER_AUTH_URL (next.config.ts, C-15). Uma linha de log por chamada, só com os campos da lista (C-21).
import { headers } from 'next/headers';
import { unstable_rethrow } from 'next/navigation';
import type { ZodType } from 'zod';
import type { AtorPessoa } from '../modules/acesso/ator';
import { exigirPessoa } from '../modules/acesso/exigir-pessoa';
import { autorizar, type Acao } from '../modules/acesso/matriz';
import { obterDeps, type Deps } from './deps';
import { deZod, mapearErro, type CampoInvalido } from './erros';
import { log } from './log';
import { capturarErro } from './sentry';

export type ResultadoAcao<T> =
  | { ok: true; dados: T }
  | { ok: false; erro: string; mensagem: string; campos?: CampoInvalido[]; faltando?: string[]; erros?: string[] };

export function acaoDoPainel<E, T>(
  op: { acao: Acao; entrada: ZodType<E> },
  fn: (ctx: { ator: AtorPessoa; entrada: E; deps: Deps }) => Promise<T>,
): (bruto: unknown) => Promise<ResultadoAcao<T>> {
  return async (bruto) => {
    const inicio = performance.now();
    let atorTipo: 'pessoa' | 'anonimo' = 'anonimo';
    let codigoErro: string | undefined;
    try {
      const deps = await obterDeps();
      const ator = await exigirPessoa(deps, await headers());
      atorTipo = 'pessoa';
      autorizar(ator, op.acao);
      const r = op.entrada.safeParse(bruto);
      if (!r.success) throw deZod(r.error);
      return { ok: true, dados: await fn({ ator, entrada: r.data, deps }) };
    } catch (e) {
      // redirect() e notFound() do Next, chamados pela função, seguem para o Next: não são erro.
      unstable_rethrow(e);
      const { status, corpo } = mapearErro(e);
      codigoErro = corpo.erro;
      if (status >= 500) capturarErro(e, { evento: 'acao_painel' });
      return { ok: false, ...corpo };
    } finally {
      // `rota` leva o nome da ação: é o identificador fixo da Server Action, sem dado da entrada.
      const linha = {
        evento: 'acao_painel',
        rota: op.acao,
        ms: Math.round(performance.now() - inicio),
        atorTipo,
        ...(codigoErro ? { codigoErro } : {}),
      };
      if (codigoErro === 'erro_interno') log.error(linha);
      else log.info(linha);
    }
  };
}
