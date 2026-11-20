import type { TalkPace } from "@xolace/backend/convex/lib/voices";
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { Rows, SettingsCard } from "@/components/settings-kit/parts";
import { AppText } from "@/components/shared/app-text";
import { Segmented } from "@/components/shared/segmented";
import { EASING, EaseView } from "@/design/ease";
import { loopProps } from "@/design/ease-loops";
import { MIRROR_COPY as C } from "@/features/settings/mirror/copy";
import type { TalkStyle } from "@/features/settings/mirror/mirror-data";
import type { VoiceSlug } from "@/features/settings/mirror/mirror-model";
import {
	DIRECTNESS_OPTIONS,
	PACE_OPTIONS,
} from "@/features/settings/mirror/talk-style-options";
import { StillOrb } from "@/features/settings/mirror/voice/still-orb";
import { playSoftPress } from "@/lib/haptics";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import type { Directness } from "@/lib/talk/use-talk-style";
import { TALK_CAST } from "@/lib/talk/voice-options";
import { useTokenColor } from "@/lib/use-token-color";

const DOT = 32;
const PULSE_MS = 2000;

function Pulse({ on, children }: { on: boolean; children: ReactNode }) {
	const reduced = useEffectiveReducedMotion();
	return (
		<EaseView
			key={`${on}-${reduced}`}
			{...loopProps({
				easing: EASING.inOutEase,
				from: { scale: 1 },
				periodMs: on ? PULSE_MS : 0,
				reduced,
				to: { scale: 0.82 },
			})}
		>
			{children}
		</EaseView>
	);
}

function Row({ label, children }: { label: string; children: ReactNode }) {
	return (
		<View className="gap-2.5 px-4 py-3.5">
			<AppText className="text-[15px] leading-5" variant="body" weight="medium">
				{label}
			</AppText>
			{children}
		</View>
	);
}

export function TalkCard({
	style,
	playing,
	onVoice,
	onPace,
	onDirectness,
}: {
	style: TalkStyle;
	playing: VoiceSlug | null;
	onVoice: (voice: VoiceSlug) => void;
	onPace: (pace: TalkPace) => void;
	onDirectness: (directness: Directness) => void;
}) {
	const ink = useTokenColor("foreground");
	return (
		<SettingsCard>
			<Rows>
				<Row key="voice" label={C.talkVoice}>
					<View accessibilityRole="radiogroup" className="flex-row gap-1">
						{TALK_CAST.map((v) => {
							const on = style.voice === v.value;
							return (
								<Pressable
									accessibilityLabel={v.label}
									accessibilityRole="radio"
									accessibilityState={{ checked: on }}
									className="flex-1 items-center gap-1.5 py-1"
									key={v.value}
									onPress={() => {
										playSoftPress();
										onVoice(v.value);
									}}
								>
									<Pulse on={playing === v.value}>
										<StillOrb
											id={`tv-${v.value}`}
											ring={on ? ink : undefined}
											ringGap={2.5}
											size={DOT}
											voice={v.value}
										/>
									</Pulse>
									<AppText
										className="text-[13.5px] leading-[18px]"
										variant="body"
										weight={on ? "bold" : "regular"}
									>
										{v.label}
									</AppText>
								</Pressable>
							);
						})}
					</View>
				</Row>
				<Row key="pace" label={C.pace}>
					<Segmented
						onChange={onPace}
						options={PACE_OPTIONS}
						value={style.pace}
					/>
				</Row>
				<Row key="directness" label={C.directness}>
					<Segmented
						onChange={onDirectness}
						options={DIRECTNESS_OPTIONS}
						value={style.directness}
					/>
				</Row>
			</Rows>
		</SettingsCard>
	);
}
