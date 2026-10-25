/**
 * The response half of the Custom LLM relay (#591): Anthropic stream events
 * out as OpenAI `chat.completion.chunk` SSE. Pure; the request half is
 * openaiCompat.ts.
 */

export interface ChunkMeta {
	created: number;
	id: string;
	model: string;
}

export type FinishReason = "stop" | "length" | "tool_calls";

export interface OpenAIDelta {
	content?: string;
	role?: "assistant";
	tool_calls?: {
		index: number;
		id?: string;
		type?: "function";
		function: { name?: string; arguments: string };
	}[];
}

/** One `chat.completion.chunk` SSE event. */
export function sseChunk(
	meta: ChunkMeta,
	delta: OpenAIDelta,
	finishReason: FinishReason | null = null
): string {
	const chunk = {
		choices: [{ delta, finish_reason: finishReason, index: 0 }],
		created: meta.created,
		id: meta.id,
		model: meta.model,
		object: "chat.completion.chunk",
	};
	return `data: ${JSON.stringify(chunk)}\n\n`;
}

export const SSE_DONE = "data: [DONE]\n\n";

/** The slice of Anthropic's stream events the relay reads. */
export interface StreamEvent {
	content_block?: { type: string; id?: string; name?: string };
	delta?: {
		type?: string;
		text?: string;
		partial_json?: string;
		stop_reason?: string | null;
	};
	index?: number;
	type: string;
}

/**
 * Per-request: Anthropic numbers every content block, OpenAI numbers only
 * tool calls, so block indexes are remapped as tool calls appear.
 */
export function createEventTranslator() {
	const toolIndex = new Map<number, number>();
	return (
		event: StreamEvent
	): { delta: OpenAIDelta } | { finish: FinishReason } | null => {
		const { index = 0, content_block: block, delta } = event;
		if (event.type === "content_block_start" && block?.type === "tool_use") {
			const i = toolIndex.size;
			toolIndex.set(index, i);
			const call = {
				function: { arguments: "", name: block.name },
				id: block.id,
				index: i,
				type: "function" as const,
			};
			return { delta: { tool_calls: [call] } };
		}
		if (
			event.type === "content_block_delta" &&
			delta?.type === "text_delta" &&
			delta.text
		) {
			return { delta: { content: delta.text } };
		}
		if (
			event.type === "content_block_delta" &&
			delta?.type === "input_json_delta" &&
			toolIndex.has(index)
		) {
			return {
				delta: {
					tool_calls: [
						{
							function: { arguments: delta.partial_json ?? "" },
							index: toolIndex.get(index)!,
						},
					],
				},
			};
		}
		if (event.type === "message_delta") {
			const reason = delta?.stop_reason;
			return {
				finish:
					reason === "tool_use"
						? "tool_calls"
						: reason === "max_tokens"
							? "length"
							: "stop",
			};
		}
		return null;
	};
}
