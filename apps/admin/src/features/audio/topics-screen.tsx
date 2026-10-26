"use client";

import { Badge } from "@xolace/ui/components/badge";
import { cn } from "@xolace/ui/lib/utils";
import { ImageOffIcon, ShapesIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { runAction } from "@/features/content/run-action";
import { PickFileButton } from "@/features/media/pick-file-button";
import {
	PageHeader,
	PageHeaderDescription,
	PageHeaderHeading,
	PageHeaderTitle,
} from "@/features/shell/page-header";

import { useAudio } from "./audio-provider";
import { type AudioTopic, type TrackFamily, topicSlug } from "./types";

// Tints behind each cover while it loads.
const TINTS = [
	"bg-lavender-soft text-lavender-text",
	"bg-sky-soft text-sky-text",
	"bg-mint-soft text-mint-text",
	"bg-ember-soft text-ember-text",
	"bg-pink-soft text-pink-text",
] as const;

/** `/audio/topics`: one cover per topic, shared by its music and support shelves. */
export function TopicsScreen() {
	const {
		state: { topics, tracks },
	} = useAudio();
	const counts = (slug: string, family: TrackFamily) =>
		tracks.filter(
			(track) => track.family === family && topicSlug(track.topic) === slug
		).length;
	const missing = topics.filter((topic) => !topic.hasCover).length;

	return (
		<>
			<PageHeader>
				<PageHeaderHeading>
					<PageHeaderTitle>Topics</PageHeaderTitle>
				</PageHeaderHeading>
				<PageHeaderDescription>
					Each topic's cover shows on its Browse shelf, for music and support
					alike.
					{missing > 0
						? ` ${missing} ${missing === 1 ? "topic has" : "topics have"} no cover yet.`
						: null}
				</PageHeaderDescription>
			</PageHeader>

			<ul className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-5">
				{topics.map((topic, index) => (
					<TopicCard
						key={topic.slug}
						music={counts(topic.slug, "music")}
						support={counts(topic.slug, "support")}
						tint={TINTS[index % TINTS.length] ?? TINTS[0]}
						topic={topic}
					/>
				))}
			</ul>
		</>
	);
}

function TopicCard({
	topic,
	music,
	support,
	tint,
}: {
	topic: AudioTopic;
	music: number;
	support: number;
	tint: string;
}) {
	const { actions } = useAudio();
	const replace = (file: File) =>
		runAction(
			() => actions.replaceTopicCover(topic.slug, file),
			`Cover for ${topic.title} replaced`
		);

	return (
		<li className="lip depth-md flex flex-col overflow-hidden rounded-xl border-2 border-line bg-surface">
			<div
				className={cn(
					"relative grid aspect-square place-items-center overflow-hidden border-line border-b-2",
					topic.hasCover ? tint : "bg-surface-sunken text-ink-muted"
				)}
			>
				{topic.coverUrl ? (
					<Image
						alt={`${topic.title} cover`}
						className="object-cover"
						fill
						sizes="240px"
						src={topic.coverUrl}
						unoptimized
					/>
				) : null}
				{topic.hasCover && !topic.coverUrl ? (
					<ShapesIcon aria-hidden className="size-12 stroke-[2]" />
				) : null}
				{topic.hasCover ? null : (
					<span className="flex flex-col items-center gap-2">
						<ImageOffIcon aria-hidden className="size-10 stroke-[2]" />
						<Badge variant="ember">No cover</Badge>
					</span>
				)}
			</div>
			<div className="flex flex-1 flex-col gap-3 p-4">
				<div className="flex flex-col gap-0.5">
					<Link
						className="type-body-strong text-ink hover:underline"
						href={`/audio?topic=${topic.slug}`}
					>
						{topic.title}
					</Link>
					<span className="type-small text-ink-muted">
						{music} music · {support} support
					</span>
				</div>
				<PickFileButton accept="image/*" className="mt-auto" onPick={replace}>
					{topic.hasCover ? "Replace cover" : "Upload cover"}
				</PickFileButton>
			</div>
		</li>
	);
}
