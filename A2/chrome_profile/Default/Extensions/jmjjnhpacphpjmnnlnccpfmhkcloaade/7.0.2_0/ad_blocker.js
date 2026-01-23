/*
 * Copyright (c) F-Secure Corporation. All rights reserved.
 * See license terms for the related product.
 */

class AdBlocker {

    #domains = [];
    #enabled = false;
    #excludedDomains = [];
    #applyRulesInProgress = false;

    constructor() {
        this.#domains = AdServingDomains;
        BrowserStorage.addListenerLocal(async (changes) => {
            if (changes.adBlockerExceptions) {
                await this.#updateRules();
                chrome.tabs.reload(); // defaults to the selected tab of the current window.
            }
        });

        BrowserStorage.getLocal(["adBlockerExceptions", "userAdServingDomains"]).then(result => {
            if (result.adBlockerExceptions) {
                this.#excludedDomains = result.adBlockerExceptions;
            }
            logd("Dynamic ad blocker list:", result.userAdServingDomains || "empty");
        });
    }

    get domains() {
        return this.#domains;
    }

    get excludedDomains() {
        return this.#excludedDomains;
    }

    async #updateRules() {
        await this.applyRule();
    }

    async applyRule() {
        if (this.#applyRulesInProgress) {
            // avoid multiple attempts to apply rules. Can cause an exception from declarativeNetRequest API.
            return;
        }
        this.#applyRulesInProgress = true;
        const result = await BrowserStorage.getLocal(["userAdServingDomains", "adBlockerExceptions"]);
        if (result.adBlockerExceptions) {
            this.#excludedDomains = result.adBlockerExceptions;
        }
        if (Array.isArray(result.userAdServingDomains)) {
            this.#domains = this.#domains.concat(result.userAdServingDomains);
        }
        if (!chrome.declarativeNetRequest) {
            return;
        }
        const rules = [
            {
                id: RuleId.AdBlock,
                priority: 1,
                action: {
                    type: 'block',
                },
                condition: {
                    requestDomains: this.#domains,
                    resourceTypes: ["sub_frame", "script", "image"],
                    excludedInitiatorDomains : this.#excludedDomains
                },
            },
            {
                id: RuleId.AdBlockBing,
                priority: 1,
                action: {
                    type: 'block',
                },
                condition: {
                    urlFilter: "bing.com/aclick",
                    resourceTypes: ["sub_frame"]
                },
            }
        ];
        const ruleIDs = rules.map(rule => rule.id);
        await this.#updateDynamicRules(rules, ruleIDs, true);
        await this.#applySafariSpecificRules();
        this.#applyRulesInProgress = false;
    }

    async configure(enable) {
        if (!chrome.declarativeNetRequest) {
            return;
        }
        if (this.#enabled == enable) {
            return;
        }
        logi(`AdBlocker configure: ${enable}`);
        if (enable) {
            await this.applyRule();
            this.#enabled = true;
        }
        else {
            let ruleIDs = [RuleId.AdBlock, RuleId.AdBlockBing];
            if (Browser.isSafari) {
                const allRules = await chrome.declarativeNetRequest.getDynamicRules();
                const safariAdRules = allRules.filter(rule => rule.id >= RuleId.AdBlockSafari);
                const safariAdRuleIDs = safariAdRules.map(rule => rule.id);
                ruleIDs = ruleIDs.concat(safariAdRuleIDs);
            }
            
            await this.#updateDynamicRules(null, ruleIDs, false);
            this.#enabled = false;
        }
    }
    
    #updateDynamicRules(rules, ruleIDs, enable) {
        return new Promise((resolve) => {
            let ruleOptions = {
                removeRuleIds: ruleIDs
            };
            if (enable && rules) {
                ruleOptions.addRules = rules;
            }
            chrome.declarativeNetRequest.updateDynamicRules(ruleOptions, () => {
                if (chrome.runtime.lastError) {
                    loge(chrome.runtime.lastError);
                }
                resolve();
            });
        });
    }
    
    async #applySafariSpecificRules() {
        if (!Browser.isSafari) {
            return;
        }

        const allRules = await chrome.declarativeNetRequest.getDynamicRules();
        const safariAdRules = allRules.filter(rule => rule.id >= RuleId.AdBlockSafari);

        let rules = [];
        for (const domain of this.#domains) {
            const blockRulesForDomain = safariAdRules.filter(rule => domain === rule.condition.urlFilter);
            let newRuleID = RuleId.AdBlockSafari + safariAdRules.length + rules.length;
            if (blockRulesForDomain.length > 0) {
                const blockRule = blockRulesForDomain[0];
                if (blockRule.condition &&
                    blockRule.condition.resourceTypes &&
                    blockRule.condition.resourceTypes.length < 2) {
                    // need to update rule to include both sub_frame and script
                    newRuleID = blockRule.id;
                } else {
                    continue;
                }
            }
            rules.push(this.#safariRuleJson(newRuleID, domain));
        }
        const ruleIDs = rules.map(rule => rule.id);
        await this.#updateDynamicRules(rules, ruleIDs, true);
    }

    #safariRuleJson(id, domain) {
        return {
            id: id,
            priority: 1,
            action: {
                type: 'block',
            },
            condition: {
                urlFilter: `||${domain}`,
                resourceTypes: ["sub_frame", "script", "image"]
            },
        };
    }
}
