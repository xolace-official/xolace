import { api } from "@xolace/backend/convex/_generated/api";
import { useAction } from "convex/react";
import { getRecordingPermissionsAsync } from "expo-audio";
import { File } from "expo-file-system";
import { useRouter } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useEffect, useRef, useState } from "react";
import { AppState, Linking } from "react-native";
import { usePlusEntitlement } from "@/features/purchases/use-plus-entitlement";
import { useReplyVoice } from "@/features/vent/use-reply-voice";
import type {
	VentBackend,
	VentReply,
	VentStage,
} from "@/features/vent/vent-backend";
import {
	afterBurn,
	ceilingMs,
	type VentResult,
} from "@/features/vent/vent-model";
import { useMeteringRecorder } from "@/lib/audio/use-metering-recorder";
import { useVoiceProcessingConsent } from "@/lib/consent/use-voice-processing-consent";
import { useAppStore } from "@/store/store";

/** Deletes a take's file. Nothing about a vent is kept once it's let go or dropped. */
function deleteTake(uri: string) {
	try {
		new File(uri).delete();
	} catch {
		// Already gone.
	}
}

/**
 * Vent on Convex: production's pipeline (`use-vent-flow.ts` before the redesign), unchanged.
 * Record with metering, consent before any audio leaves the phone, upload, and wait for both
 * the burn and the server before the reply (`heard`) or "Gone." (`gone`). Every PostHog event is
 * production's; v2 adds the drop (`vent_closed` from a recording) and the mic-off state.
 */
