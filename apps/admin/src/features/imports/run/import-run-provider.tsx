"use client";

import { createContext, type ReactNode, use } from "react";
import { toast } from "sonner";

import { useImports } from "../imports-provider";
import {
	countByAction,
	countByStatus,
	type DiffAction,
	type ImportItem,
	type ImportRun,
	isApplicable,
} from "../types";

/** One run, with its actions bound, for the review and status screens. */
interface ImportRunContextValue {
	actions: {
		apply: () => void;
		discard: () => void;
		retry: (itemId: string) => void;
		setSkipped: (itemIds: readonly string[], skipped: boolean) => void;
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

	const value: ImportRunContextValue = {
		actions: {
			apply: () => {
				actions.apply(run.id);
				toast.success("Import started", {
					description: "Each item goes live as it finishes processing.",
				});
			},
			discard: () => {
				actions.discard(run.id);
				toast("Import discarded", {
					description: "Nothing was written. The files are kept for 7 days.",
				});
			},
			retry: (itemId) => actions.retry(run.id, itemId),
			setSkipped: (itemIds, skipped) =>
				actions.setSkipped(run.id, itemIds, skipped),
		},
		meta: {
			applicable: run.items.filter(isApplicable).length,
			skipped: run.items.filter((item) => item.skipped).length,
		},
		state: {
			byAction,
			counts: countByAction(run.items),
			processed: run.items.filter((item) => item.run),
			run,
			statusCounts: countByStatus(run.items),
		},
	};

	return <ImportRunContext value={value}>{children}</ImportRunContext>;
}
