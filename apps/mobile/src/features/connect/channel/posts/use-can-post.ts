import { useOwnCapabilitiesContext } from "stream-chat-expo";

/** Only the broadcaster's membership carries `send-message` (`DESIRED_XOLACE_BROADCAST`); every
 * other camper gets the lock note instead of a composer. */
export function useCanPost(): boolean {
	return useOwnCapabilitiesContext().sendMessage === true;
}
