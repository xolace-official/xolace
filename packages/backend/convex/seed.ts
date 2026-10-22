import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// ---------------------------------------------------------------------------
// Curated beta launch pool — 125 real-world reflections.
//
// Selection criteria:
//   - Specific, scene-grounded first-person voice (an action, object, or place)
//   - "I recognise myself in this" quality — not descriptions of emotions
//   - Distinct granular labels to maximise matching surface area
//   - Timestamps preserved from source data for organic spread
//
// Sources:
//   - src/components/extras/reflections-seed.json  (100 entries — all selected)
//   - src/components/extras/deep-research-report.md (25 entries selected from 87)
// ---------------------------------------------------------------------------

const BATCH_A = [
  {
    displayText:
      "I keep waking up at 3am with my chest tight and my mind already running through everything that could go wrong today. By the time my alarm goes off I'm exhausted from a day I haven't even started yet.",
    primaryEmotion: "anxiety",
    granularLabel: "anticipatory dread",
    thematicTags: ["work", "health"],
    intensity: 7,
    addedAt: 1744156800000,
  },
  {
    displayText:
      "I sat in the parking lot for twenty minutes before going inside. I don't know what I was waiting for. Permission, maybe. Or just a version of myself that doesn't feel this heavy.",
    primaryEmotion: "numbness",
    granularLabel: "present but not there",
    thematicTags: ["identity", "self-worth"],
    intensity: 6,
    addedAt: 1744070400000,
  },
  {
    displayText:
      "Everyone keeps telling me how proud they are. I smile and say thank you and then I go home and sit in silence because none of this feels like what I thought it would feel like.",
    primaryEmotion: "loneliness",
    granularLabel: "performing strength for others",
    thematicTags: ["family", "belonging", "identity"],
    intensity: 7,
    addedAt: 1743984000000,
  },
  {
    displayText:
      "I refreshed my email eleven times in the last hour. I know nothing is coming. But my body won't believe my brain.",
    primaryEmotion: "anxiety",
    granularLabel: "can't switch off",
    thematicTags: ["work"],
    intensity: 5,
    addedAt: 1743897600000,
  },
  {
    displayText:
      "I miss someone who's still here. They're right next to me and I miss them. I don't know how to explain that without sounding crazy.",
    primaryEmotion: "sadness",
    granularLabel: "quiet disconnection",
    thematicTags: ["relationships"],
    intensity: 6,
    addedAt: 1743811200000,
  },
  {
    displayText:
      "I don't think I'm depressed. I think I just forgot what it feels like to want something. Everything is fine on paper and completely flat in my chest.",
    primaryEmotion: "numbness",
    granularLabel: "going through motions",
    thematicTags: ["purpose", "identity"],
    intensity: 5,
    addedAt: 1743724800000,
  },
  {
    displayText:
      "My hands are shaking and I haven't even opened the message yet. I already know it's bad. I can feel it in my stomach.",
    primaryEmotion: "anxiety",
    granularLabel: "waiting for something bad",
    thematicTags: ["work", "relationships"],
    intensity: 8,
    addedAt: 1743638400000,
  },
  {
    displayText:
      "I cried in the shower today for no reason I can name. Not sad exactly. Just full. Like everything I've been holding finally leaked out when no one was watching.",
    primaryEmotion: "overwhelm",
    granularLabel: "emotional overflow",
    thematicTags: ["self-worth", "health"],
    intensity: 6,
    addedAt: 1743552000000,
  },
  {
    displayText:
      "I keep saying yes to things I don't want to do because I'm terrified that if I stop being useful, people will stop wanting me around.",
    primaryEmotion: "anxiety",
    granularLabel: "responsibility weight",
    thematicTags: ["self-worth", "relationships"],
    intensity: 7,
    addedAt: 1743465600000,
  },
  {
    displayText:
      "It's been six months and I still reach for my phone to text them. The muscle memory is the cruelest part.",
    primaryEmotion: "grief",
    granularLabel: "phantom presence",
    thematicTags: ["loss", "relationships"],
    intensity: 7,
    addedAt: 1743379200000,
  },
  {
    displayText:
      "I got the promotion and felt nothing. Just immediately started worrying about the next thing. I don't know when I stopped being able to feel good news.",
    primaryEmotion: "numbness",
    granularLabel: "numb-but-functional",
    thematicTags: ["work", "purpose"],
    intensity: 5,
    addedAt: 1744156800000,
  },
  {
    displayText:
      "I'm so tired of being the strong one. Everyone leans on me and nobody asks how I'm doing. I don't even know if I'd answer honestly if they did.",
    primaryEmotion: "loneliness",
    granularLabel: "invisible to the people closest to me",
    thematicTags: ["family", "relationships", "self-worth"],
    intensity: 7,
    addedAt: 1744070400000,
  },
  {
    displayText:
      "I keep comparing myself to people who started at the same time as me and it's eating me alive. I know comparison is pointless but knowing that doesn't make it stop.",
    primaryEmotion: "shame",
    granularLabel: "I should be further along",
    thematicTags: ["work", "self-worth"],
    intensity: 6,
    addedAt: 1743984000000,
  },
  {
    displayText:
      "I don't even know who I'm angry at anymore. Myself probably. For letting it get this bad. For not saying something when I had the chance.",
    primaryEmotion: "anger",
    granularLabel: "stuck resentment",
    thematicTags: ["relationships", "self-worth"],
    intensity: 6,
    addedAt: 1743897600000,
  },
  {
    displayText:
      "I'm in a room full of people laughing and I'm performing so hard right now. Smiling at the right moments. Saying the right things. Inside it's just static.",
    primaryEmotion: "loneliness",
    granularLabel: "surrounded and alone",
    thematicTags: ["belonging", "identity"],
    intensity: 7,
    addedAt: 1743811200000,
  },
  {
    displayText:
      "I can feel the anxiety sitting in my jaw. Clenched all day. I only notice when I try to eat and it hurts to chew.",
    primaryEmotion: "anxiety",
    granularLabel: "physical tension",
    thematicTags: ["health", "work"],
    intensity: 5,
    addedAt: 1743724800000,
  },
  {
    displayText:
      "The thing nobody tells you about grief is that it's boring. It's the same emptiness every morning. The same absence at dinner. It doesn't build to anything. It just sits there.",
    primaryEmotion: "grief",
    granularLabel: "invisible grief",
    thematicTags: ["loss"],
    intensity: 6,
    addedAt: 1743638400000,
  },
  {
    displayText:
      "I spent two hours on a task that should take twenty minutes because I'm so scared of getting it wrong. Every sentence I write I delete and rewrite. It's paralyzing.",
    primaryEmotion: "anxiety",
    granularLabel: "perfectionist spiral",
    thematicTags: ["work", "self-worth"],
    intensity: 6,
    addedAt: 1743552000000,
  },
  {
    displayText:
      "I look at my bank account and my whole body goes cold. It's not even that bad objectively. But the feeling of not having enough makes everything else feel fragile.",
    primaryEmotion: "anxiety",
    granularLabel: "scarcity dread",
    thematicTags: ["finances"],
    intensity: 7,
    addedAt: 1743465600000,
  },
  {
    displayText:
      "My mom called and I let it ring. I'll call her back later and pretend I was busy. The truth is I just can't carry her worry on top of mine right now.",
    primaryEmotion: "overwhelm",
    granularLabel: "compassion fatigue",
    thematicTags: ["family"],
    intensity: 5,
    addedAt: 1743379200000,
  },
  {
    displayText:
      "I had a good day today. Like actually good. And instead of just enjoying it I spent the whole evening waiting for something to ruin it. I can't trust good things anymore.",
    primaryEmotion: "anxiety",
    granularLabel: "anticipatory dread",
    thematicTags: ["identity", "health"],
    intensity: 5,
    addedAt: 1744156800000,
  },
  {
    displayText:
      "I don't recognize myself in photos anymore. Not in a body image way. In a who-is-that-person way. Like I'm looking at someone I used to know.",
    primaryEmotion: "confusion",
    granularLabel: "caught between two selves",
    thematicTags: ["identity"],
    intensity: 6,
    addedAt: 1744070400000,
  },
  {
    displayText:
      "They apologized and I said it was fine and now I'm lying in bed furious. It wasn't fine. I just didn't know how to say that without making everything worse.",
    primaryEmotion: "anger",
    granularLabel: "swallowed rage",
    thematicTags: ["relationships"],
    intensity: 7,
    addedAt: 1743984000000,
  },
  {
    displayText:
      "I've been scrolling for three hours. Not looking for anything. Just avoiding the silence. The silence is where all the thoughts live.",
    primaryEmotion: "numbness",
    granularLabel: "checked out",
    thematicTags: ["purpose"],
    intensity: 4,
    addedAt: 1743897600000,
  },
  {
    displayText:
      "Everyone back home thinks I have it figured out because I'm abroad. I can't tell them I eat alone every night and don't know a single person I'd call if something happened.",
    primaryEmotion: "loneliness",
    granularLabel: "geographic loneliness",
    thematicTags: ["belonging", "family", "identity"],
    intensity: 8,
    addedAt: 1743811200000,
  },
  {
    displayText:
      "I keep starting things and not finishing them. Books, projects, conversations. Everything gets to 60% and then I just... stop. I don't know if it's laziness or something deeper.",
    primaryEmotion: "frustration",
    granularLabel: "stalled momentum",
    thematicTags: ["purpose", "self-worth"],
    intensity: 5,
    addedAt: 1743724800000,
  },
  {
    displayText:
      "I said the wrong thing again. I can feel it. The way their face changed for half a second before they covered it. Now it's going to replay in my head for the next three days.",
    primaryEmotion: "shame",
    granularLabel: "replaying what I said wrong",
    thematicTags: ["relationships", "self-worth"],
    intensity: 7,
    addedAt: 1743638400000,
  },
  {
    displayText:
      "Some days the sadness is sharp and I can point at it. Today it's just a fog. Everywhere and nowhere. I can't fight fog.",
    primaryEmotion: "sadness",
    granularLabel: "flat",
    thematicTags: ["health"],
    intensity: 5,
    addedAt: 1743552000000,
  },
  {
    displayText:
      "I'm holding so many people's secrets and problems and none of them know about each other and none of them know about mine.",
    primaryEmotion: "overwhelm",
    granularLabel: "invisible weight",
    thematicTags: ["relationships", "self-worth"],
    intensity: 6,
    addedAt: 1743465600000,
  },
  {
    displayText:
      "I feel like I'm watching my life from behind glass. Everything is happening. I'm technically there. But I can't feel any of it.",
    primaryEmotion: "numbness",
    granularLabel: "dissociation",
    thematicTags: ["identity", "health"],
    intensity: 7,
    addedAt: 1743379200000,
  },
  {
    displayText:
      "I worked so hard to get out and now I'm here and I can't tell anyone it's not what I thought it would be. The guilt of that is heavier than whatever I'm actually feeling.",
    primaryEmotion: "confusion",
    granularLabel: "moral vertigo",
    thematicTags: ["identity", "family", "belonging"],
    intensity: 7,
    addedAt: 1744156800000,
  },
  {
    displayText:
      "My body is so tired but my mind won't stop. I've been lying here for two hours thinking about a conversation from 2019.",
    primaryEmotion: "anxiety",
    granularLabel: "can't switch off",
    thematicTags: ["health", "relationships"],
    intensity: 6,
    addedAt: 1744070400000,
  },
  {
    displayText:
      "I don't want to be comforted. I don't want advice. I just want someone to sit with me and not try to fix it.",
    primaryEmotion: "sadness",
    granularLabel: "deep loneliness",
    thematicTags: ["belonging"],
    intensity: 6,
    addedAt: 1743984000000,
  },
  {
    displayText:
      "I'm angry at myself for still caring. They moved on months ago and I'm still here checking if they watched my story. It's embarrassing.",
    primaryEmotion: "shame",
    granularLabel: "lingering attachment",
    thematicTags: ["relationships", "self-worth"],
    intensity: 6,
    addedAt: 1743897600000,
  },
  {
    displayText:
      "The worst part is I don't even know what I'd say if someone asked what's wrong. It's not one thing. It's everything pressing down at the same time until I can't sort any of it out.",
    primaryEmotion: "overwhelm",
    granularLabel: "can't untangle",
    thematicTags: ["health", "purpose"],
    intensity: 7,
    addedAt: 1743811200000,
  },
  {
    displayText:
      "I've been putting on this face for so long I'm starting to forget what's underneath it. I don't think I'm faking it anymore. I think the mask just became my face.",
    primaryEmotion: "numbness",
    granularLabel: "identity erosion",
    thematicTags: ["identity", "belonging"],
    intensity: 6,
    addedAt: 1743724800000,
  },
  {
    displayText:
      "I deleted the text before sending it. Again. I keep almost reaching out and then convincing myself I'm being too much.",
    primaryEmotion: "loneliness",
    granularLabel: "self-silencing",
    thematicTags: ["relationships", "self-worth"],
    intensity: 5,
    addedAt: 1743638400000,
  },
  {
    displayText:
      "My dad would never understand any of this. He came from nothing and built everything and here I am with all of it struggling to get out of bed. I feel like a waste of his sacrifice.",
    primaryEmotion: "shame",
    granularLabel: "unearned struggle",
    thematicTags: ["family", "identity", "self-worth"],
    intensity: 8,
    addedAt: 1743552000000,
  },
  {
    displayText:
      "Something small happened today — someone held the door for me and I almost cried. I think I've been running on empty longer than I realized.",
    primaryEmotion: "overwhelm",
    granularLabel: "emotional overflow",
    thematicTags: ["health"],
    intensity: 5,
    addedAt: 1743465600000,
  },
  {
    displayText:
      "I keep thinking about the person I was two years ago and I don't know if I'm better or worse. Just different. And the not knowing bothers me more than either answer would.",
    primaryEmotion: "confusion",
    granularLabel: "lost direction",
    thematicTags: ["identity", "purpose"],
    intensity: 5,
    addedAt: 1743379200000,
  },
  {
    displayText:
      "I'm not sad about the breakup anymore. I'm sad about who I became in it. How small I made myself. How long I pretended that was love.",
    primaryEmotion: "sadness",
    granularLabel: "retroactive clarity",
    thematicTags: ["relationships", "identity"],
    intensity: 7,
    addedAt: 1744156800000,
  },
  {
    displayText:
      "I don't know why I feel guilty for resting. I worked all week. I earned this. But my body is on the couch and my brain is screaming that I'm falling behind.",
    primaryEmotion: "anxiety",
    granularLabel: "guilt-laced rest",
    thematicTags: ["work", "self-worth"],
    intensity: 5,
    addedAt: 1744070400000,
  },
  {
    displayText:
      "They said 'you seem fine' and I wanted to scream. Fine is the performance. Fine is the costume. Nobody asks what's under fine.",
    primaryEmotion: "frustration",
    granularLabel: "unseen pain",
    thematicTags: ["belonging", "relationships"],
    intensity: 7,
    addedAt: 1743984000000,
  },
];

