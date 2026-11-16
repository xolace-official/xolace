# Vent

Rules the code can't show. The spec is the prototype's `design/handoff/vent.md` and its
live board `design/boards/VentAlive.dc.html` (owner-approved).

- **Add nothing that isn't on the board.** The owner rejected decoration in review (a glowing
  "coal" under the waiting sparks: "UI AI slop… just stick to the experience"). When unsure, do
  what production did.
- **The particle data is production's, exactly.** `field/particle-config.ts` keeps production's
  seed, lattice and the order of every `rand()` call; reordering them changes the field. v2 adds
  only derived data (`FLAKE` uses `i % 3`, no new randoms).
- **The screen is never blank while it waits.** The nine waiting sparks start 400 ms before the
  scatter ends and stay until the reply arrives.
- **The pipeline is production's.** `use-vent.ts` records, gets voice-processing consent before
  any audio leaves the phone, uploads, and waits for both the burn and the server before the
  reply. Change how it looks in the flow (`flow/`), not what it sends.
- **Testing never spends voice credits.** Drive every state through the dev states
  (`xolace://dev/vent/<id>`, fixtures, a pretend voice). Letting go on the real route uploads the
  take to ElevenLabs.
- Vent is a held route (`src/lib/held-routes.ts`): notification taps never take someone out of it.
