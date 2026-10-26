// Configuração e contas fictícias para os testes do Better Auth. A conta é criada pelo `internalAdapter` do próprio
// Better Auth, o mesmo caminho do script de criação de usuário (T32): nada de inserir linha à mão.
import { randomBytes, randomUUID } from 'node:crypto';
import type { ConfigApp } from '../src/lib/env';
import type { Papel } from '../src/modules/acesso/ator';
import type { Auth } from '../src/modules/acesso/auth';

export const CONFIG_TESTE: ConfigApp = {
  urlBase: 'http://127.0.0.1:3101',
  segredoAuth: 'SEGREDO-FICTICIO-DE-TESTE-'.padEnd(48, '0'),
  cabecalhoIp: 'x-real-ip',
  retencaoDias: 90,
  producao: false,
  databaseUrl: 'postgres://ficticio:ficticio@127.0.0.1:5434/ficticio',
};

export async function criarContaDeTeste(
  auth: Auth,
  op: { papel: Papel; email?: string; nome?: string },
): Promise<{ usuarioId: string; email: string; senha: string }> {
  const ctx = await auth.$context;
  const email = op.email ?? `pessoa-${randomUUID().slice(0, 8)}@exemplo.test`;
  const senha = randomBytes(18).toString('base64url');
  // Criação pelo servidor, fora de endpoint: a origem informada ao Better Auth é o script (T32 usa a mesma).
  const criado = await ctx.internalAdapter.createUser(
    { email, name: op.nome ?? 'Pessoa Ficticia', emailVerified: true, papel: op.papel },
    { method: 'script' },
  );
  await ctx.internalAdapter.linkAccount({
    userId: criado.id,
    providerId: 'credential',
    accountId: criado.id,
    password: await ctx.password.hash(senha),
  });
  return { usuarioId: criado.id, email, senha };
}
