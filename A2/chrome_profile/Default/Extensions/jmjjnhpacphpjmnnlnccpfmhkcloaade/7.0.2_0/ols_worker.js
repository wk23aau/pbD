/*
 * Copyright (c) F-Secure Corporation. All rights reserved.
 * See license terms for the related product.
 */

const Action = new BrowserAction();
const CurrentExtensionStatus = new ExtensionStatus();
var TabUrl = {};

var Settings = {
    safe_search: false,
    search_results: false,
    block_ads: false,
    trusted_shopping: false,
    trusted_shopping_popup_safe: true,
    trusted_shopping_popup_suspicious: true,
    browsing_protection: false,
    debug_mode: false,
    consent_manager: false
};

function isInternalPage(url) {
    if (!url) {
        return false;
    }
    for (const internalPage of Object.values(BrowserInternalPage)) {
        if (url.protocol === internalPage) {
            return true;
        }
    }
    return false;
}


function bypassRequest(details) {
    if (details.frameId !== undefined && details.frameId != 0) {
        return true;
    }

    if (!details.url) {
        return false;
    }

    const parsedUrl = new URL(details.url);
    if (parsedUrl.hostname == "localhost" || parsedUrl.hostname.startsWith("localhost:")) {
        return true;
    }

    if (isInternalPage(parsedUrl)) {
        return true;
    }

    return false;
}

function getReferrer(details) {
    if (details.initiator && details.initiator != "null") {
        const parsedInitiator = new URL(details.initiator);
        if (["http:", "https:"].includes(parsedInitiator.protocol) && parsedInitiator.hostname != "localhost" && !parsedInitiator.hostname.startsWith("localhost:")) {
            return details.initiator;
        }
    }

    return "";
}

async function getUrlInfo(url) {
    return await worker.orspInfoMessage(url);
}

// A wrapper to work properly with both MV2 and MV3
function BrowserAction() {
    if (chrome.action) {
        return chrome.action;
    }
    else {
        return chrome.browserAction;
    }
}

function GetValueIfObjectExists(obj, id) {
    if (id in obj) {
        return obj[id];
    }
    return null;
}


class OlsWorker {

    #browserInfo = {};
    #platform = {};
    #userInfo = {};
    #customizationLoaded = false;
    #nativeMessagingStatus = ConnectionStatus.Unknown;
    #permissionsMonitor;
    #bankingMode = false;
    #connectionStatusRequests = [];
    #adBlockerCounter = {};
    #contentChecker = new ContentChecker(DataPipeline);
    #productVersion = new ProductVersion("");

    constructor() {
        if (Browser.isSafari) {
            this.#permissionsMonitor = new PermissionsMonitor(this.#sendAllWebsiteAccessChanged);
            this.#permissionsMonitor.start();
        }
        this.safeSearchOption = new SafeSearchOption();
        this.adBlocker = new AdBlocker();
        this.referrerCache = new ReferrerCache();

        NativeHost.setSettingsChangedCallback((settings) => { this.onSettingsChanged(settings); });
        NativeHost.setBankingModeChangedCallback((bankingMode) => { this.onBankingModeChanged(bankingMode); });
        NativeHost.setServerRestartedCallback(() => { this.referrerCache.Clear(); });
        NativeHost.setConnectedCallback(() => { this.nativeMessagingConnected() });
        NativeHost.setOnPortDisconnectCallback(() => { this.nativeMessagingDisconnected() });
    }

    nativeMessagingConnected() {
        FsLog.isNativeMessagingConfigured = true;
        this.#nativeMessagingStatus = ConnectionStatus.Connected;
        CurrentExtensionStatus.clearStatusOverride();
        this.#clearConnectionStatusRequestQueue();
    }

    nativeMessagingDisconnected() {
        loge("Not connected to a product");
        if (chrome.runtime.lastError) {
            loge(`Error from runtime: ${chrome.runtime.lastError.message}`);
        }
        this.#nativeMessagingStatus = ConnectionStatus.NotConnected;
        FsLog.isNativeMessagingConfigured = false;
        CurrentExtensionStatus.setStatusOverride(ExtensionState.Error);
        this.#clearConnectionStatusRequestQueue();
    }

