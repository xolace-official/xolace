import { useState } from "react";
import { AppText } from "@/components/shared/app-text";
import { Fade } from "../fade";

/**
 * The check's one line (fixable, held, not English), above For on the ember wash. It fades in as
 * the letter unfolds and is read out; VoiceOver hears it at once.
 */
export function WriteLine({
	line,
	reduced,
}: {
	line: string | null;
	reduced: boolean;
}) {
	// The last line stays drawn while it fades out.
	const [last, setLast] = useState(line);
	if (line !== null && line !== last) {
		setLast(line);
	}
	return (
		<Fade
			className="justify-start px-4 pt-2"
			on={line !== null}
			reduced={reduced}
		>
			{last ? (
				<AppText
					accessibilityLiveRegion="polite"
					className="rounded-[14px] border-continuous bg-ember-wash px-3.5 py-2.5"
					variant="callout"
				>
					{last}
				</AppText>
			) : null}
		</Fade>
	);
}
