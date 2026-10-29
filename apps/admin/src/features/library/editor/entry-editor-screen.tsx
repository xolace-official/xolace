"use client";

import { buttonVariants } from "@xolace/ui/components/button";
import Link from "next/link";

import { EmptyState } from "@/features/flux/empty-state";

import { useLibrary } from "../library-provider";
import { EntryEditor } from "./entry-editor";
import { EntryEditorProvider } from "./entry-editor-provider";

/** `/library/[slug]`: edit one entry, clear its gates, publish or retire it. */
export function EntryEditorScreen({ slug }: { slug: string }) {
	const {
		state: { entries },
	} = useLibrary();
	const entry = entries.find((e) => e.slug === slug);

	if (!entry) {
		return (
			<div className="lip depth-md rounded-xl border-2 border-line bg-surface">
				<EmptyState
					action={
						<Link
							className={buttonVariants({ variant: "outline" })}
							href="/library"
						>
							Back to entries
						</Link>
					}
					description={
						<>
							No entry has the slug <code>{slug}</code>.
						</>
					}
					pose="map"
					title="Entry not found"
				/>
			</div>
		);
	}

	// Keyed by slug so moving to another entry starts a fresh draft.
	return (
		<EntryEditorProvider entry={entry} key={entry.slug}>
			<EntryEditor />
		</EntryEditorProvider>
	);
}
