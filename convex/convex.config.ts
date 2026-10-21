import { defineApp } from "convex/server";
import { v } from "convex/values";
import rateLimiter from "@convex-dev/rate-limiter/convex.config.js";
import actionCache from "@convex-dev/action-cache/convex.config.js";
import migrations from "@convex-dev/migrations/convex.config.js";
import pushNotifications from "@convex-dev/expo-push-notifications/convex.config.js";
import posthog from "@posthog/convex/convex.config.js";
import presence from "@convex-dev/presence/convex.config.js";
import workflow from "@convex-dev/workflow/convex.config.js";
import rag from "@convex-dev/rag/convex.config.js";
import revenuecat from "convex-revenuecat/convex.config.js";
import aggregate from "@convex-dev/aggregate/convex.config.js";
import r2 from "@convex-dev/r2/convex.config.js";
import credits from "@clipin/convex-credits/convex.config.js";

const app = defineApp({
  env: {
    POSTHOG_PROJECT_TOKEN: v.string(),
    POSTHOG_HOST: v.optional(v.string()),
    POSTHOG_PERSONAL_API_KEY: v.optional(v.string()),
    POSTHOG_FLAGS_POLLING_INTERVAL_SECONDS: v.optional(v.string()),
  },
});
app.use(rateLimiter);
app.use(actionCache);
app.use(migrations);
app.use(pushNotifications);
app.use(workflow);
app.use(rag);
app.use(revenuecat);
app.use(presence);
// Named so future aggregates (e.g. streak distribution) can be mounted
// alongside this one instead of overloading a single unnamed instance.
app.use(aggregate, { name: "reflectionRank" });
app.use(r2);
// Weekly talk time (#596), reached only through convex/talk/time.ts.
app.use(credits);
app.use(posthog, {
  env: {
    POSTHOG_PROJECT_TOKEN: app.env.POSTHOG_PROJECT_TOKEN,
    POSTHOG_HOST: app.env.POSTHOG_HOST,
    POSTHOG_PERSONAL_API_KEY: app.env.POSTHOG_PERSONAL_API_KEY,
    POSTHOG_FLAGS_POLLING_INTERVAL_SECONDS:
      app.env.POSTHOG_FLAGS_POLLING_INTERVAL_SECONDS,
  },
});

export default app;
