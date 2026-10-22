import type { ReactNode } from 'react';
import { ScopedTheme, ScopedVariables, useCSSVariable } from 'uniwind';

import type { ReaderPage } from './reading-mode';

/**
 * A reading mode's page, reader-local (#401): the light/dark base theme (so
 * accent, surfaces and borders stay coherent) with background / foreground /
 * muted swapped for the page's warm tokens. Everything token-driven inside
 * follows with no per-component wiring. The app theme is untouched.
 */
export function ReaderPageScope({ page, children }: { page: ReaderPage; children: ReactNode }) {
  // Classic ('app') has no page tokens; read paper's so the hook still runs (values unused).
  const key = page === 'app' ? 'paper' : page;
  const [bg, ink, muted] = (
    useCSSVariable([`--color-reader-${key}-bg`, `--color-reader-${key}-ink`, `--color-reader-${key}-muted`]) as string[]
  ).map(String);
  if (page === 'app') return children;
  return (
    <ScopedTheme theme={page === 'night' ? 'dark' : 'light'}>
      {/* Themes define `--background` etc.; `--color-*` is HeroUI's alias over
          them. Class names resolve through the source names, hooks through the
          alias — so override both. */}
      <ScopedVariables
        variables={{
          '--background': bg,
          '--foreground': ink,
          '--muted': muted,
          '--color-background': bg,
          '--color-foreground': ink,
          '--color-muted': muted,
        }}
      >
        {children}
      </ScopedVariables>
    </ScopedTheme>
  );
}
