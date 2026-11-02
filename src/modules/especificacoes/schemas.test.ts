// Schema de entrada da ESP e regra dos quatro campos de construção (RF-08, CA-08.2 a CA-08.5, C-11). Sem banco.
import { describe, expect, it } from 'vitest';
import { DONOS_REPOSITORIO } from '../../vendor/construir/pedido.mjs';
import { criarEspecificacaoSchema, MENSAGENS_CONSTRUCAO, validarCamposDeConstrucao, type CriarEspecificacao } from './schemas';

const completa = (extra: Partial<CriarEspecificacao> = {}): CriarEspecificacao =>
  criarEspecificacaoSchema.parse({
    descricaoObjetiva: 'x',
    escopoInclui: ['a'],
    sistemaAlvo: 'meu-sistema',
    repositorioDestino: 'wsssistemas2626-crypto/meu-sistema',
    criteriosAceitePreliminares: ['c'],
    definicaoDePronto: ['p'],
    ...extra,
  });

describe('criarEspecificacaoSchema', () => {
  it('CA-08.5: escopoInclui como texto corrido → recusado', () => {
    expect(criarEspecificacaoSchema.safeParse({ descricaoObjetiva: 'x', escopoInclui: 'tudo' }).success).toBe(false);
  });

  it('escopoExclui, duvidasEmAberto, criterios e definição como texto corrido → recusados', () => {
    for (const campo of ['escopoExclui', 'duvidasEmAberto', 'criteriosAceitePreliminares', 'definicaoDePronto']) {
      expect(criarEspecificacaoSchema.safeParse({ descricaoObjetiva: 'x', escopoInclui: ['a'], [campo]: 'texto' }).success, campo).toBe(false);
    }
  });

  it('item vazio na lista e mais de 50 itens → recusados', () => {
    expect(criarEspecificacaoSchema.safeParse({ descricaoObjetiva: 'x', escopoInclui: ['  '] }).success).toBe(false);
    expect(criarEspecificacaoSchema.safeParse({ descricaoObjetiva: 'x', escopoInclui: Array.from({ length: 51 }, (_, i) => `i${i}`) }).success).toBe(false);
  });

  it('descricaoObjetiva obrigatória e escopoInclui obrigatório', () => {
    expect(criarEspecificacaoSchema.safeParse({ escopoInclui: ['a'] }).success).toBe(false);
    expect(criarEspecificacaoSchema.safeParse({ descricaoObjetiva: 'x' }).success).toBe(false);
  });

  it('padrões: escopoExclui e duvidasEmAberto vazios', () => {
    expect(criarEspecificacaoSchema.parse({ descricaoObjetiva: 'x', escopoInclui: ['a'] })).toMatchObject({ escopoExclui: [], duvidasEmAberto: [] });
  });

  it('sistemaAlvo fora do formato → recusado', () => {
    for (const s of ['Meu-Sistema', 'meu/sistema', '-meu', 'meu sistema']) {
      expect(criarEspecificacaoSchema.safeParse({ descricaoObjetiva: 'x', escopoInclui: ['a'], sistemaAlvo: s }).success, s).toBe(false);
    }
  });

  it('C-11: autoria do body descartada', () => {
    expect(criarEspecificacaoSchema.parse({ descricaoObjetiva: 'x', escopoInclui: ['a'], rascunhoAgente: false, autorTipo: 'pessoa' })).not.toHaveProperty('rascunhoAgente');
    const r = criarEspecificacaoSchema.parse({ descricaoObjetiva: 'x', escopoInclui: ['a'], autorId: 'u', responsavel: 'x', id: 'ESP-DEM-20261022-0001-v9', versao: 9 });
    for (const k of ['autorTipo', 'autorId', 'responsavel', 'id', 'versao', 'demandaId', 'execucaoAgenteId']) expect(r).not.toHaveProperty(k);
  });
});

