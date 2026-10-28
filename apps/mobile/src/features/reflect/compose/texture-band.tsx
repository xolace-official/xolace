import { TagGroup } from "heroui-native";
import { useState } from "react";
import { View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { AppText } from "@/components/shared/app-text";
import { Tour } from "@/components/ui/tour";
import { posthog } from "@/config/posthog";
import { NIGHT_TEXTURE_WORDS } from "@/features/night-mode/night-copy";
import { TextureSetTabs } from "@/features/reflect/components/texture-set-tabs";
import {
	MAX_TEXTURES,
	resolveTextureSetId,
	TEXTURE_PILL,
	TEXTURE_SETS,
	type TextureSetId,
	textureHue,
} from "@/features/reflect/texture-sets";
import type { ReflectionAction } from "@/features/reflect/types";
import { TOUR_STEPS } from "@/features/reflect-tour/tour-copy";
import { playSoftPress, playTextureSelect } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/store";

/**
 * Per-pill tilt and nudge. Classes, not style (`TagGroup.Item` drops style).
 */
const SCATTER = [
	"-rotate-2",
	"rotate-1 mt-1 ml-1",
	"rotate-3 mt-0.5",
	"-rotate-1 mt-1.5 ml-2",
	"rotate-2 mt-0.5",
	"-rotate-3 mt-1 ml-1",
	"rotate-1",
	"-rotate-2 mt-1 ml-2",
];

const PILL = "border";

/**
 * Past ~1.3x the pills wrap into the mic; the cap bounds the band's height for the surround's gap.
 */
const MAX_PILL_FONT_SCALE = 1.3;

const WORDS_FADE_OUT = { duration: 150, type: "timing" as const };
const WORDS_FADE_IN = { duration: 200, type: "timing" as const };

type Props = {
	isNight: boolean;
	selectedTextures: string[];
	dispatch: React.Dispatch<ReflectionAction>;
};

/** Tap the words that fit instead of writing. Lifted from the old idle screen (#256). */
export const TextureBand = ({ isNight, selectedTextures, dispatch }: Props) => {
	const storedSetId = useAppStore((s) => s.textureSetId);
	const setTextureSetId = useAppStore((s) => s.setTextureSetId);
	const safeSetId = resolveTextureSetId(storedSetId);

	const [wordsVisible, setWordsVisible] = useState(true);
	const [pendingSetId, setPendingSetId] = useState<TextureSetId>(safeSetId);
	const [resolvedSetId, setResolvedSetId] = useState<TextureSetId>(safeSetId);

	const TEXTURE_WORDS: readonly string[] = isNight
		? NIGHT_TEXTURE_WORDS
		: (TEXTURE_SETS[resolvedSetId] ?? TEXTURE_SETS.flat);

	const selectedTextureKeys = new Set(selectedTextures);
	const wordsFadeAnimate = { opacity: wordsVisible ? 1 : 0 };

	const atCap = selectedTextures.length >= MAX_TEXTURES;

	const handleToggle = (word: string) => {
		playTextureSelect();
		dispatch({ type: "TOGGLE_TEXTURE", word });
	};

	const handleSelectionChange = (keys: Set<string | number>) => {
		const next = new Set(keys);
		for (const word of TEXTURE_WORDS) {
			const isSelected = selectedTextures.includes(word);
			const shouldBeSelected = next.has(word);
			if (isSelected === shouldBeSelected) {
				continue;
			}
			// At the cap the reducer refuses the add, so no haptic promising one.
			if (!isSelected && atCap) {
				continue;
			}
			handleToggle(word);
		}
	};

	const handleSetChange = (id: TextureSetId) => {
		if (id === resolvedSetId) {
			return;
		}
		dispatch({ type: "CLEAR_TEXTURES" });
		setTextureSetId(id);
		setPendingSetId(id);
		setWordsVisible(false);
		playSoftPress();
		posthog.capture("texture_set_changed", { from: resolvedSetId, to: id });
	};

	return (
		// The surround measures this frame and holds the mic off it, so padding is just padding.
		<View className="px-6 pt-4 pb-6">
			<AppText
				className="mb-3 text-foreground/30 text-xs"
				maxFontSizeMultiplier={MAX_PILL_FONT_SCALE}
			>
				Or just tap what feels close:
			</AppText>

			{!isNight && (
				<TextureSetTabs
					activeSet={resolvedSetId}
					disabled={!wordsVisible}
					onSelect={handleSetChange}
				/>
			)}

			<Tour.Step
				description={TOUR_STEPS[2].description}
				order={2}
				title={TOUR_STEPS[2].title}
			>
				<EaseView
					animate={wordsFadeAnimate}
					onTransitionEnd={({ finished }) => {
						if (finished && !wordsVisible) {
							setResolvedSetId(pendingSetId);
							setWordsVisible(true);
						}
					}}
					transition={wordsVisible ? WORDS_FADE_IN : WORDS_FADE_OUT}
				>
					<TagGroup
						animation="disable-all"
						key={resolvedSetId}
						onSelectionChange={handleSelectionChange}
						selectedKeys={selectedTextureKeys}
						selectionMode="multiple"
						size="sm"
						variant="surface"
					>
						<TagGroup.List className="flex-row flex-wrap items-start gap-x-2 gap-y-1.5 pr-14">
							{TEXTURE_WORDS.map((word, i) => {
								const skin = TEXTURE_PILL[textureHue(word)];
								const isSelected = selectedTextureKeys.has(word);
								return (
									<TagGroup.Item
										className={cn(
											PILL,
											SCATTER[i % SCATTER.length],
											isSelected ? skin.selected : skin.rest,
											// Full up: the rest step back instead of eating taps.
											atCap && !isSelected && "opacity-35"
										)}
										id={word}
										key={word}
									>
										<TagGroup.ItemLabel
											className={cn(
												"text-xs",
												skin.label,
												!isSelected && "opacity-75"
											)}
											maxFontSizeMultiplier={MAX_PILL_FONT_SCALE}
										>
											{word}
										</TagGroup.ItemLabel>
									</TagGroup.Item>
								);
							})}
						</TagGroup.List>
					</TagGroup>
				</EaseView>
			</Tour.Step>
		</View>
	);
};
