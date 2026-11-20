import { describe, expect, it } from "vitest";
import { FIXTURE_AVATARS } from "@/features/you/avatar/dev/avatars";
import {
	type AvatarOption,
	avatarTap,
	isLocked,
} from "@/features/you/avatar-model";

function ofTier(tier: AvatarOption["tier"]): AvatarOption {
	const avatar = FIXTURE_AVATARS.find((a) => a.tier === tier);
	if (!avatar) {
		throw new Error(`the fixtures need a ${tier} avatar`);
	}
	return avatar;
}

const free = ofTier("free");
const premium = ofTier("premium");

describe("avatarTap", () => {
	it("picks a free avatar whatever the account", () => {
		expect(avatarTap(free, "free")).toBe("pick");
		expect(avatarTap(free, "loading")).toBe("pick");
	});

	it("locks a Plus avatar on a free account and picks it on Xolace+", () => {
		expect(avatarTap(premium, "free")).toBe("locked");
		expect(isLocked(premium, "free")).toBe(true);
		expect(avatarTap(premium, "plus")).toBe("pick");
	});

	it("while Xolace+ loads: no lock, and a Plus avatar waits", () => {
		expect(isLocked(premium, "loading")).toBe(false);
		expect(avatarTap(premium, "loading")).toBe("wait");
	});
});
