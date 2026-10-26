"use client";

import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@xolace/ui/components/breadcrumb";
import { buttonVariants } from "@xolace/ui/components/button";
import Link from "next/link";

import { DiscardButton, SaveButton } from "@/features/content/editor-actions";
import {
	EditorLayout,
	EditorMain,
	EditorPanel,
	EditorRail,
} from "@/features/content/editor-layout";
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
import { CitedBy } from "./cited-by";
import { PermissionBadge, StaleBadge } from "./source-badges";
import {
	SourceEditorProvider,
	useSourceEditor,
} from "./source-editor-provider";
import { SourceCreditFields, SourceTermsFields } from "./source-fields";

/** `/library/sources/[slug]`: a publisher's credit, reuse terms and where we cite them. */
export function SourceEditorScreen({ slug }: { slug: string }) {
	const {
		state: { sources },
	} = useLibrary();
	const source = sources.find((s) => s.slug === slug);

	if (!source) {
		return (
			<div className="lip depth-md rounded-xl border-2 border-line bg-surface">
				<EmptyState
					action={
						<Link
							className={buttonVariants({ variant: "outline" })}
							href="/library/sources"
						>
							Back to sources
						</Link>
					}
					description={
						<>
							No source has the slug <code>{slug}</code>.
						</>
					}
					pose="map"
					title="Source not found"
				/>
			</div>
		);
	}

	// Keyed by slug so moving to another source starts a fresh draft.
	return (
		<SourceEditorProvider key={source.slug} source={source}>
			<SourceEditor />
		</SourceEditorProvider>
	);
}

function SourceEditor() {
	const {
		actions,
		meta: { dirty },
		state: { citations, saved },
	} = useSourceEditor();
	const entryCount = new Set(citations.map((c) => c.entry.slug)).size;

	return (
		<>
			<PageHeader>
				<PageHeaderBreadcrumbs>
					<Breadcrumb>
						<BreadcrumbList>
							<BreadcrumbItem>
								<BreadcrumbLink render={<Link href="/library/sources" />}>
									Sources
								</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator />
							<BreadcrumbItem>
								<BreadcrumbPage className="max-w-[40ch] truncate">
									{saved.name}
								</BreadcrumbPage>
							</BreadcrumbItem>
						</BreadcrumbList>
					</Breadcrumb>
				</PageHeaderBreadcrumbs>
				<PageHeaderHeading>
					<PageHeaderTitle>{saved.name}</PageHeaderTitle>
					<PageHeaderActions>
						<DiscardButton dirty={dirty} onDiscard={actions.discard} />
						<SaveButton dirty={dirty} onSave={actions.save} />
					</PageHeaderActions>
				</PageHeaderHeading>
				<PageHeaderMeta>
					<PermissionBadge permission={saved.permission} />
					<StaleBadge citations={citations} />
					<code>{saved.slug}</code>
					<span aria-hidden>·</span>
					<span>
						cited by {entryCount} entr{entryCount === 1 ? "y" : "ies"}
					</span>
				</PageHeaderMeta>
			</PageHeader>

			<EditorLayout>
				<EditorMain>
					<EditorPanel title="Credit">
						<SourceCreditFields />
					</EditorPanel>
					<EditorPanel title="Reuse terms">
						<SourceTermsFields />
					</EditorPanel>
				</EditorMain>
				<EditorRail>
					<EditorPanel size="sm" title="Cited by">
						<CitedBy />
					</EditorPanel>
				</EditorRail>
			</EditorLayout>
		</>
	);
}
