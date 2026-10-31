// T39 (06-T39-testes, qa-automacao): as duas Server Actions da T04 e da T06 contra o banco e o Better Auth reais
// (Testcontainers), com a entrada montada pelas mesmas funções que a tela usa (dados-da-demanda.ts). O que o
// dados-da-demanda.test.ts e o formularios.test.ts do engenheiro não alcançam:
//   - o contrato entre a tela e o servidor: o que entradaDoFormulario e mudancasDaEdicao montam é gravado como a tela
//     mostrou, e os erros que o servidor devolve de verdade viram, por errosDaApi, os textos da 03 na linha certa;
//   - a validação do cliente é só conveniência: a Server Action chamada direto (sem ela) recusa e não grava nada;
//   - "Preencher à mão": o texto gravado é o da entrada pendente, nunca o do corpo;
//   - a edição não muda o status (só a T05 muda), e o id passa pela regex;
//   - a resposta das duas ações só leva o id, e nenhuma linha de log leva o texto, o nome ou a origem (C-21).
// Relógio fixo (RNF-15), um dia por teste por causa do limite de 30 demandas por hora (C-36). Só dado fictício.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../../test/banco';
import { criarDepsDeTeste } from '../../../../test/deps';
import { SENTINELAS, contemSentinela } from '../../../../test/sentinelas';
import { criarPessoa } from '../../../../test/sessao';
import {
  entradaDoFormulario,
  errosDaApi,
  mudancasDaEdicao,
  TEXTOS_DEMANDA,
  textoVazio,
  valoresDaDemanda,
  valoresVazios,
  type AnexoNoFormulario,
  type ValoresDaDemanda,
  type ValoresDoTexto,
} from '../../../components/dados-da-demanda';
import { definirDepsParaTeste, type Deps } from '../../../lib/deps';
import { MENSAGEM_NAO_ENCONTRADO } from '../../../lib/erros';
import { substituirDestinoDoLog } from '../../../lib/log';
import { relogioFixo, type RelogioFixo } from '../../../lib/relogio';
import { obterDemanda } from '../../../modules/demandas/consultas';
import { alterarDadosNoPainel } from './[id]/editar/acoes';
import { registrarEntradaNoPainel } from './nova/acoes';

const pedido = vi.hoisted(() => ({ cabecalhos: new Headers() }));
vi.mock('next/headers', () => ({ headers: async () => pedido.cabecalhos }));
vi.mock('../../../lib/sentry', () => ({ capturarErro: () => undefined }));

const DIA_MS = 86_400_000;
const RE_ID = /^DEM-\d{8}-\d{4}$/;
const MODELO = 'modelo-ficticio-t39';
const TEXTO = `Pedido recebido de ${SENTINELAS.email}, telefone ${SENTINELAS.telefone}.\n\n  ${SENTINELAS.texto}  `;

let b: BancoDeTeste;
let deps: Deps;
let relogio: RelogioFixo;
let cookieCto: string;
let cookieAdm: string;
let usuarioCto: string;
let dia = 0;
const linhasDoLog: string[] = [];

const com = (cookie: string | null) => {
  pedido.cabecalhos = cookie ? new Headers({ cookie }) : new Headers();
};

const consultar = async <T extends Record<string, unknown>>(texto: string, valores: unknown[] = []) => (await b.poolMigrator.query<T>(texto, valores)).rows;
const contar = async (tabela: string, onde = 'true', valores: unknown[] = []) =>
  Number((await consultar<{ n: string }>(`select count(*)::text as n from ${tabela} where ${onde}`, valores))[0]!.n);
const estado = async () => ({
  demandas: await contar('demanda'),
  brutas: await contar('entrada_bruta'),
  pendentes: await contar('entrada_pendente'),
  eventos: await contar('evento'),
  jobs: await contar('pgboss.job', 'name = $1', ['agente.executar']),
});
const linhaBruta = async (id: string) =>
  (await consultar<{ texto: string | null; origem: unknown; recebida_em: Date }>('select texto, origem, recebida_em from entrada_bruta where demanda_id = $1', [id]))[0];
