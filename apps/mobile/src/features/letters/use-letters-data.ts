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

const letterId = (id: string) => id as Id<"letters">;

export function useLettersStatus(): LettersStatus | undefined {
	const status = useQuery(api.letters.status.get);
	return status && statusFrom(status, localDay(new Date()));
}

export function useLettersLateRisk(): LateRisk | null | undefined {
	return useQuery(api.letters.status.get)?.lateRisk;
}

export function useSentLetters(): readonly SentLetter[] | undefined {
	return useQuery(api.letters.sent.list);
}

export function useReceivedLetters(): readonly ReceivedLetter[] | undefined {
	return useQuery(api.letters.received.list);
}

export function useReceivedLetter(
	id: string
): ReceivedLetter | null | undefined {
	return useQuery(api.letters.received.get, { id });
}

export function useLettersPush(): boolean | undefined {
	return useQuery(api.letters.settings.getPush);
}

export type LettersCalls = {
	send: (draft: Draft) => Promise<SendOutcome>;
	withdraw: (id: string) => Promise<"ok" | "received">;
	dismiss: (id: string) => Promise<void>;
	markSeen: (ids: readonly string[]) => Promise<void>;
	setOptIn: (optIn: Exclude<OptIn, "unset">) => Promise<void>;
	open: (id: string) => Promise<void>;
	acknowledge: (id: string) => Promise<void>;
	hide: (id: string) => Promise<void>;
	unhide: (id: string) => Promise<void>;
	report: (id: string, reason: ReportReason) => Promise<void>;
	setPush: (on: boolean) => Promise<void>;
	lateRiskShown: (shown: LateRisk) => Promise<void>;
};

const unlessGone = (error: unknown) => {
	if (!isLetterGone(error)) {
		throw error;
	}
};

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
