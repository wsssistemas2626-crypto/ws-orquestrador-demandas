// T33: scripts de token de serviço, preço por modelo, seed fictício e subida da homologação (RF-02, C-09, C-33, C-37,
// ADR-12, padrão técnico seção 9). Banco real (Testcontainers), papel do app, relógio fixo (RNF-15). Dados só fictícios
// (domínio .test, "Pessoa Ficticia", sentinelas).
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CONFIG_TESTE } from '../test/auth';
import { novoBanco, type BancoDeTeste } from '../test/banco';
import { criarDepsDeTeste } from '../test/deps';
import { SENTINELAS, contemSentinela } from '../test/sentinelas';
import { codigoTotp, criarPessoa, PoteDeCookies, postAuth } from '../test/sessao';
import { PAPEL_APP } from '../src/db/privilegios';
import type { Deps } from '../src/lib/deps';
import { ErroDominio } from '../src/lib/erros';
import { FILAS } from '../src/lib/fila';
import { substituirDestinoDoLog } from '../src/lib/log';
import { relogioDoSistema, relogioFixo } from '../src/lib/relogio';
import { exigirPessoa } from '../src/modules/acesso/exigir-pessoa';
import { validarTokenServico } from '../src/modules/acesso/tokens-servico';
import { precoVigente } from '../src/modules/agentes/preco';
import { criarDemanda } from '../src/modules/demandas/servico';
import { argumentosCriarToken, criarTokenPorScript, executarCriarToken } from './criar-token-servico';
import { argumentosDefinirPreco, definirPrecoModelo, executarDefinirPreco } from './definir-preco-modelo';
import { lerArgumentos } from './lib/argumentos';
import { mensagemDeErro } from './lib/saida';
import { argumentosRevogarToken, executarRevogarToken, revogarTokenPorScript } from './revogar-token-servico';
import { CONTAS_FICTICIAS, executarSeed, MENSAGENS_SEED, seedFicticio, TITULOS_DO_E2E, TOTAL_DEMANDAS_DO_SEED } from './seed-ficticio';
import { iniciarHomologacao } from './start-hml';

// Saída padrão de mentira: guarda tudo o que o script escreveu.
function saidaDeTeste() {
  const partes: string[] = [];
  return { write: (s: string) => void partes.push(s), texto: () => partes.join('') };
}

const tokenDaSaida = (texto: string) => /mostrado só esta vez: (\S+)/.exec(texto)?.[1] ?? '';
const contar = async (b: BancoDeTeste, sql: string, valores: unknown[] = []) => (await b.poolMigrator.query(sql, valores)).rows[0].n as number;

// Erro lançado por uma função síncrona, para conferir o código e o texto sem repetir try/catch.
function erroDe(fn: () => unknown): ErroDominio {
  try {
    fn();
  } catch (e) {
    if (e instanceof ErroDominio) return e;
    throw e;
  }
  throw new Error('esperava ErroDominio');
}

