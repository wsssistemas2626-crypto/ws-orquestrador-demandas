// Parecer 2 da 06-T05-tech-lead.md: uma conexão ociosa que o banco derruba (reinício do Postgres,
// pg_terminate_backend) faz o pool emitir 'error'. Sem ouvinte, esse 'error' derruba o processo do app ou do worker.
// Com o ouvinte de criarPool, o pool descarta a conexão, o log registra só classe e código (C-21) e a próxima consulta
// abre uma conexão nova.
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../test/banco';
import { substituirDestinoDoLog } from '../lib/log';

let b: BancoDeTeste;
const linhas: string[] = [];
beforeAll(async () => {
  substituirDestinoDoLog({ write: (l) => void linhas.push(l) });
  b = await novoBanco();
});
afterAll(async () => {
  substituirDestinoDoLog(null);
  await b.fechar();
});
beforeEach(() => {
  linhas.length = 0;
});

const perdas = () => linhas.filter((l) => l.includes('"conexao_perdida"'));

it('conexão ociosa derrubada pelo banco: o processo segue, o log registra conexao_perdida e a próxima consulta responde', async () => {
  const pid = (await b.poolApp.query('select pg_backend_pid() as pid')).rows[0].pid as number;
  expect(b.poolApp.idleCount).toBe(1);
  await b.poolMigrator.query('select pg_terminate_backend($1)', [pid]);
  await expect.poll(() => perdas().length, { timeout: 5_000 }).toBe(1);
  await expect.poll(() => b.poolApp.totalCount, { timeout: 5_000 }).toBe(0);
  const outro = (await b.poolApp.query('select pg_backend_pid() as pid')).rows[0].pid as number;
  expect(outro).not.toBe(pid);
});

it('a linha do log tem só o evento e o erro reduzido a classe e código, sem a mensagem do Postgres', async () => {
  const pid = (await b.poolApp.query('select pg_backend_pid() as pid')).rows[0].pid as number;
  await b.poolMigrator.query('select pg_terminate_backend($1)', [pid]);
  await expect.poll(() => perdas().length, { timeout: 5_000 }).toBe(1);
  const linha = JSON.parse(perdas()[0]!) as Record<string, unknown>;
  expect(linha).toMatchObject({ level: 40, evento: 'conexao_perdida', erro: { code: '57P01' } });
  expect(Object.keys(linha).sort()).toEqual(['erro', 'evento', 'level', 'time']);
  expect(perdas()[0]).not.toMatch(/terminating|administrator/i);
});
