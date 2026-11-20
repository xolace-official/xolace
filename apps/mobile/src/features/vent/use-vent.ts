import { api } from "@xolace/backend/convex/_generated/api";
import { useAction } from "convex/react";
import { getRecordingPermissionsAsync } from "expo-audio";
import { File } from "expo-file-system";
import { useRouter } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useEffect, useRef, useState } from "react";
import { AppState, Linking } from "react-native";
import { usePlusEntitlement } from "@/features/purchases/use-plus-entitlement";
import { exitVent } from "@/features/vent/exit-vent";
import { useReplyVoice } from "@/features/vent/use-reply-voice";
import type {
	VentBackend,
	VentReply,
	VentStage,
	VentStart,
} from "@/features/vent/vent-backend";
import {
	afterBurn,
	ceilingMs,
	type VentResult,
} from "@/features/vent/vent-model";
import { useMeteringRecorder } from "@/lib/audio/use-metering-recorder";
import { useVoiceProcessingConsent } from "@/lib/consent/use-voice-processing-consent";
import { createSingleFlight } from "@/lib/single-flight";
import { useAppStore } from "@/store/store";

function deleteTake(uri: string) {
	try {
		new File(uri).delete();
	} catch {
		// Already gone.
	}
}

export function useVent(): VentBackend {
	const posthog = usePostHog();
	const router = useRouter();
	const { status: plus } = usePlusEntitlement();
	const introSeen = useAppStore((s) => s.ventIntroSeen);
	const setIntroSeen = useAppStore((s) => s.setVentIntroSeen);
	const { startRecording, stopRecording, metering, getDurationMs, getUri } =
		useMeteringRecorder();
	const processVentAudio = useAction(api.vent.processVentAudio);
	const { ensureConsent } = useVoiceProcessingConsent();
	const voice = useReplyVoice();

	const [stage, setStageState] = useState<VentStage>("idle");
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
	const takeUri = useRef<string | null>(null);
	const consent = useRef<Promise<void> | null>(null);
	const [startFlight] = useState(createSingleFlight);

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

	const begin = async () => {
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
		takeUri.current = getUri();
		const write = ensureConsent();
		write.catch(() => undefined);
		consent.current = write;
		setStage("recording");
		posthog.capture("vent_started");
		return "started" as const;
	};

	const start = async (): Promise<VentStart> => {
		let got: VentStart = "busy";
		await startFlight.run(async () => {
			got = await begin();
		});
		return got;
	};

	const upload = async (uri: string, durationMs: number) => {
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
		takeUri.current = null;
		if (!uri) {
			result.current = "error";
			busy.current = false;
			tryAdvance();
			return;
		}
		upload(uri, durationMs)
			.catch((err: unknown) => {
				console.error("[vent] pipeline failed:", err);
				result.current = "error";
			})
			.finally(() => {
				deleteTake(uri);
				busy.current = false;
				tryAdvance();
			});
	};

	const drop = async (reason: "close" | "background" | "unmounted") => {
		if (stageRef.current !== "recording") {
			return;
		}
		setStage("gone");
		posthog.capture("vent_closed", { reason, state: "recording" });
		const uri = (await stopRecording()) ?? takeUri.current;
		takeUri.current = null;
		if (reason !== "unmounted") {
			exitVent(router);
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
				exitVent(router);
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
			leave: () => exitVent(router),
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
			capBefore: false,
			capReached,
			ceilingMs: ceilingMs(plus),
			introSeen,
			level: metering,
			micOff,
			reply,
			stage,
		},
	};
}
