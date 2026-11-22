import { v } from "convex/values";
import { mutation } from "./_generated/server";
import {
	recordUserResponseCore,
	userResponseArgs,
} from "./escalation/response";

/**
 * Escalation moved to `convex/escalation/` (#778): events in
 * `escalation/events.ts`, the user's response in `escalation/response.ts`.
 * Only this public wrapper stays, for app builds that call the old path.
 */

/**
 * @deprecated Call `escalation/response:recordUserResponse`.
 */
// DEPRECATED(remove-after: app >= 1.17.0): moved to escalation/response.recordUserResponse (#778).
export const recordUserResponse = mutation({
	args: userResponseArgs,
	handler: recordUserResponseCore,
	returns: v.null(),
});
