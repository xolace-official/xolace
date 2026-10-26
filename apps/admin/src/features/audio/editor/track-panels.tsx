"use client";

import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "@xolace/ui/components/alert";
import { Button } from "@xolace/ui/components/button";
import {
	AudioLinesIcon,
	ImageIcon,
	OctagonAlertIcon,
	RotateCwIcon,
} from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";

import { StatusBadge } from "@/features/content/status-badge";
import { formatDate, formatDuration } from "@/features/library/types";
import { PickFileButton } from "@/features/media/pick-file-button";
import { readAudioDuration } from "../audio-file";
import { useTrackMedia } from "../audio-provider";
import { FAMILY_LABEL, topicSlug } from "../types";
import { useTrackEditor } from "./track-editor-provider";

/** The audio file: a player, processing state, Retry, Replace. */
export function AudioPanel() {
	const {
		state: { saved },
		actions,
	} = useTrackEditor();
	const media = useTrackMedia(saved.slug);

	const replace = async (file: File) => {
		let durationSec: number;
		try {
			durationSec = await readAudioDuration(file);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Can't read file");
			return;
		}
		await actions.replaceAudio(file, durationSec);
	};

	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center gap-3 rounded-md border-2 border-line bg-surface p-3">
				<span className="grid size-10 shrink-0 place-items-center rounded-sm bg-lavender-soft text-lavender-text">
					<AudioLinesIcon aria-hidden className="size-5 stroke-[2.5]" />
				</span>
				<span className="flex min-w-0 flex-col">
					<span className="type-body-strong text-ink tabular-nums">
						{formatDuration(saved.durationSec)}
					</span>
					<span className="type-small truncate text-ink-muted">
						{saved.family}/{saved.slug}
					</span>
				</span>
			</div>
			{media ? (
				// biome-ignore lint/a11y/useMediaCaption: a preview for staff; the transcript is in the editor
				<audio
					aria-label={`Play ${saved.title}`}
					className="w-full"
					controls
					preload="none"
					src={media.audioUrl}
				/>
			) : null}
			{saved.failure ? (
				<Alert variant="coral">
					<OctagonAlertIcon />
					<AlertTitle>{saved.failure.step} failed</AlertTitle>
					<AlertDescription className="break-words">
						{saved.failure.message}
					</AlertDescription>
				</Alert>
			) : null}
			{saved.status === "failed" ? (
				<Button onClick={actions.retry} size="sm" variant="warning">
					<RotateCwIcon />
					Retry
				</Button>
			) : null}
			<PickFileButton accept="audio/*" onPick={replace}>
				Replace audio
			</PickFileButton>
		</div>
	);
}

/** Square Browse thumbnail, resized to a 1080 WebP before upload. */
export function ThumbPanel() {
	const {
		state: { saved },
		actions,
	} = useTrackEditor();
	const media = useTrackMedia(saved.slug);

	return (
		<div className="flex flex-col gap-3">
			<div className="relative grid aspect-square place-items-center overflow-hidden rounded-lg border-2 border-line border-dashed bg-surface-sunken text-ink-muted">
				{media ? (
					<Image
						alt={`Thumbnail for ${saved.title}`}
						className="object-cover"
						fill
						sizes="320px"
						src={media.thumbUrl}
						unoptimized
					/>
				) : (
					<div className="flex flex-col items-center gap-2">
						<ImageIcon aria-hidden className="size-8 stroke-2" />
						<span className="type-small">
							{saved.hasThumb ? "Loading thumbnail" : "No thumbnail"}
						</span>
					</div>
				)}
			</div>
			<PickFileButton accept="image/*" onPick={actions.replaceThumb}>
				{saved.hasThumb ? "Replace thumbnail" : "Upload thumbnail"}
			</PickFileButton>
		</div>
	);
}

/** "Live · Music · Sleep & Rest · 1:58 · updated 3 Oct 2026" */
export function TrackFacts() {
	const {
		state: { saved, topics },
	} = useTrackEditor();
	const slug = topicSlug(saved.topic);

	return (
		<>
			<StatusBadge status={saved.status} />
			<span>{FAMILY_LABEL[saved.family]}</span>
			<span aria-hidden>·</span>
			<span>{topics.find((t) => t.slug === slug)?.title ?? slug}</span>
			<span aria-hidden>·</span>
			<span className="tabular-nums">{formatDuration(saved.durationSec)}</span>
			<span aria-hidden>·</span>
			<span>updated {formatDate(saved.updatedAt)}</span>
		</>
	);
}
