import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { zustandJSONStorage } from "@/lib/storage/unified-storage";
import type { CatalogueRow } from "../quotes-model";

/** The catalogue row of the background the screen last settled on, drawn first on the next visit. */
type BackgroundMemory = { row: CatalogueRow | null };

const isText = (v: unknown): v is string => typeof v === "string";
const isOptionalText = (v: unknown) => v === undefined || isText(v);

function validRow(stored: unknown): CatalogueRow | null {
	if (typeof stored !== "object" || stored === null) {
		return null;
	}
	const r = stored as Record<string, unknown>;
	const ok =
		isText(r.key) &&
		isText(r.name) &&
		(r.kind === "still" || r.kind === "loop") &&
		(r.ink === "light" || r.ink === "dark") &&
		typeof r.plus === "boolean" &&
		isOptionalText(r.posterUrl) &&
		isOptionalText(r.videoUrl) &&
		isOptionalText(r.audioUrl);
	return ok ? (r as CatalogueRow) : null;
}

export const useBackgroundMemory = create<BackgroundMemory>()(
	persist((): BackgroundMemory => ({ row: null }), {
		merge: (stored, current) => ({
			...current,
			row: validRow((stored as { row?: unknown } | undefined)?.row),
		}),
		name: "xolace-quote-background",
		storage: createJSONStorage(() => zustandJSONStorage),
		version: 1,
	})
);
