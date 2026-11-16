import { v } from "convex/values";
import { query } from "./_generated/server";
import { trackItemValidator } from "./browse/catalogue";
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

/**
 * Browse moved to `convex/browse/`: the hub's shelf and hero in
 * `browse/hub.ts`, a family's list in `browse/family.ts`, the topic reads in
 * `browse/topics.ts`, and the shared catalogue helpers in `browse/catalogue.ts`.
 * Only these public wrappers stay, for app builds that call the old paths.
 * `getTopicTitle` has no new path: `browse/topics.getTopicHeader` replaces it.
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
 * @deprecated Call `browse/topics:getTopicHeader`, which is `null` for an
 * unpublished topic where this always returns a title. Not registered under
 * `browse/`: the topic screen still calls this path until S8.
 */
// DEPRECATED(remove-after: app >= first version whose topic screen reads browse/topics.getTopicHeader, S8): replaced by getTopicHeader; core in browse/topics.ts.
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
