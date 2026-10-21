import { describe, expect, it } from "vitest";
import { spokenWords } from "@/src/features/talk/spoken-words";

const chunk = (text: string, step = 50) => ({
  chars: [...text],
  char_start_times_ms: [...text].map((_, i) => i * step),
  char_durations_ms: [...text].map(() => step),
});

describe("spokenWords", () => {
  it("reveals each word, with its trailing space, when its first letter is spoken", () => {
    expect(spokenWords(chunk("Hi you"), 1000)).toEqual({
      words: [
        { text: "Hi ", at: 1000 },
        { text: "you", at: 1150 },
      ],
      end: 1300,
    });
  });

  it("keeps every character, so the chunks join back into the spoken line", () => {
    const { words } = spokenWords(chunk("  so, then "), 0);
    expect(words.map((w) => w.text).join("")).toBe("  so, then ");
  });

  it("returns nothing for an empty chunk and leaves the playhead where it was", () => {
    expect(spokenWords(chunk(""), 500)).toEqual({ words: [], end: 500 });
  });
});
