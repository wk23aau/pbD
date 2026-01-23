/*
 * Copyright (c) F-Secure Corporation. All rights reserved.
 * See license terms for the related product.
 */

class ContentChecker {
    #tabs = {};
    #dataPipeline;

    constructor(dataPipeline) {
        this.#dataPipeline = dataPipeline;
    }

    get Tabs() {
        return this.#tabs;
    }

    addResource(tabId, parentUrl, url, type) {
        if (!this.#tabs[tabId]) {
            this.#tabs[tabId] = {};
            this.#tabs[tabId].resources = [];
        }
        const resource = {url, type};
        this.#tabs[tabId].url = parentUrl;
        try {
            if (new URL(parentUrl).hostname != new URL(url).hostname) {
                this.#tabs[tabId].resources.push(resource);
            }
        } catch {}
    }

    setPaymentForm(tabId, url) {
        if (!this.#tabs[tabId]) {
            this.#tabs[tabId] = {};
            this.#tabs[tabId].resources = [];
        }
        this.#tabs[tabId].url = url;
        this.#tabs[tabId].paymentForm = true;
    }

    setPaymentCategory(tabId, url, categories) {
        if (!this.#tabs[tabId]) {
            this.#tabs[tabId] = {};
            this.#tabs[tabId].resources = [];
        }
        this.#tabs[tabId].url = url;
        this.#tabs[tabId].paymentCategory = false;
        for (const i in categories) {
            if (BankCategories.includes(Object.keys(categories[i])[0])) {
                this.#tabs[tabId].paymentCategory = true;
            }
        }
    }

    getVerdict(categoryName, categories) {
        const categoryEntry = categories.filter(category => categoryName in category);
        return categoryEntry.length > 0 ? categoryEntry[0][categoryName] : -1;
    }

    getSafeStatus(categories, resourceType) {
        if (this.getVerdict("safe", categories) < -1) {
            return StatusType.Harmful;
        }
        if (this.getVerdict("safe", categories) == -1) {
            return StatusType.Unknown;
        }
        return StatusType.Safe;
    }
   
    async checkResources(tabId, getOrsp) {
        // we only need to check resources in certain conditions:
        // 1. payment form detected
        // 2. is payment website
        // 3. is banking website
        if (this.#tabs[tabId] && this.#tabs[tabId].resources && (this.#tabs[tabId].paymentForm || this.#tabs[tabId].paymentCategory)) {
            logi(`Performing resource check, payment form found: ${this.#tabs[tabId].paymentForm}, payment category: ${this.#tabs[tabId].paymentCategory}`);
            let unsafeRequests = [];
            for (const i in this.#tabs[tabId].resources) {
                const res = await getOrsp(this.#tabs[tabId].resources[i].url);
                const status = this.getSafeStatus(res.categories, this.#tabs[tabId].resources[i].type);
                logd(`Checking url: ${this.#tabs[tabId].resources[i].url}, type: ${this.#tabs[tabId].resources[i].type}, status: ${status}`, res);
                if (status == StatusType.Harmful || status == StatusType.Unknown) {
                    const entry = {url: sanitizeUrlForPrivacy(this.#tabs[tabId].resources[i].url), type: this.#tabs[tabId].resources[i].type, status}
                    unsafeRequests.push(entry);
                }
            }
            if (unsafeRequests.length) {
                logw("Unsafe page detected:", this.#tabs[tabId].url, unsafeRequests);
                this.#dataPipeline.unsafeResourcesLoaded(this.#tabs[tabId].url, unsafeRequests);
            }
        }
        else {
            logi("Skipping resource check");
        }
        this.clear(tabId);
    }

    clear(tabId) {
        this.#tabs[tabId] = {};
        this.#tabs[tabId].resources = [];
    }
}