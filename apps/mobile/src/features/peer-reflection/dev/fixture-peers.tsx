import { router } from "expo-router";
import { View } from "react-native";
import { ScopedTheme } from "uniwind";
import { NIGHT_VARIANT, type ThemeMode, themeVariant } from "@/design/themes";
import type { PeersScene } from "../arrival/use-stage";
import { PeerReflectionProvider } from "../peer-reflection-data";
import { PeerReflectionScreen } from "../peer-reflection-screen";
import { ReportSheetView } from "../report/report-sheet";
import {
	type ReportSheet,
	ReportSheetProvider,
} from "../report/report-sheet-data";
import { type FixtureProps, useFixturePeers } from "./use-fixture-peers";

type Props = Omit<FixtureProps, "late"> & {
	late?: boolean;
	scene?: PeersScene;
	theme?: ThemeMode;
};

function FixturePeers({ scene, ...props }: Props & { late: boolean }) {
	const value = useFixturePeers(props);
	return (
		<PeerReflectionProvider value={value}>
			<PeerReflectionScreen scene={scene} />
		</PeerReflectionProvider>
	);
}

function Themed({ late = false, theme = "light", ...props }: Props) {
	return (
		<ScopedTheme theme={late ? NIGHT_VARIANT : themeVariant("default", theme)}>
			<FixturePeers {...props} late={late} />
		</ScopedTheme>
	);
}

const OWN = { gestureEnabled: false, headerShown: false };

export const peers = (props: Props) => ({
	options: OWN,
	Screen: () => <Themed {...props} />,
});

const SHEET_RADIUS = 40;
const back = () => router.back();
const SHEET_ACTIONS: ReportSheet = { actions: { cancel: back, pick: back } };

function FixtureReport({ theme = "light" }: { theme?: ThemeMode }) {
	return (
		<ScopedTheme theme={themeVariant("default", theme)}>
			<ReportSheetProvider value={SHEET_ACTIONS}>
				<View className="flex-1 justify-end bg-black/40">
					<View
						className="bg-surface"
						style={{
							borderCurve: "continuous",
							borderTopLeftRadius: SHEET_RADIUS,
							borderTopRightRadius: SHEET_RADIUS,
						}}
					>
						<ReportSheetView />
					</View>
				</View>
			</ReportSheetProvider>
		</ScopedTheme>
	);
}

export const reportSheet = (theme?: ThemeMode) => ({
	options: { headerShown: false },
	Screen: () => <FixtureReport theme={theme} />,
});
