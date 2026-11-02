// Regra da T12 Agentes e teto de gasto no painel (03, T12; RF-17 a RF-19; 04, C-12, C-26 e C-31; RNF-05; P1-f), sem
// tela: os textos da 03 e os que a T45 escreveu no estilo da 2.8 (worker e expurgo, que a 03 não previu), a linha do
// gasto do mês, o alerta do teto (um por vez), o valor do campo, a validação que espelha a do servidor, o diálogo de cada
// agente, a última mudança, o último expurgo, os alertas do worker e o que a tela mostra quando a Server Action recusa.
// Vai ao navegador: dos módulos vêm só tipos, e as mensagens que o servidor também usa são cópia das de teto.ts e
// configuracao.ts (o teste confere). Quem decide é o servidor: a validação daqui é só conveniência.
import type { ResultadoAcao } from '../lib/acao-painel';
import { MENSAGEM_ERRO_INTERNO } from '../lib/erros';
import { formatarData, formatarDataHora } from '../lib/fuso';
import type { Agente } from '../modules/acesso/ator';
import type { ConfiguracaoAgente } from '../modules/agentes/configuracao';
import type { SituacaoWorker } from '../modules/agentes/situacao-worker';
import type { SituacaoTeto } from '../modules/agentes/teto';
import type { TipoAlerta } from './Alerta';
import { errosDoResultado, idDoCampo, type ErrosDoFormulario } from './formulario';
import { formatarDinheiro, NOME_AGENTE, ROTULO_AGENTE } from './rotulos';

// MENSAGENS_TETO de agentes/teto.ts.
export const MENSAGENS_TETO_DO_SERVIDOR = {
  formato: 'Informe o teto com até duas casas decimais, por exemplo 10,00.',
  negativo: 'O teto não pode ser negativo.',
} as const;

export const TEXTOS_AGENTES = {
  tituloAba: 'Agentes e teto de gasto',
  titulo: 'Agentes e teto de gasto',
  introducao:
    'Agente ligado prepara rascunhos por IA, dentro do teto mensal. Desligado, você preenche os mesmos campos à mão. Nenhum agente decide nem envia nada para fora.',
  somenteCto: 'Só o CTO altera esta configuração.',
  tetoNaoDefinido: 'Teto não definido: com US$ 0,00, nenhum agente chama o provedor, mesmo ligado. Defina o teto para usar os agentes.',
  gastoDoMes: 'Gasto do mês',
  rotuloTeto: 'Teto mensal de gasto (US$)',
  dicaTeto: 'Valor na moeda da cobrança do provedor de IA. O gasto conta do dia 1 ao último dia do mês.',
  salvarTeto: 'Salvar teto',
  salvando: 'Salvando…',
  tetoSalvo: (v: number) => `Teto salvo: ${formatarDinheiro(v)}.`,
  agentes: 'Agentes',
  legendaTabela: 'Agentes de IA',
  colunas: ['Agente', 'Situação', 'Última mudança'],
  nuncaAlterado: 'Nunca alterado',
  ligarAgente: 'Ligar agente',
  cancelar: 'Cancelar',
  // Escritos na T45, no estilo da 2.8 (plano, T45): a 03 não os previu.
  workerSemSinal: 'O worker não dá sinal há mais de 5 minutos.',
  workerDuplicado: 'Há duas instâncias do worker rodando. Deixe só uma: com duas, o teto pode ser ultrapassado.',
  expurgoNaoRodou: 'O expurgo ainda não rodou.',
  ultimoExpurgo: 'Último expurgo do texto recebido: ',
} as const;

// O nome do agente no meio da frase ("o agente de risco"), como a 03 escreve.
const nomeNaFrase = (a: Agente): string => NOME_AGENTE[a].charAt(0).toLowerCase() + NOME_AGENTE[a].slice(1);

// 03, T12: o gatilho de cada agente no texto do diálogo.
const GATILHO: Readonly<Record<Agente, string>> = {
  orquestrador: 'a cada texto enviado na Nova demanda',
  insumo_tecnico: 'a cada demanda criada',
  risco: 'a cada especificação técnica sem dúvida gravada',
  consolidacao: 'a cada parecer de risco gravado com especificação',
};

// mensagemNaoLigou de agentes/configuracao.ts.
export const mensagemNaoLigou = (a: Agente): string => `Não foi possível ligar o ${nomeNaFrase(a)}. Ele continua desligado.`;
export const tituloDoDialogo = (a: Agente): string => `Ligar o ${nomeNaFrase(a)}?`;
export const textoDoDialogo = (a: Agente): string =>
  `Ele passa a chamar o provedor de IA ${GATILHO[a]}, dentro do teto mensal. O resultado é sempre um rascunho que uma pessoa revisa.`;
export const avisoDeAlternancia = (a: Agente, ligado: boolean): string => `${NOME_AGENTE[a]} ${ligado ? 'ligado' : 'desligado'}.`;

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'] as const;

// 'AAAA-MM' (o mês civil de São Paulo de situacaoDoTeto) → "Outubro de 2026".
export function mesPorExtenso(mesReferencia: string): string {
  const [ano, mes] = mesReferencia.split('-');
  return `${MESES[Number(mes) - 1] ?? mes} de ${ano}`;
}

type Gasto = Pick<SituacaoTeto, 'tetoMensal' | 'gastoDoMes' | 'percentual' | 'mesReferencia'>;

