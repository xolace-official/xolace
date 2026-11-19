import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { type DoorId, HOME } from "@/features/explore/copy";
import { HOME_S } from "@/features/explore/explore-style";
import { useHome } from "@/features/explore/home/home-data";
import { useTokenColors } from "@/lib/use-token-color";

/** Production's tints (`bg-browse-*`); Lantern shares Topics', as it did on the old hub. */
const TINT: Record<DoorId, { bg: string; fg: number }> = {
	lantern: { bg: "bg-browse-topics", fg: 2 },
	music: { bg: "bg-browse-music", fg: 1 },
	support: { bg: "bg-browse-audio", fg: 0 },
	topics: { bg: "bg-browse-topics", fg: 2 },
};

const D = HOME_S.door;

/**
 * The four doors (handoff §4), kept from production: 58 pt squircles in their tints, each opening
 * its own screen (the two lists, Lantern, Topics).
 */
export function Doors() {
	const { actions } = useHome();
	const fg = useTokenColors([
		"browse-audio-foreground",
		"browse-music-foreground",
		"browse-topics-foreground",
	]);
	return (
		<View
			className="flex-row justify-between"
			style={{ paddingHorizontal: HOME_S.gutter }}
		>
			{HOME.doors.map((d) => (
				<PressScale
					accessibilityLabel={d.label}
					className="items-center gap-1.75"
					key={d.id}
					onPress={() => actions.door(d.id)}
					style={{ width: D.w }}
				>
					<View
						className={`items-center justify-center border-continuous ${TINT[d.id].bg}`}
						style={{ borderRadius: D.r, height: D.size, width: D.size }}
					>
						<Icon
							color={fg[TINT[d.id].fg]}
							name={{ android: d.android, ios: d.ios }}
							size={D.glyph}
						/>
					</View>
					<AppText
						center
						className="text-[12.5px] leading-[15px]"
						variant="caption"
						weight="semibold"
					>
						{d.label}
					</AppText>
				</PressScale>
			))}
		</View>
	);
}