const eventos = async (id: string) =>
  consultar<{ acao: string; antes: Record<string, unknown> | null; depois: Record<string, unknown> | null }>(
    'select acao, antes, depois from evento where demanda_id = $1 order by ocorrido_em, id',
    [id],
  );

const anexo = (n: number, referencia: string, descricao = '', tipo: 'url' | 'arquivo' = 'url'): AnexoNoFormulario => ({ chave: `qa-${n}`, tipo, referencia, descricao });

const preenchidos = (extra: Partial<ValoresDaDemanda> = {}): ValoresDaDemanda => ({
  ...valoresVazios(),
  solicitanteNome: 'Pessoa Ficticia',
  titulo: 'Pedidos duplicados no ERP (fictício)',
  tipo: 'bug',
  ...extra,
});

type Falha = Extract<Awaited<ReturnType<typeof registrarEntradaNoPainel>>, { ok: false }>;

function falhou<T extends { ok: boolean }>(r: T): Falha {
  if (r.ok) throw new Error('esperava falha da Server Action');
  return r as unknown as Falha;
}

// Cria pela própria Server Action da T04, como a tela faria, e devolve o id.
async function criarPelaTela(v: ValoresDaDemanda, t: ValoresDoTexto = textoVazio()): Promise<string> {
  const r = await registrarEntradaNoPainel(entradaDoFormulario(v, t, 'manual').entrada);
  if (!r.ok || r.dados.tipo !== 'demanda') throw new Error(`criarPelaTela: ${JSON.stringify(r)}`);
  return r.dados.id;
}

beforeAll(async () => {
  substituirDestinoDoLog({ write: (l) => void linhasDoLog.push(l) });
  b = await novoBanco();
  relogio = relogioFixo('2026-10-22T12:00:00Z');
  deps = await criarDepsDeTeste(b, { relogio });
  definirDepsParaTeste(deps);
  const cto = await criarPessoa(deps, { papel: 'cto' });
  cookieCto = cto.cookie;
  usuarioCto = cto.usuarioId;
  cookieAdm = (await criarPessoa(deps, { papel: 'administradora' })).cookie;
  await b.poolMigrator.query('insert into preco_modelo (modelo, preco_entrada_por_milhao, preco_saida_por_milhao, vigente_desde) values ($1, 3, 15, $2)', [
    MODELO,
    '2026-10-01T03:00:00Z',
  ]);
});

afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  await deps.fila.parar();
  await b.fechar();
});

beforeEach(async () => {
  relogio.definir('2026-10-22T12:00:00Z');
  relogio.avancar(++dia * DIA_MS);
  linhasDoLog.length = 0;
  com(cookieCto);
  // Os agentes nascem desligados (RF-19); só o teste do modo agente liga o orquestrador.
  await b.poolMigrator.query('update configuracao_agente set ligado = false, modelo = null');
  await b.poolMigrator.query('update configuracao_ia set teto_mensal = 0 where id = 1');
});

