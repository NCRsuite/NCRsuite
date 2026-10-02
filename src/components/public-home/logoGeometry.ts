/**
 * Géométrie officielle du logo NCR Suite (repère du symbole, y vers le bas).
 * Trois barres inclinées à extrémités arrondies ; la barre centrale, plus courte,
 * est échancrée par un disque bleu entouré d'un espace libre.
 */
export const LOGO = {
  slope: 0.38, // pente des barres (tan de l'angle)
  barW: 184,
  barH: 50,
  radius: 20,
  topY: 88,
  midY: 172,
  midX: 10,
  botY: 250,
  dot: { x: 33, y: 187, r: 30 },
  cut: 38, // rayon de l'espace libre autour du point
  yMin: 18,
  yMax: 300,
};

export const LOGO_SKEW_DEG = (Math.atan(LOGO.slope) * 180) / Math.PI;
export const LOGO_VIEWBOX = "-2 14 188 290";
/** Rapport largeur / hauteur du symbole (avec marge du viewBox) */
export const LOGO_RATIO = 188 / 290;

/** Tracé « tout sauf le disque » : sert à échancrer la barre centrale (clip-rule evenodd) */
export const LOGO_CUT_PATH = (() => {
  const { x, y } = LOGO.dot;
  const r = LOGO.cut;
  return `M-50 -50H350V450H-50Z M${x} ${y - r}a${r} ${r} 0 1 0 0 ${2 * r}a${r} ${r} 0 1 0 0 ${-2 * r}Z`;
})();
