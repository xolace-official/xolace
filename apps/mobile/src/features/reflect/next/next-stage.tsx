import { useIsFocused } from "expo-router/react-navigation";
import { useEffect, useEffectEvent, useRef } from "react";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { useFace } from "@/components/xolace-face/use-face";
import { XolaceFace } from "@/components/xolace-face/xolace-face";
import { FONTS } from "@/design/type";
import { playPathChoice } from "@/lib/haptics";
import { COPY, type PathId } from "../copy";
import { FACE } from "../face-poses";
import { LAYOUT, useBoardY } from "../layout";
import { TILES } from "../motion";
import { useReflect } from "../reflect-data";
import { useReflectDraw } from "../reflect-draw";
import { PathTile } from "./path-tile";
import { SpaceName } from "./space-name";
import { WhatHappened } from "./what-happened";

const N = LAYOUT.next;
const TITLE = {
	fontFamily: FONTS.displayBold,
	fontSize: 28,
	letterSpacing: -0.7,
	lineHeight: 32,
} as const;
const MINI = {
	fontFamily: FONTS.mirror,
	fontSize: 16.5,
	lineHeight: 23.9,
} as const;
const MINI_LINES = 3;
const LEAVES: readonly PathId[] = ["solo", "peers"];

export function NextStage() {
	const { state, actions } = useReflect();
	const { reduced, live, late } = useReflectDraw();
	const y = useBoardY();
	const focused = useIsFocused();
	const face = useFace(FACE.tiles, focused && live);
	const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
	const picked = useRef(state.nextPick);
	const { nextPick, mirror, mv, heavy } = state;
	const pick = COPY.next.paths.findIndex((p) => p.id === nextPick);

	useEffect(() => {
		face.to(pick >= 0 ? FACE.tile(pick) : FACE.tiles);
	}, [pick, face]);
	useEffect(
		() => () => {
			for (const t of timers.current) {
				clearTimeout(t);
			}
		},
		[]
	);
	const dropLeftPick = useEffectEvent(() => {
		if (nextPick && LEAVES.includes(nextPick)) {
			picked.current = null;
			actions.patch({ nextPick: null });
		}
	});
	useEffect(() => {
		if (focused) {
			dropLeftPick();
		}
	}, [focused]);

	const lines = mv === 2 && mirror.revised ? mirror.revised : mirror.first;
	const recap = heavy
		? ""
		: lines.map((line) => line.map(([text]) => text).join("")).join(" ");

	const choose = (path: PathId) => {
		if (picked.current !== null) {
			return;
		}
		picked.current = path;
		playPathChoice();
		actions.choosePath(path);
		timers.current.push(
			setTimeout(() => actions.goPath(path), TILES.goAfterMs)
		);
	};

	return (
		<View className="flex-1">
			{recap ? (
				<View
					className="absolute inset-x-6 gap-2 opacity-75"
					style={{ top: y(N.mirrorTop) }}
				>
					<AppText
						className="text-[11px] text-eink tracking-[1.1px]"
						variant="overline"
					>
						{COPY.next.mirrorLabel}
					</AppText>
					<AppText numberOfLines={MINI_LINES} style={MINI} variant="body">
						{recap}
					</AppText>
				</View>
			) : null}
			<View
				className="absolute inset-x-6 flex-row items-center gap-3"
				style={{ top: y(N.headTop) }}
			>
				<XolaceFace
					face={face}
					palette={late ? "ember" : undefined}
					size={N.face}
				/>
				<View className="flex-1 gap-1">
					<AppText accessibilityRole="header" style={TITLE} variant="title">
						{COPY.next.title}
					</AppText>
					<AppText className="text-[15px]" color="muted" variant="callout">
						{COPY.next.sub}
					</AppText>
				</View>
			</View>
			<View
				className="absolute inset-x-4"
				style={{ gap: N.tileGap, top: y(N.tilesTop) }}
			>
				{COPY.next.paths.map((p, i) => (
					<PathTile
						chosen={nextPick === p.id}
						index={i}
						key={p.id}
						onPress={() => choose(p.id)}
						reduced={reduced}
						sub={p.sub}
						title={p.title}
					/>
				))}
			</View>
			<WhatHappened />
			<SpaceName />
		</View>
	);
}
