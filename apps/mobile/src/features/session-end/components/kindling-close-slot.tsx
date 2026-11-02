import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { SymbolView } from "expo-symbols";
import { PressableFeedback, useThemeColor } from "heroui-native";
import { usePostHog } from "posthog-react-native";
import { useEffect, useRef } from "react";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { usePaywall } from "@/features/purchases/use-paywall";
import { usePlusEntitlement } from "@/features/purchases/use-plus-entitlement";
import { playSoftPress } from "@/lib/haptics";

type Props = {
	sessionId?: Id<"sessions">;
	/** Plus only. `ready` once this session's kindling has landed. */
	onOpenKindling?: (ready: boolean) => void;
};

/** Rounded-square icon badge: flame for pro, lock for the free upsell. */
function KindlingIconTile({ locked }: { locked: boolean }) {
	const accent = useThemeColor("accent") as string;
	return (
		<View className="h-11 w-11 items-center justify-center rounded-2xl border border-accent/20 bg-accent/12">
			<SymbolView
				name={
					locked
						? { android: "lock", ios: "lock.fill", web: "lock" }
						: {
								android: "local_fire_department",
								ios: "flame.fill",
								web: "local_fire_department",
							}
				}
				size={22}
				tintColor={accent}
			/>
		</View>
	);
}

/** Session-end's two kindling slots (docs/paths-v1.md §11-§12, #337): the premium
 * setup card and the free upsell, both gated on a qualifying session (ADR 0009).
 * Independent of `CloseOffer`; renders nothing while entitlement or qualification resolves.
 * The premium card leads to Discovery, or straight to the kindling once it has landed. */
export const KindlingCloseSlot = ({ sessionId, onOpenKindling }: Props) => {
	const { isPlus, isResolved } = usePlusEntitlement();
	const qualifies = useQuery(
		api.paths.isKindlingQualifyingSession,
		sessionId ? { sessionId } : "skip"
	);
	// Same args as Discovery's card, so the subscription is shared and warm there.
	const active = useQuery(
		api.paths.getActive,
		sessionId && isPlus ? { withRead: true, withTry: true } : "skip"
	);
	const posthog = usePostHog();
	const openPaywall = usePaywall((s) => s.open);
	const shownRef = useRef(false);

	const ready = isResolved && qualifies !== undefined;

	useEffect(() => {
		if (!ready || isPlus || !qualifies || shownRef.current) {
			return;
		}
		shownRef.current = true;
		posthog.capture("plus_upsell_shown", { surface: "kindling" });
	}, [ready, isPlus, qualifies, posthog]);

	if (!(ready && qualifies)) {
		return null;
	}

	if (isPlus) {
		const kindlingReady = active?.sessionId === sessionId;
		return (
			<PressableFeedback
				accessibilityLabel={
					kindlingReady ? "Open your kindling" : "Go to Discovery"
				}
				accessibilityRole="button"
				className="w-full flex-row items-center gap-3 rounded-2xl border border-accent/25 bg-accent/10 px-5 py-4"
				isDisabled={!onOpenKindling}
				onPress={() => {
					playSoftPress();
					onOpenKindling?.(kindlingReady);
				}}
			>
				<KindlingIconTile locked={false} />
				<View className="flex-1">
					<AppText className="font-medium text-base text-foreground">
						{kindlingReady
							? "Your kindling is ready"
							: "Setting up your kindling…"}
					</AppText>
					<AppText className="mt-0.5 font-light text-foreground/55 text-xs">
						{kindlingReady
							? "A few things from today, ready to tend. Tap to open."
							: "It lands on Discovery when it's ready. Tap to head there."}
					</AppText>
				</View>
			</PressableFeedback>
		);
	}

	return (
		<PressableFeedback
			accessibilityLabel="See what Xolace+ sets up"
			accessibilityRole="button"
			className="w-full flex-row items-center gap-3 rounded-2xl border border-accent/40 bg-accent/15 px-5 py-4"
			onPress={() => {
				playSoftPress();
				posthog.capture("plus_upsell_tapped", { surface: "kindling" });
				openPaywall("kindling", { sessionId });
			}}
		>
			<KindlingIconTile locked={true} />
			<View className="flex-1">
				<AppText className="font-medium text-accent text-base">
					Turn this into kindling
				</AppText>
				<AppText className="mt-0.5 font-light text-foreground/55 text-xs">
					Xolace+ carries today into what&apos;s next. Tap to see how.
				</AppText>
			</View>
		</PressableFeedback>
	);
};
