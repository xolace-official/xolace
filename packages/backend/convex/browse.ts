import { v } from "convex/values";
import { query } from "./_generated/server";
import {
	listByFamilyArgs,
	listByFamilyCore,
	trackPageValidator,
} from "./browse/family";
import {
	getFeaturedCore,
	getNewShelfArgs,
	getNewShelfCore,
	shelfItemValidator,
} from "./browse/hub";
import {
	getTopicCore,
	getTopicsCore,
	getTopicTitleCore,
	topicSlugArgs,
	topicTileValidator,
} from "./browse/topics";
import { trackItemValidator } from "./browse/tracks";

/**
 * Browse moved to `convex/browse/`: the hub's shelf and hero in
 * `browse/hub.ts`, a family's list in `browse/family.ts`, the topic reads in
 * `browse/topics.ts`, and the shared catalogue helpers in `browse/tracks.ts`.
 * Only these public wrappers stay, for app builds that call the old paths.
 */

/**
 * @deprecated Call `browse/hub:getNewShelf`.
 */
// DEPRECATED(remove-after: app >= 1.17.0): moved to browse/hub.getNewShelf.
export const getNewShelf = query({
	args: getNewShelfArgs,
	handler: getNewShelfCore,
	returns: v.array(shelfItemValidator),
});

/**
 * @deprecated Call `browse/hub:getFeatured`.
 */
// DEPRECATED(remove-after: app >= 1.17.0): moved to browse/hub.getFeatured.
export const getFeatured = query({
	args: {},
	handler: getFeaturedCore,
	returns: v.union(shelfItemValidator, v.null()),
});

/**
 * @deprecated Call `browse/family:listByFamily`.
 */
// DEPRECATED(remove-after: app >= 1.17.0): moved to browse/family.listByFamily.
export const listByFamily = query({
	args: listByFamilyArgs,
	handler: listByFamilyCore,
	returns: trackPageValidator,
});

/**
 * @deprecated Call `browse/topics:getTopics`.
 */
// DEPRECATED(remove-after: app >= 1.17.0): moved to browse/topics.getTopics.
export const getTopics = query({
	args: {},
	handler: getTopicsCore,
	returns: v.array(topicTileValidator),
});

/**
 * @deprecated Call `browse/topics:getTopicTitle`.
 */
// DEPRECATED(remove-after: app >= 1.17.0): moved to browse/topics.getTopicTitle.
export const getTopicTitle = query({
	args: topicSlugArgs,
	handler: getTopicTitleCore,
	returns: v.string(),
});

/**
 * @deprecated Call `browse/topics:getTopic`.
 */
// DEPRECATED(remove-after: app >= 1.17.0): moved to browse/topics.getTopic.
export const getTopic = query({
	args: topicSlugArgs,
	handler: getTopicCore,
	returns: v.array(trackItemValidator),
});
