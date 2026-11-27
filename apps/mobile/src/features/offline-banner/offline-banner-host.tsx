import { usePathname } from "expo-router";
import { useEffect, useRef } from "react";
import { AccessibilityInfo } from "react-native";
import { useOffline } from "@/lib/connection/use-connection";
import { useOfflineMessageClaimed } from "@/lib/connection/use-offline-claim";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { OFFLINE_BANNER } from "./copy";
import { bannerStart, bannerVisible, nextBanner } from "./offline-banner-model";
import { OfflineStrip } from "./offline-strip";

/** "You're offline." over the main screens, following the device's internet only. */
export function OfflineBannerHost({
	isPresented,
}: {
	isPresented: (pathname: string) => boolean;
}) {
	const offline = useOffline();
	const claimed = useOfflineMessageClaimed();
	const covered = isPresented(usePathname());
	const reduced = useEffectiveReducedMotion();
	const bannerState = useRef(bannerStart);

	useEffect(() => {
		const step = nextBanner(bannerState.current, { claimed, covered, offline });
		bannerState.current = step.state;
		if (step.announce !== null) {
			AccessibilityInfo.announceForAccessibilityWithOptions(
				OFFLINE_BANNER.announce[step.announce],
				{ queue: true }
			);
		}
	}, [claimed, covered, offline]);

	return bannerVisible({ claimed, covered, offline }) ? (
		<OfflineStrip reduced={reduced} />
	) : null;
}
