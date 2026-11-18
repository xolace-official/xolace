import {
	Divider,
	HStack,
	Image,
	Menu,
	Section,
	Text,
	Toggle,
} from "@expo/ui/swift-ui";
import {
	accessibilityHidden,
	accessibilityLabel,
	font,
	foregroundStyle,
	frame,
	monospacedDigit,
	opacity,
	padding,
} from "@expo/ui/swift-ui/modifiers";
import Animated, { LinearTransition } from "react-native-reanimated";
import { ThemedHost } from "@/components/shared/themed-host";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { useTokenColor } from "@/lib/use-token-color";
import { PLAYER_COPY } from "../copy";
import { usePlayer } from "../player-data";
import { INK, MOTION, OUT, P } from "../player-metrics";
import { SLEEP_MENU } from "../player-model";
import { PlayerGlass } from "./player-glass";
import { useSleepPick } from "./use-sleep-pick";

const MOON = 17;
const WIDEN = LinearTransition.duration(MOTION.widen)
	.easing(OUT)
	.reduceMotion(PLAY_AS_CHOSEN.reduceMotion);

/** The sleep timer (§4): a glass moon top right; set, it widens into a pill ("28 min"). The menu
 * is SwiftUI's, with the system checkmark on the current choice (`sleep-timer-button.tsx` draws
 * Android's). */
export function SleepTimerButton({
	top,
	reduced,
}: {
	top: number;
	reduced: boolean;
}) {
	const { state } = usePlayer();
	const { choice, pill, fading, voice } = state.sleep;
	const ink = useTokenColor("player-ink");
	const pick = useSleepPick();
	const on = choice !== "off";
	return (
		<Animated.View
			className="absolute"
			// Reduce Motion: the pill takes its new width at once.
			layout={reduced ? undefined : WIDEN}
			style={{ right: P.glassSide, top }}
		>
			<PlayerGlass
				style={{
					borderRadius: P.glass / 2,
					height: P.glass,
					minWidth: P.glass,
					overflow: "hidden",
				}}
			>
				<ThemedHost colorScheme="dark" matchContents>
					{/* The label goes on the Menu: on its HStack VoiceOver read it twice. */}
					<Menu
						label={
							<HStack
								modifiers={
									on
										? [
												padding({ leading: 13, trailing: 15 }),
												frame({ minHeight: P.glass }),
											]
										: [frame({ height: P.glass, width: P.glass })]
								}
								spacing={7}
							>
								<Image
									color={ink}
									modifiers={[accessibilityHidden(true)]}
									size={MOON}
									systemName="moon.fill"
								/>
								{on ? (
									<Text
										modifiers={[
											accessibilityHidden(true),
											font({ size: 15, weight: "semibold" }),
											monospacedDigit(),
											foregroundStyle(ink),
											opacity(fading ? INK.sleepFading : 1),
										]}
									>
										{pill}
									</Text>
								) : null}
							</HStack>
						}
						modifiers={[accessibilityLabel(voice)]}
					>
						<Section title={PLAYER_COPY.sleepTitle}>
							{SLEEP_MENU.map((c) => (
								<Toggle
									isOn={choice === c.key}
									key={String(c.key)}
									label={c.label}
									onIsOnChange={() => pick(c.key)}
								/>
							))}
						</Section>
						<Divider />
						<Toggle
							isOn={choice === "end"}
							label={PLAYER_COPY.sleepEnd}
							onIsOnChange={() => pick("end")}
						/>
					</Menu>
				</ThemedHost>
			</PlayerGlass>
		</Animated.View>
	);
}
