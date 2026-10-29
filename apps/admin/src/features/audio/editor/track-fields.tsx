"use client";

import { Badge } from "@xolace/ui/components/badge";
import {
	Field,
	FieldContent,
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
import { Switch } from "@xolace/ui/components/switch";
import {
	TagsInput,
	TagsInputInput,
	TagsInputItem,
	TagsInputList,
} from "@xolace/ui/components/tags-input";
import { Textarea } from "@xolace/ui/components/textarea";

import type { TrackLicence, TrackSound } from "../types";
import { topicId, topicSlug } from "../types";
import { useTrackEditor } from "./track-editor-provider";

const WHAT_ITS_FOR_MAX = 140;

/** Title plus the line the meaning index embeds: "what it's for" (music) or the transcript (support). */
export function TrackCopyFields() {
	const {
		state: { track },
		actions: { setField },
	} = useTrackEditor();
	const titleMissing = track.title.trim() === "";

	return (
		<FieldGroup>
			<Field data-invalid={titleMissing || undefined}>
				<FieldLabel htmlFor="track-title">Title</FieldLabel>
				<Input
					aria-invalid={titleMissing || undefined}
					id="track-title"
					onChange={(event) => setField("title", event.target.value)}
					value={track.title}
				/>
				{titleMissing ? (
					<FieldError>Every track needs a title.</FieldError>
				) : null}
			</Field>
			{track.family === "music" ? (
				<Field>
					<FieldLabel htmlFor="track-for">What it's for</FieldLabel>
					<Textarea
						className="min-h-20"
						id="track-for"
						maxLength={WHAT_ITS_FOR_MAX}
						onChange={(event) => setField("whatItsFor", event.target.value)}
						placeholder="soft ambient pads for coming back to the room"
						value={track.whatItsFor ?? ""}
					/>
					<FieldDescription>
						One curated line, embedded with the title and tags for search.{" "}
						{(track.whatItsFor ?? "").length}/{WHAT_ITS_FOR_MAX}
					</FieldDescription>
				</Field>
			) : (
				<Field>
					<FieldLabel htmlFor="track-transcript">Transcript</FieldLabel>
					<Textarea
						className="min-h-64 leading-6"
						id="track-transcript"
						onChange={(event) => setField("transcript", event.target.value)}
						value={track.transcript ?? ""}
					/>
					<FieldDescription>
						What the track says, word for word. Search and recommendations read
						it.
					</FieldDescription>
				</Field>
			)}
		</FieldGroup>
	);
}

/** Curated tags (editable) next to the source's own tags (kept as they came). */
export function TrackTagFields() {
	const {
		state: { track },
		actions: { setField },
	} = useTrackEditor();

	return (
		<FieldGroup>
			<Field>
				<FieldLabel htmlFor="track-tags">Curated tags</FieldLabel>
				<TagsInput
					addOnPaste
					blurBehavior="add"
					editable
					onValueChange={(tags) => setField("tags", tags)}
					value={track.tags}
				>
					<TagsInputList>
						{track.tags.map((tag) => (
							<TagsInputItem key={tag} value={tag}>
								{tag}
							</TagsInputItem>
						))}
						<TagsInputInput id="track-tags" placeholder="Add a tag" />
					</TagsInputList>
				</TagsInput>
				<FieldDescription>
					The shared emotion and theme words recommendations score against.
					Enter or comma adds one.
				</FieldDescription>
			</Field>
			<Field>
				<FieldLabel>Source tags</FieldLabel>
				{track.sourceTags.length > 0 ? (
					<span className="flex flex-wrap gap-1.5">
						{track.sourceTags.map((tag) => (
							<Badge key={tag} variant="neutral">
								{tag}
							</Badge>
						))}
					</span>
				) : (
					<span className="type-small text-ink-muted">None.</span>
				)}
				<FieldDescription>
					As the source published them. Kept for search, never edited.
				</FieldDescription>
			</Field>
			{track.sound ? <SoundFacts sound={track.sound} /> : null}
		</FieldGroup>
	);
}

/** What the listening review heard. Read-only: the review file is its source. */
function SoundFacts({ sound }: { sound: TrackSound }) {
	const facts = [
		`Vocals: ${sound.vocals}`,
		`Energy ${sound.energy}/5`,
		sound.valence === undefined ? undefined : `Brightness ${sound.valence}/5`,
		sound.beat && `Beat: ${sound.beat}`,
		sound.arc && `Shape: ${sound.arc.replaceAll("_", " ")}`,
		sound.jolts ? "Has a sudden loud moment" : undefined,
		sound.lyrics && sound.lyrics !== "none"
			? `Lyrics: ${sound.lyrics}`
			: undefined,
		sound.instruments?.length
			? `Instruments: ${sound.instruments.join(", ")}`
			: undefined,
		sound.natureSounds?.length
			? `Nature: ${sound.natureSounds.join(", ")}`
			: undefined,
		sound.alsoFits?.length
			? `Also fits: ${sound.alsoFits.map((t) => t.replaceAll("_", " ")).join(", ")}`
			: undefined,
	].filter((fact): fact is string => !!fact);

	return (
		<Field>
			<FieldLabel>What it sounds like</FieldLabel>
			<p className="type-body text-ink">{sound.heard}</p>
			<span className="flex flex-wrap gap-1.5">
				{facts.map((fact) => (
					<Badge key={fact} variant="neutral">
						{fact}
					</Badge>
				))}
			</span>
			<FieldDescription>
				From the listening review (describe-music.ts). Edit the review file, not
				here.
			</FieldDescription>
		</Field>
	);
}

const EMPTY_LICENCE: TrackLicence = {
	acquiredAt: 0,
	artist: "",
	attributionRequired: false,
	attributionText: "",
	licenceName: "",
	licenceUrl: "",
	source: "",
	sourceUrl: "",
};

type TextKey = Exclude<
	keyof TrackLicence,
	"acquiredAt" | "attributionRequired"
>;

const LICENCE_TEXT: { key: TextKey; label: string; placeholder: string }[] = [
	{ key: "artist", label: "Artist", placeholder: "Databend" },
	{ key: "source", label: "Source", placeholder: "Pixabay Music" },
	{
		key: "sourceUrl",
		label: "Source page",
		placeholder: "https://pixabay.com/music/…",
	},
	{
		key: "licenceName",
		label: "Licence",
		placeholder: "Pixabay Content License",
	},
	{
		key: "licenceUrl",
		label: "Licence link",
		placeholder: "https://pixabay.com/service/license-summary/",
	},
];

/** Music only: where the track came from and the terms we hold it under. */
export function LicenceFields() {
	const {
		state: { track },
		actions: { setField },
	} = useTrackEditor();
	const licence = track.licence ?? EMPTY_LICENCE;
	const set = <K extends keyof TrackLicence>(key: K, value: TrackLicence[K]) =>
		setField("licence", {
			...licence,
			acquiredAt: licence.acquiredAt || Date.now(),
			[key]: value,
		});

	return (
		<FieldGroup>
			<div className="grid gap-5 md:grid-cols-2">
				{LICENCE_TEXT.map(({ key, label, placeholder }) => {
					const missing =
						(key === "artist" || key === "licenceName") &&
						licence[key].trim() === "";
					return (
						<Field data-invalid={missing || undefined} key={key}>
							<FieldLabel htmlFor={`licence-${key}`}>{label}</FieldLabel>
							<Input
								aria-invalid={missing || undefined}
								id={`licence-${key}`}
								onChange={(event) => set(key, event.target.value)}
								placeholder={placeholder}
								value={licence[key]}
							/>
						</Field>
					);
				})}
			</div>
			<Field orientation="horizontal">
				<Switch
					checked={licence.attributionRequired}
					id="licence-attribution-required"
					onCheckedChange={(checked) => set("attributionRequired", checked)}
				/>
				<FieldContent>
					<FieldLabel htmlFor="licence-attribution-required">
						Attribution required
					</FieldLabel>
					<FieldDescription>
						The player shows the credit line under the track.
					</FieldDescription>
				</FieldContent>
			</Field>
			<Field>
				<FieldLabel htmlFor="licence-attribution">Credit line</FieldLabel>
				<Input
					id="licence-attribution"
					onChange={(event) => set("attributionText", event.target.value)}
					placeholder="Music by Databend from Pixabay"
					value={licence.attributionText}
				/>
			</Field>
		</FieldGroup>
	);
}

const TIERS = [1, 2, 3, 4] as const;
const TIER_ITEMS = [
	{ label: "Not set", value: null },
	...TIERS.map((tier) => ({ label: `Tier ${tier}`, value: tier })),
];

/** Support only: who speaks it and how heavy it is. */
export function VoiceFields() {
	const {
		state: { track },
		actions: { setField },
	} = useTrackEditor();
	const narrators = track.narrators ?? [];

	return (
		<FieldGroup>
			<Field>
				<FieldLabel htmlFor="track-narrators">Narrators</FieldLabel>
				<TagsInput
					editable
					onValueChange={(next) => setField("narrators", next)}
					value={narrators}
				>
					<TagsInputList>
						{narrators.map((name) => (
							<TagsInputItem key={name} value={name}>
								{name}
							</TagsInputItem>
						))}
						<TagsInputInput id="track-narrators" placeholder="Sage" />
					</TagsInputList>
				</TagsInput>
				<FieldDescription>Display names the player credits.</FieldDescription>
			</Field>
			<Field>
				<FieldLabel htmlFor="track-tier">Acuity tier</FieldLabel>
				<Select
					items={TIER_ITEMS}
					onValueChange={(tier) => setField("tier", tier ?? undefined)}
					value={track.tier ?? null}
				>
					<SelectTrigger className="w-full md:w-48" id="track-tier">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectGroup>
							{TIER_ITEMS.map((item) => (
								<SelectItem key={item.label} value={item.value}>
									{item.label}
								</SelectItem>
							))}
						</SelectGroup>
					</SelectContent>
				</Select>
				<FieldDescription>
					1 is everyday, 4 the heaviest. Tier 3 and up needs a safety review
					before it goes live.
				</FieldDescription>
			</Field>
			{track.series ? (
				<Field>
					<FieldLabel>Series</FieldLabel>
					<span className="type-body text-ink">
						{track.seriesTitle ?? track.series}
						{track.episodeNumber ? `, episode ${track.episodeNumber}` : null}
					</span>
				</Field>
			) : null}
		</FieldGroup>
	);
}

const DAY_MS = 86_400_000;

function toDateInput(ms?: number) {
	return ms ? new Date(ms).toISOString().slice(0, 10) : "";
}

/** Where the track sits in Browse: topic, Featured hero, the "New" shelf. */
export function ShelfFields() {
	const {
		state: { track, topics },
		actions: { setField },
		meta: { now },
	} = useTrackEditor();
	const topicItems = topics
		.filter((topic) => topic.families.includes(track.family))
		.map((topic) => ({
			label: topic.title,
			value: topicId(track.family, topic.slug),
		}));
	const secondaryItems = [
		{ label: "None", value: null },
		...topicItems.filter((item) => item.value !== track.topic),
	];
	const isNew = track.newUntil !== undefined && track.newUntil > now;

	return (
		<FieldGroup>
			<Field>
				<FieldLabel htmlFor="track-topic">Topic</FieldLabel>
				<Select
					items={topicItems}
					onValueChange={(value) => {
						if (value) {
							setField("topic", value);
							// A topic can't be its own secondary.
							if (value === track.secondaryTopic) {
								setField("secondaryTopic", undefined);
							}
						}
					}}
					value={track.topic}
				>
					<SelectTrigger className="w-full" id="track-topic">
						<SelectValue>
							{topics.find((t) => t.slug === topicSlug(track.topic))?.title ??
								track.topic}
						</SelectValue>
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
			</Field>
			{track.family === "music" ? (
				<Field>
					<FieldLabel htmlFor="track-secondary-topic">
						Secondary topic
					</FieldLabel>
					<Select
						items={secondaryItems}
						onValueChange={(value) =>
							setField("secondaryTopic", value ?? undefined)
						}
						value={track.secondaryTopic ?? null}
					>
						<SelectTrigger className="w-full" id="track-secondary-topic">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								{secondaryItems.map((item) => (
									<SelectItem key={item.label} value={item.value}>
										{item.label}
									</SelectItem>
								))}
							</SelectGroup>
						</SelectContent>
					</Select>
					<FieldDescription>
						It also lists under this topic in Browse, after the topic's own
						tracks.
					</FieldDescription>
				</Field>
			) : null}
			<Field orientation="horizontal">
				<Switch
					checked={track.featured}
					id="track-featured"
					onCheckedChange={(checked) => setField("featured", checked)}
				/>
				<FieldContent>
					<FieldLabel htmlFor="track-featured">Featured</FieldLabel>
					<FieldDescription>A hand-picked hero in Browse.</FieldDescription>
				</FieldContent>
			</Field>
			<Field>
				<FieldLabel htmlFor="track-new-until">New until</FieldLabel>
				<Input
					id="track-new-until"
					onChange={(event) =>
						setField(
							"newUntil",
							event.target.value
								? Date.parse(event.target.value) + DAY_MS - 1
								: undefined
						)
					}
					type="date"
					value={toDateInput(track.newUntil)}
				/>
				<FieldDescription>
					{isNew
						? "On the Browse “New” shelf until this day."
						: "Not on the “New” shelf. Pick a day to put it there."}
				</FieldDescription>
			</Field>
		</FieldGroup>
	);
}
