import type { ReactNode } from "react";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Icon, type IconName } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { LinearGradient } from "@/components/shared/styled";
import { cn } from "@/lib/cn";
import { useTokenColor } from "@/lib/use-token-color";

const LOCK: IconName = { android: "lock", ios: "lock.fill" };
const LOCK_GLYPH = 9;
const THUMB = 52;
const ART_START = { x: 0.1, y: 0 };
const ART_END = { x: 0.9, y: 1 };

type Props = {
	title: string;
	sub?: string;
	/** The art's two gradient stops: content data (a track's colours), not theme colours. */
	art?: readonly [string, string];
	/** A real cover (production's art), drawn in the art's rounded box instead of the gradient. */
	cover?: ReactNode;
	locked?: boolean;
	onPress: () => void;
	/** Plays on press (`PressScale`'s `haptic`). */
	haptic?: () => void;
	trailing?: ReactNode;
	/** Thumbnail side in points; a prop, so it stays in `style`. */
	thumb?: number;
	className?: string;
};

/**
 * A list row with gradient art or a cover: search results, topics, On its own. Locked shows a small lock, never a grey-out.
 * @public The redesign's shared kit (F5), for the screen PRs.
 */
export function MediaRow({
	title,
	sub,
	art,
	cover,
	locked,
	onPress,
	haptic,
	trailing,
	thumb = THUMB,
	className,
}: Props) {
	const muted = useTokenColor("muted");
	return (
		<PressScale
			accessibilityLabel={`${title}${sub ? `. ${sub}` : ""}${locked ? ". Xolace+" : ""}`}
			className={cn(
				"flex-row items-center gap-3 border-separator border-b py-2.5",
				className
			)}
			haptic={haptic}
			onPress={onPress}
		>
			<View>
				{cover || !art ? (
					<View
						className="overflow-hidden rounded-[14px] border-continuous bg-surface-secondary"
						style={{ height: thumb, width: thumb }}
					>
						{cover}
					</View>
				) : (
					<LinearGradient
						className="rounded-[14px] border-continuous"
						colors={art}
						end={ART_END}
						start={ART_START}
						style={{ height: thumb, width: thumb }}
					/>
				)}
				{locked ? (
					<View className="absolute -right-1 -bottom-1 size-5 items-center justify-center rounded-full border border-separator bg-surface">
						<Icon color={muted} name={LOCK} size={LOCK_GLYPH} />
					</View>
				) : null}
			</View>
			<View className="flex-1 gap-0.5">
				<AppText numberOfLines={1} variant="subhead" weight="semibold">
					{title}
				</AppText>
				{sub ? (
					<AppText color="muted" numberOfLines={1} variant="footnote">
						{sub}
					</AppText>
				) : null}
			</View>
			{trailing}
		</PressScale>
	);
}

/**
 * "TOPIC", "ON ITS OWN": small spaced caps above a group of rows.
 * @public The redesign's shared kit (F5), for the screen PRs.
 */
export function Kicker({
	children,
	className,
}: {
	children: string;
	className?: string;
}) {
	return (
		<AppText
			className={cn("pt-4.5 pb-1 tracking-[1px]", className)}
			color="muted"
			variant="caption"
			weight="bold"
		>
			{children}
		</AppText>
	);
}
