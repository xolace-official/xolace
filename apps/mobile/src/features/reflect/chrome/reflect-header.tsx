import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { GlassGroup } from "@/components/shared/glass-group";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { useTokenColors } from "@/lib/use-token-color";
import { COPY } from "../copy";
import { LAYOUT, useBoardY } from "../layout";
import { useReflect } from "../reflect-data";

const H = LAYOUT.header;
const CLOSE_SIZE = 17;
const HELP_SIZE = 20;
const BUTTON = { height: H.button, width: H.button };

export function ReflectHeader() {
	const { state, actions } = useReflect();
	const [foreground, danger] = useTokenColors(["foreground", "danger-ink"]);
	const y = useBoardY();
	const waiting = state.stage === "wait" || state.stage === "land";
	const label = COPY.chrome.labels[state.stage];
	let closeAction = actions.close;
	let closeLabel: string = COPY.chrome.close;
	if (waiting) {
		closeAction = actions.stepAway;
		closeLabel = COPY.chrome.closeWaiting;
	} else if (state.stage === "heard") {
		closeAction = actions.finish;
		closeLabel = COPY.chrome.closeHeard;
	}

	return (
		<View
			className="absolute z-10 flex-row items-center justify-between"
			pointerEvents="box-none"
			style={{ height: H.height, left: H.side, right: H.side, top: y(H.top) }}
		>
			<GlassGroup className="p-0">
				<PressScale
					accessibilityLabel={closeLabel}
					accessibilityRole="button"
					className="items-center justify-center"
					onPress={closeAction}
					style={BUTTON}
				>
					<Icon
						color={foreground}
						name={{ android: "close", ios: "xmark" }}
						size={CLOSE_SIZE}
						weight="semibold"
					/>
				</PressScale>
			</GlassGroup>
			{label ? (
				<AppText
					accessibilityRole="header"
					color="muted"
					maxFontSizeMultiplier={1.4}
					variant="footnote"
					weight="semibold"
				>
					{label}
				</AppText>
			) : null}
			<GlassGroup className="p-0">
				<PressScale
					accessibilityLabel={COPY.chrome.help}
					accessibilityRole="button"
					className="items-center justify-center"
					onPress={actions.openHelp}
					style={BUTTON}
				>
					<Icon
						color={danger}
						name={{ android: "support", ios: "lifepreserver" }}
						size={HELP_SIZE}
					/>
				</PressScale>
			</GlassGroup>
		</View>
	);
}
