"use client";

import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar";
import { cn } from "@xolace/ui/lib/utils";
import type * as React from "react";

const AVATAR_TONES = ["lavender", "sky", "mint", "ember", "pink"] as const;
type AvatarTone = (typeof AVATAR_TONES)[number];
const HASH_MULTIPLIER = 31;
const HASH_MODULUS = 2_147_483_647;
const WHITESPACE = /\s+/;

const TONE_CLASSES: Record<AvatarTone, string> = {
	ember: "bg-ember text-on-ember lip-ember-lip",
	lavender: "bg-lavender text-on-lavender lip-lavender-lip",
	mint: "bg-mint text-on-mint lip-mint-lip",
	pink: "bg-pink text-on-pink lip-pink-lip",
	sky: "bg-sky text-on-sky lip-sky-lip",
};

/** A stable tone for a name, so a person keeps their colour. Never coral. */
function avatarTone(name: string): AvatarTone {
	let hash = 0;
	for (const char of name) {
		hash = (hash * HASH_MULTIPLIER + (char.codePointAt(0) ?? 0)) % HASH_MODULUS;
	}
	return AVATAR_TONES[hash % AVATAR_TONES.length] ?? "lavender";
}

function Avatar({
	className,
	size = "default",
	...props
}: AvatarPrimitive.Root.Props & {
	size?: "default" | "sm" | "lg";
}) {
	return (
		<AvatarPrimitive.Root
			className={cn(
				"group/avatar relative flex size-10 shrink-0 select-none rounded-full data-[size=lg]:size-16 data-[size=sm]:size-8",
				className
			)}
			data-size={size}
			data-slot="avatar"
			{...props}
		/>
	);
}

function AvatarImage({ className, ...props }: AvatarPrimitive.Image.Props) {
	return (
		<AvatarPrimitive.Image
			className={cn(
				"aspect-square size-full rounded-full object-cover",
				className
			)}
			data-slot="avatar-image"
			{...props}
		/>
	);
}

/** Initials on a tone picked from `name` (or `tone`), with a 2px lip. */
function AvatarFallback({
	className,
	name,
	tone,
	children,
	...props
}: AvatarPrimitive.Fallback.Props & { name?: string; tone?: AvatarTone }) {
	const resolved = tone ?? avatarTone(name ?? "");
	const initials = (name ?? "")
		.trim()
		.split(WHITESPACE)
		.slice(0, 2)
		.map((part) => part[0] ?? "")
		.join("")
		.toUpperCase();
	return (
		<AvatarPrimitive.Fallback
			className={cn(
				"lip depth-sm flex size-full items-center justify-center rounded-full font-display font-extrabold text-[15px] group-data-[size=lg]/avatar:text-2xl group-data-[size=sm]/avatar:text-xs",
				TONE_CLASSES[resolved],
				className
			)}
			data-slot="avatar-fallback"
			{...props}
		>
			{children ?? initials}
		</AvatarPrimitive.Fallback>
	);
}

function AvatarBadge({ className, ...props }: React.ComponentProps<"span">) {
	return (
		<span
			className={cn(
				"absolute right-0 bottom-0 z-10 inline-flex size-3 select-none items-center justify-center rounded-full bg-mint text-on-mint ring-2 ring-surface group-data-[size=lg]/avatar:size-4 [&>svg]:hidden",
				className
			)}
			data-slot="avatar-badge"
			{...props}
		/>
	);
}

function AvatarGroup({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-surface",
				className
			)}
			data-slot="avatar-group"
			{...props}
		/>
	);
}

function AvatarGroupCount({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"relative flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-sunken font-display font-extrabold text-ink-muted text-xs ring-2 ring-surface",
				className
			)}
			data-slot="avatar-group-count"
			{...props}
		/>
	);
}

export {
	Avatar,
	AvatarBadge,
	AvatarFallback,
	AvatarGroup,
	AvatarGroupCount,
	AvatarImage,
	avatarTone,
};
