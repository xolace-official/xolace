import { httpRouter } from "convex/server";
import { chatCompletions } from "./ai/talk/chatCompletions";
import { lanternPreview, PREVIEW_PATH } from "./library/preview";
import {
	EMAIL_LINK_PATH_PREFIX,
	openAppFromEmail,
} from "./outreach/email/appLinks";
import { RESEND_WEBHOOK_PATH, resendWebhook } from "./outreach/email/webhook";
import { APP_LINK_PATH_PREFIX, openApp } from "./outreach/telegram/appLinks";
import { TELEGRAM_WEBHOOK_PATH } from "./outreach/telegram/botApi";
import { telegramWebhook } from "./outreach/telegram/webhook";
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

// Telegram bot updates (#765). Checks X-Telegram-Bot-Api-Secret-Token against
// the hash `configureBot` stored, and answers 401 on a deployment with no bot.
http.route({
	handler: telegramWebhook,
	method: "POST",
	path: TELEGRAM_WEBHOOK_PATH,
});

// The bot's "Open Xolace" and "Support resources" buttons (#768): a redirect
// into the app's scheme, which Telegram's URL buttons can't open directly.
http.route({
	handler: openApp,
	method: "GET",
	pathPrefix: APP_LINK_PATH_PREFIX,
});

// Links in an email (#915): the same redirect into the app's scheme, which
// mail clients won't open themselves. Records nothing.
http.route({
	handler: openAppFromEmail,
	method: "GET",
	pathPrefix: EMAIL_LINK_PATH_PREFIX,
});

// Resend's delivery events (#916): a hard bounce or a spam complaint stops
// that person's email. The component verifies the Svix signature against
// RESEND_WEBHOOK_SECRET; opens and clicks are never recorded.
http.route({
	handler: resendWebhook,
	method: "POST",
	path: RESEND_WEBHOOK_PATH,
});

// Lantern share previews for xolaceinc.com/lantern/<slug> (read server-side by
// the website): public fields of a live entry only, never its body.
http.route({
	handler: lanternPreview,
	method: "GET",
	path: PREVIEW_PATH,
});

// Mounts POST /webhooks/revenuecat — the component verifies the
// Authorization header against REVENUECAT_WEBHOOK_AUTH, ingests all
// 18 RC event types, and fires the lifecycle hooks in convex/premium.ts.
revenuecat.registerRoutes(http);

export default http;
