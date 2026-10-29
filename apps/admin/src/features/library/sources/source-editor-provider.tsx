"use client";

import { createContext, type ReactNode, use, useState } from "react";
import { toast } from "sonner";

import { unsavedSince } from "@/features/content/draft-patch";
import { runAction } from "@/features/content/run-action";

import { type Citation, citationsOf } from "../citations";
import { type SourcePatch, useLibrary } from "../library-provider";
import type { LibrarySource } from "../types";

const REQUIRED_FIELDS = ["attributionText", "licence", "name"] as const;
type SourceField = (typeof REQUIRED_FIELDS)[number];

/**
 * One source being edited: the saved row, the unsaved draft on top of it, and every
 * credit that points at it. Sources have no publish step; Save writes straight through.
 */
interface SourceEditorContextValue {
	actions: {
		discard: () => void;
		save: () => void;
		setField: <K extends keyof SourcePatch>(
			key: K,
			value: SourcePatch[K]
		) => void;
	};
	meta: {
		dirty: boolean;
		/** Required fields left empty, with the message to show under each. */
		errors: Partial<Record<SourceField, string>>;
		now: number;
	};
	state: {
		citations: readonly Citation[];
		saved: LibrarySource;
		/** Saved source with the draft applied. */
		source: LibrarySource;
	};
}

const SourceEditorContext = createContext<SourceEditorContextValue | null>(
	null
);

export function useSourceEditor() {
	const value = use(SourceEditorContext);
	if (!value) {
		throw new Error("useSourceEditor must be used inside SourceEditorProvider");
	}
	return value;
}

const REQUIRED: Record<SourceField, string> = {
	attributionText: "Every entry shows this credit line.",
	licence: "Say what lets us reuse it, even if it's ours.",
	name: "Name the publisher as credited.",
};

export function SourceEditorProvider({
	source: saved,
	children,
}: {
	source: LibrarySource;
	children: ReactNode;
}) {
	const library = useLibrary();
	const [patch, setPatch] = useState<SourcePatch>({});

	const source = { ...saved, ...patch };
	const dirty = Object.keys(patch).length > 0;
	const errors: Partial<Record<SourceField, string>> = {};
	for (const field of REQUIRED_FIELDS) {
		if (source[field].trim() === "") {
			errors[field] = REQUIRED[field];
		}
	}

	const value: SourceEditorContextValue = {
		actions: {
			discard: () => setPatch({}),
			save: async () => {
				const submitted = patch;
				if (Object.keys(errors).length > 0) {
					toast.error("Fill in the required fields first");
					return;
				}
				if (
					await runAction(
						() => library.actions.saveSource(saved.slug, submitted),
						"Saved"
					)
				) {
					setPatch((current) => unsavedSince(current, submitted));
				}
			},
			setField: (key, fieldValue) =>
				setPatch((current) => ({ ...current, [key]: fieldValue })),
		},
		meta: { dirty, errors, now: library.meta.now },
		state: {
			citations: citationsOf(source, library.state.entries, library.meta.now),
			saved,
			source,
		},
	};

	return <SourceEditorContext value={value}>{children}</SourceEditorContext>;
}
