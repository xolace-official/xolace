// PROTOTYPE (#584) — Variant A, "Thread". The screenshot shape: a native glass
// header, the talk as a transcript, a glass composer. Calm, familiar, quiet.
import { View } from "react-native";
import { TalkHeader } from "./talk-header";
import { TalkThread } from "./talk-thread";
import { TalkComposer, TalkKeyboardFrame } from "./talk-composer";
import { ConsentCard, EndedCard } from "./talk-cards";
import type { TalkSim } from "./use-talk-sim";

export function VariantThread({ sim }: { sim: TalkSim }) {
  return (
    <TalkKeyboardFrame>
      <TalkHeader sim={sim} />
      <TalkThread
        turns={sim.turns}
        footer={
          sim.phase === "consent" ? <ConsentCard sim={sim} /> : sim.phase === "ended" ? <EndedCard sim={sim} /> : null
        }
      />
      {sim.phase === "live" && <TalkComposer sim={sim} bare />}
    </TalkKeyboardFrame>
  );
}
