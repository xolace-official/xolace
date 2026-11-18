import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { useTokenColor } from "@/lib/use-token-color";
import { CHANNEL } from "../copy";

const WARNING = { android: "error", ios: "exclamationmark.circle" } as const;
const CARD_RADIUS = 24;

/** Where the broadcaster removed a post: one quiet line in the card's place, with nothing to hold
 * or react to. Stream keeps a removed message in the list, so this replaces the card. */
export function RemovedPost({ a11y, when }: { a11y: string; when: string }) {
	return (
		<View className="px-3.5 pb-3">
			<View
				accessibilityLabel={a11y}
				accessible
				className="flex-row items-center gap-2 border border-border border-continuous border-dashed px-4 py-3"
				style={{ borderRadius: CARD_RADIUS }}
			>
				<AppText className="flex-1" color="muted" italic variant="footnote">
					{CHANNEL.removed}
				</AppText>
				<AppText color="muted" variant="caption">
					{when}
				</AppText>
			</View>
		</View>
	);
}

/** In place of the reactions on a broadcast of yours that didn't send: what happened, and Stream's
 * resend. The hold overlay offers the same, with Delete. */
export function NotSent({ onResend }: { onResend: () => void }) {
	const danger = useTokenColor("danger-ink");
	return (
		<View className="flex-1 flex-row flex-wrap items-center gap-x-3 gap-y-1">
			<View className="flex-row items-center gap-1.5">
				<Icon color={danger} name={WARNING} size={13} />
				<AppText color="dangerInk" variant="footnote" weight="semibold">
					{CHANNEL.notSent}
				</AppText>
			</View>
			<PressScale
				accessibilityRole="button"
				className="min-h-8 justify-center rounded-full bg-surface-secondary px-3"
				onPress={onResend}
			>
				<AppText color="accentInk" variant="footnote" weight="semibold">
					{CHANNEL.resend}
				</AppText>
			</PressScale>
		</View>
	);
}
