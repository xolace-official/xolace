import type { Doc } from "../_generated/dataModel";
import { NUDGE_NOTIFICATION_SOUND } from "../lib/notificationSounds";
import { sendPushToProfile } from "../lib/pushNotifications";
import type { ChannelAdapter } from "./adapters";

type NotificationType = Doc<"notification_log">["type"];

/**
 * The old `notification_log.type` literal for an outreach (ADR 0001). Shipped
 * builds read it off the push payload and the history list.
 */
export function legacyNotificationType(
	outreach: Pick<Doc<"outreach">, "intent" | "provenance">
): NotificationType {
	if (outreach.intent === "nudge") {
		return "follow_up";
	}
	if (outreach.provenance.affirmation) {
		return "affirmation";
	}
	return outreach.intent;
}

/**
 * Push, the outreach layer's first channel. The payload is the one
 * `notifications.schedule` sent before the cutover (#764), and it writes the
 * `notification_log` row shipped builds depend on: push's compatibility
 * record (ADR 0001), one per push delivery.
 */
export const pushAdapter: Omit<ChannelAdapter, "pool"> = {
	channel: "push",
	// Expo push needs no deployment config; `sendPushToProfile` reaches every
	// registered device, or the pre-registry profile-keyed recipient.
	configured: () => true,
	deliveryMode: "push",
	send: async (ctx, _delivery, outreach) => {
		const now = Date.now();
		const type = legacyNotificationType(outreach);
		const { provenance } = outreach;

		// Inserted first so its id rides the payload: a tap marks it.
		const notificationLogId = await ctx.db.insert("notification_log", {
			content: outreach.content.body,
			createdAt: now,
			delivered: true,
			emotionalProfileId: outreach.emotionalProfileId,
			outreachId: outreach._id,
			scheduledFor: outreach.sendAt ?? outreach.createdAt,
			sentAt: now,
			triggerReason: provenance.triggerReason,
			type,
			...(provenance.reachUsed && { reachUsed: provenance.reachUsed }),
			...(provenance.patternContextUsed !== undefined && {
				patternContextUsed: provenance.patternContextUsed,
			}),
			...(provenance.generatedBy && { generatedBy: provenance.generatedBy }),
		});

		await sendPushToProfile(ctx, {
			emotionalProfileId: outreach.emotionalProfileId,
			notification: {
				body: outreach.content.body,
				channelId: NUDGE_NOTIFICATION_SOUND.channelId,
				data: { logId: notificationLogId, type },
				// iOS reads the sound off the payload; Android ignores it and takes the
				// sound from the channel. Sending both covers the two platforms in one
				// call. Deliberately not the `default` channel — that one exists
				// without a sound on every device already running the app, and a
				// channel's sound can never be changed after creation.
				sound: NUDGE_NOTIFICATION_SOUND.sound,
				title: outreach.content.title ?? "Xolace",
			},
		});

		return { notificationLogId };
	},
};
