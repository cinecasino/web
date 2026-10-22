// Arranque de páginas con el router de Astro (<ClientRouter /> en las páginas del casino).
// Con el router, el <script> de cada página se ejecuta una sola vez aunque vuelvas a ella, así que
// su código va dentro de onPage(): se ejecuta en cada visita (también la primera) y, al salir, se
// deshace lo que había registrado fuera de la página (listeners de window/document, intervalos…).

export interface PageScope {
  /** addEventListener que se quita solo al salir de la página. */
  on<K extends keyof WindowEventMap>(target: Window, type: K, fn: (e: WindowEventMap[K]) => void, opts?: AddEventListenerOptions): void;
  on<K extends keyof DocumentEventMap>(target: Document, type: K, fn: (e: DocumentEventMap[K]) => void, opts?: AddEventListenerOptions): void;
  on(target: EventTarget, type: string, fn: (e: Event) => void, opts?: AddEventListenerOptions): void;
  /** setInterval que se para al salir. */
  every(ms: number, fn: () => void): void;
  /** Cualquier otra cosa que haya que hacer al salir. */
  onLeave(fn: () => void): void;
}

/**
 * Ejecuta `init` cada vez que se llega a una página que contiene `selector`.
 * Sin router (p. ej. en la primera carga sin soporte) funciona igual: astro:page-load también salta al cargar.
 */
export function onPage(selector: string, init: (s: PageScope) => void) {
  let leave: (() => void)[] = [];
  const scope: PageScope = {
    on(target: EventTarget, type: string, fn: (e: Event) => void, opts?: AddEventListenerOptions) {
      target.addEventListener(type, fn, opts);
      leave.push(() => target.removeEventListener(type, fn, opts));
    },
    every(ms, fn) {
      const id = setInterval(fn, ms);
      leave.push(() => clearInterval(id));
    },
    onLeave(fn) {
      leave.push(fn);
    },
  };
  document.addEventListener('astro:page-load', () => {
    if (document.querySelector(selector)) init(scope);
  });
  document.addEventListener('astro:before-swap', () => {
    for (const fn of leave) fn();
    leave = [];
  });
}
