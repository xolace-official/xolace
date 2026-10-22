/**
 * Probes for the intensity release gate, from the #493 (length bias) and #494
 * (positive sessions) audits. `ref` is the mean intensity the reference
 * classifier (`classifier-v1-haiku-4.5`) gave each text over 3 runs; it is the
 * fixed point every later version's shift is measured against, so don't
 * re-baseline it on a version bump — record an INTENSITY_OFFSET instead.
 */

/** Good news in four registers. `family` = should classify into joy/love. */
export const POSITIVE: { id: string; text: string; ref: number; family: boolean }[] = [
  { id: "job-caps", ref: 9, family: true, text: "I GOT THE JOB!!! I literally can't stop screaming, I can't believe it, I CAN'T BELIEVE IT" },
  { id: "engaged", ref: 9, family: true, text: "He proposed!!! I said yes!!! My hands are still shaking, I've never been this happy in my whole life" },
  { id: "exam-pass", ref: 8, family: true, text: "PASSED. Every single exam. Everything I worked for all year, it all paid off. I'm crying" },
  { id: "baby", ref: 8, family: true, text: "Positive test. After two years of trying. I can't breathe, my chest is so full, I keep looking at it over and over" },
  { id: "love-partner", ref: 6, family: true, text: "I love her so much it actually hurts sometimes. Watching her sleep this morning I just felt everything all at once." },
  { id: "proud-run", ref: 6.67, family: true, text: "Ran my first 10k today. Six months ago I couldn't run to the end of the road. Really proud of myself." },
  { id: "relief-scan", ref: 6, family: true, text: "Mum's scan came back clear. I didn't realise how scared I'd been until the relief hit. I sat in the car and just breathed." },
  { id: "friends-dinner", ref: 6, family: true, text: "Had the whole gang round for dinner, first time in ages. Laughed until my stomach hurt. I feel so lucky to have them." },
  { id: "grateful-quiet", ref: 3, family: true, text: "Good day today. Feeling calm and grateful." },
  { id: "hope-therapy", ref: 4, family: true, text: "I think I'm starting to feel a bit more hopeful. Therapy is slowly helping and I noticed I laughed at work today." },
  { id: "content-sunday", ref: 2, family: true, text: "Quiet Sunday. Coffee, a book, the window open. Nothing to report, just content." },
  { id: "job-nervous", ref: 6, family: true, text: "Got the job!! But it means moving across the country and leaving everyone. So happy and so scared at the same time." },
  // Correctly classed anxiety: the worry leads, so the guard rightly skips it.
  { id: "engaged-family", ref: 6, family: false, text: "We're engaged and I'm over the moon, but my family won't accept him and I'm dreading telling them." },
];

