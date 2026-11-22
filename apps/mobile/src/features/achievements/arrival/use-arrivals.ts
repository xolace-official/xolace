import { api } from "@xolace/backend/api";
import { useMutation, useQuery } from "convex/react";
import { router, usePathname } from "expo-router";
import { useEffect, useState, useSyncExternalStore } from "react";
import { AppState } from "react-native";
import type { Arrivals } from "@/features/achievements/arrival/arrival-data";
import {
	type ArrivalPlan,
	arrivalPlan,
	mayArrive,
} from "@/features/achievements/arrival/arrival-model";
import { useAppStore } from "@/store/store";

const SETTLE_MS = 800;

const subscribeAppState = (onChange: () => void) => {
	const sub = AppState.addEventListener("change", onChange);
	return () => sub.remove();
};
const isForeground = () => AppState.currentState === "active";

export function useArrivals(
	isPresented: (pathname: string) => boolean
): Arrivals {
	const pathname = usePathname();
	const foreground = useSyncExternalStore(subscribeAppState, isForeground);
	const onReflect = pathname === "/reflect";
	const unseen = useQuery(api.achievements.unlock.unseen);
	const summary = useQuery(api.achievements.firstSight.summary);
	const activeSession = useQuery(
		api.sessions.getActive,
		onReflect ? {} : "skip"
	);
	const homeSheetOpen = useAppStore((s) => s.homeSheetOpen);
	const homeComposing = useAppStore((s) => s.homeComposing);
	const reflectBusy = onReflect && (activeSession !== null || homeComposing);
	const homeBusy = reflectBusy || homeSheetOpen;
	const markUnseen = useMutation(
		api.achievements.unlock.markSeen
	).withOptimisticUpdate((store, { ids }) => {
		const current = store.getQuery(api.achievements.unlock.unseen, {});
		if (current !== undefined) {
			store.setQuery(
				api.achievements.unlock.unseen,
				{},
				current.filter((b) => !ids.includes(b.id))
			);
		}
	});
	const markSummary = useMutation(api.achievements.firstSight.markSeen);

	const [plan, setPlan] = useState<ArrivalPlan | null>(null);
	const [open, setOpen] = useState(false);
	// Ids already shown this run: a closed plan's badges stay out until the queries catch up.
	const [opened, setOpened] = useState<ReadonlySet<string>>(() => new Set());
	const mayOpen =
		foreground &&
		mayArrive({ homeBusy, pathname, presented: isPresented(pathname) });

	const next =
		!plan && mayOpen && summary !== undefined && unseen !== undefined
			? arrivalPlan({ opened, summary, unseen })
			: null;
	if (next) {
		setOpened(new Set([...opened, ...next.ids]));
		setPlan(next);
	}

	useEffect(() => {
		if (!plan || open) {
			return;
		}
		if (!mayOpen) {
			return;
		}
		const timer = setTimeout(() => setOpen(true), SETTLE_MS);
		return () => clearTimeout(timer);
	}, [plan, open, mayOpen]);

	const closed = () => {
		if (plan) {
			const mark = plan.kind === "backfill" ? markSummary : markUnseen;
			mark({ ids: plan.ids }).catch(() => undefined);
		}
		setOpen(false);
		setPlan(null);
	};

	return {
		actions: {
			closed,
			seeBadges: () => {
				if (!pathname.startsWith("/achievements")) {
					router.push("/achievements");
				}
			},
		},
		state: { open, plan },
	};
}
