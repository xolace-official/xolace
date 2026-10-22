/**
 * §3 Finding us — Q8, Q9 and the one branch.
 *
 * The only step that lifts its answers out of `SectionScreen`: Q9 decides
 * whether Q10/Q11 exist at all, and the progress count has to know that as it
 * happens.
 */
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Questionnaire, type QuestionnaireAnswers } from '@/src/components/ui/questionnaire';
import { AppText } from '@/src/components/shared/app-text';
import { MASCOT_MAP } from '@/src/features/intake/questionnaire/mascot';
import { SectionScreen } from '@/src/features/intake/questionnaire/section-screen';
import {
  SECTION_FINDING,
  SERIES_BRANCH_VALUE,
  SERIES_NOT_SEEN,
  SERIES_SEEN_RATINGS,
  SERIES_WANT_CHOICES,
  SERIES_WANT_QUESTION,
} from '@/src/features/intake/questions';
import { playTextureSelect } from '@/src/lib/haptics';
import { cn } from '@/src/lib/utils';

const BASE = SECTION_FINDING.map((q) => ({ name: q.name, required: true }));

export function FindingStep({ onDone }: { onDone: (answers: QuestionnaireAnswers) => void }) {
  const [answers, setAnswers] = useState<QuestionnaireAnswers>({});
  // Q10's "Yes" reveals the ratings; the rating is the answer, so Yes is local.
  // The two have to clear each other, or both read as selected and a screen
  // reader announces two chosen radios in one group.
  const [seen, setSeen] = useState(false);

  const chooseYes = () => {
    playTextureSelect();
    setSeen(true);
    if (answers.seriesSeen !== SERIES_NOT_SEEN) return;
    const { seriesSeen: _cleared, ...rest } = answers;
    setAnswers(rest);
  };

  const branched = answers.acquisitionSource === SERIES_BRANCH_VALUE;
  const items = [
    ...BASE,
    { name: 'seriesSeen', required: true, disabled: !branched },
    { name: 'seriesWantInApp', required: true, disabled: !branched },
  ];

  return (
    <SectionScreen
      eyebrow="Section 3 of 3 · Finding us"
      title="How you got here"
      mascot={MASCOT_MAP}
      says="Last few. This part is for us — it tells us where people like you are finding Xolace."
      questions={SECTION_FINDING}
      items={items}
      value={answers}
      onChange={(next) => {
        if (next.seriesSeen === SERIES_NOT_SEEN) setSeen(false);
        setAnswers(next);
      }}
      submitLabel="Done"
      onDone={onDone}
    >
      <Questionnaire.Item name="seriesSeen" required disabled={!branched}>
        <Questionnaire.Question>Have you seen the series?</Questionnaire.Question>
        <Questionnaire.Choices>
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: seen }}
            onPress={chooseYes}
            className={cn(
              'w-full rounded-xl border px-3.5 py-3',
              seen ? 'border-accent bg-accent/10' : 'border-border bg-surface'
            )}
          >
            <AppText className="text-base text-foreground font-[Poppins-Medium]">Yes</AppText>
          </Pressable>
          {seen
            ? SERIES_SEEN_RATINGS.map((choice) => (
                <View key={choice.value} className="pl-6">
                  <Questionnaire.Choice value={choice.value} label={choice.label} />
                </View>
              ))
            : null}
          <Questionnaire.Choice value={SERIES_NOT_SEEN} label="No, not yet" />
        </Questionnaire.Choices>
        <Questionnaire.Error />
      </Questionnaire.Item>

      <Questionnaire.Item name="seriesWantInApp" required disabled={!branched}>
        <Questionnaire.Question>{SERIES_WANT_QUESTION}</Questionnaire.Question>
        <Questionnaire.Choices>
          {SERIES_WANT_CHOICES.map((choice) => (
            <Questionnaire.Choice key={choice.value} value={choice.value} label={choice.label} />
          ))}
        </Questionnaire.Choices>
        <Questionnaire.Error />
      </Questionnaire.Item>
    </SectionScreen>
  );
}
