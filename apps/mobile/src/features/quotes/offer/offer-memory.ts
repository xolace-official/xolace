import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { zustandJSONStorage } from "@/lib/storage/unified-storage";

type OfferMemory = { seen: boolean };

const validSeen = (stored: unknown): OfferMemory => ({
	seen:
		typeof stored === "object" &&
		stored !== null &&
		(stored as { seen?: unknown }).seen === true,
});

export const useOfferMemory = create<OfferMemory>()(
	persist((): OfferMemory => ({ seen: false }), {
		merge: (stored, current) => ({ ...current, ...validSeen(stored) }),
		name: "xolace-daily-quote-offer",
		storage: createJSONStorage(() => zustandJSONStorage),
		version: 1,
	})
);