describe('criar e revogar token de serviço (RF-02, C-09, C-37)', () => {
  let b: BancoDeTeste;
  let deps: Deps;
  const linhasDoLog: string[] = [];

  beforeAll(async () => {
    b = await novoBanco();
    deps = await criarDepsDeTeste(b, { relogio: relogioFixo('2026-10-22T12:00:00Z') });
    substituirDestinoDoLog({ write: (l) => void linhasDoLog.push(l) });
  });
  afterAll(async () => {
    substituirDestinoDoLog(null);
    await deps.fila.parar();
    await b.fechar();
  });

  it('token sai uma vez na saída padrão e nunca no pino; o evento leva o prefixo', async () => {
    const inicio = linhasDoLog.length;
    const saida = saidaDeTeste();
    const { prefixo } = await criarTokenPorScript(deps, 'risco', saida);
    const token = tokenDaSaida(saida.texto());
    expect(token).toMatch(/^wsod_[A-Za-z0-9_-]{43}$/);
    expect(token.slice(5, 13)).toBe(prefixo);
    expect(saida.texto().split(token)).toHaveLength(2); // uma ocorrência
    expect(saida.texto()).toContain(`prefixo ${prefixo}`);
    const doTeste = linhasDoLog.slice(inicio).join('');
    expect(doTeste).toContain('token_criado');
    expect(doTeste).not.toContain(token);
    // O banco guarda só o hash; o evento tem o agente e o prefixo, nunca o token.
    const linha = (await b.poolMigrator.query('select hash, prefixo, agente from token_servico where prefixo = $1', [prefixo])).rows[0];
    expect(linha).toMatchObject({ prefixo, agente: 'risco' });
    expect(linha.hash).not.toContain(token);
    const eventos = (await b.poolMigrator.query("select * from evento where acao = 'token_criado' and entidade_id = $1", [prefixo])).rows;
    expect(eventos).toHaveLength(1);
    expect(eventos[0]).toMatchObject({ ator_tipo: 'sistema', entidade: 'token_servico', demanda_id: null, depois: { agente: 'risco', prefixo } });
    expect(eventos[0].ocorrido_em).toEqual(new Date('2026-10-22T12:00:00Z'));
    expect(JSON.stringify(eventos)).not.toContain(token);
    // O token criado vale como o agente.
    await expect(validarTokenServico(b.db, token)).resolves.toEqual({ tipo: 'agente', agente: 'risco', prefixoToken: prefixo });
  });

  it('revogar pelo prefixo grava token_revogado e o token deixa de valer', async () => {
    const s1 = saidaDeTeste();
    const s2 = saidaDeTeste();
    const { prefixo } = await criarTokenPorScript(deps, 'consolidacao', s1);
    const outro = await criarTokenPorScript(deps, 'consolidacao', s2);
    const token = tokenDaSaida(s1.texto());
    expect(await revogarTokenPorScript(deps, prefixo)).toBe(true);
    await expect(validarTokenServico(b.db, token)).resolves.toBeNull();
    const eventos = (await b.poolMigrator.query("select * from evento where acao = 'token_revogado' and entidade_id = $1", [prefixo])).rows;
    expect(eventos).toHaveLength(1);
    expect(eventos[0]).toMatchObject({ ator_tipo: 'sistema', entidade: 'token_servico', depois: { prefixo } });
    expect(JSON.stringify(eventos)).not.toContain(token);
    // O outro token do mesmo agente continua valendo.
    await expect(validarTokenServico(b.db, tokenDaSaida(s2.texto()))).resolves.toMatchObject({ agente: 'consolidacao', prefixoToken: outro.prefixo });
    // Repetir não muda nada nem grava outro evento; prefixo sem token ativo também não.
    expect(await revogarTokenPorScript(deps, prefixo)).toBe(false);
    expect(await revogarTokenPorScript(deps, 'AAAAAAAA')).toBe(false);
    expect(await contar(b, "select count(*)::int as n from evento where acao = 'token_revogado' and entidade_id = $1", [prefixo])).toBe(1);
  });

  it('revogar com prefixo fora do formato é recusado antes do banco', async () => {
    for (const prefixo of ['curto', 'comprido-demais', `${SENTINELAS.texto}`, "a' or '1"]) {
      await expect(revogarTokenPorScript(deps, prefixo)).rejects.toMatchObject({ codigo: 'entrada_invalida' });
    }
  });

  it('C-37: --token e --senha não existem; agente só um dos quatro', () => {
    expect(lerArgumentos(argumentosCriarToken, ['--agente', 'insumo_tecnico'])).toEqual({ agente: 'insumo_tecnico' });
    for (const argv of [
      ['--agente', 'risco', '--token', SENTINELAS.token],
      ['--agente', 'risco', `--senha=${SENTINELAS.senha}`],
    ]) {
      const e = erroDe(() => lerArgumentos(argumentosCriarToken, argv));
      expect(e.codigo).toBe('entrada_invalida');
      expect(contemSentinela(JSON.stringify(e) + e.mensagem + mensagemDeErro(e))).toBe(false);
    }
    for (const agente of ['admin', 'cto', 'RISCO', '']) {
      expect(() => lerArgumentos(argumentosCriarToken, ['--agente', agente])).toThrow(ErroDominio);
    }
    expect(lerArgumentos(argumentosRevogarToken, ['--prefixo', 'Ab3_-xY9'])).toEqual({ prefixo: 'Ab3_-xY9' });
    expect(() => lerArgumentos(argumentosRevogarToken, ['--prefixo', 'Ab3_-xY9', '--token', SENTINELAS.token])).toThrow(ErroDominio);
  });

  it('criar com agente fora da lista, chamado direto, não grava nada', async () => {
    const saida = saidaDeTeste();
    const antes = await contar(b, 'select count(*)::int as n from token_servico');
    await expect(criarTokenPorScript(deps, 'admin' as never, saida)).rejects.toMatchObject({ codigo: 'entrada_invalida' });
    expect(saida.texto()).toBe('');
    expect(await contar(b, 'select count(*)::int as n from token_servico')).toBe(antes);
  });

  it('main: criar sai com 0 e mostra o token; revogar sai com 0 e, sem token ativo, com 1', async () => {
    const saida = saidaDeTeste();
    expect(await executarCriarToken(deps, ['--agente', 'orquestrador'], saida)).toBe(0);
    const token = tokenDaSaida(saida.texto());
    const prefixo = token.slice(5, 13);
    const r1 = saidaDeTeste();
    expect(await executarRevogarToken(deps, ['--prefixo', prefixo], r1)).toBe(0);
    expect(r1.texto()).toContain(prefixo);
    expect(r1.texto()).not.toContain(token);
    const r2 = saidaDeTeste();
    expect(await executarRevogarToken(deps, ['--prefixo', prefixo], r2)).toBe(1);
    expect(r2.texto()).toContain('Nada foi alterado');
  });
});

