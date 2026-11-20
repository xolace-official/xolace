import { api } from "@xolace/backend/api";
import type { Id } from "@xolace/backend/dataModel";
import type { OptimisticLocalStore } from "convex/browser";
import { useAction, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { router } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useEffect, useRef, useState } from "react";
import { usePaywall } from "@/features/purchases/use-paywall";
import { usePlusEntitlement } from "@/features/purchases/use-plus-entitlement";
import { useStablePaginatedQuery } from "@/lib/convex/use-stable-query";
import { useAppStore } from "@/store/store";
import { useSoundMemory } from "./background/sound-memory";
import { STILLS } from "./background/stills";
import { useLoopRest } from "./background/use-loop-rest";
import { QUOTE_COPY } from "./copy";
import { useDailyQuoteOffer } from "./offer/use-daily-quote-offer";
import {
	KEPT_PREFETCH,
	keptCard,
	plainQuote,
	reasonLine,
	reflectSeed,
	resolveBackgrounds,
	shownBackground,
} from "./quotes-model";
import type { QuotesScreenValue, ReplyOutcome } from "./quotes-screen-data";
import { makeStill, saveToPhotos, shareImage } from "./share/make-share-file";
import { useColdStart } from "./use-cold-start";

const KEPT_PAGE = 12;

const readable = (e: unknown) =>
	e instanceof Error && e.message ? e.message : QUOTE_COPY.errors.generic;

function patchToday(
	store: OptimisticLocalStore,
	quoteId: Id<"daily_quotes">,
	patch: { savedAt?: number | null; reaction?: "resonates" | null }
) {
	const today = store.getQuery(api.dailyQuotes.getToday, {});
	if (!today) {
		return;
	}
	let delta = 0;
	const apply = <
		T extends {
			_id: Id<"daily_quotes">;
			savedAt?: number;
			reaction?: "resonates" | "not_today";
		} | null,
	>(
		q: T
	): T => {
		if (!q || q._id !== quoteId) {
			return q;
		}
		const next = { ...q };
		if (patch.savedAt !== undefined) {
			delta = (patch.savedAt ? 1 : 0) - (q.savedAt ? 1 : 0);
			next.savedAt = patch.savedAt ?? undefined;
		}
		if (patch.reaction !== undefined) {
			next.reaction = patch.reaction ?? undefined;
		}
		return next;
	};
	const curated = apply(today.curated);
	const session = apply(today.session);
	store.setQuery(
		api.dailyQuotes.getToday,
		{},
		{
			...today,
			curated,
			savedCount: Math.max(0, today.savedCount + delta),
			session,
		}
	);
}

