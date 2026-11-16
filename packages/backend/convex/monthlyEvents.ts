import { v } from "convex/values";
import { query } from "./_generated/server";
import {
	appEventValidator,
	getActiveArgs,
	getActiveCore,
} from "./monthlyEvents/events";

/**
 * Monthly events moved to `convex/monthlyEvents/` (B2): the events in
 * `monthlyEvents/events.ts`, a user's choice on the prompt in
 * `monthlyEvents/prompt.ts`. Only this public wrapper stays, for app builds
 * that call the old path.
 */

/**
 * @deprecated Call `monthlyEvents/events:getActive`.
 */
// DEPRECATED(remove-after: app >= first version without the v1 awareness sheet): moved to monthlyEvents/events.getActive (B2).
export const getActive = query({
	args: getActiveArgs,
	handler: getActiveCore,
	returns: v.array(appEventValidator),
});
