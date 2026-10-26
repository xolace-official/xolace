"use client";

import { createContext, type ReactNode, use, useEffect, useState } from "react";

import {
	FAILS_FIRST_TIME,
	FIXTURE_RUNS,
	SETTLES_AS,
	WORKFLOW_STEPS,
} from "./fixtures";
import {
	type ImportItem,
	type ImportRun,
	type ImportTarget,
	isApplicable,
} from "./types";

/**
 * What every Imports screen reads and calls. The fixture provider below fakes the
 * compare and the ingest workflow in memory; the Convex provider (admin step 6) uploads
 * to R2, compares hashes server-side and reads per-item workflow status.
 */
export interface ImportsContextValue {
	actions: {
		/** Starts processing every new/changed item that isn't skipped. */
		apply: (runId: string) => void;
		/** Uploads and compares the files; resolves to the new run's id. */
		compare: (target: ImportTarget, files: readonly File[]) => Promise<string>;
		discard: (runId: string) => void;
		retry: (runId: string, itemId: string) => void;
		setSkipped: (
			runId: string,
			itemIds: readonly string[],
			skipped: boolean
		) => void;
	};
	meta: {
		backend: "fixtures" | "convex";
		/** Taken once per mount, for "3 days ago". */
		now: number;
	};
	state: {
		runs: readonly ImportRun[];
	};
}

const ImportsContext = createContext<ImportsContextValue | null>(null);

export function useImports() {
	const value = use(ImportsContext);
	if (!value) {
		throw new Error("useImports must be used inside an Imports provider");
	}
	return value;
}

const TICK_MS = 650;
const COMPARE_MS = 900;
/** How many items the fake workflow runs at once. */
const PARALLEL = 3;

/** One tick of the fake workflow for one item. */
function advance(item: ImportItem): ImportItem {
	const { run } = item;
	if (!run || (run.status !== "queued" && run.status !== "processing")) {
		return item;
	}
	const steps = WORKFLOW_STEPS[item.type];
	const next = run.status === "queued" ? 0 : steps.indexOf(run.step ?? "") + 1;
	const step = steps[next];
	if (!step) {
		return {
			...item,
			run: { attempt: run.attempt, status: SETTLES_AS[item.id] ?? "live" },
		};
	}
	if (FAILS_FIRST_TIME[item.id] === step && (run.attempt ?? 1) === 1) {
		return {
			...item,
			run: {
				attempt: run.attempt,
				failure: {
					message: "ffmpeg exited with code 1: unexpected end of stream.",
					step,
				},
				status: "failed",
			},
		};
	}
	return { ...item, run: { ...run, status: "processing", step } };
}

function tickRun(run: ImportRun): ImportRun {
	if (run.state !== "applying") {
		return run;
	}
	let slots = PARALLEL;
	const items = run.items.map((item) => {
		const active =
			item.run?.status === "queued" || item.run?.status === "processing";
		if (!active || slots === 0) {
			return item;
		}
		slots -= 1;
		return advance(item);
	});
	const settled = items.every(
		(item) => item.run?.status !== "queued" && item.run?.status !== "processing"
	);
	return { ...run, items, state: settled ? "done" : "applying" };
}

/** In-memory imports over sample runs. Every compare returns the same sample diff. */
export function ImportsFixtureProvider({ children }: { children: ReactNode }) {
	const [runs, setRuns] = useState(FIXTURE_RUNS);
	const [now] = useState(Date.now);
	const applying = runs.some((run) => run.state === "applying");

	useEffect(() => {
		if (!applying) {
			return;
		}
		const timer = setInterval(
			() => setRuns((current) => current.map(tickRun)),
			TICK_MS
		);
		return () => clearInterval(timer);
	}, [applying]);

	const update = (runId: string, change: (run: ImportRun) => ImportRun) =>
		setRuns((current) =>
			current.map((run) => (run.id === runId ? change(run) : run))
		);

	const value: ImportsContextValue = {
		actions: {
			apply: (runId) =>
				update(runId, (run) => ({
					...run,
					appliedAt: Date.now(),
					items: run.items.map((item) =>
						isApplicable(item)
							? { ...item, run: { attempt: 1, status: "queued" } }
							: item
					),
					state: "applying",
				})),
			compare: async (target, files) => {
				await new Promise((resolve) => setTimeout(resolve, COMPARE_MS));
				const template = FIXTURE_RUNS.find((run) => run.state === "review");
				const id = `run-${Date.now().toString(36)}`;
				const json = files.filter((file) => file.name.endsWith(".json")).length;
				setRuns((current) => [
					{
						createdAt: Date.now(),
						createdBy: "You",
						files: `${json} JSON, ${files.length - json} other files`,
						id,
						items: template?.items ?? [],
						state: "review",
						target,
					},
					...current,
				]);
				return id;
			},
			discard: (runId) =>
				update(runId, (run) => ({ ...run, state: "discarded" })),
			retry: (runId, itemId) =>
				update(runId, (run) => ({
					...run,
					items: run.items.map((item) =>
						item.id === itemId
							? {
									...item,
									run: {
										attempt: (item.run?.attempt ?? 1) + 1,
										status: "queued",
									},
								}
							: item
					),
					state: "applying",
				})),
			setSkipped: (runId, itemIds, skipped) =>
				update(runId, (run) => ({
					...run,
					items: run.items.map((item) =>
						itemIds.includes(item.id) ? { ...item, skipped } : item
					),
				})),
		},
		meta: { backend: "fixtures", now },
		state: { runs },
	};

	return <ImportsContext value={value}>{children}</ImportsContext>;
}
