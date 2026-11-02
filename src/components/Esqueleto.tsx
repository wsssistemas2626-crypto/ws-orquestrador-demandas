// Esqueleto de carregamento (03, 2.3): barras cinza escondidas do leitor de tela e um texto oculto que diz o que está
// carregando ("Carregando demandas…"). A pulsação só existe sem `prefers-reduced-motion`.
type Props = { rotulo: string; linhas?: number; alturaLinha?: 'h-6' | 'h-10' | 'h-50' };

export function Esqueleto({ rotulo, linhas = 3, alturaLinha = 'h-6' }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <span className="sr-only">{rotulo}</span>
      <div aria-hidden="true" className="flex flex-col gap-2">
        {Array.from({ length: linhas }, (_, i) => (
          <div key={i} className={`${alturaLinha} rounded-campo bg-fundo-suave motion-safe:animate-pulse`} />
        ))}
      </div>
    </div>
  );
}
