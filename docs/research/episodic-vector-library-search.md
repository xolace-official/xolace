# Can the episodic session vector search a shared `library` namespace?

Research for [#545](https://github.com/xolace-official/xolace_app/issues/545) (part of map #497).

## Answer

**Yes, but the vector has to be computed once by us, not taken from today's search.**
`rag.search` accepts a precomputed embedding (`query: number[]`). It does not
hand back the embedding it computed for a string query. So the reuse pattern is:
embed the session text once, then pass that same array to both the personal
episodic search and the `library` namespace search. That makes one embedding
call, not two. Even if we skip reuse, a second embed costs about $0.00001 per
session. The real reason to reuse is latency and the outage path, not money.

## Findings

### 1. The component searches by a precomputed vector

Installed version: `@convex-dev/rag` **0.7.6** (`node_modules/@convex-dev/rag/package.json`).

- `RAG.search(ctx, { namespace, query: string | Array<number>, ...SearchOptions })`.
  The docstring says: "You can provide a query string or target embedding"
  (`node_modules/@convex-dev/rag/src/client/index.ts` ~L364–380).
- If `query` is an array it is used as-is and no `embed()` runs. Only a string
  goes through `embed({ model: this.options.textEmbeddingModel, value })`
  (same file ~L412–424). The README says the same: "`usage` … Will be
  `{ tokens: 0 }` if no embedding was performed (e.g. when passing pre-computed
  embeddings)" (`README.md` L97–98).
- There is no separate `searchWithVector` API. The one `search` method takes either form.
- Limitation: an array query works only with `searchType: "vector"`
  (the default). `"hybrid"` falls back to vector-only with a warning, and
  `"text"` throws (index.ts ~L401–410, SearchOptions docs ~L1210–1220).
- **The return value carries no embedding.** It is `{ results, text, entries, usage }`
  (index.ts ~L382–387). So the vector computed inside today's episodic
  `rag.search(query: rawText)` cannot be captured afterwards. To reuse it, the
  embed has to move up a step, before both searches.
- The model is reachable for that step: `rag.options` is `public`
  (`constructor(public options: {...})`, index.ts L114–116). So
  `embed({ model: rag.options.textEmbeddingModel, value })` from the `ai`
  package produces exactly what `search` would have produced. `ai` is
  currently only a transitive dependency (`ai@7.0.85` in node_modules, peer
  `^7.0.0` of rag). The app's `package.json` does not list it, so a direct
  import should add it with `bunx expo install`/`bun add ai@7`.

### 2. Where the episodic pass embeds today

- `convex/rag.ts`: one shared `RAG` instance, OpenAI `text-embedding-3-small`,
  1536 dims, `filterNames: ["primaryEmotion", "granularLabel", "status"]`.
- `convex/ai/helpers/episodicSearch.ts` `searchEpisodicMemory`:
  `rag.search({ namespace: emotionalProfileId, query: rawText, limit: 4, filters: [status = EPISODIC_STATUS] })`.
  The embed happens implicitly inside this call.
- Callers: `convex/ai/process.ts` (initial pass, in a `Promise.all` with
  moderation and classification) and `convex/ai/clarify.ts` (every refinement
  turn re-searches against the accumulated input).
- **On the first session no episodic search runs** (`context.isFirstSession ? { matches: [] } : searchEpisodicMemory(...)`
  in process.ts). So on that pass no vector exists to reuse. A library search
  there pays its own embed, or the shared pre-embed always runs.
- Constitution placement: the new pre-embed is a model call, so it belongs in
  `convex/ai/` (e.g. next to `episodicSearch.ts` in `convex/ai/helpers/`).
  Other `rag.search` callers (`reflectionAgent/tools.ts`, `insightTools.ts`)
  already live under `convex/ai/`.

### 3. Cost of an extra embed

- OpenAI pricing: `text-embedding-3-small` is **$0.02 per 1M input tokens**
  (https://developers.openai.com/api/docs/pricing; the page lists no batch
  price for embeddings).
- A session input of ~500 tokens costs **$0.00001 per extra embed**. With refinement
  turns (each re-embeds the accumulated input), a 3-turn session is still
  well under $0.0001. Cost does not decide this. What does decide it:
  - **Latency:** an extra provider round trip, though it can run in parallel.
  - **Failure coupling:** one shared embed means one outage path. Today
    `searchEpisodicMemory` returns `{ failed: true }` on any throw, and
    `clarify.ts` relies on `failed` to keep the prior `episodicTopScore`. A
    shared pre-embed must make both searches report `failed` when the embed
    fails, so library results never read as "nothing matched".
- A vector query reports `usage.tokens = 0`. The shared embed's own `usage` is
  the only place token cost shows up.

### 4. A shared namespace next to per-user namespaces

- Namespaces are rows in the component's `namespaces` table, keyed by the
  string name plus `modelId`, `dimension` and `filterNames`
  (`src/component/schema.ts`, `src/component/helpers.ts`
  `namespaceIsCompatible`). A search resolves the name to a `namespaceId`
  first and returns empty if no compatible ready namespace exists
  (`src/component/search.ts` L59–76).
- Isolation is enforced in the vector query itself. Every vector search
  filters on `namespaceId` (`src/component/embeddings/index.ts`,
  `q.eq("namespaceId", namespaceId)`; `namespaceId` is the first of
  `allFilterFieldNames` in `src/component/filters.ts`). A `library` search
  cannot return personal entries, and the reverse holds too. This is the
  same mechanism that already separates `reflection-pool` from personal
  namespaces (`convex/rag.ts`).
- Name collision: personal namespaces are `emotionalProfileId` Convex ids, so
  a literal like `"library"` cannot collide. Export it as a constant, like
  `REFLECTION_POOL_NAMESPACE`.
- Filters: the shared instance requires **all three** declared filter names on
  every `rag.add` (the comment in `convex/rag.ts`; `validateAddFilterValues`,
  index.ts L177). Library adds would either pass the existing sentinels
  (`NO_PRIMARY_EMOTION`, `NO_GRANULAR_LABEL`, a status such as `"published"`)
  or use a **second `RAG` instance** with its own `filterNames` (e.g. kind or
  audience). Both instances must use the same model and dimension. A vector is
  plain numbers, so a vector from either instance's model searches the other
  instance's namespace, as long as `modelId` and `dimension` match (the
  compatibility check only requires the namespace's filter names to be a
  superset of the ones queried, helpers.ts L100–104).
- Privacy: the shared namespace must only ever receive catalogue text (Library
  entry title/body from `library_entries`), written by the library ingest
  path (`convex/library/ingest.ts`), never session or user text. The only
  user-derived thing crossing over is the **query vector**. It is used
  transiently in a vector search and never stored in the shared namespace.
  Keep the rule structural: only library ingest calls `rag.add` with the
  library namespace.

## Recommended shape (not built)

In `convex/ai/helpers/`: `const { embedding } = await embed({ model: rag.options.textEmbeddingModel, value: rawText })`,
then `searchEpisodicMemory(..., embedding)` and a `searchLibrary(ctx, embedding)`
with `namespace: LIBRARY_NAMESPACE`, both taking `query: embedding`. If the
embed throws, both searches return `failed`.
