"use client";

import { createContext, type ReactNode, use } from "react";
import { toast } from "sonner";

import { errorMessage, runAction } from "@/features/content/run-action";

import { useImports } from "../imports-provider";
import {
	countByStatus,
	type DiffAction,
	type ImportItem,
	type ImportRun,
	isApplicable,
} from "../types";

/** One run, with its actions bound, for the review and status screens. */
interface ImportRunContextValue {
	actions: {
		apply: () => Promise<void>;
		discard: () => Promise<void>;
		retry: (itemId: ImportItem["id"]) => Promise<void>;
		setSkipped: (
			itemIds: readonly ImportItem["id"][],
			skipped: boolean
		) => Promise<void>;
	};
	meta: {
		/** New/changed items that will run when applied. */
		applicable: number;
		/** New/changed items the reviewer left out. */
		skipped: number;
	};
	state: {
		/** Items per diff action, in review order. */
		byAction: Record<DiffAction, ImportItem[]>;
		counts: Record<DiffAction, number>;
		/** Items the run processed, with their status. */
		processed: ImportItem[];
		run: ImportRun;
		statusCounts: ReturnType<typeof countByStatus>;
	};
}

const ImportRunContext = createContext<ImportRunContextValue | null>(null);

export function useImportRun() {
	const value = use(ImportRunContext);
	if (!value) {
		throw new Error("useImportRun must be used inside ImportRunProvider");
	}
	return value;
}

export function ImportRunProvider({
	run,
	children,
}: {
	run: ImportRun;
	children: ReactNode;
}) {
	const { actions } = useImports();

	const byAction: Record<DiffAction, ImportItem[]> = {
		changed: [],
		new: [],
		rejected: [],
		unchanged: [],
	};
	for (const item of run.items) {
		byAction[item.action].push(item);
	}

	// Convex re-checks everything, so each action can fail: runAction toasts either way.
	const value: ImportRunContextValue = {
		actions: {
			apply: async () => {
				await runAction(
					() => actions.apply(run.number),
					"Import started. Each item goes live as it finishes processing."
				);
			},
			discard: async () => {
				await runAction(
					() => actions.discard(run.number),
					"Import discarded. Nothing was written."
				);
			},
			retry: async (itemId) => {
				await runAction(() => actions.retry(run.number, itemId), "Retrying");
			},
			setSkipped: async (itemIds, skipped) => {
				try {
					await actions.setSkipped(run.number, itemIds, skipped);
				} catch (error) {
					// Only a failure gets a toast: the checkbox shows the change.
					toast.error(errorMessage(error));
				}
			},
		},
		meta: {
			applicable: run.items.filter(isApplicable).length,
			skipped: run.items.filter((item) => item.skipped).length,
		},
		state: {
			byAction,
			counts: run.counts,
			processed: run.items.filter((item) => item.run),
			run,
			statusCounts: countByStatus(run.items),
		},
	};

	return <ImportRunContext value={value}>{children}</ImportRunContext>;
}
