"use client";

import { Button } from "@xolace/ui/components/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@xolace/ui/components/dialog";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@xolace/ui/components/field";
import { Input } from "@xolace/ui/components/input";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@xolace/ui/components/select";
import Link from "next/link";
import { type FormEvent, useState } from "react";

import type { EntryCredit, LibrarySource } from "../types";

const DAY_MS = 86_400_000;

function toDateInput(ms?: number) {
	return ms ? new Date(ms).toISOString().slice(0, 10) : "";
}

/**
 * Add or edit one source credit. Controlled from outside (`open`), so one dialog serves
 * both the Add button and each credit's Edit. Mount it with a `key` per credit so the
 * form starts from that credit's values.
 */
export function CreditDialog({
	credit,
	sources,
	open,
	onOpenChange,
	onSubmit,
	now,
}: {
	credit?: EntryCredit;
	sources: readonly LibrarySource[];
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (credit: EntryCredit) => void;
	now: number;
}) {
	const [source, setSource] = useState<string | null>(credit?.source ?? null);
	const [pageTitle, setPageTitle] = useState(credit?.pageTitle ?? "");
	const [pageUrl, setPageUrl] = useState(credit?.pageUrl ?? "");
	const [author, setAuthor] = useState(credit?.author ?? "");
	const [retrieved, setRetrieved] = useState(
		toDateInput(credit ? credit.retrievedAt : now)
	);
	const [submitted, setSubmitted] = useState(false);

	const sourceItems = [...sources]
		.sort((a, b) => a.name.localeCompare(b.name))
		.map((s) => ({ label: s.name, value: s.slug }));
	const errors = {
		pageTitle: pageTitle.trim() ? null : "Name the page you drew on.",
		source: source ? null : "Pick the publisher.",
	};

	const submit = (event: FormEvent) => {
		event.preventDefault();
		setSubmitted(true);
		if (!source || errors.pageTitle) {
			return;
		}
		onSubmit({
			author: author.trim() || undefined,
			pageTitle: pageTitle.trim(),
			pageUrl: pageUrl.trim() || undefined,
			// End of the picked day, like "New until": a date, not a moment.
			retrievedAt: retrieved ? Date.parse(retrieved) + DAY_MS - 1 : undefined,
			source,
		});
		onOpenChange(false);
	};

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent>
				<form className="flex flex-col gap-6" noValidate onSubmit={submit}>
					<DialogHeader>
						<DialogTitle>{credit ? "Edit credit" : "Add credit"}</DialogTitle>
						<DialogDescription>
							One page this entry draws on. The publisher's credit line comes
							from the source.
						</DialogDescription>
					</DialogHeader>
					<FieldGroup>
						<Field data-invalid={submitted && errors.source ? true : undefined}>
							<FieldLabel htmlFor="credit-source">Source</FieldLabel>
							<Select
								items={sourceItems}
								onValueChange={setSource}
								value={source}
							>
								<SelectTrigger
									aria-invalid={submitted && errors.source ? true : undefined}
									className="w-full"
									id="credit-source"
								>
									<SelectValue placeholder="Pick a publisher" />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										{sourceItems.map((item) => (
											<SelectItem key={item.value} value={item.value}>
												{item.label}
											</SelectItem>
										))}
									</SelectGroup>
								</SelectContent>
							</Select>
							<FieldDescription>
								Not listed?{" "}
								<Link className="underline" href="/library/sources">
									Add it on Sources
								</Link>{" "}
								first.
							</FieldDescription>
							<FieldError>{submitted ? errors.source : null}</FieldError>
						</Field>
						<Field
							data-invalid={submitted && errors.pageTitle ? true : undefined}
						>
							<FieldLabel htmlFor="credit-title">Page title</FieldLabel>
							<Input
								aria-invalid={submitted && errors.pageTitle ? true : undefined}
								id="credit-title"
								onChange={(event) => setPageTitle(event.target.value)}
								value={pageTitle}
							/>
							<FieldError>{submitted ? errors.pageTitle : null}</FieldError>
						</Field>
						<Field>
							<FieldLabel htmlFor="credit-url">Page link</FieldLabel>
							<Input
								id="credit-url"
								onChange={(event) => setPageUrl(event.target.value)}
								placeholder="https://"
								type="url"
								value={pageUrl}
							/>
						</Field>
						<div className="grid gap-5 md:grid-cols-2">
							<Field>
								<FieldLabel htmlFor="credit-author">Authors</FieldLabel>
								<Input
									id="credit-author"
									onChange={(event) => setAuthor(event.target.value)}
									placeholder="Optional"
									value={author}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="credit-retrieved">Retrieved</FieldLabel>
								<Input
									id="credit-retrieved"
									onChange={(event) => setRetrieved(event.target.value)}
									type="date"
									value={retrieved}
								/>
							</Field>
						</div>
					</FieldGroup>
					<DialogFooter>
						<DialogClose render={<Button variant="outline" />}>
							Cancel
						</DialogClose>
						<Button type="submit">
							{credit ? "Save credit" : "Add credit"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
