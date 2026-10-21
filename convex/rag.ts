import { RAG } from "@convex-dev/rag";
import { openai } from "@ai-sdk/openai";
import { components } from "./_generated/api";

// =============================================================
// XOLACE — SHARED RAG INSTANCE
// =============================================================
//
// Single source of truth for semantic search, mirroring the
// convex/posthog.ts shared-instance pattern. Import `rag` from
// here anywhere you need to index or query embeddings.
//
// Embeddings use OpenAI text-embedding-3-small (1536 dims).
// Anthropic (our text provider) has no embeddings API, so a
// separate provider is required. OPENAI_API_KEY is read from
// the Convex deployment env automatically.
//
// Namespaces isolate content:
// - Personal emotional memory  → namespace = emotionalProfileId
//   (each user's own mirror history, never cross-user)
// - Peer reflection pool        → namespace = REFLECTION_POOL_NAMESPACE
//   (shared, anonymized; filter on status to drop flagged/removed)
// - Library entries             → namespace = LIBRARY_NAMESPACE
//   (convex/ai/library/embed.ts; sentinel filters, nothing filtered)
//
// filterNames declares which metadata fields can be filtered at
// query time. They must be declared here up front — filtering on
// an undeclared name throws.
//
// IMPORTANT (@convex-dev/rag 0.7.5): every declared filter name must be
// supplied on EVERY rag.add() call, regardless of namespace — the package
// validates presence, not a subset. Fields that don't apply to a given
// namespace use the sentinels below. They are never used as query filters
// in that namespace, so the stored value is inert; it only satisfies the
// add-time contract.
// =============================================================

export const REFLECTION_POOL_NAMESPACE = "reflection-pool";

// No granular label on this entry (personal + pool namespaces alike).
export const NO_GRANULAR_LABEL = "";
// Personal episodic memory never filters on status (a peer-pool concern) —
// EXCEPT to exclude replies. See REPLY_STATUS below.
export const EPISODIC_STATUS = "n/a";
// A daily-quote reply in the personal namespace (ADR 0007). Its own status
// value is the whole mechanism: `searchEpisodicMemory` filters the mirror down
// to EPISODIC_STATUS, so a reply reaches the semantic-profile agent's
// unfiltered search and nothing else.
export const REPLY_STATUS = "reply";
// A reply carries no classification — no mirror ran on it.
export const NO_PRIMARY_EMOTION = "n/a";
// Shared content (the Library, #568) has no moderation status to filter on.
export const NO_STATUS = "n/a";

export const rag = new RAG(components.rag, {
  textEmbeddingModel: openai.embedding("text-embedding-3-small"),
  embeddingDimension: 1536,
  filterNames: ["primaryEmotion", "granularLabel", "status"],
});
