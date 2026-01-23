const BrowserName = Object.freeze({
    Safari:  "safari",
    Chrome:  "chrome",
    Firefox: "firefox",
    Edge:    "edge"
});

const BrowserInternalPage = Object.freeze({
    [BrowserName.Safari]:  "safari-web-extension:",
    [BrowserName.Firefox]: "moz-extension:",
    [BrowserName.Chrome]:  "chrome-extension:"
});

class BrowserResolver {

    #cache = {};

    get name() {
        if (this.isSafari) {
            return BrowserName.Safari;
        }
        if (this.isFirefox) {
            return BrowserName.Firefox;
        }
        // check for Edge should be evaluated before Chrome. "isChrome" check returns True for Edge
        if (this.isEdge) {
            return BrowserName.Edge;
        }
        if (this.isChrome) {
            return BrowserName.Chrome;
        }
        return "";
    }

    get isSafari() {
        const browserName = BrowserName.Safari;
        const internalPagePrefix = BrowserInternalPage[browserName];
        return this.#isBrowser(browserName, () => {
            return chrome.runtime.getURL('').startsWith(internalPagePrefix);
        });
    }

    get isFirefox() {
        const browserName = BrowserName.Firefox;
        const internalPagePrefix = BrowserInternalPage[browserName];
        return this.#isBrowser(browserName, () => {
            return chrome.runtime.getURL('').startsWith(internalPagePrefix);
        });
    }

    get isEdge() {
        return this.#isBrowser(BrowserName.Edge, () => {
            return navigator.userAgent.indexOf("Edg") > -1;
        });
    }

    get isChrome() {
        return this.#isBrowser(BrowserName.Chrome, () => {
            return navigator.userAgent.match(/chrome|chromium|crios/i) !== null;
        });
    }

    #isBrowser(browserName, conditionBlock) {
        if (browserName in this.#cache) {
            return this.#cache[browserName];
        }
        this.#cache[browserName] = conditionBlock();
        return this.#cache[browserName];
    }
}

const Browser = new BrowserResolver();