/** Same content at two lengths; the last four are long and composed (the register the rubric's LOW cue targets). */
export const PAIRS: { id: string; composed?: true; short: string; long: string; refShort: number; refLong: number }[] = [
  {
    id: "breakup-heavy", refShort: 8, refLong: 9,
    short: "She left last night. I can't stop shaking and I don't know how to get through today.",
    long: "She left last night. I keep trying to write this down so it makes sense but it doesn't. We'd been together four years and she packed one bag and said she'd come back for the rest. I sat on the kitchen floor for most of the night. I can't stop shaking, my hands won't settle, and every time I hear the lift in the hallway I think it's her. I called in sick because I physically couldn't get dressed. I keep going over the last few months looking for the moment I should have seen it, and I find a dozen of them, and that makes it worse. I don't know how to get through today. I don't even know how to get through the next hour. Everything in this flat is hers or ours and I can't look at any of it.",
  },
  {
    id: "work-fraud", refShort: 8, refLong: 8,
    short: "I messed up the launch and now everyone knows I'm a fraud. It's eating me alive.",
    long: "I messed up the launch. I'd been told twice to double check the migration and I didn't, and on Tuesday morning half our customers couldn't log in. My manager was kind about it in the meeting, which somehow made it worse. I've been replaying it every night since. I lie there and go through every step, and every version ends with me being found out — not just for this, but for the whole thing, the fact that I've been pretending to know what I'm doing for two years. I think everyone in that room saw it. I've stopped speaking up in standups. I check Slack at 3am to see if anyone has said anything about me. It's eating me alive and I don't know how to put it down.",
  },
  {
    id: "mum-illness", refShort: 9, refLong: 9,
    short: "Mum's scan came back bad. I feel like I'm breaking.",
    long: "Mum's scan came back bad. The doctor said the word 'spread' and then talked for ten more minutes and I didn't hear any of it. My sister was the one taking notes. On the drive home Mum kept saying she was fine and asking if I'd eaten, like it was a normal Thursday, and I had to pull over at a petrol station because I couldn't see the road. I'm the one who lives closest so it's going to be me doing the appointments and I'm already so tired. I keep thinking about all the times I didn't call her back. I feel like I'm breaking, honestly. Like something structural in me has cracked and I'm just waiting to see how far it goes.",
  },
  {
    id: "lonely-city", refShort: 6, refLong: 7,
    short: "Six months in this city and I still have no one to call. I'm really struggling with it.",
    long: "It's been six months since I moved here for the job and I still have no one to call. I thought it would get easier on its own. I go to work, I'm friendly, people are friendly back, and then everyone goes home to their actual lives and I go home to my room. Weekends are the worst. I've tried a couple of meetups and they were fine, but nothing stuck past one coffee. I talk to my friends back home less and less because there's a time difference and they're all busy, and I don't want to be the person who only calls to complain. I'm really struggling with it, more than I've admitted to anyone. Some days the only conversation I have is ordering food.",
  },
  {
    id: "exam-stress", refShort: 5, refLong: 5,
    short: "Exams in two weeks and I'm way behind. Stressed but trying.",
    long: "Exams start in two weeks and I'm way behind on two of my modules. I made a revision timetable at the start of term and I've followed maybe a third of it. Part of that is the part-time job, part of it is that I just haven't been able to focus — I sit down, open the notes, and twenty minutes later I'm on my phone. I'm stressed about it, there's a knot in my stomach most evenings, but I don't think it's a disaster yet. I've blocked out mornings from now on and my friend said she'd do library sessions with me. I'm trying. I just wish I'd started sooner and I'm annoyed at myself for leaving it this late again.",
  },
  {
    id: "friend-cancelled", refShort: 3, refLong: 3.67,
    short: "Friend cancelled our plans again. A bit hurt, but it's fine.",
    long: "My friend cancelled our plans again this evening. It's the third time this month. She had a reason, she always has a reason, and it's probably real — she's got a lot going on with her new job. I'd been looking forward to it a bit because it's been a long week, so I'm a bit hurt. Not massively. I made pasta and watched something instead and that was nice enough. I think I just notice that I'm usually the one who suggests things and she's usually the one who moves them, and I'm wondering whether to say something or just let it ride for a while. Probably let it ride. It's fine, mostly. Just a small thing sitting there.",
  },
  {
    id: "sleep-tired", refShort: 4, refLong: 4,
    short: "Not sleeping well lately, feeling foggy and low.",
    long: "I haven't been sleeping well lately. I fall asleep fine but I wake up around four and then I'm just lying there until the alarm. It's been about two weeks of this. During the day I feel foggy, like everything is slightly far away, and a bit low — not sad exactly, just flat. I've cut down on coffee after midday and I'm trying to keep my phone out of the bedroom, which has helped a little. Work is okay, nothing dramatic is happening. I think it's mostly that I'm tired and being tired makes everything a bit greyer than it really is. I'd like to get back to sleeping through the night.",
  },
  {
    id: "numb-done", refShort: 8, refLong: 8,
    short: "I can't do this anymore. Everything is too much and nothing helps.",
    long: "I can't do this anymore. I've been holding it together for so long — for my kids, for work, for my dad — and I've got nothing left. Every morning I wake up and the weight is already there before I open my eyes. I've tried everything people tell you to try. I went for the walks, I did the journaling, I talked to my GP and got a leaflet. Nothing helps. Nothing even touches it. Everything is too much: the dishes are too much, a text from a friend is too much, the sound of the kids is too much and then I hate myself for that. I'm so tired of being the one who's fine. I don't know how much longer I can keep doing this.",
  },
  {
    id: "grateful", refShort: 3, refLong: 3,
    short: "Good day today. Feeling calm and grateful.",
    long: "Today was a good day. I woke up without an alarm, which hasn't happened in ages, and had breakfast outside because the weather finally turned. I called my grandmother and we talked for nearly an hour about her garden and she sounded really well. In the afternoon I finished a book I'd been dragging my feet on and it ended better than I expected. Nothing big happened, it was just one of those days where everything went smoothly and I noticed it. I'm feeling calm and grateful. I wanted to write it down so I remember that days like this happen too, especially when the harder weeks come round.",
  },
  {
    id: "anger-dad", refShort: 8, refLong: 8,
    short: "Dad humiliated me in front of everyone again. I'm so angry I can't think.",
    long: "Dad humiliated me in front of everyone again at my cousin's engagement dinner. Someone asked what I was doing now and before I could answer he laughed and said 'nothing, as usual' and the whole table went quiet. I said I'd go get more drinks and stood in the car park for twenty minutes. It's always like this. It was like this when I was twelve and it's like this now that I'm thirty-one and pay my own rent. My mum texted me afterwards saying he didn't mean it. He always means it. I'm so angry I can't think straight. I've rewritten a message to him about six times and deleted it every time. My jaw has been clenched all evening.",
  },
  {
    id: "breakup-composed", composed: true, refShort: 8, refLong: 7.33,
    short: "She left last night. I can't stop shaking and I don't know how to get through today.",
    long: "I want to try to write this down calmly, because I think it helps me to see it laid out. My partner of four years left last night. I've been noticing that I keep trying to locate the moment it went wrong, and I think the honest answer is that there wasn't one moment, there were many small ones that I chose not to look at. I notice my body hasn't caught up with my mind — my hands have been trembling since yesterday evening and I haven't really eaten. I've taken the day off work. I'm aware that I'm in shock, and that the next few weeks are going to be very hard. I don't yet know how I'm going to get through today, and I suppose I'm writing this partly to admit that to myself.",
  },
  {
    id: "mum-composed", composed: true, refShort: 9, refLong: 8,
    short: "Mum's scan came back bad. I feel like I'm breaking.",
    long: "I've been sitting with this for a few hours now and I think I'm ready to put it into words. My mother's scan results came back today and the cancer has spread. I've been reflecting on how strange it was that she spent the drive home asking whether I'd eaten — I think that's how she copes, by caring for others. I'm the one who lives closest, so most of the appointments will fall to me, and I'm noticing a lot of guilt coming up about the times I didn't call her back. If I'm honest with myself, I feel as though something in me is breaking. I'm trying to observe that feeling rather than be swallowed by it, but it is very, very heavy.",
  },
  {
    id: "done-composed", composed: true, refShort: 8, refLong: 8,
    short: "I can't do this anymore. Everything is too much and nothing helps.",
    long: "I've been thinking carefully about how to describe where I am, because I think I've been minimising it for a long time. For about a year I've been holding everything together — my children, my job, my father's care. I've tried the things that are usually suggested: walking, journaling, a conversation with my GP. I've noticed that none of them reach it anymore. Small things, like a message from a friend or the dishes, now feel impossible. I find myself resenting my children's noise and then feeling ashamed of that. I think the truthful summary is that I can't keep doing this, and I'm not sure how much longer I can carry on as I am.",
  },
  {
    id: "fraud-composed", composed: true, refShort: 8, refLong: 7,
    short: "I messed up the launch and now everyone knows I'm a fraud. It's eating me alive.",
    long: "I'd like to reflect on something that has been occupying most of my thinking this week. I made a significant error during our product launch: I skipped a check I'd been asked to do twice, and it caused a login outage for many customers. My manager handled it graciously. What I've noticed since is a pattern of rumination — each night I replay the sequence of events, and it tends to expand into a broader belief that I've been pretending to be competent for two years and that this has now been exposed. I've become quieter in meetings and I check messages late at night. I recognise this is consuming me more than the mistake itself warrants, but recognising it hasn't made it lighter.",
  },
];
