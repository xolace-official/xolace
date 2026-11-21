/** The links Stream makes tappable in a post's plain words, so VoiceOver has an action for each:
 * a web address with or without its scheme (`xolace.app/lantern` opens as `http://…`) and an
 * email address (`mailto:`). Found as Stream finds them (`parseLinksFromText`, which isn't
 * exported): linkifyjs, after leaving out a name like `@sam.k@x.co`. Pure. */
import { find } from "linkifyjs";

export type FoundLink = { url: string; words: string };

const NAME_WITH_EMAIL = /@(\w+(\.\w+)?)(@\w+\.\w+)/g;
const HAS_SCHEME = /^(mailto:|tel:|sms:|\S+:\/\/)/;

export function bareLinks(text: string): FoundLink[] {
	const words = text.replace(NAME_WITH_EMAIL, (m) => " ".repeat(m.length));
	return find(words)
		.filter((link) => link.type === "url" || link.type === "email")
		.map(({ href, value }) => ({
			url: HAS_SCHEME.test(href) ? href : `http://${href}`,
			words: value,
		}));
}
