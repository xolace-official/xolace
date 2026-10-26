"use client";

import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@xolace/ui/components/breadcrumb";
import { Button, buttonVariants } from "@xolace/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@xolace/ui/components/card";
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
import {
	ToggleGroup,
	ToggleGroupItem,
} from "@xolace/ui/components/toggle-group";
import {
	BookOpenTextIcon,
	LightbulbIcon,
	MessageCircleHeartIcon,
	PlusIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { runAction } from "@/features/content/run-action";
import { isSlug, slugify } from "@/features/content/slug";
import {
	PageHeader,
	PageHeaderBreadcrumbs,
	PageHeaderDescription,
	PageHeaderHeading,
	PageHeaderTitle,
} from "@/features/shell/page-header";

import { useLibrary } from "./library-provider";
import { ENTRY_KINDS, type EntryKind, humanize, KIND_LABEL } from "./types";

const KIND_ICON: Record<EntryKind, typeof BookOpenTextIcon> = {
	advice: LightbulbIcon,
	explainer: BookOpenTextIcon,
	story: MessageCircleHeartIcon,
};

const KIND_HINT: Record<EntryKind, string> = {
	advice: "Practical steps for one situation.",
	explainer:
		"How something works, from research. Needs a safety review before it goes live.",
	story:
		"One person's account in their words. Needs their consent before it goes live.",
};

/**
 * `/library/new`: pick the kind and name the entry. Create saves it as a draft and opens
 * the entry editor for the dek, body, sources and the rest.
 */
export function NewEntryScreen() {
	const {
		actions,
		state: { entries },
	} = useLibrary();
	const router = useRouter();
	const [kind, setKind] = useState<EntryKind>("explainer");
	const [title, setTitle] = useState("");
	const [slugInput, setSlugInput] = useState<string | null>(null);
	const [subject, setSubject] = useState<string | null>(null);
	const [submitted, setSubmitted] = useState(false);

	const subjects = [...new Set(entries.map((e) => e.primarySubject))].sort();
	const subjectItems = subjects.map((value) => ({
		label: humanize(value),
		value,
	}));

	// The slug follows the title until someone edits it by hand.
	const slug = slugInput ?? slugify(title);
	const errors = {
		slug: (() => {
			if (!isSlug(slug)) {
				return "Lowercase letters, numbers and dashes only.";
			}
			return entries.some((entry) => entry.slug === slug)
				? "Another entry already has this slug."
				: null;
		})(),
		subject: subject ? null : "Pick the shelf it lives on.",
		title: title.trim() ? null : "Every entry needs a title.",
	};
	const valid = Object.values(errors).every((error) => error === null);
	const shown = (key: keyof typeof errors, touched: boolean) =>
		submitted || touched ? errors[key] : null;

	const create = async (event: FormEvent) => {
		event.preventDefault();
		setSubmitted(true);
		if (!(valid && subject)) {
			return;
		}
		const created = await runAction(
			() =>
				actions.create({
					kind,
					primarySubject: subject,
					slug,
					title: title.trim(),
				}),
			`“${title.trim()}” saved as a draft`
		);
		if (created) {
			router.push(`/library/${slug}`);
		}
	};

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
								<BreadcrumbPage>New entry</BreadcrumbPage>
							</BreadcrumbItem>
						</BreadcrumbList>
					</Breadcrumb>
				</PageHeaderBreadcrumbs>
				<PageHeaderHeading>
					<PageHeaderTitle>New entry</PageHeaderTitle>
				</PageHeaderHeading>
				<PageHeaderDescription>
					Saved as a draft. The dek, body, sources and cover come next, in the
					editor.
				</PageHeaderDescription>
			</PageHeader>

			<form className="max-w-3xl" noValidate onSubmit={create}>
				<Card>
					<CardHeader>
						<CardTitle>The entry</CardTitle>
						<CardDescription>{KIND_HINT[kind]}</CardDescription>
					</CardHeader>
					<CardContent>
						<FieldGroup>
							<Field>
								<FieldLabel>Kind</FieldLabel>
								<ToggleGroup
									aria-label="Kind"
									className="w-full"
									onValueChange={(value) => {
										const next = ENTRY_KINDS.find((k) => k === value[0]);
										if (next) {
											setKind(next);
										}
									}}
									size="lg"
									value={[kind]}
									variant="outline"
								>
									{ENTRY_KINDS.map((option) => {
										const Icon = KIND_ICON[option];
										return (
											<ToggleGroupItem
												className="flex-1"
												key={option}
												value={option}
											>
												<Icon />
												{KIND_LABEL[option]}
											</ToggleGroupItem>
										);
									})}
								</ToggleGroup>
								<FieldDescription>
									The kind sets the publish checks and can't change later.
								</FieldDescription>
							</Field>

							<Field
								data-invalid={shown("title", title !== "") ? true : undefined}
							>
								<FieldLabel htmlFor="new-entry-title">Title</FieldLabel>
								<Input
									aria-invalid={shown("title", title !== "") ? true : undefined}
									id="new-entry-title"
									onChange={(event) => setTitle(event.target.value)}
									value={title}
								/>
								<FieldError>{shown("title", title !== "")}</FieldError>
							</Field>

							<Field
								data-invalid={shown("slug", slug !== "") ? true : undefined}
							>
								<FieldLabel htmlFor="new-entry-slug">Slug</FieldLabel>
								<Input
									aria-invalid={shown("slug", slug !== "") ? true : undefined}
									className="font-mono"
									id="new-entry-slug"
									onChange={(event) => setSlugInput(event.target.value)}
									value={slug}
								/>
								<FieldDescription>
									The entry's permanent id and link. Imports match on it, so it
									can't change after this.
								</FieldDescription>
								<FieldError>{shown("slug", slug !== "")}</FieldError>
							</Field>

							<Field data-invalid={shown("subject", false) ? true : undefined}>
								<FieldLabel htmlFor="new-entry-subject">
									Primary subject
								</FieldLabel>
								<Select
									items={subjectItems}
									onValueChange={setSubject}
									value={subject}
								>
									<SelectTrigger
										aria-invalid={shown("subject", false) ? true : undefined}
										className="w-full"
										id="new-entry-subject"
									>
										<SelectValue placeholder="Pick a subject" />
									</SelectTrigger>
									<SelectContent>
										<SelectGroup>
											{subjectItems.map((item) => (
												<SelectItem key={item.value} value={item.value}>
													{item.label}
												</SelectItem>
											))}
										</SelectGroup>
									</SelectContent>
								</Select>
								<FieldError>{shown("subject", false)}</FieldError>
							</Field>
						</FieldGroup>
					</CardContent>
					<CardFooter className="justify-between">
						<Link
							className={buttonVariants({ variant: "outline" })}
							href="/library"
						>
							Cancel
						</Link>
						<Button type="submit">
							<PlusIcon />
							Create draft
						</Button>
					</CardFooter>
				</Card>
			</form>
		</>
	);
}
