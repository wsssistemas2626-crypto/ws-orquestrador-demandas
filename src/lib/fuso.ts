// Datas civis no fuso America/Sao_Paulo (RNF-15, CA-04.1): id da demanda, mês do teto de gasto e textos do painel.
const FUSO = 'America/Sao_Paulo';

const formatador = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSO,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZoneName: 'longOffset',
});

type Partes = { ano: string; mes: string; dia: string; hora: string; minuto: string; offset: string };

function partes(d: Date): Partes {
  const p: Record<string, string> = {};
  for (const x of formatador.formatToParts(d)) p[x.type] = x.value;
  // 'GMT-03:00' → '-03:00'; 'GMT' (deslocamento zero) → '+00:00'
  const offset = (p.timeZoneName ?? 'GMT').replace('GMT', '') || '+00:00';
  return {
    ano: p.year ?? '',
    mes: p.month ?? '',
    dia: p.day ?? '',
    hora: p.hour ?? '',
    minuto: p.minute ?? '',
    offset,
  };
}

const doisDigitos = (n: number) => String(n).padStart(2, '0');

// Meia-noite local do dia 1º de `mes`/`ano`. O deslocamento é o do próprio dia alvo (lido ao meio-dia UTC dele),
// e não o da data de referência, para não errar se o fuso voltar a ter horário de verão.
function primeiroDiaMeiaNoite(ano: number, mes: number): Date {
  const data = `${ano}-${doisDigitos(mes)}-01`;
  const { offset } = partes(new Date(`${data}T12:00:00Z`));
  return new Date(`${data}T00:00:00${offset}`);
}

export function aaaammddSaoPaulo(d: Date): string {
  const p = partes(d);
  return `${p.ano}${p.mes}${p.dia}`;
}

export function dataIsoSaoPaulo(d: Date): string {
  const p = partes(d);
  return `${p.ano}-${p.mes}-${p.dia}`;
}

export function inicioDoMesSaoPaulo(d: Date): Date {
  const p = partes(d);
  return primeiroDiaMeiaNoite(Number(p.ano), Number(p.mes));
}

export function inicioDoProximoMesSaoPaulo(d: Date): Date {
  const p = partes(d);
  const ano = Number(p.ano);
  const mes = Number(p.mes);
  return mes === 12 ? primeiroDiaMeiaNoite(ano + 1, 1) : primeiroDiaMeiaNoite(ano, mes + 1);
}

export function formatarData(d: Date): string {
  const p = partes(d);
  return `${p.dia}/${p.mes}/${p.ano}`;
}

export function formatarDataHora(d: Date): string {
  const p = partes(d);
  return `${p.dia}/${p.mes}/${p.ano} às ${p.hora}:${p.minuto}`;
}
