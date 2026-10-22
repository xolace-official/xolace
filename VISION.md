# Xolace: Vision and product invariants

> **DRAFT. For the founders to review and complete.** Statements below were derived from the existing `xolace_app` README and engineering notes. Anything marked `TODO(founders)` is a placeholder that still needs a decision. Until this file is approved, treat it as guidance, not as settled rules.

## What Xolace is

Xolace is an emotional processing app: a place for the feelings people can't quite name, which are not "bad enough" for therapy but are more than "everything is fine". The app asks one question, *"What's here right now?"*. The person writes whatever is true, or taps texture words if words won't come. The AI mirrors back what they expressed, more precisely than they could put it, in 1 to 3 sentences. Then the person chooses what's next: a short guided exercise, seeing that strangers have felt something similar, or simply closing the app, having been heard.

The metaphor is a **digital campfire**. You sit by the fire alone. It helps you see what you're carrying, and sometimes you hear quiet voices of strangers who feel what you feel. The fire (the AI) lights and warms but does not take part in the conversation.

## Invariants

Every feature, on every surface (mobile, web, desktop, CLI, admin), must keep these true. A change that breaks one needs the founders' sign-off, not just code review.

1. **Not a chatbot.** No chat bubbles, no conversation threads, no open-ended back-and-forth with the AI.
2. **Not a social network.** No feed, no public profiles, no followers, no public content. Other people appear only as anonymous, distilled echoes.
3. **No forced positivity.** No gamification, no streak guilt, no pressure to come back.
4. **Not clinical.** No diagnoses and no therapeutic terminology. Xolace is not therapy and does not claim to be.
5. **Not a companion.** The AI must not invite a relationship or parasocial attachment. It is infrastructure, not a character.
6. **Privacy first.** People's writing is theirs. Anything shared with others is anonymised first; retention and deletion are honoured. `TODO(founders)`: state the exact promises (what is stored, for how long, who can see it, what "delete" removes).
7. **Safety comes before every other feature.** Content that signals risk is caught and escalated before anything else happens. `TODO(founders)`: define the escalation promise (what the person sees, which resources, in which regions).
8. **Shipped apps keep working.** The backend stays compatible with mobile builds already in people's hands. Nothing is removed while a supported app version still uses it.

## Placeholders for the founders

- `TODO(founders)`: who Xolace is for (and not for), in one or two sentences.
- `TODO(founders)`: the tone of voice for AI output and app copy.
- `TODO(founders)`: what success means for a session (e.g. "felt heard", not time spent in the app).
- `TODO(founders)`: the business-model constraints (e.g. what must never sit behind a paywall).
- `TODO(founders)`: what web, desktop and CLI must offer compared with mobile, and what stays mobile-only.
