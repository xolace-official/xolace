import { Pressable, useWindowDimensions, View } from "react-native";
import { Presets } from "react-native-pulsar";
import { AppText } from "@/components/shared/app-text";
import { BadgeArt } from "@/components/shared/badge-art";
import { Icon, type IconName } from "@/components/shared/icon";
import { useScheme } from "@/design/scheme";
import {
	type BadgeView,
	tileLabel,
} from "@/features/achievements/badges/badges-model";
import {
	openBadge,
	prepareBadge,
	useHeld,
} from "@/features/achievements/badges/held-store";
import {
	Tipped,
	usePressTip,
} from "@/features/achievements/badges/list/press-tip";
import { COPY } from "@/features/achievements/copy";
import { cn } from "@/lib/cn";
import { useTokenColor } from "@/lib/use-token-color";

const TILE_W = 92;
export const MEDALLION = 84;
const PIN_ICON = 11;
const PIN: IconName = { android: "keep", ios: "pin.fill" };

/** One medallion in a row (production's `Medallion`), with the press tip and the slot it flies from. */
export function BadgeTile({ badge }: { badge: BadgeView }) {
	const window = useWindowDimensions();
	const earned = badge.earnedAt !== undefined;
	const out = useHeld(
		(s) => s.out?.id === badge.id && s.out.slot && !s.out.opts.latest
	);
	const tip = usePressTip(
		MEDALLION / 2 + (TILE_W - MEDALLION) / 2,
		MEDALLION / 2,
		MEDALLION / 2
	);
	return (
		<Pressable
			accessibilityHint={COPY.list.openHint}
			accessibilityLabel={tileLabel(badge)}
			accessibilityRole="button"
			className={cn("items-center", out && "opacity-0")}
			onPress={() => {
				Presets.System.selection();
				openBadge(badge.id, window);
			}}
			onPressIn={(e) => {
				tip.onPressIn(e);
				prepareBadge(badge.id);
			}}
			onPressOut={tip.onPressOut}
			style={{ width: TILE_W }}
		>
			<Tipped id={badge.id} size={MEDALLION} tip={tip}>
				<BadgeArt
					lit={earned && !badge.art.unlit}
					size={MEDALLION}
					source={badge.art.source}
					thumbhash={badge.art.thumbhash}
				/>
				{badge.pinned ? <PinMark /> : null}
			</Tipped>
			<AppText
				center
				className="mt-1.5 px-0.5 text-[11.5px] leading-4"
				color={earned ? "foreground" : "subtle"}
				numberOfLines={2}
				variant="body"
			>
				{badge.title}
			</AppText>
			{badge.progress ? <SmallBar share={badge.progress.share} /> : null}
		</Pressable>
	);
}

/** The pin on a pinned badge's top-right: a 20 pt accent circle. */
function PinMark() {
	const dark = useScheme() === "dark";
	const ink = useTokenColor(dark ? "background" : "on-art");
	return (
		<View
			accessibilityElementsHidden
			className="absolute top-0 right-0 size-5 items-center justify-center rounded-full bg-accent"
			importantForAccessibility="no-hide-descendants"
		>
			<Icon color={ink} name={PIN} size={PIN_ICON} />
		</View>
	);
}

/** The ember bar under a ladder's next rung: 64 × 4 pt. */
function SmallBar({ share }: { share: number }) {
	return (
		<View className="mt-1.5 h-1 w-16 overflow-hidden rounded-full bg-separator">
			<View
				className="h-1 rounded-full bg-ember"
				style={{ width: `${share * 100}%` }}
			/>
		</View>
	);
}
