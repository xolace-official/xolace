const HOME = "/today";

type Navigator = {
	canGoBack: () => boolean;
	back: () => void;
	dismissTo: (href: typeof HOME) => void;
};

export function exitVent(router: Navigator): void {
	if (router.canGoBack()) {
		router.back();
		return;
	}
	router.dismissTo(HOME);
}
