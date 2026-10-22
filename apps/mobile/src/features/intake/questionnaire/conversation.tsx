import type { ImageProps } from "expo-image";
import { Button } from "heroui-native";
/**
 * An info slot as a conversation.
 *
 * The interstitials between sections carry no answer, so they get no
 * questionnaire card. The mascot says one thing at a time and you tap on; a
 * line can be *gated* on something happening in the world (the shake screen
 * waits for an actual shake) instead of on a tap.
 */
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { AppText } from "@/src/components/shared/app-text";
import { IntakeScreen } from "@/src/features/intake/questionnaire/intake-screen";
import { MascotSays } from "@/src/features/intake/questionnaire/mascot";
import { playSoftPress } from "@/src/lib/haptics";

export interface ConversationLine {
	/** Waits for `gateOpen` rather than for a tap. */
	gated?: boolean;
	text: string;
}

interface MascotConversationProps {
	doneLabel?: string;
	eyebrow: string;
	/** Shown in place of the button while a gated line waits. */
	gateHint?: string;
	/** Flips true when the gated moment has happened. */
	gateOpen?: boolean;
	lines: readonly ConversationLine[];
	/** The pose for this slot. Defaults to the talking one. */
	mascot?: ImageProps["source"];
	onDone: () => void;
	/** Opens the gate by tap — a simulator has no accelerometer to shake. */
	onGateBypass?: () => void;
}

export function MascotConversation({
	eyebrow,
	lines,
	mascot,
	gateOpen = true,
	gateHint,
	onGateBypass,
	doneLabel = "Continue",
	onDone,
}: MascotConversationProps) {
	const [tapped, setTapped] = useState(1);

	// The gate is the tap: once the world does the thing, the conversation moves
	// on by itself rather than asking for a press it already earned. Derived, not
	// an effect — the open gate is simply worth one more line.
	const opened =
		!!lines[tapped - 1]?.gated && gateOpen && tapped < lines.length;
	const shown = opened ? tapped + 1 : tapped;

	const current = lines[shown - 1];
	const last = shown >= lines.length;
	const waiting = !!current?.gated && !gateOpen;

	return (
		<IntakeScreen>
			<ScrollView
				contentContainerClassName="grow px-5 pt-3 pb-8 gap-4"
				showsVerticalScrollIndicator={false}
			>
				<AppText className="font-[Poppins-Medium] text-[11px] text-foreground/40 uppercase tracking-widest">
					{eyebrow}
				</AppText>

				<View className="flex-1 justify-end gap-3">
					{lines.slice(0, shown).map((line, index) => (
						<MascotSays continued={index > 0} key={line.text} source={mascot}>
							{line.text}
						</MascotSays>
					))}
				</View>

				{waiting ? (
					<Pressable
						className="py-4"
						disabled={!onGateBypass}
						onPress={onGateBypass}
					>
						<AppText className="text-center font-[Poppins-Regular] text-[15px] text-foreground/55">
							{gateHint}
						</AppText>
					</Pressable>
				) : (
					<Button
						onPress={() => {
							playSoftPress();
							if (last) {
								onDone();
							} else {
								setTapped(shown + 1);
							}
						}}
					>
						<Button.Label>{last ? doneLabel : "Go on"}</Button.Label>
					</Button>
				)}
			</ScrollView>
		</IntakeScreen>
	);
}