const BATCH_B = [
  {
    displayText:
      "I had a panic attack in the bathroom at work and then went back to my desk and answered emails. The gap between what's happening inside me and what people see is getting wider every day.",
    primaryEmotion: "anxiety",
    granularLabel: "hidden crisis",
    thematicTags: ["work", "health"],
    intensity: 8,
    addedAt: 1743897600000,
  },
  {
    displayText:
      "I thought moving to a new city would fix something. Turns out I just brought all the same feelings to a place where nobody knows my name.",
    primaryEmotion: "loneliness",
    granularLabel: "geographic loneliness",
    thematicTags: ["belonging", "change"],
    intensity: 7,
    addedAt: 1743811200000,
  },
  {
    displayText:
      "I opened my laptop to work and just stared at the screen for forty minutes. Couldn't start. Couldn't close it. Just frozen in the in-between.",
    primaryEmotion: "numbness",
    granularLabel: "paralysis",
    thematicTags: ["work"],
    intensity: 5,
    addedAt: 1743724800000,
  },
  {
    displayText:
      "I keep almost telling people what's really going on and then I make a joke instead. The jokes are getting darker and nobody's noticed.",
    primaryEmotion: "sadness",
    granularLabel: "hidden behind humor",
    thematicTags: ["belonging", "self-worth"],
    intensity: 6,
    addedAt: 1743638400000,
  },
  {
    displayText:
      "Today I walked for an hour and somewhere around minute forty the tightness in my chest loosened a little. Not gone. Just loosened. That felt like something.",
    primaryEmotion: "relief",
    granularLabel: "small opening",
    thematicTags: ["health"],
    intensity: 3,
    addedAt: 1743552000000,
  },
  {
    displayText:
      "I've been carrying this anger toward my mother for so long it doesn't even feel like anger anymore. It just feels like the shape of our relationship. Like that's all there is.",
    primaryEmotion: "anger",
    granularLabel: "calcified resentment",
    thematicTags: ["family"],
    intensity: 6,
    addedAt: 1743465600000,
  },
  {
    displayText:
      "I'm not allowed to be struggling. Too many people look up to me. Too many people sacrificed too much. So I just don't say anything and hope the weight distributes itself somehow.",
    primaryEmotion: "loneliness",
    granularLabel: "performing strength for others",
    thematicTags: ["family", "belonging"],
    intensity: 8,
    addedAt: 1743379200000,
  },
  {
    displayText:
      "Everything is urgent and nothing matters. I have seventeen tabs open and I can't focus on any of them. My brain is a browser that needs to be force-quit.",
    primaryEmotion: "overwhelm",
    granularLabel: "cognitive overload",
    thematicTags: ["work"],
    intensity: 6,
    addedAt: 1744156800000,
  },
  {
    displayText:
      "I realized I haven't been excited about anything in months. Not dreading anything either. Just... neutral. I miss wanting things.",
    primaryEmotion: "numbness",
    granularLabel: "desire gone flat",
    thematicTags: ["purpose", "identity"],
    intensity: 5,
    addedAt: 1744070400000,
  },
  {
    displayText:
      "I made a mistake at work three weeks ago and I still think about it every single day. Nobody else remembers. But I do. Every detail.",
    primaryEmotion: "shame",
    granularLabel: "ruminating regret",
    thematicTags: ["work", "self-worth"],
    intensity: 6,
    addedAt: 1743984000000,
  },
  {
    displayText:
      "I want to cry but it won't come. Like there's a dam behind my eyes that won't break. The pressure just builds and builds and nothing releases.",
    primaryEmotion: "sadness",
    granularLabel: "can't cry but want to",
    thematicTags: ["health"],
    intensity: 7,
    addedAt: 1743897600000,
  },
  {
    displayText:
      "I don't know how to tell my family that the degree they're paying for is making me miserable. They'd be devastated. So I just keep going.",
    primaryEmotion: "helplessness",
    granularLabel: "trapped by others' investment",
    thematicTags: ["family", "identity", "purpose"],
    intensity: 7,
    addedAt: 1743811200000,
  },
  {
    displayText:
      "I forgave them. Or I said I did. But every time they do something small and careless it all comes flooding back and I realize I haven't forgiven anything.",
    primaryEmotion: "anger",
    granularLabel: "unresolved betrayal",
    thematicTags: ["relationships"],
    intensity: 6,
    addedAt: 1743724800000,
  },
  {
    displayText:
      "I woke up and for about ten seconds everything was quiet. No anxiety. No dread. Just morning. I wish I could live in those ten seconds.",
    primaryEmotion: "relief",
    granularLabel: "fleeting peace",
    thematicTags: ["health"],
    intensity: 3,
    addedAt: 1743638400000,
  },
  {
    displayText:
      "I keep picking up my phone and putting it down. I want to talk to someone but I don't know what I'd say. 'I feel weird' doesn't feel like enough to bother someone with.",
    primaryEmotion: "loneliness",
    granularLabel: "self-dismissing",
    thematicTags: ["belonging", "self-worth"],
    intensity: 5,
    addedAt: 1743552000000,
  },
  {
    displayText:
      "I don't know if I'm burnt out or if this is just what being an adult feels like. Everyone else seems to be handling it. Maybe I'm just not built for this.",
    primaryEmotion: "overwhelm",
    granularLabel: "existential exhaustion",
    thematicTags: ["work", "purpose", "self-worth"],
    intensity: 6,
    addedAt: 1743465600000,
  },
  {
    displayText:
      "I caught myself smiling at a stranger today and it felt foreign. Like I had to remember how. When did something that simple start requiring effort?",
    primaryEmotion: "sadness",
    granularLabel: "hollow",
    thematicTags: ["health", "identity"],
    intensity: 5,
    addedAt: 1743379200000,
  },
  {
    displayText:
      "My friend got engaged and I'm happy for her. I am. But underneath the happiness there's this quiet panic about being left behind. I hate that I can't just be happy without the other thing.",
    primaryEmotion: "anxiety",
    granularLabel: "comparison spiral",
    thematicTags: ["relationships", "self-worth"],
    intensity: 5,
    addedAt: 1744156800000,
  },
  {
    displayText:
      "I keep cleaning the apartment like if I make the outside orderly enough the inside will follow. It hasn't worked yet but I keep trying.",
    primaryEmotion: "anxiety",
    granularLabel: "control-seeking",
    thematicTags: ["health"],
    intensity: 4,
    addedAt: 1744070400000,
  },
  {
    displayText:
      "I told someone how I really felt and they changed the subject. That's the last time I try that for a while.",
    primaryEmotion: "loneliness",
    granularLabel: "rejected vulnerability",
    thematicTags: ["relationships", "belonging"],
    intensity: 7,
    addedAt: 1743984000000,
  },
  {
    displayText:
      "I spent the whole day doing things for other people and now it's 11pm and I haven't eaten. I don't even feel hungry. I feel erased.",
    primaryEmotion: "overwhelm",
    granularLabel: "self-neglect",
    thematicTags: ["health", "self-worth"],
    intensity: 6,
    addedAt: 1743897600000,
  },
  {
    displayText:
      "I'm scared that if I slow down I'll feel everything I've been outrunning. So I just keep going. Add more. Fill every gap. Don't stop moving.",
    primaryEmotion: "dread",
    granularLabel: "avoidance through busyness",
    thematicTags: ["health", "purpose"],
    intensity: 7,
    addedAt: 1743811200000,
  },
  {
    displayText:
      "I stood in the grocery store for ten minutes trying to decide between two kinds of bread and nearly had a meltdown. It's not about the bread. It's that even tiny decisions feel impossible right now.",
    primaryEmotion: "overwhelm",
    granularLabel: "decision paralysis",
    thematicTags: ["health"],
    intensity: 6,
    addedAt: 1743724800000,
  },
  {
    displayText:
      "I wrote a long message explaining everything I've been feeling and then deleted it. The draft folder is where my honesty goes to die.",
    primaryEmotion: "frustration",
    granularLabel: "silenced self-expression",
    thematicTags: ["relationships", "self-worth"],
    intensity: 6,
    addedAt: 1743638400000,
  },
  {
    displayText:
      "I watched a video of myself from a year ago and that person had light in their eyes. I don't know when I lost that. I didn't notice it leaving.",
    primaryEmotion: "sadness",
    granularLabel: "mourning a former self",
    thematicTags: ["identity", "loss"],
    intensity: 7,
    addedAt: 1743552000000,
  },
  {
    displayText:
      "The Sunday dread is already here and it's Saturday afternoon. Two days of freedom and I can't enjoy either one because Monday is already casting its shadow.",
    primaryEmotion: "dread",
    granularLabel: "anticipatory work anxiety",
    thematicTags: ["work"],
    intensity: 6,
    addedAt: 1743465600000,
  },
  {
    displayText:
      "I found an old journal from when I was hopeful about things. Reading it felt like getting a letter from a stranger who happened to have my handwriting.",
    primaryEmotion: "sadness",
    granularLabel: "nostalgia for former self",
    thematicTags: ["identity", "purpose"],
    intensity: 5,
    addedAt: 1743379200000,
  },
  {
    displayText:
      "I'm not lazy. I'm exhausted in a way that sleep doesn't fix. It's like my battery charges to 30% and that's all I get. Every day, 30%.",
    primaryEmotion: "overwhelm",
    granularLabel: "chronic depletion",
    thematicTags: ["health", "work"],
    intensity: 7,
    addedAt: 1744156800000,
  },
  {
    displayText:
      "I'm terrified of being seen and terrified of being invisible and I don't know how both of those things can be true at the same time but they are.",
    primaryEmotion: "confusion",
    granularLabel: "contradictory needs",
    thematicTags: ["identity", "belonging"],
    intensity: 6,
    addedAt: 1744070400000,
  },
  {
    displayText:
      "I helped someone today and it felt good. Genuinely good. Not performative. Just... warm. I forgot I could feel that.",
    primaryEmotion: "relief",
    granularLabel: "unexpected warmth",
    thematicTags: ["belonging"],
    intensity: 3,
    addedAt: 1743984000000,
  },
  {
    displayText:
      "I don't know how to grieve someone who's still alive. They're here but they're not the person I knew. And there's no funeral for that. No card. Just this quiet loss.",
    primaryEmotion: "grief",
    granularLabel: "ambiguous loss",
    thematicTags: ["family", "loss"],
    intensity: 8,
    addedAt: 1743897600000,
  },
  {
    displayText:
      "I've been meaning to call my brother for three weeks. I love him. I just don't have the energy to perform okay for an hour. So another week passes.",
    primaryEmotion: "sadness",
    granularLabel: "withdrawal from love",
    thematicTags: ["family", "health"],
    intensity: 5,
    addedAt: 1743811200000,
  },
  {
    displayText:
      "I keep thinking if I just work harder it'll click. If I just push through one more week. But the weeks keep passing and the click never comes.",
    primaryEmotion: "frustration",
    granularLabel: "diminishing returns",
    thematicTags: ["work", "purpose"],
    intensity: 6,
    addedAt: 1743724800000,
  },
  {
    displayText:
      "They asked me what I wanted for my birthday and I couldn't think of a single thing. Not in a content way. In a nothing-sounds-good way. In a what's-the-point way.",
    primaryEmotion: "numbness",
    granularLabel: "anhedonia",
    thematicTags: ["identity"],
    intensity: 6,
    addedAt: 1743638400000,
  },
  {
    displayText:
      "I'm fine until someone asks me how I am with actual sincerity. Then everything threatens to crack open. So I avoid the people who care the most.",
    primaryEmotion: "overwhelm",
    granularLabel: "fragile composure",
    thematicTags: ["relationships", "belonging"],
    intensity: 7,
    addedAt: 1743552000000,
  },
  {
    displayText:
      "I got through today. That's it. That's the whole achievement. Some days getting through is enough. I'm trying to let that be enough.",
    primaryEmotion: "relief",
    granularLabel: "quiet endurance",
    thematicTags: ["self-worth"],
    intensity: 4,
    addedAt: 1743465600000,
  },
  {
    displayText:
      "I keep replaying the fight in my head but in the replay I say all the things I was too scared to say. The imaginary version of me is so much braver.",
    primaryEmotion: "frustration",
    granularLabel: "powerless retrospect",
    thematicTags: ["relationships"],
    intensity: 5,
    addedAt: 1743379200000,
  },
  {
    displayText:
      "I'm so tired of being grateful. Everyone tells me how lucky I am and I know they're right but gratitude doesn't cancel out the heaviness. They can coexist and that confuses people.",
    primaryEmotion: "confusion",
    granularLabel: "guilty ambivalence",
    thematicTags: ["self-worth", "identity"],
    intensity: 6,
    addedAt: 1744156800000,
  },
  {
    displayText:
      "My therapist moved away and I can't bring myself to start over with someone new. The idea of explaining everything from scratch makes me want to give up on the whole thing.",
    primaryEmotion: "helplessness",
    granularLabel: "exhaustion of re-explaining",
    thematicTags: ["health"],
    intensity: 5,
    addedAt: 1744070400000,
  },
  {
    displayText:
      "I left the party early and sat in my car and breathed. Not because anything happened. Just because being around that many people pretending to have fun was exhausting me at a cellular level.",
    primaryEmotion: "overwhelm",
    granularLabel: "social depletion",
    thematicTags: ["belonging"],
    intensity: 5,
    addedAt: 1743984000000,
  },
  {
    displayText:
      "Money is the thing I think about first in the morning and last at night. Not because I want to. Because the numbers never add up and the fear never goes away.",
    primaryEmotion: "anxiety",
    granularLabel: "financial dread",
    thematicTags: ["finances"],
    intensity: 7,
    addedAt: 1743897600000,
  },
  {
    displayText:
      "I unfollowed everyone who makes me feel behind. My feed is quieter now but so is the voice that says I'm not enough. Small thing. Felt big.",
    primaryEmotion: "relief",
    granularLabel: "reclaiming space",
    thematicTags: ["self-worth", "identity"],
    intensity: 3,
    addedAt: 1743811200000,
  },
  {
    displayText:
      "I dreamed about the house I grew up in again. It was empty this time. I walked through every room looking for something I couldn't name. Woke up with wet eyes.",
    primaryEmotion: "grief",
    granularLabel: "childhood echo",
    thematicTags: ["family", "loss"],
    intensity: 6,
    addedAt: 1743724800000,
  },
  {
    displayText:
      "I don't even know how to explain it to anyone because they'll just say I'm overthinking. So I just keep it to myself and act like everything is fine.",
    primaryEmotion: "loneliness",
    granularLabel: "invisible to the people closest to me",
    thematicTags: ["belonging", "relationships"],
    intensity: 6,
    addedAt: 1743638400000,
  },
  {
    displayText:
      "I owe people money I don't have and every time my phone rings my stomach drops. I've started screening every call. Living in a constant state of bracing.",
    primaryEmotion: "anxiety",
    granularLabel: "financial shame spiral",
    thematicTags: ["finances", "shame"],
    intensity: 8,
    addedAt: 1743552000000,
  },
  {
    displayText:
      "I'm watching everyone around me couple up and settle down and I can't even figure out who I am alone. The timeline I thought I'd follow doesn't exist anymore.",
    primaryEmotion: "confusion",
    granularLabel: "lost timeline",
    thematicTags: ["identity", "relationships", "purpose"],
    intensity: 6,
    addedAt: 1743465600000,
  },
  {
    displayText:
      "The anger came out of nowhere today. One small thing — a spilled cup — and suddenly I was shaking with rage that had nothing to do with coffee. There's something underneath I haven't looked at.",
    primaryEmotion: "anger",
    granularLabel: "displaced rage",
    thematicTags: ["health", "self-worth"],
    intensity: 7,
    addedAt: 1743379200000,
  },
  {
    displayText:
      "Somebody at work got credit for my idea today. I didn't say anything. I never say anything. And then I wonder why I feel invisible.",
    primaryEmotion: "frustration",
    granularLabel: "violated and unseen",
    thematicTags: ["work", "self-worth"],
    intensity: 6,
    addedAt: 1744156800000,
  },
  {
    displayText:
      "I thought about death today. Not in a scary way. More like... wondering what it would feel like to just stop being responsible for everything. To set it all down. I don't want to die. I just want to rest in a way that actually feels like rest.",
    primaryEmotion: "overwhelm",
    granularLabel: "existential fatigue",
    thematicTags: ["health", "purpose"],
    intensity: 9,
    addedAt: 1744070400000,
  },
  {
    displayText:
      "I realized today that I've been apologizing for existing. Sorry for the email. Sorry for asking. Sorry for taking up space. When did I start treating myself like an inconvenience?",
    primaryEmotion: "sadness",
    granularLabel: "chronic self-diminishment",
    thematicTags: ["self-worth", "identity"],
    intensity: 6,
    addedAt: 1743984000000,
  },
  {
    displayText:
      "The house is quiet and I should be grateful for the peace but the quiet is where the loudest thoughts live. I turn on the TV just for noise. Just to not be alone with my own head.",
    primaryEmotion: "loneliness",
    granularLabel: "afraid of own thoughts",
    thematicTags: ["health"],
    intensity: 6,
    addedAt: 1743897600000,
  },
  {
    displayText:
      "I'm not the same person I was before it happened. And people keep waiting for the old me to come back. I don't know how to tell them she's not coming.",
    primaryEmotion: "grief",
    granularLabel: "identity after loss",
    thematicTags: ["loss", "identity", "relationships"],
    intensity: 8,
    addedAt: 1743811200000,
  },
  {
    displayText:
      "I told myself I'd deal with it tomorrow and tomorrow has been going on for about three months now.",
    primaryEmotion: "frustration",
    granularLabel: "chronic avoidance",
    thematicTags: ["purpose", "self-worth"],
    intensity: 4,
    addedAt: 1743724800000,
  },
  {
    displayText:
      "I cooked a real meal for myself tonight instead of cereal. Set the table and everything. Felt stupid at first. Then it felt like the kindest thing anyone's done for me in weeks. And it was me.",
    primaryEmotion: "relief",
    granularLabel: "self-kindness",
    thematicTags: ["self-worth", "health"],
    intensity: 3,
    addedAt: 1743638400000,
  },
  {
    displayText:
      "I keep waiting for someone to notice I'm not okay. But I'm so good at seeming okay that nobody ever does. And I can't decide if that's their failure or mine.",
    primaryEmotion: "sadness",
    granularLabel: "invisible suffering",
    thematicTags: ["belonging", "self-worth"],
    intensity: 7,
    addedAt: 1743552000000,
  },
  {
    displayText:
      "Something shifted today. I don't know what. The weight is still there but it moved slightly and now I can breathe a little deeper. I'll take it.",
    primaryEmotion: "hope",
    granularLabel: "quiet shift",
    thematicTags: ["health"],
    intensity: 3,
    addedAt: 1743465600000,
  },
  {
    displayText:
      "I spent an hour getting ready just to cancel. Couldn't do it. Texted some excuse. The relief lasted about ten seconds before the shame moved in.",
    primaryEmotion: "shame",
    granularLabel: "avoidance guilt",
    thematicTags: ["belonging", "health"],
    intensity: 6,
    addedAt: 1743379200000,
  },
];

