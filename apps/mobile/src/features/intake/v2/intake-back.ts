/** Android's back button in intake. The founder letter is the group's root, so back there
 * leaves the app as usual. Past it, intake is forward-only, as iOS's disabled swipe makes it:
 * back does nothing, so it can't drop someone back to the letter mid-answer or mid-purchase.
 * The Talk demo's modal closes itself before this is asked. */

export type IntakeRoute = "flux" | "letter";

/** `true` consumes the press. */
export const consumesBack = (route: IntakeRoute): boolean => route === "flux";
