import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { yieldAudioFocus } from '@/src/lib/audio/session';
import { joinDictation } from '@/src/features/reflect/hooks/dictation-transcript';

export function useVoiceInput() {
  const [isRecording, setIsRecording] = useState(false);
  const [partialTranscript, setPartialTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const consentStatus = useQuery(api.consent.getCurrentStatus, {
    consentType: 'voice_processing',
  });
  const grantConsent = useMutation(api.consent.grant);

  // Set as start() is called, not on the 'start' event, so a blur or background
  // in between still aborts.
  const isRecordingRef = useRef(false);
  const isFocusedRef = useRef(false);
  // Segments already finalised this recording; interim results cover only the next one.
  const finalisedRef = useRef('');

  useSpeechRecognitionEvent('start', () => {
    finalisedRef.current = '';
    setIsRecording(true);
    isRecordingRef.current = true;
  });

  useSpeechRecognitionEvent('end', () => {
    setIsRecording(false);
    isRecordingRef.current = false;
    setPartialTranscript('');
  });

  useSpeechRecognitionEvent('result', (event) => {
    const text = joinDictation(finalisedRef.current, event.results[0]?.transcript ?? '');
    if (event.isFinal) finalisedRef.current = text;
    if (text) setPartialTranscript(text);
  });

  useSpeechRecognitionEvent('error', (event) => {
    if (event.error !== 'aborted' && event.error !== 'no-speech') {
      setError(event.message ?? event.error);
    }
    setIsRecording(false);
    isRecordingRef.current = false;
  });

  // Continuous recognition never ends on its own — stop it when the person
  // leaves the screen, backgrounds the app, or the hook unmounts.
  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;
      return () => {
        isFocusedRef.current = false;
        if (isRecordingRef.current) ExpoSpeechRecognitionModule.abort();
      };
    }, [])
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && isRecordingRef.current) ExpoSpeechRecognitionModule.abort();
    });
    return () => sub.remove();
  }, []);

  const startRecording = async () => {
    setError(null);
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!result.granted) {
      setError('Microphone permission is required for voice input.');
      return;
    }

    if (consentStatus?.status !== 'granted') {
      grantConsent({ consentType: 'voice_processing', consentLanguageVersion: '1.0' }).catch(
        console.error
      );
    }

    // The person may have left while the permission prompt was up.
    if (!isFocusedRef.current || AppState.currentState === 'background') return;

    // Recognition sets its own session, so it yields the Browse track itself.
    yieldAudioFocus();
    isRecordingRef.current = true;
    ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: true,
      continuous: true,
      addsPunctuation: Platform.OS === 'ios',
      iosTaskHint: 'dictation',
      maxAlternatives: 1,
    });
  };

  const stopRecording = () => {
    ExpoSpeechRecognitionModule.abort();
  };

  return {
    isRecording,
    partialTranscript,
    startRecording,
    stopRecording,
    error,
  };
}
