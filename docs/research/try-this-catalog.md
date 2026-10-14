# Try-this catalog: which off-app actions go in (#560)

Research for the `try_<slug>` catalog family decided in #546 (see "try-this
twig" in `CONTEXT.md`). Each candidate is something a person can do tonight or
this week, away from the app. Each one cites the evidence that it eases an
emotional load and carries `emotions`/`themes` tags from the vocabulary already
in `convex/ai/paths/catalog.ts`.

**34 candidates.** Every one of the 12 existing emotions is covered. 78 of the
120 existing themes are used. Two new theme tags are proposed (marked **NEW**).

## Ground rules applied

- **Excluded by #546:** medication, diet (this rules out caffeine, alcohol and
  "eat regular meals" tips, even though NHS pages give them), diagnosis,
  reaching a specific person (`bridge` / `xolacer` own that), crisis resources,
  and anything costly or hard to undo.
- **Evidence strength** is marked on each entry:
  - **strong**: a meta-analysis or Cochrane review shows an effect on distress
    (depression, anxiety, stress, anger) or on sleep.
  - **moderate**: one RCT, a small or mixed meta-analysis, or NHS guidance
    backed by an evidence-based therapy component.
  - **weak**: NHS or self-help guidance only, or the evidence is indirect.
- Effect sizes come from the abstracts. Most trials ran the activity as a
  repeated program (weeks). A single evening of it is a smaller dose than the
  trials tested. The wording below asks for a first step tonight, or a few
  repeats this week.
- Slugs avoid overlap with in-app kinds. Off-app slow breathing is left out:
  `breathing` already covers it in-app.

## Candidates

### Sleep and winding down

| slug | wording (as offered) | evidence | strength | emotions | themes |
|---|---|---|---|---|---|
| `try_screens_off_hour` | Put your phone and screens away an hour before bed tonight. | NHS sleep tips: "Try not to use phones, tablets or computers for an hour before bed" [N1]. Sleep-hygiene review: individual recommendations are associated with better sleep, though each one is largely untested on its own in the general population [8]. | moderate | anxiety, numbness | screens, winddown, sleep, racing-thoughts |
| `try_same_wake_time` | Get up at the same time tomorrow, even if tonight is a rough one. Keep it for the week. | NHS insomnia self-help: go to bed and wake up at the same time every day [N2]. NHS sleep tips: keep similar times even on non-work days [N1]. Regular timing is one of the recommendations reviewed in [8]. | moderate | anxiety, sadness | consistency, sleep, exhaustion |
| `try_get_up_after_20` | If you're still awake after about 20 minutes, get up, do something quiet in dim light, and go back to bed when you feel sleepy. | NHS sleep tips: if you're still awake after about 20 minutes, get up and do something relaxing [N1][N2]. This is the stimulus-control step from CBT for insomnia. | moderate | anxiety | sleep, racing-thoughts, restlessness, arousal |
| `try_warm_bath_before_bed` | Have a warm shower or bath an hour or two before bed. | Meta-analysis, 17 studies: a 40–42.5 °C shower or bath 1–2 h before bed, for as little as 10 min, shortened the time taken to fall asleep and improved self-rated sleep quality [1]. | moderate | anxiety, numbness | winddown, unwinding, tension, sleep |
| `try_tomorrow_list` | Before bed, write down what tomorrow needs, so it sits on paper rather than in your head. | RCT with polysomnography (n=57): writing a to-do list before bed meant falling asleep faster than writing a list of completed tasks, and more specific lists worked better [2]. Also NHS sleep tips [N1]. | moderate | anxiety, confusion | racing-thoughts, overload, sleep, winding-down |

### Rest and recovery

| slug | wording | evidence | strength | emotions | themes |
|---|---|---|---|---|---|
| `try_stop_work_at_set_time` | Pick a time to stop working tonight and stop then. Close the laptop and mute work notifications. | Meta-analysis, 91 samples (n=38,124): detaching from work after hours is linked to better mental health and well-being. Doing work in leisure time had a medium negative link with detachment [3]. Interventions raise detachment (d≈0.36) [4]. | moderate | anxiety, numbness | work, burnout, exhaustion, pressure, depletion |
| `try_day_off` | Take one day off this week that is actually off, with no catching up. | Same detachment evidence [3][4]. NHS: "set aside regular time for yourself" [N3]. *Curation note:* a day of leave costs something. Offer it only when the user's own words point to burnout. | weak–moderate | numbness, sadness | burnout, exhaustion, recovery, permission |
| `try_time_for_yourself` | Block out one evening (or an hour) this week that's only yours, and protect it. | NHS stress tips: "set aside regular time for yourself" [N3]. Detachment evidence [3]. | weak | numbness, sadness | depletion, exhaustion, permission, too-much |

