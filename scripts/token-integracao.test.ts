// T14 do DEC-DEM-20261111-0016-v1: emissão, troca e revogação dos tokens de integração pelos scripts (RF-02, IN-04,
// IN-12, CA-02.1 a CA-02.6), no molde de scripts.test.ts: banco real (Testcontainers), relógio fixo e saída falsa.
// O token só existe em memória, lido da saída do script dentro do teste: nunca em constante, arquivo ou mensagem de
// `expect` (G3.3). Toda conferência que envolve o token é feita por booleano, para uma falha não imprimir o valor.
import { createHash } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../test/banco';
import { criarDepsDeTeste } from '../test/deps';
import { SENTINELAS, contemSentinela } from '../test/sentinelas';
import type { Deps } from '../src/lib/deps';
import { ErroDominio } from '../src/lib/erros';
import { substituirDestinoDoLog } from '../src/lib/log';
import { relogioFixo } from '../src/lib/relogio';
import { INTEGRACOES, type Integracao } from '../src/modules/acesso/ator';
import { validarTokenServico } from '../src/modules/acesso/tokens-servico';
import { argumentosCriarToken, criarTokenDeIntegracaoPorScript, executarCriarToken } from './criar-token-servico';
import { lerArgumentos } from './lib/argumentos';
import { mensagemDeErro } from './lib/saida';
import { executarRevogarToken } from './revogar-token-servico';

const AGORA = '2026-11-12T12:00:00Z';
const RE_TOKEN = /^wsod_[A-Za-z0-9_-]{43}$/;

function saidaDeTeste() {
  const partes: string[] = [];
  return { write: (s: string) => void partes.push(s), texto: () => partes.join('') };
}

const tokenDaSaida = (texto: string) => /mostrado só esta vez: (\S+)/.exec(texto)?.[1] ?? '';
// O texto que nunca pode sair: o que vem depois de `wsod_` e do prefixo de 8 caracteres (o prefixo pode, IN-13).
const segredoDe = (token: string) => token.slice(13);
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

