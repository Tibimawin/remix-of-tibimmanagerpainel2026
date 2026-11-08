
/**
 * Calcula diferença de dias entre duas datas no formato yyyy-mm-dd.
 */
export function diferencaEmDias(data1: string, data2: string): number {
  try {
    const one = new Date(data1 + 'T00:00:00');
    const two = new Date(data2 + 'T00:00:00');
    const diff = Math.floor((one.getTime() - two.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  } catch {
    return 0;
  }
}
