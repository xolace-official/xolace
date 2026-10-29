import { cn } from "@xolace/ui/lib/utils";
import type { ComponentProps } from "react";

/**
 * Top of every admin page. Compose the parts you need:
 *
 * <PageHeader>
 *   <PageHeaderBreadcrumbs>…</PageHeaderBreadcrumbs>
 *   <PageHeaderHeading>
 *     <PageHeaderTitle>Entries</PageHeaderTitle>
 *     <PageHeaderActions><Button>New entry</Button></PageHeaderActions>
 *   </PageHeaderHeading>
 *   <PageHeaderDescription>…</PageHeaderDescription>
 * </PageHeader>
 */
function PageHeader({ className, ...props }: ComponentProps<"header">) {
	return (
		<header
			className={cn("mb-8 flex flex-col gap-2", className)}
			data-slot="page-header"
			{...props}
		/>
	);
}

/** Breadcrumb row above the title, for detail pages. */
function PageHeaderBreadcrumbs({ className, ...props }: ComponentProps<"div">) {
	return (
		<div
			className={cn("mb-1", className)}
			data-slot="page-header-breadcrumbs"
			{...props}
		/>
	);
}

/** Title on the left, actions on the right; wraps on narrow screens. */
function PageHeaderHeading({ className, ...props }: ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"flex flex-wrap items-center justify-between gap-x-6 gap-y-3",
				className
			)}
			data-slot="page-header-heading"
			{...props}
		/>
	);
}

function PageHeaderTitle({ className, ...props }: ComponentProps<"h1">) {
	return (
		<h1
			className={cn("type-h1 text-ink", className)}
			data-slot="page-header-title"
			{...props}
		/>
	);
}

function PageHeaderDescription({ className, ...props }: ComponentProps<"p">) {
	return (
		<p
			className={cn("type-body-lg max-w-2xl text-ink-muted", className)}
			data-slot="page-header-description"
			{...props}
		/>
	);
}

/** Status badges and small facts under the title ("Explainer · 6 min read"). */
function PageHeaderMeta({ className, ...props }: ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"type-small flex flex-wrap items-center gap-2 text-ink-muted",
				className
			)}
			data-slot="page-header-meta"
			{...props}
		/>
	);
}

function PageHeaderActions({ className, ...props }: ComponentProps<"div">) {
	return (
		<div
			className={cn("flex flex-wrap items-center gap-3", className)}
			data-slot="page-header-actions"
			{...props}
		/>
	);
}

export {
	PageHeader,
	PageHeaderActions,
	PageHeaderBreadcrumbs,
	PageHeaderDescription,
	PageHeaderHeading,
	PageHeaderMeta,
	PageHeaderTitle,
};
