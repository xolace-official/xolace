import { useState } from "react";
import { AppText } from "@/components/shared/app-text";
import { Fade } from "../fade";

export function WriteLine({
	line,
	reduced,
}: {
	line: string | null;
	reduced: boolean;
}) {
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
