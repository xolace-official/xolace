import { useAuth } from "@clerk/expo";
import { api } from "@xolace/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import { useIsFocused } from "expo-router/react-navigation";
import { openBrowserAsync } from "expo-web-browser";
import { usePostHog } from "posthog-react-native";
import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useFullContext } from "@/lib/convex/use-full-context";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { useAppStore } from "@/store/store";
import {
	awayOf,
	dayLabel,
	episodeKey,
	type Items,
	NO_OUTCOMES,
	pillLabelOf,
	shouldGreet,
	waitingOf,
} from "./coming-back-model";
import { useEpisode } from "./episode-store";
import type { ReturnPill } from "./return-pill-data";
import type { WelcomeBack } from "./welcome-back-data";

/** Let Today land before anything greets you. */
const GREET_AFTER_MS = 700;
/** Board `tapCk` / `tapPm`: the press plays, the row opens 130 ms later. */
const OPEN_AFTER_MS = 130;
/** Production's `pendingEventPrompt` lifetime: a read or written prompt rides on Reflect for 7 days. */
const CARRY_MS = 7 * 24 * 60 * 60 * 1000;

/** Device-local "YYYY-MM-DD", as `monthlyEvents.prompt.getWaiting` takes it. */
const localDay = () => new Date().toLocaleDateString("en-CA");
const timezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/** Settles the streak on every focus and foreground; the frozen days still to acknowledge. */
function useFrozenDays(active: boolean): number | null {
	const settle = useMutation(api.streaks.state.settle);
	const [days, setDays] = useState<number | null>(null);
	useEffect(() => {
		if (!active) {
			return;
		}
		let live = true;
		const run = () =>
			settle({ timezone: timezone() }).then(
				(n) => live && setDays(n),
				() => live && setDays((d) => d ?? 0)
			);
		run();
		const sub = AppState.addEventListener("change", (s) => {
			if (s === "active") {
				run();
			}
		});
		return () => {
			live = false;
			sub.remove();
		};
	}, [active, settle]);
	return days;
}

/** This month's event, unless the v1 sheet already showed it (then it's let pass, once). */
function useMonthEvent(active: boolean) {
	const event = useQuery(
		api.monthlyEvents.prompt.getWaiting,
		active ? { today: localDay() } : "skip"
	);
	const seen = useAppStore((s) => s.seenEventIds);
	const choose = useMutation(api.monthlyEvents.prompt.choose);
	const v1Seen = !!event && seen.some((e) => e.slug === event.slug);
	const migrated = useRef<string | null>(null);
	useEffect(() => {
		if (!(event && v1Seen) || migrated.current === event._id) {
			return;
		}
		migrated.current = event._id;
		choose({ choice: "passed", eventId: event._id }).catch(() => undefined);
	}, [event, v1Seen, choose]);
	return v1Seen ? null : event;
}

/**
 * Today's side of coming back (handoff §1): checks in with the server on open (`markReturn`,
 * the streak's settle), works out what this return holds, and opens the greeting once, 700 ms
 * after Today is in front. Nothing opens the check-in on its own. Keeps Reflect's starter
 * bubble and the arrivals waiting while the greeting is due or up.
 */
export function useComingBackHost(): {
	/** A notification tapped open while the app ran, for the banner over Today. */
	banner: string | null;
	dismissBanner: () => void;
} {
	const focused = useIsFocused();
	const { userId } = useAuth();
	const posthog = usePostHog();
	const ctx = useFullContext();
	const profile = ctx?.profile;
	const active = focused && !!profile;

	const markReturn = useMutation(api.followUps.markReturn);
	const pending = ctx?.hasPendingFollowUp ?? false;
	const returned = useRef(false);
	useEffect(() => {
		if (!(active && pending)) {
			returned.current = false;
			return;
		}
		if (!returned.current) {
			returned.current = true;
			markReturn({}).catch(() => undefined);
		}
	}, [active, pending, markReturn]);

	const frozen = useFrozenDays(active);
	const card = useQuery(
		api.followUps.waiting.getWaitingCard,
		profile ? {} : "skip"
	);
	const event = useMonthEvent(!!profile);

	const ep = useEpisode();
	const now = Date.now();
	const loaded =
		!!profile && frozen !== null && card !== undefined && event !== undefined;
	const away = profile ? awayOf(profile, now) : "next";
	// Placeholder until the card carries its own day: the session it followed up on.
	const day = dayLabel(profile?.lastSessionAt ?? now, now);
	const items: Items = {
		card: card ?? null,
		day,
		event: event ?? null,
		freeze:
			frozen && frozen > 0 ? { days: frozen, streak: ctx?.streak ?? 0 } : null,
	};
	const key = `${userId ?? ""}|${episodeKey(away, profile?.lastSessionAt, items)}`;
	const due =
		loaded && !ep.open && ep.greeted !== key && shouldGreet(away, items);

	const name = ctx?.preferences?.displayName ?? null;
	const { setLive } = ep;
	useEffect(() => {
		setLive({
			away,
			due,
			items: { card: card ?? null, day, event: event ?? null, freeze: null },
			name,
		});
	}, [away, card, day, due, event, name, setLive]);

	const snapshot = useRef({ away, items, name });
	snapshot.current = { away, items, name };
	useEffect(() => {
		if (!(focused && due)) {
			return;
		}
		const id = setTimeout(() => {
			const snap = snapshot.current;
			useEpisode.getState().markGreeted(key);
			useEpisode.getState().openGreeting("greet", snap);
			posthog.capture("welcome_back_shown", {
				away: snap.away,
				check_in: snap.items.card !== null,
				freeze: snap.items.freeze !== null,
				prompt: snap.items.event !== null,
			});
			router.push("/welcome-back");
		}, GREET_AFTER_MS);
		return () => clearTimeout(id);
	}, [focused, due, key, posthog]);

	const setBlocking = useAppStore((s) => s.setHomeSheetBlocking);
	const setOpen = useAppStore((s) => s.setHomeSheetOpen);
	useEffect(() => setBlocking(due || ep.open), [due, ep.open, setBlocking]);
	useEffect(() => {
		setOpen(ep.open);
		return () => setOpen(false);
	}, [ep.open, setOpen]);

	const last = useAppStore((s) => s.lastNotification);
	const dismissBanner = useAppStore((s) => s.clearLastNotification);
	return { banner: focused ? (last?.content ?? null) : null, dismissBanner };
}

