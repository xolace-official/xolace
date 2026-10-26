"use client";

import { buttonVariants } from "@xolace/ui/components/button";
import Link from "next/link";

import { EmptyState } from "@/features/flux/empty-state";

import { useAudio } from "../audio-provider";
import { TrackEditor } from "./track-editor";
import { TrackEditorProvider } from "./track-editor-provider";

/** `/audio/[slug]`: edit one track, clear its gates, publish or retire it. */
export function TrackEditorScreen({ slug }: { slug: string }) {
	const {
		state: { tracks },
	} = useAudio();
	const track = tracks.find((t) => t.slug === slug);

	if (!track) {
		return (
			<div className="lip depth-md rounded-xl border-2 border-line bg-surface">
				<EmptyState
					action={
						<Link
							className={buttonVariants({ variant: "outline" })}
							href="/audio"
						>
							Back to tracks
						</Link>
					}
					description={
						<>
							No track has the slug <code>{slug}</code>.
						</>
					}
					pose="map"
					title="Track not found"
				/>
			</div>
		);
	}

	// Keyed by slug so moving to another track starts a fresh draft.
	return (
		<TrackEditorProvider key={track.slug} track={track}>
			<TrackEditor />
		</TrackEditorProvider>
	);
}
