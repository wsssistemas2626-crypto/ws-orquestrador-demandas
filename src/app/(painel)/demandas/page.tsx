// T03 Fila de demandas, provisória (T36): só o título, para a moldura ter onde aparecer. A T38 completa.
// T37: ao concluir a T02, a fila mostra "Verificação em duas etapas ativada." (03, T02, Sucesso), pelo parâmetro fixo
// `aviso=2fa-ativado`. Só esse valor mostra o alerta; o texto é fixo e nada da URL vai para a tela.
import type { Metadata } from 'next';
import { Alerta } from '../../../components/Alerta';
import { MENSAGENS_2FA } from '../../../lib/auth-cliente';
import { exigirPessoaNaPagina } from '../../../modules/acesso/exigir-pessoa';

export const metadata: Metadata = { title: 'Demandas' };

type Parametros = Record<string, string | string[] | undefined>;

export default async function PaginaDemandas({ searchParams }: { searchParams: Promise<Parametros> }) {
  await exigirPessoaNaPagina('/demandas');
  const { aviso } = await searchParams;
  return (
    <div className="flex flex-col gap-4">
      <h1>Demandas</h1>
      {aviso === '2fa-ativado' ? (
        <Alerta tipo="sucesso" envio>
          {MENSAGENS_2FA.ativada}
        </Alerta>
      ) : null}
    </div>
  );
}