// From deep-research-report.md — 25 entries that pass the specificity bar.
const BATCH_C = [
  {
    displayText:
      "Every time I pass by our old coffee shop, I remember the last time we laughed there. Now the air feels hollow and I choke up.",
    primaryEmotion: "sadness",
    granularLabel: "memory-triggered grief",
    thematicTags: ["loss", "relationships"],
    intensity: 7,
    addedAt: 1743379200000,
  },
  {
    displayText:
      "My hands shake when I open my bank app. I keep thinking any moment I'll have $0, and I panic over whether I'm just one paycheck away from disaster.",
    primaryEmotion: "anxiety",
    granularLabel: "financial anxiety",
    thematicTags: ["finances", "work"],
    intensity: 7,
    addedAt: 1743465600000,
  },
  {
    displayText:
      "I was walking home tonight and realized I took a deep breath without thinking. It's like my body remembered to relax on its own for the first time.",
    primaryEmotion: "relief",
    granularLabel: "unexpected calm",
    thematicTags: ["health", "self-worth"],
    intensity: 4,
    addedAt: 1743465600000,
  },
  {
    displayText:
      "I keep checking my phone, hoping you'll call me back. It's pathetic, I know, but I feel like a little kid waiting for a parent who never comes.",
    primaryEmotion: "sadness",
    granularLabel: "hopeless waiting",
    thematicTags: ["relationships", "family"],
    intensity: 7,
    addedAt: 1743465600000,
  },
  {
    displayText:
      "Everyone back home thinks I'm living the dream because I never complain. I'm terrified of saying I'm struggling, because I know they'd lose hope in me.",
    primaryEmotion: "loneliness",
    granularLabel: "performing strength for others",
    thematicTags: ["family", "belonging", "identity"],
    intensity: 7,
    addedAt: 1743465600000,
  },
  {
    displayText:
      "My chest aches when I walk past the empty playground where we used to be. I wish I had the courage to tell you how much I miss you, but I'm too afraid of the silence that would follow.",
    primaryEmotion: "sadness",
    granularLabel: "yearning sadness",
    thematicTags: ["loss", "relationships"],
    intensity: 8,
    addedAt: 1743552000000,
  },
  {
    displayText:
      "I have your sweater wrapped around me, trying to feel close. The silence you left behind is heavy and my throat tightens when I think of it.",
    primaryEmotion: "grief",
    granularLabel: "physical grief",
    thematicTags: ["loss", "relationships"],
    intensity: 7,
    addedAt: 1743552000000,
  },
  {
    displayText:
      "Even relaxing feels exhausting because I worry I'll fall behind everything. It's like my brain won't shut up until I'm four tasks ahead of where I am.",
    primaryEmotion: "overwhelm",
    granularLabel: "unable to relax",
    thematicTags: ["work", "self-worth"],
    intensity: 7,
    addedAt: 1743552000000,
  },
  {
    displayText:
      "I wrote a letter to you today, even though you're not here. It's my way of talking, but then I remember it's only me hearing the words.",
    primaryEmotion: "grief",
    granularLabel: "writing goodbye",
    thematicTags: ["loss", "relationships"],
    intensity: 7,
    addedAt: 1743552000000,
  },
  {
    displayText:
      "After weeks of chaos, I finally let myself lie on the couch and do nothing. And you know what? Just existing in that moment felt like a gift.",
    primaryEmotion: "calmness",
    granularLabel: "grateful rest",
    thematicTags: ["health", "purpose"],
    intensity: 3,
    addedAt: 1743724800000,
  },
  {
    displayText:
      "My blood boils every time I remember how they used my secret against me. I want justice, but I have to stay calm for now.",
    primaryEmotion: "frustration",
    granularLabel: "resentment",
    thematicTags: ["relationships", "self-worth"],
    intensity: 8,
    addedAt: 1743811200000,
  },
  {
    displayText:
      "I have your message saved and I read it when I miss you. The smile fades quickly and I'm reminded that you're gone. My throat tightens again each time.",
    primaryEmotion: "grief",
    granularLabel: "persistent longing",
    thematicTags: ["loss", "purpose"],
    intensity: 7,
    addedAt: 1743811200000,
  },
  {
    displayText:
      "I bought a coffee today and remembered how you loved the exact same one. A wave of sadness hit me because I realized you won't be sharing it with me anymore.",
    primaryEmotion: "grief",
    granularLabel: "everyday grief",
    thematicTags: ["loss", "family"],
    intensity: 8,
    addedAt: 1743897600000,
  },
  {
    displayText:
      "After talking to my therapist, I still feel like I'm drowning in things I said wrong to someone. My mind keeps finding new things I did poorly, new ways I probably hurt them. It doesn't matter how many times I've apologized — the noise doesn't stop.",
    primaryEmotion: "shame",
    granularLabel: "relationship guilt",
    thematicTags: ["relationships", "self-worth"],
    intensity: 7,
    addedAt: 1743897600000,
  },
  {
    displayText:
      "I posted on Reddit expecting nothing to happen. I got a bunch of comments. Then I realized: People do care. I never expected it.",
    primaryEmotion: "hope",
    granularLabel: "unexpected kindness",
    thematicTags: ["relationships", "belonging"],
    intensity: 4,
    addedAt: 1743984000000,
  },
  {
    displayText:
      "It feels like something awful is on its way, even though I can't say what it is. Every time I feel peace, a whisper in me warns me it won't last.",
    primaryEmotion: "dread",
    granularLabel: "impending doom",
    thematicTags: ["health", "change"],
    intensity: 9,
    addedAt: 1743984000000,
  },
  {
    displayText:
      "I got promoted last week and everyone congratulates me, but inside I feel like a fraud. I have to keep proving I belong, and it's exhausting.",
    primaryEmotion: "anxiety",
    granularLabel: "self-doubt",
    thematicTags: ["work", "identity"],
    intensity: 7,
    addedAt: 1743984000000,
  },
  {
    displayText:
      "I'm supposed to be the example. My younger siblings look up to me, so how can I tell them I'm lost? I have to stay strong even when I feel like breaking.",
    primaryEmotion: "loneliness",
    granularLabel: "role model pressure",
    thematicTags: ["family", "identity", "self-worth"],
    intensity: 8,
    addedAt: 1743984000000,
  },
  {
    displayText:
      "I was sitting alone at lunch, about to stew in silence, when I randomly ran into an old teammate who asked if I was okay. I was sure they wouldn't care, but they did.",
    primaryEmotion: "hope",
    granularLabel: "unexpected support",
    thematicTags: ["relationships", "belonging"],
    intensity: 5,
    addedAt: 1744070400000,
  },
  {
    displayText:
      "I keep typing out texts to old friends, then deleting them because I don't want to bother anyone with my feelings. So I sit here scrolling on my own.",
    primaryEmotion: "loneliness",
    granularLabel: "fear of burdening others",
    thematicTags: ["relationships", "self-worth"],
    intensity: 7,
    addedAt: 1744070400000,
  },
  {
    displayText:
      "One minute I feel okay, then something small flips a switch and I'm spiraling again. It's like I don't even know which version of me I'll meet today.",
    primaryEmotion: "confusion",
    granularLabel: "mood swings",
    thematicTags: ["self-worth", "health"],
    intensity: 6,
    addedAt: 1743811200000,
  },
  {
    displayText:
      "People tell me I'm 'doing fine', but inside I break a little every time I hear that. I'm still learning how to breathe through this emptiness.",
    primaryEmotion: "grief",
    granularLabel: "forced optimism",
    thematicTags: ["loss", "self-worth"],
    intensity: 6,
    addedAt: 1744070400000,
  },
  {
    displayText:
      "I can't cry, can't scream, can't really feel anything but a fog. Even my favorite song today just made me feel blank.",
    primaryEmotion: "numbness",
    granularLabel: "flat affect",
    thematicTags: ["health", "identity"],
    intensity: 7,
    addedAt: 1743465600000,
  },
  {
    displayText:
      "I keep thinking I'll wake up and this nightmare will be over. But every morning I open my eyes and it's the same world without you.",
    primaryEmotion: "grief",
    granularLabel: "persistent longing",
    thematicTags: ["loss", "purpose"],
    intensity: 7,
    addedAt: 1743897600000,
  },
  {
    displayText:
      "I realized I didn't spend my entire day worrying for once. I was actually present and it's a tiny victory I didn't even notice at first.",
    primaryEmotion: "happiness",
    granularLabel: "mindfulness moment",
    thematicTags: ["health", "purpose"],
    intensity: 4,
    addedAt: 1743811200000,
  },
];

/**
 * Seed the full beta launch pool (125 curated reflections).
 *
 * Run once from the Convex dashboard or CLI:
 *   bunx convex run seed:seedReflections
 *
 * Safe to re-run — each batch upserts by displayText so repeated runs
 * and partial-failure recoveries never produce duplicates.
 */
export const seedReflections = internalAction({
  args: {},
  handler: async (ctx) => {
    // Run all three batches every time; internal.reflections.seed skips
    // any reflection whose displayText already exists in the table.
    await ctx.runMutation(internal.reflections.seed, {
      reflections: [...BATCH_A],
    });
    await ctx.runMutation(internal.reflections.seed, {
      reflections: [...BATCH_B],
    });
    await ctx.runMutation(internal.reflections.seed, {
      reflections: [...BATCH_C],
    });

    const total = BATCH_A.length + BATCH_B.length + BATCH_C.length;
    console.log(`[seed] Seed complete — pool contains up to ${total} reflections.`);
    return { seeded: true, count: total };
  },
});

// ---------------------------------------------------------------------------
// Exercise seed data — 6 exercises for beta.
// Run: bunx convex run seed:seedExercises
// Safe to re-run — upserts by title.
// ---------------------------------------------------------------------------

const EXERCISES = [
  {
    title: "let_it_land",
    type: "grounding" as const,
    targetEmotions: ["sadness", "confusion", "relief", "loneliness"],
    intensityRange: { min: 2, max: 7 },
    estimatedMinutes: 1.5,
    steps: [
      {
        order: 1,
        type: "text" as const,
        content: "You named it. Let's just sit with that for a moment.",
        durationSeconds: 4,
      },
      {
        order: 2,
        type: "text" as const,
        content: "{{mirror_line}}",
        defaultContent: "What you named is here with you.",
        durationSeconds: 3,
        slotKeys: ["mirror_line"],
      },
      {
        order: 3,
        type: "breath" as const,
        content: "Breathe with it.",
        breathPattern: "physiological_sigh" as const,
        breathCycles: 2,
        hapticIntensity: "light" as const,
      },
      {
        order: 4,
        type: "text" as const,
        content: "Notice where in your body '{{user_phrase}}' lives right now. Not to fix it. Just so it knows you heard it.",
        defaultContent: "Notice where this lives in your body right now. Not to fix it. Just so it knows you heard it.",
        durationSeconds: 6,
        slotKeys: ["user_phrase"],
      },
      {
        order: 5,
        type: "text" as const,
        content: "You don't have to do anything with it.",
        durationSeconds: 6,
      },
    ],
  },
  {
    title: "find_your_edges",
    type: "body_scan" as const,
    targetEmotions: ["numbness", "confusion"],
    intensityRange: { min: 1, max: 5 },
    estimatedMinutes: 2,
    steps: [
      {
        order: 1,
        type: "text" as const,
        content: "Before anything else, let's find where you are.",
        durationSeconds: 5,
      },
      {
        order: 2,
        type: "text" as const,
        content: "Look around. Don't move your head much — just your eyes.",
        durationSeconds: 4,
      },
      {
        order: 3,
        type: "text" as const,
        content: "Find three things. A corner. A shadow. A color. Anything.",
        durationSeconds: 6,
      },
      {
        order: 4,
        type: "text" as const,
        content: "Now feel your feet. Whatever they're touching.",
        durationSeconds: 5,
      },
      {
        order: 5,
        type: "text" as const,
        content: "Your back. Against what's behind it.",
        durationSeconds: 5,
      },
      {
        order: 6,
        type: "text" as const,
        content: "Hands. What temperature are they.",
        durationSeconds: 6,
      },
      {
        order: 7,
        type: "breath" as const,
        content: "One slow exhale.",
        breathPattern: "slow_exhale" as const,
        breathCycles: 1,
      },
      {
        order: 8,
        type: "text" as const,
        content: "You're here. That's enough.",
        durationSeconds: 5,
      },
    ],
  },
  {
    title: "make_room",
    type: "cognitive_reframe" as const,
    targetEmotions: ["overwhelm", "helplessness", "dread", "anxiety"],
    intensityRange: { min: 4, max: 9 },
    estimatedMinutes: 1.5,
    steps: [
      {
        order: 1,
        type: "text" as const,
        content: "{{mirror_line}}",
        defaultContent: "You're carrying something heavy.",
        durationSeconds: 4,
        slotKeys: ["mirror_line"],
      },
      {
        order: 2,
        type: "text" as const,
        content: "What if you didn't have to make this smaller right now?",
        durationSeconds: 4,
      },
      {
        order: 3,
        type: "breath" as const,
        content: "Breathing in; imagine giving it room.\nBreathing out; rest beside it.",
        breathPattern: "extended_exhale" as const,
        breathCycles: 3,
      },
      {
        order: 4,
        type: "text" as const,
        content: "It doesn't have to leave to stop hurting.",
        durationSeconds: 6,
        syncToBreath: true,
        breathPattern: "slow_exhale" as const,
        breathCycles: 1,
      },
      {
        order: 5,
        type: "text" as const,
        content: "You stayed.",
        durationSeconds: 5,
      },
    ],
  },
  {
    title: "speak_to_it",
    type: "journaling_prompt" as const,
    targetEmotions: ["anger", "frustration"],
    intensityRange: { min: 3, max: 8 },
    estimatedMinutes: 2.5,
    steps: [
      {
        order: 1,
        type: "text" as const,
        content: "Something in you is {{user_emotion}}.",
        defaultContent: "Something in you is stirred up.",
        durationSeconds: 5,
        slotKeys: ["user_emotion"],
      },
      {
        order: 2,
        type: "text" as const,
        content: "Not all of you. Something.",
        durationSeconds: 4,
      },
      {
        order: 3,
        type: "text" as const,
        content: "If it could speak, what does it want you to know?",
        durationSeconds: 6,
      },
      {
        order: 4,
        type: "private_prompt" as const,
        content: "This stays on your phone. No one else will see it.",
        promptPlaceholder: "What does it want you to know?",
        promptMaxSeconds: 60,
      },
      {
        order: 5,
        type: "text" as const,
        content: "You heard it. That matters.",
        durationSeconds: 4,
      },
      {
        order: 6,
        type: "text" as const,
        content: "You stayed.",
        durationSeconds: 5,
      },
    ],
  },
  {
    title: "soften_toward_it",
    type: "self_compassion" as const,
    targetEmotions: ["shame"],
    intensityRange: { min: 3, max: 8 },
    estimatedMinutes: 1.5,
    steps: [
      {
        order: 1,
        type: "text" as const,
        content: "You said: '{{user_phrase}}'.",
        defaultContent: "You named something hard.",
        durationSeconds: 4,
        slotKeys: ["user_phrase"],
      },
      {
        order: 2,
        type: "text" as const,
        content: "Right now, in this moment, you're not the only one feeling something like this.",
        durationSeconds: 5,
      },
      {
        order: 3,
        type: "text" as const,
        content: "Place a hand somewhere on yourself. Chest, arm, face, wherever feels natural.",
        durationSeconds: 5,
      },
      {
        order: 4,
        type: "haptic" as const,
        content: "",
        defaultContent: "Feel your hand resting there.",
        hapticIntensity: "medium" as const,
        durationSeconds: 4,
      },
      {
        order: 5,
        type: "text" as const,
        content: "If you could offer yourself one kind sentence, what would it be?",
        durationSeconds: 6,
      },
      {
        order: 6,
        type: "text" as const,
        content: "You don't have to say it out loud. Just let yourself hear it.",
        durationSeconds: 6,
        syncToBreath: true,
        breathPattern: "slow_exhale" as const,
        breathCycles: 1,
      },
      {
        order: 7,
        type: "text" as const,
        content: "That was kind. You stayed.",
        durationSeconds: 5,
      },
    ],
  },
  {
    title: "reset",
    type: "breathing" as const,
    targetEmotions: ["anxiety", "overwhelm", "dread"],
    intensityRange: { min: 5, max: 10 },
    estimatedMinutes: 1,
    steps: [
      {
        order: 1,
        type: "text" as const,
        content: "Three breaths. That's it.",
        durationSeconds: 3,
      },
      {
        order: 2,
        type: "breath" as const,
        content: "",
        breathPattern: "physiological_sigh" as const,
        breathCycles: 3,
        hapticIntensity: "light" as const,
      },
      {
        order: 3,
        type: "text" as const,
        content: "That was enough.",
        durationSeconds: 4,
      },
      {
        order: 4,
        type: "text" as const,
        content: "Okay.",
        durationSeconds: 4,
      },
    ],
  },
];

/**
 * Seed the 6 beta exercises into the library.
 *
 * Run: bunx convex run seed:seedExercises
 * Safe to re-run — upserts by title.
 */
export const seedExercises = internalAction({
  args: {},
  handler: async (ctx) => {
    await ctx.runMutation(internal.exercises.seed, { exercises: EXERCISES });
    console.log(`[seed] ${EXERCISES.length} exercises seeded.`);
    return { seeded: true, count: EXERCISES.length };
  },
});

// ---------------------------------------------------------------------------
// Quotes seed — 130+ curated quotes across 18 emotional themes.
//
// Run: bunx convex run seed:seedQuotes
// Safe to re-run — quotes:seed skips if library is not empty.
// Pass force=true to override: bunx convex run seed:seedQuotes '{"force":true}'
// ---------------------------------------------------------------------------

