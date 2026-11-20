import { describe, expect, it } from "vitest";
import { SLEEP_OFF } from "@/lib/now-playing/sleep-timer";
import { HEAVY, MUSIC, NO_PEAKS, SPOKEN } from "./dev/fixtures";
import { fmt, fmtVo, positionVo } from "./player-format";
import {
	playerStatus,
	SEEK_SETTLE_MS,
	settledPosition,
	showsLength,
	skipTarget,
	sleepFading,
	sleepPill,
	sleepVoice,
	snapToBar,
	tickIndex,
	toPlayerTrack,
	trackLabel,
} from "./player-model";

describe("the track", () => {
	it("labels a spoken track with its narrator, music with its kind alone", () => {
		expect(trackLabel("support", ["Sage"])).toBe("Support audio · Sage");
		expect(trackLabel("support", ["Sage", "Ash"])).toBe(
			"Support audio · Sage, Ash"
		);
		expect(trackLabel("support")).toBe("Support audio");
		expect(trackLabel("music", ["Lumen Fields"])).toBe("Music");
	});

	it("draws the waveform only for a spoken track with peaks", () => {
		expect(toPlayerTrack(SPOKEN).peaks).toHaveLength(60);
		expect(toPlayerTrack(NO_PEAKS).peaks).toBeNull();
		expect(toPlayerTrack({ ...SPOKEN, peaks: [] }).peaks).toBeNull();
		expect(toPlayerTrack({ ...MUSIC, peaks: SPOKEN.peaks }).peaks).toBeNull();
	});

	it("shows the attribution, or the crisis line on a tier-4 track", () => {
		expect(toPlayerTrack(MUSIC).attribution).toBe(MUSIC.attributionText);
		expect(toPlayerTrack(SPOKEN).attribution).toBeUndefined();
		expect(toPlayerTrack(HEAVY).crisis).toBe(true);
	});

	it("shows the length on the right only for music on Repeat", () => {
		expect(showsLength(toPlayerTrack(MUSIC), true)).toBe(true);
		expect(showsLength(toPlayerTrack(MUSIC), false)).toBe(false);
		expect(showsLength(toPlayerTrack(SPOKEN), true)).toBe(false);
	});
});

describe("the status", () => {
	it("gates before anything loads", () => {
		expect(playerStatus({ error: true, gated: true, track: undefined })).toBe(
			"gated"
		);
	});

	it("tells loading, gone, error and ready apart", () => {
		expect(playerStatus({ error: false, gated: false, track: undefined })).toBe(
			"loading"
		);
		expect(playerStatus({ error: false, gated: false, track: null })).toBe(
			"gone"
		);
		expect(playerStatus({ error: true, gated: false, track: undefined })).toBe(
			"error"
		);
		expect(playerStatus({ error: false, gated: false, track: {} })).toBe(
			"ready"
		);
	});
});

describe("time", () => {
	it("prints the board's times", () => {
		expect(fmt(186)).toBe("3:06");
		expect(fmt(0)).toBe("0:00");
		expect(fmt(-3)).toBe("0:00");
		expect(fmt(59.6)).toBe("1:00");
	});

	it("reads the position for VoiceOver", () => {
		expect(positionVo(186, 492)).toBe(
			"3 minutes 6 seconds of 8 minutes 12 seconds"
		);
		expect(fmtVo(0)).toBe("0 seconds");
		expect(fmtVo(60)).toBe("1 minute");
		expect(fmtVo(61)).toBe("1 minute 1 second");
	});

	it("keeps a 15 s skip inside the track", () => {
		expect(skipTarget(186, -15, 492)).toBe(171);
		expect(skipTarget(10, -15, 492)).toBe(0);
		expect(skipTarget(485, 15, 492)).toBe(492);
	});

	it("holds a seek's target until the clock reaches it", () => {
		const seek = { at: 0, to: 300 };
		expect(settledPosition(120, seek, 400)).toBe(300);
		expect(settledPosition(299.4, seek, 400)).toBe(299.4);
		expect(settledPosition(121, seek, 1500)).toBe(300);
		expect(settledPosition(120, seek, SEEK_SETTLE_MS)).toBe(120);
		expect(settledPosition(120, null, 400)).toBe(120);
	});

	it("snaps a waveform release to the nearest bar", () => {
		expect(snapToBar(0.62, 60)).toBeCloseTo(37 / 60);
		expect(snapToBar(0.001, 60)).toBe(0);
		expect(snapToBar(0.5, 0)).toBe(0.5);
	});

	it("ticks once per 30 s mark crossed", () => {
		expect(tickIndex(29 / 492, 492, 30)).toBe(0);
		expect(tickIndex(31 / 492, 492, 30)).toBe(1);
	});
});

describe("the sleep timer", () => {
	it("shows minutes, then seconds in the last minute", () => {
		expect(sleepPill({ choice: 30, left: 1680 })).toBe("28 min");
		expect(sleepPill({ choice: 30, left: 1679 })).toBe("28 min");
		expect(sleepPill({ choice: 30, left: 61 })).toBe("2 min");
		expect(sleepPill({ choice: 30, left: 60 })).toBe("1 min");
		expect(sleepPill({ choice: 30, left: 59.4 })).toBe("1 min");
		expect(sleepPill({ choice: 30, left: 59 })).toBe("0:59");
		expect(sleepPill({ choice: 30, left: 0.2 })).toBe("0:01");
		expect(sleepPill({ choice: 30, left: 45 })).toBe("0:45");
		expect(sleepPill({ choice: 30, left: 5 })).toBe("0:05");
		expect(sleepPill({ choice: "end", left: 0 })).toBe("End of track");
		expect(sleepPill(SLEEP_OFF)).toBe("");
	});

	it("says what's left to VoiceOver", () => {
		expect(sleepVoice(SLEEP_OFF)).toBe("Sleep timer, off");
		expect(sleepVoice({ choice: 30, left: 1680 })).toBe(
			"Sleep timer, 28 minutes left"
		);
		expect(sleepVoice({ choice: 30, left: 45 })).toBe(
			"Sleep timer, 45 seconds left"
		);
		expect(sleepVoice({ choice: 30, left: 60 })).toBe(
			"Sleep timer, 1 minute left"
		);
		expect(sleepVoice({ choice: 30, left: 44.3 })).toBe(
			"Sleep timer, 45 seconds left"
		);
		expect(sleepVoice({ choice: "end", left: 0 })).toBe(
			"Sleep timer, end of track"
		);
	});

	it("dims the pill over the last 30 s only", () => {
		expect(sleepFading({ choice: 30, left: 30 })).toBe(true);
		expect(sleepFading({ choice: 30, left: 31 })).toBe(false);
		expect(sleepFading({ choice: "end", left: 0 })).toBe(false);
	});
});
