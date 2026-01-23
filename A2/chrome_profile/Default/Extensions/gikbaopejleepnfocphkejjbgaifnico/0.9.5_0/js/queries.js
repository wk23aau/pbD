const ripple_analytics = await import(chrome.runtime.getURL("js/ripple_analytics.js"));

const SEARCH_PARAM_OVERRIDES = {
  yahoo: "p",
  youtube: "search_query"
};

const DID_YOU_MEAN_LINK_TARGETS = {
  google: "omnient-visibility-control p a",
  yahoo: "a.fc-denim",
  ask: ".spell-check-result-link[data-testid='link-button']",
  bing: "#sp_requery a",
  duckduckgo: "[data-testid='spelling-message'] a",
  ecosia: ".query-correction__corrected a",
  youtube: "a.yt-search-query-correction"
}

/**
 * Retrieves the search term from the URL params,
 * and cleans it for internal usage
 **/
export const getSearchTerm = (urlString = window.location.href) => {
  const searchParam = SEARCH_PARAM_OVERRIDES[searchEngine()] || "q";
  const url = new URL(urlString, window.location.origin);
  const searchTerm = url.searchParams.get(searchParam) || "";

  return searchTerm
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[?#-.()<>+=/_* %$@!/\’"]/g, "")
    .split(" ")
    .filter(Boolean);
}

export const Category = {
  SUICIDE: 1
}

const DEFAULT_SEVERITY = 0;

export const matchingTrigger = async (searchTerm, triggers) => {
  const searchTermString = searchTerm.join(" ").toLowerCase();
  const searchTermDigest = await digestMessage(searchTermString);
  let matchedObject = triggers[searchTermDigest];

  if (matchedObject) {
    return {
      match: true,
      locale: matchedObject?.locale,
      //added a check for backward compatibility, will remove in the next release.
      category_id: matchedObject?.category_id || Category.SUICIDE,
      severity: matchedObject?.severity || DEFAULT_SEVERITY,
      trigger_id: matchedObject?.trigger_id || null,
      searchTermDigest,
      searchTermString,
      fromUrl: true
    };
  }

  // The search term itself didn't match, so we'll check if there
  // is a link to show other results
  const didYouMeanLink = document.querySelector(DID_YOU_MEAN_LINK_TARGETS[searchEngine()]);
  if (didYouMeanLink) {
    const href = didYouMeanLink.getAttribute("href");
    const correctedSearchTerm = getSearchTerm(href);
    const correctedSearchTermDigest = await digestMessage(correctedSearchTerm.join(" ").toLowerCase());
    matchedObject = triggers[correctedSearchTermDigest];
    if (!!matchedObject?.locale){

      return {
        match: !!matchedObject?.locale,
        locale: matchedObject?.locale,
        category_id: matchedObject?.category_id || null,
        severity: matchedObject?.severity,
        trigger_id: matchedObject?.trigger_id || null,
        searchTermDigest: correctedSearchTermDigest,
        searchTermString: correctedSearchTerm,
        fromUrl: false
      };
    }
  }

  return { match: false };
}

const searchEngine = () => {
  const domain = window.location.hostname;
  const domainParts = domain.split(".");

  if (domainParts.includes("google")) return "google";
  if (domainParts.includes("yahoo")) return "yahoo";
  if (domainParts.includes("duckduckgo")) return "duckduckgo";
  if (domainParts.includes("bing")) return "bing";
  if (domainParts.includes("ask")) return "ask";
  if (domainParts.includes("ecosia")) return "ecosia";
  if (domainParts.includes("youtube")) return "youtube";
}

const digestMessage = async message => {
  const encoder = new TextEncoder();
  const data = encoder.encode(message.toLowerCase());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

  return hex;
}
