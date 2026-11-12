// T14, etapa 06-T14-testes (qa-automacao): o que os testes da construção não cobriam na emissão, troca e revogação dos
// tokens de integração pelos scripts (RF-02, IN-04).
// (1) Minor m1 da 06-T14-revisao: `executarCriarToken` sai com 0 se o argv não trouxer dono. O caminho só é inalcançável
//     enquanto o schema exigir exatamente um dono; aqui a guarda é o próprio schema (todas as combinações de agente e
//     integração) e a invariante do script ("sai 0 só se emitiu exatamente um token, do dono pedido"), sobre argv de
//     borda. Se a validação afrouxar, estes testes ficam vermelhos antes de o script sair com 0 em silêncio.
// (2) CA-02.4 e CA-02.5 pela rota: o token emitido pelo script é aceito pela API e, depois da revogação pelo script,
//     responde 401 com a mensagem fixa, enquanto o novo segue aceito; para as duas integrações.
// (3) Pendência (a) da 06-T14-revisao: a linha de log `token_*` não leva o nome da integração (asserção com rótulo).
// Banco, rotas e tokens reais (Testcontainers); o token só nasce em tempo de teste e nunca vai a mensagem de expect
// (G3.3). Relógio fixo, duas horas por teste: o limite de 10 por hora do Awave não liga um teste ao outro. Dados fictícios.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import * as rotaDemandas from '../src/app/api/demandas/route';
import { definirDepsParaTeste, type Deps } from '../src/lib/deps';
import { substituirDestinoDoLog } from '../src/lib/log';
import { relogioFixo } from '../src/lib/relogio';
import { AGENTES, INTEGRACOES, type Integracao } from '../src/modules/acesso/ator';
import { MENSAGENS_ACESSO } from '../src/modules/acesso/mensagens';
import { novoBanco, type BancoDeTeste } from '../test/banco';
import { criarDepsDeTeste } from '../test/deps';
import { CORPO_DO_AWAVE } from '../test/integracoes';
import { chamadasDoConstruir } from '../test/pedidos-construcao';
import { chamarRota } from '../test/requisicao';
import {
  MENSAGEM_UM_DOS_DOIS,
  argumentosCriarToken,
  criarTokenDeIntegracaoPorScript,
  criarTokenPorScript,
  executarCriarToken,
} from './criar-token-servico';
import { executarRevogarToken } from './revogar-token-servico';

const AGORA = '2026-11-12T12:00:00Z';
const HORA = 3_600_000;
const RE_TOKEN = /^wsod_[A-Za-z0-9_-]{43}$/;
const CORPO_401 = { erro: 'nao_autenticado', mensagem: MENSAGENS_ACESSO.token_invalido };

function saidaDeTeste() {
  const partes: string[] = [];
  return { write: (s: string) => void partes.push(s), texto: () => partes.join('') };
}

const tokenDaSaida = (texto: string) => /mostrado só esta vez: (\S+)/.exec(texto)?.[1] ?? '';
// O texto que nunca pode sair: o que vem depois de `wsod_` e do prefixo de 8 caracteres.
const segredoDe = (token: string) => token.slice(13);

let b: BancoDeTeste;
let deps: Deps;
const relogio = relogioFixo(AGORA);
let passo = 0;
const linhasDoLog: string[] = [];

beforeAll(async () => {
  substituirDestinoDoLog({ write: (l) => void linhasDoLog.push(l) });
  b = await novoBanco();
  deps = await criarDepsDeTeste(b, { relogio });
  definirDepsParaTeste(deps);
});

afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  await deps.fila.parar();
  await b.fechar();
});

beforeEach(() => {
  relogio.definir(AGORA);
  relogio.avancar(++passo * 2 * HORA);
});

const totais = async () =>
  (
    await b.poolMigrator.query(
      `select (select count(*) from token_servico)::int as tokens, (select count(*) from evento)::int as eventos,
              (select count(*) from demanda)::int as demandas`,
    )
  ).rows[0] as { tokens: number; eventos: number; demandas: number };

