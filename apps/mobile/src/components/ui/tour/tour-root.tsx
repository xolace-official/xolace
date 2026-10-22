import { useMemo, useState } from "react";

import { Portal } from "heroui-native/portal";

import { TourOverlay } from "@/src/components/ui/tour/tour-overlay";
import { useBackHandler } from "@/src/components/ui/tour/use-back-handler";
import {
  DEFAULT_LABELS,
  DEFAULT_OVERLAY,
  DEFAULT_PADDING,
  DEFAULT_RADIUS,
  TourContext,
  type TourProps,
  type TourStepEntry,
} from "@/src/components/ui/tour/types";
import { useEffectiveReducedMotion } from "@/src/lib/motion/use-effective-reduced-motion";

/**
 * Tour — the walkthrough that introduces a screen one control at a time.
 *
 * It dims everything, cuts a hole around one control and puts a card beside
 * it, then moves the hole to the next control. What makes that work is the
 * hole: a caption alone has to describe where to look, and "the button at the
 * top right" is a sentence people read twice and still get wrong.
 *
 * ```tsx
 * <Tour open={onboarding} onOpenChange={setOnboarding}>
 *   <Tour.Step order={0} title="Your library" description="Everything you save lands here.">
 *     <IconButton icon={<BookmarkIcon />} onPress={openLibrary} />
 *   </Tour.Step>
 * </Tour>
 * ```
 *
 * A step wraps the control it is about, so the two live together in the tree
 * and cannot drift apart — a step whose target has been deleted goes with it
 * rather than pointing at empty space. `order` is what puts the steps in a
 * sequence, and it is the author's numbering rather than the tree's, because a
 * walkthrough usually crosses a header, a list and a tab bar in an order the
 * layout knows nothing about.
 */
export const TourRoot = ({
  children,
  open,
  defaultOpen = false,
  onOpenChange,
  step,
  defaultStep,
  onStepChange,
  onFinish,
  onSkip,
  padding = DEFAULT_PADDING,
  radius = DEFAULT_RADIUS,
  shape = "rect",
  placement = "auto",
  dismissible = true,
  showProgress = true,
  showSkip = true,
  interactive = false,
  overlayColor = DEFAULT_OVERLAY,
  labels,
  cardClassName,
}: TourProps) => {
  const [steps, setSteps] = useState<TourStepEntry[]>([]);
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const [internalStep, setInternalStep] = useState<number | null>(
    defaultStep ?? null,
  );
  const reducedMotion = useEffectiveReducedMotion();

  const isOpenControlled = open !== undefined;
  const isStepControlled = step !== undefined;
  const resolvedOpen = isOpenControlled ? open : internalOpen;

  const words = { ...DEFAULT_LABELS, ...labels };

  /*
   * Steps sort themselves by `order` rather than arriving in it, because the
   * tree decides when each one mounts and a tour that crosses a header, a list
   * and a tab bar mounts them in whatever order those render.
   *
   * Memoized because it is the context value every step subscribes to — the
   * one case React Compiler does not stabilize for us.
   */
  const context = useMemo(
    () => ({
      register: (entry: TourStepEntry) =>
        setSteps((current) =>
          [
            ...current.filter((other) => other.order !== entry.order),
            entry,
          ].sort((a, b) => a.order - b.order),
        ),
      unregister: (entry: TourStepEntry) =>
        setSteps((current) => current.filter((other) => other !== entry)),
    }),
    [],
  );

  const activeOrder = isStepControlled
    ? step
    : (internalStep ?? steps[0]?.order ?? null);
  const index = steps.findIndex((entry) => entry.order === activeOrder);
  const active = index >= 0 ? steps[index] : undefined;

  const setOpen = (next: boolean) => {
    if (!isOpenControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  const goTo = (order: number) => {
    onStepChange?.(order);
    if (!isStepControlled) setInternalStep(order);
  };

  // Reopening starts the tour over rather than resuming where it was ended.
  // Somebody who dismissed a walkthrough and asked for it again wants it from
  // the top; resuming a half-read tour is a state nobody asked to be in.
  // Adjusted during render rather than in an effect — the supported way to
  // reset state when a prop changes, and it avoids a frame on the old step.
  const [wasOpen, setWasOpen] = useState(resolvedOpen);
  if (wasOpen !== resolvedOpen) {
    setWasOpen(resolvedOpen);
    if (resolvedOpen && !isStepControlled) setInternalStep(defaultStep ?? null);
  }

  const finish = () => {
    setOpen(false);
    onFinish?.();
  };

  const skip = () => {
    setOpen(false);
    onSkip?.();
  };

  const next = () => {
    const following = steps[index + 1];
    if (following) goTo(following.order);
    else finish();
  };

  const back = () => {
    const previous = steps[index - 1];
    if (previous) goTo(previous.order);
  };

  useBackHandler(resolvedOpen && dismissible, skip);

  return (
    <TourContext.Provider value={context}>
      {children}
      {resolvedOpen && steps.length > 0 && (
        <Portal name="tour">
          <TourOverlay
            active={active}
            index={index}
            total={steps.length}
            isFirst={index <= 0}
            isLast={index === steps.length - 1}
            padding={padding}
            radius={radius}
            shape={shape}
            placement={placement}
            dismissible={dismissible}
            showProgress={showProgress}
            showSkip={showSkip}
            interactive={interactive}
            overlayColor={overlayColor}
            reducedMotion={reducedMotion}
            words={words}
            cardClassName={cardClassName}
            onNext={next}
            onBack={back}
            onSkip={skip}
          />
        </Portal>
      )}
    </TourContext.Provider>
  );
};

TourRoot.displayName = "Tour";
