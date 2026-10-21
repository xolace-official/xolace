# Binding ranks on meaning inside rule gates; it never replaces a gate

Support binding moves from tag/facet overlap to similarity between the
session's text and each candidate's text (Support routing map #497, #548).
Meaning only **ranks** the candidates a rule has already let through. Every
gate stays a rule: the model's chosen topic for audio, the declared specialty
and availability filters for a xolacer, the elevated/crisis cut-off for a
read, and the safety steps of the exercise ladder (gave up, intensity ≥ 8 or
high activation → `reset` first). The old overlap stays as the fallback below a
per-content-type similarity floor. A gate encodes a clinical or editorial
judgement that a score can't make. Word overlap would put a writing exercise in
front of someone in panic, or override the topic the model wrote its `why`
for. So similarity decides order and never eligibility.

## Considered Options

- **Meaning everywhere, gates included** (search all tracks across topics,
  rank all six exercises by similarity). Rejected: it discards the model's
  topic choice and its `why` line, and it lets a similarity score overrule
  clinical ordering.
- **Facets narrow, meaning ranks inside (Library).** Rejected for reads: facets
  aren't safety gates, and narrowing on them brings back the vocabulary gap
  RAG is there to close.

## Consequences

- One shared `rag` instance. Topic scoping is a namespace per topic
  (`track:<topic>`), not a filter, so no second instance is needed.
- Similarity is rounded into 0.05 bands so the history rules from #547
  (re-offer last stretch's tended slug, demote skipped slugs) still have ties
  to break. The binder stays pure: scores are passed in.
- The xolacer is ranked in a read-time action that re-embeds the session and
  stores nothing, keeping the never-stored rule (`ai/xolacers/suggest.sessionSuggestion`).
  The cost is that the suggestion is no longer reactive.
- Kindling re-embeds the session with the model constant from `convex/rag.ts`
  rather than storing the vector. Exercise matching reuses the mirror's vector.