export function useVent(): VentBackend {
	const posthog = usePostHog();
	const router = useRouter();
	const { isPlus } = usePlusEntitlement();
	const introSeen = useAppStore((s) => s.ventIntroSeen);
	const setIntroSeen = useAppStore((s) => s.setVentIntroSeen);
	const { startRecording, stopRecording, metering, getDurationMs } =
		useMeteringRecorder();
	const processVentAudio = useAction(api.vent.processVentAudio);
	const { ensureConsent } = useVoiceProcessingConsent();
	const voice = useReplyVoice();

	const [stage, setStageState] = useState<VentStage>("idle");
	// Read by actions the flow calls from timers, which may hold an older render's closure.
	const stageRef = useRef<VentStage>("idle");
	const setStage = (next: VentStage) => {
		stageRef.current = next;
		setStageState(next);
	};
	const [reply, setReply] = useState<VentReply | null>(null);
	const [capReached, setCapReached] = useState(false);
	const [micOff, setMicOff] = useState(false);
	const busy = useRef(false);
	const result = useRef<VentResult | null>(null);
	const burnt = useRef(false);
	const durationAtStop = useRef(0);
	// Started with the vent, so the write lands while they speak; the upload waits on it.
	const consent = useRef<Promise<void> | null>(null);

	// Coming back from Settings: clear the mic-off message once it's allowed (clarity's primer).
	useEffect(() => {
		if (!micOff) {
			return;
		}
		const sub = AppState.addEventListener("change", (next) => {
			if (next === "active") {
				getRecordingPermissionsAsync()
					.then((p) => p.granted && setMicOff(false))
					.catch(() => undefined);
			}
		});
		return () => sub.remove();
	}, [micOff]);

	// Out of `processing` only once the burn has finished and the result (or failure) is known.
	const tryAdvance = () => {
		if (!(burnt.current && result.current)) {
			return;
		}
		const next = afterBurn(result.current);
		const duration_ms = durationAtStop.current;
		if (next.stage === "gone") {
			setCapReached(next.capReached);
			posthog.capture(next.capReached ? "vent_cap_reached" : "vent_error", {
				duration_ms,
			});
		} else {
			setReply({ crisis: next.crisis, words: next.words });
			posthog.capture("vent_heard", {
				duration_ms,
				has_audio: !!next.audioUrl,
			});
		}
		if (stageRef.current === "processing") {
			setStage(next.stage);
		}
	};

	const start = async () => {
		if (stageRef.current !== "idle") {
			return "failed" as const;
		}
		if (!(await startRecording())) {
			const p = await getRecordingPermissionsAsync().catch(() => null);
			if (p && !p.granted) {
				setMicOff(true);
				return "off" as const;
			}
			return "failed" as const;
		}
		setMicOff(false);
		const write = ensureConsent();
		write.catch(() => undefined); // surfaced when the upload awaits it
		consent.current = write;
		setStage("recording");
		posthog.capture("vent_started");
		return "started" as const;
	};

	const upload = async (uri: string, durationMs: number) => {
		// No audio reaches ElevenLabs before voice_processing consent is on record; a write that
		// failed at the start gets one retry.
		await (consent.current?.catch(ensureConsent) ?? ensureConsent());
		// RN's fetch Blob has no arrayBuffer(), so read via expo-file-system.
		const bytes = await new File(uri).bytes();
		const audioBytes = bytes.buffer.slice(
			bytes.byteOffset,
			bytes.byteOffset + bytes.byteLength
		);
		const answer = await processVentAudio({ audioBytes, durationMs });
		result.current = answer;
		if (answer.audioUrl && answer.words) {
			voice.load(answer.audioUrl);
		}
	};

	const stop = async (atCeiling: boolean) => {
		if (stageRef.current !== "recording" || busy.current) {
			return;
		}
		busy.current = true;
		burnt.current = false;
		result.current = null;
		const durationMs = getDurationMs();
		durationAtStop.current = durationMs;
		posthog.capture("vent_stopped", {
			duration_ms: durationMs,
			max_duration_reached: atCeiling,
		});
		setStage("processing");
		const uri = await stopRecording();
		if (!uri) {
			// Recording failed: the burn plays anyway, then straight to gone.
			result.current = "error";
			busy.current = false;
			tryAdvance();
			return;
		}
		upload(uri, durationMs)
			.catch((err: unknown) => {
				console.error("[vent] pipeline failed:", err);
				// The burn is not contingent on the AI.
				result.current = "error";
			})
			.finally(() => {
				// "Your voice is never stored": the take goes once it has been sent, or failed to be.
				deleteTake(uri);
				busy.current = false;
				tryAdvance();
			});
	};

	/** v2: a take closed or left mid-vent is dropped: nothing is sent, and its file goes. */
	const drop = async (reason: "close" | "background" | "unmounted") => {
		if (stageRef.current !== "recording") {
			return;
		}
		// Off "recording" before the await, so a late stop() can't upload the dropped take.
		setStage("gone");
		posthog.capture("vent_closed", { reason, state: "recording" });
		// Stopped before the screen goes, while the recorder is still there to stop.
		const uri = await stopRecording();
		if (reason !== "unmounted") {
			router.back();
		}
		if (uri) {
			deleteTake(uri);
		}
	};

	return {
		actions: {
			burnt: () => {
				burnt.current = true;
				tryAdvance();
			},
			close: () => {
				posthog.capture("vent_closed", { state: stageRef.current });
				router.back();
			},
			drop,
			finish: () => {
				if (stageRef.current !== "heard") {
					return;
				}
				posthog.capture("vent_completed", {
					duration_ms: durationAtStop.current,
				});
				setStage("gone");
			},
			leave: () => router.back(),
			openSettings: () => {
				Linking.openSettings().catch(() => undefined);
			},
			recordedMs: getDurationMs,
			speak: voice.speak,
			start,
			stop,
			support: () => router.push("/(protected)/crisis-resources"),
			understand: () => {
				posthog.capture("vent_intro_completed");
				setIntroSeen(true);
			},
		},
		state: {
			// No query serves it yet: the S13 PR names the gap.
			capBefore: false,
			capReached,
			ceilingMs: ceilingMs(isPlus),
			introSeen,
			level: metering,
			micOff,
			reply,
			stage,
		},
	};
}
