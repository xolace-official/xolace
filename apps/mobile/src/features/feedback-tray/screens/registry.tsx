import { TrayMenu } from "./tray-menu";
import { ReportForm, type ReportSubject } from "./report-form";
import { WhatsNew } from "./whats-new";

/**
 * Typed registry of tray screens. Keys are screen names passed to `show()`.
 */
export const trays = {
  menu: () => <TrayMenu />,
  report: (props?: {
    kind: "bug" | "idea" | "concern";
    subject?: ReportSubject;
  }) => <ReportForm kind={props?.kind ?? "bug"} subject={props?.subject} />,
  whatsNew: () => <WhatsNew />,
} as const;

export type Trays = typeof trays;
