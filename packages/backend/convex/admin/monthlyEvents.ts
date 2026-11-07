import { ConvexError, type Infer, v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { adminMutation, adminQuery } from "../lib/adminAuth";
import { ADMIN_LIST_LIMIT, assertSlug, notFound } from "./edits";

/**
 * Awareness events (the `monthlyEvents` sheet in the app) for the admin. The
 * image is uploaded straight from the browser to Convex file storage; the
 * admin resizes it to the sheet's 686×360 first, so here we only check that
 * what landed is a small image.
 */

/** Routes the app's event sheet will open (`CTA_ROUTE_ALLOWLIST` in mobile). */
const CTA_ROUTES = ["/(protected)/crisis-resources"] as const;

const MAX_IMAGE_BYTES = 500 * 1024;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const eventFields = {
	body: v.string(),
	ctaLabel: v.optional(v.string()),
	ctaRoute: v.optional(v.string()),
	endDate: v.string(),
	linkUrl: v.optional(v.string()),
	priority: v.number(),
	sessionPrompt: v.optional(v.string()),
	startDate: v.string(),
	title: v.string(),
};

const eventRow = v.object({
	...eventFields,
	editedBy: v.optional(v.string()),
	hasUpload: v.boolean(),
	imageUrl: v.optional(v.string()),
	slug: v.string(),
	updatedAt: v.number(),
});

const eventFieldsObject = v.object(eventFields);
type EventFields = Infer<typeof eventFieldsObject>;

function isIsoDate(value: string) {
	return ISO_DATE.test(value) && !Number.isNaN(Date.parse(value));
}

/** The rules the editor shows, re-checked: the UI's view can be stale. */
function assertEventFields(fields: EventFields) {
	if (fields.title.trim() === "" || fields.body.trim() === "") {
		throw new ConvexError("An event needs a title and a body");
	}
	if (!(isIsoDate(fields.startDate) && isIsoDate(fields.endDate))) {
		throw new ConvexError("Dates must be YYYY-MM-DD");
	}
	if (fields.endDate < fields.startDate) {
		throw new ConvexError("The end date is before the start date");
	}
	if (!Number.isInteger(fields.priority) || fields.priority < 1) {
		throw new ConvexError("Priority is a whole number, 1 or more");
	}
	if (Boolean(fields.ctaLabel) !== Boolean(fields.ctaRoute)) {
		throw new ConvexError("A button needs both a label and a destination");
	}
	if (
		fields.ctaRoute &&
		!(CTA_ROUTES as readonly string[]).includes(fields.ctaRoute)
	) {
		throw new ConvexError(`The app can't open "${fields.ctaRoute}"`);
	}
	if (fields.linkUrl && !fields.linkUrl.startsWith("https://")) {
		throw new ConvexError("The article link must start with https://");
	}
}

/**
 * Empty optional strings are stored as absent, which is how the app reads
 * "none". Run before the checks, so a field of spaces counts as left blank.
 */
function clean(fields: EventFields) {
	const optional = (value: string | undefined) => value?.trim() || undefined;
	return {
		...fields,
		body: fields.body.trim(),
		ctaLabel: optional(fields.ctaLabel),
		ctaRoute: optional(fields.ctaRoute),
		linkUrl: optional(fields.linkUrl),
		sessionPrompt: optional(fields.sessionPrompt),
		title: fields.title.trim(),
	};
}

async function assertImage(ctx: QueryCtx, storageId: Id<"_storage">) {
	const file = await ctx.db.system.get("_storage", storageId);
	if (!file) {
		throw new ConvexError("The uploaded image is missing; upload it again");
	}
	// The browser sends the type with the upload; a file without one gets
	// through on size alone.
	if (file.contentType && !file.contentType.startsWith("image/")) {
		throw new ConvexError("The upload isn't an image");
	}
	if (file.size > MAX_IMAGE_BYTES) {
		throw new ConvexError("The image is over 500 KB");
	}
}

async function eventBySlug(ctx: QueryCtx, slug: string) {
	const event = await ctx.db
		.query("monthlyEvents")
		.withIndex("by_slug", (q) => q.eq("slug", slug))
		.unique();
	if (!event) {
		throw notFound("event", slug);
	}
	return event;
}

async function dropImage(ctx: MutationCtx, event: Doc<"monthlyEvents">) {
	if (event.imageStorageId) {
		await ctx.storage.delete(event.imageStorageId);
	}
}

async function toRow(
	ctx: QueryCtx,
	event: Doc<"monthlyEvents">
): Promise<Infer<typeof eventRow>> {
	const uploaded = event.imageStorageId
		? await ctx.storage.getUrl(event.imageStorageId)
		: null;
	return {
		body: event.body,
		ctaLabel: event.ctaLabel,
		ctaRoute: event.ctaRoute,
		editedBy: event.editedBy,
		endDate: event.endDate,
		hasUpload: Boolean(event.imageStorageId),
		imageUrl: uploaded ?? event.imageUrl,
		linkUrl: event.linkUrl,
		priority: event.priority,
		sessionPrompt: event.sessionPrompt,
		slug: event.slug,
		startDate: event.startDate,
		title: event.title,
		updatedAt: event.updatedAt ?? event._creationTime,
	};
}

/** Every event, newest start date first. */
export const list = adminQuery({
	args: {},
	handler: async (ctx) => {
		const events = await ctx.db.query("monthlyEvents").take(ADMIN_LIST_LIMIT);
		const rows = await Promise.all(events.map((e) => toRow(ctx, e)));
		return rows.sort((a, b) => b.startDate.localeCompare(a.startDate));
	},
	returns: v.array(eventRow),
});

/** A one-use URL the browser POSTs the processed image to. */
export const generateImageUploadUrl = adminMutation({
	args: {},
	handler: async (ctx) => await ctx.storage.generateUploadUrl(),
	returns: v.string(),
});

export const create = adminMutation({
	args: {
		...eventFields,
		imageStorageId: v.optional(v.id("_storage")),
		slug: v.string(),
	},
	handler: async (ctx, { imageStorageId, slug, ...fields }) => {
		assertSlug(slug);
		const cleaned = clean(fields);
		assertEventFields(cleaned);
		const taken = await ctx.db
			.query("monthlyEvents")
			.withIndex("by_slug", (q) => q.eq("slug", slug))
			.unique();
		if (taken) {
			throw new ConvexError(`event "${slug}" already exists`);
		}
		if (imageStorageId) {
			await assertImage(ctx, imageStorageId);
		}
		await ctx.db.insert("monthlyEvents", {
			...cleaned,
			editedBy: ctx.identity.subject,
			imageStorageId,
			slug,
			updatedAt: Date.now(),
		});
		return null;
	},
	returns: v.null(),
});

/** Save the copy, dates and button. The slug never changes: the app tracks "seen" by it. */
export const save = adminMutation({
	args: { ...eventFields, slug: v.string() },
	handler: async (ctx, { slug, ...fields }) => {
		const cleaned = clean(fields);
		assertEventFields(cleaned);
		const event = await eventBySlug(ctx, slug);
		await ctx.db.patch("monthlyEvents", event._id, {
			...cleaned,
			editedBy: ctx.identity.subject,
			updatedAt: Date.now(),
		});
		return null;
	},
	returns: v.null(),
});

/** Point the event at a new upload and delete the one it replaces. */
export const setImage = adminMutation({
	args: { imageStorageId: v.id("_storage"), slug: v.string() },
	handler: async (ctx, { imageStorageId, slug }) => {
		await assertImage(ctx, imageStorageId);
		const event = await eventBySlug(ctx, slug);
		if (event.imageStorageId !== imageStorageId) {
			await dropImage(ctx, event);
		}
		await ctx.db.patch("monthlyEvents", event._id, {
			editedBy: ctx.identity.subject,
			imageStorageId,
			updatedAt: Date.now(),
		});
		return null;
	},
	returns: v.null(),
});

/** Remove the image (upload and any old URL); the sheet then shows text only. */
export const removeImage = adminMutation({
	args: { slug: v.string() },
	handler: async (ctx, { slug }) => {
		const event = await eventBySlug(ctx, slug);
		await dropImage(ctx, event);
		await ctx.db.patch("monthlyEvents", event._id, {
			editedBy: ctx.identity.subject,
			imageStorageId: undefined,
			imageUrl: undefined,
			updatedAt: Date.now(),
		});
		return null;
	},
	returns: v.null(),
});

export const remove = adminMutation({
	args: { slug: v.string() },
	handler: async (ctx, { slug }) => {
		const event = await eventBySlug(ctx, slug);
		await dropImage(ctx, event);
		await ctx.db.delete("monthlyEvents", event._id);
		return null;
	},
	returns: v.null(),
});
