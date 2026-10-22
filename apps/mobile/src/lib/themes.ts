/**
 * Single source of truth for all available themes.
 * Used by the Appearance screen, preview cards, and SessionModeProvider.
 */

export type ThemeTier = 'free' | 'premium';

export type ThemeEntry = {
  id: string;
  name: string;
  tier: ThemeTier;
  variants: { light: string; dark: string };
  /** Hex color values for inline-style preview cards (no CSS variable resolution needed). */
  preview: { bg: string; fg: string; accent: string; surface: string; border: string };
  /** Hidden from the picker (e.g. nightly — controlled by SessionModeProvider). */
  hiddenFromPicker?: boolean;
  /** false for premium stubs that have no CSS file yet. */
  available?: boolean;
};

export const THEMES: ThemeEntry[] = [
  {
    id: 'default',
    name: 'Default',
    tier: 'free',
    variants: { light: 'light', dark: 'dark' },
    preview: {
      bg: '#19151f',
      fg: '#ede9f5',
      accent: '#b3a0e0',
      surface: '#201c2e',
      border: '#2c273c',
    },
  },
  {
    id: 'quiet',
    name: 'Quiet Space',
    tier: 'free',
    variants: { light: 'quiet-light', dark: 'quiet-dark' },
    preview: {
      bg: '#0d1920',
      fg: '#f7fbfb',
      accent: '#6bbfc5',
      surface: '#141f28',
      border: '#1c2d36',
    },
  },
  {
    id: 'reverie',
    name: 'Reverie',
    tier: 'free',
    variants: { light: 'reverie-light', dark: 'reverie-dark' },
    preview: {
      bg: '#0f0b16',
      fg: '#f8f5ff',
      accent: '#bf7de0',
      surface: '#181022',
      border: '#211530',
    },
  },
  {
    id: 'human',
    name: 'Human Connection',
    tier: 'free',
    variants: { light: 'human-light', dark: 'human-dark' },
    preview: {
      bg: '#1a1008',
      fg: '#fbf8f5',
      accent: '#e87255',
      surface: '#221508',
      border: '#2e1c0a',
    },
  },
  {
    id: 'nightly',
    name: 'Nightly',
    tier: 'free',
    hiddenFromPicker: true,
    variants: { light: 'nightly-light', dark: 'nightly-dark' },
    preview: {
      bg: '#090810',
      fg: '#dddaec',
      accent: '#8b7db8',
      surface: '#100e1a',
      border: '#1a1826',
    },
  },
  // ── xolace+ premium themes ──────────────────────────────────────
  // Preview hexes are the theme's own dark-variant oklch tokens
  // (--background / --foreground / --accent / --surface / --border)
  // converted to sRGB, so the card matches what the theme actually renders.
  {
    id: 'emerald',
    name: 'Emerald',
    tier: 'premium',
    variants: { light: 'emerald-light', dark: 'emerald-dark' },
    preview: {
      bg: '#000201',
      fg: '#e9f1eb',
      accent: '#00a461',
      surface: '#010a05',
      border: '#13231b',
    },
  },
  {
    id: 'rose',
    name: 'Rosé',
    tier: 'premium',
    variants: { light: 'rose-light', dark: 'rose-dark' },
    preview: {
      bg: '#080305',
      fg: '#f5ebef',
      accent: '#ef87ba',
      surface: '#180b11',
      border: '#312128',
    },
  },
  {
    id: 'platinum',
    name: 'Platinum',
    tier: 'premium',
    variants: { light: 'platinum-light', dark: 'platinum-dark' },
    preview: {
      bg: '#030609',
      fg: '#ebeff2',
      accent: '#80abc5',
      surface: '#0c1316',
      border: '#232a2e',
    },
  },
  {
    id: 'velvet',
    name: 'Velvet',
    tier: 'premium',
    variants: { light: 'velvet-light', dark: 'velvet-dark' },
    preview: {
      bg: '#060101',
      fg: '#f5e8e6',
      accent: '#d33949',
      surface: '#140505',
      border: '#2f1c1c',
    },
  },
  {
    id: 'noir',
    name: 'Noir',
    tier: 'premium',
    variants: { light: 'noir-light', dark: 'noir-dark' },
    preview: {
      bg: '#010100',
      fg: '#f3eee3',
      accent: '#f3ba25',
      surface: '#060402',
      border: '#1e1a13',
    },
  },
];

export const FREE_THEMES = THEMES.filter(
  (t) => t.tier === 'free' && !t.hiddenFromPicker
);
export const PREMIUM_THEMES = THEMES.filter((t) => t.tier === 'premium');
export const THEME_BY_ID: Record<string, ThemeEntry> = Object.fromEntries(
  THEMES.map((t) => [t.id, t])
);
