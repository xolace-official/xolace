import type { Metadata } from "next";
import { Suspense } from "react";

import { EntriesScreen } from "@/features/library/entries-screen";
import { EntriesSkeleton } from "@/features/library/entries-skeleton";

export const metadata: Metadata = { title: "Entries · Xolace Admin" };

export default function LibraryEntriesPage() {
	return (
		<Suspense fallback={<EntriesSkeleton />}>
			<EntriesScreen />
		</Suspense>
	);
}
