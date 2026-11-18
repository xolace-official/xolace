import { View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { CtaButton } from "@/components/shared/cta-button";
import { LinearGradient } from "@/components/shared/styled";
import type { FaceHandle } from "@/components/xolace-face/use-face";
import { XolaceFace } from "@/components/xolace-face/xolace-face";
import { clearOf } from "@/design/clear-of";
import { REDUCED_FADE_MS } from "@/design/springs";
import { useTokenColor } from "@/lib/use-token-color";
import { clamp01 } from "../arrival/arrival-time";
import { COPY } from "../copy";
import { EASE } from "../peers-ease";
import { LAYOUT, MOTION, T } from "../peers-look";

const H = LAYOUT.header;
const F = LAYOUT.footer;
/** Board `.fbr`: the face rises 1.5 pt and grows 3% / 6% with the breath, from its 92% origin. */
const FACE_BREATH = { rise: 1.5, sx: 0.03, sy: 0.06 } as const;

type HeaderProps = {
	top: number;
	face: FaceHandle;
	late: boolean;
	breath: SharedValue<number>;
};

/**
 * The header (board `.hd`): the face centred (Sit's header without its buttons),
 * breathing on the shared breath. Hidden from VoiceOver.
 */
export function PeersHeader({ top, face, late, breath }: HeaderProps) {
	const breathe = useAnimatedStyle(() => {
		const v = breath.get();
		return {
			transform: [
				{ translateY: -FACE_BREATH.rise * v },
				{ scaleX: 1 + FACE_BREATH.sx * v },
				{ scaleY: 1 + FACE_BREATH.sy * v },
			],
		};
	});
	return (
		<View
			accessibilityElementsHidden
			className="absolute z-20 items-center justify-center"
			importantForAccessibility="no-hide-descendants"
			pointerEvents="none"
			style={{ height: H.button, left: H.side, right: H.side, top }}
		>
			<Animated.View
				style={[
					{ height: H.face, transformOrigin: "50% 92%", width: H.face },
					breathe,
				]}
			>
				<XolaceFace
					face={face}
					palette={late ? "ember" : undefined}
					size={H.face}
				/>
			</Animated.View>
		</View>
	);
}

type FooterProps = {
	arrive: SharedValue<number>;
	/** Done is pressable from the first card's landing. */
	ui: boolean;
	hint: boolean;
	reduced: boolean;
	onDone: () => void;
};

/**
 * The footer (board `.ft`, `.cta`, `.hint`): a 168 pt fade to the page, Done
 * pinned 56 up, and "Hold a card to report it" in ink 3. Both fade in (.45 s) as
 * the first card lands; Done is pressable from then.
 */
export function PeersFooter({
	arrive,
	ui,
	hint,
	reduced,
	onDone,
}: FooterProps) {
	const page = useTokenColor("background");
	const shown = useAnimatedStyle(() => {
		const e = arrive.get() - T.first;
		let opacity = 0;
		if (e > 0) {
			opacity = reduced
				? clamp01(e / REDUCED_FADE_MS)
				: EASE.css(clamp01(e / MOTION.doneMs));
		}
		return { opacity };
	});
	return (
		<>
			<View
				className="absolute inset-x-0 bottom-0 z-20"
				pointerEvents="none"
				style={{ height: F.fade }}
			>
				<LinearGradient
					className="flex-1"
					colors={[clearOf(page), page, page]}
					locations={[0, F.fadeAt, 1]}
				/>
			</View>
			<Animated.View
				accessibilityElementsHidden={!ui}
				className="absolute z-21"
				importantForAccessibility={ui ? "auto" : "no-hide-descendants"}
				pointerEvents={ui ? "auto" : "none"}
				style={[{ bottom: F.bottom, left: F.side, right: F.side }, shown]}
			>
				<CtaButton label={COPY.done} onPress={onDone} />
			</Animated.View>
			{hint ? (
				<Animated.View
					className="absolute inset-x-0 z-21"
					pointerEvents="none"
					style={[{ bottom: F.hintBottom }, shown]}
				>
					<AppText
						center
						color="subtle"
						style={{ fontSize: F.hint }}
						variant="footnote"
					>
						{COPY.hint}
					</AppText>
				</Animated.View>
			) : null}
		</>
	);
}
