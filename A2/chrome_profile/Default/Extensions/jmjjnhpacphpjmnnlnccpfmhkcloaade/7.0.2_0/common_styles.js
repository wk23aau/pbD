/*
 * Copyright (c) F-Secure Corporation. All rights reserved.
 * See license terms for the related product.
 */

function applyCustomizedColorsIfNeeded(customization, frame) {
    return new Promise(resolve => {
        BrowserStorage.getLocal(["platform", "customization"]).then(storageResult => {
            isRunningOnMac(storageResult.platform).then(result => {
                if (result) {
                    applyCustomizedColors(customization, frame, resolve);
                } else {
                    resolve();
                }
            });
        });
    });
}

function applyCustomizedColors(customization, frame, resolve) {
    if (frame) {
        frame.addEventListener('load', () => {
            setStyles(customization, frame.contentDocument);
            resolve();
        });
    } else {
        setStyles(customization, document);
        resolve();
    }
}

function setStyles(customization, customDocument) {
    const mainColor = customization.MainColor;
    const buttonColor = customization.SecondaryColor;
    if (!mainColor || mainColor.length === 0 || 
        !buttonColor || buttonColor.length === 0) {
        console.debug('Invalid colors provided in customization. Not proceeding.');
        return;
    }
    customDocument.documentElement.style.setProperty('--main-color', mainColor);
    customDocument.documentElement.style.setProperty('--button-color', buttonColor); 
    customDocument.documentElement.style.setProperty('--product-logo-dark', `url(${customization.ProductLogo})`);

    if (customization.ProductLogoDark) {
        customDocument.documentElement.style.setProperty('--product-logo-light', `url(${customization.ProductLogoDark})`);
        customDocument.documentElement.style.setProperty('--product-logo-bg-color', "transparent");
    }
    else{
        customDocument.documentElement.style.setProperty('--product-logo-light', `url(${customization.ProductLogo})`);
        customDocument.documentElement.style.setProperty('--product-logo-bg-color', buttonColor);
    }
}

function isRunningOnMac(cachedPlatformInfo) {
    return new Promise(resolve => {
        if (cachedPlatformInfo && cachedPlatformInfo.os) {
            resolve(cachedPlatformInfo.os === 'mac');
        } else {
            chrome.runtime.sendMessage({ type: MessageName.GetPlatformInfo }, (platformInfo) => {
                resolve(platformInfo.os === 'mac');
            });
        }
    });
}

function loadCommonStyles() {
    return new Promise(resolve => {
        BrowserStorage.getLocal(["port", "platform", "customization"]).then(storageResult => {
            applyCustomizedColors(storageResult.customization, null, resolve);
        });
    });
}
