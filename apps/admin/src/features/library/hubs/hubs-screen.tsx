"use client";

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@xolace/ui/components/table";
import { AudioLinesIcon, BookOpenTextIcon, ImageOffIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NewNamedDialog } from "@/features/content/new-named-dialog";
import { runAction } from "@/features/content/run-action";
import { StatusBadge } from "@/features/content/status-badge";
import {
	PageHeader,
	PageHeaderActions,
	PageHeaderDescription,
	PageHeaderHeading,
	PageHeaderTitle,
} from "@/features/shell/page-header";

import { useLibrary } from "../library-provider";
import { formatDate, type LibraryHub } from "../types";

/** `/library/hubs`: the curated reading lists on the Library home. */
export function HubsScreen() {
	const {
		actions,
		state: { hubs },
	} = useLibrary();
	const router = useRouter();

	return (
		<>
			<PageHeader>
				<PageHeaderHeading>
					<PageHeaderTitle>Hubs</PageHeaderTitle>
					<PageHeaderActions>
						<NewNamedDialog
							description="Saved as a draft. The intro, running order and cover come next, in the editor."
							nameLabel="Title"
							namePlaceholder="Before you arrive"
							nameRequired="Every hub needs a title."
							noun="hub"
							onCreate={async (title, slug) => {
								const created = await runAction(
									() => actions.createHub({ slug, title }),
									`“${title}” saved as a draft`
								);
								if (created) {
									router.push(`/library/hubs/${slug}`);
								}
							}}
							slugHelp="The hub's permanent id and link. Imports match on it."
							slugTaken={(slug) => hubs.some((hub) => hub.slug === slug)}
						/>
					</PageHeaderActions>
				</PageHeaderHeading>
				<PageHeaderDescription>
					Short reading lists of entries and audio, in the order a reader goes
					through them.
				</PageHeaderDescription>
			</PageHeader>

			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Hub</TableHead>
						<TableHead>Items</TableHead>
						<TableHead>Status</TableHead>
						<TableHead>Updated</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{hubs.map((hub) => (
						<TableRow className="relative" key={hub.slug}>
							<TableCell className="max-w-lg">
								{/* The link's ::after covers the row, so the whole row opens the hub. */}
								<Link
									className="block truncate font-semibold text-ink outline-none after:absolute after:inset-0 hover:underline focus-visible:after:outline-2 focus-visible:after:outline-focus focus-visible:after:-outline-offset-2"
									href={`/library/hubs/${hub.slug}`}
								>
									{hub.title}
								</Link>
								<span className="type-small block truncate text-ink-muted">
									{hub.intro || "No intro yet."}
								</span>
							</TableCell>
							<TableCell>
								<ItemCounts hub={hub} />
							</TableCell>
							<TableCell>
								<span className="flex items-center gap-2">
									<StatusBadge status={hub.status} />
									{hub.hasCover ? null : (
										<ImageOffIcon
											aria-label="No cover"
											className="size-4 text-ink-muted"
										/>
									)}
								</span>
							</TableCell>
							<TableCell className="text-ink-muted tabular-nums">
								{formatDate(hub.updatedAt)}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</>
	);
}

function ItemCounts({ hub }: { hub: LibraryHub }) {
	const entries = hub.items.filter((item) => item.kind === "entry").length;
	const audio = hub.items.length - entries;
	return (
		<span className="type-small inline-flex items-center gap-3 text-ink-muted tabular-nums">
			<span className="inline-flex items-center gap-1">
				<BookOpenTextIcon aria-hidden className="size-4" />
				{entries}
				<span className="sr-only">entries</span>
			</span>
			{audio > 0 ? (
				<span className="inline-flex items-center gap-1">
					<AudioLinesIcon aria-hidden className="size-4" />
					{audio}
					<span className="sr-only">tracks</span>
				</span>
			) : null}
		</span>
	);
}
