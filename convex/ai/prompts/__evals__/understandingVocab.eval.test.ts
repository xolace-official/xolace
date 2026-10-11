/**
 * Live-Haiku eval for the classifier's widened vocabulary (ADR 0018): run
 * before AND after a vocabulary change. The gate is the first suite — the
 * original thirteen emotions must not regress. The other two report how well
 * the new emotions and life areas fire.
 *
 * Run: `bun run test:evals` (needs ANTHROPIC_API_KEY; skips cleanly without).
 */
import { getAnthropicClient, parseClassificationResponse, CLASSIFIER_MODEL, thinkingOff } from "../../providers/anthropic";
import { buildClassifierPrompt } from "../classifier";
import { runLabeledEval, type LabeledCase } from "./harness.eval";

type Case = LabeledCase<string> & { input: string };

async function classify(input: string) {
  const prompt = buildClassifierPrompt(input, "(no prior pattern context)", false, "open_prompt");
  const res = await getAnthropicClient().messages.create({
    model: CLASSIFIER_MODEL,
    max_tokens: 400,
    thinking: thinkingOff(CLASSIFIER_MODEL),
    system: prompt.system,
    messages: [{ role: "user", content: prompt.user }],
  });
  const raw = res.content.find((b) => b.type === "text");
  return parseClassificationResponse(raw && raw.type === "text" ? raw.text : "{}");
}

const c = (expected: string, input: string, note = input.slice(0, 40), anchor = false): Case => ({
  expected, input, note, anchor,
});

// GATE — the original thirteen must keep landing where they did.
const ROOT: Case[] = [
  c("anger", "I am furious at my manager for taking credit for my work.", undefined, true),
  c("anger", "He lied to my face and I want to scream."),
  c("sadness", "I cried on the train today and I don't even know why, everything feels sad.", undefined, true),
  c("grief", "My dad died in March and I still set a place for him at the table.", undefined, true),
  c("grief", "It's been a year since we lost her and the house is still so quiet."),
  c("fear", "Someone has been following me home and I'm scared to go out at night.", undefined, true),
  c("anxiety", "My heart races all day and I keep imagining everything that could go wrong.", undefined, true),
  c("joy", "I got the job! I can't stop smiling, today is perfect.", undefined, true),
  c("love", "I look at my partner sleeping and I feel so full of love it hurts."),
  c("surprise", "I opened the door and my whole family was there. I had no idea, I'm stunned."),
  c("disgust", "What he said about her made my skin crawl, I felt sick."),
  c("shame", "I'm so ashamed of how I acted at the party, I can't look anyone in the eye.", undefined, true),
  c("guilt", "I forgot my mum's birthday and I can't stop feeling like a terrible daughter."),
  c("confusion", "I don't know what I feel. One minute fine, the next not, and I can't name it."),
  c("numbness", "I feel nothing. Not sad, not happy, just blank for weeks.", undefined, true),
];

// New emotions — strict: the model must pick the finer word, not its parent.
const NEW: Case[] = [
  c("stress", "Deadlines are stacking up and I'm running on adrenaline and caffeine."),
  c("stress", "Too much to do, too little time, my shoulders are up by my ears."),
  c("overwhelm", "It's all too much. I can't even tell where to start anymore."),
  c("overwhelm", "Everything is landing at once and I'm drowning in it."),
  c("exhaustion", "I'm so tired in a way sleep doesn't fix. I have nothing left."),
  c("exhaustion", "Drained. Every task feels like lifting something impossibly heavy."),
  c("demotivation", "I just can't make myself care about my coursework anymore."),
  c("demotivation", "No drive at all. I open my laptop and close it again."),
  c("self-doubt", "Everyone else seems to belong here. I keep thinking I'm not good enough."),
  c("self-doubt", "I second-guess everything I write, sure they'll see I'm a fraud."),
  c("embarrassment", "I tripped in front of the whole lecture hall and my face is still burning."),
  c("regret", "I wish I'd called him before he passed. I can't undo it."),
  c("regret", "I turned down that chance and I keep asking what if I'd said yes."),
  c("uncertainty", "I don't know what happens after graduation and not knowing is eating at me."),
  c("uncertainty", "Should I stay or move? I can't see which way is right."),
  c("loneliness", "I sat in the dining hall alone again. Nobody noticed.", undefined, true),
  c("loneliness", "Weekends are the worst, the flat is silent and my phone never lights up."),
  c("homesickness", "I miss my mum's cooking and my own bed. This city doesn't feel like home."),
  c("homesickness", "I'd give anything to be back in my hometown right now."),
  c("not-belonging", "Everyone here already has their people. I feel like I'm on the outside looking in."),
  c("not-belonging", "I don't fit in anywhere on this campus."),
  c("disappointment", "I really hoped I'd get in. The rejection email just landed."),
  c("hopelessness", "I can't see anything getting better, ever. What's the point.", undefined, true),
  c("frustration", "I've explained it five times and it's still going wrong. So annoyed."),
  c("hope", "I think things might turn a corner. For the first time in months I'm looking forward."),
  c("relief", "The results were fine. I can finally breathe again."),
  c("gratitude", "My friends showed up when I needed them and I'm so thankful."),
  c("calm", "Sat by the river this morning. Everything feels quiet and settled."),
  c("pride", "I finished my first marathon and I'm so proud of myself."),
];

type TagCase = Case & { tag: string };
const t = (tag: string, input: string): TagCase => ({ tag, expected: tag, input, note: `${tag}: ${input.slice(0, 32)}` });

// New life areas — the tag must appear among the classifier's thematicTags.
const TAGS: TagCase[] = [
  t("studies", "My dissertation is due in a week and I've barely started."),
  t("friendships", "My closest friend stopped replying and I don't know what I did."),
  t("romance", "We broke up last week and I keep checking his profile."),
  t("belonging", "I don't feel like I belong with anyone on my course."),
  t("settling-in", "It's my second week in a new city and nothing feels familiar yet."),
  t("future", "I've graduated and have no idea what comes next."),
  t("burnout", "Months of overwork and I've hit a wall, I dread every Monday."),
  t("sleep", "I've been awake until 4am every night this week and can't switch off."),
  t("parenting", "My toddler won't sleep and I feel like I'm failing as a parent."),
  t("caregiving", "I look after my mum full time now and there's no time left for me."),
  t("addiction", "I relapsed last night after sixty days sober and I hate myself."),
  t("body-image", "I can't stand how I look in photos, I avoid mirrors."),
  t("social-media", "Scrolling everyone's perfect lives makes me feel worse about mine."),
  t("housing", "My landlord is selling and I have a month to find somewhere to live."),
  t("finances", "Rent is due and my account is almost empty."),
];

runLabeledEval("original 13 emotions hold (gate, live Haiku)", ROOT,
  async (k) => (await classify(k.input)).primaryEmotion, { threshold: 0.85 });

runLabeledEval("new emotions fire (live Haiku)", NEW,
  async (k) => (await classify(k.input)).primaryEmotion, { threshold: 0.5 });

runLabeledEval("new life areas fire (live Haiku)", TAGS,
  async (k) => {
    const { thematicTags } = await classify(k.input);
    return thematicTags.includes((k as TagCase).tag) ? k.expected : thematicTags[0] ?? "none";
  }, { threshold: 0.6 });
