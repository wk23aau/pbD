/*
 * Copyright (c) F-Secure Corporation. All rights reserved.
 * See license terms for the related product.
 */

class ConsentManager {

    isVisible(el, provider) {
        if (!(el instanceof Element)) {
            return false;
        }
        if (ConsentProviders[provider] && ConsentProviders[provider].shadowDom) {
            if (!el.shadowRoot) {
                return false;
            }
            else if (el.shadowRoot.childNodes.length === 0) {
                return false;
            }
            return true;
        }
        return el.checkVisibility();
    }

    findProvider(addedDialogEl) {
        for (const provider of Object.keys(ConsentProviders)) {
            if (ConsentProviders[provider].dialogId
                && document.getElementById(ConsentProviders[provider].dialogId)
                && this.isVisible(document.getElementById(ConsentProviders[provider].dialogId), provider)) {
                return provider;
            }
            if (ConsentProviders[provider].dialogClass
                && document.getElementsByClassName(ConsentProviders[provider].dialogClass).length > 0
                && this.isVisible(document.getElementsByClassName(ConsentProviders[provider].dialogClass)[0], provider)) {
                return provider;
            }
            if (ConsentProviders[provider].dialogDataset) {
                const dlg = document.querySelector(`[data-${ConsentProviders[provider].dialogDataset.id}~="${ConsentProviders[provider].dialogDataset.value}"]`);
                if (dlg && this.isVisible(dlg)) {
                    return provider;
                }  
            }
            if (this.matchEl(addedDialogEl, ConsentProviders[provider])) {
                return provider;
            }
        }
        return;
    }
    
    matchEl(el, provider) {
        if (!this.isVisible(el, provider)) {
            return false;
        }
        if (el.id && el.id === provider.dialogId) {
            return true;
        }
        if (el.classList && el.classList.contains(provider.dialogClass)) {
            return true;
        }

        if (el.dataset && provider.dialogDataset && el.dataset[provider.dialogDataset.id] === provider.dialogDataset.value) {
            return true;
        }
        return false;
    }

    getRejectButton(cmp) {
        let btn;

        const querySelector = (selector) => {
            let els;
            if (cmp.shadowDom) {
                const root = document.getElementById(cmp.dialogId);
                if (root) {
                    els = root.shadowRoot.querySelectorAll(selector);
                }
            }
            else {
                els = document.querySelectorAll(selector);
            }
            if (els && els.length > 0) {
                return els[0];
            }
            return;
        }
        if (cmp.denyId) {
            btn = querySelector(`#${cmp.denyId}`);
        }
        else if (cmp.denyDataset) {
            btn = querySelector(`[data-${cmp.denyDataset.idName}~="${cmp.denyDataset.value}"]`);
        }
        else if (cmp.denyClass && Array.isArray(cmp.denyClass)) {
            let classSelectors = "";
            for (const cls of cmp.denyClass) {
                classSelectors += "." + cls + ",";
            }
            btn = querySelector(classSelectors.slice(0, -1));
        }
        return btn;
    }

    async action(provider) {
        const getAction = (provider) => new Promise((resolve, reject) => {
            let btn = this.getRejectButton(ConsentProviders[provider]);
            if (btn) {
                resolve(btn);
            }
            else {
                setTimeout(()=>{
                    btn = this.getRejectButton(ConsentProviders[provider]);
                    if (btn) {
                        resolve(btn);
                    }
                    resolve();
                }, 1000);
            } 
        });
        const btn = await getAction(provider);
        if (btn) {
            btn.click();
            logi(`${extensionName()}: consent declined automatically.`);
            chrome.runtime.sendMessage({type: MessageName.WebsiteConsentRejected, url: window.location.href, provider, result: true, elPath: getElementXPath(btn), elHtml: btn.outerHTML});
        }
        else if (ConsentProviders[provider].fallBackActionFunc) {
            logi(`${extensionName()}: trying to use custom flow to reject consent.`);
            ConsentProviders[provider].fallBackActionFunc();
        }
        else if (ConsentProviders[provider].shadowDom) {
            logw(`${extensionName()}: can't find action button in shadow DOM.`);
        }
        else {
            loge(`${extensionName()}: can't decline consent.`);
            chrome.runtime.sendMessage({type: MessageName.WebsiteConsentRejected, url: window.location.href, provider, result: false, elPath: "", elHtml: ""});
        }
    }

    observeChanges() {
        const body = document.getElementsByTagName("body")[0];
        const config = { childList: true};
        const callback = (mutationList, observer) => {
            for (const mutation of mutationList) {
                for (const el of mutation.addedNodes) {
                    const cmp = this.findProvider(el);
                    if (cmp) {
                        logi(`${extensionName()}: found consent dialog (mutation), provider: ${ConsentProviders[cmp].cmpName}`);
                        observer.disconnect();
                        this.action(cmp);
                        return;
                    }
                }
            }
        };
        const observer = new MutationObserver(callback);
        observer.observe(body, config);
        setTimeout(() => {
            observer.disconnect();
        }, 5000);
    }
    
    processDoc() {
        const cmp = this.findProvider();
        if (cmp) {
            this.action(cmp);
            logi(`${extensionName()}: found consent dialog (page load), provider: ${ConsentProviders[cmp].cmpName}`);
            return;
        }
        this.observeChanges();
    }
}

