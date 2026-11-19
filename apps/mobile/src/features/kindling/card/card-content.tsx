import { Image } from "expo-image";
import type { ReactNode } from "react";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { COPY } from "../copy";
import {
	type CardRow,
	cardText,
	type TrailTwig,
	type TwigState,
} from "../kindling-model";
import { CAMPFIRE_STILL, isCleanPose, poseOf } from "../poses";
import { SwapText } from "../swap-text";
import type { KindlingColours } from "../trail/kindling-colours";
import { FinishRow, PassedRow, TendedRow, WaitingRow } from "./card-row";
import { RowSwap } from "./row-swap";

const THUMB = 50;
/** A clean pose sits whole on its tint, 40 pt wide, from 5 pt down. */
const CLEAN = { top: 5, width: 40 };

export type CardHandlers = {
	onAct: (i: number) => void;
	onSkip: (i: number) => void;
	onUndo: () => void;
	onAgain: (i: number) => void;
	onBrowse: (i: number) => void;
	onBack: () => void;
};

type Props = {
	/** A twig's index, or `twigs.length` for the "all" card. */
	id: number;
	twigs: readonly TrailTwig[];
	states: readonly TwigState[];
	/** The twig whose xolacer match is in flight. */
	matching: string | null;
	reduced: boolean;
	c: KindlingColours;
	h: CardHandlers;
};

/**
 * One layer of the floating card (§6): a 50 pt Flux thumb on the kind's tint, the eyebrow, the
 * title, the why, and the row for its state. Production's extras stay: the twig's detail line
 * and, for a waiting track with a topic, "Browse more like this".
 */
export function CardContent({
	id,
	twigs,
	states,
	matching,
	reduced,
	c,
	h,
}: Props) {
	const text = cardText(twigs, states, id);
	const twig = twigs[id];
	let eyebrowColor = c.ink3;
	if (text.tone === "violet") {
		eyebrowColor = c.violet;
	} else if (text.tone === "ember") {
		eyebrowColor = c.emberInk;
	}

	const row = (r: CardRow): ReactNode => {
		if (!twig || r === "all") {
			return <FinishRow onBack={h.onBack} />;
		}
		if (r === "wait") {
			return (
				<WaitingRow
					action={twig.action}
					matching={matching === twig.id}
					onAct={() => h.onAct(id)}
					onSkip={() => h.onSkip(id)}
				/>
			);
		}
		if (r === "done") {
			return <TendedRow again={twig.again} onAgain={() => h.onAgain(id)} />;
		}
		return <PassedRow onUndo={r === "undo" ? h.onUndo : undefined} />;
	};

	return (
		<View className="px-4.5 pt-4.5 pb-4">
			<View className="flex-row items-center gap-3">
				<Thumb c={c} twig={twig} />
				<View className="flex-1">
					<SwapText
						className="text-[11px] uppercase leading-[14px] tracking-[1px]"
						color={eyebrowColor}
						mode="fade"
						reduced={reduced}
						text={text.eyebrow}
						variant="caption"
						weight="bold"
					/>
					<AppText
						accessibilityRole="header"
						className="mt-0.75 tracking-[-0.3px]"
						variant="headline"
						weight="semibold"
					>
						{text.title}
					</AppText>
				</View>
			</View>
			<AppText
				className="mt-2.5 text-[15px] leading-[21px]"
				color="muted"
				variant="body"
			>
				{text.why}
			</AppText>
			{twig?.detail ? (
				<AppText className="mt-1.5" color="subtle" variant="footnote">
					{twig.detail}
				</AppText>
			) : null}
			{twig?.browsable && text.row === "wait" ? (
				<PressScale
					accessibilityRole="link"
					className="mt-2 self-start py-1"
					onPress={() => h.onBrowse(id)}
				>
					<AppText color="accent" variant="footnote" weight="semibold">
						{COPY.browseMore}
					</AppText>
				</PressScale>
			) : null}
			<RowSwap id={text.row} reduced={reduced} render={row} />
		</View>
	);
}

function Thumb({
	twig,
	c,
}: {
	twig: TrailTwig | undefined;
	c: KindlingColours;
}) {
	const clean = twig ? isCleanPose(twig.kind) : true;
	return (
		<View
			className="overflow-hidden rounded-full"
			importantForAccessibility="no-hide-descendants"
			style={{
				backgroundColor: twig ? c.tints[twig.tint] : c.tints.fire,
				height: THUMB,
				width: THUMB,
			}}
		>
			<Image
				accessible={false}
				contentFit={clean ? "contain" : "cover"}
				contentPosition="top center"
				source={twig ? poseOf(twig.kind) : CAMPFIRE_STILL}
				style={
					clean
						? {
								height: CLEAN.width * 2,
								left: (THUMB - CLEAN.width) / 2,
								position: "absolute",
								top: CLEAN.top,
								width: CLEAN.width,
							}
						: { height: THUMB, width: THUMB }
				}
			/>
		</View>
	);
}
