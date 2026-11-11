// Regras de exibição da T03 Fila (T08 do DEC-DEM-20261110-0015-v1; C08; 03, seção 4): contadores por status, idade da
// demanda e texto acessível das etapas. Funções puras, sem banco nem relógio: o agora chega da página
// (deps.relogio.agora()). De src/modules/ só entram tipos (CV-09). O href de cada contador sai só do filtro já validado
// e do enum de status (CV-07, CV-19), pela mesma função que monta o endereço da fila.
import { dataIsoSaoPaulo, formatarData } from '../lib/fuso';
import type { ContagemPorStatus, EtapasNaFila } from '../modules/demandas/resumo-da-fila';
import type { FiltroDemandas, Status } from '../modules/demandas/schemas';
import { COR_STATUS, ROTULO_STATUS, type CorSelo } from './rotulos';

export const TEXTOS_CONTADORES = {
  grupo: 'Filtrar por status',
  todas: 'Todas',
  erro: 'Não foi possível contar as demandas por status. Os filtros por status continuam funcionando.',
  demandas: (n: number) => (n === 1 ? ' demanda' : ' demandas'),
} as const;

export type ContadorDaFila = {
  status: Status | null;
  rotulo: string;
  total: number | null;
  pressionado: boolean;
  href: string;
  valor: string;
  cor: CorSelo | null;
};

// "Todas" e os nove status, na ordem de ROTULO_STATUS. Ativar um contador troca só o status e volta à primeira página;
// o pressionado (e "Todas") tira o status (CA-05.3, CA-05.5). Contagem que falhou (null): os botões ficam sem número e
// continuam filtrando (03, 4.6).
export function contadoresDaFila(
  c: ContagemPorStatus | null,
  f: FiltroDemandas,
  href: (f: FiltroDemandas, offset: number) => string,
): ContadorDaFila[] {
  const semStatus: FiltroDemandas = { ...f, status: undefined };
  const todas: ContadorDaFila = {
    status: null,
    rotulo: TEXTOS_CONTADORES.todas,
    total: c ? c.todas : null,
    pressionado: !f.status,
    href: href(semStatus, 0),
    valor: '',
    cor: null,
  };
  const porStatus = (Object.keys(ROTULO_STATUS) as Status[]).map((s): ContadorDaFila => {
    const pressionado = f.status === s;
    return {
      status: s,
      rotulo: ROTULO_STATUS[s],
      total: c ? c.porStatus[s] : null,
      pressionado,
      href: href(pressionado ? semStatus : { ...f, status: s }, 0),
      valor: pressionado ? '' : s,
      cor: COR_STATUS[s],
    };
  });
  return [todas, ...porStatus];
}

const DIA_MS = 86_400_000;

// Idade em dias de calendário de São Paulo (CA-06.2): "Hoje", "1 dia", "N dias"; mais a data e o ISO para o <time>.
export function idadeDaDemanda(criadaEm: Date, agora: Date): { texto: string; data: string; iso: string } {
  const dias = Math.round((Date.parse(dataIsoSaoPaulo(agora)) - Date.parse(dataIsoSaoPaulo(criadaEm))) / DIA_MS);
  const texto = dias <= 0 ? 'Hoje' : dias === 1 ? '1 dia' : `${dias} dias`;
  return { texto, data: formatarData(criadaEm), iso: criadaEm.toISOString() };
}

const marca = (feita: boolean) => (feita ? 'feita' : 'por fazer');

// Texto acessível das marcas de etapa (CA-06.1).
export const textoDasEtapas = (e: EtapasNaFila): string => `Etapas: ESP ${marca(e.esp)}, RSK ${marca(e.rsk)}, DEC ${marca(e.dec)}`;
