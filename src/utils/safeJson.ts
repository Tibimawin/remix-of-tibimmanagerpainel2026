/**
 * Helper seguro para JSON.stringify que lida com referências circulares,
 * nós DOM, elementos React e objetos complexos sem lançar TypeError.
 */

export function getCircularReplacer() {
  const seen = new WeakSet();
  return (_key: string, value: any) => {
    if (typeof value === 'object' && value !== null) {
      // Ignorar nós DOM ou elementos com constructor 'Window', 'HTMLElement', etc
      if (typeof window !== 'undefined' && (value instanceof HTMLElement || value instanceof Window || value instanceof Document)) {
        return '[DOM Element]';
      }
      // Verificar se é React Element
      if (value.$$typeof) {
        return '[React Element]';
      }
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    return value;
  };
}

export function safeJsonStringify(value: any, space?: number | string): string {
  try {
    return JSON.stringify(value, getCircularReplacer(), space);
  } catch (err) {
    try {
      // Fallback simplificado
      return JSON.stringify({ error: 'Failed to serialize object', type: typeof value });
    } catch {
      return '{}';
    }
  }
}

export function safeJsonParse<T = any>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
