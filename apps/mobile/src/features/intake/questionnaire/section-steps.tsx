/** §1 You (Q2–Q3) and §2 How you carry it (Q4–Q7) — a card each. */
import type { QuestionnaireAnswers } from '@/src/components/ui/questionnaire';
import { MASCOT_BUNDLE, MASCOT_CURIOUS } from '@/src/features/intake/questionnaire/mascot';
import { SectionScreen } from '@/src/features/intake/questionnaire/section-screen';
import { SECTION_CARRY, SECTION_YOU } from '@/src/features/intake/questions';

const toItems = (questions: typeof SECTION_YOU) =>
  questions.map((q) => ({ name: q.name, required: true, multiple: q.multiple }));

const YOU_ITEMS = toItems(SECTION_YOU);
const CARRY_ITEMS = toItems(SECTION_CARRY);

interface StepProps {
  onDone: (answers: QuestionnaireAnswers) => void;
}

export function YouStep({ onDone }: StepProps) {
  return (
    <SectionScreen
      eyebrow="Section 1 of 3 · You"
      title="What brings you here"
      mascot={MASCOT_CURIOUS}
      says="Two questions about where you're starting from. There's no wrong answer, and nothing here is shown to anyone."
      questions={SECTION_YOU}
      items={YOU_ITEMS}
      capped={['weighingOn']}
      onDone={onDone}
    />
  );
}

export function CarryStep({ onDone }: StepProps) {
  return (
    <SectionScreen
      eyebrow="Section 2 of 3 · How you carry it"
      title="How this usually goes for you"
      mascot={MASCOT_BUNDLE}
      says="This is the part that changes how Xolace talks to you, how much it asks, and how fast it gets there."
      questions={SECTION_CARRY}
      items={CARRY_ITEMS}
      capped={['copingStyle']}
      onDone={onDone}
    />
  );
}
