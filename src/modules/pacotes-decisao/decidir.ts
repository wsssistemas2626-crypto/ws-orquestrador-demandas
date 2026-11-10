// Decisão do pacote (RF-13) e dupla aprovação (RF-14). Só pessoa decide: agente e sistema recebem 403 de `autorizar`,
// também quando o worker chama a função direto (C-12). Numa transação, nesta ordem:
//   1. autorizar;
//   2. o DEC e a trava da demanda, que põe em fila a decisão e a gravação de ESP ou RSK nova (C-13); demanda em status
//      final → 409, antes de toda outra conferência (M-08);
//   3. já decidido → 409 (CA-11.3);
//   4. não é o DEC mais novo da demanda → 409, em qualquer decisão (08-correcao, A-01): decidir um DEC antigo encerrava
//      a demanda por cima do mais novo;
//   5. desatualizado, relido sob a trava → 409 só para aprovar (CA-12.2, CA-12.3);
//   6. rascunho de agente citado sem a confirmação de revisão → 400 (CA-13.4);
//   7. devolvida ou arquivada: grava a decisão, e a demanda muda pelo ator sistema (RF-07);
//   8. aprovada: o papel é o da conta (C-11, P1-a); nível cto só por conta cto (P1-b), e só se o aprovado vigente da
//      demanda não exigiu a administradora → 409, antes de gravar (S-01 da 04-revisao do 0014); nível
//      cto_e_administradora com as duas aprovações, a mesma opção e a referência ao documento assinado da
//      administradora. A aprovação não muda o status da demanda (P1-d).
// A aprovação completa do DEC mais novo substitui o aprovado anterior da demanda (0.1.13, opção b do E5 do 0013, no
// lugar da recusa do A-02): o anterior fica `substituido` na leitura (substituido.ts), o histórico grava a substituição
// com os dois ids, e só o aprovado mais novo gera o Pedido de Construção (gerar.ts).
// A autoria (quem, com que nome e em nome de quem) vem só do ator da sessão; o corpo não tem esses campos (C-11). O
// histórico leva papel, opção e a referência ao documento, nunca o comentário (C-30). Aceita a transação de quem chama
// (G3.8).
import { eq, max } from 'drizzle-orm';
import { aprovacao, decisao, pacoteDecisao } from '../../db/schema';
import type { OpcaoDecisao, PapelAprovacao, StatusDecisaoGravado } from '../../db/schema/decisao';
import { comTransacao, type Transacao } from '../../db/transacao';
import { ErroDominio, MENSAGEM_NAO_ENCONTRADO, type CampoInvalido } from '../../lib/erros';
import type { Ator, AtorPessoa } from '../acesso/ator';
import { autorizar } from '../acesso/matriz';
import { MENSAGENS_ACESSO } from '../acesso/mensagens';
import type { DepsDemanda } from '../demandas/servico';
import { ehStatusFinal, mudarStatusPeloSistema } from '../demandas/transicoes';
import { registrarEvento } from '../historico/registrar';
import { travarDemanda } from '../versoes';
import { obterPacoteDecisao, type PacoteDecisaoVista } from './consultas';
import type { RegistrarDecisao } from './schemas';
import { aprovadoMaisNovo, aprovadoVigente } from './substituido';

// P1-a: só a própria administradora, com conta e 2FA, registra a aprovação de papel `administradora`. Trocar para
// 'cto_com_referencia' deixa o CTO registrar em nome dela, com a referência ao documento assinado.
export type ModoAprovacaoAdministradora = 'somente_propria' | 'cto_com_referencia';
export const MODO_APROVACAO_ADMINISTRADORA: ModoAprovacaoAdministradora = 'somente_propria';

export type ResultadoDecisao = 'aprovada' | 'aprovacao_parcial' | 'devolvida' | 'arquivada';

