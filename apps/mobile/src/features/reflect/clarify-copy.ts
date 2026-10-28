import { removeEmDash } from "@/features/quotes/utils/text-utils";
import type { MissReason } from "@/features/reflect/types";

/** The question a reaching mirror closes on (articulator.ts puts it last), or null. */
export function closingQuestion(mirror: string): string | null {
	const match = mirror.trim().match(/([^.!?\n"“”]+\?)["”’]?$/);
	const question = match?.[1].trim();
	return question && question.length <= 140 ? removeEmDash(question) : null;
}

/** Clarify placeholder for the chip picked in "What didn't land?". */
export const MISS_REASON_PLACEHOLDER: Record<MissReason, string> = {
	close_but_not_quite: "What's the part it missed?",
	missed_the_main_thing: "What's the main thing?",
	too_surface_level: "What's underneath it?",
	wrong_emotion: "What does it feel like, really?",
};
