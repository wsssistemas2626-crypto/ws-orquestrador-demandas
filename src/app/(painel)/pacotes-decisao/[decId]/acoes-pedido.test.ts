// T44: a Server Action "Gerar Pedido de Construção" da T11 contra o banco e o Better Auth reais (Testcontainers). A regra
// é a de POST /api/pacotes-decisao/:decId/pedido-construcao (gerarPedido, T22): a geração é por ação, e não por GET
// (C-16); o resultado leva o JSON exato que a rota devolve, para baixar e copiar; as recusas chegam como na API e a tela
// as mostra por erroDoPedido (dados-do-pedido.ts). C-28: o 422 diz o campo e o tipo, nunca o valor. Relógio fixo
// (RNF-15), um dia por teste (C-36).
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../../../test/banco';
import { criarDepsDeTeste } from '../../../../../test/deps';
import { criarPessoa } from '../../../../../test/sessao';
import { erroDoPedido } from '../../../../components/dados-do-pedido';
import { evento } from '../../../../db/schema';
import { definirDepsParaTeste, type Deps } from '../../../../lib/deps';
import { substituirDestinoDoLog } from '../../../../lib/log';
import { relogioFixo, type RelogioFixo } from '../../../../lib/relogio';
import type { AtorPessoa } from '../../../../modules/acesso/ator';
import { criarDemandaSchema } from '../../../../modules/demandas/schemas';
import { criarDemanda } from '../../../../modules/demandas/servico';
import { criarEspecificacaoSchema } from '../../../../modules/especificacoes/schemas';
import { criarEspecificacao } from '../../../../modules/especificacoes/servico';
import { criarPacoteDecisao } from '../../../../modules/pacotes-decisao/criar';
import { registrarDecisao } from '../../../../modules/pacotes-decisao/decidir';
import { criarPacoteDecisaoSchema, registrarDecisaoSchema } from '../../../../modules/pacotes-decisao/schemas';
import { criarParecerRiscoSchema } from '../../../../modules/pareceres-risco/schemas';
import { criarParecerRisco } from '../../../../modules/pareceres-risco/servico';
import { gerarPedido, MENSAGENS_PEDIDO } from '../../../../modules/pedido-construcao/gerar';
import { gerarPedidoNoPainel } from './acoes-pedido';

const pedido = vi.hoisted(() => ({ cabecalhos: new Headers() }));
vi.mock('next/headers', () => ({ headers: async () => pedido.cabecalhos }));
vi.mock('../../../../lib/sentry', () => ({ capturarErro: () => undefined }));

const DIA_MS = 86_400_000;
const EMAIL_FICTICIO = 'pessoa.ficticia@cliente.test';
// D3 do 0013: a tela manda a confirmação de que o texto não tem dado pessoal (a caixa marcada da T11).
const CONFIRMADO = { confirmaSemDadoPessoal: true } as const;
// D1 do 0013: a orientação do 422 de dado pessoal na ESP (linhas 3 e 6 de orientacaoDoPedido).
// 0.1.13: a linha 6 diz que o pacote aprovado mais novo substitui este (antes, que outro pacote não se aprovava).
const ORIENTACAO_ESP = [
  'ESP, critérios de aceite, definição de pronto, sistema e repositório: corrija numa versão nova da ESP.',
  'Depois de corrigir, crie um pacote novo e aprove-o: o pacote aprovado mais novo substitui este, e só ele gera o Pedido de Construção.',
];

let b: BancoDeTeste;
let deps: Deps;
let relogio: RelogioFixo;
let cookieCto: string;
let cookieAdm: string;
let cto: AtorPessoa;
let adm: AtorPessoa;
let dia = 0;

type Tipo = 'novo_projeto' | 'estudo';

const espConstruida = {
  descricaoObjetiva: 'Portal de acompanhamento (fictício)',
  escopoInclui: ['Consulta do pedido (fictício)'],
  sistemaAlvo: 'sistema-ficticio',
  repositorioDestino: 'wsssistemas2626-crypto/sistema-ficticio',
  criteriosAceitePreliminares: ['O cliente vê a situação do pedido (fictício)'],
  definicaoDePronto: ['Testes verdes (fictício)'],
};

