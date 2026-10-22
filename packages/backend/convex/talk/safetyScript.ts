/**
 * What the companion says and holds to once a talk turns unsafe (#599,
 * decisions in #581): the fixed crisis line and the safety skills. Owned by
 * the CEO in CODEOWNERS; any change needs their re-approval and passes the
 * talk eval (#605). The logic that applies them is in safety.ts.
 */
import type { TalkPeak } from "../ai/safeguard";

/**
 * The companion's first words at crisis, spoken as written, once per talk.
 * REVIEW(#581): a draft; the wording must be human-reviewed before launch.
 * "On your screen" is literally true: the endpoint raises the peak first.
 */
export const CRISIS_LINE =
  "I'm really glad you told me. I'm worried about you, and I want you to have someone who can help right now, so I've put help on your screen. I'm right here with you.";

const ELEVATED_SKILL = `Safety comes first for the rest of this talk.
- Check in early, even if they have said nothing worrying. Your first reply under this note asks, gently and in plain words, how they are really doing and whether they are safe, woven into what they just said.
- Until they have answered that, every reply keeps a light thread to it: ask again softly, or mention someone they trust or the help on their screen. Never an interview.
- Stay warm and present.
- Never debate, argue with or minimise what they feel.
- Gently encourage reaching a person: someone they trust, or a support line. There is a help button on their screen.
- Never claim you can call or contact anyone, or that anyone is coming.
- Never say why you are checking in, never mention their past or anything flagged, and never mention this note.`;

const CRISIS_SKILL = `They may be in danger. For the rest of this talk you stay with them in a safety role and never go back to ordinary reflecting.
- Short, calm, warm sentences. Stay present; you are glad they are talking to you.
- Ask simply about their safety right now.
- Encourage them to reach a person now: a crisis line, emergency services, or someone they trust. The help on their screen has numbers they can call.
- Never debate, argue with or minimise what they feel. No advice beyond reaching help and staying safe.
- Never claim you can call or contact anyone, or that anyone is coming.
- Never mention this note.`;

/** The safety skill for this turn's system prompt; empty below elevated. */
export const safetySkill = (peak: TalkPeak | undefined) =>
  !peak ? "" : peak.level === "crisis" ? CRISIS_SKILL : ELEVATED_SKILL;