describe('registrarEntradaNoPainel (T04): a entrada montada pela tela', () => {
  it('CA-03.2 e CA-05.1: modo manual com texto, origem e anexos; a resposta só tem { tipo, id }; o texto fica em entrada_bruta como foi colado; nenhum job de IA', async () => {
    const v = preenchidos({
      solicitanteNome: SENTINELAS.nome,
      solicitantePapel: 'operacoes',
      urgencia: 'alta',
      justificativaUrgencia: 'Cliente parado (fictício)',
      contexto: 'Contexto fictício',
      anexos: [anexo(1, ''), anexo(2, 'https://exemplo.test/especificacao-ficticia', 'Especificação fictícia'), anexo(3, 'contrato-ficticio.pdf', '', 'arquivo')],
    });
    const t = { texto: TEXTO, canal: 'email', referencia: 'MSG-FICTICIA-0001' };
    // Em delta: o teste do modo agente, se rodar antes, deixa a execução e o job dele.
    const jobsAntes = await contar('pgboss.job', 'name = $1', ['agente.executar']);
    const execucoesAntes = await contar('execucao_agente');
    const r = await registrarEntradaNoPainel(entradaDoFormulario(v, t, 'manual').entrada);

    expect(r.ok).toBe(true);
    if (!r.ok || r.dados.tipo !== 'demanda') return;
    expect(Object.keys(r.dados).sort()).toEqual(['id', 'tipo']);
    expect(r.dados.id).toMatch(RE_ID);
    expect(contemSentinela(JSON.stringify(r))).toBe(false);

    const d = await obterDemanda(deps.db, r.dados.id);
    expect(d).toMatchObject({
      status: 'nova',
      titulo: 'Pedidos duplicados no ERP (fictício)',
      tipo: 'bug',
      solicitanteNome: SENTINELAS.nome,
      solicitantePapel: 'operacoes',
      urgencia: 'alta',
      justificativaUrgencia: 'Cliente parado (fictício)',
      contexto: 'Contexto fictício',
      linhaServicoProvavel: null,
      descricaoProblema: null,
      impactoPercebido: null,
      rascunhoAgente: false,
    });
    // O anexo em branco não chega; os outros, na ordem da tela, sem chave a mais.
    expect(d.anexos).toEqual([
      { tipo: 'url', referencia: 'https://exemplo.test/especificacao-ficticia', descricao: 'Especificação fictícia' },
      { tipo: 'arquivo', referencia: 'contrato-ficticio.pdf' },
    ]);
    const eb = await linhaBruta(r.dados.id);
    expect(eb?.texto).toBe(TEXTO);
    expect(eb?.origem).toEqual({ canal: 'email', referencia: 'MSG-FICTICIA-0001' });
    expect(eb?.recebida_em.toISOString()).toBe(relogio.agora().toISOString());
    expect(await contar('pgboss.job', 'name = $1', ['agente.executar'])).toBe(jobsAntes);
    expect(await contar('execucao_agente')).toBe(execucoesAntes);
  });

  it('a tela que reabre a demanda criada (valoresDaDemanda) mostra exatamente o que foi digitado: ida e volta sem perda', async () => {
    const v = preenchidos({
      solicitantePapel: 'produto',
      linhaServicoProvavel: 'automacao_integracao',
      urgencia: 'baixa',
      descricaoProblema: 'Descrição fictícia',
      impactoPercebido: 'Impacto fictício',
      anexos: [anexo(1, 'https://exemplo.test/a', 'A'), anexo(2, 'b.pdf', '', 'arquivo')],
    });
    const id = await criarPelaTela(v);
    const reaberta = valoresDaDemanda(await obterDemanda(deps.db, id));
    const semChave = (x: ValoresDaDemanda) => ({ ...x, anexos: x.anexos.map(({ tipo, referencia, descricao }) => ({ tipo, referencia, descricao })) });
    expect(semChave(reaberta)).toEqual(semChave(v));
    // Reaberta e salva sem mexer: nada a enviar.
    expect(mudancasDaEdicao(reaberta, reaberta).mudancas).toEqual({});
  });

  // A sessão sem 2FA (sem_2fa) fica no acao-painel.test.ts (T11): ela vence em 15 min pelo relógio dos Deps, e aqui o
  // relógio fixo anda um dia por teste.
  it('sem sessão: nada é gravado, e a resposta não ecoa o texto', async () => {
    const entrada = entradaDoFormulario(preenchidos(), { ...textoVazio(), texto: TEXTO }, 'manual').entrada;
    const antes = await estado();
    com(null);
    const r = await registrarEntradaNoPainel(entrada);
    expect(r).toMatchObject({ ok: false, erro: 'nao_autenticado' });
    expect(contemSentinela(JSON.stringify(r))).toBe(false);
    expect(await estado()).toEqual(antes);
  });

  it('a administradora também registra (registrar_entrada é de qualquer pessoa)', async () => {
    com(cookieAdm);
    const r = await registrarEntradaNoPainel(entradaDoFormulario(preenchidos(), textoVazio(), 'manual').entrada);
    expect(r).toMatchObject({ ok: true, dados: { tipo: 'demanda' } });
  });

  it('CA-05.3 e RNF-04 no servidor: 100.001 caracteres enviados direto à Server Action (sem a validação do cliente) → recusa no campo texto, nada gravado; a tela mostra o texto da 03', async () => {
    const t = { ...textoVazio(), texto: `${SENTINELAS.texto}${'x'.repeat(100_001 - SENTINELAS.texto.length)}` };
    const antes = await estado();
    const r = falhou(await registrarEntradaNoPainel(entradaDoFormulario(preenchidos(), t, 'manual').entrada));
    expect(r.erro).toBe('entrada_invalida');
    expect(r.campos?.map((c) => c.campo)).toEqual(['texto']);
    expect(contemSentinela(JSON.stringify(r))).toBe(false);
    expect(await estado()).toEqual(antes);
    const tela = errosDaApi(r, { modo: 'manual', tamanhoTexto: t.texto.length, indicesAnexos: [] });
    expect(tela.campos).toEqual([{ campo: 'texto', idCampo: 'campo-texto', rotulo: 'Texto do pedido', mensagem: 'O texto tem 100.001 caracteres. O limite é 100.000.' }]);
  });

  it('contrato com errosDaApi: os erros reais do servidor (obrigatórios vazios, tipo fora da lista, link javascript:) viram os textos da 03, na linha da tela', async () => {
    // A entrada que a tela montaria se a validação do cliente fosse pulada: o anexo da linha 2 é o 1º enviado.
    const v = preenchidos({ solicitanteNome: '  ', titulo: '', tipo: '', anexos: [anexo(1, ''), anexo(2, 'javascript:alert(1)')] });
    const { entrada, indicesAnexos } = entradaDoFormulario(v, textoVazio(), 'manual');
    expect(indicesAnexos).toEqual([1]);
    const antes = await estado();
    const r = falhou(await registrarEntradaNoPainel(entrada));
    expect(r.erro).toBe('entrada_invalida');
    expect(await estado()).toEqual(antes);

    const tela = errosDaApi(r, { modo: 'manual', tamanhoTexto: 0, indicesAnexos });
    const porCampo = Object.fromEntries(tela.campos.map((c) => [c.campo, [c.idCampo, c.rotulo, c.mensagem]]));
    expect(porCampo).toEqual({
      solicitanteNome: ['campo-solicitanteNome', 'Nome do solicitante', 'Informe o nome do solicitante.'],
      titulo: ['campo-titulo', 'Título', 'Informe o título.'],
      tipo: ['campo-tipo-bug', 'Tipo', 'Escolha o tipo.'],
      'anexos.1.referencia': ['campo-anexos-1-referencia', 'Referência do anexo 2', 'Use um link que comece com http:// ou https://.'],
    });
    expect(tela.alerta).toBeNull();
  });

  it('contrato com errosDaApi: 51 anexos enviados direto → "Limite de 50 anexos atingido.", no botão "Adicionar anexo"', async () => {
    const v = preenchidos({ anexos: Array.from({ length: 51 }, (_, i) => anexo(i, `ref-ficticia-${i}.pdf`, '', 'arquivo')) });
    const { entrada, indicesAnexos } = entradaDoFormulario(v, textoVazio(), 'manual');
    const antes = await estado();
    const r = falhou(await registrarEntradaNoPainel(entrada));
    expect(await estado()).toEqual(antes);
    const tela = errosDaApi(r, { modo: 'manual', tamanhoTexto: 0, indicesAnexos });
    expect(tela.campos).toEqual([{ campo: 'anexos', idCampo: 'adicionar-anexo', rotulo: 'Anexos (referências)', mensagem: 'Limite de 50 anexos atingido.' }]);
  });

  it('chave de autoria no corpo é descartada (C-11): a demanda nasce da pessoa da sessão, sem rascunho de agente', async () => {
    const entrada = { ...entradaDoFormulario(preenchidos(), textoVazio(), 'manual').entrada, autorTipo: 'agente', autorId: 'orquestrador', rascunhoAgente: true, status: 'aprovada' };
    const r = await registrarEntradaNoPainel(entrada);
    if (!r.ok || r.dados.tipo !== 'demanda') throw new Error('esperava demanda');
    const d = await obterDemanda(deps.db, r.dados.id);
    expect(d).toMatchObject({ status: 'nova', rascunhoAgente: false, responsavel: { tipo: 'pessoa' } });
  });
});

