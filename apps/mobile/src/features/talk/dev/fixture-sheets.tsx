import type { TalkPace } from "@xolace/backend/convex/lib/voices";
import { type ReactNode, useState } from "react";
import { View } from "react-native";
import type { Directness } from "@/lib/talk/use-talk-style";
import { KeptSheet } from "../sheets/kept-sheet";
import { TalkStyleSheet } from "../sheets/talk-style-sheet";
import { type TalkSheets, TalkSheetsProvider } from "../talk-sheets-data";
import { FIXTURE_NAME, WEEK } from "./fixtures";

const SHEET_RADIUS = 40;

function AsSheet({ children }: { children: ReactNode }) {
	return (
		<View className="flex-1 justify-end bg-black/40">
			<View
				className="bg-surface"
				style={{
					borderCurve: "continuous",
					borderTopLeftRadius: SHEET_RADIUS,
					borderTopRightRadius: SHEET_RADIUS,
				}}
			>
				{children}
			</View>
		</View>
	);
}

function useFixtureSheets(week: number): TalkSheets {
	const [pace, setPace] = useState<TalkPace>("normal");
	const [directness, setDirectness] = useState<Directness>("balanced");
	return {
		actions: { setDirectness, setPace },
		state: { directness, name: FIXTURE_NAME, pace, week },
	};
}

export function FixtureStyleSheet() {
	return (
		<TalkSheetsProvider value={useFixtureSheets(WEEK.full)}>
			<AsSheet>
				<TalkStyleSheet />
			</AsSheet>
		</TalkSheetsProvider>
	);
}

export function FixtureKeptSheet({ week = WEEK.full }: { week?: number }) {
	return (
		<TalkSheetsProvider value={useFixtureSheets(week)}>
			<AsSheet>
				<KeptSheet />
			</AsSheet>
		</TalkSheetsProvider>
	);
}
