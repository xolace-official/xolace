import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { Segmented } from "@/components/shared/segmented";
import { cn } from "@/lib/cn";
import { playTextureSelect } from "@/lib/haptics";
import { COPY } from "../copy";
import { LAYOUT } from "../layout";
import { useReflect } from "../reflect-data";
import {
	MAX_TEXTURES,
	TEXTURE_SET_IDS,
	TEXTURE_SET_LABELS,
	TEXTURE_SETS,
} from "../texture-sets";

const CHIP = { height: LAYOUT.texture.chip };
const SETS = TEXTURE_SET_IDS.map((id) => ({
	id,
	label: TEXTURE_SET_LABELS[id],
}));
/** The chips keep their height; past this their words would outgrow it. */
const MAX_SCALE = 1.4;

/**
 * "Or just tap what feels close" (production's texture band, S18d): four sets, up to four
 * words. A fifth tap says "Four is plenty". Picked words show as ember chips under the question
 * and go out with the text. `onUse` runs on every tap in the band.
 */
export function TexturePicker({ onUse }: { onUse?: () => void }) {
	const { state, actions } = useReflect();
	const { set, picks } = state;
	const full = picks.length >= MAX_TEXTURES;

	return (
		<View className="gap-3">
			<AppText className="pl-1" color="muted" variant="detail">
				{COPY.write.tapClose}
			</AppText>
			<Segmented
				onChange={(next) => {
					onUse?.();
					actions.setSet(next);
				}}
				options={SETS}
				value={set}
			/>
			<View
				className="flex-row flex-wrap"
				style={{ gap: LAYOUT.texture.chipGap }}
			>
				{TEXTURE_SETS[set].map((word) => {
					const on = picks.includes(word);
					return (
						<PressScale
							accessibilityLabel={word}
							accessibilityRole="button"
							accessibilityState={{ selected: on }}
							// Production's texture band: at the cap the unpicked words dim to 35%.
							className={cn(
								"justify-center rounded-full border px-3.5",
								on
									? "border-transparent bg-ember-wash"
									: "border-separator bg-surface",
								full && !on && "opacity-35"
							)}
							haptic={playTextureSelect}
							key={word}
							onPress={() => {
								onUse?.();
								actions.togglePick(word);
							}}
							style={CHIP}
						>
							<AppText
								className="text-[14px]"
								color={on ? "emberInk" : "foreground"}
								maxFontSizeMultiplier={MAX_SCALE}
								variant="callout"
								weight="medium"
							>
								{word}
							</AppText>
						</PressScale>
					);
				})}
			</View>
		</View>
	);
}
