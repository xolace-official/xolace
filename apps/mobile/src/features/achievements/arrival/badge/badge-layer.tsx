import { type SharedValue, useSharedValue } from "react-native-reanimated";
import type { ArrivingBadge } from "@/features/achievements/arrival/arrival-model";
import type { Eng, Geo } from "@/features/achievements/arrival/arrival-motion";
import {
	BadgeFace,
	BadgeGlow,
} from "@/features/achievements/arrival/badge/badge-coin";
import { BadgeHit } from "@/features/achievements/arrival/badge/badge-hit";
import {
	BadgeWords,
	type TitleRef,
} from "@/features/achievements/arrival/badge/badge-words";
import { ExitCoin } from "@/features/achievements/arrival/badge/exit-coin";
import {
	Dots,
	Hint,
} from "@/features/achievements/arrival/badge/hint-and-dots";
import { Sparkles } from "@/features/achievements/arrival/badge/sparkles";
import {
	PhaseConfetti,
	StepGate,
	Under,
} from "@/features/achievements/arrival/badge/step-gates";
import { useTokenColor } from "@/lib/use-token-color";

const REACH_PAD = 8;

export function BadgeLayer({
	eng,
	fa,
	geo,
	dark,
	badges,
	first,
	titleRef,
	wake,
}: {
	eng: SharedValue<Eng>;
	fa: SharedValue<number>;
	geo: Geo;
	dark: boolean;
	badges: readonly ArrivingBadge[];
	first: number;
	titleRef: TitleRef;
	wake: () => void;
}) {
	const total = badges.length;
	const reach = useSharedValue(
		Math.max(Math.hypot(geo.cx, geo.hy), Math.hypot(geo.cx, geo.H - geo.hy)) +
			REACH_PAD
	);
	const ember = useTokenColor(dark ? "ember" : "ember-ink");
	return (
		<>
			{total > 1 ? <Under badges={badges} dark={dark} eng={eng} /> : null}
			{badges.map((b, i) => (
				<BadgeGlow
					b={b}
					dark={dark}
					eng={eng}
					fa={fa}
					geo={geo}
					i={i}
					key={b.id}
					reach={reach}
				/>
			))}
			<PhaseConfetti eng={eng} front={false} geo={geo} />
			{badges.slice(0, -1).map((b, i) => (
				<ExitCoin art={b.art} eng={eng} geo={geo} i={i} key={b.id} />
			))}
			{badges.map((b, i) => (
				<BadgeFace
					b={b}
					dark={dark}
					eng={eng}
					fa={fa}
					geo={geo}
					i={i}
					key={b.id}
				/>
			))}
			<Sparkles color={ember} eng={eng} fa={fa} geo={geo} />
			<PhaseConfetti eng={eng} front geo={geo} />
			{badges.map((b, i) => (
				<StepGate eng={eng} first={first} i={i} key={b.id}>
					<BadgeHit b={b} eng={eng} geo={geo} wake={wake} />
					<BadgeWords
						b={b}
						ember={ember}
						eng={eng}
						geo={geo}
						i={i}
						titleRef={titleRef}
						total={total}
					/>
				</StepGate>
			))}
			<Hint eng={eng} geo={geo} />
			{total > 1 ? (
				<Dots dark={dark} eng={eng} first={first} total={total} />
			) : null}
		</>
	);
}
