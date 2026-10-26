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

import { GateItem, GateList, GateSummary } from "@/features/content/gate-list";

import { useTrackEditor } from "./track-editor-provider";

export function SaveButton() {
	const {
		actions,
		meta: { dirty },
	} = useTrackEditor();
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
	} = useTrackEditor();
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

/** Gates with their fixes; only the safety review can be cleared from here. */
export function TrackChecklist() {
	const {
		actions,
		state: { gates },
	} = useTrackEditor();
	return (
		<GateList>
			{gates.map((gate) => (
				<GateItem gate={gate} key={gate.id}>
					{gate.id === "safety" ? (
						<Button
							className="w-fit"
							onClick={actions.markSafetyReviewed}
							size="xs"
							variant="warning"
						>
							Mark safety reviewed
						</Button>
					) : null}
				</GateItem>
			))}
		</GateList>
	);
}

export function TrackChecklistSummary() {
	const {
		state: { blocking },
	} = useTrackEditor();
	return <GateSummary blocking={blocking} />;
}

/** Publish (with a confirm), or Retire once the track is live. */
export function PublishButton() {
	const {
		actions,
		state: { saved },
		meta: { canPublish, dirty },
	} = useTrackEditor();

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
						It appears in Browse and recommendations for every listener on the
						next app refresh.
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

function RetireButton() {
	const {
		actions,
		state: { saved },
	} = useTrackEditor();

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
						It leaves Browse and recommendations, for example when a licence
						lapses. Listening history stays. You can publish it again later.
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
