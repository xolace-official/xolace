// The unlock moment (#523, copy #513): a domain came into focus this session.
// The first unlock is a full-screen milestone; later ones a quiet card.
// Showing it marks it seen, so the next-day push stands down.

import { api } from "@xolace/backend/convex/_generated/api";
import type { Doc, Id } from "@xolace/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { PressableFeedback, Surface } from "heroui-native";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { DOMAIN_META } from "@/features/insights/domains";
import { playSoftPress } from "@/lib/haptics";
import { useTokenColor } from "@/lib/use-token-color";

type Unlock = NonNullable<Doc<"sessions">["domainUnlock"]>;

const EASE: [number, number, number, number] = [0.25, 0.1, 0.25, 1];
const TRANSITION = { duration: 440, easing: EASE, type: "timing" } as const;

/** "Family is coming into focus." / "Work & Studies and Family are coming into focus." */
const titleOf = (domains: Unlock["domains"]) => {
	const labels = domains.map((d) => DOMAIN_META[d].label);
	const names =
		labels.length > 1
			? `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`
			: labels[0];
	return `${names} ${labels.length > 1 ? "are" : "is"} coming into focus.`;
};

const bodyOf = (domains: Unlock["domains"]) =>
	`You've shared enough for Xolace to see how ${domains.length > 1 ? "these parts" : "this part"} of life tend${domains.length > 1 ? "" : "s"} to feel for you. It only knows what you've told it here.`;

type Props = { sessionId: Id<"sessions">; unlock: Unlock | undefined };

export function UnlockBeat({ sessionId, unlock }: Props) {
	const router = useRouter();
	const markSeen = useMutation(api.compounding.unlocks.markSeen);
	const accent = useTokenColor("accent");
	const insets = useSafeAreaInsets();
	// The first unseen stamp, held: once seen it changes underneath and must not
	// hide the beat. Not held on mount, since it lands a moment after (#529).
	const [shown, setShown] = useState<Unlock | null>(null);
	if (!shown && unlock && unlock.seenAt === undefined) {
		setShown(unlock);
	}
	const [open, setOpen] = useState(true);

	useEffect(() => {
		if (shown) {
			markSeen({ sessionId }).catch(() => {});
		}
	}, [shown, sessionId, markSeen]);

	if (!(shown && open)) {
		return null;
	}

	const seeIt = () => {
		playSoftPress();
		setOpen(false);
		router.push("/profile/insights");
	};
	const meta = DOMAIN_META[shown.domains[0]];

	if (!shown.first) {
		return (
			<EaseView
				animate={{ opacity: 1 }}
				initialAnimate={{ opacity: 0 }}
				transition={TRANSITION}
			>
				<Surface className="mx-5 mt-6 flex-row gap-3 rounded-2xl p-4">
					<View className="size-9 items-center justify-center rounded-xl bg-accent/12">
						<SymbolView name={meta.icon} size={17} tintColor={accent} />
					</View>
					<View className="flex-1 gap-1">
						<AppText className="font-medium text-[15px] text-foreground">
							{titleOf(shown.domains)}
						</AppText>
						<AppText className="text-[13px] text-muted leading-5">
							{bodyOf(shown.domains)}
						</AppText>
						<PressableFeedback
							accessibilityRole="button"
							className="self-start pt-1"
							hitSlop={12}
							onPress={seeIt}
						>
							<AppText className="font-semibold text-[13px] text-accent">
								See it
							</AppText>
						</PressableFeedback>
					</View>
				</Surface>
			</EaseView>
		);
	}

	return (
		<EaseView
			// Screen readers stay on the milestone, not the session end beneath it.
			accessibilityViewIsModal
			animate={{ opacity: 1 }}
			className="absolute inset-0 bg-background px-6"
			initialAnimate={{ opacity: 0 }}
			style={{ paddingBottom: insets.bottom + 8, paddingTop: insets.top }}
			transition={TRANSITION}
		>
			<View className="flex-1 justify-between">
				<View />
				<View className="items-center gap-8">
					<View className="size-24 items-center justify-center rounded-full bg-accent/12">
						<SymbolView name={meta.icon} size={40} tintColor={accent} />
					</View>
					<View className="items-center gap-3">
						<AppText className="text-center font-semibold text-3xl text-foreground leading-10">
							{titleOf(shown.domains)}
						</AppText>
						<AppText className="text-center text-base text-foreground/50 leading-6">
							{bodyOf(shown.domains)}
						</AppText>
					</View>
				</View>
				<View className="gap-3">
					<PressableFeedback
						accessibilityRole="button"
						className="items-center rounded-full border border-accent/30 bg-accent/10 py-4"
						onPress={seeIt}
					>
						<AppText className="font-semibold text-accent text-base">
							See it
						</AppText>
					</PressableFeedback>
					<PressableFeedback
						accessibilityRole="button"
						className="items-center rounded-full border border-border py-4"
						onPress={() => setOpen(false)}
					>
						<AppText className="font-light text-base text-foreground/30">
							Not now
						</AppText>
					</PressableFeedback>
				</View>
			</View>
		</EaseView>
	);
}