// Textos da 03 (T11). Os de 409 começam em minúscula: a tela acrescenta "Não foi possível concluir: ".
export const MENSAGENS_DECISAO = {
  jaDecidido: 'este pacote já tem decisão registrada.',
  desatualizado: 'o pacote está desatualizado e não pode ser aprovado.',
  naoEhOMaisNovo: 'a demanda tem um pacote mais novo; só o mais novo pode ser decidido.',
  // M-08: texto decidido na 02-triagem do DEC-DEM-20261103-0007-v1, para revisão da ux-ui-design.
  demandaFinal: 'a demanda está em status final; o pacote não pode mais ser decidido.',
  // S-01 da 04-revisao do DEC-DEM-20261104-0014-v1: texto fixo, sem id nem nome, para revisão da ux-ui-design.
  nivelMenorQueOVigente:
    'o pacote aprovado em vigor nesta demanda exigiu a aprovação do CTO e da administradora; um pacote só do CTO não pode substituí-lo. Crie um pacote novo com aprovação do CTO e da administradora.',
  revisarRascunhos: 'Marque que revisou os rascunhos de agente para registrar a decisão.',
  semReferencia: 'Informe o identificador do documento assinado.',
  semDataDocumento: 'Informe a data da assinatura.',
  // Cita o papel que aprovou primeiro (CA-14.4).
  opcaoDiferente: {
    cto: 'a opção precisa ser a mesma aprovada pelo CTO.',
    administradora: 'a opção precisa ser a mesma aprovada pela administradora.',
  },
  aprovacaoJaRegistrada: {
    cto: 'a aprovação do CTO já está registrada.',
    administradora: 'a aprovação da administradora já está registrada.',
  },
} as const;

export const MENSAGEM_CORRIJA_OS_CAMPOS = 'Corrija os campos abaixo para continuar.';

const semPermissao = () => new ErroDominio('sem_permissao', MENSAGENS_ACESSO.sem_permissao);
const conflito = (mensagem: string) => new ErroDominio('conflito', mensagem);
const camposInvalidos = (campos: CampoInvalido[]) => new ErroDominio('entrada_invalida', MENSAGEM_CORRIJA_OS_CAMPOS, { campos });

// Texto opcional que, aparado pelo Zod, ficou vazio não é gravado.
const textoOuNulo = (v: string | undefined): string | null => (v !== undefined && v !== '' ? v : null);

type Aprovar = Extract<RegistrarDecisao, { statusDecisao: 'aprovada' }>;

// Em nome de quem a aprovação é registrada (C-11, C-12, P1-a). Sem `registrarComo`, ou com o próprio papel, é o papel
// da conta. Pedir outro papel só passa no modo `cto_com_referencia`, e só para a conta cto.
export function papelDaAprovacao(
  ator: AtorPessoa,
  entrada: RegistrarDecisao,
  modo: ModoAprovacaoAdministradora = MODO_APROVACAO_ADMINISTRADORA,
): PapelAprovacao {
  const pedido = entrada.statusDecisao === 'aprovada' ? entrada.registrarComo : undefined;
  if (pedido === undefined || pedido === ator.papel) return ator.papel;
  if (modo === 'cto_com_referencia' && ator.papel === 'cto') return pedido;
  throw semPermissao();
}

// Lidos sob a trava da demanda: nenhum DEC novo nem decisão de outro DEC entra até o fim da transação (C-13).
async function versaoMaisNova(tx: Transacao['tx'], demandaId: string): Promise<number> {
  const [linha] = await tx.select({ v: max(pacoteDecisao.versao) }).from(pacoteDecisao).where(eq(pacoteDecisao.demandaId, demandaId));
  return linha?.v ?? 0;
}

type Contexto = { tr: Transacao; deps: DepsDemanda; pessoa: AtorPessoa; pacote: PacoteDecisaoVista; entrada: RegistrarDecisao };

async function gravarDecisao(c: Contexto, statusDecisao: StatusDecisaoGravado, opcao: OpcaoDecisao | null, comentarios: string | null): Promise<void> {
  const { tx } = c.tr;
  await tx.insert(decisao).values({
    pacoteDecisaoId: c.pacote.id,
    statusDecisao,
    opcaoEscolhida: opcao,
    comentarios,
    decididaPor: c.pessoa.usuarioId,
    // = dataAprovacao quando aprovada.
    decididaEm: c.deps.relogio.agora(),
  });
  await registrarEvento(
    tx,
    {
      ator: c.pessoa,
      demandaId: c.pacote.demandaId,
      entidade: 'pacote_decisao',
      entidadeId: c.pacote.id,
      acao: 'decisao_registrada',
      depois: { statusDecisao, ...(opcao ? { opcaoEscolhida: opcao } : {}) },
    },
    c.deps.relogio,
  );
}

