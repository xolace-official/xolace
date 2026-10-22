import { describe, expect, it } from "vitest";
import {
  chatNotificationSound,
  DEFAULT_CHANNEL_ID,
  MESSAGE_CHANNEL_ID,
  MESSAGE_SOUND,
  NUDGE_CHANNEL_ID,
  NUDGE_SOUND,
  REACH_CHANNEL_ID,
  REACH_SOUND,
  SOUND_CHANNELS,
} from "./notificationSounds";

describe("chatNotificationSound", () => {
  // The split the whole feature exists for: someone waiting on you sounds
  // different from chatter, before the phone is even out of a pocket.
  it("gives the reach-out sound to a request and an accept", () => {
    expect(chatNotificationSound("chat_request")).toEqual({
      sound: REACH_SOUND,
      channelId: REACH_CHANNEL_ID,
    });
    expect(chatNotificationSound("chat_accepted")).toEqual({
      sound: REACH_SOUND,
      channelId: REACH_CHANNEL_ID,
    });
  });

  // Declined rides the lighter sound on purpose. A conversation that didn't
  // open is the quietest of the four events and should not announce itself.
  it("gives the lighter sound to a message, a decline, and an expiry", () => {
    expect(chatNotificationSound("chat_message")).toEqual({
      sound: MESSAGE_SOUND,
      channelId: MESSAGE_CHANNEL_ID,
    });
    expect(chatNotificationSound("chat_declined")).toEqual({
      sound: MESSAGE_SOUND,
      channelId: MESSAGE_CHANNEL_ID,
    });
    expect(chatNotificationSound("chat_expired")).toEqual({
      sound: MESSAGE_SOUND,
      channelId: MESSAGE_CHANNEL_ID,
    });
  });

  // The two must never collapse into one, which is the failure an inverted or
  // copy-pasted branch would produce.
  it("keeps the two sounds and channels distinct", () => {
    expect(REACH_SOUND).not.toBe(MESSAGE_SOUND);
    expect(REACH_CHANNEL_ID).not.toBe(MESSAGE_CHANNEL_ID);
  });
});

describe("nudge sound", () => {
  // The whole reason nudges moved off `default`: that channel exists without a
  // sound on every device already running the app, and a channel's sound can
  // never be changed. Reusing the id would give the new sound to fresh installs
  // only, and the regression would be invisible in code review.
  it("never routes nudges onto the pre-existing default channel", () => {
    expect(NUDGE_CHANNEL_ID).not.toBe(DEFAULT_CHANNEL_ID);
  });

  it("keeps the nudge sound distinct from both conversation sounds", () => {
    expect(NUDGE_SOUND).not.toBe(REACH_SOUND);
    expect(NUDGE_SOUND).not.toBe(MESSAGE_SOUND);
    expect(NUDGE_CHANNEL_ID).not.toBe(REACH_CHANNEL_ID);
    expect(NUDGE_CHANNEL_ID).not.toBe(MESSAGE_CHANNEL_ID);
  });
});

describe("SOUND_CHANNELS", () => {
  // A channel the server names but the client never creates falls back to the
  // stock sound silently, so every sound in use must appear here exactly once.
  it("creates a channel for every sound the server sends", () => {
    const declared = SOUND_CHANNELS.map((c) => c.sound).sort();
    expect(declared).toEqual([MESSAGE_SOUND, NUDGE_SOUND, REACH_SOUND].sort());
  });

  it("has no duplicate ids and never redefines the default channel", () => {
    const ids = SOUND_CHANNELS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain(DEFAULT_CHANNEL_ID);
  });

  // These strings show up in Android system settings, where "default" or a
  // bare filename would be the user's only clue what they are silencing.
  it("gives every channel a human-readable name", () => {
    for (const channel of SOUND_CHANNELS) {
      expect(channel.name.length).toBeGreaterThan(0);
      expect(channel.name).not.toBe(DEFAULT_CHANNEL_ID);
      expect(channel.name).not.toContain(".wav");
    }
  });

  // Android turns each filename into a res/raw resource name by dropping the
  // extension; interior dots or capitals fail the build, which is why
  // nudge.tight.wav could never have shipped under that name.
  it("uses filenames Android can turn into raw resource names", () => {
    for (const channel of SOUND_CHANNELS) {
      expect(channel.sound).toMatch(/^[a-z][a-z0-9_]*\.wav$/);
    }
  });
});