    get bankingMode() {
        return this.#bankingMode;
    }

    init() {
        const extName = chrome.runtime.getManifest().name;
        logi("Initialize extension");
        logi("Extension version:", chrome.runtime.getManifest().version);
        logi("Extension id:", chrome.runtime.id);
        logi("Extension name:", extName);
        logi("Browser name:", Browser.name);
        chrome.runtime.getPlatformInfo(platform => {
            logi("Platform info:", platform);
            this.#platform = platform;
        });

        BrowserStorage.getLocal(["browserInfo", "userAdServingDomains"]).then(result => {
            logi("Browser info:", result.browserInfo);
            let domainListCount = result.userAdServingDomains ? result.userAdServingDomains.length : 0;
            logi("User's ad serving domains count:", domainListCount);
            this.#userInfo["adServingDomainsSize"] = domainListCount;
            this.#browserInfo = result.browserInfo;
        });

        this.#waitForHostNameAndInitComms();
    }

    #waitForHostNameAndInitComms() {
        let retryCount = 0;
        const maxRetries = 30;
        const initialDelay = 100;
        const maxDelay = 20000;

        const initComms = () => {
            if (NativeHost.hostName) {
                logi("Native messaging host name:", NativeHost.hostName);
                this.initCommsAddListeners();
                return;
            }

            retryCount++;
            if (retryCount <= maxRetries) {
                // Exponential backoff but cap it at maxDelay
                const delay = Math.min(initialDelay * Math.pow(1.5, retryCount - 1), maxDelay);

                logi(`Waiting for native messaging host (attempt ${retryCount}/${maxRetries}), next retry in ${delay}ms`);
                setTimeout(initComms, delay);
            } else {
                loge(`Failed to initialize native messaging host after ${maxRetries} retries`);
            }
        };

