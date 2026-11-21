import type { ComponentRef, ReactNode, RefObject } from "react";
import { ScrollView, type TextInput } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { cn } from "@/lib/cn";
import { FOR, LETTERS, STARTERS } from "../copy";
import { withStarter } from "../letters-model";
import { useWriteScreen } from "./write-data";

const ROW_HEIGHT = 30;
const CHIP_MAX_SCALE = 1.4;

export function ForChips() {
	const { state, actions } = useWriteScreen();
	return (
		<ChipRow label={LETTERS.write.for}>
			{FOR.map((f) => (
				<Chip
					key={f}
					label={f}
					on={state.forWho === f}
					onPress={() => actions.setForWho(f)}
				/>
			))}
		</ChipRow>
	);
}

export function StarterChips({
	input,
}: {
	input: RefObject<ComponentRef<typeof TextInput> | null>;
}) {
	const { state, actions } = useWriteScreen();
	return (
		<ChipRow label={LETTERS.write.startWith}>
			{STARTERS.map((s) => (
				<Chip
					key={s}
					label={s}
					onPress={() => {
						actions.setText(withStarter(state.text, s));
						input.current?.focus();
					}}
				/>
			))}
		</ChipRow>
	);
}

function ChipRow({ label, children }: { label: string; children: ReactNode }) {
	return (
		<ScrollView
			contentContainerClassName="items-center gap-1.5 pr-4 pl-6"
			horizontal
			keyboardShouldPersistTaps="handled"
			showsHorizontalScrollIndicator={false}
			style={{ flexGrow: 0, minHeight: ROW_HEIGHT }}
		>
			<AppText
				accessibilityRole="header"
				className="mr-1"
				color="subtle"
				maxFontSizeMultiplier={CHIP_MAX_SCALE}
				variant="detail"
			>
				{label}
			</AppText>
			{children}
		</ScrollView>
	);
}

function Chip({
	label,
	on,
	onPress,
}: {
	label: string;
	on?: boolean;
	onPress: () => void;
}) {
	return (
		<PressScale
			accessibilityRole="button"
			accessibilityState={on === undefined ? undefined : { selected: on }}
			className={cn(
				"min-h-[30px] justify-center rounded-full px-3",
				on ? "bg-foreground" : "bg-surface-secondary"
			)}
			onPress={onPress}
		>
			<AppText
				color={on ? "background" : "muted"}
				maxFontSizeMultiplier={CHIP_MAX_SCALE}
				variant="detail"
				weight={on ? "semibold" : undefined}
			>
				{label}
			</AppText>
		</PressScale>
	);
}
