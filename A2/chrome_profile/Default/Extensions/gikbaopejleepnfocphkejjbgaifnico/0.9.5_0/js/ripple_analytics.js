let mixpanelToken;

(async () => {
  const config = await import(chrome.runtime.getURL("js/config.js"));
  mixpanelToken = config.default.mixpanelToken;
  mixpanel.init(mixpanelToken);
})();

// document.addEventListener("DOMContentLoaded", function() {
//     var fetch_body_object = document.body;
//     if (fetch_body_object) {
//         var user_id = fetch_body_object.getAttribute("data-user-id");
//         mixpanel.identify(user_id);
//         mixpanel.people.set_once('Extension installation date', new Date());

//         // When the tool is activated
//         mixpanel.track(
//             "Extension Activated"
//         );
//     }
// });

// When the query is matched with keyword
export const trackKeyword = async (trigger, shadowRoot = null) => {
  let rippleMainContainer = shadowRoot
    ? shadowRoot.querySelector("#ripple-main-container")
    : document.getElementById("ripple-main-container");
  const messageOfHopeId =
    rippleMainContainer?.dataset.mixpanelMessageOfHopeId || null;
  const imageId =
    rippleMainContainer?.dataset.mixpanelImageId || null;
  const extensionVersion = chrome.runtime.getManifest().version;
  const sessionId = localStorage.getItem("ripple_session_id")

  mixpanel.track("Keyword Matched", {
    searchTermString: trigger.searchTermString,
    searchTermDigest: trigger.searchTermDigest,
    triggerId: trigger.trigger_id,
    categoryId: trigger.category_id,
    fromURL: trigger.fromUrl,
    messageOfHopeId,
    imageId,
    sessionId,
    extensionVersion
  });
};

function mixpanelData(element) {
  const dataNames = Object.keys(element.dataset);
  return dataNames.reduce((out, name) => {
    const match = name.match(/mixpanel(.*)/);
    if (!match) return out;

    out[match[1]] = element.dataset[name];
    return out;
  }, {});
}

// When any link will clicked
export function trackLink(element, triggerId, categoryId, shadowRoot = null) {
  const extensionVersion = chrome.runtime.getManifest().version;
  let rippleMainContainer = shadowRoot
    ? shadowRoot.querySelector("#ripple-main-container")
    : document.getElementById("ripple-main-container");
  const messageOfHopeId =
    rippleMainContainer?.dataset.mixpanelMessageOfHopeId || null;
  const imageId =
    rippleMainContainer?.dataset.mixpanelImageId || null;
  const sessionId = localStorage.getItem("ripple_session_id")


  const evtName = element.attributes["data-mixpanel-name"].value + " clicked";
  mixpanel.track(evtName, {
    referrer: document.referrer,
    triggerId,
    categoryId,
    messageOfHopeId,
    imageId,
    extensionVersion,
    sessionId,
    ...mixpanelData(element)
  });
}

// To track the scroll movement
var isScrolling;
export function trackScroll(element, triggerId, categoryId, shadowRoot = null) {
  const extensionVersion = chrome.runtime.getManifest().version;
  const rippleMainContainer = shadowRoot
    ? shadowRoot.querySelector("#ripple-main-container")
    : document.getElementById("ripple-main-container");
  const messageOfHopeId =
    rippleMainContainer?.dataset.mixpanelMessageOfHopeId || null;
  const imageId =
    rippleMainContainer?.dataset.mixpanelImageId || null;
  const sessionId = localStorage.getItem("ripple_session_id")


  const evtName = element.attributes["data-mixpanel-name"].value + " scrolled";
  window.clearTimeout(isScrolling);
  isScrolling = setTimeout(function () {
    mixpanel.track(evtName, {
      triggerId,
      categoryId,
      extensionVersion,
      messageOfHopeId,
      imageId,
      sessionId,
      ...mixpanelData(element)
    });
  }, 100);
}

// When no help items are available for the trigger
export const trackNoHelpItems = async (trigger, rulesetId) => {
  const extensionVersion = chrome.runtime.getManifest().version;
  const sessionId = localStorage.getItem("ripple_session_id");

  mixpanel.track("no_help_items_listed", {
    category_id: trigger.category_id,
    ruleset_id: rulesetId,
    severity: trigger.severity,
    trigger_id: trigger.trigger_id,
    search_term: trigger.searchTermString,
    reason: 'no_help_items_listed',
    sessionId,
    extensionVersion,
    timestamp: new Date().toISOString()
  });
};
