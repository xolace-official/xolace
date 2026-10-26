import { cn } from "@xolace/ui/lib/utils";
import Image from "next/image";
import type { ComponentProps } from "react";

import { type FluxPose, Mascot } from "@/features/flux/mascot";

const LOCKUP_WIDTH = 107;
const LOCKUP_HEIGHT = 40;
const ART_SIZE = 280;

/**
 * Full-screen frame for the pages outside the shell (sign-in, no access).
 * Content on the left, Flux on a lavender panel on the right (hidden on small screens):
 *
 * <AuthFrame>
 *   <AuthFrameMain>
 *     <AuthFrameHeader>
 *       <AuthFrameTitle>Sign in</AuthFrameTitle>
 *       <AuthFrameDescription>…</AuthFrameDescription>
 *     </AuthFrameHeader>
 *     …form or actions…
 *   </AuthFrameMain>
 *   <AuthFrameArt pose="wave" />
 * </AuthFrame>
 */
function AuthFrame({ className, ...props }: ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"grid min-h-svh bg-bg lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]",
				className
			)}
			data-slot="auth-frame"
			{...props}
		/>
	);
}

/** The left column: lockup at the top, content centred, at most 420px wide. */
function AuthFrameMain({
	className,
	children,
	...props
}: ComponentProps<"main">) {
	return (
		<main
			className={cn(
				"flex flex-col gap-10 px-4 py-6 md:px-10 md:py-8",
				className
			)}
			data-slot="auth-frame-main"
			{...props}
		>
			<div className="flex items-center gap-2">
				<Image
					alt="Xolace"
					className="h-9 w-auto"
					height={LOCKUP_HEIGHT}
					priority
					src="/brand/xolace-lockup.png"
					width={LOCKUP_WIDTH}
				/>
				<span className="type-eyebrow rounded-sm bg-lavender-soft px-2 py-0.5 text-lavender-text">
					Admin
				</span>
			</div>
			<div className="mx-auto flex w-full max-w-105 grow flex-col justify-center gap-8">
				{children}
			</div>
		</main>
	);
}

function AuthFrameHeader({ className, ...props }: ComponentProps<"header">) {
	return (
		<header
			className={cn("flex flex-col gap-2", className)}
			data-slot="auth-frame-header"
			{...props}
		/>
	);
}

function AuthFrameTitle({ className, ...props }: ComponentProps<"h1">) {
	return (
		<h1
			className={cn("type-h1 text-ink", className)}
			data-slot="auth-frame-title"
			{...props}
		/>
	);
}

function AuthFrameDescription({ className, ...props }: ComponentProps<"p">) {
	return (
		<p
			className={cn("type-body-lg text-ink-muted", className)}
			data-slot="auth-frame-description"
			{...props}
		/>
	);
}

/** The right panel: one Flux pose, picked by meaning (wave to sign in, whisper when restricted). */
function AuthFrameArt({
	pose,
	className,
	...props
}: ComponentProps<"div"> & { pose: FluxPose }) {
	return (
		<div
			className={cn(
				"m-4 hidden items-center justify-center rounded-lg border-2 border-line bg-lavender-soft lg:ml-0 lg:flex",
				className
			)}
			data-slot="auth-frame-art"
			{...props}
		>
			<Mascot pose={pose} size={ART_SIZE} />
		</div>
	);
}

export {
	AuthFrame,
	AuthFrameArt,
	AuthFrameDescription,
	AuthFrameHeader,
	AuthFrameMain,
	AuthFrameTitle,
};
