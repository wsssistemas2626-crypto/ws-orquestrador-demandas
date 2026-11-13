// Regras de exibição da T05 Demanda (T10 do DEC-DEM-20261110-0015-v1; C11, ADR-17): a barra das cinco etapas (RF-08) e
// o cartão "Próxima ação" (RF-09), com as condições e a ordem do 01 e os textos de 03, 5.4 e 5.5. Funções puras, só com
// o que a página já leu: não habilitam, escondem nem decidem nada (CA-09.4), e só a página as chama. De src/modules/ só
// entram tipos, e nada de acesso, banco, deps ou Server Action (CV-09). A saída não leva nome de quem aprovou, documento
// assinado nem comentário da decisão: o detalhe da linha 8 cita só o papel (04, D8). Link só de constante de rota com id
// que casa a regex de hoje; id fora do formato não gera link (CV-19).
import type { AndamentoVista } from '../modules/andamento/schemas';
import type { DemandaVista, PacoteResumo } from '../modules/demandas/consultas';
import type { EventoVisivel } from '../modules/historico/consultas';
import type { Aprovador, PacoteDecisaoVista } from '../modules/pacotes-decisao/consultas';
import { RE_ID_DEC } from './dados-do-pacote';
import { agenteNaFrase, ARTEFATO_DO_AGENTE, NOME_AGENTE, ROTULO_PAPEL, ROTULO_STATUS } from './rotulos';

type OpcaoDecisao = Aprovador['opcao'];
type Status = DemandaVista['status'];

// D-11: cópia de RE_ID_DEMANDA (src/modules/demandas/gerar-id.ts), que aqui só entra por tipo; o teste confere que as
// duas não se afastam.
export const RE_ID_DEMANDA_NA_TELA = /^DEM-\d{8}-\d{4}$/;

export type DadosDasEtapas = {
  demanda: Pick<DemandaVista, 'id' | 'status' | 'especificacoes' | 'pareceresRisco' | 'pacotesDecisao' | 'agentesEmAndamento'>;
  espMaisNova: { id: string; duvidasEmAberto: readonly string[] } | null;
  // o DEC mais novo (d.pacotesDecisao[0]), lido pela página com ler_pacote_decisao; null sem DEC
  decMaisNovo: Pick<PacoteDecisaoVista, 'id' | 'statusDecisao' | 'desatualizado' | 'nivelAprovacaoRequerido' | 'aprovadores' | 'decisao'> | null;
  historico: readonly Pick<EventoVisivel, 'acao' | 'entidadeId'>[];
  temSecaoDeDuvidas: boolean;
  // 0.3.0 (T17; 03, 5.5; D-06): demanda do Awave sem `demanda_confirmada` e fora de status final, que a página tira de
  // estadoDaConfirmacao (dados-da-confirmacao.ts). Opcional: ausente vale como false, e a 0.2.0 não muda.
  aguardaConfirmacaoDoAwave?: boolean;
  // 0.4.0 (T13 do DEC-DEM-20261111-0017-v1; 03, 5.6; RF-07): o último andamento da demanda (d.andamento, já conferido por
  // lerAndamento), para a linha 15. Opcional: ausente vale como sem andamento, e as linhas de hoje não mudam.
  andamento?: Pick<AndamentoVista, 'decId' | 'statusConstrucao'> | null;
};
export type EstadoDaEtapa =
  | 'Registrada'
  | 'Por fazer'
  | 'Com dúvidas em aberto'
  | 'Feita'
  | 'Feito'
  | 'Pacote desatualizado'
  | '1 de 2 aprovações'
  | 'Decisão pendente'
  | `Aprovada, opção ${OpcaoDecisao}`
  | 'Devolvida'
  | 'Arquivada'
  | 'Gerado'
  | 'Ainda não gerado'
  | 'Depois da aprovação';
export type EtapaDaDemanda = { numero: 1 | 2 | 3 | 4 | 5; nome: string; idVersao: string | null; estado: EstadoDaEtapa; feita: boolean; atual: boolean };
export type DestinoDaAcao = { tipo: 'pagina'; href: string } | { tipo: 'secao'; secao: SecaoDaAcao };
// As seções da própria página que a Próxima ação aponta; a âncora de cada uma é ID_SECAO[secao] (detalhe.ts).
type SecaoDaAcao = 'duvidas' | 'status' | 'confirmacao';
export type ProximaAcao = { linha: number; oQueFalta: string; detalhe: string | null; quemAge: string; link: { rotulo: string; destino: DestinoDaAcao } | null };

