import { Portal } from "heroui-native/portal";
import { useMemo, useState } from "react";

import { TourOverlay } from "@/components/ui/tour/tour-overlay";
import {
	DEFAULT_LABELS,
	DEFAULT_OVERLAY,
	DEFAULT_PADDING,
	DEFAULT_RADIUS,
	TourContext,
	type TourProps,
	type TourStepEntry,
} from "@/components/ui/tour/types";
import { useBackHandler } from "@/components/ui/tour/use-back-handler";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";

/** Tour: dims the screen, cuts a hole around one control and puts a card beside it. Steps wrap
 * their targets. */
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
		defaultStep ?? null
	);
	const reducedMotion = useEffectiveReducedMotion();

	const isOpenControlled = open !== undefined;
	const isStepControlled = step !== undefined;
	const resolvedOpen = isOpenControlled ? open : internalOpen;

	const words = { ...DEFAULT_LABELS, ...labels };

	// Steps sort by `order` since the tree mounts them in render order. Memoized: it is
	// the context value every step subscribes to.
	const context = useMemo(
		() => ({
			register: (entry: TourStepEntry) =>
				setSteps((current) =>
					[
						...current.filter((other) => other.order !== entry.order),
						entry,
					].sort((a, b) => a.order - b.order)
				),
			unregister: (entry: TourStepEntry) =>
				setSteps((current) => current.filter((other) => other !== entry)),
		}),
		[]
	);

	const activeOrder = isStepControlled
		? step
		: (internalStep ?? steps[0]?.order ?? null);
	const index = steps.findIndex((entry) => entry.order === activeOrder);
	const active = index >= 0 ? steps[index] : undefined;

	const setOpen = (next: boolean) => {
		if (!isOpenControlled) {
			setInternalOpen(next);
		}
		onOpenChange?.(next);
	};

	const goTo = (order: number) => {
		onStepChange?.(order);
		if (!isStepControlled) {
			setInternalStep(order);
		}
	};

	// Reopening restarts from the top. Adjusted during render, not in an effect, so
	// the old step never gets a frame.
	const [wasOpen, setWasOpen] = useState(resolvedOpen);
	if (wasOpen !== resolvedOpen) {
		setWasOpen(resolvedOpen);
		if (resolvedOpen && !isStepControlled) {
			setInternalStep(defaultStep ?? null);
		}
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
		if (following) {
			goTo(following.order);
		} else {
			finish();
		}
	};

	const back = () => {
		const previous = steps[index - 1];
		if (previous) {
			goTo(previous.order);
		}
	};

	useBackHandler(resolvedOpen && dismissible, skip);

	return (
		<TourContext.Provider value={context}>
			{children}
			{resolvedOpen && steps.length > 0 && (
				<Portal name="tour">
					<TourOverlay
						active={active}
						cardClassName={cardClassName}
						dismissible={dismissible}
						index={index}
						interactive={interactive}
						isFirst={index <= 0}
						isLast={index === steps.length - 1}
						onBack={back}
						onNext={next}
						onSkip={skip}
						overlayColor={overlayColor}
						padding={padding}
						placement={placement}
						radius={radius}
						reducedMotion={reducedMotion}
						shape={shape}
						showProgress={showProgress}
						showSkip={showSkip}
						total={steps.length}
						words={words}
					/>
				</Portal>
			)}
		</TourContext.Provider>
	);
};

TourRoot.displayName = "Tour";