// As linhas `token_*` do log desde `inicio`, sem `level` e `time`.
const linhasDeToken = (inicio: number) =>
  linhasDoLog
    .slice(inicio)
    .map((l) => JSON.parse(l) as Record<string, unknown>)
    .filter((l) => typeof l.evento === 'string' && l.evento.startsWith('token_'))
    .map((l) => Object.fromEntries(Object.entries(l).filter(([k]) => k !== 'level' && k !== 'time')));

// Nem `wsod_`, nem o texto de nenhum token depois do prefixo, no log desde `inicio` e em todos os eventos. Booleano com
// rótulo, para a falha não imprimir o token.
async function conferirSemToken(inicio: number, tokens: readonly string[]) {
  const log = linhasDoLog.slice(inicio).join('');
  const eventos = JSON.stringify((await b.poolMigrator.query('select * from evento')).rows);
  expect(log.includes('wsod_'), 'wsod_ no log').toBe(false);
  expect(eventos.includes('wsod_'), 'wsod_ nos eventos').toBe(false);
  for (const t of tokens) {
    expect(RE_TOKEN.test(t), 'token no formato').toBe(true);
    expect(log.includes(segredoDe(t)), 'texto do token no log').toBe(false);
    expect(eventos.includes(segredoDe(t)), 'texto do token nos eventos').toBe(false);
  }
}

// Pendência (a) da 06-T14-revisao: nenhuma linha `token_*` diz qual integração (IN-14, C-21).
function semNomeDeIntegracao(linhas: readonly Record<string, unknown>[]) {
  for (const l of linhas) {
    const texto = JSON.stringify(l);
    for (const i of INTEGRACOES) expect(texto.includes(i), `nome da integração ${i} numa linha token_*`).toBe(false);
  }
}

async function emitirPeloScript(integracao: Integracao) {
  const saida = saidaDeTeste();
  expect(await executarCriarToken(deps, ['--integracao', integracao], saida)).toBe(0);
  const token = tokenDaSaida(saida.texto());
  expect(RE_TOKEN.test(token), 'token no formato').toBe(true);
  return { token, prefixo: token.slice(5, 13) };
}

