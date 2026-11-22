// @vitest-environment edge-runtime
/**
 * #918: the welcome's logo, served by the deployment itself. What can go
 * wrong: the route is missing (every welcome shows a broken image), or it
 * serves something that isn't a PNG.
 */
import { describe, expect, it } from "vitest";
import { asUnauthed } from "../../test/harness.helpers";

/** Every PNG starts with these eight bytes. */
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

describe("email logo", () => {
	it("is a cacheable PNG at /email/logo.png, for anyone", async () => {
		const response = await asUnauthed().fetch("/email/logo.png", {
			method: "GET",
		});

		expect(response.status).toBe(200);
		expect(response.headers.get("Content-Type")).toBe("image/png");
		expect(response.headers.get("Cache-Control")).toMatch(/^public/);
		const bytes = new Uint8Array(await response.arrayBuffer());
		expect([...bytes.slice(0, PNG_SIGNATURE.length)]).toEqual(PNG_SIGNATURE);
	});
});
