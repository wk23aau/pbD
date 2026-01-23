/*
 * Copyright (c) F-Secure Corporation. All rights reserved.
 * See license terms for the related product.
 */

function isTrustedShoppingRequestValid(url, referrer) {
    if (!Settings.trusted_shopping) {
        return false;
    }
    var isInRefferer = function(url, referrer) {
        if (!referrer) {
            return false;
        }
        if (new URL(url).hostname == new URL(referrer).hostname) {
            return true;
        }
        return false;
    }

    if (isInRefferer(url, referrer)) {
        return false;
    }

    return true;
}

const worker = new OlsWorker();
var PageInfoMap = {};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.type) {
        case MessageName.Init:
            handleInit(request, sendResponse);
            break;
        case MessageName.UserRating:
            handleUserRating(request, sendResponse);
            break;
        case MessageName.Popup:
            handlePopup(request, sendResponse);
            break;
        case MessageName.ConsentDecline:
            handleConsentDecline(sendResponse);
            break;
        case MessageName.SetConsent:
            handleSetConsent(sendResponse);
            break;
        case MessageName.AllowDomain:
            handleAllowDomain(request, sendResponse);
            break;
        case MessageName.OpenExceptions:
            handleOpenExceptions(sendResponse);
            break;
        case MessageName.CheckWhitelist:
            handleCheckWhitelist(request, sendResponse);
            break;
        case MessageName.GetPlatformInfo:
            handleGetPlatformInfo(sendResponse);
            break;
        case MessageName.RequestURLReputation:
            handleRequestURLReputation(request, sendResponse);
            break;
        case MessageName.DebugInfo:
            handleDebugInfo(request, sendResponse);
            break;
        case MessageName.SchemaChanged:
            handleSchemaChanged(request, sender, sendResponse);
            break;
        case MessageName.GetBankingMode:
            handleGetBankingMode(sendResponse);
            break;
        case MessageName.DevToolsOpened:
            handleDevToolsOpened(request, sendResponse);
            break;
        case MessageName.WebsiteConsentRejected:
            handleWebsiteConsentRejected(request, sendResponse);
            break;
        case MessageName.DebugMode:
            handleDebugMode(sendResponse);
            break;
        case MessageName.ShoppingWebsite:
            handleShoppingWebsite(request, sendResponse);
            break;
        case MessageName.AdBlockStatus:
            handleAdBlockStatus(sendResponse);
            break;
        case MessageName.BlockData:
            handleBlockData(request, sender, sendResponse);
            break;
        case MessageName.PaymentFormFound:
            handlePaymentFormFound(request, sender, sendResponse);
            break;
        case MessageName.SavePageInfo:
            handleSavePageInfo(request, sendResponse);
            break;
        case MessageName.GetPageInfo:
            handleGetPageInfo(request, sendResponse);
            break;
        case MessageName.IframesRemoved:
            handleIframesRemoved(request);
            break;
        case MessageName.SaveToLog:
            handleSaveToLog(request, sendResponse);
            break;
        case MessageName.DisplayUrl:
            handleDisplayUrl(request, sendResponse);
            break;
    }
    return true; // required for async sendResponse object lifetime
});

function handleInit(request, sendResponse) {
    worker.getNativeMessagingStatus((status) => {
        const response = (status === ConnectionStatus.Connected) ? InitResult.Success : InitResult.Failure;
        sendResponse({ status: response, settings: Settings });
    });
}

function handleUserRating(request, sendResponse) {
    worker.userRating(request.info.url, request.info.verdict, request.info.categories, request.info.notes);
    sendResponse();
}

