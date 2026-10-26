"use client";

import { createContext, type ReactNode, use, useState } from "react";
import { toast } from "sonner";

import { useAudio } from "@/features/audio/audio-provider";
import {
	blockingGates,
	type PublishGate,
} from "@/features/content/publish-gate";

import { type HubPatch, useLibrary } from "../library-provider";
import type { HubItem, LibraryHub } from "../types";
import { hubGates, type ResolvedHubItem, resolveHubItem } from "./hub-items";

/**
 * One hub being edited: the saved hub, the unsaved draft on top of it, its items
 * resolved against Library and Audio, and the gates computed from the draft.
 */
interface HubEditorContextValue {
	actions: {
		addItem: (item: HubItem) => void;
		discard: () => void;
		publish: () => void;
		removeItem: (id: string) => void;
		replaceCover: () => void;
		retire: () => void;
		save: () => void;
		setField: <K extends keyof HubPatch>(key: K, value: HubPatch[K]) => void;
	};
	meta: {
		/** Publish is allowed: saved, and every required gate passes. */
		canPublish: boolean;
		dirty: boolean;
	};
	state: {
		blocking: readonly PublishGate[];
		gates: readonly PublishGate[];
		/** Saved hub with the draft applied. */
		hub: LibraryHub;
		items: readonly ResolvedHubItem[];
		saved: LibraryHub;
	};
}

const HubEditorContext = createContext<HubEditorContextValue | null>(null);

export function useHubEditor() {
	const value = use(HubEditorContext);
	if (!value) {
		throw new Error("useHubEditor must be used inside HubEditorProvider");
	}
	return value;
}

export function HubEditorProvider({
	hub: saved,
	children,
}: {
	hub: LibraryHub;
	children: ReactNode;
}) {
	const library = useLibrary();
	const {
		state: { tracks },
	} = useAudio();
	const [patch, setPatch] = useState<HubPatch>({});

	const hub = { ...saved, ...patch };
	const dirty = Object.keys(patch).length > 0;
	const items = hub.items.map((item) =>
		resolveHubItem(item, library.state.entries, tracks)
	);
	const gates = hubGates(hub, items);
	const blocking = blockingGates(gates);

	const setField: HubEditorContextValue["actions"]["setField"] = (
		key,
		fieldValue
	) => setPatch((current) => ({ ...current, [key]: fieldValue }));

	const value: HubEditorContextValue = {
		actions: {
			addItem: (item) => setField("items", [...hub.items, item]),
			discard: () => setPatch({}),
			publish: () => {
				library.actions.publishHub(saved.slug);
				toast.success(`“${saved.title}” is live`);
			},
			removeItem: (id) =>
				setField(
					"items",
					items.filter((i) => i.id !== id).map((i) => i.item)
				),
			replaceCover: () => {
				library.actions.replaceHubCover(saved.slug);
				toast.success("Cover uploaded (fixture)");
			},
			retire: () => {
				library.actions.retireHub(saved.slug);
				toast.success(`“${saved.title}” retired`);
			},
			save: () => {
				library.actions.saveHub(saved.slug, patch);
				setPatch({});
				toast.success("Saved");
			},
			setField,
		},
		meta: {
			canPublish: !dirty && blocking.length === 0 && saved.status !== "live",
			dirty,
		},
		state: { blocking, gates, hub, items, saved },
	};

	return <HubEditorContext value={value}>{children}</HubEditorContext>;
}
