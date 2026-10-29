import type { Metadata } from "next";
import { Suspense } from "react";

import { TracksScreen } from "@/features/audio/tracks-screen";
import { EntriesSkeleton } from "@/features/library/entries-skeleton";

export const metadata: Metadata = { title: "Tracks · Xolace Admin" };

export default function AudioTracksPage() {
	return (
		<Suspense fallback={<EntriesSkeleton />}>
			<TracksScreen />
		</Suspense>
	);
}
