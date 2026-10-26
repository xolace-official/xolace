"use client";

import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@xolace/ui/components/tabs";
import { Textarea } from "@xolace/ui/components/textarea";
import { cn } from "@xolace/ui/lib/utils";
import { EyeIcon, PencilLineIcon } from "lucide-react";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import { useEntryEditor } from "./entry-editor-provider";

/** The GFM body as plain text, the same file ingest reads. */
export function BodyTextarea({ className }: { className?: string }) {
	const {
		state: { body },
		actions: { setBody },
	} = useEntryEditor();

	return (
		<Textarea
			aria-label="Body (Markdown)"
			className={cn("min-h-[32rem] font-mono text-sm leading-6", className)}
			onChange={(event) => setBody(event.target.value)}
			spellCheck
			value={body}
		/>
	);
}

// Our type scale on GFM output; no typography plugin.
const MARKDOWN: Components = {
	a: ({ node: _node, ...props }) => (
		<a className="text-sky-text underline underline-offset-4" {...props} />
	),
	blockquote: ({ node: _node, ...props }) => (
		<blockquote
			className="border-lavender border-l-4 pl-4 text-ink-muted italic"
			{...props}
		/>
	),
	h1: ({ node: _node, ...props }) => <h2 className="type-h2 mt-8" {...props} />,
	h2: ({ node: _node, ...props }) => <h2 className="type-h2 mt-8" {...props} />,
	h3: ({ node: _node, ...props }) => <h3 className="type-h3 mt-6" {...props} />,
	hr: () => <hr className="my-6 border-line border-t-2" />,
	// Images show as a labelled box, so a missing alt is obvious; the app renders the real image.
	img: ({ alt, src }) => (
		<span
			className={cn(
				"type-small flex flex-col gap-1 rounded-lg border-2 border-dashed p-4",
				alt
					? "border-line text-ink-muted"
					: "border-coral bg-coral-soft text-coral-text"
			)}
		>
			<span className="font-semibold">{alt || "Missing alt text"}</span>
			<span className="truncate">{typeof src === "string" ? src : ""}</span>
		</span>
	),
	li: ({ node: _node, ...props }) => <li className="pl-1" {...props} />,
	ol: ({ node: _node, ...props }) => (
		<ol className="flex list-decimal flex-col gap-1 pl-6" {...props} />
	),
	p: ({ node: _node, ...props }) => <p {...props} />,
	strong: ({ node: _node, ...props }) => (
		<strong className="font-bold text-ink" {...props} />
	),
	ul: ({ node: _node, ...props }) => (
		<ul className="flex list-disc flex-col gap-1 pl-6" {...props} />
	),
};

/** The body rendered roughly as the app shows it. */
export function MarkdownPreview({ className }: { className?: string }) {
	const {
		state: { body },
	} = useEntryEditor();

	return (
		<div className={cn("type-body flex flex-col gap-4 text-ink", className)}>
			<Markdown components={MARKDOWN} remarkPlugins={[remarkGfm]}>
				{body}
			</Markdown>
		</div>
	);
}

/** Write / Preview tabs over one body. */
export function BodyEditor() {
	return (
		<Tabs defaultValue="write">
			<TabsList>
				<TabsTrigger value="write">
					<PencilLineIcon />
					Write
				</TabsTrigger>
				<TabsTrigger value="preview">
					<EyeIcon />
					Preview
				</TabsTrigger>
			</TabsList>
			<TabsContent value="write">
				<BodyTextarea />
			</TabsContent>
			<TabsContent value="preview">
				<MarkdownPreview className="min-h-[32rem] rounded-md border-2 border-line bg-surface p-6" />
			</TabsContent>
		</Tabs>
	);
}
