// Única fonte de "agora" do sistema (G3.4). Fora deste arquivo, `new Date()` sem argumento e `Date.now()` são
// proibidos (teste estático da T13): quem precisa da hora recebe um `Relogio`.
export type Relogio = { agora(): Date };

export const relogioDoSistema: Relogio = { agora: () => new Date() };

export type RelogioFixo = Relogio & { avancar(ms: number): void; definir(iso: string): void };

function paraMs(iso: string): number {
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) throw new RangeError('relogioFixo: data inválida');
  return ms;
}

export function relogioFixo(iso: string): RelogioFixo {
  let ms = paraMs(iso);
  return {
    agora: () => new Date(ms),
    avancar: (delta: number) => {
      ms += delta;
    },
    definir: (novo: string) => {
      ms = paraMs(novo);
    },
  };
}
