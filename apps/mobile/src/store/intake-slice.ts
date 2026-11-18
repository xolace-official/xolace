/** The intake answers' shape. The in-flight draft that lived here went with the first intake
 * (S18); the type stays for the finding-us card and the person properties. */

import type { api } from "@xolace/backend/convex/_generated/api";
import type { FunctionArgs } from "convex/server";

/** Keyed exactly like `intake.complete`'s args, so the two can't drift. */
export type IntakeAnswers = Partial<FunctionArgs<typeof api.intake.complete>>;
