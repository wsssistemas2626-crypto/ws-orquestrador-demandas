// Porta de entrada de toda rota, Server Action e página de pessoa (C-04): sessão válida do Better Auth, conta ativa,
// 2FA ativo e papel em PAPEIS. O proxy do Next é só conveniência; quem decide é esta função, chamada dentro de cada
// adaptador. Conta sem 2FA tem sessão de no máximo 15 min, que só abre /configurar-2fa (C-08).
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { obterDeps, type Deps } from '../../lib/deps';
import { ErroDominio } from '../../lib/erros';
import { ehPapel, type AtorPessoa } from './ator';
import { destinoSeguro } from './destino-seguro';
import { MENSAGENS_ACESSO as MENSAGEM } from './mensagens';

export const SESSAO_SEM_2FA_MS = 15 * 60 * 1000;

type DepsAcesso = Pick<Deps, 'auth' | 'relogio'>;

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

// As páginas usam os mesmos `Deps` das rotas (obterDeps, T11): um Better Auth só no processo. Importar o módulo (no
// `next build`) não lê variável de ambiente; a configuração é lida na primeira chamada.
//
// Primeira linha de toda página do painel fora de /entrar e /configurar-2fa (C-04). `deps` só é passado nos testes.
export async function exigirPessoaNaPagina(caminhoAtual: string, deps?: DepsAcesso): Promise<AtorPessoa> {
  try {
    return await exigirPessoa(deps ?? (await obterDeps()), await headers());
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
export async function exigirSessaoParaConfigurar2fa(deps?: DepsAcesso): Promise<{ usuarioId: string; nome: string }> {
  const p = await lerPessoa(deps ?? (await obterDeps()), await headers());
  if (!p) redirect('/entrar?motivo=sessao');
  if (!ehPapel(p.papel)) redirect('/sem-permissao');
  if (p.com2fa) redirect('/demandas');
  return { usuarioId: p.usuarioId, nome: p.nome };
}
