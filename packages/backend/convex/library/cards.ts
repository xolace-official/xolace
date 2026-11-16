import { v } from "convex/values";
import schema from "../schema";

/**
 * The entry list shapes every Lantern list returns. Kept out of `entries.ts`
 * so `reads.ts`, which `entries.ts` imports, can use them at load time.
 */

const { kind: kindValidator } = schema.tables.library_entries.validator.fields;

export const listItemValidator = v.object({
	_id: v.id("library_entries"),
	coverThumbhash: v.optional(v.string()), // base64 ThumbHash placeholder (#507)
	coverThumbUrl: v.optional(v.string()), // 512px cover, when ingest resized it (#506)
	coverUrl: v.optional(v.string()),
	dek: v.string(),
	kind: kindValidator,
	newUntil: v.optional(v.number()),
	primarySubject: v.string(),
	readMin: v.number(),
	slug: v.string(),
	title: v.string(),
});

/**
 * A list item as the entry cards draw it: plus views and this reader's saved
 * state (#410), and their read mark. `finished` and `position` are optional
 * only so the validator reads as additive; `cardSignals` always sets
 * `finished`, and `position` whenever the reader has one.
 */
export const cardItemValidator = v.object({
	...listItemValidator.fields,
	finished: v.optional(v.boolean()),
	listenMin: v.optional(v.number()),
	position: v.optional(v.number()), // 0–1 of the body, as getReaderState's
	saved: v.boolean(),
	views: v.number(),
});
