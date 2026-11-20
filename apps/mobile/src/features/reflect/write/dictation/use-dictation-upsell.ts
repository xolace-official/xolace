import { useIsFocused } from "expo-router/react-navigation";
import { usePostHog } from "posthog-react-native";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { usePaywall } from "@/features/purchases/use-paywall";
import { usePlusEntitlement } from "@/features/purchases/use-plus-entitlement";
import { useAppStore } from "@/store/store";

export type DictationUpsell = {
	isOpen: boolean;
	onNotNow: () => void;
	onUpgrade: () => void;
	onDismiss: () => void;
};

type PaywallTrip = "none" | "opened" | "left";

export function useDictationUpsell(
	start: (openComposer?: () => void) => Promise<void>
) {
	const { status, isPlus } = usePlusEntitlement();
	const seen = useAppStore((s) => s.dictationUpsellSeen);
	const setSeen = useAppStore((s) => s.setDictationUpsellSeen);
	const openPaywall = usePaywall((s) => s.open);
	const posthog = usePostHog();
	const [isOpen, setIsOpen] = useState(false);
	const tripRef = useRef<PaywallTrip>("none");
	const openComposerRef = useRef<(() => void) | undefined>(undefined);
	const isFocused = useIsFocused();

	const returnFromPaywall = useEffectEvent(() => {
		if (isPlus) {
			void start(openComposerRef.current);
		}
	});

	useEffect(() => {
		if (!isFocused) {
			if (tripRef.current === "opened") {
				tripRef.current = "left";
			}
		} else if (tripRef.current === "left") {
			tripRef.current = "none";
			returnFromPaywall();
		}
	}, [isFocused]);

	const intercept = (openComposer?: () => void) => {
		if (status !== "free" || seen) {
			return false;
		}
		setSeen(true);
		openComposerRef.current = openComposer;
		setIsOpen(true);
		posthog.capture("plus_upsell_shown", { surface: "dictation" });
		return true;
	};

	const dictationUpsell: DictationUpsell = {
		isOpen,
		onDismiss: () => setIsOpen(false),
		onNotNow: () => {
			setIsOpen(false);
			void start(openComposerRef.current);
		},
		onUpgrade: () => {
			setIsOpen(false);
			posthog.capture("plus_upsell_tapped", { surface: "dictation" });
			tripRef.current = "opened";
			openPaywall("dictation");
		},
	};

	return { dictationUpsell, intercept };
}
