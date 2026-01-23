(async() => {
  await import(chrome.runtime.getURL("js/mixpanel.js"));
  const ripple_analytics = await import(chrome.runtime.getURL("js/ripple_analytics.js"));
  // Some initial configuration
  const config = await import(chrome.runtime.getURL("js/config.js"));
  window._RIPPLE_CMS_URL = config.default.apiUrl;

  const manifest = chrome.runtime.getManifest();
  window._RIPPLE_VERSION = manifest.version;

  // Import our other scripts
  const queries = await import(chrome.runtime.getURL("js/queries.js"));
  const rippleStorage = await import(chrome.runtime.getURL("js/storage.js"));
  const utils = await import(chrome.runtime.getURL("js/utils.js"));
  const { SPAHandler, isDomainSupported } = await import(chrome.runtime.getURL("js/spa-handler.js"));

  let userId;
  let cmsHTML;
  let breathingInterval;
  let breathingCount = 1;

  let videosBlocked = false;
  let alreadyLoadedData;

  const Severity = {
    HIGH: 0,
    MEDIUM: 1,
    LOW: 2
  };
  /**
   * Listen for events where the CSP is violated. We may need
   * to adjust the extension logic in some instances if things
   * are blocked
   **/
  document.addEventListener("securitypolicyviolation", (e) => {
    if (e.violatedDirective === "media-src") {
      videosBlocked = true;
    }
  });

  // Make sure we've got a "user id" setup
  rippleStorage.loadUserId(id => userId = id);

  // const categoryEnabled = async (category_id) => {
  //   if (!category_id) return false;

  //   const { enabledCategories = [] } = await chrome.storage.local.get("enabledCategories");

  //   return enabledCategories.length && enabledCategories.includes(category_id);
  // };


  const executeExtension = async (trigger = {locale: 'en'}) => {
    // Clean up any existing containers first
    await utils.removeRippleContainer();
    
    // Check if we're already processing this trigger to prevent duplicates
    const currentSearchTerm = queries.getSearchTerm().join(' ');
    const triggerKey = `${currentSearchTerm}_${trigger.searchTermDigest}`;
    if (window._RIPPLE_CURRENT_TRIGGER === triggerKey) {
      return;
    }
    window._RIPPLE_CURRENT_TRIGGER = triggerKey;

    const locales = trigger.locale;

    const requestParams = { manifest: 3 };

    if (trigger.severity !== undefined) {
      requestParams.severity = trigger.severity;
    }

    if (trigger.category_id !== undefined) {
      requestParams.category_id = trigger.category_id;
    }

    // If we only have a single matching locale, then we'll
    // use that as the trigger language. If however we've
    // matched mulitple, then we won't send a locale in the
    // request, and instead allow the server to determine this
    // automatically based on the browsers Accepted-Language
    // header.
    if (Array.isArray(locales) && locales.length === 1) {
      requestParams.locale = locales[0];
    }


    const urlParamString = new URLSearchParams(requestParams).toString();
    const res = await fetch(`${window._RIPPLE_CMS_URL}/extension?${urlParamString}`)
    const resJson = await res.json();

    // Check if popup should be shown based on server response
    if (resJson.show_content === false) {
      // Track event in Mixpanel when no popup is shown (no help items)
      await ripple_analytics.trackNoHelpItems(trigger, resJson.ruleset_id);
      
      return; // Exit early if no popup should be shown
    }

    cmsHTML = resJson.html;

    // if (
    //   trigger.category_id !== queries.Category.SUICIDE ||
    //   trigger.category_id !== resJson.suicide_category_id
    // ) {
    //   const observer = new MutationObserver(async () => {
    //     //get the ripple-modal-content-first from the shadowRoot
    //     const rippleContainer = await utils.getRippleContainer();
    //     const shadowRoot = rippleContainer.shadowRoot;
    //     const modalContent = shadowRoot.querySelector(".ripple-modal-content-first");
    //     if (modalContent) {
    //       modalContent.style.height = "589px";
    //       modalContent.style.width = "945px";
    //       observer.disconnect();
    //     }
    //   });

    //   observer.observe(document.body, { childList: true, subtree: true });
    // }

    if(trigger.severity === Severity.LOW || trigger.severity === Severity.MEDIUM){
      await utils.appendNudgeHtml(cmsHTML);
      window._RIPPLE_TRIGGERED = false;
      registerNudgeEvents(trigger);
    } else {
      const emergencyServices = resJson.emergency_services;

      //Added a check for backward compatibility: consider 1 as the suicidal category.
      const defaultSuicideCategory = resJson.suicide_category_id || queries.Category.SUICIDE;
      if(trigger.category_id === defaultSuicideCategory){
        const breatheResponse = await fetch(chrome.runtime.getURL("html/breathe.html"));
        let breatheHtml = await breatheResponse.text();
        breatheHtml = breatheHtml.replace(/{{EMERGENCY_TEXT}}/, emergencyServices);

        utils.appendHtml(breatheHtml);

        let breathingCount = 1;
        const updateBreathingExercise = async () => {
          breathingCount++;
          await utils.updateBreathing(trigger, breathingCount);
          
          if (breathingCount === 10) {
            clearInterval(breathingInterval);
            await utils.loadCmsHtml(trigger, cmsHTML);
            registerModalEvents(trigger);
            const container = document.getElementById('ripple-shadow-container');
            const shadowRoot = container?.shadowRoot;
            await ripple_analytics.trackKeyword(trigger, shadowRoot);
          }
        };

        // Start updating the breathing exercise every 1.5 seconds
        breathingInterval = setInterval(updateBreathingExercise, 1500);
      } else {
        const basic = await fetch(chrome.runtime.getURL("html/basic.html"));
        let basicHtml = await basic.text();
        await utils.appendHtml(basicHtml);
        await utils.loadCmsHtml(trigger, cmsHTML);
        registerModalEvents(trigger);
        const container = document.getElementById('ripple-shadow-container');
        const shadowRoot = container?.shadowRoot;
        await ripple_analytics.trackKeyword(trigger, shadowRoot);
      }
    }

    document.body.setAttribute("data-user-id", userId);

    if (!alreadyLoadedData){
      utils.injectCode(chrome.runtime.getURL("js/mixpanel.js"));
      utils.injectCode(chrome.runtime.getURL("js/ripple_analytics.js"));
    }
  };

  const registerNudgeEvents = async (trigger) => {
    const rippleNudge = document.getElementById("ripple_nudge_container");
    const shadowRoot = rippleNudge?.shadowRoot; // Access the shadow root

    if (shadowRoot) {
      const rippleMainContainer = shadowRoot.querySelector(
        "#ripple-main-container"
      );

      if (rippleMainContainer) {
      await ripple_analytics.trackKeyword(trigger, shadowRoot);
      } else {
        console.log("ripple-main-container not found inside shadow root.");
      }

      rippleNudge.addEventListener("click", (e) => {
        const target = e
          .composedPath()
          ?.find((el) => el.classList?.contains("mixpanel-click"));
        if (target) {
          ripple_analytics.trackLink(
            target,
            trigger.trigger_id,
            trigger.category_id,
            shadowRoot
          );
        }
      });
      rippleNudge.addEventListener("click", (e) => {
        const target = e
          .composedPath()
          ?.find((el) => el.classList?.contains("mixpanel-inner-link-click"));
        if (target) {
          ripple_analytics.trackLink(
            target,
            trigger.trigger_id,
            trigger.category_id,
            shadowRoot
          );
        }
      });
    }
  }

  const registerModalEvents = (trigger) => {
    const mainDocument = window.top?.document || document;
    const container = mainDocument.getElementById('ripple-shadow-container');
    const shadowRoot = container?.shadowRoot;
    if (!shadowRoot) return;

    shadowRoot.addEventListener("click", e => {
      const target = e.composedPath()?.find(el => el.classList?.contains("mixpanel-click"));
      if (target) {
        ripple_analytics.trackLink(target, trigger.trigger_id, trigger.category_id, shadowRoot);
      }
    });

    shadowRoot.addEventListener("click", e => {
      const target = e.composedPath()?.find(el => el.classList?.contains("mixpanel-inner-link-click"));
      if (target) {
        ripple_analytics.trackLink(target, trigger.trigger_id, trigger.category_id, shadowRoot);
      }
    });

    shadowRoot.addEventListener("scroll", e => {
      const target = e.composedPath()?.find(el => el.classList?.contains("mixpanel-scroll"));
      if (target) {
        ripple_analytics.trackScroll(target, trigger.trigger_id, trigger.category_id, shadowRoot);
      }
    }, true);

    shadowRoot.addEventListener("click", async (e) => {
      const clicked = e.target;
      const languagePicker = shadowRoot.querySelector(".languages");
      let target;

      if ((target = clicked.closest(".pre-defined-video"))) {
        if (!videosBlocked) {
          e.preventDefault();
          const modal = shadowRoot.getElementById(`${target.id}_modal`);
          if (modal) modal.style.display = "flex";
        }
      } else if ((target = clicked.closest(".modal-close"))) {
        e.preventDefault();
        const preview = target.getAttribute("data-preview");
        const modal = shadowRoot.getElementById(`${preview}_modal`);
        const video = shadowRoot.getElementById(`${preview}_video_player`);
        video?.pause();
        if (modal) modal.style.display = "none";
      } else if (languagePicker?.contains(e.target)) {
        e.preventDefault();

        target = clicked.closest("a");
        const anchor = target.closest("a");
        const languageParams = anchor.getAttribute("href");
        const res = await fetch(`${window._RIPPLE_CMS_URL}/extension${languageParams}`)
        const resJson = await res.json();

        cmsHTML = resJson.html;
        const modalContent = shadowRoot.querySelector(".ripple-modal-content-first");
        if (modalContent) {
          modalContent.innerHTML = cmsHTML;
        }
      }
    });

    shadowRoot.addEventListener("click", async (e) => {
      const target = e.target.closest("#close_icon");
      if (target) {
        ripple_analytics.trackLink(target, trigger.trigger_id, trigger.category_id, shadowRoot);
        localStorage.removeItem("ripple_session_id");
        localStorage.removeItem("ripple_last_processed_search");
        window._RIPPLE_TRIGGERED = false;
        window._RIPPLE_CURRENT_TRIGGER = null;
        const containerToRemove = mainDocument.getElementById('ripple-shadow-container');
        if (containerToRemove) {
          mainDocument.body.removeChild(containerToRemove);
        }
        utils.enableBackgroundScrolling();
      }
    });
  };


  const matchTiggers = async (searchTerm) => {
    const matchingTrigger = await queries.matchingTrigger(searchTerm, rippleStorage.getTriggers());
    if (matchingTrigger.match) {
      // Only create new session if we don't have one or it's a new search
      const currentSessionId = localStorage.getItem("ripple_session_id");
      const searchTermString = searchTerm.join(' ');
      const lastProcessedSearch = localStorage.getItem("ripple_last_processed_search");
      
      if (!currentSessionId || lastProcessedSearch !== searchTermString) {
        const sessionId = crypto.randomUUID();
        localStorage.setItem("ripple_session_id", sessionId);
        localStorage.setItem("ripple_last_processed_search", searchTermString);
        executeExtension(matchingTrigger);
      }
    }
  }

  const contentLoaded = async (alreadyLoaded = false) => {
    const domain = window.location.hostname.split(".").find(part => isDomainSupported(part));
    if (domain) {
      const currentUrl = window.location.href;
      const lastProcessedUrl = window._RIPPLE_LAST_PROCESSED_URL;
      
      if (lastProcessedUrl === currentUrl && window._RIPPLE_TRIGGERED) {
        return;
      }
      
      window._RIPPLE_LAST_PROCESSED_URL = currentUrl;
    }
    
    window._RIPPLE_TRIGGERED = true;
    // Make sure we've got refreshed trigger words
    alreadyLoadedData = alreadyLoaded;
    rippleStorage.refreshTriggers().then(async () => {
      const searchTerm = queries.getSearchTerm();
      /**
       * Retrieve the date that the sleep mode expires if
       * present
       **/
      const items = await new Promise((resolve) => {
          chrome.storage.local.get("RippleSleep", items => {
          resolve(items);
        });
        })
      const sleepExpiration = items.RippleSleep;
      if (utils.isSleepCommand(searchTerm)) {
        // Present a modal to "sleep" the ripple extension
        const response = await fetch(chrome.runtime.getURL("html/sleep.html"));
        const modalContent = await response.text();

        utils.appendHtml(modalContent);
      } else if (sleepExpiration === null || sleepExpiration === undefined || new Date(sleepExpiration) < new Date()) {
        // Clear the expiration from local storage
        if (sleepExpiration) rippleStorage.clearSleepExpiration();
        matchTiggers(searchTerm);
      }
    });
  }

  // Handle initial page load for all sites
  if (document.readyState !== "loading") {
    await contentLoaded();
  } else {
    document.addEventListener("DOMContentLoaded", contentLoaded);
  }

  const domain = window.location.hostname.split(".").find(part => isDomainSupported(part));
  if (domain) {
    new SPAHandler(domain, contentLoaded);
  }

})();
