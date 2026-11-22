import { View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { GlassGroup } from "@/components/shared/glass-group";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import type { FaceHandle } from "@/components/xolace-face/use-face";
import { XolaceFace } from "@/components/xolace-face/xolace-face";
import { useTokenColor } from "@/lib/use-token-color";
import type { SitClock } from "../clock/use-sit-clock";
import { COPY } from "../copy";
import { LAYOUT } from "../sit-look";

const H = LAYOUT.header;
const BREATH = { rise: 1.5, sx: 0.03, sy: 0.06 } as const;
const CLOSE_ICON = { android: "close", ios: "xmark" } as const;
const PAUSE_ICON = { android: "pause", ios: "pause.fill" } as const;
const PLAY_ICON = { android: "play_arrow", ios: "play.fill" } as const;

type Props = {
	top: number;
	closeLabel: string;
	onClose: () => void;
	canPause: boolean;
	paused: boolean;
	onPause: () => void;
	face: FaceHandle;
	late: boolean;
	clock: SitClock;
};

/**
 * Close (left) and pause / play (right) as 44 pt glass buttons, the face
 * centred (handoff §6–7). Pause hides without a fade: iOS glass renders empty
 * under an animating opacity.
 */
export function SitHeader({
	top,
	closeLabel,
	onClose,
	canPause,
	paused,
	onPause,
	face,
	late,
	clock,
}: Props) {
	const ink = useTokenColor("foreground");
	const breathe = useAnimatedStyle(() => {
		const v = clock.fb.get();
		return {
			transform: [
				{ translateY: -BREATH.rise * v },
				{ scaleX: 1 + BREATH.sx * v },
				{ scaleY: 1 + BREATH.sy * v },
			],
		};
	});
	return (
		<View
			className="absolute z-20 flex-row items-center justify-between"
			pointerEvents="box-none"
			style={{ height: H.button, left: H.side, right: H.side, top }}
		>
			<GlassGroup className="p-0">
				<PressScale
					accessibilityLabel={closeLabel}
					className="items-center justify-center"
					onPress={onClose}
					style={{ height: H.button, width: H.button }}
				>
					<Icon color={ink} name={CLOSE_ICON} size={17} weight="semibold" />
				</PressScale>
			</GlassGroup>
			<View
				className="items-center justify-center"
				pointerEvents="none"
				style={{ height: H.button, width: H.button }}
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
			<View
				accessibilityElementsHidden={!canPause}
				className={canPause ? "opacity-100" : "opacity-0"}
				importantForAccessibility={canPause ? "auto" : "no-hide-descendants"}
				pointerEvents={canPause ? "auto" : "none"}
				style={{ height: H.button, width: H.button }}
			>
				<GlassGroup className="p-0">
					<PressScale
						accessibilityLabel={paused ? COPY.play : COPY.pause}
						className="items-center justify-center"
						onPress={onPause}
						style={{ height: H.button, width: H.button }}
					>
						<Icon
							color={ink}
							name={paused ? PLAY_ICON : PAUSE_ICON}
							size={16}
						/>
					</PressScale>
				</GlassGroup>
			</View>
		</View>
	);
}
