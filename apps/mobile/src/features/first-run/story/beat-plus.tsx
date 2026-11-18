import { Canvas, Picture, Skia, TileMode } from "@shopify/react-native-skia";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
	useDerivedValue,
} from "react-native-reanimated";
import { AnimatedAppText, AppText } from "@/components/shared/app-text";
import { PATTERN, STORY } from "../copy";
import { BOARD_TEXT_MAX } from "../first-run-layout";
import { clamp, ease, easeIO, lerp, mixRGB, seg } from "../first-run-motion";
import { BEAT_COLORS, css, ink, STORY_COLORS } from "../first-run-palette";
import { seedPicture } from "../skia-words";
import { useCanvasKick } from "../stage";
import { BeatSection, useIn } from "./beat-parts";
import {
	C,
	DOT,
	Note,
	PanelWord,
	SIG,
	scaleOf,
	WORDS,
	zoomOf,
} from "./panel-words";
import { bIf, type SEng, SKY, WE } from "./story-scene";

const LAV = BEAT_COLORS.plus.lit;

/**
 * 6 · Xolace+: a panel that starts inside your words (scaled 1.9) and steps back to the pattern, with
 * nothing under it. The line and its dots are drawn in Skia; drag the panel to step back yourself.
 */
export function BeatPlus({ eng }: { eng: SharedValue<SEng> }) {
	const panel = useIn(eng, 5, WE[5], 550, 14);
	const zoomed = useAnimatedStyle(() => ({
		transform: [{ scale: scaleOf(zoomOf(eng.get())) }],
	}));
	const header = useAnimatedStyle(() => {
		const e = eng.get();
		return { opacity: e.rm ? 1 : seg(zoomOf(e), 0.7, 1) };
	});
	const hint = useAnimatedStyle(() => {
		const e = eng.get();
		const bb = bIf(e, 5);
		return {
			opacity: e.rm
				? 0
				: ease(seg(bb, WE[5] + 500, WE[5] + 900)) *
					(1 - seg(zoomOf(e), 0.05, 0.3)),
		};
	});
	const bg = STORY_COLORS.panel.fill.map((k) => Skia.Color(k));
	const lb = Skia.PathBuilder.Make();
	SIG.forEach((p, i) => (i ? lb.lineTo(p.x, p.y) : lb.moveTo(p.x, p.y)));
	const line = lb.build();
	const kick = useCanvasKick();
	const picture = useDerivedValue(() => {
		const rec = Skia.PictureRecorder();
		const c = rec.beginRecording(Skia.XYWHRect(0, 0, SKY.w, SKY.h));
		seedPicture(c);
		const z = zoomOf(eng.get());
		const g = Skia.Paint();
		// radial-gradient(120% 90% at 50% 100%)
		g.setShader(
			Skia.Shader.MakeRadialGradient(
				{ x: 0, y: 0 },
				SKY.w * 1.2,
				bg,
				null,
				TileMode.Clamp
			)
		);
		c.save();
		c.translate(C.x, SKY.h);
		c.scale(1, (SKY.h * 0.9) / (SKY.w * 1.2));
		// The last stop holds past the ellipse, as CSS does.
		c.drawRect(Skia.XYWHRect(-SKY.w * 2, -SKY.w * 4, SKY.w * 4, SKY.w * 8), g);
		c.restore();
		const s = scaleOf(z);
		c.save();
		c.translate(C.x, C.y);
		c.scale(s, s);
		c.translate(-C.x, -C.y);
		const end = seg(z, 0.55, 1);
		const lo = seg(z, 0.5, 0.7);
		if (end > 0 && lo > 0) {
			const p = Skia.Paint();
			p.setStyle(1);
			p.setStrokeWidth(1.6);
			p.setStrokeCap(1);
			p.setStrokeJoin(1);
			p.setColor(Skia.Color(STORY_COLORS.panel.line));
			p.setAlphaf(lo);
			const part = Skia.Path.Trim(line, 0, end, false);
			if (part) {
				c.drawPath(part, p);
			}
		}
		const d = Skia.Paint();
		d.setColor(Skia.Color(STORY_COLORS.panel.dot));
		for (const s of SIG) {
			c.drawCircle(s.x, s.y, DOT / 2, d);
		}
		c.restore();
		return rec.finishRecordingAsPicture();
	});
	return (
		<BeatSection eng={eng} i={5}>
			<Animated.View
				accessibilityLabel={`${STORY.plus.header}. ${PATTERN.notes.map((n) => `${n.a} ${n.b}`).join(". ")}.`}
				accessible
				className="absolute overflow-hidden rounded-[22px] border-[0.5px] border-continuous"
				style={[
					{
						borderColor: css(LAV, 0.2),
						height: SKY.h,
						left: SKY.x,
						top: SKY.y,
						width: SKY.w,
					},
					panel,
				]}
			>
				<Canvas
					style={{
						height: SKY.h,
						left: 0,
						position: "absolute",
						top: 0,
						width: SKY.w,
					}}
				>
					<Picture key={kick} picture={picture} />
				</Canvas>
				<Animated.View
					className="absolute top-0 left-0"
					pointerEvents="none"
					style={[{ height: SKY.h, width: SKY.w }, zoomed]}
				>
					{WORDS.map((w, k) => (
						<PanelWord eng={eng} k={k} key={w.t} />
					))}
				</Animated.View>
				<Animated.View className="absolute top-3 left-3.5" style={header}>
					<AppText
						className="text-[10px] uppercase leading-[12px] tracking-[1.4px]"
						maxFontSizeMultiplier={BOARD_TEXT_MAX}
						style={{ color: css(LAV, 0.7) }}
						weight="semibold"
					>
						{STORY.plus.header}
					</AppText>
				</Animated.View>
				{PATTERN.notes.map((n, i) => (
					<Note eng={eng} i={i} key={n.b} />
				))}
				<Animated.View
					className="absolute right-3.5 bottom-[11px]"
					style={hint}
				>
					<AppText
						className="text-[11px] leading-[14px]"
						maxFontSizeMultiplier={BOARD_TEXT_MAX}
						style={{ color: css(LAV, 0.55) }}
					>
						{STORY.plus.hint}
					</AppText>
				</Animated.View>
			</Animated.View>
		</BeatSection>
	);
}