type DecMaisNovo = NonNullable<DadosDasEtapas['decMaisNovo']>;
type Link = ProximaAcao['link'];

// Textos fixos da barra e do cartão (03, seção 9).
export const TEXTOS_ETAPAS = { barra: 'Etapas da demanda', semVersao: 'Nenhuma', titulo: 'Próxima ação', quemAge: 'Quem age:' } as const;

const UMA_PESSOA = 'Uma pessoa (CTO ou administradora)';
const DECIDIR = 'Decidir entre as opções A e B.';
const MUDAR_O_STATUS = 'Mudar o status';
const ABRIR_APROVADA = 'Abrir a decisão aprovada';

// --- leitura comum ---

// A ESP e o DEC mais novos têm de ser os da demanda (a página lê cada um pelo id de `d.especificacoes[0]` e de
// `d.pacotesDecisao[0]`). Dado incoerente vira erro e a tela de erro de hoje, em vez de um estado errado (02, seção 5).
function conferir(x: DadosDasEtapas): void {
  if ((x.demanda.especificacoes[0]?.id ?? null) !== (x.espMaisNova?.id ?? null)) throw new Error('etapas: ESP mais nova incoerente');
  if ((x.demanda.pacotesDecisao[0]?.id ?? null) !== (x.decMaisNovo?.id ?? null)) throw new Error('etapas: DEC mais novo incoerente');
}

const emStatusFinal = (s: Status): boolean => s === 'entregue' || s === 'encerrada';

// Aprovado vigente: o primeiro aprovado não substituído, do mais novo para o mais antigo.
const vigenteDe = (d: DadosDasEtapas['demanda']): PacoteResumo | null => d.pacotesDecisao.find((p) => p.statusDecisao === 'aprovada' && !p.substituido) ?? null;

const umaDeDuas = (dec: DecMaisNovo): boolean => dec.nivelAprovacaoRequerido === 'cto_e_administradora' && dec.aprovadores.length === 1;

// A opção aprovada: a da decisão, senão a da primeira aprovação. Sem nenhuma, erro: número errado não (02, seção 5).
function opcaoAprovada(dec: DecMaisNovo): OpcaoDecisao {
  const opcao = dec.decisao?.opcaoEscolhida ?? dec.aprovadores[0]?.opcao;
  if (!opcao) throw new Error('etapas: DEC aprovado sem opção');
  return opcao;
}

// --- RF-08: barra de etapas ---

function estadoDaDecisao(dec: DecMaisNovo): EstadoDaEtapa {
  switch (dec.statusDecisao) {
    case 'pendente':
      if (dec.desatualizado) return 'Pacote desatualizado';
      return umaDeDuas(dec) ? '1 de 2 aprovações' : 'Decisão pendente';
    case 'aprovada':
      return `Aprovada, opção ${opcaoAprovada(dec)}`;
    case 'devolvida':
      return 'Devolvida';
    case 'arquivada':
      return 'Arquivada';
    default: {
      const nunca: never = dec.statusDecisao;
      throw new Error(`etapas: decisão desconhecida ${String(nunca)}`);
    }
  }
}

type SemAtual = Omit<EtapaDaDemanda, 'atual'>;

