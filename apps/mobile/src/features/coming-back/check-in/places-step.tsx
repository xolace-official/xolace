import type { ReactNode } from "react";
import { View } from "react-native";
import { Presets } from "react-native-pulsar";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { cn } from "@/lib/cn";
import { useTokenColors } from "@/lib/use-token-color";
import { useCheckIn } from "../check-in-data";
import { CHECK_IN, HEAVIER_PLACES, PLACES, STILL_PLACES } from "../copy";

/*
 * Board `.lk` rows 62 in one radius-20 group (their 6 pt padding keeps 62 at the default size and
 * lets them grow), icons 36; Not now 54.
 */
const MESSAGE = { fontSize: 14.5, lineHeight: 21 } as const;
const TITLE = { fontSize: 15 } as const;
const SUB = { fontSize: 12.5 } as const;
const BUTTON = { fontSize: 16 } as const;
const GLYPH = { chevron: 13, icon: 16 } as const;

/**
 * Still sitting with it, or got heavier (production's `StillHereStep` / `HeavierStep`): a line,
 * a few places close by (Talk to someone first when heavier), Not now.
 */
export function PlacesStep({
	answer,
	offer,
}: {
	answer: "still_here" | "heavier";
	/** The one-time Telegram offer (production #777), above Not now. */
	offer?: ReactNode;
}) {
	const { actions } = useCheckIn();
	const [dangerInk, accentInk, subtle] = useTokenColors([
		"danger-ink",
		"accent-ink",
		"subtle",
	]);
	const heavier = answer === "heavier";
	const places = heavier ? HEAVIER_PLACES : STILL_PLACES;
	return (
		<>
			<AppText color="muted" style={MESSAGE} variant="callout">
				{heavier ? CHECK_IN.heavierMessage : CHECK_IN.stillMessage}
			</AppText>
			<View className="gap-px overflow-hidden rounded-tile bg-separator">
				{places.map((k) => {
					const p = PLACES[k];
					const care = k === "crisis_resources";
					return (
						<PressScale
							accessibilityLabel={`${p.title}. ${p.sub}`}
							className={cn(
								"min-h-15.5 flex-row items-center gap-3 px-3.5 py-1.5",
								care ? "bg-danger-wash" : "bg-surface-secondary"
							)}
							haptic={Presets.System.selection}
							key={k}
							onPress={() => actions.go(k)}
						>
							<View className="size-9 items-center justify-center rounded-full bg-surface">
								<Icon
									color={(care ? dangerInk : accentInk) ?? ""}
									name={p.icon}
									size={GLYPH.icon}
								/>
							</View>
							<View className="flex-1 gap-px">
								<AppText
									color={care ? "dangerInk" : "foreground"}
									style={TITLE}
									variant="callout"
									weight="semibold"
								>
									{p.title}
								</AppText>
								<AppText color="muted" style={SUB} variant="footnote">
									{p.sub}
								</AppText>
							</View>
							<Icon
								color={subtle ?? ""}
								name={{ android: "chevron_right", ios: "chevron.right" }}
								size={GLYPH.chevron}
								weight="semibold"
							/>
						</PressScale>
					);
				})}
			</View>
			{offer}
			<PressScale
				className="mt-0.5 h-13.5 items-center justify-center rounded-full bg-surface-secondary"
				haptic={Presets.System.selection}
				onPress={actions.close}
			>
				<AppText style={BUTTON} variant="body" weight="medium">
					{CHECK_IN.notNow}
				</AppText>
			</PressScale>
		</>
	);
}
