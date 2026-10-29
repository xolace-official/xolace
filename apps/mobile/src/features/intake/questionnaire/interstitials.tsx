/** The two info slots between the three sections. Neither carries an answer. */
import { useState } from "react";
import { useShakeToOpen } from "@/features/feedback-tray/trigger/use-shake-to-open";
import { MascotConversation } from "@/features/intake/questionnaire/conversation";
import { MASCOT_SHAKE } from "@/features/intake/questionnaire/mascot";

const PRIVACY_LINES = [
	{ text: "Quick one before we go on, about the name you just picked." },
	{
		text: "That name is yours. Nothing here is tied to who you are outside this app.",
	},
	{
		text: "No one else sees your answers or name. They only change how Xolace meets you.",
	},
];

// The gate runs the same detector as the feedback tray's global shake trigger, so
// the promise on this screen cannot drift from the behaviour it describes.
const SHAKE_LINES = [
	{ gated: true, text: "Last thing. Give your phone a shake." },
	{ text: "That works anywhere in the app." },
	{
		text: "Something broken, something you hate, something you wish was here; shake, tell us and it goes straight to the people building this.",
	},
];

export function PrivacyStep({ onDone }: { onDone: () => void }) {
	return (
		<MascotConversation
			doneLabel="Got it"
			eyebrow="Why we ask"
			lines={PRIVACY_LINES}
			onDone={onDone}
		/>
	);
}

export function ShakeStep({ onDone }: { onDone: () => void }) {
	const [shaken, setShaken] = useState(false);
	// A simulator has no accelerometer, so the hint doubles as the gesture.
	const [bypassed, setBypassed] = useState(false);

	useShakeToOpen({ enabled: !shaken, onShake: () => setShaken(true) });

	return (
		<MascotConversation
			doneLabel="Continue"
			eyebrow="Shake to tell us"
			gateHint="Go on, shake it."
			gateOpen={shaken || bypassed}
			lines={SHAKE_LINES}
			mascot={MASCOT_SHAKE}
			onDone={onDone}
			onGateBypass={() => setBypassed(true)}
		/>
	);
}
