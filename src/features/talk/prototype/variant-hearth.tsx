// PROTOTYPE (#584) — Variant C, "Hearth". Variant A's transcript, with the
// aurora rising from behind the composer like firelight: it swells when either
// of you speaks, so the screen breathes with the talk without leaving the chat.
import { View } from "react-native";
import { TalkAurora } from "./talk-aurora";
import { TalkHeader } from "./talk-header";
import { TalkThread } from "./talk-thread";
import { TalkComposer, TalkKeyboardFrame } from "./talk-composer";
import { ConsentCard, EndedCard } from "./talk-cards";
import type { TalkSim } from "./use-talk-sim";

export function VariantHearth({ sim }: { sim: TalkSim }) {
  return (
    <TalkKeyboardFrame>
      <TalkAurora level={sim.level} flip={1} coverage={0.55} />
      <TalkHeader sim={sim} />
      <TalkThread
        turns={sim.turns}
        footer={
          sim.phase === "consent" ? <ConsentCard sim={sim} /> : sim.phase === "ended" ? <EndedCard sim={sim} /> : null
        }
      />
      {sim.phase === "live" && <TalkComposer sim={sim} />}
    </TalkKeyboardFrame>
  );
}
