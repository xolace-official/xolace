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

import { useEntryEditor } from "./entry-editor-provider";

export function SaveButton() {
	const {
		actions,
		meta: { dirty },
	} = useEntryEditor();
	return (
		<Button disabled={!dirty} onClick={actions.save} variant="secondary">
			<SaveIcon />
			Save
		</Button>
	);
}

export function DiscardButton() {
	const {
		actions,
		meta: { dirty },
	} = useEntryEditor();
	if (!dirty) {
		return null;
	}
	return (
		<Button onClick={actions.discard} variant="ghost">
			<Undo2Icon />
			Discard
		</Button>
	);
}

/** Publish (with a confirm), or Retire once the entry is live. */
export function PublishButton() {
	const {
		actions,
		state: { saved },
		meta: { canPublish, dirty },
	} = useEntryEditor();

	if (saved.status === "live") {
		return <RetireButton />;
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
				{saved.status === "retired" ? "Publish again" : "Publish"}
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Publish “{saved.title}”?</AlertDialogTitle>
					<AlertDialogDescription>
						It appears in the Library and search for every reader on the next
						app refresh.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction onClick={actions.publish}>
						<RocketIcon />
						Publish
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

export function RetireButton() {
	const {
		actions,
		state: { saved },
	} = useEntryEditor();

	return (
		<AlertDialog>
			<AlertDialogTrigger render={<Button variant="destructive" />}>
				<ArchiveIcon />
				Retire
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Retire “{saved.title}”?</AlertDialogTitle>
					<AlertDialogDescription>
						It leaves the Library and search. Readers who saved it keep their
						history. You can publish it again later.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction onClick={actions.retire} variant="destructive">
						<ArchiveIcon />
						Retire
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
