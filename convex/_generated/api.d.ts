/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as ai_bridge from "../ai/bridge.js";
import type * as ai_cached from "../ai/cached.js";
import type * as ai_cachedActions from "../ai/cachedActions.js";
import type * as ai_chat_classify from "../ai/chat/classify.js";
import type * as ai_chat_moderate from "../ai/chat/moderate.js";
import type * as ai_clarify from "../ai/clarify.js";
import type * as ai_context from "../ai/context.js";
import type * as ai_evalMetrics from "../ai/evalMetrics.js";
import type * as ai_followUpCard from "../ai/followUpCard.js";
import type * as ai_generateNotification from "../ai/generateNotification.js";
import type * as ai_helpers_episodicSearch from "../ai/helpers/episodicSearch.js";
import type * as ai_helpers_patternSummary from "../ai/helpers/patternSummary.js";
import type * as ai_intakeSignals from "../ai/intakeSignals.js";
import type * as ai_mirrorPlan from "../ai/mirrorPlan.js";
import type * as ai_paths_audioTracks from "../ai/paths/audioTracks.js";
import type * as ai_paths_bind from "../ai/paths/bind.js";
import type * as ai_paths_catalog from "../ai/paths/catalog.js";
import type * as ai_paths_generate from "../ai/paths/generate.js";
import type * as ai_paths_generateDb from "../ai/paths/generateDb.js";
import type * as ai_paths_notify from "../ai/paths/notify.js";
import type * as ai_paths_prompt from "../ai/paths/prompt.js";
import type * as ai_process from "../ai/process.js";
import type * as ai_prompts_accumulatedInput from "../ai/prompts/accumulatedInput.js";
import type * as ai_prompts_articulator from "../ai/prompts/articulator.js";
import type * as ai_prompts_classifier from "../ai/prompts/classifier.js";
import type * as ai_prompts_distiller from "../ai/prompts/distiller.js";
import type * as ai_prompts_followUpCardWriter from "../ai/prompts/followUpCardWriter.js";
import type * as ai_prompts_mirrorAudioTags from "../ai/prompts/mirrorAudioTags.js";
import type * as ai_prompts_notificationTemplates from "../ai/prompts/notificationTemplates.js";
import type * as ai_prompts_notificationWriter from "../ai/prompts/notificationWriter.js";
import type * as ai_prompts_reflectionConsolidation from "../ai/prompts/reflectionConsolidation.js";
import type * as ai_prompts_reflectionLight from "../ai/prompts/reflectionLight.js";
import type * as ai_providers_anthropic from "../ai/providers/anthropic.js";
import type * as ai_providers_moderation from "../ai/providers/moderation.js";
import type * as ai_quotesDistiller from "../ai/quotesDistiller.js";
import type * as ai_quotesPrompt from "../ai/quotesPrompt.js";
import type * as ai_quotesQuality from "../ai/quotesQuality.js";
import type * as ai_quotesRequest from "../ai/quotesRequest.js";
import type * as ai_reflectionAgent_calibration from "../ai/reflectionAgent/calibration.js";
import type * as ai_reflectionAgent_calibrationSignals from "../ai/reflectionAgent/calibrationSignals.js";
import type * as ai_reflectionAgent_consolidation from "../ai/reflectionAgent/consolidation.js";
import type * as ai_reflectionAgent_insightTools from "../ai/reflectionAgent/insightTools.js";
import type * as ai_reflectionAgent_toolQueries from "../ai/reflectionAgent/toolQueries.js";
import type * as ai_reflectionAgent_tools from "../ai/reflectionAgent/tools.js";
import type * as ai_reflectionAgent_trigger from "../ai/reflectionAgent/trigger.js";
import type * as ai_reflectionAgent_triggerQueries from "../ai/reflectionAgent/triggerQueries.js";
import type * as ai_routing from "../ai/routing.js";
import type * as ai_safeguard from "../ai/safeguard.js";
import type * as ai_slotFill from "../ai/slotFill.js";
import type * as ai_tts from "../ai/tts.js";
import type * as ai_ventAcknowledge from "../ai/ventAcknowledge.js";
import type * as avatars from "../avatars.js";
import type * as browse from "../browse.js";
import type * as chatNotifications from "../chatNotifications.js";
import type * as cohort from "../cohort.js";
import type * as compounding_detect from "../compounding/detect.js";
import type * as compounding_dev from "../compounding/dev.js";
import type * as compounding_devSeed from "../compounding/devSeed.js";
import type * as compounding_devSeedCompounding from "../compounding/devSeedCompounding.js";
import type * as compounding_insightEvidence from "../compounding/insightEvidence.js";
import type * as compounding_insightFacts from "../compounding/insightFacts.js";
import type * as compounding_insightGate from "../compounding/insightGate.js";
import type * as compounding_insightStore from "../compounding/insightStore.js";
import type * as compounding_insights from "../compounding/insights.js";
import type * as compounding_readings from "../compounding/readings.js";
import type * as compounding_steadiness from "../compounding/steadiness.js";
import type * as compounding_stretches from "../compounding/stretches.js";
import type * as compounding_trend from "../compounding/trend.js";
import type * as compounding_unlocks from "../compounding/unlocks.js";
import type * as compounding_upsell from "../compounding/upsell.js";
import type * as consent from "../consent.js";
import type * as crons from "../crons.js";
import type * as dailyQuotes from "../dailyQuotes.js";
import type * as devTools from "../devTools.js";
import type * as emotionalMetadata from "../emotionalMetadata.js";
import type * as episodicImportance from "../episodicImportance.js";
import type * as episodicMemory from "../episodicMemory.js";
import type * as escalation from "../escalation.js";
import type * as evals from "../evals.js";
import type * as exercises from "../exercises.js";
import type * as exercises_match from "../exercises/match.js";
import type * as feedback from "../feedback.js";
import type * as followUpResponses from "../followUpResponses.js";
import type * as followUps from "../followUps.js";
import type * as http from "../http.js";
import type * as intake from "../intake.js";
import type * as integrations_stream from "../integrations/stream.js";
import type * as jobs_accountDeletion from "../jobs/accountDeletion.js";
import type * as jobs_accountDeletionFinalize from "../jobs/accountDeletionFinalize.js";
import type * as jobs_accountDeletionSteps from "../jobs/accountDeletionSteps.js";
import type * as jobs_cohortCounts from "../jobs/cohortCounts.js";
import type * as jobs_dataRetention from "../jobs/dataRetention.js";
import type * as jobs_dataWipe from "../jobs/dataWipe.js";
import type * as jobs_followUpShare from "../jobs/followUpShare.js";
import type * as jobs_notificationTriggers from "../jobs/notificationTriggers.js";
import type * as jobs_profileStats from "../jobs/profileStats.js";
import type * as jobs_quotesGenerator from "../jobs/quotesGenerator.js";
import type * as jobs_rankAudit from "../jobs/rankAudit.js";
import type * as jobs_reflectionAnonymizer from "../jobs/reflectionAnonymizer.js";
import type * as jobs_reflectionDistiller from "../jobs/reflectionDistiller.js";
import type * as lib_aggregates from "../lib/aggregates.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_camperTag from "../lib/camperTag.js";
import type * as lib_chatNotifications from "../lib/chatNotifications.js";
import type * as lib_claimStrength from "../lib/claimStrength.js";
import type * as lib_cohortCard from "../lib/cohortCard.js";
import type * as lib_conversationErasure from "../lib/conversationErasure.js";
import type * as lib_conversationGating from "../lib/conversationGating.js";
import type * as lib_displayName from "../lib/displayName.js";
import type * as lib_followUpCadence from "../lib/followUpCadence.js";
import type * as lib_notificationPrefs from "../lib/notificationPrefs.js";
import type * as lib_notificationSounds from "../lib/notificationSounds.js";
import type * as lib_plusOfferObservations from "../lib/plusOfferObservations.js";
import type * as lib_poolability from "../lib/poolability.js";
import type * as lib_premium from "../lib/premium.js";
import type * as lib_pushDevices from "../lib/pushDevices.js";
import type * as lib_pushNotifications from "../lib/pushNotifications.js";
import type * as lib_rateLimits from "../lib/rateLimits.js";
import type * as lib_reflectionMatching from "../lib/reflectionMatching.js";
import type * as lib_sessionCascade from "../lib/sessionCascade.js";
import type * as lib_spaceName from "../lib/spaceName.js";
import type * as lib_specialties from "../lib/specialties.js";
import type * as lib_streamSetup from "../lib/streamSetup.js";
import type * as lib_timeOfDay from "../lib/timeOfDay.js";
import type * as lib_understandingVocab from "../lib/understandingVocab.js";
import type * as lib_validators from "../lib/validators.js";
import type * as lib_voices from "../lib/voices.js";
import type * as lib_xolacerSuggestion from "../lib/xolacerSuggestion.js";
import type * as library_admin from "../library/admin.js";
import type * as library_audio from "../library/audio.js";
import type * as library_entries from "../library/entries.js";
import type * as library_home from "../library/home.js";
import type * as library_hubs from "../library/hubs.js";
import type * as library_imageAlts from "../library/imageAlts.js";
import type * as library_ingest from "../library/ingest.js";
import type * as library_next from "../library/next.js";
import type * as library_reads from "../library/reads.js";
import type * as library_sources from "../library/sources.js";
import type * as migrations from "../migrations.js";
import type * as monthlyEvents from "../monthlyEvents.js";
import type * as notifications from "../notifications.js";
import type * as paths from "../paths.js";
import type * as plusOffers from "../plusOffers.js";
import type * as posthog from "../posthog.js";
import type * as preferences from "../preferences.js";
import type * as premium from "../premium.js";
import type * as presence from "../presence.js";
import type * as productFeedback from "../productFeedback.js";
import type * as productFeedbackFlags from "../productFeedbackFlags.js";
import type * as profile from "../profile.js";
import type * as quotes from "../quotes.js";
import type * as rag from "../rag.js";
import type * as reflections from "../reflections.js";
import type * as reflectionsRag from "../reflectionsRag.js";
import type * as revenuecat from "../revenuecat.js";
import type * as seed from "../seed.js";
import type * as semanticProfiles from "../semanticProfiles.js";
import type * as sessionTurns from "../sessionTurns.js";
import type * as sessions from "../sessions.js";
import type * as storage_storageTools from "../storage/storageTools.js";
import type * as streaks_activityLog from "../streaks/activityLog.js";
import type * as streaks_history from "../streaks/history.js";
import type * as streaks_manual from "../streaks/manual.js";
import type * as streaks_milestones from "../streaks/milestones.js";
import type * as streaks_revive from "../streaks/revive.js";
import type * as streaks_state from "../streaks/state.js";
import type * as streamGunzip from "../streamGunzip.js";
import type * as streamSetup from "../streamSetup.js";
import type * as streamWebhook from "../streamWebhook.js";
import type * as understanding from "../understanding.js";
import type * as users from "../users.js";
import type * as vent from "../vent.js";
import type * as xolaceChannelNotifications from "../xolaceChannelNotifications.js";
import type * as xolacerChat from "../xolacerChat.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  "ai/bridge": typeof ai_bridge;
  "ai/cached": typeof ai_cached;
  "ai/cachedActions": typeof ai_cachedActions;
  "ai/chat/classify": typeof ai_chat_classify;
  "ai/chat/moderate": typeof ai_chat_moderate;
  "ai/clarify": typeof ai_clarify;
  "ai/context": typeof ai_context;
  "ai/evalMetrics": typeof ai_evalMetrics;
  "ai/followUpCard": typeof ai_followUpCard;
  "ai/generateNotification": typeof ai_generateNotification;
  "ai/helpers/episodicSearch": typeof ai_helpers_episodicSearch;
  "ai/helpers/patternSummary": typeof ai_helpers_patternSummary;
  "ai/intakeSignals": typeof ai_intakeSignals;
  "ai/mirrorPlan": typeof ai_mirrorPlan;
  "ai/paths/audioTracks": typeof ai_paths_audioTracks;
  "ai/paths/bind": typeof ai_paths_bind;
  "ai/paths/catalog": typeof ai_paths_catalog;
  "ai/paths/generate": typeof ai_paths_generate;
  "ai/paths/generateDb": typeof ai_paths_generateDb;
  "ai/paths/notify": typeof ai_paths_notify;
  "ai/paths/prompt": typeof ai_paths_prompt;
  "ai/process": typeof ai_process;
  "ai/prompts/accumulatedInput": typeof ai_prompts_accumulatedInput;
  "ai/prompts/articulator": typeof ai_prompts_articulator;
  "ai/prompts/classifier": typeof ai_prompts_classifier;
  "ai/prompts/distiller": typeof ai_prompts_distiller;
  "ai/prompts/followUpCardWriter": typeof ai_prompts_followUpCardWriter;
  "ai/prompts/mirrorAudioTags": typeof ai_prompts_mirrorAudioTags;
  "ai/prompts/notificationTemplates": typeof ai_prompts_notificationTemplates;
  "ai/prompts/notificationWriter": typeof ai_prompts_notificationWriter;
  "ai/prompts/reflectionConsolidation": typeof ai_prompts_reflectionConsolidation;
  "ai/prompts/reflectionLight": typeof ai_prompts_reflectionLight;
  "ai/providers/anthropic": typeof ai_providers_anthropic;
  "ai/providers/moderation": typeof ai_providers_moderation;
  "ai/quotesDistiller": typeof ai_quotesDistiller;
  "ai/quotesPrompt": typeof ai_quotesPrompt;
  "ai/quotesQuality": typeof ai_quotesQuality;
  "ai/quotesRequest": typeof ai_quotesRequest;
  "ai/reflectionAgent/calibration": typeof ai_reflectionAgent_calibration;
  "ai/reflectionAgent/calibrationSignals": typeof ai_reflectionAgent_calibrationSignals;
  "ai/reflectionAgent/consolidation": typeof ai_reflectionAgent_consolidation;
  "ai/reflectionAgent/insightTools": typeof ai_reflectionAgent_insightTools;
  "ai/reflectionAgent/toolQueries": typeof ai_reflectionAgent_toolQueries;
  "ai/reflectionAgent/tools": typeof ai_reflectionAgent_tools;
  "ai/reflectionAgent/trigger": typeof ai_reflectionAgent_trigger;
  "ai/reflectionAgent/triggerQueries": typeof ai_reflectionAgent_triggerQueries;
  "ai/routing": typeof ai_routing;
  "ai/safeguard": typeof ai_safeguard;
  "ai/slotFill": typeof ai_slotFill;
  "ai/tts": typeof ai_tts;
  "ai/ventAcknowledge": typeof ai_ventAcknowledge;
  avatars: typeof avatars;
  browse: typeof browse;
  chatNotifications: typeof chatNotifications;
  cohort: typeof cohort;
  "compounding/detect": typeof compounding_detect;
  "compounding/dev": typeof compounding_dev;
  "compounding/devSeed": typeof compounding_devSeed;
  "compounding/devSeedCompounding": typeof compounding_devSeedCompounding;
  "compounding/insightEvidence": typeof compounding_insightEvidence;
  "compounding/insightFacts": typeof compounding_insightFacts;
  "compounding/insightGate": typeof compounding_insightGate;
  "compounding/insightStore": typeof compounding_insightStore;
  "compounding/insights": typeof compounding_insights;
  "compounding/readings": typeof compounding_readings;
  "compounding/steadiness": typeof compounding_steadiness;
  "compounding/stretches": typeof compounding_stretches;
  "compounding/trend": typeof compounding_trend;
  "compounding/unlocks": typeof compounding_unlocks;
  "compounding/upsell": typeof compounding_upsell;
  consent: typeof consent;
  crons: typeof crons;
  dailyQuotes: typeof dailyQuotes;
  devTools: typeof devTools;
  emotionalMetadata: typeof emotionalMetadata;
  episodicImportance: typeof episodicImportance;
  episodicMemory: typeof episodicMemory;
  escalation: typeof escalation;
  evals: typeof evals;
  exercises: typeof exercises;
  "exercises/match": typeof exercises_match;
  feedback: typeof feedback;
  followUpResponses: typeof followUpResponses;
  followUps: typeof followUps;
  http: typeof http;
  intake: typeof intake;
  "integrations/stream": typeof integrations_stream;
  "jobs/accountDeletion": typeof jobs_accountDeletion;
  "jobs/accountDeletionFinalize": typeof jobs_accountDeletionFinalize;
  "jobs/accountDeletionSteps": typeof jobs_accountDeletionSteps;
  "jobs/cohortCounts": typeof jobs_cohortCounts;
  "jobs/dataRetention": typeof jobs_dataRetention;
  "jobs/dataWipe": typeof jobs_dataWipe;
  "jobs/followUpShare": typeof jobs_followUpShare;
  "jobs/notificationTriggers": typeof jobs_notificationTriggers;
  "jobs/profileStats": typeof jobs_profileStats;
  "jobs/quotesGenerator": typeof jobs_quotesGenerator;
  "jobs/rankAudit": typeof jobs_rankAudit;
  "jobs/reflectionAnonymizer": typeof jobs_reflectionAnonymizer;
  "jobs/reflectionDistiller": typeof jobs_reflectionDistiller;
  "lib/aggregates": typeof lib_aggregates;
  "lib/auth": typeof lib_auth;
  "lib/camperTag": typeof lib_camperTag;
  "lib/chatNotifications": typeof lib_chatNotifications;
  "lib/claimStrength": typeof lib_claimStrength;
  "lib/cohortCard": typeof lib_cohortCard;
  "lib/conversationErasure": typeof lib_conversationErasure;
  "lib/conversationGating": typeof lib_conversationGating;
  "lib/displayName": typeof lib_displayName;
  "lib/followUpCadence": typeof lib_followUpCadence;
  "lib/notificationPrefs": typeof lib_notificationPrefs;
  "lib/notificationSounds": typeof lib_notificationSounds;
  "lib/plusOfferObservations": typeof lib_plusOfferObservations;
  "lib/poolability": typeof lib_poolability;
  "lib/premium": typeof lib_premium;
  "lib/pushDevices": typeof lib_pushDevices;
  "lib/pushNotifications": typeof lib_pushNotifications;
  "lib/rateLimits": typeof lib_rateLimits;
  "lib/reflectionMatching": typeof lib_reflectionMatching;
  "lib/sessionCascade": typeof lib_sessionCascade;
  "lib/spaceName": typeof lib_spaceName;
  "lib/specialties": typeof lib_specialties;
  "lib/streamSetup": typeof lib_streamSetup;
  "lib/timeOfDay": typeof lib_timeOfDay;
  "lib/understandingVocab": typeof lib_understandingVocab;
  "lib/validators": typeof lib_validators;
  "lib/voices": typeof lib_voices;
  "lib/xolacerSuggestion": typeof lib_xolacerSuggestion;
  "library/admin": typeof library_admin;
  "library/audio": typeof library_audio;
  "library/entries": typeof library_entries;
  "library/home": typeof library_home;
  "library/hubs": typeof library_hubs;
  "library/imageAlts": typeof library_imageAlts;
  "library/ingest": typeof library_ingest;
  "library/next": typeof library_next;
  "library/reads": typeof library_reads;
  "library/sources": typeof library_sources;
  migrations: typeof migrations;
  monthlyEvents: typeof monthlyEvents;
  notifications: typeof notifications;
  paths: typeof paths;
  plusOffers: typeof plusOffers;
  posthog: typeof posthog;
  preferences: typeof preferences;
  premium: typeof premium;
  presence: typeof presence;
  productFeedback: typeof productFeedback;
  productFeedbackFlags: typeof productFeedbackFlags;
  profile: typeof profile;
  quotes: typeof quotes;
  rag: typeof rag;
  reflections: typeof reflections;
  reflectionsRag: typeof reflectionsRag;
  revenuecat: typeof revenuecat;
  seed: typeof seed;
  semanticProfiles: typeof semanticProfiles;
  sessionTurns: typeof sessionTurns;
  sessions: typeof sessions;
  "storage/storageTools": typeof storage_storageTools;
  "streaks/activityLog": typeof streaks_activityLog;
  "streaks/history": typeof streaks_history;
  "streaks/manual": typeof streaks_manual;
  "streaks/milestones": typeof streaks_milestones;
  "streaks/revive": typeof streaks_revive;
  "streaks/state": typeof streaks_state;
  streamGunzip: typeof streamGunzip;
  streamSetup: typeof streamSetup;
  streamWebhook: typeof streamWebhook;
  understanding: typeof understanding;
  users: typeof users;
  vent: typeof vent;
  xolaceChannelNotifications: typeof xolaceChannelNotifications;
  xolacerChat: typeof xolacerChat;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
  actionCache: import("@convex-dev/action-cache/_generated/component.js").ComponentApi<"actionCache">;
  migrations: import("@convex-dev/migrations/_generated/component.js").ComponentApi<"migrations">;
  pushNotifications: import("@convex-dev/expo-push-notifications/_generated/component.js").ComponentApi<"pushNotifications">;
  workflow: import("@convex-dev/workflow/_generated/component.js").ComponentApi<"workflow">;
  rag: import("@convex-dev/rag/_generated/component.js").ComponentApi<"rag">;
  revenuecat: import("convex-revenuecat/_generated/component.js").ComponentApi<"revenuecat">;
  presence: import("@convex-dev/presence/_generated/component.js").ComponentApi<"presence">;
  reflectionRank: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"reflectionRank">;
  r2: import("@convex-dev/r2/_generated/component.js").ComponentApi<"r2">;
  posthog: import("@posthog/convex/_generated/component.js").ComponentApi<"posthog">;
};
