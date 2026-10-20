/** Símbolos de género compartidos por películas y series (TMDB usa ids distintos para cada una). */
export interface GenreSymbol {
  key: string;
  emoji: string;
  name: string;
  short?: string;
  movie: number;
  tv: number;
}

export const SYMBOLS: GenreSymbol[] = [
  { key: 'accion', emoji: '💥', name: 'Acción', movie: 28, tv: 10759 },
  { key: 'comedia', emoji: '😂', name: 'Comedia', movie: 35, tv: 35 },
  { key: 'terror', emoji: '👻', name: 'Terror', movie: 27, tv: 9648 },
  { key: 'scifi', emoji: '🚀', name: 'Ciencia ficción', short: 'Sci-Fi', movie: 878, tv: 10765 },
  { key: 'drama', emoji: '🎭', name: 'Drama', movie: 18, tv: 18 },
  { key: 'crimen', emoji: '🔫', name: 'Crimen', movie: 80, tv: 80 },
  { key: 'animacion', emoji: '🎨', name: 'Animación', movie: 16, tv: 16 },
  { key: 'fantasia', emoji: '🧙', name: 'Fantasía', movie: 14, tv: 10765 },
  { key: 'misterio', emoji: '🕵️', name: 'Misterio', movie: 9648, tv: 9648 },
  { key: 'aventura', emoji: '🗺️', name: 'Aventura', movie: 12, tv: 10759 },
  { key: 'romance', emoji: '💘', name: 'Romance', movie: 10749, tv: 10766 },
  { key: 'suspense', emoji: '😱', name: 'Suspense', movie: 53, tv: 80 },
  { key: 'familia', emoji: '🧸', name: 'Familia', movie: 10751, tv: 10751 },
  { key: 'belica', emoji: '⚔️', name: 'Bélica', movie: 10752, tv: 10768 },
  { key: 'western', emoji: '🤠', name: 'Western', movie: 37, tv: 37 },
  { key: 'documental', emoji: '📚', name: 'Documental', movie: 99, tv: 99 },
];

export const symbol = (key: string) => SYMBOLS.find((s) => s.key === key)!;
