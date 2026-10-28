// Rewrite each music track's `whatItsFor` from what the audio actually sounds
// like. The #573 lines were drafted from title + tags alone, so a track filed
// under the wrong topic got a line that argues it fits. A model listens to each
// track (the first 5 minutes, mono) and returns what it hears, a new line, and
// whether the track fits its topic.
//
// Nothing touches the manifest until `--apply`. The run writes
// `what-its-for.review.json` (the source of truth: edit `whatItsFor` there)
// and `what-its-for.review.md` (wrong and weak fits first, with a link to each
// file to listen to) beside the manifest. Topic moves are only suggested; make
// them by hand. Then run ingest, then the index backfills.
//
// Gemini by default (GEMINI_API_KEY). `--model gpt-audio-mini` (any `gpt-`
// model) goes to OpenAI (OPENAI_API_KEY); a `--model` with a slash is an
// OpenRouter model (OPENROUTER_API_KEY), e.g.
//   --model nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free
// (OpenRouter's free models still need $0.50 of credit for audio.)
// Prefer Gemini: on a 60-second upbeat track with handclaps, gpt-audio and
// gpt-audio-mini both heard "slow, calm guitar" and passed it as a fit.
// Keys go in packages/backend/.env.local; ffmpeg must be on PATH.
// `--vertex` sends a Gemini model through Vertex AI (Google Cloud credits)
// instead: no key, it signs in as `gcloud auth application-default login` and
// bills the project from `gcloud config get-value project` (or
// GOOGLE_CLOUD_PROJECT).
// Resumes: tracks already in the review file are skipped (`--redo` to redo;
// `--facts-only` hears the early reviews that lack the facts and adds only those).
//
//   bun scripts/kindling/describe-music.ts --estimate      # cost from track lengths, no calls
//   bun scripts/kindling/describe-music.ts --limit 5       # a sample, prints what it cost
//   bun scripts/kindling/describe-music.ts --slug music-motivation-07,music-sadness-03 --redo
//   bun scripts/kindling/describe-music.ts                 # every music track
//   bun scripts/kindling/describe-music.ts --apply         # review file → manifest
//
// `--out what-its-for.nemotron` writes (and `--apply` reads) another review
// file, so a second model can be tried on the same tracks without touching the
// main one. `--manifest scripts/kindling/dev/manifest.json` for the dev tree.
// Gemini's free tier allows 5 requests a minute and 20 a day: pass
// `--concurrency 1`. A rate limit waits and retries; a daily cap stops the run.
//
// By hand in AI Studio, one track at a time (no API key):
//   bun scripts/kindling/describe-music.ts --prompt   # next track: prompt (also on the clipboard) + its file
//   pbpaste | bun scripts/kindling/describe-music.ts --record music-mindfulness-07
// `--record` reads the reply from stdin, saves it as a review and writes the
// line into the manifest. `--prompt --slug <slug>` for a given track.

