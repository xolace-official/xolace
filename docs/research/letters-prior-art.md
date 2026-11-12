# Prior art: anonymous letters to strangers

Researched 2026-11-12 for [#744](https://github.com/xolace-official/xolace/issues/744) (map [#743](https://github.com/xolace-official/xolace/issues/743)). Facts only; each cites its source in brackets. Founder statements come from press interviews, which quote them directly; the source is named with its date. Gaps (things we looked for and did not find) are listed so nobody mistakes silence for an answer.

## Summary

The products closest to Xolace letters (Kind Words, Koko, Letters to Strangers) all cut the recipient's ability to answer back down to almost nothing, and they all say that this is what keeps trolls away. They disagree about moderation. Kind Words relies mostly on reports and two human moderators. It chose **not** to filter crisis content, because players were afraid of police being sent. Koko and Letters to Strangers check content before or as it is delivered (Koko with ML plus human moderators, L2S with trained volunteers, 1–2 days). Koko also detected people in crisis and sent them to crisis lines. The problems they report are rarely trolls. They are off-topic content, how much moderation costs (a permanent cost for the founders), anonymity leaking through longer exchanges, and, at Koko, a loss of trust when people learned that messages had been machine-assisted. None of them published how they balance letters written against people who want one. The only explicit mechanisms are L2S's "submit one, get one" and Bottled's "deliver to someone active in the last 24h".

## Products examined

| Product | Shape | Closest Xolace analogue |
|---|---|---|
| **Kind Words** (Popcannibal, 2019; Kind Words 2, 2024) | Game. Players post short anonymous *requests* about a worry; other players reply with a letter; thanks is a sticker. Also "paper airplanes": broadcast statements with no reply. | Recipient-initiated letters, one-shot, sticker as wordless thanks |
| **Koko** (Rob Morris; grew out of MIT's Panoply) | Anonymous peer-support network inside messaging apps. Post a struggle, strangers reply with short reappraisals. | Short anonymous encouragement, ML + human moderation, crisis routing |
| **Letters to Strangers (L2S)** | Youth nonprofit. Write an anonymous letter; it is moderated; you get a (different) stranger's letter back. | Pre-delivery human moderation; 1:1 supply mechanic |
| **More Love Letters** | Someone nominates a person; strangers mail letters; volunteers bundle and deliver. | Third-party-chosen recipient; post-hoc screening by facilitators |
| **Bottled** (Pierre Delannoy / Honi Inc.) | "Message in a bottle" to one random recipient; keeping it opens a chat. | Counter-example: random routing that turns into a conversation |

Mind's "Dear Stranger" (2015) turned out to be a published book of letters from famous authors, not an exchange, so it is not covered further [mind-ds].

## 1. Who receives a letter, and when

- **Kind Words**: the person who wants a letter asks for one. Players post a request and anyone can answer it with a letter [kw-steam]. Players pick from a list of requests [mcv-2020]. The founder built it this way because in his earlier game, *Elegy for a Dead World*, backend stats showed few people read others' writing, so in Kind Words "each piece [is] written for a specific reader" [inverse-2023]. Unprompted "airplanes" fly over other players' rooms with no named recipient [kotaku-2019][gol-2019].
- **Koko**: every interaction is "post-response"; a bot relays messages between help-seekers and helpers. There are no repeat interactions between the same users [jmir-2018]. Panoply, its research predecessor, paid ~1,000 Mechanical Turk workers to top up replies so that posts made in the middle of the night still got answers [mit-2015].
- **Letters to Strangers**: letters are "(for the most part) randomized" and anonymous, "message-in-a-bottle", not pen pals. Online, each approved letter you submit gets a stranger's letter back, which is not a reply to yours [l2s-faq]. Some letters are curated into bundles for hospitals and juvenile prisons [l2s-faq].
- **More Love Letters**: a third party nominates the recipient with a paragraph about why; the team picks some stories and posts 5–6 a month as requests with a deadline, then bundles all letters and delivers them [mll-requests][mll-home]. It "cannot get to all nominations"; the same person can be re-nominated after 8 weeks [mll-faq-search].
- **Bottled**: each bottle goes to one recipient who "used the app within the past 24 hours"; users get about 4–5 bottles a day; if a bottle sits unopened for over 24h the sender can re-release it manually (auto-release "planned") [bottled-faq]. "Holiday mode" stops bottles reaching you [bottled-faq].
- **Gap**: none of these publish a matching algorithm that targets *what helps the recipient*. Kind Words and Koko match on the recipient's own request. L2S, Bottled and More Love Letters are random or chosen by staff. The 2018 Koko paper's *bot* retrieved past peer responses by embedding similarity to the user's post [jmir-2018], the only content-based matching found.

## 2. What the recipient can do back

- **Kind Words**: a recipient can send a sticker as thanks; there are no visible counts or popularity numbers. "I put none of that into the original Kind Words" [kw-steam][inverse-2023]. Responders get no visible reaction [kotaku-2019]. Recipients can report a letter [kotaku-2019]. Kind Words 2 added short live exchanges but capped them: "limited to six total lines – three couplets in an exchange", then "it's gone" [aftermath-2023]. Longer pen-pal exchanges were turned down because they could reveal identities and lead to contact outside the game [inverse-2023].
- **Koko**: a recipient rates each response good / ok / bad. Ratings are hidden from everyone else [jmir-2018].
- **L2S**: no reply mechanism; letters are one-time so nobody is obliged to answer [l2s-faq].
- **More Love Letters**: none described; it is "not a pen pal program" and writers must not include contact details [mll-faq-search].
- **Bottled**: keep (opens a chat with text, photo, voice) or release to someone else [bottled-store]. This is the dating/friend-app shape, and its guidelines then have to ban endearments, compliments and swapping social handles [bottled-store reviews][bottled-faq].
- **Reported effect of capping replies (Kind Words)**: "The limited capability for response also cuts down on trolling", because trolls can't see whether their message landed [inverse-2023].

## 3. Moderation before and after delivery

- **Kind Words**
  - Reports are the main input; in-game copy says it is "not a place for mean jokes, bullying, or flippant responses" [kotaku-2019]. A 2019 review says a word list sends some letters to moderation before approval [gol-2019] (secondary; the founder did not confirm it in what we read).
  - Two people (the founder and the artist) made about 380,000 moderation decisions over five years, using an admin panel with "a lot of levers" [substack-2024]. "So much of my development time is spent on the moderation systems, both automated tools and manual decisions" [inverse-2023].
  - "Primarily we moderate content, not people." Outright bans caused more problems than they solved: the anger moved to Steam, Discord and elsewhere [substack-2024]. They now steer people back on topic and change "how much gets through, when and where it's not working right" [substack-2024].
  - Business decisions were made with moderation in mind: few giveaways and no deep discounts, because these would cause a "real moderation headache" [inverse-2023].
- **Koko**: "All peer interactions on Koko were supervised by a hybrid human-machine moderation system"; neural nets detected abuse, inappropriate contributions and users in crisis; malicious users were banned; responses trying to move the chat to other platforms were removed [jmir-2018]. Posts were capped at 950 characters, responses at 600 [jmir-2018].
- **L2S**: every online letter is read in full by trained moderators (they pass a "Moderator Test") **before** delivery, usually within 1–2 days [l2s-faq]. Letters can be rejected for not following the guidelines [l2s-search].
- **More Love Letters**: bundle facilitators open each letter and check it isn't harmful before it reaches the recipient. They also remove money and gifts, and decide whether faith-based letters fit that recipient [mll-faq].
- **Bottled**: content is flagged, then confirmed by a "monitoring team". A confirmed flag sets the sender's reputation to zero; repeat offences lead to a ban; multiple accounts lead to all of them being terminated; appeals go by email [bottled-faq].

## 4. Abuse and low-effort letters

- **Trolling was rare at Kind Words**: about 3% of 500k+ letters needed action, mostly for being off-topic [kotaku-2019]; the founder put it at 97% helpful in 2020 [mcv-2020]. "The more obvious the troll is, the quicker the community reports them" [kotaku-2019]. They had not planned for trolls at all before launch [mcv-2020].
- **The real problem was off-topic content**: favourite quotes, song lyrics, poems and anime chat in the request space [mcv-2020][aftermath-2023]. Their fix was to build places for it rather than ban it: airplanes, and later Kind Words 2 spaces like a poetry slam [mcv-2020][aftermath-2023]. Airplanes also gave players somewhere to go when requests got "a little too real, a little too heavy" [mcv-2020].
- **Predators**: "We want to avoid being a good place for predation." Spaces that invite vulnerability attract exploitation [inverse-2023].
- **Low effort**: the founder argues platitudes ("you'll be alright, I believe in you") "can really mean the world to someone" [substack-2024]. Koko found that recipients rated responses lower when told a machine wrote them (51% vs 60.6% "good") [jmir-2018]. **Gap**: no product published a rule against short or generic letters as such.
- **Self-promotion / contact-fishing**: banned at Bottled ("follow me on instagram") [bottled-faq], removed at Koko [jmir-2018], forbidden at More Love Letters [mll-faq-search].

## 5. People in crisis, on either side

- **Kind Words chose not to filter.** Players "confess" self-harm and suicidal thoughts regularly. Some use euphemisms like "unalive" to get past automatic removal. Some emailed asking not to have police sent ("Please don't send the cops after me. I can't do that again."), which "solidified my resolve that we're not going to filter" [substack-2024]. "I'm not equipped to give responses to these people. Most of our players aren't… But everyone's equipped to hear things"; when other players report someone in crisis, "there's almost nothing I can do" [substack-2024]. They consulted therapists; the founder's minimum bar is that the game never makes someone's worst feelings worse [inverse-2023]. Neither the Steam page nor the interviews we read mention crisis resources [kw-steam][substack-2024].
- **Koko detected and routed.** Users at risk "were referred to crisis resources" [jmir-2018]. Its crisis classifier was published [kshirsagar-2017]. An RCT (Jaroszewski, Morris & Nock 2019) took users whose posts an ML classifier flagged as a current crisis and tested a short automated "barrier reduction" step, which increased the use of crisis services [jaroszewski-2019][nct03633825]. In 2023: "users at higher risk are always directed to crisis lines and other resources" [nbc-2023].
- **Senders in crisis**: the same people write and read in every product. L2S's founder wrote her own first letters at 14, after a suicide attempt [edsurge-2023]. **Gap**: no product described a separate check on *senders* in crisis (e.g. someone writing a "letter" that is really their own disclosure).
- **Helping helps the helper**: on a Koko-style peer platform, people who put more effort into helping others showed larger drops in depression, mediated by using reappraisal more in daily life. Messages with more second-person ("you") language drew more gratitude [dore-2017].
- **Bottled** lists no crisis resources or safety guidance [bottled-faq].

## 6. Balance between letters written and people who want one

- **L2S**: a fixed 1:1 rule online: submit one approved letter, receive one [l2s-faq]. Letters mailed on paper get nothing back [l2s-faq].
- **More Love Letters**: demand is capped on purpose (5–6 recipients a month, with a deadline) and nominations are turned down [mll-home][mll-faq-search].
- **Koko / Panoply**: when there weren't enough peer replies, paid crowd workers filled in [mit-2015]. A 2018 corpus had 72,785 posts and 339,983 responses (≈4.7 per post, our arithmetic) [jmir-2018].
- **Bottled**: each bottle goes to one recently active person, ~4–5 per user per day [bottled-faq]; one reviewer blamed a low bottle count on other users' settings [bottled-store].
- **Kind Words**: no published ratio. The founder expected about 20k messages in total and saw about 1.6M by 2020; the backend struggled [mcv-2020][gol-2019]. The motive for replying is "the echo of however it's going to come back to you" [substack-2024].
- **Gap**: nobody published what happens to an unanswered request or an undelivered letter (expiry, re-routing) beyond Bottled's manual re-release.

## 7. What went wrong

- **Kind Words**: barely tested before release, because testing with friends would have exposed their private struggles [mcv-2020]. The backend was built for about 20k messages and got about 1.6M [mcv-2020]. Banning people pushed the problem to other platforms [substack-2024]. Unofficial Discord and subreddit spaces formed, and the founder had to take them over [substack-2024]. Moderation is a cost with no end: "we're basically moderating for the rest of my natural life", on a model with "no subscription fee" [substack-2024]. If the game were split into smaller communities, "anonymity would crumble pretty quickly" [substack-2024]. Streamers reading letters on air made some players uncomfortable [kotaku-2019].
- **Koko**: in 2022–23, about 4,000 people got replies co-written with GPT-3. They were rated higher, but "Simulated empathy feels weird, empty", and Koko "pulled this from our platform pretty quickly". There was a public consent controversy; the only opt-out was to skip reading the message. Koko then looked at a third-party IRB process [nbc-2023].
- **L2S**: its founder describes a student tearing up a letter left for him [edsurge-2023]. An unsolicited letter is not always welcome.
- **Bottled**: reviewers call the conduct rules restrictive and vague, and the app better for brief chats than lasting connections [bottled-store].

## Implications for Xolace letters (risks and options, not decisions)

- **Letting the recipient answer is what brings trouble.** Every product that allowed a reply had to fight anonymity leaks and contact-fishing (Bottled, Kind Words 2's cap). The settled "one wordless acknowledgement" matches the shape Kind Words and Koko credit with keeping trolls out. Option: show the sender *that* a letter was acknowledged but not who or when, or show nothing; Kind Words shows nothing to the responder.
- **Which crisis policy we pick depends on whether letters are requested.** Kind Words could choose not to filter because the person in crisis wrote the *request*; Xolace letters go to a recipient Xolace picks, so the risky moments are (a) a sender who discloses their own crisis inside a letter and (b) delivering something heavy to someone already fragile. Options: pre-delivery check (L2S, More Love Letters, Koko-style ML + human), crisis routing for the sender (Koko), and never making the recipient responsible for the sender. Risk to weigh against invariant 7: the Kind Words players' fear that filtering means police at the door.
- **Most moderation work is off-topic content, not trolls.** Expect lyrics, quotes, poems and self-disclosure posted as "letters". Option: give that content somewhere else to go (Kind Words airplanes) or a clear rejection reason, rather than banning people.
- **Banning people is risky; moderating content worked better** for Kind Words. Bottled bans and resets reputation instead. Either way, an admin view is probably needed (Kind Words: two humans, 380k decisions in five years).
- **Two humans can't keep up with moderation as volume grows.** Kind Words hit 80× its expected volume. The pre-delivery check needs to be automatic first, with humans handling the uncertain cases.
- **Supply**: options seen are 1:1 exchange (L2S), capped demand (More Love Letters), and paid or seeded fill-in (Panoply's MTurk). L2S's "write one, get one" ties receiving to writing, which may conflict with "free for everyone" and with letters going to whoever they would help most. Seeding letters at launch looks like Panoply's paid fill-in, and Koko shows that undisclosed machine help kills trust. Any seeded or assisted letter must be honest about where it came from.
- **Writing a letter likely helps the sender** [dore-2017], which supports counting it as showing up. Invariant 3 still forbids rewarding volume.
- **Rewards attract gaming**: Kind Words left out counts on purpose. Bottled's reputation points come with bans for running multiple accounts.

## Sources

- [kw-steam] Kind Words Steam page. https://store.steampowered.com/app/1070710/
- [kw2-steam] Kind Words 2 Steam page. https://store.steampowered.com/app/2118120/
- [substack-2024] Will Ard, "A Conversation with Ziba Scott on Digital Community, Games, and Connection", Circuits & Synapses, 2024-11-19. https://technotherapies.substack.com/p/a-conversation-with-ziba-scott-on
- [inverse-2023] Robin Bea, "How Kind Words 2 Gives Players 'An Opportunity To Be Nicer'", Inverse, 2023-12-27. https://inverse.com/gaming/kind-words-2-ziba-scott-interview
- [aftermath-2023] Nathan Grayson, "Kind Words, A Pandemic Darling, Gets Sequel In Very Different Times", Aftermath, 2023-12-13. https://aftermath.site/kind-words-a-pandemic-darling-gets-sequel-in-very-different-times/
- [mcv-2020] Chris Wallace, "'If we released this game now, everyone would assume it was about the quarantine'", MCV/DEVELOP, 2020-09-07. https://mcvuk.com/business-news/if-we-released-this-game-now-everyone-would-assume-it-was-about-the-quarantine-why-kind-words-might-be-the-perfect-lockdown-game
- [kotaku-2019] Nathan Grayson, "Kind Words, A Game About Sending Nice Letters To Strangers, Is Successfully Resisting Trolls", Kotaku, 2019-12-19. https://kotaku.com/kind-words-a-game-about-sending-nice-letters-to-strang-1840537946
- [gol-2019] Liam Squires-Hand, GamingOnLinux review, 2019-09-14 (secondary; cited only for the word-list claim and the launch server strain). https://www.gamingonlinux.com/2019/09/kind-words-a-pretty-sweet-experience-about-sending-and-receiving-anonymous-letters
- [jmir-2018] Morris, Kouddous, Kshirsagar, Schueller, "Towards an Artificially Empathic Conversational Agent for Mental Health Applications", JMIR 2018;20(6):e10148. https://pmc.ncbi.nlm.nih.gov/articles/PMC6039770
- [kshirsagar-2017] Kshirsagar, Morris, Bowman, "Detecting and Explaining Crisis", CLPsych 2017. https://arxiv.org/abs/1705.09585
- [jaroszewski-2019] Jaroszewski, Morris, Nock, "Randomized controlled trial of an online machine learning-driven risk assessment and intervention platform for increasing the use of crisis services", J Consult Clin Psychol 2019;87(4):370–379, doi:10.1037/ccp0000389 (abstract-level only; full text not retrieved).
- [nct03633825] ClinicalTrials.gov NCT03633825. https://clinicaltrials.gov/study/NCT03633825
- [dore-2017] Doré, Morris, Burr, Picard, Ochsner, "Helping Others Regulate Emotion Predicts Increased Regulation of One's Own Emotions and Decreased Symptoms of Depression", PSPB 2017;43(5):729–739. https://www.media.mit.edu/publications/helping-others-regulate-emotion-predicts-increased-regulation-of-one-s-own-emotions-and-decreased-symptoms-of-depression/
- [mit-2015] MIT News, "Crowdsourced depression tool" (Panoply), 2015-03-30. https://news.mit.edu/2015/crowdsourced-depression-tool-0330
- [nbc-2023] David Ingram, "ChatGPT used by mental health tech app in AI experiment with users", NBC News, 2023-01-14 (Rob Morris quotes). https://www.nbcnews.com/tech/internet/chatgpt-ai-experiment-mental-health-tech-app-koko-rcna65110
- [l2s-faq] Letters to Strangers FAQ. https://www.letterstostrangers.org/faq
- [l2s-search] Letters to Strangers site (guidelines / rejection wording). https://letterstostrangers.org/
- [edsurge-2023] Nadia Tamez-Robledo, "How Writing 'Letters to Strangers' Helps Students…", EdSurge, 2023-03-22. https://edsurge.com/news/2023-03-22-how-writing-letters-to-strangers-helps-students-who-need-mental-health-support
- [mll-home] More Love Letters home. https://moreloveletters.com/
- [mll-requests] More Love Letters, The Love Letter Requests. https://www.moreloveletters.com/the-letter-requests
- [mll-faq] More Love Letters FAQ (2017). https://www.moreloveletters.com/diary/2017/11/29/2017-11-29-frequently-asked-questions
- [mll-faq-search] More Love Letters site text on nominations / contact info (get-involved and FAQ pages). https://www.moreloveletters.com/get-involved
- [bottled-store] Bottled on the App Store (description and reviews). https://apps.apple.com/us/app/bottled-message-in-a-bottle/id1106327189
- [bottled-faq] Bottled FAQ. https://bottledapp.com/faq
- [mind-ds] Mind, "'Dear Stranger' is published today, in aid of Mind". https://www.mind.org.uk/news-campaigns/news/dear-stranger-is-published-today-in-aid-of-mind/

## Not found

- How Kind Words picks which requests a player sees, how many replies a request can receive, and whether requests expire.
- Any product's stated policy on short, generic or low-effort letters.
- Any product's handling of account deletion for already-delivered letters.
- A Kind Words or Bottled postmortem beyond the interviews above. No GDC talk on Kind Words was found.
