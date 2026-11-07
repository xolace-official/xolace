// The Kindling visual on the Plus side of the Xolace+ step (#713, README § I): the named
// feeling branching to its three supports. Talk's bar and Steadiness have their own files.
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { AppText } from "@/components/shared/app-text";
import { icon } from "@/features/insights/domains";
import { useTokenColor } from "@/lib/use-token-color";

const SUPPORT_ICON_SIZE = 20;

const SUPPORTS = [
	{ icon: icon("clock", "schedule"), label: "Sit with it" },
	{ icon: icon("waveform", "graphic_eq"), label: "A soft sound" },
	{ icon: icon("person.fill", "person"), label: "A Xolacer" },
] as const;

// The feeling on top, its supports in a row below, joined by three curves: a branch,
// read top to bottom as "named, then where it can go".
const PILL_HEIGHT = 36;
const BRANCH_DROP = 36;
const ROW_TOP = PILL_HEIGHT + BRANCH_DROP;
const BRANCH_STROKE = 1.5;
const BRANCH_OPACITY = 0.45;

/** Where a support's column centres, as a fraction of the row: three equal columns. */
const columnCentre = (i: number) => (2 * i + 1) / (2 * SUPPORTS.length);

/** One curve from under the pill down to a support's icon. */
const branch = (width: number, i: number) => {
	const from = width / 2;
	const to = width * columnCentre(i);
	const mid = PILL_HEIGHT + BRANCH_DROP / 2;
	return `M ${from} ${PILL_HEIGHT} C ${from} ${mid}, ${to} ${mid}, ${to} ${ROW_TOP}`;
};

/** "guilt", and the three places Kindling can take it. */
export function KindlingHold() {
	const ember = useTokenColor("ember");
	const foreground = useTokenColor("foreground");
	const [width, setWidth] = useState(0);
	return (
		<View
			accessibilityLabel="The feeling it named, guilt, and three ways to be with it: sit with it, a soft sound, a Xolacer."
			accessible
			className="pt-1 pb-0.5"
			onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
		>
			{width > 0 && (
				<Svg
					height={ROW_TOP}
					style={{ left: 0, position: "absolute", top: 0 }}
					width={width}
				>
					{SUPPORTS.map((support, i) => (
						<Path
							d={branch(width, i)}
							fill="none"
							key={support.label}
							stroke={ember}
							strokeLinecap="round"
							strokeOpacity={BRANCH_OPACITY}
							strokeWidth={BRANCH_STROKE}
						/>
					))}
				</Svg>
			)}
			<View
				className="items-center justify-center self-center rounded-full border border-ember/50 bg-ember/12 px-5"
				style={{ height: PILL_HEIGHT }}
			>
				<AppText className="font-[Poppins-SemiBold] text-[15px] text-foreground">
					guilt
				</AppText>
			</View>
			<View className="flex-row" style={{ marginTop: BRANCH_DROP }}>
				{SUPPORTS.map((support) => (
					<View className="flex-1 items-center gap-1.5" key={support.label}>
						<View className="size-11 items-center justify-center rounded-full border border-border bg-surface-secondary">
							<SymbolView
								name={support.icon}
								size={SUPPORT_ICON_SIZE}
								tintColor={foreground}
							/>
						</View>
						<AppText className="text-[12px] text-foreground/80">
							{support.label}
						</AppText>
					</View>
				))}
			</View>
		</View>
	);
}