describe('validarCamposDeConstrucao', () => {
  it('CA-08.2: novo_projeto sem repositorioDestino → campo repositorioDestino', () => {
    expect(
      validarCamposDeConstrucao('novo_projeto', { descricaoObjetiva: 'x', escopoInclui: ['a'], sistemaAlvo: 'meu-sistema', criteriosAceitePreliminares: ['c'], definicaoDePronto: ['p'] } as never),
    ).toEqual([{ campo: 'repositorioDestino', mensagem: 'Informe o repositório destino.' }]);
  });

  it('CA-08.3: repositório em outra conta → recusado', () => {
    const r = validarCamposDeConstrucao('melhoria', {
      descricaoObjetiva: 'x',
      escopoInclui: ['a'],
      sistemaAlvo: 'meu-sistema',
      repositorioDestino: 'outra-conta/meu-sistema',
      criteriosAceitePreliminares: ['c'],
      definicaoDePronto: ['p'],
    } as never);
    expect(r[0]!.campo).toBe('repositorioDestino');
    expect(r).toEqual([{ campo: 'repositorioDestino', mensagem: MENSAGENS_CONSTRUCAO.contaDoRepositorio }]);
  });

  it('CA-08.4: estudo sem os quatro campos → aceito', () => {
    expect(validarCamposDeConstrucao('estudo', { descricaoObjetiva: 'x', escopoInclui: ['a'] } as never)).toEqual([]);
  });

  it('bug sem nenhum dos quatro → os quatro campos, nesta ordem, com as mensagens da 03', () => {
    expect(validarCamposDeConstrucao('bug', criarEspecificacaoSchema.parse({ descricaoObjetiva: 'x', escopoInclui: ['a'] }))).toEqual([
      { campo: 'sistemaAlvo', mensagem: 'Informe o sistema alvo.' },
      { campo: 'repositorioDestino', mensagem: 'Informe o repositório destino.' },
      { campo: 'criteriosAceitePreliminares', mensagem: 'Informe ao menos um critério de aceite preliminar.' },
      { campo: 'definicaoDePronto', mensagem: 'Informe ao menos um item da definição de pronto.' },
    ]);
  });

  it('listas vazias contam como ausentes', () => {
    expect(validarCamposDeConstrucao('produto_proprio', completa({ criteriosAceitePreliminares: [], definicaoDePronto: [] })).map((c) => c.campo)).toEqual([
      'criteriosAceitePreliminares',
      'definicaoDePronto',
    ]);
  });

  it('repositório que não termina com o sistema alvo → mensagem da 03', () => {
    for (const repositorioDestino of ['wsssistemas2626-crypto/outro-sistema', 'wsssistemas2626-crypto/meu-sistema/extra', 'meu-sistema', 'wsssistemas2626-crypto/']) {
      expect(validarCamposDeConstrucao('bug', completa({ repositorioDestino })), repositorioDestino).toEqual([
        { campo: 'repositorioDestino', mensagem: 'O repositório destino precisa terminar com o sistema alvo.' },
      ]);
    }
  });

  it('cada dono da lista do validarPedido é aceito, nos quatro tipos construídos', () => {
    for (const dono of DONOS_REPOSITORIO) {
      for (const tipo of ['novo_projeto', 'melhoria', 'produto_proprio', 'bug'] as const) {
        expect(validarCamposDeConstrucao(tipo, completa({ repositorioDestino: `${dono}/meu-sistema` })), `${tipo} ${dono}`).toEqual([]);
      }
    }
  });

  it('a mensagem da conta cita os donos do validarPedido', () => {
    for (const dono of DONOS_REPOSITORIO) expect(MENSAGENS_CONSTRUCAO.contaDoRepositorio).toContain(dono);
  });

  it('estudo com repositório informado segue a mesma regra do repositório', () => {
    expect(validarCamposDeConstrucao('estudo', completa({ repositorioDestino: 'outra-conta/meu-sistema' })).map((c) => c.campo)).toEqual(['repositorioDestino']);
    expect(validarCamposDeConstrucao('estudo', completa())).toEqual([]);
  });
});
