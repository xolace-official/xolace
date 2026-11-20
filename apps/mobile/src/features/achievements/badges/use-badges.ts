import { api } from "@xolace/backend/api";
import { useMutation, useQuery } from "convex/react";
import { Share } from "react-native";
import { toast } from "@/components/shared/toast";
import { longDate } from "@/features/achievements/achievements-model";
import type { Badges } from "@/features/achievements/badges/badges-data";
import {
	type BadgeView,
	badgesView,
	freezeView,
	pinRefusal,
	pinRefused,
} from "@/features/achievements/badges/badges-model";
import { COPY } from "@/features/achievements/copy";
import { convexErrorCode } from "@/lib/convex-error-code";
import {
	playAffirmativePress,
	playErrorNotice,
	playSoftPress,
} from "@/lib/haptics";
import { freezeRefusal } from "@/lib/streak-freeze";
import { useSingleFlight } from "@/lib/use-single-flight";

const WARN_AFTER_MS = 120;

export function useBadges(): Badges {
	const overview = useQuery(api.achievements.display.overview);
	const shelf = useQuery(api.achievements.display.shelf);
	const setPinned = useMutation(
		api.achievements.pins.setPinned
	).withOptimisticUpdate((store, { achievementId, pinned }) => {
		const current = store.getQuery(api.achievements.display.overview, {});
		if (current === undefined) {
			return;
		}
		store.setQuery(
			api.achievements.display.overview,
			{},
			{
				...current,
				categories: current.categories.map((c) => ({
					...c,
					achievements: c.achievements.map((a) =>
						a.achievementId === achievementId ? { ...a, pinned } : a
					),
				})),
			}
		);
	});
	const buyFreeze = useMutation(api.achievements.sparks.buyFreeze);
	const purchase = useSingleFlight();
	const view = overview ? badgesView(overview) : undefined;

	const togglePin = (b: BadgeView) => {
		if (b.earnedAt === undefined || !view) {
			return;
		}
		playSoftPress();
		if (pinRefused(b, view.pinnedCount)) {
			toast(COPY.pins.limit, {
				haptic: () => setTimeout(playErrorNotice, WARN_AFTER_MS),
				variant: "warning",
			});
			return;
		}
		const pinning = !b.pinned;
		setPinned({ achievementId: b.id, pinned: pinning }).catch((error) => {
			toast(pinRefusal(convexErrorCode(error), pinning), {
				variant: "warning",
			});
		});
	};

	const share = (b: BadgeView) => {
		if (b.earnedAt === undefined) {
			return;
		}
		Share.share({
			message: COPY.badge.shareMessage(b.title, longDate(b.earnedAt)),
		}).catch(() => undefined);
	};

	const freeze = shelf ? freezeView(shelf) : undefined;
	const buy = async () => {
		if (!(shelf && freeze) || purchase.isBusy()) {
			return;
		}
		if (freeze.reason) {
			toast(freeze.reason, { variant: "warning" });
			return;
		}
		await purchase.run(async () => {
			try {
				await buyFreeze();
				playAffirmativePress();
			} catch (error) {
				toast(freezeRefusal(convexErrorCode(error), shelf.freezeCap), {
					variant: "warning",
				});
			}
		});
	};

	const missing = () => toast(COPY.badge.gone);

	return {
		actions: { buyFreeze: buy, missing, share, togglePin },
		state: { buying: purchase.busy, freeze, view },
	};
}
