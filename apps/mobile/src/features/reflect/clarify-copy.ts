import { removeEmDash } from '@/src/features/quotes/utils/text-utils';
import type { MissReason } from '@/src/features/reflect/types';

/**
 * The question a reaching mirror closes on, or null. The articulator puts it
 * last, in the same paragraph (articulator.ts, Claim Strength: Reaching), so
 * the tail after the last sentence end is the question. Too long to read as
 * a heading → null, and the caller keeps "Say more".
 */
export function closingQuestion(mirror: string): string | null {
  const match = mirror.trim().match(/([^.!?\n"“”]+\?)["”’]?$/);
  const question = match?.[1].trim();
  return question && question.length <= 140 ? removeEmDash(question) : null;
}

/** Clarify placeholder for the chip picked in "What didn't land?". */
export const MISS_REASON_PLACEHOLDER: Record<MissReason, string> = {
  wrong_emotion: 'What does it feel like, really?',
  too_surface_level: "What's underneath it?",
  close_but_not_quite: "What's the part it missed?",
  missed_the_main_thing: "What's the main thing?",
};
