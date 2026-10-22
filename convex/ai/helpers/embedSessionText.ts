import { embed } from "ai";
import { rag } from "../../rag";

/**
 * Embeds session text once per pass so every consumer of its meaning in that
 * pass — episodic recall, Kindling, exercise matching (#497) — searches with
 * the same vector instead of re-embedding. The xolacer ranker runs in its own
 * action, so it embeds separately, through this same function.
 *
 * The model comes from the shared `rag` instance, never a second copy: a
 * vector from any other model would be searched against namespaces it was
 * never indexed in, and the scores would silently mean nothing.
 *
 * Best-effort: `null` means the embed failed. Callers treat that as "search
 * never ran", never as "nothing matched".
 */
export async function embedSessionText(text: string): Promise<number[] | null> {
  try {
    const { embedding } = await embed({ model: rag.options.textEmbeddingModel, value: text });
    return embedding;
  } catch (error) {
    console.error("embedSessionText failed", error);
    return null;
  }
}
