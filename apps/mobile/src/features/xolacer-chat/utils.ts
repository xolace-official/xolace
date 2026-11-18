/** Bubble identity, or null to keep the SDK's shared record (which can leak a seeker's xolacer
 * name); positive match only, so nothing else is impersonated. */
export function resolveMessageIdentity(
	senderId: string | undefined,
	conversation: {
		counterpartProfileId: string;
		counterpartName: string;
		counterpartPhotoUrl?: string;
	}
): { name: string; image?: string } | null {
	if (senderId !== conversation.counterpartProfileId) {
		return null;
	}
	return {
		image: conversation.counterpartPhotoUrl,
		name: conversation.counterpartName,
	};
}
