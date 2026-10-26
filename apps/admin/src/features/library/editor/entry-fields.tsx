"use client";

import { Badge } from "@xolace/ui/components/badge";
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
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@xolace/ui/components/select";
import { Textarea } from "@xolace/ui/components/textarea";

import { humanize } from "../types";
import { useEntryEditor } from "./entry-editor-provider";

const DEK_MAX = 160;

/** Title and dek: what a reader sees on the card. */
export function EntryCopyFields() {
	const {
		state: { entry },
		actions: { setField },
	} = useEntryEditor();
	const titleMissing = entry.title.trim() === "";
	const dekMissing = entry.dek.trim() === "";

	return (
		<FieldGroup>
			<Field data-invalid={titleMissing || undefined}>
				<FieldLabel htmlFor="entry-title">Title</FieldLabel>
				<Input
					aria-invalid={titleMissing || undefined}
					id="entry-title"
					onChange={(event) => setField("title", event.target.value)}
					value={entry.title}
				/>
				{titleMissing ? (
					<FieldError>Every entry needs a title.</FieldError>
				) : null}
			</Field>
			<Field data-invalid={dekMissing || undefined}>
				<FieldLabel htmlFor="entry-dek">Dek</FieldLabel>
				<Textarea
					aria-invalid={dekMissing || undefined}
					className="min-h-20"
					id="entry-dek"
					maxLength={DEK_MAX}
					onChange={(event) => setField("dek", event.target.value)}
					value={entry.dek}
				/>
				<FieldDescription>
					One sentence under the title. {entry.dek.length}/{DEK_MAX}
				</FieldDescription>
			</Field>
		</FieldGroup>
	);
}

/** Shelf, reader-facing extras and (for stories) who is telling it. */
export function EntryDetailFields() {
	const {
		state: { entry },
		actions: { setField },
		meta: { subjects },
	} = useEntryEditor();
	const subjectItems = subjects.map((slug) => ({
		label: humanize(slug),
		value: slug,
	}));

	return (
		<FieldGroup>
			<Field>
				<FieldLabel htmlFor="entry-subject">Primary subject</FieldLabel>
				<Select
					items={subjectItems}
					onValueChange={(value) => {
						if (value) {
							setField("primarySubject", value);
						}
					}}
					value={entry.primarySubject}
				>
					<SelectTrigger className="w-full" id="entry-subject">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectGroup>
							{subjectItems.map((item) => (
								<SelectItem key={item.value} value={item.value}>
									{item.label}
								</SelectItem>
							))}
						</SelectGroup>
					</SelectContent>
				</Select>
				<FieldDescription>The shelf this entry lives on.</FieldDescription>
			</Field>
			{entry.kind === "story" ? (
				<Field>
					<FieldLabel htmlFor="entry-descriptor">Storyteller</FieldLabel>
					<Input
						id="entry-descriptor"
						onChange={(event) =>
							setField("storyDescriptor", event.target.value)
						}
						placeholder="a second-year student, 20"
						value={entry.storyDescriptor ?? ""}
					/>
				</Field>
			) : null}
			<Field>
				<FieldLabel htmlFor="entry-note">Content note</FieldLabel>
				<Textarea
					className="min-h-20"
					id="entry-note"
					onChange={(event) => setField("contentNote", event.target.value)}
					placeholder="Mentions panic and sleep trouble. Nothing graphic."
					value={entry.contentNote ?? ""}
				/>
				<FieldDescription>
					Shown before a heavy body. Leave empty if none is needed.
				</FieldDescription>
			</Field>
			<Field>
				<FieldLabel htmlFor="entry-reflect">Reflect prompt</FieldLabel>
				<Input
					id="entry-reflect"
					onChange={(event) => setField("reflectPrompt", event.target.value)}
					placeholder="What are you most unsure about right now?"
					value={entry.reflectPrompt ?? ""}
				/>
				<FieldDescription>
					Opens “Reflect on this”. Empty uses the default.
				</FieldDescription>
			</Field>
		</FieldGroup>
	);
}

/** Facets by axis, read-only until tags-input lands. */
export function EntryFacets() {
	const {
		state: { entry },
	} = useEntryEditor();
	const axes = Object.entries(entry.facets);

	if (axes.length === 0) {
		return <p className="type-small text-ink-muted">No facets.</p>;
	}

	return (
		<dl className="flex flex-col gap-3">
			{axes.map(([axis, slugs]) => (
				<div className="flex flex-col gap-1.5" key={axis}>
					<dt className="type-eyebrow text-ink-muted">{humanize(axis)}</dt>
					<dd className="flex flex-wrap gap-1.5">
						{slugs.map((slug) => (
							<Badge key={slug} variant="lavender">
								{humanize(slug)}
							</Badge>
						))}
					</dd>
				</div>
			))}
		</dl>
	);
}
