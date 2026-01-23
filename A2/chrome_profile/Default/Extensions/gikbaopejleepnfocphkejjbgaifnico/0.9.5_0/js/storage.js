const USER_ID_KEY = "userid";
const SLEEP_EXPIRATION_KEY = "RippleSleep";
const TRIGGERS_KEY = "triggers";
const TRIGGERS_EXPIRATION_KEY = "triggersExpiration"

/**
 * Remove the sleep expiration from local storage
 **/
export const clearSleepExpiration = () => chrome.storage.local.remove(SLEEP_EXPIRATION_KEY);

/**
 * Generate a randomly generated token
 **/
const generateRandomToken = () => {
  let randomPool = new Uint8Array(32);
  let hex = '';

  crypto.getRandomValues(randomPool);

  for (let i = 0; i < randomPool.length; ++i) {
    hex += randomPool[i].toString(16);
  }

  return hex;
}

/**
 * Load the "user id" from local storage. If one cannot
 * be found, it will initialise a new one for future
 * usage
 **/
export const loadUserId = (cb) => {
  chrome.storage.sync.get(USER_ID_KEY, items => {
    if (items.userid) {
      cb(items.userid);
    } else {
      const newUserId = generateRandomToken();
      chrome.storage.sync.set({ userid: newUserId }, () => cb(newUserId));
    }
  });
}

// const updateEnabledCategories = async () => {
//   try {
//     const response = await fetch(chrome.runtime.getURL('data.json'));
    
//     if (!response.ok) {
//       throw new Error('Response was not ok');
//     }

//     const data = await response.json();
    
//     // Check if enabledCategories exists and is an array with at least one element
//     const categoryArray = Array.isArray(data.enabledCategories) && data.enabledCategories.length
//       ? data.enabledCategories
//       : [1];

//     await chrome.storage.local.set({ enabledCategories: categoryArray });
    
//   } catch (error) {
//     await chrome.storage.local.set({ enabledCategories: [1] });
//   }
// };


/**
 * Refreshes the locally storage trigger words by
 * fetching a new copy from the server if the
 * existing copy is deemed to have expired.
 **/
export const refreshTriggers = async () => {
  const expiration = localStorage.getItem(TRIGGERS_EXPIRATION_KEY);
  // await updateEnabledCategories();
  if (expiration === null || new Date(expiration) < new Date()) {
    // Expired, so lets refresh
    localStorage.removeItem(TRIGGERS_KEY);
    localStorage.removeItem(TRIGGERS_EXPIRATION_KEY);

    const cmsBaseUrl = window._RIPPLE_CMS_URL;

    const requestParams = { version: window._RIPPLE_VERSION };
    const urlParamString = new URLSearchParams(requestParams).toString();
    const triggersUrl = `${cmsBaseUrl}/extension_triggers_with_regex?${urlParamString}`;
    const response = await fetch(triggersUrl);
    const responseJson = await response.json();
    // New expiration date will be tomorrow
    const newExpiration = new Date();
    newExpiration.setDate(newExpiration.getDate() + 1);

    let triggers = {};
    responseJson.forEach(trigger => {
      const key = trigger.trigger;
      
      if (triggers[key]) {
        if (!triggers[key].locale.includes(trigger.locale)) {
          triggers[key].locale.push(trigger.locale);
        }
      } else {
        triggers[key] = {
          locale: [trigger.locale],
          severity: trigger.severity,
          category_id: trigger.category_id,
          trigger_id: trigger.id
        };
      }
    });

    localStorage.setItem(TRIGGERS_KEY, JSON.stringify(triggers));
    localStorage.setItem(TRIGGERS_EXPIRATION_KEY, newExpiration); 
  }
}

export const getTriggers = () => {
  return JSON.parse(localStorage.getItem(TRIGGERS_KEY));
}