### Moving the body

| slug | wording | evidence | strength | emotions | themes |
|---|---|---|---|---|---|
| `try_brisk_walk` | Go for a 15–20 minute brisk walk today. | Umbrella review, 97 reviews and 1,039 trials: physical activity reduced depression (median ES −0.43), anxiety (−0.42) and distress (−0.60) [5]. Cochrane: exercise moderately reduces depressive symptoms [6]. NHS exercise for depression [N4]. | strong | sadness, anxiety, numbness | low-mood, low-energy, stuck, tension, momentum |
| `try_green_walk` | Walk somewhere green (a park, trees, water) for 20 minutes or more, with your phone away. Aim for about two hours of it across the week. | RCT: a 90-minute nature walk lowered rumination and sgPFC activity, and an urban walk did not [7]. 120+ min/week in nature is associated with good health and well-being (n=19,806, cross-sectional) [9]. Meta-analysis: greenspace is linked to lower salivary cortisol and heart rate [10]. | moderate–strong | anxiety, sadness | rumination, racing-thoughts, disconnection, grounding, openness |
| `try_gentle_stretch` | Spend 10–15 minutes on slow stretching or gentle yoga before bed. | Meta-analysis of 12 RCTs: moderate evidence that yoga reduces depression short-term (SMD −0.69 vs usual care) [11]. Slow-flow yoga is among the arousal-lowering activities that reduced anger [12]. | moderate | sadness, anxiety, anger | tension, release, softening, held-in |
| `try_muscle_release` | Lie down and work from feet to face: tense each muscle group for a few seconds, then let it go. | Meta-analysis of 27 studies: relaxation training (including progressive muscle relaxation) reduced anxiety, d≈0.51–0.57 [13]. PMR lowered anger [12]. | strong | anxiety, fear, anger | tension, release, arousal, unwinding |

### Noticing and settling

| slug | wording | evidence | strength | emotions | themes |
|---|---|---|---|---|---|
| `try_mindful_minutes` | Sit for 10 minutes and notice your breath and the sounds around you. When your mind wanders, bring it back. Try it on a few days this week. | Meta-analysis of 47 RCTs with active controls: mindfulness programs gave moderate evidence of reduced anxiety (ES 0.38) and depression (0.30) [14]. NHS mindfulness [N5]. | strong (as a program) | anxiety, confusion | quiet-mind, presence, awareness, racing-thoughts, stillness |
| `try_mindful_everyday` | Do one everyday thing slowly and on purpose (a shower, washing up, a cup of tea), noticing how it actually feels. | NHS mindfulness: "notice the everyday", e.g. the food you eat or the air as you walk [N5]. Rests on the same evidence base as [14]. | weak | numbness, confusion | disconnection, going-through-motions, noticing, presence |
| `try_name_the_feeling` | When the feeling rises, silently label it: "this is anxiety", "this is anger". Then go back to what you were doing. | NHS mindfulness: "name thoughts and feelings" [N5]. NHS anger: use mindfulness to notice anger early [N6]. | weak | anxiety, anger, confusion | noticing, awareness, spiraling |

### Anger

| slug | wording | evidence | strength | emotions | themes |
|---|---|---|---|---|---|
| `try_cool_off_before_reply` | Before you answer the message or moment that made you angry, step away for 20 minutes and do something calming. Don't vent, and don't go for a run. | Meta-analysis, 154 studies (n=10,189): arousal-lowering activities (time-out, slow breathing, PMR, mindfulness) reduced anger. Arousal-raising ones did little, and jogging could increase it [12]. NHS: "give yourself time to think before reacting" [N6]. | strong | anger, disgust | conflict, resentment, injustice, held-in |

### Worry and problems

| slug | wording | evidence | strength | emotions | themes |
|---|---|---|---|---|---|
| `try_worry_time` | Set 15 minutes this evening as worry time. Write the worries down then, and during the day tell them "later". | NHS Every Mind Matters: worry time and postponing worries [N7]. Stimulus-control component of CBT for generalised worry. | moderate | anxiety, fear | worry, rumination, spiraling, overanalysis, dread |
| `try_one_problem_steps` | Take the one problem that's loudest. Write the options, pick one, and decide when you'll do the first step this week. If it's not something you can act on, set it down for tonight. | NHS problem-solving and worry-tree technique [N7][N8]. Meta-analysis of 30 RCTs: problem-solving therapy reduces depression, with effects comparable to other psychotherapies [15]. | moderate | confusion, anxiety | indecision, overload, stuck, clarity, simplification |
| `try_drop_one_thing` | Look at this week's list and drop, delay or shrink one thing. | NHS stress tips: "prioritise… let less important ones wait", "focus on what you can control" [N3]. | weak | anxiety, confusion | overwhelm, too-much, pressure, overload, simplification |

