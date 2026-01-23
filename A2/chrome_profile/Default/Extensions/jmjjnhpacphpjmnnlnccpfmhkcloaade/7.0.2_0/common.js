/*
 * Copyright (c) F-Secure Corporation. All rights reserved.
 * See license terms for the related product.
 */

function extensionName() {
    if (Browser.isSafari) {
        return chrome.i18n.getMessage("ext_name_safari_full");
    }
    return chrome.runtime.getManifest().name;
}

function checkProductMaturity(extension_name, maturity) {
    return new Promise(resolve => {
        if (chrome.runtime.getManifest().name == chrome.i18n.getMessage(extension_name)) {
            resolve(true);
            return;
        }
        BrowserStorage.getLocal(["customization"]).then(storageResult => {
            const customization = storageResult.customization;
            resolve(customization && customization.Maturity && customization.Maturity === maturity);
        });
    });
}

function isAlpha() {
    return checkProductMaturity("ext_name_alpha", "alpha");
}

function isBeta() {
    return checkProductMaturity("ext_name_beta", "beta");
}

function isProduction() {
    return checkProductMaturity("ext_name", "production");
}

function isDebugMode() {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: MessageName.DebugMode},
            function (response) {
                resolve(response);
            }
        );
    });
}

function getBlockData() {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: MessageName.BlockData }, (block) => {
            resolve(block);
        });
    });
}

function getReputation(url) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage(
            { type: MessageName.RequestURLReputation, url: url },
                 (response) => {
                    resolve(response);
                }
        );
    });
}

function getCategoryValue(categoryName, categories) {
    const categoryEntry = categories.filter(category => categoryName in category);
    return categoryEntry.length > 0 ? categoryEntry[0][categoryName] : -1;
}

function getI18nMessage(stringId, substitute = "") {
        const msg = chrome.i18n.getMessage(stringId, substitute);
        return msg ? msg : (">" + stringId);
}

function getSafetyVerdict(safeCategoryValue) {
    switch (safeCategoryValue) {
        case -100:
        case -80:
            return StatusType.Harmful;
        case -20:
            return StatusType.Suspicious;
        case 0:
            return StatusType.Unknown;
        case 100:
            return StatusType.Safe;
        default:
            break;
    }
    return StatusType.Unknown;
}

function safetyVerdictToExtensionState(verdict) {
    switch (verdict) {
        case StatusType.Harmful:
            return ExtensionState.Harmful;
        case StatusType.Suspicious:
            return ExtensionState.Suspicious;
        case StatusType.Safe:
            return ExtensionState.Safe;
        default:
            return ExtensionState.Unknown;
    }
}

function removeUrlParams(url) {
    try {
        const urlObj = new URL(url);
        urlObj.search = '';
        return urlObj.toString();
    } catch (_) {
        return url;
    }
}

function sanitizeUrlForPrivacy(url) {
    return sanitizeUrlForPrivacyEmails(removeUrlParams(url));
}

function sanitizeUrlForPrivacyEmails(url) {
    return url.replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, "{email}");
}

function getElementXPath(element) {
    if (element.id !== '') {
        // If the element has an ID, use it directly
        return `//*[@id="${element.id}"]`;
    }

    if (element === document.body) {
        // If the element is the body, return the body tag
        return '/html/body';
    }

    let index = 0;
    const siblings = element.parentNode.childNodes;

    for (let i = 0; i < siblings.length; i++) {
        const sibling = siblings[i];
        if (sibling === element) {
            // Found the element, break the loop
            break;
        }
        if (sibling.nodeType === 1 && sibling.nodeName === element.nodeName) {
            // Count only element nodes with the same tag name
            index++;
        }
    }

    const tagName = element.nodeName.toLowerCase();
    const pathIndex = index > 0 ? `[${index + 1}]` : '';
    return `${getElementXPath(element.parentNode)}/${tagName}${pathIndex}`;
}
