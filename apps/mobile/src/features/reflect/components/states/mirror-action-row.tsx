import type { ClaimStrength } from "@xolace/backend/convex/ai/routing";
import { Button, LinkButton, PressableFeedback } from "heroui-native";
import { View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { AppText } from "@/src/components/shared/app-text";
import { playAffirmativePress } from "@/src/lib/haptics";

type Props = {
	/** Derived server-side; "reaching"/"holding" means this mirror named a gap. */
	claimStrength: ClaimStrength | null;
	/** Refinement turns are exhausted — the row collapses to "That's it". */
	atCap: boolean;
	/** False hides only "Say more": a talk with too little talk time left to reopen. */
	sayMore?: boolean;
	onThatsIt: () => void;
	onNotQuite: () => void;
	onSayMore: () => void;
};

const EASING: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];
const EASE_INITIAL_SLIDE = { opacity: 0, translateY: 20 };
const EASE_ANIMATE_SLIDE = { opacity: 1, translateY: 0 };
// The 200/400/600 stagger runs top-down over the action row's hierarchy:
// That's it, then Say more, then Not quite. At the cap only the first renders,
// at the same delay as any other mirror — the wall is a fact of that mirror,
// not an event done to the user, so nothing animates out.
const EASE_THATSIT_TRANSITION = {
	delay: 200,
	duration: 400,
	easing: EASING,
	type: "timing" as const,
};
const EASE_SAYMORE_TRANSITION = {
	delay: 400,
	duration: 400,
	easing: EASING,
	type: "timing" as const,
};
const EASE_NOTQUITE_TRANSITION = {
	delay: 600,
	duration: 400,
	easing: EASING,
	type: "timing" as const,
};

export const MirrorActionRow = ({
	claimStrength,
	atCap,
	sayMore = true,
	onThatsIt,
	onNotQuite,
	onSayMore,
}: Props) => {
	// The mirror named a gap in the input, so more input is the move that helps.
	const reached = claimStrength === "reaching" || claimStrength === "holding";

	return (
		<View className="mt-14 gap-3">
			<EaseView
				animate={EASE_ANIMATE_SLIDE}
				initialAnimate={EASE_INITIAL_SLIDE}
				transition={EASE_THATSIT_TRANSITION}
			>
				<Button
					accessibilityLabel="That's it"
					accessibilityRole="button"
					className="w-full"
					onPress={() => {
						playAffirmativePress();
						onThatsIt();
					}}
					size="lg"
					variant="primary"
				>
					<Button.Label className="font-semibold">That&apos;s it</Button.Label>
				</Button>
			</EaseView>

			{/* Never rendered at the cap: "Say more" there is an affordance whose
          only outcome is rejection. */}
			{!atCap && (
				<>
					{sayMore && (
						<EaseView
							animate={EASE_ANIMATE_SLIDE}
							initialAnimate={EASE_INITIAL_SLIDE}
							transition={EASE_SAYMORE_TRANSITION}
						>
							<View>
								<PressableFeedback
									accessibilityHint={
										reached
											? "Recommended: add more so the mirror has something to work with"
											: undefined
									}
									accessibilityLabel="Say more"
									accessibilityRole="button"
									className="h-14 w-full flex-row items-center justify-center rounded-4xl border border-accent/60 px-5"
									onPress={onSayMore}
								>
									<AppText className="font-medium text-accent text-lg">
										Say more
									</AppText>
								</PressableFeedback>
								{/* Sits ON the border, masking the line beneath it with the
                  ancestor's own token so it reads as part of the border.
                  Assumes the row is on --background (see doc §6). */}
								{reached && (
									<View
										className="absolute -top-2 right-6 rounded-full bg-background px-1.5"
										pointerEvents="none"
									>
										<AppText className="text-[10px] text-accent uppercase tracking-widest">
											Recommended
										</AppText>
									</View>
								)}
							</View>
						</EaseView>
					)}

					<EaseView
						animate={EASE_ANIMATE_SLIDE}
						initialAnimate={EASE_INITIAL_SLIDE}
						transition={EASE_NOTQUITE_TRANSITION}
					>
						<LinkButton className="self-center" onPress={onNotQuite} size="md">
							<LinkButton.Label className="text-foreground/55">
								Not quite
							</LinkButton.Label>
						</LinkButton>
					</EaseView>
				</>
			)}
		</View>
	);
};
