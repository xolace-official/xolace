import { THEME_BY_ID } from '@/src/lib/themes';

export type PremiumThemeReset = {
  /** Night mode stashed a premium theme in `previousTheme` — drop it so the
   *  morning restore falls through to `default`. */
  clearPreviousTheme: boolean;
  /** Base theme to re-apply on screen, or null to leave the live theme alone
   *  (e.g. nightly is currently applied, not the premium one). */
  applyBaseTheme: string | null;
};

/** True for a variant like `velvet-dark` whose base theme is premium. */
function isPremiumVariant(variant: string | null): boolean {
  if (!variant) return false;
  const id = variant.replace(/-(light|dark)$/, '');
  return THEME_BY_ID[id]?.tier === 'premium';
}

/**
 * Pure decision for dropping a lapsed subscriber off a premium theme. Returns
 * null for the "do nothing" cases (entitlement not resolved yet, still Plus, or
 * not on a premium theme), else the reset plan the hook applies.
 */
export function planPremiumThemeReset(input: {
  isPlus: boolean;
  isResolved: boolean;
  colorThemeId: string;
  previousTheme: string | null;
  currentTheme: string;
  storedTheme: string;
}): PremiumThemeReset | null {
  // Only revoke on a definitive not-Plus answer. isPlus=false before the
  // entitlement resolves is a signed-out/loading default, not a lapse.
  if (!input.isResolved || input.isPlus) return null;
  if (THEME_BY_ID[input.colorThemeId]?.tier !== 'premium') return null;

  return {
    clearPreviousTheme: isPremiumVariant(input.previousTheme),
    applyBaseTheme: isPremiumVariant(input.currentTheme)
      ? input.storedTheme
      : null,
  };
}
