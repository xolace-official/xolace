"use client";

import { api } from "@xolace/backend/api";
import type { Id } from "@xolace/backend/dataModel";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@xolace/ui/components/alert-dialog";
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
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@xolace/ui/components/field";
import { Input } from "@xolace/ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@xolace/ui/components/select";
import { Skeleton } from "@xolace/ui/components/skeleton";
import { Textarea } from "@xolace/ui/components/textarea";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { ImageIcon, SaveIcon, Trash2Icon, Undo2Icon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";

import {
	EditorLayout,
	EditorMain,
	EditorPanel,
	EditorRail,
} from "@/features/content/editor-layout";
import { runAction } from "@/features/content/run-action";
import { isSlug, slugify } from "@/features/content/slug";
import { EmptyState } from "@/features/flux/empty-state";
import { PickFileButton } from "@/features/media/pick-file-button";
import {
	PageHeader,
	PageHeaderActions,
	PageHeaderBreadcrumbs,
	PageHeaderHeading,
	PageHeaderMeta,
	PageHeaderTitle,
} from "@/features/shell/page-header";

import { uploadEventImage } from "./event-image";
import { EventStatusBadge } from "./events-screen";
import {
	type AwarenessEvent,
	CTA_ROUTES,
	EVENT_IMAGE,
	eventStatus,
	localToday,
} from "./types";

const TITLE_MAX = 60;
const BODY_MAX = 600;
const PROMPT_MAX = 140;
const CTA_LABEL_MAX = 24;
/** `/events/new` is a page, so no event can have that slug. */
const RESERVED_SLUGS = ["new"];

interface Draft {
	body: string;
	ctaLabel: string;
	ctaRoute: string;
	endDate: string;
	linkUrl: string;
	priority: string;
	sessionPrompt: string;
	startDate: string;
	title: string;
}

const BLANK: Draft = {
	body: "",
	ctaLabel: "",
	ctaRoute: "",
	endDate: "",
	linkUrl: "",
	priority: "1",
	sessionPrompt: "",
	startDate: "",
	title: "",
};

function toDraft(event: AwarenessEvent): Draft {
	return {
		body: event.body,
		ctaLabel: event.ctaLabel ?? "",
		ctaRoute: event.ctaRoute ?? "",
		endDate: event.endDate,
		linkUrl: event.linkUrl ?? "",
		priority: String(event.priority),
		sessionPrompt: event.sessionPrompt ?? "",
		startDate: event.startDate,
		title: event.title,
	};
}

function toArgs(draft: Draft) {
	return {
		body: draft.body,
		ctaLabel: draft.ctaLabel,
		ctaRoute: draft.ctaRoute,
		endDate: draft.endDate,
		linkUrl: draft.linkUrl,
		priority: Number(draft.priority),
		sessionPrompt: draft.sessionPrompt,
		startDate: draft.startDate,
		title: draft.title,
	};
}

type Problems = Partial<Record<keyof Draft | "slug", string>>;

/** The rules Convex re-checks, shown as the editor types. */
function findProblems(draft: Draft): Problems {
	const problems: Problems = {};
	if (draft.title.trim() === "") {
		problems.title = "Every event needs a title.";
	}
	if (draft.body.trim() === "") {
		problems.body = "Say what the event is about.";
	}
	if (draft.startDate === "") {
		problems.startDate = "Pick the first day it shows.";
	}
	if (draft.endDate === "") {
		problems.endDate = "Pick the last day it shows.";
	} else if (draft.startDate && draft.endDate < draft.startDate) {
		problems.endDate = "The end date is before the start date.";
	}
	const priority = Number(draft.priority);
	if (!Number.isInteger(priority) || priority < 1) {
		problems.priority = "A whole number, 1 or more.";
	}
	if (draft.ctaLabel.trim() !== "" && draft.ctaRoute === "") {
		problems.ctaRoute = "Pick where the button goes, or clear its label.";
	}
	if (draft.ctaRoute !== "" && draft.ctaLabel.trim() === "") {
		problems.ctaLabel = "The button needs a label.";
	}
	if (draft.linkUrl.trim() !== "" && !draft.linkUrl.startsWith("https://")) {
		problems.linkUrl = "Use a full https:// link.";
	}
	return problems;
}

function slugProblem(slug: string, events: AwarenessEvent[]) {
	if (!isSlug(slug)) {
		return "Lowercase letters, digits and hyphens.";
	}
	if (RESERVED_SLUGS.includes(slug) || events.some((e) => e.slug === slug)) {
		return "Another event already uses this slug.";
	}
}

/** `/events/[slug]`, or `/events/new` with no slug. */
export function EventEditorScreen({ slug }: { slug?: string }) {
	const { isAuthenticated } = useConvexAuth();
	const events = useQuery(
		api.admin.monthlyEvents.list,
		isAuthenticated ? {} : "skip"
	);

	if (slug === undefined) {
		return <EventEditor events={events ?? []} />;
	}
	if (events === undefined) {
		return <Skeleton className="h-96 w-full" />;
	}
	const event = events.find((e) => e.slug === slug);
	if (!event) {
		return (
			<div className="lip depth-md rounded-xl border-2 border-line bg-surface">
				<EmptyState
					action={
						<Link
							className={buttonVariants({ variant: "outline" })}
							href="/events"
						>
							Back to events
						</Link>
					}
					description={
						<>
							No event has the slug <code>{slug}</code>.
						</>
					}
					pose="map"
					title="Event not found"
				/>
			</div>
		);
	}
	// Keyed by slug so moving to another event starts a fresh draft.
	return <EventEditor event={event} events={events} key={event.slug} />;
}

function EventEditor({
	event,
	events,
}: {
	event?: AwarenessEvent;
	events: AwarenessEvent[];
}) {
	const router = useRouter();
	const create = useMutation(api.admin.monthlyEvents.create);
	const save = useMutation(api.admin.monthlyEvents.save);
	const setImage = useMutation(api.admin.monthlyEvents.setImage);
	const removeImage = useMutation(api.admin.monthlyEvents.removeImage);
	const remove = useMutation(api.admin.monthlyEvents.remove);
	const uploadUrl = useMutation(api.admin.monthlyEvents.generateImageUploadUrl);

	const saved = event ? toDraft(event) : BLANK;
	const [draft, setDraft] = useState(saved);
	const [slugInput, setSlugInput] = useState<string | null>(null);
	// A new event's image is uploaded before the event exists, then sent with Create.
	const [pending, setPending] = useState<{
		id: Id<"_storage">;
		previewUrl: string;
	} | null>(null);
	const [submitted, setSubmitted] = useState(false);
	const [saving, setSaving] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [today] = useState(localToday);

	const isNew = event === undefined;
	// A new slug follows the title until someone edits it by hand.
	const slug = event?.slug ?? slugInput ?? slugify(draft.title);
	const problems = findProblems(draft);
	const slugError = isNew ? slugProblem(slug, events) : undefined;
	if (slugError) {
		problems.slug = slugError;
	}
	const valid = Object.keys(problems).length === 0;
	const dirty = (Object.keys(draft) as (keyof Draft)[]).some(
		(key) => draft[key] !== saved[key]
	);
	const shown = (key: keyof Problems) =>
		submitted ? problems[key] : undefined;

	const setField = (key: keyof Draft, value: string) =>
		setDraft((d) => ({ ...d, [key]: value }));

	const onSave = async () => {
		setSubmitted(true);
		if (!valid) {
			return;
		}
		setSaving(true);
		try {
			if (isNew) {
				const created = await runAction(
					() => create({ ...toArgs(draft), imageStorageId: pending?.id, slug }),
					`“${draft.title}” created`
				);
				if (created) {
					router.push(`/events/${slug}`);
				}
			} else {
				await runAction(() => save({ ...toArgs(draft), slug }), "Saved");
			}
		} finally {
			setSaving(false);
		}
	};

	const onPickImage = async (file: File) => {
		setUploading(true);
		try {
			await runAction(async () => {
				const id = await uploadEventImage(file, () => uploadUrl());
				if (isNew) {
					setPending({ id, previewUrl: URL.createObjectURL(file) });
				} else {
					await setImage({ imageStorageId: id, slug });
				}
			}, "Image uploaded");
		} finally {
			setUploading(false);
		}
	};

	const onRemoveImage = async () => {
		if (isNew) {
			setPending(null);
			return;
		}
		await runAction(() => removeImage({ slug }), "Image removed");
	};

	const onDelete = async () => {
		const deleted = await runAction(
			() => remove({ slug }),
			`“${saved.title}” deleted`
		);
		if (deleted) {
			router.push("/events");
		}
	};

	const imageUrl = pending?.previewUrl ?? event?.imageUrl;
	const heading = isNew ? "New event" : saved.title;

	return (
		<>
			<PageHeader>
				<PageHeaderBreadcrumbs>
					<Breadcrumb>
						<BreadcrumbList>
							<BreadcrumbItem>
								<BreadcrumbLink render={<Link href="/events" />}>
									Events
								</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator />
							<BreadcrumbItem>
								<BreadcrumbPage className="max-w-[40ch] truncate">
									{heading}
								</BreadcrumbPage>
							</BreadcrumbItem>
						</BreadcrumbList>
					</Breadcrumb>
				</PageHeaderBreadcrumbs>
				<PageHeaderHeading>
					<PageHeaderTitle>{heading}</PageHeaderTitle>
					<PageHeaderActions>
						{!isNew && dirty ? (
							<Button onClick={() => setDraft(saved)} variant="ghost">
								<Undo2Icon />
								Discard
							</Button>
						) : null}
						<Button
							disabled={saving || uploading || !(isNew || dirty)}
							onClick={onSave}
						>
							<SaveIcon />
							{isNew ? "Create event" : "Save"}
						</Button>
					</PageHeaderActions>
				</PageHeaderHeading>
				{event ? (
					<PageHeaderMeta>
						<EventStatusBadge status={eventStatus(event, today)} />
						<span>
							<code>{event.slug}</code>
						</span>
					</PageHeaderMeta>
				) : null}
			</PageHeader>

			<EditorLayout>
				<EditorMain>
					<EditorPanel title="Copy">
						<FieldGroup>
							<TextField
								error={shown("title")}
								id="event-title"
								label="Title"
								max={TITLE_MAX}
								onChange={(value) => setField("title", value)}
								placeholder="Men's Mental Health Month"
								value={draft.title}
							/>
							{isNew ? (
								<TextField
									description="Its permanent id. The app remembers who has seen the event by it, so it can't change later. Include the year, e.g. mens-mental-health-month-2026."
									error={shown("slug")}
									id="event-slug"
									label="Slug"
									onChange={setSlugInput}
									value={slug}
								/>
							) : null}
							<Field data-invalid={shown("body") ? true : undefined}>
								<FieldLabel htmlFor="event-body">Body</FieldLabel>
								<Textarea
									aria-invalid={shown("body") ? true : undefined}
									className="min-h-32"
									id="event-body"
									maxLength={BODY_MAX}
									onChange={(e) => setField("body", e.target.value)}
									placeholder="June holds space for something that often goes unspoken…"
									value={draft.body}
								/>
								<FieldDescription>
									Shown under the image in the sheet. {draft.body.length}/
									{BODY_MAX}
								</FieldDescription>
								{shown("body") ? (
									<FieldError>{shown("body")}</FieldError>
								) : null}
							</Field>
							<TextField
								description="Optional. After the sheet closes, this opens the next reflection."
								id="event-prompt"
								label="Reflection prompt"
								max={PROMPT_MAX}
								onChange={(value) => setField("sessionPrompt", value)}
								placeholder="What has it been like for you lately?"
								value={draft.sessionPrompt}
							/>
						</FieldGroup>
					</EditorPanel>

					<EditorPanel title="Button and link">
						<FieldGroup>
							<TextField
								description="Optional. Needs a destination too."
								error={shown("ctaLabel")}
								id="event-cta-label"
								label="Button label"
								max={CTA_LABEL_MAX}
								onChange={(value) => setField("ctaLabel", value)}
								placeholder="Find support"
								value={draft.ctaLabel}
							/>
							<Field data-invalid={shown("ctaRoute") ? true : undefined}>
								<FieldLabel htmlFor="event-cta-route">
									Button destination
								</FieldLabel>
								<Select
									items={[
										{ label: "No button", value: "" },
										...Object.entries(CTA_ROUTES).map(([value, label]) => ({
											label,
											value,
										})),
									]}
									onValueChange={(value) =>
										setField("ctaRoute", String(value ?? ""))
									}
									value={draft.ctaRoute}
								>
									<SelectTrigger className="w-full" id="event-cta-route">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="">No button</SelectItem>
										{Object.entries(CTA_ROUTES).map(([value, label]) => (
											<SelectItem key={value} value={value}>
												{label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<FieldDescription>
									Screens in the app the button can open.
								</FieldDescription>
								{shown("ctaRoute") ? (
									<FieldError>{shown("ctaRoute")}</FieldError>
								) : null}
							</Field>
							<TextField
								description="Optional. A full article, opened from the sheet's header."
								error={shown("linkUrl")}
								id="event-link"
								label="Article link"
								onChange={(value) => setField("linkUrl", value)}
								placeholder="https://xolace.app/blog/…"
								type="url"
								value={draft.linkUrl}
							/>
						</FieldGroup>
					</EditorPanel>
				</EditorMain>

				<EditorRail>
					<EditorPanel size="sm" title="Schedule">
						<FieldGroup>
							<TextField
								error={shown("startDate")}
								id="event-start"
								label="First day"
								onChange={(value) => setField("startDate", value)}
								type="date"
								value={draft.startDate}
							/>
							<TextField
								description="Inclusive, in each person's own time zone."
								error={shown("endDate")}
								id="event-end"
								label="Last day"
								onChange={(value) => setField("endDate", value)}
								type="date"
								value={draft.endDate}
							/>
							<TextField
								description="1 is highest. When events overlap, the app shows the lowest number."
								error={shown("priority")}
								id="event-priority"
								label="Priority"
								onChange={(value) => setField("priority", value)}
								type="number"
								value={draft.priority}
							/>
						</FieldGroup>
					</EditorPanel>

					<EventImagePanel
						imageUrl={imageUrl}
						onPick={onPickImage}
						onRemove={onRemoveImage}
						title={draft.title}
						uploading={uploading}
					/>

					{event ? (
						<DeleteEventButton onDelete={onDelete} title={saved.title} />
					) : null}
				</EditorRail>
			</EditorLayout>
		</>
	);
}

function TextField({
	description,
	error,
	id,
	label,
	max,
	onChange,
	placeholder,
	type = "text",
	value,
}: {
	description?: ReactNode;
	error?: string;
	id: string;
	label: string;
	max?: number;
	onChange: (value: string) => void;
	placeholder?: string;
	type?: "date" | "number" | "text" | "url";
	value: string;
}) {
	return (
		<Field data-invalid={error ? true : undefined}>
			<FieldLabel htmlFor={id}>{label}</FieldLabel>
			<Input
				aria-invalid={error ? true : undefined}
				id={id}
				maxLength={max}
				min={type === "number" ? 1 : undefined}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				type={type}
				value={value}
			/>
			{description ? <FieldDescription>{description}</FieldDescription> : null}
			{error ? <FieldError>{error}</FieldError> : null}
		</Field>
	);
}

/** The sheet's image at its real shape, the size rules, and Upload/Replace/Remove. */
function EventImagePanel({
	imageUrl,
	onPick,
	onRemove,
	title,
	uploading,
}: {
	imageUrl: string | undefined;
	onPick: (file: File) => Promise<void>;
	onRemove: () => void;
	title: string;
	uploading: boolean;
}) {
	return (
		<EditorPanel size="sm" title="Image">
			<div className="flex flex-col gap-3">
				<div className="relative grid aspect-[686/360] place-items-center overflow-hidden rounded-lg border-2 border-line border-dashed bg-surface-sunken text-ink-muted">
					{imageUrl ? (
						<Image
							alt={`${title || "Event"} image`}
							className="object-cover"
							fill
							sizes="352px"
							src={imageUrl}
							unoptimized
						/>
					) : (
						<div className="flex flex-col items-center gap-2">
							<ImageIcon aria-hidden className="size-8 stroke-2" />
							<span className="type-small">No image</span>
						</div>
					)}
				</div>
				<p className="type-small text-ink-muted">
					<strong className="text-ink">
						{EVENT_IMAGE.width} × {EVENT_IMAGE.height} px
					</strong>{" "}
					(about 1.9 : 1), or larger at the same shape, e.g. 1372 × 720. JPG,
					PNG or WebP. It's resized to {EVENT_IMAGE.width} px wide and saved as
					WebP. Keep text away from the edges: smaller phones crop a little off
					the sides.
				</p>
				<div className="flex flex-wrap gap-2">
					<PickFileButton
						accept="image/jpeg,image/png,image/webp"
						busy={uploading}
						onPick={onPick}
					>
						{imageUrl ? "Replace image" : "Upload image"}
					</PickFileButton>
					{imageUrl ? (
						<Button
							disabled={uploading}
							onClick={onRemove}
							size="sm"
							variant="ghost"
						>
							Remove
						</Button>
					) : null}
				</div>
			</div>
		</EditorPanel>
	);
}

function DeleteEventButton({
	onDelete,
	title,
}: {
	onDelete: () => void;
	title: string;
}) {
	return (
		<AlertDialog>
			<AlertDialogTrigger
				render={<Button className="w-full" variant="destructive" />}
			>
				<Trash2Icon />
				Delete event
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete “{title}”?</AlertDialogTitle>
					<AlertDialogDescription>
						It stops showing in the app and its image is deleted. This can't be
						undone. To stop it early but keep it, set its last day to yesterday
						instead.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction onClick={onDelete} variant="destructive">
						<Trash2Icon />
						Delete
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
