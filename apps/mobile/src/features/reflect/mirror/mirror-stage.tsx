import { type ComponentRef, useEffect, useEffectEvent, useRef } from "react";
import { AccessibilityInfo, View } from "react-native";
import { useAnimatedReaction } from "react-native-reanimated";
import { useFixedFaces } from "@/design/fonts";
import { playMirrorArrival } from "@/lib/haptics";
import { useTokenColors } from "@/lib/use-token-color";
import { CareCard } from "../care/care-card";
import { LAYOUT, useBoardY } from "../layout";
import { WRITE_IN } from "../motion";
import { useReflect } from "../reflect-data";
import { useReflectDraw } from "../reflect-draw";
import { timeline } from "../reflect-model";
import { YourWords } from "../your-words";
import { easeOut, smooth } from "./curves";
import { MirrorActions } from "./mirror-actions";
import { MirrorLabel } from "./mirror-label";
import { MirrorLines } from "./mirror-lines";
import type { MirrorInk } from "./mirror-word";
import { NotQuitePanel } from "./not-quite-panel";
import { QuoteMarks } from "./quote-marks";
import { useMirrorClock } from "./use-mirror-clock";
import { useMirrorFace } from "./use-mirror-face";

const M = LAYOUT.mirror;
const MS_PER_S = 1000;
const INK_TOKENS = [
	"reflect-mirror-halo",
	"eink",
	"reflect-warm",
	"reflect-warm-glow",
	"ember-ink",
	"ember-wash",
] as const;

/**
 * The mirror lands (board cards 05–07): Your words with the borrowed phrases marked, THE MIRROR
 * writing in word by word on one clock, its phrases lighting where they came from, then the
 * actions. A heavy mirror writes in slowly, lights nothing, and the care card takes the actions'
 * place. A refinement shimmers the lines until the revised mirror lands and writes in again.
 */
export function MirrorStage() {
	const { state } = useReflect();
	const { reduced, live, light } = useReflectDraw();
	const y = useBoardY();
	const { heavy, landN, mirror, mv, sel, sayMore, flash, yourWords } = state;
	const shown = mv === 2 && mirror.revised ? mirror.revised : mirror.first;
	const tl = timeline(shown, heavy);
	const e = useMirrorClock(landN, tl.settle, live, reduced);
	const { face, glance } = useMirrorFace(tl, live);
	const facesReady = useFixedFaces("mirror");
	const firstLine = useRef<ComponentRef<typeof View>>(null);
	const [halo, lit, warm, glow, ember, wash] = useTokenColors(INK_TOKENS);
	const ink: MirrorInk = { ember, flash: warm, glow, halo, lit };

	// The bottom light surges once as it lands (S7 `glowPose`): 80 pt in .18 s, out over .9 s.
	useAnimatedReaction(
		() => e.get(),
		(now) => {
			light.surge.set(
				heavy || reduced
					? 0
					: WRITE_IN.surge *
							smooth(now, 0, WRITE_IN.surgeIn) *
							(1 - easeOut(now / WRITE_IN.surgeOut))
			);
		}
	);
	useEffect(() => () => light.surge.set(0), [light.surge]);

	// The three-beat arrival (not when it's heavy: the care card has its own), and VoiceOver
	// moves to the mirror once it has written in.
	const arrive = useEffectEvent(() => {
		if (!heavy) {
			playMirrorArrival();
		}
		return setTimeout(() => {
			if (firstLine.current) {
				AccessibilityInfo.sendAccessibilityEvent(firstLine.current, "focus");
			}
		}, tl.writeEnd * MS_PER_S);
	});
	useEffect(() => {
		const id = arrive();
		return () => clearTimeout(id);
	}, [landN]);

	// Say more is about the whole mirror: the panel quotes its last line.
	const chosen = sel >= 0 ? sel : sayMore ? tl.lines.length - 1 : -1;
	const chosenText = tl.lines[chosen]?.words.map((w) => w.text).join(" ") ?? "";
	const flashPairs = tl.lines[flash.line]?.pairs ?? [];

	return (
		<View className="flex-1">
			<View
				className="absolute"
				style={{ gap: M.gap, left: M.side, right: M.side, top: y(M.top) }}
			>
				<YourWords at={{ x: M.side, y: y(M.top) }}>
					{tl.lights ? (
						<QuoteMarks
							e={e}
							flash={{ n: flash.n, pairs: flashPairs }}
							flashColor={glow}
							key={`${landN}-${mv}`}
							segs={yourWords}
							tl={tl}
						/>
					) : undefined}
				</YourWords>
				<MirrorLabel face={face} />
				{facesReady ? (
					<MirrorLines
						chosen={chosen}
						e={e}
						firstRef={firstLine}
						glance={glance}
						ink={ink}
						tl={tl}
						wash={wash}
					/>
				) : null}
			</View>
			{heavy ? (
				<CareCard />
			) : (
				<>
					<View
						className="absolute"
						style={{
							bottom: LAYOUT.actions.bottom,
							left: LAYOUT.actions.side,
							right: LAYOUT.actions.side,
						}}
					>
						<MirrorActions startMs={tl.actionsAt * MS_PER_S} />
					</View>
					<NotQuitePanel line={chosenText} />
				</>
			)}
		</View>
	);
}
