"use client";

import { Button } from "@xolace/ui/components/button";
import { AudioWaveformIcon, RotateCwIcon } from "lucide-react";

import { useTrackEditor } from "./track-editor-provider";

/** Rest height of a bar in the player: 4 + peak × 28 pt (redesign handoff `player.md` §1). */
const BAR_BASE = 4;
const BAR_RANGE = 28;

/**
 * The waveform the player's scrubber draws for this support track, at the
 * player's rest heights, so staff see what listeners get. Music always
 * plays with the plain line, so it has none. A support track without peaks
 * gets Measure again.
 */
export function TrackWaveform() {
	const {
		state: { saved },
		actions,
	} = useTrackEditor();

	if (saved.family === "music") {
		return (
			<Note>
				Music plays with a plain progress line in the player, so it has no
				waveform.
			</Note>
		);
	}
	if (!saved.peaks) {
		return (
			<div className="flex flex-col items-start gap-2">
				<Note>
					No waveform yet: the player draws a plain line until there is one.
					It's measured a few seconds after each upload. If it doesn't appear,
					measure again; if it still doesn't, the file couldn't be read, so
					replace the audio.
				</Note>
				<Button onClick={actions.measureWaveform} size="sm" variant="outline">
					<RotateCwIcon />
					Measure again
				</Button>
			</div>
		);
	}
	return (
		<figure className="flex flex-col gap-1.5">
			<div
				aria-label="The player's waveform for this track"
				className="flex h-10 items-center gap-0.5 rounded-md bg-surface-sunken px-2"
				role="img"
			>
				{saved.peaks.map((peak, index) => (
					<span
						className="min-w-0 flex-1 rounded-full bg-lavender"
						// biome-ignore lint/suspicious/noArrayIndexKey: fixed 60 bars, never reordered
						key={index}
						style={{ height: BAR_BASE + peak * BAR_RANGE }}
					/>
				))}
			</div>
			<figcaption className="type-small text-ink-muted">
				The player's waveform, measured from this audio.
			</figcaption>
		</figure>
	);
}

function Note({ children }: { children: string }) {
	return (
		<p className="type-small flex gap-2 text-ink-muted">
			<AudioWaveformIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
			<span>{children}</span>
		</p>
	);
}
