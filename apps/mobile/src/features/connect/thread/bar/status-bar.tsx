import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { CtaButton } from "@/components/shared/cta-button";
import { PressScale } from "@/components/shared/press-scale";
import { THREAD } from "../copy";
import { useThreadScreen } from "../thread-data";
import type { StatusBar as Bar, Run } from "../thread-model";

/** A sentence with its bold words, centred in the bar. */
function Copy({ runs }: { runs: readonly Run[] }) {
	return (
		<AppText center color="muted" variant="footnote">
			{runs.map((r) =>
				r.bold ? (
					<AppText
						color="foreground"
						key={r.text}
						variant="footnote"
						weight="semibold"
					>
						{r.text}
					</AppText>
				) : (
					r.text
				)
			)}
		</AppText>
	);
}

/** The quiet second choice beside a CtaButton. */
function SecondPill({
	label,
	onPress,
}: {
	label: string;
	onPress: () => void;
}) {
	return (
		<PressScale
			accessibilityLabel={label}
			className="h-14 flex-1 items-center justify-center rounded-[28px] border-continuous bg-surface-secondary"
			onPress={onPress}
		>
			<AppText variant="body" weight="semibold">
				{label}
			</AppText>
		</PressScale>
	);
}

/** "How was this conversation?": a quiet link; the profile's rate card is the loud one. */
function RateLink({ label }: { label: string }) {
	const { actions } = useThreadScreen();
	return (
		<PressScale
			accessibilityLabel={label}
			className="min-h-11 items-center justify-center"
			onPress={actions.rate}
		>
			<AppText className="underline" color="muted" variant="footnote">
				{label}
			</AppText>
		</PressScale>
	);
}

/**
 * Takes the composer's place when a conversation can't take a message, and says what tapping
 * will do: accept or decline a request, wait on one, pick a resting chat back up, or find
 * someone else once it's closed.
 */
export function StatusBar({ bar }: { bar: Bar }) {
	const { actions } = useThreadScreen();
	if (bar.kind === "composer") {
		return null;
	}
	return (
		<View className="gap-3 border-separator border-t bg-background px-4 pt-3.5 pb-safe-or-4">
			{bar.kind === "holding" ? (
				<View className="h-14" />
			) : (
				<Copy runs={bar.copy} />
			)}
			{bar.kind === "accept" ? (
				<View className="flex-row gap-2.5">
					<View className="flex-1">
						<CtaButton label={THREAD.bar.accept} onPress={actions.accept} />
					</View>
					<SecondPill label={THREAD.bar.decline} onPress={actions.decline} />
				</View>
			) : null}
			{bar.kind === "resume" ? (
				<CtaButton label={THREAD.bar.resume} onPress={actions.resume} />
			) : null}
			{bar.kind === "closed" && bar.findAnother ? (
				<View className="flex-row">
					<SecondPill
						label={THREAD.bar.findAnother}
						onPress={actions.findAnother}
					/>
				</View>
			) : null}
			{(bar.kind === "resume" || bar.kind === "closed") && bar.rate ? (
				<RateLink label={bar.rate} />
			) : null}
		</View>
	);
}
