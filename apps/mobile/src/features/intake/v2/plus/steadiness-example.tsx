// Steadiness on the Plus side of the Xolace+ step (#713): the Insights rings as they'd look,
// with example values, marked as an example so nobody reads them as their own.
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import type { IconName } from "@/components/shared/icon";
import {
	type RingTone,
	SteadinessRing,
} from "@/components/shared/steadiness-ring";
import { cn } from "@/lib/utils";

const RING_SIZE = 68;
const RING_STROKE = 6;

/** Production's names and icons for the three example parts (insights/domains.ts). */
const DOMAIN_META = {
	health: {
		icon: { android: "bedtime", ios: "bed.double.fill", web: "bedtime" },
		label: "Health & Rest",
	},
	love: {
		icon: { android: "favorite", ios: "heart.fill", web: "favorite" },
		label: "Love & Friendship",
	},
	work: {
		icon: { android: "work", ios: "briefcase.fill", web: "work" },
		label: "Work & Studies",
	},
} as const satisfies Record<string, { icon: IconName; label: string }>;

/** Example values only. Colour is state, never domain: ember is "heavier than your usual". */
const EXAMPLE_RINGS = [
	{
		domain: "work",
		tone: "ember",
		value: 38,
		word: "Heavier lately",
	},
	{ domain: "health", tone: "accent", value: 72, word: "Steady" },
	{
		domain: "love",
		tone: "accent",
		value: 64,
		word: "Easing",
	},
] as const satisfies readonly {
	domain: keyof typeof DOMAIN_META;
	tone: RingTone;
	value: number;
	word: string;
}[];

const EXAMPLE_LABEL = EXAMPLE_RINGS.map(
	(ring) => `${DOMAIN_META[ring.domain].label} ${ring.word.toLowerCase()}`
).join(", ");

const EXAMPLE_LINE =
	"Work & Studies has been heavier than your usual for 3 weeks. Flux noticed before it boiled over.";

export function SteadinessExample() {
	return (
		<View className="gap-3">
			<View
				accessibilityLabel={`An example: ${EXAMPLE_LABEL}.`}
				accessible
				className="gap-2"
			>
				<View className="self-start rounded-full bg-surface-secondary px-2 py-0.5">
					<AppText className="font-[Poppins-Medium] text-[11px] text-muted">
						Example
					</AppText>
				</View>
				<View className="flex-row gap-2">
					{EXAMPLE_RINGS.map((ring) => {
						const meta = DOMAIN_META[ring.domain];
						return (
							<View className="flex-1 items-center gap-1.5" key={ring.domain}>
								<SteadinessRing
									icon={meta.icon}
									size={RING_SIZE}
									stroke={RING_STROKE}
									tone={ring.tone}
									value={ring.value}
								/>
								<AppText className="text-center font-[Poppins-SemiBold] text-[12px] text-foreground leading-[15px]">
									{meta.label}
								</AppText>
								<AppText
									className={cn(
										"font-[Poppins-Medium] text-[11px]",
										ring.tone === "ember" ? "text-ember" : "text-muted"
									)}
								>
									{ring.word}
								</AppText>
							</View>
						);
					})}
				</View>
			</View>
			<View
				accessibilityLabel={`An example: ${EXAMPLE_LINE}`}
				accessible
				className="rounded-[14px] bg-ember/12 px-3 py-2.5"
			>
				<AppText className="text-[13px] text-foreground leading-[19px]">
					{EXAMPLE_LINE}
				</AppText>
			</View>
		</View>
	);
}
