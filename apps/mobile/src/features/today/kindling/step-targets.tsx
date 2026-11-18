import { useEffect } from "react";
import { AccessibilityInfo, Pressable } from "react-native";
import { COPY } from "../copy";
import { PATH_H, type TwigView } from "./kindling-model";

/**
 * Each node's hit target: 44 pt wide and the path's full height, so every step shares a top
 * edge and VoiceOver reads them left to right (it orders by top first).
 */
const HIT = 44;

/** What VoiceOver says a step is. */
function stepState(
	state: TwigView["state"] | undefined,
	current: boolean
): string {
	if (state === "done") {
		return COPY.kindling.a11y.tended;
	}
	if (state === "skipped") {
		return COPY.kindling.a11y.passed;
	}
	return current ? COPY.kindling.a11y.next : COPY.kindling.a11y.later;
}

type Props = {
	nodes: readonly (readonly [number, number])[];
	twigs: readonly TwigView[];
	shown: readonly TwigView["state"][];
	current: number;
	peek: number;
	onPeek: (i: number) => void;
};

/**
 * The path's steps for touch and VoiceOver, over the drawn nodes: each named for its step,
 * with its state. Tapping one peeks at it in the NEXT row, and VoiceOver says what it shows;
 * the current step is already there, so it's text, not a button.
 */
export function StepTargets({
	nodes,
	twigs,
	shown,
	current,
	peek,
	onPeek,
}: Props) {
	const peeked = peek >= 0 ? twigs[peek] : undefined;
	const peekLine = peeked
		? `${peeked.title}, ${stepState(shown[peek], false)}`
		: null;
	useEffect(() => {
		if (peekLine) {
			AccessibilityInfo.announceForAccessibility(peekLine);
		}
	}, [peekLine]);

	return nodes.map(([x], i) => {
		const isCurrent = i === current;
		return (
			<Pressable
				accessibilityHint={isCurrent ? undefined : COPY.kindling.a11y.peekHint}
				accessibilityLabel={twigs[i]?.title}
				accessibilityRole={isCurrent ? "text" : "button"}
				accessibilityValue={{ text: stepState(shown[i], isCurrent) }}
				className="absolute"
				key={twigs[i]?.id ?? i}
				onPress={() => onPeek(i)}
				style={{ height: PATH_H, left: x - HIT / 2, top: 0, width: HIT }}
			/>
		);
	});
}
