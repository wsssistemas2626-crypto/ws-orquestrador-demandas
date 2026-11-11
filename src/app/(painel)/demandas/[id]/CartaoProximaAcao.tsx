// Cartão "Próxima ação" da T05 (RF-09; 03, 5.5 do pedido 0015): `section` marinho com o `h2` como etiqueta, o que falta,
// o detalhe (só onde a 03 define), "Quem age: …" e, quando há destino, o link-botão claro. Destino em outra página é um
// link comum; destino na própria página (seção de dúvidas ou de status) leva o foco ao `h2` da seção (LinkNestaPagina).
// O foco fica branco dentro do marinho (`superficie-escura`). O cartão só informa: não habilita, desabilita nem esconde
// nada. A ação chega pronta de proximaAcao, que só a página chama (CA-09.4).
import Link from 'next/link';
import { classeDoBotao } from '../../../../components/Botao';
import { TEXTOS_ETAPAS, type ProximaAcao } from '../../../../components/dados-das-etapas';
import { ID_SECAO } from './detalhe';
import { LinkNestaPagina } from './LinkNestaPagina';

export const ID_PROXIMA_ACAO = 'proxima-acao';

function LinkDaAcao({ link }: { link: NonNullable<ProximaAcao['link']> }) {
  const classe = `${classeDoBotao('claro-sobre-escuro')} self-start`;
  if (link.destino.tipo === 'secao')
    return (
      <LinkNestaPagina alvo={ID_SECAO[link.destino.secao]} className={classe}>
        {link.rotulo}
      </LinkNestaPagina>
    );
  return (
    <Link href={link.destino.href} className={classe}>
      {link.rotulo}
    </Link>
  );
}

export function CartaoProximaAcao({ acao, className }: { acao: ProximaAcao; className?: string }) {
  return (
    <section
      aria-labelledby={ID_PROXIMA_ACAO}
      className={`superficie-escura flex flex-col gap-3 rounded-cartao bg-marinho p-5 text-branco${className ? ` ${className}` : ''}`}
    >
      <h2 id={ID_PROXIMA_ACAO} className="font-mono text-xs font-semibold uppercase tracking-[0.08em] text-azul-claro">
        {TEXTOS_ETAPAS.titulo}
      </h2>
      <p className="text-lg font-bold text-branco">{acao.oQueFalta}</p>
      {acao.detalhe ? <p className="text-sm text-texto-claro">{acao.detalhe}</p> : null}
      <p className="text-sm text-texto-claro">
        <span className="font-semibold">{TEXTOS_ETAPAS.quemAge}</span> {acao.quemAge}
      </p>
      {acao.link ? <LinkDaAcao link={acao.link} /> : null}
    </section>
  );
}
