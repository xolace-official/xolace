import { httpRouter } from "convex/server";
import { chatCompletions } from "./ai/talk/chatCompletions";
import { revenuecat } from "./revenuecat";
import { streamEvents } from "./streamWebhook";
import { postCallWebhook } from "./talk/provider";

const http = httpRouter();

// Stream Chat event webhook — currently `message.new` only. Registered against
// the environment's Stream app by `bun stream:webhook`; the handler verifies
// the HMAC itself, so the route needs no protection of its own.
http.route({
	handler: streamEvents,
	method: "POST",
	path: "/webhooks/stream",
});

// Companion talk brain: the ElevenLabs agent's Custom LLM (base URL
// `<site>/v1`). Checks the shared secret itself.
http.route({
	handler: chatCompletions,
	method: "POST",
	path: "/v1/chat/completions",
});

// ElevenLabs post-call webhook (#595): DELETEs their copy of a talk.
// Verifies the ElevenLabs-Signature HMAC itself.
http.route({
	handler: postCallWebhook,
	method: "POST",
	path: "/webhooks/elevenlabs",
});

// Mounts POST /webhooks/revenuecat — the component verifies the
// Authorization header against REVENUECAT_WEBHOOK_AUTH, ingests all
// 18 RC event types, and fires the lifecycle hooks in convex/premium.ts.
revenuecat.registerRoutes(http);

export default http;
