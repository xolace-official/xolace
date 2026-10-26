import { cn } from "@xolace/ui/lib/utils";
import Image from "next/image";

/**
 * Flux poses, picked by meaning:
 * celebrate (queue cleared), curious (no results), map (not found),
 * thinking (long work), writer (no content yet), wave (welcome, sign-in),
 * whisper (hidden or restricted), peek (a hint pointing at the next step).
 */
export type FluxPose =
	| "celebrate"
	| "curious"
	| "map"
	| "peek"
	| "thinking"
	| "wave"
	| "whisper"
	| "writer";

const DEFAULT_SIZE = 160;

/** One Flux per screen. Never recolour, crop its feet, or pair a happy pose with an error. */
export function Mascot({
	pose,
	size = DEFAULT_SIZE,
	alt = "",
	className,
}: {
	pose: FluxPose;
	size?: number;
	alt?: string;
	className?: string;
}) {
	return (
		<Image
			alt={alt}
			className={cn("object-contain", className)}
			height={size}
			src={`/flux/${pose}.png`}
			style={{ height: size, width: size }}
			width={size}
		/>
	);
}
