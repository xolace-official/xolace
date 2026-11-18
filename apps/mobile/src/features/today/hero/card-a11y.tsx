import type { ComponentRef, Ref } from "react";
import { View } from "react-native";
import { COPY } from "../copy";

export type Frame = { x: number; y: number; width: number; height: number };

type Props = {
	card: Frame;
	/** The field's input and mic, while the card shows it (at rest). */
	field?: { input: Frame; mic: Frame; label: string };
	prompt: string;
	hint: string;
	/** The doors' VoiceOver action ("Talk or Vent"). */
	doorsAction: string;
	/** Only while the card is at rest: the doors' action. */
	onDoors?: () => void;
	/** The card's button, for VoiceOver to come back to after Write instead. */
	cardRef?: Ref<ComponentRef<typeof View>>;
};

/**
 * What VoiceOver reads on the Reflect card. Its touch surface is hidden from VoiceOver,
 * because the Link.Trigger zoom source is a `display: contents` view with no frame and
 * iOS accessibility skips anything inside a zero-size view; so the card's parts are mirrored here: over the card,
 * outside the link, at the frames the card measured. They take no touches, so a
 * VoiceOver double tap falls through to the card itself and the zoom still runs.
 */
export function CardA11y({
	card,
	field,
	prompt,
	hint,
	doorsAction,
	onDoors,
	cardRef,
}: Props) {
	return (
		<View className="absolute inset-0" pointerEvents="none">
			<View
				accessibilityActions={
					onDoors ? [{ label: doorsAction, name: "longpress" }] : undefined
				}
				accessibilityHint={hint}
				accessibilityLabel={prompt}
				accessibilityRole="button"
				accessible
				className="absolute"
				onAccessibilityAction={(e) => {
					if (e.nativeEvent.actionName === "longpress") {
						onDoors?.();
					}
				}}
				ref={cardRef}
				style={at(card)}
			/>
			{field ? (
				<>
					<View
						accessibilityHint={COPY.opensReflect}
						accessibilityLabel={field.label}
						accessibilityRole="button"
						accessible
						className="absolute"
						style={at(field.input)}
					/>
					<View
						accessibilityHint={COPY.opensReflect}
						accessibilityLabel={COPY.card.speak}
						accessibilityRole="button"
						accessible
						className="absolute"
						style={at(field.mic)}
					/>
				</>
			) : null}
		</View>
	);
}

function at(f: Frame) {
	return { height: f.height, left: f.x, top: f.y, width: f.width };
}

export function sameFrame(a: Frame | null, b: Frame): boolean {
	return (
		a !== null &&
		a.x === b.x &&
		a.y === b.y &&
		a.width === b.width &&
		a.height === b.height
	);
}
