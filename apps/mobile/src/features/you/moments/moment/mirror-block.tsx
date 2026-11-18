import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { MOMENTS_COPY } from "@/features/you/moments/copy";
import type { MomentView } from "@/features/you/moments/moments-model";
import { ToneChip } from "@/features/you/moments/tone-chip";
import { tap } from "@/lib/haptics";
import { useTokenColor } from "@/lib/use-token-color";

const M = MOMENTS_COPY.moment;
const PLAY = { android: "play_arrow", ios: "play.fill" } as const;
const PAUSE = { android: "pause", ios: "pause.fill" } as const;

/** The feeling words under the mirror, or alone on a moment that has none ("reflection" when
 * there's no feeling either). */
export function Words({ words }: { words: string[] }) {
	return (
		<View className="-mt-2.5 flex-row flex-wrap gap-2">
			{words.map((w) => (
				<View
					className="h-7.5 justify-center rounded-[15px] border-continuous bg-accent-wash px-3"
					key={w}
				>
					<AppText
						className="text-[13.5px]"
						color="accentInk"
						variant="footnote"
						weight="semibold"
					>
						{w}
					</AppText>
				</View>
			))}
		</View>
	);
}

/** A section's small caps label. */
export const Label = ({ children }: { children: string }) => (
	<AppText
		accessibilityRole="header"
		className="tracking-[1.2px]"
		color="muted"
		variant="caption"
		weight="bold"
	>
		{children}
	</AppText>
);

/** The mirror in its own voice, its tone, and its play button when it has a voice. */
export function MirrorBlock({
	moment,
	audio,
	onToggle,
}: {
	moment: MomentView;
	audio: { ready: boolean; playing: boolean };
	onToggle: () => void;
}) {
	const fg = useTokenColor("foreground");
	return (
		<View className="gap-2.5">
			<View className="min-h-10 flex-row items-center gap-2">
				<Label>{M.theMirror}</Label>
				{moment.tone ? <ToneChip tone={moment.tone} /> : null}
				<View className="flex-1" />
				{audio.ready ? (
					<PressScale
						accessibilityLabel={audio.playing ? M.pause : M.play}
						accessibilityRole="button"
						className="size-10 items-center justify-center rounded-full bg-surface-secondary"
						haptic={tap}
						onPress={onToggle}
					>
						<Icon color={fg} name={audio.playing ? PAUSE : PLAY} size={14} />
					</PressScale>
				) : null}
			</View>
			<AppText selectable variant="mirror">
				{moment.mirror}
			</AppText>
		</View>
	);
}
