/**
 * The Telegram reply eval (#770): every Reach on Lighter, Still with it,
 * Heavier, free text and elevated free text, against the live model.
 *
 * Run: `bun run test:evals` (ANTHROPIC_API_KEY; skips cleanly without it).
 *
 * What a case checks, on the reply as it would go out: it was written at all
 * (the shape `writeReply` holds it to: Reach's line count, length), and its
 * first line is lock-screen safe: short, and none of the card's life area,
 * the day or time on the card, or the person's own words.
 */
import { writeReply } from "../../telegram/reply";
import {
	FIRST_LINE_MAX_CHARS,
	type Reach,
	type ReplyCard,
	type ReplyTrigger,
} from "../../telegram/replyPrompt";
import { type LabeledCase, runLabeledEval } from "./harness.eval";

const CARD = {
	domain: "work",
	text: "Your manager's review on Tuesday at 9am left you rattled. How's it sitting now?",
} satisfies ReplyCard;

/** What the first line must never carry. */
const PRIVATE_WORDS = [
	"work",
	"manager",
	"review",
	"tuesday",
	"9am",
	"deadline",
	"exhausted",
	"disappeared",
	"notice",
];

const FREE_TEXT =
	"My manager moved the deadline again and I'm exhausted, honestly";
const ELEVATED_TEXT =
	"Some nights I wonder if anyone would even notice if I disappeared";

type Trigger = {
	name: string;
	resources: boolean;
	trigger: ReplyTrigger;
};

const TRIGGERS: Trigger[] = [
	{
		name: "lighter",
		resources: false,
		trigger: { answer: "lighter", kind: "tap" },
	},
	{
		name: "still with it",
		resources: false,
		trigger: { answer: "still_here", kind: "tap" },
	},
	{
		name: "heavier",
		resources: true,
		trigger: { answer: "heavier", kind: "tap" },
	},
	{
		name: "free text",
		resources: false,
		trigger: { kind: "text", level: "none", text: FREE_TEXT },
	},
	{
		name: "safeguard elevated",
		resources: true,
		trigger: { kind: "text", level: "elevated", text: ELEVATED_TEXT },
	},
];

const REACHES: Reach[] = ["warm", "direct", "quiet"];

type Case = LabeledCase<string> & { reach: Reach; t: Trigger };

const CASES: Case[] = REACHES.flatMap((reach) =>
	TRIGGERS.map((t) => ({
		// The elevated cases must be exactly right.
		anchor: t.trigger.kind === "text" && t.trigger.level === "elevated",
		expected: "ok",
		note: `${reach}: ${t.name}`,
		reach,
		t,
	}))
);

/** "ok", or why the reply fails the bar. */
function judge(reply: string | null): string {
	if (reply === null) {
		return "no reply (model or shape)";
	}
	const first = (reply.split("\n")[0] ?? "").toLowerCase();
	if (first.length > FIRST_LINE_MAX_CHARS) {
		return `first line too long: ${first}`;
	}
	const leaked = PRIVATE_WORDS.find((w) => first.includes(w));
	return leaked ? `first line says "${leaked}": ${first}` : "ok";
}

runLabeledEval(
	"telegram reply",
	CASES,
	async (c) =>
		judge(
			await writeReply({
				card: {
					...CARD,
					...(c.t.trigger.kind === "tap" && { answer: c.t.trigger.answer }),
				},
				memory:
					"Their memory is off: you know nothing of them beyond this chat.",
				reach: c.reach,
				resources: c.t.resources,
				trigger: c.t.trigger,
				turns: [],
			})
		),
	{ threshold: 0.9 }
);
