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

import { BodyEditor } from "./body-editor";
import { DiscardButton, PublishButton, SaveButton } from "./entry-actions";
import { useEntryEditor } from "./entry-editor-provider";
import {
	EntryCopyFields,
	EntryDetailFields,
	EntryFacets,
} from "./entry-fields";
import {
	CoverPanel,
	CreditsList,
	EntryFacts,
	NarrationPanel,
} from "./entry-panels";
import { ChecklistSummary, PublishChecklist } from "./publish-checklist";

/**
 * The entry editor ("Document + rail", picked from three prototypes; the others are on
 * the `prototype/admin-entry-editor-layouts` branch). The writing runs down one
 * column; a sticky rail holds what it takes to ship it: checklist and Publish first,
 * then media and sources. Save stays in the page header.
 */
export function EntryEditor() {
	const {
		state: { saved },
	} = useEntryEditor();

	return (
		<>
			<PageHeader>
				<PageHeaderBreadcrumbs>
					<Breadcrumb>
						<BreadcrumbList>
							<BreadcrumbItem>
								<BreadcrumbLink render={<Link href="/library" />}>
									Library
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
					<EntryFacts />
				</PageHeaderMeta>
			</PageHeader>

			<EditorLayout>
				<EditorMain>
					<EditorPanel title="Copy">
						<EntryCopyFields />
					</EditorPanel>
					<EditorPanel title="Body">
						<BodyEditor />
					</EditorPanel>
					<EditorPanel title="Details">
						<EntryDetailFields />
					</EditorPanel>
				</EditorMain>

				<EditorRail>
					<Card size="sm">
						<CardHeader>
							<CardTitle>Publish</CardTitle>
							<ChecklistSummary />
						</CardHeader>
						<CardContent>
							<PublishChecklist />
						</CardContent>
						<CardFooter className="*:w-full">
							<PublishButton />
						</CardFooter>
					</Card>
					<EditorPanel size="sm" title="Narration">
						<NarrationPanel />
					</EditorPanel>
					<EditorPanel size="sm" title="Cover">
						<CoverPanel />
					</EditorPanel>
					<EditorPanel size="sm" title="Facets">
						<EntryFacets />
					</EditorPanel>
					<EditorPanel size="sm" title="Sources">
						<CreditsList />
					</EditorPanel>
				</EditorRail>
			</EditorLayout>
		</>
	);
}
