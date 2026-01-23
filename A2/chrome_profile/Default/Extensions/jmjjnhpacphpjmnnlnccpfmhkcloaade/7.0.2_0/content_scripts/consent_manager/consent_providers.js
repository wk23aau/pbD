/*
 * Copyright (c) F-Secure Corporation. All rights reserved.
 * See license terms for the related product.
 */

const ConsentProviders = Object.freeze({
    alma: {
        cmpName:"Alma", 
        dialogId: "almacmp-modal-layer1",
        fallBackActionFunc: (() => {
            const config = document.getElementById("almacmp-modalSettingBtn");
            if (config) {
                config.click();
                const denyBtn = document.getElementById("almacmp-reject-all-layer2");
                if (denyBtn) {
                    denyBtn.click();
                    logi(`${extensionName()}: consent has been configured with minimal options automatically.`);
                    chrome.runtime.sendMessage({type: MessageName.WebsiteConsentRejected, url: window.location.href, provider: "alma", result: true, elPath: getElementXPath(denyBtn), elHtml: denyBtn.outerHTML});
                }
                else {
                    const observer = new MutationObserver(() => {
                        const denyBtn = document.getElementById("almacmp-reject-all-layer2");
                        if (denyBtn) {
                            observer.disconnect();
                            denyBtn.click();
                            logi(`${extensionName()}: consent has been configured with minimal options automatically.`);
                            chrome.runtime.sendMessage({type: MessageName.WebsiteConsentRejected, url: window.location.href, provider: "alma", result: true, elPath: getElementXPath(denyBtn), elHtml: denyBtn.outerHTML});
                        }
                        else {
                            loge(`${extensionName()}: can't decline consent.`);
                            chrome.runtime.sendMessage({type: MessageName.WebsiteConsentRejected, url: window.location.href, provider: "alma", result: false, elPath: "", elHtml: ""});
                        }
                    });
                    observer.observe(document.body, {
                        childList: true,
                        subtree: true,
                    });
                }
            }
        }),
    },
    cookiebot: {
        cmpName:"Cookiebot", 
        dialogId: "CybotCookiebotDialog",
        denyId: "CybotCookiebotDialogBodyButtonDecline"
    },
    cookiefirst: {
        cmpName:"CookieFirst",
        dialogDataset: {
            id: "cookiefirst-widget",
            value: "banner"
        },
        denyDataset: {
            idName: "cookiefirst-action",
            value: "reject"
        }
    },
    cookiefirst2: {
        cmpName:"CookieFirst",
        dialogDataset: {
            id: "cookiefirst-widget",
            value: "box"
        },
        denyDataset: {
            idName: "cookiefirst-action",
            value: "reject"
        }
    },
    cookieinformation: {
        cmpName:"Cookie information",
        dialogId: "cookie-information-template-wrapper",
        denyId: "declineButton" 
    },
    cookieyes: {
        cmpName:"Cookie Yes",
        dialogClass: "cky-consent-container",
        denyClass: ["cky-btn-reject"]
    },
    consentmanager: {
        cmpName:"Consent Manager",
        dialogId: "cmpwrapper",
        shadowDom: true,
        denyClass: ["cmpboxbtnno", "cmpboxbtnsave"]
    },
    didomi: {
        cmpName:"Didomi",
        dialogId: "didomi-notice",
        denyId: "didomi-notice-disagree-button" 
    },
    didomi2: {
        cmpName:"Didomi",
        dialogId: "didomi-popup",
        fallBackActionFunc: (() => {
            const learnMore = document.getElementById("didomi-notice-learn-more-button");
            if (learnMore) {
                learnMore.click();
                    const observer = new MutationObserver((mutations) => {
                        const preferenceDialog = document.querySelector(".didomi-consent-popup-preferences");
                        if (preferenceDialog) {
                            observer.disconnect();
                            setTimeout(()=>{                          
                                const denyBtn = preferenceDialog.querySelector('.didomi-components-button');
                                if (denyBtn) {
                                    denyBtn.click();
                                    logi(`${extensionName()}: consent has been configured using learn more and disagree to all option automatically (mutation).`);
                                    chrome.runtime.sendMessage({type: MessageName.WebsiteConsentRejected, url: window.location.href, provider: "didomi2", result: true, elPath: getElementXPath(denyBtn), elHtml: denyBtn.outerHTML});
                                }
                                else {
                                    loge(`${extensionName()}: can't decline consent.`);
                                    chrome.runtime.sendMessage({type: MessageName.WebsiteConsentRejected, url: window.location.href, provider: "didomi2", result: false, elPath: "", elHtml: ""});
                                }
                            }, 500);
                        }
                    });
                    observer.observe(document.body, {
                        childList: true,
                        subtree: true,
                    });
            }
        }),
    },
    enzuzo: {
        cmpName:"Enzuzo", 
        dialogId: "ez-cookie-notification",
        denyId: "ez-cookie-notification__decline"
    },
    fsecure: {
        cmpName:"F-Secure", 
        dialogClass: "fs-consent",
        denyClass: ["cc-btn-outline"]
    },
    onetrust: {
        cmpName:"OneTrust", 
        dialogId: "onetrust-banner-sdk",
        denyId: "onetrust-reject-all-handler",
        fallBackActionFunc: (() => {
            const config = document.getElementById("onetrust-pc-btn-handler");
            if (config) {
                config.click();
                const denyBtn = document.querySelector(".save-preference-btn-handler, .onetrust-close-btn-handler, .ot-pc-refuse-all-handler");
                
                if (denyBtn) {
                    denyBtn.click();
                    logi(`${extensionName()}: consent has been configured with minimal options automatically.`);
                    chrome.runtime.sendMessage({type: MessageName.WebsiteConsentRejected, url: window.location.href, provider: "onetrust", result: true, elPath: getElementXPath(denyBtn), elHtml: denyBtn.outerHTML});
                }
                else {
                    const observer = new MutationObserver(() => {
                        const denyBtn = document.getElementsByClassName("ot-pc-refuse-all-handler")[0];
                        if (denyBtn) {
                            observer.disconnect();
                            denyBtn.click();
                            logi(`${extensionName()}: consent has been configured with minimal options automatically.`);
                            chrome.runtime.sendMessage({type: MessageName.WebsiteConsentRejected, url: window.location.href, provider: "onetrust", result: true, elPath: getElementXPath(denyBtn), elHtml: denyBtn.outerHTML});
                        }
                        else {
                            loge(`${extensionName()}: can't decline consent.`);
                            chrome.runtime.sendMessage({type: MessageName.WebsiteConsentRejected, url: window.location.href, provider: "onetrust", result: false, elPath: "", elHtml: ""});
                        }
                    });
                    observer.observe(document.body, {
                        childList: true,
                        subtree: true,
                    });
                }
            }
        }),
    },
    osano: {
        cmpName:"Osano",
        dialogClass: "osano-cm-dialog",
        denyClass: ["osano-cm-denyAll"]
    },
    piwik: {
        cmpName:"Piwik",
        dialogId: "ppms_cm_popup_main_id",
        denyId: "ppms_cm_reject-all" 
    },
    trustarc: {
        cmpName:"TrustArc", 
        dialogId: "truste-consent-track",
        fallBackActionFunc: (() => {
            const config = document.getElementById("truste-show-consent");
            if (config) {
                loge(`${extensionName()}: can't decline consent.`);
                chrome.runtime.sendMessage({type: MessageName.WebsiteConsentRejected, url: window.location.href, provider: "trustarc", result: false, elPath: "", elHtml: ""});
            }
        }),
    },
    usercentrics: {
        cmpName:"Usercentrics",
        dialogDataset: {
            id: "sectionName",
            value: "cookie-active-consent-notice"
        },
        denyDataset: {
            idName: "component-name",
            value: "reject"
        }
    },
    usercentrics2: {
        cmpName:"Usercentrics",
        dialogId: "usercentrics-root",
        shadowDom: true,
        denyDataset: {
            idName: "testid",
            value: "uc-deny-all-button"
        }
    },
    aliexpress: {
        cmpName:"Aliexpress", 
        dialogClass: "_3KrBP",
        denyClass: ["Sk1_X _1-SOk"]
    },
    yle: {
        cmpName: "Yle",
        dialogId: "yle-consent-sdk-container",
        denyClass: ["primary"]
    },
    reddit: {
        cmpName:"Consent Manager",
        dialogId: "cmpwrapper",
        shadowDom: true,
        denyClass: ["cmpboxbtnno", "cmpboxbtnsave"]
    },
    gravito: {
        cmpName:"Gravito",
        dialogClass: "gravitoCMP-modal",
        fallBackActionFunc: (() => {
            const config = document.getElementById("modalSettingBtn");
            if (config) {
                config.click();
                const denyBtn = document.getElementById("allRejectBtn");
                if (denyBtn) {
                    denyBtn.click();
                    logi(`${extensionName()}: consent has been configured with minimal options automatically.`);
                    chrome.runtime.sendMessage({type: MessageName.WebsiteConsentRejected, url: window.location.href, provider: "gravito", result: true, elPath: getElementXPath(denyBtn), elHtml: denyBtn.outerHTML});
                }
                else {
                    const observer = new MutationObserver(() => {
                        const denyBtn = document.getElementById("allRejectBtn");
                        if (denyBtn) {
                            observer.disconnect();
                            denyBtn.click();
                            logi(`${extensionName()}: consent has been configured with minimal options automatically.`);
                            chrome.runtime.sendMessage({type: MessageName.WebsiteConsentRejected, url: window.location.href, provider: "gravito", result: true, elPath: getElementXPath(denyBtn), elHtml: denyBtn.outerHTML});
                        }
                        else {
                            loge(`${extensionName()}: can't decline consent.`);
                            chrome.runtime.sendMessage({type: MessageName.WebsiteConsentRejected, url: window.location.href, provider: "gravito", result: false, elPath: "", elHtml: ""});
                        }
                    });
                    observer.observe(document.body, {
                        childList: true,
                        subtree: true,
                    });
                }
            }
        }),
    },
    fides: {
        cmpName:"Fides",
        dialogId: "fides-banner-container",
        fallBackActionFunc: (() => {
            const btn = document.querySelector(".fides-reject-all-button");
            if (btn) {
                btn.click();
                logi(`${extensionName()}: consent declined automatically.`);
                chrome.runtime.sendMessage({type: MessageName.WebsiteConsentRejected, url: window.location.href, provider: "fides", result: true, elPath: getElementXPath(btn), elHtml: btn.outerHTML});
            }
            else {
                logi(`${extensionName()}: can't decline consent.`);
                chrome.runtime.sendMessage({type: MessageName.WebsiteConsentRejected, url: window.location.href, provider: "fides", result: false, elPath: "", elHtml: ""});
            }
        }),
    },
});

