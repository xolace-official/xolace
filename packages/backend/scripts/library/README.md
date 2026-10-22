# Library

`ingest.ts` upserts `prod/` (or `dev/`) `sources.json` → `manifest.json` → `hubs.json` into Convex. See the header of `ingest.ts` for the gates and flags.

## Cover art

Covers live in `<tree>/media/cover/` (gitignored), 2048×2048, with a small "xolace" wordmark bottom-right.

**The room is fixed.** Cover scenes that take place in the bedroom share one layout so the catalogue reads as one world:

- Bed on the left, desk on the right, **window on the right beside the desk** (light falls right → left across the bed and floor).
- Plants, photo wall, desk lamp, books, tote bag, mug stay as props.
- Reference image: `prod/media/cover/explainer/depression-what-it-is.png`. Attach it when generating any new bedroom cover.

**Everything else can change.** Camera angle, time of day, light, props in use and the character (look, outfit, pose) may vary per entry, and non-bedroom scenes (e.g. the crowded hall in `loneliness-what-it-is`) are fine. The aim is a consistent room, not repeated images, so don't reuse the same composition for an entry's explainer/advice pair.
