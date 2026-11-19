# Quote stills

The bundled stills, 1080 × 1920 WebP, made from the owner's art by
`bun run quote-backgrounds:process --in <path to quote-art> --only <keys>` in `packages/backend`.

**One stand-in is left:** `dusk-clouds.webp` is a plain gradient drawn in code (rights-clean),
waiting for its take. Do not ship a store build with it. When the take lands in
`quote-art/stills/dusk-clouds.{png,jpg,jpeg}`, run the command above with `--only dusk-clouds`,
then delete this note.

A new still needs its row in `packages/backend/scripts/quote-backgrounds/manifest.json` and its
line in `src/features/quotes/background/stills.ts`, added only once its file is here.
