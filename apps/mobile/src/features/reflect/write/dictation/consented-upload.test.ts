import { describe, expect, it, vi } from "vitest";
import { uploadWithConsent } from "./consented-upload";

const steps = (consent: () => Promise<void>) => {
	const calls: string[] = [];
	return {
		calls,
		steps: {
			consent: async () => {
				await consent();
				calls.push("consent");
			},
			readBytes: vi.fn(async () => {
				calls.push("read");
				return new Uint8Array([1, 2, 3]);
			}),
			send: vi.fn(async () => {
				calls.push("send");
				return "words";
			}),
		},
	};
};

describe("uploadWithConsent", () => {
	it("records voice_processing consent before any audio is read or sent", async () => {
		const { calls, steps: s } = steps(async () => undefined);
		await expect(uploadWithConsent("file://take.m4a", s)).resolves.toBe(
			"words"
		);
		expect(calls).toEqual(["consent", "read", "send"]);
	});

	it("sends nothing when consent can't be recorded", async () => {
		const { steps: s } = steps(async () => {
			throw new Error("offline");
		});
		await expect(uploadWithConsent("file://take.m4a", s)).rejects.toThrow(
			"offline"
		);
		expect(s.readBytes).not.toHaveBeenCalled();
		expect(s.send).not.toHaveBeenCalled();
	});

	it("sends exactly the recorded bytes", async () => {
		const { steps: s } = steps(async () => undefined);
		await uploadWithConsent("file://take.m4a", s);
		const [sent] = s.send.mock.calls[0] as unknown as [ArrayBuffer];
		expect([...new Uint8Array(sent)]).toEqual([1, 2, 3]);
	});
});
