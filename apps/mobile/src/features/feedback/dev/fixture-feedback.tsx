import { useState } from "react";
import { View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { FeedbackProvider, type FeedbackState } from "../feedback-data";
import type { FeedbackKind, FeedbackStep } from "../feedback-model";
import { FeedbackSheet } from "../feedback-screen";

/** The sheet sits on the bottom and rides the keyboard up, as the native one does. */
const FRAME = { flex: 1, justifyContent: "flex-end" } as const;

/** fitSheet's corner, for the frame a pushed dev state draws in place of the native sheet. */
const SHEET_RADIUS = 40;

type Fixture = Partial<Omit<FeedbackState, "step">> & { step: FeedbackStep };

/** The sheet on fixtures: the steps and the form work; Send only shows Sending.... */
function FixtureFeedback({ initial }: { initial: Fixture }) {
	const [step, setStep] = useState(initial.step);
	const [kind, setKind] = useState<FeedbackKind>(initial.kind ?? "bug");
	const [text, setText] = useState(initial.text ?? "");
	const [saving, setSaving] = useState(initial.saving ?? false);
	const state: FeedbackState = {
		canGoBack: initial.canGoBack ?? step !== "menu",
		error: initial.error ?? null,
		kind,
		limited: initial.limited ?? false,
		saving,
		step,
		subjectName: initial.subjectName ?? null,
		text,
		whatsNewUnseen: initial.whatsNewUnseen ?? true,
	};
	return (
		<FeedbackProvider
			value={{
				actions: {
					back: () => setStep("menu"),
					openReport: (k) => {
						setKind(k);
						setStep("report");
					},
					openWhatsNew: () => undefined,
					send: () => setSaving(true),
					setKind,
					setText,
				},
				state,
			}}
		>
			<View className="flex-1 bg-scrim">
				<KeyboardAvoidingView behavior="padding" style={FRAME}>
					<View
						className="bg-surface"
						style={{
							borderCurve: "continuous",
							borderTopLeftRadius: SHEET_RADIUS,
							borderTopRightRadius: SHEET_RADIUS,
						}}
					>
						<FeedbackSheet />
					</View>
				</KeyboardAvoidingView>
			</View>
		</FeedbackProvider>
	);
}

export const feedbackSheet = (initial: Fixture) => ({
	options: { headerShown: false },
	Screen: () => <FixtureFeedback initial={initial} />,
});