describe('T14: tokens de integração pelos scripts (RF-02, IN-04)', () => {
  let b: BancoDeTeste;
  let deps: Deps;
  const linhasDoLog: string[] = [];

  beforeAll(async () => {
    b = await novoBanco();
    deps = await criarDepsDeTeste(b, { relogio: relogioFixo(AGORA) });
    substituirDestinoDoLog({ write: (l) => void linhasDoLog.push(l) });
  });
  afterAll(async () => {
    substituirDestinoDoLog(null);
    await deps.fila.parar();
    await b.fechar();
  });

  const contar = async (sql: string, valores: unknown[] = []) => (await b.poolMigrator.query(sql, valores)).rows[0].n as number;

  // As linhas `token_*` do log desde `inicio`, sem `level` e `time`.
  const linhasDeToken = (inicio: number) =>
    linhasDoLog
      .slice(inicio)
      .map((l) => JSON.parse(l) as Record<string, unknown>)
      .filter((l) => typeof l.evento === 'string' && l.evento.startsWith('token_'))
      .map((l) => Object.fromEntries(Object.entries(l).filter(([k]) => k !== 'level' && k !== 'time')));

  const eventosDoPrefixo = async (prefixo: string) =>
    (
      await b.poolMigrator.query(
        `select ator_tipo, ator_id, ator_token_prefixo, demanda_id, entidade, entidade_id, acao, antes, depois, ocorrido_em
         from evento where entidade = 'token_servico' and entidade_id = $1 order by id`,
        [prefixo],
      )
    ).rows;

  // CA-02.6 e IN-04: nem o texto do token depois do prefixo, nem o token inteiro, nem `wsod_` no log do teste e em todo
  // evento gravado. Booleano, para a falha não imprimir o token.
  async function conferirSemToken(inicio: number, tokens: readonly string[]) {
    const log = linhasDoLog.slice(inicio).join('');
    const eventos = JSON.stringify((await b.poolMigrator.query('select * from evento')).rows);
    expect(tokens.length, 'há token a conferir').toBeGreaterThan(0);
    for (const t of tokens) {
      expect(RE_TOKEN.test(t), 'token no formato').toBe(true);
      expect(log.includes(segredoDe(t)), 'texto do token no log').toBe(false);
      expect(eventos.includes(segredoDe(t)), 'texto do token nos eventos').toBe(false);
    }
    expect(log.includes('wsod_'), 'wsod_ no log').toBe(false);
    expect(eventos.includes('wsod_'), 'wsod_ nos eventos').toBe(false);
  }

  async function emitir(integracao: Integracao) {
    const saida = saidaDeTeste();
    expect(await executarCriarToken(deps, ['--integracao', integracao], saida)).toBe(0);
    const token = tokenDaSaida(saida.texto());
    return { saida: saida.texto(), token, prefixo: token.slice(5, 13) };
  }

  it.each(INTEGRACOES)('CA-02.1 e CA-02.2: --integracao %s sai com 0, mostra o token uma vez e grava só o hash e o prefixo', async (integracao) => {
    const inicio = linhasDoLog.length;
    const { saida, token, prefixo } = await emitir(integracao);

    expect(RE_TOKEN.test(token), 'token no formato').toBe(true);
    expect(saida.split(token).length, 'o token aparece uma vez na saída').toBe(2);
    expect(saida.startsWith(`Token criado para a integração ${integracao} (prefixo ${prefixo}).\nToken, mostrado só esta vez: `)).toBe(true);
    expect(saida.endsWith('\nGuarde o token agora, só no cofre de segredos de quem o usa. Para revogar, use o prefixo.\n')).toBe(true);

    // O banco: uma linha da integração, agente nulo, o SHA-256 e o prefixo, nada do token.
    const linhas = (await b.poolMigrator.query('select agente, integracao, hash, prefixo, revogado_em, criado_em from token_servico where prefixo = $1', [prefixo])).rows;
    expect(linhas).toEqual([{ agente: null, integracao, hash: sha256(token), prefixo, revogado_em: null, criado_em: new Date(AGORA) }]);
    expect(JSON.stringify(linhas).includes(segredoDe(token)), 'texto do token na linha').toBe(false);

    // IN-12: token_criado do sistema, com depois exato { integracao, prefixo }.
    expect(await eventosDoPrefixo(prefixo)).toEqual([
      {
        ator_tipo: 'sistema',
        ator_id: 'sistema',
        ator_token_prefixo: null,
        demanda_id: null,
        entidade: 'token_servico',
        entidade_id: prefixo,
        acao: 'token_criado',
        antes: null,
        depois: { integracao, prefixo },
        ocorrido_em: new Date(AGORA),
      },
    ]);

    // O log: uma linha, sem prefixo nem nome da integração (a lista de permissão do log não tem esses campos, IN-14).
    expect(linhasDeToken(inicio)).toEqual([{ evento: 'token_criado', atorTipo: 'sistema' }]);
    expect(linhasDoLog.slice(inicio).join('').includes(prefixo), 'prefixo no log').toBe(false);

    // O token vale como a integração, e não como agente (CA-01.1, CA-01.2).
    await expect(validarTokenServico(b.db, token)).resolves.toEqual({ tipo: 'integracao', integracao, prefixoToken: prefixo });
    await conferirSemToken(inicio, [token]);
  });

  it('argumentos: --integracao awave ou construir; os dois juntos ou nenhum são recusados', () => {
    expect(lerArgumentos(argumentosCriarToken, ['--integracao', 'awave'])).toEqual({ integracao: 'awave' });
    expect(lerArgumentos(argumentosCriarToken, ['--integracao=construir'])).toEqual({ integracao: 'construir' });
    expect(lerArgumentos(argumentosCriarToken, ['--agente', 'risco'])).toEqual({ agente: 'risco' });
    for (const argv of [[], ['--agente', 'risco', '--integracao', 'awave']]) {
      const e = (() => {
        try {
          lerArgumentos(argumentosCriarToken, argv);
        } catch (x) {
          return x;
        }
        return null;
      })();
      expect(e).toBeInstanceOf(ErroDominio);
      const erro = e as ErroDominio;
      expect(erro.codigo).toBe('entrada_invalida');
      // A mensagem diz quais argumentos corrigir, e o detalhe diz a regra.
      expect(erro.mensagem).toBe('Corrija os argumentos: --agente, --integracao.');
      expect(erro.extras.campos?.map((c) => c.mensagem)).toContain('Informe exatamente um entre --agente e --integracao.');
    }
  });

  it('CA-02.3: integração fora da lista, agente e integração juntos, nenhum dos dois ou --token → erro de argumento e nada gravado', async () => {
    const inicio = linhasDoLog.length;
    const tokensAntes = await contar('select count(*)::int as n from token_servico');
    const eventosAntes = await contar('select count(*)::int as n from evento');
    for (const argv of [
      ['--integracao', 'jarvis'],
      ['--integracao', 'AWAVE'],
      ['--integracao', ''],
      ['--agente', 'risco', '--integracao', 'awave'],
      ['--integracao', 'construir', '--agente', 'orquestrador'],
      [],
      ['--token', SENTINELAS.token],
      ['--integracao', 'awave', '--token', SENTINELAS.token],
      ['--integracao', 'awave', `--senha=${SENTINELAS.senha}`],
    ]) {
      const saida = saidaDeTeste();
      const r = executarCriarToken(deps, argv, saida);
      await expect(r, argv.join(' ')).rejects.toMatchObject({ codigo: 'entrada_invalida' });
      await r.catch((e: unknown) => expect(contemSentinela(JSON.stringify(e) + mensagemDeErro(e)), 'sentinela no erro').toBe(false));
      expect(saida.texto(), argv.join(' ')).toBe('');
    }
    // Chamada direta com integração fora da lista também não grava.
    const direta = saidaDeTeste();
    await expect(criarTokenDeIntegracaoPorScript(deps, 'jarvis' as never, direta)).rejects.toMatchObject({ codigo: 'entrada_invalida' });
    expect(direta.texto()).toBe('');

    expect(await contar('select count(*)::int as n from token_servico')).toBe(tokensAntes);
    expect(await contar('select count(*)::int as n from evento')).toBe(eventosAntes);
    expect(linhasDeToken(inicio)).toEqual([]);
    expect(contemSentinela(linhasDoLog.slice(inicio).join('')), 'sentinela no log').toBe(false);
  });

  it('CA-02.4: revogar pelo prefixo sai com 0, o token deixa de valer e grava token_revogado; de novo, 1 sem evento', async () => {
    const awave = await emitir('awave');
    const construir = await emitir('construir');
    const agente = saidaDeTeste();
    expect(await executarCriarToken(deps, ['--agente', 'risco'], agente)).toBe(0);
    const tokenAgente = tokenDaSaida(agente.texto());
    const inicio = linhasDoLog.length;

    const r1 = saidaDeTeste();
    expect(await executarRevogarToken(deps, ['--prefixo', awave.prefixo], r1)).toBe(0);
    expect(r1.texto()).toBe(`Token de prefixo ${awave.prefixo} revogado. Ele deixa de valer agora.\n`);
    // O token revogado responde como inválido (401 em resolver-ator).
    await expect(validarTokenServico(b.db, awave.token)).resolves.toBeNull();
    const eventos = await eventosDoPrefixo(awave.prefixo);
    expect(eventos.map((e) => e.acao)).toEqual(['token_criado', 'token_revogado']);
    expect(eventos[1]).toEqual({
      ator_tipo: 'sistema',
      ator_id: 'sistema',
      ator_token_prefixo: null,
      demanda_id: null,
      entidade: 'token_servico',
      entidade_id: awave.prefixo,
      acao: 'token_revogado',
      antes: null,
      depois: { prefixo: awave.prefixo },
      ocorrido_em: new Date(AGORA),
    });
    expect(
      (await b.poolMigrator.query('select integracao, revogado_em from token_servico where prefixo = $1', [awave.prefixo])).rows,
    ).toEqual([{ integracao: 'awave', revogado_em: new Date(AGORA) }]);

    // CA-01.4: os outros tokens continuam valendo.
    await expect(validarTokenServico(b.db, construir.token)).resolves.toEqual({ tipo: 'integracao', integracao: 'construir', prefixoToken: construir.prefixo });
    await expect(validarTokenServico(b.db, tokenAgente)).resolves.toMatchObject({ tipo: 'agente', agente: 'risco' });

    // Repetir: 1, sem evento novo.
    const r2 = saidaDeTeste();
    expect(await executarRevogarToken(deps, ['--prefixo', awave.prefixo], r2)).toBe(1);
    expect(r2.texto()).toBe('Nenhum token ativo com este prefixo. Nada foi alterado.\n');
    expect(await contar("select count(*)::int as n from evento where acao = 'token_revogado' and entidade_id = $1", [awave.prefixo])).toBe(1);

    expect(linhasDeToken(inicio)).toEqual([{ evento: 'token_revogado', atorTipo: 'sistema' }]);
    for (const t of [awave.token, construir.token, tokenAgente]) {
      expect(r1.texto().includes(segredoDe(t)) || r2.texto().includes(segredoDe(t)), 'texto do token na saída da revogação').toBe(false);
    }
    await conferirSemToken(inicio, [awave.token, construir.token, tokenAgente]);
  });

  it.each(INTEGRACOES)('CA-02.5: troca do token %s: o novo vale junto com o antigo até a revogação, e depois só o novo', async (integracao) => {
    const inicio = linhasDoLog.length;
    const antigo = await emitir(integracao);
    const novo = await emitir(integracao);
    expect(novo.prefixo === antigo.prefixo, 'prefixos diferentes').toBe(false);

    // Os dois valem até a revogação (troca sem janela de indisponibilidade).
    await expect(validarTokenServico(b.db, antigo.token)).resolves.toEqual({ tipo: 'integracao', integracao, prefixoToken: antigo.prefixo });
    await expect(validarTokenServico(b.db, novo.token)).resolves.toEqual({ tipo: 'integracao', integracao, prefixoToken: novo.prefixo });

    expect(await executarRevogarToken(deps, ['--prefixo', antigo.prefixo], saidaDeTeste())).toBe(0);
    await expect(validarTokenServico(b.db, antigo.token)).resolves.toBeNull();
    await expect(validarTokenServico(b.db, novo.token)).resolves.toEqual({ tipo: 'integracao', integracao, prefixoToken: novo.prefixo });

    const linhas = (
      await b.poolMigrator.query('select prefixo, revogado_em from token_servico where prefixo = any($1) order by prefixo = $2 desc', [
        [antigo.prefixo, novo.prefixo],
        antigo.prefixo,
      ])
    ).rows;
    expect(linhas).toEqual([
      { prefixo: antigo.prefixo, revogado_em: new Date(AGORA) },
      { prefixo: novo.prefixo, revogado_em: null },
    ]);
    expect(linhasDeToken(inicio)).toEqual([
      { evento: 'token_criado', atorTipo: 'sistema' },
      { evento: 'token_criado', atorTipo: 'sistema' },
      { evento: 'token_revogado', atorTipo: 'sistema' },
    ]);
    await conferirSemToken(inicio, [antigo.token, novo.token]);
  });

  it('regressão: --agente continua como antes (saída, linha, evento e log com o agente)', async () => {
    const inicio = linhasDoLog.length;
    const saida = saidaDeTeste();
    expect(await executarCriarToken(deps, ['--agente', 'consolidacao'], saida)).toBe(0);
    const token = tokenDaSaida(saida.texto());
    const prefixo = token.slice(5, 13);
    expect(saida.texto().startsWith(`Token criado para o agente consolidacao (prefixo ${prefixo}).\nToken, mostrado só esta vez: `)).toBe(true);
    expect(saida.texto().split(token).length, 'o token aparece uma vez na saída').toBe(2);
    expect((await b.poolMigrator.query('select agente, integracao from token_servico where prefixo = $1', [prefixo])).rows).toEqual([
      { agente: 'consolidacao', integracao: null },
    ]);
    const eventos = await eventosDoPrefixo(prefixo);
    expect(eventos.map((e) => [e.acao, e.depois])).toEqual([['token_criado', { agente: 'consolidacao', prefixo }]]);
    expect(linhasDeToken(inicio)).toEqual([{ evento: 'token_criado', atorTipo: 'sistema', agente: 'consolidacao' }]);
    await expect(validarTokenServico(b.db, token)).resolves.toEqual({ tipo: 'agente', agente: 'consolidacao', prefixoToken: prefixo });
    await conferirSemToken(inicio, [token]);
  });
});
