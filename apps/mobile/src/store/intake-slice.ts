import type { api } from "@xolace/backend/convex/_generated/api";
import type { FunctionArgs } from "convex/server";

export type IntakeAnswers = Partial<FunctionArgs<typeof api.intake.complete>>;
