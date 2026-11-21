import { useState } from "react";
import { Pressable, useWindowDimensions, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { useScheme } from "@/design/scheme";
import { CardLight } from "@/features/settings/mirror/card/card-light";
import { CardLine } from "@/features/settings/mirror/card/card-line";
import {
	MIRROR_COPY as C,
	MIRROR_ICONS,
} from "@/features/settings/mirror/copy";
import {
	type CardInk,
	cardInk,
	cardName,
	type MirrorTone,
	toneById,
	type VoiceSlug,
	voiceById,
} from "@/features/settings/mirror/mirror-model";
import { cn } from "@/lib/cn";
import { playSoftPress } from "@/lib/haptics";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { useTokenColors } from "@/lib/use-token-color";

const HEIGHT = 318;
const GUTTER = 16;

const CHIP: Record<CardInk["chip"], string> = {
	"on-dark": "bg-on-art/18",
	"on-direct-dark": "bg-on-art/10",
	"on-light": "bg-mirror-on-light",
};
const EDGE: Record<NonNullable<CardInk["edge"]>, string> = {
	"on-dark": "border-on-art/8",
	"on-light": "border-mirror-on-light",
};

export function MirrorCard({
	shown,
	voice,
	playing,
	onHear,
}: {
	shown: MirrorTone;
	voice: VoiceSlug | null;
	playing: boolean;
	onHear: () => void;
}) {
	const w = useWindowDimensions().width - GUTTER * 2;
	const dark = useScheme() === "dark";
	const reduced = useEffectiveReducedMotion();
	const look = cardInk(shown, dark);
	const [ink, shadow] = useTokenColors([look.ink, "mirror-shadow"]);
	const t = toneById(shown);
	const [h, setH] = useState(HEIGHT);
	return (
		<View
			className="mx-4 rounded-[28px] border-continuous"
			onLayout={(e) => setH(e.nativeEvent.layout.height)}
			style={{ boxShadow: `0px 18px 40px -26px ${shadow}`, minHeight: HEIGHT }}
		>
			<View
				className={cn(
					"flex-1 overflow-hidden rounded-[28px] border border-continuous",
					look.edge ? EDGE[look.edge] : "border-transparent"
				)}
			>
				<CardLight dark={dark} h={h} reduced={reduced} shown={shown} w={w} />
				<View className="flex-1 px-5.25 pt-4.75 pb-4.25">
					<AppText
						className="text-[10.5px] leading-[13px] tracking-[1.26px] opacity-60"
						style={{ color: ink }}
						variant="caption"
						weight="bold"
					>
						{C.kicker}
					</AppText>
					<View
						className="mt-3 border-l-2 pl-2.5 opacity-72"
						style={{ borderLeftColor: ink }}
					>
						<AppText
							className="text-[13.5px] leading-[19px]"
							style={{ color: ink }}
							variant="body"
						>
							{C.entry}
						</AppText>
					</View>
					<View className="flex-1" />
					<CardLine ink={ink} reduced={reduced} shown={shown} />
					<View className="mt-4 flex-row items-end gap-3">
						<View className="flex-1 gap-px opacity-75">
							<AppText
								className="text-[13px] leading-[17px]"
								style={{ color: ink }}
								variant="body"
								weight="bold"
							>
								{cardName(shown)}
							</AppText>
							<AppText
								className="text-[12.5px] leading-[17px]"
								style={{ color: ink }}
								variant="body"
							>
								{t.desc}
							</AppText>
						</View>
						{voice ? (
							<Hear
								chip={CHIP[look.chip]}
								ink={ink}
								name={voiceById(voice).label}
								onPress={onHear}
								playing={playing}
							/>
						) : null}
					</View>
				</View>
			</View>
		</View>
	);
}

function Hear(p: {
	name: string;
	playing: boolean;
	ink: string;
	chip: string;
	onPress: () => void;
}) {
	return (
		<Pressable
			accessibilityLabel={p.playing ? C.stopA11y : C.hear(p.name)}
			accessibilityRole="button"
			className={cn(
				"h-8.5 flex-row items-center gap-1.5 rounded-full pr-3.25 pl-2.75",
				p.chip
			)}
			onPress={() => {
				playSoftPress();
				p.onPress();
			}}
		>
			<Icon
				color={p.ink}
				name={p.playing ? MIRROR_ICONS.stop : MIRROR_ICONS.play}
				size={p.playing ? 11 : 12}
			/>
			<AppText
				className="text-[13.5px] leading-[18px]"
				style={{ color: p.ink }}
				variant="body"
				weight="semibold"
			>
				{p.playing ? C.stop : C.hear(p.name)}
			</AppText>
		</Pressable>
	);
}
