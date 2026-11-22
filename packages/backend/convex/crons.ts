import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
import { SWEEP_EVERY_MINUTES } from "./dailyQuotes/schedule";
import { RETENTION_EVERY_HOURS, SWEEP_EVERY_HOURS } from "./letters/rules";
import { retentionRunIntervalHours } from "./privacy/retentionCutoff";

// Set CONVEX_ENV=production on the prod deployment, leave unset (or "development") on dev.
// Dev gets much longer intervals to avoid burning resources during development.
const CONVEX_ENV = process.env.CONVEX_ENV;
const VALID_ENVS = ["production", "development"] as const;
if (
	CONVEX_ENV !== undefined &&
	!(VALID_ENVS as readonly string[]).includes(CONVEX_ENV)
) {
	throw new Error(
		`Invalid CONVEX_ENV="${CONVEX_ENV}". Expected one of: ${VALID_ENVS.join(", ")} (or leave unset for development).`
	);
}
const isProd = CONVEX_ENV === "production";

const crons = cronJobs();

// Check for abandoned sessions
crons.interval(
	"check abandoned sessions",
	isProd ? { hours: 6 } : { hours: 12 },
	internal.sessions.checkAbandoned,
	{}
);

// Enforce data retention policies
crons.interval(
	"enforce data retention",
	// Shared with privacy/retention's count, which counts up to the next run.
	{ hours: retentionRunIntervalHours(isProd) },
	internal.jobs.dataRetention.enforce,
	{}
);

// Process account deletions
crons.interval(
	"process account deletions",
	isProd ? { hours: 2 } : { hours: 24 },
	internal.jobs.accountDeletion.purge,
	{}
);

// Retry removing purged accounts from Clerk.
crons.interval(
	"retry clerk user deletions",
	isProd ? { hours: 1 } : { hours: 12 },
	internal.jobs.clerkUserDeletion.sweep,
	{}
);

// Retry deleting ElevenLabs' copy of talks the webhook missed (#595).
// Letters: refresh the pool, place waiting letters, return old ones (letters spec §5.3).
crons.interval(
	"sweep letters",
	isProd ? { hours: SWEEP_EVERY_HOURS } : { hours: 12 },
	internal.letters.sweep.run,
	{}
);

// Letters: reviewed text and old strikes past their time (letters spec §10).
crons.interval(
	"letters retention",
	{ hours: RETENTION_EVERY_HOURS },
	internal.letters.retention.run,
	{}
);

crons.interval(
	"sweep talk provider copies",
	isProd ? { hours: 1 } : { hours: 12 },
	internal.talk.provider.sweep,
	{}
);

// Release talk time reserved by talks whose post-call webhook never came (#596).
crons.interval(
	"sweep open talk time",
	isProd ? { hours: 1 } : { hours: 12 },
	internal.talk.time.sweep,
	{}
);

// Drop xolacer index entries a one-shot removal (pause, deletion) missed (#570).
crons.interval(
	"sweep xolacer index",
	isProd ? { hours: 24 } : { hours: 72 },
	internal.ai.xolacers.embed.sweepIndex,
	{}
);

// Check for gentle return notifications
crons.interval(
	"check gentle return notifications",
	isProd ? { hours: 6 } : { hours: 24 },
	internal.jobs.notificationTriggers.checkGentleReturn,
	{}
);

// Check for pattern nudge notifications
crons.interval(
	"check pattern nudge notifications",
	isProd ? { hours: 1 } : { hours: 12 },
	internal.jobs.notificationTriggers.checkPatternNudge,
	{}
);

// Xolacer conversation lifecycle: open-but-quiet → resting (14d, silent),
// requested-but-unanswered → expired (48h, and the seeker is told).
//
// Six-hourly rather than daily: the sweep's interval is the error bar on the
// expiry span, and a daily pass would let a 48-hour request live 72 hours —
// giving back most of what shortening the span from a week bought. Two bounded
// queries over single-digit rows, so the extra passes cost nothing.
crons.interval(
	"sweep xolacer conversations",
	isProd ? { hours: 6 } : { hours: 72 },
	internal.xolacerChat.sweep,
	{}
);

// Weekly reflectionRank drift audit (Mon 04:00 UTC) — detection only, logs on
// mismatch. See convex/jobs/rankAudit.ts for the repair path.
crons.cron(
	"audit reflection rank aggregate",
	"0 4 * * 1",
	internal.jobs.rankAudit.audit,
	{}
);

// Weekly cohort counts for the Discovery card (Mon 04:00 UTC, right after the
// week it counts has closed). See convex/jobs/cohortCounts.ts and ADR 0004.
crons.cron(
	"count weekly emotion cohorts",
	"0 4 * * 1",
	internal.jobs.cohortCounts.compute,
	{}
);

// Nightly daily quotes generation (midnight UTC)
crons.cron(
	"nightly daily quotes",
	"0 0 * * *",
	internal.jobs.quotesGenerator.generateForNextBatch,
	{ cursor: null }
);

// The daily quote push (B19): profiles whose local slot has come. Mostly an
// empty index read; a quarter hour is how late a slot can be picked up.
crons.interval(
	"send daily quote pushes",
	{ minutes: SWEEP_EVERY_MINUTES },
	internal.dailyQuotes.push.sweep,
	{}
);

// Telegram webhook drift (#765): logs an error when the bot points elsewhere,
// errors or backs up. Never re-points it; does nothing on a deployment with no bot.
crons.interval(
	"check telegram webhook",
	{ hours: 24 },
	internal.outreach.telegram.bot.checkWebhook,
	{}
);

// Revoked Telegram links are deleted 30 days after revokedAt (#767); the chat
// is a stranger again after that.
crons.interval(
	"purge revoked telegram links",
	{ hours: 24 },
	internal.outreach.telegram.lifecycle.purgeRevoked,
	{}
);

// The Resend component's copy of each email (#917, ADR 0004): finished ones
// after 7 days, abandoned ones after 28. Daily, never more often.
crons.interval(
	"clean up sent emails",
	{ hours: 24 },
	internal.outreach.email.retention.cleanup,
	{}
);

// Inbound Telegram updates (#773): rows go 30 days after they arrive; one
// the pool lost is put back after 5 minutes, and failed if it sticks again.
crons.interval(
	"purge old inbound events",
	{ hours: 24 },
	internal.outreach.telegram.retention.purgeOldInbound,
	{}
);
crons.interval(
	"requeue stuck inbound events",
	{ minutes: 5 },
	internal.outreach.telegram.retention.requeueStuck,
	{}
);

export default crons;
