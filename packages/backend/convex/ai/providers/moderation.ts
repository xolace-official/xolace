// --- Types ---

export interface ModerationCategories {
  sexual: boolean;
  "sexual/minors": boolean;
  harassment: boolean;
  "harassment/threatening": boolean;
  hate: boolean;
  "hate/threatening": boolean;
  "self-harm": boolean;
  "self-harm/intent": boolean;
  "self-harm/instructions": boolean;
  violence: boolean;
  "violence/graphic": boolean;
  illicit: boolean;
  "illicit/violent": boolean;
}

export interface ModerationResult {
  flagged: boolean;
  categories: ModerationCategories;
  categoryScores: Record<string, number>;
}

export const EMPTY_CATEGORIES: ModerationCategories = {
  sexual: false,
  "sexual/minors": false,
  harassment: false,
  "harassment/threatening": false,
  hate: false,
  "hate/threatening": false,
  "self-harm": false,
  "self-harm/intent": false,
  "self-harm/instructions": false,
  violence: false,
  "violence/graphic": false,
  illicit: false,
  "illicit/violent": false,
};

/**
 * Safe default when moderation API is unavailable.
 * Unflagged — we don't block the pipeline if moderation is down.
 */
export const MODERATION_UNAVAILABLE: ModerationResult = {
  flagged: false,
  categories: { ...EMPTY_CATEGORIES },
  categoryScores: {},
};

// --- API Call ---

/**
 * Obtains a moderation assessment for the provided text using OpenAI's moderation API.
 *
 * On error or when the API key is not set, returns `MODERATION_UNAVAILABLE` (which has `flagged: false`, all category flags set to `false`, and an empty `categoryScores`).
 *
 * @returns A `ModerationResult` with `flagged` indicating whether the text was flagged, `categories` containing all moderation category flags (any missing keys are set to `false`), and `categoryScores` mapping category names to numeric scores.
 */
export async function moderateInput(text: string): Promise<ModerationResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("OPENAI_API_KEY not set, skipping moderation");
    return MODERATION_UNAVAILABLE;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "omni-moderation-latest",
        input: text,
      }),
    });

    if (!response.ok) {
      console.error(
        `Moderation API returned ${response.status}: ${response.statusText}`
      );
      return MODERATION_UNAVAILABLE;
    }

    const data = await response.json();
    const result = data.results?.[0];

    if (!result) {
      console.error("Moderation API returned no results");
      return MODERATION_UNAVAILABLE;
    }

    return {
      flagged: result.flagged ?? false,
      categories: { ...EMPTY_CATEGORIES, ...result.categories },
      categoryScores: result.category_scores ?? {},
    };
  } catch (error) {
    console.error("Moderation API error:", error);
    return MODERATION_UNAVAILABLE;
  }
}
