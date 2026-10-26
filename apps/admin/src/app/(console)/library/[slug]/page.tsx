import type { Metadata } from "next";
import { Suspense } from "react";
import { EntryEditorScreen } from "@/features/library/editor/entry-editor-screen";
import { EntriesSkeleton } from "@/features/library/entries-skeleton";

export const metadata: Metadata = { title: "Edit entry · Xolace Admin" };

export default async function EntryPage({
	params,
}: PageProps<"/library/[slug]">) {
	const { slug } = await params;
	return (
		<Suspense fallback={<EntriesSkeleton />}>
			<EntryEditorScreen slug={slug} />
		</Suspense>
	);
}
