"use client";

import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@xolace/ui/components/breadcrumb";
import { Button, buttonVariants } from "@xolace/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@xolace/ui/components/card";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@xolace/ui/components/field";
import {
	FileUpload,
	FileUploadDropzone,
	FileUploadItem,
	FileUploadItemDelete,
	FileUploadItemMetadata,
	FileUploadItemPreview,
	FileUploadList,
	FileUploadTrigger,
} from "@xolace/ui/components/file-upload";
import { Input } from "@xolace/ui/components/input";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@xolace/ui/components/select";
import {
	ToggleGroup,
	ToggleGroupItem,
} from "@xolace/ui/components/toggle-group";
import {
	AudioLinesIcon,
	HeadphonesIcon,
	MusicIcon,
	PlusIcon,
	XIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";
import { toast } from "sonner";

import { isReservedSlug, isSlug, slugify } from "@/features/content/slug";
import { formatDuration } from "@/features/library/types";
import {
	PageHeader,
	PageHeaderBreadcrumbs,
	PageHeaderDescription,
	PageHeaderHeading,
	PageHeaderTitle,
} from "@/features/shell/page-header";

import { readAudioDuration, titleFromFileName } from "./audio-file";
import { useAudio } from "./audio-provider";
import {
	FAMILY_LABEL,
	TRACK_FAMILIES,
	type TrackFamily,
	topicId,
} from "./types";

const FAMILY_ICON: Record<TrackFamily, typeof MusicIcon> = {
	music: MusicIcon,
	support: HeadphonesIcon,
};

const FAMILY_HINT: Record<TrackFamily, string> = {
	music: "Licensed music. Needs a licence before it goes live.",
	support: "Spoken support audio. Add the transcript and narrator next.",
};

const MAX_AUDIO_BYTES = 200 * 1024 * 1024;

/**
 * `/audio/new`: the few things a track can't exist without (family, audio file, title,
 * slug, topic). Create saves it as a draft and opens the track editor for the rest.
 */
export function NewTrackScreen() {
	const {
		actions,
		state: { topics, tracks },
	} = useAudio();
	const router = useRouter();
	const [family, setFamily] = useState<TrackFamily>("music");
	const [files, setFiles] = useState<File[]>([]);
	const [durationSec, setDurationSec] = useState<number | null>(null);
	// The file being read: a read that finishes after another pick (or a removal) is stale.
	const picked = useRef<File | undefined>(undefined);
	const [title, setTitle] = useState("");
	const [slugInput, setSlugInput] = useState<string | null>(null);
	const [topic, setTopic] = useState<string | null>(null);
	const [submitted, setSubmitted] = useState(false);

	// The slug follows the title until someone edits it by hand.
	const slug = slugInput ?? (title ? `${family}-${slugify(title)}` : "");
	const slugTaken = tracks.some((track) => track.slug === slug);
	const errors = {
		audio:
			files.length === 0 || durationSec === null ? "Add the audio file." : null,
		slug: (() => {
			if (!isSlug(slug)) {
				return "Lowercase letters, numbers and dashes only.";
			}
			if (isReservedSlug("track", slug)) {
				return `“${slug}” is taken by an admin page.`;
			}
			return slugTaken ? "Another track already has this slug." : null;
		})(),
		title: title.trim() ? null : "Every track needs a title.",
		topic: topic ? null : "Pick the topic it sits under.",
	};
	const valid = Object.values(errors).every((error) => error === null);
	const topicItems = topics.map((t) => ({
		label: t.title,
		value: topicId(family, t.slug),
	}));

	const pickAudio = async (next: File[]) => {
		setFiles(next);
		setDurationSec(null);
		const [file] = next;
		picked.current = file;
		if (!file) {
			return;
		}
		try {
			const duration = await readAudioDuration(file);
			if (picked.current !== file) {
				return;
			}
			setDurationSec(duration);
			if (!title) {
				setTitle(titleFromFileName(file.name));
			}
		} catch (error) {
			if (picked.current !== file) {
				return;
			}
			setFiles([]);
			toast.error(error instanceof Error ? error.message : "Can't read file");
		}
	};

	const create = (event: FormEvent) => {
		event.preventDefault();
		setSubmitted(true);
		if (!(valid && topic && durationSec !== null && files.length > 0)) {
			return;
		}
		actions.create({
			durationSec,
			family,
			hasThumb: false,
			slug,
			title: title.trim(),
			topic,
		});
		toast.success(`“${title.trim()}” saved as a draft`);
		router.push(`/audio/${slug}`);
	};

	// Errors show once the field has a value or after the first Create.
	const shown = (key: keyof typeof errors, touched: boolean) =>
		submitted || touched ? errors[key] : null;

	return (
		<>
			<PageHeader>
				<PageHeaderBreadcrumbs>
					<Breadcrumb>
						<BreadcrumbList>
							<BreadcrumbItem>
								<BreadcrumbLink render={<Link href="/audio" />}>
									Tracks
								</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator />
							<BreadcrumbItem>
								<BreadcrumbPage>New track</BreadcrumbPage>
							</BreadcrumbItem>
						</BreadcrumbList>
					</Breadcrumb>
				</PageHeaderBreadcrumbs>
				<PageHeaderHeading>
					<PageHeaderTitle>New track</PageHeaderTitle>
				</PageHeaderHeading>
				<PageHeaderDescription>
					Saved as a draft. Tags, licence or transcript, and the thumbnail come
					next, in the editor.
				</PageHeaderDescription>
			</PageHeader>

			<form className="max-w-3xl" noValidate onSubmit={create}>
				<Card>
					<CardHeader>
						<CardTitle>The track</CardTitle>
						<CardDescription>{FAMILY_HINT[family]}</CardDescription>
					</CardHeader>
					<CardContent>
						<FieldGroup>
							<Field>
								<FieldLabel>Family</FieldLabel>
								<ToggleGroup
									aria-label="Family"
									className="w-full"
									onValueChange={(value) => {
										const next = TRACK_FAMILIES.find((f) => f === value[0]);
										if (next) {
											setFamily(next);
											setTopic(null);
										}
									}}
									size="lg"
									value={[family]}
									variant="outline"
								>
									{TRACK_FAMILIES.map((option) => {
										const Icon = FAMILY_ICON[option];
										return (
											<ToggleGroupItem
												className="flex-1"
												key={option}
												value={option}
											>
												<Icon />
												{FAMILY_LABEL[option]}
											</ToggleGroupItem>
										);
									})}
								</ToggleGroup>
							</Field>

							<Field data-invalid={shown("audio", false) ? true : undefined}>
								<FieldLabel>Audio file</FieldLabel>
								<FileUpload
									accept="audio/*"
									invalid={Boolean(shown("audio", false))}
									maxFiles={1}
									maxSize={MAX_AUDIO_BYTES}
									onFileReject={(file, message) =>
										toast.error(message, { description: file.name })
									}
									onValueChange={pickAudio}
									value={files}
								>
									{files.length === 0 ? (
										<FileUploadDropzone>
											<span className="grid size-12 place-items-center rounded-full bg-lavender-soft text-lavender-text">
												<AudioLinesIcon className="size-6 stroke-[2.5]" />
											</span>
											<span className="type-body-strong text-ink">
												Drop the audio here
											</span>
											<span className="type-small">
												MP3, M4A or WAV, up to 200 MB
											</span>
											<FileUploadTrigger
												render={<Button size="sm" variant="outline" />}
											>
												Browse files
											</FileUploadTrigger>
										</FileUploadDropzone>
									) : null}
									<FileUploadList>
										{files.map((file) => (
											<FileUploadItem key={file.name} value={file}>
												<FileUploadItemPreview />
												<FileUploadItemMetadata />
												{durationSec === null ? null : (
													<span className="type-small text-ink-muted tabular-nums">
														{formatDuration(durationSec)}
													</span>
												)}
												<FileUploadItemDelete
													render={
														<Button
															aria-label={`Remove ${file.name}`}
															size="icon-sm"
															variant="ghost"
														/>
													}
												>
													<XIcon />
												</FileUploadItemDelete>
											</FileUploadItem>
										))}
									</FileUploadList>
								</FileUpload>
								<FieldError>{shown("audio", false)}</FieldError>
							</Field>

							<Field
								data-invalid={shown("title", title !== "") ? true : undefined}
							>
								<FieldLabel htmlFor="new-track-title">Title</FieldLabel>
								<Input
									aria-invalid={shown("title", title !== "") ? true : undefined}
									id="new-track-title"
									onChange={(event) => setTitle(event.target.value)}
									value={title}
								/>
								<FieldError>{shown("title", title !== "")}</FieldError>
							</Field>

							<Field
								data-invalid={shown("slug", slug !== "") ? true : undefined}
							>
								<FieldLabel htmlFor="new-track-slug">Slug</FieldLabel>
								<Input
									aria-invalid={shown("slug", slug !== "") ? true : undefined}
									className="font-mono"
									id="new-track-slug"
									onChange={(event) => setSlugInput(event.target.value)}
									value={slug}
								/>
								<FieldDescription>
									The track's permanent id. Imports match on it, so it can't
									change after this.
								</FieldDescription>
								<FieldError>{shown("slug", slug !== "")}</FieldError>
							</Field>

							<Field data-invalid={shown("topic", false) ? true : undefined}>
								<FieldLabel htmlFor="new-track-topic">Topic</FieldLabel>
								<Select
									items={topicItems}
									onValueChange={setTopic}
									value={topic}
								>
									<SelectTrigger
										aria-invalid={shown("topic", false) ? true : undefined}
										className="w-full"
										id="new-track-topic"
									>
										<SelectValue placeholder="Pick a topic" />
									</SelectTrigger>
									<SelectContent>
										<SelectGroup>
											{topicItems.map((item) => (
												<SelectItem key={item.value} value={item.value}>
													{item.label}
												</SelectItem>
											))}
										</SelectGroup>
									</SelectContent>
								</Select>
								<FieldError>{shown("topic", false)}</FieldError>
							</Field>
						</FieldGroup>
					</CardContent>
					<CardFooter className="justify-between">
						<Link
							className={buttonVariants({ variant: "outline" })}
							href="/audio"
						>
							Cancel
						</Link>
						<Button type="submit">
							<PlusIcon />
							Create draft
						</Button>
					</CardFooter>
				</Card>
			</form>
		</>
	);
}
