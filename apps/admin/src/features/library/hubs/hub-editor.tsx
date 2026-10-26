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
import { Input } from "@xolace/ui/components/input";
import { Textarea } from "@xolace/ui/components/textarea";
import { ImageIcon, UploadIcon } from "lucide-react";
import Link from "next/link";

import {
	DiscardButton,
	PublishOrRetire,
	SaveButton,
} from "@/features/content/editor-actions";
import {
	EditorLayout,
	EditorMain,
	EditorPanel,
	EditorRail,
} from "@/features/content/editor-layout";
import { GateItem, GateList, GateSummary } from "@/features/content/gate-list";
import { UPLOADS_PENDING } from "@/features/content/run-action";
import { StatusBadge } from "@/features/content/status-badge";
import { EmptyState } from "@/features/flux/empty-state";
import {
	PageHeader,
	PageHeaderActions,
	PageHeaderBreadcrumbs,
	PageHeaderHeading,
	PageHeaderMeta,
	PageHeaderTitle,
} from "@/features/shell/page-header";

import { useLibrary } from "../library-provider";
import { formatDate } from "../types";
import { HubEditorProvider, useHubEditor } from "./hub-editor-provider";
import { AddHubItem, HubItemList } from "./hub-item-list";

const INTRO_MAX = 280;

/** `/library/hubs/[slug]`: a hub's intro, running order and cover; publish or retire it. */
export function HubEditorScreen({ slug }: { slug: string }) {
	const {
		state: { hubs },
	} = useLibrary();
	const hub = hubs.find((h) => h.slug === slug);

	if (!hub) {
		return (
			<div className="lip depth-md rounded-xl border-2 border-line bg-surface">
				<EmptyState
					action={
						<Link
							className={buttonVariants({ variant: "outline" })}
							href="/library/hubs"
						>
							Back to hubs
						</Link>
					}
					description={
						<>
							No hub has the slug <code>{slug}</code>.
						</>
					}
					pose="map"
					title="Hub not found"
				/>
			</div>
		);
	}

	// Keyed by slug so moving to another hub starts a fresh draft.
	return (
		<HubEditorProvider hub={hub} key={hub.slug}>
			<HubEditor />
		</HubEditorProvider>
	);
}

/** Same "Document + rail" layout as the entry and track editors. */
function HubEditor() {
	const {
		actions,
		meta: { canPublish, dirty },
		state: { blocking, gates, items, saved },
	} = useHubEditor();
	const { uploads } = useLibrary().meta;

	return (
		<>
			<PageHeader>
				<PageHeaderBreadcrumbs>
					<Breadcrumb>
						<BreadcrumbList>
							<BreadcrumbItem>
								<BreadcrumbLink render={<Link href="/library/hubs" />}>
									Hubs
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
						<DiscardButton dirty={dirty} onDiscard={actions.discard} />
						<SaveButton dirty={dirty} onSave={actions.save} />
					</PageHeaderActions>
				</PageHeaderHeading>
				<PageHeaderMeta>
					<StatusBadge status={saved.status} />
					<span>
						{items.length} item{items.length === 1 ? "" : "s"}
					</span>
					<span aria-hidden>·</span>
					<span>updated {formatDate(saved.updatedAt)}</span>
				</PageHeaderMeta>
			</PageHeader>

			<EditorLayout>
				<EditorMain>
					<EditorPanel title="Copy">
						<HubCopyFields />
					</EditorPanel>
					<EditorPanel title="Running order">
						<div className="flex flex-col gap-4">
							<HubItemList />
							<AddHubItem />
						</div>
					</EditorPanel>
				</EditorMain>

				<EditorRail>
					<Card size="sm">
						<CardHeader>
							<CardTitle>Publish</CardTitle>
							<GateSummary blocking={blocking} />
						</CardHeader>
						<CardContent>
							<GateList>
								{gates.map((gate) => (
									<GateItem gate={gate} key={gate.id}>
										{gate.id === "cover" ? (
											<Button
												className="w-fit"
												disabled={!uploads}
												onClick={actions.replaceCover}
												size="xs"
												title={uploads ? undefined : UPLOADS_PENDING}
												variant="outline"
											>
												<UploadIcon />
												Upload cover
											</Button>
										) : null}
									</GateItem>
								))}
							</GateList>
						</CardContent>
						<CardFooter className="*:w-full">
							<PublishOrRetire
								canPublish={canPublish}
								dirty={dirty}
								name={saved.title}
								onPublish={actions.publish}
								onRetire={actions.retire}
								publishEffect="It appears on the Library home for every reader on the next app refresh."
								retireEffect="It leaves the Library home. The entries and tracks in it stay live. You can publish it again later."
								status={saved.status}
							/>
						</CardFooter>
					</Card>
					<EditorPanel size="sm" title="Cover">
						<HubCover />
					</EditorPanel>
				</EditorRail>
			</EditorLayout>
		</>
	);
}

function HubCopyFields() {
	const {
		actions: { setField },
		state: { hub },
	} = useHubEditor();
	const titleMissing = hub.title.trim() === "";
	const introMissing = hub.intro.trim() === "";

	return (
		<FieldGroup>
			<Field data-invalid={titleMissing || undefined}>
				<FieldLabel htmlFor="hub-title">Title</FieldLabel>
				<Input
					aria-invalid={titleMissing || undefined}
					id="hub-title"
					onChange={(event) => setField("title", event.target.value)}
					value={hub.title}
				/>
				{titleMissing ? (
					<FieldError>Every hub needs a title.</FieldError>
				) : null}
			</Field>
			<Field data-invalid={introMissing || undefined}>
				<FieldLabel htmlFor="hub-intro">Intro</FieldLabel>
				<Textarea
					aria-invalid={introMissing || undefined}
					className="min-h-24"
					id="hub-intro"
					maxLength={INTRO_MAX}
					onChange={(event) => setField("intro", event.target.value)}
					placeholder="A short reading list for…"
					value={hub.intro}
				/>
				<FieldDescription>
					Who it's for and what it covers, in a sentence or two.{" "}
					{hub.intro.length}/{INTRO_MAX}
				</FieldDescription>
			</Field>
		</FieldGroup>
	);
}

/** Cover placeholder with Upload/Replace. Real uploads go to R2 in admin step 6. */
function HubCover() {
	const {
		actions,
		state: { hub },
	} = useHubEditor();
	const { uploads } = useLibrary().meta;

	return (
		<div className="flex flex-col gap-3">
			<div className="grid aspect-[16/10] place-items-center rounded-lg border-2 border-line border-dashed bg-surface-sunken text-ink-muted">
				<div className="flex flex-col items-center gap-2">
					<ImageIcon aria-hidden className="size-8 stroke-2" />
					<span className="type-small">
						{hub.hasCover ? "Cover uploaded" : "No cover"}
					</span>
				</div>
			</div>
			<Button
				disabled={!uploads}
				onClick={actions.replaceCover}
				size="sm"
				title={uploads ? undefined : UPLOADS_PENDING}
				variant="outline"
			>
				<UploadIcon />
				{hub.hasCover ? "Replace cover" : "Upload cover"}
			</Button>
		</div>
	);
}
