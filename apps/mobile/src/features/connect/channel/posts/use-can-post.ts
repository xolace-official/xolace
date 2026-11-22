import { useOwnCapabilitiesContext } from "stream-chat-expo";

export function useCanPost(): boolean {
	return useOwnCapabilitiesContext().sendMessage === true;
}
