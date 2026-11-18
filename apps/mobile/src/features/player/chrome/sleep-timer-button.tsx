import {
	Box,
	DropdownMenu,
	DropdownMenuItem,
	HorizontalDivider,
	Text,
} from "@expo/ui/jetpack-compose";
import { size } from "@expo/ui/jetpack-compose/modifiers";
import { Fragment, useState } from "react";
import { Pressable, View } from "react-native";
import Animated, { LinearTransition } from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
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
const CHECK = "✓ ";
const WIDEN = LinearTransition.duration(MOTION.widen)
	.easing(OUT)
	.reduceMotion(PLAY_AS_CHOSEN.reduceMotion);

/** Android: the moon and pill in the player's glass, opening a Material 3 dropdown (iOS draws
 * SwiftUI's menu, `sleep-timer-button.ios.tsx`). */
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
	const [open, setOpen] = useState(false);
	const on = choice !== "off";
	const items = [
		...SLEEP_MENU,
		{ key: "end" as const, label: PLAYER_COPY.sleepEnd },
	];
	return (
		<Animated.View
			className="absolute"
			// Reduce Motion: the pill takes its new width at once.
			layout={reduced ? undefined : WIDEN}
			style={{ right: P.glassSide, top }}
		>
			<Pressable
				accessibilityLabel={voice}
				accessibilityRole="button"
				onPress={() => setOpen(true)}
			>
				<PlayerGlass
					className="flex-row items-center justify-center gap-1.75"
					style={{
						borderRadius: P.glass / 2,
						height: P.glass,
						minWidth: P.glass,
						paddingLeft: on ? 13 : 0,
						paddingRight: on ? 15 : 0,
					}}
				>
					<Icon
						color={ink}
						name={{ android: "bedtime", ios: "moon.fill" }}
						size={MOON}
					/>
					{on ? (
						<AppText
							className="text-[15px] text-player-ink tabular-nums"
							style={{ opacity: fading ? INK.sleepFading : 1 }}
							variant="callout"
							weight="semibold"
						>
							{pill}
						</AppText>
					) : null}
				</PlayerGlass>
			</Pressable>
			<View className="absolute right-0 bottom-0">
				<ThemedHost colorScheme="dark" matchContents>
					<DropdownMenu expanded={open} onDismissRequest={() => setOpen(false)}>
						{/* A point under the glass's right edge: the menu drops from there. */}
						<DropdownMenu.Trigger>
							<Box modifiers={[size(1, 1)]} />
						</DropdownMenu.Trigger>
						<DropdownMenu.Items>
							<DropdownMenuItem enabled={false}>
								<DropdownMenuItem.Text>
									<Text>{PLAYER_COPY.sleepTitle}</Text>
								</DropdownMenuItem.Text>
							</DropdownMenuItem>
							{items.map((c) => (
								<Fragment key={String(c.key)}>
									{c.key === "end" ? <HorizontalDivider /> : null}
									<DropdownMenuItem
										onClick={() => {
											setOpen(false);
											pick(c.key);
										}}
									>
										<DropdownMenuItem.Text>
											<Text>{`${choice === c.key ? CHECK : ""}${c.label}`}</Text>
										</DropdownMenuItem.Text>
									</DropdownMenuItem>
								</Fragment>
							))}
						</DropdownMenu.Items>
					</DropdownMenu>
				</ThemedHost>
			</View>
		</Animated.View>
	);
}
