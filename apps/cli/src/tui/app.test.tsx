import { describe, expect, test } from "bun:test";
import { testRender } from "@opentui/react/test-utils";
import type { Id } from "@xolace/backend/dataModel";
import { ConvexReactClient } from "convex/react";
import { ConvexError } from "convex/values";
import { App, authHookFor, HomeView, toMeState } from "./app";

const ME = {
	createdAt: 0,
	displayName: "Quiet Fox",
	isXolacer: false,
	userId: "u1" as Id<"users">,
};

describe("toMeState", () => {
	test("maps useQueries results to screen states", () => {
		expect(toMeState(undefined)).toEqual({ kind: "loading" });
		expect(toMeState(ME)).toEqual({ kind: "ready", me: ME });
		expect(
			toMeState(new ConvexError({ code: "user_not_found", message: "x" }))
		).toEqual({ kind: "no-account" });
		expect(toMeState(new Error("boom"))).toEqual({
			kind: "error",
			message: "boom",
		});
	});
});

describe("HomeView", () => {
	test("shows who is signed in", async () => {
		const setup = await testRender(
			<HomeView state={{ kind: "ready", me: ME }} />,
			{ height: 12, width: 100 }
		);
		try {
			await setup.renderOnce();
			expect(setup.captureCharFrame()).toContain("Signed in as Quiet Fox");
		} finally {
			setup.renderer.destroy();
		}
	});
});

describe("App", () => {
	// Mounts the real provider tree: useConvexAuth throws unless the app is wrapped
	// in ConvexProviderWithAuth, which a test of HomeView alone can't catch.
	test("mounts under the auth provider and starts loading", async () => {
		// Nothing listens on port 1, so the client never gets an answer.
		const client = new ConvexReactClient("http://127.0.0.1:1", {
			skipConvexDeploymentUrlCheck: true,
		});
		const useAuth = authHookFor(() => Promise.resolve("token"));
		const setup = await testRender(<App client={client} useAuth={useAuth} />, {
			height: 12,
			width: 100,
		});
		try {
			await setup.renderOnce();
			expect(setup.captureCharFrame()).toContain("Loading your account...");
		} finally {
			setup.renderer.destroy();
			await client.close();
		}
	});
});
