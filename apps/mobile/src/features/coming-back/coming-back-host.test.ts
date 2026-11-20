import { createElement, useEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderTree } from "@/lib/test/mount-hook";
import { ComingBackHost } from "./coming-back-host";

type Host = {
	banner: { content: string; key: string } | null;
	dismissBanner: () => void;
};

const host = vi.hoisted(() => ({
	mounts: [] as string[],
	value: null as unknown,
}));

vi.mock("./use-coming-back", () => ({
	useComingBackHost: () => host.value,
}));

vi.mock("./banner/notification-banner", () => ({
	NotificationBanner: ({ content }: { content: string }) => {
		useEffect(() => {
			host.mounts.push(content);
		}, []);
		return null;
	},
}));

const showing = (content: string, key: string): Host => ({
	banner: { content, key },
	dismissBanner: () => undefined,
});

describe("ComingBackHost", () => {
	afterEach(() => {
		host.mounts = [];
	});

	it("starts a fresh banner, with its own timer, for each tapped notification", () => {
		host.value = showing("A", "n1");
		const tree = renderTree(createElement(ComingBackHost));
		host.value = showing("B", "n2");
		tree.rerender(createElement(ComingBackHost));
		expect(host.mounts).toEqual(["A", "B"]);
		tree.unmount();
	});

	it("keeps the banner up while the same notification re-renders", () => {
		host.value = showing("A", "n1");
		const tree = renderTree(createElement(ComingBackHost));
		tree.rerender(createElement(ComingBackHost));
		expect(host.mounts).toEqual(["A"]);
		tree.unmount();
	});
});