// 03, T12: "<Mês de ano>: US$ 3,20 de US$ 10,00 (32 %)"; sem gasto, "… US$ 0,00 de US$ <teto>. Nenhuma chamada este mês.".
// Com teto 0 não há proporção: sem a porcentagem.
export function linhaDoGasto(s: Gasto): string {
  const base = `${mesPorExtenso(s.mesReferencia)}: ${formatarDinheiro(s.gastoDoMes)} de ${formatarDinheiro(s.tetoMensal)}`;
  if (s.gastoDoMes === 0) return `${base}. Nenhuma chamada este mês.`;
  return s.tetoMensal > 0 ? `${base} (${s.percentual} %)` : base;
}

export type AlertaDaTela = { tipo: TipoAlerta; texto: string };

// 03, T12, "um por vez": teto 0 (atenção) antes da suspensão por gasto (erro). Sem os dois, nenhum.
export function alertaDoTeto(s: Pick<SituacaoTeto, 'tetoMensal' | 'gastoDoMes' | 'suspenso' | 'viraEm'>): AlertaDaTela | null {
  if (s.tetoMensal === 0) return { tipo: 'atencao', texto: TEXTOS_AGENTES.tetoNaoDefinido };
  if (!s.suspenso) return null;
  return {
    tipo: 'erro',
    texto: `Agentes suspensos: o gasto do mês (${formatarDinheiro(s.gastoDoMes)}) atingiu o teto (${formatarDinheiro(s.tetoMensal)}). Nada é chamado até o teto subir ou o mês virar em ${formatarData(s.viraEm)}.`,
  };
}

// O texto do campo: vírgula e duas casas, sem ponto de milhar, que o servidor não aceita.
export const valorDoTeto = (v: number): string => v.toFixed(2).replace('.', ',');

export const ID_CAMPO_TETO = idDoCampo('tetoMensal');
const ROTULOS_TETO: Readonly<Record<string, string>> = { tetoMensal: TEXTOS_AGENTES.rotuloTeto };

// A mesma regra de definirTetoSchema (teto.ts): até 10 dígitos e 2 casas, com vírgula ou ponto, depois de tirar os
// espaços das pontas. Devolve a mensagem do erro, ou null.
const RE_TETO = /^\d{1,10}([.,]\d{1,2})?$/;
export function validarTeto(valor: string): string | null {
  const v = valor.trim();
  if (RE_TETO.test(v)) return null;
  return v.startsWith('-') && RE_TETO.test(v.slice(1).trim()) ? MENSAGENS_TETO_DO_SERVIDOR.negativo : MENSAGENS_TETO_DO_SERVIDOR.formato;
}

// O erro do navegador no mesmo formato do erro do servidor: Resumo de erros e a linha abaixo do campo (03, 2.5).
export function errosLocaisDoTeto(mensagem: string): ErrosDoFormulario {
  return {
    campos: [{ campo: 'tetoMensal', idCampo: ID_CAMPO_TETO, rotulo: TEXTOS_AGENTES.rotuloTeto, mensagem }],
    porCampo: { tetoMensal: mensagem },
    alerta: null,
    detalhes: [],
  };
}

export const errosDoTeto = (r: ResultadoAcao<unknown>): ErrosDoFormulario => errosDoResultado(r, ROTULOS_TETO);

// Falha ao alternar (03, T12): ligar com 409 tem a frase própria; o resto, os textos da 2.8 (403 e erro do servidor),
// nunca a mensagem crua.
export function erroDeAlternar(a: Agente, ligando: boolean, r: Extract<ResultadoAcao<unknown>, { ok: false }>): string {
  if (ligando && r.erro === 'conflito') return mensagemNaoLigou(a);
  return errosDoResultado(r).alerta ?? MENSAGEM_ERRO_INTERNO;
}

export type MomentoNaTela = { iso: string; quando: string };
const momento = (d: Date): MomentoNaTela => ({ iso: d.toISOString(), quando: formatarDataHora(d) });

export type LinhaAgente = {
  agente: Agente;
  rotulo: string;
  ligado: boolean;
  // null: "Nunca alterado". `quem` nulo só se a conta que alterou não existir mais (o app não apaga conta).
  ultimaMudanca: ({ quem: string | null } & MomentoNaTela) | null;
};

export function linhasDosAgentes(lista: ReadonlyArray<Pick<ConfiguracaoAgente, 'agente' | 'ligado' | 'atualizadoEm' | 'atualizadoPor'>>): LinhaAgente[] {
  return lista.map((c) => ({
    agente: c.agente,
    rotulo: ROTULO_AGENTE[c.agente],
    ligado: c.ligado,
    ultimaMudanca: c.atualizadoEm ? { quem: c.atualizadoPor?.nome ?? null, ...momento(c.atualizadoEm) } : null,
  }));
}

// C-31: "Último expurgo do texto recebido: <data>." ou "O expurgo ainda não rodou.".
export function textoDoExpurgo(u: { em: Date; quantidade: number } | null): { texto: string; data: MomentoNaTela | null } {
  return u ? { texto: TEXTOS_AGENTES.ultimoExpurgo, data: momento(u.em) } : { texto: TEXTOS_AGENTES.expurgoNaoRodou, data: null };
}

// RNF-05: o worker sem sinal (atenção) e duas instâncias, que podem passar do teto (erro).
export function alertasDoWorker(s: SituacaoWorker): AlertaDaTela[] {
  const alertas: AlertaDaTela[] = [];
  if (s.atrasado) alertas.push({ tipo: 'atencao', texto: TEXTOS_AGENTES.workerSemSinal });
  if (s.duasInstancias) alertas.push({ tipo: 'erro', texto: TEXTOS_AGENTES.workerDuplicado });
  return alertas;
}
