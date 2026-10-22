/** Países con datos de "dónde verla" que se ofrecen en Ajustes. */
export const REGIONS = ['ES', 'MX', 'AR', 'CO', 'CL', 'PE', 'US', 'GB'];

let names: Intl.DisplayNames | null = null;
export function regionName(code: string): string {
  try {
    names ??= new Intl.DisplayNames(['es'], { type: 'region' });
    return names.of(code) ?? code;
  } catch {
    return code;
  }
}
