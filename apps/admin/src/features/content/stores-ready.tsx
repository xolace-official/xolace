"use client";

import { Spinner } from "@xolace/ui/components/spinner";
import type { ReactNode } from "react";

import { useAudio } from "@/features/audio/audio-provider";
import { useLibrary } from "@/features/library/library-provider";

/**
 * Holds a screen back until the Library and Audio lists have arrived, so an editor
 * route never shows "not found" for an item that's still loading. The shell around
 * it renders straight away.
 */
export function StoresReady({ children }: { children: ReactNode }) {
	const library = useLibrary();
	const audio = useAudio();
	if (!(library.meta.ready && audio.meta.ready)) {
		return (
			<div
				aria-live="polite"
				className="flex min-h-64 items-center justify-center gap-3 text-muted-foreground"
			>
				<Spinner />
				Loading content…
			</div>
		);
	}
	return children;
}