const QUOTES: {
  text: string;
  title: string;
  themes: string[];
  source?: string;
  language: string;
}[] = [
  // ── Assist 1: resilience · self-compassion · relationships · grief-and-loss · change · anxiety ──
  {
    text: "You may encounter many defeats, but you must not be defeated. In fact, it may be necessary to encounter the defeats, so you can know who you are.",
    title: "Still standing",
    themes: ["resilience"],
    source: "Maya Angelou",
    language: "en",
  },
  {
    text: "There is a crack in everything. That's how the light gets in.",
    title: "The crack",
    themes: ["resilience", "change"],
    source: "Leonard Cohen",
    language: "en",
  },
  {
    text: "Talk to yourself like you would to someone you love.",
    title: "Kind words",
    themes: ["self-compassion"],
    source: "Brené Brown",
    language: "en",
  },
  {
    text: "What is to give light must endure burning.",
    title: "Giving light",
    themes: ["resilience"],
    source: "Viktor E. Frankl",
    language: "en",
  },
  {
    text: "The wound is the place where the Light enters you.",
    title: "Light enters",
    themes: ["grief-and-loss", "resilience"],
    source: "Rumi",
    language: "en",
  },
  {
    text: "Do not feel lonely, the entire universe is inside you.",
    title: "Never alone",
    themes: ["self-compassion"],
    source: "Rumi",
    language: "en",
  },
  {
    text: "Anxiety is the dizziness of freedom.",
    title: "Dizzy freedom",
    themes: ["anxiety"],
    source: "Søren Kierkegaard",
    language: "en",
  },
  {
    text: "Grief is the price we pay for love.",
    title: "The price of love",
    themes: ["grief-and-loss", "relationships"],
    source: "Queen Elizabeth II",
    language: "en",
  },
  {
    text: "Love after love, the person you will greet again is yourself.",
    title: "Meeting yourself",
    themes: ["self-compassion", "change"],
    source: "Derek Walcott",
    language: "en",
  },
  {
    text: "The only way to make sense out of change is to plunge into it, move with it, and join the dance.",
    title: "Join the dance",
    themes: ["change"],
    source: "Alan Watts",
    language: "en",
  },
  {
    text: "We are healed from suffering only by experiencing it to the full.",
    title: "All the way",
    themes: ["grief-and-loss"],
    source: "Marcel Proust",
    language: "en",
  },
  {
    text: "You do not have to be good. You only have to let the soft animal of your body love what it loves.",
    title: "Soft animal",
    themes: ["self-compassion"],
    source: "Mary Oliver",
    language: "en",
  },
  {
    text: "No feeling is final.",
    title: "Nothing is final",
    themes: ["resilience", "anxiety"],
    source: "Rainer Maria Rilke",
    language: "en",
  },
  {
    text: "The meeting of two personalities is like the contact of two chemical substances: if there is any reaction, both are transformed.",
    title: "Two substances",
    themes: ["relationships", "change"],
    source: "Carl Jung",
    language: "en",
  },
  {
    text: "To love at all is to be vulnerable.",
    title: "Open heart",
    themes: ["relationships"],
    source: "C. S. Lewis",
    language: "en",
  },
  {
    text: "Feelings come and go like clouds in a windy sky. Conscious breathing is my anchor.",
    title: "Clouds passing",
    themes: ["anxiety", "self-compassion"],
    source: "Thich Nhat Hanh",
    language: "en",
  },
  {
    text: "Life is a balance of holding on and letting go.",
    title: "Hold and release",
    themes: ["change", "grief-and-loss"],
    source: "Rumi",
    language: "en",
  },
  {
    text: "Out of suffering have emerged the strongest souls; the most massive characters are seared with scars.",
    title: "Seared souls",
    themes: ["resilience"],
    source: "Khalil Gibran",
    language: "en",
  },
  {
    text: "Sometimes the bravest and most important thing you can do is just show up.",
    title: "Just show up",
    themes: ["resilience"],
    source: "Brené Brown",
    language: "en",
  },
  {
    text: "The best way out is always through.",
    title: "Straight through",
    themes: ["grief-and-loss", "resilience"],
    source: "Robert Frost",
    language: "en",
  },
  {
    text: "You yourself, as much as anybody in the entire universe, deserve your love and affection.",
    title: "Your affection",
    themes: ["self-compassion"],
    source: "Buddha",
    language: "en",
  },
  {
    text: "Friendship marks a life even more deeply than love. Love risks degenerating into obsession, friendship is never anything but sharing.",
    title: "Two kinds of love",
    themes: ["relationships"],
    source: "Elie Wiesel",
    language: "en",
  },
  {
    text: "Nothing is so painful to the human mind as a great and sudden change.",
    title: "Sudden change",
    themes: ["change", "anxiety"],
    source: "Mary Shelley",
    language: "en",
  },
  {
    text: "Grief can be a burden, but also an anchor. You get used to the weight, how it holds you in place.",
    title: "Grief as anchor",
    themes: ["grief-and-loss"],
    source: "Sarah Dessen",
    language: "en",
  },
  {
    text: "Do not anticipate trouble, or worry about what may never happen. Keep in the sunlight.",
    title: "Keep in sunlight",
    themes: ["anxiety"],
    source: "Benjamin Franklin",
    language: "en",
  },
  {
    text: "When we are no longer able to change a situation, we are challenged to change ourselves.",
    title: "Change yourself",
    themes: ["change", "resilience"],
    source: "Viktor E. Frankl",
    language: "en",
  },
  {
    text: "The emotion that can break your heart is sometimes the very one that heals it.",
    title: "The same heart",
    themes: ["relationships", "grief-and-loss"],
    source: "Nicholas Sparks",
    language: "en",
  },
  {
    text: "Be patient toward all that is unsolved in your heart and try to love the questions themselves.",
    title: "The questions",
    themes: ["anxiety", "self-compassion"],
    source: "Rainer Maria Rilke",
    language: "en",
  },
  {
    text: "What breaks us apart also has the power to put us back together again.",
    title: "Put back together",
    themes: ["relationships", "resilience"],
    source: "bell hooks",
    language: "en",
  },
  {
    text: "Tears are words that need to be written.",
    title: "Unwritten words",
    themes: ["grief-and-loss"],
    source: "Paulo Coelho",
    language: "en",
  },

  // ── Assist 2: identity · loneliness · healing · acceptance · purpose · self-worth ──
  {
    text: "I took a deep breath and listened to the old brag of my heart: I am, I am, I am.",
    title: "The old brag",
    themes: ["identity", "self-worth"],
    source: "Sylvia Plath",
    language: "en",
  },
  {
    text: "To be nobody but yourself in a world which is doing its best, night and day, to make you everybody else means to fight the hardest battle which any human being can fight; and never stop fighting.",
    title: "Nobody but you",
    themes: ["identity"],
    source: "E.E. Cummings",
    language: "en",
  },
  {
    text: "I am large, I contain multitudes.",
    title: "Multitudes",
    themes: ["identity"],
    source: "Walt Whitman",
    language: "en",
  },
  {
    text: "Not until we are lost do we begin to find ourselves.",
    title: "Lost and found",
    themes: ["identity"],
    source: "Henry David Thoreau",
    language: "en",
  },
  {
    text: "Knowing yourself is the beginning of all wisdom.",
    title: "Begin here",
    themes: ["identity", "purpose"],
    source: "Aristotle",
    language: "en",
  },
  {
    text: "You are not a drop in the ocean. You are the entire ocean in a drop.",
    title: "Ocean in a drop",
    themes: ["identity", "self-worth"],
    source: "Rumi",
    language: "en",
  },
  {
    text: "We know what we are, but know not what we may be.",
    title: "What we may be",
    themes: ["identity"],
    source: "William Shakespeare",
    language: "en",
  },
  {
    text: "Perhaps all the dragons in our lives are princesses who are only waiting to see us act, just once, with beauty and courage.",
    title: "The dragons",
    themes: ["identity", "healing"],
    source: "Rainer Maria Rilke",
    language: "en",
  },
  {
    text: "The unexamined life is not worth living.",
    title: "Worth examining",
    themes: ["identity", "purpose"],
    source: "Socrates",
    language: "en",
  },
  {
    text: "What I am is good enough if I would only be it openly.",
    title: "Good enough",
    themes: ["identity", "self-worth"],
    source: "Carl Rogers",
    language: "en",
  },
  {
    text: "Loneliness is the poverty of self; solitude is the richness of self.",
    title: "Solitude",
    themes: ["loneliness"],
    source: "May Sarton",
    language: "en",
  },
  {
    text: "Language has created the word loneliness to express the pain of being alone, and it has created the word solitude to express the glory of being alone.",
    title: "Two words",
    themes: ["loneliness"],
    source: "Paul Tillich",
    language: "en",
  },
  {
    text: "All great and precious things are lonely.",
    title: "Lonely, precious",
    themes: ["loneliness"],
    source: "John Steinbeck",
    language: "en",
  },
  {
    text: "I exist as I am, that is enough.",
    title: "Enough as I am",
    themes: ["loneliness", "self-worth"],
    source: "Walt Whitman",
    language: "en",
  },
  {
    text: "The worst loneliness is not to be comfortable with yourself.",
    title: "Your own company",
    themes: ["loneliness", "self-worth"],
    source: "Mark Twain",
    language: "en",
  },
  {
    text: "Inside myself is a place where I live all alone and that is where you renew your springs that never dry up.",
    title: "The inner place",
    themes: ["loneliness"],
    source: "Pearl S. Buck",
    language: "en",
  },
  {
    text: "What a lovely surprise to finally discover how unlonely being alone can be.",
    title: "Unlonely",
    themes: ["loneliness", "acceptance"],
    source: "Ellen Burstyn",
    language: "en",
  },
  {
    text: "The soul that sees beauty may sometimes walk alone.",
    title: "Walking alone",
    themes: ["loneliness"],
    source: "Johann Wolfgang von Goethe",
    language: "en",
  },
  {
    text: "In solitude the mind gains strength and learns to lean upon itself.",
    title: "Leaning inward",
    themes: ["loneliness"],
    source: "Laurence Sterne",
    language: "en",
  },
  {
    text: "There is a loneliness that can be rocked. Arms crossed, knees drawn up, holding, holding on.",
    title: "Rocking sorrow",
    themes: ["loneliness"],
    source: "Toni Morrison",
    language: "en",
  },
  {
    text: "Give sorrow words; the grief that does not speak knits up the o'erwrought heart and bids it break.",
    title: "Speak the grief",
    themes: ["healing"],
    source: "William Shakespeare",
    language: "en",
  },
  {
    text: "Although the world is full of suffering, it is also full of the overcoming of it.",
    title: "Overcoming",
    themes: ["healing", "acceptance"],
    source: "Helen Keller",
    language: "en",
  },
  {
    text: "One does not become enlightened by imagining figures of light, but by making the darkness conscious.",
    title: "Conscious dark",
    themes: ["healing"],
    source: "Carl Jung",
    language: "en",
  },
  {
    text: "Sometimes the most important thing in a whole day is the rest we take between two deep breaths.",
    title: "Between breaths",
    themes: ["healing"],
    source: "Etty Hillesum",
    language: "en",
  },
  {
    text: "In three words I can sum up everything I've learned about life: it goes on.",
    title: "It goes on",
    themes: ["healing", "acceptance"],
    source: "Robert Frost",
    language: "en",
  },
  {
    text: "We cannot change anything unless we accept it.",
    title: "Accept first",
    themes: ["acceptance"],
    source: "Carl Jung",
    language: "en",
  },
  {
    text: "The curious paradox is that when I accept myself just as I am, then I can change.",
    title: "Paradox of change",
    themes: ["acceptance", "self-worth"],
    source: "Carl Rogers",
    language: "en",
  },
  {
    text: "Not everything that is faced can be changed, but nothing can be changed until it is faced.",
    title: "Facing it",
    themes: ["acceptance"],
    source: "James Baldwin",
    language: "en",
  },
  {
    text: "You must give up the life you planned in order to have the life that is waiting for you.",
    title: "The life waiting",
    themes: ["acceptance"],
    source: "Joseph Campbell",
    language: "en",
  },
  {
    text: "Accept the things to which fate binds you, and love the people with whom fate brings you together, and do so with all your heart.",
    title: "What fate brings",
    themes: ["acceptance"],
    source: "Marcus Aurelius",
    language: "en",
  },
  {
    text: "You can't stop the waves, but you can learn to surf.",
    title: "Learn to surf",
    themes: ["acceptance"],
    source: "Jon Kabat-Zinn",
    language: "en",
  },
  {
    text: "Be yourself; everyone else is already taken.",
    title: "Already taken",
    themes: ["acceptance", "identity"],
    source: "Oscar Wilde",
    language: "en",
  },
  {
    text: "Life can only be understood backwards; but it must be lived forwards.",
    title: "Lived forwards",
    themes: ["acceptance"],
    source: "Søren Kierkegaard",
    language: "en",
  },
  {
    text: "He who has a why to live for can bear almost any how.",
    title: "A why to live",
    themes: ["purpose"],
    source: "Friedrich Nietzsche",
    language: "en",
  },
  {
    text: "The purpose of life is not to be happy. It is to be useful, to be honorable, to be compassionate, to have it make some difference that you have lived and lived well.",
    title: "More than happy",
    themes: ["purpose"],
    source: "Ralph Waldo Emerson",
    language: "en",
  },
  {
    text: "Many people die with their music still in them. Too often it is because they are always getting ready to live. Before they know it, time runs out.",
    title: "The music left",
    themes: ["purpose"],
    source: "Oliver Wendell Holmes Sr.",
    language: "en",
  },
  {
    text: "What man actually needs is not a tensionless state but rather the striving and struggling for a worthwhile goal, a freely chosen task.",
    title: "Worthy struggle",
    themes: ["purpose"],
    source: "Viktor Frankl",
    language: "en",
  },
  {
    text: "Don't ask what the world needs. Ask what makes you come alive, and go do it. Because what the world needs is people who have come alive.",
    title: "Come alive",
    themes: ["purpose"],
    source: "Howard Thurman",
    language: "en",
  },
  {
    text: "It is not enough to be busy. So are the ants. The question is: What are we busy about?",
    title: "Busy about what",
    themes: ["purpose"],
    source: "Henry David Thoreau",
    language: "en",
  },
  {
    text: "Tell me, what is it you plan to do with your one wild and precious life?",
    title: "One wild life",
    themes: ["purpose"],
    source: "Mary Oliver",
    language: "en",
  },
  {
    text: "Efforts and courage are not enough without purpose and direction.",
    title: "Courage needs aim",
    themes: ["purpose"],
    source: "John F. Kennedy",
    language: "en",
  },
  {
    text: "The place God calls you to is the place where your deep gladness and the world's deep hunger meet.",
    title: "Deep gladness",
    themes: ["purpose"],
    source: "Frederick Buechner",
    language: "en",
  },
  {
    text: "No one can make you feel inferior without your consent.",
    title: "Without consent",
    themes: ["self-worth"],
    source: "Eleanor Roosevelt",
    language: "en",
  },
  {
    text: "Owning our story and loving ourselves through that process is the bravest thing that we will ever do.",
    title: "The bravest thing",
    themes: ["self-worth"],
    source: "Brené Brown",
    language: "en",
  },
  {
    text: "You alone are enough. You have nothing to prove to anybody.",
    title: "Nothing to prove",
    themes: ["self-worth"],
    source: "Maya Angelou",
    language: "en",
  },
  {
    text: "If only you could sense how important you are to the lives of those you meet; how important you can be to people you may never even dream of.",
    title: "How important",
    themes: ["self-worth"],
    source: "Fred Rogers",
    language: "en",
  },

  // ── Assist 3: burnout · hope · growth · fear · motivation · inspiration ──
  {
    text: "I have found that if you love life, life will love you back.",
    title: "Love loves back",
    themes: ["hope", "inspiration"],
    source: "Arthur Rubinstein",
    language: "en",
  },
  {
    text: "The only way to deal with an unfree world is to become so absolutely free that your very existence is an act of rebellion.",
    title: "Absolutely free",
    themes: ["motivation", "inspiration"],
    source: "Albert Camus",
    language: "en",
  },
  {
    text: "I will not rescue you. For you are not powerless.",
    title: "Not powerless",
    themes: ["motivation"],
    source: "Audre Lorde",
    language: "en",
  },
  {
    text: "It is worth being forcefully reminded that the world is larger than our anxieties about it.",
    title: "Larger than fear",
    themes: ["fear"],
    source: "Alain de Botton",
    language: "en",
  },
  {
    text: "May your choices reflect your hopes, not your fears.",
    title: "Hopes not fears",
    themes: ["hope", "fear"],
    source: "Nelson Mandela",
    language: "en",
  },
  {
    text: "I am not afraid of storms, for I am learning how to sail my ship.",
    title: "Learning to sail",
    themes: ["fear", "growth"],
    source: "Louisa May Alcott",
    language: "en",
  },
  {
    text: "The oak fought the wind and was broken, the willow bent when it must and survived.",
    title: "Oak and willow",
    themes: ["burnout", "growth"],
    source: "Robert Jordan",
    language: "en",
  },
  {
    text: "There is a stubbornness about me that never can bear to be frightened at the will of others. My courage always rises at every attempt to intimidate me.",
    title: "My own courage",
    themes: ["fear", "motivation"],
    source: "Jane Austen",
    language: "en",
  },
  {
    text: "We are all in the gutter, but some of us are looking at the stars.",
    title: "Looking at stars",
    themes: ["hope", "inspiration"],
    source: "Oscar Wilde",
    language: "en",
  },
  {
    text: "You must rest. A field that has rested gives a bountiful crop.",
    title: "The rested field",
    themes: ["burnout"],
    source: "Ovid",
    language: "en",
  },
  {
    text: "It is during our darkest moments that we must focus to see the light.",
    title: "Darkest moments",
    themes: ["hope"],
    source: "Aristotle",
    language: "en",
  },
  {
    text: "Do not let your grand ambitions stand in the way of small, meaningful steps.",
    title: "Small steps",
    themes: ["motivation", "growth"],
    source: "Thomas Carlyle",
    language: "en",
  },
  {
    text: "The completely clear individual is a myth. We are all messy, and that is where the growth happens.",
    title: "All messy",
    themes: ["growth"],
    source: "Carl Rogers",
    language: "en",
  },
  {
    text: "There are years that ask questions and years that answer.",
    title: "Ask, then answer",
    themes: ["growth"],
    source: "Zora Neale Hurston",
    language: "en",
  },
  {
    text: "The cure for anything is salt water: sweat, tears or the sea.",
    title: "Salt water",
    themes: ["burnout"],
    source: "Isak Dinesen",
    language: "en",
  },
  {
    text: "It is not the mountain we conquer, but ourselves.",
    title: "Not the mountain",
    themes: ["growth", "motivation"],
    source: "Edmund Hillary",
    language: "en",
  },
  {
    text: "Fear is a habit; I am not afraid.",
    title: "Unafraid",
    themes: ["fear"],
    source: "Ayn Rand",
    language: "en",
  },
  {
    text: "You must build your own world, or be crushed by the one others construct for you.",
    title: "Build your world",
    themes: ["motivation"],
    source: "Anaïs Nin",
    language: "en",
  },
  {
    text: "We must be willing to let go of the life we planned so as to have the life that is waiting for us.",
    title: "Let the plan go",
    themes: ["growth", "fear"],
    source: "Joseph Campbell",
    language: "en",
  },
  {
    text: "The weight of the world is too heavy to carry alone, and you were never meant to.",
    title: "Never meant alone",
    themes: ["burnout"],
    source: "James Baldwin",
    language: "en",
  },
  {
    text: "Everything you have ever wanted is on the other side of fear.",
    title: "Past the fear",
    themes: ["fear", "inspiration"],
    source: "George Addair",
    language: "en",
  },
  {
    text: "What is necessary is to look at things as they are, and to move forward without false illusions.",
    title: "No illusions",
    themes: ["motivation"],
    source: "Simone de Beauvoir",
    language: "en",
  },
  {
    text: "I have run out of words, run out of juice, run out of everything but the sheer will to keep existing.",
    title: "Sheer will",
    themes: ["burnout"],
    source: "Sylvia Plath",
    language: "en",
  },
  {
    text: "To be creative means to be in love with life. You can be creative only if you love life enough that you want to enhance its beauty.",
    title: "In love with life",
    themes: ["inspiration"],
    source: "Osho",
    language: "en",
  },
  {
    text: "In the midst of winter, I found there was, within me, an invincible summer.",
    title: "Invincible summer",
    themes: ["hope", "burnout"],
    source: "Albert Camus",
    language: "en",
  },
  {
    text: "We do not heal the past by dwelling there; we heal the past by living fully in the present.",
    title: "Living fully",
    themes: ["growth"],
    source: "Marianne Williamson",
    language: "en",
  },
  {
    text: "Fear is only as deep as the mind allows.",
    title: "Only as deep",
    themes: ["fear"],
    source: "Japanese Proverb",
    language: "en",
  },
  {
    text: "The soul usually knows what to do to heal itself. The challenge is to silence the mind.",
    title: "Silence the mind",
    themes: ["burnout"],
    source: "Caroline Myss",
    language: "en",
  },
  {
    text: "Go to the edge of the cliff and jump off. Build your wings on the way down.",
    title: "Build your wings",
    themes: ["motivation", "inspiration"],
    source: "Ray Bradbury",
    language: "en",
  },
  {
    text: "Hope is the thing with feathers that perches in the soul and sings the tune without the words.",
    title: "With feathers",
    themes: ["hope"],
    source: "Emily Dickinson",
    language: "en",
  },
  {
    text: "It takes courage to grow up and become who you really are.",
    title: "Courage to grow",
    themes: ["growth", "fear"],
    source: "E.E. Cummings",
    language: "en",
  },
  {
    text: "I have been tired for so long that I have forgotten what it feels like to be alive without a weight on my chest.",
    title: "Tired for so long",
    themes: ["burnout"],
    source: "Virginia Woolf",
    language: "en",
  },
  {
    text: "Do not desire to be clean of all your stains; they are the maps of where you have been.",
    title: "Maps of where",
    themes: ["growth"],
    source: "Leo Tolstoy",
    language: "en",
  },
  {
    text: "One can choose to go back toward safety or forward toward growth. Growth must be chosen again and again; fear must be overcome again and again.",
    title: "Choose growth",
    themes: ["growth", "fear"],
    source: "Abraham Maslow",
    language: "en",
  },
  {
    text: "Action is a great restorer and builder of confidence. Inaction is not only the result, but the cause, of fear.",
    title: "Action restores",
    themes: ["fear", "motivation"],
    source: "Norman Vincent Peale",
    language: "en",
  },
  {
    text: "The greatest thing in the world is not so much where we stand, as in what direction we are moving.",
    title: "Which direction",
    themes: ["growth", "inspiration"],
    source: "Oliver Wendell Holmes Jr.",
    language: "en",
  },
  {
    text: "I am dripping with exhaustion, yet my mind refuses to sleep. It feels like a machine that forgot how to turn off.",
    title: "The machine",
    themes: ["burnout"],
    source: "Franz Kafka",
    language: "en",
  },
  {
    text: "I dwell in possibility.",
    title: "Possibility",
    themes: ["hope", "inspiration"],
    source: "Emily Dickinson",
    language: "en",
  },
  {
    text: "Even a happy life cannot be without a measure of darkness, and the word happy would lose its meaning if it were not balanced by sadness.",
    title: "A measure of dark",
    themes: ["hope"],
    source: "Carl Jung",
    language: "en",
  },
  {
    text: "The world breaks everyone and afterward many are strong at the broken places.",
    title: "Broken places",
    themes: ["growth", "burnout"],
    source: "Ernest Hemingway",
    language: "en",
  },
  {
    text: "The question isn't who is going to let me; it's who is going to stop me.",
    title: "Who will stop me",
    themes: ["motivation"],
    source: "Ayn Rand",
    language: "en",
  },
  {
    text: "A genuine text or piece of art allows us to see ourselves clearly, even the parts we hide.",
    title: "Seeing ourselves",
    themes: ["inspiration"],
    source: "bell hooks",
    language: "en",
  },
  {
    text: "The light is not at the end of the tunnel. The light is within you, and you must carry it through.",
    title: "Carry the light",
    themes: ["hope"],
    source: "Kahlil Gibran",
    language: "en",
  },
  {
    text: "Tension is who you think you should be. Relaxation is who you are.",
    title: "Tense or at ease",
    themes: ["burnout"],
    source: "Chinese Proverb",
    language: "en",
  },
  {
    text: "The most beautiful things in the world cannot be seen or even touched, they must be felt with the heart.",
    title: "Felt, not seen",
    themes: ["inspiration"],
    source: "Helen Keller",
    language: "en",
    },
// New (21st sept)
  //  purpose, hope, motivation, inspiration, growth
  
    {
      text: "Waste no more time arguing about what a good man should be. Be one.",
      title: "Be one",
      themes: ["purpose", "motivation"],
      source: "Marcus Aurelius",
      language: "en",
    },
    {
      text: "If a man knows not to which port he sails, no wind is favorable.",
      title: "Which port",
      themes: ["purpose", "motivation"],
      source: "Seneca",
      language: "en",
    },
    {
      text: "If one advances confidently in the direction of his dreams, and endeavors to live the life which he has imagined, he will meet with a success unexpected in common hours.",
      title: "Toward your dreams",
      themes: ["purpose", "motivation", "inspiration"],
      source: "Henry David Thoreau",
      language: "en",
    },
    {
      text: "Life is either a daring adventure or nothing at all.",
      title: "Daring adventure",
      themes: ["purpose", "inspiration"],
      source: "Helen Keller",
      language: "en",
    },
    {
      text: "Let yourself be silently drawn by the strange pull of what you really love. It will not lead you astray.",
      title: "The strange pull",
      themes: ["purpose", "inspiration"],
      source: "Rumi",
      language: "en",
    },
    {
      text: "What you seek is seeking you.",
      title: "Seeking you",
      themes: ["purpose", "hope"],
      source: "Rumi",
      language: "en",
    },
    {
      text: "If you do follow your bliss you put yourself on a kind of track that has been there all the while, waiting for you, and the life that you ought to be living is the one you are living.",
      title: "Follow your bliss",
      themes: ["purpose", "inspiration"],
      source: "Joseph Campbell",
      language: "en",
    },
    {
      text: "To live is the rarest thing in the world. Most people exist, that is all.",
      title: "Rarest thing",
      themes: ["purpose", "inspiration"],
      source: "Oscar Wilde",
      language: "en",
    },
    {
      text: "Work is love made visible.",
      title: "Love made visible",
      themes: ["purpose"],
      source: "Kahlil Gibran",
      language: "en",
    },
    {
      text: "How wonderful it is that nobody need wait a single moment before starting to improve the world.",
      title: "Start now",
      themes: ["purpose", "motivation", "hope"],
      source: "Anne Frank",
      language: "en",
    },
    {
      text: "Life's most persistent and urgent question is, 'What are you doing for others?'",
      title: "Urgent question",
      themes: ["purpose"],
      source: "Martin Luther King Jr.",
      language: "en",
    },
    {
      text: "Hope is not the conviction that something will turn out well, but the certainty that something makes sense, regardless of how it turns out.",
      title: "What hope is",
      themes: ["hope", "purpose"],
      source: "Václav Havel",
      language: "en",
    },
    {
      text: "I am seeking, I am striving, I am in it with all my heart.",
      title: "All my heart",
      themes: ["motivation", "purpose"],
      source: "Vincent van Gogh",
      language: "en",
    },
    {
      text: "Great things are done by a series of small things brought together.",
      title: "Small things",
      themes: ["motivation", "growth"],
      source: "Vincent van Gogh",
      language: "en",
    },
    {
      text: "If you hear a voice within you say 'you cannot paint,' then by all means paint, and that voice will be silenced.",
      title: "Then paint",
      themes: ["motivation", "inspiration"],
      source: "Vincent van Gogh",
      language: "en",
    },
    {
      text: "You may not control all the events that happen to you, but you can decide not to be reduced by them.",
      title: "Not reduced",
      themes: ["growth", "hope"],
      source: "Maya Angelou",
      language: "en",
    },
    {
      text: "Nothing will work unless you do.",
      title: "Nothing will work",
      themes: ["motivation"],
      source: "Maya Angelou",
      language: "en",
    },
    {
      text: "Try to be a rainbow in someone's cloud.",
      title: "Be a rainbow",
      themes: ["hope", "inspiration"],
      source: "Maya Angelou",
      language: "en",
    },
    {
      text: "If there's a book that you want to read, but it hasn't been written yet, then you must write it.",
      title: "Write it",
      themes: ["motivation", "inspiration", "purpose"],
      source: "Toni Morrison",
      language: "en",
    },
    {
      text: "When I dare to be powerful, to use my strength in the service of my vision, then it becomes less and less important whether I am afraid.",
      title: "Dare to be powerful",
      themes: ["motivation", "purpose"],
      source: "Audre Lorde",
      language: "en",
    },
    {
      text: "You must do the thing you think you cannot do.",
      title: "The impossible thing",
      themes: ["motivation", "growth"],
      source: "Eleanor Roosevelt",
      language: "en",
    },
    {
      text: "You gain strength, courage and confidence by every experience in which you really stop to look fear in the face.",
      title: "Face the fear",
      themes: ["growth", "motivation"],
      source: "Eleanor Roosevelt",
      language: "en",
    },
    {
      text: "Do what you can, with what you have, where you are.",
      title: "Where you are",
      themes: ["motivation"],
      source: "Theodore Roosevelt",
      language: "en",
    },
    {
      text: "Nothing in the world is worth having or worth doing unless it means effort, pain, difficulty.",
      title: "Worth the effort",
      themes: ["motivation", "growth"],
      source: "Theodore Roosevelt",
      language: "en",
    },
    {
      text: "If there is no struggle, there is no progress.",
      title: "Progress",
      themes: ["growth", "motivation"],
      source: "Frederick Douglass",
      language: "en",
    },
    {
      text: "A journey of a thousand miles begins with a single step.",
      title: "First step",
      themes: ["motivation", "growth"],
      source: "Lao Tzu",
      language: "en",
    },
    {
      text: "Knowing others is intelligence; knowing yourself is true wisdom. Mastering others is strength; mastering yourself is true power.",
      title: "True power",
      themes: ["growth", "purpose"],
      source: "Lao Tzu",
      language: "en",
    },
    {
      text: "No mud, no lotus.",
      title: "No mud, no lotus",
      themes: ["growth", "hope"],
      source: "Thich Nhat Hanh",
      language: "en",
    },
    {
      text: "The future enters into us, in order to transform itself in us, long before it happens.",
      title: "The future enters",
      themes: ["hope", "growth"],
      source: "Rainer Maria Rilke",
      language: "en",
    },
    {
      text: "Attention is the beginning of devotion.",
      title: "Attention",
      themes: ["inspiration"],
      source: "Mary Oliver",
      language: "en",
    },
    {
      text: "It is good to have an end to journey toward; but it is the journey that matters, in the end.",
      title: "The journey",
      themes: ["purpose", "growth", "inspiration"],
      source: "Ursula K. Le Guin",
      language: "en",
    },
    {
      text: "If you don't like someone's story, write your own.",
      title: "Write your own",
      themes: ["motivation", "inspiration"],
      source: "Chinua Achebe",
      language: "en",
    },
    {
      text: "It's the little things citizens do. That's what will make the difference. My little thing is planting trees.",
      title: "Little things",
      themes: ["purpose", "motivation", "hope"],
      source: "Wangari Maathai",
      language: "en",
    },
    {
      text: "One child, one teacher, one book, one pen can change the world.",
      title: "One pen",
      themes: ["hope", "inspiration"],
      source: "Malala Yousafzai",
      language: "en",
    },
    {
      text: "Life is not easy for any of us. But what of that? We must have perseverance and above all confidence in ourselves.",
      title: "Perseverance",
      themes: ["motivation", "growth"],
      source: "Marie Curie",
      language: "en",
    },
    {
      text: "I was taught that the way of progress was neither swift nor easy.",
      title: "Neither swift",
      themes: ["growth", "hope"],
      source: "Marie Curie",
      language: "en",
    },
    {
      text: "What you do makes a difference, and you have to decide what kind of difference you want to make.",
      title: "Make a difference",
      themes: ["purpose", "motivation"],
      source: "Jane Goodall",
      language: "en",
    },
    {
      text: "We are a way for the cosmos to know itself.",
      title: "The cosmos knows",
      themes: ["purpose", "inspiration"],
      source: "Carl Sagan",
      language: "en",
    },
    {
      text: "Imagination is more important than knowledge.",
      title: "Imagination",
      themes: ["inspiration"],
      source: "Albert Einstein",
      language: "en",
    },
    {
      text: "The important thing is not to stop questioning. Curiosity has its own reason for existing.",
      title: "Keep questioning",
      themes: ["growth", "inspiration"],
      source: "Albert Einstein",
      language: "en",
    },
    {
      text: "The most beautiful thing we can experience is the mysterious.",
      title: "The mysterious",
      themes: ["inspiration"],
      source: "Albert Einstein",
      language: "en",
    },
    {
      text: "The only way to do great work is to love what you do.",
      title: "Love the work",
      themes: ["purpose", "motivation", "inspiration"],
      source: "Steve Jobs",
      language: "en",
    },
    {
      text: "Your time is limited, so don't waste it living someone else's life.",
      title: "Your own life",
      themes: ["purpose", "motivation"],
      source: "Steve Jobs",
      language: "en",
    },
    {
      text: "It is impossible to live without failing at something, unless you live so cautiously that you might as well not have lived at all - in which case, you fail by default.",
      title: "Fail by default",
      themes: ["growth", "motivation"],
      source: "J.K. Rowling",
      language: "en",
    },
    {
      text: "All we have to decide is what to do with the time that is given us.",
      title: "Time given",
      themes: ["purpose", "motivation"],
      source: "J.R.R. Tolkien",
      language: "en",
    },
    {
      text: "Hope is the power of being cheerful in circumstances which we know to be desperate.",
      title: "Cheerful anyway",
      themes: ["hope"],
      source: "G.K. Chesterton",
      language: "en",
    },
    {
      text: "Hope is a good breakfast, but it is a bad supper.",
      title: "Good breakfast",
      themes: ["hope"],
      source: "Francis Bacon",
      language: "en",
    },
    {
      text: "Hope springs eternal in the human breast.",
      title: "Springs eternal",
      themes: ["hope"],
      source: "Alexander Pope",
      language: "en",
    },
    {
      text: "I am no bird; and no net ensnares me: I am a free human being with an independent will.",
      title: "No net",
      themes: ["motivation", "inspiration"],
      source: "Charlotte Brontë",
      language: "en",
    },
    {
      text: "I am larger, better than I thought; I did not know I held so much goodness.",
      title: "Larger than thought",
      themes: ["growth", "inspiration"],
      source: "Walt Whitman",
      language: "en",
    },
    {
      text: "Things do not change; we change.",
      title: "We change",
      themes: ["growth"],
      source: "Henry David Thoreau",
      language: "en",
    },
    {
      text: "Only that day dawns to which we are awake.",
      title: "Awake to dawn",
      themes: ["hope", "inspiration"],
      source: "Henry David Thoreau",
      language: "en",
    },
    {
      text: "Trust thyself: every heart vibrates to that iron string.",
      title: "Iron string",
      themes: ["motivation", "growth"],
      source: "Ralph Waldo Emerson",
      language: "en",
    },
    {
      text: "Write it on your heart that every day is the best day in the year.",
      title: "Best day",
      themes: ["hope", "inspiration"],
      source: "Ralph Waldo Emerson",
      language: "en",
    },
    {
      text: "Nothing great was ever achieved without enthusiasm.",
      title: "Enthusiasm",
      themes: ["motivation", "inspiration"],
      source: "Ralph Waldo Emerson",
      language: "en",
    },
    {
      text: "To strive, to seek, to find, and not to yield.",
      title: "Not to yield",
      themes: ["motivation", "purpose"],
      source: "Alfred, Lord Tennyson",
      language: "en",
    },
    {
      text: "'Tis not too late to seek a newer world.",
      title: "A newer world",
      themes: ["hope", "motivation"],
      source: "Alfred, Lord Tennyson",
      language: "en",
    },
    {
      text: "Our doubts are traitors, and make us lose the good we oft might win, by fearing to attempt.",
      title: "Doubts are traitors",
      themes: ["motivation", "growth"],
      source: "William Shakespeare",
      language: "en",
    },
    {
      text: "The miserable have no other medicine but only hope.",
      title: "Only medicine",
      themes: ["hope"],
      source: "William Shakespeare",
      language: "en",
    },
    {
      text: "Trust in dreams, for in them is hidden the gate to eternity.",
      title: "Trust dreams",
      themes: ["hope", "inspiration"],
      source: "Kahlil Gibran",
      language: "en",
    },
    {
      text: "The deeper that sorrow carves into your being, the more joy you can contain.",
      title: "Carved deeper",
      themes: ["growth", "hope"],
      source: "Kahlil Gibran",
      language: "en",
    },
    {
      text: "Your pain is the breaking of the shell that encloses your understanding.",
      title: "Breaking the shell",
      themes: ["growth"],
      source: "Kahlil Gibran",
      language: "en",
    },
    {
      text: "Life shrinks or expands in proportion to one's courage.",
      title: "Expanding life",
      themes: ["growth", "motivation"],
      source: "Anaïs Nin",
      language: "en",
    },
    {
      text: "One must still have chaos in oneself to be able to give birth to a dancing star.",
      title: "Dancing star",
      themes: ["inspiration", "growth"],
      source: "Friedrich Nietzsche",
      language: "en",
    },
    {
      text: "It is not because things are difficult that we do not dare; it is because we do not dare that they are difficult.",
      title: "Dare first",
      themes: ["motivation", "growth"],
      source: "Seneca",
      language: "en",
    },
    {
      text: "First say to yourself what you would be; and then do what you have to do.",
      title: "First, decide",
      themes: ["purpose", "motivation"],
      source: "Epictetus",
      language: "en",
    },
    {
      text: "The impediment to action advances action. What stands in the way becomes the way.",
      title: "The way",
      themes: ["growth", "motivation"],
      source: "Marcus Aurelius",
      language: "en",
    },
    {
      text: "Dripping water hollows out stone, not through force but through persistence.",
      title: "Dripping water",
      themes: ["motivation", "growth"],
      source: "Ovid",
      language: "en",
    },
    {
      text: "Fortune favors the bold.",
      title: "The bold",
      themes: ["motivation"],
      source: "Virgil",
      language: "en",
    },
    {
      text: "Faith is the bird that feels the light and sings when the dawn is still dark.",
      title: "Bird of faith",
      themes: ["hope", "inspiration"],
      source: "Rabindranath Tagore",
      language: "en",
    },
    {
      text: "Let me not pray to be sheltered from dangers, but to be fearless in facing them.",
      title: "Fearless",
      themes: ["motivation", "growth"],
      source: "Rabindranath Tagore",
      language: "en",
    },
    {
      text: "The butterfly counts not months but moments, and has time enough.",
      title: "Time enough",
      themes: ["purpose", "inspiration"],
      source: "Rabindranath Tagore",
      language: "en",
    },
    {
      text: "Success is to be measured not so much by the position that one has reached in life as by the obstacles which he has overcome while trying to succeed.",
      title: "Obstacles overcome",
      themes: ["growth", "motivation"],
      source: "Booker T. Washington",
      language: "en",
    },
    {
      text: "The mystery of human existence lies not in just staying alive, but in finding something to live for.",
      title: "Something to live for",
      themes: ["purpose"],
      source: "Fyodor Dostoevsky",
      language: "en",
    },
    {
      text: "Taking a new step, uttering a new word, is what people fear most.",
      title: "A new step",
      themes: ["growth", "motivation"],
      source: "Fyodor Dostoevsky",
      language: "en",
    },
    {
      text: "Everyone thinks of changing the world, but no one thinks of changing himself.",
      title: "Start within",
      themes: ["growth"],
      source: "Leo Tolstoy",
      language: "en",
    },
    {
      text: "Knowing is not enough; we must apply. Willing is not enough; we must do.",
      title: "Knowing, doing",
      themes: ["motivation"],
      source: "Johann Wolfgang von Goethe",
      language: "en",
    },
    {
      text: "When you want something, all the universe conspires in helping you to achieve it.",
      title: "Universe conspires",
      themes: ["motivation", "hope", "inspiration"],
      source: "Paulo Coelho",
      language: "en",
    },
    {
      text: "It's the possibility of having a dream come true that makes life interesting.",
      title: "Possible dreams",
      themes: ["hope", "purpose"],
      source: "Paulo Coelho",
      language: "en",
    },
    {
      text: "Set your life on fire. Seek those who fan your flames.",
      title: "Set on fire",
      themes: ["inspiration", "motivation"],
      source: "Rumi",
      language: "en",
    },
    {
      text: "Don't be satisfied with stories, how things have gone with others. Unfold your own myth.",
      title: "Your own myth",
      themes: ["purpose", "inspiration"],
      source: "Rumi",
      language: "en",
    },
    {
      text: "The purpose of art is to lay bare the questions that have been hidden by the answers.",
      title: "Bare questions",
      themes: ["inspiration", "purpose"],
      source: "James Baldwin",
      language: "en",
    },
    {
      text: "Practice any art ... no matter how well or badly, not to get money and fame, but to experience becoming, to find out what's inside you, to make your soul grow.",
      title: "Make it grow",
      themes: ["growth", "inspiration", "purpose"],
      source: "Kurt Vonnegut",
      language: "en",
    },
    {
      text: "I hope you will make new mistakes. Make glorious, amazing mistakes.",
      title: "New mistakes",
      themes: ["growth", "motivation"],
      source: "Neil Gaiman",
      language: "en",
    },
    {
      text: "Man's main task in life is to give birth to himself, to become what he potentially is.",
      title: "Give birth to self",
      themes: ["growth", "purpose"],
      source: "Erich Fromm",
      language: "en",
    },
    {
      text: "A musician must make music, an artist must paint, a poet must write, if he is to be ultimately at peace with himself. What a man can be, he must be.",
      title: "What one can be",
      themes: ["purpose", "growth"],
      source: "Abraham Maslow",
      language: "en",
    },
    {
      text: "Human beings are not born once and for all on the day their mothers give birth to them, but that life obliges them over and over again to give birth to themselves.",
      title: "Born again",
      themes: ["growth"],
      source: "Gabriel García Márquez",
      language: "en",
    },
    {
      text: "For all that has been, thanks. To all that shall be, yes.",
      title: "Thanks, and yes",
      themes: ["hope", "purpose"],
      source: "Dag Hammarskjöld",
      language: "en",
    },
    {
      text: "Believe that life is worth living, and your belief will help create the fact.",
      title: "Create the fact",
      themes: ["hope", "purpose"],
      source: "William James",
      language: "en",
    },
    {
      text: "Hope is being able to see that there is light despite all of the darkness.",
      title: "Light in darkness",
      themes: ["hope"],
      source: "Desmond Tutu",
      language: "en",
    },
    {
      text: "Do your little bit of good where you are; it's those little bits of good put together that overwhelm the world.",
      title: "Bits of good",
      themes: ["purpose", "motivation", "hope"],
      source: "Desmond Tutu",
      language: "en",
    },
    {
      text: "Genius is one per cent inspiration, ninety-nine per cent perspiration.",
      title: "Perspiration",
      themes: ["motivation", "inspiration"],
      source: "Thomas Edison",
      language: "en",
    },
    {
      text: "To improve is to change; so to be perfect is to have changed often.",
      title: "Changed often",
      themes: ["growth"],
      source: "Winston Churchill",
      language: "en",
    },
    {
      text: "The mountains are calling and I must go.",
      title: "Mountains calling",
      themes: ["inspiration", "purpose"],
      source: "John Muir",
      language: "en",
    },
    {
      text: "Those who contemplate the beauty of the earth find reserves of strength that will endure as long as life lasts.",
      title: "Reserves of strength",
      themes: ["inspiration", "hope"],
      source: "Rachel Carson",
      language: "en",
    },
    {
      text: "If Winter comes, can Spring be far behind?",
      title: "Spring ahead",
      themes: ["hope"],
      source: "Percy Bysshe Shelley",
      language: "en",
    },
    {
      text: "Ah, but a man's reach should exceed his grasp, or what's a heaven for?",
      title: "Reach and grasp",
      themes: ["motivation", "growth", "inspiration"],
      source: "Robert Browning",
      language: "en",
    },
    {
      text: "No one is useless in this world who lightens the burden of it to anyone else.",
      title: "Lightening burdens",
      themes: ["purpose"],
      source: "Charles Dickens",
      language: "en",
    },
    {
      text: "That the powerful play goes on, and you may contribute a verse.",
      title: "Contribute a verse",
      themes: ["purpose", "inspiration"],
      source: "Walt Whitman",
      language: "en",
    },
    {
      text: "Energy is eternal delight.",
      title: "Eternal delight",
      themes: ["inspiration", "motivation"],
      source: "William Blake",
      language: "en",
    },
    {
      text: "It is only with the heart that one can see rightly; what is essential is invisible to the eye.",
      title: "Seeing rightly",
      themes: ["inspiration", "purpose"],
      source: "Antoine de Saint-Exupéry",
      language: "en",
    },
    {
      text: "Well done is better than well said.",
      title: "Well done",
      themes: ["motivation"],
      source: "Benjamin Franklin",
      language: "en",
    },

    
    // identity, self-worth, acceptance, healing
    
    {
    text: "To be yourself in a world that is constantly trying to make you something else is the greatest accomplishment.",
    title: "Greatest accomplishment",
    themes: ["identity", "acceptance", "self-worth"],
    source: "Ralph Waldo Emerson",
    language: "en"
    },
    {
    text: "Because one believes in oneself, one doesn't try to convince others. Because one is content with oneself, one doesn't need others' approval.",
    title: "Content with oneself",
    themes: ["self-worth", "acceptance"],
    source: "Lao Tzu",
    language: "en"
    },
    {
    text: "Care about what other people think and you will always be their prisoner.",
    title: "Their prisoner",
    themes: ["self-worth", "identity"],
    source: "Lao Tzu",
    language: "en"
    },
    {
    text: "Accepting yourself is the seed of all growth.",
    title: "The seed",
    themes: ["acceptance", "healing"],
    source: "Carl Rogers",
    language: "en"
    },
    {
    text: "Love yourself first and everything else falls into line.",
    title: "Love yourself first",
    themes: ["self-worth", "healing"],
    source: "Lucille Ball",
    language: "en"
    },
    {
    text: "Noli te bastardes carborundorum. Don't let the bastards grind you down.",
    title: "Don't let them",
    themes: ["identity", "self-worth"],
    source: "Margaret Atwood",
    language: "en"
    },
    {
    text: "We cannot change anything until we accept it. Condemnation does not liberate, it oppresses.",
    title: "Accept to change",
    themes: ["acceptance", "healing"],
    source: "Carl Jung",
    language: "en"
    },
    {
    text: "I am not what happened to me, I am what I choose to become.",
    title: "What I choose",
    themes: ["identity", "healing"],
    source: "Carl Jung",
    language: "en"
    },
    {
    text: "What lies behind us and what lies before us are tiny matters compared to what lies within us.",
    title: "What lies within",
    themes: ["identity", "self-worth"],
    source: "Ralph Waldo Emerson",
    language: "en"
    },
    {
    text: "Healing takes courage, and we all have courage, even if we have to dig a little to find it.",
    title: "Healing takes courage",
    themes: ["healing", "self-worth"],
    source: "Tori Amos",
    language: "en"
    },
    {
    text: "The privilege of a lifetime is to become who you truly are.",
    title: "Who you truly are",
    themes: ["identity", "acceptance"],
    source: "Carl Jung",
    language: "en"
    },
    {
    text: "Never be bullied into silence. Never allow yourself to be made a victim. Accept no one's definition of your life; define yourself.",
    title: "Define yourself",
    themes: ["identity", "self-worth"],
    source: "Harvey Fierstein",
    language: "en"
    },
    {
    text: "Nothing can bring you peace but yourself.",
    title: "Bring you peace",
    themes: ["acceptance", "healing"],
    source: "Ralph Waldo Emerson",
    language: "en"
    },
    {
    text: "Turn your wounds into wisdom.",
    title: "Wounds to wisdom",
    themes: ["healing", "acceptance"],
    source: "Oprah Winfrey",
    language: "en"
    },
    {
    text: "To be beautiful means to be yourself. You don’t need to be accepted by others. You need to accept yourself.",
    title: "To be beautiful",
    themes: ["acceptance", "self-worth", "identity"],
    source: "Thich Nhat Hanh",
    language: "en"
    },
    {
    text: "Smile, breathe, and go slowly.",
    title: "Go slowly",
    themes: ["healing", "acceptance"],
    source: "Thich Nhat Hanh",
    language: "en"
    },
    {
    text: "He who acts in holiness reporting to himself alone is truly free.",
    title: "Truly free",
    themes: ["identity", "self-worth"],
    source: "Baruch Spinoza",
    language: "en"
    },
    {
    text: "Self-care is how you take your power back.",
    title: "Take your power",
    themes: ["self-worth", "healing"],
    source: "Lalah Delia",
    language: "en"
    },
    {
    text: "I carry my landscapes with me.",
    title: "My landscapes",
    themes: ["identity", "acceptance"],
    source: "Joan Mitchell",
    language: "en"
    },
    {
    text: "Lighten up on yourself. No one is perfect. Gently accept your humanness.",
    title: "Gently accept",
    themes: ["acceptance", "self-worth"],
    source: "Deborah Day",
    language: "en"
    },
    {
    text: "Act as if what you do makes a difference. It does.",
    title: "It does",
    themes: ["self-worth", "identity"],
    source: "William James",
    language: "en"
    },
    {
    text: "The highest form of human intelligence is to observe without executing judgment.",
    title: "Observe without judgment",
    themes: ["acceptance", "healing"],
    source: "Jiddu Krishnamurti",
    language: "en"
    },
    {
    text: "Be who you are and say what you feel, because those who mind don't matter, and those who matter don't mind.",
    title: "Be who you are",
    themes: ["identity", "self-worth", "acceptance"],
    source: "Bernard M. Baruch",
    language: "en"
    },
    {
    text: "In the middle of difficulty lies opportunity.",
    title: "Opportunity",
    themes: ["healing", "acceptance"],
    source: "Albert Einstein",
    language: "en"
    },
    {
    text: "You are allowed to be both a masterpiece and a half-written story at the same time.",
    title: "Masterpiece and story",
    themes: ["self-worth", "acceptance", "identity"],
    source: "Sophia Bush",
    language: "en"
    },
    {
    text: "Forgiveness is the fragrance that the violet sheds on the heel that has crushed it.",
    title: "Forgiveness",
    themes: ["healing", "acceptance"],
    source: "Mark Twain",
    language: "en"
    },
    {
    text: "When you accept yourself, the whole world accepts you.",
    title: "Whole world accepts",
    themes: ["acceptance", "self-worth"],
    source: "Lao Tzu",
    language: "en"
    },
    {
    text: "I am my own sanctuary and I can be reborn as many times as I choose.",
    title: "My own sanctuary",
    themes: ["identity", "healing", "self-worth"],
    source: "Lady Gaga",
    language: "en"
    },
    {
    text: "True humility is not thinking less of yourself, it is thinking of yourself less.",
    title: "True humility",
    themes: ["identity", "self-worth"],
    source: "C.S. Lewis",
    language: "en"
    },
    {
    text: "We are all broken, that's how the light gets in.",
    title: "We are all broken",
    themes: ["healing", "acceptance"],
    source: "Ernest Hemingway",
    language: "en"
    },
    {
    text: "If you have no confidence in self, you are twice defeated in the race of life.",
    title: "Twice defeated",
    themes: ["self-worth", "identity"],
    source: "Marcus Garvey",
    language: "en"
    },
    {
    text: "To love oneself is the beginning of a lifelong romance.",
    title: "Lifelong romance",
    themes: ["self-worth", "acceptance"],
    source: "Oscar Wilde",
    language: "en"
    },
    {
    text: "I am deliberate and afraid of nothing.",
    title: "Afraid of nothing",
    themes: ["identity", "self-worth"],
    source: "Audre Lorde",
    language: "en"
    },
    {
    text: "Caring for myself is not self-indulgence, it is self-preservation, and that is an act of political warfare.",
    title: "Self-preservation",
    themes: ["self-worth", "healing"],
    source: "Audre Lorde",
    language: "en"
    },
    {
    text: "Acceptance doesn't mean resignation; it means understanding that something is what it is and that there's got to be a way through it.",
    title: "A way through",
    themes: ["acceptance", "healing"],
    source: "Michael J. Fox",
    language: "en"
    },
    {
    text: "Finish each day and be done with it. You have done what you could.",
    title: "Be done with it",
    themes: ["acceptance", "healing"],
    source: "Ralph Waldo Emerson",
    language: "en"
    },

    //  grief-and-loss, relationships, loneliness, burnout

    
      {
        text: "No one ever told me that grief felt so like fear.",
        title: "Grief like fear",
        themes: ["grief-and-loss"],
        source: "C. S. Lewis",
        language: "en"
      },
      {
        text: "It’s so much darker when a light goes out than it would have been if it had never shone.",
        title: "Darker light",
        themes: ["grief-and-loss"],
        source: "John Steinbeck",
        language: "en"
      },
      {
        text: "What we have once enjoyed deeply we can never lose. All that we love deeply becomes a part of us.",
        title: "Becomes part",
        themes: ["grief-and-loss", "relationships"],
        source: "Helen Keller",
        language: "en"
      },
      {
        text: "Death ends a life, not a relationship.",
        title: "Not a relationship",
        themes: ["grief-and-loss", "relationships"],
        source: "Mitch Albom",
        language: "en"
      },
      {
        text: "There is no grief like the grief that does not speak.",
        title: "Silent grief",
        themes: ["grief-and-loss"],
        source: "Henry Wadsworth Longfellow",
        language: "en"
      },
      {
        text: "I will not say: do not weep; for not all tears are an evil.",
        title: "Not all tears",
        themes: ["grief-and-loss"],
        source: "J. R. R. Tolkien",
        language: "en"
      },
      {
        text: "How lucky I am to have something that makes saying goodbye so hard.",
        title: "Hard goodbye",
        themes: ["grief-and-loss", "relationships"],
        source: "A. A. Milne",
        language: "en"
      },
      {
        text: "Grief does not change you. It reveals you.",
        title: "Reveals you",
        themes: ["grief-and-loss"],
        source: "John Green",
        language: "en"
      },
      {
        text: "Only people who are capable of loving strongly can also suffer great sorrow.",
        title: "Strong love",
        themes: ["grief-and-loss", "relationships"],
        source: "Leo Tolstoy",
        language: "en"
      },
      {
        text: "Sometimes, only one person is missing, and the whole world seems depopulated.",
        title: "One missing",
        themes: ["grief-and-loss", "loneliness"],
        source: "Alphonse de Lamartine",
        language: "en"
      },
      {
        text: "Love consists of this: two solitudes that meet, protect and greet each other.",
        title: "Two solitudes",
        themes: ["relationships", "loneliness"],
        source: "Rainer Maria Rilke",
        language: "en"
      },
      {
        text: "You don’t love because: you love despite; not for the virtues, but despite the faults.",
        title: "Love despite",
        themes: ["relationships"],
        source: "William Faulkner",
        language: "en"
      },
      {
        text: "There is no remedy for love but to love more.",
        title: "Love more",
        themes: ["relationships"],
        source: "Henry David Thoreau",
        language: "en"
      },
      {
        text: "Love does not begin and end the way we seem to think it does. Love is a battle, love is a war; love is a growing up.",
        title: "Love is war",
        themes: ["relationships"],
        source: "James Baldwin",
        language: "en"
      },
      {
        text: "Being deeply loved by someone gives you strength, while loving someone deeply gives you courage.",
        title: "Strength courage",
        themes: ["relationships"],
        source: "Lao Tzu",
        language: "en"
      },
      {
        text: "The greatest happiness of life is the conviction that we are loved; loved for ourselves, or rather, loved in spite of ourselves.",
        title: "Loved in spite",
        themes: ["relationships"],
        source: "Victor Hugo",
        language: "en"
      },
      {
        text: "We are born alone, we live alone, we die alone. Only through our love and friendship can we create the illusion that we’re not alone.",
        title: "Illusion alone",
        themes: ["relationships", "loneliness"],
        source: "Orson Welles",
        language: "en"
      },
      {
        text: "If you find someone you love in your life, then hang on to that love.",
        title: "Hang on",
        themes: ["relationships"],
        source: "Princess Diana",
        language: "en"
      },
      {
        text: "Love is that condition in which the happiness of another person is essential to your own.",
        title: "Their happiness",
        themes: ["relationships"],
        source: "Robert A. Heinlein",
        language: "en"
      },
      {
        text: "The purpose of a relationship is not to have another who might complete you; but to have another with whom you might share your completeness.",
        title: "Share completeness",
        themes: ["relationships"],
        source: "Neale Donald Walsch",
        language: "en"
      },
      {
        text: "If you meet a loner, no matter what they tell you, it’s not because they enjoy solitude. It’s because they have tried to blend into the world before, and people continue to disappoint them.",
        title: "Tried to blend",
        themes: ["loneliness"],
        source: "Jodi Picoult",
        language: "en"
      },
      {
        text: "Music was my refuge. I could crawl into the space between the notes and curl my back to loneliness.",
        title: "Space between",
        themes: ["loneliness"],
        source: "Maya Angelou",
        language: "en"
      },
      {
        text: "Alone is a fact, a condition where no one else is around. Lonely is how you feel about that.",
        title: "Alone or lonely",
        themes: ["loneliness"],
        source: "Twyla Tharp",
        language: "en"
      },
      {
        text: "Great men are like eagles, and build their nest on some lofty solitude.",
        title: "Lofty solitude",
        themes: ["loneliness"],
        source: "Arthur Schopenhauer",
        language: "en"
      },
      {
        text: "The thing that makes you exceptional, if you are at all, is inevitably that which makes you lonely.",
        title: "Makes you lonely",
        themes: ["loneliness"],
        source: "Alan Watts",
        language: "en"
      },
      {
        text: "I felt a haunting loneliness sometimes, and felt it in others—young clerks in the dusk, wasting the most poignant moments of night and life.",
        title: "Haunting loneliness",
        themes: ["loneliness"],
        source: "F. Scott Fitzgerald",
        language: "en"
      },
      {
        text: "Loneliness is and always has been the central and inevitable experience of every man.",
        title: "Inevitable experience",
        themes: ["loneliness"],
        source: "Thomas Wolfe",
        language: "en"
      },
      {
        text: "We’re all lonely for something we don’t know we’re lonely for.",
        title: "Something unknown",
        themes: ["loneliness"],
        source: "David Foster Wallace",
        language: "en"
      },
      {
        text: "Nothing makes us lonelier than our secrets.",
        title: "Our secrets",
        themes: ["loneliness"],
        source: "Paul Tournier",
        language: "en"
      },
      {
        text: "I have to be alone very often. I’d be quite happy if I spent from Saturday night until Monday morning alone in my apartment. That’s how I refuel.",
        title: "How I refuel",
        themes: ["loneliness"],
        source: "Audrey Hepburn",
        language: "en"
      },
      {
        text: "If you get tired, learn to rest, not to quit.",
        title: "Rest not quit",
        themes: ["burnout"],
        source: "Banksy",
        language: "en"
      },
      {
        text: "Our fatigue is often caused not by work, but by worry, frustration and resentment.",
        title: "Not by work",
        themes: ["burnout"],
        source: "Dale Carnegie",
        language: "en"
      },
      {
        text: "Fatigue makes cowards of us all.",
        title: "Makes cowards",
        themes: ["burnout"],
        source: "Vince Lombardi",
        language: "en"
      },
      {
        text: "The time to relax is when you don’t have time for it.",
        title: "Time to relax",
        themes: ["burnout"],
        source: "Sydney J. Harris",
        language: "en"
      },
      {
        text: "If you want rest, you have to take it. You have to resist the lure of busyness, make time for rest, take it seriously, and protect it.",
        title: "Take rest",
        themes: ["burnout"],
        source: "Alex Soojung-Kim Pang",
        language: "en"
      },
      {
        text: "In dealing with those who are undergoing great suffering, if you feel burnout setting in, if you feel demoralized and exhausted, it is best to withdraw and restore yourself.",
        title: "Withdraw restore",
        themes: ["burnout"],
        source: "Dalai Lama",
        language: "en"
      },
      {
        text: "Burnout is nature’s way of telling you, you’ve been going through the motions your soul has departed; you’re a zombie, a member of the walking dead.",
        title: "Soul departed",
        themes: ["burnout"],
        source: "Herbert J. Freudenberger",
        language: "en"
      },
      {
        text: "Rest is, quite simply, when you stop using a part of you that’s used up, worn out, damaged, or inflamed, so that it has a chance to renew itself.",
        title: "Chance to renew",
        themes: ["burnout"],
        source: "Emily Nagoski",
        language: "en"
      },
      {
        text: "Laughter and tears are both responses to frustration and exhaustion. I myself prefer to laugh, since there is less cleaning up to do afterward.",
        title: "Prefer to laugh",
        themes: ["burnout"],
        source: "Kurt Vonnegut",
        language: "en"
      },
      {
        text: "Exhaustion pays no mind to age or beauty. Like rain and hail and floods.",
        title: "Pays no mind",
        themes: ["burnout"],
        source: "Haruki Murakami",
        language: "en"
      },
      {
        text: "Where you used to be, there is a hole in the world, which I find myself constantly walking around in the daytime, and falling in at night.",
        title: "Hole in world",
        themes: ["grief-and-loss", "loneliness"],
        source: "Edna St. Vincent Millay",
        language: "en"
      },
      {
        text: "The reality is that you will grieve forever. You will not ‘get over’ the loss of a loved one; you will learn to live with it.",
        title: "Learn to live",
        themes: ["grief-and-loss"],
        source: "Elisabeth Kübler-Ross",
        language: "en"
      },
      {
        text: "Absence is a house so vast that inside you will pass through its walls and hang pictures on the air.",
        title: "House of absence",
        themes: ["grief-and-loss", "loneliness"],
        source: "Pablo Neruda",
        language: "en"
      },
      {
        text: "To live in hearts we leave behind is not to die.",
        title: "Live in hearts",
        themes: ["grief-and-loss", "relationships"],
        source: "Thomas Campbell",
        language: "en"
      },
      {
        text: "Love is not just looking at each other, it’s looking in the same direction.",
        title: "Same direction",
        themes: ["relationships"],
        source: "Antoine de Saint-Exupéry",
        language: "en"
      },
      {
        text: "I never found the companion that was so companionable as solitude.",
        title: "Companionable solitude",
        themes: ["loneliness"],
        source: "Henry David Thoreau",
        language: "en"
      },
      {
        text: "We enter solitude, in which also we lose loneliness.",
        title: "Lose loneliness",
        themes: ["loneliness"],
        source: "Wendell Berry",
        language: "en"
      },
      {
        text: "Solitude is the path over which destiny endeavors to lead man to himself.",
        title: "Path to himself",
        themes: ["loneliness"],
        source: "Hermann Hesse",
        language: "en"
      },
      {
        text: "If your work is your self, when you cease to work, you cease to exist.",
        title: "Cease to exist",
        themes: ["burnout"],
        source: "Alex Soojung-Kim Pang",
        language: "en"
      },
      {
        text: "The supreme quality of great men is the power of resting. Anxiety, restlessness, fretting are marks of weakness.",
        title: "Power of resting",
        themes: ["burnout"],
        source: "J. R. Seeley",
        language: "en"
      },
      {
        text: "Rest when you’re weary. Refresh and renew yourself, your body, your mind, your spirit. Then get back to work.",
        title: "Refresh renew",
        themes: ["burnout"],
        source: "Ralph Marston",
        language: "en"
      },
      {
        text: "Fatigue is the best pillow.",
        title: "Best pillow",
        themes: ["burnout"],
        source: "Benjamin Franklin",
        language: "en"
      },
      {
        text: "What is grief, if not love persevering?",
        title: "Love persevering",
        themes: ["grief-and-loss", "relationships"],
        source: "Vision (WandaVision)",
        language: "en"
      },
      {
        text: "Love looks not with the eyes, but with the mind.",
        title: "With the mind",
        themes: ["relationships"],
        source: "William Shakespeare",
        language: "en"
      },
      {
        text: "I am too alone in the world, yet not alone enough to make every minute holy.",
        title: "Too alone",
        themes: ["loneliness"],
        source: "Rainer Maria Rilke",
        language: "en"
      },
      {
        text: "The loneliest moment in someone’s life is when they are watching their whole world fall apart.",
        title: "World fall apart",
        themes: ["loneliness", "grief-and-loss"],
        source: "F. Scott Fitzgerald",
        language: "en"
      },
      {
        text: "Just because you take breaks doesn’t mean you’re broken.",
        title: "Not broken",
        themes: ["burnout"],
        source: "Curtis Tyrone Jones",
        language: "en"
      },
      {
        text: "Everything needs a break.",
        title: "Needs a break",
        themes: ["burnout"],
        source: "Toba Beta",
        language: "en"
      },
      {
        text: "She was no longer wrestling with the grief, but could sit down with it as a lasting companion and make it a sharer in her thoughts.",
        title: "Lasting companion",
        themes: ["grief-and-loss"],
        source: "George Eliot",
        language: "en"
      },
      {
        text: "Have enough courage to trust love one more time and always one more time.",
        title: "One more time",
        themes: ["relationships"],
        source: "Maya Angelou",
        language: "en"
      },
      {
        text: "The greatest thing in the world is to know how to belong to oneself.",
        title: "Belong to oneself",
        themes: ["loneliness"],
        source: "Michel de Montaigne",
        language: "en"
      },
      {
        text: "We read to know we are not alone.",
        title: "Not alone",
        themes: ["loneliness"],
        source: "William Nicholson",
        language: "en"
      },
      {
        text: "Living in a constant chase after gain compels people to expend their spirit to the point of exhaustion.",
        title: "Point of exhaustion",
        themes: ["burnout"],
        source: "Friedrich Nietzsche",
        language: "en"
      },
      {
        text: "It is our best work that God wants, not the dregs of our exhaustion.",
        title: "Not the dregs",
        themes: ["burnout"],
        source: "George MacDonald",
        language: "en"
      },
      {
        text: "Grief fills the room up of my absent child, lies in his bed, walks up and down with me.",
        title: "Fills the room",
        themes: ["grief-and-loss"],
        source: "William Shakespeare",
        language: "en"
      },
      {
        text: "Never love anyone who treats you like you’re ordinary.",
        title: "Not ordinary",
        themes: ["relationships"],
        source: "Oscar Wilde",
        language: "en"
      },
      {
        text: "I want to be with those who know secret things or else alone.",
        title: "Secret things",
        themes: ["loneliness"],
        source: "Rainer Maria Rilke",
        language: "en"
      },
      {
        text: "How we need another soul to cling to.",
        title: "Another soul",
        themes: ["loneliness", "relationships"],
        source: "Sylvia Plath",
        language: "en"
      },
      {
        text: "Tired minds don’t plan well. Sleep first, plan later.",
        title: "Sleep first",
        themes: ["burnout"],
        source: "Walter Reisch",
        language: "en"
      },
      {
        text: "The vision of a champion is bent over, drenched in sweat, at the point of exhaustion, when nobody else is looking.",
        title: "Point of exhaustion",
        themes: ["burnout"],
        source: "Mia Hamm",
        language: "en"
      },
      {
        text: "There is a sacredness in tears. They are not the mark of weakness, but of power.",
        title: "Sacred tears",
        themes: ["grief-and-loss"],
        source: "Washington Irving",
        language: "en"
      },
      {
        text: "I love her and it is the beginning of everything.",
        title: "Beginning of all",
        themes: ["relationships"],
        source: "F. Scott Fitzgerald",
        language: "en"
      },
      {
        text: "Solitude is where one discovers one’s true self.",
        title: "True self",
        themes: ["loneliness"],
        source: "Joseph Campbell",
        language: "en"
      },
      {
        text: "There is a loneliness in this world so great that you can see it in the slow movement of the hands of a clock.",
        title: "Hands of clock",
        themes: ["loneliness"],
        source: "Charles Bukowski",
        language: "en"
      },
      {
        text: "If you want to go fast, go alone. If you want to go far, go together.",
        title: "Go together",
        themes: ["relationships", "loneliness"],
        source: "African Proverb",
        language: "en"
      },
      {
        text: "Burnout is about resentment. And you beat it by knowing what it is you’re giving up that makes you resentful.",
        title: "About resentment",
        themes: ["burnout"],
        source: "Marissa Mayer",
        language: "en"
      },
      {
        text: "Ninety nine percent of the time it’s not urgent and to create a culture where you are constantly plugged in is to create a culture of burnout.",
        title: "Culture of burnout",
        themes: ["burnout"],
        source: "Arianna Huffington",
        language: "en"
      },
      {
        text: "The pain of parting is nothing to the joy of meeting again.",
        title: "Joy of meeting",
        themes: ["grief-and-loss", "relationships"],
        source: "Charles Dickens",
        language: "en"
      },
      {
        text: "Whatever our souls are made of, his and mine are the same.",
        title: "Same souls",
        themes: ["relationships"],
        source: "Emily Brontë",
        language: "en"
      },


      //resilience, self-compassion, anxiety, change, fear
      //

      
      {
      text: "Our greatest glory is not in never falling, but in rising every time we fall.",
      title: "Rise again",
      themes: ["resilience"],
      source: "Confucius",
      language: "en"
      },
      {
      text: "The human capacity for burden is like bamboo—far more flexible than you'd ever believe at first glance.",
      title: "Like bamboo",
      themes: ["resilience"],
      source: "Jodi Picoult",
      language: "en"
      },
      {
      text: "Rock bottom became the solid foundation on which I rebuilt my life.",
      title: "Solid foundation",
      themes: ["resilience", "change"],
      source: "J. K. Rowling",
      language: "en"
      },
      {
      text: "Fall seven times and stand up eight.",
      title: "Stand up eight",
      themes: ["resilience"],
      source: "Japanese Proverb",
      language: "en"
      },
      {
      text: "Life doesn't get easier or more forgiving, we get stronger and more resilient.",
      title: "We get stronger",
      themes: ["resilience"],
      source: "Steve Maraboli",
      language: "en"
      },
      {
      text: "You may have to fight a battle more than once to win it.",
      title: "Fight again",
      themes: ["resilience"],
      source: "Margaret Thatcher",
      language: "en"
      },
      {
      text: "Strength does not come from physical capacity. It comes from an indomitable will.",
      title: "Indomitable will",
      themes: ["resilience"],
      source: "Mahatma Gandhi",
      language: "en"
      },
      {
      text: "The bamboo that bends is stronger than the oak that resists.",
      title: "Bend and endure",
      themes: ["resilience", "change"],
      source: "Japanese Proverb",
      language: "en"
      },
      {
      text: "Hardships often prepare ordinary people for an extraordinary destiny.",
      title: "Prepared by hardship",
      themes: ["resilience"],
      source: "C. S. Lewis",
      language: "en"
      },
      {
      text: "He who conquers others is strong; he who conquers himself is mighty.",
      title: "Conquer yourself",
      themes: ["resilience"],
      source: "Lao Tzu",
      language: "en"
      },
      {
      text: "You have power over your mind—not outside events. Realize this, and you will find strength.",
      title: "Inner strength",
      themes: ["resilience", "anxiety"],
      source: "Marcus Aurelius",
      language: "en"
      },
      {
      text: "A smooth sea never made a skilled sailor.",
      title: "Rough seas",
      themes: ["resilience"],
      source: "Franklin D. Roosevelt",
      language: "en"
      },
      {
      text: "Adversity has the effect of eliciting talents which in prosperous circumstances would have lain dormant.",
      title: "Hidden talents",
      themes: ["resilience"],
      source: "Horace",
      language: "en"
      },
      {
      text: "Difficulties strengthen the mind, as labor does the body.",
      title: "Strength through trials",
      themes: ["resilience"],
      source: "Seneca",
      language: "en"
      },
      {
      text: "The greater the obstacle, the more glory in overcoming it.",
      title: "Overcome the obstacle",
      themes: ["resilience"],
      source: "Molière",
      language: "en"
      },
      {
      text: "Our wounds are often the openings into the best and most beautiful part of us.",
      title: "Openings in wounds",
      themes: ["resilience"],
      source: "David Richo",
      language: "en"
      },
      {
      text: "Life is not about waiting for the storm to pass. It's about learning to dance in the rain.",
      title: "Dance in rain",
      themes: ["resilience", "change"],
      source: "Vivian Greene",
      language: "en"
      },
      {
      text: "You never know how strong you are until being strong is your only choice.",
      title: "Only choice",
      themes: ["resilience"],
      source: "Bob Marley",
      language: "en"
      },
      {
      text: "You have been criticizing yourself for years and it hasn't worked. Try approving of yourself and see what happens.",
      title: "Try self-approval",
      themes: ["self-compassion"],
      source: "Louise Hay",
      language: "en"
      },
      {
      text: "Self-compassion is simply giving the same kindness to ourselves that we would give to others.",
      title: "Kindness inward",
      themes: ["self-compassion"],
      source: "Christopher Germer",
      language: "en"
      },
      {
      text: "With self-compassion, we give ourselves the same kindness and care we'd give to a good friend.",
      title: "Like a good friend",
      themes: ["self-compassion"],
      source: "Kristin Neff",
      language: "en"
      },
      {
      text: "Compassion is not a relationship between the healer and the wounded. It's a relationship between equals.",
      title: "Between equals",
      themes: ["self-compassion"],
      source: "Pema Chödrön",
      language: "en"
      },
      {
      text: "If your compassion does not include yourself, it is incomplete.",
      title: "Include yourself",
      themes: ["self-compassion"],
      source: "Jack Kornfield",
      language: "en"
      },
      {
      text: "The most powerful relationship you will ever have is the relationship with yourself.",
      title: "With yourself",
      themes: ["self-compassion"],
      source: "Steve Maraboli",
      language: "en"
      },
      {
      text: "Be gentle first with yourself if you wish to be gentle with others.",
      title: "Be gentle",
      themes: ["self-compassion"],
      source: "Lama Yeshe",
      language: "en"
      },
      {
      text: "You, yourself, as much as anybody in the entire universe, deserve your love and affection.",
      title: "Deserve your love",
      themes: ["self-compassion"],
      source: "Sharon Salzberg",
      language: "en"
      },
      {
      text: "Kindness begins with the understanding that we all struggle.",
      title: "We all struggle",
      themes: ["self-compassion"],
      source: "Charles F. Glassman",
      language: "en"
      },
      {
      text: "Be kinder to yourself. And then let your kindness flood the world.",
      title: "Flood the world",
      themes: ["self-compassion"],
      source: "Pema Chödrön",
      language: "en"
      },
      {
      text: "The greatest gift you can give yourself is a little bit of your own attention.",
      title: "Your own attention",
      themes: ["self-compassion"],
      source: "Anthony J. D'Angelo",
      language: "en"
      },
      {
      text: "There is nothing in a caterpillar that tells you it's going to be a butterfly.",
      title: "Becoming",
      themes: ["self-compassion", "change"],
      source: "R. Buckminster Fuller",
      language: "en"
      },
      {
      text: "You are imperfect, you are wired for struggle, but you are worthy of love and belonging.",
      title: "Worthy of love",
      themes: ["self-compassion"],
      source: "Brené Brown",
      language: "en"
      },
      {
      text: "When you make a mistake, respond to yourself in ways that are kind, understanding, and supportive.",
      title: "When you stumble",
      themes: ["self-compassion"],
      source: "Kristin Neff",
      language: "en"
      },
      {
      text: "The greatest weapon against stress is our ability to choose one thought over another.",
      title: "Choose your thought",
      themes: ["self-compassion", "anxiety"],
      source: "William James",
      language: "en"
      },
      {
      text: "Be faithful to that which exists within yourself.",
      title: "Be faithful",
      themes: ["self-compassion"],
      source: "André Gide",
      language: "en"
      },
      {
      text: "Almost everything will work again if you unplug it for a few minutes, including you.",
      title: "Unplug yourself",
      themes: ["self-compassion"],
      source: "Anne Lamott",
      language: "en"
      },
      {
      text: "We suffer more often in imagination than in reality.",
      title: "Imagination hurts",
      themes: ["anxiety", "fear"],
      source: "Seneca",
      language: "en"
      },
      {
      text: "Today is the first day of the rest of your life.",
      title: "Start today",
      themes: ["anxiety", "change"],
      source: "Charles Dederich",
      language: "en"
      },
      {
      text: "Nothing diminishes anxiety faster than action.",
      title: "Action over worry",
      themes: ["anxiety", "fear"],
      source: "Walter Anderson",
      language: "en"
      },
      {
      text: "Our anxiety does not empty tomorrow of its sorrows, but only empties today of its strength.",
      title: "Borrowed sorrow",
      themes: ["anxiety"],
      source: "Charles H. Spurgeon",
      language: "en"
      },
      {
      text: "You don't have to control your thoughts. You just have to stop letting them control you.",
      title: "Let thoughts pass",
      themes: ["anxiety"],
      source: "Dan Millman",
      language: "en"
      },
      {
      text: "Anxiety and fear are cousins, but they're not the same thing.",
      title: "Different cousins",
      themes: ["anxiety", "fear"],
      source: "Bessel van der Kolk",
      language: "en"
      },
      {
      text: "The greatest mistake you can make in life is to be continually fearing you will make one.",
      title: "Fear of mistakes",
      themes: ["anxiety", "fear"],
      source: "Elbert Hubbard",
      language: "en"
      },
      {
      text: "Rule your mind or it will rule you.",
      title: "Rule your mind",
      themes: ["anxiety"],
      source: "Horace",
      language: "en"
      },
      {
      text: "If you want to conquer the anxiety of life, live in the moment, live in the breath.",
      title: "Live in the breath",
      themes: ["anxiety"],
      source: "Amit Ray",
      language: "en"
      },
      {
      text: "The mind is its own place, and in itself can make a heaven of hell, a hell of heaven.",
      title: "The mind's place",
      themes: ["anxiety"],
      source: "John Milton",
      language: "en"
      },
      {
      text: "Nothing is permanent in this wicked world—not even our troubles.",
      title: "Troubles pass",
      themes: ["anxiety", "resilience"],
      source: "Charlie Chaplin",
      language: "en"
      },
      {
      text: "There is no need to hurry. There is no need to sparkle. There is no need to be anybody but oneself.",
      title: "No need to hurry",
      themes: ["anxiety", "self-compassion"],
      source: "Virginia Woolf",
      language: "en"
      },
      {
      text: "Worry never robs tomorrow of its sorrow, it only saps today of its joy.",
      title: "Worry steals today",
      themes: ["anxiety"],
      source: "Leo F. Buscaglia",
      language: "en"
      },
      {
      text: "The greatest mistake you can make is to believe that you are working for someone else.",
      title: "Your own path",
      themes: ["anxiety", "change"],
      source: "Earl Nightingale",
      language: "en"
      },
      {
      text: "If you cannot do great things, do small things in a great way.",
      title: "Small things",
      themes: ["anxiety", "resilience"],
      source: "Napoleon Hill",
      language: "en"
      },
      {
      text: "Anxiety is love's greatest killer. It makes others feel as you might feel when a drowning man holds on to you.",
      title: "Anxiety's grip",
      themes: ["anxiety"],
      source: "Anaïs Nin",
      language: "en"
      },
      {
      text: "The life in front of you is far more important than the life behind you.",
      title: "Life ahead",
      themes: ["anxiety", "change"],
      source: "Joel Osteen",
      language: "en"
      },
      {
      text: "Change is the law of life. And those who look only to the past or present are certain to miss the future.",
      title: "Law of life",
      themes: ["change"],
      source: "John F. Kennedy",
      language: "en"
      },
      {
      text: "They always say time changes things, but you actually have to change them yourself.",
      title: "Change yourself",
      themes: ["change"],
      source: "Andy Warhol",
      language: "en"
      },
      {
      text: "The measure of intelligence is the ability to change.",
      title: "Measure of intelligence",
      themes: ["change"],
      source: "Albert Einstein",
      language: "en"
      },
      {
      text: "Change alone is unchanging.",
      title: "Change remains",
      themes: ["change"],
      source: "Heraclitus",
      language: "en"
      },
      {
      text: "All things must change to something new, to something strange.",
      title: "Something new",
      themes: ["change"],
      source: "Henry Wadsworth Longfellow",
      language: "en"
      },
      {
      text: "If you do not change direction, you may end up where you are heading.",
      title: "Change direction",
      themes: ["change"],
      source: "Lao Tzu",
      language: "en"
      },
      {
      text: "Change your thoughts and you change your world.",
      title: "Change your thoughts",
      themes: ["change", "anxiety"],
      source: "Norman Vincent Peale",
      language: "en"
      },
      {
      text: "We delight in the beauty of the butterfly, but rarely admit the changes it has gone through to achieve that beauty.",
      title: "Butterfly changes",
      themes: ["change"],
      source: "Maya Angelou",
      language: "en"
      },
      {
      text: "The world as we have created it is a process of our thinking. It cannot be changed without changing our thinking.",
      title: "Change your thinking",
      themes: ["change"],
      source: "Albert Einstein",
      language: "en"
      },
      {
      text: "Your life does not get better by chance, it gets better by change.",
      title: "Better by change",
      themes: ["change"],
      source: "Jim Rohn",
      language: "en"
      },
      {
      text: "Nothing endures but change.",
      title: "Nothing but change",
      themes: ["change"],
      source: "Heraclitus",
      language: "en"
      },
      {
      text: "Progress is impossible without change, and those who cannot change their minds cannot change anything.",
      title: "Progress needs change",
      themes: ["change"],
      source: "George Bernard Shaw",
      language: "en"
      },
      {
      text: "To exist is to change, to change is to mature, to mature is to go on creating oneself endlessly.",
      title: "Creating yourself",
      themes: ["change"],
      source: "Henri Bergson",
      language: "en"
      },
      {
      text: "The price of doing the same old thing is far higher than the price of change.",
      title: "Price of sameness",
      themes: ["change"],
      source: "Bill Clinton",
      language: "en"
      },
      {
      text: "Every new beginning comes from some other beginning's end.",
      title: "New beginnings",
      themes: ["change"],
      source: "Seneca",
      language: "en"
      },
      {
      text: "The only constant in life is change.",
      title: "The constant",
      themes: ["change"],
      source: "Heraclitus",
      language: "en"
      },
      {
      text: "The only thing we have to fear is fear itself.",
      title: "Fear itself",
      themes: ["fear"],
      source: "Franklin D. Roosevelt",
      language: "en"
      },
      {
      text: "Courage is resistance to fear, mastery of fear—not absence of fear.",
      title: "Mastery of fear",
      themes: ["fear", "resilience"],
      source: "Mark Twain",
      language: "en"
      },
      {
      text: "Fear cuts deeper than swords.",
      title: "Deeper than swords",
      themes: ["fear"],
      source: "George R. R. Martin",
      language: "en"
      },
      {
      text: "Everything you want is on the other side of fear.",
      title: "Beyond fear",
      themes: ["fear", "resilience"],
      source: "Jack Canfield",
      language: "en"
      },
      {
      text: "Fear is the mind-killer.",
      title: "Mind-killer",
      themes: ["fear"],
      source: "Frank Herbert",
      language: "en"
      },
      {
      text: "The cave you fear to enter holds the treasure you seek.",
      title: "The hidden treasure",
      themes: ["fear", "change"],
      source: "Joseph Campbell",
      language: "en"
      },
      {
      text: "Do one thing every day that scares you.",
      title: "Do the scary thing",
      themes: ["fear", "resilience"],
      source: "Eleanor Roosevelt",
      language: "en"
      },
      {
      text: "Fear defeats more people than any other one thing in the world.",
      title: "Fear defeats",
      themes: ["fear"],
      source: "Ralph Waldo Emerson",
      language: "en"
      },
      {
      text: "I learned that courage was not the absence of fear, but the triumph over it.",
      title: "Triumph over fear",
      themes: ["fear", "resilience"],
      source: "Nelson Mandela",
      language: "en"
      },
      {
      text: "Fear doesn't shut you down; it wakes you up.",
      title: "Fear wakes you",
      themes: ["fear"],
      source: "Veronica Roth",
      language: "en"
      },
      {
      text: "He who is not everyday conquering some fear has not learned the secret of life.",
      title: "Conquer some fear",
      themes: ["fear", "resilience"],
      source: "Ralph Waldo Emerson",
      language: "en"
      },
      {
      text: "Fear is an instructor of great sagacity, and the herald of all revolutions.",
      title: "Fear teaches",
      themes: ["fear", "change"],
      source: "Ralph Waldo Emerson",
      language: "en"
      },
      {
      text: "We should all start to live before we get too old. Fear is stupid. So are regrets.",
      title: "Fear is stupid",
      themes: ["fear"],
      source: "Marilyn Monroe",
      language: "en"
      },
      {
      text: "The brave man is not he who does not feel afraid, but he who conquers that fear.",
      title: "Conquer fear",
      themes: ["fear", "resilience"],
      source: "Nelson Mandela",
      language: "en"
      },
      {
      text: "Fear has a large shadow, but he himself is small.",
      title: "Fear's shadow",
      themes: ["fear"],
      source: "Ruth Gendler",
      language: "en"
      },
      {
      text: "A ship in harbor is safe, but that is not what ships are built for.",
      title: "Built to sail",
      themes: ["fear", "change"],
      source: "John A. Shedd",
      language: "en"
      },
      {
      text: "Fear is static that prevents me from hearing myself.",
      title: "Fear is static",
      themes: ["fear", "anxiety"],
      source: "Samuel Butler",
      language: "en"
      },
      {
      text: "Do not fear to be eccentric in opinion, for every opinion now accepted was once eccentric.",
      title: "Dare to differ",
      themes: ["fear", "change"],
      source: "Bertrand Russell",
      language: "en"
      },
      {
      text: "The way to develop self-confidence is to do the thing you fear and get a record of successful experiences behind you.",
      title: "Build confidence",
      themes: ["fear", "resilience"],
      source: "William Jennings Bryan",
      language: "en"
      },
      {
      text: "Fear is a reaction. Courage is a decision.",
      title: "Courage decides",
      themes: ["fear", "resilience"],
      source: "Winston Churchill",
      language: "en"
      }
    

    
    
];

