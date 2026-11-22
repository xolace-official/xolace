export type IntakeRoute = "flux" | "letter";

export const consumesBack = (route: IntakeRoute): boolean => route === "flux";
