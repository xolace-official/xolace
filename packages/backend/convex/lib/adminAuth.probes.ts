/**
 * Test-only functions that exercise the guards in `adminAuth.ts` through real
 * registered functions. The double-dot name keeps this file out of every Convex
 * deploy and out of `_generated/api`, so tests reach these with
 * `makeFunctionReference("lib/adminAuth.probes:<name>")`.
 *
 * It lives next to `adminAuth.ts` rather than in `convex/test/` because the
 * harness's `import.meta.glob("../**\/*.ts")` keys files in its own directory
 * as `./x.ts`, which convex-test cannot resolve as a module path.
 */
import { v } from "convex/values";

import { query } from "../_generated/server";
import {
	adminAction,
	adminMutation,
	adminQuery,
	requireUserIdentity,
} from "./adminAuth";

export const signedInSubject = query({
	args: {},
	handler: async (ctx) => (await requireUserIdentity(ctx)).subject,
	returns: v.string(),
});

export const adminSubjectQuery = adminQuery({
	args: {},
	handler: (ctx) => ctx.identity.subject,
	returns: v.string(),
});

export const adminSubjectMutation = adminMutation({
	args: {},
	handler: (ctx) => ctx.identity.subject,
	returns: v.string(),
});

export const adminSubjectAction = adminAction({
	args: {},
	handler: (ctx) => ctx.identity.subject,
	returns: v.string(),
});
