"use client";

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
import { Button } from "@xolace/ui/components/button";
import { ArchiveIcon, RocketIcon, SaveIcon, Undo2Icon } from "lucide-react";
import type { ReactNode } from "react";

import type { ContentStatus } from "./status-badge";

// The header and rail buttons every editor shares. Each editor wires them to its own
// context (`useEntryEditor`, `useTrackEditor`, …) and supplies its own copy.

export function SaveButton({
	dirty,
	onSave,
}: {
	dirty: boolean;
	onSave: () => void;
}) {
	return (
		<Button disabled={!dirty} onClick={onSave} variant="secondary">
			<SaveIcon />
			Save
		</Button>
	);
}

/** Shown only while there's something to throw away. */
export function DiscardButton({
	dirty,
	onDiscard,
}: {
	dirty: boolean;
	onDiscard: () => void;
}) {
	if (!dirty) {
		return null;
	}
	return (
		<Button onClick={onDiscard} variant="ghost">
			<Undo2Icon />
			Discard
		</Button>
	);
}

/** Publish with a confirm; once the item is live it turns into Retire. */
export function PublishOrRetire({
	status,
	name,
	canPublish,
	dirty,
	onPublish,
	onRetire,
	publishEffect,
	retireEffect,
}: {
	status: ContentStatus;
	/** The item's title, quoted in the confirm. */
	name: string;
	canPublish: boolean;
	dirty: boolean;
	onPublish: () => void;
	onRetire: () => void;
	/** What readers see after Publish: "It appears in the Library…" */
	publishEffect: ReactNode;
	/** What happens on Retire, and what stays. */
	retireEffect: ReactNode;
}) {
	if (status === "live") {
		return (
			<AlertDialog>
				<AlertDialogTrigger render={<Button variant="destructive" />}>
					<ArchiveIcon />
					Retire
				</AlertDialogTrigger>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Retire “{name}”?</AlertDialogTitle>
						<AlertDialogDescription>{retireEffect}</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={onRetire} variant="destructive">
							<ArchiveIcon />
							Retire
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		);
	}

	return (
		<AlertDialog>
			<AlertDialogTrigger
				render={
					<Button
						disabled={!canPublish}
						title={dirty ? "Save your changes first." : undefined}
					/>
				}
			>
				<RocketIcon />
				{status === "retired" ? "Publish again" : "Publish"}
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Publish “{name}”?</AlertDialogTitle>
					<AlertDialogDescription>{publishEffect}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction onClick={onPublish}>
						<RocketIcon />
						Publish
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
