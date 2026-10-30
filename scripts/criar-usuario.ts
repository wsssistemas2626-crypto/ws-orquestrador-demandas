// Criação de conta de pessoa (RF-01, C-08, C-37, LGPD D6). O cadastro aberto não existe (C-01): conta só nasce por este
// script, rodado por quem opera o servidor.
//
//   pnpm tsx scripts/criar-usuario.ts --email <e-mail> --nome <nome> --papel cto|administradora
//
// A senha inicial é gerada aqui (24 caracteres aleatórios) e escrita uma vez na saída padrão; ela nunca entra por
// argumento nem por variável de ambiente, e nunca vai ao log nem ao histórico. O hash é o do próprio Better Auth, para o
// login aceitar a senha. A conta nasce sem 2FA: no primeiro acesso, a sessão só abre /configurar-2fa (C-08).
import { randomBytes, randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { Db } from '../src/db';
import { account, user } from '../src/db/schema';
import { comTransacao } from '../src/db/transacao';
import { deZod, ErroDominio } from '../src/lib/erros';
import { log } from '../src/lib/log';
import { reduzirErro } from '../src/lib/reduzir-erro';
import type { Relogio } from '../src/lib/relogio';
import { PAPEIS, type Papel } from '../src/modules/acesso/ator';
import { registrarEvento } from '../src/modules/historico/registrar';
import { lerArgumentos } from './lib/argumentos';
import { rodarScript, type DepsDoScript, type Saida } from './lib/saida';
import { ehExecucaoDireta } from './migrate';

// `--senha` não existe: o strictObject recusa qualquer argumento fora destes três (C-37).
export const argumentosCriarUsuario = z.strictObject({
  email: z.email(),
  nome: z.string().trim().min(1).max(200),
  papel: z.enum(PAPEIS),
});
export type ArgumentosCriarUsuario = z.infer<typeof argumentosCriarUsuario>;

// 18 bytes em base64url dão 24 caracteres (144 bits). O mínimo do Better Auth aqui é 20 (auth.ts).
export const TAMANHO_SENHA = 24;
const gerarSenha = () => randomBytes(18).toString('base64url');

const MENSAGEM_JA_EXISTE = 'Já existe uma conta com este e-mail. Nada foi criado.';
const SISTEMA = { tipo: 'sistema' } as const;

export type NovaConta = { usuarioId: string; nome: string; email: string; papel: Papel; hash: string };

// Grava a conta (user + account de senha, sem 2FA) e o evento `conta_criada`, na transação de quem chama. Única forma de
// criar conta nos scripts: o criar-usuario (senha gerada) e o seed fictício da T33 (senha conhecida) passam por aqui.
// O hash é o do Better Auth (`$context.password.hash`), calculado por quem chama.
export async function gravarConta(tx: Db, c: NovaConta, relogio: Relogio): Promise<void> {
  // O Better Auth compara o e-mail em minúsculas no login.
  const email = c.email.toLowerCase();
  const [existente] = await tx.select({ id: user.id }).from(user).where(eq(user.email, email));
  if (existente) throw new ErroDominio('conflito', MENSAGEM_JA_EXISTE);
  await tx.insert(user).values({ id: c.usuarioId, name: c.nome, email, emailVerified: true, papel: c.papel });
  await tx.insert(account).values({ id: randomUUID(), accountId: c.usuarioId, providerId: 'credential', userId: c.usuarioId, password: c.hash });
  // Só o papel: nem e-mail, nem nome, nem senha no histórico.
  await registrarEvento(tx, { ator: SISTEMA, entidade: 'usuario', entidadeId: c.usuarioId, acao: 'conta_criada', depois: { papel: c.papel } }, relogio);
}

export async function criarUsuario(deps: DepsDoScript, a: ArgumentosCriarUsuario, saida: Saida): Promise<{ usuarioId: string }> {
  const r = argumentosCriarUsuario.safeParse(a);
  if (!r.success) throw deZod(r.error);
  const senha = gerarSenha();
  const hash = await (await deps.auth.$context).password.hash(senha);
  const usuarioId = randomUUID();

  try {
    await comTransacao(deps.pool, ({ tx }) => gravarConta(tx, { usuarioId, nome: r.data.nome, email: r.data.email, papel: r.data.papel, hash }, deps.relogio));
  } catch (e) {
    // Duas criações do mesmo e-mail ao mesmo tempo: a segunda bate no UNIQUE do banco.
    if (reduzirErro(e).code === '23505') throw new ErroDominio('conflito', MENSAGEM_JA_EXISTE);
    throw e;
  }

  log.info({ evento: 'conta_criada', atorTipo: 'sistema' });
  saida.write(
    `Conta criada (papel ${r.data.papel}).\n` +
      `Senha inicial, mostrada só esta vez: ${senha}\n` +
      'Guarde a senha agora. No primeiro acesso, entre com ela e configure o 2FA.\n',
  );
  return { usuarioId };
}

if (ehExecucaoDireta(process.argv[1], import.meta.url, process.cwd())) {
  process.exitCode = await rodarScript(async (deps, argv, saida) => {
    await criarUsuario(deps, lerArgumentos(argumentosCriarUsuario, argv), saida);
    return 0;
  });
}
