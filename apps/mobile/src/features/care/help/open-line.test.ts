import { describe, expect, it } from "vitest";
import { COPY } from "@/features/care/help/copy";
import { openOrSay } from "@/features/care/help/open-line";

const opener = (ok: boolean) => {
	const opened: string[] = [];
	return {
		opened,
		openURL: (url: string) => {
			opened.push(url);
			return ok ? Promise.resolve() : Promise.reject(new Error("no activity"));
		},
	};
};

describe("openOrSay", () => {
	it("opens the line straight away, with no capability check first", async () => {
		const io = opener(true);
		const said: string[] = [];
		await expect(
			openOrSay("tel:112", "call", { ...io, say: (m) => said.push(m) })
		).resolves.toBe(true);
		expect(io.opened).toEqual(["tel:112"]);
		expect(said).toEqual([]);
	});

	it("says what to do when nothing can take it (Android's ActivityNotFoundException)", async () => {
		const said: string[] = [];
		await expect(
			openOrSay("tel:112", "call", {
				...opener(false),
				say: (m) => said.push(m),
			})
		).resolves.toBe(false);
		expect(said).toEqual([COPY.toast.noDialer]);
	});
});
