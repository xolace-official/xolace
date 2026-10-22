export const BIO_MAX_LENGTH = 160;
export const NAME_MAX_LENGTH = 40;

export type SetupDraft = {
  photoUrl?: string;
  displayName: string;
  bio: string;
  specialties: string[];
};

export type SetupStep = {
  id: 'photo' | 'name' | 'bio' | 'specialties' | 'review';
  title: string;
  description: string;
  missingLabel: string;
  isComplete: (draft: SetupDraft) => boolean;
};

/**
 * Config-driven steps: the container renders whichever body matches `id`, and
 * the progress meter + Publish button both read `isComplete` rather than
 * carrying their own copy of the rule. The gate mirrors the server's
 * `publishProfile` check exactly — displayName + bio + photoUrl + at least
 * one specialty.
 */
export const SETUP_STEPS: SetupStep[] = [
  {
    id: 'photo',
    title: 'Add a photo',
    description: 'A face makes it easier for someone to reach out.',
    missingLabel: 'add a photo',
    isComplete: (draft) => Boolean(draft.photoUrl),
  },
  {
    id: 'name',
    title: "What should people call you?",
    description: 'First name or a nickname — whatever you answer to.',
    missingLabel: 'add a name',
    isComplete: (draft) => draft.displayName.trim().length > 0,
  },
  {
    id: 'bio',
    title: 'Say a little about you',
    description: "A line or two. What you're here for, not a résumé.",
    missingLabel: 'write a short bio',
    isComplete: (draft) =>
      draft.bio.trim().length > 0 && draft.bio.length <= BIO_MAX_LENGTH,
  },
  {
    id: 'specialties',
    title: "What you're here for",
    description: 'Pick up to four. People can filter the roster by these.',
    missingLabel: 'pick what you’re here for',
    isComplete: (draft) => draft.specialties.length > 0,
  },
  {
    id: 'review',
    title: 'This is what people see',
    description: 'Your real name and contact details are never shown.',
    missingLabel: 'finish the steps above',
    isComplete: () => true,
  },
];

/** The first unfinished step, or null once the profile can be published. */
export function firstIncompleteStep(draft: SetupDraft): SetupStep | null {
  return SETUP_STEPS.find((step) => !step.isComplete(draft)) ?? null;
}

export function completedCount(draft: SetupDraft): number {
  return SETUP_STEPS.filter((step) => step.isComplete(draft)).length;
}
