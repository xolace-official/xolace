/**
 * Letters' data: every read and call the screens make, in one place, on the letters contract
 * (`docs/plan/letters.md` §4; this is §13's seam). The hook names, their returns and the calls'
 * signatures are S20's; the server's shapes are mapped here (`letters-contract.ts`), so the
 * screens never see them.
 *
 * Reads are narrow on purpose: the Connect card sits under the writing screen, so each part
 * subscribes only to what it draws (a keystroke there redraws none of them). Convex shares one
 * subscription between every part that asks the same query.
 *
 * Every read is `undefined` while it loads, never empty: the reader waits rather than closing
 * (its `null` means the letter is gone), and the status draws neither the offer nor Write until
 * it knows.
 *
 * Anonymity: nothing here logs, captures or reports a letter id. Errors go to the callers, which
 * hand them to Sentry (the opt-in's retry after the age ask has no caller, so it reports here);
 * a Convex error carries a code, never the call's args.
 */
import * as Sentry from "@sentry/react-native";
import { api } from "@xolace/backend/api";
import type { Id } from "@xolace/backend/dataModel";
import { useAction, useMutation, useQuery } from "convex/react";
import { getLocales } from "expo-localization";
import { askAge } from "@/lib/age-ask";
import { LETTERS_OFFER_VERSION, type ReportReason } from "./copy";
import {
	aimOf,
	isAgeRefusal,
	isLetterGone,
	type LateRisk,
	localDay,
	statusFrom,
} from "./letters-contract";
import type {
	Draft,
	LettersStatus,
	OptIn,
	ReceivedLetter,
	SendOutcome,
	SentLetter,
} from "./letters-model";

/** A route param or a row's id, as the contract takes it: the server checks it's the caller's. */
const letterId = (id: string) => id as Id<"letters">;

/** The one small status read: the opt-in, why Write is off, the unopened letter, the invite. */
export function useLettersStatus(): LettersStatus | undefined {
	const status = useQuery(api.letters.status.get);
	return status && statusFrom(status, localDay(new Date()));
}

/** A late re-check's risk, until its care has been shown (`lateRiskShown`). */
export function useLettersLateRisk(): LateRisk | null | undefined {
	return useQuery(api.letters.status.get)?.lateRisk;
}

/** Your sent letters, newest first. Withdrawn and dismissed ones are gone. */
export function useSentLetters(): readonly SentLetter[] | undefined {
	return useQuery(api.letters.sent.list);
}

/** Letters for you, newest first, hidden ones included. Reported ones never come back. */
export function useReceivedLetters(): readonly ReceivedLetter[] | undefined {
	return useQuery(api.letters.received.list);
}

/**
 * One letter for you; `null` once it's gone (reported, not yours, or not a letter id). The route
 * param goes as it is: the server normalizes it.
 */
export function useReceivedLetter(
	id: string
): ReceivedLetter | null | undefined {
	return useQuery(api.letters.received.get, { id });
}

/** Settings › Notifications › Letters, on by default. */
export function useLettersPush(): boolean | undefined {
	return useQuery(api.letters.settings.getPush);
}

/** What the screens ask of letters' server side. */
export type LettersCalls = {
	/**
	 * The check reads it (1–8 s on the server); the outcome says what the sender sees. One runs at
	 * a time: Write calls it through `check-store.ts`. A network error or `rate_limited` throws
	 * (the words stay: Try again); so does an age refusal, after opening the age ask.
	 */
	send: (draft: Draft) => Promise<SendOutcome>;
	withdraw: (id: string) => Promise<"ok" | "received">;
	/** A returned or late-held letter leaves Sent. */
	dismiss: (id: string) => Promise<void>;
	/** The Letters screen showed these statuses: their marks light once, across devices. */
	markSeen: (ids: readonly string[]) => Promise<void>;
	/** Yes needs an adult: a refusal opens the age ask, and Yes is sent again after it. */
	setOptIn: (optIn: Exclude<OptIn, "unset">) => Promise<void>;
	/** Opening is what lets the next letter be placed. */
	open: (id: string) => Promise<void>;
	/** Called after the 5 s undo, so an undone acknowledge never reaches the sender. */
	acknowledge: (id: string) => Promise<void>;
	/** Called after the 5 s undo; also stops that sender being matched to you again. */
	hide: (id: string) => Promise<void>;
	unhide: (id: string) => Promise<void>;
	report: (id: string, reason: ReportReason) => Promise<void>;
	setPush: (on: boolean) => Promise<void>;
	/** The care for a late risk was shown, at this level. */
	lateRiskShown: (shown: LateRisk) => Promise<void>;
};

/** A letter already gone from another device: its row drops by itself, nothing to say. */
const unlessGone = (error: unknown) => {
	if (!isLetterGone(error)) {
		throw error;
	}
};

/** The calls, bound to this Convex client. */
export function useLettersCalls(): LettersCalls {
	const send = useAction(api.letters.send.send);
	const withdraw = useMutation(api.letters.sent.withdraw);
	const dismiss = useMutation(api.letters.sent.dismiss);
	const markSeen = useMutation(api.letters.sent.markSeen);
	const setOptIn = useMutation(api.letters.optIn.set);
	const open = useMutation(api.letters.received.open);
	const acknowledge = useMutation(api.letters.received.acknowledge);
	const hide = useMutation(api.letters.received.hide);
	const unhide = useMutation(api.letters.received.unhide);
	const report = useMutation(api.letters.received.report);
	const setPush = useMutation(api.letters.settings.setPush);
	const lateRiskShown = useMutation(api.letters.status.lateRiskShown);

	const answer = async (optIn: Exclude<OptIn, "unset">): Promise<void> => {
		try {
			await setOptIn({
				choice: optIn,
				locale: getLocales()[0]?.languageTag,
				promptVersion: LETTERS_OFFER_VERSION,
			});
		} catch (error) {
			if (!isAgeRefusal(error)) {
				throw error;
			}
			askAge({
				error,
				// Nobody waits on the retry: a failure goes to Sentry (a code, never the args).
				retry: () => {
					answer(optIn).catch((e: unknown) => Sentry.captureException(e));
				},
				surface: "letters",
			});
		}
	};

	return {
		acknowledge: (id) =>
			acknowledge({ id: letterId(id) }).then(() => undefined, unlessGone),
		dismiss: (id) =>
			dismiss({ id: letterId(id) }).then(() => undefined, unlessGone),
		hide: (id) => hide({ id: letterId(id) }).then(() => undefined, unlessGone),
		lateRiskShown: (shown) => lateRiskShown({ shown }).then(() => undefined),
		markSeen: (ids) =>
			markSeen({ ids: ids.map(letterId) }).then(() => undefined),
		open: (id) => open({ id: letterId(id) }).then(() => undefined, unlessGone),
		report: (id, reason) =>
			report({ id: letterId(id), reason }).then(() => undefined, unlessGone),
		send: async (draft) => {
			try {
				return await send({ aim: aimOf(draft.forWho), text: draft.text });
			} catch (error) {
				if (isAgeRefusal(error)) {
					askAge({ error, retry: () => undefined, surface: "letters" });
				}
				throw error;
			}
		},
		setOptIn: answer,
		setPush: (on) => setPush({ on }).then(() => undefined),
		unhide: (id) =>
			unhide({ id: letterId(id) }).then(() => undefined, unlessGone),
		withdraw: (id) => withdraw({ id: letterId(id) }),
	};
}
