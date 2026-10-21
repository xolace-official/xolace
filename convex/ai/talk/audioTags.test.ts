/**
 * The endpoint's audio-tag filter (#603). Failure modes: a tag split across
 * deltas leaks; an unknown tag ("[pause]", "[gasps]") reaches the TTS; an
 * allowed tag is dropped; an unclosed "[" swallows the rest of the reply.
 */
import { describe, expect, it } from "vitest";
import { createTagFilter, stripAudioTags } from "./audioTags";

const run = (...deltas: string[]) => {
  const f = createTagFilter();
  return deltas.map((d) => f.push(d)).join("") + f.flush();
};

describe("audio tag filter", () => {
  it("keeps the five tags and strips any other bracketed text", () => {
    expect(run("[sighs] Yeah. [pause] That [laughs] sounds hard. [gasps]")).toBe("[sighs] Yeah.  That [laughs] sounds hard. ");
    expect(run("[whispers] ok [slow] and [excited] yes")).toBe("[whispers] ok [slow] and [excited] yes");
  });

  it("holds a tag split across deltas", () => {
    expect(run("Mm. [si", "gh", "s] okay")).toBe("Mm. [sighs] okay");
    expect(run("Mm. [cou", "gh] okay")).toBe("Mm.  okay");
    expect(run("ok [takes a slow ", "breath and pauses] go")).toBe("ok  go");
  });

  it("never swallows text after an unclosed bracket", () => {
    expect(run("I said [this and then I kept talking for a long while about it all")).toBe(
      "I said [this and then I kept talking for a long while about it all",
    );
    expect(run("trailing [sl")).toBe("trailing [sl");
  });

  it("restarts on a nested bracket", () => {
    expect(run("[[laughs] hi")).toBe("[[laughs] hi");
  });

  it("is case-insensitive", () => {
    expect(run("[Sighs] ok")).toBe("[Sighs] ok");
  });

  it("strips the five tags for the transcript", () => {
    expect(stripAudioTags("[sighs] Yeah. [slow] Take your time.")).toBe("Yeah. Take your time.");
  });
});
