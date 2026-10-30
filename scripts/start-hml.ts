// Subida da homologação (ADR-12; padrão técnico, seção 9): `pnpm start:hml`, o comando do app no docker-compose.hml.yml
// que a etapa 09 escreve. Ordem: migrations com o migrator (DATABASE_URL_MIGRATOR, como `pnpm db:migrate`) → seed
// fictício (só com SEED_FICTICIO=1 e banco vazio; nas subidas seguintes ele recusa, e a subida continua) → `pnpm start`.
// A produção não usa este comando: lá o app sobe só com `pnpm start`, sem a URL do migrator, e a migration é um passo
// separado (backup → migrate → deploy).
//
// O app filho recebe o ambiente sem DATABASE_URL_MIGRATOR: nem na homologação o processo que atende requisição tem a
// credencial de DDL. Falha na migração, na configuração ou no seed não sobe o app (sai com 1), e a mensagem leva só a
// classe e o código do erro ou o nome da variável, nunca a URL (C-21).
import { spawn } from 'node:child_process';
import { criarDb, criarPool } from '../src/db';
import { lerConfigApp } from '../src/lib/env';
import { criarFila } from '../src/lib/fila';
import { reduzirErro } from '../src/lib/reduzir-erro';
import { relogioDoSistema, type Relogio } from '../src/lib/relogio';
import { criarAuth } from '../src/modules/acesso/auth';
import { mensagemDeErro, type Saida } from './lib/saida';
import { ehExecucaoDireta, migrar } from './migrate';
import { seedFicticio } from './seed-ficticio';

type Ambiente = Record<string, string | undefined>;

export type PassosHml = {
  migrar(urlMigrator: string): Promise<void>;
  // Sobe o app e devolve o código de saída dele.
  iniciarApp(env: Ambiente): Promise<number>;
};

// `pnpm start` no mesmo terminal; SIGTERM e SIGINT do contêiner passam para o filho, e o código dele vira o nosso.
function iniciarAppDeVerdade(env: Ambiente): Promise<number> {
  return new Promise((resolver) => {
    // `Record` em vez de `NodeJS.ProcessEnv` no tipo de cima pelo mesmo motivo de lerConfigApp (NODE_ENV obrigatório nos
    // tipos do Next); o spawn só lê os pares.
    const filho = spawn('pnpm', ['start'], { stdio: 'inherit', env: env as NodeJS.ProcessEnv });
    const repassar = (sinal: NodeJS.Signals) => void filho.kill(sinal);
    process.on('SIGTERM', repassar);
    process.on('SIGINT', repassar);
    const terminar = (codigo: number) => {
      process.off('SIGTERM', repassar);
      process.off('SIGINT', repassar);
      resolver(codigo);
    };
    filho.on('error', () => terminar(1));
    filho.on('exit', (codigo, sinal) => terminar(codigo ?? (sinal ? 1 : 0)));
  });
}

const PASSOS_DE_VERDADE: PassosHml = { migrar, iniciarApp: iniciarAppDeVerdade };

// O seed com as dependências do app (lerConfigApp, a mesma conferência do boot) e a fila, para o aviso do DEC fictício
// entrar com o job. Pool e fila fecham antes de o app subir.
async function semear(env: Ambiente, relogio: Relogio): Promise<'semeado' | 'recusado'> {
  const config = lerConfigApp(env);
  const pool = criarPool(config.databaseUrl, { max: 2 });
  let fila: Awaited<ReturnType<typeof criarFila>> | null = null;
  try {
    const db = criarDb(pool);
    fila = await criarFila(config.databaseUrl);
    return await seedFicticio({ db, pool, relogio, fila, auth: criarAuth({ db, config, relogio }), config }, env);
  } finally {
    await fila?.parar().catch(() => undefined);
    await pool.end().catch(() => undefined);
  }
}

export async function iniciarHomologacao(
  env: Ambiente,
  op: { passos?: Partial<PassosHml>; relogio?: Relogio; saida?: Saida; erro?: Saida } = {},
): Promise<number> {
  const passos: PassosHml = { ...PASSOS_DE_VERDADE, ...op.passos };
  const saida = op.saida ?? process.stdout;
  const erro = op.erro ?? process.stderr;

  const urlMigrator = env.DATABASE_URL_MIGRATOR;
  if (!urlMigrator) {
    erro.write('DATABASE_URL_MIGRATOR ausente. A homologação não sobe.\n');
    return 1;
  }
  try {
    await passos.migrar(urlMigrator);
  } catch (e) {
    const { classe, code } = reduzirErro(e);
    erro.write(`Migrations não aplicadas (${classe} ${code ?? 'sem código'}). A homologação não sobe.\n`);
    return 1;
  }
  saida.write('Migrations aplicadas.\n');

  try {
    const r = await semear(env, op.relogio ?? relogioDoSistema);
    saida.write(r === 'semeado' ? 'Dados fictícios criados.\n' : 'Seed fictício não rodou (banco já tem dados ou SEED_FICTICIO não é 1).\n');
  } catch (e) {
    erro.write(`${mensagemDeErro(e)} A homologação não sobe.\n`);
    return 1;
  }

  const envDoApp = Object.fromEntries(Object.entries(env).filter(([nome]) => nome !== 'DATABASE_URL_MIGRATOR'));
  return passos.iniciarApp(envDoApp);
}

if (ehExecucaoDireta(process.argv[1], import.meta.url, process.cwd())) {
  process.exitCode = await iniciarHomologacao(process.env);
}