export function etapasDaDemanda(x: DadosDasEtapas): EtapaDaDemanda[] {
  conferir(x);
  const d = x.demanda;
  const esp = x.espMaisNova;
  const rsk = d.pareceresRisco[0] ?? null;
  const dec = x.decMaisNovo;
  const vigente = vigenteDe(d);
  const gerado = vigente !== null && x.historico.some((e) => e.acao === 'pedido_gerado' && e.entidadeId === vigente.id);

  const etapas: SemAtual[] = [
    { numero: 1, nome: 'Demanda', idVersao: d.id, estado: 'Registrada', feita: true },
    esp === null
      ? { numero: 2, nome: 'Especificação', idVersao: null, estado: 'Por fazer', feita: false }
      : esp.duvidasEmAberto.length > 0
        ? { numero: 2, nome: 'Especificação', idVersao: esp.id, estado: 'Com dúvidas em aberto', feita: false }
        : { numero: 2, nome: 'Especificação', idVersao: esp.id, estado: 'Feita', feita: true },
    rsk === null
      ? { numero: 3, nome: 'Parecer de risco', idVersao: null, estado: 'Por fazer', feita: false }
      : { numero: 3, nome: 'Parecer de risco', idVersao: rsk.id, estado: 'Feito', feita: true },
    dec === null
      ? { numero: 4, nome: 'Decisão', idVersao: null, estado: 'Por fazer', feita: false }
      : { numero: 4, nome: 'Decisão', idVersao: dec.id, estado: estadoDaDecisao(dec), feita: dec.statusDecisao === 'aprovada' },
    gerado
      ? { numero: 5, nome: 'Pedido de Construção', idVersao: vigente.id, estado: 'Gerado', feita: true }
      : { numero: 5, nome: 'Pedido de Construção', idVersao: null, estado: vigente ? 'Ainda não gerado' : 'Depois da aprovação', feita: false },
  ];
  // Atual: a primeira de 2 a 5 não feita; nenhuma em status final.
  const atual = emStatusFinal(d.status) ? null : (etapas.find((e) => e.numero > 1 && !e.feita)?.numero ?? null);
  return etapas.map((e) => ({ ...e, atual: e.numero === atual }));
}

// --- RF-09: Próxima ação ---

const acao = (linha: number, oQueFalta: string, quemAge: string, link: Link = null, detalhe: string | null = null): ProximaAcao => ({
  linha,
  oQueFalta,
  detalhe,
  quemAge,
  link,
});

const secao = (rotulo: string, s: SecaoDaAcao): Link => ({ rotulo, destino: { tipo: 'secao', secao: s } });

// Páginas da demanda (T07, T08, T09) e do DEC (T11): constante de rota mais id que casa a regex; senão, sem link.
const paraDemanda = (id: string, caminho: 'especificacoes/nova' | 'pareceres-risco/novo' | 'pacotes-decisao/novo', rotulo: string): Link =>
  RE_ID_DEMANDA_NA_TELA.test(id) ? { rotulo, destino: { tipo: 'pagina', href: `/demandas/${id}/${caminho}` } } : null;
const paraDec = (id: string, rotulo: string): Link => (RE_ID_DEC.test(id) ? { rotulo, destino: { tipo: 'pagina', href: `/pacotes-decisao/${id}` } } : null);

// Linha 8: quem age pelo nível e pelas aprovações; o detalhe só com o papel de quem já aprovou (04, D8).
function linhaDaDecisao(dec: DecMaisNovo): ProximaAcao {
  const link = paraDec(dec.id, 'Abrir a decisão');
  if (dec.nivelAprovacaoRequerido === 'cto') return acao(8, DECIDIR, ROTULO_PAPEL.cto, link);
  const [unica] = dec.aprovadores;
  if (!unica || !umaDeDuas(dec)) return acao(8, DECIDIR, 'CTO e administradora', link);
  return unica.papel === 'cto'
    ? acao(8, DECIDIR, ROTULO_PAPEL.administradora, link, `O CTO já aprovou a opção ${unica.opcao}. Falta a aprovação da administradora, com o identificador do documento assinado.`)
    : acao(8, DECIDIR, ROTULO_PAPEL.cto, link, `A administradora já aprovou a opção ${unica.opcao}. Falta a aprovação do CTO.`);
}

