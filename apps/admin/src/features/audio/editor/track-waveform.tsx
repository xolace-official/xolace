import { AudioWaveformIcon } from "lucide-react";

/** Rest height of a bar in the player: 4 + peak × 28 pt (redesign handoff `player.md` §1). */
const BAR_BASE = 4;
const BAR_RANGE = 28;

/**
 * The waveform the player's scrubber draws from this track's peaks, at the
 * player's rest heights, so staff can see what listeners get. Without peaks
 * the player draws a plain line, and this says so.
 */
export function TrackWaveform({ peaks }: { peaks?: readonly number[] }) {
	if (!peaks) {
		return (
			<p className="type-small flex gap-2 text-ink-muted">
				<AudioWaveformIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
				<span>
					No waveform: the player draws a plain line. It's measured from the
					audio a few seconds after each upload. If it stays missing, the file
					couldn't be read (the Convex logs say why, under{" "}
					<code className="font-mono">measurePeaks</code>).
				</span>
			</p>
		);
	}
	return (
		<figure className="flex flex-col gap-1.5">
			<div
				aria-label="The player's waveform for this track"
				className="flex h-10 items-center gap-0.5 rounded-md bg-surface-sunken px-2"
				role="img"
			>
				{peaks.map((peak, index) => (
					<span
						className="min-w-0 flex-1 rounded-full bg-lavender"
						// Position is the only identity a bar has.
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
