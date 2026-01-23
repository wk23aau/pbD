const SLEEP_COMMAND = "zzzripple";

// Domain to CSS file mapping
const DOMAIN_CSS_MAP = {
  'google': 'css/style.css',
  'bing': 'css/style.css',
  'yahoo': 'css/style_yahoo.css',
  'duckduckgo': 'css/style_ddg.css',
  'youtube': 'css/style_youtube.css',
  'ecosia': 'css/style_ecosia.css',
  'ask': 'css/style_ask.css'
};

// Helper function to get the appropriate CSS file for the current domain
const getDomainCssFile = () => {
  const domain = window.location.hostname.split(".").find(part => DOMAIN_CSS_MAP[part]);
  return domain ? DOMAIN_CSS_MAP[domain] : 'css/style.css';
};

export const getRippleContainer = async () => {
  const mainDocument = window.top?.document; // Get the top-level window's document

  if (!mainDocument) {
    console.error('Unable to access the top-level document.');
    return null;
  }

  let container = mainDocument.getElementById('ripple-shadow-container');
  if (!container) {
    container = mainDocument.createElement('div');
    container.id = 'ripple-shadow-container';

    // Append to the main document body, not frame
    mainDocument.body.appendChild(container);

    // Initialize shadow DOM
    const shadowRoot = container.attachShadow({ mode: 'open' });
    const style = mainDocument.createElement('style');
    try {
      const cssFile = getDomainCssFile();
      style.textContent = await fetch(chrome.runtime.getURL(cssFile)).then(res => res.text());
      shadowRoot.appendChild(style);
    } catch (error) {
      console.error('Failed to load styles:', error);
      // Fallback to empty shadow root but don't fail completely
    }
  }
  return container;
};

export const removeRippleContainer = () => {
  const mainDocument = window.top?.document || document;
  const container = mainDocument.getElementById('ripple-shadow-container');
  if (container) {
    container.remove();
  }
}

/**
 * Appends the given HTML string to the end
 * of the body tag
 **/
export const appendHtml = async (htmlString) => {
  try {
    const container = await getRippleContainer();
    const shadowRoot = container.shadowRoot;

    if (!shadowRoot) {
      console.error('Shadow root not initialized');
      return;
    }

    const contentEl = document.createElement('div');
    contentEl.innerHTML = htmlString;

    if (!htmlString.includes('ripple_nudge_container')) {
      // Store existing style element
      const existingStyle = shadowRoot.querySelector('style');
      
      // Clear shadow root content
      shadowRoot.innerHTML = '';
      
      if (existingStyle) {
        shadowRoot.appendChild(existingStyle);
      } else {
        const style = document.createElement('style');
        try {
          // Load domain-specific CSS file
          const cssFile = getDomainCssFile();
          style.textContent = await fetch(chrome.runtime.getURL(cssFile)).then(res => res.text());
          shadowRoot.appendChild(style);
        } catch (error) {
          console.error('Failed to load styles:', error);
        }
      }
      
      // Add new content
      shadowRoot.appendChild(contentEl);

      // If this is a sleep modal, set up its events
      if (htmlString.includes('rippleSleepModal')) {
        await sleepModalEvents();
      }
    } else {
      shadowRoot.appendChild(contentEl);
    }

    disableBackgroundScrolling();
  } catch (error) {
    console.error('Error in appendHtml:', error);
  }
}

/**
 * Injects a script tag into the main page DOM to
 * load the given source file
 **/
export const injectCode = (src) => {
  const script = document.createElement('script');

  script.src = src;
    script.onload = function() {
    this.remove();
  };

  nullthrows(document.head || document.documentElement).appendChild(script);
}

/**
 * Returns whether or not the search term provided
 * is requesting the ripple extension be put into
 * sleep mode
 **/
export const isSleepCommand = (searchTerms) => SLEEP_COMMAND === searchTerms[0];

const nullthrows = (v) => {
  if (v == null) throw new Error("it's a null");
  return v;
}

export const setBreathingCounter = async count => {
  try {
    const container = await getRippleContainer();
    if (!container || !container.shadowRoot) {
      console.error('Shadow root not initialized for breathing counter');
      return;
    }
    const counterEl = container.shadowRoot.querySelector("span.breath_count");
    if (counterEl) {
      counterEl.innerHTML = count;
    }
  } catch (error) {
    console.error('Error setting breathing counter:', error);
  }
};

export const setBreathingText = async text => {
  try {
    const container = await getRippleContainer();
    if (!container || !container.shadowRoot) {
      console.error('Shadow root not initialized for breathing text');
      return;
    }
    const textEl = container.shadowRoot.querySelector("h4.breath_text");
    if (textEl) {
      textEl.innerHTML = text;
    }
  } catch (error) {
    console.error('Error setting breathing text:', error);
  }
};

