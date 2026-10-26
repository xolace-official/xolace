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
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@xolace/ui/components/breadcrumb";
import { Button } from "@xolace/ui/components/button";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@xolace/ui/components/field";
import { Input } from "@xolace/ui/components/input";
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@xolace/ui/components/pagination";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@xolace/ui/components/select";
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@xolace/ui/components/sheet";
import { ArchiveIcon, PanelRightOpenIcon } from "lucide-react";

import {
	type ContentStatus,
	StatusBadge,
} from "@/features/content/status-badge";

import { Section } from "./section";

const STATUSES: ContentStatus[] = [
	"draft",
	"needs_review",
	"queued",
	"processing",
	"live",
	"failed",
	"retired",
];

const KINDS = [
	{ label: "All kinds", value: null },
	{ label: "Explainer", value: "explainer" },
	{ label: "Advice", value: "advice" },
	{ label: "Story", value: "story" },
];

/** Components added for the admin v1 shell and content screens. */
export function ShellPieces() {
	return (
		<>
			<Section title="Content status">
				<div className="flex flex-wrap items-center gap-3">
					{STATUSES.map((status) => (
						<StatusBadge key={status} status={status} />
					))}
				</div>
			</Section>

			<Section title="Navigation">
				<div className="lip depth-md flex flex-col gap-6 rounded-xl border-2 border-line bg-surface p-6">
					<Breadcrumb>
						<BreadcrumbList>
							<BreadcrumbItem>
								<BreadcrumbLink href="#">Library</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator />
							<BreadcrumbItem>
								<BreadcrumbLink href="#">Entries</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator />
							<BreadcrumbItem>
								<BreadcrumbPage>Getting through exam season</BreadcrumbPage>
							</BreadcrumbItem>
						</BreadcrumbList>
					</Breadcrumb>
					<Pagination className="justify-start">
						<PaginationContent>
							<PaginationItem>
								<PaginationPrevious href="#" />
							</PaginationItem>
							<PaginationItem>
								<PaginationLink href="#">1</PaginationLink>
							</PaginationItem>
							<PaginationItem>
								<PaginationLink href="#" isActive>
									2
								</PaginationLink>
							</PaginationItem>
							<PaginationItem>
								<PaginationLink href="#">3</PaginationLink>
							</PaginationItem>
							<PaginationItem>
								<PaginationEllipsis />
							</PaginationItem>
							<PaginationItem>
								<PaginationLink href="#">18</PaginationLink>
							</PaginationItem>
							<PaginationItem>
								<PaginationNext href="#" />
							</PaginationItem>
						</PaginationContent>
					</Pagination>
				</div>
			</Section>

			<Section title="Fields and select">
				<div className="lip depth-md max-w-xl rounded-xl border-2 border-line bg-surface p-6">
					<FieldGroup>
						<Field>
							<FieldLabel htmlFor="preview-kind">Kind</FieldLabel>
							<Select items={KINDS}>
								<SelectTrigger className="w-full" id="preview-kind">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										{KINDS.map((kind) => (
											<SelectItem key={kind.label} value={kind.value}>
												{kind.label}
											</SelectItem>
										))}
									</SelectGroup>
								</SelectContent>
							</Select>
							<FieldDescription>
								Explainers need a safety review before they go live.
							</FieldDescription>
						</Field>
						<Field data-invalid>
							<FieldLabel htmlFor="preview-slug">Slug</FieldLabel>
							<Input
								aria-invalid
								defaultValue="Exam Stress"
								id="preview-slug"
							/>
							<FieldError>
								Lowercase letters, numbers and dashes only.
							</FieldError>
						</Field>
					</FieldGroup>
				</div>
			</Section>

			<Section title="Sheet and confirm">
				<div className="flex flex-wrap items-center gap-4">
					<Sheet>
						<SheetTrigger render={<Button variant="outline" />}>
							<PanelRightOpenIcon />
							Open details
						</SheetTrigger>
						<SheetContent>
							<SheetHeader>
								<SheetTitle>Getting through exam season</SheetTitle>
								<SheetDescription>
									Advice · exams · 2 sources · narrated
								</SheetDescription>
							</SheetHeader>
							<div className="flex flex-wrap gap-2 px-6">
								<StatusBadge status="live" />
							</div>
							<SheetFooter>
								<SheetClose render={<Button variant="outline" />}>
									Close
								</SheetClose>
							</SheetFooter>
						</SheetContent>
					</Sheet>
					<AlertDialog>
						<AlertDialogTrigger render={<Button variant="destructive" />}>
							<ArchiveIcon />
							Retire entry
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Retire this entry?</AlertDialogTitle>
								<AlertDialogDescription>
									It leaves the Library and search. Readers who saved it keep
									their history. You can publish it again later.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancel</AlertDialogCancel>
								<AlertDialogAction variant="destructive">
									<ArchiveIcon />
									Retire
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</div>
			</Section>
		</>
	);
}
