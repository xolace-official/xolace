import type { Metadata } from "next";
import { Suspense } from "react";

import { ImportRunScreen } from "@/features/imports/run/import-run-screen";
import { EntriesSkeleton } from "@/features/library/entries-skeleton";

export const metadata: Metadata = { title: "Import · Xolace Admin" };

export default async function ImportRunPage({
	params,
}: PageProps<"/imports/[id]">) {
	const { id } = await params;
	return (
		<Suspense fallback={<EntriesSkeleton />}>
			<ImportRunScreen id={id} />
		</Suspense>
	);
}
