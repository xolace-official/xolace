"use client";

import { createContext, type ReactNode, use, useState } from "react";
import { unsavedSince } from "@/features/content/draft-patch";
import {
	blockingGates,
	type PublishGate,
} from "@/features/content/publish-gate";
import { runAction } from "@/features/content/run-action";

import { type EntryPatch, useLibrary } from "../library-provider";
import { publishGates } from "../publish-gates";
import type { LibraryEntry, LibrarySource } from "../types";

/**
 * One entry being edited: the saved entry, the unsaved draft on top of it, and the
 * gates computed from the draft. Every editor part (fields, body, checklist, actions)
 * reads this instead of taking props, so layouts can place them anywhere.
 */
interface EntryEditorContextValue {
	actions: {
		discard: () => void;
		markSafetyReviewed: () => Promise<unknown>;
		publish: () => Promise<unknown>;
		recordConsent: () => Promise<unknown>;
		retire: () => Promise<unknown>;
		save: () => Promise<unknown>;
		setBody: (body: string) => void;
		setField: <K extends keyof EntryPatch>(
			key: K,
			value: EntryPatch[K]
		) => void;
	};
	meta: {
		/** Publish is allowed: saved, and every required gate passes. */
		canPublish: boolean;
		dirty: boolean;
		subjects: readonly string[];
	};
	state: {
		blocking: readonly PublishGate[];
		body: string;
		/** Saved entry with the draft applied. */
		entry: LibraryEntry;
		gates: readonly PublishGate[];
		saved: LibraryEntry;
		sources: readonly LibrarySource[];
	};
}

const EntryEditorContext = createContext<EntryEditorContextValue | null>(null);

export function useEntryEditor() {
	const value = use(EntryEditorContext);
	if (!value) {
		throw new Error("useEntryEditor must be used inside EntryEditorProvider");
	}
	return value;
}

export function EntryEditorProvider({
	entry: saved,
	children,
}: {
	entry: LibraryEntry;
	children: ReactNode;
}) {
	const library = useLibrary();
	const savedBody = library.state.bodies[saved.slug] ?? "";
	const [patch, setPatch] = useState<EntryPatch>({});
	const [draftBody, setDraftBody] = useState<string | null>(null);

	const entry = { ...saved, ...patch };
	const body = draftBody ?? savedBody;
	const dirty = Object.keys(patch).length > 0 || draftBody !== null;
	const gates = publishGates({
		body,
		entry,
		now: library.meta.now,
		sources: library.state.sources,
	});
	const blocking = blockingGates(gates);
	const subjects = [
		...new Set(library.state.entries.map((e) => e.primarySubject)),
	].sort();

	const reset = () => {
		setPatch({});
		setDraftBody(null);
	};

	const value: EntryEditorContextValue = {
		actions: {
			discard: reset,
			markSafetyReviewed: () =>
				runAction(
					() => library.actions.markSafetyReviewed(saved.slug),
					"Safety review recorded"
				),
			publish: () =>
				runAction(
					() => library.actions.publish(saved.slug),
					`“${saved.title}” is live`
				),
			recordConsent: () =>
				runAction(
					() => library.actions.recordConsent(saved.slug),
					"Consent recorded"
				),
			retire: () =>
				runAction(
					() => library.actions.retire(saved.slug),
					`“${saved.title}” retired`
				),
			save: async () => {
				// Keep the draft when Convex rejects it, and on success keep what was
				// typed while the save was in flight, so nothing typed is lost.
				const submitted = { body: draftBody, patch };
				if (
					await runAction(
						() =>
							library.actions.save(
								saved.slug,
								submitted.patch,
								submitted.body ?? undefined
							),
						"Saved"
					)
				) {
					setPatch((current) => unsavedSince(current, submitted.patch));
					setDraftBody((current) =>
						current === submitted.body ? null : current
					);
				}
			},
			setBody: setDraftBody,
			setField: (key, fieldValue) =>
				setPatch((current) => ({ ...current, [key]: fieldValue })),
		},
		meta: {
			canPublish: !dirty && blocking.length === 0 && saved.status !== "live",
			dirty,
			subjects,
		},
		state: {
			blocking,
			body,
			entry,
			gates,
			saved,
			sources: library.state.sources,
		},
	};

	return <EntryEditorContext value={value}>{children}</EntryEditorContext>;
}
