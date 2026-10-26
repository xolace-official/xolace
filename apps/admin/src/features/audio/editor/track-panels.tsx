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
	UploadIcon,
} from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";

import { UPLOADS_PENDING } from "@/features/content/run-action";
import { StatusBadge } from "@/features/content/status-badge";
import { formatDate, formatDuration } from "@/features/library/types";
import { readAudioDuration } from "../audio-file";
import { useAudio } from "../audio-provider";
import { FAMILY_LABEL, topicSlug } from "../types";
import { useTrackEditor } from "./track-editor-provider";

/** The audio file: length, processing state, Retry, Replace. */
export function AudioPanel() {
	const {
		state: { saved },
		actions,
	} = useTrackEditor();
	const { uploads } = useAudio().meta;
	const input = useRef<HTMLInputElement>(null);

	const replace = async (file: File | undefined) => {
		if (!file) {
			return;
		}
		try {
			await actions.replaceAudio(await readAudioDuration(file));
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Can't read file");
		}
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
			<input
				accept="audio/*"
				className="sr-only"
				onChange={(event) => {
					replace(event.target.files?.[0]);
					event.target.value = "";
				}}
				ref={input}
				tabIndex={-1}
				type="file"
			/>
			<Button
				disabled={!uploads}
				onClick={() => input.current?.click()}
				size="sm"
				title={uploads ? undefined : UPLOADS_PENDING}
				variant="outline"
			>
				<UploadIcon />
				Replace audio
			</Button>
		</div>
	);
}

/** Square Browse thumbnail. Upload is disabled until R2 lands (admin step 6b). */
export function ThumbPanel() {
	const {
		state: { saved },
		actions,
	} = useTrackEditor();
	const { uploads } = useAudio().meta;

	return (
		<div className="flex flex-col gap-3">
			<div className="grid aspect-square place-items-center rounded-lg border-2 border-line border-dashed bg-surface-sunken text-ink-muted">
				<div className="flex flex-col items-center gap-2">
					<ImageIcon aria-hidden className="size-8 stroke-2" />
					<span className="type-small">
						{saved.hasThumb ? "Thumbnail uploaded" : "No thumbnail"}
					</span>
				</div>
			</div>
			<Button
				disabled={!uploads}
				onClick={actions.replaceThumb}
				size="sm"
				title={uploads ? undefined : UPLOADS_PENDING}
				variant="outline"
			>
				<UploadIcon />
				{saved.hasThumb ? "Replace thumbnail" : "Upload thumbnail"}
			</Button>
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