describe('registrarEntradaNoPainel (T04): "Preencher à mão" e modo agente', () => {
  const TEXTO_DA_PENDENTE = `Texto da entrada pendente ${SENTINELAS.texto} ${SENTINELAS.telefone}`;

  async function criarPendente(): Promise<{ id: string; recebidaEm: Date }> {
    const recebidaEm = new Date(relogio.agora().getTime() - 3 * 3_600_000);
    const [p] = await consultar<{ id: string }>(
      `insert into entrada_pendente (texto, origem, solicitante_nome, solicitante_papel, status, registrada_por, recebida_em)
       values ($1, $2, 'Pessoa Ficticia', 'financeiro', 'falhou', $3, $4) returning id`,
      [TEXTO_DA_PENDENTE, JSON.stringify({ canal: 'mensagem', referencia: 'REF-FICTICIA-PENDENTE' }), usuarioCto, recebidaEm],
    );
    return { id: p!.id, recebidaEm };
  }

  it('o texto gravado é o da entrada pendente, e não o que vier no corpo; a data de recebimento é a da pendente; a pendente some', async () => {
    const p = await criarPendente();
    const v = preenchidos({ solicitantePapel: 'financeiro' });
    // A tela manda só o id; aqui o corpo também traz texto e origem trocados, como se alguém mexesse no navegador.
    const entrada = { ...entradaDoFormulario(v, { texto: 'ignorado', canal: '', referencia: '' }, 'manual', p.id).entrada, texto: 'Texto trocado no navegador', origem: { canal: 'outro' } };
    const r = await registrarEntradaNoPainel(entrada);
    if (!r.ok || r.dados.tipo !== 'demanda') throw new Error(`esperava demanda: ${JSON.stringify(r)}`);
    expect(contemSentinela(JSON.stringify(r))).toBe(false);

    const eb = await linhaBruta(r.dados.id);
    expect(eb?.texto).toBe(TEXTO_DA_PENDENTE);
    expect(eb?.origem).toEqual({ canal: 'mensagem', referencia: 'REF-FICTICIA-PENDENTE' });
    expect(eb?.recebida_em.toISOString()).toBe(p.recebidaEm.toISOString());
    expect(await contar('entrada_pendente', 'id = $1', [p.id])).toBe(0);
  });

  it('a mesma pendente enviada de novo (outra aba): não cria a segunda demanda, e a tela mostra o texto da 2.8', async () => {
    const p = await criarPendente();
    const entrada = entradaDoFormulario(preenchidos(), textoVazio(), 'manual', p.id).entrada;
    expect((await registrarEntradaNoPainel(entrada)).ok).toBe(true);
    const antes = await estado();
    const r = falhou(await registrarEntradaNoPainel(entrada));
    expect(r).toMatchObject({ erro: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO });
    expect(await estado()).toEqual(antes);
    expect(errosDaApi(r, { modo: 'manual', tamanhoTexto: 0, indicesAnexos: [] }).alerta).toBe(MENSAGEM_NAO_ENCONTRADO);
  });

  it('modo agente com o orquestrador desligado: conflito, nada gravado; a tela mostra "Não foi possível concluir: …"', async () => {
    const t = { ...textoVazio(), texto: TEXTO };
    const antes = await estado();
    const r = falhou(await registrarEntradaNoPainel(entradaDoFormulario(preenchidos(), t, 'agente').entrada));
    expect(r.erro).toBe('conflito');
    expect(await estado()).toEqual(antes);
    expect(errosDaApi(r, { modo: 'agente', tamanhoTexto: TEXTO.length, indicesAnexos: [] }).alerta).toBe(
      'Não foi possível concluir: O agente orquestrador está desligado. Preencha os campos abaixo.',
    );
  });

  it('modo agente com o orquestrador ligado e teto: { tipo: "pendente" } sem o id nem o texto; a pendente guarda só texto, origem e solicitante, e há um job', async () => {
    await b.poolMigrator.query('update configuracao_agente set ligado = true, modelo = $1 where agente = $2', [MODELO, 'orquestrador']);
    await b.poolMigrator.query('update configuracao_ia set teto_mensal = 10 where id = 1');
    // A tela no modo agente: classificação e anexos digitados antes de trocar o modo não vão (RF-20, minimização).
    const v = preenchidos({ solicitanteNome: SENTINELAS.nome, contexto: 'Não vai ao agente (fictício)', anexos: [anexo(1, 'https://exemplo.test/nao-vai')] });
    const t = { texto: TEXTO, canal: 'email', referencia: '' };
    const antes = await estado();
    const r = await registrarEntradaNoPainel(entradaDoFormulario(v, t, 'agente').entrada);
    expect(r).toEqual({ ok: true, dados: { tipo: 'pendente' } });

    const depois = await estado();
    expect(depois.demandas).toBe(antes.demandas);
    expect(depois.pendentes).toBe(antes.pendentes + 1);
    expect(depois.jobs).toBe(antes.jobs + 1);
    const [p] = await consultar<{ texto: string; origem: unknown; solicitante_nome: string; status: string }>(
      'select texto, origem, solicitante_nome, status from entrada_pendente order by recebida_em desc limit 1',
    );
    // No modo agente o schema da T17 apara o texto (entradaAgenteSchema); no manual, o texto fica como chegou.
    expect(p).toEqual({ texto: TEXTO.trim(), origem: { canal: 'email' }, solicitante_nome: SENTINELAS.nome, status: 'aguardando' });
  });

  it('modo agente com o teto atingido: conflito com o texto do teto; a tela mostra "Não foi possível concluir: Agentes suspensos…"', async () => {
    await b.poolMigrator.query('update configuracao_agente set ligado = true, modelo = $1 where agente = $2', [MODELO, 'orquestrador']);
    // Teto zero: o gasto do mês (zero) já é maior ou igual ao teto (RF-18).
    const antes = await estado();
    const r = falhou(await registrarEntradaNoPainel(entradaDoFormulario(preenchidos(), { ...textoVazio(), texto: TEXTO }, 'agente').entrada));
    expect(await estado()).toEqual(antes);
    expect(errosDaApi(r, { modo: 'agente', tamanhoTexto: TEXTO.length, indicesAnexos: [] }).alerta).toBe(
      `Não foi possível concluir: ${TEXTOS_DEMANDA.suspenso}`,
    );
  });
});