// Demanda, ESP, RSK e DEC de nível cto; `aprovar` registra a decisão pela conta cto.
async function novoPacote(tipo: Tipo, esp: Record<string, unknown>, aprovar = true): Promise<string> {
  const d = await criarDemanda(
    deps,
    cto,
    criarDemandaSchema.parse({ titulo: 'Demanda do pedido (fictício)', tipo, solicitanteNome: 'Pessoa Ficticia', contexto: 'Contexto fictício.' }),
  );
  await criarEspecificacao(deps, cto, d.id, criarEspecificacaoSchema.parse(esp));
  await criarParecerRisco(deps, cto, d.id, criarParecerRiscoSchema.parse({ riscoTecnicoNivel: 'medio', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo' }));
  const dec = await criarPacoteDecisao(
    deps,
    cto,
    d.id,
    criarPacoteDecisaoSchema.parse({ resumoExecutivo: 'Resumo (fictício)', opcaoA: { descricao: 'A (fictício)' }, opcaoB: { descricao: 'B (fictício)' }, nivelAprovacaoRequerido: 'cto' }),
  );
  if (aprovar) await registrarDecisao(deps, cto, dec.id, { statusDecisao: 'aprovada', opcaoEscolhida: 'A' });
  return dec.id;
}

const como = (cookie: string) => {
  pedido.cabecalhos = new Headers({ cookie });
};

beforeAll(async () => {
  b = await novoBanco();
  relogio = relogioFixo('2026-10-22T12:00:00Z');
  deps = await criarDepsDeTeste(b, { relogio });
  definirDepsParaTeste(deps);
  const pc = await criarPessoa(deps, { papel: 'cto' });
  const pa = await criarPessoa(deps, { papel: 'administradora' });
  cookieCto = pc.cookie;
  cookieAdm = pa.cookie;
  cto = { tipo: 'pessoa', usuarioId: pc.usuarioId, nome: 'Pessoa Ficticia', papel: 'cto' };
  adm = { tipo: 'pessoa', usuarioId: pa.usuarioId, nome: 'Pessoa Ficticia', papel: 'administradora' };
});

afterAll(async () => {
  definirDepsParaTeste(null);
  await deps.fila.parar();
  await b.fechar();
});

beforeEach(() => {
  relogio.definir('2026-10-22T12:00:00Z');
  relogio.avancar(++dia * DIA_MS);
  como(cookieCto);
});

describe('gerarPedidoNoPainel (T44)', () => {
  it('aprovado: o JSON e o nome do arquivo de gerarPedido, byte a byte; gerar de novo devolve o mesmo (CA-22.2)', async () => {
    const decId = await novoPacote('novo_projeto', espConstruida);
    const r = await gerarPedidoNoPainel({ decId, ...CONFIRMADO });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Object.keys(r.dados).sort()).toEqual(['json', 'nomeArquivo']);
    expect(r.dados.nomeArquivo).toBe(`${decId}.json`);
    expect(r.dados).toEqual(await gerarPedido(deps, cto, decId, CONFIRMADO));
    expect(JSON.parse(r.dados.json)).toMatchObject({ pedido: decId, sistema_alvo: 'sistema-ficticio', repositorio_destino: 'wsssistemas2626-crypto/sistema-ficticio' });
    relogio.avancar(DIA_MS);
    expect(await gerarPedidoNoPainel({ decId, ...CONFIRMADO })).toEqual(r);
  });

  it('a administradora também gera (gerar_pedido_construcao é de pessoa)', async () => {
    const decId = await novoPacote('novo_projeto', espConstruida);
    como(cookieAdm);
    expect(await gerarPedidoNoPainel({ decId, ...CONFIRMADO })).toMatchObject({ ok: true, dados: { nomeArquivo: `${decId}.json` } });
  });

  it('pacote pendente: 409, e a tela mostra "Não foi possível concluir: …"', async () => {
    const decId = await novoPacote('novo_projeto', espConstruida, false);
    const r = await gerarPedidoNoPainel({ decId, ...CONFIRMADO });
    expect(r).toMatchObject({ ok: false, erro: 'conflito', mensagem: MENSAGENS_PEDIDO.naoAprovado });
    if (r.ok) return;
    expect(erroDoPedido(r).texto).toBe(`Não foi possível concluir: ${MENSAGENS_PEDIDO.naoAprovado}`);
  });

  it('Estudo: 422, e a tela mostra "Demanda do tipo Estudo não gera Pedido de Construção."', async () => {
    const decId = await novoPacote('estudo', { descricaoObjetiva: 'Estudo (fictício)', escopoInclui: ['Comparar opções (fictício)'] });
    const r = await gerarPedidoNoPainel({ decId, ...CONFIRMADO });
    expect(r).toMatchObject({ ok: false, erro: 'nao_processavel', mensagem: MENSAGENS_PEDIDO.estudo });
    if (r.ok) return;
    expect(erroDoPedido(r)).toEqual({ texto: 'Demanda do tipo Estudo não gera Pedido de Construção.', erros: [], orientacao: [] });
  });

  it('C-28: e-mail fictício na ESP → 422 com o campo e o tipo; o valor não aparece em parte nenhuma do resultado', async () => {
    const decId = await novoPacote('novo_projeto', { ...espConstruida, descricaoObjetiva: `Falar com ${EMAIL_FICTICIO} (fictício)` });
    const r = await gerarPedidoNoPainel({ decId, ...CONFIRMADO });
    expect(r).toMatchObject({ ok: false, erro: 'nao_processavel', mensagem: MENSAGENS_PEDIDO.naoPassou, erros: ['especificacao.conteudo: e-mail'] });
    expect(JSON.stringify(r)).not.toContain(EMAIL_FICTICIO);
    if (r.ok) return;
    expect(erroDoPedido(r)).toEqual({
      texto: 'O pedido não passou na validação do /construir. Nada foi entregue. Erros:',
      erros: ['especificacao.conteudo: e-mail'],
      orientacao: ORIENTACAO_ESP,
    });
  });

  it('D3 do 0013: sem a confirmação ({ decId }) ou com false → 422 semConfirmacao, sem evento, e a tela mostra o texto sem lista nem orientação', async () => {
    const decId = await novoPacote('novo_projeto', espConstruida);
    for (const entrada of [{ decId }, { decId, confirmaSemDadoPessoal: false }]) {
      const r = await gerarPedidoNoPainel(entrada);
      expect(r, JSON.stringify(entrada)).toEqual({ ok: false, erro: 'nao_processavel', mensagem: MENSAGENS_PEDIDO.semConfirmacao });
      if (r.ok) continue;
      expect(erroDoPedido(r)).toEqual({ texto: MENSAGENS_PEDIDO.semConfirmacao, erros: [], orientacao: [] });
    }
    // Tipo errado: erro de entrada, como em todo corpo.
    expect(await gerarPedidoNoPainel({ decId, confirmaSemDadoPessoal: 'true' })).toMatchObject({ ok: false, erro: 'entrada_invalida' });
    const eventos = await b.db
      .select()
      .from(evento)
      .where(and(eq(evento.entidadeId, decId), eq(evento.acao, 'pedido_gerado')));
    expect(eventos).toEqual([]);
  });

  // 0.1.13 (S3, caso 8): a aba velha da T11 do v1, depois de o v2 ser aprovado. A tela mostra o alerta da 2.8, sem lista
  // nem orientação.
  it('DEC substituído por um aprovado mais novo: 409, e a tela mostra "Não foi possível concluir: o pacote foi substituído por …"', async () => {
    const v1 = await novoPacote('novo_projeto', espConstruida);
    const demandaId = v1.slice('DEC-'.length, v1.lastIndexOf('-v'));
    const v2 = await criarPacoteDecisao(
      deps,
      cto,
      demandaId,
      criarPacoteDecisaoSchema.parse({ resumoExecutivo: 'Resumo (fictício)', opcaoA: { descricao: 'A (fictício)' }, opcaoB: { descricao: 'B (fictício)' }, nivelAprovacaoRequerido: 'cto' }),
    );
    await registrarDecisao(deps, cto, v2.id, { statusDecisao: 'aprovada', opcaoEscolhida: 'B' });
    const r = await gerarPedidoNoPainel({ decId: v1, ...CONFIRMADO });
    expect(r).toEqual({ ok: false, erro: 'conflito', mensagem: MENSAGENS_PEDIDO.substituido(v2.id) });
    if (r.ok) return;
    expect(erroDoPedido(r)).toEqual({
      texto: `Não foi possível concluir: o pacote foi substituído por ${v2.id}, aprovado depois dele; só o pacote aprovado mais novo gera o Pedido de Construção.`,
      erros: [],
      orientacao: [],
    });
    expect(await gerarPedidoNoPainel({ decId: v2.id, ...CONFIRMADO })).toMatchObject({ ok: true, dados: { nomeArquivo: `${v2.id}.json` } });
  });

  it('C-17: id fora do formato ou de outra versão é recusado antes do banco; DEC que não existe dá 404; sem sessão, 401', async () => {
    for (const decId of ['DEC-1', 'ESP-DEM-20261022-0001-v1', 'DEM-20261022-0001', "DEC-DEM-20261022-0001-v1'"])
      expect(await gerarPedidoNoPainel({ decId, ...CONFIRMADO }), decId).toMatchObject({ ok: false, erro: 'entrada_invalida' });
    expect(await gerarPedidoNoPainel({})).toMatchObject({ ok: false, erro: 'entrada_invalida' });
    expect(await gerarPedidoNoPainel({ decId: 'DEC-DEM-20991231-9999-v1', ...CONFIRMADO })).toMatchObject({ ok: false, erro: 'nao_encontrado' });
    const decId = await novoPacote('novo_projeto', espConstruida);
    pedido.cabecalhos = new Headers();
    expect(await gerarPedidoNoPainel({ decId, ...CONFIRMADO })).toMatchObject({ ok: false, erro: 'nao_autenticado' });
  });
});

// 06-T44-testes (qa-automacao): o que a Server Action garante sem a ajuda da tela. A tela só mostra a seção com a decisão
// aprovada completa (secaoDoPedido), mas quem chama a ação direto pode mandar qualquer DEC: a regra que vale é a do
// servidor. Aqui, CA-22.4 nos estados que a tela esconde, o evento de cada geração com a pessoa da sessão (RF-21), o 2FA
// (C-04) e a linha de log (C-21). Cada teste cria os próprios dados, no dia próprio do beforeEach do arquivo.
describe('gerarPedidoNoPainel: a regra do servidor sem a ajuda da tela (qa-automacao)', () => {
  const eventosDoPedido = (decId: string) =>
    b.db
      .select()
      .from(evento)
      .where(and(eq(evento.entidadeId, decId), eq(evento.acao, 'pedido_gerado')))
      .orderBy(evento.id);

  // Demanda, ESP, RSK e DEC pendente, sem decisão.
  async function pacotePendente(nivel: 'cto' | 'cto_e_administradora'): Promise<string> {
    const d = await criarDemanda(deps, cto, criarDemandaSchema.parse({ titulo: 'Demanda do pedido (fictício)', tipo: 'melhoria', solicitanteNome: 'Pessoa Ficticia' }));
    await criarEspecificacao(deps, cto, d.id, criarEspecificacaoSchema.parse(espConstruida));
    await criarParecerRisco(deps, cto, d.id, criarParecerRiscoSchema.parse({ riscoTecnicoNivel: 'baixo', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo' }));
    const dec = await criarPacoteDecisao(
      deps,
      cto,
      d.id,
      criarPacoteDecisaoSchema.parse({ resumoExecutivo: 'Resumo (fictício)', opcaoA: { descricao: 'A (fictício)' }, opcaoB: { descricao: 'B (fictício)' }, nivelAprovacaoRequerido: nivel }),
    );
    return dec.id;
  }

  it('CA-22.4: devolvido, arquivado e só uma das duas aprovações (do CTO ou da administradora) → 409 nas duas contas, com o texto da tela e sem evento', async () => {
    const devolvido = await pacotePendente('cto');
    await registrarDecisao(deps, cto, devolvido, registrarDecisaoSchema.parse({ statusDecisao: 'devolvida' }));
    const arquivado = await pacotePendente('cto');
    await registrarDecisao(deps, cto, arquivado, registrarDecisaoSchema.parse({ statusDecisao: 'arquivada' }));
    const soCto = await pacotePendente('cto_e_administradora');
    await registrarDecisao(deps, cto, soCto, registrarDecisaoSchema.parse({ statusDecisao: 'aprovada', opcaoEscolhida: 'A' }));
    const soAdm = await pacotePendente('cto_e_administradora');
    await registrarDecisao(
      deps,
      adm,
      soAdm,
      registrarDecisaoSchema.parse({ statusDecisao: 'aprovada', opcaoEscolhida: 'A', referenciaDocumento: 'DOC-FICTICIO-T44', dataDocumento: '2026-10-22' }),
    );

    for (const [conta, cookie] of [
      ['cto', cookieCto],
      ['administradora', cookieAdm],
    ] as const) {
      como(cookie);
      for (const decId of [devolvido, arquivado, soCto, soAdm]) {
        // Arquivar encerra a demanda: desde a 0.1.6 (M-08), a recusa é a da demanda em status final, que vem antes do
        // status do DEC. Continua 409, sem evento.
        const mensagem = decId === arquivado ? MENSAGENS_PEDIDO.demandaFinal : MENSAGENS_PEDIDO.naoAprovado;
        const r = await gerarPedidoNoPainel({ decId, ...CONFIRMADO });
        expect(r, `${conta} ${decId}`).toEqual({ ok: false, erro: 'conflito', mensagem });
        if (r.ok) continue;
        expect(erroDoPedido(r)).toEqual({ texto: `Não foi possível concluir: ${mensagem}`, erros: [], orientacao: [] });
      }
    }
    for (const decId of [devolvido, arquivado, soCto, soAdm]) expect(await eventosDoPedido(decId), decId).toEqual([]);
  });

  it('RF-21: cada geração pela ação grava um pedido_gerado com a pessoa da sessão e a confirmação (D3 do 0013), sem conteúdo; recusa e conta sem 2FA não gravam', async () => {
    const decId = await novoPacote('novo_projeto', espConstruida);
    expect(await eventosDoPedido(decId)).toEqual([]);

    const r1 = await gerarPedidoNoPainel({ decId, ...CONFIRMADO });
    como(cookieAdm);
    const r2 = await gerarPedidoNoPainel({ decId, ...CONFIRMADO });
    expect(r1.ok).toBe(true);
    expect(r2).toEqual(r1);
    expect((await eventosDoPedido(decId)).map((e) => [e.atorTipo, e.atorId, e.entidade, e.demandaId, e.antes, e.depois])).toEqual([
      ['pessoa', cto.usuarioId, 'pacote_decisao', decId.slice('DEC-'.length, decId.lastIndexOf('-v')), null, { confirmaSemDadoPessoal: true }],
      ['pessoa', adm.usuarioId, 'pacote_decisao', decId.slice('DEC-'.length, decId.lastIndexOf('-v')), null, { confirmaSemDadoPessoal: true }],
    ]);

    // C-04: com senha certa e sem 2FA a ação não roda, e nada é gravado.
    const sem2fa = await criarPessoa(deps, { papel: 'cto', com2fa: false });
    como(sem2fa.cookie);
    expect(await gerarPedidoNoPainel({ decId, ...CONFIRMADO })).toMatchObject({ ok: false, erro: 'sem_2fa' });
    expect(await eventosDoPedido(decId)).toHaveLength(2);

    // Recusa pelo C-28 (422) também não grava.
    como(cookieCto);
    const comEmail = await novoPacote('novo_projeto', { ...espConstruida, descricaoObjetiva: `Falar com ${EMAIL_FICTICIO} (fictício)` });
    expect(await gerarPedidoNoPainel({ decId: comEmail, ...CONFIRMADO })).toMatchObject({ ok: false, erro: 'nao_processavel', mensagem: MENSAGENS_PEDIDO.naoPassou });
    expect(await eventosDoPedido(comEmail)).toEqual([]);
  });

  it('C-21: uma linha de log por chamada, só com a ação, o tempo, o tipo de ator e o código; nenhum log leva o id, o JSON nem o e-mail do 422', async () => {
    const aprovado = await novoPacote('novo_projeto', espConstruida);
    const comEmail = await novoPacote('novo_projeto', { ...espConstruida, descricaoObjetiva: `Falar com ${EMAIL_FICTICIO} (fictício)` });
    const linhas: string[] = [];
    substituirDestinoDoLog({
      write: (l) => {
        linhas.push(l);
      },
    });
    let json = '';
    try {
      const r = await gerarPedidoNoPainel({ decId: aprovado, ...CONFIRMADO });
      if (r.ok) json = r.dados.json;
      await gerarPedidoNoPainel({ decId: comEmail, ...CONFIRMADO });
      pedido.cabecalhos = new Headers();
      await gerarPedidoNoPainel({ decId: aprovado, ...CONFIRMADO });
    } finally {
      substituirDestinoDoLog(null);
    }
    expect(json).not.toBe('');

    const daAcao = linhas.map((l) => JSON.parse(l) as Record<string, unknown>).filter((l) => l.evento === 'acao_painel');
    expect(daAcao.map((l) => [l.rota, l.atorTipo, l.codigoErro])).toEqual([
      ['gerar_pedido_construcao', 'pessoa', undefined],
      ['gerar_pedido_construcao', 'pessoa', 'nao_processavel'],
      ['gerar_pedido_construcao', 'anonimo', 'nao_autenticado'],
    ]);
    for (const l of daAcao) {
      const campos = Object.keys(l).filter((k) => !['level', 'time', 'msg'].includes(k));
      expect(campos.filter((k) => !['evento', 'rota', 'ms', 'atorTipo', 'codigoErro'].includes(k))).toEqual([]);
    }
    const textoDaAcao = daAcao.map((l) => JSON.stringify(l)).join('\n');
    for (const id of [aprovado, comEmail]) expect(textoDaAcao, id).not.toContain(id);
    const tudo = linhas.join('\n');
    for (const proibido of [EMAIL_FICTICIO, 'sistema-ficticio', 'Portal de acompanhamento', '"pedido":', json.trim()]) expect(tudo, proibido).not.toContain(proibido);
  });
});
