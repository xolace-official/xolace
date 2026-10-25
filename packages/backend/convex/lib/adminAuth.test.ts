// @vitest-environment edge-runtime
/**
 * The admin guard (plan §3a / §5.3 security suite): `adminQuery`,
 * `adminMutation` and `adminAction` reject anonymous callers and signed-in
 * non-admins, and let `role: "admin"` through. Exercised via the test-only
 * probes in `adminAuth.probes.ts`.
 */
import { makeFunctionReference } from "convex/server";
import { describe, expect, test } from "vitest";

import {
	asAdmin,
	asUnauthed,
	asUser,
	makeIdentity,
} from "../test/harness.helpers";

const PROBE = "lib/adminAuth.probes";
const signedInSubject = makeFunctionReference<"query", Record<string, never>>(
	`${PROBE}:signedInSubject`
);
const adminSubjectQuery = makeFunctionReference<"query", Record<string, never>>(
	`${PROBE}:adminSubjectQuery`
);
const adminSubjectMutation = makeFunctionReference<
	"mutation",
	Record<string, never>
>(`${PROBE}:adminSubjectMutation`);
const adminSubjectAction = makeFunctionReference<
	"action",
	Record<string, never>
>(`${PROBE}:adminSubjectAction`);

const NOT_AUTHENTICATED = /not_authenticated|Not authenticated/;
const FORBIDDEN = /forbidden|Admin role required/;

describe("requireUserIdentity", () => {
	test("rejects anonymous callers", async () => {
		await expect(asUnauthed().query(signedInSubject, {})).rejects.toThrow(
			NOT_AUTHENTICATED
		);
	});

	test("returns the signed-in identity", async () => {
		await expect(asUser(3).query(signedInSubject, {})).resolves.toBe(
			makeIdentity(3).subject
		);
	});
});

describe("admin builders", () => {
	test("reject anonymous callers", async () => {
		const t = asUnauthed();
		await expect(t.query(adminSubjectQuery, {})).rejects.toThrow(
			NOT_AUTHENTICATED
		);
		await expect(t.mutation(adminSubjectMutation, {})).rejects.toThrow(
			NOT_AUTHENTICATED
		);
		await expect(t.action(adminSubjectAction, {})).rejects.toThrow(
			NOT_AUTHENTICATED
		);
	});

	test("reject signed-in users without the admin role", async () => {
		const t = asUser();
		await expect(t.query(adminSubjectQuery, {})).rejects.toThrow(FORBIDDEN);
		await expect(t.mutation(adminSubjectMutation, {})).rejects.toThrow(
			FORBIDDEN
		);
		await expect(t.action(adminSubjectAction, {})).rejects.toThrow(FORBIDDEN);
	});

	test("reject a role claim that is not exactly admin", async () => {
		const t = asUnauthed().withIdentity({
			...makeIdentity(),
			role: "Admin",
		});
		await expect(t.query(adminSubjectQuery, {})).rejects.toThrow(FORBIDDEN);
	});

	test("allow admins and expose ctx.identity", async () => {
		const t = asAdmin(7);
		const { subject } = makeIdentity(7);
		await expect(t.query(adminSubjectQuery, {})).resolves.toBe(subject);
		await expect(t.mutation(adminSubjectMutation, {})).resolves.toBe(subject);
		await expect(t.action(adminSubjectAction, {})).resolves.toBe(subject);
	});
});