async function gravarAprovacao(c: Contexto, entrada: Aprovar, papel: PapelAprovacao): Promise<void> {
  const { tx } = c.tr;
  // A referência ao documento só vale na aprovação da administradora; na do CTO, é descartada.
  const documento =
    papel === 'administradora' ? { referenciaDocumento: entrada.referenciaDocumento ?? null, dataDocumento: entrada.dataDocumento ?? null } : null;
  // Campo a campo, e não `...entrada`: nome, conta e papel vêm do ator (C-11).
  await tx.insert(aprovacao).values({
    pacoteDecisaoId: c.pacote.id,
    papelAprovacao: papel,
    nomeAprovador: c.pessoa.nome,
    registradaPor: c.pessoa.usuarioId,
    opcao: entrada.opcaoEscolhida,
    comentario: textoOuNulo(entrada.comentarios),
    referenciaDocumento: documento?.referenciaDocumento ?? null,
    dataDocumento: documento?.dataDocumento ?? null,
    revisouRascunhos: entrada.revisouRascunhosDeAgente === true,
    registradaEm: c.deps.relogio.agora(),
  });
  await registrarEvento(
    tx,
    {
      ator: c.pessoa,
      demandaId: c.pacote.demandaId,
      entidade: 'pacote_decisao',
      entidadeId: c.pacote.id,
      acao: 'aprovacao_registrada',
      depois: { papel, opcao: entrada.opcaoEscolhida, ...(documento ?? {}) },
    },
    c.deps.relogio,
  );
}

// A decisão `aprovada`, nos dois níveis, e a substituição do aprovado anterior (0.1.13). O anterior é lido sob a trava e
// antes do insert em `decisao`: depois dele, o aprovado mais novo seria o próprio DEC. O evento leva só os dois ids (C-30)
// e vem depois de `aprovacao_registrada` e `decisao_registrada`. A aprovação parcial não passa por aqui.
async function fecharAprovacao(c: Contexto, opcao: OpcaoDecisao, comentarios: string | null): Promise<ResultadoDecisao> {
  const anterior = await aprovadoMaisNovo(c.tr.tx, c.pacote.demandaId);
  await gravarDecisao(c, 'aprovada', opcao, comentarios);
  if (anterior !== null) {
    await registrarEvento(
      c.tr.tx,
      {
        ator: c.pessoa,
        demandaId: c.pacote.demandaId,
        entidade: 'pacote_decisao',
        entidadeId: anterior,
        acao: 'pacote_decisao_substituido',
        depois: { substituido: anterior, substituidoPor: c.pacote.id },
      },
      c.deps.relogio,
    );
  }
  return 'aprovada';
}

async function aprovar(c: Contexto, entrada: Aprovar): Promise<ResultadoDecisao> {
  const papel = papelDaAprovacao(c.pessoa, entrada);
  const comentarios = textoOuNulo(entrada.comentarios);

  if (c.pacote.nivelAprovacaoRequerido === 'cto') {
    // P1-b: DEC de nível cto só é aprovado pela conta cto.
    if (papel !== 'cto') throw semPermissao();
    // S-01 (04-revisao do 0014): o DEC só do CTO não substitui um aprovado que exigiu a administradora. Lido sob a trava
    // e antes de gravar: a recusa não deixa aprovação, decisão nem evento. O nível do DEC vem de quem o criou
    // (criar.ts), por isso a guarda fica aqui, na aprovação que substituiria.
    const vigente = await aprovadoVigente(c.tr.tx, c.pacote.demandaId);
    if (vigente?.nivel === 'cto_e_administradora') throw conflito(MENSAGENS_DECISAO.nivelMenorQueOVigente);
    await gravarAprovacao(c, entrada, papel);
    return fecharAprovacao(c, entrada.opcaoEscolhida, comentarios);
  }

  // cto_e_administradora (RF-14).
  if (papel === 'administradora') {
    const faltando: CampoInvalido[] = [
      ...(entrada.referenciaDocumento === undefined ? [{ campo: 'referenciaDocumento', mensagem: MENSAGENS_DECISAO.semReferencia }] : []),
      ...(entrada.dataDocumento === undefined ? [{ campo: 'dataDocumento', mensagem: MENSAGENS_DECISAO.semDataDocumento }] : []),
    ];
    if (faltando.length > 0) throw camposInvalidos(faltando);
  }
  if (c.pacote.aprovadores.some((a) => a.papel === papel)) throw conflito(MENSAGENS_DECISAO.aprovacaoJaRegistrada[papel]);
  const anterior = c.pacote.aprovadores.find((a) => a.papel !== papel);
  if (anterior && anterior.opcao !== entrada.opcaoEscolhida) throw conflito(MENSAGENS_DECISAO.opcaoDiferente[anterior.papel]);

  await gravarAprovacao(c, entrada, papel);
  if (!anterior) return 'aprovacao_parcial';
  return fecharAprovacao(c, entrada.opcaoEscolhida, comentarios);
}