/** The greeting (both pages) on the episode store and Convex. */
export function useWelcomeBack(): WelcomeBack {
	const ep = useEpisode();
	const reduced = useEffectiveReducedMotion();
	const posthog = usePostHog();
	const markShown = useMutation(api.followUps.markShown);
	const acknowledgeFreezes = useMutation(api.streaks.state.acknowledgeFreezes);
	const choose = useMutation(api.monthlyEvents.prompt.choose);
	const setPending = useAppStore((s) => s.setPendingEventPrompt);
	const { card, event, freeze } = ep.items;

	// The check-in row is on screen: its 3 days start (once; re-calling never extends them).
	const cardId = card?._id;
	useEffect(() => {
		if (!cardId) {
			return;
		}
		markShown({ cardId }).catch(() => undefined);
		posthog.capture("follow_up_shown", {
			escalation_derived: card?.escalationDerived ?? false,
			tier: card?.tier,
		});
	}, [cardId, markShown, posthog, card?.escalationDerived, card?.tier]);

	const carry = (choice: "read" | "written") => {
		if (!event) {
			return;
		}
		choose({ choice, eventId: event._id }).catch(() => undefined);
		posthog.capture("monthly_prompt_chosen", { choice, slug: event.slug });
		if (event.sessionPrompt) {
			setPending({
				expiresAt: Date.now() + CARRY_MS,
				label: event.title,
				text: event.sessionPrompt,
			});
		}
	};

	return {
		actions: {
			article: () => {
				if (event?.linkUrl) {
					openBrowserAsync(event.linkUrl).catch(() => undefined);
				}
			},
			back: () => {
				carry("read");
				ep.leavePrompt("read");
			},
			closed: () => {
				if (freeze && ep.mode === "greet") {
					acknowledgeFreezes({}).catch(() => undefined);
				}
				ep.closeGreeting();
			},
			landDeferred: ep.landDeferred,
			openCheckIn: () => {
				setTimeout(() => {
					useEpisode.getState().setCheckInOpen(true);
					router.push("/check-in");
				}, OPEN_AFTER_MS);
			},
			openPrompt: () => {
				setTimeout(
					() => useEpisode.getState().setPage("prompt"),
					OPEN_AFTER_MS
				);
			},
			pass: () => {
				if (event) {
					choose({ choice: "passed", eventId: event._id }).catch(
						() => undefined
					);
					posthog.capture("monthly_prompt_chosen", {
						choice: "passed",
						slug: event.slug,
					});
				}
				ep.leavePrompt("passed");
			},
			write: () => {
				carry("written");
				ep.writePrompt();
			},
		},
		state: {
			away: ep.away,
			ciOpen: ep.ciOpen,
			enter: ep.enter,
			items: ep.items,
			just: ep.just,
			mode: ep.mode,
			name: ep.name,
			outcomes: ep.outcomes,
			page: ep.page,
			reduced,
			tickKey: ep.tickKey,
		},
	};
}

/** What waits on Today, under the greeting. */
export function useReturnPill(): ReturnPill {
	const ep = useEpisode();
	const reduced = useEffectiveReducedMotion();
	const { away, due, items, name } = ep.live;
	const { ck, pm } = waitingOf(items, NO_OUTCOMES);
	const label = pillLabelOf({ ck, pm }, items.day);
	return {
		actions: {
			open: () => {
				useEpisode.getState().openGreeting("left", { away, items, name });
				router.push("/welcome-back");
			},
		},
		state: {
			ck,
			closeKey: ep.closeKey,
			label: due || ep.open ? null : label,
			pm,
			reduced,
		},
	};
}