describe('definir preço por modelo (RF-17, C-26)', () => {
  let b: BancoDeTeste;
  let deps: Deps;
  const relogio = relogioFixo('2026-10-22T12:00:00Z');
  const linhasDoLog: string[] = [];

  beforeAll(async () => {
    b = await novoBanco();
    deps = await criarDepsDeTeste(b, { relogio });
    substituirDestinoDoLog({ write: (l) => void linhasDoLog.push(l) });
  });
  afterAll(async () => {
    substituirDestinoDoLog(null);
    await deps.fila.parar();
    await b.fechar();
  });

  it('preço novo vira a vigência mais nova sem apagar a anterior', async () => {
    const t1 = relogio.agora();
    await definirPrecoModelo(deps, { modelo: 'modelo-ficticio-a', entradaPorMilhao: 3, saidaPorMilhao: 15 });
    relogio.avancar(60_000);
    await definirPrecoModelo(deps, { modelo: 'modelo-ficticio-a', entradaPorMilhao: 4.5, saidaPorMilhao: 20.123456 });
    expect(await precoVigente(b.db, 'modelo-ficticio-a', relogio.agora())).toEqual({ entradaPorMilhao: 4.5, saidaPorMilhao: 20.123456 });
    expect(await precoVigente(b.db, 'modelo-ficticio-a', t1)).toEqual({ entradaPorMilhao: 3, saidaPorMilhao: 15 });
    const linhas = (await b.poolMigrator.query("select vigente_desde, moeda from preco_modelo where modelo = 'modelo-ficticio-a' order by vigente_desde")).rows;
    expect(linhas).toEqual([
      { vigente_desde: t1, moeda: 'USD' },
      { vigente_desde: relogio.agora(), moeda: 'USD' },
    ]);
  });

  it('dois preços do mesmo modelo no mesmo instante → conflito, e o primeiro fica', async () => {
    await definirPrecoModelo(deps, { modelo: 'modelo-ficticio-b', entradaPorMilhao: 1, saidaPorMilhao: 2 });
    await expect(definirPrecoModelo(deps, { modelo: 'modelo-ficticio-b', entradaPorMilhao: 9, saidaPorMilhao: 9 })).rejects.toMatchObject({ codigo: 'conflito' });
    expect(await precoVigente(b.db, 'modelo-ficticio-b', relogio.agora())).toEqual({ entradaPorMilhao: 1, saidaPorMilhao: 2 });
  });

  it('preço negativo, com mais de 6 casas, grande demais ou modelo vazio é recusado sem gravar', async () => {
    for (const a of [
      { modelo: 'modelo-ficticio-c', entradaPorMilhao: -1, saidaPorMilhao: 1 },
      { modelo: 'modelo-ficticio-c', entradaPorMilhao: 1, saidaPorMilhao: 0.0000001 },
      { modelo: 'modelo-ficticio-c', entradaPorMilhao: 1_000_000, saidaPorMilhao: 1 },
      { modelo: 'modelo-ficticio-c', entradaPorMilhao: Number.NaN, saidaPorMilhao: 1 },
      { modelo: ' ', entradaPorMilhao: 1, saidaPorMilhao: 1 },
      { modelo: 'modelo com espaço', entradaPorMilhao: 1, saidaPorMilhao: 1 },
    ]) {
      await expect(definirPrecoModelo(deps, a)).rejects.toMatchObject({ codigo: 'entrada_invalida' });
    }
    expect(await contar(b, "select count(*)::int as n from preco_modelo where modelo like 'modelo-ficticio-c%'")).toBe(0);
  });

  it('argumentos: --modelo, --entradaPorMilhao e --saidaPorMilhao, em dólar com até 6 casas', () => {
    expect(lerArgumentos(argumentosDefinirPreco, ['--modelo', 'modelo-ficticio', '--entradaPorMilhao', '3', '--saidaPorMilhao=15.5'])).toEqual({
      modelo: 'modelo-ficticio',
      entradaPorMilhao: 3,
      saidaPorMilhao: 15.5,
    });
    for (const valor of ['-1', '1,5', 'abc', '1e3', '0.1234567', '']) {
      const e = erroDe(() => lerArgumentos(argumentosDefinirPreco, ['--modelo', 'm', '--entradaPorMilhao', valor, '--saidaPorMilhao', '1']));
      expect(e.mensagem).toContain('--entradaPorMilhao');
    }
  });

  it('main: define o preço, mostra modelo, valores e início da vigência, e sai com 0', async () => {
    const saida = saidaDeTeste();
    relogio.avancar(60_000);
    expect(await executarDefinirPreco(deps, ['--modelo', 'modelo-ficticio-d', '--entradaPorMilhao', '0.25', '--saidaPorMilhao', '1.25'], saida)).toBe(0);
    expect(saida.texto()).toContain('modelo-ficticio-d');
    expect(saida.texto()).toContain('US$ 0,25');
    expect(saida.texto()).toContain('US$ 1,25');
    expect(await precoVigente(b.db, 'modelo-ficticio-d', relogio.agora())).toEqual({ entradaPorMilhao: 0.25, saidaPorMilhao: 1.25 });
  });
});

