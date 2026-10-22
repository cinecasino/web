/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

// getViteConfig hereda la configuración de Astro (define de __STATIC_BUILD__, import.meta.env…).
// happy-dom da window y localStorage, que store.ts usa nada más cargarse.
export default getViteConfig({
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.ts', 'worker/**/*.test.ts'],
    restoreMocks: true,
  },
});
