/** The links Stream makes tappable in a post's plain words, so VoiceOver has an action for each:
 * a web address with or without its scheme (`xolace.app/lantern` opens as `http://…`) and an
 * email address (`mailto:`). Found as Stream finds them (`parseLinksFromText`, which isn't
 * exported): linkifyjs, after leaving out a name like `@sam.k@x.co`. Pure. */
import { find } from "linkifyjs";

/** A link in a post: where it goes, and the words it shows (a markdown link's, or the address). */
export type FoundLink = { url: string; words: string };

/** Stream's: `@name` followed by an email isn't a link. */
const NAME_WITH_EMAIL = /@(\w+(\.\w+)?)(@\w+\.\w+)/g;
/** Stream's: an address with a scheme already opens as written; anything else gets `http://`. */
const HAS_SCHEME = /^(mailto:|tel:|sms:|\S+:\/\/)/;

/** The links in plain words (markdown links already blanked out), in the order written. */
export function bareLinks(text: string): FoundLink[] {
	const words = text.replace(NAME_WITH_EMAIL, (m) => " ".repeat(m.length));
	return find(words)
		.filter((link) => link.type === "url" || link.type === "email")
		.map(({ href, value }) => ({
			url: HAS_SCHEME.test(href) ? href : `http://${href}`,
			words: value,
		}));
}
