import { Pressable, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import type { PlusStatus } from "@/features/purchases/plus-status";
import {
	MIRROR_COPY as C,
	MIRROR_ICONS,
} from "@/features/settings/mirror/copy";
import {
	type MirrorTone,
	orbA11y,
	type VoiceSlug,
	voiceLine,
} from "@/features/settings/mirror/mirror-model";
import { StillOrb } from "@/features/settings/mirror/voice/still-orb";
import { playSoftPress } from "@/lib/haptics";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { VOICE_OPTIONS, type VoiceValue } from "@/lib/talk/voice-options";
import { useTokenColor } from "@/lib/use-token-color";

const ORB = 54;

export function VoiceOrbs({
	plus,
	voice,
	focus,
	playing,
	tone,
	onTap,
	onSeePlus,
}: {
	plus: PlusStatus;
	voice: VoiceValue;
	focus: VoiceValue;
	playing: VoiceSlug | null;
	tone: MirrorTone;
	onTap: (id: VoiceValue) => void;
	onSeePlus: () => void;
}) {
	const ink = useTokenColor("foreground");
	const reduced = useEffectiveReducedMotion();
	const line = voiceLine(focus, tone, plus);
	return (
		<View>
			<View
				accessibilityRole="radiogroup"
				className="flex-row justify-between px-4.5"
			>
				{VOICE_OPTIONS.map((v) => {
					const on = voice === v.value;
					const lock = v.premium && plus === "free";
					return (
						<Pressable
							accessibilityLabel={orbA11y(v.value, plus)}
							accessibilityRole="radio"
							accessibilityState={{ checked: on }}
							className="w-15.5 items-center gap-2"
							key={v.value}
							onPress={() => {
								playSoftPress();
								onTap(v.value);
							}}
						>
							<View>
								<StillOrb
									id={`mv-${v.value}`}
									playing={playing === v.value}
									reduced={reduced}
									ring={on ? ink : undefined}
									shadow
									size={ORB}
									voice={v.value}
								/>
								{lock ? (
									<View className="absolute -right-0.75 -bottom-0.75 size-5 items-center justify-center rounded-full border border-separator bg-surface">
										<Icon
											color={ink}
											name={MIRROR_ICONS.lock}
											size={9}
											weight="semibold"
										/>
									</View>
								) : null}
							</View>
							<AppText
								className="text-[13px] leading-[17px]"
								variant="body"
								weight={on ? "bold" : "medium"}
							>
								{v.label}
							</AppText>
						</Pressable>
					);
				})}
			</View>
			<AppText
				className="min-h-10.5 pt-3.5 pr-8 pl-5 text-[13.5px] text-foreground/62 leading-[19.6px]"
				variant="body"
			>
				<AppText
					className="text-[13.5px] leading-[19.6px]"
					variant="body"
					weight="semibold"
				>
					{line.name}
				</AppText>{" "}
				{line.text}
				{line.seePlus ? (
					<AppText
						accessibilityRole="link"
						className="text-[13.5px] leading-[19.6px]"
						color="accent"
						onPress={onSeePlus}
						variant="body"
						weight="semibold"
					>
						{` ${C.seePlus}`}
					</AppText>
				) : null}
			</AppText>
		</View>
	);
}