describe('seed fictício (padrão técnico seção 9, C-37)', () => {
  let b: BancoDeTeste;
  let deps: Deps;
  const linhasDoLog: string[] = [];

  beforeAll(async () => {
    b = await novoBanco();
    deps = await criarDepsDeTeste(b, { relogio: relogioFixo('2026-10-22T12:00:00Z') });
    substituirDestinoDoLog({ write: (l) => void linhasDoLog.push(l) });
  });
  afterAll(async () => {
    substituirDestinoDoLog(null);
    await deps.fila.parar();
    await b.fechar();
  });

  it('seed sem SEED_FICTICIO=1 → recusado; com demanda já existente → recusado', async () => {
    for (const env of [{}, { SEED_FICTICIO: '0' }, { SEED_FICTICIO: 'true' }, { SEED_FICTICIO: ' 1' }]) {
      expect(await seedFicticio(deps, env)).toBe('recusado');
    }
    expect(await contar(b, 'select count(*)::int as n from "user"')).toBe(0);

    // Banco com uma demanda (e a conta de quem a criou): o seed não mexe em nada.
    const outro = await novoBanco();
    const depsOutro = await criarDepsDeTeste(outro);
    try {
      const pessoa = await criarPessoa(depsOutro, { papel: 'cto' });
      await criarDemanda(depsOutro, { tipo: 'pessoa', usuarioId: pessoa.usuarioId, nome: 'Pessoa Ficticia', papel: 'cto' }, {
        titulo: 'Demanda ficticia existente',
        tipo: 'bug',
        solicitanteNome: 'Pessoa Ficticia',
        anexos: [],
      });
      expect(await seedFicticio(depsOutro, { SEED_FICTICIO: '1' })).toBe('recusado');
      expect(await contar(outro, 'select count(*)::int as n from demanda')).toBe(1);
      expect(await contar(outro, 'select count(*)::int as n from "user"')).toBe(1);
      expect(await contar(outro, 'select count(*)::int as n from preco_modelo')).toBe(0);
    } finally {
      await depsOutro.fila.parar();
      await outro.fechar();
    }
  });

  it('com conta já existente e nenhuma demanda → recusado (não cria conta de senha conhecida ao lado de conta real)', async () => {
    const outro = await novoBanco();
    const depsOutro = await criarDepsDeTeste(outro);
    try {
      await criarPessoa(depsOutro, { papel: 'cto', com2fa: false });
      expect(await seedFicticio(depsOutro, { SEED_FICTICIO: '1' })).toBe('recusado');
      expect(await contar(outro, 'select count(*)::int as n from "user"')).toBe(1);
      expect(await contar(outro, "select count(*)::int as n from \"user\" where email like '%@ficticio.test'")).toBe(0);
    } finally {
      await depsOutro.fila.parar();
      await outro.fechar();
    }
  });

  // M-07 (DEC-DEM-20261103-0007-v1): segunda guarda, independente do SEED_FICTICIO e do banco vazio. A URL da configuração
  // (config.urlBase, a origin do BETTER_AUTH_URL validada por lerConfigApp) tem de estar no loopback, por igualdade exata.
  it.each([
    'https://orquestrador.exemplo.test',
    'http://127.0.0.1.exemplo.test',
    'https://localhost.exemplo.test',
    'http://10.0.0.5:3101',
  ])('M-07: com SEED_FICTICIO=1, banco vazio e urlBase %s → recusado_producao, código 1, mensagem fixa sem a URL, nenhuma conta', async (url) => {
    const depsProducao = { ...deps, config: { ...deps.config, urlBase: new URL(url).origin } };
    const inicio = linhasDoLog.length;
    expect(await seedFicticio(depsProducao, { SEED_FICTICIO: '1' })).toBe('recusado_producao');
    const s = saidaDeTeste();
    expect(await executarSeed(depsProducao, [], s, { SEED_FICTICIO: '1' })).toBe(1);
    expect(s.texto()).toBe(MENSAGENS_SEED.recusado_producao);
    expect(s.texto()).toContain('BETTER_AUTH_URL');
    expect(s.texto()).not.toContain(new URL(url).hostname);
    const doTeste = linhasDoLog.slice(inicio).join('');
    expect(doTeste).toContain('url_fora_do_loopback');
    expect(doTeste).not.toContain(new URL(url).hostname);
    for (const tabela of ['"user"', 'demanda', 'preco_modelo', 'evento']) expect(await contar(b, `select count(*)::int as n from ${tabela}`), tabela).toBe(0);
  });

  it('M-07: a recusa por URL vem antes de abrir a transação (nem a trava consultiva é pedida)', async () => {
    let conexoes = 0;
    const poolEspiao = new Proxy(deps.pool, {
      get(alvo, prop, receptor) {
        if (prop === 'connect') conexoes += 1;
        const v = Reflect.get(alvo, prop, receptor) as unknown;
        return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(alvo) : v;
      },
    });
    const depsProducao = { ...deps, pool: poolEspiao, config: { ...deps.config, urlBase: 'https://orquestrador.exemplo.test' } };
    expect(await seedFicticio(depsProducao, { SEED_FICTICIO: '1' })).toBe('recusado_producao');
    expect(conexoes).toBe(0);
  });

  it('M-07: sem SEED_FICTICIO=1, a recusa segue a de antes, mesmo com a URL fora do loopback', async () => {
    const depsProducao = { ...deps, config: { ...deps.config, urlBase: 'https://orquestrador.exemplo.test' } };
    expect(await seedFicticio(depsProducao, {})).toBe('recusado');
  });

  it.each(['http://localhost:3101', 'http://[::1]:3101'])('M-07: urlBase %s (loopback) → semeia', async (url) => {
    const outro = await novoBanco();
    const depsOutro = await criarDepsDeTeste(outro);
    try {
      expect(await seedFicticio({ ...depsOutro, config: { ...depsOutro.config, urlBase: new URL(url).origin } }, { SEED_FICTICIO: '1' })).toBe('semeado');
      expect(await contar(outro, 'select count(*)::int as n from "user"')).toBe(4);
    } finally {
      await depsOutro.fila.parar();
      await outro.fechar();
    }
  });

  it('seed cria contas com e-mail .test e 2FA ativo, e a demanda de rascunho de agente', async () => {
    // O deps deste bloco usa CONFIG_TESTE: http://127.0.0.1:3101, o caso de loopback do e2e.
    expect(new URL(deps.config.urlBase).hostname).toBe('127.0.0.1');
    const inicio = linhasDoLog.length;
    expect(await seedFicticio(deps, { SEED_FICTICIO: '1' })).toBe('semeado');

    const contas = (await b.poolMigrator.query('select email, papel, two_factor_enabled, desativado_em from "user" order by email')).rows;
    expect(contas).toEqual(
      [
        { email: CONTAS_FICTICIAS.administradora.email, papel: 'administradora', two_factor_enabled: true, desativado_em: null },
        { email: CONTAS_FICTICIAS.configurar2fa.email, papel: 'cto', two_factor_enabled: false, desativado_em: null },
        { email: CONTAS_FICTICIAS.cto.email, papel: 'cto', two_factor_enabled: true, desativado_em: null },
        { email: CONTAS_FICTICIAS.sem2fa.email, papel: 'cto', two_factor_enabled: false, desativado_em: null },
      ].sort((x, y) => x.email.localeCompare(y.email)),
    );
    for (const c of contas) expect(c.email).toMatch(/@ficticio\.test$/);
    expect(await contar(b, 'select count(*)::int as n from two_factor')).toBe(2);
    expect(await contar(b, "select count(*)::int as n from evento where acao = 'conta_criada' and ator_tipo = 'sistema'")).toBe(4);

    // Preço do modelo fictício, para o agente poder ser ligado na homologação; os agentes seguem desligados.
    expect(await precoVigente(b.db, 'modelo-ficticio', new Date('2026-10-22T12:00:00Z'))).toEqual({ entradaPorMilhao: 3, saidaPorMilhao: 15 });
    expect(await contar(b, 'select count(*)::int as n from configuracao_agente where ligado')).toBe(0);

    // Uma demanda de cada tipo, mais as nove próprias do e2e (08-correcao e DEC-DEM-20261102-0002-v1); uma delas com ESP,
    // RSK e DEC gravados como rascunho de agente (para a T43).
    expect(TOTAL_DEMANDAS_DO_SEED).toBe(14);
    const tipos = (await b.poolMigrator.query('select distinct tipo from demanda order by tipo')).rows.map((r) => r.tipo);
    expect(tipos).toEqual(['bug', 'estudo', 'melhoria', 'novo_projeto', 'produto_proprio']);
    expect(await contar(b, 'select count(*)::int as n from demanda')).toBe(TOTAL_DEMANDAS_DO_SEED);
    const comPacote = (await b.poolMigrator.query('select demanda_id, autor_tipo, autor_id, rascunho_agente, versao from pacote_decisao')).rows;
    expect(comPacote).toEqual([{ demanda_id: expect.stringMatching(/^DEM-20261022-\d{4}$/), autor_tipo: 'agente', autor_id: 'consolidacao', rascunho_agente: true, versao: 1 }]);
    const demId = comPacote[0].demanda_id as string;
    const esp = (await b.poolMigrator.query('select autor_tipo, autor_id, rascunho_agente from especificacao_tecnica where demanda_id = $1', [demId])).rows;
    const rsk = (await b.poolMigrator.query('select autor_tipo, autor_id, rascunho_agente from parecer_risco where demanda_id = $1', [demId])).rows;
    expect(esp).toEqual([{ autor_tipo: 'agente', autor_id: 'insumo_tecnico', rascunho_agente: true }]);
    expect(rsk).toEqual([{ autor_tipo: 'agente', autor_id: 'risco', rascunho_agente: true }]);
    expect((await b.poolMigrator.query('select status from demanda where id = $1', [demId])).rows[0].status).toBe('pronta_para_decisao');
    expect(await contar(b, "select count(*)::int as n from evento where demanda_id = $1 and acao in ('especificacao_criada', 'parecer_risco_criado', 'pacote_decisao_criado') and ator_tipo = 'agente'", [demId])).toBe(3);

    // C-21: nada de senha, segredo ou e-mail das contas no log.
    const doTeste = linhasDoLog.slice(inicio).join('');
    expect(doTeste).toContain('seed_ficticio');
    for (const c of Object.values(CONTAS_FICTICIAS)) {
      expect(doTeste).not.toContain(c.senha);
      expect(doTeste).not.toContain(c.email);
    }

    // Segunda subida: o banco já tem demanda, nada muda.
    expect(await seedFicticio(deps, { SEED_FICTICIO: '1' })).toBe('recusado');
    expect(await contar(b, 'select count(*)::int as n from demanda')).toBe(TOTAL_DEMANDAS_DO_SEED);
    expect(await contar(b, 'select count(*)::int as n from "user"')).toBe(4);
  });

  // 08-correcao (A-02, C-36): cada teste do e2e que aprova um DEC tem uma demanda própria, criada pelo seed com o título
  // que a spec procura, sem ESP, RSK nem DEC e em Nova. A autora é a conta fictícia `sem2fa` (papel cto): o seed grava
  // com a hora do sistema, e as nove entrariam no limite de 30 demandas por hora (C-36) da conta que as criasse. A "cto"
  // e a "administradora" já gastam esse limite nas specs; a `sem2fa` nunca cria demanda no e2e. Desde o
  // DEC-DEM-20261102-0002-v1, também as da decisao.spec e da parecer-risco-qa.spec, que não aprovam DEC no segundo caso,
  // vêm daqui pelo mesmo limite.
  it('as demandas próprias do e2e: uma por título, de títulos diferentes, sem versão nenhuma, em Nova e pela conta sem2fa', async () => {
    const titulos = Object.values(TITULOS_DO_E2E);
    expect(new Set(titulos).size).toBe(titulos.length);
    const linhas = (
      await b.poolMigrator.query(
        `select d.titulo, d.tipo, d.status, d.autor_tipo, u.email, d.contexto,
           (select count(*)::int from especificacao_tecnica e where e.demanda_id = d.id) as esp,
           (select count(*)::int from parecer_risco r where r.demanda_id = d.id) as rsk,
           (select count(*)::int from pacote_decisao p where p.demanda_id = d.id) as dec
         from demanda d left join "user" u on u.id = d.autor_id
         where d.titulo = any($1) order by d.titulo`,
        [titulos],
      )
    ).rows;
    expect(linhas.map((l) => l.titulo)).toEqual([...titulos].sort((x, y) => (x < y ? -1 : x > y ? 1 : 0)));
    for (const l of linhas) {
      expect(l, l.titulo).toMatchObject({ status: 'nova', autor_tipo: 'pessoa', email: CONTAS_FICTICIAS.sem2fa.email, esp: 0, rsk: 0, dec: 0 });
      // A `descricao` do Pedido de Construção sai do contexto: vazia, o validarPedido recusa o pedido.
      expect(String(l.contexto ?? '').trim(), l.titulo).not.toBe('');
    }
    const tipoDe = (t: string) => linhas.find((l) => l.titulo === t)?.tipo;
    expect(tipoDe(TITULOS_DO_E2E.pedidoEstudo)).toBe('estudo');
    for (const t of [TITULOS_DO_E2E.pedidoGerar, TITULOS_DO_E2E.pedidoCopiar, TITULOS_DO_E2E.pedidoValidacao, TITULOS_DO_E2E.duplaAprovacao]) {
      expect(tipoDe(t), t).not.toBe('estudo');
    }
    // A do DEC só do CTO da axe-todas.spec (T11) é procurada entre as de tipo melhoria.
    expect(tipoDe(TITULOS_DO_E2E.axeSoCto)).toBe('melhoria');
    // DEC-DEM-20261102-0002-v1: as da decisao.spec e as duas da parecer-risco-qa.spec, que o e2e procura entre as de
    // tipo melhoria (demandaDoSeed, em e2e/apoio.ts), em vez de criá-las pela API da conta "cto" (C-36).
    expect(TITULOS_DO_E2E.decisao).toBe('Demanda da decisão (fictício)');
    expect(TITULOS_DO_E2E.rskDuploClique).toBe('Duplo clique no parecer de risco (fictício)');
    expect(TITULOS_DO_E2E.espListaDeTextos).toBe('Lista de textos da especificação (fictício)');
    for (const t of [TITULOS_DO_E2E.decisao, TITULOS_DO_E2E.rskDuploClique, TITULOS_DO_E2E.espListaDeTextos]) expect(tipoDe(t), t).toBe('melhoria');
    expect(titulos).toHaveLength(9);
    // A conta cto fica com as cinco de antes (uma de cada tipo), e a administradora com nenhuma, como antes da 08-correcao.
    const doSeedPor = (email: string) => contar(b, `select count(*)::int as n from demanda d join "user" u on u.id = d.autor_id where u.email = $1`, [email]);
    expect(await doSeedPor(CONTAS_FICTICIAS.cto.email)).toBe(5);
    expect(await doSeedPor(CONTAS_FICTICIAS.administradora.email)).toBe(0);
  });

  it('as contas com 2FA entram com a senha e o código do segredo de CONTAS_FICTICIAS', async () => {
    for (const [papel, conta] of [
      ['cto', CONTAS_FICTICIAS.cto],
      ['administradora', CONTAS_FICTICIAS.administradora],
    ] as const) {
      const pote = new PoteDeCookies();
      const login = await postAuth(deps.auth, '/sign-in/email', { email: conta.email, password: conta.senha });
      expect(login.status).toBe(200);
      expect(((await login.json()) as { twoFactorRedirect?: boolean }).twoFactorRedirect).toBe(true);
      pote.guardar(login);
      const verificar = await postAuth(deps.auth, '/two-factor/verify-totp', { code: codigoTotp(conta.segredoTotp, relogioDoSistema.agora()) }, { cookie: pote.cabecalho() });
      expect(verificar.status).toBe(200);
      pote.guardar(verificar);
      await expect(exigirPessoa(deps, new Headers({ cookie: pote.cabecalho() }))).resolves.toMatchObject({ tipo: 'pessoa', papel });
    }
  });

  it('as contas sem 2FA entram com a senha e são levadas a configurar o 2FA', async () => {
    for (const conta of [CONTAS_FICTICIAS.sem2fa, CONTAS_FICTICIAS.configurar2fa]) {
      const login = await postAuth(deps.auth, '/sign-in/email', { email: conta.email, password: conta.senha });
      expect(login.status).toBe(200);
      expect(((await login.json()) as { twoFactorRedirect?: boolean }).twoFactorRedirect).toBeUndefined();
      const cookie = login.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
      await expect(exigirPessoa(deps, new Headers({ cookie }))).rejects.toMatchObject({ codigo: 'sem_2fa' });
    }
  });

  it('C-33: o segredo TOTP e os códigos de recuperação ficam cifrados no banco', async () => {
    const linhas = (await b.poolMigrator.query('select secret, backup_codes from two_factor')).rows;
    expect(linhas).toHaveLength(2);
    const texto = JSON.stringify(linhas);
    expect(texto).not.toContain(CONTAS_FICTICIAS.cto.segredoTotp);
    expect(texto).not.toContain(CONTAS_FICTICIAS.administradora.segredoTotp);
    const segredos = linhas.map((l) => l.secret as string);
    expect(new Set(segredos).size).toBe(2);
  });

  it('as credenciais fictícias não têm o formato do token de serviço nem e-mail fora do .test', () => {
    for (const c of Object.values(CONTAS_FICTICIAS)) {
      expect(c.email).toMatch(/^[a-z0-9]+@ficticio\.test$/);
      expect(c.senha.length).toBeGreaterThanOrEqual(20);
      expect(c.senha).not.toMatch(/wsod_/);
    }
    expect(CONTAS_FICTICIAS.cto.segredoTotp).toMatch(/^[A-Z2-7]+$/);
    expect(CONTAS_FICTICIAS.administradora.segredoTotp).not.toBe(CONTAS_FICTICIAS.cto.segredoTotp);
  });
});

