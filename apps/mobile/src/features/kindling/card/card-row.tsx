import { ActivityIndicator } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { cn } from "@/lib/cn";
import { useTokenColor } from "@/lib/use-token-color";
import { COPY } from "../copy";

const MAIN =
	"h-12.5 flex-1 flex-row items-center justify-center gap-2 rounded-full bg-accent";

export function WaitingRow({
	action,
	matching,
	onSkip,
	onAct,
}: {
	action: string;
	matching: boolean;
	onSkip: () => void;
	onAct: () => void;
}) {
	const onViolet = useTokenColor("accent-foreground");
	return (
		<>
			<PressScale
				className={cn(
					"h-12.5 justify-center rounded-full bg-surface-secondary px-5",
					matching && "opacity-40"
				)}
				disabled={matching}
				onPress={onSkip}
			>
				<AppText numberOfLines={1} variant="callout" weight="semibold">
					{COPY.notForMe}
				</AppText>
			</PressScale>
			<PressScale
				accessibilityState={{ busy: matching, disabled: matching }}
				className={MAIN}
				disabled={matching}
				onPress={onAct}
			>
				{matching ? <ActivityIndicator color={onViolet} size="small" /> : null}
				<AppText
					className="text-[16px]"
					color="accentForeground"
					numberOfLines={1}
					variant="callout"
					weight="semibold"
				>
					{matching ? COPY.finding : action}
				</AppText>
			</PressScale>
		</>
	);
}

export function TendedRow({
	again,
	onAgain,
}: {
	again: string | null;
	onAgain: () => void;
}) {
	return (
		<>
			<AppText
				className="flex-1"
				color="emberInk"
				numberOfLines={1}
				variant="callout"
				weight="semibold"
			>
				{`✓ ${COPY.tended}`}
			</AppText>
			{again ? <SmallPill label={again} onPress={onAgain} /> : null}
		</>
	);
}

export function PassedRow({ onUndo }: { onUndo?: () => void }) {
	return (
		<>
			<AppText
				className="flex-1"
				color="muted"
				numberOfLines={1}
				variant="callout"
				weight="semibold"
			>
				{COPY.passed}
				{onUndo ? null : (
					<AppText color="subtle" variant="callout" weight="medium">
						{` · ${COPY.notForYou}`}
					</AppText>
				)}
			</AppText>
			{onUndo ? <SmallPill accent label={COPY.undo} onPress={onUndo} /> : null}
		</>
	);
}

export function FinishRow({ onBack }: { onBack: () => void }) {
	return (
		<PressScale className={MAIN} onPress={onBack}>
			<AppText
				className="text-[16px]"
				color="accentForeground"
				numberOfLines={1}
				variant="callout"
				weight="semibold"
			>
				{COPY.all.back}
			</AppText>
		</PressScale>
	);
}

function SmallPill({
	label,
	onPress,
	accent,
}: {
	label: string;
	onPress: () => void;
	accent?: boolean;
}) {
	return (
		<PressScale
			className="h-11 justify-center rounded-full bg-surface-secondary px-4.5"
			onPress={onPress}
		>
			<AppText
				className="text-[14.5px]"
				color={accent ? "accent" : "foreground"}
				numberOfLines={1}
				variant="callout"
				weight="semibold"
			>
				{label}
			</AppText>
		</PressScale>
	);
}
