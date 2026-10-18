export function removeEmDash(text: string): string {
  return text.replace(/\s*—\s*/g, ", ").replace(/ {2}/g, " ").trim();
}

export function removeEmDashWithSpaces(text: string): string {
  return text.replace(/—/g, " ").replace(/\s{2,}/g, " ").trim();
}
