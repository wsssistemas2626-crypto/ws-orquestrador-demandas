// T01 Entrar (03, T01). Fora do grupo (painel) e sem exigirPessoaNaPagina (C-04 deixa /entrar de fora). Não lê sessão
// nem banco: só os dois parâmetros da URL. `callbackURL` passa por destinoSeguro aqui no servidor, e o formulário
// recebe só o caminho já conferido (C-40). `motivo=sessao` vem de exigirPessoaNaPagina (03, 2.8).
import type { Metadata } from 'next';
import { MolduraPublica } from '../../components/casca/MolduraPublica';
import { destinoSeguro } from '../../modules/acesso/destino-seguro';
import { FormularioEntrar } from './FormularioEntrar';

export const metadata: Metadata = { title: 'Entrar — WS Orquestrador de Demandas' };

// A CSP leva um nonce novo a cada requisição (src/proxy.ts, C-19): página pré-renderizada sairia com scripts sem ele.
export const dynamic = 'force-dynamic';

type Parametros = Record<string, string | string[] | undefined>;

const umSo = (v: string | string[] | undefined): string | undefined => (typeof v === 'string' ? v : undefined);

export default async function PaginaEntrar({ searchParams }: { searchParams: Promise<Parametros> }) {
  const p = await searchParams;
  // Moldura pública com a marca sem link (0.2.0, RF-13): nenhum caminho de volta além do destino já conferido (C-40).
  return (
    <MolduraPublica comLinkNaMarca={false}>
      <FormularioEntrar destino={destinoSeguro(umSo(p.callbackURL))} sessaoTerminou={umSo(p.motivo) === 'sessao'} />
    </MolduraPublica>
  );
}
