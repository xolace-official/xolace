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
 * Words tipped onto a table, not filed into a form.
 *
 * Each pill gets its own tilt, drop and nudge, cycling by position — enough
 * that no two sit on a shared line or a shared left edge, small enough that
 * nothing looks broken or moves out of thumb's reach. Classes rather than a
 * style prop: `TagGroup.Item` forwards className and drops style.
 *
 * The drops are half what they were: a wrapped row is as tall as its deepest
 * `mt`, so on a three-row set they were buying scatter with height the band
 * doesn't have — and the height came out of the send button, which the
 * surround then had to park on the card. The tilt carries the effect; the
 * vertical nudge only has to break the shared baseline.
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
 * How far the words are allowed to grow.
 *
 * Everything else on this screen — the prompt, the mirror — scales without a
 * ceiling. These don't: a pill is a fixed-ish shape holding one or two words,
 * and past ~1.3x they wrap, the band grows tall enough to reach the mic, and
 * the card underneath overflows. Capping the label keeps the whole band's
 * height bounded, which is what the scaled gap below assumes.
 */
const MAX_PILL_FONT_SCALE = 1.3;

const WORDS_FADE_OUT = { duration: 150, type: "timing" as const };
const WORDS_FADE_IN = { duration: 200, type: "timing" as const };

type Props = {
	isNight: boolean;
	selectedTextures: string[];
	dispatch: React.Dispatch<ReflectionAction>;
};

/**
 * The easier way in: tap the words that fit instead of writing.
 *
 * Lifted out of the old idle screen unchanged (#256) — the compose screen
 * translates and fades it as the card expands, and its redesign is a separate
 * pass.
 */
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
			// At the cap the reducer refuses the add, so don't answer the tap with a
			// haptic that promises one.
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
		// The old `pt-6`/`pb-8` were dead space standing in for a gap the band
		// could not actually guarantee — the surround now measures this frame and
		// holds the mic off it, so the padding can go back to being padding.
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
											// Full up: the words still on offer step back rather than
											// silently swallowing taps.
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
