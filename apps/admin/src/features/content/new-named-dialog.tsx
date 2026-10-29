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
	DialogTrigger,
} from "@xolace/ui/components/dialog";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@xolace/ui/components/field";
import { Input } from "@xolace/ui/components/input";
import { PlusIcon } from "lucide-react";
import { type FormEvent, useState } from "react";

import { isSlug, slugify } from "./slug";

/**
 * "New hub", "New source": the two things an item can't exist without (a name and a
 * permanent slug) in a dialog. `onCreate` saves the draft and navigates to its editor;
 * the dialog keeps what was typed until it reports success.
 */
export function NewNamedDialog({
	noun,
	description,
	nameLabel,
	namePlaceholder,
	nameRequired,
	slugHelp,
	slugTaken,
	onCreate,
}: {
	/** "hub", "source": used in the button, title and messages. */
	noun: string;
	description: string;
	nameLabel: string;
	namePlaceholder?: string;
	/** Shown when the name is empty. */
	nameRequired: string;
	slugHelp: string;
	slugTaken: (slug: string) => boolean;
	onCreate: (name: string, slug: string) => Promise<boolean>;
}) {
	const [open, setOpen] = useState(false);
	const [name, setName] = useState("");
	const [slugInput, setSlugInput] = useState<string | null>(null);
	const [submitted, setSubmitted] = useState(false);
	const [creating, setCreating] = useState(false);

	// The slug follows the name until someone edits it by hand.
	const slug = slugInput ?? slugify(name);
	const errors = {
		name: name.trim() ? null : nameRequired,
		slug: (() => {
			if (!isSlug(slug)) {
				return "Lowercase letters, numbers and dashes only.";
			}
			return slugTaken(slug) ? `Another ${noun} already has this slug.` : null;
		})(),
	};
	const shown = (key: keyof typeof errors, touched: boolean) =>
		submitted || touched ? errors[key] : null;

	const reset = () => {
		setName("");
		setSlugInput(null);
		setSubmitted(false);
	};

	const create = async (event: FormEvent) => {
		event.preventDefault();
		setSubmitted(true);
		if (creating || errors.name || errors.slug) {
			return;
		}
		setCreating(true);
		try {
			if (await onCreate(name.trim(), slug)) {
				setOpen(false);
				reset();
			}
		} finally {
			setCreating(false);
		}
	};

	return (
		<Dialog
			onOpenChange={(next) => {
				setOpen(next);
				if (!next) {
					reset();
				}
			}}
			open={open}
		>
			<DialogTrigger render={<Button />}>
				<PlusIcon />
				New {noun}
			</DialogTrigger>
			<DialogContent>
				<form className="flex flex-col gap-6" noValidate onSubmit={create}>
					<DialogHeader>
						<DialogTitle>New {noun}</DialogTitle>
						<DialogDescription>{description}</DialogDescription>
					</DialogHeader>
					<FieldGroup>
						<Field data-invalid={shown("name", name !== "") ? true : undefined}>
							<FieldLabel htmlFor="new-name">{nameLabel}</FieldLabel>
							<Input
								aria-invalid={shown("name", name !== "") ? true : undefined}
								id="new-name"
								onChange={(event) => setName(event.target.value)}
								placeholder={namePlaceholder}
								value={name}
							/>
							<FieldError>{shown("name", name !== "")}</FieldError>
						</Field>
						<Field data-invalid={shown("slug", slug !== "") ? true : undefined}>
							<FieldLabel htmlFor="new-slug">Slug</FieldLabel>
							<Input
								aria-invalid={shown("slug", slug !== "") ? true : undefined}
								className="font-mono"
								id="new-slug"
								onChange={(event) => setSlugInput(event.target.value)}
								value={slug}
							/>
							<FieldDescription>{slugHelp}</FieldDescription>
							<FieldError>{shown("slug", slug !== "")}</FieldError>
						</Field>
					</FieldGroup>
					<DialogFooter>
						<DialogClose render={<Button variant="outline" />}>
							Cancel
						</DialogClose>
						<Button disabled={creating} type="submit">
							<PlusIcon />
							Create {noun}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
