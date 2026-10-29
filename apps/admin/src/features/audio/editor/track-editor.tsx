"use client";

import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@xolace/ui/components/breadcrumb";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@xolace/ui/components/card";
import Link from "next/link";

import {
	EditorLayout,
	EditorMain,
	EditorPanel,
	EditorRail,
} from "@/features/content/editor-layout";
import {
	PageHeader,
	PageHeaderActions,
	PageHeaderBreadcrumbs,
	PageHeaderHeading,
	PageHeaderMeta,
	PageHeaderTitle,
} from "@/features/shell/page-header";

import {
	DiscardButton,
	PublishButton,
	SaveButton,
	TrackChecklist,
	TrackChecklistSummary,
} from "./track-actions";
import { useTrackEditor } from "./track-editor-provider";
import {
	LicenceFields,
	ShelfFields,
	TrackCopyFields,
	TrackTagFields,
	VoiceFields,
} from "./track-fields";
import { AudioPanel, ThumbPanel, TrackFacts } from "./track-panels";

/**
 * The track editor, in the entry editor's "Document + rail" layout: what the track is
 * runs down the column (music adds its licence, support its voice), the rail holds
 * publishing, the files and where it sits in Browse.
 */
export function TrackEditor() {
	const {
		state: { saved },
	} = useTrackEditor();

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
								<BreadcrumbPage className="max-w-[40ch] truncate">
									{saved.title}
								</BreadcrumbPage>
							</BreadcrumbItem>
						</BreadcrumbList>
					</Breadcrumb>
				</PageHeaderBreadcrumbs>
				<PageHeaderHeading>
					<PageHeaderTitle>{saved.title}</PageHeaderTitle>
					<PageHeaderActions>
						<DiscardButton />
						<SaveButton />
					</PageHeaderActions>
				</PageHeaderHeading>
				<PageHeaderMeta>
					<TrackFacts />
				</PageHeaderMeta>
			</PageHeader>

			<EditorLayout>
				<EditorMain>
					<EditorPanel title="Copy">
						<TrackCopyFields />
					</EditorPanel>
					<EditorPanel title="Tags">
						<TrackTagFields />
					</EditorPanel>
					{saved.family === "music" ? (
						<EditorPanel title="Licence">
							<LicenceFields />
						</EditorPanel>
					) : (
						<EditorPanel title="Voice">
							<VoiceFields />
						</EditorPanel>
					)}
				</EditorMain>

				<EditorRail>
					<Card size="sm">
						<CardHeader>
							<CardTitle>Publish</CardTitle>
							<TrackChecklistSummary />
						</CardHeader>
						<CardContent>
							<TrackChecklist />
						</CardContent>
						<CardFooter className="*:w-full">
							<PublishButton />
						</CardFooter>
					</Card>
					<EditorPanel size="sm" title="Audio">
						<AudioPanel />
					</EditorPanel>
					<EditorPanel size="sm" title="Shelf">
						<ShelfFields />
					</EditorPanel>
					<EditorPanel size="sm" title="Thumbnail">
						<ThumbPanel />
					</EditorPanel>
				</EditorRail>
			</EditorLayout>
		</>
	);
}
