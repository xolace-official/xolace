/** The shared letter pieces on one page, for the eye: paper, sheets, folds, seal, marks. */
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { ScopedTheme, type ThemeName } from "uniwind";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { NIGHT_VARIANT, themeVariant } from "@/design/themes";
import { FoldedLetter } from "../folded-letter";
import type { Light } from "../letter-paper";
import { LetterSheet } from "../letter-sheet";
import { ReceivedMark } from "../received-mark";
import { DRAFTS, RECEIVED_TEXT } from "./fixtures";

const STATUSES = ["waiting", "received", "acknowledged"] as const;

const THEME: Record<Light, ThemeName> = {
	day: themeVariant("default", "light"),
	dusk: themeVariant("default", "dark"),
	night: NIGHT_VARIANT,
};

/** The pieces under one light: Default's light (day), its dark (dusk), or Night. */
export function PiecesScreen({ light }: { light: Light }) {
	return (
		<ScopedTheme theme={THEME[light]}>
			<Pieces />
		</ScopedTheme>
	);
}

function Pieces() {
	const [split, setSplit] = useState(false);
	const [run, setRun] = useState(0);
	return (
		<ScrollView
			className="flex-1 bg-background"
			contentContainerClassName="gap-section py-section"
			contentInsetAdjustmentBehavior="automatic"
		>
			<Label text="Write sheet" />
			<LetterSheet size="write" text={DRAFTS.pass} />
			<Label text="Read sheet" />
			<LetterSheet size="read" text={RECEIVED_TEXT.warm} />
			<Label text="Folded: write, read (sealed)" />
			<FoldedLetter size="write" />
			<FoldedLetter size="read" split={split} />
			<View className="h-4" />
			<Label text="Folded: card, shelf, tile" />
			<View className="flex-row items-end gap-gutter px-gutter pb-3">
				<FoldedLetter size="card" split={split} />
				<FoldedLetter size="shelf" />
				<FoldedLetter size="tile" />
			</View>
			<Toggle
				label={split ? "Seal back" : "Split the seal"}
				onPress={() => setSplit((s) => !s)}
			/>
			<Label text="Received marks" />
			<View className="flex-row gap-module px-gutter" key={run}>
				{STATUSES.map((s) => (
					<View className="items-center gap-2" key={s}>
						<ReceivedMark ignite status={s} />
						<AppText color="muted" variant="caption">
							{s}
						</AppText>
					</View>
				))}
			</View>
			<Toggle label="Ignite again" onPress={() => setRun((n) => n + 1)} />
		</ScrollView>
	);
}

function Label({ text }: { text: string }) {
	return (
		<AppText className="px-gutter" color="muted" variant="overline">
			{text}
		</AppText>
	);
}

function Toggle({ label, onPress }: { label: string; onPress: () => void }) {
	return (
		<PressScale
			accessibilityRole="button"
			className="mx-gutter self-start rounded-row bg-surface px-gutter py-3"
			onPress={onPress}
		>
			<AppText variant="callout" weight="semibold">
				{label}
			</AppText>
		</PressScale>
	);
}