/**
 * Seed the quote library from the curated 130+ pool.
 *
 * Run once: bunx convex run seed:seedQuotes
 * Force re-seed: bunx convex run seed:seedQuotes '{"force":true}'
 */
export const seedQuotes = internalAction({
  args: { force: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const result: { inserted?: number; skipped?: boolean } =
      await ctx.runMutation(internal.quotes.seed, {
        quotes: QUOTES,
        force: args.force,
      });
    if (result.skipped) {
      console.log("[seed] Quote library already populated — pass force=true to override.");
    } else {
      console.log(`[seed] ${result.inserted} quotes seeded.`);
    }
    return result;
  },
});

/**
 * One-off backfill: give the already-seeded curated library its titles (#310).
 * Matches on `text` and only patches rows that have no title, so it is safe to
 * re-run and never overwrites an edited one. 121 patches fits one transaction.
 *
 * Run: bunx convex run seed:backfillQuoteTitles
 */
export const backfillQuoteTitles = internalMutation({
  args: {},
  handler: async (ctx) => {
    const titleByText = new Map(QUOTES.map((q) => [q.text, q.title]));
    const rows = await ctx.db.query("quotes").take(1000);

    let patched = 0;
    let unmatched = 0;
    for (const row of rows) {
      if (row.title) continue;
      const title = titleByText.get(row.text);
      if (!title) {
        unmatched++;
        continue;
      }
      await ctx.db.patch("quotes", row._id, { title });
      patched++;
    }

    console.log(`[seed] Backfilled ${patched} quote titles (${unmatched} unmatched).`);
    return { patched, unmatched };
  },
});
