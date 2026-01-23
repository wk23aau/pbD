/*
 * Copyright (c) F-Secure Corporation. All rights reserved.
 * See license terms for the related product.
 */

class IFrameSourceDetector {

    #doc;

    constructor(doc) {
        this.#doc = doc;

    }

    start() {
        if (this.#doc.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", this.processDoc().then());
        } 
        else {
            this.processDoc().then();
        }
        this.observeChanges();
    }
    
    async processDoc() {
        const iframes  = this.#doc.querySelectorAll("iframe");
        let harmfulIframes = [];
        for (const iframe of iframes) {
            if (isValidHost(iframe.src)) {
                const result = await getReputation(iframe.src);
                if (result.rating_status === "harmful") {
                    logw(`Unsafe iframe with source ${iframe.src} has been removed.`);
                    harmfulIframes.push(sanitizeUrlForPrivacy(iframe.src));
                    iframe.src = "";
                    iframe.style.display = "none";
                }
                if (result.orspData) {
                    for (const category of result.orspData) {
                        if (Object.keys(category)[0] === "paymentservice") {
                            chrome.runtime.sendMessage({type: MessageName.PaymentFormFound, url: window.location.href});
                        }
                    }
                }
            }
        }
        if (harmfulIframes.length > 0) {
            const storageResult = await BrowserStorage.getLocal(["customization"]);
            BrowserStorage.getLocal(["schema"]).then(result => {
                const popup = new IframeRemovalPopup(storageResult.customization, result.schema);
                popup.show();
            });

            chrome.runtime.sendMessage(
                {   
                    type: MessageName.IframesRemoved,
                    url: window.location.href,
                    iframesRemoved: harmfulIframes
                },
            );
        }
    }

    observeChanges() {
        const body = document.getElementsByTagName("body")[0];
        const config = { childList: true, subtree: true };
        const callback = (mutationList, observer) => {
            if (chrome.runtime?.id) {
                this.processDoc().then();
            }
        };
        const observer = new MutationObserver(callback);
        observer.observe(body, config);
    }
}



