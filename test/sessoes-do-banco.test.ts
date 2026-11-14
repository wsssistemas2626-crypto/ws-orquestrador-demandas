// test/sessoes-do-banco.test.ts — SB-14 (a, b): a verificação do C-27 pega o papel do migrator (prova permanente, CA-04.3),
// ignora processo de fundo do Postgres e espera, por tentativas contadas, a sessão de cliente ainda sem papel. O
// diagnóstico não tem URL nem senha. Banco real.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from './banco';
import { criarPool } from '../src/db';
import { diagnosticoDasSessoes, papeisDasSessoesDeCliente, sessoesDoBanco } from './sessoes-do-banco';

let b: BancoDeTeste;
beforeAll(async () => {
  b = await novoBanco();
});
afterAll(async () => {
  await b.fechar();
});

describe('C-27: a verificação das sessões', () => {
  it('CA-04.3: com uma conexão do migrator no mesmo banco, o papel dele aparece e a lista não é só orquestrador_app', async () => {
    const migrator = criarPool(b.urlMigrator, { max: 1 });
    try {
      await migrator.query('select 1');
      await b.poolApp.query('select 1');
      const papeis = await papeisDasSessoesDeCliente(b.poolApp);
      expect(papeis).not.toEqual(['orquestrador_app']);
      expect(papeis).toContain(new URL(b.urlMigrator).username);
    } finally {
      await migrator.end();
    }
  });
  it('só o app conectado: a lista é exatamente orquestrador_app', async () => {
    await b.poolApp.query('select 1');
    expect(await papeisDasSessoesDeCliente(b.poolApp)).toEqual(['orquestrador_app']);
  });
  it('o diagnóstico não contém as URLs nem as senhas', async () => {
    const texto = diagnosticoDasSessoes(await sessoesDoBanco(b.poolApp));
    for (const url of [b.urlApp, b.urlMigrator]) {
      expect(texto).not.toContain(url);
      expect(texto).not.toContain(decodeURIComponent(new URL(url).password));
    }
  });
});
