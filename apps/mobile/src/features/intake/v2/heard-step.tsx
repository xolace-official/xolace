// `heard`: what Flux took from the answer, as chips. Until the answer is read (#704), and
// whenever reading fails, it is the plain pick-list: every chip, none on. What Flux only
// half-read is outlined, still off: a guess to tap on, never one made for them.
import { Button, PressableFeedback } from "heroui-native";
import { ScrollView, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Flux } from "@/features/intake/v2/flux";
import {
	CHIP_GROUPS,
	type Chip,
	echoOf,
	type Heard,
	heardNothing,
	isOn,
} from "@/features/intake/v2/heard";
import type { HeardSource } from "@/features/intake/v2/machine";
import { playSoftPress } from "@/lib/haptics";
import { cn } from "@/lib/utils";

const FLUX_SIZE = 80;

type Props = {
	answer: string;
	heard: Heard;
	onConfirm: () => void;
	onSayAgain: () => void;
	onToggle: (chip: Chip) => void;
	read: HeardSource | null;
	/** What the model read, before any tap: only these can show as dropped. */
	readAs: Heard;
	/** What the model half-read: outlined while off. */
	suggested: Heard;
};

export function HeardStep({
	answer,
	heard,
	onConfirm,
	onSayAgain,
	onToggle,
	read,
	readAs,
	suggested,
}: Props) {
	const readByModel = read === "model";
	const guessed = !heardNothing(suggested);

	return (
		<View className="flex-1">
			<ScrollView
				className="flex-1 overflow-hidden"
				contentContainerClassName="px-6 pt-5 pb-6"
				showsVerticalScrollIndicator={false}
			>
				<View className="flex-row items-center gap-3">
					<Flux mood="warm" size={FLUX_SIZE} />
					<View className="flex-1">
						<AppText className="font-[Poppins-SemiBold] text-[12px] text-ember uppercase tracking-[1.7px]">
							Here&apos;s what I heard
						</AppText>
						<AppText
							accessibilityRole="header"
							className="mt-1.5 font-[Poppins-SemiBold] text-[24px] text-foreground leading-[28px]"
						>
							{readByModel
								? "Tap anything that's off."
								: "Tap anything that fits."}
						</AppText>
					</View>
				</View>

				<View className="mt-[18px] border-ember border-l-2 pl-3">
					<AppText className="font-[Poppins-Regular] text-[14px] text-foreground/80 leading-5">
						From &ldquo;{echoOf(answer)}&rdquo;
					</AppText>
				</View>

				{guessed ? (
					<AppText className="mt-2 font-[Poppins-Regular] text-[13px] text-muted leading-5">
						The outlined ones are my best guess.
					</AppText>
				) : null}

				<View className="mt-[18px] gap-[18px]">
					{CHIP_GROUPS.map((group) => (
						<View className="gap-2" key={group.label}>
							<AppText className="font-[Poppins-Regular] text-[13px] text-muted">
								{group.label}
							</AppText>
							<View className="flex-row flex-wrap gap-2">
								{group.chips.map((chip) => {
									const on = isOn(heard, chip);
									// Struck through only when Flux read it and the user dropped it.
									const dropped = !on && isOn(readAs, chip);
									const hinted = !on && isOn(suggested, chip);
									return (
										// A toggle chip, not a button.
										<PressableFeedback
											accessibilityHint={hinted ? "Flux's guess" : undefined}
											accessibilityRole="button"
											accessibilityState={{ selected: on }}
											className={cn(
												"min-h-10 justify-center rounded-full border px-3.5 py-2",
												on && "border-accent bg-accent/20",
												// Dashed like every chip that's off, so only a filled one reads as on.
												hinted && "border-accent/70 border-dashed",
												!(on || hinted) && "border-border border-dashed"
											)}
											key={`${chip.field}:${chip.value}`}
											onPress={() => {
												playSoftPress();
												onToggle(chip);
											}}
										>
											<AppText
												className={cn(
													"font-[Poppins-Medium] text-[14px]",
													on || hinted ? "text-foreground" : "text-muted",
													dropped && "line-through"
												)}
											>
												{chip.label}
											</AppText>
										</PressableFeedback>
									);
								})}
							</View>
						</View>
					))}
				</View>

				<View className="mt-[22px] rounded-[14px] bg-surface-secondary px-3.5 py-3">
					<AppText className="font-[Poppins-Regular] text-[13px] text-muted leading-5">
						This only shapes your first reflection.
					</AppText>
				</View>
			</ScrollView>

			<View className="gap-1 px-6 pt-2 pb-2">
				<Button
					onPress={() => {
						playSoftPress();
						onConfirm();
					}}
				>
					<Button.Label>That&apos;s me</Button.Label>
				</Button>
				<Button onPress={onSayAgain} variant="ghost">
					<Button.Label>Say it again</Button.Label>
				</Button>
			</View>
		</View>
	);
}
