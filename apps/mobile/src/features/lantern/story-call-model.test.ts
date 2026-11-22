import { describe, expect, it } from "vitest";
import { COPY } from "@/features/lantern/copy";
import {
	mailtoOf,
	openOrCopy,
	STORY_MAIL,
} from "@/features/lantern/story-call-model";

const io = (open: boolean, copy = true) => {
	const log = {
		copied: [] as string[],
		opened: [] as string[],
		said: [] as [string, string | undefined][],
	};
	return {
		copy: (text: string) => {
			log.copied.push(text);
			return copy ? Promise.resolve() : Promise.reject(new Error("no clip"));
		},
		log,
		openURL: (url: string) => {
			log.opened.push(url);
			return open ? Promise.resolve() : Promise.reject(new Error("no mail"));
		},
		say: (message: string, description?: string) => {
			log.said.push([message, description]);
		},
	};
};

describe("mailtoOf", () => {
	it("encodes the subject and body, spaces as %20 and lines as %0A", () => {
		expect(
			mailtoOf({
				body: "Hi there,\nit’s me & you?",
				subject: "A b",
				to: "x@y.z",
			})
		).toBe(
			"mailto:x@y.z?subject=A%20b&body=Hi%20there%2C%0Ait%E2%80%99s%20me%20%26%20you%3F"
		);
	});

	it("writes to Lantern's inbox with the agreed subject", () => {
		const url = mailtoOf(STORY_MAIL);
		expect(url.startsWith("mailto:lantern@xolaceinc.com?subject=")).toBe(true);
		const params = new URLSearchParams(url.slice(url.indexOf("?") + 1));
		expect(params.get("subject")).toBe("My story for Lantern");
		expect(params.get("body")).toBe(COPY.storyCall.mail.body);
		expect(url).not.toContain("+");
	});

	it("points someone having a heavy time to Help", () => {
		expect(STORY_MAIL.body).toContain("Help screen");
		expect(STORY_MAIL.body).toContain("anonymous");
	});
});

describe("openOrCopy", () => {
	it("opens the composer straight away and says nothing", async () => {
		const fake = io(true);
		await expect(openOrCopy(STORY_MAIL, fake)).resolves.toBe("opened");
		expect(fake.log.opened).toEqual([mailtoOf(STORY_MAIL)]);
		expect(fake.log.copied).toEqual([]);
		expect(fake.log.said).toEqual([]);
	});

	it("copies the address and says so when there's no mail app", async () => {
		const fake = io(false);
		await expect(openOrCopy(STORY_MAIL, fake)).resolves.toBe("copied");
		expect(fake.log.copied).toEqual(["lantern@xolaceinc.com"]);
		expect(fake.log.said).toEqual([
			[COPY.storyCall.copied, "lantern@xolaceinc.com"],
		]);
	});

	it("shows the address when the clipboard fails too", async () => {
		const fake = io(false, false);
		await expect(openOrCopy(STORY_MAIL, fake)).resolves.toBe("shown");
		expect(fake.log.said).toEqual([
			[COPY.storyCall.noMail("lantern@xolaceinc.com"), undefined],
		]);
	});
});