describe('m1 da 06-T14-revisao: o script de criação nunca sai com 0 sem emitir', () => {
  it('o schema aceita só exatamente um dono, em todas as combinações de agente e integração, e o que aceita traz exatamente um dono', () => {
    let aceitos = 0;
    for (const agente of [undefined, ...AGENTES]) {
      for (const integracao of [undefined, ...INTEGRACOES]) {
        const rotulo = `agente=${agente ?? '(ausente)'} integracao=${integracao ?? '(ausente)'}`;
        const umSo = (agente === undefined) !== (integracao === undefined);
        // Com as chaves presentes valendo undefined e sem as chaves: o afrouxamento pode vir por qualquer das duas formas.
        const comChaves = { agente, integracao };
        const semChaves = Object.fromEntries(Object.entries(comChaves).filter(([, v]) => v !== undefined));
        for (const entrada of [comChaves, semChaves]) {
          const r = argumentosCriarToken.safeParse(entrada);
          expect(r.success, rotulo).toBe(umSo);
          if (r.success) {
            aceitos++;
            const donos = [r.data.agente, r.data.integracao].filter((v) => v !== undefined);
            expect(donos, rotulo).toEqual([agente ?? integracao]);
          } else {
            // A regra vai nos dois campos (desvio 2 aceito), para a mensagem citar os dois argumentos.
            const daRegra = r.error.issues.filter((i) => i.message === MENSAGEM_UM_DOS_DOIS).map((i) => i.path);
            expect(daRegra, rotulo).toEqual([['agente'], ['integracao']]);
          }
        }
      }
    }
    // Só as combinações de um dono: cada agente e cada integração, nas duas formas.
    expect(aceitos).toBe(2 * (AGENTES.length + INTEGRACOES.length));
  });

  it('para cada argv, ou recusa com entrada_invalida sem gravar nada, ou sai 0 com exatamente um token, uma linha e um evento do dono pedido', async () => {
    type Caso = { argv: string[]; dono: { agente: string | null; integracao: string | null } | null };
    const casos: Caso[] = [
      ...AGENTES.map((a): Caso => ({ argv: ['--agente', a], dono: { agente: a, integracao: null } })),
      ...INTEGRACOES.map((i): Caso => ({ argv: ['--integracao', i], dono: { agente: null, integracao: i } })),
      ...INTEGRACOES.map((i): Caso => ({ argv: [`--integracao=${i}`], dono: { agente: null, integracao: i } })),
      // Sem dono, por todas as formas que o leitor de argumentos aceita ler.
      { argv: [], dono: null },
      { argv: ['--integracao'], dono: null },
      { argv: ['--agente'], dono: null },
      { argv: ['--integracao='], dono: null },
      { argv: ['--agente='], dono: null },
      { argv: ['integracao', 'awave'], dono: null },
      // Valor quase certo e troca de tipo: nome de integração como agente e o contrário.
      { argv: ['--integracao', ' awave'], dono: null },
      { argv: ['--integracao', 'awave '], dono: null },
      { argv: ['--integracao', 'Construir'], dono: null },
      { argv: ['--agente', 'awave'], dono: null },
      { argv: ['--integracao', 'risco'], dono: null },
      // Repetido, ou dois donos.
      { argv: ['--integracao', 'awave', '--integracao', 'construir'], dono: null },
      { argv: ['--integracao', 'awave', '--integracao', 'awave'], dono: null },
      { argv: ['--agente', 'risco', '--integracao=construir'], dono: null },
    ];

    let emitidos = 0;
    const tokens: string[] = [];
    const inicioGeral = linhasDoLog.length;
    for (const { argv, dono } of casos) {
      const rotulo = argv.length === 0 ? '(sem argumentos)' : argv.join(' ');
      const antes = await totais();
      const inicio = linhasDoLog.length;
      const saida = saidaDeTeste();
      const resultado = await executarCriarToken(deps, argv, saida).then(
        (codigo) => ({ ok: true as const, codigo }),
        (e: unknown) => ({ ok: false as const, erro: e }),
      );
      const depois = await totais();

      if (dono === null) {
        expect(resultado.ok, `${rotulo}: devia recusar`).toBe(false);
        if (!resultado.ok) expect(resultado.erro, rotulo).toMatchObject({ codigo: 'entrada_invalida' });
        expect(saida.texto(), rotulo).toBe('');
        expect(depois, rotulo).toEqual(antes);
        expect(linhasDeToken(inicio), rotulo).toEqual([]);
        continue;
      }

      // Sair com 0 só vale com a emissão inteira: um token na saída, uma linha de token_servico e um token_criado.
      expect(resultado, rotulo).toEqual({ ok: true, codigo: 0 });
      const token = tokenDaSaida(saida.texto());
      expect(RE_TOKEN.test(token), `${rotulo}: token na saída`).toBe(true);
      expect(saida.texto().split(token).length, `${rotulo}: o token aparece uma vez na saída`).toBe(2);
      expect(depois, rotulo).toEqual({ tokens: antes.tokens + 1, eventos: antes.eventos + 1, demandas: antes.demandas });
      const prefixo = token.slice(5, 13);
      expect((await b.poolMigrator.query('select agente, integracao from token_servico where prefixo = $1', [prefixo])).rows, rotulo).toEqual([dono]);
      expect(
        (await b.poolMigrator.query("select count(*)::int as n from evento where acao = 'token_criado' and entidade_id = $1", [prefixo])).rows[0].n,
        rotulo,
      ).toBe(1);
      expect(linhasDeToken(inicio).map((l) => l.evento), rotulo).toEqual(['token_criado']);
      emitidos++;
      tokens.push(token);
    }

    // O caminho foi o esperado: a asserção de recusa não é vazia, e houve emissões a conferir.
    expect(emitidos).toBe(AGENTES.length + 2 * INTEGRACOES.length);
    expect(casos.length - emitidos).toBe(14);
    await conferirSemToken(inicioGeral, tokens);
  });

  it('chamada direta sem dono, ou com o nome do outro tipo, é recusada antes do banco', async () => {
    const antes = await totais();
    const inicio = linhasDoLog.length;
    const chamadas: [string, (s: ReturnType<typeof saidaDeTeste>) => Promise<unknown>][] = [
      ['agente ausente', (s) => criarTokenPorScript(deps, undefined as never, s)],
      ['integração ausente', (s) => criarTokenDeIntegracaoPorScript(deps, undefined as never, s)],
      ['integração como agente', (s) => criarTokenPorScript(deps, 'awave' as never, s)],
      ['agente como integração', (s) => criarTokenDeIntegracaoPorScript(deps, 'risco' as never, s)],
    ];
    for (const [rotulo, chamar] of chamadas) {
      const saida = saidaDeTeste();
      await expect(chamar(saida), rotulo).rejects.toMatchObject({ codigo: 'entrada_invalida' });
      expect(saida.texto(), rotulo).toBe('');
    }
    expect(await totais()).toEqual(antes);
    expect(linhasDeToken(inicio)).toEqual([]);
  });
});

