import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { cn } from "@/lib/cn";
import { playSoftPress } from "@/lib/haptics";
import { useTokenColors } from "@/lib/use-token-color";
import { AgeHeading } from "./age-ask";
import { useAgeSheetScreen } from "./age-gate-data";
import { AGE } from "./copy";

type Way = (typeof AGE.ways)[number];
const CHEVRON = { android: "chevron_right", ios: "chevron.right" } as const;

export function AgeOutcome() {
	const { state, actions } = useAgeSheetScreen();
	if (state.step === "ask") {
		return null;
	}
	const copy = AGE.outcomes[state.surface][state.step];
	const ways =
		state.step === "under_13"
			? AGE.ways.filter((w) => w.id === "crisis")
			: AGE.ways;
	return (
		<View>
			<AgeHeading body={copy.body} title={copy.title} />
			<View className="mt-5 rounded-[18px] border-continuous bg-surface-secondary">
				{ways.map((way, i) => (
					<View key={way.id}>
						{i > 0 ? <View className="ml-15 h-px bg-separator" /> : null}
						<WayRow onPress={() => actions.go(way.href)} way={way} />
					</View>
				))}
			</View>
			<PressScale
				accessibilityRole="button"
				className="mt-6 h-14 items-center justify-center rounded-[28px] bg-foreground"
				haptic={playSoftPress}
				onPress={actions.close}
			>
				<AppText
					className="text-[17px]"
					color="background"
					variant="subhead"
					weight="semibold"
				>
					{AGE.ok}
				</AppText>
			</PressScale>
		</View>
	);
}

function WayRow({ way, onPress }: { way: Way; onPress: () => void }) {
	const [dangerInk, accentInk, subtle] = useTokenColors([
		"danger-ink",
		"accent-ink",
		"subtle",
	]);
	const crisis = way.id === "crisis";
	const stop = way.title.endsWith("?") ? "" : ".";
	return (
		<PressScale
			accessibilityLabel={`${way.title}${stop} ${way.sub}`}
			accessibilityRole="link"
			className="min-h-16 flex-row items-center gap-3 px-3.5 py-3"
			haptic={playSoftPress}
			onPress={onPress}
			scaleTo={0.98}
		>
			<View
				className={cn(
					"size-8.5 items-center justify-center rounded-[10px]",
					crisis ? "bg-danger-wash" : "bg-accent-wash"
				)}
			>
				<Icon
					color={crisis ? dangerInk : accentInk}
					name={way.icon}
					size={16}
				/>
			</View>
			<View className="flex-1">
				<AppText className="text-[15.5px] leading-5" weight="semibold">
					{way.title}
				</AppText>
				<AppText color="muted" variant="footnote">
					{way.sub}
				</AppText>
			</View>
			<Icon color={subtle} name={CHEVRON} size={13} weight="semibold" />
		</PressScale>
	);
}
