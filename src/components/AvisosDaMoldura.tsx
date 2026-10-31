// Avisos da moldura do painel (03, 2.7): agentes de IA suspensos pelo teto (RF-18) e capacidade de ids perto do fim
// (RNF-09). Sem aviso, não renderiza nada.
import Link from 'next/link';
import { LIMITE_AVISO_CAPACIDADE } from '../modules/demandas/gerar-id';
import { Alerta } from './Alerta';

type Props = { tetoMensal: number; suspenso: boolean; totalDemandas: number };

export function AvisosDaMoldura({ tetoMensal, suspenso, totalDemandas }: Props) {
  // Teto 0 (o de fábrica) é "teto não definido", tratado na tela de agentes e teto (03, T12); o aviso da moldura é o da
  // suspensão por gasto, com um teto definido.
  const agentesSuspensos = tetoMensal > 0 && suspenso;
  // 03, 2.7: "mais de 9.000".
  const capacidadeNoFim = totalDemandas > LIMITE_AVISO_CAPACIDADE;
  if (!agentesSuspensos && !capacidadeNoFim) return null;
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 pt-4">
      {agentesSuspensos ? (
        <Alerta tipo="atencao">
          <p>
            Agentes de IA suspensos: o gasto do mês atingiu o teto. Nenhum agente chama o provedor até o teto subir ou o mês virar.
            Preencha os campos à mão.
          </p>
          <Link href="/configuracao/agentes" className="text-atencao-texto">
            Ver agentes e teto
          </Link>
        </Alerta>
      ) : null}
      {capacidadeNoFim ? (
        <Alerta tipo="atencao">
          <p>
            {`Atenção: já existem ${totalDemandas.toLocaleString('pt-BR')} demandas. O formato do id comporta até 9.999. Avise o time técnico para planejar a mudança.`}
          </p>
        </Alerta>
      ) : null}
    </div>
  );
}
