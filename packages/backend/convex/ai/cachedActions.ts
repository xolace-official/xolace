import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import type { ClassificationResult } from "./providers/anthropic";
import {
	CLASSIFIER_MODEL,
	DISTILLER_MODEL,
	extractTextFromResponse,
	getAnthropicClient,
	parseClassificationResponse,
	thinkingOff,
} from "./providers/anthropic";
import {
	EMPTY_CATEGORIES,
	MODERATION_UNAVAILABLE,
	type ModerationResult,
} from "./providers/moderation";

export const moderationAction = internalAction({
	args: { text: v.string() },
	handler: async (_ctx, args): Promise<ModerationResult> => {
		const apiKey = process.env.OPENAI_API_KEY;
		if (!apiKey) {
			return MODERATION_UNAVAILABLE;
		}
		const response = await fetch("https://api.openai.com/v1/moderations", {
			body: JSON.stringify({
				input: args.text,
				model: "omni-moderation-latest",
			}),
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
			},
			method: "POST",
		});
		if (!response.ok) {
			throw new Error(`Moderation API returned ${response.status}`);
		}
		const data = await response.json();
		const result = data.results?.[0];
		if (!result) {
			throw new Error("Moderation API returned no result");
		}
		return {
			categories: { ...EMPTY_CATEGORIES, ...result.categories },
			categoryScores: result.category_scores ?? {},
			flagged: result.flagged ?? false,
		};
	},
});

export const classifierAction = internalAction({
	args: { systemPrompt: v.string(), userPrompt: v.string() },
	handler: async (_ctx, args): Promise<ClassificationResult> => {
		const anthropic = getAnthropicClient();
		const response = await anthropic.messages.create({
			max_tokens: 512,
			messages: [{ content: args.userPrompt, role: "user" }],
			model: CLASSIFIER_MODEL,
			system: args.systemPrompt,
			thinking: thinkingOff(CLASSIFIER_MODEL),
		});
		const raw = extractTextFromResponse(response);
		try {
			return parseClassificationResponse(raw);
		} catch {
			// Retry once with stricter instruction
			const retryResponse = await anthropic.messages.create({
				max_tokens: 512,
				messages: [
					{ content: args.userPrompt, role: "user" },
					{ content: raw, role: "assistant" },
					{
						content:
							"Your response was not valid JSON. Respond with ONLY a valid JSON object, no other text.",
						role: "user",
					},
				],
				model: CLASSIFIER_MODEL,
				system: args.systemPrompt,
				thinking: thinkingOff(CLASSIFIER_MODEL),
			});
			const retryRaw = extractTextFromResponse(retryResponse);
			try {
				return parseClassificationResponse(retryRaw);
			} catch {
				console.error(
					"[classifierAction] retry parse failed. Response length:",
					retryRaw.length,
					"| Raw:",
					retryRaw
				);
				throw new Error(
					"Classification retry failed: model returned non-JSON after two attempts."
				);
			}
		}
	},
});

export const distillerAction = internalAction({
	args: { systemPrompt: v.string(), userPrompt: v.string() },
	handler: async (_ctx, args): Promise<string> => {
		const anthropic = getAnthropicClient();
		const response = await anthropic.messages.create({
			max_tokens: 200,
			messages: [{ content: args.userPrompt, role: "user" }],
			model: DISTILLER_MODEL,
			system: args.systemPrompt,
			thinking: thinkingOff(DISTILLER_MODEL),
		});
		return extractTextFromResponse(response).trim();
	},
});
