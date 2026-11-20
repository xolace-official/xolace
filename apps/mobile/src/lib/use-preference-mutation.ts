import { api } from "@xolace/backend/convex/_generated/api";
import type { Doc } from "@xolace/backend/dataModel";
import { useMutation } from "convex/react";

type NotificationPrefs = Doc<"preferences">["notifications"];
type DailyQuote = NonNullable<NotificationPrefs["dailyQuote"]>;

function dailyQuotePatch(
	choice: Pick<DailyQuote, "enabled" | "slot">
): Partial<NotificationPrefs> {
	return { dailyQuote: { enabled: choice.enabled, slot: choice.slot } };
}

export const usePreferenceMutation = () =>
	useMutation(api.preferences.update).withOptimisticUpdate(
		(localStore, args) => {
			const current = localStore.getQuery(api.preferences.get, {});
			if (current === undefined) {
				return;
			}

			const hasNotificationsChange =
				args.notifications !== undefined ||
				args.notificationDailyQuote !== undefined ||
				args.notificationReach !== undefined ||
				args.notificationQuietWindow !== undefined ||
				args.notificationTimezone !== undefined;

			const mergedNotifications = hasNotificationsChange
				? {
						...current.notifications,
						...args.notifications,
						...(args.notificationReach !== undefined && {
							reach: args.notificationReach,
						}),
						...(args.notificationQuietWindow !== undefined && {
							quietWindow: args.notificationQuietWindow ?? undefined,
						}),
						...(args.notificationTimezone !== undefined && {
							timezone: args.notificationTimezone,
						}),
						...(args.notificationDailyQuote !== undefined &&
							dailyQuotePatch(args.notificationDailyQuote)),
					}
				: undefined;

			const motionPatch =
				args.motionPreference === undefined
					? args.reducedMotion === undefined
						? undefined
						: {
								motionPreference: args.reducedMotion
									? ("reduced" as const)
									: ("system" as const),
								reducedMotion: args.reducedMotion,
							}
					: {
							motionPreference: args.motionPreference,
							reducedMotion: args.motionPreference === "reduced",
						};

			localStore.setQuery(
				api.preferences.get,
				{},
				{
					...current,
					...(args.theme !== undefined && { theme: args.theme }),
					...(motionPatch !== undefined && motionPatch),
					...(args.mirrorTone !== undefined && { mirrorTone: args.mirrorTone }),
					...(args.contributeByDefault !== undefined && {
						contributeByDefault: args.contributeByDefault,
					}),
					...(args.dataRetentionPreference !== undefined && {
						dataRetentionPreference: args.dataRetentionPreference,
					}),
					...(args.preferredInputType !== undefined && {
						preferredInputType: args.preferredInputType,
					}),
					...(args.colorTheme !== undefined && { colorTheme: args.colorTheme }),
					...(args.spaceName !== undefined && {
						spaceName: args.spaceName ?? undefined,
					}),
					...(args.voice !== undefined && { voice: args.voice ?? undefined }),
					...(args.talkVoice !== undefined && {
						talkVoice: args.talkVoice ?? undefined,
					}),
					...(args.talkPace !== undefined && { talkPace: args.talkPace }),
					...(args.talkLook !== undefined && { talkLook: args.talkLook }),
					...(args.talkView !== undefined && { talkView: args.talkView }),
					...(args.talkDirectness !== undefined && {
						talkDirectness: args.talkDirectness ?? undefined,
					}),
					...(args.spaceNamePromptDismissed !== undefined && {
						spaceNamePromptDismissed: args.spaceNamePromptDismissed,
					}),
					...((args.registerComplaint ||
						(args.mirrorTone !== undefined &&
							args.mirrorTone !== current.mirrorTone)) && {
						registerComplaint: true,
					}),
					...(mergedNotifications !== undefined && {
						notifications: mergedNotifications,
					}),
				}
			);
		}
	);
