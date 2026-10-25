/** §1 You (Q2–Q3) and §2 How you carry it (Q4–Q7) — a card each. */
import type { QuestionnaireAnswers } from "@/src/components/ui/questionnaire";
import {
	MASCOT_BUNDLE,
	MASCOT_CURIOUS,
} from "@/src/features/intake/questionnaire/mascot";
import { SectionScreen } from "@/src/features/intake/questionnaire/section-screen";
import { SECTION_CARRY, SECTION_YOU } from "@/src/features/intake/questions";

const toItems = (questions: typeof SECTION_YOU) =>
	questions.map((q) => ({
		multiple: q.multiple,
		name: q.name,
		required: true,
	}));

const YOU_ITEMS = toItems(SECTION_YOU);
const CARRY_ITEMS = toItems(SECTION_CARRY);

interface StepProps {
	onDone: (answers: QuestionnaireAnswers) => void;
}

export function YouStep({ onDone }: StepProps) {
	return (
		<SectionScreen
			capped={["weighingOn"]}
			eyebrow="Section 1 of 3 · You"
			items={YOU_ITEMS}
			mascot={MASCOT_CURIOUS}
			onDone={onDone}
			questions={SECTION_YOU}
			says="Two questions about where you're starting from. There's no wrong answer, and nothing here is shown to anyone."
			title="What brings you here"
		/>
	);
}

export function CarryStep({ onDone }: StepProps) {
	return (
		<SectionScreen
			capped={["copingStyle"]}
			eyebrow="Section 2 of 3 · How you carry it"
			items={CARRY_ITEMS}
			mascot={MASCOT_BUNDLE}
			onDone={onDone}
			questions={SECTION_CARRY}
			says="This is the part that changes how Xolace talks to you, how much it asks, and how fast it gets there."
			title="How this usually goes for you"
		/>
	);
}