export function useQuotes(tappedQuoteId?: string): QuotesScreenValue {
	const posthog = usePostHog();
	const today = useQuery(api.dailyQuotes.getToday);
	const prefs = useQuery(api.preferences.getQuotePreferences);
	const markOpened = useMutation(api.dailyQuotes.opened.markOpened);
	const offer = useDailyQuoteOffer();
	const catalogue = useQuery(api.quoteBackgrounds.catalogue.list);
	const savedKey = useQuery(api.preferences.quoteBackground.get);
	const live = useQuery(api.sessions.getActive);
	const kept = useStablePaginatedQuery(
		api.dailyQuotes.listSaved,
		{},
		{ initialNumItems: KEPT_PAGE }
	);
	const coldStart = useAction(api.dailyQuotes.coldStart);
	const setPrefs = useMutation(api.preferences.updateQuotePreferences);
	const replyTo = useAction(api.dailyQuotes.reply);
	const react = useMutation(api.dailyQuotes.react).withOptimisticUpdate(
		(store, a) => patchToday(store, a.quoteId, { reaction: "resonates" })
	);
	const unreact = useMutation(
		api.dailyQuotes.clearReaction
	).withOptimisticUpdate((store, a) =>
		patchToday(store, a.quoteId, { reaction: null })
	);
	const save = useMutation(api.dailyQuotes.save).withOptimisticUpdate(
		(store, a) => patchToday(store, a.quoteId, { savedAt: Date.now() })
	);
	const unsave = useMutation(api.dailyQuotes.unsave).withOptimisticUpdate(
		(store, a) => patchToday(store, a.quoteId, { savedAt: null })
	);
	const setBackground = useMutation(
		api.preferences.quoteBackground.set
	).withOptimisticUpdate((store, a) =>
		store.setQuery(api.preferences.quoteBackground.get, {}, a.background)
	);
	const { status: plus } = usePlusEntitlement();
	const openPaywall = usePaywall((s) => s.open);
	const setReplySeed = useAppStore((s) => s.setReplySeed);
	const soundOn = useSoundMemory((s) => s.soundOn);
	const rest = useLoopRest();
	const [sending, setSending] = useState(false);
	const tracked = useRef({ gate: false, viewed: false });

	const raw = today?.session ?? today?.curated ?? null;
	const opened = useRef(new Set<string>());
	const waiting = today !== undefined && prefs !== undefined && raw === null;

	const { coldError, retry } = useColdStart({
		start: () =>
			(prefs === null
				? setPrefs({ notificationEnabled: false, themes: [] })
				: Promise.resolve(null)
			).then(() => coldStart()),
		waiting,
	});

	useEffect(() => {
		if (!raw || tracked.current.viewed) {
			return;
		}
		tracked.current.viewed = true;
		posthog.capture("quote_viewed", {
			has_session_today: today?.hasSessionToday ?? false,
			quote_type: raw.type,
		});
	}, [raw, today?.hasSessionToday, posthog]);
	useEffect(() => {
		for (const id of [raw?._id, tappedQuoteId]) {
			if (!id || opened.current.has(id)) {
				continue;
			}
			opened.current.add(id);
			markOpened({ quoteId: id as Id<"daily_quotes"> }).catch((e: unknown) =>
				console.error("[quotes] markOpened failed", e)
			);
		}
	}, [raw?._id, tappedQuoteId, markOpened]);
	useEffect(() => {
		if (!today?.sessionLocked || tracked.current.gate) {
			return;
		}
		tracked.current.gate = true;
		posthog.capture("premium_gate_hit", {
			feature: "daily_quote",
			hasData: true,
		});
	}, [today?.sessionLocked, posthog]);

	const backgrounds = resolveBackgrounds(catalogue, STILLS);
	const background = shownBackground(savedKey, backgrounds, plus);
	let status: QuotesScreenValue["state"]["status"] = "loading";
	if (raw) {
		status = "ready";
	} else if (coldError) {
		status = "error";
	}

	const state: QuotesScreenValue["state"] = {
		active: rest.active,
		background,
		backgrounds,
		kept: kept.results.map(keptCard),
		keptCount: today?.savedCount ?? 0,
		lowPower: rest.lowPower,
		offerDailyQuote: offer.offerable,
		plus,
		quote: raw ? { text: plainQuote(raw.text), title: raw.title } : null,
		reason: reasonLine({
			hasSessionToday: today?.hasSessionToday ?? false,
			sessionLocked: today?.sessionLocked ?? false,
			type: raw?.type ?? "curated",
		}),
		reply: raw?.reply?.trim() || undefined,
		replyFlagged: raw?.replyModeration?.flagged === true,
		replyReaches: today?.replyReaches ?? false,
		resonated: raw?.reaction === "resonates",
		saved: raw?.savedAt !== undefined,
		saveLocked: today?.saveLocked ?? true,
		sending,
		soundOn,
		status,
	};

	// Promise chains, not try/catch, here and below: the React Compiler can't compile a try that
	// holds a condition yet, and this hook must stay compiled so `{ state, actions }` keeps its
	// identity between renders.
	const share = (fmt: "story" | "square", go: "save" | "share") =>
		makeStill(fmt)
			.then((uri) => (go === "save" ? saveToPhotos(uri) : shareImage(uri)))
			.then(() => {
				posthog.capture(go === "save" ? "quote_image_saved" : "quote_shared", {
					background: background.key,
					format: fmt,
				});
				return null;
			})
			.catch((e: unknown) => readable(e));

	return {
		actions: {
			answerOffer: offer.answer,
			close: () => router.back(),
			keptAt: (index) => {
				if (
					kept.status === "CanLoadMore" &&
					index >= kept.results.length - KEPT_PREFETCH
				) {
					kept.loadMore(KEPT_PAGE);
				}
			},
			offerShown: offer.shown,
			openPlus: (from) => {
				posthog.capture("quote_plus_opened", { from });
				openPaywall("daily_quote");
			},
			pickBackground: (b) =>
				setBackground({ background: b.key })
					.then(() => {
						posthog.capture("quote_background_set", {
							background: b.key,
							kind: b.kind,
							plus: b.plus,
						});
						return true;
					})
					.catch((e: unknown) => {
						if (
							e instanceof ConvexError &&
							e.data?.code === "unknown_background"
						) {
							return true;
						}
						console.error("[quotes] background failed", e);
						return false;
					}),
			reflect: (reply, flagged) => {
				const seed = reflectSeed({
					flagged,
					reply,
					sessionActive: Boolean(live),
				});
				if (seed) {
					posthog.capture("quote_reflection_seeded", {
						seed_length: seed.length,
					});
					setReplySeed(seed);
				}
				router.dismissTo("/reflect");
			},
			reply: (text): Promise<ReplyOutcome> => {
				if (!raw) {
					return Promise.resolve("failed");
				}
				setSending(true);
				return replyTo({ quoteId: raw._id, text })
					.then(({ flagged }): ReplyOutcome => {
						posthog.capture("quote_replied", {
							flagged,
							is_edit: raw.reply !== undefined,
							length: text.length,
							quote_type: raw.type,
						});
						return flagged ? "flagged" : "sent";
					})
					.catch((e: unknown): ReplyOutcome => {
						console.error("[quotes] reply failed", e);
						return "failed";
					})
					.then((outcome) => {
						setSending(false);
						return outcome;
					});
			},
			retry,
			saveImage: (fmt) => share(fmt, "save"),
			setResonated: (on) => {
				if (!raw) {
					return;
				}
				const write = on
					? react({ quoteId: raw._id, reaction: "resonates" })
					: unreact({ quoteId: raw._id });
				write
					.then(() =>
						posthog.capture(on ? "quote_reacted" : "quote_reaction_cleared", {
							quote_type: raw.type,
						})
					)
					.catch((e: unknown) => console.error("[quotes] reaction failed", e));
			},
			setSaved: (on) => {
				if (!raw) {
					return Promise.resolve(false);
				}
				const write = on
					? save({ background: background.key, quoteId: raw._id })
					: unsave({ quoteId: raw._id });
				return write
					.then(() => {
						posthog.capture(on ? "quote_saved" : "quote_unsaved", {
							quote_type: raw.type,
						});
						return true;
					})
					.catch((e: unknown) => {
						console.error("[quotes] keep failed", e);
						return false;
					});
			},
			setSoundOn: (on) => {
				useSoundMemory.setState({ soundOn: on });
				posthog.capture("quote_sound_toggled", { on });
			},
			shareImage: (fmt) => share(fmt, "share"),
			talk: () => router.push("/crisis-resources?from=quotes"),
		},
		state,
	};
}
