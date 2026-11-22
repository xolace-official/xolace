import { describe, expect, it } from "vitest";
import type { QuoteBackground } from "../quotes-model";
import { firstLayers, type Layer, layersFor, plays, settled } from "./layers";

const loop = (key: string): QuoteBackground => ({
	ink: "light",
	key,
	kind: "loop",
	name: key,
	plus: true,
	videoUrl: `https://cdn.example/${key}.mp4`,
});
const RAIN = loop("rain");
const DUNES = loop("dunes");
const SEA = loop("sea");

const pick = (layers: readonly Layer[], b: QuoteBackground) =>
	layersFor(layers, b, true);
const ids = (layers: readonly Layer[]) => layers.map((l) => l.id);
const playing = (layers: readonly Layer[]) =>
	layers.filter((_, i) => plays(layers, i, true)).map((l) => l.background.key);

describe("quote background layers (#910 follow-up: one player across the settle)", () => {
	it("grows a pick in over what's drawn", () => {
		const after = pick(firstLayers(RAIN), DUNES);
		expect(after.map((l) => [l.background.key, l.revealed])).toEqual([
			["rain", false],
			["dunes", true],
		]);
	});

	it("settles by dropping what the reveal covered, keeping the revealed layer's key", () => {
		const revealing = pick(firstLayers(RAIN), DUNES);
		const top = revealing.at(-1);
		const after = settled(revealing, top?.id ?? -1);
		// Same key → React keeps the instance → its loop keeps its one player. Before, the
		// settle drew Dunes again as a new base layer, a second player for the same URL.
		expect(after).toEqual([top]);
		expect(after[0]).toBe(top);
	});

	it("keeps a settled layer's key through the next pick and its settle", () => {
		const dunes = settled(pick(firstLayers(RAIN), DUNES), 1);
		const revealing = pick(dunes, SEA);
		expect(ids(revealing)).toEqual([1, 2]);
		expect(revealing[0]).toBe(dunes[0]);
		expect(ids(settled(revealing, 2))).toEqual([2]);
	});

	it("plays only the top layer, so a reveal decodes one loop", () => {
		const revealing = pick(firstLayers(RAIN), DUNES);
		expect(playing(revealing)).toEqual(["dunes"]);
		expect(playing(settled(revealing, 1))).toEqual(["dunes"]);
		expect(plays(revealing, 1, false)).toBe(false);
	});

	it("a second pick mid-reveal stacks; the first reveal to land drops only what's under it", () => {
		const two = pick(pick(firstLayers(RAIN), DUNES), SEA);
		expect(ids(two)).toEqual([0, 1, 2]);
		expect(playing(two)).toEqual(["sea"]);
		const dunesLanded = settled(two, 1);
		expect(ids(dunesLanded)).toEqual([1, 2]);
		expect(ids(settled(dunesLanded, 2))).toEqual([2]);
	});

	it("reveals a pick back to the background still under the reveal", () => {
		const back = pick(pick(firstLayers(RAIN), DUNES), RAIN);
		expect(back.map((l) => l.background.key)).toEqual([
			"rain",
			"dunes",
			"rain",
		]);
		expect(playing(back)).toEqual(["rain"]);
	});

	it("changes nothing when the background is the one on top", () => {
		const layers = pick(firstLayers(RAIN), DUNES);
		expect(pick(layers, DUNES)).toBe(layers);
		expect(settled(layers, 0)).toBe(layers);
		expect(settled(layers, 9)).toBe(layers);
	});

	it("corrects a remembered guess in place before the server answers: no reveal", () => {
		const after = layersFor(firstLayers(RAIN), DUNES, false);
		expect(after.map((l) => [l.background.key, l.revealed])).toEqual([
			["dunes", false],
		]);
	});
});