function handlePopup(request, sendResponse) {
    const url = TabUrl[request.tab.id] ? TabUrl[request.tab.id].url : request.tab.url;
    getUrlInfo(url).then((result) => {
        let info = result;
        info.tabId = request.tab.id;
        let categories = info.categories;
        if (TabUrl[request.tab.id]) {
            info.adBlockedCount = worker.getAdCount(request.tab.id);
            if (TabUrl[request.tab.id].block) {
                info.block = TabUrl[request.tab.id].block;
            }
            if (TabUrl[request.tab.id].orsp && TabUrl[request.tab.id].orsp.length > 0) {
                categories = TabUrl[request.tab.id].orsp;
            }
        }
        if (worker.isShoppingWebsite(categories)) {
            info.shoppingWebsite = true;
            if (Settings.trusted_shopping) {
                info.rating = worker.getShoppingRating(categories);
            }
        }
        chrome.runtime.sendMessage({ type: MessageName.Infopopup, info, settings: Settings });
    });
    sendResponse();
}

function handleConsentDecline(sendResponse) {
    logi("Uninstalling extension");
    chrome.management.uninstallSelf(() => {
        logi('Uninstall is complete');
    });
    sendResponse();
}

function handleSetConsent(sendResponse) {
    logi("Consent accepted");
    BrowserStorage.setLocal({ consentAccepted: true });
    Action.onClicked.removeListener(showConsent);
    worker.init();
    sendResponse();
}

function handleAllowDomain(request, sendResponse) {
    worker.allowDomainMessage(request.url);
    sendResponse();
}

function handleOpenExceptions(sendResponse) {
    worker.openExceptionsMessage();
    sendResponse();
}

function handleCheckWhitelist(request, sendResponse) {
    worker.checkWhitelistMessage(request.url).then(whitelistInfo => {
        sendResponse(whitelistInfo);
    });
}

function handleGetPlatformInfo(sendResponse) {
    chrome.runtime.getPlatformInfo(platform => {
        sendResponse(platform);
    });
}

function handleRequestURLReputation(request, sendResponse) {
    worker.checkURLReputation(request.url).then((response) => {
        sendResponse(response);
    });
}

function handleDebugInfo(request, sendResponse) {
    worker.checkURLReputation(request.url).then((response) => {
        response.settings = Settings;
        response.extId = chrome.runtime.id;
        response.extVer = chrome.runtime.getManifest().version;
        response.browserName = Browser.name;
        response.extName = chrome.runtime.getManifest().name;
        BrowserStorage.getLocal(["customization", "userAdServingDomains"]).then(result => {
            const domainListCount = result.userAdServingDomains ? result.userAdServingDomains.length : 0;
            response.userAdServingDomainsLength = domainListCount;
            response.customization = result.customization;
            sendResponse(response);
        });
    });
}

function handleSchemaChanged(request, sender, sendResponse) {
    BrowserStorage.setLocal({ schema: request.schema }).then(() => {
        const tabId = sender.tab ? sender.tab.id : null;
        if (tabId) {
            worker.updateStatus(tabId);
        }
        sendResponse();
    });
}

function handleGetBankingMode(sendResponse) {
    sendResponse(worker.bankingMode);
}

function handleDevToolsOpened(request, sendResponse) {
    DataPipeline.devToolsOpened(request.url);
    sendResponse();
}

function handleWebsiteConsentRejected(request, sendResponse) {
    DataPipeline.consentRejected(request.url, request.provider, request.result);
    let url = "<hidden>";
    if (Settings.debug_mode) {
        url = request.url;
    }
    logi(`${request.result ? "Consent declined by automatically" : "Failed to decline consent"}. Provider: ${request.provider}, element path: ${request.elPath}, element html: ${request.elHtml}, url: ${url}`);
    sendResponse();
}

function handleDebugMode(sendResponse) {
    sendResponse(Settings.debug_mode);
}

