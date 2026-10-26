"use client";

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
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@xolace/ui/components/card";
import {
	FileUpload,
	FileUploadDropzone,
	FileUploadItem,
	FileUploadItemDelete,
	FileUploadItemMetadata,
	FileUploadItemPreview,
	FileUploadList,
	FileUploadTrigger,
} from "@xolace/ui/components/file-upload";
import { Spinner } from "@xolace/ui/components/spinner";
import {
	Stepper,
	StepperContent,
	StepperDescription,
	StepperIndicator,
	StepperItem,
	StepperList,
	StepperSeparator,
	StepperTitle,
	StepperTrigger,
} from "@xolace/ui/components/stepper";
import {
	ToggleGroup,
	ToggleGroupItem,
} from "@xolace/ui/components/toggle-group";
import {
	ArrowLeftIcon,
	ArrowRightIcon,
	BookOpenIcon,
	CircleCheckIcon,
	CircleDashedIcon,
	FileWarningIcon,
	GitCompareArrowsIcon,
	HeadphonesIcon,
	UploadIcon,
	XIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import {
	PageHeader,
	PageHeaderBreadcrumbs,
	PageHeaderDescription,
	PageHeaderHeading,
	PageHeaderTitle,
} from "@/features/shell/page-header";

import {
	detectJsonFiles,
	type JsonDetection,
	roleSpec,
	TARGET_ROLES,
} from "./import-files";
import { useImports } from "./imports-provider";
import {
	IMPORT_TARGETS,
	type ImportTarget,
	TARGET_FILES,
	TARGET_LABEL,
} from "./types";

const STEPS = [
	{ description: "Library or audio", title: "Target", value: "target" },
	{ description: "Manifest and media", title: "Files", value: "files" },
	{ description: "See what changes", title: "Review", value: "review" },
] as const;

const TARGET_ICON: Record<ImportTarget, typeof BookOpenIcon> = {
	audio: HeadphonesIcon,
	library: BookOpenIcon,
};

const MAX_FILE_BYTES = 200 * 1024 * 1024;

/** `/imports/new`: pick a target, drop the tree's files, compare against what's stored. */
export function NewImportScreen() {
	const { actions } = useImports();
	const router = useRouter();
	const [step, setStep] = useState<string>("target");
	const [target, setTarget] = useState<ImportTarget>("library");
	const [files, setFiles] = useState<File[]>([]);
	const [comparing, startCompare] = useTransition();
	const [detections, setDetections] = useState<readonly JsonDetection[]>([]);
	// A drop holds only what it adds or changes, so any record list is enough;
	// references are checked against what's stored when comparing.
	const hasRecords = detections.some((detection) => detection.role !== null);

	// Files are recognised by their records, so reading them is async.
	useEffect(() => {
		let current = true;
		detectJsonFiles(target, files).then((next) => {
			if (current) {
				setDetections(next);
			}
		});
		return () => {
			current = false;
		};
	}, [target, files]);

	const compare = () =>
		startCompare(async () => {
			setStep("review");
			const id = await actions.compare(target, files);
			router.push(`/imports/${id}`);
		});

	return (
		<>
			<PageHeader>
				<PageHeaderBreadcrumbs>
					<Breadcrumb>
						<BreadcrumbList>
							<BreadcrumbItem>
								<BreadcrumbLink render={<Link href="/imports" />}>
									Imports
								</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator />
							<BreadcrumbItem>
								<BreadcrumbPage>New import</BreadcrumbPage>
							</BreadcrumbItem>
						</BreadcrumbList>
					</Breadcrumb>
				</PageHeaderBreadcrumbs>
				<PageHeaderHeading>
					<PageHeaderTitle>New import</PageHeaderTitle>
				</PageHeaderHeading>
				<PageHeaderDescription>
					Nothing is written until you review the diff and apply it.
				</PageHeaderDescription>
			</PageHeader>

			<Stepper
				className="max-w-3xl"
				nonInteractive={comparing}
				onValidate={(next) => next !== "review" || hasRecords}
				// Review is where the comparison runs: reaching it any way starts one.
				onValueChange={(next) =>
					next === "review" ? compare() : setStep(next)
				}
				value={step}
			>
				<StepperList>
					{STEPS.map((item) => (
						<StepperItem key={item.value} value={item.value}>
							<StepperTrigger disabled={item.value === "review" && !hasRecords}>
								<StepperIndicator />
								<span className="flex flex-col">
									<StepperTitle>{item.title}</StepperTitle>
									<StepperDescription>{item.description}</StepperDescription>
								</span>
							</StepperTrigger>
							<StepperSeparator />
						</StepperItem>
					))}
				</StepperList>

				<StepperContent value="target">
					<Card>
						<CardHeader>
							<CardTitle>What are you importing?</CardTitle>
							<CardDescription>
								Each target replaces one ingest script and reads the same tree.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<ToggleGroup
								aria-label="Import target"
								className="w-full"
								onValueChange={(value) => {
									const next = IMPORT_TARGETS.find((t) => t === value[0]);
									if (next) {
										setTarget(next);
									}
								}}
								size="lg"
								value={[target]}
								variant="outline"
							>
								{IMPORT_TARGETS.map((option) => {
									const Icon = TARGET_ICON[option];
									return (
										<ToggleGroupItem
											className="flex-1"
											key={option}
											value={option}
										>
											<Icon />
											{TARGET_LABEL[option]}
										</ToggleGroupItem>
									);
								})}
							</ToggleGroup>
							<p className="type-small mt-4 text-ink-muted">
								Reads {TARGET_FILES[target]}.
							</p>
						</CardContent>
						<CardFooter className="justify-end">
							<Button onClick={() => setStep("files")}>
								Next
								<ArrowRightIcon />
							</Button>
						</CardFooter>
					</Card>
				</StepperContent>

				<StepperContent value="files">
					<Card>
						<CardHeader>
							<CardTitle>Add the {TARGET_LABEL[target]} files</CardTitle>
							<CardDescription>
								Drop only what this batch adds or changes, under any file names,
								with the bodies and media it points at. Anything already stored
								and not in your files is left alone.
							</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-col gap-5">
							<ExpectedFiles detections={detections} target={target} />
							<FileUpload
								maxSize={MAX_FILE_BYTES}
								multiple
								onFileReject={(file, message) =>
									toast.error(message, { description: file.name })
								}
								onValueChange={setFiles}
								value={files}
							>
								<FileUploadDropzone>
									<span className="grid size-12 place-items-center rounded-full bg-lavender-soft text-lavender-text">
										<UploadIcon className="size-6 stroke-[2.5]" />
									</span>
									<span className="type-body-strong text-ink">
										Drop files here
									</span>
									<span className="type-small">
										JSON, markdown, images and audio, up to 200 MB each
									</span>
									<FileUploadTrigger
										render={<Button size="sm" variant="outline" />}
									>
										Browse files
									</FileUploadTrigger>
								</FileUploadDropzone>
								<FileUploadList>
									{files.map((file) => (
										<FileUploadItem
											key={`${file.name}:${file.size}:${file.lastModified}`}
											value={file}
										>
											<FileUploadItemPreview />
											<FileUploadItemMetadata />
											<FileUploadItemDelete
												render={
													<Button
														aria-label={`Remove ${file.name}`}
														size="icon-sm"
														variant="ghost"
													/>
												}
											>
												<XIcon />
											</FileUploadItemDelete>
										</FileUploadItem>
									))}
								</FileUploadList>
							</FileUpload>
						</CardContent>
						<CardFooter className="justify-between">
							<Button onClick={() => setStep("target")} variant="outline">
								<ArrowLeftIcon />
								Back
							</Button>
							<Button disabled={!hasRecords || comparing} onClick={compare}>
								{comparing ? <Spinner /> : <GitCompareArrowsIcon />}
								{comparing ? "Comparing" : "Compare"}
							</Button>
						</CardFooter>
					</Card>
				</StepperContent>

				<StepperContent value="review">
					<Card>
						<CardContent className="flex items-center gap-3 py-6">
							<Spinner />
							<span className="type-body text-ink">
								Hashing {files.length} files and comparing them with what's
								stored…
							</span>
						</CardContent>
					</Card>
				</StepperContent>
			</Stepper>
		</>
	);
}

function ExpectedFiles({
	target,
	detections,
}: {
	target: ImportTarget;
	detections: readonly JsonDetection[];
}) {
	const unrecognised = detections.filter(
		(detection): detection is Extract<JsonDetection, { role: null }> =>
			detection.role === null
	);
	return (
		<div className="flex flex-col gap-2">
			<ul
				aria-label="Expected files"
				className="flex flex-wrap gap-x-5 gap-y-2"
			>
				{TARGET_ROLES[target].map((role) => {
					const { label } = roleSpec(role);
					const matches = detections.filter(
						(detection) => detection.role === role
					);
					const present = matches.length > 0;
					const Icon = present ? CircleCheckIcon : CircleDashedIcon;
					return (
						<li className="type-small flex items-center gap-1.5" key={role}>
							<Icon
								aria-hidden
								className={
									present
										? "size-4 stroke-[2.5] text-mint-text"
										: "size-4 stroke-[2.5] text-ink-muted"
								}
							/>
							<span className={present ? "text-ink" : "text-ink-muted"}>
								{label}
							</span>
							{present ? (
								<code className="text-ink-muted">
									{matches.map((match) => match.file.name).join(", ")}
								</code>
							) : (
								<span className="text-ink-muted">(optional)</span>
							)}
							<span className="sr-only">{present ? "added" : "not added"}</span>
						</li>
					);
				})}
			</ul>
			{unrecognised.map((detection) => (
				<p
					className="type-small flex items-center gap-1.5 text-ember-text"
					key={detection.file.name}
				>
					<FileWarningIcon aria-hidden className="size-4 stroke-[2.5]" />
					<code>{detection.file.name}</code>
					<span>{detection.problem}, ignored.</span>
				</p>
			))}
		</div>
	);
}
