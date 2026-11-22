import { router } from "expo-router";
import { useEffect, useState } from "react";
import { toast } from "@/components/shared/toast";
import { useLater } from "@/lib/use-later";
import { COPY, type PeersSet } from "../copy";
import type { PeerReflection } from "../peer-reflection-data";
import {
	cardsOf,
	type Gone,
	type ReflectionRow,
	recount,
} from "../peer-reflection-model";
import { MOTION } from "../peers-look";

const LIMIT_REPLY_MS = 640;

export type FixtureProps = {
	set?: PeersSet;
	rows?: readonly ReflectionRow[];
	loading?: boolean;
	late: boolean;
	bridge?: boolean;
	slowNext?: boolean;
	reportAfter?: number;
};

export function useFixturePeers({
	set = "match",
	rows: given,
	loading = false,
	late,
	bridge = true,
	slowNext = false,
	reportAfter,
}: FixtureProps): PeerReflection {
	const later = useLater();
	const [rows, setRows] = useState(given ?? []);
	const [mine, setMine] = useState<Record<string, boolean>>({});
	const [gone, setGone] = useState<Record<string, Gone>>({});
	const [slow, setSlow] = useState(slowNext);

	const light = (id: string, on: boolean) => {
		setMine((m) => ({ ...m, [id]: on }));
		setRows((r) => recount(r, id, on));
	};

	const reportId = reportAfter === undefined ? null : given?.[reportAfter]?._id;
	useEffect(() => {
		if (!reportId) {
			return;
		}
		const t = setTimeout(() => {
			setGone((g) => ({ ...g, [reportId]: "reported" }));
			toast(COPY.toast.reported);
		}, MOTION.afterSheetMs * 2);
		return () => clearTimeout(t);
	}, [reportId]);

	return {
		actions: {
			done: () => router.back(),
			hide: (id) => {
				setGone((g) => ({ ...g, [id]: "hidden" }));
				toast(COPY.toast.hidden);
			},
			report: () => router.push("/dev/peer-reflection/report-sheet"),
			toggle: (id) => {
				const on = mine[id] !== true;
				light(id, on);
				if (slow && on) {
					setSlow(false);
					later(() => {
						light(id, false);
						toast(COPY.toast.slow, { variant: "warning" });
					}, LIMIT_REPLY_MS);
				}
			},
		},
		state: {
			bridge,
			cards: cardsOf(rows, mine, gone),
			late,
			set,
			status: loading ? "loading" : "ready",
		},
	};
}
