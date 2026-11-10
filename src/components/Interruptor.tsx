// Interruptor (03, 2.3 e T12): `button role="switch"` com aria-checked e nome acessível próprio ("Agente de risco
// (RSK)"); o estado aparece em texto ao lado ("Ligado" / "Desligado"), sem depender da cor. Enquanto a mudança vai ao
// servidor, mostra "Alterando…" e fica desabilitado.
type Props = {
  rotulo: string;
  ligado: boolean;
  onAlternar: () => void;
  desabilitado?: boolean;
  ocupado?: boolean;
  id?: string;
  idDescricao?: string;
};

export function Interruptor({ rotulo, ligado, onAlternar, desabilitado = false, ocupado = false, id, idDescricao }: Props) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={ligado}
        aria-label={rotulo}
        aria-describedby={idDescricao}
        disabled={desabilitado || ocupado}
        onClick={onAlternar}
        className="inline-flex min-h-11 min-w-16 items-center rounded-full p-1 disabled:cursor-not-allowed disabled:opacity-70"
      >
        <span
          aria-hidden="true"
          className={`flex h-7 w-14 items-center rounded-full border-2 p-0.5 ${ligado ? 'justify-end border-acao-escura bg-acao-escura' : 'justify-start border-tinta-suave bg-superficie'}`}
        >
          <span className={`h-5 w-5 rounded-full border ${ligado ? 'border-branco bg-branco' : 'border-tinta-suave bg-branco'}`} />
        </span>
      </button>
      <span>{ocupado ? 'Alterando…' : ligado ? 'Ligado' : 'Desligado'}</span>
    </div>
  );
}
