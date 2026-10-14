import type {
  ReflectionState,
  ReflectionAction,
  EntryType,
} from '@/src/features/reflect/types';
import { MAX_TEXTURES } from '@/src/features/reflect/texture-sets';
import { joinDictation } from '@/src/features/reflect/hooks/dictation-transcript';

export const MAX_TURNS = 2;

export const initialState: ReflectionState = {
  screen: 'idle',
  entryText: '',
  clarifyText: '',
  errorMessage: '',
  lastFeedbackType: null,
  userVariant: { kind: 'first-time' },
  quietReturn: null,
  selectedTextures: [],
  entryType: 'typed',
};

/**
 * Produces the next reflection UI state given the current state and an action.
 *
 * @param state - Current reflection state
 * @param action - Action describing the update to apply
 * @returns The next ReflectionState after applying the provided action
 */
export function reducer(
  state: ReflectionState,
  action: ReflectionAction,
): ReflectionState {
  switch (action.type) {
    case 'TAP_INPUT':
      return {
        ...state,
        screen: 'typing',
        entryType: state.selectedTextures.length > 0 ? 'hybrid' : 'typed',
      };

    // Closing the composer is not a decision to throw the writing away — the
    // draft survives on the resting card and is discarded explicitly (#258).
    case 'DISMISS_TYPING':
      return { ...state, screen: 'idle' };

    case 'DISCARD_DRAFT':
      return { ...state, entryText: '' };

    case 'TEXT_CHANGE': {
      const entryType: EntryType =
        state.selectedTextures.length > 0 ? 'hybrid' : 'typed';
      return { ...state, entryText: action.text, screen: 'typing', entryType };
    }

    case 'TOGGLE_TEXTURE': {
      if (state.selectedTextures.includes(action.word)) {
        return {
          ...state,
          selectedTextures: state.selectedTextures.filter(
            (w) => w !== action.word,
          ),
        };
      }
      if (state.selectedTextures.length >= MAX_TEXTURES) return state;
      return {
        ...state,
        selectedTextures: [...state.selectedTextures, action.word],
      };
    }

    case 'SCAFFOLD_SUBMIT':
      return { ...state, screen: 'processing', entryType: 'scaffold' };

    case 'PAUSE_TIMEOUT':
      if (state.screen !== 'typing') return state;
      return { ...state, screen: 'typing-nudge' };

    case 'RESUME_TYPING':
      return { ...state, screen: 'typing' };

    case 'SUBMIT':
      return { ...state, screen: 'processing', clarifyText: '' };

    case 'THATS_IT':
      return { ...state, screen: 'path-selection' };

    case 'NOT_QUITE':
      return { ...state, screen: 'clarify', lastFeedbackType: 'not_quite' };

    case 'SAY_MORE':
      return { ...state, screen: 'clarify', lastFeedbackType: 'say_more' };

    case 'BACK_TO_MIRROR':
      return { ...state, screen: 'mirror', clarifyText: '' };

    case 'CLARIFY_TEXT_CHANGE':
      return { ...state, clarifyText: action.text };

    case 'SET_USER_VARIANT':
      return { ...state, userVariant: action.variant };

    case 'SET_QUIET_RETURN':
      return { ...state, quietReturn: action.tier };

    case 'SESSION_ERROR':
      return { ...state, screen: 'error', errorMessage: action.message };

    case 'SESSION_RESUMED':
      return { ...state, screen: action.screen };

    case 'VOICE_START':
      return { ...state, screen: 'typing', entryType: 'voice' };

    case 'VOICE_TRANSCRIPT':
      return { ...state, screen: 'typing', entryText: action.text, entryType: 'voice' };

    case 'VOICE_APPEND':
      return {
        ...state,
        screen: 'typing',
        entryText: joinDictation(state.entryText, action.text),
        entryType: 'voice',
      };

    case 'CLEAR_TEXTURES':
      return { ...state, selectedTextures: [] };

    case 'RESET':
      return { ...initialState, userVariant: state.userVariant };

    default:
      return state;
  }
}
