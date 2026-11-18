import { describe, expect, it } from "vitest";
import {
	canResetSpace,
	dialogCopy,
	errorText,
	NAME_MAX,
	nameError,
	signInOf,
	spaceShown,
} from "@/features/settings/account/account-model";
import {
	ACCOUNT_FREE_GOOGLE,
	ACCOUNT_PLUS,
	ACCOUNT_SPACE_ERROR,
} from "@/features/settings/account/dev/fixtures";

describe("signInOf", () => {
	it("finds Apple or Google among any of Clerk's external accounts", () => {
		expect(signInOf(["oauth_apple"])).toBe("apple");
		expect(signInOf(["oauth_google"])).toBe("google");
		expect(signInOf(["oauth_github", "oauth_google"])).toBe("google");
	});

	it("says email only when Clerk reports no provider it knows", () => {
		expect(signInOf([])).toBe("email");
		expect(signInOf([""])).toBe("email");
	});
});

describe("nameError", () => {
	it("speaks the backend validators' own words", () => {
		expect(ACCOUNT_SPACE_ERROR.dialog?.error).toBe(
			"That name belongs to someone else. Pick another?"
		);
		expect(nameError("space", "my space")).toBe("No spaces allowed");
		expect(nameError("space", "ember!")).toBe(
			"Letters, numbers, and hyphens only"
		);
		expect(nameError("space", "")).toBe("Name cannot be empty");
		expect(nameError("name", "   ")).toBe("Name cannot be empty");
		expect(nameError("name", "x".repeat(NAME_MAX.name + 1))).toBe(
			"30 characters max"
		);
		expect(nameError("space", "x".repeat(NAME_MAX.space + 1))).toBe(
			"20 characters max"
		);
	});

	it("is empty when the name can be saved", () => {
		expect(nameError("space", "Haven")).toBe("");
		expect(nameError("name", "Wren 🌿")).toBe("");
	});
});

describe("errorText", () => {
	it("pulls the message out of a Convex error", () => {
		expect(
			errorText(
				new Error(
					"[CONVEX M(profile:updateDisplayName)] Uncaught Error: 30 characters max\n  at handler"
				)
			)
		).toBe("30 characters max");
		expect(errorText(new Error("Network down"))).toBe("Network down");
		expect(errorText("nope")).toBe("Something went wrong");
	});
});

describe("the space's name", () => {
	it("shows the companion's default while unnamed", () => {
		expect(spaceShown(ACCOUNT_PLUS.space ?? null, "Ember")).toBe("Ember");
		expect(spaceShown("Haven", "Ember")).toBe("Haven");
	});

	it("offers Reset to Ember only for a name of its own", () => {
		expect(canResetSpace(null, "Ember")).toBe(false);
		expect(canResetSpace("Ember", "Ember")).toBe(false);
		expect(canResetSpace("Haven", "Ember")).toBe(true);
	});
});

describe("dialogCopy", () => {
	it("names the companion in the space's dialog", () => {
		const space = dialogCopy("space", ACCOUNT_FREE_GOOGLE.companion);
		expect(space.title).toBe("Your space");
		expect(space.field).toBe("Name");
		expect(space.reset).toBe("Reset to Ember");
		expect(space.desc).toContain("Ember until you name it.");
		const name = dialogCopy("name", "Ember");
		expect(name).toMatchObject({
			desc: "What Xolace calls you.",
			field: "Your name",
			title: "Your name",
		});
	});
});
