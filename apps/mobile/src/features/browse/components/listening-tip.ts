const LISTENING_TIPS = [
  "Headphones help. For some of these, closing your eyes and just listening does more than watching the screen.",
  "Best with headphones; let the sound fill the space instead of the room.",
  "Some of this is just instruments, no words. Headphones on, eyes closed, see where it takes you.",
  "Try this one with your eyes closed; sound lands differently when it's the only thing you're doing.",
] as const;

export function pickListeningTip(): string {
  return LISTENING_TIPS[Math.floor(Math.random() * LISTENING_TIPS.length)];
}
