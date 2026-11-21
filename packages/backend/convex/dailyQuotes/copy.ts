/**
 * The daily quote push's words (B19), in Xolace's voice: calm, no pressure.
 * Imports nothing, so the Telegram adapter can take it without a cycle.
 */

/** The quote's opening words, at most this long, cut on a word. */
export const OPENING_WORDS_MAX = 72;

export const DAILY_QUOTE_COPY = {
	/** The backoff's last line. */
	paused: {
		body: "I'll stop the daily quote for now. You can turn it back on in Settings whenever you like.",
		title: "Xolace",
	},
	/**
	 * A personalised quote is drawn from the person's own sessions, and the
	 * lock screen isn't private: its words stay in the app.
	 */
	personal: "Today's quote is here whenever you're ready.",
	telegramButton: "Open today's quote",
	title: "Today's quote",
} as const;

const TRAILING_PUNCTUATION = /[\s,;:.!?–—-]+$/u;

/**
 * The first words of `text`, cut on a word at `OPENING_WORDS_MAX` and ending
 * in an ellipsis; the whole of it when it fits.
 */
export function openingWords(text: string, max = OPENING_WORDS_MAX): string {
	const whole = text.trim().replace(/\s+/gu, " ");
	if (whole.length <= max) {
		return whole;
	}
	const cut = whole.slice(0, max);
	const lastSpace = cut.lastIndexOf(" ");
	const words = lastSpace > 0 ? cut.slice(0, lastSpace) : cut;
	return `${words.replace(TRAILING_PUNCTUATION, "")}…`;
}