### Writing it out

| slug | wording | evidence | strength | emotions | themes |
|---|---|---|---|---|---|
| `try_expressive_writing` | On a few nights this week, write for 15–20 minutes about what's weighing on you: the feelings, not only the events. You can throw it away after. | Meta-analysis of 146 RCTs: experimental disclosure has a small but significant positive effect (r=.075) [16]. *Caveat:* people often feel worse right after a session, and the benefit shows later. | moderate (small effect) | sadness, anger, shame, confusion | held-in, letting-go, catharsis |
| `try_unsent_letter` | Write a letter to the one you've lost, saying what you didn't get to say. It isn't sent. | RCT with bereaved adults: sense-making and benefit-finding writing reduced some grief and distress outcomes compared with control writing [17]. Rests on the disclosure base [16]. Never sent, so it does not reach a specific person. | weak–moderate | grief, sadness, love | loss, missing-someone, death, regret |
| `try_friend_voice` | Write down the harshest thing you've told yourself today. Then write what you'd say to a friend who said it about themselves. | NHS reframing unhelpful thoughts (CBT) [N9]. Self-compassion meta-analysis of 27 RCTs: moderate effects on self-criticism, depression and anxiety (g 0.56–0.75), and a large effect on rumination [18]. | moderate | shame, guilt | self-criticism, not-enough, self-talk, perspective |
| `try_self_compassion_letter` | Write yourself a short letter about the thing you're hard on yourself for, the way a kind friend would write it. | Self-compassion intervention meta-analysis [18]. | moderate | shame, guilt, sadness | self-compassion, regret, should-be-over-this, acceptance |
| `try_three_good_things` | Tonight, write three things that went OK today and why. | NHS stress tips: "notice and write down three good things each day" [N3]. Meta-analysis of 27 studies: only a *small* effect on depression and anxiety versus active controls [19]. Fits light-load days, not heavy ones. | weak–moderate | joy, sadness | gratitude, heaviness, low-mood, warmth |

### Doing something (behavioural activation)

| slug | wording | evidence | strength | emotions | themes |
|---|---|---|---|---|---|
| `try_one_enjoyable_thing` | Pick one small thing you used to enjoy, put it in a time slot this week, and do it even if you don't feel like it. | Meta-analysis of 26 RCTs: behavioural activation reduces depression (SMD −0.74 vs controls) [20]. | strong | sadness, numbness | low-mood, anhedonia, flatness, going-through-motions, momentum |
| `try_five_minute_start` | Take the task you've been avoiding and do five minutes of it. You can stop after. | Graded-task element of behavioural activation [20]. NHS: "set small targets you can easily achieve" [N6]. No direct trial of this step for procrastination. | weak | anxiety, shame, fear | avoidance, stuck, momentum, self-talk |
| `try_make_something` | Spend half an hour making something: draw, write, play or sing, build or fix something. | WHO scoping review (3,000+ studies): arts engagement supports prevention and management of mental ill health [21]. Mixed study designs. | moderate | sadness, numbness, joy | disconnection, playfulness, catharsis, delight |
| `try_learn_something` | Spend 20 minutes learning something new: a few words of a language, a how-to, a skill you've meant to try. | NHS five steps to mental wellbeing: "learn new skills" [N10]. | weak | numbness, sadness | stuck, renewal, possibility, drive |
| `try_savour_moment` | When something good happens this week, stop and stay with it for a minute instead of moving straight on. | NHS five steps: "pay attention to the present moment" [N10]. NHS mindfulness [N5]. No direct primary source was verified for savouring. | weak | joy, love | delight, lightness, warmth, presence |

### Giving and belonging (no specific person)

| slug | wording | evidence | strength | emotions | themes |
|---|---|---|---|---|---|
| `try_small_kindness` | Do one small kind thing this week: help a neighbour, thank someone properly, hold the door. | Meta-analysis of 27 studies (n=4,045): acts of kindness raise the actor's well-being (δ=0.28), short-term only [22]. NHS: "give to others" [N10][N3]. | moderate | sadness, shame, love | not-enough, warmth, loneliness |
| `try_join_a_group` | Go to one free local group built around something you like: a walking group, choir, class or library event. | NHS loneliness: "join a group" [N11]. Loneliness meta-analysis: interventions work, but ones that only add social contact work less well than ones that tackle lonely thinking [23]. | weak–moderate | sadness, love | loneliness, isolation, relationships, disconnection |
| `try_volunteer_once` | Find one volunteering slot this week, even a one-off. | NHS loneliness and five steps both suggest volunteering [N11][N10]. Kindness evidence [22]. | weak | sadness, numbness | loneliness, isolation, not-enough, drive |

