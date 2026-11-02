// Paginação (03, T03): `nav aria-label="Paginação"` com "Anterior", "Página N" (aria-current) e "Próxima". Sem página
// anterior ou seguinte, o controle continua no lugar, indisponível (aria-disabled), e não navega.
import Link from 'next/link';

type Props = { pagina: number; hrefAnterior: string | null; hrefProxima: string | null };

const CLASSE = 'inline-flex min-h-11 min-w-11 items-center justify-center rounded-campo px-3 py-2';

function Controle({ href, texto }: { href: string | null; texto: string }) {
  if (!href) {
    return (
      <a role="link" aria-disabled="true" className={`${CLASSE} cursor-not-allowed text-texto-suave`}>
        {texto}
      </a>
    );
  }
  return (
    <Link href={href} className={`${CLASSE} border border-borda text-primaria underline`}>
      {texto}
    </Link>
  );
}

export function Paginacao({ pagina, hrefAnterior, hrefProxima }: Props) {
  return (
    <nav aria-label="Paginação">
      <ul className="flex flex-wrap items-center gap-2">
        <li>
          <Controle href={hrefAnterior} texto="Anterior" />
        </li>
        <li>
          <span aria-current="page" className={`${CLASSE} font-semibold`}>
            {`Página ${pagina}`}
          </span>
        </li>
        <li>
          <Controle href={hrefProxima} texto="Próxima" />
        </li>
      </ul>
    </nav>
  );
}