describe('alterarDadosNoPainel (T06): as mudanças montadas pela tela', () => {
  it('RF-06: só o que mudou vai; campo esvaziado é limpo; anexos trocados vão inteiros; a resposta só tem o id; o histórico tem um campo_alterado por campo, com antes e depois', async () => {
    const id = await criarPelaTela(
      preenchidos({ urgencia: 'media', contexto: 'Contexto fictício antigo', anexos: [anexo(1, 'https://exemplo.test/a', 'A'), anexo(2, 'b.pdf', '', 'arquivo')] }),
    );
    const inicial = valoresDaDemanda(await obterDemanda(deps.db, id));
    const atual: ValoresDaDemanda = {
      ...inicial,
      titulo: 'Título editado (fictício)',
      contexto: '',
      urgencia: 'alta',
      // Removeu o 1º anexo, deixou uma linha em branco e acrescentou um link.
      anexos: [inicial.anexos[1]!, anexo(8, ''), anexo(9, 'https://exemplo.test/c', 'C')],
    };
    const { mudancas } = mudancasDaEdicao(inicial, atual);
    const r = await alterarDadosNoPainel({ ...mudancas, id });
    expect(r).toEqual({ ok: true, dados: { id } });

    const d = await obterDemanda(deps.db, id);
    expect(d).toMatchObject({ titulo: 'Título editado (fictício)', contexto: null, urgencia: 'alta', tipo: 'bug', solicitanteNome: 'Pessoa Ficticia', status: 'nova' });
    expect(d.anexos).toEqual([
      { tipo: 'arquivo', referencia: 'b.pdf' },
      { tipo: 'url', referencia: 'https://exemplo.test/c', descricao: 'C' },
    ]);
    const alterados = (await eventos(id)).filter((e) => e.acao === 'campo_alterado');
    expect(alterados.map((e) => Object.keys(e.depois ?? e.antes ?? {})[0]).sort()).toEqual(['anexos', 'contexto', 'titulo', 'urgencia']);
    // Enumeração com o valor de antes e o de depois (CA-06.4); texto livre só com a marca de alterado (T12, sem dado de
    // terceiro no histórico).
    const de = (campo: string) => alterados.find((e) => Object.keys(e.depois ?? e.antes ?? {})[0] === campo);
    expect(de('urgencia')).toMatchObject({ antes: { urgencia: 'media' }, depois: { urgencia: 'alta' } });
    expect(de('titulo')).toMatchObject({ antes: { titulo: { alterado: true } }, depois: { titulo: { alterado: true } } });
    expect(contemSentinela(JSON.stringify(alterados))).toBe(false);
  });

  it('sem mudança: o servidor responde "Nada foi alterado." sem campos, nada muda, e a tela mostra como alerta de envio', async () => {
    const id = await criarPelaTela(preenchidos({ contexto: 'Contexto fictício' }));
    const inicial = valoresDaDemanda(await obterDemanda(deps.db, id));
    const antes = await obterDemanda(deps.db, id);
    const eventosAntes = (await eventos(id)).length;
    const r = falhou(await alterarDadosNoPainel({ ...mudancasDaEdicao(inicial, { ...inicial, titulo: ` ${inicial.titulo} ` }).mudancas, id }));
    expect(r.campos ?? []).toEqual([]);
    expect(errosDaApi(r, { modo: 'manual', tamanhoTexto: 0, indicesAnexos: [] })).toEqual({ campos: [], porCampo: {}, alerta: 'Nada foi alterado.', detalhes: [] });
    expect((await obterDemanda(deps.db, id)).atualizadaEm).toEqual(antes.atualizadaEm);
    expect((await eventos(id)).length).toBe(eventosAntes);
  });

  it('a edição não muda o status: a chave status é descartada (só a T05 muda o status), com ou sem outra mudança', async () => {
    const id = await criarPelaTela(preenchidos());
    const soStatus = falhou(await alterarDadosNoPainel({ id, status: 'encerrada' }));
    expect(soStatus.mensagem).toBe('Nada foi alterado.');
    expect(await alterarDadosNoPainel({ id, status: 'aprovada', titulo: 'Título com status junto (fictício)' })).toEqual({ ok: true, dados: { id } });
    const d = await obterDemanda(deps.db, id);
    expect(d.status).toBe('nova');
    expect(d.titulo).toBe('Título com status junto (fictício)');
    expect((await eventos(id)).map((e) => e.acao)).not.toContain('status_alterado');
  });

  it('C-17: id fora do formato → entrada_invalida, sem efeito; id no formato que não existe → texto da 2.8', async () => {
    const antes = await estado();
    for (const id of ["DEM-1' or '1'='1", 'DEM-20261022-0001; drop table demanda', '', 'qualquer-coisa']) {
      expect(await alterarDadosNoPainel({ id, titulo: 'Título (fictício)' })).toMatchObject({ ok: false, erro: 'entrada_invalida' });
    }
    expect(await alterarDadosNoPainel({ titulo: 'Sem id (fictício)' })).toMatchObject({ ok: false, erro: 'entrada_invalida' });
    const r = falhou(await alterarDadosNoPainel({ id: 'DEM-20261022-9999', titulo: 'Título (fictício)' }));
    expect(r).toMatchObject({ erro: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO });
    expect(errosDaApi(r, { modo: 'manual', tamanhoTexto: 0, indicesAnexos: [] }).alerta).toBe(MENSAGEM_NAO_ENCONTRADO);
    expect(await estado()).toEqual(antes);
  });

  it('contrato com errosDaApi na edição: título vazio e link sem http(s) enviados direto voltam na linha da tela, e nada muda', async () => {
    const id = await criarPelaTela(preenchidos({ anexos: [anexo(1, 'https://exemplo.test/a')] }));
    const inicial = valoresDaDemanda(await obterDemanda(deps.db, id));
    const atual = { ...inicial, anexos: [anexo(1, ''), inicial.anexos[0]!, anexo(3, 'data:text/html,<b>x</b>')] };
    const { mudancas, indicesAnexos } = mudancasDaEdicao(inicial, atual);
    expect(indicesAnexos).toEqual([1, 2]);
    const r = falhou(await alterarDadosNoPainel({ ...mudancas, titulo: '   ', id }));
    const tela = errosDaApi(r, { modo: 'manual', tamanhoTexto: 0, indicesAnexos });
    expect(Object.fromEntries(tela.campos.map((c) => [c.campo, [c.rotulo, c.mensagem]]))).toEqual({
      titulo: ['Título', 'Informe o título.'],
      'anexos.2.referencia': ['Referência do anexo 3', 'Use um link que comece com http:// ou https://.'],
    });
    expect((await obterDemanda(deps.db, id)).anexos).toEqual([{ tipo: 'url', referencia: 'https://exemplo.test/a' }]);
  });

  it('a administradora também edita; sem sessão, nada muda', async () => {
    const id = await criarPelaTela(preenchidos());
    com(null);
    expect(await alterarDadosNoPainel({ id, titulo: 'Sem sessão (fictício)' })).toMatchObject({ ok: false, erro: 'nao_autenticado' });
    expect((await obterDemanda(deps.db, id)).titulo).toBe('Pedidos duplicados no ERP (fictício)');
    com(cookieAdm);
    expect(await alterarDadosNoPainel({ id, titulo: 'Pela administradora (fictício)' })).toEqual({ ok: true, dados: { id } });
  });
});

