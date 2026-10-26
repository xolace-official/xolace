import type { Metadata } from "next";
import { Suspense } from "react";

import { TrackEditorScreen } from "@/features/audio/editor/track-editor-screen";
import { EntriesSkeleton } from "@/features/library/entries-skeleton";

export const metadata: Metadata = { title: "Edit track · Xolace Admin" };

export default async function TrackPage({
	params,
}: PageProps<"/audio/[slug]">) {
	const { slug } = await params;
	return (
		<Suspense fallback={<EntriesSkeleton />}>
			<TrackEditorScreen slug={slug} />
		</Suspense>
	);
}
