// C-40: para onde a pessoa volta depois do login. Só caminho relativo de uma rota do painel (03, seção 1); qualquer
// outra coisa (URL absoluta, `//host`, `/\host`, esquema `javascript:`, rota de fora do painel) vai para a fila.
const DEM = 'DEM-\\d{8}-\\d{4}';
const versao = (prefixo: 'ESP' | 'RSK' | 'DEC') => `${prefixo}-${DEM}-v\\d{1,4}`;

export const ROTAS_DO_PAINEL: readonly RegExp[] = [
  /^\/demandas$/,
  /^\/demandas\/nova$/,
  new RegExp(`^/demandas/${DEM}$`),
  new RegExp(`^/demandas/${DEM}/editar$`),
  new RegExp(`^/demandas/${DEM}/especificacoes/nova$`),
  new RegExp(`^/demandas/${DEM}/pareceres-risco/novo$`),
  new RegExp(`^/demandas/${DEM}/pacotes-decisao/novo$`),
  new RegExp(`^/especificacoes/${versao('ESP')}$`),
  new RegExp(`^/pareceres-risco/${versao('RSK')}$`),
  new RegExp(`^/pacotes-decisao/${versao('DEC')}$`),
  /^\/configuracao\/agentes$/,
];

export const DESTINO_PADRAO = '/demandas';
const TAMANHO_MAXIMO = 2048;
// Consulta só com letra, dígito e os separadores dos filtros da fila: sem `:`, `/`, `\`, `<` nem `#`.
const CONSULTA_SEGURA = /^[A-Za-z0-9_\-.=&%+]*$/;

export function destinoSeguro(callbackURL: string | null | undefined): string {
  if (typeof callbackURL !== 'string' || callbackURL.length > TAMANHO_MAXIMO) return DESTINO_PADRAO;
  if (!callbackURL.startsWith('/') || callbackURL.startsWith('//') || callbackURL.startsWith('/\\')) return DESTINO_PADRAO;
  const i = callbackURL.indexOf('?');
  const caminho = i < 0 ? callbackURL : callbackURL.slice(0, i);
  const consulta = i < 0 ? '' : callbackURL.slice(i + 1);
  if (!CONSULTA_SEGURA.test(consulta)) return DESTINO_PADRAO;
  if (!ROTAS_DO_PAINEL.some((r) => r.test(caminho))) return DESTINO_PADRAO;
  return callbackURL;
}
