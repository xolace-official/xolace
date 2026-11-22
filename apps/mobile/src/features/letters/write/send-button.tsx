import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { cn } from "@/lib/cn";
import { LETTERS } from "../copy";
import { Fade } from "../fade";
import { LETTER_MOTION } from "../letter-motion";

const L = LETTER_MOTION.label;
const LABEL = "absolute inset-0 items-center justify-center";

export function SendButton({
	waiting,
	off,
	reduced,
	onPress,
}: {
	waiting: boolean;
	off: boolean;
	reduced: boolean;
	onPress: () => void;
}) {
	let fill = "bg-ember";
	if (waiting) {
		fill = "bg-ember-wash";
	} else if (off) {
		fill = "bg-surface-secondary";
	}
	return (
		<PressScale
			accessibilityLabel={waiting ? LETTERS.write.reading : LETTERS.write.send}
			accessibilityRole="button"
			accessibilityState={{ busy: waiting, disabled: off || waiting }}
			className={cn("flex-1 overflow-hidden rounded-full", fill)}
			disabled={off || waiting}
			onPress={onPress}
		>
			<Fade
				className={LABEL}
				ms={L.ms}
				on={!waiting}
				reduced={reduced}
				rise={-L.rise}
			>
				<AppText
					className={cn(
						"text-[16.5px]",
						off ? undefined : "text-letter-on-ember"
					)}
					color={off ? "subtle" : "foreground"}
					variant="body"
					weight="semibold"
				>
					{LETTERS.write.send}
				</AppText>
			</Fade>
			<Fade
				className={LABEL}
				delay={L.delayMs}
				ms={L.ms}
				on={waiting}
				reduced={reduced}
				rise={L.rise}
			>
				<AppText
					className="text-[16.5px]"
					color="emberInk"
					variant="body"
					weight="semibold"
				>
					{LETTERS.write.reading}
				</AppText>
			</Fade>
		</PressScale>
	);
}