// Linhas 9 a 13, pelo status (as linhas 9 e 10 apontam o aprovado vigente). 0.4.0: a linha 15, dentro de Em construção.
function linhaDoStatus(status: Status, vigente: PacoteResumo | null, andamento: DadosDasEtapas['andamento']): ProximaAcao {
  switch (status) {
    case 'pronta_para_decisao':
      if (vigente) return acao(9, 'Mudar o status para Aprovada e gerar o Pedido de Construção.', UMA_PESSOA, paraDec(vigente.id, ABRIR_APROVADA));
      return acao(13, 'Acompanhar a demanda.', 'Sem responsável definido');
    case 'aprovada':
      return acao(
        10,
        'Gerar o Pedido de Construção e, quando a construção começar, mudar o status para Em construção.',
        UMA_PESSOA,
        vigente ? paraDec(vigente.id, ABRIR_APROVADA) : null,
      );
    case 'em_construcao':
      // 0.4.0 (RF-07; 03, 5.6): o número 15 é só identificador. Só com o andamento do DEC vigente em `construido`.
      if (andamento?.statusConstrucao === 'construido' && vigente !== null && andamento.decId === vigente.id)
        return acao(15, 'Construção concluída: confira e marque como Entregue.', UMA_PESSOA, secao(MUDAR_O_STATUS, 'status'), 'O /construir não marca Entregue: quem confere a entrega é uma pessoa.');
      return acao(11, 'Acompanhar a construção. Quando terminar, mudar o status para Entregue ou Devolvida pela construção.', UMA_PESSOA, secao(MUDAR_O_STATUS, 'status'));
    case 'devolvida':
      return acao(12, 'Ler o motivo da devolução no histórico e voltar a demanda para Em construção ou Em análise.', UMA_PESSOA, secao(MUDAR_O_STATUS, 'status'));
    case 'nova':
    case 'em_analise':
    case 'aguardando_informacao':
    case 'entregue':
    case 'encerrada':
      return acao(13, 'Acompanhar a demanda.', 'Sem responsável definido');
    default: {
      const nunca: never = status;
      throw new Error(`etapas: status desconhecido ${String(nunca)}`);
    }
  }
}

// As 13 linhas da spec (4.4), nessa ordem; vale a primeira que casar. 0.3.0 (03, 5.5): a linha 14, a confirmação da
// demanda do Awave, entra depois da 2 e antes da 3; o número 14 é só identificador, para não renumerar as de 0.2.0.
export function proximaAcao(x: DadosDasEtapas): ProximaAcao {
  conferir(x);
  const d = x.demanda;
  const dec = x.decMaisNovo;
  if (emStatusFinal(d.status)) return acao(1, `Nada. A demanda está em ${ROTULO_STATUS[d.status]}.`, 'Ninguém');
  const agente = d.agentesEmAndamento[0];
  if (agente) return acao(2, `Esperar o ${agenteNaFrase(agente.agente)} terminar ${ARTEFATO_DO_AGENTE[agente.agente]}.`, NOME_AGENTE[agente.agente]);
  if (x.aguardaConfirmacaoDoAwave === true)
    return acao(
      14,
      'Confirmar a demanda aberta pelo Awave.',
      UMA_PESSOA,
      secao('Ir para a confirmação', 'confirmacao'),
      'Até a confirmação, nenhum agente de IA trabalha nela.',
    );
  if (d.status === 'aguardando_informacao')
    return acao(
      3,
      'Responder às dúvidas em aberto e voltar a demanda para Em análise.',
      UMA_PESSOA,
      x.temSecaoDeDuvidas ? secao('Ver as dúvidas em aberto', 'duvidas') : secao(MUDAR_O_STATUS, 'status'),
    );
  if (d.especificacoes.length === 0)
    return acao(4, 'Escrever a especificação técnica.', 'Agente de insumo técnico ou uma pessoa', paraDemanda(d.id, 'especificacoes/nova', 'Escrever a especificação'));
  if (d.pareceresRisco.length === 0)
    return acao(5, 'Escrever o parecer de risco.', 'Agente de risco ou uma pessoa', paraDemanda(d.id, 'pareceres-risco/novo', 'Escrever o parecer de risco'));
  if (dec === null || dec.statusDecisao === 'devolvida')
    return acao(6, 'Montar o pacote de decisão.', 'Agente de consolidação ou uma pessoa', paraDemanda(d.id, 'pacotes-decisao/novo', 'Montar o pacote de decisão'));
  if (dec.statusDecisao === 'pendente' && dec.desatualizado)
    return acao(7, 'Montar um pacote novo. O pacote atual está desatualizado.', UMA_PESSOA, paraDemanda(d.id, 'pacotes-decisao/novo', 'Montar um pacote novo'));
  if (dec.statusDecisao === 'pendente') return linhaDaDecisao(dec);
  return linhaDoStatus(d.status, vigenteDe(d), x.andamento ?? null);
}
