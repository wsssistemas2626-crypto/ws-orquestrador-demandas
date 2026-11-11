// Interruptor (03, 2.3 e T12): `button role="switch"` com aria-checked e nome acessível próprio ("Agente de risco
// (RSK)"); o estado aparece em texto ao lado ("Ligado" / "Desligado"), sem depender da cor. Enquanto a mudança vai ao
// servidor, mostra "Alterando…" e fica desabilitado.
// 0.2.0 (T15; 03, 8.2 do pedido 0015): trilho ligado em `acao` e desligado em `tinta-suave`, com o botão branco nos dois
// (branco sobre `acao`, 5,0:1; sobre `tinta-suave`, 4,5:1); o texto do estado não muda.
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
          className={`flex h-7 w-14 items-center rounded-full border-2 p-0.5 ${ligado ? 'justify-end border-acao bg-acao' : 'justify-start border-tinta-suave bg-tinta-suave'}`}
        >
          <span className="h-5 w-5 rounded-full border border-branco bg-branco" />
        </span>
      </button>
      <span>{ocupado ? 'Alterando…' : ligado ? 'Ligado' : 'Desligado'}</span>
    </div>
  );
}