describe('CA-02.4 e CA-02.5 pela rota: token emitido e revogado pelos scripts', () => {
  const postDemanda = (bearer: string) =>
    chamarRota(rotaDemandas.POST, { metodo: 'POST', caminho: '/api/demandas', corpo: CORPO_DO_AWAVE, bearer, semOrigin: true, cabecalhos: { accept: 'application/json' } });

  it('awave: o token do script cria demanda (201); na troca, os dois valem; revogado pelo script, o antigo responde 401 sem gravar, e o novo segue com 201', async () => {
    const inicio = linhasDoLog.length;
    const antigo = await emitirPeloScript('awave');
    expect((await postDemanda(antigo.token)).status).toBe(201);

    const novo = await emitirPeloScript('awave');
    expect(novo.prefixo === antigo.prefixo, 'prefixos diferentes').toBe(false);
    expect((await postDemanda(antigo.token)).status).toBe(201);
    expect((await postDemanda(novo.token)).status).toBe(201);

    expect(await executarRevogarToken(deps, ['--prefixo', antigo.prefixo], saidaDeTeste())).toBe(0);
    const antes = await totais();
    const r = await postDemanda(antigo.token);
    expect(r.status).toBe(401);
    expect(await r.json()).toEqual(CORPO_401);
    expect(await totais()).toEqual(antes);
    expect((await postDemanda(novo.token)).status).toBe(201);

    const linhas = linhasDeToken(inicio);
    expect(linhas).toEqual([
      { evento: 'token_criado', atorTipo: 'sistema' },
      { evento: 'token_criado', atorTipo: 'sistema' },
      { evento: 'token_revogado', atorTipo: 'sistema' },
    ]);
    semNomeDeIntegracao(linhas);
    await conferirSemToken(inicio, [antigo.token, novo.token]);
  });

  it('construir: o token do script lista pendentes (200); na troca, os dois valem; revogado pelo script, o antigo responde 401, e o novo segue com 200', async () => {
    const inicio = linhasDoLog.length;
    const antigo = await emitirPeloScript('construir');
    const novo = await emitirPeloScript('construir');
    const comAntigo = chamadasDoConstruir(() => antigo.token);
    const comNovo = chamadasDoConstruir(() => novo.token);
    expect((await comAntigo.listar()).status).toBe(200);
    expect((await comNovo.listar()).status).toBe(200);

    expect(await executarRevogarToken(deps, ['--prefixo', antigo.prefixo], saidaDeTeste())).toBe(0);
    const antes = await totais();
    const r = await comAntigo.listar();
    expect(r.status).toBe(401);
    expect(await r.json()).toEqual(CORPO_401);
    expect(await totais()).toEqual(antes);
    expect((await comNovo.listar()).status).toBe(200);

    const linhas = linhasDeToken(inicio);
    expect(linhas).toEqual([
      { evento: 'token_criado', atorTipo: 'sistema' },
      { evento: 'token_criado', atorTipo: 'sistema' },
      { evento: 'token_revogado', atorTipo: 'sistema' },
    ]);
    semNomeDeIntegracao(linhas);
    await conferirSemToken(inicio, [antigo.token, novo.token]);
  });
});