describe('start:hml (ADR-12)', () => {
  let b: BancoDeTeste;
  const linhasDoLog: string[] = [];

  beforeAll(async () => {
    b = await novoBanco();
    substituirDestinoDoLog({ write: (l) => void linhasDoLog.push(l) });
  });
  afterAll(async () => {
    substituirDestinoDoLog(null);
    await b.fechar();
  });

  const envHml = () => ({
    DATABASE_URL: b.urlApp,
    DATABASE_URL_MIGRATOR: b.urlMigrator,
    BETTER_AUTH_SECRET: CONFIG_TESTE.segredoAuth,
    BETTER_AUTH_URL: CONFIG_TESTE.urlBase,
    SEED_FICTICIO: '1',
  });

  it('migra com o migrator, semeia e só então sobe o app, sem a URL do migrator no ambiente do app', async () => {
    const ordem: string[] = [];
    const ambientes: Array<Record<string, string | undefined>> = [];
    const saida = saidaDeTeste();
    const erro = saidaDeTeste();
    const codigo = await iniciarHomologacao(envHml(), {
      relogio: relogioFixo('2026-10-22T12:00:00Z'),
      saida,
      erro,
      passos: {
        migrar: async () => void ordem.push('migrar'),
        iniciarApp: async (env) => {
          ordem.push('app');
          ambientes.push(env);
          return 0;
        },
      },
    });
    expect({ codigo, erro: erro.texto() }).toEqual({ codigo: 0, erro: '' });
    expect(ordem).toEqual(['migrar', 'app']);
    expect(await contar(b, 'select count(*)::int as n from demanda')).toBe(TOTAL_DEMANDAS_DO_SEED);
    expect(ambientes[0]).not.toHaveProperty('DATABASE_URL_MIGRATOR');
    expect(ambientes[0]).toMatchObject({ DATABASE_URL: b.urlApp, BETTER_AUTH_URL: CONFIG_TESTE.urlBase });
    expect(saida.texto()).not.toContain(b.urlMigrator);
    expect(saida.texto()).not.toContain(b.urlApp);

    // Segunda subida (reinício do contêiner): o seed recusa, e o app sobe do mesmo jeito.
    const codigo2 = await iniciarHomologacao(envHml(), {
      relogio: relogioFixo('2026-10-22T12:05:00Z'),
      saida: saidaDeTeste(),
      erro: saidaDeTeste(),
      passos: { migrar: async () => undefined, iniciarApp: async () => 0 },
    });
    expect(codigo2).toBe(0);
    expect(await contar(b, 'select count(*)::int as n from demanda')).toBe(TOTAL_DEMANDAS_DO_SEED);
  });

  it('com a migração de verdade, o banco fica pronto e o código de saída do app volta', async () => {
    const codigo = await iniciarHomologacao(envHml(), {
      relogio: relogioFixo('2026-10-22T12:10:00Z'),
      saida: saidaDeTeste(),
      erro: saidaDeTeste(),
      passos: { iniciarApp: async () => 3 },
    });
    expect(codigo).toBe(3);
  });

  it('migração que falha não semeia nem sobe o app, e o erro não leva a URL', async () => {
    const outro = await novoBanco();
    try {
      let subiu = false;
      const erro = saidaDeTeste();
      const codigo = await iniciarHomologacao(
        { ...envHml(), DATABASE_URL: outro.urlApp, DATABASE_URL_MIGRATOR: `postgres://ficticio:${SENTINELAS.senha}@127.0.0.1:1/ficticio` },
        {
          saida: saidaDeTeste(),
          erro,
          passos: {
            iniciarApp: async () => {
              subiu = true;
              return 0;
            },
          },
        },
      );
      expect(codigo).toBe(1);
      expect(subiu).toBe(false);
      expect(erro.texto()).toContain('Migrations não aplicadas');
      expect(contemSentinela(erro.texto())).toBe(false);
      expect(await contar(outro, 'select count(*)::int as n from "user"')).toBe(0);
    } finally {
      await outro.fechar();
    }
  });

  it('sem a URL do migrator ou com a configuração do app inválida, não sobe e cita só o nome da variável', async () => {
    let subiu = false;
    const passos = {
      migrar: async () => undefined,
      iniciarApp: async () => {
        subiu = true;
        return 0;
      },
    };
    const semMigrator = { ...envHml(), DATABASE_URL_MIGRATOR: undefined };
    const e1 = saidaDeTeste();
    expect(await iniciarHomologacao(semMigrator, { saida: saidaDeTeste(), erro: e1, passos })).toBe(1);
    expect(e1.texto()).toContain('DATABASE_URL_MIGRATOR');
    const e2 = saidaDeTeste();
    expect(await iniciarHomologacao({ ...envHml(), BETTER_AUTH_SECRET: 'curto' }, { saida: saidaDeTeste(), erro: e2, passos })).toBe(1);
    expect(e2.texto()).toContain('BETTER_AUTH_SECRET');
    expect(e2.texto()).not.toContain(b.urlApp);
    expect(subiu).toBe(false);
  });
});

