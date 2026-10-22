import { describe, expect, it } from 'vitest';
import { planPremiumThemeReset } from './premium-theme-reset';

const LAPSE = {
  isPlus: false,
  isResolved: true,
  colorThemeId: 'velvet',
  previousTheme: null,
  currentTheme: 'velvet-dark',
  storedTheme: 'dark',
};

describe('planPremiumThemeReset', () => {
  // 1 — negative ≠ lapse: entitlement not resolved yet, do nothing.
  it('never revokes before the entitlement resolves', () => {
    expect(planPremiumThemeReset({ ...LAPSE, isResolved: false })).toBeNull();
  });

  // 2 — still Plus.
  it('never revokes an active Plus user', () => {
    expect(planPremiumThemeReset({ ...LAPSE, isPlus: true })).toBeNull();
  });

  // 3 — not on a premium theme, nothing to reset.
  it('is a no-op on a free theme', () => {
    expect(
      planPremiumThemeReset({ ...LAPSE, colorThemeId: 'default' }),
    ).toBeNull();
  });

  // 4 — real lapse, premium live, no night stash.
  it('re-applies the stored base on a live premium theme', () => {
    expect(planPremiumThemeReset(LAPSE)).toEqual({
      clearPreviousTheme: false,
      applyBaseTheme: 'dark',
    });
  });

  // 5 — night mode stashed the premium theme in previousTheme → drop it.
  it('clears a premium theme stashed by night mode', () => {
    expect(
      planPremiumThemeReset({ ...LAPSE, previousTheme: 'velvet-dark' }),
    ).toEqual({ clearPreviousTheme: true, applyBaseTheme: 'dark' });
  });

  // 6 — nightly on screen (not the premium variant) → leave the live theme alone.
  it('leaves the live theme alone when nightly is applied', () => {
    expect(
      planPremiumThemeReset({ ...LAPSE, currentTheme: 'nightly-dark' }),
    ).toEqual({ clearPreviousTheme: false, applyBaseTheme: null });
  });
});