### Media

| slug | wording | evidence | strength | emotions | themes |
|---|---|---|---|---|---|
| `try_news_at_set_times` | Check the news once or twice today at set times, and not in the hour before bed. | Survey, n=4,675: 6+ hours/day of media exposure to a collective trauma was linked to more acute stress than being there in person [24]. NHS: consider limiting news time [N12]. Observational evidence only. | weak–moderate | anxiety, fear | dread, uncertainty, vigilance, spiraling, **NEW: `news`** |
| `try_social_media_break` | Take a week off social media, or cap it at about 30 minutes a day. | RCT (n=143): capping use at 10 min per platform per day for 3 weeks reduced loneliness and depression [25]. RCT (n=154): a one-week break improved well-being, depression and anxiety [26]. | moderate | sadness, anxiety, shame | loneliness, insecurity, not-enough, screens, **NEW: `comparison`** |

## Coverage

**Emotions:** all 12 are covered. Thin spots:
- `disgust`: 1 (`try_cool_off_before_reply`, and only through anger).
- `love`: 4 (`try_unsent_letter`, `try_savour_moment`, `try_small_kindness`, `try_join_a_group`).
- `joy`: 3 (`try_three_good_things`, `try_make_something`, `try_savour_moment`).
- `grief`: 1 (`try_unsent_letter`). Walks and BA help in grief too, but this
  list doesn't tag them with it, since no grief-specific trial was found for them.

**Themes left uncovered (42 of 120)**, grouped by the catalog entry they come from:
- Grief/healing: `after-something-hard`, `rebuilding`, `gentleness`, `quiet-sorrow`, `melancholy`, `longing`, `distance`.
- Relationship strain: `drift`, `gap`, `blamelessness`, `repair`. These almost all involve a specific person, so they belong to `bridge`/`xolacer`.
- Anxiety: `masking`, `anticipation`, `nervousness`, `unease`, `support`.
- Decision fatigue: `willpower`. Ego-depletion research is contested, so nothing was added for it.
- Toxic positivity: `toxic-positivity`, `dismissal`. `episode_reframe` covers this ground. No off-app action with evidence behind it was found.
- Burnout onset: `onset`, `recognition`, `apathy`, `emptiness`, `disappointment`, `buildup`.
- Music-shelf mood words: `serenity`, `spaciousness`, `ease`, `surrender`, `optimism`, `future`, `resolve`, `strength`, `self-trust`, `self-doubt`, `concentration`, `distraction`, `drowsiness`, `breathwork`, `steadiness`, `slowing-down`, `tenderness`.

Most uncovered themes are mood words from the music shelves. They describe a
feeling rather than a situation, so no single off-app action has evidence
against them. The real gaps are **grief beyond the first nights**,
**anticipatory anxiety/masking**, and **decision fatigue**.

## Considered and left out

