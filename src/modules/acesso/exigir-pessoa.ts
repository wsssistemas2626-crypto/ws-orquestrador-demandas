// Porta de entrada de toda rota, Server Action e página de pessoa (C-04): sessão válida do Better Auth, conta ativa,
// 2FA ativo e papel em PAPEIS. O proxy do Next é só conveniência; quem decide é esta função, chamada dentro de cada
// adaptador. Conta sem 2FA tem sessão de no máximo 15 min, que só abre /configurar-2fa (C-08).
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { criarDb, criarPool } from '../../db';
import type { Deps } from '../../lib/deps';
import { lerConfigApp } from '../../lib/env';
import { ErroDominio } from '../../lib/erros';
import { relogioDoSistema } from '../../lib/relogio';
import { ehPapel, type AtorPessoa } from './ator';
import { criarAuth } from './auth';
import { destinoSeguro } from './destino-seguro';

export const SESSAO_SEM_2FA_MS = 15 * 60 * 1000;

type DepsAcesso = Pick<Deps, 'auth' | 'relogio'>;

// Mensagens de 03, seção 2.8. Nenhuma cita dado da sessão.
const MENSAGEM = {
  nao_autenticado: 'Sua sessão terminou. Entre de novo para continuar.',
  sem_2fa: 'Para usar o painel, configure a verificação em duas etapas.',
  sem_permissao: 'Sua conta não pode fazer esta ação. Se precisar, fale com o CTO.',
} as const;

// A sessão como o acesso a enxerga. `null` quando não há sessão, a conta está desativada ou a sessão sem 2FA passou
// dos 15 min (as três dão 401).
async function lerPessoa(
  deps: DepsAcesso,
  cabecalhos: Headers,
): Promise<{ usuarioId: string; nome: string; papel: unknown; com2fa: boolean } | null> {
  const s = await deps.auth.api.getSession({ headers: cabecalhos });
  if (!s || s.user.desativadoEm) return null;
  const com2fa = s.user.twoFactorEnabled === true;
  if (!com2fa) {
    const idadeMs = deps.relogio.agora().getTime() - new Date(s.session.createdAt).getTime();
    if (idadeMs > SESSAO_SEM_2FA_MS) return null;
  }
  return { usuarioId: s.user.id, nome: s.user.name, papel: s.user.papel, com2fa };
}

export async function exigirPessoa(deps: DepsAcesso, cabecalhos: Headers): Promise<AtorPessoa> {
  const p = await lerPessoa(deps, cabecalhos);
  if (!p) throw new ErroDominio('nao_autenticado', MENSAGEM.nao_autenticado);
  if (!p.com2fa) throw new ErroDominio('sem_2fa', MENSAGEM.sem_2fa);
  if (!ehPapel(p.papel)) throw new ErroDominio('sem_permissao', MENSAGEM.sem_permissao);
  return { tipo: 'pessoa', usuarioId: p.usuarioId, nome: p.nome, papel: p.papel };
}

// Até a T11 trazer `obterDeps`, as páginas montam o próprio Better Auth na primeira chamada, como a rota
// /api/auth/[...all]: importar o módulo (no `next build`) não lê variável de ambiente.
let depsPagina: DepsAcesso | undefined;
function depsDaPagina(): DepsAcesso {
  if (!depsPagina) {
    const config = lerConfigApp();
    depsPagina = {
      auth: criarAuth({ db: criarDb(criarPool(config.databaseUrl)), config, relogio: relogioDoSistema }),
      relogio: relogioDoSistema,
    };
  }
  return depsPagina;
}

// Primeira linha de toda página do painel fora de /entrar e /configurar-2fa (C-04). `deps` só é passado nos testes.
export async function exigirPessoaNaPagina(caminhoAtual: string, deps: DepsAcesso = depsDaPagina()): Promise<AtorPessoa> {
  try {
    return await exigirPessoa(deps, await headers());
  } catch (e) {
    if (!(e instanceof ErroDominio)) throw e;
    if (e.codigo === 'nao_autenticado') {
      redirect(`/entrar?callbackURL=${encodeURIComponent(destinoSeguro(caminhoAtual))}&motivo=sessao`);
    }
    if (e.codigo === 'sem_2fa') redirect('/configurar-2fa');
    if (e.codigo === 'sem_permissao') redirect('/sem-permissao');
    throw e;
  }
}

// Só para /configurar-2fa: sessão válida de conta ativa, com papel válido e ainda sem 2FA.
export async function exigirSessaoParaConfigurar2fa(deps: DepsAcesso = depsDaPagina()): Promise<{ usuarioId: string; nome: string }> {
  const p = await lerPessoa(deps, await headers());
  if (!p) redirect('/entrar?motivo=sessao');
  if (!ehPapel(p.papel)) redirect('/sem-permissao');
  if (p.com2fa) redirect('/demandas');
  return { usuarioId: p.usuarioId, nome: p.nome };
}
