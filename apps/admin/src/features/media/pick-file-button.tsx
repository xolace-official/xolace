"use client";

import { Button } from "@xolace/ui/components/button";
import { LoaderCircleIcon, UploadIcon } from "lucide-react";
import { useRef, useState } from "react";

/**
 * A hidden file input and the button that opens it, busy while `onPick` runs.
 * `busy` also disables it, for buttons that share one upload.
 */
export function PickFileButton({
	accept,
	busy: sharedBusy = false,
	children,
	className,
	onPick,
}: {
	accept: string;
	busy?: boolean;
	children: string;
	className?: string;
	onPick: (file: File) => Promise<unknown>;
}) {
	const input = useRef<HTMLInputElement>(null);
	const [picking, setPicking] = useState(false);
	const busy = picking || sharedBusy;

	const pick = async (file: File | undefined) => {
		if (!file) {
			return;
		}
		setPicking(true);
		try {
			await onPick(file);
		} finally {
			setPicking(false);
		}
	};

	const label = busy ? "Uploading…" : children;

	return (
		<>
			<input
				accept={accept}
				className="sr-only"
				onChange={(event) => {
					pick(event.target.files?.[0]);
					event.target.value = "";
				}}
				ref={input}
				tabIndex={-1}
				type="file"
			/>
			<Button
				className={className}
				disabled={busy}
				onClick={() => input.current?.click()}
				size="sm"
				variant="outline"
			>
				{busy ? <LoaderCircleIcon className="animate-spin" /> : <UploadIcon />}
				{label}
			</Button>
		</>
	);
}