describe('C-21: o log das duas Server Actions', () => {
  it('uma linha por chamada, só com os campos da lista e a ação fixa; nenhum texto, nome, e-mail, telefone nem origem', async () => {
    const v = preenchidos({ solicitanteNome: SENTINELAS.nome, contexto: SENTINELAS.texto });
    const t = { texto: TEXTO, canal: 'email', referencia: SENTINELAS.email };
    const id = await criarPelaTela(v, t);
    await registrarEntradaNoPainel(entradaDoFormulario(preenchidos({ titulo: '' }), t, 'manual').entrada);
    await alterarDadosNoPainel({ id, contexto: `${SENTINELAS.telefone} ${SENTINELAS.texto}` });
    await alterarDadosNoPainel({ id: `DEM-${SENTINELAS.texto}`, titulo: SENTINELAS.nome });

    const linhas = linhasDoLog.map((l) => JSON.parse(l) as Record<string, unknown>).filter((l) => l.evento === 'acao_painel');
    expect(linhas.map((l) => [l.rota, l.codigoErro ?? null])).toEqual([
      ['registrar_entrada', null],
      ['registrar_entrada', 'entrada_invalida'],
      ['alterar_demanda', null],
      ['alterar_demanda', 'entrada_invalida'],
    ]);
    for (const l of linhas) {
      expect(Object.keys(l).filter((k) => !['level', 'time', 'msg', 'codigoErro'].includes(k)).sort()).toEqual(['atorTipo', 'evento', 'ms', 'rota']);
    }
    expect(linhasDoLog.some((l) => contemSentinela(l) || l.includes('MSG-FICTICIA'))).toBe(false);
  });
});
