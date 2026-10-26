// Validação do Pedido de Construção (spec, seção 3.1).
export const TIPOS_CONSTRUIDOS = ['novo_projeto', 'melhoria', 'produto_proprio', 'bug'];
const NIVEIS_RISCO = ['baixo', 'medio', 'alto', 'critico'];
const RE_DEMANDA = /^DEM-\d{8}-\d{4}$/;
const RE_SISTEMA = /^[a-z0-9][a-z0-9-]*$/;
// Contas do GitHub onde ficam os sistemas da empresa (padrão técnico, seção 10).
export const DONOS_REPOSITORIO = ['fabianojp06', 'wsssistemas2626-crypto'];

const preenchido = (v) => typeof v === 'string' && v.trim() !== '';
const listaPreenchida = (v) => Array.isArray(v) && v.length > 0 && v.every(preenchido);

export function validarPedido(p) {
  if (!p || typeof p !== 'object' || Array.isArray(p)) return { ok: false, erros: ['o pedido não é um objeto JSON'] };
  const erros = [];

  const demanda = p.demanda ?? {};
  const demandaId = RE_DEMANDA.test(demanda.id ?? '') ? demanda.id : null;
  if (!demandaId) erros.push('demanda.id fora do formato DEM-AAAAMMDD-NNNN');
  if (demanda.tipo === 'estudo') erros.push('pedido do tipo estudo não é construído');
  else if (!TIPOS_CONSTRUIDOS.includes(demanda.tipo)) erros.push(`demanda.tipo inválido: ${demanda.tipo}`);
  for (const campo of ['titulo', 'descricao']) if (!preenchido(demanda[campo])) erros.push(`demanda.${campo} vazio`);

  const idDa = (prefixo) => new RegExp(`^${prefixo}-${demandaId}-v\\d+$`);
  if (demandaId) {
    if (!idDa('ESP').test(p.especificacao?.id ?? '')) erros.push(`especificacao.id fora do formato ESP-${demandaId}-vN`);
    if (!idDa('RSK').test(p.risco?.id ?? '')) erros.push(`risco.id fora do formato RSK-${demandaId}-vN`);
  }
  if (!preenchido(p.especificacao?.conteudo)) erros.push('especificacao.conteudo vazio');
  if (!NIVEIS_RISCO.includes(p.risco?.nivel)) erros.push(`risco.nivel inválido: ${p.risco?.nivel}`);
  if (!preenchido(p.risco?.conteudo)) erros.push('risco.conteudo vazio');

  if (!p.decisao || typeof p.decisao !== 'object') {
    erros.push('decisao ausente: o pedido só entra com o Pacote de Decisão aprovado');
  } else {
    if (demandaId && !idDa('DEC').test(p.decisao.id ?? '')) erros.push(`decisao.id fora do formato DEC-${demandaId}-vN`);
    if (p.pedido !== p.decisao.id) erros.push('pedido precisa ser igual a decisao.id');
    if (!preenchido(p.decisao.opcaoEscolhida)) erros.push('decisao.opcaoEscolhida vazio');
    if (!preenchido(p.decisao.aprovadoPor)) erros.push('decisao.aprovadoPor vazio');
    if (!/^\d{4}-\d{2}-\d{2}/.test(p.decisao.aprovadoEm ?? '')) erros.push('decisao.aprovadoEm fora do formato AAAA-MM-DD');
  }

  const sistemaOk = RE_SISTEMA.test(p.sistema_alvo ?? '');
  if (!sistemaOk) erros.push('sistema_alvo fora do formato: minúsculas, números e hífen, sem barra');
  else if (!DONOS_REPOSITORIO.some((dono) => p.repositorio_destino === `${dono}/${p.sistema_alvo}`)) {
    erros.push(`repositorio_destino precisa ser <dono>/${p.sistema_alvo}, com dono ${DONOS_REPOSITORIO.join(' ou ')}`);
  }

  if (p.ensaio !== undefined && typeof p.ensaio !== 'boolean') erros.push('ensaio precisa ser true ou false');
  if (!listaPreenchida(p.criterios_aceite_preliminares)) erros.push('criterios_aceite_preliminares vazio');
  if (!listaPreenchida(p.definicao_de_pronto)) erros.push('definicao_de_pronto vazio');

  return { ok: erros.length === 0, erros };
}
