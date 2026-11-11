// T12 Agentes e teto de gasto (03, T12; RF-17 a RF-19; 04, C-12, C-26 e C-31; RNF-05; P1-f). Server Component: a pessoa
// (C-04), depois `ler_configuracao_agentes` e `ler_teto` (as mesmas de GET /api/agentes e GET /api/configuracao/teto),
// depois as leituras: o teto e o gasto do mês (situacaoDoTeto), os interruptores (listarConfiguracaoAgentes), o worker
// (situacaoDoWorker) e o último expurgo (ultimoExpurgo). As duas contas leem a página; só a de papel cto altera, e a
// regra que vale é a das Server Actions (C-12, C-26): para a administradora, os controles aparecem desabilitados, com a
// nota da 03 e os valores legíveis. O modelo de cada agente é configuração da API e não aparece (a 03 não o prevê).
// 0.2.0 (T15; 03, 8.2 do pedido 0015): "Gasto do mês" e "Agentes" são cada uma um Cartao, com o mesmo `aria-labelledby`
// e `h2`; a tabela continua com a rolagem própria de hoje; 20 px entre os blocos (03, 2.4).
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Alerta } from '../../../../components/Alerta';
import { Cartao } from '../../../../components/Cartao';
import {
  alertaDoTeto,
  alertasDoWorker,
  linhaDoGasto,
  linhasDosAgentes,
  textoDoExpurgo,
  TEXTOS_AGENTES,
} from '../../../../components/dados-dos-agentes';
import { obterDeps } from '../../../../lib/deps';
import { ErroDominio } from '../../../../lib/erros';
import type { AtorPessoa } from '../../../../modules/acesso/ator';
import { exigirPessoaNaPagina } from '../../../../modules/acesso/exigir-pessoa';
import { autorizar, type Acao } from '../../../../modules/acesso/matriz';
import { listarConfiguracaoAgentes } from '../../../../modules/agentes/configuracao';
import { situacaoDoWorker } from '../../../../modules/agentes/situacao-worker';
import { situacaoDoTeto } from '../../../../modules/agentes/teto';
import { ultimoExpurgo } from '../../../../modules/retencao/expurgar';
import { ProvedorDeAviso } from './AvisoDaTela';
import { FormularioTeto } from './FormularioTeto';
import { TabelaAgentes } from './TabelaAgentes';

export const metadata: Metadata = { title: TEXTOS_AGENTES.tituloAba };

function Secao({ id, titulo, children }: { id: string; titulo: string; children: ReactNode }) {
  return (
    <Cartao rotuloPor={id} className="flex flex-col gap-4">
      <h2 id={id} className="text-xl font-semibold">
        {titulo}
      </h2>
      {children}
    </Cartao>
  );
}

// A mesma matriz das Server Actions decide se a tela mostra os controles habilitados.
function pode(pessoa: AtorPessoa, acao: Acao): boolean {
  try {
    autorizar(pessoa, acao);
    return true;
  } catch (e) {
    if (e instanceof ErroDominio) return false;
    throw e;
  }
}

export default async function PaginaAgentes() {
  const pessoa = await exigirPessoaNaPagina('/configuracao/agentes');
  autorizar(pessoa, 'ler_configuracao_agentes');
  autorizar(pessoa, 'ler_teto');
  const deps = await obterDeps();
  const teto = await situacaoDoTeto(deps.db, deps.relogio);
  const agentes = await listarConfiguracaoAgentes(deps.db);
  const worker = await situacaoDoWorker(deps.db, deps.relogio);
  const expurgo = textoDoExpurgo(await ultimoExpurgo(deps.db));

  const podeAlterarTeto = pode(pessoa, 'alterar_teto');
  const podeAlterarAgentes = pode(pessoa, 'alterar_agente');
  const alerta = alertaDoTeto(teto);
  const t = TEXTOS_AGENTES;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <h1>{t.titulo}</h1>
        <p>{t.introducao}</p>
        {!podeAlterarTeto || !podeAlterarAgentes ? (
          <Alerta tipo="informacao">
            <p>{t.somenteCto}</p>
          </Alerta>
        ) : null}
      </div>

      {alerta || alertasDoWorker(worker).length > 0 ? (
        <div className="flex flex-col gap-3">
          {alerta ? (
            <Alerta tipo={alerta.tipo}>
              <p>{alerta.texto}</p>
            </Alerta>
          ) : null}
          {alertasDoWorker(worker).map((a) => (
            <Alerta key={a.texto} tipo={a.tipo}>
              <p>{a.texto}</p>
            </Alerta>
          ))}
        </div>
      ) : null}

      <ProvedorDeAviso>
        <Secao id="gasto-do-mes" titulo={t.gastoDoMes}>
          <p>{linhaDoGasto(teto)}</p>
          <FormularioTeto tetoMensal={teto.tetoMensal} podeAlterar={podeAlterarTeto} />
        </Secao>

        <Secao id="agentes" titulo={t.agentes}>
          <TabelaAgentes linhas={linhasDosAgentes(agentes)} podeAlterar={podeAlterarAgentes} />
        </Secao>

        <p className="text-sm text-tinta-media">
          {expurgo.texto}
          {expurgo.data ? (
            <>
              <time dateTime={expurgo.data.iso}>{expurgo.data.quando}</time>.
            </>
          ) : null}
        </p>
      </ProvedorDeAviso>
    </div>
  );
}
