/**
 * Where the app lands: Today's tab. "/" (sign-in, intake, old links and notification
 * payloads) hands over to it at once, and going home is `dismissTo(LANDING)`.
 */
export const LANDING = "/today" as const;
