"use client";

import { Badge } from "@xolace/ui/components/badge";
import { Button } from "@xolace/ui/components/button";
import {
	Combobox,
	ComboboxCollection,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxGroup,
	ComboboxInput,
	ComboboxItem,
	ComboboxLabel,
	ComboboxList,
} from "@xolace/ui/components/combobox";
import {
	Sortable,
	SortableContent,
	SortableItem,
	SortableItemHandle,
	SortableOverlay,
} from "@xolace/ui/components/sortable";
import {
	AudioLinesIcon,
	BookOpenTextIcon,
	GripVerticalIcon,
	OctagonAlertIcon,
	XIcon,
} from "lucide-react";
import Link from "next/link";

import { useAudio } from "@/features/audio/audio-provider";
import { FAMILY_LABEL } from "@/features/audio/types";
import { StatusBadge } from "@/features/content/status-badge";

import { useLibrary } from "../library-provider";
import { KIND_LABEL } from "../types";
import { useHubEditor } from "./hub-editor-provider";
import { hubItemId, type ResolvedHubItem } from "./hub-items";

/** The running order. Drag the handle (or focus it and use the arrow keys) to reorder. */
export function HubItemList() {
	const {
		actions,
		state: { items },
	} = useHubEditor();

	if (items.length === 0) {
		return (
			<p className="type-small rounded-md border-2 border-line border-dashed bg-surface-sunken px-4 py-6 text-center text-ink-muted">
				Nothing in this hub yet. Add entries or tracks below, in reading order.
			</p>
		);
	}

	return (
		<Sortable
			getItemValue={(item) => item.id}
			onValueChange={(next) =>
				actions.setField(
					"items",
					next.map((item) => item.item)
				)
			}
			value={[...items]}
		>
			<SortableContent className="flex flex-col gap-2" render={<ol />}>
				{items.map((item, index) => (
					<SortableItem key={item.id} render={<li />} value={item.id}>
						<HubItemRow index={index} item={item} />
					</SortableItem>
				))}
			</SortableContent>
			<SortableOverlay>
				{({ value }) => {
					const index = items.findIndex((i) => i.id === value);
					const dragged = items[index];
					return dragged ? (
						<SortableItem value={dragged.id}>
							<HubItemRow index={index} item={dragged} />
						</SortableItem>
					) : null;
				}}
			</SortableOverlay>
		</Sortable>
	);
}

function HubItemRow({ item, index }: { item: ResolvedHubItem; index: number }) {
	const { actions } = useHubEditor();
	const Icon = item.item.kind === "entry" ? BookOpenTextIcon : AudioLinesIcon;

	return (
		<div className="flex items-center gap-3 rounded-md border-2 border-line in-data-dragging:border-focus bg-surface py-2 pr-2 pl-1 in-data-dragging:shadow-[0_var(--depth-md)_0_var(--line-strong)]">
			<SortableItemHandle
				aria-label={`Move ${item.title}`}
				render={<Button size="icon-xs" variant="ghost" />}
			>
				<GripVerticalIcon />
			</SortableItemHandle>
			<span className="type-small w-5 text-right text-ink-muted tabular-nums">
				{index + 1}
			</span>
			<span className="grid size-8 shrink-0 place-items-center rounded-sm bg-surface-sunken text-ink-muted">
				<Icon aria-hidden className="size-4 stroke-[2.5]" />
			</span>
			<span className="flex min-w-0 flex-1 flex-col">
				{item.status === undefined ? (
					<span className="type-body-strong truncate text-ink">
						{item.title}
					</span>
				) : (
					<Link
						className="type-body-strong truncate text-ink hover:underline"
						href={
							item.item.kind === "entry"
								? `/library/${item.item.ref}`
								: `/audio/${item.item.ref}`
						}
					>
						{item.title}
					</Link>
				)}
				<span className="type-small text-ink-muted">{item.label}</span>
			</span>
			{item.status === undefined ? (
				<Badge variant="coral">
					<OctagonAlertIcon />
					Missing
				</Badge>
			) : (
				<StatusBadge status={item.status} />
			)}
			<Button
				aria-label={`Remove ${item.title}`}
				onClick={() => actions.removeItem(item.id)}
				size="icon-xs"
				variant="ghost"
			>
				<XIcon />
			</Button>
		</div>
	);
}

interface PickerItem {
	id: string;
	kind: "entry" | "audio";
	/** What the combobox filters on. */
	label: string;
	meta: string;
	ref: string;
}

interface PickerGroup {
	items: PickerItem[];
	value: string;
}

/** Search every entry and track not already in the hub; picking one appends it. */
export function AddHubItem() {
	const {
		actions,
		state: { items },
	} = useHubEditor();
	const {
		state: { entries },
	} = useLibrary();
	const {
		state: { tracks },
	} = useAudio();
	const taken = new Set(items.map((item) => item.id));

	const groups: PickerGroup[] = [
		{
			items: entries
				.map((entry) => ({
					id: hubItemId({ kind: "entry", ref: entry.slug }),
					kind: "entry" as const,
					label: entry.title,
					meta: KIND_LABEL[entry.kind],
					ref: entry.slug,
				}))
				.filter((item) => !taken.has(item.id)),
			value: "Entries",
		},
		{
			items: tracks
				.map((track) => ({
					id: hubItemId({ kind: "audio", ref: track.slug }),
					kind: "audio" as const,
					label: track.title,
					meta: FAMILY_LABEL[track.family],
					ref: track.slug,
				}))
				.filter((item) => !taken.has(item.id)),
			value: "Audio",
		},
	];

	return (
		<Combobox<PickerItem>
			items={groups}
			onValueChange={(picked) => {
				if (picked) {
					actions.addItem({ kind: picked.kind, ref: picked.ref });
				}
			}}
			value={null}
		>
			<ComboboxInput
				aria-label="Add an entry or track"
				className="w-full"
				placeholder="Add an entry or track…"
			/>
			<ComboboxContent>
				<ComboboxEmpty>Nothing matches.</ComboboxEmpty>
				<ComboboxList>
					{(group: PickerGroup) => (
						<ComboboxGroup items={group.items} key={group.value}>
							<ComboboxLabel>{group.value}</ComboboxLabel>
							<ComboboxCollection>
								{(item: PickerItem) => (
									<ComboboxItem key={item.id} value={item}>
										<span className="min-w-0 flex-1 truncate">
											{item.label}
										</span>
										<span className="type-small shrink-0 text-ink-muted">
											{item.meta}
										</span>
									</ComboboxItem>
								)}
							</ComboboxCollection>
						</ComboboxGroup>
					)}
				</ComboboxList>
			</ComboboxContent>
		</Combobox>
	);
}