describe('scripts/hml/criar-papeis.sql', () => {
  const caminho = fileURLToPath(new URL('./hml/criar-papeis.sql', import.meta.url));
  const sql = readFileSync(caminho, 'utf8');

  it('cria só o papel do app, com login e sem superusuário, CREATEDB nem CREATEROLE', () => {
    const comandos = sql
      .split('\n')
      .filter((l) => !l.trim().startsWith('--'))
      .join('\n')
      .split(';')
      .map((c) => c.trim())
      .filter(Boolean);
    expect(comandos).toHaveLength(1);
    expect(comandos[0]).toMatch(new RegExp(`^create role ${PAPEL_APP} login password '[^']+' nosuperuser nocreatedb nocreaterole noreplication nobypassrls$`, 'i'));
    expect(sql).not.toMatch(/wsod_/);
    expect(sql).toMatch(/fict[ií]cia/i);
  });

  it('roda no Postgres e o papel nasce com os atributos certos (num nome à parte, desfeito no fim)', async () => {
    const b = await novoBanco();
    const c = await b.poolMigrator.connect();
    try {
      await c.query('begin');
      await c.query(sql.replaceAll(PAPEL_APP, 'orquestrador_app_sonda_t33'));
      const papel = (
        await c.query("select rolcanlogin, rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls from pg_roles where rolname = 'orquestrador_app_sonda_t33'")
      ).rows[0];
      expect(papel).toEqual({ rolcanlogin: true, rolsuper: false, rolcreatedb: false, rolcreaterole: false, rolreplication: false, rolbypassrls: false });
    } finally {
      await c.query('rollback');
      c.release();
      await b.fechar();
    }
  });
});

