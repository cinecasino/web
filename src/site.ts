import { version } from '../package.json';

// Identidad del sitio. Para cambiar de nombre basta con editar este archivo: lo usan los títulos, el logo,
// el manifest de la app instalable, la landing y los textos legales. Rellena los [corchetes] antes de publicar.
export const SITE = {
  name: 'Cine Casino',
  /** Las dos palabras del logo de neón (rosa + dorado). */
  logo: ['CINE', 'CASINO'] as [string, string],
  shortName: 'Cine Casino',
  tagline: 'Gamifica la búsqueda de qué ver esta noche',
  description: 'Juegos de casino sin dinero real para descubrir películas y series con datos de TMDB.',
  /** Fase pública: aparece como etiqueta junto al logo. Vacío = sin etiqueta. */
  stage: 'Beta',
  /** Sale de package.json: para publicar versión nueva, `npm version …` y etiqueta git. */
  version,
  owner: '[Nombre del responsable o de la organización]',
  contactEmail: '[email de contacto]',
  country: 'España',
  /** URL del repositorio en GitHub, sin barra final. Activa el enlace "Reportar un problema". */
  repo: 'https://github.com/cinecasino/web',
  legalUpdated: '21 de octubre de 2026',
};

/** Cuentas, partida en la nube y panel de admin: solo existen en modo server. */
export const ACCOUNTS = !__STATIC_BUILD__;

/**
 * Ruta interna con el prefijo del sitio. En GitHub Pages un repo normal vive en /<repo>/,
 * así que nunca se escribe "/ruleta" a pelo: siempre u('ruleta').
 */
export const u = (path = '') => `${import.meta.env.BASE_URL.replace(/\/?$/, '/')}${path.replace(/^\/+/, '')}`;

export const issuesUrl = () => (SITE.repo ? `${SITE.repo}/issues/new/choose` : '');
