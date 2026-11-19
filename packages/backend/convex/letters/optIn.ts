/**
 * Receiving letters (#748): off until someone says Yes. The answer lives on
 * their letters row (what matching reads) and appends a consent record,
 * because the offer says how recipients are chosen, which makes Yes consent
 * to that use (invariant 6).
 */
import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireAdult } from "../age/gate";
import { requireAuth } from "../lib/auth";
import { posthog } from "../posthog";
import { ensureLetterProfile } from "./profiles";
import { optInValidator } from "./validators";

/** `"en-GB"` → `"en"`; anything unreadable → undefined. */
function languageOfLocale(locale: string | undefined): string | undefined {
	const code = locale?.trim().toLowerCase().split(/[-_]/)[0];
	return code && /^[a-z]{2,3}$/.test(code) ? code : undefined;
}

/**
 * Answer the offer. Yes needs an adult (`age_required` / `age_restricted`);
 * No needs nothing. Saying No after Yes takes the caller out of matching at
 * once and clears what was copied from their sessions; letters already
 * received stay. Repeating the current answer changes nothing. A consent
 * record is written for Yes, and for a No only when it withdraws a Yes: a
 * first No consents to nothing, so there's nothing to revoke.
 */
export const set = mutation({
	args: {
		choice: optInValidator,
		// The device locale, sent with Yes: the language letters are matched
		// in until sessions say otherwise.
		locale: v.optional(v.string()),
		// The offer's wording version, recorded on the consent row.
		promptVersion: v.string(),
	},
	handler: async (ctx, args) => {
		const { profile, user } = await requireAuth(ctx);
		if (args.choice === "yes") {
			await requireAdult(ctx, { profile, user }, "ask");
		}
		const row = await ensureLetterProfile(ctx, profile._id);
		if (row.optIn === args.choice) {
			return null;
		}
		const now = Date.now();
		const language = languageOfLocale(args.locale);
		const withdrawsYes = row.optIn === "yes";

		if (args.choice === "yes") {
			await ctx.db.patch("letter_profiles", row._id, {
				optIn: "yes",
				optInAt: now,
				...(args.locale !== undefined && { locale: args.locale }),
				// Sessions' language (slice 6) wins once written.
				...(row.language === undefined && language && { language }),
			});
		} else {
			await ctx.db.patch("letter_profiles", row._id, {
				aim: undefined,
				band: undefined,
				metadataAt: undefined,
				optIn: "no",
				optInAt: now,
				pool: "out",
				poolCheckAt: undefined,
			});
		}

		if (args.choice === "yes" || withdrawsYes) {
			await ctx.db.insert("consent_records", {
				consentLanguageVersion: args.promptVersion,
				consentType: "letters_receive",
				createdAt: now,
				emotionalProfileId: profile._id,
				status: args.choice === "yes" ? "granted" : "revoked",
				...(args.choice === "yes" ? { grantedAt: now } : { revokedAt: now }),
			});
		}
		try {
			await posthog.capture(ctx, {
				distinctId: profile._id,
				event: "letters_opt_in",
				properties: { choice: args.choice },
			});
		} catch (error) {
			console.error("letters_opt_in capture failed", error);
		}
		return null;
	},
	returns: v.null(),
});
