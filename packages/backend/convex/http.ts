import { httpRouter } from "convex/server";
import { revenuecat } from "./revenuecat";
import { streamEvents } from "./streamWebhook";
import { chatCompletions } from "./ai/talk/chatCompletions";
import { postCallWebhook } from "./talk/provider";

const http = httpRouter();

// Stream Chat event webhook — currently `message.new` only. Registered against
// the environment's Stream app by `bun stream:webhook`; the handler verifies
// the HMAC itself, so the route needs no protection of its own.
http.route({
  path: "/webhooks/stream",
  method: "POST",
  handler: streamEvents,
});

// Companion talk brain: the ElevenLabs agent's Custom LLM (base URL
// `<site>/v1`). Checks the shared secret itself.
http.route({
  path: "/v1/chat/completions",
  method: "POST",
  handler: chatCompletions,
});

// ElevenLabs post-call webhook (#595): DELETEs their copy of a talk.
// Verifies the ElevenLabs-Signature HMAC itself.
http.route({
  path: "/webhooks/elevenlabs",
  method: "POST",
  handler: postCallWebhook,
});

// Mounts POST /webhooks/revenuecat — the component verifies the
// Authorization header against REVENUECAT_WEBHOOK_AUTH, ingests all
// 18 RC event types, and fires the lifecycle hooks in convex/premium.ts.
revenuecat.registerRoutes(http);

export default http;
