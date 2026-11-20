import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { zustandJSONStorage } from "@/lib/storage/unified-storage";

type SoundMemory = { soundOn: boolean };

const validSound = (stored: unknown): SoundMemory => ({
	soundOn:
		typeof stored === "object" &&
		stored !== null &&
		(stored as { soundOn?: unknown }).soundOn === true,
});

export const useSoundMemory = create<SoundMemory>()(
	persist((): SoundMemory => ({ soundOn: false }), {
		merge: (stored, current) => ({ ...current, ...validSound(stored) }),
		name: "xolace-quote-sound",
		storage: createJSONStorage(() => zustandJSONStorage),
		version: 1,
	})
);