function handleShoppingWebsite(request, sendResponse) {
    BrowserStorage.getSession(["shoppingDomainsProcessed"]).then(storageResult => {
        const shoppingDomainsProcessed = storageResult.shoppingDomainsProcessed ?? [];
        const domain = new URL(request.url).hostname;
        if (!shoppingDomainsProcessed.includes(domain)) {
            let orspData = getUrlInfo(request.url);
            orspData.then((result) => {
                if (isTrustedShoppingRequestValid(request.url, request.referrer) && worker.isShoppingWebsite(result.categories)) {
                    const rating = worker.getShoppingRating(result.categories);
                    // skip shopping popup if already shown for 4-5 rating
                    if (rating >= 4 && Settings.trusted_shopping_popup_safe && Settings.trusted_shopping) {
                        shoppingDomainsProcessed.push(domain);
                        BrowserStorage.setSession({ shoppingDomainsProcessed });
                    }

                    logi("Shopping website detected, rating", rating);
                    if (rating >= 1 && rating <= 5) {
                        sendResponse({ rating: rating });
                        const sendTelemetrySafeShoppingSite = Settings.trusted_shopping_popup_safe && rating >= 4;
                        const sendTelemetrySuspiciousShoppingSite = Settings.trusted_shopping_popup_suspicious && rating >= 2 && rating <= 3;
                        if (sendTelemetrySafeShoppingSite || sendTelemetrySuspiciousShoppingSite) {
                            DataPipeline.trustedShoppingPopupShown(request.url, rating);
                        }
                    } else {
                        sendResponse();
                    }
                } else {
                    sendResponse();
                }
            });
        } else {
            logi("Shopping website already processed.");
            sendResponse();
        }
    });
}

function handleAdBlockStatus(sendResponse) {
    sendResponse({ type: "adblockStatusResponse", isEnabled: worker.getAdblockStatus() });
}

function handleBlockData(request, sender, sendResponse) {
    if (sender.tab && sender.tab.id && TabUrl[sender.tab.id] && TabUrl[sender.tab.id].block) {
        const block = TabUrl[sender.tab.id].block;
        logi("Responding to block object request with", block, "for tabId", sender.tab.id);
        sendResponse(block);
    } else {
        loge("No block object for tabId", sender.tab.id);
        sendResponse({});
    }
}

function handlePaymentFormFound(request, sender, sendResponse) {
    logd(`Payment form found at url: ${request.url}, tab id: ${sender.tab.id}`);
    worker.contentChecker.setPaymentForm(sender.tab.id, request.url);
    sendResponse();
}

function handleSavePageInfo(request, sendResponse) {
    PageInfoMap[request.tabID] = {
        status: request.status,
        isBank: request.isBank,
        url: request.url,
        categories: request.categories
    };
    sendResponse();
}

function handleGetPageInfo(request, sendResponse) {
    sendResponse(PageInfoMap[request.tabID]);
}

function handleIframesRemoved(request) {
    DataPipeline.unsafeIframesRemoved(request.url, request.iframesRemoved);
}

function handleSaveToLog(request, sendResponse) {
    FsLog.sendFromBackgroundScript(request.message);
    sendResponse();
}

function handleDisplayUrl(request, sendResponse) {
    let orspData = getUrlInfo(request.url);
    orspData.then((result) => {
        sendResponse({ url: result.url });
    });
}

function showConsent() {
    return new Promise(resolve => {
        // do not show consent if already shown
        chrome.tabs.query({}, tabs => {
            for (const tab of tabs) {
                if (tab.url === chrome.runtime.getURL(OnboardingUrl)) {
                    console.debug("Consent page is already opened");
                    resolve();
                    return;
                }
            }
            // check if consent has been accepted already
            BrowserStorage.getLocal("consentAccepted").then(result => {
                if (!result.consentAccepted) {
                    console.warn("Please, see consent page");
                    const url = chrome.runtime.getURL(OnboardingUrl);
                    chrome.tabs.create({ url });
                    worker.setExtensionNoConsent();
                }
                resolve();
            });
        });
    });
}

// for Edge/Chrome/Safari consent is included into a product onboarding flow, show it just for Firefox
if (Browser.isFirefox) {
    // Show consent also when script fired (to handle incognito mode switch)
    showConsent().then(() => {
        BrowserStorage.getLocal("consentAccepted").then(result => {
            if (result.consentAccepted) {
                // We start listeners here, when consent is accepted
                worker.init();
            } else {
                worker.setExtensionNoConsent();
            }
        });
    });
} else {
    worker.init();
}