        initComms();
    }

    #getOpenTabs() {
        return new Promise(resolve => {
            (async () => {
                if (Browser.isSafari && this.#permissionsMonitor) {
                    const allWebsiteAccessAllowed = await this.#permissionsMonitor.allWebsiteAccessAllowed();
                    if (!allWebsiteAccessAllowed) {
                        // Safari does not allow calling "chrome.tabs.query" API before the user grants extension access to all websites in the settings
                        resolve([]);
                        return;
                    }
                }
                chrome.tabs.query({}, tabs => {
                    resolve(tabs);
                });
            })()
        });
    }

    get contentChecker() {
        return this.#contentChecker;
    }

    async initCommsAddListeners() {
        this.addListeners();
        const tabs = await this.#getOpenTabs();
        const tabInfos = tabs.map(tab => ({ id: tab.id, url: tab.url }))
        logd("Tab infos", tabInfos);
        const info = {
            type: MessageName.Init,
            browserInfo: this.#browserInfo,
            platform: this.#platform,
            userInfo: this.#userInfo,
            browserName: Browser.name,
            extId: chrome.runtime.id,
            tabs: tabInfos,
            extensionVersion: chrome.runtime.getManifest().version
        };
        const result = await NativeHost.postMessage(info);
        if (result.customization && Object.keys(result.customization).length > 0) {
            this.#customizationLoaded = true;
        }
        if (result.productVersion) {
            this.#productVersion = new ProductVersion(result.productVersion);
        }

        await BrowserStorage.setLocal({
            customization: result.customization,
            platform: this.#platform
        })

        logi("Customization:", result.customization);
        NativeHost.onInitialized();

        if (result.settings) {
            this.onSettingsChanged(result.settings);
        }
        else {
            logi("No settings in init response");
            this.scanMessage("https://f-secure.com"); // send dummy scan message to get settings (to be deprecated)
        }

        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
            this.#scanTab(tabs[0].id);
        });
    }

    addListeners() {
        logi("Adding listeners");
        chrome.webNavigation.onCompleted.addListener((details) => { this.onCompleted(details) }, { "url": [{ "schemes": ["https", "http"] }] });
        if (!Browser.isSafari) {
            // not using for Safari. onCommitted event breaks tab id tracking logic
            chrome.webNavigation.onCommitted.addListener((details) => { this.onCommitted(details) }, { "url": [{ "schemes": ["https", "http"] }] });
        }

        chrome.tabs.onCreated.addListener((details) => { this.onTabCreated(details) });
        chrome.tabs.onActivated.addListener((activeInfo) => { this.onTabActivated(activeInfo) });
        chrome.tabs.onUpdated.addListener((tabId, details) => { this.onTabUpdated(tabId, details) });
        chrome.tabs.onRemoved.addListener((tabId, details) => { this.onTabRemoved(tabId, details) });
        chrome.tabs.onReplaced.addListener((addedTabId, removedTabId) => { this.onTabReplaced(addedTabId, removedTabId) });
        if (!Browser.isSafari) {
            chrome.webNavigation.onBeforeNavigate.addListener((details) => { this.onBeforeNavigate(details) }, { "url": [{ "schemes": ["https", "http", "file"] }] });
        }


        const eventTypes = ["main_frame", "sub_frame", "stylesheet", "script", "image", "xmlhttprequest", "media"];

        if (chrome.runtime.getManifest().manifest_version == 3) {
            chrome.webRequest.onBeforeRequest.addListener((details) => { this.onBeforeRequestMV3(details) }, { urls: ["http://*/*", "https://*/*"], types: eventTypes });
        }
        else {
            // webRequestBlocking is not available in Safari. So checking dynamically and applying only if the browser supports it
            if (Browser.isSafari) {
                chrome.webNavigation.onBeforeNavigate.addListener((details) => { this.onBeforeNavigateSafari(details) }, { "url": [{ "schemes": ["https", "http", "file"] }] });
                return;
            }
            const onBeforeSendHeadersOptions = ["requestHeaders", "blocking"];
            const onBeforeRequestOptions = ["blocking"];
            chrome.webRequest.onBeforeSendHeaders.addListener((details) => this.onBeforeSendHeaders(details), { urls: YoutubeUrls, types: ["main_frame", "xmlhttprequest"] }, onBeforeSendHeadersOptions);
            chrome.webRequest.onBeforeRequest.addListener((details) => this.onBeforeRequestMV2(details), { urls: ["http://*/*", "https://*/*"], types: eventTypes }, onBeforeRequestOptions);
        }
    }

    onBeforeNavigate(details) {
        logd("onBeforeNavigate: ", details);
        const referrer = getReferrer(details);
        if (details.frameId === 0) {
            this.scanMessage(details.url, details.tabId, referrer);
        }
    }

    onBeforeNavigateSafari(details) {
        logd("onBeforeNavigateSafari: ", details);
        const domain = new URL(details.url).hostname;
        if (details.frameId === 0 && !this.#adBlockerCounter[details.tabId]) {
            this.#adBlockerCounter[details.tabId] = {
                count: 0,
                domain
            };
        }
        if (this.adBlocker.domains.includes(domain) && !this.adBlocker.excludedDomains.includes(this.#adBlockerCounter[details.tabId].domain)) {
            logd(`Ad blocker has blocked the url ${details.url} at page ${this.#adBlockerCounter[details.tabId].domain}`);
            this.#adBlockerCounter[details.tabId].count += 1;
            BrowserStorage.setSession({ adBlockerCounter: this.#adBlockerCounter });
            DataPipeline.adBlocked();
        }
    }

    onBeforeSendHeaders(details) {
        if (Settings.safe_search) {
            const strictMode = { name: "YouTube-Restrict", value: "Strict" };
            details.requestHeaders.push(strictMode);
        }
        return { requestHeaders: details.requestHeaders };
    }

    getNativeMessagingStatus(callback) {
        if (this.#nativeMessagingStatus != ConnectionStatus.Unknown) {
            // state is known. responding right away  
            callback(this.#nativeMessagingStatus);
            return;
        }

        // content script asks for status before background script established connection to native messaging host
        // storing the callback and will respond once the state is known
        this.#connectionStatusRequests.push(callback);
    }

    #clearConnectionStatusRequestQueue() {
        if (this.#connectionStatusRequests.length == 0) {
            return;
        }
        logi(`Sending connection status ${this.#nativeMessagingStatus} to ${this.#connectionStatusRequests.length} pending requests`);
        this.#connectionStatusRequests.forEach((callback) => {
            callback(this.#nativeMessagingStatus);
        });
        this.#connectionStatusRequests = [];
    }

    updateStatus(tabId) {
        CurrentExtensionStatus.update(tabId);
    }

    setExtensionNoConsent() {
        CurrentExtensionStatus.setStatusOverride(ExtensionState.ConsentRequired);
        Action.onClicked.addListener(showConsent);
    }

    onCompleted(details) {
        logd(details);
        if (details.frameId == 0) {
            this.tabInfoMessage(TabAction.Complete, details.tabId, details.url, []);
        }
    }

    getAdCount(tabId) {
        return this.#adBlockerCounter[tabId] ? this.#adBlockerCounter[tabId].count : 0;
    }

    async adBlockerStats(details) {
        const domain = new URL(details.url).hostname;

        if (domain === "localhost" || domain === "127.0.0.1") {
            return;
        }

        if (details.type == "main_frame" || !this.#adBlockerCounter[details.tabId]) {
            this.#adBlockerCounter[details.tabId] = {
                count: 0,
                domain
            };
        }

        if (this.adBlocker.domains.includes(domain) && !this.adBlocker.excludedDomains.includes(this.#adBlockerCounter[details.tabId].domain)) {
            logd(`Ad blocker has blocked the url ${details.url} at page ${this.#adBlockerCounter[details.tabId].domain}`);
            this.#adBlockerCounter[details.tabId].count += 1;
            BrowserStorage.setSession({ adBlockerCounter: this.#adBlockerCounter });
            DataPipeline.adBlocked();
            return;
        }
        if (details.frameType == "sub_frame" && details.type != "main_frame") {
            const result = await BrowserStorage.getLocal(["userAdServingDomains"]);
            let domains = [];
            if (Array.isArray(result.userAdServingDomains)) {
                domains = result.userAdServingDomains;
            }
            if (domains.includes(domain)) {
                return;
            }
            // Skip dynamic ad serving domains in production
            if (await isProduction()) {
                return;
            }
            const info = await this.orspInfoMessage(details.url);
            if (info.categories) {
                info.categories.forEach(cats => {
                    if (Object.keys(cats).includes("adserving") || Object.keys(cats).includes("fso_adserving")) {
                        domains.push(domain);
                        logd(`Adding new domain to ad blocker list ${domain}`);
                    }
                });
            }
            await BrowserStorage.setLocal({ userAdServingDomains: domains });
            await this.adBlocker.applyRule();
        }
    }

    onBeforeRequestMV3(details) {
        if (details.type == "main_frame") {
            this.#contentChecker.checkResources(details.tabId, this.orspInfoMessage);
        }
        else {
            this.#contentChecker.addResource(details.tabId, details.initiator, details.url, details.type);
        }

        if (Settings.block_ads) {
            this.adBlockerStats(details);
        }

        if (!bypassRequest(details)) {
            const referrer = getReferrer(details);
            if (details.type == "main_frame") {
                this.safeSearchOption.enableStrictMode(Settings.safe_search);
            }
            else {
                if (referrer && this.mustSendReferrerMessage(details.url, referrer)) {
                    this.referrerMessage(details.url, referrer);
                }
            }
        }
    }

    onBeforeRequestMV2(details) {
        const domain = new URL(details.url).hostname;
        const docUrl = new URL(details.documentUrl || details.url).hostname;

        if (details.type == "main_frame") {
            this.#contentChecker.checkResources(details.tabId, this.orspInfoMessage);
        }
        else {
            this.#contentChecker.addResource(details.tabId, details.originUrl, details.url, details.type);
        }

        if (details.type == "main_frame" || !this.#adBlockerCounter[details.tabId]) {
            this.#adBlockerCounter[details.tabId] = {
                count: 0,
                domain: docUrl
            };
        }
        if (Settings.block_ads && !this.adBlocker.excludedDomains.includes(docUrl)) {
            if ((details.type == "sub_frame" || details.type == "script" || details.type == "image") &&
                (this.adBlocker.domains.includes(domain) || details.url.includes("bing.com/aclick"))) {
                logd("Ad blocker has blocked the url:", details.url);
                DataPipeline.adBlocked();
                this.#adBlockerCounter[details.tabId].count += 1;
                BrowserStorage.setSession({ adBlockerCounter: this.#adBlockerCounter });
                return { cancel: true };
            }
        }

        var result = true;
        if (!bypassRequest(details)) {
            const referrer = getReferrer(details);
            if (details.type == "main_frame") {
                result = this.scanMessage(details.url, details.tabId, referrer);
                CurrentExtensionStatus.update(details.tabId);
                logd(`Scanning ${details.url}`);
            }
            else if (referrer && this.mustSendReferrerMessage(details.url, referrer)) {
                this.referrerMessage(details.url, referrer);
            }
        }

        if (Settings.safe_search == true) {
            let url = new URL(details.url);
            if (GoogleDomains.includes(url.hostname)) {
                if (url.searchParams.get("safe") != "vss") {
                    url.searchParams.set("safe", "vss");
                    return { redirectUrl: url.href };
                }
            }
            else if (BingDomains.includes(url.hostname)) {
                if (url.searchParams.get("adlt") != "strict") {
                    url.searchParams.set("adlt", "strict");
                    return { redirectUrl: url.href };
                }
            }
            else if (YahooDomains.includes(url.hostname) || YahooDomainsJapan.includes(url.hostname)) {
                if (url.searchParams.get("vm") != "r") {
                    url.searchParams.set("vm", "r");
                    return { redirectUrl: url.href };
                }
            }
            else if (DuckDuckGoDomains.includes(url.hostname)) {
                if (url.searchParams.get("kp") != "1") {
                    url.searchParams.set("kp", "1");
                    return { redirectUrl: url.href };
                }
            }
        }

        return result;
    }

    mustSendReferrerMessage(url, referrer) {
        if (!NativeHost.isServerIdValid()) {
            return true; // ReferrerCache proper reset not available, so don't use it
        }

        return this.referrerCache.Process(referrer, url);
    }

    onCommitted(details) {
        logd(details);
        if (details.transitionQualifiers && details.transitionQualifiers.includes("server_redirect")) {
            logd("Redirected to:", details.url);
        } else if (details.tabId && details.url && details.frameId == 0 && details.url != TabUrl[details.tabId]) {
            logd("new url for tab ", details.url);
        }
    }

    getTabURL(tabID) {
        return new Promise(resolve => {
            chrome.tabs.get(tabID, (tab) => {
                resolve(tab.url);
            });
        });
    }

    #isBlockedUrl(url) {
        for (const blockPageUrl of Object.values(BlockPages)) {
            if (url.indexOf(chrome.runtime.getURL(blockPageUrl)) == 0) {
                return true;
            }
        }
        return false;
    }

    async #preventBlockPageParamChanges(tabId, url) {
        if (!url) {
            return;
        }
        if (this.#isBlockedUrl(url)) {
            if (TabUrl[tabId]) {
                if (TabUrl[tabId].blockPageUrl && url != TabUrl[tabId].blockPageUrl ||
                    !TabUrl[tabId].blockPageUrl && url != TabUrl[tabId].url) {
                    const url = TabUrl[tabId].blockPageUrl ? TabUrl[tabId].blockPageUrl : TabUrl[tabId].url;
                    await this.#redirectTab(tabId, url);
                }
            }
            else {
                await this.#redirectTab(tabId, "about:blank");
            }
        }
    }

    onTabCreated(details) {
        logd(`TabId: ${details.id}`);
        CurrentExtensionStatus.setStatus(ExtensionState.Unknown, details.id);
    }

    onTabActivated(activeInfo) {
        logd(`TabId: ${activeInfo.tabId}`);
        logd(`Is tab known: ${CurrentExtensionStatus.isTabKnown(activeInfo.tabId)}`);
        this.#scanTab(activeInfo.tabId);
    }

    #scanTab(tabId) {
        chrome.tabs.get(tabId, (tab) => {
            if (tab.url && !CurrentExtensionStatus.isTabKnown(tabId)) {
                if (tab.url.startsWith("http://") || tab.url.startsWith("https://")) {
                    this.scanMessage(tab.url, tab.id);
                }
                else if (tab.url.startsWith("chrome://") || tab.url.startsWith("edge://") || tab.url.startsWith("about:")) {
                    CurrentExtensionStatus.setStatus(ExtensionState.Unknown, tab.id);
                }
            }
        });
    }

    onTabUpdated(tabId, details) {
        logd(`onTabUpdated. tabId: ${tabId}`, details);
        this.updateStatus(tabId);
        this.tabInfoMessage(TabAction.Open, tabId, details.url, []);
        this.#preventBlockPageParamChanges(tabId, details.url);

        // renew status on block page reload
        if (TabUrl[tabId] && TabUrl[tabId].block) {
            switch (TabUrl[tabId].block.type) {
                case StatusType.Banking:
                    CurrentExtensionStatus.setStatus(ExtensionState.Banking, tabId);
                    break;
                case StatusType.Suspicious:
                    CurrentExtensionStatus.setStatus(ExtensionState.Warn, tabId);
                    break;
                default:
                    CurrentExtensionStatus.setStatus(ExtensionState.Danger, tabId);
            }
        }

        // onBeforeRequest does not contain tabId in case of Safari. This prevents block page from being shown when the user navigates directly to unsafe page
        // sending scan message for Safari here
        if (Browser.isSafari && !bypassRequest(details)) {
            const referrer = getReferrer(details);
            if (details.url) {
                this.scanMessage(details.url, tabId, referrer);
                return;
            }

            // onTabUpdated does not always provide url (for example when the page is reloaded with Cmd + R)
            // querying the URL manually and sending for scanning
            this.getTabURL(tabId).then(tabURL => {
                if (!tabURL) {
                    console.debug(`onTabUpdated: no URL on tab ${tabId}`);
                    return;
                }
                const details = { url: tabURL };
                if (bypassRequest(details)) {
                    console.debug(`onTabUpdated: bypassing URL ${tabURL} on tab ${tabId}`);
                    return;
                }
                this.scanMessage(tabURL, tabId, referrer);
            });
        }
    }

    onTabRemoved(tabId, details) {
        logd(`TabId: ${tabId}`, details);
        CurrentExtensionStatus.removeStatus(tabId);
        chrome.tabs.query({}, tabs => {
            const openTabs = tabs.map(tab => (tab.id));
            logd("open tabs:", openTabs);
            this.tabInfoMessage(TabAction.Close, tabId, details.url, openTabs);
        });
    }

    onTabReplaced(addedTabId, removedTabId) {
        logd(`onTabReplaced: ${removedTabId} -> ${addedTabId}`);
        const urlData = TabUrl[removedTabId];
        // Safari 18 fires onTabReplaced handler when we redirect the user from unsafe page to block page
        // which means that when block page is loaded, it will ask for the information about the new/different tab ID from the one we saw when we started checking URL for safety
        // logic below is meant to move the block page data from the old tab ID to the new one
        // this behavior is specific only to Safari so far. But in case any other browser starts to behave the same way, we should be already prepared

        if (urlData && urlData.blockPageUrl) {
            TabUrl[addedTabId] = urlData;
            delete TabUrl[removedTabId];
            logd(`Block page data moved from ${removedTabId} to ${addedTabId}`);
            CurrentExtensionStatus.onTabReplaced(addedTabId, removedTabId);
        }
    }

    tabInfoMessage(tabAction, tabId, url, openTabs) {
        if (tabId != chrome.tabs.TAB_ID_NONE && url) {
            const info = {
                type: MessageName.TabInfo,
                tabinfo: {
                    action: tabAction,
                    tabId,
                    url
                }
            };

            NativeHost.postMessage(info);
        }
        else if (tabAction == TabAction.Close) {
            const info = {
                type: MessageName.TabInfo,
                tabinfo: {
                    action: tabAction,
                    tabId,
                    openTabs
                }
            };

            NativeHost.postMessage(info);
        }
    }


    getWebsiteType(categories) {
        if (!categories) {
            return WebsiteType.Unknown;
        }
        for (let cat in categories) {
            if (BankCategories.includes(Object.keys(categories[cat])[0])) {
                return WebsiteType.Banking;
            }
        }
        return WebsiteType.Other;
    }

    isBankingWebsite(categories) {
        if (!categories) {
            return false;
        }
        for (let cat in categories) {
            if (BankCategories.includes(Object.keys(categories[cat])[0])) {
                return true;
            }
        }
        return false;
    }

    isShoppingWebsite(categories) {
        if (!categories) {
            return false;
        }
        for (let cat in categories) {
            if (Object.keys(categories[cat])[0] == "shopping") {
                if (categories[cat]["shopping"] == 100) {
                    return true;
                }
            }
            if (Object.keys(categories[cat])[0] == "shopping_and_auctions") {
                if (categories[cat]["shopping_and_auctions"] == 100) {
                    return true;
                }
            }
        }
        return false;
    }

    getShoppingRating(categories) {
        if (!categories) {
            return -1;
        }
        if (!this.isShoppingWebsite(categories)) {
            return -1;
        }
        for (let cat in categories) {
            if (Object.keys(categories[cat])[0] == "trustworthiness") {
                return categories[cat]["trustworthiness"];
            }
        }
        return -1;
    }

    #getStateFromResponse(response) {
        if ("id" in response && Object.keys(response).length == 1) {
            console.warn("Empty response");
            this.nativeMessagingDisconnected();
            return ExtensionState.Error;
        }

        if (response.isWhitelisted === true) {
            return ExtensionState.Info;
        }
        if (response.isBlacklisted === true) {
            return ExtensionState.Danger;
        }
        let verdict = ExtensionState.Unknown;
        if (response.block) {
            switch (response.block.type) {
                case StatusType.Banking:
                    return ExtensionState.Banking;
                case StatusType.Suspicious:
                    return ExtensionState.Warn;
                default:
                    return ExtensionState.Danger;
            }
        }
        else if (response.ORSPData && response.ORSPData.length) {
            const safeVerdict = getCategoryValue('safe', response.ORSPData);
            verdict = safetyVerdictToExtensionState(getSafetyVerdict(safeVerdict));
            if (Settings.trusted_shopping) {
                const rating = this.getShoppingRating(response.ORSPData);
                if (rating == 2 || rating == 3) {
                    verdict = ExtensionState.TrustedShoppingWarning;
                }
                else if (rating >= 4) {
                    verdict = ExtensionState.Safe;
                }
            }
        }
        return verdict;
    }

    scanMessage(url, tabId, referrer) {
        logd("url=", url, ", tabId=", tabId, ", referrer=", referrer);
        return new Promise(resolve => {
            (async () => {
                var query = {
                    type: MessageName.ScanRequest,
                    scanrequest: {
                        url,
                        tabId,
                        rqtype: ScanRequestType.PrimaryNoBanking,
                        extVer: chrome.runtime.getManifest().version,
                        extName: chrome.runtime.getManifest().name
                    }
                };
                if (referrer) {
                    query.scanrequest.referer = referrer; // typo (query.referer) intentional
                }

                const result = await NativeHost.postMessage(query);
                logi("Scan result", result, tabId);

                const tabUrl = result.block && result.block.url ? result.block.url : url;
                const blockPageUrl = result.block ? this.getBlockPage(result.block) : null;

                this.#contentChecker.setPaymentCategory(tabId, url, result.ORSPData);

                if ("settings" in result) {
                    this.onSettingsChanged(result.settings);
                }

                const state = this.#getStateFromResponse(result);
                CurrentExtensionStatus.setStatus(state, tabId);
                TabUrl[tabId] = {
                    url: tabUrl,
                    blockPageUrl: blockPageUrl,
                    block: result.block,
                    orsp: result.ORSPData,
                    referrer,
                    state
                };

                if (!chrome.runtime.lastError && tabId && blockPageUrl) {
                    await this.#redirectTab(tabId, blockPageUrl);
                }
                resolve(state);
            })()
        });
    }

    async #redirectTab(tabId, url) {
        logd(`Redirecting tabId ${tabId} to url ${url}`);
        await chrome.tabs.update(tabId, { url });
    }

    orspInfoMessage(url) {
        return new Promise(resolve => {
            var query = {
                type: MessageName.ORSPInfo,
                orspinfo: {
                    url
                }
            };

            NativeHost.postMessage(query)
                .then(result => {
                    const info = {
                        categories: result.categories,
                        url: result.url,
                        isWhitelisted: result.isWhitelisted,
                        isBlacklisted: result.isBlacklisted
                    };
                    resolve(info);
                });
        });
    }

    referrerMessage(url, referrer) {
        const message = {
            type: MessageName.Referrer,
            url,
            referrer
        };

        NativeHost.postMessage(message);
    }

    userRating(url, verdict, categories, notes) {
        const message = {
            type: MessageName.UserRating,
            userrating: {
                url,
                verdict,
                categories,
                notes
            }
        };

        NativeHost.postMessage(message);
    }

    allowDomainMessage(url) {
        const query = {
            type: MessageName.AllowDomain,
            allowdomain: {
                url
            }
        };
        NativeHost.postMessage(query);
    }

    openExceptionsMessage(url) {
        const query = {
            type: MessageName.OpenExceptions,
        };
        NativeHost.postMessage(query);
    }

    checkWhitelistMessage(url) {
        return new Promise(resolve => {
            const query = {
                type: MessageName.CheckWhitelist,
                checkwhitelist: {
                    url
                }
            };

            NativeHost.postMessage(query)
                .then(result => {
                    const info = {
                        whitelisted: result.info ? result.info.whitelisted : false,
                        url: result.info ? result.info.url : null
                    };
                    resolve(info);
                });
        });
    }

    checkURLReputation(url) {
        return new Promise(resolve => {
            const query = {
                type: MessageName.RatingRequest,
                ratingrequest: {
                    url
                }
            };

            NativeHost.postMessage(query)
                .then(result => {
                    result.ext_name = extensionName();
                    result.url = url;
                    result.typeIcon = "";

                    result.showRatingIcon = false;
                    result.shoppingSite = this.isShoppingWebsite(result.orspData);
                    result.bankingSite = this.isBankingWebsite(result.orspData);

                    if (Settings.search_results) {
                        result.showRatingIcon = true;
                    }
                    else if (Settings.trusted_shopping
                        && result.shoppingSite
                        && this.getShoppingRating(result.orspData) > 0) {
                        result.showRatingIcon = true;
                    }

                    if (result.categories && result.showRatingIcon) {
                        result.typeIcon = chrome.runtime.getURL('img/ic_18+.svg');
                    }

                    if (result.shoppingSite && result.showRatingIcon) {
                        result.typeIcon = chrome.runtime.getURL("img/ic_place_onlineshop.svg");
                        if (Settings.trusted_shopping) {
                            result.trustworthiness = this.getShoppingRating(result.orspData);
                            if (result.trustworthiness == 1) {
                                result.rating_status = StatusType.TrustedShoppingUnsafe;
                            }
                        }
                    }
                    resolve(result);
                });
        });
    }

    getAdblockStatus() {
        return Settings.block_ads;
    }

    getBlockPage(block) {
        // if customization is missing, show general block page
        if (!this.#customizationLoaded) {
            block.type = "general";
        }
        return chrome.runtime.getURL(BlockPages[block.type]);
    }

    onSettingsChanged(newSettings) {
        logi(newSettings);
        const mergedSettings = {
            ...Settings,
            ...newSettings
        };
        Settings = mergedSettings;
        if (this.#platform.os === "win"
            && this.#productVersion.isLessThan("5.7")
            && this.#productVersion.currentVersion) {
            logi("Consent manager is disabled for OneClient versions less than 5.7");
            Settings.consent_manager = false;
        }
        BrowserStorage.setLocal({ settings: Settings });
        this.safeSearchOption.enableStrictMode(Settings.safe_search);
        this.adBlocker.configure(Settings.block_ads);
    }

    onBankingModeChanged(bankingMode) {
        logi(bankingMode);
        if (bankingMode) {
            this.#bankingMode = bankingMode.active;
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const url = tabs[0].url;
                if (url.startsWith("https://") || url.startsWith("http://")) {
                    chrome.tabs.sendMessage(tabs[0].id, { type: MessageName.BankingSessionActive, bankingActive: bankingMode.active });
                }
            });
        }
    }

    #sendAllWebsiteAccessChanged(granted) {
        const query = {
            type: "allWebsiteAccessRequest",
            extensionVersion: chrome.runtime.getManifest().version,
            allWebsiteAccessRequest: {
                "granted": granted
            }
        };
        NativeHost.postMessage(query);
    }
}
