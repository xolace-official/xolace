import { Pressable, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Card } from "@/components/shared/card";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { cn } from "@/lib/cn";
import { useTokenColor } from "@/lib/use-token-color";
import type { PostReaction } from "../channel-model";
import { CHANNEL } from "../copy";
import { usePost } from "./use-post";

const PLUS = { android: "add", ios: "plus" } as const;
const CARD_RADIUS = 24;

/**
 * One announcement as the prototype's card (`channel-screen.tsx`): title, body, the reactions
 * people left and a "+" for yours. Replaces Stream's bubble (`MessageItemView`), so the list,
 * paging, read state and the hold overlay stay Stream's.
 */
export function PostCard() {
	const { anchor, hold, toggle, view } = usePost();
	const muted = useTokenColor("muted");
	return (
		<View className="px-3.5 pb-3">
			{/* Stream types its anchor against its own RN types; it is a plain View ref. */}
			<View ref={anchor as never}>
				<Card className="gap-2 p-4" flat radius={CARD_RADIUS}>
					{/* The words are the hold target and one VoiceOver stop; the reactions stay
					    their own buttons beside it (a pressable parent would swallow them). */}
					<Pressable
						accessibilityActions={[{ label: CHANNEL.add, name: "longpress" }]}
						accessibilityLabel={view.a11y}
						className="gap-2"
						onAccessibilityAction={() => hold()}
						onLongPress={hold}
					>
						{view.title ? (
							<AppText variant="headline">{view.title}</AppText>
						) : null}
						{view.body ? (
							<AppText
								className="leading-[22px]"
								color="muted"
								variant="callout"
							>
								{view.body}
							</AppText>
						) : null}
					</Pressable>
					<View className="flex-row flex-wrap items-center gap-2 pt-1.5">
						{view.reactions.map((r) => (
							<ReactionChip
								key={r.type}
								onPress={() => toggle(r.type)}
								reaction={r}
							/>
						))}
						<PressScale
							accessibilityLabel={CHANNEL.add}
							accessibilityRole="button"
							className="size-8 items-center justify-center rounded-full bg-surface-secondary"
							onPress={() => hold()}
						>
							<Icon color={muted} name={PLUS} size={12} />
						</PressScale>
						{/* Already in the post's label. */}
						<AppText
							accessibilityElementsHidden
							className="ml-auto"
							color="muted"
							importantForAccessibility="no"
							variant="caption"
						>
							{view.when}
						</AppText>
					</View>
				</Card>
			</View>
		</View>
	);
}

function ReactionChip({
	reaction: r,
	onPress,
}: {
	reaction: PostReaction;
	onPress: () => void;
}) {
	return (
		<PressScale
			accessibilityHint={r.hint}
			accessibilityLabel={r.a11y}
			accessibilityRole="button"
			accessibilityState={{ selected: r.mine }}
			className={cn(
				"min-h-8 flex-row items-center gap-1 rounded-[16px] px-2.5 py-1",
				r.mine ? "bg-accent-wash" : "bg-surface-secondary"
			)}
			onPress={onPress}
		>
			<AppText variant="callout">{r.emoji}</AppText>
			{/* Plain text, not the kit's RollingNumber: its SwiftUI host escapes the list's clip
			    and floats over the header once the card scrolls under it. */}
			<AppText className="tabular-nums" variant="footnote" weight="semibold">
				{r.count}
			</AppText>
		</PressScale>
	);
}
