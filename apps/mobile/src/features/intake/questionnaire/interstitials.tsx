/**
 * The two info slots between the three sections. Neither carries an answer, so
 * neither gets a questionnaire card — the mascot says one thing at a time and
 * you tap on.
 */
import { useState } from 'react';

import { MascotConversation } from '@/src/features/intake/questionnaire/conversation';
import { MASCOT_SHAKE } from '@/src/features/intake/questionnaire/mascot';
import { useShakeToOpen } from '@/src/features/feedback-tray/trigger/use-shake-to-open';

const PRIVACY_LINES = [
  { text: 'Quick one before we go on, about the name you just picked.' },
  { text: 'That name is yours. Nothing here is tied to who you are outside this app.' },
  {
    text: 'No one else sees your answers or name. They only change how Xolace meets you.',
  },
];

/**
 * Shake-to-tell-us, learned by doing it: the screen asks for a shake and
 * nothing else is on it, so the thing you're told about is a thing you already
 * did.
 *
 * The gate runs the *same* detector as the feedback tray's global shake trigger,
 * so a shake that opens the gate is by definition a shake that opens the tray —
 * the promise on this screen can't drift from the behaviour it describes.
 */
const SHAKE_LINES = [
  { text: 'Last thing. Give your phone a shake.', gated: true },
  { text: 'That works anywhere in the app.' },
  {
    text: 'Something broken, something you hate, something you wish was here; shake, tell us and it goes straight to the people building this.',
  },
];

export function PrivacyStep({ onDone }: { onDone: () => void }) {
  return (
    <MascotConversation
      eyebrow="Why we ask"
      lines={PRIVACY_LINES}
      doneLabel="Got it"
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
      eyebrow="Shake to tell us"
      lines={SHAKE_LINES}
      mascot={MASCOT_SHAKE}
      gateOpen={shaken || bypassed}
      gateHint="Go on, shake it."
      onGateBypass={() => setBypassed(true)}
      doneLabel="Continue"
      onDone={onDone}
    />
  );
}
