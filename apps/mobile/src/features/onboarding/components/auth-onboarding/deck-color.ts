/**
 * The deck is pinned to the dark theme via `<ScopedTheme>` in the shell. That
 * pin governs className tokens, but NOT `useThemeColor` from heroui — that
 * hook reads the global theme, so on a light-mode phone it hands back the
 * light palette and the CTA comes out lavender on top of a night deck.
 *
 * Uniwind's own `useCSSVariable` resolves through `scopedTheme`, so it honours
 * the pin. Any color this screen reads in JS must come through here.
 */
import { useCSSVariable } from 'uniwind';

export const useDeckColor = (token: string) => useCSSVariable(`--${token}`) as string;