export async function registrarDecisao(
  deps: DepsDemanda,
  ator: Ator,
  decId: string,
  entrada: RegistrarDecisao,
  t?: Transacao,
): Promise<{ pacote: PacoteDecisaoVista; resultado: ResultadoDecisao }> {
  autorizar(ator, 'registrar_decisao');
  // autorizar já negou agente e sistema; isto só estreita o tipo.
  if (ator.tipo !== 'pessoa') throw semPermissao();
  const pessoa = ator;

  const corpo = async (tr: Transacao): Promise<ResultadoDecisao> => {
    const { tx } = tr;
    const [alvo] = await tx.select({ demandaId: pacoteDecisao.demandaId }).from(pacoteDecisao).where(eq(pacoteDecisao.id, decId));
    if (!alvo) throw new ErroDominio('nao_encontrado', MENSAGEM_NAO_ENCONTRADO);
    const demandaTravada = await travarDemanda(tx, alvo.demandaId);
    // M-08: demanda em status final (fonte única: ehStatusFinal) não tem mais decisão, nem para DEC já decidido. Sob a
    // trava e antes de ler o DEC: uma demanda encerrada ao mesmo tempo espera esta transação ou é vista já final.
    if (ehStatusFinal(demandaTravada.status)) throw conflito(MENSAGENS_DECISAO.demandaFinal);
    // Lido depois da trava: enxerga a ESP ou o RSK que outra transação tenha gravado antes dela, e as aprovações e a
    // decisão de quem decidiu ao mesmo tempo (C-13, CA-11.3).
    const pacote = await obterPacoteDecisao(tx, decId);
    const c: Contexto = { tr, deps, pessoa, pacote, entrada };

    if (pacote.decisao) throw conflito(MENSAGENS_DECISAO.jaDecidido);
    if (pacote.versao < (await versaoMaisNova(tx, pacote.demandaId))) throw conflito(MENSAGENS_DECISAO.naoEhOMaisNovo);
    if (entrada.statusDecisao === 'aprovada' && pacote.desatualizado) throw conflito(MENSAGENS_DECISAO.desatualizado);
    if (pacote.rascunhosCitados.length > 0 && entrada.revisouRascunhosDeAgente !== true) {
      throw camposInvalidos([{ campo: 'revisouRascunhosDeAgente', mensagem: MENSAGENS_DECISAO.revisarRascunhos }]);
    }

    if (entrada.statusDecisao === 'aprovada') return aprovar(c, entrada);

    await gravarDecisao(c, entrada.statusDecisao, null, textoOuNulo(entrada.comentarios));
    await mudarStatusPeloSistema(tr, deps, pacote.demandaId, entrada.statusDecisao === 'devolvida' ? 'decisao_devolvida' : 'decisao_arquivada');
    return entrada.statusDecisao;
  };

  const resultado = t ? await corpo(t) : await comTransacao(deps.pool, corpo);
  return { pacote: await obterPacoteDecisao(t?.tx ?? deps.db, decId), resultado };
}
