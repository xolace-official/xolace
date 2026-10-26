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
import { PlayIcon, Trash2Icon } from "lucide-react";

import { TARGET_LABEL } from "../types";
import { useImportRun } from "./import-run-provider";

const plural = (count: number, word: string) =>
	`${count} ${word}${count === 1 ? "" : "s"}`;

/** "Applies 11 items. 2 rejected won't import; 1 left out." */
export function ApplySummary({ className }: { className?: string }) {
	const {
		state: { counts },
		meta: { applicable, skipped },
	} = useImportRun();
	return (
		<p className={className}>
			<span className="type-body-strong text-ink">
				Applies {plural(applicable, "item")}.
			</span>{" "}
			<span className="type-body text-ink-muted">
				{counts.rejected > 0
					? `${counts.rejected} rejected won't import. `
					: ""}
				{skipped > 0 ? `${skipped} left out. ` : ""}
				{counts.unchanged} unchanged are skipped.
			</span>
		</p>
	);
}

export function ApplyButton() {
	const {
		actions,
		state: { run },
		meta: { applicable },
	} = useImportRun();
	return (
		<AlertDialog>
			<AlertDialogTrigger render={<Button disabled={applicable === 0} />}>
				<PlayIcon />
				Apply {plural(applicable, "item")}
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>
						Apply {plural(applicable, "item")} to {TARGET_LABEL[run.target]}?
					</AlertDialogTitle>
					<AlertDialogDescription>
						Sources go first, then entries, then hubs. Each item checks its
						uploaded files, then writes, and live items update for readers as
						soon as their own item finishes. Rejected and left-out items aren't
						touched.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Keep reviewing</AlertDialogCancel>
					<AlertDialogAction onClick={actions.apply}>
						<PlayIcon />
						Apply
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

export function DiscardRunButton() {
	const { actions } = useImportRun();
	return (
		<AlertDialog>
			<AlertDialogTrigger render={<Button variant="ghost" />}>
				<Trash2Icon />
				Discard
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Discard this import?</AlertDialogTitle>
					<AlertDialogDescription>
						Nothing has been written yet, and the audio it uploaded is deleted.
						To import these files later, start a new import.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction onClick={actions.discard} variant="destructive">
						<Trash2Icon />
						Discard
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