// Casos acrescentados pelo qa-automacao na 06-T33-testes: borda, falha, concorrência e o `main` de cada script.
describe('qa-automacao T33: borda, falha e concorrência', () => {
  it('CA-02.5: nenhuma coluna de token_servico guarda o token nem a parte secreta; o hash é o SHA-256 do token', async () => {
    const b = await novoBanco();
    const deps = await criarDepsDeTeste(b);
    try {
      const saida = saidaDeTeste();
      const { prefixo } = await criarTokenPorScript(deps, 'insumo_tecnico', saida);
      const token = tokenDaSaida(saida.texto());
      const segredo = token.slice(13); // o que vem depois de wsod_ + prefixo
      const linhas = (await b.poolMigrator.query('select * from token_servico')).rows;
      expect(linhas).toHaveLength(1);
      const texto = JSON.stringify(linhas);
      expect(texto).not.toContain(token);
      expect(texto).not.toContain(segredo);
      expect(linhas[0]).toMatchObject({ prefixo, agente: 'insumo_tecnico', hash: createHash('sha256').update(token).digest('hex') });
      // Nem o evento nem o histórico inteiro têm a parte secreta.
      expect(JSON.stringify((await b.poolMigrator.query('select * from evento')).rows)).not.toContain(segredo);
    } finally {
      await deps.fila.parar();
      await b.fechar();
    }
  });

  it('C-37: o main de criar token com --token ou --senha recusa antes do banco e não escreve nada na saída', async () => {
    const b = await novoBanco();
    const deps = await criarDepsDeTeste(b);
    try {
      for (const argv of [
        ['--agente', 'risco', '--token', SENTINELAS.token],
        ['--agente', 'risco', '--senha', SENTINELAS.senha],
        ['--agente', 'admin'],
        [],
      ]) {
        const saida = saidaDeTeste();
        await expect(executarCriarToken(deps, argv, saida)).rejects.toMatchObject({ codigo: 'entrada_invalida' });
        expect(saida.texto()).toBe('');
      }
      expect(await contar(b, 'select count(*)::int as n from token_servico')).toBe(0);
      expect(await contar(b, "select count(*)::int as n from evento where acao = 'token_criado'")).toBe(0);
    } finally {
      await deps.fila.parar();
      await b.fechar();
    }
  });

  it('revogar um token não toca nos tokens de outro agente', async () => {
    const b = await novoBanco();
    const deps = await criarDepsDeTeste(b);
    try {
      const sRisco = saidaDeTeste();
      const sOrq = saidaDeTeste();
      const risco = await criarTokenPorScript(deps, 'risco', sRisco);
      await criarTokenPorScript(deps, 'orquestrador', sOrq);
      expect(await revogarTokenPorScript(deps, risco.prefixo)).toBe(true);
      await expect(validarTokenServico(b.db, tokenDaSaida(sRisco.texto()))).resolves.toBeNull();
      await expect(validarTokenServico(b.db, tokenDaSaida(sOrq.texto()))).resolves.toMatchObject({ agente: 'orquestrador' });
      expect(await contar(b, 'select count(*)::int as n from token_servico where revogado_em is not null')).toBe(1);
    } finally {
      await deps.fila.parar();
      await b.fechar();
    }
  });

  it('duas subidas ao mesmo tempo semeiam uma vez só (trava consultiva), e o aviso do DEC fictício entra com um job', async () => {
    const b = await novoBanco();
    const deps = await criarDepsDeTeste(b);
    try {
      const resultados = await Promise.all([seedFicticio(deps, { SEED_FICTICIO: '1' }), seedFicticio(deps, { SEED_FICTICIO: '1' })]);
      expect([...resultados].sort()).toEqual(['recusado', 'semeado']);
      expect(await contar(b, 'select count(*)::int as n from "user"')).toBe(4);
      expect(await contar(b, 'select count(*)::int as n from demanda')).toBe(TOTAL_DEMANDAS_DO_SEED);
      expect(await contar(b, 'select count(*)::int as n from preco_modelo')).toBe(1);
      expect(await contar(b, "select count(*)::int as n from evento where acao = 'conta_criada'")).toBe(4);

      // O DEC de agente deixa o aviso pendente e o job aviso.dec-pronto com payload só { decId } (C-22, para a T43).
      const decId = (await b.poolMigrator.query('select id from pacote_decisao')).rows[0].id as string;
      const avisos = (await b.poolMigrator.query('select pacote_decisao_id, status from aviso_email')).rows;
      expect(avisos).toEqual([{ pacote_decisao_id: decId, status: 'pendente' }]);
      const jobs = (await b.poolMigrator.query('select data, singleton_key from pgboss.job where name = $1', [FILAS.avisoDecPronto])).rows;
      expect(jobs).toEqual([{ data: { decId }, singleton_key: decId }]);
    } finally {
      await deps.fila.parar();
      await b.fechar();
    }
  });

  it('falha no meio do seed desfaz tudo: nenhuma conta, 2FA, evento nem demanda fica para trás', async () => {
    const b = await novoBanco();
    const deps = await criarDepsDeTeste(b, { relogio: relogioFixo('2026-10-22T12:00:00Z') });
    try {
      // O preço do modelo fictício no mesmo instante faz o seed bater no UNIQUE (modelo, vigente_desde) depois das contas.
      await definirPrecoModelo(deps, { modelo: 'modelo-ficticio', entradaPorMilhao: 1, saidaPorMilhao: 1 });
      await expect(seedFicticio(deps, { SEED_FICTICIO: '1' })).rejects.toMatchObject({ codigo: 'conflito' });
      for (const tabela of ['"user"', 'account', 'two_factor', 'evento', 'demanda', 'aviso_email']) {
        expect(await contar(b, `select count(*)::int as n from ${tabela}`), tabela).toBe(0);
      }
      expect(await contar(b, 'select count(*)::int as n from preco_modelo')).toBe(1);
      expect(await contar(b, 'select count(*)::int as n from pgboss.job where name = $1', [FILAS.avisoDecPronto])).toBe(0);
    } finally {
      await deps.fila.parar();
      await b.fechar();
    }
  });

  it('main do seed: 1 sem SEED_FICTICIO=1, recusa argumento sem ecoar o valor, e 0 quando semeia', async () => {
    const b = await novoBanco();
    const deps = await criarDepsDeTeste(b);
    try {
      const s1 = saidaDeTeste();
      expect(await executarSeed(deps, [], s1, {})).toBe(1);
      expect(s1.texto()).toContain('Nada foi alterado');
      expect(await contar(b, 'select count(*)::int as n from "user"')).toBe(0);

      const s2 = saidaDeTeste();
      const recusa = executarSeed(deps, ['--senha', SENTINELAS.senha], s2, { SEED_FICTICIO: '1' });
      await expect(recusa).rejects.toMatchObject({ codigo: 'entrada_invalida' });
      await recusa.catch((e: unknown) => expect(contemSentinela(JSON.stringify(e) + mensagemDeErro(e))).toBe(false));
      expect(s2.texto()).toBe('');
      expect(await contar(b, 'select count(*)::int as n from "user"')).toBe(0);

      const s3 = saidaDeTeste();
      expect(await executarSeed(deps, [], s3, { SEED_FICTICIO: '1' })).toBe(0);
      expect(s3.texto()).toContain('Dados fictícios criados');
      // A saída não mostra senha nem segredo das contas fictícias.
      for (const c of Object.values(CONTAS_FICTICIAS)) expect(s3.texto()).not.toContain(c.senha);
      expect(await contar(b, 'select count(*)::int as n from demanda')).toBe(TOTAL_DEMANDAS_DO_SEED);
    } finally {
      await deps.fila.parar();
      await b.fechar();
    }
  });

  it('start:hml: a migração recebe a URL do migrator, e o app filho só a URL do app', async () => {
    const b = await novoBanco();
    try {
      const urls: string[] = [];
      let envDoApp: Record<string, string | undefined> = {};
      const codigo = await iniciarHomologacao(
        { DATABASE_URL: b.urlApp, DATABASE_URL_MIGRATOR: b.urlMigrator, BETTER_AUTH_SECRET: CONFIG_TESTE.segredoAuth, BETTER_AUTH_URL: CONFIG_TESTE.urlBase },
        {
          relogio: relogioFixo('2026-10-22T12:00:00Z'),
          saida: saidaDeTeste(),
          erro: saidaDeTeste(),
          passos: {
            migrar: async (url) => void urls.push(url),
            iniciarApp: async (env) => {
              envDoApp = env;
              return 0;
            },
          },
        },
      );
      expect(codigo).toBe(0);
      expect(urls).toEqual([b.urlMigrator]);
      expect(Object.values(envDoApp)).not.toContain(b.urlMigrator);
      // Sem SEED_FICTICIO, a subida segue sem semear.
      expect(await contar(b, 'select count(*)::int as n from demanda')).toBe(0);
      expect(await contar(b, 'select count(*)::int as n from "user"')).toBe(0);
    } finally {
      await b.fechar();
    }
  });

  it('package.json: start:hml roda scripts/start-hml.ts pelo tsx', () => {
    const pacote = JSON.parse(readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8')) as { scripts: Record<string, string> };
    expect(pacote.scripts['start:hml']).toBe('tsx scripts/start-hml.ts');
  });
});
