import { Activity } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, PressableFeedback, Skeleton, useThemeColor, useToast } from 'heroui-native';
import { SymbolView } from 'expo-symbols';
import { EaseView } from 'react-native-ease/uniwind';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/src/components/shared/app-text';
import { playSoftPress } from '@/src/lib/haptics';
import { PhotoStep } from './photo-step';
import { ReviewStep } from './review-step';
import { SetupProgress } from './setup-progress';
import { SpecialtyPicker } from './specialty-picker';
import { BioStep, NameStep } from './text-steps';
import { SETUP_STEPS, firstIncompleteStep, type SetupDraft } from './steps';
import { useXolacerSetup } from './use-xolacer-setup';

const FADE = { type: 'timing' as const, duration: 150 };
const CLOSE_ICON = { ios: 'xmark', android: 'close', web: 'close' } as const;

export function XolacerSetupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { toast } = useToast();
  const foreground = useThemeColor('foreground') as string;
  const setup = useXolacerSetup();

  const { draft, index, visible } = setup;
  const step = SETUP_STEPS[index];
  const blocking = firstIncompleteStep(draft);
  const isLastStep = index === SETUP_STEPS.length - 1;

  const handleAdvance = () => {
    playSoftPress();
    const save = setup.saveText();

    if (!isLastStep) {
      setup.goToStep(index + 1);
      save.catch(() => toast.show({ label: "Couldn't save that. Check your connection." }));
      return;
    }

    save
      .then(() => setup.publish())
      .then(() => {
        toast.show({ label: "You're on the roster." });
        router.back();
      })
      .catch(() => toast.show({ label: "Couldn't publish yet — something's missing." }));
  };

  if (setup.loading) return <SetupSkeleton />;

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top + 6 }}>
      <View className="flex-row items-center gap-2 px-4 pb-1">
        <PressableFeedback
          onPress={() => {
            playSoftPress();
            if (index === 0) router.back();
            else setup.goToStep(index - 1);
          }}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={index === 0 ? 'Close' : 'Previous step'}
        >
          <SymbolView
            name={index === 0 ? CLOSE_ICON : { ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
            size={20}
            tintColor={foreground}
          />
        </PressableFeedback>
      </View>

      <View className="px-5 pb-1">
        <SetupProgress draft={draft} blockingLabel={blocking?.missingLabel} />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pt-3 pb-6"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <EaseView
          animate={{ opacity: visible ? 1 : 0 }}
          transition={FADE}
          onTransitionEnd={setup.handleFadeComplete}
        >
          <AppText className="text-2xl font-semibold text-foreground">{step.title}</AppText>
          <AppText className="mt-1 text-[13px] leading-5 text-muted">
            {step.description}
          </AppText>
          <StepBodies setup={setup} />
        </EaseView>
      </ScrollView>

      <View
        className="border-t border-border/40 px-5 pt-3"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <Button onPress={handleAdvance} isDisabled={isLastStep && blocking !== null}>
          {isLastStep ? 'Publish profile' : 'Continue'}
        </Button>
      </View>
    </View>
  );
}

/**
 * Every step stays mounted inside an `Activity`; only the current one is
 * visible. Hidden steps keep their input state and cursor position, so moving
 * back and forth never costs a xolacer what they already typed.
 */
function StepBodies({ setup }: { setup: ReturnType<typeof useXolacerSetup> }) {
  const { draft, index, setField } = setup;

  return (
    <>
      {SETUP_STEPS.map((step, stepIndex) => (
        <Activity key={step.id} mode={stepIndex === index ? 'visible' : 'hidden'}>
          <StepBody id={step.id} draft={draft} setup={setup} setField={setField} />
        </Activity>
      ))}
    </>
  );
}

function StepBody({
  id,
  draft,
  setup,
  setField,
}: {
  id: (typeof SETUP_STEPS)[number]['id'];
  draft: SetupDraft;
  setup: ReturnType<typeof useXolacerSetup>;
  setField: (key: 'displayName' | 'bio', value: string) => void;
}) {
  if (id === 'photo') {
    return (
      <PhotoStep
        photoUrl={draft.photoUrl}
        uploading={setup.uploading}
        onPick={setup.pickPhoto}
      />
    );
  }
  if (id === 'name') {
    return (
      <NameStep value={draft.displayName} onChange={(next) => setField('displayName', next)} />
    );
  }
  if (id === 'bio') {
    return <BioStep value={draft.bio} onChange={(next) => setField('bio', next)} />;
  }
  if (id === 'specialties') {
    return (
      <SpecialtyPicker selected={draft.specialties} onToggle={setup.toggleSpecialty} />
    );
  }
  return <ReviewStep draft={draft} />;
}

function SetupSkeleton() {
  return (
    <View className="flex-1 gap-4 bg-background px-5 pt-24">
      <Skeleton className="h-2 w-full rounded-full" />
      <Skeleton className="h-8 w-3/5 rounded-lg" />
      <Skeleton className="h-4 w-4/5 rounded-lg" />
      <Skeleton className="h-32 w-32 self-center rounded-full" />
    </View>
  );
}
