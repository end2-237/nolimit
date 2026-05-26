/**
 * Mobile/viewport utilities — utilisent matchMedia au lieu de innerWidth.
 * matchMedia ne se déclenche PAS quand le clavier virtuel s'ouvre/se ferme
 * sur iOS et Android (contrairement aux events resize sur innerWidth).
 */

/** True si la largeur CSS viewport est ≤ 767 px (breakpoint mobile). */
export const isMobileViewport = (): boolean =>
  typeof window !== 'undefined' &&
  window.matchMedia('(max-width: 767px)').matches;

/** True si l'appareil est tactile (téléphone, tablette). */
export const isTouchDevice = (): boolean =>
  typeof window !== 'undefined' &&
  ('ontouchstart' in window || navigator.maxTouchPoints > 0);

/**
 * Focuse l'élément seulement si l'appareil n'est PAS mobile/tactile.
 * Évite que le clavier virtuel s'ouvre automatiquement sur mobile.
 */
export const focusDesktopOnly = (el: HTMLElement | null | undefined): void => {
  if (!el) return;
  if (isMobileViewport() || isTouchDevice()) return;
  el.focus();
};