import { execFile, execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { CATALOG, topicSlug } from "../../convex/ai/paths/catalog";

const run = promisify(execFile);
const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const option = (name: string) => {
	const i = args.indexOf(name);
	return i >= 0 ? args[i + 1] : undefined;
};

const manifestPath = path.resolve(
	option("--manifest") ?? "scripts/kindling/prod/manifest.json"
);
const dir = path.dirname(manifestPath);
const mediaDir = path.join(dir, "media");
const out = option("--out") ?? "what-its-for.review";
const reviewPath = path.join(dir, `${out}.json`);
const reportPath = path.join(dir, `${out}.md`);
const MODEL = option("--model") ?? "gemini-3.8-flash";
/** OpenRouter model ids are `vendor/model`; OpenAI's start `gpt-`; the rest are Gemini. */
const PROVIDER = flag("--vertex")
	? "vertex"
	: MODEL.includes("/")
		? "openrouter"
		: MODEL.startsWith("gpt-")
			? "openai"
			: "gemini";
const LIMIT = Number(option("--limit") ?? Number.POSITIVE_INFINITY);
const ONLY = option("--slug")?.split(",");

/** Seconds of audio sent: enough to hear what a track is, and a cap on cost. */
const CLIP_SEC = 300;
/** Gemini bills audio at 32 tokens a second. */
const AUDIO_TOKENS_PER_SEC = 32;
/**
 * USD per 1M tokens (ai.google.dev and OpenAI pricing, 2026-10-26). Thinking
 * bills as output; `audio` is the input price for audio tokens when it differs.
 */
type Price = { audio?: number; input: number; output: number };
const PRICES: Record<string, Price> = {
	"gemini-3.8-flash": { input: 0.75, output: 3.75 },
	"gpt-audio": { audio: 32, input: 2.5, output: 10 },
	"gpt-audio-mini": { audio: 10, input: 0.6, output: 2.4 },
};
const FREE: Price = { input: 0, output: 0 };
const priceOf = (model: string) =>
	model.endsWith(":free") ? FREE : PRICES[model];
/** For `--estimate`: the prompt's text, and the JSON reply plus low thinking. */
const PROMPT_TOKENS = 900;
const REPLY_TOKENS = 700;
/** Room for a reasoning model's thinking plus the reply. */
const MAX_TOKENS = 8000;
/** Requests in flight. Gemini's free tier allows 5 a minute: pass `--concurrency 1` there. */
const CONCURRENCY = Number(option("--concurrency") ?? 4);
/** Server errors (503 "overloaded" is common) back off 5–80s; a rate limit waits as long as the reply says. */
const RETRIES = 5;
const RATE_LIMIT_RETRIES = 8;

type Track = {
	slug: string;
	family: string;
	title: string;
	topic: string;
	tags: string[];
	audioPath: string;
	durationSec: number;
	active?: boolean;
	secondaryTopic?: string;
	sound?: Sound;
	whatItsFor?: string;
};

type Fit = "good" | "weak" | "wrong";

type Answer = {
	heard: string;
	vocals: "none" | "wordless" | "lyrics";
	energy: number;
	fit: Fit;
	/** A topic slug (`sleep_rest`), or "none". Never applied; a suggestion. */
	betterTopic: string;
	why: string;
	whatItsFor: string;
	/** A replacement title to choose from; never applied. Reviews before it was asked for lack it. */
	suggestedTitle?: string;
} & Partial<Facts>;

/**
 * What a track is made of, kept for features to come (filters, a mood map,
 * safer sleep picks). Asked from music-self-love-11 on; earlier reviews lack it.
 */
type Facts = {
	instruments: string[];
	natureSounds: string[];
	beat: (typeof BEATS)[number];
	/** 1 dark or heavy to 5 bright. */
	valence: number;
	arc: (typeof ARCS)[number];
	/** Any sudden loud hit or startling moment. */
	jolts: boolean;
	/** Other topics it also serves, beyond its filed or better one. */
	alsoFits: string[];
	/** Language and theme in a few words, or "none". */
	lyrics: string;
};

/** What the manifest keeps of a review: `trackSoundValidator` in convex/lib/validators.ts. */
type Sound = Pick<Answer, "heard" | "vocals" | "energy"> &
	Partial<Omit<Facts, "lyrics">> & {
		lyrics?: string;
	};

/** `audio`: the part of `input` that was audio, when the API says. */
type Usage = { audio?: number; input: number; output: number; thought: number };

type Review = Answer & {
	slug: string;
	title: string;
	topic: string;
	audioPath: string;
	/** The #573 line this replaces. */
	draft?: string;
	model: string;
	usage: Usage;
	/** The owner's call at the moves, in words: kept when a track is heard again. */
	decision?: string | null;
	/** The owner's second topic slug (`meditation`); `--apply` writes it to the manifest. */
	secondaryTopic?: string | null;
	/** The title chosen for the track; `--apply` writes it to the manifest. */
	pickedTitle?: string;
};

const manifest: Track[] = JSON.parse(readFileSync(manifestPath, "utf8"));
const music = manifest.filter(
	(t) => t.family === "music" && t.active !== false
);
const reviews: Record<string, Review> = existsSync(reviewPath)
	? JSON.parse(readFileSync(reviewPath, "utf8"))
	: {};

const TOPICS = CATALOG.filter((c) => c.actionType.startsWith("music_topic_"));
const TOPIC_SLUGS = TOPICS.map((c) => topicSlug(c.actionType));
const topicLines = TOPICS.map(
	(c) => `- ${topicSlug(c.actionType)}: ${c.modelDescription}`
).join("\n");

const fileWords = (audioPath: string) =>
	path
		.basename(audioPath, path.extname(audioPath))
		.replace(/-\d+$/, "")
		.replace(/-/g, " ");

const VOCALS = ["none", "wordless", "lyrics"] as const;
const FITS = ["good", "weak", "wrong"] as const;
const BEATS = ["none", "soft", "steady", "driving"] as const;
const ARCS = [
	"steady",
	"builds",
	"swells_and_settles",
	"fades_out",
	"varied",
] as const;
const KEYS = [
	"heard",
	"vocals",
	"energy",
	"fit",
	"betterTopic",
	"why",
	"whatItsFor",
	"suggestedTitle",
	"instruments",
	"natureSounds",
	"beat",
	"valence",
	"arc",
	"jolts",
	"alsoFits",
	"lyrics",
] as const;

/** `clipped`: the request sends only the first CLIP_SEC seconds (AI Studio gets the whole file). */
function promptFor(t: Track, clipped = true) {
	const topic = TOPICS.find((c) => c.actionType === t.topic);
	return `You are curating the music library of Xolace, a mental-health support app. When someone is struggling, the app offers them one track from a topic. Most tracks are instrumental, but songs with vocals belong in the library too: judge a track by its mood and energy, not by whether it has vocals. Each track carries a one-line "what it's for", which is matched by meaning against what the person described feeling. A wrong line puts the wrong music in front of someone who is already having a hard time, so be honest about what you hear.

Listen to the attached audio${clipped && t.durationSec > CLIP_SEC ? ` (the first ${CLIP_SEC / 60} minutes of a ${Math.round(t.durationSec / 60)}-minute track)` : ""}.

What we have on file:
- Title: ${t.title}
- Uploader's file name (often their own description): ${fileWords(t.audioPath)}
- Tags: ${t.tags.join(", ") || "none"}
- Filed under topic: ${topicSlug(t.topic)}: ${topic?.modelDescription ?? "unknown"}
- Current line, drafted from the title and tags WITHOUT listening, may be wrong: ${t.whatItsFor ?? "none"}

The topics:
${topicLines}

Return:
- heard: one or two plain sentences on what you actually hear: tempo, energy, instruments, any vocals, mood, and how it changes.
- vocals: "none", "wordless" (hums, choirs, vocal pads) or "lyrics".
- energy: 1 (barely there) to 5 (intense).
- fit: how well it serves its filed topic. "good"; "weak" (usable, but not what the topic promises); "wrong" (works against it, e.g. a loud trailer filed under sleep).
- betterTopic: the topic slug it serves best if that isn't its filed one, else "none".
- why: one sentence on the fit.
- whatItsFor: the new line. Lowercase, 6 to 16 words, no full stop. Name the sound, then the moment it serves, in the style "soft piano and rain for winding down after a long day". It must be true to the audio even when the fit is wrong: describe what the track is really for, not what the topic wants. No medical claims, no "this track", no artist or title.
- suggestedTitle: a better title for the track, 2 to 5 words, in Title Case. Make it specific to this sound so it stands apart in a long list; avoid stock words like "meditation", "relaxing", "music", "ambient" or the topic name unless nothing else fits. No artist names.
- instruments: the main instruments and sounds you hear, up to 5, lowercase (e.g. ["piano", "strings", "synth pads"]).
- natureSounds: any nature sounds (e.g. ["rain", "birdsong"]), else [].
- beat: "none" (no percussion), "soft" (a gentle pulse), "steady" (a clear beat) or "driving" (a strong, pushing beat).
- valence: 1 (dark, heavy) to 5 (bright, joyful).
- arc: "steady" (stays the same), "builds" (grows to the end), "swells_and_settles" (rises then comes back down), "fades_out" (thins away to silence) or "varied" (changes a lot).
- jolts: true if anything sudden or loud could startle someone resting (a crash, a drop, a hard hit), else false.
- alsoFits: up to 3 other topic slugs it would also serve well, besides its filed topic and betterTopic, else [].
- lyrics: if there are sung or spoken words, the language and what they are about in a few words, else "none".`;
}

/** For models without a JSON mode, the shape goes in the prompt. */
const JSON_INSTRUCTION = `

Reply with only a JSON object, no other text and no code fence, with exactly these keys: ${KEYS.join(", ")}. energy and valence are numbers, jolts is true or false, instruments, natureSounds and alsoFits are arrays of strings; every other value is a string.`;

const SCHEMA = {
	properties: {
		alsoFits: { items: { enum: TOPIC_SLUGS, type: "string" }, type: "array" },
		arc: { enum: ARCS, type: "string" },
		beat: { enum: BEATS, type: "string" },
		betterTopic: { enum: ["none", ...TOPIC_SLUGS], type: "string" },
		energy: { enum: [1, 2, 3, 4, 5], type: "integer" },
		fit: { enum: FITS, type: "string" },
		heard: { type: "string" },
		instruments: { items: { type: "string" }, type: "array" },
		jolts: { type: "boolean" },
		lyrics: { type: "string" },
		natureSounds: { items: { type: "string" }, type: "array" },
		suggestedTitle: { type: "string" },
		valence: { enum: [1, 2, 3, 4, 5], type: "integer" },
		vocals: { enum: VOCALS, type: "string" },
		whatItsFor: { type: "string" },
		why: { type: "string" },
	},
	required: KEYS,
	type: "object",
};

/** The first CLIP_SEC seconds as small mono MP3, so every request stays inline (20 MB cap). */
async function clip(audioPath: string) {
	const { stdout } = await run(
		"ffmpeg",
		[
			"-v",
			"error",
			"-i",
			path.join(mediaDir, audioPath),
			"-t",
			String(CLIP_SEC),
			"-vn",
			"-ac",
			"1",
			"-b:a",
			"64k",
			"-f",
			"mp3",
			"pipe:1",
		],
		{ encoding: "buffer", maxBuffer: 20 * 1024 * 1024 }
	);
	return stdout.toString("base64");
}

/** gcloud's tokens last an hour; fetch a fresh one every 30 minutes. */
const TOKEN_TTL_MS = 30 * 60 * 1000;
let token = { at: 0, value: "" };
async function vertexToken() {
	if (Date.now() - token.at > TOKEN_TTL_MS) {
		const { stdout } = await run("gcloud", [
			"auth",
			"application-default",
			"print-access-token",
		]);
		token = { at: Date.now(), value: stdout.trim() };
	}
	return token.value;
}

/** A reply that came back but can't be used: the track is skipped, the run goes on. */
class BadAnswer extends Error {}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** The wait a 429 asks for ("Please retry in 52s", or Retry-After), plus a little, else a minute. */
function retryAfterMs(res: Response, body: string) {
	const header = Number(res.headers.get("retry-after"));
	const said = Number(/retry in ([\d.]+)s/i.exec(body)?.[1]);
	const seconds = header || said || 60;
	return (seconds + 2 + Math.random() * 3) * 1000;
}

/** POSTs JSON, retrying rate limits and server errors; throws on anything else. */
async function post(
	t: Track,
	url: string,
	headers: Record<string, string>,
	body: unknown
): Promise<unknown> {
	for (let attempt = 0; ; attempt++) {
		let res: Response;
		try {
			res = await fetch(url, {
				body: JSON.stringify(body),
				headers: { "Content-Type": "application/json", ...headers },
				method: "POST",
			});
		} catch (error) {
			// A dropped or timed-out connection: retry like a server error.
			if (attempt >= RETRIES) {
				throw error;
			}
			const wait = 2 ** attempt * 5000;
			console.log(
				`… ${t.slug}: ${error instanceof Error ? error.message : error}, retrying in ${wait / 1000}s`
			);
			await sleep(wait);
			continue;
		}
		const text = await res.text();
		// OpenRouter can answer 200 with an upstream error in the body.
		const embedded = res.ok
			? (JSON.parse(text) as { error?: { code?: number } }).error
			: undefined;
		const status = embedded?.code ?? res.status;
		if (res.ok && !embedded) {
			return JSON.parse(text);
		}
		const limited = status === 429;
		// A daily quota won't clear by waiting a minute.
		const daily = limited && /per[ -]day|daily/i.test(text);
		const tries = limited ? RATE_LIMIT_RETRIES : RETRIES;
		if (!(limited || status >= 500) || daily || attempt >= tries) {
			throw new Error(`${t.slug}: ${status} ${text.slice(0, 2000)}`);
		}
		const wait = limited ? retryAfterMs(res, text) : 2 ** attempt * 5000;
		console.log(
			`… ${t.slug}: ${limited ? "rate limited" : status}, retrying in ${Math.ceil(wait / 1000)}s`
		);
		await sleep(wait);
	}
}

type Interaction = {
	status: string;
	steps?: { type: string; content?: { type: string; text?: string }[] }[];
	usage?: {
		total_input_tokens?: number;
		total_output_tokens?: number;
		total_thought_tokens?: number;
	};
};

/** Gemini API and Vertex AI take the same Interactions request. */
async function askGemini(key: string, t: Track, audio: string) {
	const vertex = PROVIDER === "vertex";
	const reply = (await post(
		t,
		vertex
			? `https://aiplatform.googleapis.com/v1beta1/projects/${key}/locations/global/interactions`
			: "https://generativelanguage.googleapis.com/v1beta/interactions",
		vertex
			? { Authorization: `Bearer ${await vertexToken()}` }
			: { "x-goog-api-key": key },
		{
			generation_config: { thinking_level: "low" },
			input: [
				{ text: promptFor(t), type: "text" },
				{ data: audio, mime_type: "audio/mp3", type: "audio" },
			],
			model: MODEL,
			response_format: {
				mime_type: "application/json",
				schema: SCHEMA,
				type: "text",
			},
			store: false,
		}
	)) as Interaction;
	const text = reply.steps
		?.filter((s) => s.type === "model_output")
		.flatMap((s) => s.content ?? [])
		.find((c) => c.type === "text")?.text;
	if (reply.status !== "completed" || !text) {
		throw new BadAnswer(
			`no answer (status ${reply.status}): ${JSON.stringify(reply).slice(0, 500)}`
		);
	}
	return {
		text,
		usage: {
			input: reply.usage?.total_input_tokens ?? 0,
			output: reply.usage?.total_output_tokens ?? 0,
			thought: reply.usage?.total_thought_tokens ?? 0,
		},
	};
}

type Completion = {
	choices?: { finish_reason?: string; message?: { content?: string | null } }[];
	usage?: {
		prompt_tokens?: number;
		completion_tokens?: number;
		completion_tokens_details?: { reasoning_tokens?: number };
		prompt_tokens_details?: { audio_tokens?: number };
	};
};

/** OpenAI and OpenRouter share the chat completions shape. */
async function askChat(key: string, t: Track, audio: string) {
	const openai = PROVIDER === "openai";
	const reply = (await post(
		t,
		openai
			? "https://api.openai.com/v1/chat/completions"
			: "https://openrouter.ai/api/v1/chat/completions",
		openai
			? { Authorization: `Bearer ${key}` }
			: { Authorization: `Bearer ${key}`, "X-Title": "Xolace music curation" },
		{
			...(openai
				? { max_completion_tokens: MAX_TOKENS, modalities: ["text"] }
				: { max_tokens: MAX_TOKENS }),
			messages: [
				{
					content: [
						{ text: promptFor(t) + JSON_INSTRUCTION, type: "text" },
						{
							input_audio: { data: audio, format: "mp3" },
							type: "input_audio",
						},
					],
					role: "user",
				},
			],
			model: MODEL,
		}
	)) as Completion;
	const [choice] = reply.choices ?? [];
	const text = choice?.message?.content;
	if (!text) {
		throw new BadAnswer(
			`no answer (finish ${choice?.finish_reason}): ${JSON.stringify(reply).slice(0, 500)}`
		);
	}
	// Reasoning is counted inside completion tokens.
	const thought = reply.usage?.completion_tokens_details?.reasoning_tokens ?? 0;
	return {
		text,
		usage: {
			audio: reply.usage?.prompt_tokens_details?.audio_tokens,
			input: reply.usage?.prompt_tokens ?? 0,
			output: (reply.usage?.completion_tokens ?? 0) - thought,
			thought,
		},
	};
}

/** The JSON object in `text` (fences and chatter around it ignored), checked field by field. */
function answerOf(text: string): Answer {
	const start = text.indexOf("{");
	const end = text.lastIndexOf("}");
	let raw: Record<string, unknown>;
	try {
		raw = JSON.parse(text.slice(start, end + 1));
	} catch {
		throw new BadAnswer(`not JSON: ${text.slice(0, 500)}`);
	}
	const str = (k: string) => {
		const value = raw[k];
		return typeof value === "string" ? value.trim() : "";
	};
	const answer = {
		betterTopic: str("betterTopic").replace(/^music_topic_/, "") || "none",
		energy: Number(raw.energy),
		fit: str("fit").toLowerCase(),
		heard: str("heard"),
		suggestedTitle: str("suggestedTitle") || undefined,
		vocals: str("vocals").toLowerCase(),
		whatItsFor: str("whatItsFor").replace(/\.$/, ""),
		why: str("why"),
	};
	const list = (k: string) => {
		const value = raw[k];
		return Array.isArray(value)
			? value
					.filter((x): x is string => typeof x === "string")
					.map((x) => x.trim().toLowerCase())
			: undefined;
	};
	const facts = {
		alsoFits: list("alsoFits")?.map((x) => x.replace(/^music_topic_/, "")),
		arc: str("arc").toLowerCase() || undefined,
		beat: str("beat").toLowerCase() || undefined,
		instruments: list("instruments"),
		jolts: typeof raw.jolts === "boolean" ? raw.jolts : undefined,
		lyrics: str("lyrics") || undefined,
		natureSounds: list("natureSounds"),
		valence: raw.valence === undefined ? undefined : Number(raw.valence),
	};
	// Facts are optional (older prompts lack them), but checked when given.
	const factProblems = [
		facts.beat === undefined || BEATS.some((b) => b === facts.beat)
			? ""
			: `beat is ${raw.beat}`,
		facts.arc === undefined || ARCS.some((a) => a === facts.arc)
			? ""
			: `arc is ${raw.arc}`,
		facts.valence === undefined ||
		(Number.isInteger(facts.valence) &&
			facts.valence >= 1 &&
			facts.valence <= 5)
			? ""
			: `valence is ${raw.valence}`,
		(facts.alsoFits ?? []).every((x) => TOPIC_SLUGS.includes(x))
			? ""
			: `alsoFits is ${JSON.stringify(raw.alsoFits)}`,
	];
	const problems = [
		...factProblems,
		answer.heard ? "" : "heard is empty",
		answer.whatItsFor ? "" : "whatItsFor is empty",
		answer.why ? "" : "why is empty",
		Number.isInteger(answer.energy) && answer.energy >= 1 && answer.energy <= 5
			? ""
			: `energy is ${raw.energy}`,
		FITS.some((f) => f === answer.fit) ? "" : `fit is ${raw.fit}`,
		VOCALS.some((v) => v === answer.vocals) ? "" : `vocals is ${raw.vocals}`,
		["none", ...TOPIC_SLUGS].includes(answer.betterTopic)
			? ""
			: `betterTopic is ${raw.betterTopic}`,
	].filter(Boolean);
	if (problems.length > 0) {
		throw new BadAnswer(`${problems.join("; ")}: ${text.slice(0, 500)}`);
	}
	return { ...answer, ...facts } as Answer;
}

/** USD, or null for a model without a price above. */
function costOf(rows: Review[]) {
	const price = priceOf(MODEL);
	if (!price) {
		return null;
	}
	let usd = 0;
	for (const { usage } of rows) {
		const audio = price.audio === undefined ? 0 : (usage.audio ?? 0);
		usd +=
			((usage.input - audio) * price.input +
				audio * (price.audio ?? price.input) +
				(usage.output + usage.thought) * price.output) /
			1e6;
	}
	return usd;
}

const FIT_ORDER: Fit[] = ["wrong", "weak", "good"];

function writeReport() {
	const rows = Object.values(reviews);
	const models = [...new Set(rows.map((r) => r.model))].join(", ");
	const lines = [
		"# What it's for: review",
		"",
		`${rows.length} of ${music.length} music tracks heard by ${models}. Edit \`whatItsFor\` in \`${path.basename(reviewPath)}\`, not here; this file is rewritten on every run. Topic moves are suggestions: make them in \`manifest.json\` by hand.`,
	];
	for (const fit of FIT_ORDER) {
		const group = rows
			.filter((r) => r.fit === fit)
			.sort((a, b) => a.slug.localeCompare(b.slug));
		lines.push("", `## ${fit} (${group.length})`);
		for (const r of group) {
			const move =
				r.betterTopic !== "none" && r.betterTopic !== r.topic
					? ` → ${r.betterTopic}`
					: "";
			lines.push(
				"",
				`### ${r.slug}: ${r.title}`,
				"",
				`- Topic: ${r.topic}${move} · energy ${r.energy}/5 · vocals ${r.vocals} · [listen](<media/${r.audioPath}>)`,
				`- Heard: ${r.heard}`,
				`- Why: ${r.why}`,
				`- Draft: ${r.draft ?? "none"}`,
				`- New: **${r.whatItsFor}**`,
				`- Suggested title: ${r.suggestedTitle ?? "none"}`
			);
		}
	}
	writeFileSync(reportPath, `${lines.join("\n")}\n`);
}

const saveReviews = () =>
	writeFileSync(reviewPath, `${JSON.stringify(reviews, null, 2)}\n`);

/** Writes every review's line into the manifest; topic moves stay suggestions. */
/** The owner's calls on a track, which hearing it again must not drop. */
const ownerCalls = (slug: string) => ({
	decision: reviews[slug]?.decision,
	pickedTitle: reviews[slug]?.pickedTitle,
	secondaryTopic: reviews[slug]?.secondaryTopic,
});

/** The review's facts, in a fixed key order so an unchanged one compares equal. */
function soundOf(r: Review): Sound {
	return {
		alsoFits: r.alsoFits,
		arc: r.arc,
		beat: r.beat,
		energy: r.energy,
		heard: r.heard,
		instruments: r.instruments,
		jolts: r.jolts,
		lyrics: r.lyrics,
		natureSounds: r.natureSounds,
		valence: r.valence,
		vocals: r.vocals,
	};
}

function applyReviews() {
	let changed = 0;
	for (const t of music) {
		const r = reviews[t.slug];
		// A track this review file doesn't cover (a --limit sample) keeps what it has.
		if (!r) {
			continue;
		}
		const line = r.whatItsFor.trim();
		if (line && line !== t.whatItsFor) {
			t.whatItsFor = line;
			changed++;
		}
		if (r.pickedTitle && r.pickedTitle !== t.title) {
			t.title = r.pickedTitle;
			changed++;
		}
		const sound = soundOf(r);
		if (JSON.stringify(sound) !== JSON.stringify(t.sound)) {
			t.sound = sound;
			changed++;
		}
		// The owner's secondary topic, decided at the moves; none on a reviewed track clears it.
		const secondaryTopic = r.secondaryTopic
			? `music_topic_${r.secondaryTopic}`
			: undefined;
		if (
			secondaryTopic &&
			(!CATALOG.some((e) => e.actionType === secondaryTopic) ||
				secondaryTopic === t.topic)
		) {
			throw new Error(
				`${t.slug}: secondary topic "${r.secondaryTopic}" isn't another music topic`
			);
		}
		if (secondaryTopic !== t.secondaryTopic) {
			t.secondaryTopic = secondaryTopic;
			changed++;
		}
	}
	writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
	// Back to the repo's layout (short arrays on one line), so the diff is the lines alone.
	execFileSync("bunx", ["biome", "format", "--write", manifestPath], {
		stdio: "ignore",
	});
	const open = Object.values(reviews).filter(
		(r) => !r.decision && r.betterTopic !== "none" && r.betterTopic !== r.topic
	);
	console.log(
		`Wrote ${changed} changes into ${path.relative(process.cwd(), manifestPath)}. ${open.length} suggested topic moves wait for the owner's call.`
	);
}

if (flag("--apply")) {
	applyReviews();
	process.exit(0);
}

const recordSlug = option("--record");
if (recordSlug) {
	const t = music.find((m) => m.slug === recordSlug);
	if (!t) {
		throw new Error(`No active music track ${recordSlug}`);
	}
	const answer = answerOf(readFileSync(0, "utf8"));
	reviews[t.slug] = {
		audioPath: t.audioPath,
		// Keep the #573 draft when a track is recorded twice.
		draft: reviews[t.slug]?.draft ?? t.whatItsFor,
		slug: t.slug,
		title: t.title,
		topic: topicSlug(t.topic),
		...answer,
		model: `${MODEL} (AI Studio)`,
		usage: { input: 0, output: 0, thought: 0 },
		...ownerCalls(t.slug),
	};
	saveReviews();
	writeReport();
	console.log(
		`✓ ${t.slug} [${answer.fit}${answer.betterTopic === "none" ? "" : ` → ${answer.betterTopic}`}] ${answer.whatItsFor}`
	);
	applyReviews();
	process.exit(0);
}

/**
 * `--facts-only`: hear the tracks reviewed before the facts were asked for and
 * add just the facts, leaving the reviewed line, verdict and owner's calls.
 */
const FACTS_ONLY = flag("--facts-only");
const FACT_KEYS = [
	"instruments",
	"natureSounds",
	"beat",
	"valence",
	"arc",
	"jolts",
	"alsoFits",
	"lyrics",
] as const;
const lacksFacts = (r: Review | undefined) =>
	r !== undefined && r.instruments === undefined;

const todo = music
	.filter((t) => (ONLY ? ONLY.includes(t.slug) : true))
	.filter((t) =>
		FACTS_ONLY
			? lacksFacts(reviews[t.slug])
			: flag("--redo") || !reviews[t.slug]
	)
	.slice(0, LIMIT);

if (flag("--prompt")) {
	const [t] = todo;
	if (!t) {
		console.log("Every music track has a review.");
		process.exit(0);
	}
	const prompt = promptFor(t, false) + JSON_INSTRUCTION;
	// macOS only; elsewhere, copy it from the output.
	try {
		execFileSync("pbcopy", { input: prompt });
	} catch {
		// No pbcopy.
	}
	console.log(
		`${t.slug} (${music.length - Object.keys(reviews).length} left)\nAudio: ${path.join(mediaDir, t.audioPath)}\n\n${prompt}`
	);
	process.exit(0);
}

if (flag("--estimate")) {
	const price = priceOf(MODEL);
	const audio = todo.reduce(
		(sum, t) => sum + Math.min(t.durationSec, CLIP_SEC) * AUDIO_TOKENS_PER_SEC,
		0
	);
	const input = audio + todo.length * PROMPT_TOKENS;
	const output = todo.length * REPLY_TOKENS;
	console.log(
		`${todo.length} tracks: ~${(input / 1e6).toFixed(2)}M input tokens (${(audio / 1e6).toFixed(2)}M audio), ~${(output / 1e6).toFixed(2)}M output.`
	);
	console.log(
		price
			? `≈ $${((input * price.input + output * price.output) / 1e6).toFixed(2)} on ${MODEL}. Run --limit 5 for a real per-track cost.`
			: `No price on file for ${MODEL}.`
	);
	process.exit(0);
}

const keyName = {
	gemini: "GEMINI_API_KEY",
	openai: "OPENAI_API_KEY",
	openrouter: "OPENROUTER_API_KEY",
	vertex: "GOOGLE_CLOUD_PROJECT",
}[PROVIDER];
/** For Vertex, the "key" is the Google Cloud project to bill. */
const key =
	process.env[keyName] ??
	(PROVIDER === "vertex"
		? execFileSync("gcloud", ["config", "get-value", "project"], {
				encoding: "utf8",
			}).trim()
		: undefined);
if (!key) {
	throw new Error(`Set ${keyName} in packages/backend/.env.local`);
}
const ask =
	PROVIDER === "openai" || PROVIDER === "openrouter" ? askChat : askGemini;

async function hear(t: Track): Promise<Review> {
	const reply = await ask(key ?? "", t, await clip(t.audioPath));
	return {
		audioPath: t.audioPath,
		draft: t.whatItsFor,
		slug: t.slug,
		title: t.title,
		topic: topicSlug(t.topic),
		...answerOf(reply.text),
		model: MODEL,
		usage: reply.usage,
	};
}

const done: Review[] = [];
const skipped: string[] = [];
const queue = [...todo];
/** Set on the first failure: no new tracks start, but the ones in flight still save. */
let failed = false;
async function worker() {
	for (let t = queue.shift(); t && !failed; t = queue.shift()) {
		let review: Review;
		try {
			review = await hear(t);
		} catch (error) {
			// A bad answer skips the track (a re-run tries it again); anything else stops.
			if (error instanceof BadAnswer) {
				skipped.push(t.slug);
				console.log(`✗ ${t.slug}: ${error.message}`);
				continue;
			}
			failed = true;
			throw error;
		}
		const before = reviews[t.slug];
		reviews[t.slug] =
			FACTS_ONLY && before
				? {
						...before,
						...Object.fromEntries(FACT_KEYS.map((k) => [k, review[k]])),
						suggestedTitle: before.suggestedTitle ?? review.suggestedTitle,
					}
				: { ...review, ...ownerCalls(t.slug) };
		done.push(review);
		saveReviews();
		writeReport();
		console.log(
			`✓ ${t.slug} [${review.fit}${review.betterTopic === "none" ? "" : ` → ${review.betterTopic}`}] ${review.whatItsFor}`
		);
	}
}
try {
	// Independent requests in a small pool. Wait for every worker, so a
	// failure doesn't drop answers already paid for, then report the first.
	const results = await Promise.allSettled(
		Array.from({ length: CONCURRENCY }, worker)
	);
	const rejected = results.find((r) => r.status === "rejected");
	if (rejected) {
		throw rejected.reason;
	}
} finally {
	const usd = costOf(done);
	console.log(
		`Done: ${done.length} of ${todo.length} heard${skipped.length > 0 ? `, ${skipped.length} skipped (bad answers; re-run to retry)` : ""}${usd === null ? "" : `, $${usd.toFixed(3)} spent (≈ $${done.length > 0 ? (usd / done.length).toFixed(4) : "0"} a track)`}. Review: ${path.relative(process.cwd(), reportPath)}`
	);
}
