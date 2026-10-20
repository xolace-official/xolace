import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

// Set CONVEX_ENV=production on the prod deployment, leave unset (or "development") on dev.
// Dev gets much longer intervals to avoid burning resources during development.
const CONVEX_ENV = process.env.CONVEX_ENV;
const VALID_ENVS = ["production", "development"] as const;
if (CONVEX_ENV !== undefined && !(VALID_ENVS as readonly string[]).includes(CONVEX_ENV)) {
  throw new Error(
    `Invalid CONVEX_ENV="${CONVEX_ENV}". Expected one of: ${VALID_ENVS.join(", ")} (or leave unset for development).`,
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
  isProd ? { hours: 24 } : { hours: 72 },
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

// Retry deleting ElevenLabs' copy of talks the webhook missed (#595).
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

export default crons;
