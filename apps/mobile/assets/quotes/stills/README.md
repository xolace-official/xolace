# Quote stills: STAND-INS

Every `.webp` here is a **placeholder**: a plain gradient drawn in code, rights-clean, so the
Quotes screen (S11) can be built and reviewed before the real art exists. **Do not ship a store
build with these.**

To replace them, put the owner's art in `quote-art/stills/<key>.{png,jpg}` and run
`bun run quote-backgrounds:process --in <path to quote-art>` in `packages/backend`. It writes 1080 × 1920 WebP files
here under the same names, so nothing else changes. Then delete this file.
