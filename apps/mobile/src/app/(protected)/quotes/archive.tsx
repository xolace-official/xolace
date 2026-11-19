import { ReturnTo } from "@/lib/return-to";

/** The old archive: Words you kept is on the quote screen now. */
export default function QuotesArchiveRoute() {
	return <ReturnTo href="/quotes?view=kept" />;
}
