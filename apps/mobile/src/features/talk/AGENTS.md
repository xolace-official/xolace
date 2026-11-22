# Talk

- **No lip-sync.** Nothing in Talk drives the face's `mouthOpen`: not audio, a level or a
  timer. Speaking is production's `speaking` pose and the glow breathing behind the face
  (handoff `talk.md` §5). The mic level only leans the face in (`face.listen`).
- **The voice pipeline is production's.** `use-talk.ts` (ElevenLabs, the session state
  machine), `use-thread.ts` and `spoken-words.ts` are what a live talk runs on; the screen
  reads them through `use-talk-screen.ts`. Change the UI around them, not them.
- **Dev states never reach a voice service.** `dev/` plays a scripted talk; the only real
  things it touches are the bundled voice samples and the system's mic alert.
- `/talk` is a held route (`src/lib/held-routes.ts`): a notification tap never tears it
  down.
