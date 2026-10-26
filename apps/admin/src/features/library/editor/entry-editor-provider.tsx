"use client";

import { createContext, type ReactNode, use, useState } from "react";
import { toast } from "sonner";

import {
	blockingGates,
	type PublishGate,
} from "@/features/content/publish-gate";

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
		markSafetyReviewed: () => void;
		publish: () => void;
		recordConsent: () => void;
		retire: () => void;
		save: () => void;
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
			markSafetyReviewed: () => {
				library.actions.markSafetyReviewed(saved.slug);
				toast.success("Safety review recorded");
			},
			publish: () => {
				library.actions.publish(saved.slug);
				toast.success(`“${saved.title}” is live`);
			},
			recordConsent: () => {
				library.actions.recordConsent(saved.slug);
				toast.success("Consent recorded");
			},
			retire: () => {
				library.actions.retire(saved.slug);
				toast.success(`“${saved.title}” retired`);
			},
			save: () => {
				library.actions.save(saved.slug, patch, draftBody ?? undefined);
				reset();
				toast.success("Saved");
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