export const appendNudgeHtml = async (htmlString) => {
  const domainSelectorsMap = {
    google: ["#taw", "#center_col"],
    bing: ["#b_results"],
    yahoo: ["#main"],
    duckduckgo: [".react-results--main"],
    youtube: ["#contents"],
    ecosia: [".meta-results"],
    ask: [".search-results.show-border"]
  };

  const domain = window.location.hostname.split(".").find(part => domainSelectorsMap[part]);

  if (!domain) return;

  const element = domainSelectorsMap[domain].reduce((foundElement, selector) => {
    return foundElement || document.querySelector(selector);
  }, null);

  if (!element) return;

  const nudgeId = "ripple_nudge_container";
  if (element.querySelector(`#${nudgeId}`)) return;

  const newDiv = document.createElement("div");
  newDiv.id = nudgeId;
  element.prepend(newDiv);

  const shadowRoot = newDiv.attachShadow({ mode: "open" });
  
  // Load domain-specific CSS into the shadow DOM
  const style = document.createElement('style');
  try {
    const cssFile = getDomainCssFile();
    style.textContent = await fetch(chrome.runtime.getURL(cssFile)).then(res => res.text());
    shadowRoot.appendChild(style);
  } catch (error) {
    console.error('Failed to load styles for nudge:', error);
  }
  
  // Add the HTML content
  const contentEl = document.createElement('div');
  contentEl.innerHTML = htmlString;
  shadowRoot.appendChild(contentEl);
};


export const disableBackgroundScrolling = () =>{
  var domain = window.location.hostname;
  var domain_elements = domain.split(".");
  if (domain_elements.includes("bing") || domain_elements.includes("duckduckgo")){
    document.querySelector("html").style.overflow = "hidden";
  } else {
    document.querySelector("body").style.overflow = "hidden";
  }
}

export const enableBackgroundScrolling = () => {
  const domain = window.location.hostname;
  const domain_elements = domain.split(".");
  if (domain_elements.includes("bing") || domain_elements.includes("duckduckgo")){
    document.querySelector("html").style.overflow = "auto";
  } else {
    document.querySelector("body").style.overflow = "auto";
  }
}

export const sleepModalEvents = async () => {
  disableBackgroundScrolling();

  const container = await getRippleContainer();
  if (!container || !container.shadowRoot) {
    console.error('Shadow container not found');
    return;
  }

  const shadowRoot = container.shadowRoot;
  const sleepModal = shadowRoot.getElementById("rippleSleepModal");
  if (!sleepModal) {
    console.error('Sleep modal not found in shadow DOM');
    return;
  }

  // Set sleepTimer and close modal
  const confirmSleepModal = shadowRoot.getElementById("confirmSleep");
  if (confirmSleepModal) {
    confirmSleepModal.addEventListener("click", async () => {
      const option = shadowRoot.getElementById("rippleSleepTimer")?.value;
      if (!option) {
        alert("Please select an option and then confirm.");
        return;
      }

      let result = new Date();
      switch (option) {
        case "1 day":
          result.setHours(result.getHours() + 24);
          break;
        case "1 week":
          result.setHours(result.getHours() + (24 * 7));
          break;
        case "1 month":
          result.setMonth(result.getMonth() + 1);
          break;
        default:
          alert("Invalid option selected");
          return;
      }

      await chrome.storage.local.set({ RippleSleep: result.toString() });

      // Remove the modal
      if (container) {
        document.body.removeChild(container);
      }
      enableBackgroundScrolling();
    });
  }

  // Clear sleeptimer and close modal
  const cancelSleepTimer = shadowRoot.getElementById("cancelSleep");
  if (cancelSleepTimer) {
    cancelSleepTimer.addEventListener("click", async () => {
      if (container) {
        document.body.removeChild(container);
      }
      await chrome.storage.local.remove("RippleSleep");
      enableBackgroundScrolling();
    });
  }
};

export const updateBreathing = async (trigger, breathingCount) => {
  try {
    switch (breathingCount) {
      case 2:
        await setBreathingCounter("2");
        break;
      case 3:
        await setBreathingCounter("1");
        break;
      case 4:
        await setBreathingCounter("3");
        await setBreathingText("Hold");
        break;
      case 5:
        await setBreathingCounter("2");
        break;
      case 6:
        await setBreathingCounter("1");
        break;
      case 7:
        await setBreathingCounter("3");
        await setBreathingText("And breathe out through your mouth");
        break;
      case 8:
        await setBreathingCounter("2");
        break;
      case 9:
        await setBreathingCounter("1");
        break;
    }
  } catch (error) {
    console.error('Error updating breathing:', error);
  }
};

export const loadCmsHtml = async (trigger, cmsHTML) => {
  try {
    const container = await getRippleContainer();
    if (!container || !container.shadowRoot) {
      console.error('Shadow root not initialized for loading CMS HTML');
      return;
    }

    if(!container.shadowRoot.querySelector('style')) {
      const style = document.createElement('style');
      try {
        const cssFile = getDomainCssFile();
        style.textContent = await fetch(chrome.runtime.getURL(cssFile)).then(res => res.text());
        container.shadowRoot.appendChild(style);
      } catch (error) {
        console.error('Failed to load styles:', error);
      }
    }

    const shadowRoot = container.shadowRoot;
    const modalContent = shadowRoot.querySelector('.ripple-modal-content-first');
    if (modalContent) {
      modalContent.innerHTML = cmsHTML;
    }

  } catch (error) {
    console.error('Error loading CMS HTML:', error);
  }
};