- Caffeine cut-off, alcohol limits, regular meals, daylight/bright-light exposure: diet or medical (#546). Light therapy is a clinical treatment.
- "Call a friend", "tell someone": reaching a specific person.
- Cold water on the face (dive reflex): no high-trust primary source found.
- Decision defaults for decision fatigue: rests on ego-depletion, which has not replicated reliably.
- "Go somewhere with people around" (café, library): no primary source found.
- Venting or punching a pillow for anger: the evidence says it doesn't help [12].

## Sources

Primary research (PubMed or DOI):

1. Haghayegh et al. 2019, *Sleep Med Rev*: https://pubmed.ncbi.nlm.nih.gov/31102877/
2. Scullin et al. 2018, *J Exp Psychol Gen*: https://pubmed.ncbi.nlm.nih.gov/29058942/
3. Wendsche & Lohmann-Haislah 2017, *Front Psychol*: https://doi.org/10.3389/fpsyg.2016.02072
4. Karabinski et al. 2021, interventions for detachment meta-analysis: https://pubmed.ncbi.nlm.nih.gov/34096763/
5. Singh et al. 2023, *Br J Sports Med* umbrella review: https://pubmed.ncbi.nlm.nih.gov/36796860/
6. Cooney et al. 2013, Cochrane, Exercise for depression: https://pubmed.ncbi.nlm.nih.gov/24026850/
7. Bratman et al. 2015, *PNAS*: https://pubmed.ncbi.nlm.nih.gov/26124129/
8. Irish et al. 2015, *Sleep Med Rev*: https://pubmed.ncbi.nlm.nih.gov/25454674/
9. White et al. 2019, *Sci Rep*: https://pubmed.ncbi.nlm.nih.gov/31197192/
10. Twohig-Bennett & Jones 2018, *Environ Res*: https://pubmed.ncbi.nlm.nih.gov/29982151/
11. Cramer et al. 2013, *Depress Anxiety*: https://pubmed.ncbi.nlm.nih.gov/23922209/
12. Kjærvik & Bushman 2024, *Clin Psychol Rev*: https://pubmed.ncbi.nlm.nih.gov/38518585/
13. Manzoni et al. 2008, *BMC Psychiatry*: https://pubmed.ncbi.nlm.nih.gov/18518981/
14. Goyal et al. 2014, *JAMA Intern Med*: https://pubmed.ncbi.nlm.nih.gov/24395196/
15. Cuijpers et al. 2018, *Eur Psychiatry*: https://pubmed.ncbi.nlm.nih.gov/29331596/
16. Frattaroli 2006, *Psychol Bull*: https://pubmed.ncbi.nlm.nih.gov/17073523/
17. Lichtenthal & Cruess 2010, *Death Stud*: https://pubmed.ncbi.nlm.nih.gov/24482856/
18. Ferrari et al. 2019, *Mindfulness*: https://doi.org/10.1007/s12671-019-01134-6
19. Cregg & Cheavens 2021, *J Happiness Stud*: https://doi.org/10.1007/s10902-020-00236-6
20. Ekers et al. 2014, *PLoS One*: https://pubmed.ncbi.nlm.nih.gov/24936656/
21. Fancourt & Finn 2019, WHO HEN synthesis report 67: https://www.ncbi.nlm.nih.gov/books/NBK553776/
22. Curry et al. 2018, *J Exp Soc Psychol*: https://doi.org/10.1016/j.jesp.2018.02.014
23. Masi et al. 2011, *Pers Soc Psychol Rev*: https://pubmed.ncbi.nlm.nih.gov/20716644/
24. Holman, Garfin & Silver 2014, *PNAS*: https://pubmed.ncbi.nlm.nih.gov/24324161/
25. Hunt et al. 2018, *J Soc Clin Psychol*: https://doi.org/10.1521/jscp.2018.37.10.751
26. Lambert et al. 2022, *Cyberpsychol Behav Soc Netw*: https://pubmed.ncbi.nlm.nih.gov/35512731/

NHS guidance:

- N1. Every Mind Matters, how to fall asleep faster: https://www.nhs.uk/every-mind-matters/mental-wellbeing-tips/how-to-fall-asleep-faster-and-sleep-better/
- N2. Insomnia: https://www.nhs.uk/conditions/insomnia/
- N3. Tips to reduce stress: https://www.nhs.uk/mental-health/self-help/guides-tools-and-activities/tips-to-reduce-stress/
- N4. Exercise for depression: https://www.nhs.uk/mental-health/self-help/guides-tools-and-activities/exercise-for-depression/
- N5. Mindfulness: https://www.nhs.uk/mental-health/self-help/tips-and-support/mindfulness/
- N6. Anger: https://www.nhs.uk/mental-health/feelings-symptoms-behaviours/feelings-and-symptoms/anger/
- N7. Every Mind Matters, tackling your worries: https://www.nhs.uk/every-mind-matters/mental-wellbeing-tips/self-help-cbt-techniques/tackling-your-worries/
- N8. Every Mind Matters, problem solving: https://www.nhs.uk/every-mind-matters/mental-wellbeing-tips/self-help-cbt-techniques/problem-solving/
- N9. Every Mind Matters, reframing unhelpful thoughts: https://www.nhs.uk/every-mind-matters/mental-wellbeing-tips/self-help-cbt-techniques/reframing-unhelpful-thoughts/
- N10. Five steps to mental wellbeing: https://www.nhs.uk/mental-health/self-help/guides-tools-and-activities/five-steps-to-mental-wellbeing/
- N11. Every Mind Matters, loneliness: https://www.nhs.uk/every-mind-matters/lifes-challenges/loneliness/
- N12. Every Mind Matters, anxiety tips (COVID-era page, so the news-limit advice is generic): https://www.nhs.uk/every-mind-matters/coronavirus/covid-19-anxiety-tips/

Abstracts were checked through PubMed or Crossref metadata and search summaries. Full texts were not read. Effect sizes are as reported in the abstracts.
