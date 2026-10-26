"use client";

import { api } from "@xolace/backend/api";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { createContext, type ReactNode, use, useState } from "react";

import { putObject } from "@/features/media/put-object";

import { blobKey, prepareDrop } from "./prepare-drop";
import type {
	ImportItem,
	ImportRun,
	ImportRunSummary,
	ImportTarget,
} from "./types";

/**
 * What every Imports screen reads and calls, implemented on `api.admin.imports`.
 * Compare reads the drop in the browser, has Convex diff it, then PUTs the media it
 * asks for straight to R2. Apply runs server-side, one workflow per item, so a run
 * keeps going after this tab closes.
 */
export interface ImportsContextValue {
	actions: {
		/** Starts processing every new/changed item that isn't left out. */
		apply: (number: number) => Promise<void>;
		/** Reads, compares and uploads the files; resolves to the new run's number. */
		compare: (
			target: ImportTarget,
			files: readonly File[],
			onProgress: (message: string) => void
		) => Promise<number>;
		discard: (number: number) => Promise<void>;
		retry: (number: number, itemId: ImportItem["id"]) => Promise<void>;
		setSkipped: (
			number: number,
			itemIds: readonly ImportItem["id"][],
			skipped: boolean
		) => Promise<void>;
	};
	meta: {
		/** Taken once per mount, for "3 days ago". */
		now: number;
		/** The list has arrived; until then it's empty. */
		ready: boolean;
	};
	state: {
		/** The latest runs, newest first. */
		runs: readonly ImportRunSummary[];
	};
}

const ImportsContext = createContext<ImportsContextValue | null>(null);

export function useImports() {
	const value = use(ImportsContext);
	if (!value) {
		throw new Error("useImports must be used inside ImportsProvider");
	}
	return value;
}

type SummaryRow = FunctionReturnType<typeof api.admin.imports.list>[number];
type RunRow = NonNullable<FunctionReturnType<typeof api.admin.imports.get>>;

function toSummary(row: SummaryRow): ImportRunSummary {
	const { createdByName, finishedAt: _finishedAt, ...fields } = row;
	return { ...fields, createdBy: createdByName };
}

function toItem(row: RunRow["items"][number]): ImportItem {
	const { attempt, failure, status, step, ...fields } = row;
	return {
		...fields,
		run: status ? { attempt, failure, status, step } : undefined,
	};
}

const EMPTY: readonly never[] = [];

/** PUTs in flight at once while a drop uploads. */
const UPLOAD_WORKERS = 3;

/** One run with its items; `undefined` while loading, `null` when there's no such run. */
export function useImportRunQuery(
	number: number
): ImportRun | null | undefined {
	const { isAuthenticated } = useConvexAuth();
	const row = useQuery(
		api.admin.imports.get,
		isAuthenticated && Number.isInteger(number) ? { number } : "skip"
	);
	if (!Number.isInteger(number)) {
		return null;
	}
	if (!row) {
		return row;
	}
	const { items, ...summary } = row;
	return { ...toSummary(summary), items: items.map(toItem) };
}

export function ImportsProvider({ children }: { children: ReactNode }) {
	const [now] = useState(Date.now);
	// Skipped until Convex has the Clerk token (see LibraryProvider).
	const { isAuthenticated } = useConvexAuth();
	const rows = useQuery(api.admin.imports.list, isAuthenticated ? {} : "skip");

	const compare = useMutation(api.admin.imports.compare);
	const uploaded = useMutation(api.admin.imports.uploaded);
	const apply = useMutation(api.admin.imports.apply);
	const discard = useMutation(api.admin.imports.discard);
	const retry = useMutation(api.admin.imports.retry);
	const setSkipped = useMutation(api.admin.imports.setSkipped);

	const value: ImportsContextValue = {
		actions: {
			apply: async (number) => {
				await apply({ number });
			},
			compare: async (target, files, onProgress) => {
				const drop = await prepareDrop(target, files, onProgress);
				onProgress("Comparing with what's stored…");
				const { number, uploads } = await compare({
					files: drop.label,
					records: drop.records,
					target,
				});
				try {
					let done = 0;
					const queue = [...uploads];
					const worker = async () => {
						for (let next = queue.shift(); next; next = queue.shift()) {
							const blob = drop.blobs.get(blobKey(next.index, next.part));
							if (!blob) {
								throw new Error("A file compare asked for wasn't read");
							}
							// biome-ignore lint/performance/noAwaitInLoops: a fixed pool of workers, not one await per item
							await putObject(next.url, blob);
							done += 1;
							onProgress(`Uploaded ${done} of ${uploads.length} files…`);
						}
					};
					await Promise.all(
						Array.from(
							{ length: Math.min(UPLOAD_WORKERS, uploads.length) },
							worker
						)
					);
					if (uploads.length > 0) {
						await uploaded({ number });
					}
				} catch (error) {
					// Half-uploaded runs can't be applied: drop it and its staged audio.
					await discard({ number }).catch(() => undefined);
					throw error;
				}
				return number;
			},
			discard: async (number) => {
				await discard({ number });
			},
			retry: async (number, itemId) => {
				await retry({ itemId, number });
			},
			setSkipped: async (number, itemIds, skipped) => {
				await setSkipped({ itemIds: [...itemIds], number, skipped });
			},
		},
		meta: { now, ready: rows !== undefined },
		state: { runs: rows?.map(toSummary) ?? EMPTY },
	};

	return <ImportsContext value={value}>{children}</ImportsContext>;
}
