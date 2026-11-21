import { router, usePathname } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { AppState, Linking } from "react-native";
import { useFullContext } from "@/lib/convex/use-full-context";
import { tappedSince } from "@/lib/last-notification-tap";
import { LATEST_RELEASE } from "@/lib/release-notes";
import { ratingsOf } from "@/store/ratings-slice";
import { useAppStore } from "@/store/store";
import {
	afterShowing,
	isHelpRoute,
	isLink,
	isPlainOpen,
	planOpen,
	RATING_RULES,
	withBaseline,
} from "./ratings-model";

const TAP_SLACK_MS = 2000;

type Open = { at: number; firstRun: boolean };

export type OpenAskProps = {
	firstRun: boolean;
	revealed: boolean;
};

export function useOpenAsk({ firstRun, revealed }: OpenAskProps): void {
	const pathname = usePathname();
	const ctx = useFullContext();
	const path = useRef(pathname);
	const linked = useRef(false);
	const [urlRead, setUrlRead] = useState(false);
	const [open, setOpen] = useState<Open | null>(() => ({ at: 0, firstRun }));
	const noteRatingsSignal = useAppStore((s) => s.noteRatingsSignal);

	useEffect(() => {
		path.current = pathname;
		if (isHelpRoute(pathname)) {
			noteRatingsSignal("help");
		}
	}, [pathname, noteRatingsSignal]);

	useEffect(() => {
		let alive = true;
		Linking.getInitialURL()
			.then((url) => {
				if (alive && isLink(url)) {
					linked.current = true;
				}
			})
			.catch(() => undefined)
			.finally(() => alive && setUrlRead(true));
		const urlSub = Linking.addEventListener("url", ({ url }) => {
			if (isLink(url)) {
				linked.current = true;
			}
		});
		let last = AppState.currentState;
		const appSub = AppState.addEventListener("change", (next) => {
			if (next === "background") {
				linked.current = false;
			}
			if (last === "background" && next === "active") {
				setOpen({ at: Date.now() - TAP_SLACK_MS, firstRun: false });
			}
			last = next;
		});
		return () => {
			alive = false;
			urlSub.remove();
			appSub.remove();
		};
	}, []);

	const createdAt = ctx?.user.createdAt;
	const cardWaiting = ctx?.hasPendingFollowUp ?? false;
	useEffect(() => {
		if (!(open && revealed && urlRead) || createdAt === undefined) {
			return;
		}
		const timer = setTimeout(() => {
			setOpen(null);
			const store = useAppStore.getState();
			const stored = ratingsOf(store);
			const ran = stored.firstRan;
			if (ran?.id !== LATEST_RELEASE.id) {
				return;
			}
			const record = withBaseline(stored, createdAt, ran);
			const moment = {
				blocked: store.homeSheetBlocking,
				linked: linked.current || tappedSince(open.at),
				pathname: path.current,
			};
			linked.current = false;
			const now = Date.now();
			const plan = isPlainOpen(moment)
				? planOpen({
						cardWaiting,
						firstRun: open.firstRun,
						now,
						record,
						release: ran,
					})
				: null;
			const patch = {
				...(record === stored ? {} : { seen: record.seen }),
				...(plan ? afterShowing(record, plan, LATEST_RELEASE.id, now) : {}),
			};
			if (Object.keys(patch).length > 0) {
				store.setRatings(patch);
			}
			if (plan?.whatsNew) {
				router.push({
					params: { next: plan.rate ? "rate" : "close" },
					pathname: "/ratings/whats-new",
				});
			} else if (plan?.rate) {
				router.push({ params: { from: "open" }, pathname: "/ratings/rate" });
			}
		}, RATING_RULES.openSettleMs);
		return () => clearTimeout(timer);
	}, [open, revealed, urlRead, createdAt, cardWaiting]);
}
